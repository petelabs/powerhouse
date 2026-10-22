import React, { useState } from 'react';
import { 
  CheckSquare, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Square, 
  ArrowRight,
  GitBranch,
  RefreshCw,
  FileCode
} from 'lucide-react';
import { CodingTask } from '../types';

interface TasksViewProps {
  tasks: CodingTask[];
  onSelectTask: (task: CodingTask) => void;
  onCancelTask: (taskId: string) => void;
  onRefresh: () => void;
}

export function TasksView({
  tasks,
  onSelectTask,
  onCancelTask,
  onRefresh,
}: TasksViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = 
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.repo.toLowerCase().includes(search.toLowerCase()) ||
      t.prompt.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 pb-24 md:pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#F0F4F9] tracking-tight flex items-center gap-2">
            <CheckSquare size={22} className="text-[#A8C7FA]" />
            <span>Task Queue & History</span>
          </h1>
          <p className="text-xs text-[#8E918F] mt-1">
            Durable task records persisted across sessions, browser reloads, and phone locks.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-1.5 bg-[#1E1F20] hover:bg-[#282A2C] border border-[#333538] rounded-md text-xs text-[#C4C7C5] hover:text-white transition flex items-center gap-1.5 self-start font-medium"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-[#8E918F]" />
          <input
            type="text"
            placeholder="Search tasks, repositories, or prompts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#1E1F20] border border-[#333538] rounded-lg pl-9 pr-3 py-2 text-xs text-[#E3E3E3] placeholder-[#8E918F] focus:outline-none focus:border-[#A8C7FA]"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 bg-[#1E1F20] p-1 rounded-lg border border-[#333538] overflow-x-auto">
          {['all', 'running', 'succeeded', 'failed', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-md text-xs uppercase font-mono transition ${
                statusFilter === status
                  ? 'bg-[#282A2C] text-[#A8C7FA] font-medium shadow-sm'
                  : 'text-[#8E918F] hover:text-[#E3E3E3]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="p-12 text-center bg-[#1E1F20] border border-[#333538] rounded-xl">
          <CheckSquare size={36} className="mx-auto text-[#8E918F] mb-2" />
          <h3 className="text-sm font-medium text-[#F0F4F9]">No Tasks Found</h3>
          <p className="text-xs text-[#8E918F] mt-1">
            Try adjusting your search criteria or create a new task in the workspace.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => {
            const timeAgo = new Date(task.createdAt).toLocaleString();
            const isRunning = task.status === 'running' || task.status === 'queued';

            return (
              <div
                key={task.id}
                className="p-3.5 bg-[#1E1F20] hover:bg-[#282A2C] border border-[#333538] rounded-lg transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Main Info */}
                <div 
                  onClick={() => onSelectTask(task)}
                  className="flex-1 cursor-pointer space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-mono ${
                      task.status === 'running' ? 'bg-[#004A77] text-[#D3E3FD]' :
                      task.status === 'succeeded' ? 'bg-emerald-950/50 text-emerald-300' :
                      task.status === 'failed' ? 'bg-rose-950/50 text-rose-300' :
                      'bg-[#131314] text-[#8E918F]'
                    }`}>
                      {task.status}
                    </span>

                    <span className="text-[11px] capitalize text-[#A8C7FA] font-medium">
                      {task.personality}
                    </span>

                    <span className="text-[11px] text-[#8E918F]">
                      · {timeAgo}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-semibold text-[#E3E3E3] group-hover:text-[#A8C7FA] transition">
                    {task.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-[#8E918F]">
                    <GitBranch size={12} className="text-[#A8C7FA]" />
                    <span className="font-mono">{task.repo} : {task.branch}</span>
                    {task.proposedChanges?.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-400 font-mono flex items-center gap-1">
                          <FileCode size={11} />
                          {task.proposedChanges.length} file(s)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {isRunning ? (
                    <button
                      onClick={() => onCancelTask(task.id)}
                      className="px-3 py-1.5 bg-[#3C1E20] hover:bg-[#5C2B2E] border border-[#F2B8B5]/30 text-[#F2B8B5] rounded-md text-xs transition"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectTask(task)}
                      className="px-3 py-1.5 bg-[#131314] hover:bg-[#282A2C] border border-[#333538] rounded-md text-xs text-[#E3E3E3] flex items-center gap-1.5 transition font-medium"
                    >
                      <span>Inspect</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
