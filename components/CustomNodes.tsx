import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Loader2, Scissors, TriangleAlert, Hammer, List, Image as ImageIcon } from 'lucide-react';
import { MasterNodeData, InstructionNodeData, MaterialNodeData } from '../types';

/**
 * The Central "Master" Node displaying the generated image.
 */
export const MasterNode = memo(({ data, id }: NodeProps<any>) => {
  const { label, imageUrl, isDissecting, onDissect, isDissected } = data as MasterNodeData;

  return (
    <div className="relative group rounded-xl overflow-hidden shadow-2xl border-2 border-indigo-500/50 bg-slate-900 w-[300px]">
      {/* Connection Handle */}
      <Handle type="source" position={Position.Right} className="!bg-indigo-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Left} className="!bg-indigo-500 !w-3 !h-3" />
      
      {/* Header */}
      <div className="px-4 py-2 bg-indigo-600/20 border-b border-indigo-500/30 flex justify-between items-center">
        <span className="text-indigo-200 font-semibold text-sm truncate">{label}</span>
        <Hammer className="w-4 h-4 text-indigo-400" />
      </div>

      {/* Image */}
      <div className="relative aspect-square w-full bg-slate-950">
        <img 
          src={imageUrl} 
          alt={label} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        
        {/* Overlay for Dissect Action */}
        {!isDissected && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
            <button
              onClick={() => onDissect(id, imageUrl)}
              disabled={isDissecting}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full font-bold shadow-lg transform transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDissecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Dissecting...
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4" />
                  Dissect Craft
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Node for a single step instruction.
 */
export const InstructionNode = memo(({ data }: NodeProps<any>) => {
  const { stepNumber, title, description, safetyWarning, imageUrl, isGeneratingImage } = data as InstructionNodeData;

  return (
    <div className="w-[320px] bg-slate-800 rounded-lg shadow-xl border border-slate-600 transition-all hover:border-emerald-400/50 hover:shadow-emerald-900/20 overflow-hidden">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500 !w-3 !h-3" />
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-3 bg-slate-800/80">
        <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-emerald-900/50 text-emerald-300 text-sm font-bold border border-emerald-700/50 shadow-inner">
          {stepNumber}
        </div>
        <h3 className="text-slate-100 font-semibold text-sm leading-tight">{title}</h3>
      </div>
      
      {/* Image Section */}
      <div className="w-full aspect-video bg-slate-950 border-b border-slate-700/50 relative group overflow-hidden">
        {imageUrl ? (
           <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
           />
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 space-y-2 p-4">
                {isGeneratingImage ? (
                    <>
                        <div className="relative">
                          <div className="absolute inset-0 bg-emerald-500 blur opacity-20 animate-pulse rounded-full"></div>
                          <Loader2 className="w-8 h-8 animate-spin text-emerald-500/50 relative z-10" />
                        </div>
                        <span className="text-xs text-emerald-500/70 animate-pulse font-medium">Generating visual...</span>
                    </>
                ) : (
                    <div className="flex flex-col items-center">
                        <ImageIcon className="w-8 h-8 opacity-20" />
                        <span className="text-xs mt-2 opacity-30">No visualization available</span>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
        
        {safetyWarning && (
          <div className="p-2.5 bg-amber-950/30 border border-amber-900/40 rounded-md text-amber-200/90 text-xs flex items-start gap-2.5 shadow-sm">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{safetyWarning}</span>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Node for the Materials List.
 */
export const MaterialNode = memo(({ data }: NodeProps<any>) => {
  const { items } = data as MaterialNodeData;

  return (
    <div className="w-[250px] bg-slate-800 rounded-lg shadow-xl border border-slate-600 relative">
      <Handle type="target" position={Position.Right} className="!bg-blue-500 !w-3 !h-3" />
      
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center gap-2 rounded-t-lg">
        <List className="w-4 h-4 text-blue-400" />
        <h3 className="text-blue-100 font-medium text-sm">Required Materials</h3>
      </div>
      
      <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});