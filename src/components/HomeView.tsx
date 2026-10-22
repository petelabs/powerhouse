import React, { useState } from 'react';
import { 
  Terminal, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  GitBranch, 
  ArrowRight,
  BrainCircuit,
  Sparkles
} from 'lucide-react';
import { RepoItem, CodingTask, PersonalityId, TaskMode } from '../types';

interface HomeViewProps {
  repos: RepoItem[];
  selectedRepo: RepoItem | null;
  selectedBranch: string;
  onSelectRepo: (repo: RepoItem) => void;
  onSelectBranch: (branch: string) => void;
  tasks: CodingTask[];
  onStartTask: (prompt: string, personality: PersonalityId, mode: TaskMode, thinkingEnabled: boolean, model?: string) => void;
  onNavigateToTask: (task: CodingTask) => void;
  onOpenWorkspace: () => void;
}

export function HomeView({
  repos,
  selectedRepo,
  selectedBranch,
  tasks,
  onStartTask,
  onNavigateToTask,
  onOpenWorkspace,
}: HomeViewProps) {
  const [quickPrompt, setQuickPrompt] = useState('');
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityId>('builder');
  const [selectedMode, setSelectedMode] = useState<TaskMode>('implement');
  const [thinkingEnabled, setThinkingEnabled] = useState(true);

  const activeTasks = tasks.filter(t => t.status === 'running' || t.status === 'queued');
  const succeededTasks = tasks.filter(t => t.status === 'succeeded');
  const failedTasks = tasks.filter(t => t.status === 'failed');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    onStartTask(quickPrompt.trim(), selectedPersonality, selectedMode, thinkingEnabled);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 pb-24 md:pb-16">
      {/* Active Background Tasks Banner */}
      {activeTasks.length > 0 && (
        <div className="p-3.5 bg-[#004A77]/40 border border-[#A8C7FA]/40 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A8C7FA] animate-ping" />
            <div>
              <span className="font-semibold text-[#D3E3FD]">AI Worker Running in Background:</span>{' '}
              <span className="text-[#E3E3E3] truncate font-medium">"{activeTasks[0].title}"</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTask(activeTasks[0])}
            className="px-3 py-1 bg-[#A8C7FA] text-[#131314] rounded-md font-medium text-[11px] hover:bg-[#7DACF8] transition flex items-center gap-1 flex-shrink-0"
          >
            <span>View Live Steps</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* Google AI Studio Style Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-[#A8C7FA]">Personal AI Coding Workspace</span>
          <span className="text-[#8E918F]">·</span>
          <span className="text-xs text-[#8E918F]">Powered by Gemini 2.5 Flash & High Thinking</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#F0F4F9] tracking-tight">
          What would you like to build today?
        </h1>
        <p className="text-sm text-[#C4C7C5] mt-1.5 max-w-2xl leading-relaxed">
          Describe coding tasks in natural language, dispatch work to specialized engineering personalities, follow granular step-by-step progress in real time, and inspect reviewable Git diffs.
        </p>
      </div>

      {/* Main Task Creator Box */}
      <div className="bg-[#1E1F20] border border-[#333538] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between text-xs text-[#C4C7C5] pb-2 border-b border-[#333538]">
          <div className="flex items-center gap-2">
            <Terminal size={15} className="text-[#A8C7FA]" />
            <span className="font-medium text-[#E3E3E3]">New Task Prompt</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#8E918F]">
            <span>Target:</span>
            <span className="text-[#E3E3E3] font-medium">{selectedRepo ? selectedRepo.fullName : 'No repository selected'}</span>
            {selectedRepo && <span>({selectedBranch})</span>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            rows={3}
            value={quickPrompt}
            onChange={e => setQuickPrompt(e.target.value)}
            placeholder="Describe your coding objective, bug fix, feature, or architecture query..."
            className="w-full bg-[#131314] border border-[#333538] rounded-lg p-3 text-sm text-[#E3E3E3] placeholder-[#8E918F] focus:outline-none focus:border-[#A8C7FA] transition resize-none leading-relaxed"
          />

          {/* Configuration Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Personality & Mode Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Personality Segment */}
              <div className="flex items-center p-0.5 bg-[#131314] border border-[#333538] rounded-lg">
                {(['architect', 'builder', 'debugger', 'reviewer'] as PersonalityId[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPersonality(p)}
                    className={`px-2.5 py-1 text-xs rounded-md capitalize transition-colors ${
                      selectedPersonality === p
                        ? 'bg-[#282A2C] text-[#A8C7FA] font-medium shadow-sm'
                        : 'text-[#8E918F] hover:text-[#E3E3E3]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Mode Segment */}
              <div className="flex items-center p-0.5 bg-[#131314] border border-[#333538] rounded-lg">
                {(['ask', 'plan', 'implement'] as TaskMode[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMode(m)}
                    className={`px-2.5 py-1 text-xs rounded-md uppercase font-mono transition-colors ${
                      selectedMode === m
                        ? 'bg-[#282A2C] text-[#A8C7FA] font-medium shadow-sm'
                        : 'text-[#8E918F] hover:text-[#E3E3E3]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Thinking Mode Toggle & Run CTA */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <label className="flex items-center gap-1.5 text-xs text-[#C4C7C5] cursor-pointer select-none">
                <BrainCircuit size={14} className={thinkingEnabled ? 'text-[#A8C7FA]' : 'text-[#8E918F]'} />
                <span>High Thinking</span>
                <input
                  type="checkbox"
                  checked={thinkingEnabled}
                  onChange={e => setThinkingEnabled(e.target.checked)}
                  className="accent-[#A8C7FA] cursor-pointer ml-1"
                />
              </label>

              <button
                type="submit"
                disabled={!quickPrompt.trim() || !selectedRepo}
                className="px-4 py-2 bg-[#A8C7FA] hover:bg-[#7DACF8] text-[#131314] font-medium text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Run</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#1E1F20] border border-[#333538] p-3.5 rounded-lg">
          <div className="flex items-center justify-between text-xs text-[#8E918F] mb-1">
            <span>Active Tasks</span>
            <Clock size={14} className="text-[#A8C7FA]" />
          </div>
          <div className="text-xl font-semibold text-[#F0F4F9] font-mono">{activeTasks.length}</div>
          <div className="text-[11px] text-[#8E918F] mt-0.5">
            {activeTasks.length > 0 ? 'Worker running in background' : 'Idle'}
          </div>
        </div>

        <div className="bg-[#1E1F20] border border-[#333538] p-3.5 rounded-lg">
          <div className="flex items-center justify-between text-xs text-[#8E918F] mb-1">
            <span>Completed</span>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <div className="text-xl font-semibold text-[#F0F4F9] font-mono">{succeededTasks.length}</div>
          <div className="text-[11px] text-[#8E918F] mt-0.5">Verified changes</div>
        </div>

        <div className="bg-[#1E1F20] border border-[#333538] p-3.5 rounded-lg">
          <div className="flex items-center justify-between text-xs text-[#8E918F] mb-1">
            <span>Failed / Cancelled</span>
            <AlertCircle size={14} className="text-[#F2B8B5]" />
          </div>
          <div className="text-xl font-semibold text-[#F0F4F9] font-mono">{failedTasks.length}</div>
          <div className="text-[11px] text-[#8E918F] mt-0.5">Actionable logs kept</div>
        </div>

        <div className="bg-[#1E1F20] border border-[#333538] p-3.5 rounded-lg">
          <div className="flex items-center justify-between text-xs text-[#8E918F] mb-1">
            <span>Repositories</span>
            <GitBranch size={14} className="text-[#A8C7FA]" />
          </div>
          <div className="text-xl font-semibold text-[#F0F4F9] font-mono">{repos.length}</div>
          <div className="text-[11px] text-[#8E918F] mt-0.5">Connected GitHub repos</div>
        </div>
      </div>

      {/* Recent Workspace Tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8E918F]">
            Recent Workspace Tasks
          </h2>
          <button
            onClick={onOpenWorkspace}
            className="text-xs text-[#A8C7FA] hover:underline flex items-center gap-1 font-medium"
          >
            <span>Open Workspace</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="p-8 text-center bg-[#1E1F20] border border-[#333538] rounded-xl text-xs text-[#8E918F]">
            No tasks submitted yet. Select a repository and run your first coding objective above.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 5).map(task => (
              <div
                key={task.id}
                onClick={() => onNavigateToTask(task)}
                className="p-3.5 bg-[#1E1F20] hover:bg-[#282A2C] border border-[#333538] rounded-lg flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-3 truncate pr-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.status === 'running' ? 'bg-[#A8C7FA] animate-pulse' :
                    task.status === 'succeeded' ? 'bg-emerald-400' :
                    task.status === 'failed' ? 'bg-[#F2B8B5]' :
                    'bg-[#8E918F]'
                  }`} />
                  <div className="truncate">
                    <div className="text-xs font-medium text-[#E3E3E3] truncate">{task.title}</div>
                    <div className="text-[11px] text-[#8E918F] flex items-center gap-2 mt-0.5">
                      <span>{task.repo.split('/')[1] || task.repo}</span>
                      <span>·</span>
                      <span className="capitalize">{task.personality}</span>
                      <span>·</span>
                      <span>{new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {task.proposedChanges && task.proposedChanges.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-[#A8C7FA]">{task.proposedChanges.length} file(s) changed</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-mono ${
                    task.status === 'running' ? 'bg-[#004A77] text-[#D3E3FD]' :
                    task.status === 'succeeded' ? 'bg-emerald-950/50 text-emerald-300' :
                    task.status === 'failed' ? 'bg-rose-950/50 text-rose-300' :
                    'bg-[#282A2C] text-[#C4C7C5]'
                  }`}>
                    {task.status}
                  </span>
                  <ArrowRight size={13} className="text-[#8E918F]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
