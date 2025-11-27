import React from 'react';
import { Download, Share2 } from 'lucide-react';

interface ImageNodeActionsMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  onDownload: () => void;
  onShare: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const ImageNodeActionsMenu: React.FC<ImageNodeActionsMenuProps> = ({
  visible,
  position,
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
