import React, { useRef, useState, useEffect } from 'react';
import { useCanvasStore } from '../canvasStore';
import { FrameComponent } from './FrameComponent';
import { MousePointer, Hand, ZoomIn, Info, Settings, Eye, HelpCircle, Undo2, Redo2, PlusCircle, X, Smartphone, Laptop } from 'lucide-react';

interface CanvasProps {
  onPlay: (frameId: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ onPlay }) => {
  const {
    panOffset,
    setPanOffset,
    zoom,
    setZoom,
    toolMode,
    setToolMode,
    frames,
    addFrame,
    activeFrameId,
    setActiveFrameId,
    selectedElement,
    setSelectedElement,
    hoveredElement,
    setHoveredElement,
    showShortcuts,
    setShowShortcuts,
    undo,
    redo,
    historyIndex,
    history,
    theme,
    duplicateFrame,
    cycleFrame
  } = useCanvasStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });
  
  // Track spacebar state to temporarily override to pan tool
  const [spacePressed, setSpacePressed] = useState(false);
  const prevToolRef = useRef(toolMode);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in input/textarea/select
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      const key = e.key.toLowerCase();
      
      // Toggle keyboard shortcutsmodal guide
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
        return;
      }

      // Spacebar override
      if (e.code === 'Space') {
        if (!spacePressed) {
          prevToolRef.current = useCanvasStore.getState().toolMode;
          setToolMode('pan');
          setSpacePressed(true);
        }
        e.preventDefault();
      }

      // Undo/Redo: Cmd/Ctrl + Z / Cmd/Ctrl + Shift + Z
      if ((e.metaKey || e.ctrlKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Screen Duplicate: Cmd/Ctrl + D
      if ((e.metaKey || e.ctrlKey) && key === 'd') {
        e.preventDefault();
        const activeId = useCanvasStore.getState().activeFrameId;
        if (activeId) {
          duplicateFrame(activeId);
        }
        return;
      }

      // Screen Cycling: Cmd/Ctrl + Left/Right Arrow
      if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        cycleFrame(e.key === 'ArrowLeft' ? 'prev' : 'next');
        return;
      }

      // Tool Mode switching
      if (key === 'v') {
        setToolMode('select');
      } else if (key === 'h') {
        setToolMode('pan');
      } else if (key === 'z') {
        setToolMode('zoom');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setToolMode(prevToolRef.current);
        setSpacePressed(false);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed, setToolMode, undo, redo, showShortcuts, setShowShortcuts]);

  // Canvas Mouse interaction: Panning and Zooming
  const handleMouseDown = (e: React.MouseEvent) => {
    // If zoom mode: zoom in on click (zoom out if option/alt key is pressed)
    if (toolMode === 'zoom') {
      const zoomFactor = e.altKey || e.optionKey ? 0.7 : 1.3;
      
      // Focus zoom to coordinate of mouse pointer
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setZoom((prevZoom) => {
          const nextZoom = Math.min(Math.max(prevZoom * zoomFactor, 0.15), 3);
          const ratio = nextZoom / prevZoom;

          // Align panning offset to center on click coordinate
          setPanOffset({
            x: mouseX - (mouseX - panOffset.x) * ratio,
            y: mouseY - (mouseY - panOffset.y) * ratio
          });
          return nextZoom;
        });
      }
      return;
    }

    // Pan Mode
    if (toolMode === 'pan' || spacePressed || e.button === 1) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      startOffset.current = { ...panOffset };
      e.preventDefault();
    } else {
      // Clear selections if click blank canvas
      setSelectedElement(null);
      setHoveredElement(null);
      setActiveFrameId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPanOffset({
      x: startOffset.current.x + dx,
      y: startOffset.current.y + dy
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Pinch or mouse wheel zooming with ctrl key
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomIntensity = 0.05;
    
    // Check if ctrl key is pressed (or trackpad pinch-to-zoom sends ctrl key in wheel events)
    const isPinch = e.ctrlKey;
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;

      setZoom((prevZoom) => {
        const nextZoom = Math.min(Math.max(prevZoom * zoomFactor, 0.15), 3);
        const ratio = nextZoom / prevZoom;

        setPanOffset({
          x: mouseX - (mouseX - panOffset.x) * ratio,
          y: mouseY - (mouseY - panOffset.y) * ratio
        });
        return nextZoom;
      });
    }
  };

  // Quick Action: Add responsive frame
  const handleAddNewFrame = () => {
    const spacing = 410;
    const offsetIdx = frames.length;
    const newFrame = {
      id: `f_${Date.now()}`,
      name: `Frame ${offsetIdx + 1}`,
      x: Math.round(-panOffset.x / zoom + 150 + (offsetIdx % 2) * 50),
      y: Math.round(-panOffset.y / zoom + 150 + Math.floor(offsetIdx / 2) * 50),
      width: 375, // responsive mobile width
      height: 600,
      prompt: 'Blank mobile layout template',
      code: `
<div class="p-6 min-h-screen bg-white text-slate-800 flex flex-col items-center justify-center text-center" data-stitch-id="comp_blank_root">
  <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4" data-stitch-id="comp_blank_icon">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/><path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5Z"/><path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z"/></svg>
  </div>
  <h2 class="text-lg font-bold text-slate-900" data-stitch-id="comp_blank_title">Stitch Workspace</h2>
  <p class="text-xs text-slate-400 max-w-[240px] mt-2 mb-4" data-stitch-id="comp_blank_desc">Write a prompt below to design this mobile interface instantly with Gemini AI.</p>
  <button class="bg-primary text-white text-xs font-semibold px-4 py-2 rounded-global hover:opacity-90 transition-opacity" data-stitch-id="comp_blank_btn">Get Started</button>
</div>
`
    };
    addFrame(newFrame);
  };

  const handleCenterCanvas = () => {
    setPanOffset({ x: 50, y: 50 });
    setZoom(0.85);
  };

  // Calculate coordinates for dynamic element highlight boxes relative to zoom context
  const getHighlightStyle = (elemInfo: typeof hoveredElement | typeof selectedElement) => {
    if (!elemInfo) return { display: 'none' };
    const frame = frames.find((f) => f.id === elemInfo.frameId);
    if (!frame) return { display: 'none' };

    // Canvas coordinates: frame position + iframe header offset (40px) + element relative rect
    const left = frame.x + elemInfo.rect.left;
    const top = frame.y + 40 + elemInfo.rect.top;
    
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${elemInfo.rect.width}px`,
      height: `${elemInfo.rect.height}px`,
    };
  };

  return (
    <div className="flex-1 bg-slate-100 relative overflow-hidden flex flex-col select-none">
      
      {/* Visual Canvas Toolbar Header */}
      <div className="h-12 bg-white border-b border-slate-100 flex justify-between items-center px-4 shrink-0 shadow-sm z-10">
        
        {/* Tool Mode Selection */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl p-0.5">
          <button
            onClick={() => setToolMode('select')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              toolMode === 'select' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-100' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Select element / interact (V)"
          >
            <MousePointer className="w-3.5 h-3.5 text-indigo-500" />
            Select Mode
          </button>
          
          <button
            onClick={() => setToolMode('pan')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              toolMode === 'pan' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-100' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Pan view (H or hold Spacebar)"
          >
            <Hand className="w-3.5 h-3.5 text-orange-500" />
            Pan Mode
          </button>

          <button
            onClick={() => setToolMode('zoom')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              toolMode === 'zoom' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-100' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Zoom Click (Z)"
          >
            <ZoomIn className="w-3.5 h-3.5 text-emerald-500" />
            Zoom Mode
          </button>
        </div>

        {/* Viewport Toggle for Active Frame (Gemini 1.5 Pro MVP matching) */}
        {(() => {
          const activeFrame = frames.find((f) => f.id === activeFrameId);
          if (!activeFrame) return <div className="text-xs text-slate-400 font-medium bg-slate-50 border border-dashed border-slate-200 px-3 py-1.5 rounded-lg">Select a frame to toggle viewport</div>;
          return (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl p-0.5 shadow-sm">
              <button
                onClick={() => updateFrame(activeFrame.id, { width: 375 })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeFrame.width <= 480 
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Set Active Frame to Mobile Width (375px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile View
              </button>
              <button
                onClick={() => updateFrame(activeFrame.id, { width: 1440 })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeFrame.width > 480 
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Set Active Frame to Desktop Width (1440px)"
              >
                <Laptop className="w-3.5 h-3.5" />
                Desktop View
              </button>
            </div>
          );
        })()}

        {/* Zoom & Centering controllers */}
        <div className="flex items-center gap-3">
          {/* Add frame quick action */}
          <button
            onClick={handleAddNewFrame}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-600 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Frame
          </button>

          <div className="h-4 w-px bg-slate-200" />

          {/* Zoom % */}
          <span className="font-mono text-xs font-bold text-slate-500">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={handleCenterCanvas}
            className="px-2.5 py-1 text-xs border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors font-semibold"
          >
            Reset Viewport
          </button>
        </div>
      </div>

      {/* Infinite Grid Workspace container */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`flex-1 overflow-hidden outline-none relative bg-slate-50/40 ${
          toolMode === 'pan' || spacePressed 
            ? 'cursor-grab active:cursor-grabbing' 
            : toolMode === 'zoom' 
              ? 'cursor-zoom-in' 
              : 'cursor-default'
        }`}
        style={{
          backgroundImage: `
            radial-gradient(circle, #cbd5e1 1px, transparent 1px)
          `,
          backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
          backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
        }}
      >
        {/* Zoomed & Panned viewport board */}
        <div
          className="absolute origin-top-left"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          }}
        >
          {/* Render spawned frames */}
          {frames.map((frame) => (
            <FrameComponent 
              key={frame.id} 
              frame={frame} 
              onPlay={onPlay}
            />
          ))}

          {/* Live Hover visual highlight block on canvas */}
          {hoveredElement && (!selectedElement || selectedElement.elementId !== hoveredElement.elementId) && (
            <div
              className="absolute border border-dashed border-indigo-400 pointer-events-none z-30 bg-indigo-400/5 animate-fade-in"
              style={getHighlightStyle(hoveredElement)}
            >
              <div className="absolute top-[-18px] left-0 bg-indigo-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow-sm font-mono whitespace-nowrap">
                Hover to Select
              </div>
            </div>
          )}

          {/* Click Selected Element visual highlight block on canvas */}
          {selectedElement && (
            <div
              className="absolute border-2 border-indigo-600 pointer-events-none z-30 bg-indigo-600/5 shadow-lg"
              style={getHighlightStyle(selectedElement)}
            >
              {/* Context menu for targeted component rewrite */}
              <div className="absolute top-[-22px] right-0 bg-indigo-600 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow-md font-mono whitespace-nowrap flex items-center gap-1 pointer-events-auto">
                <span>Selected: &lt;{selectedElement.tagName.toLowerCase()}&gt;</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElement(null);
                  }}
                  className="hover:bg-indigo-700 p-0.5 rounded text-indigo-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
