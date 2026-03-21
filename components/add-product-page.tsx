"use client"

import { useState, useRef } from "react"
import { ChevronLeft, Camera, Plus, Loader2 } from "lucide-react"
import { doc, collection, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { uploadProductImage } from "@/lib/cloudinary"
import type { Product } from "@/lib/store-data"

interface AddProductPageProps {
  product?: Product | null
  storeId: string
  storeName: string
  storeAddress: string
  onBack: () => void
  onSave: (product: Omit<Product, "id"> & { id?: string }) => void
}

const categories = [
  "Fresh Produce",
  "Fast Food",
  "Healthy",
  "Desserts",
  "Japanese",
  "Beverages",
  "Snacks",
  "Other",
]

const units = ["item", "bag", "g", "kg", "ml", "L", "pack"]

export function AddProductPage({ product, storeId, storeName, storeAddress, onBack, onSave }: AddProductPageProps) {
  const [name, setName] = useState(product?.name || "")
  const [category, setCategory] = useState(product?.category || "Fresh Produce")
  const [price, setPrice] = useState(product?.price?.toString() || "")
  const [unit, setUnit] = useState(product?.unit || "item")
  const [description, setDescription] = useState(product?.description || "")
  const [available, setAvailable] = useState(product?.available ?? true)
  const [image, setImage] = useState(product?.image || "")
  const [stock, setStock] = useState(product?.stock?.toString() || "0")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEditing = !!product

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      // Show preview immediately
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !price) return

    setError(null)
    setIsSaving(true)

    try {
      // Generate product ID using Firestore document reference
      const productId = product?.id || doc(collection(db, "stores", storeId, "products")).id
      
      let imageUrl = image

      // Upload image to Cloudinary if a new file was selected
      if (imageFile) {
        setIsUploading(true)
        try {
          imageUrl = await uploadProductImage(imageFile, storeId, productId)
        } catch (uploadError) {
          setError("Failed to upload image. Please try again.")
          setIsSaving(false)
          setIsUploading(false)
          return
        }
        setIsUploading(false)
      }

      // Prepare product data for Firestore
      const productData = {
        name: name.trim(),
        price: parseFloat(price) || 0,
        imageUrl: imageUrl || "",
        description: description.trim(),
        category,
        unit,
        stockQuantity: parseInt(stock) || 0,
        availability: available,
        storeId,
        storeName,
        storeAddress,
        createdAt: serverTimestamp(),
      }

      // Save to Firestore
      await setDoc(doc(db, "stores", storeId, "products", productId), productData, { merge: true })

      // Call onSave callback with the product data for local state update
      onSave({
        id: productId,
        name: name.trim(),
        category,
        price: parseFloat(price) || 0,
        unit,
        description: description.trim(),
        available,
        image: imageUrl || "/images/placeholder.jpg",
        stock: parseInt(stock) || 0,
      })
    } catch (err) {
      console.error("Error saving product:", err)
      setError("Failed to save product. Please try again.")
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
            <h1 className="text-xl font-bold text-card-foreground">
              {isEditing ? "Edit Product" : "Add New Product"}
            </h1>
          </div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        <div className="flex flex-col gap-5">
          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-xl p-3 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {/* Image Upload */}
          <div className="flex justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSaving}
              className="w-full max-w-xs h-36 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 bg-card hover:bg-accent/50 transition-colors relative overflow-hidden disabled:cursor-not-allowed"
            >
              {isUploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground">Uploading...</span>
                  </div>
                </div>
              )}
              {image ? (
                <img
                  src={image}
                  alt="Product preview"
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-primary" />
                    <Plus className="w-3 h-3 text-primary absolute translate-x-3 -translate-y-3" />
                  </div>
                  <span className="text-sm text-muted-foreground">Tap to Upload Image</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Product Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Product Name
            </label>
            <input
              type="text"
              placeholder="Enter product name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
              }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Price and Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Price (ZMW)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="ZMW 0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                }}
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Stock Quantity
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Description (Optional)
            </label>
            <textarea
              placeholder="Add details about the product..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Availability Toggle */}
          <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
            <div>
              <p className="text-sm font-semibold text-card-foreground">Availability</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {available ? "Product is Available" : "Product is Out of Stock"}
              </p>
            </div>
            <button
              onClick={() => setAvailable(!available)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ${
                available ? "bg-primary" : "bg-muted-foreground/30"
              }`}
              role="switch"
              aria-checked={available}
              aria-label="Toggle product availability"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-card transition-transform duration-300 shadow-sm ${
                  available ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!name.trim() || !price || isSaving || isUploading}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-semibold transition-all duration-200 active:scale-[0.98] hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {isSaving || isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isUploading ? "Uploading Image..." : "Saving..."}
              </>
            ) : (
              isEditing ? "Update Product" : "Save Product"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
