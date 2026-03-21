"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface OrderItem {
  name: string
  price: number
  quantity?: number
  image?: string
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
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [isMarkingReady, setIsMarkingReady] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(order.status)
  const [isVisible, setIsVisible] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const startDragYRef = useRef(0)
  const velocityRef = useRef(0)
  const lastMoveTimeRef = useRef(0)
  const lastMoveYRef = useRef(0)

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  // Get max hide distance (panel height minus handle area)
  const getMaxHide = () => {
    if (panelRef.current) {
      return panelRef.current.offsetHeight - 60 // Leave 60px visible (handle area)
    }
    return 400
  }

  // Touch event handlers for smooth dragging
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
    startDragYRef.current = dragY
    velocityRef.current = 0
    lastMoveTimeRef.current = Date.now()
    lastMoveYRef.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    
    const currentY = e.touches[0].clientY
    const now = Date.now()
    const timeDelta = now - lastMoveTimeRef.current
    
    // Calculate velocity for momentum
    if (timeDelta > 0) {
      velocityRef.current = (currentY - lastMoveYRef.current) / timeDelta
    }
    lastMoveTimeRef.current = now
    lastMoveYRef.current = currentY

    const diff = startYRef.current - currentY // Positive when dragging up
    const maxHide = getMaxHide()
    
    // Calculate new drag position
    let newDragY = startDragYRef.current + diff
    
    // Clamp between 0 and maxHide with rubber band effect at edges
    if (newDragY < 0) {
      newDragY = newDragY * 0.3 // Rubber band effect when pulling down past 0
    } else if (newDragY > maxHide) {
      const overflow = newDragY - maxHide
      newDragY = maxHide + overflow * 0.3 // Rubber band effect at top
    }
    
    setDragY(newDragY)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    const maxHide = getMaxHide()
    const threshold = maxHide * 0.35
    
    // Use velocity to determine intent (flick gestures)
    const shouldHide = dragY > threshold || velocityRef.current < -0.5
    const shouldShow = dragY < maxHide - threshold || velocityRef.current > 0.5
    
    if (isHidden) {
      // Currently hidden - check if should show
      if (shouldShow || dragY < threshold) {
        setDragY(0)
        setIsHidden(false)
      } else {
        setDragY(maxHide)
      }
    } else {
      // Currently visible - check if should hide
      if (shouldHide) {
        setDragY(maxHide)
        setIsHidden(true)
      } else {
        setDragY(0)
      }
    }
  }

  // Mouse event handlers for PC support
  const handleMouseDown = (e: React.MouseEvent) => {
    startYRef.current = e.clientY
    startDragYRef.current = dragY
    velocityRef.current = 0
    lastMoveTimeRef.current = Date.now()
    lastMoveYRef.current = e.clientY
    setIsDragging(true)
    
    // Prevent text selection during drag
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    const currentY = e.clientY
    const now = Date.now()
    const timeDelta = now - lastMoveTimeRef.current
    
    if (timeDelta > 0) {
      velocityRef.current = (currentY - lastMoveYRef.current) / timeDelta
    }
    lastMoveTimeRef.current = now
    lastMoveYRef.current = currentY

    const diff = startYRef.current - currentY
    const maxHide = getMaxHide()
    
    let newDragY = startDragYRef.current + diff
    
    if (newDragY < 0) {
      newDragY = newDragY * 0.3
    } else if (newDragY > maxHide) {
      const overflow = newDragY - maxHide
      newDragY = maxHide + overflow * 0.3
    }
    
    setDragY(newDragY)
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    handleTouchEnd()
  }

  // Global mouse up listener for PC
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleTouchEnd()
      }
    }
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const currentY = e.clientY
      const now = Date.now()
      const timeDelta = now - lastMoveTimeRef.current
      
      if (timeDelta > 0) {
        velocityRef.current = (currentY - lastMoveYRef.current) / timeDelta
      }
      lastMoveTimeRef.current = now
      lastMoveYRef.current = currentY

      const diff = startYRef.current - currentY
      const maxHide = getMaxHide()
      
      let newDragY = startDragYRef.current + diff
      
      if (newDragY < 0) {
        newDragY = newDragY * 0.3
      } else if (newDragY > maxHide) {
        const overflow = newDragY - maxHide
        newDragY = maxHide + overflow * 0.3
      }
      
      setDragY(newDragY)
    }

    if (isDragging) {
      window.addEventListener("mouseup", handleGlobalMouseUp)
      window.addEventListener("mousemove", handleGlobalMouseMove)
    }

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp)
      window.removeEventListener("mousemove", handleGlobalMouseMove)
    }
  }, [isDragging])

  const handleAccept = async () => {
    setIsAccepting(true)
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: "accepted"
      })
      setCurrentStatus("accepted")
      onStatusUpdate(order.id, "accepted")
    } catch (error) {
      console.error("Error accepting order:", error)
    } finally {
      setIsAccepting(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: "rejected"
      })
      onStatusUpdate(order.id, "rejected")
      setIsClosing(true)
      setTimeout(() => onClose(), 300)
    } catch (error) {
      console.error("Error rejecting order:", error)
      setIsRejecting(false)
    }
  }

  const handleMarkReady = async () => {
    setIsMarkingReady(true)
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: "ready_for_pickup"
      })
      onStatusUpdate(order.id, "ready_for_pickup")
      setIsClosing(true)
      setTimeout(() => onClose(), 300)
    } catch (error) {
      console.error("Error marking order ready:", error)
      setIsMarkingReady(false)
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

  const maxHide = getMaxHide()
  
  // Calculate if panel should block interaction (only when fully visible)
  const shouldBlockInteraction = !isHidden && dragY < maxHide * 0.5

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        // Allow pointer events to pass through when panel is hidden
        pointerEvents: shouldBlockInteraction ? "auto" : "none"
      }}
    >
      {/* Backdrop - only visible when panel is shown and not hidden */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ 
          opacity: isHidden || dragY > maxHide * 0.5 ? 0 : 1 - (dragY / maxHide) * 0.7,
          pointerEvents: shouldBlockInteraction ? "auto" : "none"
        }}
      />
      
      {/* Panel - slides down from top edge */}
      <div
        ref={panelRef}
        className="relative w-full bg-white overflow-hidden flex flex-col"
        style={{
          transform: `translateY(${isClosing ? "-100%" : isVisible ? -dragY : "-100%"}px)`,
          transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          maxHeight: "60vh",
          borderBottomLeftRadius: "1.5rem",
          borderBottomRightRadius: "1.5rem",
          // Realistic shadow with multiple layers
          boxShadow: `
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 10px 15px -3px rgba(0, 0, 0, 0.15),
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 25px 50px -12px rgba(0, 0, 0, 0.25)
          `,
          pointerEvents: "auto"
        }}
      >
        {/* Fixed Top Section - Order Info */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Order #{order.orderId}</h2>
            <span className="text-sm text-gray-500">{getTimeSince(order.createdAt)}</span>
          </div>
        </div>

        {/* Scrollable Middle Section */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Customer Info */}
          <div className="pb-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">{order.userName}</h3>
            <p className="text-sm text-gray-500 mt-1">{order.destinationAddress}</p>
          </div>

          {/* Items List */}
          <div className="py-4 border-b border-gray-100">
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
          <div className="py-4">
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
        </div>

        {/* Fixed Bottom Section - Action Buttons with realistic shadows */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          {currentStatus === "pending" && (
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={isRejecting || isAccepting}
                className="flex-1 py-3.5 px-6 rounded-xl border-2 border-red-500 text-red-500 font-semibold text-base transition-all duration-200 hover:bg-red-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{
                  boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2), 0 4px 8px rgba(239, 68, 68, 0.1)"
                }}
              >
                {isRejecting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reject"}
              </button>
              <button
                onClick={handleAccept}
                disabled={isAccepting || isRejecting}
                className="flex-1 py-3.5 px-6 rounded-xl bg-[#22c55e] text-white font-semibold text-base transition-all duration-200 hover:bg-[#16a34a] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{
                  boxShadow: "0 2px 4px rgba(34, 197, 94, 0.3), 0 4px 8px rgba(34, 197, 94, 0.2)"
                }}
              >
                {isAccepting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Accept"}
              </button>
            </div>
          )}
          
          {currentStatus === "accepted" && (
            <button
              onClick={handleMarkReady}
              disabled={isMarkingReady}
              className="w-full py-3.5 px-6 rounded-xl bg-[#f97316] text-white font-semibold text-base transition-all duration-200 hover:bg-[#ea580c] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                boxShadow: "0 2px 4px rgba(249, 115, 22, 0.3), 0 4px 8px rgba(249, 115, 22, 0.2)"
              }}
            >
              {isMarkingReady ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                "Ready for pickup"
              )}
            </button>
          )}
        </div>

        {/* Drag Handle - BELOW the buttons, draggable area */}
        <div 
          className="flex justify-center py-4 cursor-grab active:cursor-grabbing shrink-0 select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          style={{
            // Make the entire handle area draggable
            touchAction: "none"
          }}
        >
          <div 
            className="w-12 h-1.5 bg-gray-300 rounded-full transition-colors"
            style={{
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)"
            }}
          />
        </div>
      </div>
    </div>
  )
}
