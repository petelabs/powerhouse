import React from 'react';
import { Home, Terminal, CheckSquare, Settings, Layers } from 'lucide-react';

export type NavTab = 'home' | 'workspace' | 'tasks' | 'topology' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeTasksCount?: number;
}

export function BottomNav({ currentTab, onSelectTab, activeTasksCount = 0 }: BottomNavProps) {
  const tabs: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'home', label: 'Overview', icon: <Home size={18} /> },
    { id: 'workspace', label: 'Workspace', icon: <Terminal size={18} /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={18} />, badge: activeTasksCount },
    { id: 'topology', label: '3D View', icon: <Layers size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#1E1F20] border-t border-[#333538] px-2 py-1 md:hidden">
      <div className="flex items-center justify-around">
        {tabs.map(tab => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 transition relative ${
                isActive ? 'text-[#A8C7FA]' : 'text-[#8E918F] hover:text-[#E3E3E3]'
              }`}
            >
              <div className={`px-3 py-0.5 rounded-full transition-colors flex items-center justify-center relative ${
                isActive ? 'bg-[#004A77] text-[#D3E3FD]' : ''
              }`}>
                {tab.icon}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#A8C7FA] text-[#131314] font-bold text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'font-semibold text-[#A8C7FA]' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
