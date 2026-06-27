import React, { useRef, useState } from 'react';
import { useCanvasStore } from '../canvasStore';
import { Frame } from '../types';
import { FramePreview } from './FramePreview';
import { Trash2, Play, Move, Smartphone, Tablet, Laptop, Sparkles } from 'lucide-react';

interface FrameComponentProps {
  frame: Frame;
  onPlay: (frameId: string) => void;
}

export const FrameComponent: React.FC<FrameComponentProps> = ({ frame, onPlay }) => {
  const { 
    activeFrameId, 
    setActiveFrameId, 
    updateFrame, 
    deleteFrame, 
    toolMode,
    setSelectedElement 
  } = useCanvasStore();

  const [isResizing, setIsResizing] = useState<'r' | 'b' | 'se' | null>(null);
  const [isDraggingHeader, setIsDraggingHeader] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(frame.name);

  const startResizePos = useRef({ x: 0, y: 0 });
  const startDims = useRef({ w: 0, h: 0 });

  const startDragPos = useRef({ x: 0, y: 0 });
  const startCoords = useRef({ x: 0, y: 0 });

  const isActive = activeFrameId === frame.id;

  // Title edit controls
  const saveTitle = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      updateFrame(frame.id, { name: titleInput.trim() });
    } else {
      setTitleInput(frame.name);
    }
  };

  // Frame Drag/Move Handler
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (toolMode !== 'select') return;
    e.stopPropagation();
    setActiveFrameId(frame.id);
    setIsDraggingHeader(true);

    startDragPos.current = { x: e.clientX, y: e.clientY };
    startCoords.current = { x: frame.x, y: frame.y };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const zoom = useCanvasStore.getState().zoom;
      const dx = (moveEvent.clientX - startDragPos.current.x) / zoom;
      const dy = (moveEvent.clientY - startDragPos.current.y) / zoom;

      updateFrame(frame.id, {
        x: Math.round(startCoords.current.x + dx),
        y: Math.round(startCoords.current.y + dy)
      });
    };

    const handleMouseUp = () => {
      setIsDraggingHeader(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Frame Resize Handler
  const handleResizeMouseDown = (e: React.MouseEvent, type: 'r' | 'b' | 'se') => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(type);
    
    startResizePos.current = { x: e.clientX, y: e.clientY };
    startDims.current = { w: frame.width, h: frame.height };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const zoom = useCanvasStore.getState().zoom;
      const dx = (moveEvent.clientX - startResizePos.current.x) / zoom;
      const dy = (moveEvent.clientY - startResizePos.current.y) / zoom;

      const nextWidth = type === 'b' ? startDims.current.w : Math.max(280, startDims.current.w + dx);
      const nextHeight = type === 'r' ? startDims.current.h : Math.max(300, startDims.current.h + dy);

      updateFrame(frame.id, {
        width: Math.round(nextWidth),
        height: Math.round(nextHeight)
      });
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={`absolute flex flex-col bg-white rounded-2xl shadow-xl transition-shadow ${
        isActive 
          ? 'ring-2 ring-indigo-600 ring-offset-2 z-20 shadow-indigo-100' 
          : 'border border-slate-200/80 hover:border-slate-300 z-10'
      }`}
      style={{
        left: `${frame.x}px`,
        top: `${frame.y}px`,
        width: `${frame.width}px`,
        height: `${frame.height + 40}px`, // +40px for top toolbar height
      }}
      onClick={(e) => {
        e.stopPropagation();
        setActiveFrameId(frame.id);
      }}
    >
      {/* Frame Top Header */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className={`h-10 px-3 flex items-center justify-between border-b select-none rounded-t-2xl cursor-grab active:cursor-grabbing ${
          isActive ? 'bg-slate-50 border-indigo-100' : 'bg-slate-50/50 border-slate-100'
        }`}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Move className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
              autoFocus
              className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              onDoubleClick={() => setIsEditingTitle(true)}
              className="text-xs font-semibold text-slate-700 truncate cursor-text hover:text-slate-900 px-1 py-0.5 rounded hover:bg-slate-200/50"
              title="Double click to rename"
            >
              {frame.name}
            </span>
          )}
          <span className="text-[9px] font-mono text-slate-400 shrink-0 mr-1.5">
            {frame.width} × {frame.height}
          </span>
          
          {/* Preset Width Snap Handles */}
          <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/50 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); updateFrame(frame.id, { width: 375 }); }}
              title="Snap to Mobile Width (375px)"
              className={`p-1 rounded transition-colors cursor-pointer ${frame.width === 375 ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-700'}`}
            >
              <Smartphone className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); updateFrame(frame.id, { width: 768 }); }}
              title="Snap to Tablet Width (768px)"
              className={`p-1 rounded transition-colors cursor-pointer ${frame.width === 768 ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-700'}`}
            >
              <Tablet className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); updateFrame(frame.id, { width: 1440 }); }}
              title="Snap to Desktop Width (1440px)"
              className={`p-1 rounded transition-colors cursor-pointer ${frame.width === 1440 ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-700'}`}
            >
              <Laptop className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-1.5">
          {/* Fit Height to Content Action */}
          {frame.reportedHeight && frame.reportedHeight !== frame.height && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateFrame(frame.id, { height: frame.reportedHeight });
              }}
              title={`Fit height to scrollable content (${frame.reportedHeight}px)`}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 shadow-sm cursor-pointer animate-pulse shrink-0"
            >
              <Sparkles className="w-2.5 h-2.5" />
              Fit Content
            </button>
          )}

          <button
            onClick={() => onPlay(frame.id)}
            title="Launch live interactive prototype"
            className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={() => deleteFrame(frame.id)}
            title="Delete this frame"
            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Frame Sandboxed Live Preview Body */}
      <div className="flex-1 bg-white relative overflow-hidden">
        <FramePreview 
          frameId={frame.id}
          code={frame.code}
          width={frame.width}
          height={frame.height}
        />
        
        {/* Resize Overlay Mask while dragging */}
        {(isResizing || isDraggingHeader) && (
          <div className="absolute inset-0 bg-transparent z-30" />
        )}
      </div>

      {/* Resize Drag Handles */}
      {isActive && (
        <>
          {/* Right Handle */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'r')}
            className="absolute right-[-4px] top-10 bottom-4 w-2 cursor-ew-resize hover:bg-indigo-500/20 active:bg-indigo-500/40 z-30 transition-colors"
            title="Resize Width"
          />
          {/* Bottom Handle / Drag-to-reveal Grab-bar Gripper */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'b')}
            className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 h-5 w-36 cursor-ns-resize hover:bg-slate-50/90 hover:scale-105 active:bg-slate-100/90 active:scale-100 z-30 rounded-full border border-slate-200 bg-white shadow-md flex items-center justify-center gap-1.5 group transition-all"
            title="Drag down to reveal hidden content"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-500 transition-colors" />
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors select-none">
              Reveal Content
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-500 transition-colors" />
          </div>
          {/* South East Diagonal Handle */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
            className="absolute right-[-4px] bottom-[-4px] w-4 h-4 cursor-nwse-resize hover:bg-indigo-500/30 active:bg-indigo-500/60 z-30 rounded-full border border-indigo-500 bg-white shadow-sm flex items-center justify-center"
            title="Resize Dimension"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          </div>
        </>
      )}
    </div>
  );
};
