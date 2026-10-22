import React from 'react';
import { 
  GitBranch, 
  ChevronDown, 
  Sparkles,
  Wifi,
  Github
} from 'lucide-react';
import { RepoItem, GitHubAccountStatus } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentRepo: RepoItem | null;
  currentBranch: string;
  githubStatus: GitHubAccountStatus;
  dataSaver: boolean;
  onSelectRepoClick: () => void;
}

export function Navbar({
  currentRepo,
  currentBranch,
  githubStatus,
  dataSaver,
  onSelectRepoClick,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#1E1F20] border-b border-[#333538] px-3 sm:px-5 py-2.5 flex items-center justify-between">
      {/* Brand & Breadcrumbs */}
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
            {currentRepo ? currentRepo.name : (githubStatus.connected ? 'Select Repository' : 'Connect GitHub')}
          </span>
          {currentRepo && (
            <span className="text-[11px] text-[#8E918F] hidden sm:inline">
              :{currentBranch}
            </span>
          )}
          <ChevronDown size={12} className="text-[#8E918F] flex-shrink-0" />
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* PWA Install Button */}
        <PWAInstallButton compact />

        {/* Data Saver Status */}
        {dataSaver && (
          <div
            className="hidden sm:flex items-center gap-1 text-[11px] text-[#43D9CC] bg-[#43D9CC]/10 border border-[#43D9CC]/20 px-2 py-0.5 rounded-full"
            title="Data Saver Active"
          >
            <Wifi size={11} />
            <span>Data Saver</span>
          </div>
        )}

        {/* GitHub Account Badge */}
        <div className="flex items-center">
          {githubStatus.connected ? (
            <div className="flex items-center gap-1.5 bg-[#282A2C] border border-[#333538] px-2.5 py-1 rounded-full text-xs">
              {githubStatus.avatarUrl ? (
                <img
                  src={githubStatus.avatarUrl}
                  alt={githubStatus.username}
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <Github size={13} className="text-[#A8C7FA]" />
              )}
              <span className="font-medium text-[#E3E3E3] hidden sm:inline">
                {githubStatus.username}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-[#8E918F] bg-[#131314] border border-[#333538] px-2.5 py-1 rounded-full">
              <Github size={13} />
              <span className="hidden sm:inline">Not Connected</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
