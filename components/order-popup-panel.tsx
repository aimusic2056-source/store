"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, GripHorizontal } from "lucide-react"
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
  const [panelY, setPanelY] = useState(-100) // Start off-screen (above)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const dragStartPanelY = useRef(0)
  
  // Panel positions
  const EXPANDED_Y = 0
  const COLLAPSED_Y = -75 // Percentage hidden when collapsed
  const HANDLE_AREA_HEIGHT = 60 // Height of handle area in pixels

  // Animate panel sliding down on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setPanelY(EXPANDED_Y)
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  // Calculate estimated time (minutes since order created)
  const getETA = useCallback(() => {
    const now = new Date()
    const diffMs = now.getTime() - order.createdAt.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    return diffMins < 1 ? "< 1" : String(diffMins)
  }, [order.createdAt])

  const [etaMinutes, setEtaMinutes] = useState(getETA())

  // Update ETA every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setEtaMinutes(getETA())
    }, 60000)
    return () => clearInterval(interval)
  }, [getETA])

  // Handle drag start
  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true)
    dragStartY.current = clientY
    dragStartPanelY.current = panelY
  }, [panelY])

  // Handle drag move
  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return
    
    const deltaY = clientY - dragStartY.current
    const panelHeight = panelRef.current?.offsetHeight || 400
    const deltaPercent = (deltaY / panelHeight) * 100
    
    let newY = dragStartPanelY.current + deltaPercent
    
    // Clamp between collapsed and expanded positions
    newY = Math.max(COLLAPSED_Y, Math.min(EXPANDED_Y, newY))
    
    setPanelY(newY)
  }, [isDragging])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    
    // Snap to collapsed or expanded based on position
    const threshold = (COLLAPSED_Y + EXPANDED_Y) / 2
    if (panelY < threshold) {
      setPanelY(COLLAPSED_Y)
      setIsCollapsed(true)
    } else {
      setPanelY(EXPANDED_Y)
      setIsCollapsed(false)
    }
  }, [isDragging, panelY])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY)
  }, [handleDragStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY)
  }, [handleDragMove])

  const handleTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientY)
    
    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY)
    }
    
    const handleMouseUp = () => {
      handleDragEnd()
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
    
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [handleDragStart, handleDragMove, handleDragEnd])

  // Toggle collapsed state
  const toggleCollapsed = useCallback(() => {
    if (isCollapsed) {
      setPanelY(EXPANDED_Y)
      setIsCollapsed(false)
    } else {
      setPanelY(COLLAPSED_Y)
      setIsCollapsed(true)
    }
  }, [isCollapsed])

  // Exit animation then close
  const exitAndClose = useCallback(() => {
    setIsExiting(true)
    setPanelY(-100)
    setTimeout(() => {
      onClose()
    }, 400)
  }, [onClose])

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
      exitAndClose()
    } catch (error) {
      console.error("Error rejecting order:", error)
    } finally {
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
      exitAndClose()
    } catch (error) {
      console.error("Error marking order ready:", error)
    } finally {
      setIsMarkingReady(false)
    }
  }

  // Calculate panel transform
  const panelTransform = `translateY(${panelY}%)`

  return (
    <div 
      className="fixed inset-0 z-50 pointer-events-none"
      style={{ zIndex: isCollapsed ? 40 : 50 }}
    >
      {/* Backdrop - only visible when expanded and not exiting */}
      {!isCollapsed && !isExiting && (
        <div 
          className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
          style={{ opacity: panelY === EXPANDED_Y ? 1 : 0 }}
        />
      )}
      
      {/* Panel - slides down from top edge */}
      <div
        ref={panelRef}
        className="absolute left-0 right-0 top-0 pointer-events-auto flex flex-col"
        style={{
          transform: panelTransform,
          transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
          maxHeight: "85vh",
        }}
      >
        <div 
          className="mx-2 bg-card rounded-b-2xl overflow-hidden flex flex-col"
          style={{
            boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.3), 0 4px 20px -5px rgba(0, 0, 0, 0.15)",
            maxHeight: "calc(85vh - 16px)",
          }}
        >
          {/* Fixed Top Section - Order number and ETA */}
          <div className="px-5 pt-5 pb-3 border-b border-border shrink-0 bg-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-card-foreground">Order #{order.orderId}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">New order received</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f97316] animate-pulse" />
                  <span className="text-sm font-semibold text-[#f97316]">{etaMinutes} min ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Middle Section */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Customer Info */}
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-card-foreground">{order.userName}</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{order.destinationAddress}</p>
            </div>

            {/* Items List */}
            <div className="px-5 py-4 border-b border-border">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Order Items</h4>
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    {item.image && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <span className="text-sm text-card-foreground">
                      {item.name} {item.quantity && item.quantity > 1 ? `x${item.quantity}` : ""}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-card-foreground">ZMW {item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Pricing Summary */}
            <div className="px-5 py-4">
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm text-card-foreground">ZMW {order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground">Delivery Fee</span>
                <span className="text-sm text-card-foreground">ZMW {order.deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 mt-2 border-t border-border">
                <span className="text-base font-bold text-card-foreground">Total</span>
                <span className="text-base font-bold text-card-foreground">ZMW {order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Fixed Bottom Section - Action Buttons */}
          <div className="px-5 py-4 border-t border-border shrink-0 bg-card">
            {currentStatus === "pending" && (
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={isAccepting || isRejecting}
                  className="flex-1 py-3.5 px-6 rounded-xl border-2 border-destructive text-destructive font-semibold text-base transition-all duration-200 hover:bg-destructive/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isRejecting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Reject"}
                </button>
                <button
                  onClick={handleAccept}
                  disabled={isAccepting || isRejecting}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-[#22c55e] text-white font-semibold text-base transition-all duration-200 hover:bg-[#16a34a] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#22c55e]/25"
                >
                  {isAccepting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Accept"}
                </button>
              </div>
            )}
            
            {currentStatus === "accepted" && (
              <button
                onClick={handleMarkReady}
                disabled={isMarkingReady}
                className="w-full py-3.5 px-6 rounded-xl bg-[#f97316] text-white font-semibold text-base transition-all duration-200 hover:bg-[#ea580c] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#f97316]/25 flex items-center justify-center gap-2"
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

          {/* Drag Handle - Below buttons */}
          <div 
            className="py-3 cursor-grab active:cursor-grabbing touch-none select-none bg-muted/30"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onClick={toggleCollapsed}
          >
            <div className="flex flex-col items-center gap-1">
              <GripHorizontal className="w-6 h-6 text-muted-foreground/60" />
              <span className="text-[10px] text-muted-foreground/60 font-medium">
                {isCollapsed ? "Pull down to view" : "Push up to minimize"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
