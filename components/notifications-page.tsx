"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ShoppingBag, CreditCard, Truck, Megaphone } from "lucide-react"
import type { FirestoreOrder } from "@/components/order-popup-panel"

interface NotificationsPageProps {
  storeId: string | null
  pendingOrders: FirestoreOrder[]
  onMarkAllRead: () => void
  onNavigate: (page: string) => void
}

// Notification types matching the reference design
type NotificationType = "new_order" | "payment_captured" | "driver_assigned" | "system_message"

interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  timestamp: Date
  read: boolean
  orderId?: string
  customerName?: string
  amount?: number
  driverName?: string
  isClickable?: boolean
}

export function NotificationsPage({ storeId, pendingOrders, onMarkAllRead, onNavigate }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  // Generate notifications from pending orders and add sample notifications
  useEffect(() => {
    // Create the "New Order Received" notification card - shows the most recent pending order
    // This card is ALWAYS at the top and taps to open Pending Orders page
    const newOrderNotifications: Notification[] = []
    
    // Add the NEW ORDER RECEIVED card at the very top
    // This shows the most recent pending order info
    if (pendingOrders.length > 0) {
      const mostRecentOrder = pendingOrders[0] // First one is most recent (sorted by createdAt desc)
      newOrderNotifications.push({
        id: "new-order-card",
        type: "new_order",
        title: "New Order Received!",
        description: `Order #${mostRecentOrder.orderId} for ${mostRecentOrder.userName} (Total: ZMW ${mostRecentOrder.total.toFixed(2)}) is pending fulfillment.`,
        timestamp: mostRecentOrder.createdAt,
        read: false,
        orderId: mostRecentOrder.orderId,
        customerName: mostRecentOrder.userName,
        amount: mostRecentOrder.total,
        isClickable: true, // This card navigates to Pending Orders page
      })
    } else {
      // Even if no pending orders, show a placeholder that can navigate to pending orders page
      newOrderNotifications.push({
        id: "new-order-card",
        type: "new_order",
        title: "New Order Received!",
        description: "No pending orders at the moment. Tap to view pending orders.",
        timestamp: new Date(),
        read: true, // Mark as read if no pending orders
        isClickable: true,
      })
    }

    // Add sample notifications for demonstration (matching reference image)
    const sampleNotifications: Notification[] = [
      {
        id: "payment-1",
        type: "payment_captured",
        title: "Payment Captured",
        description: "Payment for Order #45815 (Mike L.) of $42.00 was successfully processed.",
        timestamp: new Date(Date.now() - 14 * 60 * 1000), // 14 min ago
        read: false,
        orderId: "45815",
        customerName: "Mike L.",
        amount: 42.00,
      },
      {
        id: "driver-1",
        type: "driver_assigned",
        title: "Driver Assigned",
        description: "Driver Alex R. has accepted Order #45812 for delivery.",
        timestamp: new Date(Date.now() - 35 * 60 * 1000), // 35 min ago
        read: false,
        orderId: "45812",
        driverName: "Alex R.",
      },
      {
        id: "system-1",
        type: "system_message",
        title: "System Message",
        description: "App Update: Version 3.4.1 is available now. Bug fixes & improvements.",
        timestamp: new Date(Date.now() - 52 * 60 * 1000), // 52 min ago
        read: false,
      },
    ]

    // Combine: New Order card first, then sample notifications
    const allNotifications = [...newOrderNotifications, ...sampleNotifications]
    
    setNotifications(allNotifications)
  }, [pendingOrders])

  // Get time since notification
  const getTimeSince = (timestamp: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - timestamp.getTime()
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
  const handleNotificationTap = (notification: Notification) => {
    // If this is the "New Order Received" card, navigate to pending orders page
    if (notification.id === "new-order-card" || notification.isClickable) {
      onNavigate("pendingOrders")
      return
    }
    
    // Mark as read
    setReadIds(prev => new Set([...prev, notification.id]))
  }

  // Handle mark all as read
  const handleMarkAllRead = () => {
    const allIds = new Set(notifications.map(n => n.id))
    setReadIds(allIds)
    onMarkAllRead()
  }

  // Check if notification is unread
  const isUnread = (notificationId: string) => !readIds.has(notificationId)

  // Count unread notifications
  const unreadCount = notifications.filter(n => isUnread(n.id)).length

  // Get icon and colors for notification type
  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case "new_order":
        return {
          icon: ShoppingBag,
          bgColor: "bg-[#22c55e]/15",
          iconColor: "text-[#22c55e]",
        }
      case "payment_captured":
        return {
          icon: CreditCard,
          bgColor: "bg-[#1a73e8]/15",
          iconColor: "text-[#1a73e8]",
        }
      case "driver_assigned":
        return {
          icon: Truck,
          bgColor: "bg-[#14b8a6]/15",
          iconColor: "text-[#14b8a6]",
        }
      case "system_message":
        return {
          icon: Megaphone,
          bgColor: "bg-[#a855f7]/15",
          iconColor: "text-[#a855f7]",
        }
      default:
        return {
          icon: ShoppingBag,
          bgColor: "bg-gray-100",
          iconColor: "text-gray-500",
        }
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed Header */}
      <div className="bg-card px-4 pt-5 pb-4 shrink-0 z-10">
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
              className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-primary"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Notifications List */}
      <div 
        id="notificationsList" 
        className="flex-1 overflow-y-auto px-4 pb-20 scrollbar-hide"
      >
        <div className="flex flex-col gap-3 pt-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No notifications</p>
              <p className="text-muted-foreground/70 text-sm mt-1">
                New notifications will appear here
              </p>
            </div>
          ) : (
            <>
              {notifications.map((notification) => {
                const style = getNotificationStyle(notification.type)
                const IconComponent = style.icon
                const unread = isUnread(notification.id)
                const isNewOrderCard = notification.id === "new-order-card"
                
                return (
                  <div 
                    key={notification.id}
                    onClick={() => handleNotificationTap(notification)}
                    className={`bg-card border border-border rounded-xl p-4 flex items-start gap-3 shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer relative ${
                      isNewOrderCard ? "ring-2 ring-[#22c55e]/30" : ""
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {unread && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#f97316]" />
                    )}

                    {/* Icon */}
                    <div className={`${style.bgColor} w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ml-3`}>
                      <IconComponent className={`w-6 h-6 ${style.iconColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-card-foreground">{notification.title}</h3>
                        <p className="text-xs text-muted-foreground/70">
                          {getTimeSince(notification.timestamp)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {notification.description}
                      </p>
                    </div>
                  </div>
                )
              })}

              {/* Older Notifications link */}
              <div className="text-center py-4">
                <button className="text-sm text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                  Older Notifications
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
