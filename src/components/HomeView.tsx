import React, { useState } from 'react';
import { 
  Sparkles, 
  Terminal, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  GitBranch, 
  ArrowRight,
  Code2,
  Bug,
  ShieldCheck,
  Compass,
  BrainCircuit
} from 'lucide-react';
import { RepoItem, CodingTask, PersonalityId, TaskMode } from '../types';

interface HomeViewProps {
  repos: RepoItem[];
  selectedRepo: RepoItem | null;
  selectedBranch: string;
  onSelectRepo: (repo: RepoItem) => void;
  onSelectBranch: (branch: string) => void;
  tasks: CodingTask[];
  onStartTask: (prompt: string, personality: PersonalityId, mode: TaskMode, thinkingEnabled: boolean) => void;
  onNavigateToTask: (task: CodingTask) => void;
  onOpenWorkspace: () => void;
}

const TEMPLATE_PROMPTS = [
  {
    icon: <Bug size={16} className="text-[#A8C7FA]" />,
    personality: 'debugger' as PersonalityId,
    mode: 'implement' as TaskMode,
    title: 'Fix music player audio loop',
    desc: 'Diagnose and fix playback position reset when switching tracks in Player.tsx',
    prompt: 'Fix a bug in my music player where playback state does not reset properly when switching tracks in Player.tsx.',
  },
  {
    icon: <Code2 size={16} className="text-[#A8C7FA]" />,
    personality: 'builder' as PersonalityId,
    mode: 'implement' as TaskMode,
    title: 'Add settings screen',
    desc: 'Create an accessible settings screen with preferences and equalizer options',
    prompt: 'Add a clean settings page to my existing React app with dark mode preferences and audio equalizer settings.',
  },
  {
    icon: <AlertCircle size={16} className="text-[#F2B8B5]" />,
    personality: 'debugger' as PersonalityId,
    mode: 'ask' as TaskMode,
    title: 'Diagnose CI workflow failure',
    desc: 'Investigate build failure logs in GitHub Actions and provide a verified patch',
    prompt: 'Investigate why my GitHub Actions CI build failed and recommend the verified configuration fix.',
  },
  {
    icon: <Compass size={16} className="text-[#C4C7C5]" />,
    personality: 'architect' as PersonalityId,
    mode: 'plan' as TaskMode,
    title: 'Plan mobile navigation overhaul',
    desc: 'Architect improved touch-friendly navigation while preserving existing design',
    prompt: 'Plan how to improve the mobile touch navigation without changing the existing visual design system.',
  },
  {
    icon: <ShieldCheck size={16} className="text-[#A8C7FA]" />,
    personality: 'reviewer' as PersonalityId,
    mode: 'ask' as TaskMode,
    title: 'Audit repository authentication',
    desc: 'Analyze security model, token lifecycle, and potential exposure vulnerabilities',
    prompt: 'Explain how authentication and token validation work across this repository and audit for security risks.',
  },
];

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

  const applyTemplate = (t: typeof TEMPLATE_PROMPTS[0]) => {
    setQuickPrompt(t.prompt);
    setSelectedPersonality(t.personality);
    setSelectedMode(t.mode);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 pb-24 md:pb-16">
      {/* Google AI Studio Style Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-[#A8C7FA]">Personal AI Coding Workspace</span>
          <span className="text-[#8E918F]">·</span>
          <span className="text-xs text-[#8E918F]">Powered by Gemini 3.8 Flash & 4 Argon</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#F0F4F9] tracking-tight">
          What would you like to build today?
        </h1>
        <p className="text-sm text-[#C4C7C5] mt-1.5 max-w-2xl leading-relaxed">
          Describe coding tasks in natural language, dispatch work to specialized engineering personalities, inspect reviewable diffs, and create GitHub Pull Requests.
        </p>
      </div>

      {/* Main Task Creator Box (Sleek AI Studio Prompt Editor Style) */}
      <div className="bg-[#1E1F20] border border-[#333538] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between text-xs text-[#C4C7C5] pb-2 border-b border-[#333538]">
          <div className="flex items-center gap-2">
            <Terminal size={15} className="text-[#A8C7FA]" />
            <span className="font-medium text-[#E3E3E3]">New Task Prompt</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#8E918F]">
            <span>Target:</span>
            <span className="text-[#E3E3E3]">{selectedRepo ? selectedRepo.name : 'No repo selected'}</span>
            <span>({selectedBranch})</span>
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
                disabled={!quickPrompt.trim()}
                className="px-4 py-2 bg-[#A8C7FA] hover:bg-[#7DACF8] text-[#131314] font-medium text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Run</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Metrics Row (Google Clean Counters) */}
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
          <div className="text-[11px] text-[#8E918F] mt-0.5">Connected & synced</div>
        </div>
      </div>

      {/* Suggested Quick Prompt Templates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8E918F]">
            Starter Prompts & Scenarios
          </h2>
          <span className="text-xs text-[#8E918F]">Click any prompt to populate</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEMPLATE_PROMPTS.map((t, idx) => (
            <div
              key={idx}
              onClick={() => applyTemplate(t)}
              className="p-3.5 bg-[#1E1F20] hover:bg-[#282A2C] border border-[#333538] hover:border-[#444746] rounded-xl cursor-pointer transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {t.icon}
                  <span className="text-xs font-medium text-[#F0F4F9]">
                    {t.title}
                  </span>
                </div>
                <p className="text-xs text-[#C4C7C5] line-clamp-2 leading-relaxed">
                  {t.desc}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#333538]/50 text-[11px] text-[#8E918F]">
                <span className="capitalize">{t.personality}</span>
                <span>·</span>
                <span className="uppercase font-mono">{t.mode}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Tasks List */}
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
            No tasks submitted yet. Choose a template or describe your first coding task above.
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
                    task.status === 'running' ? 'bg-[#A8C7FA]' :
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
