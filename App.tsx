import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import { Box } from 'lucide-react';
import { MasterNode, InstructionNode, MaterialNode } from './components/CustomNodes';
import { ChatInterface } from './components/ChatInterface';
import { dissectCraft, generateStepImage } from './services/geminiService';
import { CraftCategory } from './types';

// Define custom node types outside component to prevent re-renders
const nodeTypes = {
  masterNode: MasterNode,
  instructionNode: InstructionNode,
  materialNode: MaterialNode,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const AppContent = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }, eds)),
    [setEdges],
  );

  /**
   * Helper to trigger image generation for a specific node
   */
  const triggerStepImageGeneration = async (nodeId: string, stepDescription: string, masterImageUrl: string) => {
      try {
          const stepImageUrl = await generateStepImage(masterImageUrl, stepDescription);
          
          setNodes((nds) => nds.map(n => {
              if (n.id === nodeId) {
                  return { 
                      ...n, 
                      data: { 
                          ...n.data, 
                          imageUrl: stepImageUrl, 
                          isGeneratingImage: false 
                      } 
                  };
              }
              return n;
          }));
      } catch (err) {
          console.error(`Failed to generate image for node ${nodeId}`, err);
          setNodes((nds) => nds.map(n => {
              if (n.id === nodeId) {
                  return { ...n, data: { ...n.data, isGeneratingImage: false } };
              }
              return n;
          }));
      }
  };

  /**
   * Step 2: The Logic to "Dissect" the craft
   */
  const handleDissect = async (nodeId: string, imageUrl: string) => {
    // 1. Set loading state on the specific node
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, isDissecting: true } };
        }
        return node;
      })
    );

    try {
        // Find the prompt from the node data to give context to the AI
        const node = nodes.find(n => n.id === nodeId);
        const promptContext = node?.data?.label as string || "Unknown craft";

        // 2. Call Gemini API to get TEXT instructions
        const dissection = await dissectCraft(imageUrl, promptContext);
        
        // 3. Calculate Positions for new nodes
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        // 3a. Materials Node (Left side)
        const matNodeId = `${nodeId}-mat`;
        newNodes.push({
            id: matNodeId,
            type: 'materialNode',
            position: { x: -400, y: 0 },
            data: { items: dissection.materials },
        });
        newEdges.push({
            id: `e-${nodeId}-${matNodeId}`,
            source: nodeId,
            sourceHandle: null, 
            target: matNodeId,
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
        });

        // 3b. Instruction Nodes (Right side, Grid/List layout)
        const startX = 500; // Shifted right slightly to accommodate wider cards
        const startY = -100;
        const gapY = 500; // Increased gap for taller cards with images
        const gapX = 400;
        
        dissection.steps.forEach((step, index) => {
            const stepNodeId = `${nodeId}-step-${step.stepNumber}`;
            // Simple layout: 2 columns if many steps, or 1 column
            const col = index % 2;
            const row = Math.floor(index / 2);
            
            newNodes.push({
                id: stepNodeId,
                type: 'instructionNode',
                position: { 
                    x: startX + (col * gapX), 
                    y: startY + (row * gapY) - ((dissection.steps.length * gapY)/4) 
                },
                data: { 
                    stepNumber: step.stepNumber,
                    title: step.title,
                    description: step.description,
                    safetyWarning: step.safetyWarning,
                    isGeneratingImage: true, // Start in loading state
                    imageUrl: undefined
                }
            });

            newEdges.push({
                id: `e-${nodeId}-${stepNodeId}`,
                source: nodeId,
                target: stepNodeId,
                animated: true,
                style: { stroke: '#10b981', strokeWidth: 2 },
            });
        });

        // 4. Update Canvas State with Text Nodes IMMEDIATELY so user sees progress
        setNodes((nds) => {
            const updatedMaster = nds.map(n => {
                if (n.id === nodeId) {
                    return { ...n, data: { ...n.data, isDissecting: false, isDissected: true }};
                }
                return n;
            });
            return [...updatedMaster, ...newNodes];
        });

        setEdges((eds) => [...eds, ...newEdges]);

        // 5. Trigger Image Generation Sequence
        // Background async task for sequential generation
        const processImagesSequentially = async () => {
          for (const step of dissection.steps) {
            const stepNodeId = `${nodeId}-step-${step.stepNumber}`;
            // Await each generation to ensure we don't flood the API
            await triggerStepImageGeneration(stepNodeId, step.description, imageUrl);
          }
        };

        processImagesSequentially();

    } catch (error) {
        console.error("Dissection error", error);
        // Reset loading state
        setNodes((nds) =>
            nds.map((node) => {
              if (node.id === nodeId) {
                return { ...node, data: { ...node.data, isDissecting: false } };
              }
              return node;
            })
          );
        alert("Failed to dissect. Please try again.");
    }
  };

  /**
   * Step 1: Add the Master Generated Node
   */
  const handleGenerate = useCallback((imageUrl: string, prompt: string, category: CraftCategory) => {
    const id = `master-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'masterNode',
      position: { x: 0, y: 0 }, // Center
      data: {
        label: prompt,
        imageUrl,
        category,
        onDissect: handleDissect,
        isDissecting: false,
        isDissected: false,
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  return (
    <div className="w-screen h-screen bg-slate-950 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-950"
      >
        <Background 
            color="#334155" 
            variant={BackgroundVariant.Dots} 
            gap={24} 
            size={2} 
        />
        <Controls className="bg-slate-800 border-slate-700 text-slate-200" />
      </ReactFlow>

      {/* Brand Overlay */}
      <div className="absolute top-6 left-8 z-40 pointer-events-none select-none">
        <h1 className="text-3xl font-black text-slate-100 tracking-tighter flex items-center gap-3">
            <Box className="w-8 h-8 text-indigo-500" />
            Craftus
        </h1>
        <p className="text-slate-400 text-sm ml-11 font-mono">Infinite Craft Workbench</p>
      </div>

      {/* Chat Interface replaced the Modal and FAB */}
      <ChatInterface onGenerate={handleGenerate} />
    </div>
  );
};

export default function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}