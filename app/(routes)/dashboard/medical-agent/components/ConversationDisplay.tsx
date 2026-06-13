"use client"
import { Message } from './ConversationManager';
import { Mic, MicOff } from 'lucide-react';

interface ConversationDisplayProps {
  messages: Message[];
  userCaption: string;
  assistantCaption: string;
  isCallActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  language?: 'en' | 'hi' | 'te';
}

const LABELS = {
  en: { doctor: '🩺 Doctor', user: '👤 User' },
  hi: { doctor: '🩺 डॉक्टर', user: '👤 मरीज़' },
  te: { doctor: '🩺 డాక్టర్', user: '👤 రోగి' },
}

const ConversationDisplay = ({
  userCaption,
  assistantCaption,
  isCallActive,
  isListening,
  isSpeaking,
  language = 'en'
}: ConversationDisplayProps) => {
  const labels = LABELS[language] || LABELS.en;

  return (
    <div className='flex flex-col gap-2 mt-6 w-full max-w-lg'>
      <div className='border p-3 rounded-md bg-gray-50 min-h-[44px] flex justify-between items-center'>
        <p className='text-sm text-blue-500'>{labels.doctor}: {assistantCaption}</p>
        {isCallActive && isSpeaking && (
          <div className="flex space-x-1 ml-2 flex-shrink-0">
            <div className="w-1 h-4 bg-blue-500 animate-pulse rounded-full"></div>
            <div className="w-1 h-4 bg-blue-500 animate-pulse rounded-full"></div>
            <div className="w-1 h-4 bg-blue-500 animate-pulse rounded-full"></div>
          </div>
        )}
      </div>

      <div className='border p-3 rounded-md bg-gray-50 min-h-[44px] flex justify-between items-center'>
        <p className='text-sm text-gray-500'>{labels.user}: {userCaption}</p>
        {isCallActive && (
          <div className="ml-2 flex-shrink-0">
            {isListening
              ? <Mic className="h-4 w-4 text-green-500 animate-pulse" />
              : <MicOff className="h-4 w-4 text-gray-400" />
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationDisplay;