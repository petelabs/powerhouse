import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  GitBranch, 
  FileCode, 
  Activity, 
  MessageSquare, 
  FileCheck2, 
  Compass, 
  Code2, 
  Bug, 
  ShieldCheck, 
  BrainCircuit,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { 
  RepoItem, 
  RepoBranch, 
  CodingTask, 
  PersonalityId, 
  TaskMode 
} from '../types';
import { DiffViewer } from './DiffViewer';
import { ActivityTimeline } from './ActivityTimeline';
import { ReportViewer } from './ReportViewer';

interface WorkspaceViewProps {
  repos: RepoItem[];
  selectedRepo: RepoItem | null;
  selectedBranch: string;
  branches: RepoBranch[];
  onSelectRepo: (repo: RepoItem) => void;
  onSelectBranch: (branch: string) => void;
  currentTask: CodingTask | null;
  onStartTask: (prompt: string, personality: PersonalityId, mode: TaskMode, thinkingEnabled: boolean) => void;
  onCancelTask: (taskId: string) => void;
  onApplyChanges: (taskId: string) => void;
  isApplyingChanges?: boolean;
}

export function WorkspaceView({
  repos,
  selectedRepo,
  selectedBranch,
  branches,
  onSelectRepo,
  onSelectBranch,
  currentTask,
  onStartTask,
  onCancelTask,
  onApplyChanges,
  isApplyingChanges = false,
}: WorkspaceViewProps) {
  const [prompt, setPrompt] = useState('');
  const [personality, setPersonality] = useState<PersonalityId>('builder');
  const [mode, setMode] = useState<TaskMode>('implement');
  const [thinkingEnabled, setThinkingEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'brief' | 'diff' | 'timeline' | 'report'>('brief');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (currentTask?.proposedChanges && currentTask.proposedChanges.length > 0 && activeTab === 'brief') {
      setActiveTab('diff');
    }
  }, [currentTask?.id, currentTask?.proposedChanges?.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !selectedRepo) return;
    onStartTask(prompt.trim(), personality, mode, thinkingEnabled);
  };

  const copyResponse = () => {
    if (!currentTask?.rawResponse) return;
    navigator.clipboard.writeText(currentTask.rawResponse);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const personalities = [
    {
      id: 'architect' as PersonalityId,
      name: 'Architect',
      desc: 'Plan architecture & dependencies',
      icon: <Compass size={14} />,
    },
    {
      id: 'builder' as PersonalityId,
      name: 'Builder',
      desc: 'Write clean code & surgical edits',
      icon: <Code2 size={14} />,
    },
    {
      id: 'debugger' as PersonalityId,
      name: 'Debugger',
      desc: 'Find root cause & verified fix',
      icon: <Bug size={14} />,
    },
    {
      id: 'reviewer' as PersonalityId,
      name: 'Reviewer',
      desc: 'Inspect security & code quality',
      icon: <ShieldCheck size={14} />,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6 pb-24 md:pb-16">
      {/* Google AI Studio Prompt Box */}
      <div className="bg-[#1E1F20] border border-[#333538] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Top Options Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#333538]">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#8E918F]">Repository:</span>
            <select
              value={selectedRepo?.fullName || ''}
              onChange={e => {
                const found = repos.find(r => r.fullName === e.target.value);
                if (found) onSelectRepo(found);
              }}
              className="bg-[#131314] border border-[#333538] text-[#E3E3E3] rounded-md px-2.5 py-1 focus:outline-none focus:border-[#A8C7FA]"
            >
              {repos.map(r => (
                <option key={r.fullName} value={r.fullName}>
                  {r.name} {r.isPrivate ? '(private)' : ''}
                </option>
              ))}
            </select>

            <span className="text-[#8E918F] ml-1">Branch:</span>
            <select
              value={selectedBranch}
              onChange={e => onSelectBranch(e.target.value)}
              className="bg-[#131314] border border-[#333538] text-[#A8C7FA] font-mono rounded-md px-2 py-1 focus:outline-none focus:border-[#A8C7FA]"
            >
              {branches.map(b => (
                <option key={b.name} value={b.name}>
                  {b.name} {b.protected ? '(protected)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Thinking Mode Option */}
          <div className="flex items-center gap-2 bg-[#131314] border border-[#333538] px-3 py-1 rounded-md text-xs">
            <BrainCircuit size={13} className={thinkingEnabled ? 'text-[#A8C7FA]' : 'text-[#8E918F]'} />
            <span className="text-[#C4C7C5]">High Thinking (gemini-4-argon)</span>
            <input
              type="checkbox"
              checked={thinkingEnabled}
              onChange={e => setThinkingEnabled(e.target.checked)}
              className="accent-[#A8C7FA] cursor-pointer"
            />
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            rows={3}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe your coding task, bug fix, refactor, or architecture query..."
            className="w-full bg-[#131314] border border-[#333538] rounded-lg p-3 text-sm text-[#E3E3E3] placeholder-[#8E918F] focus:outline-none focus:border-[#A8C7FA] transition resize-none leading-relaxed"
          />

          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            {/* Personalities Strip */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#131314] border border-[#333538] rounded-lg">
              {personalities.map(p => {
                const isSel = personality === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersonality(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                      isSel
                        ? 'bg-[#282A2C] text-[#A8C7FA] font-medium shadow-sm'
                        : 'text-[#8E918F] hover:text-[#E3E3E3]'
                    }`}
                  >
                    {p.icon}
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Mode & Submit Button */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <div className="flex items-center p-0.5 bg-[#131314] border border-[#333538] rounded-lg">
                {(['ask', 'plan', 'implement'] as TaskMode[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 text-xs rounded-md uppercase font-mono transition-colors ${
                      mode === m
                        ? 'bg-[#282A2C] text-[#A8C7FA] font-medium shadow-sm'
                        : 'text-[#8E918F] hover:text-[#E3E3E3]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!prompt.trim()}
                className="px-5 py-2 bg-[#A8C7FA] hover:bg-[#7DACF8] text-[#131314] font-medium text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play size={13} className="fill-[#131314]" />
                <span>Run</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Task Output Section */}
      {currentTask ? (
        <div className="bg-[#1E1F20] border border-[#333538] rounded-xl overflow-hidden shadow-sm">
          {/* Active Task Banner */}
          <div className="p-4 bg-[#282A2C]/60 border-b border-[#333538] flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${
                  currentTask.status === 'running' ? 'bg-[#A8C7FA]' :
                  currentTask.status === 'succeeded' ? 'bg-emerald-400' :
                  currentTask.status === 'failed' ? 'bg-[#F2B8B5]' :
                  'bg-[#8E918F]'
                }`} />
                <h3 className="text-sm font-semibold text-[#F0F4F9]">{currentTask.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-mono ${
                  currentTask.status === 'running' ? 'bg-[#004A77] text-[#D3E3FD]' :
                  currentTask.status === 'succeeded' ? 'bg-emerald-950/50 text-emerald-300' :
                  currentTask.status === 'failed' ? 'bg-rose-950/50 text-rose-300' :
                  'bg-[#131314] text-[#8E918F]'
                }`}>
                  {currentTask.status}
                </span>
              </div>

              <div className="text-xs text-[#8E918F] flex items-center gap-2">
                <span>{currentTask.repo}</span>
                <span>·</span>
                <span className="text-[#A8C7FA] font-mono">{currentTask.branch}</span>
                <span>·</span>
                <span className="capitalize">{currentTask.personality}</span>
                <span>·</span>
                <span>Model: {currentTask.modelUsed}</span>
              </div>
            </div>

            {/* Cancel Button if running */}
            {(currentTask.status === 'running' || currentTask.status === 'queued') && (
              <button
                onClick={() => onCancelTask(currentTask.id)}
                className="px-3 py-1.5 bg-[#3C1E20] hover:bg-[#5C2B2E] border border-[#F2B8B5]/30 text-[#F2B8B5] rounded-md text-xs transition flex items-center gap-1.5"
              >
                <Square size={12} className="fill-[#F2B8B5]" />
                <span>Cancel</span>
              </button>
            )}
          </div>

          {/* Tab Strip */}
          <div className="flex border-b border-[#333538] bg-[#131314] px-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('brief')}
              className={`py-3 px-3 text-xs font-medium flex items-center gap-1.5 border-b-2 transition select-none ${
                activeTab === 'brief'
                  ? 'border-[#A8C7FA] text-[#A8C7FA]'
                  : 'border-transparent text-[#8E918F] hover:text-[#E3E3E3]'
              }`}
            >
              <MessageSquare size={14} />
              <span>Response</span>
            </button>

            <button
              onClick={() => setActiveTab('diff')}
              className={`py-3 px-3 text-xs font-medium flex items-center gap-1.5 border-b-2 transition select-none ${
                activeTab === 'diff'
                  ? 'border-[#A8C7FA] text-[#A8C7FA]'
                  : 'border-transparent text-[#8E918F] hover:text-[#E3E3E3]'
              }`}
            >
              <FileCode size={14} />
              <span>Reviewable Diff ({currentTask.proposedChanges?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-3 px-3 text-xs font-medium flex items-center gap-1.5 border-b-2 transition select-none ${
                activeTab === 'timeline'
                  ? 'border-[#A8C7FA] text-[#A8C7FA]'
                  : 'border-transparent text-[#8E918F] hover:text-[#E3E3E3]'
              }`}
            >
              <Activity size={14} />
              <span>Activity Center ({currentTask.events?.length || 0})</span>
            </button>

            {currentTask.finalReport && (
              <button
                onClick={() => setActiveTab('report')}
                className={`py-3 px-3 text-xs font-medium flex items-center gap-1.5 border-b-2 transition select-none ${
                  activeTab === 'report'
                    ? 'border-[#A8C7FA] text-[#A8C7FA]'
                    : 'border-transparent text-[#8E918F] hover:text-[#E3E3E3]'
                }`}
              >
                <FileCheck2 size={14} />
                <span>Verification Report</span>
              </button>
            )}
          </div>

          {/* Tab Content Panes */}
          <div className="p-4 sm:p-6 min-h-[300px]">
            {activeTab === 'brief' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8E918F] font-medium">Assistant Output</span>
                  <button
                    onClick={copyResponse}
                    className="text-xs text-[#8E918F] hover:text-[#E3E3E3] flex items-center gap-1 transition"
                  >
                    {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="bg-[#131314] border border-[#333538] rounded-lg p-4 font-mono text-xs text-[#E3E3E3] leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                  {currentTask.rawResponse || (
                    <div className="text-[#8E918F] py-8 text-center font-sans">
                      Analyzing repository structure and synthesizing solution...
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'diff' && (
              <DiffViewer
                changes={currentTask.proposedChanges || []}
                onApplyChanges={() => onApplyChanges(currentTask.id)}
                isApplying={isApplyingChanges}
                appliedBranch={currentTask.branchName}
                prUrl={currentTask.prUrl}
              />
            )}

            {activeTab === 'timeline' && (
              <ActivityTimeline
                events={currentTask.events || []}
                isLive={currentTask.status === 'running' || currentTask.status === 'queued'}
              />
            )}

            {activeTab === 'report' && currentTask.finalReport && (
              <ReportViewer
                report={currentTask.finalReport}
                repo={currentTask.repo}
                branch={currentTask.branch}
                personality={currentTask.personality}
                model={currentTask.modelUsed}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-[#1E1F20] border border-[#333538] rounded-xl">
          <Terminal size={36} className="mx-auto text-[#8E918F] mb-3" />
          <h3 className="text-sm font-semibold text-[#F0F4F9]">Workspace Ready</h3>
          <p className="text-xs text-[#8E918F] mt-1 max-w-md mx-auto">
            Select a target repository above, configure the personality, and describe your coding task to begin.
          </p>
        </div>
      )}
    </div>
  );
}
