import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 rounded-lg bg-[#A8C7FA] hover:bg-[#7DACF8] text-[#131314] font-medium transition text-xs shadow-sm ${
          compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5'
        } ${className}`}
        title="Install Powerhouse App on device"
      >
        <Download size={compact ? 13 : 14} />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-lg border border-[#333538] bg-[#282A2C] hover:bg-[#333538] text-[#E3E3E3] font-medium transition text-xs ${
            compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5'
          } ${className}`}
        >
          <Smartphone size={compact ? 13 : 14} className="text-[#A8C7FA]" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl bg-[#1E1F20] border border-[#333538] p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#333538] pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-[#A8C7FA]" />
                  <h3 className="text-sm font-semibold text-[#F0F4F9]">Install on iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-[#8E918F] hover:text-[#E3E3E3] p-1 rounded-md"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="text-xs text-[#C4C7C5] space-y-2 leading-relaxed">
                <p>To install Powerhouse on your iOS device home screen:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-[#E3E3E3] bg-[#131314] p-3 rounded-lg border border-[#333538]">
                  <li>
                    Tap the <strong className="text-[#A8C7FA]">Share</strong> button in Safari toolbar at the bottom.
                  </li>
                  <li>
                    Scroll down the options list and tap <strong className="text-[#A8C7FA]">Add to Home Screen</strong>.
                  </li>
                  <li>Tap <strong className="text-[#A8C7FA]">Add</strong> in the top right corner.</li>
                </ol>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-[#282A2C] hover:bg-[#333538] py-2 text-xs font-medium text-[#E3E3E3] transition border border-[#333538]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback for general desktop browsers where prompt isn't fired yet
  return (
    <button
      onClick={() => {
        alert("To install Powerhouse as an app on your device, open your browser's menu (e.g. Chrome 3 dots) and select 'Install Powerhouse' or 'Add to Home screen'.");
      }}
      className={`hidden sm:flex items-center gap-1.5 rounded-lg border border-[#333538] bg-[#282A2C]/60 hover:bg-[#282A2C] text-[#C4C7C5] font-medium transition text-xs ${
        compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5'
      } ${className}`}
      title="Install as Progressive Web App"
    >
      <Download size={13} className="text-[#A8C7FA]" />
      <span>Install PWA</span>
    </button>
  );
};
