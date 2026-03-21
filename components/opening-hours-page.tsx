"use client"

import { useState } from "react"
import { ChevronLeft, ChevronUp, ChevronDown, Loader2 } from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { OpeningHour } from "@/lib/store-data"

interface OpeningHoursPageProps {
  openingHours: OpeningHour[]
  storeId: string
  onBack: () => void
  onSave: (hours: OpeningHour[]) => void
}

function TimePickerInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [hours, minutes] = value.split(":").map((v) => parseInt(v) || 0)

  const incrementHour = () => {
    const newHour = hours >= 23 ? 0 : hours + 1
    onChange(`${String(newHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`)
  }

  const decrementHour = () => {
    const newHour = hours <= 0 ? 23 : hours - 1
    onChange(`${String(newHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`)
  }

  const incrementMinute = () => {
    const newMinute = minutes >= 59 ? 0 : minutes + 1
    onChange(`${String(hours).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}`)
  }

  const decrementMinute = () => {
    const newMinute = minutes <= 0 ? 59 : minutes - 1
    onChange(`${String(hours).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}`)
  }

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? "PM" : "AM"
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${String(displayHour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`
  }

  if (disabled) {
    return (
      <span className="text-sm text-muted-foreground">Closed</span>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {/* Hours */}
      <div className="flex flex-col items-center">
        <button
          onClick={incrementHour}
          className="p-0.5 text-muted-foreground hover:text-card-foreground transition-colors"
          aria-label="Increase hour"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <span className="text-sm font-medium text-card-foreground w-6 text-center">
          {String(hours > 12 ? hours - 12 : hours === 0 ? 12 : hours).padStart(2, "0")}
        </span>
        <button
          onClick={decrementHour}
          className="p-0.5 text-muted-foreground hover:text-card-foreground transition-colors"
          aria-label="Decrease hour"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      <span className="text-sm font-medium text-card-foreground">:</span>

      {/* Minutes */}
      <div className="flex flex-col items-center">
        <button
          onClick={incrementMinute}
          className="p-0.5 text-muted-foreground hover:text-card-foreground transition-colors"
          aria-label="Increase minute"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <span className="text-sm font-medium text-card-foreground w-6 text-center">
          {String(minutes).padStart(2, "0")}
        </span>
        <button
          onClick={decrementMinute}
          className="p-0.5 text-muted-foreground hover:text-card-foreground transition-colors"
          aria-label="Decrease minute"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      <span className="text-xs font-medium text-muted-foreground ml-1">
        {hours >= 12 ? "PM" : "AM"}
      </span>
    </div>
  )
}

export function OpeningHoursPage({ openingHours, storeId, onBack, onSave }: OpeningHoursPageProps) {
  const [hours, setHours] = useState<OpeningHour[]>(openingHours)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateHour = (index: number, updates: Partial<OpeningHour>) => {
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, ...updates } : h))
    )
  }

  const handleSave = async () => {
    setError(null)
    setIsSaving(true)

    try {
      // Convert hours array to the Firestore object structure
      const openingHoursData: Record<string, { open: string; close: string }> = {}
      
      hours.forEach((hour) => {
        const dayKey = hour.day.toLowerCase()
        openingHoursData[dayKey] = {
          open: hour.isOpen ? hour.openTime : "",
          close: hour.isOpen ? hour.closeTime : "",
        }
      })

      // Save to Firestore using merge to not overwrite other data
      await setDoc(doc(db, "stores", storeId), {
        openingHours: openingHoursData,
      }, { merge: true })

      onSave(hours)
    } catch (err) {
      console.error("Error saving opening hours:", err)
      setError("Failed to save opening hours. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed Header */}
      <div className="bg-card px-4 pt-5 pb-4 shrink-0 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-card-foreground transition-colors hover:text-primary"
              aria-label="Go back"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-card-foreground">Opening Hours</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="text-sm font-semibold text-primary transition-colors hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-2 ml-9">
          Set your weekly opening hours.
        </p>
      </div>

      {/* Scrollable Hours List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        <div className="flex flex-col gap-3">
          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-xl p-3 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {hours.map((hour, index) => (
            <div
              key={hour.day}
              className="bg-card border border-border rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                {/* Day Name */}
                <span className="text-sm font-semibold text-card-foreground w-24">
                  {hour.day}
                </span>

                {/* Time Pickers or Closed */}
                {hour.isOpen ? (
                  <div className="flex items-center gap-2 flex-1 justify-center">
                    <div className="bg-background border border-border rounded-lg px-3 py-1.5">
                      <TimePickerInput
                        value={hour.openTime}
                        onChange={(value) => updateHour(index, { openTime: value })}
                      />
                    </div>
                    <span className="text-muted-foreground text-sm">-</span>
                    <div className="bg-background border border-border rounded-lg px-3 py-1.5">
                      <TimePickerInput
                        value={hour.closeTime}
                        onChange={(value) => updateHour(index, { closeTime: value })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex justify-center">
                    <span className="text-sm text-muted-foreground">Closed</span>
                  </div>
                )}

                {/* Toggle */}
                <button
                  onClick={() => updateHour(index, { isOpen: !hour.isOpen })}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 shrink-0 ml-3 ${
                    hour.isOpen ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                  role="switch"
                  aria-checked={hour.isOpen}
                  aria-label={`Toggle ${hour.day} open status`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-card transition-transform duration-300 shadow-sm ${
                      hour.isOpen ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
