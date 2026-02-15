import React, { useState, useRef, useEffect } from 'react';
import { Clapperboard, Sparkles, Film, ArrowRight, Copy, Check, Download, Video, FileVideo, Upload, History, Clock, CreditCard, PlayCircle } from 'lucide-react';
import { Scene, VISUAL_STYLES, ImageStyle, AspectRatio, Session } from './types';
import { analyzeScript, analyzeVideo, generateImageForScene, generateSingleVisualPrompt, generateVideoForScene } from './services/geminiService';
import StyleSelector from './components/StyleSelector';
import SceneCard from './components/SceneCard';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'script' | 'video'>('script');
  
  const [script, setScript] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>(VISUAL_STYLES[0]);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(AspectRatio.LANDSCAPE);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isGeneratingAllVideos, setIsGeneratingAllVideos] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [history, setHistory] = useState<Session[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('broll-director-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveHistory = (newSession: Session) => {
    // Strip imageUrls to save space in localStorage
    const lightweightScenes = newSession.scenes.map(s => ({
      ...s,
      imageUrl: undefined,
      videoUrl: undefined
    }));
    
    const sessionToSave = { ...newSession, scenes: lightweightScenes };
    
    setHistory(prev => {
      const updated = [sessionToSave, ...prev];
      try {
        localStorage.setItem('broll-director-history', JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to save history to localStorage", e);
      }
      return [newSession, ...prev];
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 200 * 1024 * 1024) {
        alert("File size exceeds 200MB limit. Please upload a smaller video clip.");
        return;
      }
      setVideoFile(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the Data URL prefix (e.g., "data:video/mp4;base64,") to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setHasAnalyzed(false);
    
    try {
      let generatedScenes: Scene[] = [];
      let sessionName = '';

      if (activeTab === 'script') {
        if (!script.trim()) return;
        generatedScenes = await analyzeScript(script);
        sessionName = `Script: ${script.substring(0, 30)}${script.length > 30 ? '...' : ''}`;
      } else {
        if (!videoFile) return;
        const base64Video = await fileToBase64(videoFile);
        generatedScenes = await analyzeVideo(base64Video, videoFile.type);
        sessionName = `Video: ${videoFile.name}`;
      }
      
      setScenes(generatedScenes);
      setHasAnalyzed(true);

      // Save to history
      const newSession: Session = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: activeTab,
        name: sessionName,
        scenes: generatedScenes
      };
      saveHistory(newSession);

    } catch (error) {
      console.error(error);
      alert("Failed to analyze content. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadSession = (session: Session) => {
    if (window.confirm("Load this previous session? Current unsaved work will be replaced.")) {
      setScenes(session.scenes);
      setHasAnalyzed(true);
      setActiveTab(session.type);
    }
  };

  const handleUpdatePrompt = (id: string, newPrompt: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === id ? { ...scene, visualPrompt: newPrompt } : scene
    ));
  };

  const handleRegenerateVisualPrompt = async (id: string, newText: string) => {
    // Generate new specs based on the updated text
    const newVisualPrompt = await generateSingleVisualPrompt(newText);
    
    setScenes(prev => prev.map(scene => 
        scene.id === id ? { 
            ...scene, 
            originalText: newText,
            visualPrompt: newVisualPrompt,
            // Reset image status because the prompt has changed
            status: 'pending',
            imageUrl: undefined,
            videoUrl: undefined,
            error: undefined
        } : scene
    ));
  };

  const handleGenerateImage = async (id: string, prompt: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === id ? { ...scene, status: 'generating', error: undefined } : scene
    ));

    try {
      const imageUrl = await generateImageForScene(prompt, selectedStyle.promptModifier, selectedRatio);
      setScenes(prev => prev.map(scene => 
        scene.id === id ? { ...scene, status: 'completed', imageUrl, videoUrl: undefined } : scene
      ));
    } catch (error) {
      setScenes(prev => prev.map(scene => 
        scene.id === id ? { ...scene, status: 'error', error: 'Failed to generate image' } : scene
      ));
    }
  };

  const handleGenerateVideo = async (id: string, prompt: string) => {
     // Check for API Key selection (required for Veo)
     try {
       if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
         await window.aistudio.openSelectKey();
       }
     } catch (e) {
       console.error("Error checking API key status", e);
     }

    setScenes(prev => prev.map(scene => 
      scene.id === id ? { ...scene, status: 'generating-video', error: undefined } : scene
    ));

    try {
      const videoUrl = await generateVideoForScene(prompt, selectedStyle.promptModifier, selectedRatio);
      setScenes(prev => prev.map(scene => 
        scene.id === id ? { ...scene, status: 'completed', videoUrl, imageUrl: undefined } : scene
      ));
    } catch (error) {
      setScenes(prev => prev.map(scene => 
        scene.id === id ? { ...scene, status: 'error', error: 'Failed to generate video' } : scene
      ));
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
        try {
            await window.aistudio.openSelectKey();
        } catch (e) {
            console.error(e);
        }
    }
  };

  const handleGenerateAllImages = async () => {
    const pendingScenes = scenes.filter(s => !s.imageUrl && s.status !== 'generating' && s.status !== 'generating-video');
    if (pendingScenes.length === 0) return;

    setIsGeneratingAll(true);

    setScenes(prev => prev.map(s => 
      pendingScenes.some(p => p.id === s.id) 
        ? { ...s, status: 'generating', error: undefined } 
        : s
    ));

    const BATCH_SIZE = 3;
    
    for (let i = 0; i < pendingScenes.length; i += BATCH_SIZE) {
      const batch = pendingScenes.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (scene) => {
        try {
          const imageUrl = await generateImageForScene(
            scene.visualPrompt, 
            selectedStyle.promptModifier, 
            selectedRatio
          );
          
          setScenes(prev => prev.map(s => 
            s.id === scene.id ? { ...s, status: 'completed', imageUrl } : s
          ));
        } catch (error) {
          setScenes(prev => prev.map(s => 
            s.id === scene.id ? { ...s, status: 'error', error: 'Failed' } : s
          ));
        }
      }));
    }
    
    setIsGeneratingAll(false);
  };

  const handleGenerateAllVideos = async () => {
    // Check for API Key selection (required for Veo)
    try {
      if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
        await window.aistudio.openSelectKey();
      }
    } catch (e) {
      console.error("Error checking API key status", e);
      return;
    }

    const pendingScenes = scenes.filter(s => !s.videoUrl && s.status !== 'generating' && s.status !== 'generating-video');
    if (pendingScenes.length === 0) return;

    setIsGeneratingAllVideos(true);

    setScenes(prev => prev.map(s => 
      pendingScenes.some(p => p.id === s.id) 
        ? { ...s, status: 'generating-video', error: undefined } 
        : s
    ));

    const BATCH_SIZE = 2; // Keep batch size small for video generation to avoid rate limits
    
    for (let i = 0; i < pendingScenes.length; i += BATCH_SIZE) {
      const batch = pendingScenes.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (scene) => {
        try {
          const videoUrl = await generateVideoForScene(
            scene.visualPrompt, 
            selectedStyle.promptModifier, 
            selectedRatio
          );
          
          setScenes(prev => prev.map(s => 
            s.id === scene.id ? { ...s, status: 'completed', videoUrl, imageUrl: undefined } : s
          ));
        } catch (error) {
          console.error(`Error generating video for scene ${scene.id}:`, error);
          setScenes(prev => prev.map(s => 
            s.id === scene.id ? { ...s, status: 'error', error: 'Video generation failed' } : s
          ));
        }
      }));
    }
    
    setIsGeneratingAllVideos(false);
  };

  const generatePromptsText = () => {
    return scenes.map((scene, index) => (
      `SCENE ${index + 1}\n------------------\n${activeTab === 'script' ? 'SCRIPT SEGMENT' : 'VIDEO SEGMENT'}: "${scene.originalText}"\nVISUAL PROMPT: ${scene.visualPrompt}\nSTYLE: ${selectedStyle.name} (${selectedRatio})\n`
    )).join('\n\n');
  };

  const handleCopyPrompts = async () => {
    const text = generatePromptsText();
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownloadPrompts = () => {
    const text = generatePromptsText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `b-roll-prompts-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isBusy = isGeneratingAll || isGeneratingAllVideos;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              B-Roll Director <span className="text-xs font-normal text-gray-500 bg-gray-900 px-2 py-0.5 rounded border border-gray-800 ml-2">Powered by Gemini & Imagen 4</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <button 
                onClick={handleSelectKey}
                className="flex items-center gap-2 text-xs font-medium text-amber-400 bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-900/50 hover:bg-amber-900/40 transition-colors"
             >
                <CreditCard className="w-3 h-3" />
                Select Paid API Key (Required for Veo)
             </button>
            <a 
              href="https://ai.google.dev" 
              target="_blank" 
              rel="noreferrer" 
              className="text-xs font-medium text-gray-500 hover:text-indigo-400 transition-colors"
            >
              Google AI Studio
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar: Controls */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-800">
              <button
                onClick={() => setActiveTab('script')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'script' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <Film className="w-4 h-4" /> Script Mode
              </button>
              <button
                onClick={() => setActiveTab('video')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'video' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <Video className="w-4 h-4" /> Video Recreate
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'script' ? (
                <>
                  <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Input Script</h2>
                  <textarea
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[200px] resize-y"
                    placeholder="Paste your video script here... We will generate a scene for every line."
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Upload Video</h2>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-gray-950 border-2 border-dashed border-gray-800 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 hover:bg-gray-900 transition-all min-h-[200px]"
                  >
                    {videoFile ? (
                      <div className="text-center">
                        <FileVideo className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-white mb-1 truncate max-w-[200px]">{videoFile.name}</p>
                        <p className="text-xs text-gray-500">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        <p className="text-xs text-indigo-400 mt-2">Click to replace</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-300 mb-1">Click to upload video</p>
                        <p className="text-xs text-gray-500">Max size: 200MB</p>
                      </div>
                    )}
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="video/*" 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                    Upload a video to reverse-engineer its visual scenes. The AI will analyze the footage and create prompts to recreate it.
                  </p>
                </>
              )}
              
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || (activeTab === 'script' ? !script.trim() : !videoFile)}
                className={`mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all shadow-lg
                  ${isAnalyzing 
                    ? 'bg-gray-800 text-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30 hover:shadow-indigo-900/50'
                  }`}
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {activeTab === 'script' ? 'Analyze Scenes' : 'Analyze Video'}
                  </>
                )}
              </button>
            </div>
          </div>

          <StyleSelector 
            selectedStyle={selectedStyle} 
            onStyleSelect={setSelectedStyle}
            selectedRatio={selectedRatio}
            onRatioSelect={setSelectedRatio}
          />

          {/* History Section */}
          {history.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden p-6">
              <div className="flex items-center gap-2 mb-3 text-gray-300 font-medium">
                <History className="w-4 h-4 text-gray-400" />
                <span>Recent Sessions</span>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                {history.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleLoadSession(session)}
                    className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 hover:text-indigo-300 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-400 group-hover:text-indigo-400 uppercase">
                        {session.type}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-gray-600">
                        <Clock className="w-3 h-3" />
                        {new Date(session.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 truncate" title={session.name}>
                      {session.name}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {session.scenes.length} scenes
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Content: Scenes */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Scene Breakdown
              {scenes.length > 0 && (
                <span className="text-sm font-normal text-gray-500 bg-gray-900 px-2 py-0.5 rounded-full border border-gray-800">
                  {scenes.length} Scenes
                </span>
              )}
            </h2>
            
            {scenes.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-800 mr-2">
                    <button
                        onClick={handleCopyPrompts}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-all relative group"
                        title="Copy all prompts to clipboard"
                    >
                        {copySuccess ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <div className="w-px h-4 bg-gray-800 mx-1"></div>
                    <button
                        onClick={handleDownloadPrompts}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-all"
                        title="Download prompts as .txt"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </div>

                <button
                  onClick={handleGenerateAllImages}
                  disabled={isBusy}
                  className={`text-sm px-4 py-2 rounded-lg transition-colors border border-gray-700 flex items-center gap-2
                    ${isGeneratingAll 
                      ? 'bg-gray-800 text-gray-400 cursor-wait' 
                      : isBusy
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                    }`}
                >
                  {isGeneratingAll ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate All Images <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                 <button
                  onClick={handleGenerateAllVideos}
                  disabled={isBusy}
                  className={`text-sm px-4 py-2 rounded-lg transition-colors border border-purple-900/50 flex items-center gap-2
                    ${isGeneratingAllVideos 
                      ? 'bg-purple-900/20 text-purple-300 cursor-wait' 
                      : isBusy
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-purple-900/30 hover:bg-purple-900/50 text-purple-200'
                    }`}
                >
                  {isGeneratingAllVideos ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      Videos...
                    </>
                  ) : (
                    <>
                      Generate All Videos <PlayCircle className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {scenes.length === 0 && !isAnalyzing ? (
            <div className="border-2 border-dashed border-gray-800 rounded-xl p-12 text-center text-gray-500 bg-gray-900/30">
              <Film className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-400">Ready to Visualize</p>
              <p className="text-sm mt-2 max-w-md mx-auto">
                {activeTab === 'script' 
                  ? "Paste your script on the left and click \"Analyze Scenes\"." 
                  : "Upload a video on the left to reconstruct its visual scenes."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* If analyzing, show skeletons */}
              {isAnalyzing && (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl h-64 animate-pulse-slow"></div>
                  ))}
                </>
              )}

              {scenes.map((scene) => (
                <SceneCard 
                  key={scene.id} 
                  scene={scene} 
                  onGenerate={handleGenerateImage}
                  onGenerateVideo={handleGenerateVideo}
                  onUpdatePrompt={handleUpdatePrompt}
                  onRegenerateSpecs={handleRegenerateVisualPrompt}
                />
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

export default App;