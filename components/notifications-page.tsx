"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, DollarSign, Clock, X } from "lucide-react"
import type { FirestoreOrder } from "@/components/order-popup-panel"

interface NotificationsPageProps {
  storeId: string | null
  pendingOrders: FirestoreOrder[]
  onMarkAllRead: () => void
}

export function NotificationsPage({ storeId, pendingOrders, onMarkAllRead }: NotificationsPageProps) {
  const [readOrderIds, setReadOrderIds] = useState<Set<string>>(new Set())
  const [showPendingList, setShowPendingList] = useState(false)

  // Get time since order was created
  const getTimeSince = (createdAt: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - createdAt.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return "Just now"
    if (diffMins === 1) return "1 min ago"
    if (diffMins < 60) return `${diffMins} mins ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return "1 hour ago"
    if (diffHours < 24) return `${diffHours} hours ago`
    
    return "1+ day ago"
  }

  // Mark notification as read when tapped
  const handleNotificationTap = (orderId: string) => {
    setReadOrderIds(prev => new Set([...prev, orderId]))
    setShowPendingList(true)
  }

  // Mark all as read
  const handleMarkAllRead = () => {
    const allIds = new Set(pendingOrders.map(o => o.id))
    setReadOrderIds(allIds)
    onMarkAllRead()
  }

  // Check if notification has unread badge
  const hasUnreadBadge = (orderId: string) => !readOrderIds.has(orderId)

  // Count unread
  const unreadCount = pendingOrders.filter(o => !readOrderIds.has(o.id)).length

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="bg-card px-4 pt-5 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="text-card-foreground" aria-label="Go back">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-card-foreground">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button
              id="markAllReadButton"
              onClick={handleMarkAllRead}
              className="text-sm font-medium text-primary transition-colors duration-200 hover:text-primary/80"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Notifications List */}
      <div id="notificationsList" className="flex-1 overflow-y-auto px-4 pb-2 scrollbar-hide">
        <div className="flex flex-col gap-3">
          {pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No order received</p>
              <p className="text-muted-foreground/70 text-sm mt-1">
                New orders will appear here
              </p>
            </div>
          ) : (
            pendingOrders.map((order) => (
              <NotificationCard 
                key={order.id} 
                order={order}
                hasUnread={hasUnreadBadge(order.id)}
                getTimeSince={getTimeSince}
                onTap={() => handleNotificationTap(order.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Pending Orders Modal */}
      {showPendingList && (
        <PendingOrdersModal 
          orders={pendingOrders}
          onClose={() => setShowPendingList(false)}
          getTimeSince={getTimeSince}
        />
      )}
    </div>
  )
}

interface NotificationCardProps {
  order: FirestoreOrder
  hasUnread: boolean
  getTimeSince: (date: Date) => string
  onTap: () => void
}

function NotificationCard({ order, hasUnread, getTimeSince, onTap }: NotificationCardProps) {
  // Live minute counter
  const [timeDisplay, setTimeDisplay] = useState(getTimeSince(order.createdAt))

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeDisplay(getTimeSince(order.createdAt))
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [order.createdAt, getTimeSince])

  return (
    <div 
      onClick={onTap}
      className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer relative"
    >
      {/* Unread badge */}
      {hasUnread && (
        <span className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-destructive" />
      )}

      {/* Icon */}
      <div className="bg-[#22c55e]/15 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ml-2">
        <DollarSign className="w-5 h-5 text-[#22c55e]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-card-foreground">New order received!</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Order #{order.orderId} for {order.userName} (Total: ZMW {order.total.toFixed(2)}) is pending fulfillment.
        </p>
        <div className="flex items-center gap-1 mt-1.5 text-muted-foreground/70">
          <Clock className="w-3 h-3" />
          <span className="text-[10px]">{timeDisplay}</span>
        </div>
      </div>
    </div>
  )
}

interface PendingOrdersModalProps {
  orders: FirestoreOrder[]
  onClose: () => void
  getTimeSince: (date: Date) => string
}

function PendingOrdersModal({ orders, onClose, getTimeSince }: PendingOrdersModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative flex flex-col h-full bg-background"
        style={{
          backdropFilter: "blur(20px)",
          background: "rgba(255, 255, 255, 0.98)",
        }}
      >
        {/* Fixed Header */}
        <div className="px-4 pt-5 pb-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="text-card-foreground" 
              aria-label="Go back"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-card-foreground">Pending Orders</h1>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable Orders List */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">No pending orders</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {orders.map((order) => (
                <div 
                  key={order.id}
                  className="bg-card border border-border rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-card-foreground">
                      Order #{order.orderId}
                    </h3>
                    <span className="bg-[#f97316]/15 text-[#f97316] text-[10px] font-semibold px-2.5 py-1 rounded-full">
                      Pending
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{order.userName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm font-bold text-card-foreground">
                      ZMW {order.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">{getTimeSince(order.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
