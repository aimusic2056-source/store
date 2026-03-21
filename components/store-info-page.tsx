"use client"

import { useState, useRef } from "react"
import { ChevronLeft, Upload, MapPin, Phone, Loader2 } from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { uploadStoreLogo } from "@/lib/cloudinary"
import type { StoreInfo } from "@/lib/store-data"

interface StoreInfoPageProps {
  storeInfo: StoreInfo
  storeId: string
  onBack: () => void
  onSave: (info: StoreInfo) => void
}

export function StoreInfoPage({ storeInfo, storeId, onBack, onSave }: StoreInfoPageProps) {
  const [logo, setLogo] = useState(storeInfo.logo || "")
  const [name, setName] = useState(storeInfo.name || "")
  const [address, setAddress] = useState(storeInfo.address || "")
  const [phone, setPhone] = useState(storeInfo.phone || "")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      // Show preview immediately
      const reader = new FileReader()
      reader.onload = (event) => {
        setLogo(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setError(null)
    setIsSaving(true)

    try {
      let logoUrl = logo

      // Upload logo to Cloudinary if a new file was selected
      if (logoFile) {
        setIsUploading(true)
        try {
          logoUrl = await uploadStoreLogo(logoFile, storeId)
        } catch (uploadError) {
          setError("Failed to upload logo. Please try again.")
          setIsSaving(false)
          setIsUploading(false)
          return
        }
        setIsUploading(false)
      }

      // Save to Firestore
      await setDoc(doc(db, "stores", storeId), {
        logo: logoUrl,
        storeName: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
      }, { merge: true })

      onSave({
        logo: logoUrl,
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
      })
    } catch (err) {
      console.error("Error saving store info:", err)
      setError("Failed to save store information. Please try again.")
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
            <h1 className="text-xl font-bold text-card-foreground">Store Information</h1>
          </div>
        </div>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
        <div className="flex flex-col gap-6">
          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-xl p-3 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {/* Logo Upload */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSaving}
              className="w-36 h-36 border-2 border-dashed border-border rounded-full flex flex-col items-center justify-center gap-2 bg-card hover:bg-accent/50 transition-colors overflow-hidden relative disabled:cursor-not-allowed"
            >
              {isUploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              )}
              {logo ? (
                <img
                  src={logo}
                  alt="Store logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Upload Logo</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>

          {/* Store Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Store Name
            </label>
            <input
              type="text"
              placeholder="Enter store name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Enter store address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-semibold transition-all duration-200 active:scale-[0.98] hover:bg-primary/90 mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving || isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isUploading ? "Uploading..." : "Saving..."}
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
