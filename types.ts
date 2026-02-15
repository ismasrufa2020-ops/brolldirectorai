export interface Scene {
  id: string;
  originalText: string;
  visualPrompt: string;
  status: 'pending' | 'generating' | 'generating-video' | 'completed' | 'error';
  imageUrl?: string;
  videoUrl?: string;
  error?: string;
}

export interface ScriptAnalysisResponse {
  scenes: {
    originalText: string;
    visualPrompt: string;
  }[];
}

export interface ImageStyle {
  id: string;
  name: string;
  promptModifier: string;
  previewColor: string;
}

export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
  WIDE = '4:3',
  TALL = '3:4',
}

export interface Session {
  id: string;
  timestamp: number;
  type: 'script' | 'video';
  name: string;
  scenes: Scene[];
}

export const VISUAL_STYLES: ImageStyle[] = [
  {
    id: 'cinematic',
    name: 'Cinematic',
    promptModifier: 'cinematic lighting, 35mm film grain, high budget movie production, bokeh, 4k, hyperrealistic',
    previewColor: 'from-blue-600 to-indigo-900'
  },
  {
    id: 'ancient',
    name: 'Ancient Cinematic',
    promptModifier: 'cinematic shot, ancient historical setting, epic scale, golden hour lighting, dust and atmosphere, 8k resolution, highly detailed textures, dramatic shadows, period accurate details',
    previewColor: 'from-amber-700 to-stone-900'
  },
  {
    id: 'photorealistic',
    name: 'Photorealistic',
    promptModifier: 'award winning photography, natural lighting, 8k resolution, highly detailed, sharp focus',
    previewColor: 'from-green-600 to-emerald-900'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    promptModifier: 'neon lights, futuristic city, cybernetic details, synthwave aesthetic, night time, rain',
    previewColor: 'from-pink-600 to-purple-900'
  },
  {
    id: 'anime',
    name: 'Anime',
    promptModifier: 'anime style, Studio Ghibli inspired, vibrant colors, detailed background, cel shaded',
    previewColor: 'from-orange-500 to-red-900'
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    promptModifier: 'watercolor painting, soft brush strokes, artistic, pastel colors, paper texture, dreamy',
    previewColor: 'from-cyan-400 to-blue-600'
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    promptModifier: 'minimalist design, clean lines, solid colors, abstract, modern art, vector style',
    previewColor: 'from-gray-400 to-gray-700'
  },
];