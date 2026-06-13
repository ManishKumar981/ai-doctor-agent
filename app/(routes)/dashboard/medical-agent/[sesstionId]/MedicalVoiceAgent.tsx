"use client"
import axios from 'axios'
import { useParams, useRouter } from 'next/navigation'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Circle, PhoneCall, StopCircle, FileText, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Doctor } from '../../_components/DoctorsList'
import AudioProcessor from '../components/AudioProcessor'
import TextToSpeech, { TextToSpeechRef } from '../components/TextToSpeech'
import ConversationDisplay from '../components/ConversationDisplay'
import ConversationManager, { Message, ConversationManagerRef } from '../components/ConversationManager'
import VoiceRecordButton from '../components/VoiceRecordButton'
import TranscriptionLoading from '../components/TranscriptionLoading'
import { convertAudioToText } from '../services/speechToText'

type Session = {
  id: number
  notes: string
  sessionId: string
  report: Record<string, unknown>
  selectedDocter: Doctor | null
  createdOn: string
}

export type Language = 'en' | 'hi' 

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
]

function MedicalVoiceAgent() {
  const { sesstionId } = useParams()
  const router = useRouter()

  const [session, setSession] = useState<Session>()
  const [doctorImage, setDoctorImage] = useState<string | null>(null)
  const [doctorSpecialist, setDoctorSpecialist] = useState<string>("")
  const [doctorPrompt, setDoctorPrompt] = useState<string>("")
  const [doctorId, setDoctorId] = useState<number | undefined>(undefined)

  const [isCallActive, setIsCallActive] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportReady, setReportReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en')

  const [messages, setMessages] = useState<Message[]>([])
  const [userCaption, setUserCaption] = useState<string>("")
  const [assistantCaption, setAssistantCaption] = useState<string>("")
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentAssistantText, setCurrentAssistantText] = useState<string>("")

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const conversationManagerRef = useRef<ConversationManagerRef>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const textToSpeechRef = useRef<TextToSpeechRef>(null)
  const messagesRef = useRef<Message[]>([])

  useEffect(() => { messagesRef.current = messages }, [messages])

  useEffect(() => {
    if (sesstionId) getSessionDetails()
    return () => { stopCallCleanup() }
  }, [sesstionId])

  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isCallActive])

  const getSessionDetails = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await axios.get(`/api/session-chat?sessionId=${sesstionId}`)
      setSession(response.data)
      if (response.data?.selectedDocter) {
        const doctorData = response.data.selectedDocter
        setDoctorImage(doctorData.image || null)
        setDoctorSpecialist(doctorData.specialist || "AI Medical Agent")
        setDoctorPrompt(doctorData.agentPrompt || "")
        setDoctorId(doctorData.id)
      }
      if (response.data?.report?.summary) setReportReady(true)
      setIsLoading(false)
    } catch (error: unknown) {
      setError("Failed to load session details. Using default settings.")
      setIsLoading(false)
      setDoctorSpecialist("AI Medical Agent")
      setDoctorImage("/doctor1.png")
      setDoctorId(1)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startCall = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setReportReady(false)
      setIsCallActive(true)
      setIsLoading(false)
    } catch {
      setError("Could not start call. Please try again.")
      setIsLoading(false)
    }
  }

  const stopCallCleanup = () => {
    setIsCallActive(false)
    if (textToSpeechRef.current) textToSpeechRef.current.stopSpeaking()
    if (audioElementRef.current) { audioElementRef.current.pause(); audioElementRef.current.src = '' }
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setIsListening(false)
    setIsSpeaking(false)
    setIsTranscribing(false)
    setUserCaption("")
    setAssistantCaption("")
    setCurrentAssistantText("")
    setCallDuration(0)
  }

  const stopCall = async () => {
    const currentMessages = messagesRef.current
    stopCallCleanup()
    if (currentMessages.length > 1) {
      setIsGeneratingReport(true)
      try {
        await axios.post('/api/generate-report', {
          sessionId: sesstionId,
          messages: currentMessages,
          doctorSpecialist,
          doctorName: session?.selectedDocter?.specialist,
          language: selectedLanguage,
        })
        setReportReady(true)
      } catch {
        setError("Call ended. Report generation failed — please try again.")
      } finally {
        setIsGeneratingReport(false)
        setMessages([])
      }
    } else {
      setMessages([])
    }
  }

  const handleTranscript = useCallback((transcript: string, isFinal: boolean) => {
    setUserCaption(transcript)
    if (conversationManagerRef.current) {
      conversationManagerRef.current.handleTranscript(transcript, isFinal)
    }
  }, [])

  const handleNewMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const exists = prev.some(m =>
        m.role === message.role && m.content === message.content &&
        Math.abs(m.timestamp - message.timestamp) < 1000
      )
      if (exists) return prev
      return [...prev, message]
    })
    if (message.role === 'assistant') {
      setAssistantCaption(message.content)
      setCurrentAssistantText(message.content)
    }
  }, [])

  const handleSpeakingStart = useCallback(() => { setIsSpeaking(true); setIsListening(false) }, [])
  const handleSpeakingEnd = useCallback(() => {
    setIsSpeaking(false)
    setTimeout(() => { if (isCallActive) setIsListening(true) }, 500)
  }, [isCallActive])
  const handleError = useCallback((errorMessage: string) => { setError(errorMessage) }, [])

  const handleRecordingComplete = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true)
      setError(null)
      const transcript = await convertAudioToText(audioBlob)
      setUserCaption(transcript)
      if (conversationManagerRef.current) {
        conversationManagerRef.current.handleTranscript(transcript, true)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Recording error: ${errorMessage}`)
    } finally {
      setIsTranscribing(false)
    }
  }

  return (
    <div className='p-5 border-2 rounded-xl bg-secondary'>
      <div className='flex items-center justify-between'>
        <h2 className='p-1 px-2 border rounded-md flex items-center gap-2'>
          {isCallActive
            ? <><Circle className="text-green-500 animate-pulse" /> Connected</>
            : <><Circle /> Not Connected</>
          }
        </h2>
        <h2 className='text-xl font-bold text-gray-500'>{formatTime(callDuration)}</h2>
      </div>

      <div className='flex flex-col items-center gap-2 mt-6 justify-center'>
        {doctorImage ? (
          <Image src={doctorImage} alt={doctorSpecialist || "AI Doctor"} width={120} height={120}
            className='w-[100px] h-[100px] object-cover rounded-full' />
        ) : (
          <div className='w-[100px] h-[100px] bg-gray-200 rounded-full flex items-center justify-center'>
            <span className='text-gray-400'>No Image</span>
          </div>
        )}

        <div className='flex flex-col items-center justify-center w-full'>
          <h2 className='text-lg font-bold mt-2'>{doctorSpecialist}</h2>
          <p className='text-sm text-gray-500'>AI Medical Agent</p>

          {!isCallActive && (
            <div className='flex items-center gap-2 mt-4'>
              <span className='text-sm text-gray-500 font-medium'>Language:</span>
              <div className='flex gap-2'>
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all
                      ${selectedLanguage === lang.code
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                  >
                    {lang.flag} {lang.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isCallActive && (
            <div className='mt-2'>
              <span className='text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium'>
                {LANGUAGES.find(l => l.code === selectedLanguage)?.flag}{' '}
                {LANGUAGES.find(l => l.code === selectedLanguage)?.label}
              </span>
            </div>
          )}

          {error && <p className='text-red-500 text-sm mt-2 text-center'>{error}</p>}

          <ConversationDisplay
            messages={messages}
            userCaption={userCaption}
            assistantCaption={assistantCaption}
            isCallActive={isCallActive}
            isListening={isListening}
            isSpeaking={isSpeaking}
            language={selectedLanguage}
          />

          <div className="flex flex-col items-center gap-3 mt-6">
            {!isCallActive ? (
              <Button className='flex items-center justify-center' onClick={startCall}
                disabled={isLoading || isGeneratingReport}>
                {isLoading ? "Loading..." : <><PhoneCall className='w-4 h-4 mr-2' /> Start Call</>}
              </Button>
            ) : (
              <Button className='flex items-center justify-center bg-red-500 hover:bg-red-600'
                onClick={stopCall} disabled={isLoading}>
                <StopCircle className='w-4 h-4 mr-2' /> End Call
              </Button>
            )}

            {isGeneratingReport && (
              <div className='flex items-center gap-2 text-sm text-gray-500'>
                <Loader2 className='w-4 h-4 animate-spin' />
                Generating consultation report...
              </div>
            )}

            {reportReady && !isCallActive && !isGeneratingReport && (
              <Button variant="outline"
                className='flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50'
                onClick={() => router.push(`/dashboard/report/${sesstionId}`)}>
                <FileText className='w-4 h-4' /> View Consultation Report
              </Button>
            )}
          </div>
        </div>
      </div>

      {isCallActive && (
        <>
          <AudioProcessor isCallActive={isCallActive} isListening={isListening}
            onTranscriptReceived={handleTranscript} onError={handleError} />
          <TextToSpeech ref={textToSpeechRef} text={currentAssistantText}
            voiceId={session?.selectedDocter?.voiceId} doctorId={doctorId}
            language={selectedLanguage}
            onSpeakingStart={handleSpeakingStart} onSpeakingEnd={handleSpeakingEnd} onError={handleError} />
          <ConversationManager ref={conversationManagerRef} isCallActive={isCallActive}
            doctorPrompt={doctorPrompt} language={selectedLanguage}
            onNewMessage={handleNewMessage} onError={handleError} />
          <div className="mt-4 flex justify-center">
            <VoiceRecordButton isCallActive={isCallActive} onRecordingComplete={handleRecordingComplete} />
          </div>
          <TranscriptionLoading isLoading={isTranscribing} />
        </>
      )}
    </div>
  )
}

export default MedicalVoiceAgent