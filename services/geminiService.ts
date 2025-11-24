import { GoogleGenAI, Modality } from "@google/genai";

// Helper to get AI instance.
const getAI = (apiKey?: string) => {
  const key = apiKey || process.env.API_KEY;
  if (!key) {
    console.warn("API Key not found in environment, relying on external injection if available.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// --- Audio Decoding Helpers (Required for raw PCM) ---
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Text Chat (Streaming) ---
export const streamChatResponse = async (history: { role: string; parts: { text: string }[] }[], newMessage: string) => {
  const ai = getAI();
  const model = "gemini-2.5-flash";
  
  const chat = ai.chats.create({
    model: model,
    history: history, 
    config: {
      // Enable Google Search to provide real-time, grounded responses like a fulfilled Dialogflow intent
      tools: [{ googleSearch: {} }],
      systemInstruction: "You are JENESI Autobot, a highly advanced AI interface designed for complex problem solving across Tech, Science, and Business domains.\n\nCapabilities & Persona:\n1. **Intent Recognition**: Immediately identify if the user needs Code (Python/React), Real-time Data (Stocks/News), or Creative Content.\n2. **Grounded Reality**: Use your search tool to provide up-to-date information when asked about current events or specific technical documentation.\n3. **Formatting**: Always use Markdown. Use fenced code blocks with language tags for code.\n4. **Tone**: Futuristic, precise, professional, yet helpful. You are the bridge between human intent and digital action.",
    }
  });

  return await chat.sendMessageStream({ message: newMessage });
};

// --- Text to Speech ---
export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  const ai = getAI();
  const model = "gemini-2.5-flash-preview-tts";

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      console.error("No audio data received");
      return null;
    }

    const outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    const audioBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, outputAudioContext);
    
    return audioBuffer;

  } catch (error) {
    console.error("TTS generation failed:", error);
    throw error;
  }
};

// --- Video Generation (Veo) ---
export const generateVideo = async (prompt: string, onStatusUpdate: (msg: string) => void): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'veo-3.1-fast-generate-preview';

  onStatusUpdate("Initializing video generation...");

  let operation = await ai.models.generateVideos({
    model: model,
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  onStatusUpdate("Dreaming up frames (this may take a moment)...");

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    onStatusUpdate("Rendering video...");
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  onStatusUpdate("Finalizing download...");
  
  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) {
    throw new Error("No video URI returned from operation.");
  }

  const finalUrl = `${videoUri}&key=${process.env.API_KEY}`;
  
  try {
    const res = await fetch(finalUrl);
    if (!res.ok) throw new Error("Failed to download video bytes");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Error fetching video blob:", e);
    throw e;
  }
};