import React, { useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '../canvasStore';
import { 
  Sparkles, 
  Settings, 
  HelpCircle, 
  Layers, 
  Compass, 
  Minimize2, 
  Maximize2, 
  Loader2, 
  X, 
  Edit3,
  Sliders,
  FlameKindling,
  MessageSquare,
  Send,
  CornerDownLeft,
  Code,
  Copy,
  Check
} from 'lucide-react';

export const PromptConsole: React.FC = () => {
  const {
    frames,
    addFrame,
    updateFrame,
    isGenerating,
    setIsGenerating,
    selectedElement,
    setSelectedElement,
    creativeRange,
    setCreativeRange,
    engineType,
    setEngineType,
    redesignPreset,
    setRedesignPreset,
    setShowShortcuts,
    theme,
    chatMessages,
    addChatMessage
  } = useCanvasStore();

  const [prompt, setPrompt] = useState('');
  const [showFormulaAssistant, setShowFormulaAssistant] = useState(false);
  const [variationsCount, setVariationsCount] = useState<number>(1);
  const [generatingMessage, setGeneratingMessage] = useState('');
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current && isChatExpanded) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatExpanded]);

  const handleAddSelectedToChat = () => {
    if (!selectedElement) return;
    const targetFrame = frames.find(f => f.id === selectedElement.frameId);
    addChatMessage({
      id: `add_${Date.now()}`,
      sender: 'user',
      text: `📎 Extracted selected <${selectedElement.tagName.toLowerCase()}> code block to modify...`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      codeContext: {
        elementId: selectedElement.elementId,
        tagName: selectedElement.tagName,
        html: selectedElement.html,
        frameId: selectedElement.frameId,
        frameName: targetFrame?.name || 'Frame'
      }
    });
    setPrompt(`Rewrite this component to: `);
  };

  // Formula Assistant States
  const [formulaIdea, setFormulaIdea] = useState('');
  const [formulaTheme, setFormulaTheme] = useState('');
  const [formulaContent, setFormulaContent] = useState('');
  const [formulaImage, setFormulaImage] = useState('');

  // Fun reassurance loading messages
  const loadingMessages = [
    'Synthesizing structural semantics...',
    'Injecting Tailwind atomic utilities...',
    'Refining viewport responsiveness...',
    'Calibrating interactive visual metrics...',
    'Harmonizing typography pairing rules...',
    'Structuring custom dataset grids...',
  ];

  const cycleMessages = (interval: NodeJS.Timeout) => {
    let index = 0;
    setGeneratingMessage(loadingMessages[0]);
    return setInterval(() => {
      index = (index + 1) % loadingMessages.length;
      setGeneratingMessage(loadingMessages[index]);
    }, 2800);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !formulaIdea.trim() && !selectedElement) return;

    setIsGenerating(true);
    const msgInterval = cycleMessages(undefined as any);

    // Assemble the prompt based on Formula Assistant inputs if active
    let finalPrompt = prompt;
    if (showFormulaAssistant && formulaIdea.trim()) {
      finalPrompt = `
[IDEA]: ${formulaIdea}
[THEME]: ${formulaTheme || 'Swiss clean design system matching dynamic styles'}
[CONTENT]: ${formulaContent || 'Realistic SaaS product dummy content'}
[IMAGE]: ${formulaImage || 'Modern SVG geometric placeholders or unsplash URLs'}
      `.trim();
    }

    // Add user prompt message to chat log
    addChatMessage({
      id: `msg_${Date.now()}_user`,
      sender: 'user',
      text: finalPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      codeContext: selectedElement ? {
        elementId: selectedElement.elementId,
        tagName: selectedElement.tagName,
        html: selectedElement.html,
        frameId: selectedElement.frameId,
        frameName: frames.find(f => f.id === selectedElement.frameId)?.name || 'Frame'
      } : undefined
    });

    try {
      if (selectedElement) {
        // --- Click-to-Edit: Target localized element modification ---
        const targetFrame = frames.find(f => f.id === selectedElement.frameId);
        if (!targetFrame) throw new Error('Target frame not found');

        const response = await fetch('/api/edit-element', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullHtml: targetFrame.code,
            elementId: selectedElement.elementId,
            elementHtml: selectedElement.html,
            instruction: finalPrompt,
            theme,
            temperature: (creativeRange * 0.1)
          })
        });

        const data = await response.json();
        if (data.success && data.updatedHtml) {
          updateFrame(targetFrame.id, {
            code: data.updatedHtml
          });
          
          addChatMessage({
            id: `msg_${Date.now()}_ai`,
            sender: 'assistant',
            text: `Successfully updated the selected <${selectedElement.tagName.toLowerCase()}> element inside "${targetFrame.name}" according to your request. Let me know what you want to refine next!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });

          setSelectedElement(null);
          setPrompt('');
        } else {
          addChatMessage({
            id: `msg_${Date.now()}_ai_err`,
            sender: 'system',
            text: `Element editing failed: ${data.error || 'Server error'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          alert('Element editing failed: ' + (data.error || 'Server error'));
        }
      } else {
        // --- Fresh Generation (Optional multiple side-by-side variations) ---
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: finalPrompt,
            variationsCount,
            engineType,
            redesignPreset: engineType === 'redesign' ? redesignPreset : undefined,
            theme,
            temperature: (creativeRange * 0.1)
          })
        });

        const data = await response.json();
        if (data.success && data.variants && data.variants.length > 0) {
          // Spawn generated frames side-by-side
          data.variants.forEach((variant: { html: string; name: string }, index: number) => {
            const spacing = 410; // offset each spawned card side-by-side
            const offsetIdx = frames.length + index;
            const newFrame = {
              id: `f_${Date.now()}_${index}`,
              name: variant.name || `Stitch Design V${offsetIdx + 1}`,
              x: 100 + (offsetIdx % 3) * spacing,
              y: 100 + Math.floor(offsetIdx / 3) * 650,
              width: 375, // Default responsive mobile card layout
              height: 600,
              code: variant.html,
              prompt: finalPrompt
            };
            addFrame(newFrame);
          });
          
          addChatMessage({
            id: `msg_${Date.now()}_ai`,
            sender: 'assistant',
            text: `Stitched together ${data.variants.length} brand-new visual design option(s) on your infinite layout canvas: ${data.variants.map((v: any) => `"${v.name}"`).join(', ')}. Select any part of the design to make micro-adjustments!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });

          setPrompt('');
          // Reset formula inputs
          setFormulaIdea('');
          setFormulaTheme('');
          setFormulaContent('');
          setFormulaImage('');
          setShowFormulaAssistant(false);
        } else {
          addChatMessage({
            id: `msg_${Date.now()}_ai_err`,
            sender: 'system',
            text: `Layout generation failed: ${data.error || 'Server error'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          alert('Generation failed: ' + (data.error || 'Server error'));
        }
      }
    } catch (err: any) {
      console.error(err);
      addChatMessage({
        id: `msg_${Date.now()}_ai_err`,
        sender: 'system',
        text: `Network request error: ${err.message || 'Check connection.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      alert('Network request failed. Ensure backend server is booted.');
    } finally {
      clearInterval(msgInterval);
      setIsGenerating(false);
    }
  };

  return (
    <div className="border-t border-slate-100 bg-white/95 backdrop-blur-md p-4 shrink-0 shadow-lg z-20">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Click-to-Edit indicator with "Add to Chat" extract controls */}
        {selectedElement && (
          <div className="flex flex-col gap-2 p-3 bg-indigo-50/50 border border-indigo-100/60 rounded-2xl text-xs text-indigo-900 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600 animate-pulse" />
                <span>
                  Editing targeted node <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-100">&lt;{selectedElement.tagName.toLowerCase()}&gt;</strong> inside <strong>{frames.find(f => f.id === selectedElement.frameId)?.name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddSelectedToChat}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                  title="Extract selected code and pass to Chat loop context"
                >
                  <MessageSquare className="w-3 h-3" />
                  Add to Chat
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedElement(null)}
                  className="p-1 rounded hover:bg-indigo-100 text-indigo-600 font-semibold"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            {/* HTML extracted code block preview */}
            <div className="bg-slate-900 rounded-lg p-2.5 text-[10px] font-mono text-indigo-200 overflow-x-auto max-h-24 shadow-inner border border-slate-800">
              <pre>{selectedElement.html}</pre>
            </div>
          </div>
        )}

        {/* Collapsible Chat Feed */}
        <div className="border border-slate-100/80 rounded-2xl bg-slate-50/50 overflow-hidden shadow-sm flex flex-col transition-all duration-300">
          <div className="flex justify-between items-center px-4 py-2 bg-slate-100/70 border-b border-slate-200/50 text-[11px]">
            <div className="flex items-center gap-2 font-bold text-slate-700 uppercase tracking-wider">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>Stitch Conversation Log ({chatMessages.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsChatExpanded(!isChatExpanded)}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold px-2 py-0.5 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              {isChatExpanded ? 'Hide History ▲' : 'Show History ▼'}
            </button>
          </div>

          {isChatExpanded && (
            <div className="p-3 max-h-44 overflow-y-auto space-y-2.5 bg-white flex flex-col" style={{ minHeight: '60px' }}>
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'ml-auto items-end' : 'items-start'
                  }`}
                >
                  <div 
                    className={`p-2.5 rounded-2xl text-[11px] leading-relaxed shadow-sm ${
                      msg.sender === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : msg.sender === 'system'
                          ? 'bg-rose-50 border border-rose-100 text-rose-700 rounded-bl-none'
                          : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    <div className="font-bold text-[8px] uppercase tracking-wider mb-0.5 opacity-60">
                      {msg.sender === 'user' ? 'Liz (User)' : msg.sender === 'system' ? 'System Notification' : 'Stitch Copilot'}
                    </div>
                    <div>{msg.text}</div>
                    
                    {/* Render extracted code snippet if it was added as context */}
                    {msg.codeContext && (
                      <div className="mt-1.5 p-2 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-mono text-indigo-300 max-h-20 overflow-y-auto">
                        <div className="font-sans text-[8px] text-slate-500 font-bold mb-1 flex justify-between items-center">
                          <span>Context: &lt;{msg.codeContext.tagName.toLowerCase()}&gt; from "{msg.codeContext.frameName}"</span>
                          <span className="text-[7px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded">HTML Block</span>
                        </div>
                        <pre>{msg.codeContext.html}</pre>
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] text-slate-400 mt-0.5 font-medium px-1">
                    {msg.timestamp}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Form dock */}
        <form onSubmit={handleGenerate} className="flex gap-2">
          {/* Main prompt input */}
          <div className="flex-1 relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 shadow-inner">
            <Sparkles className="w-4 h-4 text-indigo-600 mr-2" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                selectedElement 
                  ? "Instruct AI to rewrite this targeted node... (e.g., 'Turn this into a modern dark purple pricing pill button')" 
                  : "Type layout idea... (e.g., 'A modern SaaS newsletter signup box with stats')"
              }
              className="w-full bg-transparent border-0 text-slate-800 text-xs focus:ring-0 focus:outline-none placeholder-slate-400 font-medium py-1"
              disabled={isGenerating || showFormulaAssistant}
            />
            
            {/* Toggle Formula Assistant expander button */}
            {!selectedElement && (
              <button
                type="button"
                onClick={() => setShowFormulaAssistant(!showFormulaAssistant)}
                className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${
                  showFormulaAssistant 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                Formula Builder
              </button>
            )}
          </div>

          {/* Settings/Engines dock */}
          <div className="flex items-center gap-1.5">
            {/* Variations dropdown (only for fresh creation) */}
            {!selectedElement && (
              <select
                value={variationsCount}
                onChange={(e) => setVariationsCount(Number(e.target.value))}
                className="px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-600 focus:outline-none"
                title="Number of variations side-by-side"
              >
                <option value={1}>1 Var</option>
                <option value={2}>2 Vars</option>
                <option value={3}>3 Vars</option>
                <option value={4}>4 Vars</option>
              </select>
            )}

            {/* Generate Action Button */}
            <button
              type="submit"
              disabled={isGenerating || (!prompt.trim() && !formulaIdea.trim() && !selectedElement)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {selectedElement ? 'Rewrite Node' : 'Stitch Interface'}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Formula Assistant Expander Drawer */}
        {showFormulaAssistant && !selectedElement && (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-2 gap-3 shadow-inner animate-in slide-in-from-bottom duration-300">
            <div className="col-span-2 flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" />
                Prompt Formula Parser Formula [IDEA] + [THEME] + [CONTENT] + [IMAGE]
              </span>
              <button 
                type="button" 
                onClick={() => setShowFormulaAssistant(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">1. Structural Layout Idea ([IDEA])</label>
              <textarea
                value={formulaIdea}
                onChange={(e) => setFormulaIdea(e.target.value)}
                placeholder="e.g. A gorgeous full responsive hero pricing grid layout"
                className="w-full h-16 p-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">2. Aesthetics & Design System ([THEME])</label>
              <textarea
                value={formulaTheme}
                onChange={(e) => setFormulaTheme(e.target.value)}
                placeholder="e.g. Soft pastel background, rounded border cards, elegant tracking-tight display headers"
                className="w-full h-16 p-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">3. Copywriting & Mock Data ([CONTENT])</label>
              <textarea
                value={formulaContent}
                onChange={(e) => setFormulaContent(e.target.value)}
                placeholder="e.g. Product names: Basic, Premium, Agency. Standard Pricing features checklist."
                className="w-full h-16 p-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">4. Image / Asset Direction ([IMAGE])</label>
              <textarea
                value={formulaImage}
                onChange={(e) => setFormulaImage(e.target.value)}
                placeholder="e.g. Modern isometric linear SVG icon illustration, unsplash avatars for clients"
                className="w-full h-16 p-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Console Footbar: Model Switching & Creativity Tuning */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-50 pt-3">
          
          {/* Engines and presets Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <FlameKindling className="w-3.5 h-3.5 text-orange-500" />
              <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider">Engine:</span>
              <select
                value={engineType}
                onChange={(e) => setEngineType(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600 font-semibold focus:outline-none"
              >
                <option value="fast">⚡ Fast Engine (Flash)</option>
                <option value="reasoning">🧠 Reasoning Engine (Pro)</option>
                <option value="redesign">🎨 Style Redesign Engine</option>
              </select>
            </div>

            {engineType === 'redesign' && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400">Preset:</span>
                <select
                  value={redesignPreset}
                  onChange={(e) => setRedesignPreset(e.target.value as any)}
                  className="bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-0.5 text-xs text-indigo-700 font-bold focus:outline-none"
                >
                  <option value="standard">Swiss Minimal</option>
                  <option value="bento">Bento Grid Layout</option>
                  <option value="neubrutalism">Neo-Brutalism</option>
                  <option value="glassmorphism">Glassmorphism Overlay</option>
                  <option value="minimalist">Ultra Clean Slate</option>
                  <option value="claymorphism">Claymorphism 3D</option>
                </select>
              </div>
            )}
          </div>

          {/* Creative Slider */}
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider">Creative Range:</span>
            <input 
              type="range" 
              min={1} 
              max={10} 
              value={creativeRange}
              onChange={(e) => setCreativeRange(Number(e.target.value))}
              className="w-24 accent-indigo-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              title="Drag to change temperature"
            />
            <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {(creativeRange * 0.1).toFixed(1)} temp
            </span>
          </div>

          {/* Shortcut guide indicator */}
          <button
            type="button"
            onClick={() => setShowShortcuts(true)}
            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold tracking-wider hover:underline flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            KEYBOARD SHORTCUT GUIDE (?)
          </button>
        </div>

        {/* Full-screen Loader while generating */}
        {isGenerating && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center shadow-2xl max-w-sm text-center">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
              <h3 className="text-white font-bold text-sm mb-1.5">Stitching interface system...</h3>
              <p className="text-xs text-indigo-300 font-medium animate-pulse">
                {generatingMessage || 'Assembling modules...'}
              </p>
              <div className="w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-5 border border-slate-700">
                <div className="bg-indigo-500 h-full w-2/3 animate-[shimmer_2s_infinite]" />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
