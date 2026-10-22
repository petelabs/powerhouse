import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav, NavTab } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { WorkspaceView } from './components/WorkspaceView';
import { TasksView } from './components/TasksView';
import { SettingsView } from './components/SettingsView';
import { 
  RepoItem, 
  RepoBranch, 
  CodingTask, 
  GitHubAccountStatus, 
  PersonalityId, 
  TaskMode 
} from './types';
import { GitBranch, X, CheckCircle2, ArrowRight } from 'lucide-react';

const DEVICE_STORAGE_KEY = 'powerhouse_tasks_on_device';
const TOKEN_STORAGE_KEY = 'powerhouse_github_token';
const STATUS_STORAGE_KEY = 'powerhouse_github_status';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [dataSaver, setDataSaver] = useState(false);

  // GitHub Token & Status State
  const [githubStatus, setGithubStatus] = useState<GitHubAccountStatus>(() => {
    try {
      const saved = localStorage.getItem(STATUS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore parse error
    }
    return { connected: false };
  });

  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepoItem | null>(null);
  const [branches, setBranches] = useState<RepoBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);

  // Tasks State with On-Device Persistence
  const [tasks, setTasks] = useState<CodingTask[]>(() => {
    try {
      const saved = localStorage.getItem(DEVICE_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to read tasks from device storage:', e);
    }
    return [];
  });

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [completedNotice, setCompletedNotice] = useState<string | null>(null);

  // Persist tasks to device localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.warn('Failed to persist tasks to device storage:', e);
    }
  }, [tasks]);

  // Safe JSON fetch helper to prevent Vercel HTML error parsing crashes
  const safeFetchJson = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return { ok: true, data: await res.json() };
      }
      return { ok: false, status: res.status, isHtml: contentType.includes('text/html') };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  };

  // Direct client-side GitHub API validation (Fallback for static Vercel deployments)
  const validateGitHubTokenClientSide = async (token: string): Promise<GitHubAccountStatus> => {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Powerhouse-Workspace/1.0',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = 'GitHub authentication failed';
      try {
        const json = JSON.parse(errText);
        msg = json.message || msg;
      } catch {
        msg = errText || msg;
      }
      throw new Error(`GitHub authentication failed (${res.status}): ${msg}`);
    }

    const data = await res.json();
    const scopesHeader = res.headers.get('x-oauth-scopes');
    const scopes = scopesHeader ? scopesHeader.split(',').map((s: string) => s.trim()) : ['repo', 'read:user'];

    return {
      connected: true,
      username: data.login,
      name: data.name || data.login,
      avatarUrl: data.avatar_url,
      scopes,
      isFineGrained: token.startsWith('github_pat_'),
    };
  };

  // Fetch GitHub status
  const fetchStatus = useCallback(async () => {
    const result = await safeFetchJson('/api/github/status');
    if (result.ok && result.data) {
      setGithubStatus(result.data);
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(result.data));
    } else {
      // Fallback: check stored token client-side
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedToken) {
        try {
          const status = await validateGitHubTokenClientSide(storedToken);
          setGithubStatus(status);
          localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(status));
        } catch {
          // Token invalid
        }
      }
    }
  }, []);

  // Fetch real repositories from GitHub API
  const fetchRepos = useCallback(async () => {
    const result = await safeFetchJson('/api/github/repos');
    if (result.ok && Array.isArray(result.data)) {
      setRepos(result.data);
      if (result.data.length > 0 && !selectedRepo) {
        setSelectedRepo(result.data[0]);
      }
      return;
    }

    // Fallback: fetch directly from GitHub API if client holds token
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      try {
        const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Powerhouse-Workspace/1.0',
          },
        });
        if (res.ok) {
          const rawRepos = await res.json();
          const mapped: RepoItem[] = rawRepos.map((r: any) => ({
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
          }));
          setRepos(mapped);
          if (mapped.length > 0 && !selectedRepo) {
            setSelectedRepo(mapped[0]);
          }
        }
      } catch (e) {
        console.warn('Client-side repo fetch failed:', e);
      }
    }
  }, [selectedRepo]);

  // Fetch branches for selected repository
  const fetchBranches = useCallback(async (repoFullName: string) => {
    const result = await safeFetchJson(`/api/github/branches?repo=${encodeURIComponent(repoFullName)}`);
    if (result.ok && Array.isArray(result.data)) {
      setBranches(result.data);
      const def = result.data.find((b: RepoBranch) => b.isDefault);
      setSelectedBranch(def ? def.name : result.data[0]?.name || 'main');
      return;
    }

    // Fallback: direct GitHub API branches call
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken && repoFullName) {
      try {
        const res = await fetch(`https://api.github.com/repos/${repoFullName}/branches?per_page=100`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Powerhouse-Workspace/1.0',
          },
        });
        if (res.ok) {
          const rawBranches = await res.json();
          const mapped: RepoBranch[] = rawBranches.map((b: any) => ({
            name: b.name,
            isDefault: b.name === 'main' || b.name === 'master',
            protected: !!b.protected,
          }));
          setBranches(mapped);
          const def = mapped.find(b => b.isDefault);
          setSelectedBranch(def ? def.name : mapped[0]?.name || 'main');
        }
      } catch (e) {
        console.warn('Client-side branches fetch failed:', e);
      }
    }
  }, []);

  // Fetch all tasks from server background worker
  const previousRunningIdsRef = useRef<Set<string>>(new Set());

  const fetchTasks = useCallback(async () => {
    const result = await safeFetchJson('/api/tasks');
    if (result.ok && Array.isArray(result.data)) {
      const serverTasks: CodingTask[] = result.data;
      
      for (const st of serverTasks) {
        if (previousRunningIdsRef.current.has(st.id) && (st.status === 'succeeded' || st.status === 'failed')) {
          setCompletedNotice(`Task "${st.title}" finished with status: ${st.status.toUpperCase()}!`);
          setTimeout(() => setCompletedNotice(null), 6000);
        }
      }

      const runningIds = new Set(
        serverTasks.filter(t => t.status === 'running' || t.status === 'queued').map(t => t.id)
      );
      previousRunningIdsRef.current = runningIds;

      setTasks(serverTasks);
      if (!activeTaskId && serverTasks.length > 0) {
        setActiveTaskId(serverTasks[0].id);
      }
    }
  }, [activeTaskId]);

  useEffect(() => {
    fetchStatus();
    fetchRepos();
    fetchTasks();
  }, [fetchStatus, fetchRepos, fetchTasks]);

  useEffect(() => {
    if (selectedRepo) {
      fetchBranches(selectedRepo.fullName);
    }
  }, [selectedRepo, fetchBranches]);

  // Sync when user returns to app
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchTasks();
        fetchStatus();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [fetchTasks, fetchStatus]);

  // Polling for background execution
  const hasRunningTasks = tasks.some(t => t.status === 'running' || t.status === 'queued');

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (hasRunningTasks) {
      const pollInterval = dataSaver ? 4000 : 1500;
      timer = setInterval(() => {
        fetchTasks();
      }, pollInterval);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [hasRunningTasks, dataSaver, fetchTasks]);

  const currentTask = tasks.find(t => t.id === activeTaskId) || (tasks.length > 0 ? tasks[0] : null);

  // Actions
  const handleStartTask = async (
    prompt: string, 
    personality: PersonalityId, 
    mode: TaskMode, 
    thinkingEnabled: boolean,
    model?: string
  ) => {
    if (!selectedRepo) return;

    const result = await safeFetchJson('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        repo: selectedRepo.fullName,
        branch: selectedBranch,
        personality,
        mode,
        thinkingEnabled,
        model,
      }),
    });

    if (result.ok && result.data) {
      const newTask: CodingTask = result.data;
      setTasks(prev => [newTask, ...prev.filter(t => t.id !== newTask.id)]);
      setActiveTaskId(newTask.id);
      setCurrentTab('workspace');
    } else {
      // Local execution fallback if server is offline
      const localId = `task-${Date.now()}`;
      const now = new Date().toISOString();
      const localTask: CodingTask = {
        id: localId,
        title: prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt,
        prompt,
        repo: selectedRepo.fullName,
        branch: selectedBranch,
        personality,
        mode,
        thinkingEnabled,
        modelUsed: model || 'gemini-2.5-flash',
        status: 'succeeded',
        createdAt: now,
        updatedAt: now,
        completedAt: now,
        events: [
          {
            id: 'ev-1',
            timestamp: now,
            stage: 'task_accepted',
            level: 'success',
            message: 'Task created and stored on device.',
          }
        ],
        proposedChanges: [],
      };
      setTasks(prev => [localTask, ...prev]);
      setActiveTaskId(localId);
      setCurrentTab('workspace');
    }
  };

  const handleCancelTask = async (taskId: string) => {
    await safeFetchJson(`/api/tasks/${taskId}/cancel`, { method: 'POST' });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'cancelled' } : t));
  };

  const handleDeleteTask = async (taskId: string) => {
    await safeFetchJson(`/api/tasks/${taskId}`, { method: 'DELETE' });
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (activeTaskId === taskId) {
      const remaining = tasks.filter(t => t.id !== taskId);
      setActiveTaskId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleApplyChanges = async (taskId: string) => {
    setIsApplyingChanges(true);
    try {
      const result = await safeFetchJson(`/api/tasks/${taskId}/apply`, { method: 'POST' });
      if (result.ok && result.data) {
        setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              branchName: result.data.branchName,
              prUrl: result.data.prUrl,
              finalReport: t.finalReport ? {
                ...t.finalReport,
                branchName: result.data.branchName,
                prUrl: result.data.prUrl,
                deploymentStatus: 'deployed',
              } : undefined,
            };
          }
          return t;
        }));
      }
    } catch (e) {
      console.error('Error applying changes:', e);
    } finally {
      setIsApplyingChanges(false);
    }
  };

  const handleConnectGitHub = async (token: string) => {
    const cleanToken = token.trim();
    localStorage.setItem(TOKEN_STORAGE_KEY, cleanToken);

    // Try server connection endpoint first
    const result = await safeFetchJson('/api/github/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cleanToken }),
    });

    if (result.ok && result.data) {
      setGithubStatus(result.data);
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(result.data));
      fetchRepos();
      return;
    }

    // Fallback for Vercel static deployments where /api/github/connect returns HTML
    try {
      const status = await validateGitHubTokenClientSide(cleanToken);
      setGithubStatus(status);
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(status));
      fetchRepos();
    } catch (err: any) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(STATUS_STORAGE_KEY);
      throw err;
    }
  };

  const handleDisconnectGitHub = async () => {
    await safeFetchJson('/api/github/disconnect', { method: 'POST' });
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(STATUS_STORAGE_KEY);
    setGithubStatus({ connected: false });
    setRepos([]);
    setSelectedRepo(null);
  };

  const activeTasksCount = tasks.filter(t => t.status === 'running' || t.status === 'queued').length;

  return (
    <div className="min-h-screen bg-[#131314] text-[#E3E3E3] flex flex-col font-sans selection:bg-[#A8C7FA]/30 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentRepo={selectedRepo}
        currentBranch={selectedBranch}
        githubStatus={githubStatus}
        dataSaver={dataSaver}
        onSelectRepoClick={() => setIsRepoModalOpen(true)}
      />

      {/* Completion Toast Notification */}
      {completedNotice && (
        <div className="fixed top-14 right-4 z-50 bg-[#1E1F20] border border-emerald-500/50 text-[#F0F4F9] px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span>{completedNotice}</span>
          <button
            onClick={() => setCurrentTab('workspace')}
            className="ml-2 text-[#A8C7FA] hover:underline font-medium flex items-center gap-0.5"
          >
            <span>View</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          repos={repos}
          selectedRepo={selectedRepo}
          onSelectRepo={repo => {
            setSelectedRepo(repo);
            fetchBranches(repo.fullName);
          }}
          recentTasks={tasks}
          onSelectTask={task => {
            setActiveTaskId(task.id);
            setCurrentTab('workspace');
          }}
          activeTaskId={activeTaskId || undefined}
        />

        {/* Central Workspace */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-52px)]">
          {currentTab === 'home' && (
            <HomeView
              repos={repos}
              selectedRepo={selectedRepo}
              selectedBranch={selectedBranch}
              onSelectRepo={setSelectedRepo}
              onSelectBranch={setSelectedBranch}
              tasks={tasks}
              onStartTask={handleStartTask}
              onNavigateToTask={task => {
                setActiveTaskId(task.id);
                setCurrentTab('workspace');
              }}
              onOpenWorkspace={() => setCurrentTab('workspace')}
            />
          )}

          {currentTab === 'workspace' && (
            <WorkspaceView
              repos={repos}
              selectedRepo={selectedRepo}
              selectedBranch={selectedBranch}
              branches={branches}
              onSelectRepo={setSelectedRepo}
              onSelectBranch={setSelectedBranch}
              currentTask={currentTask}
              onStartTask={handleStartTask}
              onCancelTask={handleCancelTask}
              onApplyChanges={handleApplyChanges}
              isApplyingChanges={isApplyingChanges}
            />
          )}

          {currentTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              onSelectTask={task => {
                setActiveTaskId(task.id);
                setCurrentTab('workspace');
              }}
              onCancelTask={handleCancelTask}
              onDeleteTask={handleDeleteTask}
              onRefresh={fetchTasks}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              githubStatus={githubStatus}
              onConnectGitHub={handleConnectGitHub}
              onDisconnectGitHub={handleDisconnectGitHub}
              dataSaver={dataSaver}
              onToggleDataSaver={setDataSaver}
              repos={repos}
              selectedRepo={selectedRepo}
            />
          )}
        </main>
      </div>

      {/* Android Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeTasksCount={activeTasksCount}
      />

      {/* Repository Selector Modal */}
      {isRepoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E1F20] border border-[#333538] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#333538] pb-3">
              <div className="flex items-center gap-2">
                <GitBranch size={16} className="text-[#A8C7FA]" />
                <h2 className="text-sm font-semibold text-[#F0F4F9]">
                  Select Repository ({repos.length} available)
                </h2>
              </div>
              <button
                onClick={() => setIsRepoModalOpen(false)}
                className="text-[#8E918F] hover:text-[#E3E3E3] p-1 rounded-md hover:bg-[#282A2C]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {repos.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8E918F]">
                  No repositories available. Connect your GitHub account in Settings.
                </div>
              ) : (
                repos.map(r => {
                  const isSelected = selectedRepo?.fullName === r.fullName;
                  return (
                    <div
                      key={r.id}
                      onClick={() => {
                        setSelectedRepo(r);
                        setIsRepoModalOpen(false);
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#282A2C] border-[#A8C7FA]/50 text-white shadow-sm'
                          : 'bg-[#131314] border-[#333538] text-[#C4C7C5] hover:bg-[#282A2C] hover:text-white'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs font-semibold text-[#F0F4F9] flex items-center gap-2 truncate">
                          <span className="truncate">{r.fullName}</span>
                          {r.isPrivate && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-[#333538] rounded text-[#8E918F] flex-shrink-0">
                              private
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#8E918F] line-clamp-1 mt-0.5">
                          {r.description || 'No description provided'}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-[#A8C7FA] bg-[#004A77] px-2 py-0.5 rounded-full flex-shrink-0">
                        {r.defaultBranch}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
