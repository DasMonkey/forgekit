import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { Loader2, TriangleAlert, List, Image as ImageIcon } from 'lucide-react';
import { MasterNodeData, InstructionNodeData, MaterialNodeData, ImageNodeData, ShapeNodeData, TextNodeData, DrawingNodeData, DrawingPath } from '../types';

/**
 * The Central "Master" Node displaying the generated image.
 */
export const MasterNode = memo(({ data, id }: NodeProps<any>) => {
  const { label, imageUrl, isDissecting, isDissected, onContextMenu } = data as MasterNodeData;

  const handleClick = (event: React.MouseEvent) => {
    // Trigger context menu on click
    if (onContextMenu && !isDissected) {
      const target = event.currentTarget as HTMLElement;
      onContextMenu(id, target);
    }
  };

  return (
    <div 
      className="relative group rounded-lg overflow-hidden shadow-lg w-[280px] md:w-[300px] smooth-transition cursor-pointer hover:shadow-xl"
      onClick={handleClick}
    >
      {/* Connection Handle */}
      <Handle type="source" position={Position.Right} className="!bg-indigo-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Left} className="!bg-indigo-500 !w-3 !h-3" />
      
      {/* Image - Clean display without decorative borders */}
      <div className="relative aspect-square w-full bg-white">
        <img 
          src={imageUrl} 
          alt={label} 
          className="w-full h-full object-cover"
        />
        
        {/* Loading overlay when dissecting */}
        {isDissecting && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Dissecting...</span>
            </div>
          </div>
        )}
      </div>

      {/* Label below image - minimal styling */}
      <div className="px-3 py-2 bg-slate-900/95 backdrop-blur-sm">
        <span className="text-slate-300 text-xs truncate block">{label}</span>
      </div>
    </div>
  );
}, (prevProps: NodeProps<any>, nextProps: NodeProps<any>) => {
  // Custom comparison for better performance
  return (
    prevProps.data.isDissecting === nextProps.data.isDissecting &&
    prevProps.data.isDissected === nextProps.data.isDissected &&
    prevProps.data.imageUrl === nextProps.data.imageUrl
  );
});

/**
 * Node for a single step instruction.
 */
export const InstructionNode = memo(({ data }: NodeProps<any>) => {
  const { stepNumber, title, description, safetyWarning, imageUrl, isGeneratingImage } = data as InstructionNodeData;

  return (
    <div className="w-[300px] md:w-[320px] bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-lg smooth-transition hover:shadow-xl overflow-hidden">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500 !w-3 !h-3" />
      
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
      <Handle type="target" position={Position.Right} className="!bg-blue-500 !w-3 !h-3" />
      
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
export const ImageNode = memo(({ data }: NodeProps<any>) => {
  const { imageUrl, fileName, width, height } = data as ImageNodeData;

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-lg relative smooth-transition hover:shadow-xl overflow-hidden">
      <Handle type="source" position={Position.Right} className="!bg-purple-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Left} className="!bg-purple-500 !w-3 !h-3" />
      
      {/* Image */}
      <div className="relative bg-white" style={{ width: `${width}px`, height: `${height}px` }}>
        <img 
          src={imageUrl} 
          alt={fileName} 
          className="w-full h-full object-contain"
        />
      </div>

      {/* File name label */}
      <div className="px-3 py-2 bg-slate-900/95 backdrop-blur-sm">
        <span className="text-slate-300 text-xs truncate block">{fileName}</span>
      </div>
    </div>
  );
}, (prevProps: NodeProps<any>, nextProps: NodeProps<any>) => {
  return prevProps.data.imageUrl === nextProps.data.imageUrl;
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
      <Handle type="source" position={Position.Right} className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Left} className="!bg-emerald-500 !w-3 !h-3" />
      
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
