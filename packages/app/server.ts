import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

// Verify and initialize Google GenAI SDK client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('CRITICAL WARNING: GEMINI_API_KEY environment variable is not set. AI capabilities will be offline.');
}

const ai = new GoogleGenAI({
  apiKey: apiKey || 'dummy-key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper for transient API failures with exponential backoff
async function callGeminiWithRetry<T>(
  apiCall: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await apiCall();
  } catch (err: any) {
    const errString = String(err?.message || err || '').toLowerCase();
    const isRetryable = 
      err?.status === 503 || 
      err?.status === 429 ||
      errString.includes('503') || 
      errString.includes('429') || 
      errString.includes('temporary') || 
      errString.includes('high demand') ||
      errString.includes('unavailable');

    if (isRetryable && retries > 0) {
      console.warn(`[Stitch Server] Gemini API transient error encountered. Retrying in ${delay}ms... (${retries} retries remaining)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGeminiWithRetry(apiCall, retries - 1, delay * 2);
    }
    throw err;
  }
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// --- API Route 1: Fresh Interface Generation ---
app.post('/api/generate', async (req, res) => {
  const { prompt, variationsCount, engineType, redesignPreset, theme, temperature } = req.body;
  
  const modelName = engineType === 'reasoning' ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash';
  const tempVal = Number(temperature) || 0.6;
  
  // Style redesign preset directives
  let stylePresetRules = '';
  if (engineType === 'redesign' && redesignPreset) {
    if (redesignPreset === 'bento') {
      stylePresetRules = 'Layout MUST heavily feature a responsive Bento Grid layout with cards of different sizes, border details, and precise grid spacing.';
    } else if (redesignPreset === 'neubrutalism') {
      stylePresetRules = 'Aesthetics MUST represent Neo-Brutalisim style: thick black borders (e.g., border-4 border-slate-900), harsh box-shadows (e.g., shadow-[4px_4px_0px_0px_#18181b]), high contrast vibrant colors, and chunky flat typography.';
    } else if (redesignPreset === 'glassmorphism') {
      stylePresetRules = 'Aesthetics MUST represent glassmorphic overlay look: semi-transparent white cards with backdrop-blur blur filters (e.g., bg-white/20 backdrop-blur-md border border-white/30), subtle drop shadows, and delicate glows.';
    } else if (redesignPreset === 'minimalist') {
      stylePresetRules = 'Aesthetics MUST represent ultra-minimal clean slate: massive negative space, thin/subtle neutral divider lines, light muted typography, and absolutely no flashy decorations.';
    } else if (redesignPreset === 'claymorphism') {
      stylePresetRules = 'Aesthetics MUST represent soft claymorphic 3D look: very rounded cards and components (e.g., rounded-3xl or rounded-2xl), soft pastel backgrounds, double shadows with both light inset highlight and dark inset shadow, and playful organic padding.';
    }
  }

  // Creative Range directives (Refined vs Creative modes)
  let rangeDirectives = '';
  if (tempVal <= 0.45) {
    rangeDirectives = 'MODE: REFINED (Precise / Clean-cut). Focus on a pristine, stable, and highly standard industrial design layout. Strictly respect alignment rules, keep structures extremely clean and balanced, and avoid unnecessary clutter or erratic shapes.';
  } else if (tempVal >= 0.75) {
    rangeDirectives = 'MODE: CREATIVE (Expressive / Dynamic). You have absolute creative license! Propose bold, visually impressive, highly custom layouts. Weave in rich design features, floating cards, multi-level panels, unique grids, and highly stylized gradient elements that pop off the screen.';
  } else {
    rangeDirectives = 'MODE: BALANCED (Standard / Polished). Maintain a solid structural flow while introducing state-of-the-art layout details, modern visual spacing, and beautiful interactive styling.';
  }

  const systemInstruction = `
    You are Stitch, an AI-first professional interface design tool. Your goal is to generate clean, production-ready, beautiful HTML layout fragments.
    
    The user's prompt might come formatted in a "Design Formula" structure containing:
    - [IDEA]: The core layout concept, structure, or visual component.
    - [THEME]: Specific aesthetic guides, gradients, borders, shadows, and design vibes.
    - [CONTENT]: Copywriting, list items, real values, or headers.
    - [IMAGE]: Guidance on visual placeholders, icons (using lucide svg format or clean minimalist svgs), or stock photography references.
    
    You must parse these blocks and faithfully combine them into a high-fidelity output.

    CRITICAL RULES:
    1. Output MUST consist of ONLY semantic HTML5 blocks.
    2. Style entirely using standard Tailwind CSS utility classes.
    3. You MUST inject a unique "data-stitch-id" attribute on EVERY logical container, card, grid item, list item, button, label, header, and major wrapper inside the generated layout. For example: <div data-stitch-id="comp_f_card_1">, <button data-stitch-id="comp_f_btn_buy">. This is vital so the parent editor can target specific elements.
    4. Make the layouts fully responsive. Add padding and grids suitable for mobile view (375px wide) or clean desktop flow.
    5. Ensure you use Tailwind class helpers that match global variables:
       - Use 'bg-primary' for elements styled with the primary accent color.
       - Use 'text-primary' or 'border-primary' for primary text or border details.
       - Use 'bg-secondary' for secondary brand elements.
       - Use 'rounded-global' for all cards, containers, input boxes, and buttons to support dynamic corner radius overrides.
    6. Provide highly realistic copywriting copy and SaaS/ecommerce/dashboard dummy content instead of simple placeholders like lorem ipsum.
    7. ${stylePresetRules}
    8. ${rangeDirectives}
  `;

  const vCount = Math.min(Math.max(Number(variationsCount) || 1, 1), 5);
  
  const variationDirectives = [
    "Design Focus: A classic, highly structured clean professional design with clear headers and card sections.",
    "Design Focus: A modern, vibrant high-contrast layout emphasizing bold actions, colored badges, and custom illustrations.",
    "Design Focus: An elegant, spacious presentation with generous letter-spacing, delicate lines, and beautiful typographic hierarchy.",
    "Design Focus: A high-density compact dashboard style with micro-grids, list details, and compact indicator badges.",
    "Design Focus: A creative, bold out-of-the-box layout with floating cards, organic container flows, and unique structure."
  ];

  try {
    // Execute multiple generation requests simultaneously (Parallel Generation Queue)
    const promises = Array.from({ length: vCount }).map(async (_, idx) => {
      const distinctFocus = vCount > 1 ? variationDirectives[idx % variationDirectives.length] : '';
      
      const userPrompt = `
        Generate 1 beautiful, distinct visual interface layout for the following request:
        "${prompt}"

        ${distinctFocus}

        Theme requirements to integrate:
        - Target accent colors: Primary: ${theme?.primaryColor || '#3b82f6'}, Secondary: ${theme?.secondaryColor || '#10b981'}
        - Text: ${theme?.textColor || '#1f2937'}
        - Typography pairings: ${theme?.fontFamily || 'Inter'}
      `;

      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: tempVal,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              variants: {
                type: Type.ARRAY,
                description: 'List of generated screen variations',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: 'Short elegant name describing this layout variation (e.g., Dashboard Overview V1)' },
                    html: { type: Type.STRING, description: 'Complete clean HTML code structured with Tailwind CSS classes and data-stitch-id attributes.' }
                  },
                  required: ['name', 'html']
                }
              }
            },
            required: ['variants']
          }
        }
      }));

      const text = response.text;
      if (!text) {
        throw new Error('Gemini API returned an empty response.');
      }
      return JSON.parse(text);
    });

    const results = await Promise.all(promises);
    
    // Combine all variants from the parallel runs
    const allVariants: Array<{ name: string; html: string }> = [];
    results.forEach((resData) => {
      if (resData && Array.isArray(resData.variants)) {
        allVariants.push(...resData.variants);
      }
    });

    res.json({ success: true, variants: allVariants });
  } catch (err: any) {
    console.error('API Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Generation API failed.' });
  }
});


// --- API Route 2: Click-to-Edit targeted rewrite ---
app.post('/api/edit-element', async (req, res) => {
  const { fullHtml, elementId, elementHtml, instruction, theme, temperature } = req.body;
  const tempVal = Number(temperature) || 0.4;

  let rangeDirectives = '';
  if (tempVal <= 0.45) {
    rangeDirectives = `MODE: REFINED (Precise / Conservation). You MUST stick extremely closely to the requested design layout. Keep existing layout nodes intact, do NOT remove or rename crucial containers or change structural tags, make minimal surgical modifications, preserve surrounding class names, and maintain high-fidelity structural conservation of the element '${elementId}'.`;
  } else if (tempVal >= 0.75) {
    rangeDirectives = `MODE: CREATIVE (Dynamic / Restructure). You have creative freedom to fully restructure the element '${elementId}'! You may introduce new child nodes, decorative borders, gradient backgrounds, or transform this block into a completely different component style if requested.`;
  } else {
    rangeDirectives = 'MODE: BALANCED. Maintain stable container structure while applying visual improvements and refined Tailwind utilities.';
  }

  const systemInstruction = `
    You are Stitch element editor. Your job is to modify a specific HTML sub-block inside a larger HTML document based on the user's instructions.
    
    CRITICAL RULES:
    1. Rewrite the given HTML block to satisfy the request while preserving its original logical surrounding layout.
    2. Stylize entirely with standard Tailwind CSS utility classes.
    3. You MUST keep the same "data-stitch-id" attribute ('${elementId}') on the root node of the modified element.
    4. You MUST use dynamic design rules if appropriate:
       - Keep or add 'bg-primary', 'text-primary', or 'border-primary' for primary brand accents.
       - Use 'rounded-global' for all button/card/input rounded corners.
    5. Output the COMPLETE updated document (the entire updated HTML) so that the replaced section fits seamlessly.
    6. ${rangeDirectives}
  `;

  const userPrompt = `
    Larger Iframe HTML Context:
    \`\`\`html
    ${fullHtml}
    \`\`\`

    Specific Target Element to edit:
    \`\`\`html
    ${elementHtml}
    \`\`\`

    User's Instruction to modify the target element:
    "${instruction}"
    
    Aesthetics system context:
    - Primary Color: ${theme?.primaryColor}
    - Secondary Color: ${theme?.secondaryColor}
    - Radius: ${theme?.borderRadius}
    - Font Family: ${theme?.fontFamily}
  `;

  try {
    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: tempVal,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            updatedHtml: { type: Type.STRING, description: 'The complete entire HTML document with the target element modified and replaced according to instruction.' }
          },
          required: ['updatedHtml']
        }
      }
    }));

    const text = response.text;
    if (!text) {
      throw new Error('Gemini API returned an empty edit response.');
    }

    const result = JSON.parse(text);
    res.json({ success: true, updatedHtml: result.updatedHtml });
  } catch (err: any) {
    console.error('Edit Element API error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// --- API Route 3: Multi-framework code translation ---
app.post('/api/translate', async (req, res) => {
  const { code, format, frameName } = req.body;

  const systemInstruction = `
    You are an expert full-stack developer. Your task is to translate raw HTML layout blocks styled with Tailwind CSS into high-quality components.
    
    Rules for React translation:
    - Return a clean single file React functional component using TypeScript.
    - Style fully using standard Tailwind CSS utility classes.
    - Expose appropriate interactive React state or hooks where needed (e.g., active tabs, dialog status).
    - Provide logical typescript interfaces/props for customizations (e.g., title, actions).
    
    Rules for Vue translation:
    - Return a single-file Vue component (<template>, <script setup lang="ts">, <style>).
    - Style fully using standard Tailwind CSS classes.
    - Use modern Composition API setup block.

    Rules for SwiftUI translation:
    - Translate the layout into native iOS SwiftUI View code.
    - Map colors, sizing, spacing, and structural components (like VStacks, HStacks, ZStacks, ScrollView, Buttons, Text) accurately to mimic the HTML design.
    - Provide clean, modern, and compiling SwiftUI syntax with state bindings where interactive.

    Rules for Flutter translation:
    - Translate the layout into a clean, standalone Flutter Widget (Stateless or Stateful as appropriate).
    - Map Tailwind styling (flex patterns, borders, padding, shadows, colors) to equivalent Flutter Widgets (Column, Row, Container, Stack, Padding, Text, etc.).
    - Provide highly-structured, clean Dart code with proper styling attributes.
  `;

  const formatLabels: Record<string, string> = {
    react: 'React (with TypeScript)',
    vue: 'Vue SFC',
    swiftui: 'SwiftUI View',
    flutter: 'Flutter Widget'
  };

  const userPrompt = `
    Translate the following HTML layout component ("${frameName || 'StitchComponent'}") into clean ${formatLabels[format] || format}:
    
    \`\`\`html
    ${code}
    \`\`\`
    
    Do NOT output any markdown blocks (such as \`\`\`tsx, \`\`\`vue, \`\`\`swift, or \`\`\`dart) in your final response. Return ONLY the raw code string of the component.
  `;

  try {
    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      }
    }));

    const text = response.text;
    res.json({ success: true, translatedCode: text });
  } catch (err: any) {
    console.error('Translation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// --- API Route 4: Enhance Prompt ---
app.post('/api/enhance-prompt', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ success: false, error: 'A valid prompt string is required.' });
  }

  const systemInstruction = `
    You are a Stitch Prompt Engineer. Your job is to transform a vague, rough, or simple user interface generation/edit idea into a polished, structured, and optimized prompt for Stitch.

    Follow these strict guidelines:
    - If the user's prompt is a fresh page/layout generation idea, structure it like this:
      [One-line description of the page purpose and vibe]

      **DESIGN SYSTEM (REQUIRED):**
      - Platform: Web, Desktop-first (or Mobile-first if appropriate)
      - Theme: [Light/Dark], [style descriptors]
      - Background: [Color description] (#hex)
      - Primary Accent: [Color description] (#hex) for [role]
      - Text Primary: [Color description] (#hex)
      - [Additional design tokens like Buttons shape, Cards shape, shadows...]

      **Page Structure:**
      1. **[Section Name]:** [Description]
      2. **[Section Name]:** [Description]
      ...

    - If the user's prompt is a targeted edit/modification of an existing section (e.g. "add a search bar", "make it purple", "make the buttons larger"):
      [One-line description of the modification]

      **Specific changes:**
      - [Change details about location, style, icons, colors, layout]
      - [Behavior and interactive feel if any]

      **Context:** This is a targeted edit. Make only this change while preserving all existing elements.

    Do NOT output any markdown blocks (like \`\`\`markdown) in your final response. Return ONLY the raw structured text of the enhanced prompt. Keep it highly professional, clean, and concise. Do not use generic template placeholders; invent rich, functional, specific design systems and structural details that perfectly fit the user's core idea.
  `;

  try {
    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Enhance the following prompt:\n\n"${prompt}"`,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    }));

    const enhancedPrompt = response.text || '';
    res.json({ success: true, enhancedPrompt: enhancedPrompt.trim() });
  } catch (err: any) {
    console.error('Enhance prompt error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// --- Frontend Asset Handling & Vite integration ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = typeof __dirname !== 'undefined'
      ? __dirname
      : path.join(process.cwd(), 'packages/app/dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Stitch server] running at http://localhost:${PORT}`);
  });
}

startServer();
