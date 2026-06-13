"use client"
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import AddNewSession from './AddNewSession'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { FileText, Clock } from 'lucide-react'

type Doctor = {
  specialist: string
  image: string
}

type Session = {
  id: number
  sessionId: string
  notes: string
  createdOn: string
  selectedDocter: Doctor | null
  report: { summary: string } | null
}

function HistoryList() {
  const [history, setHistory] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/session-chat')
      setHistory(res.data || [])
    } catch (err) {
      console.error("Failed to fetch history:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric"
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="mt-10 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className='mt-10'>
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-5 mt-5 p-7 border-2 border-dashed border-gray-200 rounded-2xl">
          <Image
            src="/medical-assistance.png"
            alt="No consultations"
            width={150}
            height={150}
          />
          <h2 className="font-bold">No Consultations Yet</h2>
          <p className="text-gray-500">You don&apos;t have any consultations with any doctor yet.</p>
          <AddNewSession />
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-bold text-lg mb-4">Past Consultations</h2>
          {history.map((session) => (
            <div
              key={session.sessionId}
              className="flex items-center justify-between p-4 border rounded-xl bg-white hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => {
                if (session.report?.summary) {
                  router.push(`/dashboard/report/${session.sessionId}`)
                } else {
                  router.push(`/dashboard/medical-agent/${session.sessionId}`)
                }
              }}
            >
              <div className="flex items-center gap-3">
                {session.selectedDocter?.image ? (
                  <Image
                    src={session.selectedDocter.image}
                    alt={session.selectedDocter.specialist || "Doctor"}
                    width={44}
                    height={44}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">
                    {session.selectedDocter?.specialist || "AI Medical Agent"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {session.notes || "No notes"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-right">
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(session.createdOn)}
                </div>
                {session.report?.summary ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Report
                  </span>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                    No report
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default HistoryList
