import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Radio, 
  Database, 
  Trash2, 
  Save, 
  ExternalLink,
  Check,
  AlertCircle,
  BrainCircuit,
  Lock,
  Github,
  Smartphone
} from 'lucide-react';
import { GitHubAccountStatus, ProjectMemory, RepoItem } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  githubStatus: GitHubAccountStatus;
  onConnectGitHub: (token: string) => Promise<void>;
  onDisconnectGitHub: () => Promise<void>;
  dataSaver: boolean;
  onToggleDataSaver: (val: boolean) => void;
  repos: RepoItem[];
  selectedRepo: RepoItem | null;
}

export function SettingsView({
  githubStatus,
  onConnectGitHub,
  onDisconnectGitHub,
  dataSaver,
  onToggleDataSaver,
  repos,
  selectedRepo,
}: SettingsViewProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState(false);

  // Project Memory State
  const [currentMemoryRepo, setCurrentMemoryRepo] = useState<string>(
    selectedRepo?.fullName || (repos.length > 0 ? repos[0].fullName : '')
  );
  const [memory, setMemory] = useState<ProjectMemory | null>(null);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [memoryMessage, setMemoryMessage] = useState<string | null>(null);

  const loadMemory = async (repoName: string) => {
    if (!repoName) return;
    try {
      const res = await fetch(`/api/memory/${repoName}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setMemory(data);
      }
    } catch (e) {
      console.warn('Error loading memory:', e);
    }
  };

  useEffect(() => {
    if (currentMemoryRepo) {
      loadMemory(currentMemoryRepo);
    }
  }, [currentMemoryRepo]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsConnecting(true);
    setConnectError(null);
    setConnectSuccess(false);

    try {
      await onConnectGitHub(tokenInput.trim());
      setConnectSuccess(true);
      setTokenInput('');
      setTimeout(() => setConnectSuccess(false), 3000);
    } catch (err: any) {
      setConnectError(err.message || 'Failed to authenticate token with GitHub API');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveMemory = async () => {
    if (!memory || !currentMemoryRepo) return;
    setIsSavingMemory(true);
    setMemoryMessage(null);
    try {
      const res = await fetch(`/api/memory/${currentMemoryRepo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memory),
      });
      if (res.ok) {
        setMemoryMessage('Project memory saved successfully.');
        setTimeout(() => setMemoryMessage(null), 3000);
      }
    } catch (err: any) {
      setMemoryMessage(`Error: ${err.message}`);
    } finally {
      setIsSavingMemory(false);
    }
  };

  const handleClearMemory = async () => {
    if (!currentMemoryRepo) return;
    try {
      const res = await fetch(`/api/memory/${currentMemoryRepo}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setMemory(data);
        setMemoryMessage('Project memory cleared for this repository.');
        setTimeout(() => setMemoryMessage(null), 3000);
      }
    } catch (err: any) {
      console.warn(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 pb-24 md:pb-16">
      <div>
        <h1 className="text-2xl font-semibold text-[#F0F4F9] tracking-tight flex items-center gap-2">
          <Settings size={22} className="text-[#A8C7FA]" />
          <span>Settings</span>
        </h1>
        <p className="text-xs text-[#8E918F] mt-1">
          Configure GitHub integration, Progressive Web App options, data saver mode, and repository project memory.
        </p>
      </div>

      {/* GitHub Authentication Card */}
      <div className="bg-[#1E1F20] border border-[#333538] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#333538] pb-3">
          <div className="flex items-center gap-2.5">
            <Github size={18} className="text-[#A8C7FA]" />
            <h2 className="text-sm font-semibold text-[#F0F4F9]">
              GitHub Integration
            </h2>
          </div>

          <div>
            {githubStatus.connected ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                <ShieldCheck size={13} />
                <span>Connected</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-[#C4C7C5] bg-[#282A2C] border border-[#333538] px-2.5 py-1 rounded-full">
                <span>Sandbox Mode</span>
              </span>
            )}
          </div>
        </div>

        {/* Diagnostic info if connected */}
        {githubStatus.connected && (
          <div className="p-4 bg-[#131314] border border-[#333538] rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {githubStatus.avatarUrl && (
                  <img
                    src={githubStatus.avatarUrl}
                    alt={githubStatus.username}
                    className="w-9 h-9 rounded-full border border-[#333538]"
                  />
                )}
                <div>
                  <div className="text-xs font-semibold text-[#F0F4F9] flex items-center gap-2">
                    <span>{githubStatus.name || githubStatus.username}</span>
                    <span className="text-xs text-[#A8C7FA]">(@{githubStatus.username})</span>
                  </div>
                  <div className="text-[11px] text-[#8E918F] mt-0.5">
                    {githubStatus.isFineGrained ? 'Fine-Grained PAT' : 'Personal Access Token'}
                  </div>
                </div>
              </div>

              <button
                onClick={onDisconnectGitHub}
                className="px-3 py-1.5 bg-[#282A2C] hover:bg-[#3C1E20] hover:text-[#F2B8B5] text-[#C4C7C5] border border-[#333538] rounded-md text-xs transition font-medium"
              >
                Disconnect
              </button>
            </div>

            {/* Diagnostic stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-xs">
              <div className="bg-[#1E1F20] p-2.5 rounded border border-[#333538]">
                <span className="text-[#8E918F] block text-[10px] uppercase">Rate Limit</span>
                <span className="text-emerald-400">
                  {githubStatus.rateLimit?.remaining ?? 5000} / {githubStatus.rateLimit?.limit ?? 5000}
                </span>
              </div>
              <div className="bg-[#1E1F20] p-2.5 rounded border border-[#333538]">
                <span className="text-[#8E918F] block text-[10px] uppercase">Scopes</span>
                <span className="text-[#E3E3E3] truncate block">
                  {githubStatus.scopes?.join(', ') || 'repo, read:user'}
                </span>
              </div>
              <div className="bg-[#1E1F20] p-2.5 rounded border border-[#333538] col-span-2 sm:col-span-1">
                <span className="text-[#8E918F] block text-[10px] uppercase">Accessible Repos</span>
                <span className="text-[#A8C7FA]">{repos.length} available</span>
              </div>
            </div>
          </div>
        )}

        {/* Connect Form */}
        <form onSubmit={handleConnect} className="space-y-3">
          <div>
            <label className="block text-xs text-[#C4C7C5] mb-1 font-medium">
              Personal Access Token (Fine-Grained or Classic)
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder={githubStatus.connected ? "••••••••••••••••••••••••••••••••••••" : "ghp_... or github_pat_..."}
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                className="w-full bg-[#131314] border border-[#333538] rounded-lg px-3.5 py-2 text-xs text-[#E3E3E3] placeholder-[#8E918F] font-mono focus:outline-none focus:border-[#A8C7FA]"
              />
              <Lock size={14} className="absolute right-3.5 top-2.5 text-[#8E918F]" />
            </div>
            <p className="text-[11px] text-[#8E918F] mt-1.5 leading-relaxed">
              Token is verified directly with GitHub API and saved locally to enable live repository read/write access on mobile or Vercel deployments.
            </p>
          </div>

          {connectError && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{connectError}</span>
            </div>
          )}

          {connectSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
              <Check size={15} className="flex-shrink-0" />
              <span>Credentials verified and connected successfully!</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#A8C7FA] hover:underline flex items-center gap-1 font-medium"
            >
              <span>Generate GitHub Token</span>
              <ExternalLink size={12} />
            </a>

            <button
              type="submit"
              disabled={isConnecting || !tokenInput.trim()}
              className="px-4 py-2 bg-[#A8C7FA] hover:bg-[#7DACF8] text-[#131314] font-medium text-xs rounded-lg transition disabled:opacity-40"
            >
              {isConnecting ? 'Verifying...' : githubStatus.connected ? 'Update Token' : 'Connect GitHub'}
            </button>
          </div>
        </form>
      </div>

      {/* PWA Mobile Installation Card */}
      <div className="bg-[#1E1F20] border border-[#333538] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#333538] pb-3">
          <div className="flex items-center gap-2.5">
            <Smartphone size={18} className="text-[#A8C7FA]" />
            <div>
              <h2 className="text-sm font-semibold text-[#F0F4F9]">
                Mobile Progressive Web App (PWA)
              </h2>
              <p className="text-xs text-[#8E918F]">
                Install Powerhouse on Android or iOS home screen as a standalone app.
              </p>
            </div>
          </div>

          <PWAInstallButton />
        </div>

        <div className="p-3 bg-[#131314] border border-[#333538] rounded-lg text-xs text-[#C4C7C5] leading-relaxed space-y-1">
          <div className="text-[#E3E3E3] font-medium">Benefits of Mobile Installation:</div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#8E918F]">
            <li>Full screen standalone display without web browser bars</li>
            <li>Fast home screen launch and device offline caching</li>
            <li>Background task execution tracking across app sessions</li>
          </ul>
        </div>
      </div>

      {/* Data Saver & Performance */}
      <div className="bg-[#1E1F20] border border-[#333538] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Radio size={18} className="text-[#A8C7FA]" />
            <div>
              <h2 className="text-sm font-semibold text-[#F0F4F9]">
                Data Saver & Mobile Performance
              </h2>
              <p className="text-xs text-[#8E918F] mt-0.5">
                Optimize network requests, avoid redundant file downloads, and conserve battery on mobile devices.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={dataSaver}
            aria-label="Toggle Data Saver"
            onClick={() => onToggleDataSaver(!dataSaver)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none border border-[#333538] ${
              dataSaver ? 'bg-[#A8C7FA]' : 'bg-[#131314]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                dataSaver ? 'translate-x-6 bg-[#131314]' : 'translate-x-1 bg-[#8E918F]'
              }`}
            />
          </button>
        </div>

        <div className="p-3 bg-[#131314] border border-[#333538] rounded-lg text-xs text-[#8E918F] leading-relaxed">
          When active:
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-[#C4C7C5]">
            <li>Limits background polling intervals for active tasks</li>
            <li>Minimizes mobile battery consumption during long runs</li>
            <li>Compresses file tree indexing to targeted source files</li>
          </ul>
        </div>
      </div>

      {/* AI Reasoning Models Information */}
      <div className="bg-[#1E1F20] border border-[#333538] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-[#333538] pb-3">
          <BrainCircuit size={18} className="text-[#A8C7FA]" />
          <div>
            <h2 className="text-sm font-semibold text-[#F0F4F9]">
              Gemini Reasoning Models
            </h2>
            <p className="text-xs text-[#8E918F]">
              Server-side execution via Google GenAI SDK with multi-model selector.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#131314] border border-[#333538] rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#A8C7FA] font-medium font-mono">gemini-3.8-flash</span>
              <span className="text-[10px] bg-[#004A77] text-[#D3E3FD] px-1.5 py-0.5 rounded font-mono">Recommended</span>
            </div>
            <p className="text-xs text-[#C4C7C5] leading-relaxed">
              Flagship high-throughput general purpose model for coding, rapid refactoring, and multi-file code synthesis.
            </p>
          </div>

          <div className="p-3 bg-[#131314] border border-[#333538] rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-emerald-400 font-medium font-mono">gemini-4-argon</span>
              <span className="text-[10px] bg-emerald-950/50 text-emerald-300 px-1.5 py-0.5 rounded font-mono">Frontier Intelligence</span>
            </div>
            <p className="text-xs text-[#C4C7C5] leading-relaxed">
              Google's premier frontier reasoning model for complex software engineering and deep multi-step architecture.
            </p>
          </div>
        </div>
      </div>

      {/* Project Memory Inspector & Editor */}
      <div className="bg-[#1E1F20] border border-[#333538] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#333538] pb-3">
          <div className="flex items-center gap-2.5">
            <Database size={18} className="text-[#A8C7FA]" />
            <div>
              <h2 className="text-sm font-semibold text-[#F0F4F9]">
                Project Memory
              </h2>
              <p className="text-xs text-[#8E918F]">
                Persistent non-sensitive repository conventions, decisions, and known issues.
              </p>
            </div>
          </div>

          <select
            value={currentMemoryRepo}
            onChange={e => setCurrentMemoryRepo(e.target.value)}
            className="bg-[#131314] border border-[#333538] text-[#E3E3E3] text-xs rounded-md px-2.5 py-1 focus:outline-none focus:border-[#A8C7FA]"
          >
            {repos.map(r => (
              <option key={r.fullName} value={r.fullName}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {memory ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#C4C7C5] mb-1 font-medium">
                Detected Framework & Stack
              </label>
              <input
                type="text"
                value={memory.framework}
                onChange={e => setMemory({ ...memory, framework: e.target.value })}
                className="w-full bg-[#131314] border border-[#333538] rounded-md px-3 py-1.5 text-xs text-[#E3E3E3] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-[#C4C7C5] mb-1 font-medium">
                Conventions & Code Idioms (one per line)
              </label>
              <textarea
                rows={3}
                value={memory.conventions.join('\n')}
                onChange={e => setMemory({ ...memory, conventions: e.target.value.split('\n').filter(Boolean) })}
                className="w-full bg-[#131314] border border-[#333538] rounded-md p-2.5 text-xs text-[#E3E3E3] font-mono resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#C4C7C5] mb-1 font-medium">
                Custom Engineering Notes
              </label>
              <textarea
                rows={2}
                value={memory.customNotes}
                onChange={e => setMemory({ ...memory, customNotes: e.target.value })}
                className="w-full bg-[#131314] border border-[#333538] rounded-md p-2.5 text-xs text-[#E3E3E3] font-mono resize-none"
                placeholder="Specific instructions for the assistant when working on this project..."
              />
            </div>

            {memoryMessage && (
              <div className="text-xs text-[#A8C7FA] font-medium">{memoryMessage}</div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleClearMemory}
                className="px-3 py-1.5 bg-[#282A2C] hover:bg-[#3C1E20] text-[#C4C7C5] hover:text-[#F2B8B5] border border-[#333538] rounded-md text-xs flex items-center gap-1.5 transition font-medium"
              >
                <Trash2 size={13} />
                <span>Reset Memory</span>
              </button>

              <button
                type="button"
                onClick={handleSaveMemory}
                disabled={isSavingMemory}
                className="px-4 py-1.5 bg-[#A8C7FA] hover:bg-[#7DACF8] text-[#131314] font-medium text-xs rounded-md flex items-center gap-1.5 transition"
              >
                <Save size={13} />
                <span>{isSavingMemory ? 'Saving...' : 'Save Memory'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-[#8E918F]">
            Loading repository memory...
          </div>
        )}
      </div>
    </div>
  );
}
