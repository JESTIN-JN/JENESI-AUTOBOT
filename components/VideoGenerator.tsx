import React, { useState } from 'react';
import { Film, Loader2, Play, AlertTriangle, Key } from 'lucide-react';
import { generateVideo } from '../services/geminiService';
import { VideoGenerationState } from '../types';

const VideoGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [state, setState] = useState<VideoGenerationState>({
    isGenerating: false,
    statusMessage: '',
    videoUrl: null,
    error: null,
  });
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [checkingPermission, setCheckingPermission] = useState<boolean>(false);

  // Initial permission check (simulated based on instruction assumptions)
  React.useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    setCheckingPermission(true);
    try {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasPermission(hasKey);
      }
    } catch (e) {
      console.error("Error checking API key status", e);
    } finally {
      setCheckingPermission(false);
    }
  };

  const handleRequestPermission = async () => {
    if (!window.aistudio || !window.aistudio.openSelectKey) {
      setState(prev => ({ ...prev, error: "AI Studio environment not detected." }));
      return;
    }
    try {
      await window.aistudio.openSelectKey();
      // Assume success as per instructions, do not delay
      setHasPermission(true);
      setState(prev => ({...prev, error: null}));
    } catch (e) {
      console.error("Key selection failed", e);
      setState(prev => ({ ...prev, error: "Failed to select API key." }));
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setState({
      isGenerating: true,
      statusMessage: "Initializing connection to Veo...",
      videoUrl: null,
      error: null,
    });

    try {
      const url = await generateVideo(prompt, (msg) => {
        setState(prev => ({ ...prev, statusMessage: msg }));
      });
      setState(prev => ({
        ...prev,
        isGenerating: false,
        videoUrl: url,
        statusMessage: "Generation complete!",
      }));
    } catch (error: any) {
      console.error("Video generation error:", error);
      let errorMsg = "Failed to generate video.";
      if (error.message && error.message.includes("Requested entity was not found")) {
        // Reset permission if key is invalid/not found
        setHasPermission(false);
        errorMsg = "API Key invalid or expired. Please select a key again.";
      }
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMsg,
      }));
    }
  };

  if (checkingPermission) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Loader2 className="animate-spin mb-4" />
        <p>Checking permissions...</p>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="max-w-md bg-slate-900/50 border border-slate-700 p-8 rounded-3xl backdrop-blur-sm shadow-2xl">
          <Key className="w-12 h-12 text-indigo-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Unlock Video Generation</h2>
          <p className="text-slate-400 mb-6 leading-relaxed">
            To use the advanced Veo video generation model, you need to select a billing-enabled API key from your Google Cloud project.
          </p>
          <button
            onClick={handleRequestPermission}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
          >
            Select API Key
          </button>
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noreferrer"
            className="block mt-4 text-xs text-slate-500 hover:text-indigo-400 underline"
          >
            Learn more about Gemini API billing
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-full p-4 flex flex-col">
      {/* Input Section */}
      <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-700 shadow-xl mb-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Film className="text-indigo-400" />
          <span>Veo Director</span>
        </h2>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a scene: 'A cyberpunk city with neon lights in rain, 4k cinematic...'"
            className="w-full bg-slate-800/50 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none h-32 resize-none transition-all"
            disabled={state.isGenerating}
          />
          <div className="absolute bottom-4 right-4 text-xs text-slate-500">
            Powered by Veo
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={state.isGenerating || !prompt.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2"
          >
            {state.isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                <span>Generate Video</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output / Status Section */}
      <div className="flex-1 min-h-0 bg-slate-900/30 rounded-3xl border border-slate-800/50 p-6 flex flex-col items-center justify-center relative overflow-hidden">
        
        {state.error && (
          <div className="text-red-400 flex flex-col items-center gap-2 bg-red-900/20 p-4 rounded-xl border border-red-900/50">
            <AlertTriangle />
            <span className="text-center">{state.error}</span>
          </div>
        )}

        {state.isGenerating && (
          <div className="text-center z-10">
            <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Creating Magic</h3>
            <p className="text-indigo-300 animate-pulse">{state.statusMessage}</p>
          </div>
        )}

        {!state.isGenerating && !state.videoUrl && !state.error && (
          <div className="text-center text-slate-500">
            <Film size={48} className="mx-auto mb-4 opacity-20" />
            <p>Your generated video will appear here.</p>
          </div>
        )}

        {state.videoUrl && (
          <div className="w-full h-full flex items-center justify-center animate-in fade-in zoom-in duration-500">
            <video 
              controls 
              autoPlay 
              loop 
              className="max-h-full max-w-full rounded-lg shadow-2xl ring-1 ring-slate-700/50"
              src={state.videoUrl}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoGenerator;