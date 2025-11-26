import React, { memo, useRef, useState, useEffect } from 'react';
import { Loader2, Scissors, TriangleAlert, Hammer, List, Image as ImageIcon, MousePointerClick } from 'lucide-react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { MasterNodeData, InstructionNodeData, MaterialNodeData, ImageNodeData, ShapeNodeData, TextNodeData, DrawingNodeData, DrawingPath } from '../types';
import { initSegmenter, segmentImage, extractSelectedObject, filterLargestRegion } from '../services/segmentationService';

/**
 * The Central "Master" Node displaying the generated image with Interactive Segmentation.
 */
export const MasterNode = memo(({ data, id }: NodeProps<any>) => {
  const { label, imageUrl, isDissecting, isDissected, isGeneratingImage, onDissectSelected, onSelect, onDeselect, category, magicSelectEnabled = false } = data as MasterNodeData;
  const nodeRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSegmenterReady, setIsSegmenterReady] = useState(false);
  const [isSegmenterLoading, setIsSegmenterLoading] = useState(true);
  const [isProcessingMask, setIsProcessingMask] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectionData, setSelectionData] = useState<{
    maskData: Uint8Array;
    width: number;
    height: number;
  } | null>(null);

  // Initialize Segmenter on mount
  useEffect(() => {
    setIsSegmenterLoading(true);
    initSegmenter().then((seg) => {
        if (seg) {
          setIsSegmenterReady(true);
        }
        setIsSegmenterLoading(false);
    });
  }, []);

  const handleImageClick = async (e: React.MouseEvent) => {
      // Don't segment if magic select is disabled or we are clicking the dissect button
      // Also ensure segmenter is ready
      console.log('🖱️ handleImageClick - magicSelectEnabled:', magicSelectEnabled, 'isSegmenterReady:', isSegmenterReady);
      if (!magicSelectEnabled || !isSegmenterReady || !imgRef.current || !canvasRef.current || isProcessingMask) {
        console.log('❌ Blocked - magicSelectEnabled:', magicSelectEnabled, 'isSegmenterReady:', isSegmenterReady);
        return;
      }

      setIsProcessingMask(true);
      try {
          const result = await segmentImage(e, imgRef.current);

          if (result) {
              let { uint8Array, width, height } = result;
              
              // Filter to keep only the largest connected region
              // This removes small disconnected areas like parts of display stands
              uint8Array = filterLargestRegion(uint8Array, width, height);
              
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                  // Ensure canvas internal dim matches mask
                  canvasRef.current.width = width;
                  canvasRef.current.height = height;

                  const imageData = ctx.createImageData(width, height);
                  const data = imageData.data;

                  // Apply mask: Only show selected object
                  // MagicTouch usually returns distinct indices. Assuming non-zero or specific index is object.
                  // Typically index 1 is the selected area for single object interaction.
                  for (let i = 0; i < uint8Array.length; i++) {
                      const category = uint8Array[i];
                      const pixelIndex = i * 4;

                      // Check if part of the selected object (category > 0 typically)
                      if (category > 0) {
                          data[pixelIndex] = 139;     // R (Indigo-ish/Purple)
                          data[pixelIndex + 1] = 92;  // G
                          data[pixelIndex + 2] = 246; // B
                          data[pixelIndex + 3] = 140; // Alpha (Semi-transparent)
                      } else {
                          data[pixelIndex + 3] = 0;   // Transparent background
                      }
                  }
                  ctx.putImageData(imageData, 0, 0);
                  setHasSelection(true);
                  // Store filtered selection data for later use
                  setSelectionData({ maskData: uint8Array, width, height });
              }
          }
      } catch (err) {
          console.error("Segmentation failed", err);
      } finally {
          setIsProcessingMask(false);
      }
  };

  const handleClearSelection = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
      }
      setHasSelection(false);
      setSelectionData(null);
  };

  const handleDissectSelected = async (e: React.MouseEvent) => {
      e.stopPropagation();
      console.log('🔍 handleDissectSelected called');
      console.log('  - selectionData:', selectionData);
      console.log('  - imgRef.current:', !!imgRef.current);
      console.log('  - onDissectSelected:', !!onDissectSelected);
      if (!selectionData || !imgRef.current || !onDissectSelected) {
        console.log('❌ Early return - missing data');
        return;
      }

      try {
          // Extract the selected object with expanded context
          const selectedObjectImage = await extractSelectedObject(
              imgRef.current,
              selectionData.maskData,
              selectionData.width,
              selectionData.height,
              20 // Expand by 20 pixels to capture more context
          );

          // AI will identify the object automatically - pass empty string as placeholder
          // The actual identification happens in handleDissectSelected in CanvasWorkspace
          onDissectSelected(id, selectedObjectImage, imageUrl, '');
      } catch (err) {
          console.error("Failed to extract selected object:", err);
      }
  };

  const handleNodeHover = () => {
      // Trigger selection callback on hover if provided, passing category for menu
      if (onSelect && nodeRef.current) {
        onSelect(id, nodeRef.current, category);
      }
  };

  const handleNodeLeave = () => {
      // Trigger deselect callback when mouse leaves
      if (onDeselect) {
        onDeselect();
      }
  };

  return (
    <div
      ref={nodeRef}
      onMouseEnter={handleNodeHover}
      onMouseLeave={handleNodeLeave}
      className="relative group rounded-xl overflow-hidden shadow-2xl border-2 border-indigo-500/50 bg-slate-900 w-[500px]"
    >
      {/* Connection Handles */}
      <Handle type="source" position={Position.Right} id="source-right" className="!bg-indigo-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Left} id="source-left" className="!bg-indigo-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Right} id="target-right" className="!bg-indigo-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="target-left" className="!bg-indigo-500 !w-3 !h-3" />

      {/* Header */}
      <div className="px-4 py-2 bg-indigo-600/20 border-b border-indigo-500/30 flex justify-between items-center">
        <span className="text-indigo-200 font-semibold text-sm truncate">{label}</span>
        <div className="flex items-center gap-2">
            {isProcessingMask && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
            <Hammer className="w-4 h-4 text-indigo-400" />
        </div>
      </div>

      {/* Image & Interactive Area */}
      <div className={`relative aspect-square w-full bg-slate-950 ${magicSelectEnabled ? 'cursor-crosshair' : 'cursor-default'}`}>
        {isGeneratingImage ? (
          // Loading placeholder while image is being generated
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur opacity-20 pulse-glow rounded-full"></div>
              <Loader2 className="w-12 h-12 animate-spin text-indigo-500/50 relative z-10" />
            </div>
            <span className="text-sm text-indigo-500/70 pulse-glow font-medium mt-4">Generating craft image...</span>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={imageUrl}
            alt={label}
            crossOrigin="anonymous"
            onClick={handleImageClick}
            className="w-full h-full object-cover relative z-10"
          />
        )}

        {/* Segmentation Overlay Canvas */}
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-20 pointer-events-none w-full h-full mix-blend-screen"
        />

        {/* Loading Indicator for AI Model - only show when magic select is enabled */}
        {magicSelectEnabled && !hasSelection && isSegmenterLoading && (
          <div className="absolute top-2 right-2 z-30 pointer-events-none">
               <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                   <Loader2 className="w-3 h-3 animate-spin" />
                   Loading AI...
               </div>
          </div>
        )}

        {/* Hover Hint for Selection - only show when magic select is enabled */}
        {magicSelectEnabled && !hasSelection && !isSegmenterLoading && (
          <div className={`absolute top-2 right-2 z-30 pointer-events-none transition-opacity duration-300 ${isSegmenterReady ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
               <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                   <MousePointerClick className="w-3 h-3" />
                   Magic Select
               </div>
          </div>
        )}

        {/* Clear Selection Button */}
        {hasSelection && (
          <div className="absolute top-2 right-2 z-30">
            <button
              onClick={handleClearSelection}
              className="bg-red-600 hover:bg-red-500 text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg active:scale-95 transition-all"
            >
              <span className="text-sm">×</span>
              Clear Selection
            </button>
          </div>
        )}

        {/* Break Down Selected Object Button - Shows when object is selected */}
        {!isDissected && hasSelection && onDissectSelected && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
            <button
              onClick={handleDissectSelected}
              disabled={isDissecting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-full font-bold shadow-lg shadow-black/50 hover:shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isDissecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Breaking Down...
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4" />
                  Break Down Selected
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps: NodeProps<any>, nextProps: NodeProps<any>) => {
  // Custom comparison for better performance
  return (
    prevProps.data.isDissecting === nextProps.data.isDissecting &&
    prevProps.data.isDissected === nextProps.data.isDissected &&
    prevProps.data.isGeneratingImage === nextProps.data.isGeneratingImage &&
    prevProps.data.imageUrl === nextProps.data.imageUrl &&
    prevProps.data.magicSelectEnabled === nextProps.data.magicSelectEnabled
  );
});

/**
 * Node for a single step instruction.
 */
export const InstructionNode = memo(({ data }: NodeProps<any>) => {
  const { stepNumber, title, description, safetyWarning, imageUrl, isGeneratingImage } = data as InstructionNodeData;

  return (
    <div className="w-[300px] md:w-[320px] bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-lg smooth-transition hover:shadow-xl overflow-hidden">
      <Handle type="target" position={Position.Left} id="target-left" className="!bg-emerald-500 !w-3 !h-3" />
      
      {/* Step number badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white text-sm font-bold shadow-lg">
        {stepNumber}
      </div>
      
      {/* Image Section - Clean display */}
      <div className="w-full aspect-video bg-white relative overflow-hidden">
        {imageUrl ? (
           <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover" 
           />
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-2 p-4 bg-slate-950">
                {isGeneratingImage ? (
                    <>
                        <div className="relative">
                          <div className="absolute inset-0 bg-emerald-500 blur opacity-20 pulse-glow rounded-full"></div>
                          <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-emerald-500/50 relative z-10" />
                        </div>
                        <span className="text-xs text-emerald-500/70 pulse-glow font-medium">Generating visual...</span>
                    </>
                ) : (
                    <div className="flex flex-col items-center">
                        <ImageIcon className="w-6 h-6 md:w-8 md:h-8 opacity-20" />
                        <span className="text-xs mt-2 opacity-30">No visualization available</span>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Content - Minimal styling */}
      <div className="p-3 md:p-4 space-y-2">
        <h3 className="text-slate-100 font-semibold text-sm leading-tight">{title}</h3>
        <p className="text-slate-400 text-xs leading-relaxed">{description}</p>
        
        {safetyWarning && (
          <div className="p-2 bg-amber-950/30 rounded text-amber-200/90 text-xs flex items-start gap-2">
            <TriangleAlert className="w-3 h-3 shrink-0 mt-0.5" />
            <span className="leading-snug">{safetyWarning}</span>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps: NodeProps<any>, nextProps: NodeProps<any>) => {
  // Custom comparison for better performance
  return (
    prevProps.data.imageUrl === nextProps.data.imageUrl &&
    prevProps.data.isGeneratingImage === nextProps.data.isGeneratingImage &&
    prevProps.data.stepNumber === nextProps.data.stepNumber
  );
});

/**
 * Node for the Materials List.
 */
export const MaterialNode = memo(({ data }: NodeProps<any>) => {
  const { items } = data as MaterialNodeData;

  return (
    <div className="w-[230px] md:w-[250px] bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-lg relative smooth-transition hover:shadow-xl">
      <Handle type="target" position={Position.Right} id="target-right" className="!bg-blue-500 !w-3 !h-3" />
      
      <div className="px-3 py-2.5 flex items-center gap-2">
        <List className="w-4 h-4 text-blue-400" />
        <h3 className="text-slate-200 font-medium text-sm">Materials</h3>
      </div>
      
      <div className="px-3 pb-3 max-h-[250px] md:max-h-[300px] overflow-y-auto custom-scrollbar">
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}, (prevProps: NodeProps<any>, nextProps: NodeProps<any>) => {
  // Custom comparison - only re-render if items change
  return prevProps.data.items.length === nextProps.data.items.length;
});

/**
 * Node for uploaded images
 */
export const ImageNode = memo(({ data, id }: NodeProps<any>) => {
  const { imageUrl, fileName, width, height, isSelected, isGeneratingImage, onSelect, onDeselect } = data as ImageNodeData;
  const nodeRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSegmenterReady, setIsSegmenterReady] = useState(false);
  const [isSegmenterLoading, setIsSegmenterLoading] = useState(true);
  const [isProcessingMask, setIsProcessingMask] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);

  // Magic select is disabled for ImageNode (uploaded images)
  const magicSelectEnabled = false;

  // Initialize Segmenter on mount
  useEffect(() => {
    setIsSegmenterLoading(true);
    initSegmenter().then((seg) => {
        if (seg) {
          setIsSegmenterReady(true);
        }
        setIsSegmenterLoading(false);
    });
  }, []);

  const handleNodeHover = () => {
      // Trigger unified menu callback on hover if provided
      if (nodeRef.current && onSelect) {
        onSelect(id, nodeRef.current);
      }
  };

  const handleNodeLeave = () => {
      // Trigger deselect callback when mouse leaves
      if (onDeselect) {
        onDeselect();
      }
  };

  const handleImageClick = async (e: React.MouseEvent) => {
      // Magic select is disabled for uploaded images
      if (!magicSelectEnabled || !isSegmenterReady || !imgRef.current || !canvasRef.current || isProcessingMask) return;

      setIsProcessingMask(true);
      try {
          const result = await segmentImage(e, imgRef.current);

          if (result) {
              let { uint8Array, width, height } = result;

              // Filter to keep only the largest connected region
              uint8Array = filterLargestRegion(uint8Array, width, height);

              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                  canvasRef.current.width = width;
                  canvasRef.current.height = height;

                  const imageData = ctx.createImageData(width, height);
                  const data = imageData.data;

                  for (let i = 0; i < uint8Array.length; i++) {
                      const category = uint8Array[i];
                      const pixelIndex = i * 4;

                      if (category > 0) {
                          data[pixelIndex] = 168;     // R (Purple)
                          data[pixelIndex + 1] = 85;  // G
                          data[pixelIndex + 2] = 247; // B
                          data[pixelIndex + 3] = 140; // Alpha
                      } else {
                          data[pixelIndex + 3] = 0;
                      }
                  }
                  ctx.putImageData(imageData, 0, 0);
                  setHasSelection(true);
              }
          }
      } catch (err) {
          console.error("Segmentation failed", err);
      } finally {
          setIsProcessingMask(false);
      }
  };

  const handleClearSelection = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
      }
      setHasSelection(false);
  };

  return (
    <div 
      ref={nodeRef}
      onMouseEnter={handleNodeHover}
      onMouseLeave={handleNodeLeave}
      className={`relative group bg-slate-900/95 backdrop-blur-sm rounded-xl shadow-2xl border-2 overflow-hidden smooth-transition hover:shadow-xl ${
        isSelected 
          ? 'border-orange-500 shadow-orange-500/50 ring-2 ring-orange-500/30' 
          : 'border-purple-500/50'
      }`}
    >
      <Handle type="source" position={Position.Right} id="source-right" className="!bg-purple-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Left} id="source-left" className="!bg-purple-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Right} id="target-right" className="!bg-purple-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="target-left" className="!bg-purple-500 !w-3 !h-3" />

      {/* Header */}
      <div className="px-4 py-2 bg-purple-600/20 border-b border-purple-500/30 flex justify-between items-center">
        <span className="text-purple-200 font-semibold text-sm truncate">{fileName}</span>
        <div className="flex items-center gap-2">
            {isProcessingMask && <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />}
            <ImageIcon className="w-4 h-4 text-purple-400" />
        </div>
      </div>

      {/* Image & Interactive Area */}
      <div className={`relative bg-white ${magicSelectEnabled ? 'cursor-crosshair' : 'cursor-default'}`} style={{ width: `${width}px`, height: `${height}px` }}>
        {isGeneratingImage ? (
          // Loading placeholder while image is being generated
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 blur opacity-20 pulse-glow rounded-full"></div>
              <Loader2 className="w-12 h-12 animate-spin text-purple-500/50 relative z-10" />
            </div>
            <span className="text-sm text-purple-500/70 pulse-glow font-medium mt-4">Generating pattern sheet...</span>
            <span className="text-xs text-purple-400/50 mt-2">This may take a moment</span>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={imageUrl}
            alt={fileName}
            crossOrigin="anonymous"
            onClick={handleImageClick}
            className="w-full h-full object-contain relative z-10"
          />
        )}

        {/* Segmentation Overlay Canvas */}
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-20 pointer-events-none w-full h-full mix-blend-screen"
        />

        {/* Loading Indicator for AI Model - only show when magic select is enabled */}
        {magicSelectEnabled && !hasSelection && isSegmenterLoading && (
          <div className="absolute top-2 right-2 z-30 pointer-events-none">
               <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                   <Loader2 className="w-3 h-3 animate-spin" />
                   Loading AI...
               </div>
          </div>
        )}

        {/* Hover Hint for Selection - only show when magic select is enabled */}
        {magicSelectEnabled && !hasSelection && !isSegmenterLoading && (
          <div className={`absolute top-2 right-2 z-30 pointer-events-none transition-opacity duration-300 ${isSegmenterReady ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
               <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                   <MousePointerClick className="w-3 h-3" />
                   Magic Select
               </div>
          </div>
        )}

        {/* Clear Selection Button */}
        {hasSelection && (
          <div className="absolute top-2 right-2 z-30">
            <button
              onClick={handleClearSelection}
              className="bg-red-600 hover:bg-red-500 text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg active:scale-95 transition-all"
            >
              <span className="text-sm">×</span>
              Clear Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps: NodeProps<any>, nextProps: NodeProps<any>) => {
  return (
    prevProps.data.imageUrl === nextProps.data.imageUrl &&
    prevProps.data.isSelected === nextProps.data.isSelected
  );
});

/*
*
 * Node for shapes
 */
export const ShapeNode = memo(({ data, selected }: NodeProps<any>) => {
  const { shapeType, fillColor, strokeColor, width, height, text } = data as ShapeNodeData;
  const strokeWidth = 1; // Fixed thin stroke

  const renderShape = () => {
    switch (shapeType) {
      case 'rectangle':
      case 'rectangle-text':
        return (
          <rect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={width - strokeWidth}
            height={height - strokeWidth}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            rx="4"
          />
        );
      case 'circle':
      case 'circle-text':
        return (
          <circle
            cx={width / 2}
            cy={height / 2}
            r={(Math.min(width, height) - strokeWidth) / 2}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      case 'triangle':
        return (
          <polygon
            points={`${width / 2},${strokeWidth} ${width - strokeWidth},${height - strokeWidth} ${strokeWidth},${height - strokeWidth}`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      case 'star':
        const points = [];
        const outerRadius = (Math.min(width, height) - strokeWidth) / 2;
        const innerRadius = outerRadius * 0.4;
        const cx = width / 2;
        const cy = height / 2;
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          points.push(`${x},${y}`);
        }
        return (
          <polygon
            points={points.join(' ')}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      case 'speech-bubble':
        return (
          <g>
            <rect
              x={strokeWidth / 2}
              y={strokeWidth / 2}
              width={width - strokeWidth}
              height={height * 0.8 - strokeWidth}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              rx="8"
            />
            <polygon
              points={`${width * 0.3},${height * 0.8} ${width * 0.2},${height - strokeWidth} ${width * 0.4},${height * 0.8}`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </g>
        );
      case 'arrow-right':
        return (
          <polygon
            points={`${strokeWidth},${height / 2 - 20} ${width - 40},${height / 2 - 20} ${width - 40},${strokeWidth} ${width - strokeWidth},${height / 2} ${width - 40},${height - strokeWidth} ${width - 40},${height / 2 + 20} ${strokeWidth},${height / 2 + 20}`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      case 'arrow-left':
        return (
          <polygon
            points={`${width - strokeWidth},${height / 2 - 20} ${40},${height / 2 - 20} ${40},${strokeWidth} ${strokeWidth},${height / 2} ${40},${height - strokeWidth} ${40},${height / 2 + 20} ${width - strokeWidth},${height / 2 + 20}`}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="relative group"
      style={{
        width: `${width}px`,
        height: `${height}px`
      }}
    >
      {/* Node Resizer - only visible when selected */}
      <NodeResizer
        color="#f97316"
        isVisible={selected}
        minWidth={50}
        minHeight={50}
      />

      {/* Connection Handles */}
      {/* Source handles for outgoing connections */}
      <Handle
        id="top"
        type="source"
        position={Position.Top}
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />

      {/* Target handles for incoming connections */}
      <Handle
        id="top-target"
        type="target"
        position={Position.Top}
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />
      <Handle
        id="right-target"
        type="target"
        position={Position.Right}
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />
      <Handle
        id="bottom-target"
        type="target"
        position={Position.Bottom}
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />
      <Handle
        id="left-target"
        type="target"
        position={Position.Left}
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />

      {/* Shape SVG */}
      <svg width={width} height={height} className="block">
        {renderShape()}
        {text && (
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={strokeColor}
            fontSize="14"
            fontWeight="500"
          >
            {text}
          </text>
        )}
      </svg>
    </div>
  );
}, (prevProps: NodeProps<any>, nextProps: NodeProps<any>) => {
  return (
    prevProps.data.shapeType === nextProps.data.shapeType &&
    prevProps.data.text === nextProps.data.text &&
    prevProps.data.width === nextProps.data.width &&
    prevProps.data.height === nextProps.data.height &&
    prevProps.selected === nextProps.selected
  );
});

/**
 * Node for text annotations
 */
export const TextNode = memo(({ data, id }: NodeProps<any>) => {
  const { content, fontSize, fontFamily, color, alignment, isEditing, onEdit, onFinishEdit } = data as TextNodeData & {
    isEditing?: boolean;
    onEdit?: (id: string) => void;
    onFinishEdit?: (id: string, newContent: string) => void;
  };

  const [editContent, setEditContent] = React.useState(content);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Focus textarea when editing starts
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Auto-resize textarea based on content
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editContent, isEditing]);

  const handleDoubleClick = () => {
    if (onEdit) {
      onEdit(id);
    }
  };

  const handleBlur = () => {
    if (onFinishEdit && editContent !== content) {
      onFinishEdit(id, editContent);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (onFinishEdit) {
        onFinishEdit(id, editContent);
      }
      textareaRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditContent(content);
      if (onFinishEdit) {
        onFinishEdit(id, content);
      }
      textareaRef.current?.blur();
    }
  };

  return (
    <div 
      className="bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-lg relative smooth-transition hover:shadow-xl overflow-hidden min-w-[150px]"
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="source" position={Position.Right} id="source-right" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Left} id="source-left" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Right} id="target-right" className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} id="target-left" className="!bg-emerald-500 !w-3 !h-3" />

      <div className="p-3">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-slate-800 text-slate-100 border border-emerald-500 rounded px-2 py-1 resize-none outline-none"
            style={{
              fontSize: `${fontSize}px`,
              fontFamily,
              color,
              textAlign: alignment,
              minHeight: '40px',
            }}
          />
        ) : (
          <div
            className="cursor-text select-text whitespace-pre-wrap break-words"
            style={{
              fontSize: `${fontSize}px`,
              fontFamily,
              color,
              textAlign: alignment,
              minHeight: '40px',
            }}
          >
            {content || 'Double-click to edit'}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps: NodeProps<any>, nextProps: NodeProps<any>) => {
  return (
    prevProps.data.content === nextProps.data.content &&
    prevProps.data.isEditing === nextProps.data.isEditing &&
    prevProps.data.fontSize === nextProps.data.fontSize &&
    prevProps.data.color === nextProps.data.color
  );
});

/**
 * Node for freehand drawings
 */
export const DrawingNode = memo(({ data }: NodeProps<any>) => {
  const { paths, strokeColor, strokeWidth } = data as DrawingNodeData;

  // If no paths or empty paths, return minimal invisible element
  if (!paths || paths.length === 0) {
    return (
      <div className="w-1 h-1 bg-transparent pointer-events-none" />
    );
  }

  // If path exists but has no points yet, still render the SVG container
  if (paths[0].points.length === 0) {
    return (
      <svg 
        className="pointer-events-none absolute top-0 left-0"
        style={{ overflow: 'visible' }}
      />
    );
  }

  // Convert path points to SVG path string
  const pathToSvgPath = (path: DrawingPath): string => {
    if (path.points.length === 0) return '';
    
    const points = path.points;
    let pathString = `M ${points[0].x} ${points[0].y}`;
    
    if (path.tool === 'pen' && points.length > 2) {
      // Smooth path using quadratic curves for pen mode
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        pathString += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
      }
      // Add final point
      const lastPoint = points[points.length - 1];
      pathString += ` L ${lastPoint.x} ${lastPoint.y}`;
    } else {
      // Raw path for pencil mode
      for (let i = 1; i < points.length; i++) {
        pathString += ` L ${points[i].x} ${points[i].y}`;
      }
    }

    return pathString;
  };

  return (
    <svg
      className="pointer-events-none"
      style={{ overflow: 'visible', display: 'block' }}
    >
      {paths.map((path, index) => (
        <path
          key={index}
          d={pathToSvgPath(path)}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </svg>
  );
}, (prevProps: NodeProps<any>, nextProps: NodeProps<any>) => {
  // Always re-render during drawing for smooth updates
  // This is acceptable because we're throttling updates with requestAnimationFrame
  return false;
});
