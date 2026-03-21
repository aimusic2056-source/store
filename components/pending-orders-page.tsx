"use client"

import { ChevronLeft, Clock } from "lucide-react"
import type { FirestoreOrder } from "@/components/order-popup-panel"

interface PendingOrdersPageProps {
  pendingOrders: FirestoreOrder[]
  onBack: () => void
}

export function PendingOrdersPage({ pendingOrders, onBack }: PendingOrdersPageProps) {
  // Format time since order was created
  const getTimeSince = (createdAt: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - createdAt.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return "Just now"
    if (diffMins === 1) return "1 min ago"
    if (diffMins < 60) return `${diffMins} mins ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return "1 hour ago"
    return `${diffHours} hours ago`
  }

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed Header Panel */}
      <div className="bg-card px-4 pt-5 pb-4 shrink-0 z-10 border-b border-border">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="text-card-foreground transition-colors hover:text-primary" 
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-card-foreground">Pending Orders</h1>
        </div>
      </div>

      {/* Scrollable Pending Orders List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 scrollbar-hide">
        <div className="flex flex-col gap-3 pt-4">
          {pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No pending orders</p>
              <p className="text-muted-foreground/70 text-sm mt-1">
                New orders will appear here when received
              </p>
            </div>
          ) : (
            pendingOrders.map((order) => {
              // Get the first item's image for display
              const firstItemImage = order.items.length > 0 && order.items[0].image
                ? order.items[0].image
                : null

              return (
                <div
                  key={order.id}
                  className="bg-card border border-border rounded-xl p-4 shadow-sm transition-all duration-200 active:scale-[0.98]"
                >
                  <div className="flex items-start gap-3">
                    {/* Product image or order ID fallback */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                      {firstItemImage ? (
                        <img 
                          src={firstItemImage} 
                          alt={order.items[0]?.name || "Product"} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#f97316]/10 flex items-center justify-center">
                          <span className="text-[#f97316] font-bold text-sm">#{order.orderId.slice(-3)}</span>
                        </div>
                      )}
                    </div>

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-card-foreground">Order #{order.orderId}</h3>
                        <span className="text-xs text-muted-foreground">{getTimeSince(order.createdAt)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{order.userName}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{order.items.length} item(s)</p>
                    </div>

                    {/* Total and Status */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-card-foreground">
                        ZMW {order.total.toFixed(2)}
                      </p>
                      <span className="inline-block mt-1 bg-[#f97316]/15 text-[#f97316] text-[10px] font-semibold px-2.5 py-1 rounded-full">
                        Pending
                      </span>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="flex flex-wrap gap-1">
                      {order.items.slice(0, 3).map((item, index) => (
                        <span 
                          key={index} 
                          className="text-xs bg-muted/50 text-muted-foreground px-2 py-0.5 rounded"
                        >
                          {item.name} {item.quantity && item.quantity > 1 ? `x${item.quantity}` : ""}
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{order.items.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground/70 truncate">
                      {order.destinationAddress}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
