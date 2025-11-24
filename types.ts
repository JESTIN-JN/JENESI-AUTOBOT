export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  isAudio?: boolean;
  timestamp: number;
  isStreaming?: boolean;
  isError?: boolean;
}

export enum AppTab {
  CHAT = 'chat',
  VIDEO = 'video',
}

export interface VideoGenerationState {
  isGenerating: boolean;
  statusMessage: string;
  videoUrl: string | null;
  error: string | null;
}

// Augment window to include AI Studio global helpers for Veo
declare global {
  // We augment the AIStudio interface which is expected by the existing window.aistudio declaration.
  // This avoids "Subsequent property declarations must have the same type" errors.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // window.aistudio is already defined in the environment with type AIStudio.
    // We do not redeclare it here to avoid conflicts.
    webkitAudioContext: typeof AudioContext;
  }
}