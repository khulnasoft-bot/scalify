import { create } from 'zustand';
import { Frame, ThemeConfig, ToolMode, SelectedElementInfo, HoveredElementInfo, CanvasHistoryItem, ChatMessage } from './types';

interface CanvasState {
  panOffset: { x: number; y: number };
  zoom: number;
  toolMode: ToolMode;
  frames: Frame[];
  activeFrameId: string | null;
  selectedElement: SelectedElementInfo | null;
  hoveredElement: HoveredElementInfo | null;
  theme: ThemeConfig;
  isGenerating: boolean;
  showShortcuts: boolean;
  creativeRange: number; // 1 to 10 (which scales to temp 0.2 to 1.0)
  engineType: 'fast' | 'reasoning' | 'redesign';
  redesignPreset: 'standard' | 'bento' | 'neubrutalism' | 'glassmorphism' | 'minimalist' | 'claymorphism';
  
  // History
  history: CanvasHistoryItem[];
  historyIndex: number;

  // Actions
  setPanOffset: (offset: { x: number; y: number }) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setToolMode: (mode: ToolMode) => void;
  addFrame: (frame: Frame) => void;
  updateFrame: (id: string, partial: Partial<Frame>) => void;
  deleteFrame: (id: string) => void;
  setActiveFrameId: (id: string | null) => void;
  setSelectedElement: (element: SelectedElementInfo | null) => void;
  setHoveredElement: (element: HoveredElementInfo | null) => void;
  setTheme: (theme: Partial<ThemeConfig>) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setShowShortcuts: (show: boolean) => void;
  setCreativeRange: (range: number) => void;
  setEngineType: (engine: 'fast' | 'reasoning' | 'redesign') => void;
  setRedesignPreset: (preset: 'standard' | 'bento' | 'neubrutalism' | 'glassmorphism' | 'minimalist' | 'claymorphism') => void;
  
  // History Actions
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;

  // New Hotkey Helpers
  duplicateFrame: (id: string) => void;
  cycleFrame: (direction: 'prev' | 'next') => void;

  // Chat Loop
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
}

const defaultTheme: ThemeConfig = {
  primaryColor: '#3b82f6',
  secondaryColor: '#10b981',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  borderRadius: 'md',
  fontFamily: 'Inter',
};

const initialFrames: Frame[] = [
  {
    id: 'f1',
    name: 'Dashboard Home',
    x: 100,
    y: 100,
    width: 375,
    height: 600,
    prompt: 'Create a mobile SaaS dashboard with quick metrics and beautiful cards.',
    code: `
<div class="p-6 min-h-screen bg-slate-50 text-slate-800" data-stitch-id="comp_f1_root">
  <header class="flex justify-between items-center mb-6" data-stitch-id="comp_f1_header">
    <div>
      <h1 class="text-xl font-bold font-sans text-slate-900" data-stitch-id="comp_f1_title">Stitch Analytics</h1>
      <p class="text-xs text-slate-500">Welcome back, Liz</p>
    </div>
    <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold" data-stitch-id="comp_f1_avatar">LB</div>
  </header>
  
  <!-- Metrics Grid -->
  <div class="grid grid-cols-2 gap-3 mb-6" data-stitch-id="comp_f1_metrics">
    <div class="bg-white p-4 rounded-global shadow-sm border border-slate-100" data-stitch-id="comp_f1_card_revenue">
      <p class="text-[11px] text-slate-400 font-medium tracking-wider uppercase">Revenue</p>
      <p class="text-lg font-bold text-slate-800">$12,480</p>
      <span class="text-[10px] text-emerald-500 font-medium">+12.4%</span>
    </div>
    <div class="bg-white p-4 rounded-global shadow-sm border border-slate-100" data-stitch-id="comp_f1_card_users">
      <p class="text-[11px] text-slate-400 font-medium tracking-wider uppercase">Active Users</p>
      <p class="text-lg font-bold text-slate-800">1,840</p>
      <span class="text-[10px] text-emerald-500 font-medium">+8.2%</span>
    </div>
  </div>

  <!-- Primary CTA -->
  <div class="bg-primary text-white p-4 rounded-global shadow-sm mb-6 flex justify-between items-center" data-stitch-id="comp_f1_cta">
    <div>
      <h3 class="font-semibold text-sm">Campaign Active</h3>
      <p class="text-xs text-blue-100">Running for 4 days</p>
    </div>
    <button class="bg-white text-primary text-xs font-semibold px-3 py-1.5 rounded-global hover:bg-slate-100 transition-colors" data-stitch-id="comp_f1_cta_button">View Report</button>
  </div>

  <!-- Recent Activity -->
  <div class="bg-white p-4 rounded-global shadow-sm border border-slate-100 mb-6" data-stitch-id="comp_f1_activity">
    <h3 class="text-sm font-semibold text-slate-800 mb-3">Recent Invoices</h3>
    <div class="space-y-3">
      <div class="flex justify-between items-center text-xs" data-stitch-id="comp_f1_invoice_1">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
          <div>
            <p class="font-medium text-slate-700">Acme Corp</p>
            <p class="text-[10px] text-slate-400">Paid 2h ago</p>
          </div>
        </div>
        <span class="font-bold text-slate-800">$150.00</span>
      </div>
      <div class="flex justify-between items-center text-xs" data-stitch-id="comp_f1_invoice_2">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-amber-500"></div>
          <div>
            <p class="font-medium text-slate-700">Vercel Inc</p>
            <p class="text-[10px] text-slate-400">Pending</p>
          </div>
        </div>
        <span class="font-bold text-slate-800">$450.00</span>
      </div>
    </div>
  </div>
</div>
`
  }
];

export const useCanvasStore = create<CanvasState>((set, get) => ({
  panOffset: { x: 0, y: 0 },
  zoom: 0.9,
  toolMode: 'select',
  frames: initialFrames,
  activeFrameId: null,
  selectedElement: null,
  hoveredElement: null,
  theme: defaultTheme,
  isGenerating: false,
  showShortcuts: false,
  creativeRange: 6,
  engineType: 'fast',
  redesignPreset: 'standard',

  // History state
  history: [{ frames: initialFrames, theme: defaultTheme }],
  historyIndex: 0,

  // Chat state
  chatMessages: [
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hi Liz! I'm Stitch, your layout design partner. Select any element in the preview to make direct edits, or write a prompt here to generate new visual components.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ],

  setPanOffset: (panOffset) => set({ panOffset }),
  
  setZoom: (zoom) => set((state) => {
    const nextZoom = typeof zoom === 'function' ? zoom(state.zoom) : zoom;
    return { zoom: Math.min(Math.max(nextZoom, 0.15), 3) };
  }),
  
  setToolMode: (toolMode) => set({ toolMode }),
  
  addFrame: (frame) => set((state) => {
    const nextFrames = [...state.frames, frame];
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    return {
      frames: nextFrames,
      activeFrameId: frame.id,
      history: [...newHistory, { frames: nextFrames, theme: state.theme }],
      historyIndex: newHistory.length,
    };
  }),

  updateFrame: (id, partial) => set((state) => {
    const nextFrames = state.frames.map((f) => f.id === id ? { ...f, ...partial } : f);
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    return {
      frames: nextFrames,
      history: [...newHistory, { frames: nextFrames, theme: state.theme }],
      historyIndex: newHistory.length,
    };
  }),

  deleteFrame: (id) => set((state) => {
    const nextFrames = state.frames.filter((f) => f.id !== id);
    const activeId = state.activeFrameId === id ? null : state.activeFrameId;
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    return {
      frames: nextFrames,
      activeFrameId: activeId,
      selectedElement: state.selectedElement?.frameId === id ? null : state.selectedElement,
      hoveredElement: state.hoveredElement?.frameId === id ? null : state.hoveredElement,
      history: [...newHistory, { frames: nextFrames, theme: state.theme }],
      historyIndex: newHistory.length,
    };
  }),

  setActiveFrameId: (activeFrameId) => set({ activeFrameId }),
  
  setSelectedElement: (selectedElement) => set({ selectedElement }),
  
  setHoveredElement: (hoveredElement) => set({ hoveredElement }),
  
  setTheme: (themeUpdate) => set((state) => {
    const nextTheme = { ...state.theme, ...themeUpdate };
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    return {
      theme: nextTheme,
      history: [...newHistory, { frames: state.frames, theme: nextTheme }],
      historyIndex: newHistory.length,
    };
  }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),
  
  setShowShortcuts: (showShortcuts) => set({ showShortcuts }),
  
  setCreativeRange: (creativeRange) => set({ creativeRange }),
  
  setEngineType: (engineType) => set({ engineType }),
  
  setRedesignPreset: (redesignPreset) => set({ redesignPreset }),

  saveToHistory: () => set((state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    return {
      history: [...newHistory, { frames: state.frames, theme: state.theme }],
      historyIndex: newHistory.length,
    };
  }),

  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const nextIndex = state.historyIndex - 1;
      const historyItem = state.history[nextIndex];
      return {
        frames: historyItem.frames,
        theme: historyItem.theme,
        historyIndex: nextIndex,
        selectedElement: null,
        hoveredElement: null,
      };
    }
    return {};
  }),

  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const nextIndex = state.historyIndex + 1;
      const historyItem = state.history[nextIndex];
      return {
        frames: historyItem.frames,
        theme: historyItem.theme,
        historyIndex: nextIndex,
        selectedElement: null,
        hoveredElement: null,
      };
    }
    return {};
  }),

  duplicateFrame: (id) => set((state) => {
    const original = state.frames.find((f) => f.id === id);
    if (!original) return {};
    const newId = `f_${Date.now()}`;
    const duplicated: Frame = {
      ...original,
      id: newId,
      name: `${original.name} Copy`,
      x: original.x + 80,
      y: original.y + 80,
    };
    const nextFrames = [...state.frames, duplicated];
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    return {
      frames: nextFrames,
      activeFrameId: newId,
      history: [...newHistory, { frames: nextFrames, theme: state.theme }],
      historyIndex: newHistory.length,
    };
  }),

  cycleFrame: (direction) => set((state) => {
    if (state.frames.length <= 1) return {};
    const currentIndex = state.frames.findIndex((f) => f.id === state.activeFrameId);
    let nextIndex = 0;
    if (currentIndex !== -1) {
      if (direction === 'next') {
        nextIndex = (currentIndex + 1) % state.frames.length;
      } else {
        nextIndex = (currentIndex - 1 + state.frames.length) % state.frames.length;
      }
    } else {
      nextIndex = 0;
    }
    const nextFrame = state.frames[nextIndex];
    
    // Smooth viewport center placement calculation
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const frameCenterX = nextFrame.x + (nextFrame.width || 375) / 2;
    const frameCenterY = nextFrame.y + (nextFrame.height || 600) / 2;
    const nextPanX = (viewportWidth / 2) - frameCenterX * state.zoom;
    const nextPanY = (viewportHeight / 2) - frameCenterY * state.zoom;

    return {
      activeFrameId: nextFrame.id,
      panOffset: { x: Math.round(nextPanX), y: Math.round(nextPanY) }
    };
  }),

  addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),
}));
