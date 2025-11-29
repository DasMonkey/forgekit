import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ArrowUp, ChevronUp, ChevronRight, Loader2, Plus, X } from 'lucide-react';
import { CraftCategory, PixelGridSize, PIXEL_GRID_SIZES } from '../types';
import { generateCraftImage, generateWithImageReferences } from '../services/geminiService';
import { validatePrompt } from '../utils/validation';
import { sanitizeText } from '../utils/security';
import { handleFileUpload } from '../utils/fileUpload';

// Reference image type for chat attachments
export interface ReferenceImage {
  url: string;
  fileName: string;
  nodeId?: string; // if from canvas node
}

// Ref methods exposed to parent component
export interface ChatInterfaceRef {
  addReferenceImage: (image: ReferenceImage) => void;
  setPromptText: (text: string) => void;
}

interface ChatInterfaceProps {
  onGenerate: (imageUrl: string, prompt: string, category: CraftCategory, pixelSize?: PixelGridSize) => void;
  onStartGeneration?: (nodeId: string, prompt: string, category: CraftCategory, pixelSize?: PixelGridSize) => void;
  onGenerationComplete?: (nodeId: string, imageUrl: string) => void;
  onGenerationError?: (nodeId: string) => void;
}

const LOADING_MESSAGES = [
  "Dreaming up the design...",
  "Gathering digital materials...",
  "Sketching the blueprint...",
  "Applying textures...",
  "Finalizing the studio lighting..."
];

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(({ onGenerate, onStartGeneration, onGenerationComplete, onGenerationError }, ref) => {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<CraftCategory>(CraftCategory.PIXEL_ART);
  const [pixelSize, setPixelSize] = useState<PixelGridSize>(32);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isPixelSizeSubmenuOpen, setIsPixelSizeSubmenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [submenuPosition, setSubmenuPosition] = useState<{ bottom: number; left: number }>({ bottom: 0, left: 0 });
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pixelArtRowRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    addReferenceImage: (image: ReferenceImage) => {
      // Check if image is already attached (by URL)
      const isAlreadyAttached = referenceImages.some(img => img.url === image.url);
      if (isAlreadyAttached) {
        // Could show a toast here - for now just skip
        return;
      }
      setReferenceImages(prev => [...prev, image]);
    },
    setPromptText: (text: string) => {
      setPrompt(text);
    }
  }));

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isCategoryOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideDropdown = dropdownRef.current?.contains(target);
      const isInsideSubmenu = submenuRef.current?.contains(target);

      if (!isInsideDropdown && !isInsideSubmenu) {
        setIsCategoryOpen(false);
        setIsPixelSizeSubmenuOpen(false);
      }
    };
    // Use capture phase to intercept clicks before React Flow handles them
    // Use setTimeout to avoid the click that opened the dropdown from immediately closing it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isCategoryOpen]);

  // Close submenu when main dropdown closes and cleanup timeout
  useEffect(() => {
    if (!isCategoryOpen) {
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
        submenuTimeoutRef.current = null;
      }
      setIsPixelSizeSubmenuOpen(false);
    }
  }, [isCategoryOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
      }
    };
  }, []);

  // Cycle loading messages
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  // Handle file selection from file picker
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const { dataUrl, fileName } = await handleFileUpload(file);
        setReferenceImages(prev => [...prev, { url: dataUrl, fileName }]);
      } catch (error) {
        console.error('File upload error:', error);
        alert(error instanceof Error ? error.message : 'Failed to upload file');
      }
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove a reference image
  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    // Validate prompt before submission
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      alert(validation.error || 'Invalid prompt');
      return;
    }

    setIsLoading(true);

    // Sanitize prompt before sending to AI
    const sanitizedPrompt = sanitizeText(prompt, 500);

    // Generate node ID and create placeholder immediately
    const nodeId = `master-${Date.now()}`;
    const currentPixelSize = category === CraftCategory.PIXEL_ART ? pixelSize : undefined;
    if (onStartGeneration) {
      onStartGeneration(nodeId, sanitizedPrompt, category, currentPixelSize);
    }

    // Store reference images before clearing
    const currentReferenceImages = [...referenceImages];

    // Clear input and reference images immediately for better UX
    setPrompt('');
    setReferenceImages([]);
    setIsCategoryOpen(false);
    setIsPixelSizeSubmenuOpen(false);

    try {
      let imageUrl: string;

      if (currentReferenceImages.length > 0) {
        // Use image reference generation
        const imageUrls = currentReferenceImages.map(img => img.url);
        imageUrl = await generateWithImageReferences(sanitizedPrompt, category, imageUrls, currentPixelSize);
      } else {
        // Use standard generation
        imageUrl = await generateCraftImage(sanitizedPrompt, category, currentPixelSize);
      }

      // Update the placeholder node with the generated image
      if (onGenerationComplete) {
        onGenerationComplete(nodeId, imageUrl);
      } else {
        // Fallback to original behavior if new callbacks not provided
        onGenerate(imageUrl, sanitizedPrompt, category, currentPixelSize);
      }
    } catch (error) {
      console.error("Generation failed:", error);
      if (onGenerationError) {
        onGenerationError(nodeId);
      }
      alert("Failed to generate craft. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-3 md:px-4 z-50">
      <div className="relative group" ref={dropdownRef}>
        
        {/* Category Popup - Appears above the input */}
        {isCategoryOpen && (
          <div
            className="absolute bottom-full left-0 mb-3 w-56 md:w-64 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl smooth-transition origin-bottom-left"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
          >
             <div className="p-2 md:p-3 border-b border-zinc-800 bg-zinc-950/30 rounded-t-xl">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Select Category</span>
             </div>
             <div className="max-h-[240px] md:max-h-[280px] overflow-y-auto py-1 custom-scrollbar rounded-b-xl">
               {Object.values(CraftCategory).map((cat) => (
                 <div
                   key={cat}
                   ref={cat === CraftCategory.PIXEL_ART ? pixelArtRowRef : undefined}
                   className="relative"
                   onMouseEnter={() => {
                     if (cat === CraftCategory.PIXEL_ART) {
                       // Clear any pending close timeout
                       if (submenuTimeoutRef.current) {
                         clearTimeout(submenuTimeoutRef.current);
                         submenuTimeoutRef.current = null;
                       }
                       if (pixelArtRowRef.current) {
                         const rect = pixelArtRowRef.current.getBoundingClientRect();
                         // Position submenu so its bottom aligns with bottom of viewport minus some padding
                         // This ensures all options are visible
                         setSubmenuPosition({
                           bottom: window.innerHeight - rect.bottom,
                           left: rect.right + 4,
                         });
                       }
                       setIsPixelSizeSubmenuOpen(true);
                     } else {
                       // Close submenu when hovering on other categories
                       if (submenuTimeoutRef.current) {
                         clearTimeout(submenuTimeoutRef.current);
                         submenuTimeoutRef.current = null;
                       }
                       setIsPixelSizeSubmenuOpen(false);
                     }
                   }}
                   onMouseLeave={() => {
                     if (cat === CraftCategory.PIXEL_ART) {
                       // Delay closing to allow mouse to reach submenu
                       submenuTimeoutRef.current = setTimeout(() => {
                         setIsPixelSizeSubmenuOpen(false);
                       }, 150);
                     }
                   }}
                 >
                   <button
                     onClick={() => {
                       if (cat !== CraftCategory.PIXEL_ART) {
                         setCategory(cat);
                         setIsCategoryOpen(false);
                       }
                     }}
                     className={`w-full text-left px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm smooth-transition flex items-center justify-between ${
                       category === cat
                         ? 'bg-amber-600/20 text-amber-300 border-l-2 border-amber-500'
                         : 'text-zinc-300 hover:bg-zinc-800 border-l-2 border-transparent'
                     }`}
                   >
                     <span>
                       {cat}
                       {cat === CraftCategory.PIXEL_ART && category === CraftCategory.PIXEL_ART && (
                         <span className="ml-2 text-zinc-500">({pixelSize}×{pixelSize})</span>
                       )}
                     </span>
                     {cat === CraftCategory.PIXEL_ART && (
                       <ChevronRight className="w-4 h-4 text-zinc-500" />
                     )}
                   </button>

                 </div>
               ))}
             </div>
          </div>
        )}

        {/* Reference Images Preview - Above the input bar */}
        {referenceImages.length > 0 && (
          <div
            className="mb-2 flex items-center gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'thin' }}
          >
            {referenceImages.map((img, index) => (
              <div
                key={`${img.url}-${index}`}
                className="relative flex-shrink-0 group/thumb"
                title={img.fileName}
              >
                <img
                  src={img.url}
                  alt={img.fileName}
                  className="w-10 h-10 md:w-12 md:h-12 object-cover rounded-lg border border-zinc-700/50 bg-zinc-800"
                />
                <button
                  type="button"
                  onClick={() => removeReferenceImage(index)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-800 hover:bg-red-600 border border-zinc-600 rounded-full flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-zinc-300" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pixel Size Submenu - Rendered via portal to escape parent overflow */}
        {isCategoryOpen && isPixelSizeSubmenuOpen && createPortal(
          <div
            ref={submenuRef}
            className="fixed bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl z-[9999] w-[120px]"
            style={{
              bottom: `${submenuPosition.bottom}px`,
              left: `${submenuPosition.left}px`,
              animation: 'fadeIn 0.15s ease-out',
            }}
            onMouseEnter={() => {
              // Clear any pending close timeout when entering submenu
              if (submenuTimeoutRef.current) {
                clearTimeout(submenuTimeoutRef.current);
                submenuTimeoutRef.current = null;
              }
              setIsPixelSizeSubmenuOpen(true);
            }}
            onMouseLeave={() => {
              // Delay closing to allow mouse to return to main menu
              submenuTimeoutRef.current = setTimeout(() => {
                setIsPixelSizeSubmenuOpen(false);
              }, 150);
            }}
          >
            <div className="p-2 border-b border-zinc-800 bg-zinc-950/30 rounded-t-xl">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pixel Grid Size</span>
            </div>
            <div className="py-1">
              {PIXEL_GRID_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => {
                    setPixelSize(size.value);
                    setCategory(CraftCategory.PIXEL_ART);
                    setIsCategoryOpen(false);
                    setIsPixelSizeSubmenuOpen(false);
                  }}
                  className={`w-full text-left px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm smooth-transition ${
                    category === CraftCategory.PIXEL_ART && pixelSize === size.value
                      ? 'bg-amber-600/20 text-amber-300 border-l-2 border-amber-500'
                      : 'text-zinc-300 hover:bg-zinc-800 border-l-2 border-transparent'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}

        {/* Hidden file input for image uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Main Input Bar */}
        <form
          onSubmit={handleSubmit}
          className={`
            relative flex items-center gap-1.5 md:gap-2 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 p-1.5 md:p-2 rounded-2xl md:rounded-3xl shadow-2xl shadow-black/50 smooth-transition
            ${isLoading ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'hover:border-zinc-600 focus-within:border-zinc-500'}
            ${referenceImages.length > 0 ? 'ring-1 ring-indigo-500/30 border-indigo-500/30' : ''}
          `}
        >
          {/* Add Image Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className={`
              h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-xl md:rounded-2xl smooth-transition flex-shrink-0
              ${isLoading
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-indigo-400'}
            `}
            title="Add reference image"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Category Trigger Button */}
          <button
            type="button"
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className={`
                flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl smooth-transition h-10 md:h-12 flex-shrink-0
                ${isCategoryOpen ? 'bg-amber-600 text-zinc-900' : 'bg-zinc-800 hover:bg-zinc-750 text-amber-400'}
            `}
            title="Select Category"
          >
            <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="text-xs md:text-sm font-medium hidden sm:block max-w-[100px] md:max-w-[140px] truncate">
              {category === CraftCategory.PIXEL_ART ? `Pixel Art ${pixelSize}×${pixelSize}` : category}
            </span>
            <ChevronUp className={`w-3 h-3 smooth-transition ${isCategoryOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                isLoading
                  ? loadingMsg
                  : referenceImages.length > 0
                    ? "Describe what to create based on the reference..."
                    : "Describe a game asset you want to create..."
              }
              disabled={isLoading}
              className="w-full bg-transparent border-none text-zinc-100 placeholder-zinc-500 focus:ring-0 h-10 md:h-12 py-2 md:py-3 px-1 md:px-2 text-sm md:text-base"
              autoComplete="off"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className={`
              h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-xl md:rounded-2xl smooth-transition flex-shrink-0
              ${!prompt.trim() || isLoading
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 text-zinc-900 shadow-lg shadow-amber-900/20 hover:scale-105 active:scale-95'}
            `}
          >
            {isLoading ? (
               <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-zinc-900/80" />
            ) : (
               <ArrowUp className="w-4 h-4 md:w-5 md:h-5 font-bold" />
            )}
          </button>
        </form>

        {/* Footer Hint */}
        <div className="absolute top-full left-0 right-0 mt-3 md:mt-4 text-center pointer-events-none smooth-transition">
            <p className={`text-[9px] md:text-[10px] uppercase tracking-widest font-medium smooth-transition ${isLoading ? 'text-amber-400 opacity-100' : 'text-zinc-600 opacity-0'}`}>
                Running Gemini 3 Pro
            </p>
        </div>
      </div>
    </div>
  );
});

// Display name for debugging
ChatInterface.displayName = 'ChatInterface';