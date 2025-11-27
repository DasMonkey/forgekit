import React, { useState, useRef, useEffect } from 'react';
import { Download, Share2, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { CraftCategory } from '../../types';

interface ImageNodeUnifiedMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  selectedCategory: CraftCategory | null;
  onSelectCategory: (category: CraftCategory) => void;
  onConvert: () => void;
  onDownload: () => void;
  onShare: () => void;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isConverting: boolean;
}

// Game asset style categories for GameCraft
const ASSET_CATEGORIES = [
  CraftCategory.PIXEL_ART,
  CraftCategory.AAA,
  CraftCategory.LOW_POLY_3D,
  CraftCategory.VOXEL_ART,
];

export const ImageNodeUnifiedMenu: React.FC<ImageNodeUnifiedMenuProps> = ({
  visible,
  position,
  selectedCategory,
  onSelectCategory,
  onConvert,
  onDownload,
  onShare,
  onClose,
  onMouseEnter,
  onMouseLeave,
  isConverting,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when menu becomes invisible
  useEffect(() => {
    if (!visible) {
      setDropdownOpen(false);
    }
  }, [visible]);

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleMouseLeave = () => {
    // Close dropdown when mouse leaves the menu
    setDropdownOpen(false);
    // Call parent's onMouseLeave
    if (onMouseLeave) {
      onMouseLeave();
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={handleMouseLeave}
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
          disabled={isConverting}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          disabled={isConverting}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Share"
        >
          <Share2 className="w-4 h-4" />
          <span className="font-medium">Share</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* Dropdown for craft style selection */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={isConverting}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">
              {selectedCategory || 'Select Style'}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px] z-50">
              {ASSET_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    onSelectCategory(category);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    selectedCategory === category
                      ? 'bg-orange-50 text-orange-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Convert button */}
        <button
          onClick={onConvert}
          disabled={!selectedCategory || isConverting}
          className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-orange-500 disabled:hover:to-yellow-500"
        >
          {isConverting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Converting...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Convert</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
