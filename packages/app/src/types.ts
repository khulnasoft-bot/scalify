export interface Frame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  code: string;
  prompt: string;
  reportedHeight?: number;
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  fontFamily: string;
}

export type ToolMode = 'select' | 'pan' | 'zoom';

export interface SelectedElementInfo {
  frameId: string;
  elementId: string; // data-stitch-id
  tagName: string;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  html: string;
}

export interface HoveredElementInfo {
  frameId: string;
  elementId: string;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface CanvasHistoryItem {
  frames: Frame[];
  theme: ThemeConfig;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  codeContext?: {
    elementId: string;
    tagName: string;
    html: string;
    frameId: string;
    frameName: string;
  };
}
