import fs from 'fs';
import path from 'path';
import { RepoItem, RepoBranch, RepoFileNode, GitHubAccountStatus, FileChange } from '../src/types/index.js';

const DATA_DIR = path.resolve(process.cwd(), '.powerhouse-data');
const CONFIG_FILE = path.join(DATA_DIR, 'github.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StoredGitHubConfig {
  token: string | null;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  scopes: string[];
  connectedAt: string | null;
}

let currentConfig: StoredGitHubConfig = {
  token: null,
  username: null,
  name: null,
  avatarUrl: null,
  scopes: [],
  connectedAt: null,
};

// Load persistent configuration on boot
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    currentConfig = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Failed to load GitHub config file:', e);
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), { mode: 0o600 });
  } catch (e) {
    console.error('Failed to persist GitHub config:', e);
  }
}

export class GitHubService {
  /**
   * Test connection and retrieve credentials info directly from GitHub API
   */
  static async testConnection(token: string): Promise<GitHubAccountStatus> {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Powerhouse-Workspace/1.0',
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      let parsedMessage = '';
      try {
        const json = JSON.parse(errBody);
        parsedMessage = json.message || '';
      } catch {
        parsedMessage = errBody;
      }
      throw new Error(`GitHub authentication failed (${res.status}): ${parsedMessage || res.statusText}`);
    }

    const data = await res.json();
    const scopesHeader = res.headers.get('x-oauth-scopes');
    const scopes = scopesHeader ? scopesHeader.split(',').map(s => s.trim()) : [];

    const rateLimitLimit = parseInt(res.headers.get('x-ratelimit-limit') || '5000', 10);
    const rateLimitRemaining = parseInt(res.headers.get('x-ratelimit-remaining') || '5000', 10);
    const rateLimitReset = parseInt(res.headers.get('x-ratelimit-reset') || '0', 10);

    return {
      connected: true,
      username: data.login,
      name: data.name || data.login,
      avatarUrl: data.avatar_url,
      scopes: scopes.length > 0 ? scopes : ['repo', 'read:user'],
      rateLimit: {
        limit: rateLimitLimit,
        remaining: rateLimitRemaining,
        resetTime: rateLimitReset ? new Date(rateLimitReset * 1000).toISOString() : new Date().toISOString(),
      },
      isFineGrained: token.startsWith('github_pat_'),
    };
  }

  /**
   * Save validated credentials
   */
  static async saveCredentials(token: string): Promise<GitHubAccountStatus> {
    const status = await this.testConnection(token);
    currentConfig = {
      token,
      username: status.username || null,
      name: status.name || null,
      avatarUrl: status.avatarUrl || null,
      scopes: status.scopes || [],
      connectedAt: new Date().toISOString(),
    };
    saveConfig();
    return status;
  }

  /**
   * Disconnect GitHub credentials
   */
  static disconnect() {
    currentConfig = {
      token: null,
      username: null,
      name: null,
      avatarUrl: null,
      scopes: [],
      connectedAt: null,
    };
    saveConfig();
  }

  /**
   * Get current auth status
   */
  static async getStatus(): Promise<GitHubAccountStatus> {
    if (!currentConfig.token) {
      return { connected: false };
    }

    try {
      const status = await this.testConnection(currentConfig.token);
      return status;
    } catch {
      return {
        connected: !!currentConfig.token,
        username: currentConfig.username || undefined,
        name: currentConfig.name || undefined,
        avatarUrl: currentConfig.avatarUrl || undefined,
        scopes: currentConfig.scopes,
      };
    }
  }

  /**
   * List genuine repositories accessible to the authenticated user from GitHub API
   */
  static async listRepositories(): Promise<RepoItem[]> {
    if (!currentConfig.token) {
      return [];
    }

    const results: RepoItem[] = [];

    try {
      // Fetch up to 100 user repositories sorted by updated date
      const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member', {
        headers: {
          Authorization: `Bearer ${currentConfig.token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Powerhouse-Workspace/1.0',
        },
      });

      if (!res.ok) {
        throw new Error(`GitHub API error (${res.status}): ${res.statusText}`);
      }

      const repos = await res.json();
      if (Array.isArray(repos)) {
        for (const r of repos) {
          results.push({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            owner: r.owner ? r.owner.login : '',
            description: r.description || '',
            defaultBranch: r.default_branch || 'main',
            isPrivate: !!r.private,
            language: r.language || 'Unknown',
            updatedAt: r.updated_at || new Date().toISOString(),
            starsCount: r.stargazers_count || 0,
            openIssuesCount: r.open_issues_count || 0,
          });
        }
      }
    } catch (e: any) {
      console.error('Error fetching real GitHub repositories:', e);
      throw e;
    }

    return results;
  }

  /**
   * List real branches for a repository
   */
  static async listBranches(repoFullName: string): Promise<RepoBranch[]> {
    if (!currentConfig.token) {
      throw new Error(`GitHub authentication required. Please connect your GitHub account in Settings.`);
    }

    const res = await fetch(`https://api.github.com/repos/${repoFullName}/branches?per_page=100`, {
      headers: {
        Authorization: `Bearer ${currentConfig.token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Powerhouse-Workspace/1.0',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to list branches for ${repoFullName} (${res.status}): ${err || res.statusText}`);
    }

    const branches = await res.json();
    return branches.map((b: { name: string; protected?: boolean }) => ({
      name: b.name,
      isDefault: b.name === 'main' || b.name === 'master',
      protected: !!b.protected,
    }));
  }

  /**
   * Get recursive file tree of real repository from GitHub Git Data API
   */
  static async getTree(repoFullName: string, branch: string = 'main'): Promise<RepoFileNode[]> {
    if (!currentConfig.token) {
      throw new Error(`GitHub authentication required to read repository tree.`);
    }

    // Try recursive git tree endpoint first
    const res = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/${branch}?recursive=1`, {
      headers: {
        Authorization: `Bearer ${currentConfig.token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Powerhouse-Workspace/1.0',
      },
    });

    if (!res.ok) {
      // Fallback: try root contents if git tree fails or repo has no commits
      const contentsRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents?ref=${branch}`, {
        headers: {
          Authorization: `Bearer ${currentConfig.token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Powerhouse-Workspace/1.0',
        },
      });

      if (!contentsRes.ok) {
        throw new Error(`Failed to fetch tree for ${repoFullName}@${branch}: ${res.statusText}`);
      }

      const contents = await contentsRes.json();
      return (contents || []).map((node: { path: string; type: string; size?: number }) => ({
        path: node.path,
        type: node.type === 'file' ? 'blob' : 'tree',
        size: node.size,
      }));
    }

    const data = await res.json();
    return (data.tree || []).map((node: { path: string; type: 'blob' | 'tree'; size?: number }) => ({
      path: node.path,
      type: node.type,
      size: node.size,
    }));
  }

  /**
   * Read real file content from GitHub Contents API
   */
  static async getFileContent(repoFullName: string, filePath: string, branch: string = 'main'): Promise<string> {
    if (!currentConfig.token) {
      throw new Error(`GitHub authentication required to read file content.`);
    }

    const res = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${currentConfig.token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Powerhouse-Workspace/1.0',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch file '${filePath}' from ${repoFullName}@${branch} (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    if (data.content && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return '';
  }

  /**
   * Apply changes and create a real dedicated working branch & PR on GitHub
   */
  static async applyChangesAndCreatePR(
    repoFullName: string,
    baseBranch: string,
    changes: FileChange[],
    title: string,
    body: string
  ): Promise<{ branchName: string; prUrl: string }> {
    const timestamp = Date.now();
    const branchName = `powerhouse/task-${timestamp}`;

    if (!currentConfig.token) {
      throw new Error('GitHub token required to create branch and Pull Request');
    }

    // 1. Get base branch commit SHA
    const refRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/ref/heads/${baseBranch}`, {
      headers: {
        Authorization: `Bearer ${currentConfig.token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Powerhouse-Workspace/1.0',
      },
    });
    if (!refRes.ok) throw new Error(`Could not find base branch ${baseBranch} on ${repoFullName}`);
    const refData = await refRes.json();
    const baseSha = refData.object.sha;

    // 2. Create new branch on GitHub
    const createBranchRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/refs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentConfig.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Powerhouse-Workspace/1.0',
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    });
    if (!createBranchRes.ok) {
      const branchErr = await createBranchRes.text();
      throw new Error(`Could not create branch ${branchName}: ${branchErr}`);
    }

    // 3. Commit each file change to the new branch
    for (const change of changes) {
      if (change.action === 'delete') {
        const getFileRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(change.path).replace(/%2F/g, '/')}?ref=${branchName}`, {
          headers: {
            Authorization: `Bearer ${currentConfig.token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Powerhouse-Workspace/1.0',
          },
        });
        if (getFileRes.ok) {
          const fileData = await getFileRes.json();
          await fetch(`https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(change.path).replace(/%2F/g, '/')}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${currentConfig.token}`,
              'Content-Type': 'application/json',
              'User-Agent': 'Powerhouse-Workspace/1.0',
            },
            body: JSON.stringify({
              message: `[Powerhouse] Delete ${change.path}`,
              sha: fileData.sha,
              branch: branchName,
            }),
          });
        }
      } else if (change.newContent !== undefined) {
        let existingSha: string | undefined;
        try {
          const existingRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(change.path).replace(/%2F/g, '/')}?ref=${branchName}`, {
            headers: {
              Authorization: `Bearer ${currentConfig.token}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'Powerhouse-Workspace/1.0',
            },
          });
          if (existingRes.ok) {
            const existingData = await existingRes.json();
            existingSha = existingData.sha;
          }
        } catch {
          // File does not exist yet
        }

        const commitRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(change.path).replace(/%2F/g, '/')}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${currentConfig.token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Powerhouse-Workspace/1.0',
          },
          body: JSON.stringify({
            message: `[Powerhouse] ${change.action === 'create' ? 'Add' : 'Update'} ${change.path}`,
            content: Buffer.from(change.newContent).toString('base64'),
            branch: branchName,
            sha: existingSha,
          }),
        });
        if (!commitRes.ok) {
          const errText = await commitRes.text();
          console.warn(`Warning: failed to commit file ${change.path}:`, errText);
        }
      }
    }

    // 4. Open Pull Request on GitHub
    const prRes = await fetch(`https://api.github.com/repos/${repoFullName}/pulls`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentConfig.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Powerhouse-Workspace/1.0',
      },
      body: JSON.stringify({
        title,
        body,
        head: branchName,
        base: baseBranch,
      }),
    });

    if (!prRes.ok) {
      const err = await prRes.text();
      console.warn('Pull Request creation response:', err);
      return {
        branchName,
        prUrl: `https://github.com/${repoFullName}/tree/${branchName}`,
      };
    }

    const prData = await prRes.json();
    return {
      branchName,
      prUrl: prData.html_url || `https://github.com/${repoFullName}/tree/${branchName}`,
    };
  }
}
