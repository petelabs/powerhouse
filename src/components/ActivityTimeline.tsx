import React, { useState } from 'react';
import { ActivityEvent } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Terminal, 
  ChevronDown, 
  ChevronRight,
  Sparkles,
  Loader2
} from 'lucide-react';

interface ActivityTimelineProps {
  events: ActivityEvent[];
  isLive?: boolean;
}

export function ActivityTimeline({ events, isLive = false }: ActivityTimelineProps) {
  const [showTechnicalLogs, setShowTechnicalLogs] = useState(false);

  if (!events || events.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[#8E918F] bg-[#131314] border border-[#333538] rounded-lg">
        {isLive ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={18} className="animate-spin text-[#A8C7FA]" />
            <span>Initializing AI worker process and acquiring repository lock...</span>
          </div>
        ) : (
          'No activity events recorded for this task.'
        )}
      </div>
    );
  }

  const getEventIcon = (level: ActivityEvent['level'], isLatestLive: boolean) => {
    if (isLatestLive) {
      return <Loader2 size={14} className="text-[#A8C7FA] animate-spin flex-shrink-0" />;
    }
    switch (level) {
      case 'success':
        return <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />;
      case 'error':
        return <XCircle size={15} className="text-[#F2B8B5] flex-shrink-0" />;
      case 'stage':
        return <Sparkles size={15} className="text-[#A8C7FA] flex-shrink-0" />;
      default:
        return <Clock size={15} className="text-[#8E918F] flex-shrink-0" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with status & log toggle */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#F0F4F9]">
            Step-by-Step AI Execution Log
          </span>
          {isLive ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#004A77] text-[#D3E3FD] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8C7FA] animate-ping" />
              <span>ACTIVE IN BACKGROUND</span>
            </span>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#282A2C] text-[#C4C7C5]">
              {events.length} STEPS COMPLETED
            </span>
          )}
        </div>

        <button
          onClick={() => setShowTechnicalLogs(!showTechnicalLogs)}
          className="text-xs text-[#8E918F] hover:text-[#E3E3E3] flex items-center gap-1.5 transition"
        >
          <Terminal size={13} />
          <span>{showTechnicalLogs ? 'Hide JSON Log' : 'Technical Details'}</span>
          {showTechnicalLogs ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
      </div>

      {/* Main Timeline Events */}
      <div className="relative pl-6 space-y-3.5 border-l border-[#333538] ml-2.5">
        {events.map((ev, idx) => {
          const isLatest = idx === events.length - 1;
          const isLatestLive = isLatest && isLive;
          const timeStr = new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          return (
            <div key={ev.id} className="relative">
              {/* Marker */}
              <div className={`absolute -left-[31px] top-0.5 p-1 rounded-full border ${
                isLatestLive 
                  ? 'bg-[#004A77] border-[#A8C7FA]' 
                  : 'bg-[#1E1F20] border-[#333538]'
              }`}>
                {getEventIcon(ev.level, isLatestLive)}
              </div>

              {/* Event card */}
              <div className={`p-3 rounded-lg border transition ${
                isLatestLive 
                  ? 'bg-[#1E1F20] border-[#A8C7FA]/60 shadow-md ring-1 ring-[#A8C7FA]/20' 
                  : 'bg-[#131314] border-[#333538]'
              }`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#282A2C] text-[#A8C7FA]">
                      Step {idx + 1}
                    </span>
                    <span className="font-mono text-[#E3E3E3] uppercase tracking-wide font-medium text-[11px]">
                      {ev.stage.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="font-mono text-[#8E918F] text-[11px]">{timeStr}</span>
                </div>

                <p className="text-xs text-[#E3E3E3] leading-relaxed font-sans">{ev.message}</p>

                {ev.details && (
                  <div className="mt-2 text-[11px] text-[#C4C7C5] font-mono bg-[#1E1F20] p-2.5 rounded border border-[#333538] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {ev.details}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expandable Technical Log */}
      {showTechnicalLogs && (
        <div className="mt-4 p-3 bg-[#131314] border border-[#333538] rounded-lg font-mono text-[11px] text-[#C4C7C5] max-h-60 overflow-y-auto">
          <div className="text-[#8E918F] mb-1 font-semibold">Complete Event Log Object:</div>
          <pre>{JSON.stringify(events, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
