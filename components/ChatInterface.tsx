import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { Send, Volume2, Bot, User, VolumeX, Trash2, RefreshCw, Zap, Copy, Check, Terminal, Brain, Briefcase, Calculator, ArrowDown, Sparkles, X, Lightbulb, Loader2, RotateCw } from 'lucide-react';
import { streamChatResponse, generateSpeech } from '../services/geminiService';
import { Message, Role } from '../types';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

const LOAD_BATCH_SIZE = 20;

const DEFAULT_SUGGESTIONS = [
  "Explain quantum computing",
  "Write a React hook for fetching data",
  "Business strategy for a SaaS startup",
  "Analyze the plot of Inception"
];

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: Role.MODEL,
  text: "Hello, I'm JENESI Autobot. I can chat with you, search the web, or speak my responses. How can I help you today?",
  timestamp: Date.now()
};

// --- Helper: Domain Detection & Smart Replies ---
const getMessageDomainIcon = (text: string) => {
  const lower = text.toLowerCase();
  if (/(code|function|import|const |class |return |=>)/.test(lower)) return <Terminal size={14} className="text-emerald-400" />;
  if (/(business|strategy|market|finance|roi|plan)/.test(lower)) return <Briefcase size={14} className="text-amber-400" />;
  if (/(calculate|math|equation|physics|\d+[\+\-\*\/])/.test(lower)) return <Calculator size={14} className="text-blue-400" />;
  return <Brain size={14} className="text-indigo-400" />;
};

const getSmartSuggestions = (input: string): string[] => {
  const lower = input.toLowerCase();
  if (!lower) return DEFAULT_SUGGESTIONS;
  
  if (/(code|react|js|ts|function|hook|component)/.test(lower)) {
    return ["Write a custom hook", "Optimize React render", "Explain this code", "Debug TypeScript error"];
  }
  if (/(python|data|pandas|ai|ml)/.test(lower)) {
    return ["Analyze this dataset", "Python script for automation", "Explain Neural Networks", "Pandas DataFrame help"];
  }
  if (/(biz|money|finance|market|stock)/.test(lower)) {
    return ["Market analysis", "ROI calculation", "Business model canvas", "Investment strategies"];
  }
  if (/(write|edit|email|blog|post)/.test(lower)) {
    return ["Draft a professional email", "Write a blog post", "Edit for clarity", "Creative story intro"];
  }
  if (/(science|physic|math|calc)/.test(lower)) {
    return ["Explain Quantum Mechanics", "Solve this equation", "Calculus help", "Scientific method"];
  }
  
  return ["Tell me a fun fact", "Explain complex topic", "Write some code", "Help me plan"];
};

// --- Component: Thinking Bubble ---
const ThinkingBubble = memo(() => (
  <div className="flex items-start gap-4 animate-fade-in mb-6">
    <div className="flex-none w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
       <Bot size={18} className="text-indigo-400 animate-pulse" />
    </div>
    <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl rounded-tl-none p-4 flex items-center gap-2 shadow-sm h-12">
      <div className="flex space-x-1">
        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
      </div>
    </div>
  </div>
));

// --- Component: Memoized Message Bubble ---
interface MessageBubbleProps {
  msg: Message;
  isLast: boolean;
  playingMessageId: string | null;
  onSpeak: (id: string, text: string) => void;
  onCopy: (text: string) => void;
  onRetry: () => void;
  onRegenerate: () => void;
}

const MessageBubble = memo(({ msg, isLast, playingMessageId, onSpeak, onCopy, onRetry, onRegenerate }: MessageBubbleProps) => {
  const [copied, setCopied] = useState(false);
  const isPlaying = playingMessageId === msg.id;
  const contentRef = useRef<HTMLDivElement>(null);

  const htmlContent = useMemo(() => {
    if (msg.role === Role.USER) return null;
    const rawHtml = marked.parse(msg.text, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml);
  }, [msg.text, msg.role]);

  useEffect(() => {
    if (contentRef.current && msg.role === Role.MODEL && !msg.isError) {
      const codeBlocks = contentRef.current.querySelectorAll('pre code');
      codeBlocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [htmlContent, msg.role, msg.isError]);

  const handleCopy = useCallback(() => {
    onCopy(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [msg.text, onCopy]);

  const domainIcon = useMemo(() => msg.role === Role.MODEL ? getMessageDomainIcon(msg.text) : null, [msg.text, msg.role]);

  return (
    <div
      className={`flex items-start gap-4 mb-6 ${
        msg.role === Role.USER ? 'flex-row-reverse' : 'flex-row'
      } group animate-slide-up`}
    >
      <div
        className={`flex-none w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-lg shrink-0 transition-transform duration-300 hover:scale-105 ${
          msg.role === Role.USER
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
            : msg.isError 
              ? 'bg-red-900/50 text-red-400 border border-red-800'
              : 'bg-slate-800 text-indigo-400 border border-slate-700'
        }`}
      >
        {msg.role === Role.USER ? <User size={18} /> : <Bot size={18} />}
      </div>

      <div
        className={`relative max-w-[85%] sm:max-w-[80%] rounded-2xl shadow-md overflow-hidden transition-all duration-300 ${
          msg.role === Role.USER
            ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-tr-none p-3 sm:p-4'
            : msg.isError
              ? 'bg-red-950/40 border border-red-900/50 text-red-200 p-3 sm:p-4'
              : 'bg-slate-800/80 backdrop-blur-sm border border-slate-700 text-slate-200 rounded-tl-none p-4 sm:p-5'
        }`}
      >
        {msg.role === Role.MODEL && !msg.isError && (
          <div className="absolute top-2 right-2 opacity-50 flex items-center gap-1 pointer-events-none transition-opacity duration-300 group-hover:opacity-100">
            {domainIcon}
          </div>
        )}

        {msg.role === Role.MODEL && !msg.isError ? (
          <div ref={contentRef} className="markdown-content text-sm sm:text-base leading-relaxed break-words">
            <div dangerouslySetInnerHTML={{ __html: htmlContent || '' }} />
            {msg.isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-indigo-400 animate-blink rounded-sm" />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base break-words">{msg.text}</p>
            {msg.isError && (
              <button 
                onClick={onRetry}
                className="self-start flex items-center gap-1 text-xs bg-red-900/50 hover:bg-red-800/50 text-red-200 px-3 py-1.5 rounded border border-red-800 transition-colors mt-2"
              >
                <RotateCw size={12} />
                Retry
              </button>
            )}
          </div>
        )}

        {msg.role === Role.MODEL && !msg.isStreaming && !msg.isError && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 focus-within:opacity-100 focus-within:translate-y-0">
            <button
              onClick={() => onSpeak(msg.id, msg.text)}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium ${
                isPlaying ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-indigo-400 hover:bg-white/5'
              }`}
              title={isPlaying ? "Stop speaking" : "Read aloud"}
            >
              {isPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span>{isPlaying ? 'Stop' : 'Listen'}</span>
            </button>
            
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {isLast && (
              <button
                onClick={onRegenerate}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors flex items-center gap-1.5 text-xs font-medium"
                title="Regenerate response"
              >
                <RefreshCw size={14} />
                <span>Regenerate</span>
              </button>
            )}

            <span className="text-slate-600 text-[10px] ml-auto font-mono">
              {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.msg.id === next.msg.id &&
    prev.msg.text === next.msg.text &&
    prev.msg.isStreaming === next.msg.isStreaming &&
    prev.msg.isError === next.msg.isError &&
    prev.playingMessageId === next.playingMessageId &&
    prev.isLast === next.isLast
  );
});


// --- Main Component ---
const ChatInterface: React.FC = () => {
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [hasScrolledUp, setHasScrolledUp] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('jenesi_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAllMessages(parsed);
        setDisplayedMessages(parsed.slice(-LOAD_BATCH_SIZE));
      } catch (e) {
        setAllMessages([WELCOME_MESSAGE]);
        setDisplayedMessages([WELCOME_MESSAGE]);
      }
    } else {
      setAllMessages([WELCOME_MESSAGE]);
      setDisplayedMessages([WELCOME_MESSAGE]);
    }
  }, []);

  useEffect(() => {
    if (allMessages.length > 0) {
      localStorage.setItem('jenesi_chat_history', JSON.stringify(allMessages));
    }
  }, [allMessages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const smart = getSmartSuggestions(inputText);
      setSuggestions(smart);
      if (smart.length > 0 && !isLoading) {
        setShowSuggestions(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputText, isLoading]);

  useEffect(() => {
    if (!hasScrolledUp && !isLoading && !isThinking) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    if ((isLoading || isThinking) && !hasScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [displayedMessages, isLoading, isThinking, hasScrolledUp]);

  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    if (container.scrollTop === 0 && allMessages.length > displayedMessages.length) {
      const currentLength = displayedMessages.length;
      const nextLength = Math.min(currentLength + LOAD_BATCH_SIZE, allMessages.length);
      const newBatch = allMessages.slice(-nextLength);
      
      const oldHeight = container.scrollHeight;
      setDisplayedMessages(newBatch);
      setHasScrolledUp(true);

      requestAnimationFrame(() => {
        const newHeight = container.scrollHeight;
        container.scrollTop = newHeight - oldHeight;
      });
    }

    const isAtBottom = Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 50;
    if (isAtBottom) {
      setHasScrolledUp(false);
    }
  }, [allMessages, displayedMessages]);

  const handleClearHistory = useCallback(() => {
    if (window.confirm("Are you sure you want to clear the conversation history?")) {
      const reset = [WELCOME_MESSAGE];
      setAllMessages(reset);
      setDisplayedMessages(reset);
      localStorage.removeItem('jenesi_chat_history');
      setHasScrolledUp(false);
    }
  }, []);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const handleSpeak = useCallback(async (id: string, text: string) => {
    if (playingMessageId === id) {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setPlayingMessageId(null);
      return;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    try {
      setPlayingMessageId(id);
      const cleanText = text.replace(/[*#`_]/g, ''); 
      const audioBuffer = await generateSpeech(cleanText);
      
      if (audioBuffer) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          setPlayingMessageId(null);
          audioContextRef.current = null;
        };
        source.start(0);
      } else {
        setPlayingMessageId(null);
      }
    } catch (error) {
      console.error('Error playing speech:', error);
      setPlayingMessageId(null);
    }
  }, [playingMessageId]);

  const handleSendMessage = async (textOverride?: string) => {
    const text = textOverride || inputText;
    if (!text.trim() || isLoading) return;

    setInputText('');
    setIsLoading(true);
    setIsThinking(true);
    setShowSuggestions(false);
    setHasScrolledUp(false);
    
    // Construct history for API
    // We need to filter out the potential error message if we are retrying
    // If textOverride is provided and it matches the last user message, we are effectively regenerating/retrying
    
    let updatedHistory = [...allMessages];
    const lastMsg = updatedHistory[updatedHistory.length - 1];

    // If last message was error, remove it
    if (lastMsg?.isError) {
      updatedHistory.pop();
    }

    // Logic for new message vs retry
    // If the last message is USER and matches textOverride, we don't add it again.
    const isRetryOrRegen = updatedHistory.length > 0 && updatedHistory[updatedHistory.length - 1].role === Role.USER && updatedHistory[updatedHistory.length - 1].text === text;

    if (!isRetryOrRegen) {
        const userMessage: Message = {
            id: Date.now().toString(),
            role: Role.USER,
            text: text.trim(),
            timestamp: Date.now()
        };
        updatedHistory.push(userMessage);
    }
    
    setAllMessages(updatedHistory);
    setDisplayedMessages(updatedHistory.slice(-Math.max(displayedMessages.length + (isRetryOrRegen ? 0 : 1), LOAD_BATCH_SIZE)));

    try {
      const apiHistory = updatedHistory
        .filter(m => !m.isError && m.id !== 'welcome')
        .map(m => ({
          role: m.role === Role.USER ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

      const stream = await streamChatResponse(apiHistory, text.trim());
      
      setIsThinking(false);

      const botMsgId = (Date.now() + 1).toString();
      const botMessage: Message = {
        id: botMsgId,
        role: Role.MODEL,
        text: "",
        timestamp: Date.now(),
        isStreaming: true
      };

      const withBot = [...updatedHistory, botMessage];
      setAllMessages(withBot);
      setDisplayedMessages(withBot.slice(-Math.max(displayedMessages.length + 2, LOAD_BATCH_SIZE)));

      let accumulatedText = "";
      
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
          accumulatedText += chunkText;
          setAllMessages(prev => 
             prev.map(msg => msg.id === botMsgId ? { ...msg, text: accumulatedText } : msg)
          );
          setDisplayedMessages(prev => 
             prev.map(msg => msg.id === botMsgId ? { ...msg, text: accumulatedText } : msg)
          );
        }
      }

      setAllMessages(prev => 
         prev.map(msg => msg.id === botMsgId ? { ...msg, isStreaming: false } : msg)
      );
      setDisplayedMessages(prev => 
         prev.map(msg => msg.id === botMsgId ? { ...msg, isStreaming: false } : msg)
      );

    } catch (error) {
      console.error('Error:', error);
      setIsThinking(false);
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: Role.MODEL,
        text: "I encountered a connection error. Please try again.",
        timestamp: Date.now(),
        isError: true
      };
      setAllMessages(prev => [...prev, errorMsg]);
      setDisplayedMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const onRetry = useCallback(() => {
    const history = [...allMessages];
    // Find the last user message to retry
    // If the very last message is an error, we skip it (handled in sendMessage)
    // We just need the text of the last user prompt
    const lastUserMsg = [...history].reverse().find(m => m.role === Role.USER);
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.text);
    }
  }, [allMessages]);

  const onRegenerate = useCallback(() => {
    if (isLoading) return;
    // Remove the last model message
    const history = [...allMessages];
    const lastMsg = history[history.length - 1];
    
    if (lastMsg.role === Role.MODEL) {
      history.pop(); // Remove bot response
      const lastUserMsg = history[history.length - 1];
      if (lastUserMsg && lastUserMsg.role === Role.USER) {
        setAllMessages(history);
        setDisplayedMessages(history.slice(-LOAD_BATCH_SIZE)); // Update display immediately
        handleSendMessage(lastUserMsg.text); // Send message will handle logic to not double-add user msg if text matches
      }
    }
  }, [allMessages, isLoading]);

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-2 sm:p-4 relative">
      
      <div className="flex justify-between items-center mb-2 px-2 h-8 flex-none">
         <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
           {isLoading ? (
             <>
                <Loader2 size={12} className="animate-spin text-indigo-400" />
                <span className="text-indigo-400 animate-pulse">
                  {isThinking ? 'Processing...' : 'Streaming...'}
                </span>
             </>
           ) : (
             <>
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
               <span>Online</span>
             </>
           )}
         </div>
         {allMessages.length > 1 && (
            <button 
              onClick={handleClearHistory}
              className="text-xs flex items-center gap-1 text-slate-400 hover:text-red-400 transition-colors p-1.5 rounded hover:bg-white/5"
              title="Clear Conversation History"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Clear History</span>
            </button>
         )}
      </div>

      <div 
        className="flex-1 overflow-y-auto mb-4 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent rounded-lg"
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {allMessages.length > displayedMessages.length && (
          <div className="h-10 flex items-center justify-center py-2 animate-zoom-in">
             <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        )}
        
        {displayedMessages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isLast={idx === displayedMessages.length - 1}
            playingMessageId={playingMessageId}
            onSpeak={handleSpeak}
            onCopy={handleCopy}
            onRetry={onRetry}
            onRegenerate={onRegenerate}
          />
        ))}

        {isThinking && <ThinkingBubble />}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-auto relative z-10 flex-none">
        {hasScrolledUp && (
          <button 
            onClick={() => {
              setHasScrolledUp(false);
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-800 text-indigo-400 p-3 rounded-full shadow-lg border border-slate-700 animate-bounce hover:bg-slate-700 transition-colors z-20"
          >
            <ArrowDown size={18} />
          </button>
        )}

        {showSuggestions && !isLoading && (
           <div className="flex gap-2 overflow-x-auto pb-3 mb-1 scrollbar-hide mask-fade-right animate-slide-up">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(s)}
                  className="flex-none px-4 py-2 bg-slate-800/80 hover:bg-indigo-600/20 hover:border-indigo-500/50 border border-slate-700 rounded-full text-xs sm:text-sm text-slate-300 hover:text-indigo-200 transition-all whitespace-nowrap flex items-center gap-2 group shadow-sm backdrop-blur-sm"
                >
                  {i === 0 ? <Sparkles size={12} className="text-yellow-400 group-hover:animate-spin" /> : <Lightbulb size={12} className="text-indigo-400" />}
                  {s}
                </button>
              ))}
              <button 
                onClick={() => setShowSuggestions(false)}
                className="flex-none p-2 rounded-full hover:bg-slate-800 text-slate-500 transition-colors"
                title="Hide suggestions"
              >
                <X size={14} />
              </button>
           </div>
        )}

        <div className="relative bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl p-2 flex items-end gap-2 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all duration-300 hover:border-slate-600">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about code, science, business..."
            className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder-slate-500 resize-none max-h-40 p-3 min-h-[56px] scrollbar-thin scrollbar-thumb-slate-700 text-sm sm:text-base font-sans leading-relaxed"
            rows={1}
            disabled={isLoading}
            aria-label="Message input"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className={`p-3.5 rounded-xl transition-all shadow-lg flex-none flex items-center justify-center ${
              !inputText.trim() || isLoading 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 transform hover:scale-105 active:scale-95'
            }`}
            aria-label="Send message"
          >
            {isLoading ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <Send size={20} fill="currentColor" className={inputText.trim() ? "translate-x-0.5 translate-y-[-1px]" : ""} />
            )}
          </button>
        </div>
        
        <p className="text-center text-[10px] sm:text-xs text-slate-600 mt-3 animate-fade-in">
          JENESI Autobot can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;