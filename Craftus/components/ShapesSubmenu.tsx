import React, { useEffect, useRef } from 'react';
import { Square, Circle, Triangle, Star, MessageSquare, ArrowRight, ArrowLeft } from 'lucide-react';
import { ToolSubmenuOption } from './ToolSubmenu';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'star' | 'rectangle-text' | 'circle-text' | 'speech-bubble' | 'arrow-right' | 'arrow-left';

interface ShapesSubmenuProps {
  visible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onSelectShape: (shapeType: ShapeType) => void;
}

export const ShapesSubmenu: React.FC<ShapesSubmenuProps> = ({
  visible,
  position,
  onClose,
  onSelectShape,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close menu
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if click is outside menu and not on the toolbar button
      if (menuRef.current && !menuRef.current.contains(target)) {
        // Don't close if clicking on the toolbar
        if (!target.closest('[data-toolbar]')) {
          onClose();
        }
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
  const basicShapes: ToolSubmenuOption[] = [
    {
      id: 'rectangle',
      label: 'Rectangle',
      icon: Square,
      onClick: () => onSelectShape('rectangle'),
    },
    {
      id: 'circle',
      label: 'Circle',
      icon: Circle,
      onClick: () => onSelectShape('circle'),
    },
    {
      id: 'triangle',
      label: 'Triangle',
      icon: Triangle,
      onClick: () => onSelectShape('triangle'),
    },
    {
      id: 'star',
      label: 'Star',
      icon: Star,
      onClick: () => onSelectShape('star'),
    },
  ];

  const shapesWithText: ToolSubmenuOption[] = [
    {
      id: 'rectangle-text',
      label: 'Rectangle with Text',
      icon: Square,
      onClick: () => onSelectShape('rectangle-text'),
    },
    {
      id: 'circle-text',
      label: 'Circle with Text',
      icon: Circle,
      onClick: () => onSelectShape('circle-text'),
    },
    {
      id: 'speech-bubble',
      label: 'Speech Bubble',
      icon: MessageSquare,
      onClick: () => onSelectShape('speech-bubble'),
    },
    {
      id: 'arrow-right',
      label: 'Arrow Right',
      icon: ArrowRight,
      onClick: () => onSelectShape('arrow-right'),
    },
    {
      id: 'arrow-left',
      label: 'Arrow Left',
      icon: ArrowLeft,
      onClick: () => onSelectShape('arrow-left'),
    },
  ];

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
        {/* Title */}
        <div className="px-4 py-2 border-b border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Shapes
          </span>
        </div>
        
        {/* Basic Shapes */}
        {basicShapes.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => {
                option.onClick();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors duration-150"
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span className="font-medium">{option.label}</span>
            </button>
          );
        })}

        {/* Divider */}
        <div className="my-1 border-t border-slate-200" />
        
        {/* Section Title */}
        <div className="px-4 py-1.5">
          <span className="text-xs font-medium text-slate-400">Shape with Text</span>
        </div>

        {/* Shapes with Text */}
        {shapesWithText.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => {
                option.onClick();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors duration-150"
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span className="font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
