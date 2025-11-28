import React, { useState, useRef, useEffect } from 'react';
import { Download, Share2, Loader2, Sparkles, ChevronDown, ChevronRight, Grid3X3 } from 'lucide-react';
import { CraftCategory, PixelGridSize, PIXEL_GRID_SIZES } from '../../types';

interface ImageNodeUnifiedMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  selectedCategory: CraftCategory | null;
  onSelectCategory: (category: CraftCategory) => void;
  selectedPixelSize: PixelGridSize;
  onSelectPixelSize: (size: PixelGridSize) => void;
  onConvert: () => void;
  onSnapPixel: () => void;
  onDownload: () => void;
  onShare: () => void;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isConverting: boolean;
  isSnapping?: boolean;
  isAlreadySnapped?: boolean;
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
  selectedPixelSize,
  onSelectPixelSize,
  onConvert,
  onSnapPixel,
  onDownload,
  onShare,
  onClose,
  onMouseEnter,
  onMouseLeave,
  isConverting,
  isSnapping = false,
  isAlreadySnapped = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pixelSizeSubmenuOpen, setPixelSizeSubmenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when menu becomes invisible
  useEffect(() => {
    if (!visible) {
      setDropdownOpen(false);
      setPixelSizeSubmenuOpen(false);
    }
  }, [visible]);

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setPixelSizeSubmenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleMouseLeave = () => {
    // Close dropdowns when mouse leaves the menu
    setDropdownOpen(false);
    setPixelSizeSubmenuOpen(false);
    // Call parent's onMouseLeave
    if (onMouseLeave) {
      onMouseLeave();
    }
  };

  // Handle selecting Pixel Art with a specific size
  const handlePixelArtSelect = (size: PixelGridSize) => {
    onSelectPixelSize(size);
    onSelectCategory(CraftCategory.PIXEL_ART);
    setDropdownOpen(false);
    setPixelSizeSubmenuOpen(false);
  };

  // Handle selecting other categories (non-Pixel Art)
  const handleCategorySelect = (category: CraftCategory) => {
    if (category === CraftCategory.PIXEL_ART) {
      // For Pixel Art, show the submenu instead of selecting directly
      return;
    }
    onSelectCategory(category);
    setDropdownOpen(false);
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
          disabled={isConverting || isSnapping}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Share"
        >
          <Share2 className="w-4 h-4" />
          <span className="font-medium">Share</span>
        </button>

        {/* Snap Pixel Button - Only show if image is not already snapped */}
        {!isAlreadySnapped && (
          <>
            {/* Divider */}
            <div className="w-px h-6 bg-gray-200" />

            <button
              onClick={onSnapPixel}
              disabled={isConverting || isSnapping}
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
          </>
        )}

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
              {selectedCategory
                ? selectedCategory === CraftCategory.PIXEL_ART
                  ? `Pixel Art ${selectedPixelSize}×${selectedPixelSize}`
                  : selectedCategory
                : 'Select Style'}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px] z-50">
              {ASSET_CATEGORIES.map((category) => (
                <div
                  key={category}
                  className="relative"
                  onMouseEnter={() => {
                    if (category === CraftCategory.PIXEL_ART) {
                      setPixelSizeSubmenuOpen(true);
                    }
                  }}
                  onMouseLeave={() => {
                    if (category === CraftCategory.PIXEL_ART) {
                      setPixelSizeSubmenuOpen(false);
                    }
                  }}
                >
                  <button
                    onClick={() => handleCategorySelect(category)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                      selectedCategory === category
                        ? 'bg-orange-50 text-orange-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{category}</span>
                    {category === CraftCategory.PIXEL_ART && (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {/* Pixel Size Submenu - appears on hover for Pixel Art */}
                  {category === CraftCategory.PIXEL_ART && pixelSizeSubmenuOpen && (
                    <div className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] z-50">
                      <div className="px-3 py-1.5 text-xs text-gray-500 font-medium border-b border-gray-100">
                        Pixel Grid Size
                      </div>
                      {PIXEL_GRID_SIZES.map((size) => (
                        <button
                          key={size.value}
                          onClick={() => handlePixelArtSelect(size.value)}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            selectedCategory === CraftCategory.PIXEL_ART && selectedPixelSize === size.value
                              ? 'bg-green-50 text-green-600 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
