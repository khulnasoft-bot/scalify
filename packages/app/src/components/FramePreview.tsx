import React, { useEffect, useRef } from 'react';
import { useCanvasStore } from '../canvasStore';

interface FramePreviewProps {
  frameId: string;
  code: string;
  width: number;
  height: number;
}

export const FramePreview: React.FC<FramePreviewProps> = ({ frameId, code, width, height }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { theme, setHoveredElement, setSelectedElement, selectedElement, selectedElements, updateFrame } = useCanvasStore();

  // Handle postMessage events from the child sandboxed iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Parse the event data
      if (!event.data || typeof event.data !== 'object') return;
      const { type, payload } = event.data;
      if (!payload || payload.frameId !== frameId) return;

      if (type === 'HOVER_ELEMENT') {
        setHoveredElement({
          frameId,
          elementId: payload.id,
          rect: payload.rect
        });
      } else if (type === 'HOVER_OUT_ELEMENT') {
        setHoveredElement(null);
      } else if (type === 'SELECT_ELEMENT') {
        const { id, tagName, rect, html, shiftKey } = payload;
        const store = useCanvasStore.getState();
        const currentSelected = store.selectedElements;
        const currentFrameId = currentSelected.length > 0 ? currentSelected[0].frameId : null;
        
        let newSelected: typeof currentSelected = [];
        const newElem = { frameId, elementId: id, tagName, rect, html };
        
        if (shiftKey && (!currentFrameId || currentFrameId === frameId)) {
          const exists = currentSelected.some(el => el.elementId === id);
          if (exists) {
            newSelected = currentSelected.filter(el => el.elementId !== id);
          } else {
            newSelected = [...currentSelected, newElem];
          }
        } else {
          newSelected = [newElem];
        }
        
        store.setSelectedElements(newSelected);
        store.setSelectedElement(newSelected[newSelected.length - 1] || null);
        store.setActiveFrameId(frameId);
      } else if (type === 'REPORT_SIZE') {
        if (payload.height && payload.height > 0) {
          updateFrame(frameId, { reportedHeight: payload.height });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [frameId, setHoveredElement, setSelectedElement, updateFrame]);

  // Construct iframe html with Tailwind, loaded custom font, injected css variables, and visual interceptor scripts.
  const fontLink = `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fontFamily)}:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">`;

  const radiusMap = {
    none: '0px',
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px'
  };

  const cssVariables = `
    <style>
      :root {
        --primary: ${theme.primaryColor};
        --secondary: ${theme.secondaryColor};
        --bg-frame: ${theme.backgroundColor};
        --text-frame: ${theme.textColor};
        --radius-global: ${radiusMap[theme.borderRadius]};
        --font-global: '${theme.fontFamily}';
      }
      
      body {
        font-family: var(--font-global), system-ui, -apple-system, sans-serif !important;
        background-color: var(--bg-frame) !important;
        color: var(--text-frame) !important;
        margin: 0;
        padding: 0;
        min-height: 100%;
        overflow-x: hidden;
      }
      
      /* Dynamic styles mapping to standard utility classes */
      .bg-primary { background-color: var(--primary) !important; }
      .text-primary { color: var(--primary) !important; }
      .border-primary { border-color: var(--primary) !important; }
      .bg-secondary { background-color: var(--secondary) !important; }
      .text-secondary { color: var(--secondary) !important; }
      .rounded-global { border-radius: var(--radius-global) !important; }

      /* Visual styling on hovered components to indicate interactive click-to-edit elements */
      [data-stitch-id] {
        position: relative;
        transition: outline 0.1s ease;
      }
      [data-stitch-id]:hover {
        outline: 2px dashed rgba(99, 102, 241, 0.7) !important;
        outline-offset: -2px;
        cursor: pointer;
      }
      
      /* Custom tiny tag marker when selected inside iframe */
      .stitch-selected-highlight {
        outline: 2px solid #6366f1 !important;
        outline-offset: -2px;
      }

      /* Disable default anchors in designer frame to prevent navigating away */
      a {
        pointer-events: none;
      }
    </style>
  `;

  const injectionScript = `
    <script>
      (function() {
        // Report height of sandboxed preview
        function reportHeight() {
          const height = document.documentElement.scrollHeight;
          window.parent.postMessage({
            type: 'REPORT_SIZE',
            payload: { frameId: '${frameId}', height: height }
          }, '*');
        }
        
        window.addEventListener('load', reportHeight);
        window.addEventListener('resize', reportHeight);

        // Helper to find closest ancestor with stitch-id
        function findStitchId(elem) {
          if (!elem || elem === document.body || elem === document.documentElement) return null;
          if (elem.hasAttribute('data-stitch-id')) {
            return elem;
          }
          return findStitchId(elem.parentElement);
        }

        // Mouse hover listener
        document.addEventListener('mouseover', function(e) {
          const target = findStitchId(e.target);
          if (target) {
            const rect = target.getBoundingClientRect();
            window.parent.postMessage({
              type: 'HOVER_ELEMENT',
              payload: {
                frameId: '${frameId}',
                id: target.getAttribute('data-stitch-id'),
                rect: {
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height
                }
              }
            }, '*');
          }
        });

        document.addEventListener('mouseout', function(e) {
          window.parent.postMessage({
            type: 'HOVER_OUT_ELEMENT',
            payload: { frameId: '${frameId}' }
          }, '*');
        });

        // Click interceptor listener
        document.addEventListener('click', function(e) {
          const target = findStitchId(e.target);
          if (target) {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = target.getBoundingClientRect();
            window.parent.postMessage({
              type: 'SELECT_ELEMENT',
              payload: {
                frameId: '${frameId}',
                id: target.getAttribute('data-stitch-id'),
                tagName: target.tagName,
                rect: {
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height
                },
                html: target.outerHTML,
                shiftKey: e.shiftKey
              }
            }, '*');
          }
        }, true);

        // Listen for messages from the parent app
        window.addEventListener('message', function(event) {
          if (!event.data || typeof event.data !== 'object') return;
          if (event.data.type === 'SYNC_SELECTION') {
            const selectedElementIds = event.data.payload.selectedElementIds || [];
            document.querySelectorAll('.stitch-selected-highlight').forEach(el => {
              el.classList.remove('stitch-selected-highlight');
            });
            selectedElementIds.forEach(id => {
              const target = document.querySelector('[data-stitch-id="' + id + '"]');
              if (target) {
                target.classList.add('stitch-selected-highlight');
              }
            });
          }
        });
      })();
    </script>
  `;

  const docHtml = `
    <!DOCTYPE html>
    <html lang="en" class="h-full">
    <head>
      <meta charset="UTF-8">
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      ${fontLink}
      ${cssVariables}
    </head>
    <body class="h-full">
      ${code}
      ${injectionScript}
    </body>
    </html>
  `;

  // Sync selection highlight in the sandboxed frame using postMessage
  useEffect(() => {
    if (!iframeRef.current) return;
    const iframe = iframeRef.current;
    
    const sendSyncMessage = () => {
      const selectedIds = selectedElements
        .filter(el => el.frameId === frameId)
        .map(el => el.elementId);
        
      iframe.contentWindow?.postMessage({
        type: 'SYNC_SELECTION',
        payload: { selectedElementIds: selectedIds }
      }, '*');
    };

    // Send selection sync immediately and also on frame load
    sendSyncMessage();
    iframe.addEventListener('load', sendSyncMessage);
    return () => {
      iframe.removeEventListener('load', sendSyncMessage);
    };
  }, [selectedElements, frameId]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={docHtml}
      className="w-full h-full bg-white select-none pointer-events-auto"
      title={`Frame ${frameId} Live Sandbox Preview`}
      sandbox="allow-scripts"
    />
  );
};
