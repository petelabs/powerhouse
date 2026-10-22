import React, { useState } from 'react';
import { 
  Home, 
  Terminal, 
  CheckSquare, 
  Settings, 
  Layers, 
  GitBranch, 
  Search,
  Clock,
  Sparkles,
  Lock,
  ChevronRight
} from 'lucide-react';
import { NavTab } from './BottomNav';
import { RepoItem, CodingTask } from '../types';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  repos: RepoItem[];
  selectedRepo: RepoItem | null;
  onSelectRepo: (repo: RepoItem) => void;
  recentTasks: CodingTask[];
  onSelectTask: (task: CodingTask) => void;
  activeTaskId?: string;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  repos,
  selectedRepo,
  onSelectRepo,
  recentTasks,
  onSelectTask,
  activeTaskId,
}: SidebarProps) {
  const [repoSearch, setRepoSearch] = useState('');

  const filteredRepos = repos.filter(r => 
    r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    r.fullName.toLowerCase().includes(repoSearch.toLowerCase())
  );

  return (
    <aside className="w-60 bg-[#1E1F20] border-r border-[#333538] flex-col h-[calc(100vh-52px)] sticky top-[52px] hidden md:flex select-none">
      {/* Primary Navigation (Google AI Studio Style) */}
      <div className="p-2.5 space-y-0.5 border-b border-[#333538]">
        <button
          onClick={() => onSelectTab('home')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
            currentTab === 'home'
              ? 'bg-[#282A2C] text-[#A8C7FA] font-semibold'
              : 'text-[#C4C7C5] hover:bg-[#282A2C]/60 hover:text-white'
          }`}
        >
          <Home size={16} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => onSelectTab('workspace')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
            currentTab === 'workspace'
              ? 'bg-[#282A2C] text-[#A8C7FA] font-semibold'
              : 'text-[#C4C7C5] hover:bg-[#282A2C]/60 hover:text-white'
          }`}
        >
          <Terminal size={16} />
          <span>Workspace</span>
        </button>

        <button
          onClick={() => onSelectTab('tasks')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
            currentTab === 'tasks'
              ? 'bg-[#282A2C] text-[#A8C7FA] font-semibold'
              : 'text-[#C4C7C5] hover:bg-[#282A2C]/60 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <CheckSquare size={16} />
            <span>Tasks</span>
          </div>
          {recentTasks.length > 0 && (
            <span className="text-[11px] text-[#8E918F] font-mono">
              {recentTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('topology')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
            currentTab === 'topology'
              ? 'bg-[#282A2C] text-[#A8C7FA] font-semibold'
              : 'text-[#C4C7C5] hover:bg-[#282A2C]/60 hover:text-white'
          }`}
        >
          <Layers size={16} />
          <span>3D Repo Matrix</span>
        </button>

        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
            currentTab === 'settings'
              ? 'bg-[#282A2C] text-[#A8C7FA] font-semibold'
              : 'text-[#C4C7C5] hover:bg-[#282A2C]/60 hover:text-white'
          }`}
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>

      {/* Repositories Section */}
      <div className="p-3 border-b border-[#333538]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E918F]">
            Repositories
          </span>
          <span className="text-[11px] text-[#8E918F] font-mono">
            {repos.length}
          </span>
        </div>

        {/* Quick Search */}
        <div className="relative mb-2">
          <Search size={13} className="absolute left-2.5 top-2 text-[#8E918F]" />
          <input
            type="text"
            placeholder="Filter repos..."
            value={repoSearch}
            onChange={e => setRepoSearch(e.target.value)}
            className="w-full bg-[#131314] border border-[#333538] rounded-md pl-8 pr-2 py-1 text-xs text-[#E3E3E3] placeholder-[#8E918F] focus:outline-none focus:border-[#A8C7FA]"
          />
        </div>

        <div className="space-y-0.5 max-h-36 overflow-y-auto">
          {filteredRepos.map(repo => {
            const isSelected = selectedRepo?.fullName === repo.fullName;
            return (
              <button
                key={repo.id}
                onClick={() => onSelectRepo(repo)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition flex items-center justify-between group ${
                  isSelected
                    ? 'bg-[#282A2C] text-[#A8C7FA] font-medium'
                    : 'text-[#C4C7C5] hover:bg-[#282A2C]/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <GitBranch size={13} className={isSelected ? 'text-[#A8C7FA]' : 'text-[#8E918F]'} />
                  <span className="truncate">{repo.name}</span>
                </div>
                {repo.isPrivate && (
                  <Lock size={10} className="text-[#8E918F] flex-shrink-0 ml-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E918F]">
            Recent Activity
          </span>
        </div>

        {recentTasks.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#8E918F]">
            No recent activity
          </div>
        ) : (
          <div className="space-y-1">
            {recentTasks.slice(0, 7).map(task => {
              const isActive = activeTaskId === task.id;
              return (
                <div
                  key={task.id}
                  onClick={() => {
                    onSelectTask(task);
                    onSelectTab('workspace');
                  }}
                  className={`p-2 rounded-md text-left cursor-pointer transition ${
                    isActive
                      ? 'bg-[#282A2C] text-white border-l-2 border-[#A8C7FA]'
                      : 'hover:bg-[#282A2C]/40 text-[#C4C7C5] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-0.5 text-[#8E918F]">
                    <span className="capitalize text-[#A8C7FA] font-medium">{task.personality}</span>
                    <span className="uppercase">{task.status}</span>
                  </div>
                  <div className="text-xs truncate font-medium text-[#E3E3E3]">{task.title}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
