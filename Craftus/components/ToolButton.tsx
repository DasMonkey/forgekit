import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
  keyboardShortcut?: string;
  hasSubmenu?: boolean;
}

export const ToolButton: React.FC<ToolButtonProps> = ({
  icon: Icon,
  label,
  isActive,
  onClick,
  keyboardShortcut,
  hasSubmenu = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          relative w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center
          smooth-transition group
          ${isActive 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }
        `}
        title={label}
        aria-label={label}
        aria-pressed={isActive}
      >
        <Icon className="w-5 h-5" />
        
        {/* Submenu indicator */}
        {hasSubmenu && (
          <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-current opacity-50" />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-200">{label}</span>
              {keyboardShortcut && (
                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-slate-800 text-slate-400 rounded border border-slate-700">
                  {keyboardShortcut}
                </kbd>
              )}
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-px">
            <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-slate-700" />
          </div>
        </div>
      )}
    </div>
  );
};
