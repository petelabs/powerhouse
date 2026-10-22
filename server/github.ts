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

// In-memory token storage (also saved to protected server file)
let currentConfig: StoredGitHubConfig = {
  token: null,
  username: null,
  name: null,
  avatarUrl: null,
  scopes: [],
  connectedAt: null,
};

// Try loading on boot
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

// Sample sandbox demo repositories for instant evaluation
const SANDBOX_REPOS: Record<string, {
  item: RepoItem;
  branches: RepoBranch[];
  files: Record<string, string>;
}> = {
  'powerhouse-labs/music-player-react': {
    item: {
      id: 901001,
      name: 'music-player-react',
      fullName: 'powerhouse-labs/music-player-react',
      owner: 'powerhouse-labs',
      description: 'Mobile-first progressive audio player with visualizer, playlists, and dark developer UI',
      defaultBranch: 'main',
      isPrivate: false,
      language: 'TypeScript',
      updatedAt: new Date().toISOString(),
      starsCount: 42,
      openIssuesCount: 3,
    },
    branches: [
      { name: 'main', isDefault: true, protected: true },
      { name: 'develop', isDefault: false, protected: false },
      { name: 'fix/audio-controls', isDefault: false, protected: false },
    ],
    files: {
      'package.json': JSON.stringify({
        name: 'music-player-react',
        version: '1.2.0',
        dependencies: {
          react: '^19.0.0',
          'lucide-react': '^0.546.0',
          zustand: '^4.5.0'
        }
      }, null, 2),
      'src/App.tsx': `import React, { useState } from 'react';
import { Player } from './components/Player';
import { TrackList } from './components/TrackList';

export default function App() {
  const [currentTrack, setCurrentTrack] = useState<number | null>(null);
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">SonicDeck Player</h1>
        <span className="text-xs text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">v1.2</span>
      </header>
      <TrackList onSelect={setCurrentTrack} activeIndex={currentTrack} />
      <Player trackId={currentTrack} />
    </div>
  );
}`,
      'src/components/Player.tsx': `import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, Volume2 } from 'lucide-react';

interface PlayerProps {
  trackId: number | null;
}

export function Player({ trackId }: PlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Bug: audio element doesn't reset position when trackId changes
  useEffect(() => {
    if (trackId !== null) {
      setIsPlaying(true);
    }
  }, [trackId]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800/95 border-t border-slate-700 p-4 backdrop-blur flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-3 bg-emerald-500 rounded-full text-slate-950 font-bold hover:bg-emerald-400"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div>
          <p className="text-sm font-semibold">{trackId !== null ? \`Track #\${trackId}\` : 'No track selected'}</p>
          <p className="text-xs text-slate-400">{isPlaying ? 'Playing' : 'Paused'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Volume2 size={18} className="text-slate-400" />
      </div>
    </div>
  );
}`,
      'src/components/TrackList.tsx': `import React from 'react';

const TRACKS = [
  { id: 1, title: 'Midnight Synthesizer', artist: 'Kavinsky Wave', duration: '3:45' },
  { id: 2, title: 'Neural Gateway', artist: 'Argon Pulse', duration: '4:12' },
  { id: 3, title: 'Cybernetic Horizon', artist: 'Hyperion', duration: '2:58' },
];

export function TrackList({ onSelect, activeIndex }: { onSelect: (id: number) => void; activeIndex: number | null }) {
  return (
    <div className="space-y-2 pb-24">
      {TRACKS.map((t) => (
        <div
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={\`p-3 rounded-lg border transition cursor-pointer flex justify-between items-center \${
            activeIndex === t.id ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
          }\`}
        >
          <div>
            <div className="font-medium text-sm">{t.title}</div>
            <div className="text-xs text-slate-400">{t.artist}</div>
          </div>
          <span className="text-xs font-mono text-slate-400">{t.duration}</span>
        </div>
      ))}
    </div>
  );
}`,
      'README.md': `# SonicDeck Music Player\n\nA lightweight mobile-first React music player.\n\n### Running locally\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\``,
    }
  },
  'powerhouse-labs/dev-dashboard': {
    item: {
      id: 901002,
      name: 'dev-dashboard',
      fullName: 'powerhouse-labs/dev-dashboard',
      owner: 'powerhouse-labs',
      description: 'Telemetry and serverless worker monitoring console with GitHub Actions health check',
      defaultBranch: 'main',
      isPrivate: false,
      language: 'TypeScript',
      updatedAt: new Date().toISOString(),
      starsCount: 19,
      openIssuesCount: 1,
    },
    branches: [
      { name: 'main', isDefault: true, protected: true },
      { name: 'staging', isDefault: false, protected: false },
    ],
    files: {
      'package.json': JSON.stringify({ name: 'dev-dashboard', version: '0.9.1' }, null, 2),
      'src/App.tsx': `export default function App() { return <div className="p-4">Dev Dashboard</div>; }`,
      '.github/workflows/ci.yml': `name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm test`,
    }
  }
};

export class GitHubService {
  /**
   * Test connection and retrieve credentials info
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
      throw new Error(`GitHub authentication failed (${res.status}): ${errBody || res.statusText}`);
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
      scopes: scopes.length > 0 ? scopes : ['repo', 'read:user', 'workflow'],
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
      return {
        connected: false,
      };
    }

    try {
      const status = await this.testConnection(currentConfig.token);
      return status;
    } catch {
      return {
        connected: true,
        username: currentConfig.username || undefined,
        name: currentConfig.name || undefined,
        avatarUrl: currentConfig.avatarUrl || undefined,
        scopes: currentConfig.scopes,
      };
    }
  }

  /**
   * List repositories accessible to the user
   */
  static async listRepositories(): Promise<RepoItem[]> {
    const results: RepoItem[] = [];

    // Always include sandbox repos
    for (const key of Object.keys(SANDBOX_REPOS)) {
      results.push(SANDBOX_REPOS[key].item);
    }

    if (currentConfig.token) {
      try {
        const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
          headers: {
            Authorization: `Bearer ${currentConfig.token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Powerhouse-Workspace/1.0',
          },
        });

        if (res.ok) {
          const repos = await res.json();
          for (const r of repos) {
            results.push({
              id: r.id,
              name: r.name,
              fullName: r.full_name,
              owner: r.owner.login,
              description: r.description,
              defaultBranch: r.default_branch,
              isPrivate: r.private,
              language: r.language,
              updatedAt: r.updated_at,
              starsCount: r.stargazers_count,
              openIssuesCount: r.open_issues_count,
            });
          }
        }
      } catch (e) {
        console.error('Error fetching GitHub repos:', e);
      }
    }

    return results;
  }

  /**
   * List branches for a repo
   */
  static async listBranches(repoFullName: string): Promise<RepoBranch[]> {
    if (SANDBOX_REPOS[repoFullName]) {
      return SANDBOX_REPOS[repoFullName].branches;
    }

    if (!currentConfig.token) {
      throw new Error(`GitHub token not configured for external repo: ${repoFullName}`);
    }

    const res = await fetch(`https://api.github.com/repos/${repoFullName}/branches`, {
      headers: {
        Authorization: `Bearer ${currentConfig.token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Powerhouse-Workspace/1.0',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to list branches for ${repoFullName}: ${res.statusText}`);
    }

    const branches = await res.json();
    return branches.map((b: { name: string; protected: boolean }) => ({
      name: b.name,
      isDefault: b.name === 'main' || b.name === 'master',
      protected: !!b.protected,
    }));
  }

  /**
   * Get recursive file tree of repository
   */
  static async getTree(repoFullName: string, branch: string = 'main'): Promise<RepoFileNode[]> {
    if (SANDBOX_REPOS[repoFullName]) {
      const files = SANDBOX_REPOS[repoFullName].files;
      return Object.keys(files).map(filePath => ({
        path: filePath,
        type: 'blob',
        size: files[filePath].length,
      }));
    }

    if (!currentConfig.token) {
      throw new Error(`GitHub token not configured for external repo: ${repoFullName}`);
    }

    const res = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/${branch}?recursive=1`, {
      headers: {
        Authorization: `Bearer ${currentConfig.token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Powerhouse-Workspace/1.0',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch git tree for ${repoFullName}@${branch}: ${res.statusText}`);
    }

    const data = await res.json();
    return (data.tree || []).map((node: { path: string; type: 'blob' | 'tree'; size?: number }) => ({
      path: node.path,
      type: node.type,
      size: node.size,
    }));
  }

  /**
   * Read file content
   */
  static async getFileContent(repoFullName: string, filePath: string, branch: string = 'main'): Promise<string> {
    if (SANDBOX_REPOS[repoFullName]) {
      const content = SANDBOX_REPOS[repoFullName].files[filePath];
      if (content === undefined) {
        throw new Error(`File not found: ${filePath}`);
      }
      return content;
    }

    if (!currentConfig.token) {
      throw new Error(`GitHub token not configured for external repo: ${repoFullName}`);
    }

    const res = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${currentConfig.token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Powerhouse-Workspace/1.0',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch file ${filePath}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.content && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return '';
  }

  /**
   * Apply changes and create a dedicated working branch & PR
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

    if (SANDBOX_REPOS[repoFullName]) {
      // Apply changes to sandbox repo
      for (const change of changes) {
        if (change.action === 'delete') {
          delete SANDBOX_REPOS[repoFullName].files[change.path];
        } else if (change.newContent !== undefined) {
          SANDBOX_REPOS[repoFullName].files[change.path] = change.newContent;
        }
      }
      SANDBOX_REPOS[repoFullName].branches.push({
        name: branchName,
        isDefault: false,
        protected: false,
      });

      return {
        branchName,
        prUrl: `https://github.com/${repoFullName}/pull/sandbox-pr-${timestamp}`,
      };
    }

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
    if (!refRes.ok) throw new Error(`Could not find base branch ${baseBranch}`);
    const refData = await refRes.json();
    const baseSha = refData.object.sha;

    // 2. Create new branch
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
    if (!createBranchRes.ok) throw new Error(`Could not create branch ${branchName}`);

    // 3. Commit changes to the new branch
    for (const change of changes) {
      if (change.action === 'delete') {
        // Fetch existing sha
        const getFileRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${change.path}?ref=${branchName}`, {
          headers: {
            Authorization: `Bearer ${currentConfig.token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Powerhouse-Workspace/1.0',
          },
        });
        if (getFileRes.ok) {
          const fileData = await getFileRes.json();
          await fetch(`https://api.github.com/repos/${repoFullName}/contents/${change.path}`, {
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
          const existingRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${change.path}?ref=${branchName}`, {
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
          // File doesn't exist yet, that's fine
        }

        const commitRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${change.path}`, {
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
          console.warn(`Warning: failed to commit file ${change.path}:`, await commitRes.text());
        }
      }
    }

    // 4. Open Pull Request
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
      console.warn('PR creation warning:', err);
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
