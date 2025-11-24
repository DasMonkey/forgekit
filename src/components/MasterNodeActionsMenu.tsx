import React from 'react';
import { Download, Share2, FileImage, Scissors } from 'lucide-react';

interface MasterNodeActionsMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  onCreateSVGPattern: () => void;
  onCreateStepInstructions: () => void;
  onDownload: () => void;
  onShare: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const MasterNodeActionsMenu: React.FC<MasterNodeActionsMenuProps> = ({
  visible,
  position,
  onCreateSVGPattern,
  onCreateStepInstructions,
  onDownload,
  onShare,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (!visible) return null;

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
        {/* Create SVG Pattern Sheet Button */}
        <button
          onClick={onCreateSVGPattern}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors"
          title="Create SVG Pattern Sheet"
        >
          <FileImage className="w-4 h-4" />
          <span className="font-medium">SVG Pattern</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

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
