import React from 'react';
import { useCanvasStore } from '../canvasStore';
import { X, Keyboard, ArrowUp, Command } from 'lucide-react';

export const ShortcutModal: React.FC = () => {
  const { showShortcuts, setShowShortcuts } = useCanvasStore();

  if (!showShortcuts) return null;

  const shortcuts = [
    { desc: 'Select Mode', keys: ['V'] },
    { desc: 'Pan Mode', keys: ['H'] },
    { desc: 'Zoom Mode', keys: ['Z'] },
    { desc: 'Hold to Pan', keys: ['Spacebar'] },
    { desc: 'Cycle Frames (Focus)', keys: ['⌘', '← / →'] },
    { desc: 'Duplicate Screen', keys: ['⌘', 'D'] },
    { desc: 'Undo Last Action', keys: ['⌘', 'Z'] },
    { desc: 'Redo Last Action', keys: ['⌘', 'Shift', 'Z'] },
    { desc: 'Toggle Shortcut Guide', keys: ['?'] },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Keyboard className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Keyboard Shortcuts</h3>
          </div>
          <button 
            onClick={() => setShowShortcuts(false)}
            className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500 mb-2">
            Boost your productivity inside Stitch by using these interactive keys:
          </p>
          <div className="space-y-3">
            {shortcuts.map((shortcut, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm font-medium text-slate-700">{shortcut.desc}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((k, kidx) => (
                    <React.Fragment key={kidx}>
                      {kidx > 0 && <span className="text-xs text-slate-400">+</span>}
                      <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded-md shadow-sm">
                        {k}
                      </kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={() => setShowShortcuts(false)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-sm transition-colors"
          >
            Got it, thanks
          </button>
        </div>
      </div>
    </div>
  );
};
