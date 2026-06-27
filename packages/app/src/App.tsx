import React, { useState } from 'react';
import { Canvas } from './components/Canvas';
import { ThemeSidebar } from './components/ThemeSidebar';
import { PromptConsole } from './components/PromptConsole';
import { ShortcutModal } from './components/ShortcutModal';
import { PrototypeOverlay } from './components/PrototypeOverlay';
import { ExportMenu } from './components/ExportMenu';
import { Sparkles, Play, Code, HelpCircle } from 'lucide-react';

export default function App() {
  const [activePrototypeId, setActivePrototypeId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden text-slate-800">
      {/* Top Main Navigation Header */}
      <header className="h-14 bg-white border-b border-slate-100 px-6 flex items-center justify-between shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <span className="font-extrabold font-mono text-base tracking-tighter">S.</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-sm tracking-tight text-slate-900">Stitch AI</h1>
              <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-indigo-100">
                v1.0 BETA
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">AI-First Infinite Canvas Visual Editor</p>
          </div>
        </div>

        {/* Global Toolbar Menu */}
        <div className="flex items-center gap-3">
          {/* Export Code menu */}
          <ExportMenu />
        </div>
      </header>

      {/* Main Designer Space */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Dynamic Theme Design Overrides */}
        <ThemeSidebar />

        {/* Center Sandbox: Interactive Infinite Zoom & Panned Canvas */}
        <Canvas onPlay={(frameId) => setActivePrototypeId(frameId)} />
      </div>

      {/* Bottom Dock Prompt Input Cockpit */}
      <PromptConsole />

      {/* Full-screen keyboard shortcuts Modal Sheet */}
      <ShortcutModal />

      {/* Full-screen Presentation Prototype Viewport */}
      {activePrototypeId && (
        <PrototypeOverlay 
          frameId={activePrototypeId}
          onClose={() => setActivePrototypeId(null)}
        />
      )}
    </div>
  );
}
