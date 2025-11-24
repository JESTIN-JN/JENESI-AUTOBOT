import React, { useState } from 'react';
import { MessageSquare, Video, Sparkles } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import VideoGenerator from './components/VideoGenerator';
import { AppTab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.CHAT);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col">
      {/* Header */}
      <header className="flex-none bg-slate-900/50 backdrop-blur-lg border-b border-white/5 py-4 px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 overflow-hidden">
            <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 20L35 20L50 60L50 20L65 20L65 80L50 80L35 40L35 80L20 80Z" fill="url(#grad1)"/><path d="M50 20L65 20L80 80L65 80L50 40Z" fill="url(#grad2)"/><defs><linearGradient id="grad1" x1="0" y1="0" x2="100" y2="100"><stop offset="0%" stopColor="#FF1B6D" stopOpacity="1" /><stop offset="50%" stopColor="#FF6B1B" stopOpacity="1" /><stop offset="100%" stopColor="#FFB800" stopOpacity="1" /></linearGradient><linearGradient id="grad2" x1="0" y1="0" x2="100" y2="0"><stop offset="0%" stopColor="#2D1B69" stopOpacity="1" /><stop offset="100%" stopColor="#1B2D69" stopOpacity="1" /></linearGradient></defs></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              JENESI AI
            </h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide">Your AI-Powered Assistant</p>
          </div>
        </div>

        <nav className="flex items-center bg-slate-800/50 rounded-xl p-1 border border-white/5">
          <button
            onClick={() => setActiveTab(AppTab.CHAT)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === AppTab.CHAT
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare size={16} />
            <span>Chat & Voice</span>
          </button>
          <button
            onClick={() => setActiveTab(AppTab.VIDEO)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === AppTab.VIDEO
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Video size={16} />
            <span>Veo Video</span>
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {/* Background Ambient Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow delay-75"></div>

        <div className="h-full relative z-10 transition-opacity duration-300">
          {activeTab === AppTab.CHAT ? <ChatInterface /> : <VideoGenerator />}
        </div>
      </main>
    </div>
  );
};

export default App;