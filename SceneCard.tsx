import React, { useState, useRef, useEffect } from 'react';
import { Scene } from '../types';
import { Image as ImageIcon, RefreshCw, Wand2, Download, AlertCircle, Edit3, Copy, Check, Video, Play, Pause } from 'lucide-react';

interface SceneCardProps {
  scene: Scene;
  onGenerate: (id: string, prompt: string) => void;
  onGenerateVideo: (id: string, prompt: string) => void;
  onUpdatePrompt: (id: string, newPrompt: string) => void;
  onRegenerateSpecs: (id: string, newText: string) => Promise<void>;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, onGenerate, onGenerateVideo, onUpdatePrompt, onRegenerateSpecs }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(scene.visualPrompt);
  const [localScriptText, setLocalScriptText] = useState(scene.originalText);
  const [isCopied, setIsCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleGenerateClick = () => {
    setIsEditing(false);
    onUpdatePrompt(scene.id, localPrompt);
    onGenerate(scene.id, localPrompt);
  };

  const handleGenerateVideoClick = () => {
    setIsEditing(false);
    onUpdatePrompt(scene.id, localPrompt);
    onGenerateVideo(scene.id, localPrompt);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    onUpdatePrompt(scene.id, localPrompt);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(scene.visualPrompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleRegenerateSpecsClick = async () => {
    if (!localScriptText.trim()) return;
    setIsRegenerating(true);
    try {
        await onRegenerateSpecs(scene.id, localScriptText);
        setIsEditingScript(false);
    } catch (e) {
        console.error("Failed to regenerate specs", e);
    } finally {
        setIsRegenerating(false);
    }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
      <div className="grid md:grid-cols-2 gap-0">
        
        {/* Left Side: Script & Prompts */}
        <div className="p-5 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-800">
          <div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Original Script Segment</h3>
                {!isEditingScript && (
                    <button 
                        onClick={() => setIsEditingScript(true)}
                        className="text-gray-500 hover:text-indigo-400 transition-colors"
                        title="Edit script segment"
                    >
                        <Edit3 className="w-3 h-3" />
                    </button>
                )}
              </div>
              
              {isEditingScript ? (
                  <div className="space-y-2">
                      <textarea
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          rows={3}
                          value={localScriptText}
                          onChange={(e) => setLocalScriptText(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                            onClick={() => {
                                setIsEditingScript(false);
                                setLocalScriptText(scene.originalText);
                            }}
                            className="text-xs px-2 py-1 hover:bg-gray-800 rounded text-gray-400"
                            disabled={isRegenerating}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRegenerateSpecsClick}
                            className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded flex items-center gap-1"
                            disabled={isRegenerating}
                        >
                            {isRegenerating ? (
                                <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    Regenerating...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-3 h-3" />
                                    Regenerate Specs
                                </>
                            )}
                        </button>
                      </div>
                  </div>
              ) : (
                <p className="text-gray-300 italic text-sm leading-relaxed border-l-2 border-gray-700 pl-3">
                    "{scene.originalText}"
                </p>
              )}
            </div>

            <div className="mb-4">
               <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                   <Wand2 className="w-3 h-3" /> Visual Prompt Specs
                 </h3>
                 <div className="flex items-center gap-2">
                   {!isEditing && (
                     <>
                      <button
                        onClick={handleCopyPrompt}
                        className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"
                        title="Copy Prompt"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        {isCopied && <span className="text-green-400">Copied</span>}
                      </button>
                      <div className="w-px h-3 bg-gray-700"></div>
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
                        title="Edit Prompt Manually"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                     </>
                   )}
                 </div>
               </div>
               
               {isEditing ? (
                 <div className="space-y-2">
                   <textarea
                     className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-xs font-mono text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                     rows={15}
                     value={localPrompt}
                     onChange={(e) => setLocalPrompt(e.target.value)}
                   />
                   <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="text-xs px-2 py-1 hover:bg-gray-800 rounded text-gray-400"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveEdit}
                        className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded"
                      >
                        Save
                      </button>
                   </div>
                 </div>
               ) : (
                 <pre className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap font-mono bg-black/20 p-3 rounded border border-gray-800/50 max-h-[300px] overflow-y-auto custom-scrollbar">
                   {scene.visualPrompt}
                 </pre>
               )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleGenerateClick}
              disabled={scene.status === 'generating' || scene.status === 'generating-video'}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all text-sm
                ${scene.status === 'generating' 
                  ? 'bg-gray-800 text-gray-400 cursor-wait' 
                  : scene.imageUrl && !scene.videoUrl
                    ? 'bg-gray-800 hover:bg-gray-700 text-indigo-300 border border-indigo-900/30' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                }`}
            >
              {scene.status === 'generating' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  Image
                </>
              )}
            </button>

            <button
              onClick={handleGenerateVideoClick}
              disabled={scene.status === 'generating' || scene.status === 'generating-video'}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all text-sm
                ${scene.status === 'generating-video'
                  ? 'bg-gray-800 text-gray-400 cursor-wait'
                  : scene.videoUrl
                    ? 'bg-gray-800 hover:bg-gray-700 text-purple-300 border border-purple-900/30'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'
                }`}
            >
                {scene.status === 'generating-video' ? (
                    <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <Video className="w-4 h-4" />
                        Video
                    </>
                )}
            </button>
          </div>
          {scene.error && (
            <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {scene.error}
            </p>
          )}
        </div>

        {/* Right Side: Media Preview */}
        <div className="bg-black/40 min-h-[300px] md:min-h-auto relative group flex items-center justify-center">
          {scene.videoUrl ? (
            <>
                <video 
                    ref={videoRef}
                    src={scene.videoUrl} 
                    className="w-full h-full object-cover absolute inset-0"
                    controls
                    autoPlay
                    loop
                    muted
                />
                 <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <a 
                    href={scene.videoUrl} 
                    download={`broll-scene-${scene.id}.mp4`}
                    className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-lg text-white transition-all"
                    title="Download Video"
                    >
                    <Download className="w-4 h-4" />
                    </a>
                </div>
            </>
          ) : scene.imageUrl ? (
            <>
              <img 
                src={scene.imageUrl} 
                alt="Generated B-roll" 
                className="w-full h-full object-cover absolute inset-0"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <a 
                  href={scene.imageUrl} 
                  download={`broll-scene-${scene.id}.jpg`}
                  className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all"
                  title="Download Image"
                >
                  <Download className="w-6 h-6" />
                </a>
              </div>
            </>
          ) : (
            <div className="text-gray-700 flex flex-col items-center gap-3 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center border border-gray-800">
                <div className="flex gap-2">
                    <ImageIcon className="w-6 h-6 opacity-20" />
                    <Video className="w-6 h-6 opacity-20" />
                </div>
              </div>
              <p className="text-sm">Generated content will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SceneCard;