import React, { useState, useEffect } from 'react';
import { useCanvasStore } from '../canvasStore';
import { X, Smartphone, Tablet, Monitor, RefreshCw, Layers, EyeOff, Eye, Maximize2, Minimize2 } from 'lucide-react';

interface PrototypeOverlayProps {
  frameId: string;
  onClose: () => void;
}

export const PrototypeOverlay: React.FC<PrototypeOverlayProps> = ({ frameId, onClose }) => {
  const { frames, theme } = useCanvasStore();
  const [activeId, setActiveId] = useState(frameId);
  const [viewportMode, setViewportMode] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [reloadKey, setReloadKey] = useState(0);
  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeFrame = frames.find((f) => f.id === activeId) || frames[0];

  // Sync state with HTML5 fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Handle keyboard ESC or 'H' to toggle distraction-free mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDistractionFree) {
          setIsDistractionFree(false);
          e.preventDefault();
        }
      } else if (e.key.toLowerCase() === 'h' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setIsDistractionFree((prev) => !prev);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDistractionFree]);

  if (!activeFrame) return null;

  // Render iframe source code with injected font and css variables
  const fontLink = activeFrame.code.includes(theme.fontFamily) 
    ? '' 
    : `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fontFamily)}:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">`;

  const radiusMap = {
    none: '0px',
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px'
  };

  const injectedStyles = `
    <style>
      :root {
        --primary: ${theme.primaryColor};
        --secondary: ${theme.secondaryColor};
        --bg-frame: ${theme.backgroundColor};
        --text-frame: ${theme.textColor};
        --radius-global: ${radiusMap[theme.borderRadius]};
        --font-global: '${theme.fontFamily}';
      }
      
      html, body {
        height: auto !important;
        min-height: 100% !important;
        overflow-y: auto !important;
        scroll-behavior: smooth;
        margin: 0;
        padding: 0;
        background-color: var(--bg-frame) !important;
        color: var(--text-frame) !important;
        font-family: var(--font-global), system-ui, -apple-system, sans-serif !important;
      }
      
      .bg-primary { background-color: var(--primary) !important; }
      .text-primary { color: var(--primary) !important; }
      .border-primary { border-color: var(--primary) !important; }
      .bg-secondary { background-color: var(--secondary) !important; }
      .text-secondary { color: var(--secondary) !important; }
      .rounded-global { border-radius: var(--radius-global) !important; }
      
      /* Webkit scrollbar override inside prototype */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.3);
        border-radius: 99px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(148, 163, 184, 0.5);
      }
    </style>
  `;

  const docHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      ${fontLink}
      ${injectedStyles}
    </head>
    <body>
      ${activeFrame.code}
    </body>
    </html>
  `;

  // Map viewport choices to widths and heights
  const viewportDims = {
    mobile: { width: '375px', height: '667px', label: 'Mobile (iPhone SE/8)' },
    tablet: { width: '768px', height: '1024px', label: 'Tablet (iPad Mini/Air)' },
    desktop: { width: '100%', height: '100%', label: 'Desktop Fluid' }
  };

  const selectedDim = viewportDims[viewportMode];

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col overflow-hidden transition-all duration-300">
      {/* Top Header Bar */}
      <div 
        className={`bg-slate-950 border-b border-slate-800 flex justify-between items-center px-6 shrink-0 transition-all duration-300 ${
          isDistractionFree ? 'h-0 opacity-0 pointer-events-none overflow-hidden' : 'h-14 opacity-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-white text-xs font-bold font-mono tracking-widest uppercase">PROTOTYPE MODE</span>
          <span className="text-slate-500 font-medium">/</span>
          <span className="text-slate-300 text-xs font-medium bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700/50">
            {activeFrame.name}
          </span>
        </div>

        {/* Viewport Selectors */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewportMode('mobile')}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewportMode === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Mobile View"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewportMode('tablet')}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewportMode === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Tablet View"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewportMode('desktop')}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewportMode === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Fluid Desktop View"
          >
            <Monitor className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-3">
          {/* Active Screen Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={activeId}
              onChange={(e) => setActiveId(e.target.value)}
              className="bg-transparent border-0 text-slate-300 text-xs focus:ring-0 focus:outline-none pr-6 font-medium cursor-pointer"
            >
              {frames.map((f) => (
                <option key={f.id} value={f.id} className="bg-slate-900 text-slate-300">
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setReloadKey((prev) => prev + 1)}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 bg-slate-900/50 hover:bg-slate-900 transition-colors cursor-pointer"
            title="Reload frame"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsDistractionFree(true)}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-indigo-400 bg-slate-900/50 hover:bg-slate-900 transition-colors cursor-pointer"
            title="Distraction-free Mode (Press H)"
          >
            <EyeOff className="w-4 h-4" />
          </button>

          <button
            onClick={toggleNativeFullscreen}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-emerald-400 bg-slate-900/50 hover:bg-slate-900 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Native Full Screen' : 'Enter Native Full Screen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>
      </div>

      {/* Main Interactive Sandbox Canvas */}
      <div className="flex-1 bg-slate-900 p-8 flex items-center justify-center overflow-auto relative">
        {/* Floating HUD Bubble for distraction-free exit/toggle */}
        {isDistractionFree && (
          <div className="absolute top-4 right-4 z-50 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-2xl animate-fade-in">
            <button
              onClick={() => setIsDistractionFree(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider"
              title="Exit Distraction-free mode"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Show UI (H)</span>
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors cursor-pointer"
              title="Close prototype"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div 
          className={`transition-all duration-300 shadow-2xl relative ${
            viewportMode === 'desktop' ? 'w-full h-full' : 'border-[12px] border-slate-950 rounded-[32px] bg-slate-950'
          }`}
          style={{
            width: viewportMode === 'desktop' ? '100%' : selectedDim.width,
            height: viewportMode === 'desktop' ? '100%' : selectedDim.height,
          }}
        >
          {/* Mock Speaker or Notch for Mobile/Tablet */}
          {viewportMode !== 'desktop' && (
            <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-950 rounded-b-xl z-20 flex items-center justify-center">
              <div className="w-10 h-1 bg-slate-800 rounded-full" />
            </div>
          )}

          <iframe
            key={`${activeId}-${reloadKey}`}
            srcDoc={docHtml}
            className={`w-full h-full bg-white transition-opacity duration-300 ${
              viewportMode === 'desktop' ? 'rounded-none' : 'rounded-[20px]'
            }`}
            title="Interactive Live Prototype"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>

      {/* Status Footer */}
      <div 
        className={`bg-slate-950 border-t border-slate-900 flex items-center justify-between px-6 text-[10px] text-slate-500 font-mono transition-all duration-300 ${
          isDistractionFree ? 'h-0 opacity-0 pointer-events-none overflow-hidden' : 'h-8 opacity-100'
        }`}
      >
        <div>Viewport: {selectedDim.label}</div>
        <div>All links, scrollbars, and micro-interactions enabled</div>
        <div>Theme variables active: {theme.primaryColor} • {theme.fontFamily}</div>
      </div>
    </div>
  );
};
