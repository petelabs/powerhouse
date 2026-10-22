import React from 'react';
import { FinalReport } from '../types';
import { 
  CheckCircle, 
  Terminal, 
  GitPullRequest, 
  Rocket, 
  FileCheck2, 
  ExternalLink
} from 'lucide-react';

interface ReportViewerProps {
  report: FinalReport;
  repo: string;
  branch: string;
  personality: string;
  model: string;
}

export function ReportViewer({ report, repo, branch, personality, model }: ReportViewerProps) {
  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <div className="p-4 bg-[#131314] border border-[#333538] rounded-lg space-y-3">
        <div className="flex items-center justify-between border-b border-[#333538] pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={17} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-[#F0F4F9]">Verification & Completion Report</h3>
          </div>
          <span className="text-[11px] font-mono text-[#8E918F]">
            {new Date(report.verifiedAt).toLocaleTimeString()}
          </span>
        </div>

        <p className="text-xs text-[#E3E3E3] leading-relaxed">
          {report.summary}
        </p>

        {/* Technical Meta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
          <div className="bg-[#1E1F20] p-2 rounded border border-[#333538]">
            <span className="text-[#8E918F] block text-[10px] uppercase">Target Repo</span>
            <span className="text-[#E3E3E3] truncate block">{repo}</span>
          </div>
          <div className="bg-[#1E1F20] p-2 rounded border border-[#333538]">
            <span className="text-[#8E918F] block text-[10px] uppercase">Branch</span>
            <span className="text-[#A8C7FA] block">{branch}</span>
          </div>
          <div className="bg-[#1E1F20] p-2 rounded border border-[#333538]">
            <span className="text-[#8E918F] block text-[10px] uppercase">Agent</span>
            <span className="text-[#E3E3E3] block capitalize">{personality}</span>
          </div>
          <div className="bg-[#1E1F20] p-2 rounded border border-[#333538]">
            <span className="text-[#8E918F] block text-[10px] uppercase">Model</span>
            <span className="text-emerald-400 block truncate">{model}</span>
          </div>
        </div>
      </div>

      {/* 3 Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Repository Changes Status */}
        <div className="p-3.5 bg-[#131314] border border-[#333538] rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <FileCheck2 size={15} className="text-[#A8C7FA]" />
            <span className="text-xs font-medium text-[#F0F4F9]">Repository Changes</span>
          </div>
          <div className="text-xs text-[#8E918F] mt-1">
            {report.filesActuallyChanged.length > 0 ? (
              <span className="text-emerald-400 font-mono">
                {report.filesActuallyChanged.length} file(s) structured for patch
              </span>
            ) : (
              <span>No files modified (Advisory)</span>
            )}
          </div>
        </div>

        {/* Verification & Test Status */}
        <div className="p-3.5 bg-[#131314] border border-[#333538] rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Terminal size={15} className="text-[#A8C7FA]" />
            <span className="text-xs font-medium text-[#F0F4F9]">Test & Lint Validation</span>
          </div>
          <div className="text-xs text-[#8E918F] mt-1">
            <span className={`inline-block font-mono text-[10px] px-1.5 py-0.2 rounded mr-1.5 ${
              report.testResults.status === 'passed' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' :
              report.testResults.status === 'skipped' ? 'bg-[#282A2C] text-[#8E918F]' :
              'bg-amber-950/60 text-amber-400'
            }`}>
              {report.testResults.status.toUpperCase()}
            </span>
            <span>{report.testResults.summary}</span>
          </div>
        </div>

        {/* Deployment Status */}
        <div className="p-3.5 bg-[#131314] border border-[#333538] rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Rocket size={15} className="text-[#A8C7FA]" />
            <span className="text-xs font-medium text-[#F0F4F9]">Deployment Pipeline</span>
          </div>
          <div className="text-xs text-[#8E918F] mt-1">
            <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded mr-1.5 ${
              report.deploymentStatus === 'deployed' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' :
              report.deploymentStatus === 'pending' ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30' :
              'bg-[#282A2C] text-[#8E918F]'
            }`}>
              {report.deploymentStatus.toUpperCase()}
            </span>
            <span>
              {report.deploymentStatus === 'deployed' ? 'Changes applied to remote branch' :
               report.deploymentStatus === 'pending' ? 'Ready to open Pull Request' :
               'No deployment required'}
            </span>
          </div>
        </div>
      </div>

      {/* Pull Request / Branch Output Banner */}
      {report.prUrl && (
        <div className="p-3 bg-[#131314] border border-emerald-500/30 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GitPullRequest size={17} className="text-emerald-400" />
            <div>
              <div className="text-xs font-medium text-[#E3E3E3]">Remote Working Branch Created</div>
              <div className="text-xs font-mono text-emerald-400">{report.branchName}</div>
            </div>
          </div>
          <a
            href={report.prUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-[#282A2C] hover:bg-[#333538] text-[#A8C7FA] border border-[#333538] text-xs font-medium rounded-md flex items-center gap-1.5 transition"
          >
            <span>View on GitHub</span>
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* Changed Files Breakdown */}
      {report.filesActuallyChanged.length > 0 && (
        <div className="p-3 bg-[#131314] border border-[#333538] rounded-lg">
          <span className="text-xs font-medium text-[#E3E3E3] block mb-2">Targeted & Changed Files</span>
          <div className="space-y-1 font-mono text-xs">
            {report.filesActuallyChanged.map(file => (
              <div key={file} className="px-2.5 py-1 bg-[#1E1F20] rounded text-[#A8C7FA] border border-[#333538] flex items-center justify-between">
                <span>{file}</span>
                <span className="text-[10px] text-[#8E918F]">Verified Diff</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
