"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, DollarSign, CreditCard, Truck, Megaphone, X, Clock } from "lucide-react"
import type { FirestoreOrder } from "@/components/order-popup-panel"

interface NotificationsPageProps {
  storeId: string | null
  pendingOrders: FirestoreOrder[]
  onMarkAllRead: () => void
}

// Notification card types matching the reference image
interface NotificationItem {
  id: string
  type: "new_order" | "payment" | "driver" | "system"
  title: string
  description: string
  timestamp: Date
  read: boolean
  orderId?: string
  order?: FirestoreOrder
}

export function NotificationsPage({ storeId, pendingOrders, onMarkAllRead }: NotificationsPageProps) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [showPendingOrders, setShowPendingOrders] = useState(false)

  // Build notification items from pending orders and static notifications
  const buildNotifications = (): NotificationItem[] => {
    const notifications: NotificationItem[] = []

    // Add "New Order Received" card for the most recent pending order
    if (pendingOrders.length > 0) {
      const mostRecentOrder = pendingOrders[0]
      notifications.push({
        id: `new_order_${mostRecentOrder.id}`,
        type: "new_order",
        title: "New Order Received!",
        description: `Order #${mostRecentOrder.orderId} for ${mostRecentOrder.userName} (Total: ZMW ${mostRecentOrder.total.toFixed(2)}) is pending fulfillment.`,
        timestamp: mostRecentOrder.createdAt,
        read: readIds.has(`new_order_${mostRecentOrder.id}`),
        orderId: mostRecentOrder.orderId,
        order: mostRecentOrder,
      })
    }

    // Add static notification cards (matching the reference image)
    const now = new Date()
    
    notifications.push({
      id: "payment_captured",
      type: "payment",
      title: "Payment Captured",
      description: "Payment for Order #45815 (Mike L.) of $42.00 was successfully processed.",
      timestamp: new Date(now.getTime() - 14 * 60 * 1000), // 14 min ago
      read: readIds.has("payment_captured"),
    })

    notifications.push({
      id: "driver_assigned",
      type: "driver",
      title: "Driver Assigned",
      description: "Driver Alex R. has accepted Order #45812 for delivery.",
      timestamp: new Date(now.getTime() - 35 * 60 * 1000), // 35 min ago
      read: readIds.has("driver_assigned"),
    })

    notifications.push({
      id: "system_message",
      type: "system",
      title: "System Message",
      description: "App Update: Version 3.4.1 is available now. Bug fixes & improvements.",
      timestamp: new Date(now.getTime() - 52 * 60 * 1000), // 52 min ago
      read: readIds.has("system_message"),
    })

    return notifications
  }

  const notifications = buildNotifications()

  // Get time since for display
  const getTimeSince = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return "Just now"
    if (diffMins === 1) return "1 min ago"
    if (diffMins < 60) return `${diffMins} min ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return "1 hour ago"
    if (diffHours < 24) return `${diffHours} hours ago`
    
    return "1+ day ago"
  }

  // Handle notification tap
  const handleNotificationTap = (notification: NotificationItem) => {
    // Mark as read
    setReadIds(prev => new Set([...prev, notification.id]))
    
    // If it's a new order notification, show pending orders list
    if (notification.type === "new_order") {
      setShowPendingOrders(true)
    }
  }

  // Mark all as read
  const handleMarkAllRead = () => {
    const allIds = new Set(notifications.map(n => n.id))
    setReadIds(allIds)
    onMarkAllRead()
  }

  // Count unread
  const unreadCount = notifications.filter(n => !n.read).length

  // Get icon and color config for notification type
  const getNotificationConfig = (type: NotificationItem["type"]) => {
    switch (type) {
      case "new_order":
        return {
          icon: DollarSign,
          bgColor: "bg-[#22c55e]/15",
          iconColor: "text-[#22c55e]",
        }
      case "payment":
        return {
          icon: CreditCard,
          bgColor: "bg-[#3b82f6]/15",
          iconColor: "text-[#3b82f6]",
        }
      case "driver":
        return {
          icon: Truck,
          bgColor: "bg-[#14b8a6]/15",
          iconColor: "text-[#14b8a6]",
        }
      case "system":
        return {
          icon: Megaphone,
          bgColor: "bg-[#a855f7]/15",
          iconColor: "text-[#a855f7]",
        }
      default:
        return {
          icon: DollarSign,
          bgColor: "bg-muted",
          iconColor: "text-muted-foreground",
        }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="bg-card px-4 pt-5 pb-4 shrink-0 border-b border-border">
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
              className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-card-foreground"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Notifications List */}
      <div id="notificationsList" className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        <div className="flex flex-col gap-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No notifications</p>
              <p className="text-muted-foreground/70 text-sm mt-1">
                New notifications will appear here
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const config = getNotificationConfig(notification.type)
              const Icon = config.icon
              
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationTap(notification)}
                  className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer relative"
                >
                  {/* Unread indicator */}
                  {!notification.read && (
                    <span className="absolute top-4 left-3 w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                  )}

                  {/* Icon */}
                  <div className={`${config.bgColor} w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ml-2`}>
                    <Icon className={`w-6 h-6 ${config.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-card-foreground">{notification.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {notification.description}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1.5">
                      {getTimeSince(notification.timestamp)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
        
        {/* Older Notifications Link */}
        {notifications.length > 0 && (
          <div className="text-center mt-6 pb-4">
            <button className="text-sm text-muted-foreground/60 font-medium">
              Older Notifications
            </button>
          </div>
        )}
      </div>

      {/* Pending Orders Modal */}
      {showPendingOrders && (
        <PendingOrdersModal 
          orders={pendingOrders}
          onClose={() => setShowPendingOrders(false)}
          getTimeSince={getTimeSince}
        />
      )}
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
        className="relative flex flex-col h-full bg-background animate-in slide-in-from-right duration-200"
      >
        {/* Fixed Header */}
        <div className="px-4 pt-5 pb-4 border-b border-border flex items-center justify-between shrink-0 bg-card">
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
              <p className="text-muted-foreground/70 text-sm mt-1">
                Pending orders will appear here when received
              </p>
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
                  <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{order.destinationAddress}</p>
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
