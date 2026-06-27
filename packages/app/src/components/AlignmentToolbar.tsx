import React from 'react';
import { useCanvasStore } from '../canvasStore';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  ArrowUpDown, 
  ArrowRightLeft, 
  Layers, 
  ChevronUp, 
  ChevronDown,
  LayoutGrid
} from 'lucide-react';

interface AlignmentToolbarProps {
  onActionComplete?: () => void;
}

export const AlignmentToolbar: React.FC<AlignmentToolbarProps> = ({ onActionComplete }) => {
  const { 
    selectedElements, 
    setSelectedElements, 
    setSelectedElement,
    frames, 
    updateFrame, 
    saveToHistory 
  } = useCanvasStore();

  if (selectedElements.length === 0) return null;

  const firstFrameId = selectedElements[0].frameId;
  const frame = frames.find((f) => f.id === firstFrameId);
  if (!frame) return null;

  // Verify all selected components are in the same frame
  const isValidSelection = selectedElements.every(el => el.frameId === firstFrameId);
  if (!isValidSelection) return null;

  const selectedElementIds = selectedElements.map(el => el.elementId);

  // Layout mutator functions running purely in local DOM
  const performLayoutAction = (
    frameCode: string,
    action: string
  ): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(frameCode, 'text/html');

    // Find target nodes
    const elements = selectedElementIds
      .map(id => doc.querySelector(`[data-stitch-id="${id}"]`))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return frameCode;

    if (action === 'stack-v' || action === 'stack-h') {
      const firstEl = elements[0];
      const parent = firstEl.parentElement;
      if (parent) {
        // Create auto-layout flex wrapper
        const wrapper = doc.createElement('div');
        const randomId = 'group_' + Math.random().toString(36).substr(2, 9);
        wrapper.setAttribute('data-stitch-id', randomId);
        
        if (action === 'stack-v') {
          wrapper.className = 'flex flex-col gap-3 w-full p-2';
        } else {
          wrapper.className = 'flex flex-row items-center justify-start gap-3 w-full flex-wrap p-2';
        }

        // Insert wrapper before first elements, move all selected elements inside
        parent.insertBefore(wrapper, firstEl);
        elements.forEach(el => {
          // Clear absolute layout coordinate classes to support flexible stacking
          el.className = el.className
            .replace(/\b(absolute|relative|top-\d+|left-\d+|right-\d+|bottom-\d+)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          wrapper.appendChild(el);
        });
      }
    } else if (action.startsWith('align-')) {
      elements.forEach(el => {
        let classes = el.className || '';
        
        // Horizontal Alignments (useful inside flex-col containers)
        if (action === 'align-left') {
          classes = classes.replace(/\b(self-center|self-end|self-stretch)\b/g, '').trim();
          classes += ' self-start';
        } else if (action === 'align-center') {
          classes = classes.replace(/\b(self-start|self-end|self-stretch)\b/g, '').trim();
          classes += ' self-center';
        } else if (action === 'align-right') {
          classes = classes.replace(/\b(self-start|self-center|self-stretch)\b/g, '').trim();
          classes += ' self-end';
        } 
        // Vertical Alignments (useful inside flex-row containers)
        else if (action === 'align-top') {
          classes = classes.replace(/\b(self-center|self-end|self-stretch)\b/g, '').trim();
          classes += ' self-start';
        } else if (action === 'align-middle') {
          classes = classes.replace(/\b(self-start|self-end|self-stretch)\b/g, '').trim();
          classes += ' self-center';
        } else if (action === 'align-bottom') {
          classes = classes.replace(/\b(self-start|self-center|self-stretch)\b/g, '').trim();
          classes += ' self-end';
        }

        el.className = classes.replace(/\s+/g, ' ').trim();
      });
    } else if (action === 'distribute-h' || action === 'distribute-v') {
      const parents = elements.map(el => el.parentElement).filter((p): p is HTMLElement => p !== null);
      const allSameParent = parents.every(p => p === parents[0]);
      if (allSameParent && parents.length > 0) {
        const parent = parents[0];
        let pClasses = parent.className || '';
        
        if (!pClasses.includes('flex')) {
          pClasses += ' flex';
        }
        
        if (action === 'distribute-h') {
          if (!pClasses.includes('flex-col')) {
            if (!pClasses.includes('flex-row')) pClasses += ' flex-row';
          }
          pClasses = pClasses.replace(/\b(justify-start|justify-center|justify-end|justify-around|justify-evenly)\b/g, '').trim();
          pClasses += ' justify-between';
        } else {
          if (!pClasses.includes('flex-row')) {
            if (!pClasses.includes('flex-col')) pClasses += ' flex-col';
          }
          pClasses = pClasses.replace(/\b(justify-start|justify-center|justify-end|justify-around|justify-evenly)\b/g, '').trim();
          pClasses += ' justify-between';
        }
        
        parent.className = pClasses.replace(/\s+/g, ' ').trim();
      }
    }

    return doc.body.innerHTML;
  };

  const handleActionClick = (actionType: string) => {
    saveToHistory();
    const nextCode = performLayoutAction(frame.code, actionType);
    updateFrame(frame.id, { code: nextCode });
    if (onActionComplete) onActionComplete();

    // Small delay to let DOM re-render inside iframe, then clear elements selection to prompt refresh
    setTimeout(() => {
      setSelectedElements([]);
      setSelectedElement(null);
    }, 150);
  };

  // Calculate coordinates to float right above the active selected bounds
  const getFloatingToolbarStyle = () => {
    let minTop = Infinity;
    let minLeft = Infinity;
    let maxBottom = -Infinity;
    let maxRight = -Infinity;

    selectedElements.forEach(elem => {
      minTop = Math.min(minTop, elem.rect.top);
      minLeft = Math.min(minLeft, elem.rect.left);
      maxBottom = Math.max(maxBottom, elem.rect.top + elem.rect.height);
      maxRight = Math.max(maxRight, elem.rect.left + elem.rect.width);
    });

    const leftPos = frame.x + minLeft + (maxRight - minLeft) / 2;
    const topPos = frame.y + 40 + minTop - 64; // float 64px above the bounding box

    return {
      left: `${leftPos}px`,
      top: `${Math.max(10, topPos)}px`,
      transform: 'translateX(-50%)',
    };
  };

  const isMultiSelect = selectedElements.length > 1;

  return (
    <div 
      className="absolute bg-slate-900/95 backdrop-blur-md text-white border border-slate-800 rounded-2xl shadow-2xl p-1.5 flex items-center gap-1 z-40 select-none animate-in fade-in zoom-in duration-150"
      style={getFloatingToolbarStyle()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5 px-2 text-[10px] text-slate-400 border-r border-slate-800 font-bold tracking-wide uppercase shrink-0">
        Layout ({selectedElements.length})
      </div>

      {/* Alignment Actions Section */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => handleActionClick('align-left')}
          className="p-1.5 hover:bg-slate-800 hover:text-indigo-400 active:scale-95 transition-all rounded-lg cursor-pointer shrink-0"
          title="Align Left (self-start)"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleActionClick('align-center')}
          className="p-1.5 hover:bg-slate-800 hover:text-indigo-400 active:scale-95 transition-all rounded-lg cursor-pointer shrink-0"
          title="Align Horizontal Center (self-center)"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleActionClick('align-right')}
          className="p-1.5 hover:bg-slate-800 hover:text-indigo-400 active:scale-95 transition-all rounded-lg cursor-pointer shrink-0"
          title="Align Right (self-end)"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        
        <div className="w-px h-5 bg-slate-800 mx-0.5 shrink-0" />

        <button
          onClick={() => handleActionClick('align-top')}
          className="p-1.5 hover:bg-slate-800 hover:text-indigo-400 active:scale-95 transition-all rounded-lg cursor-pointer shrink-0"
          title="Align Top"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleActionClick('align-middle')}
          className="p-1.5 hover:bg-slate-800 hover:text-indigo-400 active:scale-95 transition-all rounded-lg cursor-pointer shrink-0"
          title="Align Vertical Middle"
        >
          <AlignJustify className="w-4 h-4 rotate-90" />
        </button>
        <button
          onClick={() => handleActionClick('align-bottom')}
          className="p-1.5 hover:bg-slate-800 hover:text-indigo-400 active:scale-95 transition-all rounded-lg cursor-pointer shrink-0"
          title="Align Bottom"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-slate-800 mx-0.5 shrink-0" />

      {/* Distribute Space Actions */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => handleActionClick('distribute-h')}
          disabled={!isMultiSelect}
          className={`p-1.5 rounded-lg shrink-0 ${
            !isMultiSelect 
              ? 'opacity-30 cursor-not-allowed pointer-events-none' 
              : 'hover:bg-slate-800 hover:text-indigo-400 active:scale-95 transition-all cursor-pointer'
          }`}
          title={isMultiSelect ? "Distribute Space Horizontally (justify-between)" : "Distribute Horizontally (requires 2+ selected items)"}
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleActionClick('distribute-v')}
          disabled={!isMultiSelect}
          className={`p-1.5 rounded-lg shrink-0 ${
            !isMultiSelect 
              ? 'opacity-30 cursor-not-allowed pointer-events-none' 
              : 'hover:bg-slate-800 hover:text-indigo-400 active:scale-95 transition-all cursor-pointer'
          }`}
          title={isMultiSelect ? "Distribute Space Vertically (justify-between)" : "Distribute Vertically (requires 2+ selected items)"}
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-slate-800 mx-0.5 shrink-0" />

      {/* Auto-Layout Group & Stack */}
      <div className="flex items-center gap-0.5 pr-1">
        <button
          onClick={() => handleActionClick('stack-v')}
          disabled={!isMultiSelect}
          className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-bold shrink-0 ${
            !isMultiSelect 
              ? 'opacity-30 cursor-not-allowed pointer-events-none text-slate-500' 
              : 'hover:bg-indigo-600 hover:text-white text-slate-300 active:scale-95 transition-all cursor-pointer'
          }`}
          title={isMultiSelect ? "Stack selected elements Vertically inside Flex-Col container" : "Stack Vertically (requires 2+ selected items)"}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Stack Y</span>
        </button>
        <button
          onClick={() => handleActionClick('stack-h')}
          disabled={!isMultiSelect}
          className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-bold shrink-0 ${
            !isMultiSelect 
              ? 'opacity-30 cursor-not-allowed pointer-events-none text-slate-500' 
              : 'hover:bg-indigo-600 hover:text-white text-slate-300 active:scale-95 transition-all cursor-pointer'
          }`}
          title={isMultiSelect ? "Stack selected elements Horizontally inside Flex-Row container" : "Stack Horizontally (requires 2+ selected items)"}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Stack X</span>
        </button>
      </div>
    </div>
  );
};
