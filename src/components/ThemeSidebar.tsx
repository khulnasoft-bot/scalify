import React from 'react';
import { useCanvasStore } from '../canvasStore';
import { Sliders, Palette, Check, Undo2, Redo2, Maximize, RotateCcw } from 'lucide-react';
import { ThemeConfig } from '../types';

export const ThemeSidebar: React.FC = () => {
  const { 
    theme, 
    setTheme, 
    undo, 
    redo, 
    historyIndex, 
    history,
    frames,
    updateFrame
  } = useCanvasStore();

  const palettes = [
    {
      name: 'Swiss Modern',
      config: {
        primaryColor: '#e11d48', // rose-600
        secondaryColor: '#18181b', // zinc-900
        backgroundColor: '#ffffff',
        textColor: '#18181b',
        borderRadius: 'none' as const,
        fontFamily: 'Space Grotesk'
      }
    },
    {
      name: 'Ocean Breeze',
      config: {
        primaryColor: '#0284c7', // sky-600
        secondaryColor: '#0d9488', // teal-600
        backgroundColor: '#f8fafc',
        textColor: '#0f172a',
        borderRadius: 'lg' as const,
        fontFamily: 'Outfit'
      }
    },
    {
      name: 'Nordic Crisp',
      config: {
        primaryColor: '#4f46e5', // indigo-600
        secondaryColor: '#06b6d4', // cyan-500
        backgroundColor: '#fafafa',
        textColor: '#171717',
        borderRadius: 'md' as const,
        fontFamily: 'Inter'
      }
    },
    {
      name: 'Midnight Cyber',
      config: {
        primaryColor: '#d946ef', // fuchsia-500
        secondaryColor: '#10b981', // emerald-500
        backgroundColor: '#09090b',
        textColor: '#fafafa',
        borderRadius: 'xl' as const,
        fontFamily: 'Space Grotesk'
      }
    },
    {
      name: 'Warm Editorial',
      config: {
        primaryColor: '#b45309', // amber-700
        secondaryColor: '#451a03', // amber-950
        backgroundColor: '#fdfdfc',
        textColor: '#291805',
        borderRadius: 'sm' as const,
        fontFamily: 'Playfair Display'
      }
    }
  ];

  const fontOptions = [
    'Inter',
    'Space Grotesk',
    'Outfit',
    'Playfair Display',
    'JetBrains Mono',
    'Plus Jakarta Sans'
  ];

  const radiusOptions: { label: string; value: ThemeConfig['borderRadius'] }[] = [
    { label: 'None', value: 'none' },
    { label: 'XS', value: 'xs' },
    { label: 'SM', value: 'sm' },
    { label: 'MD', value: 'md' },
    { label: 'LG', value: 'lg' },
    { label: 'XL', value: 'xl' },
    { label: 'Full', value: 'full' },
  ];

  const handlePaletteSelect = (paletteConfig: ThemeConfig) => {
    setTheme(paletteConfig);
  };

  const handleReset = () => {
    setTheme({
      primaryColor: '#3b82f6',
      secondaryColor: '#10b981',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      borderRadius: 'md',
      fontFamily: 'Inter',
    });
  };

  return (
    <div className="w-80 border-r border-slate-100 bg-white flex flex-col h-full shrink-0 z-10 shadow-sm">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-600" />
          <h2 className="font-semibold text-slate-800 text-sm">Theme Design System</h2>
        </div>
        <button 
          onClick={handleReset}
          title="Reset theme"
          className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Undo / Redo Row */}
      <div className="px-4 py-2 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">History</span>
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={historyIndex === 0}
            className={`p-1.5 rounded-md transition-colors ${
              historyIndex === 0 
                ? 'text-slate-300 cursor-not-allowed' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className={`p-1.5 rounded-md transition-colors ${
              historyIndex >= history.length - 1 
                ? 'text-slate-300 cursor-not-allowed' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400 font-medium px-1">
            {historyIndex + 1}/{history.length}
          </span>
        </div>
      </div>

      {/* Panel Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Presets Grid */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Preconfigured Palettes</h3>
          <div className="space-y-2">
            {palettes.map((p, idx) => {
              const isSelected = 
                theme.primaryColor.toLowerCase() === p.config.primaryColor.toLowerCase() &&
                theme.fontFamily === p.config.fontFamily;
              return (
                <button
                  key={idx}
                  onClick={() => handlePaletteSelect(p.config)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all hover:shadow-sm ${
                    isSelected ? 'border-indigo-600 bg-indigo-50/20 shadow-sm' : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.config.fontFamily}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Visual Color Previews */}
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: p.config.primaryColor }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: p.config.secondaryColor }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: p.config.backgroundColor }} />
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 ml-1 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Core Overrides */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom Style Rules</h3>
          
          {/* Colors Selection */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Primary Accents (`bg-primary`)</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={theme.primaryColor} 
                  onChange={(e) => setTheme({ primaryColor: e.target.value })}
                  className="w-10 h-8 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
                />
                <input 
                  type="text" 
                  value={theme.primaryColor} 
                  onChange={(e) => setTheme({ primaryColor: e.target.value })}
                  className="flex-1 px-3 py-1 text-xs font-mono border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Secondary Elements (`bg-secondary`)</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={theme.secondaryColor} 
                  onChange={(e) => setTheme({ secondaryColor: e.target.value })}
                  className="w-10 h-8 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
                />
                <input 
                  type="text" 
                  value={theme.secondaryColor} 
                  onChange={(e) => setTheme({ secondaryColor: e.target.value })}
                  className="flex-1 px-3 py-1 text-xs font-mono border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Canvas Background</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={theme.backgroundColor} 
                  onChange={(e) => setTheme({ backgroundColor: e.target.value })}
                  className="w-10 h-8 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
                />
                <input 
                  type="text" 
                  value={theme.backgroundColor} 
                  onChange={(e) => setTheme({ backgroundColor: e.target.value })}
                  className="flex-1 px-3 py-1 text-xs font-mono border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Base Text Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={theme.textColor} 
                  onChange={(e) => setTheme({ textColor: e.target.value })}
                  className="w-10 h-8 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
                />
                <input 
                  type="text" 
                  value={theme.textColor} 
                  onChange={(e) => setTheme({ textColor: e.target.value })}
                  className="flex-1 px-3 py-1 text-xs font-mono border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Border Radius Slider */}
          <div className="pt-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-600">Corner Radius (`rounded-global`)</label>
              <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono">
                {theme.borderRadius}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={6}
              value={(() => {
                switch (theme.borderRadius) {
                  case 'none': return 0;
                  case 'xs': return 1;
                  case 'sm': return 2;
                  case 'md': return 3;
                  case 'lg': return 4;
                  case 'xl': return 5;
                  case 'full': return 6;
                  default: return 3;
                }
              })()}
              onChange={(e) => {
                const val = Number(e.target.value);
                const map: ThemeConfig['borderRadius'][] = ['none', 'xs', 'sm', 'md', 'lg', 'xl', 'full'];
                setTheme({ borderRadius: map[val] });
              }}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-medium px-1 mt-1 font-mono">
              <span>0px (None)</span>
              <span>2px</span>
              <span>4px</span>
              <span>8px (MD)</span>
              <span>12px</span>
              <span>16px</span>
              <span>Full</span>
            </div>
          </div>

          {/* Font Family Selection */}
          <div className="pt-2">
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Global Typography Pairing</label>
            <select
              value={theme.fontFamily}
              onChange={(e) => setTheme({ fontFamily: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium text-slate-700"
            >
              {fontOptions.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Google Font is dynamically loaded and paired into previews.
            </p>
          </div>
        </div>

        {/* Layout Helper */}
        <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-50 text-[11px] text-indigo-700/80 leading-relaxed">
          <strong className="text-indigo-800 block mb-0.5">💡 CSS variables mapping</strong>
          Utility elements in generated previews styled with <code className="bg-white px-1 py-0.5 rounded border border-indigo-100 font-mono">bg-primary</code>, <code className="bg-white px-1 py-0.5 rounded border border-indigo-100 font-mono">text-primary</code>, or <code className="bg-white px-1 py-0.5 rounded border border-indigo-100 font-mono">rounded-global</code> react instantly to these overrides.
        </div>
      </div>
    </div>
  );
};
