import React, { useState } from 'react';
import { useCanvasStore } from '../canvasStore';
import { Download, Code, FileCode, Check, Copy, Loader2 } from 'lucide-react';
import JSZip from 'jszip';

export const ExportMenu: React.FC = () => {
  const { frames, theme, activeFrameId } = useCanvasStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'react' | 'vue' | 'swiftui' | 'flutter' | null>(null);
  const [convertedCode, setConvertedCode] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Map of border radius to string sizes for CSS variable injection
  const radiusMap = {
    none: '0px',
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px'
  };

  // Compile full ZIP project bundle asynchronously with extracted images and tailwind.config.js
  const compileProjectBundle = async () => {
    const zip = new JSZip();
    const imgCounter = { val: 1 };
    const imageCache: Record<string, string> = {}; // track downloaded images to avoid duplicates

    // Function to fetch an external image and store it inside /images directory
    const getLocalizedImage = async (originalSrc: string): Promise<string> => {
      if (imageCache[originalSrc]) {
        return imageCache[originalSrc];
      }

      if (originalSrc.startsWith('http') || originalSrc.startsWith('https') || originalSrc.startsWith('data:image')) {
        try {
          let blob: Blob;
          let ext = 'png';

          if (originalSrc.startsWith('data:image')) {
            const mime = originalSrc.split(',')[0].split(':')[1].split(';')[0];
            ext = mime.split('/')[1] || 'png';
            const base64Data = originalSrc.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            blob = new Blob([byteArray], { type: mime });
          } else {
            const response = await fetch(originalSrc);
            if (!response.ok) throw new Error('Fetch status not ok');
            blob = await response.blob();
            const contentType = response.headers.get('content-type');
            if (contentType) {
              ext = contentType.split('/')[1] || 'png';
            } else {
              const urlExt = originalSrc.split('.').pop()?.split(/[?#]/)[0];
              if (urlExt && ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(urlExt)) {
                ext = urlExt;
              }
            }
          }

          const fileName = `image_${imgCounter.val}.${ext}`;
          zip.file(`images/${fileName}`, blob);
          const localPath = `./images/${fileName}`;
          imageCache[originalSrc] = localPath;
          imgCounter.val++;
          return localPath;
        } catch (err) {
          console.warn('Could not bundle image locally (CORS restriction or network):', originalSrc, err);
          return originalSrc; // fallback to external URL
        }
      }
      return originalSrc;
    };

    // 1. Process all frames, localizing any referenced images
    const processedFrames = await Promise.all(frames.map(async (frame) => {
      let code = frame.code;
      // Extract matches for src="..." inside the code
      const imgRegex = /src=["']([^"']+)["']/g;
      let match;
      const originalSrcs: string[] = [];
      
      while ((match = imgRegex.exec(frame.code)) !== null) {
        originalSrcs.push(match[1]);
      }

      for (const src of originalSrcs) {
        if (src.startsWith('http') || src.startsWith('https') || src.startsWith('data:image')) {
          const localSrc = await getLocalizedImage(src);
          if (localSrc !== src) {
            code = code.replaceAll(src, localSrc);
          }
        }
      }

      return {
        ...frame,
        code
      };
    }));

    // 2. Generate showcase index.html representing the whole project or frames
    const fontLink = `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fontFamily)}:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">`;

    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stitch Design Bundle Showcase</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ${fontLink}
  
  <style>
    :root {
      --primary: ${theme.primaryColor};
      --secondary: ${theme.secondaryColor};
      --bg-frame: ${theme.backgroundColor};
      --text-frame: ${theme.textColor};
      --radius-global: ${radiusMap[theme.borderRadius] || '8px'};
      --font-global: '${theme.fontFamily}';
    }
    
    body {
      font-family: var(--font-global), sans-serif;
    }
    
    /* Variable helper classes */
    .bg-primary { background-color: var(--primary) !important; }
    .text-primary { color: var(--primary) !important; }
    .border-primary { border-color: var(--primary) !important; }
    .bg-secondary { background-color: var(--secondary) !important; }
    .text-secondary { color: var(--secondary) !important; }
    .rounded-global { border-radius: var(--radius-global) !important; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex flex-col">
  <!-- Top showcase header bar -->
  <header class="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black font-mono">S</div>
      <div>
        <h1 class="text-xs font-black uppercase tracking-wider">Stitch Prototype Bundle</h1>
        <p class="text-[9px] text-slate-400">Offline presentation playground with complete styles and images</p>
      </div>
    </div>
    <div class="flex items-center gap-3 text-xs">
      <span class="text-slate-400">Primary Accent:</span>
      <div class="w-5 h-5 rounded-full border border-slate-700" style="background-color: ${theme.primaryColor}"></div>
      <span class="text-slate-400">Font:</span>
      <span class="font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">${theme.fontFamily}</span>
    </div>
  </header>

  <div class="flex-1 flex overflow-hidden">
    <!-- Left Navigation Menu -->
    <nav class="w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col gap-1.5 overflow-y-auto shrink-0">
      <div class="text-[9px] text-slate-500 font-bold uppercase tracking-widest px-3 mb-2">Generated Screens</div>
      ${processedFrames.map((f, idx) => `
        <button 
          onclick="selectScreen('${f.id}')"
          id="btn-${f.id}"
          class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${idx === 0 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}"
        >
          <span>${f.name}</span>
          <span class="text-[9px] opacity-60 font-mono">${f.width}x${f.height}</span>
        </button>
      `).join('')}
    </nav>

    <!-- Main Presentation Screen Viewport -->
    <main class="flex-1 bg-slate-900 p-8 flex items-center justify-center overflow-auto relative">
      ${processedFrames.map((f, idx) => `
        <div 
          id="frame-${f.id}" 
          class="screen-container bg-white text-slate-800 shadow-2xl rounded-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto ${idx === 0 ? 'block' : 'hidden'}"
          style="width: ${f.width}px; min-height: ${f.height}px;"
        >
          <div class="bg-slate-50/50 border-b border-slate-100 px-4 py-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex justify-between items-center select-none">
            <span>${f.name}</span>
            <span>Local Component Mode</span>
          </div>
          <div class="p-1">
            ${f.code}
          </div>
        </div>
      `).join('')}
    </main>
  </div>

  <script>
    function selectScreen(id) {
      document.querySelectorAll('.screen-container').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.screen-container').forEach(el => el.classList.remove('block'));
      
      const targetFrame = document.getElementById('frame-' + id);
      if (targetFrame) {
        targetFrame.classList.remove('hidden');
        targetFrame.classList.add('block');
      }

      document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('text-slate-400', 'hover:bg-slate-900', 'hover:text-slate-200');
      });

      const activeBtn = document.getElementById('btn-' + id);
      if (activeBtn) {
        activeBtn.classList.remove('text-slate-400', 'hover:bg-slate-900', 'hover:text-slate-200');
        activeBtn.classList.add('bg-indigo-600', 'text-white');
      }
    }
  </script>
</body>
</html>`;

    zip.file("index.html", indexHtml);

    // 3. Add styles.css
    const cssContent = `/* Stitch Dynamic Style Export */
:root {
  --primary: ${theme.primaryColor};
  --secondary: ${theme.secondaryColor};
  --bg-frame: ${theme.backgroundColor};
  --text-frame: ${theme.textColor};
  --radius-global: ${radiusMap[theme.borderRadius] || '8px'};
  --font-global: '${theme.fontFamily}';
}

body {
  font-family: var(--font-global), sans-serif;
}

.bg-primary { background-color: var(--primary) !important; }
.text-primary { color: var(--primary) !important; }
.border-primary { border-color: var(--primary) !important; }
.bg-secondary { background-color: var(--secondary) !important; }
.text-secondary { color: var(--secondary) !important; }
.rounded-global { border-radius: var(--radius-global) !important; }
`;

    zip.file("styles.css", cssContent);

    // 4. Add tailwind.config.js (Tailwind utility configuration)
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./frames/*.html"],
  theme: {
    extend: {
      colors: {
        primary: "${theme.primaryColor}",
        secondary: "${theme.secondaryColor}",
        background: "${theme.backgroundColor}",
        foreground: "${theme.textColor}"
      },
      borderRadius: {
        global: "${radiusMap[theme.borderRadius] || '8px'}"
      },
      fontFamily: {
        global: ["${theme.fontFamily}", "sans-serif"]
      }
    }
  },
  plugins: []
};
`;

    zip.file("tailwind.config.js", tailwindConfig);

    // 5. Add individual frames
    const framesFolder = zip.folder("frames");
    if (framesFolder) {
      processedFrames.forEach((frame) => {
        framesFolder.file(`${frame.name.toLowerCase().replace(/\s+/g, '-')}.html`, frame.code);
      });
    }

    // 6. Add theme details as JSON
    zip.file("theme.json", JSON.stringify(theme, null, 2));

    // 7. Add README.md
    const readmeContent = `# Stitch Design Bundle

This directory is an exported design package compiled by **Stitch AI layout designer**.

## Contents Included:
- \`index.html\`: A multi-screen presentation dashboard with dynamic screen selectors.
- \`styles.css\`: Compiled CSS variables mapping primary, secondary, text, background, and rounded-global styles.
- \`tailwind.config.js\`: A fully declared Tailwind config containing the custom theme, colors, and font overrides.
- \`theme.json\`: Stored JSON configuration variables for reference.
- \`images/\`: Packaged and bundled local image assets extracted directly from the design frames.
- \`frames/\`: Raw HTML file components for individual pages.

## How to use:
1. Open \`index.html\` in any web browser to run the interactive prototype offline.
2. Integrate the individual code files in \`frames/\` or use the Tailwind config in your React, Vue, SwiftUI, or Flutter projects.
`;

    zip.file("README.md", readmeContent);

    // Add a placeholder image so images folder exists even if no dynamic images were fetched
    if (imgCounter.val === 1) {
      zip.file("images/placeholder.txt", "No external images were fetched from external tags in the layouts.");
    }

    return zip;
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = await compileProjectBundle();
      const content = await zip.generateAsync({ type: "blob" });
      
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = "stitch-design-bundle.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Zipping failed:", e);
    } finally {
      setIsZipping(false);
    }
  };

  const handleTranslate = async (format: 'react' | 'vue' | 'swiftui' | 'flutter') => {
    setSelectedFormat(format);
    setIsTranslating(true);
    setConvertedCode('');
    
    const sourceFrame = frames[0];
    if (!sourceFrame) {
      setConvertedCode('No frames found to convert.');
      setIsTranslating(false);
      return;
    }

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: sourceFrame.code,
          format: format,
          frameName: sourceFrame.name
        })
      });
      const data = await response.json();
      if (data.success) {
        setConvertedCode(data.translatedCode);
      } else {
        setConvertedCode(data.error || 'Failed to translate code.');
      }
    } catch (err) {
      console.error(err);
      setConvertedCode('Error occurred during component translation API call.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(convertedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFormatTitle = (format: string) => {
    switch (format) {
      case 'react': return 'React (TS + Tailwind)';
      case 'vue': return 'Vue Composition SFC';
      case 'swiftui': return 'Apple SwiftUI View';
      case 'flutter': return 'Google Flutter Widget';
      default: return format;
    }
  };

  const handleDownloadCleanHTML = () => {
    const activeFrame = frames.find((f) => f.id === activeFrameId) || frames[0];
    if (!activeFrame) {
      alert('No layouts found to download.');
      return;
    }

    const fontLink = `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fontFamily)}:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">`;

    const cleanHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activeFrame.name} - Stitch Design</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ${fontLink}
  
  <style>
    :root {
      --primary: ${theme.primaryColor};
      --secondary: ${theme.secondaryColor};
      --bg-frame: ${theme.backgroundColor};
      --text-frame: ${theme.textColor};
      --radius-global: ${radiusMap[theme.borderRadius] || '8px'};
      --font-global: '${theme.fontFamily}';
    }
    
    body {
      font-family: var(--font-global), system-ui, -apple-system, sans-serif !important;
      background-color: var(--bg-frame) !important;
      color: var(--text-frame) !important;
      margin: 0;
      padding: 0;
      min-height: 100vh;
    }
    
    /* Variable helper classes */
    .bg-primary { background-color: var(--primary) !important; }
    .text-primary { color: var(--primary) !important; }
    .border-primary { border-color: var(--primary) !important; }
    .bg-secondary { background-color: var(--secondary) !important; }
    .text-secondary { color: var(--secondary) !important; }
    .rounded-global { border-radius: var(--radius-global) !important; }
  </style>
</head>
<body>
  ${activeFrame.code}
</body>
</html>`;

    const blob = new Blob([cleanHTML], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeFrame.name.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center gap-2 relative">
      {/* Primary direct Download Code action */}
      <button
        onClick={handleDownloadCleanHTML}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
        title="Download currently active frame as self-contained HTML/CSS file"
      >
        <Download className="w-3.5 h-3.5" />
        Download Code
      </button>

      {/* Advanced Format Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Code className="w-3.5 h-3.5" />
          Export Formats
        </button>

        {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-xl py-1.5 z-30 font-medium text-slate-700 text-xs animate-in fade-in duration-200">
            <button
              onClick={() => {
                setIsOpen(false);
                handleDownloadZip();
              }}
              className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
            >
              {isZipping ? (
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-slate-400" />
              )}
              Download Project ZIP Bundle
            </button>
            <div className="h-px bg-slate-50 my-1.5" />
            
            <div className="px-4 py-1.5 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Component Translators
            </div>
            
            <button
              onClick={() => {
                setIsOpen(false);
                handleTranslate('react');
              }}
              className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
            >
              <Code className="w-4 h-4 text-sky-500" />
              Export as React (TS)
            </button>
            
            <button
              onClick={() => {
                setIsOpen(false);
                handleTranslate('vue');
              }}
              className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
            >
              <FileCode className="w-4 h-4 text-emerald-500" />
              Export as Vue SFC
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                handleTranslate('swiftui');
              }}
              className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
            >
              <Code className="w-4 h-4 text-orange-500" />
              Export as iOS SwiftUI
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                handleTranslate('flutter');
              }}
              className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
            >
              <FileCode className="w-4 h-4 text-teal-500" />
              Export as Flutter Dart
            </button>
          </div>
        </>
      )}
      </div>

      {/* Component Translation Output Modal */}
      {selectedFormat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-800 text-sm">
                  Translated Component: <span className="text-indigo-600 font-bold">{getFormatTitle(selectedFormat)}</span>
                </h3>
              </div>
              <button 
                onClick={() => setSelectedFormat(null)}
                className="text-slate-400 hover:text-slate-600 font-medium text-xs bg-white px-2.5 py-1 rounded-md border cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-950 font-mono text-[11px] text-slate-300 relative min-h-[300px]">
              {isTranslating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-xs text-slate-400">Gemini is translating HTML layout classes into native component format...</p>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap leading-relaxed select-text">
                  {convertedCode}
                </pre>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[10px] font-mono text-slate-400">
                AI translation maps Tailwind styles perfectly
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedFormat(null)}
                  className="px-4 py-2 border hover:bg-slate-100 font-semibold text-xs rounded-lg text-slate-600 transition-colors cursor-pointer"
                >
                  Close Window
                </button>
                <button
                  onClick={handleCopyCode}
                  disabled={!convertedCode || isTranslating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Component Code
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
