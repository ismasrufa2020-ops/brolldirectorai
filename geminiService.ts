import { GoogleGenAI, Type } from "@google/genai";
import { Scene, ScriptAnalysisResponse } from "../types";

// Ensure API key is present
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY environment variable is missing.");
}

// We will instantiate GoogleGenAI dynamically in functions to ensure latest key usage
// but keep a default one for analysis if needed (though analysis should also probably use dynamic to be safe)
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const VISUAL_TEMPLATE = {
  "scene": "SWAP_ME",
  "style": "SWAP_ME",
  "shot": {
    "composition": "SWAP_ME",
    "camera_motion": "SWAP_ME",
    "frame_rate": "24 fps",
    "resolution": "1920 × 1080",
    "lens": "SWAP_ME",
    "look": "SWAP_ME"
    },
  "voice_over": {
    "language": "English",
    "tone": "SWAP_ME",
    "mode": "Narrative, explanatory",
    "emotion": "SWAP_ME",
    "narration_text": "SWAP_ME",
    "duration_sec": "SWAP_ME"
  },
  "house_settings": {
    "typeface": {
      "hook": "SWAP_ME",
      "subtext": "SWAP_ME"
    },
    "overlay_style": "SWAP_ME",
    "animation": {
      "enter": "SWAP_ME",
      "enter_duration_ms": 600,
      "exit": "SWAP_ME",
      "exit_duration_ms": 500
    },
    "callouts": { "stroke_px": 0, "corner_radius_px": 0 },
    "sizes": {
      "hook_font_height_pct": "SWAP_ME",
      "sublabel_font_height_pct": "SWAP_ME",
      "safe_margins_pct": 7
    }
  },
  "timeline": [
    { "time": "0.0–1.5 s", "action": "SWAP_ME" },
    { "time": "1.5–3.0 s", "action": "SWAP_ME" },
    { "time": "3.0–4.0 s", "action": "SWAP_ME" },
    { "time": "4.0–5.5 s", "action": "SWAP_ME" },
    { "time": "5.5–6.5 s", "action": "SWAP_ME" },
    { "time": "6.5–7.5 s", "action": "SWAP_ME" },
    { "time": "7.5–END",   "action": "SWAP_ME" }
  ],
  "lighting": {
    "primary": "SWAP_ME",
    "secondary": "SWAP_ME",
    "accents": "SWAP_ME"
  },
  "audio": {
    "ambient": "SWAP_ME",
    "sfx": [
      "SWAP_ME",
      "SWAP_ME",
      "SWAP_ME"
    ],
    "music": {
      "track": "SWAP_ME",
      "description": "SWAP_ME",
      "tempo": "SWAP_ME",
      "key": "SWAP_ME",
      "dynamic_curve": "SWAP_ME"
    },
    "mix": {
      "integrated_loudness": "-14 LUFS",
      "sidechain_music_db_on_impacts": -3,
      "natural_reverb": true
    }
  },
  "text_rules": {
    "emoji_policy": "no emojis",
    "contrast": "SWAP_ME"
  },
  "color_palette": {
    "background": "SWAP_ME",
    "ink_primary": "#111111",
    "ink_secondary": "#444444",
    "splatter": "#222222",
    "text_primary": "#111111"
  },
  "transitions": {
    "between_scenes": "SWAP_ME",
    "impact_frame_usage": "SWAP_ME",
    "forbidden": ["glitch", "marker squeaks", "cartoon pops"]
  },
  "vfx_rules": {
    "grain": "SWAP_ME",
    "particles": "SWAP_ME",
    "camera_shake": "SWAP_ME"
  },
  "visual_rules": {
    "prohibited_elements": ["3D dinos", "cartoon outlines", "logos"],
    "grain": "SWAP_ME",
    "sharpen": "SWAP_ME"
  },
  "export": {
    "preset": "1920x1080_h264_high",
    "target_duration_sec": "SWAP_ME"
  },
  "metadata": {
    "series": "SWAP_ME",
    "task": "SWAP_ME",
    "scene_number": "SWAP_ME",
    "tags": ["SWAP_ME", "SWAP_ME", "SWAP_ME"]
  }
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          originalText: { type: Type.STRING, description: "The description of the event or the audio transcript for this scene." },
          visualPrompt: { type: Type.STRING, description: "The filled-out JSON template string" }
        },
        required: ["originalText", "visualPrompt"]
      }
    }
  },
  required: ["scenes"]
};

// Helper to construct a plain text prompt from our complex JSON structure
const parseVisualPromptToText = (prompt: string, styleModifier: string): string => {
  let mainDescription = "";
  let details = [];

  try {
    // Try to parse as JSON first
    const jsonPrompt = JSON.parse(prompt);
    
    if (jsonPrompt.scene && jsonPrompt.scene !== "SWAP_ME") {
      mainDescription = jsonPrompt.scene;
    }

    if (jsonPrompt.shot) {
      if (jsonPrompt.shot.composition && jsonPrompt.shot.composition !== "SWAP_ME") details.push(`Shot: ${jsonPrompt.shot.composition}`);
      if (jsonPrompt.shot.camera_motion && jsonPrompt.shot.camera_motion !== "SWAP_ME") details.push(`Movement: ${jsonPrompt.shot.camera_motion}`);
    }

    if (jsonPrompt.lighting && jsonPrompt.lighting.primary && jsonPrompt.lighting.primary !== "SWAP_ME") {
      details.push(`Lighting: ${jsonPrompt.lighting.primary}`);
    }
    
    // Timeline actions are very useful for video
    if (jsonPrompt.timeline && Array.isArray(jsonPrompt.timeline)) {
        const actions = jsonPrompt.timeline
            .filter((t: any) => t.action && t.action !== "SWAP_ME")
            .map((t: any) => t.action)
            .join(", ");
        if (actions) {
            details.push(`Action: ${actions}`);
        }
    }

  } catch (e) {
    // If parsing fails, use robust fallback
    console.warn("Failed to parse visual prompt as JSON, attempting fallback extraction.");
    
    if (prompt.trim().startsWith('{')) {
        // It's likely broken JSON. Try to extract the "scene" field using regex
        const match = prompt.match(/"scene"\s*:\s*"([^"]+)"/);
        if (match && match[1] && match[1] !== "SWAP_ME") {
            mainDescription = match[1];
        } else {
             // Just clean the string and use it, limited length
             mainDescription = prompt.replace(/[{}"]/g, '').substring(0, 400);
        }
    } else {
        // It's already plain text
        mainDescription = prompt;
    }
  }

  // Ensure we have something
  if (!mainDescription) {
    mainDescription = "Cinematic B-roll footage";
  }

  const combinedDetails = details.join('. ');
  const fullPrompt = `${mainDescription}. ${combinedDetails} Style: ${styleModifier}`;
  
  // Collapse whitespace
  return fullPrompt.replace(/\s+/g, ' ').trim();
};

export const analyzeScript = async (script: string): Promise<Scene[]> => {
  try {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a professional video editor and B-roll director.
      Analyze the following video script, which may be up to 10 minutes long.
      
      Your specific task is to provide a granular, line-by-line breakdown of visual scenes.
      
      Guidelines:
      1. STRICT LINE-BY-LINE ANALYSIS: Do not group large paragraphs. Create a new visual scene for almost every sentence or distinct clause to ensure there is enough B-roll for the entire duration.
      2. For a 10-minute script, generate as many scenes as necessary to cover the audio continuously (this could be 50-100+ scenes).
      3. For each scene, provide:
         - "originalText": The exact sentence or phrase from the script.
         - "visualPrompt": You MUST use the following JSON template for the visual prompt. Fill in all "SWAP_ME" fields relevant to the scene. Return the result as a valid, minimized JSON string inside the field.
         
         Template:
         ${JSON.stringify(VISUAL_TEMPLATE)}
      
      Script:
      ${script}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const json = JSON.parse(response.text || '{"scenes": []}') as ScriptAnalysisResponse;
    return mapResponseToScenes(json);
  } catch (error) {
    console.error("Error analyzing script:", error);
    throw error;
  }
};

export const analyzeVideo = async (videoBase64: string, mimeType: string): Promise<Scene[]> => {
  try {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: videoBase64
            }
          },
          {
            text: `You are a professional video director.
            Analyze this video. We want to recreate this video shot-for-shot using AI generated stock footage (B-roll).
            
            Break the video down into chronological visual scenes.
            
            For each scene:
            1. "originalText": Describe exactly what is happening in this segment of the video, or the narration being spoken.
            2. "visualPrompt": Create a detailed instruction to generate a similar shot. You MUST use the following JSON template. Fill in all "SWAP_ME" fields to match the visual style, lighting, and composition of the source video.
            
            Template:
            ${JSON.stringify(VISUAL_TEMPLATE)}
            
            Return a JSON object with a "scenes" array.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const json = JSON.parse(response.text || '{"scenes": []}') as ScriptAnalysisResponse;
    return mapResponseToScenes(json);
  } catch (error) {
    console.error("Error analyzing video:", error);
    throw error;
  }
};

export const generateSingleVisualPrompt = async (segmentText: string): Promise<string> => {
  try {
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a professional video editor.
      Create a detailed visual prompt for the following single scene description or script segment.
      
      Segment: "${segmentText}"
      
      Task:
      Fill in the following JSON template to create a complete visual specification for this scene. Replace all "SWAP_ME" values with creative, high-quality direction suitable for an AI video/image generator.
      
      Template:
      ${JSON.stringify(VISUAL_TEMPLATE)}
      
      Return ONLY the filled-out JSON string.`,
      config: {
        responseMimeType: "application/json",
        // We use a simple schema here to just get the object directly, not wrapped in a scenes array
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                visualPrompt: { type: Type.STRING, description: "The filled-out JSON template string" }
            }
        }
      }
    });
    
    // The model might return the object wrapped or just the text, but using schema helps
    const json = JSON.parse(response.text || '{}');
    
    // Check if it returned the wrapper we asked for in schema, or if it hallucinated structure
    if (json.visualPrompt) {
        // Ensure it's pretty printed
        try {
            return JSON.stringify(JSON.parse(json.visualPrompt), null, 2);
        } catch {
            return json.visualPrompt;
        }
    }
    
    // Fallback if schema structure wasn't strictly followed but content is there
    return JSON.stringify(json, null, 2);

  } catch (error) {
    console.error("Error generating single prompt:", error);
    throw error;
  }
};

const mapResponseToScenes = (json: ScriptAnalysisResponse): Scene[] => {
  return json.scenes.map((s, index) => ({
    id: `scene-${Date.now()}-${index}`,
    originalText: s.originalText,
    // Ensure it's pretty printed if it comes back as a minified string
    visualPrompt: (() => {
      try {
        return JSON.stringify(JSON.parse(s.visualPrompt), null, 2);
      } catch {
        return s.visualPrompt;
      }
    })(),
    status: 'pending'
  }));
};

export const generateImageForScene = async (
  prompt: string, 
  styleModifier: string, 
  aspectRatio: string
): Promise<string> => {
  try {
    const fullPrompt = parseVisualPromptToText(prompt, styleModifier);
    const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await client.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio,
        outputMimeType: 'image/jpeg'
      }
    });

    const base64Image = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64Image) {
      throw new Error("No image generated");
    }

    return `data:image/jpeg;base64,${base64Image}`;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

export const generateVideoForScene = async (
  prompt: string,
  styleModifier: string,
  aspectRatio: string
): Promise<string> => {
    try {
        const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const fullPrompt = parseVisualPromptToText(prompt, styleModifier);
        
        console.log("Generating video with prompt:", fullPrompt);

        // Map app aspect ratios to Veo supported ratios (16:9 or 9:16)
        // Veo supports: '16:9' (landscape) or '9:16' (portrait)
        let veoAspectRatio = '16:9';
        if (aspectRatio === '9:16' || aspectRatio === '3:4' || aspectRatio === '1:1') {
            veoAspectRatio = '9:16';
        } else {
            veoAspectRatio = '16:9';
        }

        let operation = await client.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: fullPrompt,
            config: {
                numberOfVideos: 1,
                resolution: '1080p',
                aspectRatio: veoAspectRatio
            }
        });

        // Polling loop
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10s as recommended
            operation = await client.operations.getVideosOperation({operation: operation});
        }

        if (operation.error) {
            throw new Error(`Video generation failed: ${operation.error.message || JSON.stringify(operation.error)}`);
        }
        
        // Handle potential differences in response structure (sometimes 'result' instead of 'response' in raw operations)
        // casting to any to check for 'result' fallback
        const responseData = operation.response || (operation as any).result;

        const downloadLink = responseData?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
             console.error("Video generation response missing uri:", JSON.stringify(operation, null, 2));
             throw new Error("No video generated. The content may have been filtered by safety guidelines.");
        }

        // Fetch the video content securely using the API Key
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!videoResponse.ok) {
            throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
        }
        
        const videoBlob = await videoResponse.blob();
        return URL.createObjectURL(videoBlob);

    } catch (error) {
        console.error("Error generating video:", error);
        throw error;
    }
};