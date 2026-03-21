"use client"

import { useState, useEffect, useRef } from "react"
import { X, Loader2 } from "lucide-react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface OrderItem {
  name: string
  price: number
  quantity?: number
}

export interface FirestoreOrder {
  id: string
  orderId: string
  userName: string
  destinationAddress: string
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  status: "pending" | "accepted" | "ready_for_pickup" | "rejected"
  storeId: string
  createdAt: Date
}

interface OrderPopupPanelProps {
  order: FirestoreOrder
  onClose: () => void
  onStatusUpdate: (orderId: string, newStatus: string) => void
}

export function OrderPopupPanel({ order, onClose, onStatusUpdate }: OrderPopupPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)

  // Handle drag gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const currentY = e.touches[0].clientY
    const diff = currentY - startYRef.current
    // Only allow dragging up (negative values mean dragging down to close)
    if (diff > 0) {
      setDragY(diff)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    // If dragged more than 100px down, close the panel
    if (dragY > 100) {
      onClose()
    } else {
      setDragY(0)
    }
  }

  const handleAccept = async () => {
    setIsUpdating(true)
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: "accepted"
      })
      onStatusUpdate(order.id, "accepted")
    } catch (error) {
      console.error("Error accepting order:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReject = async () => {
    setIsUpdating(true)
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: "rejected"
      })
      onStatusUpdate(order.id, "rejected")
      onClose()
    } catch (error) {
      console.error("Error rejecting order:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleMarkReady = async () => {
    setIsUpdating(true)
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: "ready_for_pickup"
      })
      onStatusUpdate(order.id, "ready_for_pickup")
      onClose()
    } catch (error) {
      console.error("Error marking order ready:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Format time since order was created
  const getTimeSince = (createdAt: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - createdAt.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return "Just now"
    if (diffMins === 1) return "1 min ago"
    return `${diffMins} mins ago`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel - slides down from top */}
      <div
        ref={panelRef}
        className="relative w-full max-w-md mx-4 mt-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top duration-300"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Order #{order.orderId}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">{getTimeSince(order.createdAt)}</p>
        </div>

        {/* Customer Info */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{order.userName}</h3>
          <p className="text-sm text-gray-500">{order.destinationAddress}</p>
        </div>

        {/* Items List */}
        <div className="px-6 py-4 border-b border-gray-100">
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-2">
              <span className="text-gray-700">
                {item.name} {item.quantity && item.quantity > 1 ? `x${item.quantity}` : ""}
              </span>
              <span className="text-gray-600">ZMW {item.price.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Pricing Summary */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-700">ZMW {order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-500">Delivery Fee</span>
            <span className="text-gray-700">ZMW {order.deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-2 mt-2 border-t border-gray-100">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-lg font-bold text-gray-900">ZMW {order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4">
          {order.status === "pending" && (
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={isUpdating}
                className="flex-1 py-3.5 px-6 rounded-xl border-2 border-red-500 text-red-500 font-semibold text-base transition-all duration-200 hover:bg-red-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Reject"}
              </button>
              <button
                onClick={handleAccept}
                disabled={isUpdating}
                className="flex-1 py-3.5 px-6 rounded-xl bg-[#22c55e] text-white font-semibold text-base transition-all duration-200 hover:bg-[#16a34a] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Accept"}
              </button>
            </div>
          )}
          
          {order.status === "accepted" && (
            <button
              onClick={handleMarkReady}
              disabled={isUpdating}
              className="w-full py-3.5 px-6 rounded-xl bg-[#22c55e] text-white font-semibold text-base transition-all duration-200 hover:bg-[#16a34a] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                "Mark as Ready"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
