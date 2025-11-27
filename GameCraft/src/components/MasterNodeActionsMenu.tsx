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

// All game asset categories support sprite sheet generation
const SPRITE_CATEGORIES = [
  CraftCategory.PIXEL_ART,
  CraftCategory.AAA,
  CraftCategory.LOW_POLY_3D,
  CraftCategory.VOXEL_ART,
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

  // Check if this category should show sprite sheet button (all game categories do)
  const showSpriteButton = category && SPRITE_CATEGORIES.includes(category);

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
        {/* Create Sprite Sheet Button - For generating animation frames */}
        {showSpriteButton && (
          <>
            <button
              onClick={onCreateSVGPattern}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 rounded-full transition-colors"
              title="Create Sprite Sheet"
            >
              <FileImage className="w-4 h-4" />
              <span className="font-medium">Sprite Sheet</span>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200" />
          </>
        )}

        {/* Create Animation Frames Button */}
        <button
          onClick={onCreateStepInstructions}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-full transition-colors"
          title="Create Animation Frames"
        >
          <Scissors className="w-4 h-4" />
          <span className="font-medium">Animations</span>
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
