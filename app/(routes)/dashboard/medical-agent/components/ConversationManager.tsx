"use client"
import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import axios from 'axios';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

interface ConversationManagerProps {
  isCallActive: boolean;
  doctorPrompt: string;
  language: 'en' | 'hi';
  onNewMessage: (message: Message) => void;
  onError: (error: string) => void;
}

export interface ConversationManagerRef {
  handleTranscript: (transcript: string, isFinal: boolean) => void;
}

const GREETINGS = {
  en: "Hello, I'm your AI medical assistant. Can you tell me your name, age and what is your problem?",
  hi: "नमस्ते, मैं आपका AI चिकित्सा सहायक हूं। कृपया मुझे अपना नाम, उम्र और अपनी समस्या बताएं।",
}

const LANGUAGE_INSTRUCTIONS = {
  en: "Respond in English only.",
  hi: "हमेशा हिंदी में जवाब दें। English का उपयोग न करें।",
}

const FALLBACK_MESSAGES = {
  en: "I'm sorry, I'm having trouble. Could you please try again?",
  hi: "माफ़ करें, कृपया पुनः प्रयास करें।",
}

function isHindi(text: string): boolean {
  return /[\u0900-\u097F]/.test(text)
}

const ConversationManager = forwardRef<ConversationManagerRef, ConversationManagerProps>(
  ({ isCallActive, doctorPrompt, language, onNewMessage, onError }, ref) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const lastTranscriptRef = useRef<string>("");
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const processingTranscriptRef = useRef<boolean>(false);

    useEffect(() => {
      if (isCallActive) {
        const initialMessage = {
          role: 'assistant' as const,
          content: GREETINGS[language] || GREETINGS.en,
          timestamp: Date.now()
        };
        setMessages([initialMessage]);
        onNewMessage(initialMessage);
      } else {
        setMessages([]);
        lastTranscriptRef.current = "";
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      }
    }, [isCallActive, language, onNewMessage]);

    const handleTranscript = (transcript: string, isFinal: boolean) => {
      if (!transcript || transcript.trim() === "" || processingTranscriptRef.current) return;
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (isFinal) {
        processTranscript(transcript);
      } else {
        silenceTimeoutRef.current = setTimeout(() => {
          if (transcript && transcript.trim() !== "") processTranscript(transcript);
        }, 2000);
      }
    };

    const translateToHindi = async (text: string): Promise<string> => {
      if (isHindi(text)) return text
      try {
        const response = await axios.post('/api/translate', {
          text,
          targetLanguage: 'hi'
        });
        const result = response.data?.translated?.trim();
        return result && isHindi(result) ? result : text
      } catch {
        return text
      }
    }

    const processTranscript = async (transcript: string) => {
      if (transcript.trim() === lastTranscriptRef.current.trim() || processingTranscriptRef.current) return;
      processingTranscriptRef.current = true;
      lastTranscriptRef.current = transcript;

      try {
        // Translate patient text to Hindi script for display
        let displayText = transcript
        if (language === 'hi') {
          displayText = await translateToHindi(transcript)
        }

        const userMessage: Message = {
          role: 'user',
          content: displayText,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMessage]);
        onNewMessage(userMessage);

        const conversationHistory = messages.map(msg => ({ role: msg.role, content: msg.content }));
        conversationHistory.push({ role: 'user', content: transcript });

        const languageInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.en;
        const fullPrompt = `${doctorPrompt || "You are a helpful AI medical assistant."}\n\nIMPORTANT: ${languageInstruction}`;

        const response = await axios.post('/api/chat', {
          messages: conversationHistory,
          doctorPrompt: fullPrompt
        });

        if (response.data && response.data.content) {
          const assistantMessage: Message = {
            role: 'assistant',
            content: response.data.content,
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, assistantMessage]);
          onNewMessage(assistantMessage);
        }
      } catch {
        onError("Error communicating with AI. Please try again.");
        const fallbackMessage: Message = {
          role: 'assistant',
          content: FALLBACK_MESSAGES[language] || FALLBACK_MESSAGES.en,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, fallbackMessage]);
        onNewMessage(fallbackMessage);
      } finally {
        processingTranscriptRef.current = false;
      }
    };

    useImperativeHandle(ref, () => ({ handleTranscript }));
    return null;
  }
);

ConversationManager.displayName = 'ConversationManager';
export default ConversationManager;