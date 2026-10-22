import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav, NavTab } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { WorkspaceView } from './components/WorkspaceView';
import { TasksView } from './components/TasksView';
import { SettingsView } from './components/SettingsView';
import { ThreeTopologyView } from './components/ThreeTopologyView';
import { 
  RepoItem, 
  RepoBranch, 
  CodingTask, 
  GitHubAccountStatus, 
  PersonalityId, 
  TaskMode 
} from './types';
import { GitBranch, X, Layers } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [show3D, setShow3D] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);

  // GitHub State
  const [githubStatus, setGithubStatus] = useState<GitHubAccountStatus>({ connected: false });
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepoItem | null>(null);
  const [branches, setBranches] = useState<RepoBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);

  // Tasks State
  const [tasks, setTasks] = useState<CodingTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);

  // Fetch GitHub status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/github/status');
      if (res.ok) {
        const data = await res.json();
        setGithubStatus(data);
      }
    } catch (e) {
      console.warn('Failed to load GitHub status:', e);
    }
  }, []);

  // Fetch repositories
  const fetchRepos = useCallback(async () => {
    try {
      const res = await fetch('/api/github/repos');
      if (res.ok) {
        const data: RepoItem[] = await res.json();
        setRepos(data);
        if (data.length > 0 && !selectedRepo) {
          setSelectedRepo(data[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to load repos:', e);
    }
  }, [selectedRepo]);

  // Fetch branches when selected repo changes
  const fetchBranches = useCallback(async (repoFullName: string) => {
    try {
      const res = await fetch(`/api/github/branches?repo=${encodeURIComponent(repoFullName)}`);
      if (res.ok) {
        const data: RepoBranch[] = await res.json();
        setBranches(data);
        const def = data.find(b => b.isDefault);
        setSelectedBranch(def ? def.name : data[0]?.name || 'main');
      }
    } catch (e) {
      console.warn('Failed to load branches:', e);
    }
  }, []);

  // Fetch all tasks
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data: CodingTask[] = await res.json();
        setTasks(data);
        if (!activeTaskId && data.length > 0) {
          setActiveTaskId(data[0].id);
        }
      }
    } catch (e) {
      console.warn('Failed to load tasks:', e);
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

  // Task polling for active background execution
  const currentTask = tasks.find(t => t.id === activeTaskId) || null;
  const isCurrentTaskRunning = currentTask?.status === 'running' || currentTask?.status === 'queued';

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isCurrentTaskRunning && activeTaskId) {
      const pollInterval = dataSaver ? 4000 : 1500;
      timer = setInterval(async () => {
        try {
          const res = await fetch(`/api/tasks/${activeTaskId}`);
          if (res.ok) {
            const updatedTask: CodingTask = await res.json();
            setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
          }
        } catch (e) {
          console.warn('Task poll error:', e);
        }
      }, pollInterval);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCurrentTaskRunning, activeTaskId, dataSaver]);

  // Actions
  const handleStartTask = async (
    prompt: string, 
    personality: PersonalityId, 
    mode: TaskMode, 
    thinkingEnabled: boolean
  ) => {
    if (!selectedRepo) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          repo: selectedRepo.fullName,
          branch: selectedBranch,
          personality,
          mode,
          thinkingEnabled,
        }),
      });

      if (res.ok) {
        const newTask: CodingTask = await res.json();
        setTasks(prev => [newTask, ...prev]);
        setActiveTaskId(newTask.id);
        setCurrentTab('workspace');
      }
    } catch (e) {
      console.error('Failed to submit task:', e);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'cancelled' } : t));
      }
    } catch (e) {
      console.warn('Error cancelling task:', e);
    }
  };

  const handleApplyChanges = async (taskId: string) => {
    setIsApplyingChanges(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/apply`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              branchName: result.branchName,
              prUrl: result.prUrl,
              finalReport: t.finalReport ? {
                ...t.finalReport,
                branchName: result.branchName,
                prUrl: result.prUrl,
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
    const res = await fetch('/api/github/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to authenticate');
    }

    const status = await res.json();
    setGithubStatus(status);
    fetchRepos();
  };

  const handleDisconnectGitHub = async () => {
    await fetch('/api/github/disconnect', { method: 'POST' });
    setGithubStatus({ connected: false });
    fetchRepos();
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
        onToggle3D={() => setShow3D(!show3D)}
        show3D={show3D}
        onSelectRepoClick={() => setIsRepoModalOpen(true)}
      />

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
          {show3D && (
            <div className="p-4 max-w-6xl mx-auto">
              <ThreeTopologyView
                currentRepo={selectedRepo}
                dataSaver={dataSaver}
                onClose={() => setShow3D(false)}
              />
            </div>
          )}

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
              onRefresh={fetchTasks}
            />
          )}

          {currentTab === 'topology' && (
            <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
              <div>
                <h1 className="text-2xl font-semibold text-[#F0F4F9] tracking-tight flex items-center gap-2">
                  <Layers size={22} className="text-[#A8C7FA]" />
                  <span>3D Repository Matrix</span>
                </h1>
                <p className="text-xs text-[#8E918F] mt-1">
                  Interactive procedural 3D model representing repository structure, core runtime, and AI agent nodes.
                </p>
              </div>
              <ThreeTopologyView
                currentRepo={selectedRepo}
                dataSaver={dataSaver}
              />
            </div>
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

      {/* Repository Selector Modal (Google AI Studio Modal Style) */}
      {isRepoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E1F20] border border-[#333538] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#333538] pb-3">
              <div className="flex items-center gap-2">
                <GitBranch size={16} className="text-[#A8C7FA]" />
                <h2 className="text-sm font-semibold text-[#F0F4F9]">
                  Select Repository
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

            <div className="space-y-1 max-h-72 overflow-y-auto">
              {repos.map(r => {
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
                        ? 'bg-[#282A2C] border-[#A8C7FA]/50 text-white'
                        : 'bg-[#131314] border-[#333538] text-[#C4C7C5] hover:bg-[#282A2C] hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#F0F4F9] flex items-center gap-2">
                        <span>{r.name}</span>
                        {r.isPrivate && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-[#333538] rounded text-[#8E918F]">
                            private
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#8E918F] line-clamp-1 mt-0.5">
                        {r.description || 'No description provided'}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-[#A8C7FA] bg-[#004A77] px-2 py-0.5 rounded-full">
                      {r.defaultBranch}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
