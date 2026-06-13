"use client"
import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "axios"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, FileText, User, Stethoscope, Clock } from "lucide-react"

type Message = {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

type Doctor = {
  specialist: string
  image: string
  voiceId: string
}

type Session = {
  sessionId: string
  notes: string
  createdOn: string
  selectedDocter: Doctor | null
  conversation: Message[] | null
  report: { summary: string; generatedAt: string } | null
}

export default function ReportPage() {
  const { sessionId } = useParams()
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sessionId) fetchSession()
  }, [sessionId])

  const fetchSession = async () => {
    try {
      const res = await axios.get(`/api/session-chat?sessionId=${sessionId}`)
      setSession(res.data)
    } catch (err) {
      console.error("Failed to load report:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!printRef.current || !session) return
    const content = printRef.current.innerText
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `consultation-report-${session.sessionId.slice(0, 8)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => window.print()

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      })
    } catch {
      return dateStr
    }
  }

  // Render the AI summary with bold section headers
  const renderSummary = (summary: string) => {
    return summary.split("\n").map((line, i) => {
      const boldMatch = line.match(/^\*\*(.+?)\*\*(.*)$/)
      if (boldMatch) {
        return (
          <p key={i} className="mt-4 mb-1">
            <span className="font-semibold text-gray-900">{boldMatch[1]}</span>
            <span className="text-gray-700">{boldMatch[2]}</span>
          </p>
        )
      }
      if (line.trim() === "") return <br key={i} />
      return <p key={i} className="text-gray-700 leading-relaxed">{line}</p>
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-500">Loading report...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Report not found.</p>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  const messages: Message[] = (session.conversation as Message[]) || []
  const doctor = session.selectedDocter
  const doctorName = doctor?.specialist || "AI Doctor"

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* Action Bar */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-6 print:hidden">
        <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Download
          </Button>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Report Document */}
      <div ref={printRef} className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border p-8 print:shadow-none print:border-none">

        {/* Header */}
        <div className="flex items-start justify-between border-b pb-6 mb-6">
          <div className="flex items-center gap-4">
            {doctor?.image && (
              <Image
                src={doctor.image}
                alt={doctorName}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Consultation Report</h1>
              <p className="text-gray-500 mt-1">Dr. {doctorName} · AI Medical Agent</p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-400">
            <div className="flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" />
              {formatDate(session.createdOn)}
            </div>
            <p className="mt-1 font-mono text-xs">ID: {session.sessionId.slice(0, 12)}...</p>
          </div>
        </div>

        {/* Patient Notes */}
        {session.notes && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-sm font-semibold text-blue-700 mb-1">Patient's Initial Concern</h2>
            <p className="text-gray-700">{session.notes}</p>
          </div>
        )}

        {/* AI Summary */}
        {session.report?.summary ? (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              Medical Summary
            </h2>
            <div className="bg-gray-50 rounded-xl p-6 border">
              {renderSummary(session.report.summary)}
            </div>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-yellow-700 text-sm">Report summary not yet generated. End the call to generate a report.</p>
          </div>
        )}

        {/* Full Transcript */}
        {messages.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Full Conversation Transcript
            </h2>
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                    ${msg.role === "assistant" ? "bg-blue-500" : "bg-gray-400"}`}>
                    {msg.role === "assistant"
                      ? <Stethoscope className="w-4 h-4" />
                      : <User className="w-4 h-4" />
                    }
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                    ${msg.role === "assistant"
                      ? "bg-blue-50 text-gray-800 rounded-tl-none"
                      : "bg-gray-100 text-gray-800 rounded-tr-none"
                    }`}>
                    <p className={`text-xs font-semibold mb-1 ${msg.role === "assistant" ? "text-blue-600" : "text-gray-500"}`}>
                      {msg.role === "assistant" ? `Dr. ${doctorName}` : "Patient"}
                    </p>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t text-center text-xs text-gray-400">
          <p>This report was generated by an AI medical assistant and is for informational purposes only.</p>
          <p className="mt-1">It does not constitute professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.</p>
        </div>
      </div>
    </div>
  )
}
