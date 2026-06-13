"use client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

import React, { useState } from 'react'
import { IoArrowForward } from "react-icons/io5"
import { Loader2 } from "lucide-react"
import axios from "axios"
import { Doctor } from "./DoctorsList"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { AIDoctorAgents } from "@/shared/list"

interface AddNewSessionProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  preSelectedDoctor?: Doctor | null
}

function findDoctorBySymptoms(symptoms: string): Doctor {
  const specialistKeywords: Record<string, string[]> = {
    "General Physician": ["fever", "cold", "cough", "flu", "headache", "pain", "general", "health", "tired", "fatigue", "weakness"],
    "Pediatrician": ["child", "baby", "infant", "kid", "toddler", "children", "pediatric", "growth", "development"],
    "Dermatologist": ["skin", "rash", "acne", "itch", "dermatitis", "eczema", "mole", "hair", "nail", "allergy"],
    "Psychologist": ["stress", "anxiety", "depression", "mental", "mood", "sleep", "trauma", "emotion", "behavior", "panic", "fear"],
    "Nutritionist": ["diet", "weight", "nutrition", "food", "eating", "appetite", "obesity", "underweight", "meal", "vitamin", "deficiency"],
    "Cardiologist": ["heart", "chest", "blood pressure", "hypertension", "palpitation", "cardiovascular", "cholesterol"],
    "ENT Specialist": ["ear", "nose", "throat", "hearing", "sinus", "voice", "snoring", "tonsil", "neck", "smell", "taste"],
    "Orthopedic": ["bone", "joint", "muscle", "back", "spine", "knee", "shoulder", "fracture", "sprain", "arthritis"],
    "Gynecologist": ["menstrual", "period", "pregnancy", "uterus", "ovary", "vaginal", "women", "female", "reproductive", "pelvic"],
    "Dentist": ["tooth", "teeth", "gum", "dental", "mouth", "jaw", "bite", "cavity", "oral", "tongue"],
  }

  const lower = symptoms.toLowerCase()
  let bestMatch = "General Physician"
  let highest = 0

  Object.entries(specialistKeywords).forEach(([specialist, keywords]) => {
    const count = keywords.filter(k => lower.includes(k)).length
    if (count > highest) {
      highest = count
      bestMatch = specialist
    }
  })

  return (AIDoctorAgents.find(d => d.specialist === bestMatch) || AIDoctorAgents[0]) as unknown as Doctor
}

function AddNewSession({ isOpen, onOpenChange, preSelectedDoctor }: AddNewSessionProps) {
  const [note, setNote] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [suggestedDocter, setSuggestedDocter] = useState<Doctor | undefined>(preSelectedDoctor || undefined)
  const [error, setError] = useState<string>()
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | undefined>(preSelectedDoctor || undefined)
  const router = useRouter()

  const OnClickNext = () => {
    if (!note || note.trim().length < 3) {
      setError("Please provide more details about your symptoms")
      return
    }
    setError("")
    const doctor = findDoctorBySymptoms(note)
    setSuggestedDocter(doctor)
    setSelectedDoctor(doctor)
  }

  const handleStartConsultation = async () => {
    setIsLoading(true)
    const result = await axios.post("/api/session-chat", {
      notes: note,
      selectedDoctor: selectedDoctor
    })
    if (result.data.sessionId) {
      router.push(`/dashboard/medical-agent/${result.data.sessionId}`)
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {!isOpen && (
          <Button variant="outline" className='bg-primary text-white mt-3'>
            + Start a Consultation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{suggestedDocter ? 'Recommended Specialist' : 'Start Consultation'}</DialogTitle>
          <DialogDescription asChild>
            {!suggestedDocter ? (
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-bold">Add Symptoms or Any Other Details</h2>
                <Textarea
                  placeholder="Enter your symptoms or any other details"
                  className="h-[200px]"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5 mt-5">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-lg font-bold">Select the doctor</h2>
                    <div
                      className={`border-2 border-gray-200 rounded-2xl hover:border-primary/40 p-4 cursor-pointer ${selectedDoctor ? "border-primary" : ""} flex flex-col items-center justify-center text-center`}
                      onClick={() => setSelectedDoctor(suggestedDocter)}
                    >
                      <Image
                        src={suggestedDocter.image}
                        alt={suggestedDocter.specialist || "Doctor"}
                        width={70}
                        height={70}
                        className='rounded-full w-[50px] h-[50px] object-cover'
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.onerror = null
                          target.src = "/medical-assistance.png"
                        }}
                      />
                      <h2 className="font-bold mt-1">{suggestedDocter.specialist}</h2>
                      <p className="line-clamp-2 text-sm text-gray-500">{suggestedDocter.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="bg-gray-900 text-white mt-2">
              Cancel
            </Button>
          </DialogClose>
          {!suggestedDocter ? (
            <Button
              variant="outline"
              className="bg-primary text-white mt-2 flex items-center gap-2"
              disabled={!note}
              onClick={OnClickNext}
            >
              Next <IoArrowForward />
            </Button>
          ) : (
            <Button
              disabled={isLoading}
              className="bg-primary text-white mt-2 flex items-center gap-2"
              onClick={() => handleStartConsultation()}
            >
              Choose Doctor {isLoading ? <Loader2 className="animate-spin" /> : <IoArrowForward />}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddNewSession