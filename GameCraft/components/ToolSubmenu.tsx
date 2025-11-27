import React, { useEffect, useRef } from 'react';
import { LucideIcon } from 'lucide-react';

export interface ToolSubmenuOption {
  id: string;
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  onClick: () => void;
}

interface ToolSubmenuProps {
  visible: boolean;
  position: { x: number; y: number };
  options: ToolSubmenuOption[];
  onClose: () => void;
  title?: string;
}

export const ToolSubmenu: React.FC<ToolSubmenuProps> = ({
  visible,
  position,
  options,
  onClose,
  title,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close menu
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add a small delay to prevent immediate closing from the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  // Handle escape key to close menu
  useEffect(() => {
    if (!visible) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const handleOptionClick = (option: ToolSubmenuOption) => {
    option.onClick();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 animate-fade-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 py-1 min-w-[200px]">
        {title && (
          <div className="px-4 py-2 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {title}
            </span>
          </div>
        )}
        
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option)}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors duration-150"
            >
              <div className="flex items-center gap-3">
                {Icon && <Icon className="w-4 h-4" />}
                <span className="font-medium">{option.label}</span>
              </div>
              {option.shortcut && (
                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-slate-100 text-slate-500 rounded border border-slate-300">
                  {option.shortcut}
                </kbd>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
