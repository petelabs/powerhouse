import React from 'react';
import { 
  GitBranch, 
  Layers, 
  ChevronDown, 
  Sparkles,
  Wifi,
  Github,
  CheckCircle2
} from 'lucide-react';
import { RepoItem, GitHubAccountStatus } from '../types';

interface NavbarProps {
  currentRepo: RepoItem | null;
  currentBranch: string;
  githubStatus: GitHubAccountStatus;
  dataSaver: boolean;
  onToggle3D: () => void;
  show3D: boolean;
  onSelectRepoClick: () => void;
}

export function Navbar({
  currentRepo,
  currentBranch,
  githubStatus,
  dataSaver,
  onToggle3D,
  show3D,
  onSelectRepoClick,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#1E1F20] border-b border-[#333538] px-3 sm:px-5 py-2.5 flex items-center justify-between">
      {/* Brand & Breadcrumbs (AI Studio Style) */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#7DACF8] to-[#A8C7FA] flex items-center justify-center text-[#131314] shadow-sm">
            <Sparkles size={16} className="fill-[#131314]" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#F0F4F9]">
            Powerhouse
          </span>
        </div>

        <span className="text-[#8E918F] font-normal select-none">/</span>

        {/* Repository & Branch Breadcrumb Selector */}
        <button
          onClick={onSelectRepoClick}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#282A2C] transition text-xs text-[#E3E3E3] max-w-[200px] sm:max-w-[280px]"
          aria-label="Select Repository and Branch"
        >
          <GitBranch size={13} className="text-[#A8C7FA] flex-shrink-0" />
          <span className="truncate font-medium">
            {currentRepo ? currentRepo.name : 'Select Repository'}
          </span>
          <span className="text-[11px] text-[#8E918F] hidden sm:inline">
            :{currentBranch}
          </span>
          <ChevronDown size={12} className="text-[#8E918F] flex-shrink-0" />
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* 3D Repo Matrix Toggle */}
        <button
          onClick={onToggle3D}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
            show3D
              ? 'bg-[#A8C7FA] text-[#131314] font-semibold'
              : 'bg-[#282A2C] text-[#C4C7C5] hover:text-white hover:bg-[#333538]'
          }`}
          title="Toggle 3D Repository Topology"
        >
          <Layers size={13} />
          <span className="hidden sm:inline">3D View</span>
        </button>

        {/* Data Saver Status */}
        {dataSaver && (
          <div
            className="hidden md:flex items-center gap-1 text-[11px] text-[#43D9CC] bg-[#43D9CC]/10 border border-[#43D9CC]/20 px-2 py-1 rounded-full"
            title="Data Saver Active"
          >
            <Wifi size={11} />
            <span>Data Saver</span>
          </div>
        )}

        {/* GitHub Account Badge */}
        <div className="flex items-center pl-1">
          {githubStatus.connected ? (
            <div className="flex items-center gap-1.5 bg-[#282A2C] border border-[#333538] px-2.5 py-1 rounded-full text-xs">
              {githubStatus.avatarUrl ? (
                <img
                  src={githubStatus.avatarUrl}
                  alt={githubStatus.username}
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <Github size={13} className="text-[#E3E3E3]" />
              )}
              <span className="text-[11px] text-[#E3E3E3] font-medium hidden sm:inline">
                {githubStatus.username}
              </span>
              <CheckCircle2 size={11} className="text-emerald-400" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-[#C4C7C5] bg-[#282A2C] border border-[#333538] px-2.5 py-1 rounded-full">
              <Github size={12} className="text-[#8E918F]" />
              <span className="hidden sm:inline">Sandbox</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
