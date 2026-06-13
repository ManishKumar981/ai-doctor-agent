"use client"
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';

interface TextToSpeechProps {
  text: string;
  voiceId?: string;
  doctorId?: number;
  language?: 'en' | 'hi' | 'te';
  onSpeakingStart: () => void;
  onSpeakingEnd: () => void;
  onError: (error: string) => void;
}

export interface TextToSpeechRef {
  stopSpeaking: () => void;
}

const LANG_CODES: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  te: 'te-IN',
}

// Google Translate TTS — works for Telugu, Hindi, English without API key
function getGoogleTTSUrl(text: string, lang: string): string {
  const shortened = text.slice(0, 200) // Google TTS limit
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(shortened)}&tl=${lang}&client=tw-ob`
}

const TextToSpeech = forwardRef<TextToSpeechRef, TextToSpeechProps>((
  { text, voiceId = 'will', doctorId, language = 'en', onSpeakingStart, onSpeakingEnd, onError },
  ref
) => {
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [pendingText, setPendingText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const previousTextRef = useRef<string>("");
  const speechSynthesisUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useImperativeHandle(ref, () => ({ stopSpeaking: () => { stopSpeaking(); } }));

  useEffect(() => {
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();
      audioElementRef.current.crossOrigin = "anonymous";
      audioElementRef.current.addEventListener('ended', handleAudioEnded);
      audioElementRef.current.addEventListener('error', handleAudioError);
    }
    return () => {
      stopSpeaking();
      if (audioElementRef.current) {
        audioElementRef.current.removeEventListener('ended', handleAudioEnded);
        audioElementRef.current.removeEventListener('error', handleAudioError);
        audioElementRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (text && text.trim() !== '' && text !== previousTextRef.current) {
      previousTextRef.current = text;
      if (isProcessing) { setPendingText(text); } else { processText(text); }
    }
  }, [text]);

  useEffect(() => {
    if (!isProcessing && pendingText) {
      const textToProcess = pendingText;
      setPendingText("");
      processText(textToProcess);
    }
  }, [isProcessing, pendingText]);

  const handleAudioEnded = () => { setIsProcessing(false); onSpeakingEnd(); };
  const handleAudioError = async () => {
    // If Google TTS fails, fallback to browser TTS
    console.log("Audio error, falling back to browser TTS");
    setIsProcessing(false);
    onSpeakingEnd();
  };

  const stopSpeaking = () => {
    if (audioElementRef.current) { audioElementRef.current.pause(); audioElementRef.current.src = ''; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    speechSynthesisUtteranceRef.current = null;
    setIsProcessing(false);
    setPendingText("");
  };

  const processText = async (textToSpeak: string) => {
    if (!textToSpeak || textToSpeak.trim() === '') return;
    stopSpeaking();
    setIsProcessing(true);
    onSpeakingStart();

    // For Hindi and Telugu — use Google Translate TTS (supports both languages)
    if (language === 'hi' || language === 'te') {
      await playGoogleTTS(textToSpeak, language);
      return;
    }

    // For English — try Murf AI first, fallback to browser TTS
    try {
      const response = await axios.post('/api/tts', {
        text: textToSpeak, voiceId, doctorId
      }, {
        responseType: 'blob',
        validateStatus: (status) => status < 500
      });

      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('audio')) {
        const audioUrl = URL.createObjectURL(response.data);
        if (audioElementRef.current) {
          audioElementRef.current.src = audioUrl;
          try {
            await audioElementRef.current.play();
          } catch {
            setIsProcessing(false);
            onSpeakingEnd();
            await playBrowserTTS(textToSpeak, 'en');
          }
        }
      } else {
        await playBrowserTTS(textToSpeak, 'en');
      }
    } catch {
      setIsProcessing(false);
      await playBrowserTTS(textToSpeak, 'en');
    }
  };

  // Google Translate TTS — works for te and hi reliably
  const playGoogleTTS = async (textToSpeak: string, lang: string): Promise<void> => {
    try {
      const googleLangCode = lang === 'te' ? 'te' : 'hi';
      const url = getGoogleTTSUrl(textToSpeak, googleLangCode);

      if (audioElementRef.current) {
        audioElementRef.current.src = url;
        try {
          await audioElementRef.current.play();
          // onSpeakingEnd fires via 'ended' event listener
        } catch (err) {
          console.error("Google TTS failed, using browser TTS:", err);
          setIsProcessing(false);
          onSpeakingEnd();
          // Final fallback — browser TTS with best available voice
          await playBrowserTTS(textToSpeak, lang);
        }
      }
    } catch {
      setIsProcessing(false);
      onSpeakingEnd();
      await playBrowserTTS(textToSpeak, lang);
    }
  };

  const playBrowserTTS = (textToSpeak: string, lang: string = 'en'): Promise<void> => {
    return new Promise((resolve) => {
      try {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          speechSynthesisUtteranceRef.current = utterance;

          // Try exact language match first, then partial, then default
          const voices = window.speechSynthesis.getVoices();
          const langCode = LANG_CODES[lang] || 'en-US';
          const exactVoice = voices.find(v => v.lang === langCode);
          const partialVoice = voices.find(v => v.lang.startsWith(lang));
          const englishVoice = voices.find(v => v.lang.startsWith('en'));
          utterance.voice = exactVoice || partialVoice || englishVoice || voices[0];
          utterance.lang = langCode;
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          utterance.onend = () => { setIsProcessing(false); onSpeakingEnd(); resolve(); };
          utterance.onerror = () => { setIsProcessing(false); onSpeakingEnd(); resolve(); };
          window.speechSynthesis.speak(utterance);
        } else {
          setIsProcessing(false);
          onSpeakingEnd();
          resolve();
        }
      } catch {
        setIsProcessing(false);
        onSpeakingEnd();
        resolve();
      }
    });
  };

  return null;
});

TextToSpeech.displayName = 'TextToSpeech';
export default TextToSpeech;