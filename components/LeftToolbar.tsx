import React, { useState } from 'react';
import { MousePointer2, Plus, Square, Type, Pencil } from 'lucide-react';
import { ToolButton } from './ToolButton';

export type ToolType = 'select' | 'upload' | 'shapes' | 'text' | 'pencil';

interface LeftToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onToolSubmenuOpen?: (tool: ToolType, position: { x: number; y: number }) => void;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  activeTool,
  onToolChange,
  onToolSubmenuOpen,
}) => {
  const tools = [
    {
      type: 'select' as ToolType,
      icon: MousePointer2,
      label: 'Select',
      shortcut: 'V',
      hasSubmenu: false,
    },
    {
      type: 'upload' as ToolType,
      icon: Plus,
      label: 'Upload',
      shortcut: 'U',
      hasSubmenu: true,
    },
    {
      type: 'shapes' as ToolType,
      icon: Square,
      label: 'Shapes',
      shortcut: 'S',
      hasSubmenu: true,
    },
    {
      type: 'text' as ToolType,
      icon: Type,
      label: 'Text',
      shortcut: 'T',
      hasSubmenu: false,
    },
    {
      type: 'pencil' as ToolType,
      icon: Pencil,
      label: 'Pencil',
      shortcut: 'P',
      hasSubmenu: true,
    },
  ];

  const handleToolClick = (tool: ToolType, hasSubmenu: boolean, event: React.MouseEvent) => {
    if (hasSubmenu && onToolSubmenuOpen) {
      // For tools with submenus, only open the submenu
      // Don't change the active tool yet
      const button = event.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      onToolSubmenuOpen(tool, {
        x: rect.right + 8,
        y: rect.top,
      });
    } else {
      // For tools without submenus, change the tool immediately
      onToolChange(tool);
    }
  };

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 animate-fade-in" data-toolbar>
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-2">
        <div className="flex flex-col gap-1">
          {tools.map((tool) => (
            <div key={tool.type} onClick={(e) => handleToolClick(tool.type, tool.hasSubmenu, e)}>
              <ToolButton
                icon={tool.icon}
                label={tool.label}
                isActive={activeTool === tool.type}
                onClick={() => {}}
                keyboardShortcut={tool.shortcut}
                hasSubmenu={tool.hasSubmenu}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
