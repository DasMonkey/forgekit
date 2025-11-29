import React, { useState, useRef, useEffect } from 'react';
import { Download, Share2, Scissors, MousePointerClick, RotateCcw, Grid3X3, Loader2, MessageSquarePlus, ChevronDown } from 'lucide-react';
import { CraftCategory } from '../../types';

// Frame count options for sprite sheet animations
export type SpriteFrameCount = 4 | 6 | 8;

interface MasterNodeActionsMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  category?: CraftCategory;
  magicSelectEnabled: boolean;
  onToggleMagicSelect: () => void;
  onAnimations: (frameCount: SpriteFrameCount) => void;
  onCreateTurnTable: () => void;
  onSnapPixel: () => void;
  onDownload: () => void;
  onShare: () => void;
  onAddToChat: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isSnapping?: boolean;
}

const FRAME_COUNT_OPTIONS: { value: SpriteFrameCount; label: string }[] = [
  { value: 4, label: '4 Frames' },
  { value: 6, label: '6 Frames' },
  { value: 8, label: '8 Frames' },
];

export const MasterNodeActionsMenu: React.FC<MasterNodeActionsMenuProps> = ({
  visible,
  position,
  category,
  magicSelectEnabled,
  onToggleMagicSelect,
  onAnimations,
  onCreateTurnTable,
  onSnapPixel,
  onDownload,
  onShare,
  onAddToChat,
  onMouseEnter,
  onMouseLeave,
  isSnapping = false,
}) => {
  const [frameCountMenuOpen, setFrameCountMenuOpen] = useState(false);
  const frameCountRef = useRef<HTMLDivElement>(null);

  // Close frame count menu when main menu becomes invisible
  useEffect(() => {
    if (!visible) {
      setFrameCountMenuOpen(false);
    }
  }, [visible]);

  // Handle frame count selection
  const handleFrameCountSelect = (frameCount: SpriteFrameCount) => {
    setFrameCountMenuOpen(false);
    onAnimations(frameCount);
  };

  if (!visible) return null;

  // Snap Pixel button only shows for Pixel Art category
  const showSnapPixelButton = category === CraftCategory.PIXEL_ART;

  // Animations button only shows for 2D art styles (Pixel Art, HD 2D)
  // Hide for 3D styles (AAA, Low Poly 3D, Voxel Art) since sprite sheets don't make sense for 3D
  const showAnimationsButton = category === CraftCategory.PIXEL_ART || category === CraftCategory.HD_2D;

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
        {/* Add to Chat Button - Attach image to chat as reference */}
        <button
          onClick={onAddToChat}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors"
          title="Add to chat as reference"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="font-medium">Add to Chat</span>
        </button>

        {/* Animations Button with Frame Count Dropdown - Only for 2D styles */}
        {showAnimationsButton && (
          <>
            {/* Divider */}
            <div className="w-px h-6 bg-gray-200" />

            <div className="relative" ref={frameCountRef}>
              <button
                onClick={() => setFrameCountMenuOpen(!frameCountMenuOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-full transition-colors ${
                  frameCountMenuOpen
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-600'
                }`}
                title="Generate sprite sheet animation"
              >
                <Scissors className="w-4 h-4" />
                <span className="font-medium">Animations</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${frameCountMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Frame Count Dropdown */}
              {frameCountMenuOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[140px] z-50">
                  <div className="px-3 py-1.5 text-xs text-gray-500 font-medium border-b border-gray-100">
                    Frames per Sheet
                  </div>
                  {FRAME_COUNT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFrameCountSelect(option.value)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

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

        {/* Snap Pixel Button - Only for Pixel Art category */}
        {showSnapPixelButton && (
          <>
            <button
              onClick={onSnapPixel}
              disabled={isSnapping}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Snap pixels to grid (fixes AI-generated pixel art)"
            >
              {isSnapping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-medium">Snapping...</span>
                </>
              ) : (
                <>
                  <Grid3X3 className="w-4 h-4" />
                  <span className="font-medium">Snap Pixel</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200" />
          </>
        )}

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
