import React from 'react';
import { Download, Share2, FileImage, Scissors, MousePointerClick, RotateCcw } from 'lucide-react';
import { CraftCategory } from '../../types';

interface MasterNodeActionsMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  category?: CraftCategory;
  magicSelectEnabled: boolean;
  onToggleMagicSelect: () => void;
  onCreateSVGPattern: () => void;
  onCreateStepInstructions: () => void;
  onCreateTurnTable: () => void;
  onDownload: () => void;
  onShare: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

// Categories that use cutting templates/patterns
const PATTERN_CATEGORIES = [
  CraftCategory.PAPERCRAFT,
  CraftCategory.COSTUME_PROPS,
  CraftCategory.WOODCRAFT,
  CraftCategory.KIDS_CRAFTS,
];

export const MasterNodeActionsMenu: React.FC<MasterNodeActionsMenuProps> = ({
  visible,
  position,
  category,
  magicSelectEnabled,
  onToggleMagicSelect,
  onCreateSVGPattern,
  onCreateStepInstructions,
  onCreateTurnTable,
  onDownload,
  onShare,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (!visible) return null;

  // Check if this category should show pattern button
  const showPatternButton = category && PATTERN_CATEGORIES.includes(category);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-50 bg-white rounded-full shadow-lg border border-gray-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="flex items-center gap-1 px-2 py-2">
        {/* Create Pattern Sheet Button - Only for categories that need cutting templates */}
        {showPatternButton && (
          <>
            <button
              onClick={onCreateSVGPattern}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors"
              title="Create Pattern Sheet"
            >
              <FileImage className="w-4 h-4" />
              <span className="font-medium">Pattern Sheet</span>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200" />
          </>
        )}

        {/* Create Step Instructions Button */}
        <button
          onClick={onCreateStepInstructions}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-full transition-colors"
          title="Create Step Instructions"
        >
          <Scissors className="w-4 h-4" />
          <span className="font-medium">Instructions</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* Turn Table Button - Generate left, right, back views */}
        <button
          onClick={onCreateTurnTable}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 rounded-full transition-colors"
          title="Generate Turn Table Views (Left, Right, Back)"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="font-medium">Turn Table</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* Magic Select Toggle Button */}
        <button
          onClick={onToggleMagicSelect}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-full transition-colors ${
            magicSelectEnabled
              ? 'bg-violet-100 text-violet-700'
              : 'text-gray-700 hover:bg-violet-50 hover:text-violet-600'
          }`}
          title={magicSelectEnabled ? 'Disable Magic Select' : 'Enable Magic Select'}
        >
          <MousePointerClick className="w-4 h-4" />
          <span className="font-medium">Magic Select</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* Download Button */}
        <button
          onClick={onDownload}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-colors"
          title="Download Image"
        >
          <Download className="w-4 h-4" />
          <span className="font-medium">Download</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* Share Button */}
        <button
          onClick={onShare}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-full transition-colors"
          title="Share"
        >
          <Share2 className="w-4 h-4" />
          <span className="font-medium">Share</span>
        </button>
      </div>
    </div>
  );
};
