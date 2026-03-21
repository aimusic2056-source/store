"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, X } from "lucide-react"
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { FirestoreOrder } from "@/components/order-popup-panel"

interface OrdersPageProps {
  storeId: string | null
  realtimeOrders: FirestoreOrder[]
}

export function OrdersPage({ storeId, realtimeOrders }: OrdersPageProps) {
  const [activeTab, setActiveTab] = useState<"today" | "past">("today")
  const [allOrders, setAllOrders] = useState<FirestoreOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<FirestoreOrder | null>(null)
  const [topOrderImage, setTopOrderImage] = useState<string>("")

  // Convert Firestore timestamp to Date
  const convertTimestamp = (timestamp: unknown): Date => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate()
    }
    if (timestamp instanceof Date) {
      return timestamp
    }
    return new Date()
  }

  // Subscribe to all orders for this store (including completed)
  useEffect(() => {
    if (!storeId) return

    const ordersQuery = query(
      collection(db, "orders"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc")
    )

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const orders: FirestoreOrder[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            orderId: data.orderId || doc.id.slice(-5).toUpperCase(),
            userName: data.userName || "Customer",
            destinationAddress: data.destinationAddress || "",
            items: data.items || [],
            subtotal: data.subtotal || 0,
            deliveryFee: data.deliveryFee || 0,
            total: data.total || 0,
            status: data.status,
            storeId: data.storeId,
            createdAt: convertTimestamp(data.createdAt),
          }
        })
        setAllOrders(orders)
        
        // Set top order image from first order's first item (if available)
        if (orders.length > 0 && orders[0].items.length > 0) {
          // Use a placeholder based on order - in real app this would come from product images
          setTopOrderImage("/images/food-1.jpg")
        }
      },
      (err) => {
        console.error("Error fetching orders:", err)
      }
    )

    return () => unsubscribe()
  }, [storeId])

  // Filter today's orders
  const todayOrders = allOrders.filter(order => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const orderDate = new Date(order.createdAt)
    orderDate.setHours(0, 0, 0, 0)
    return orderDate.getTime() === today.getTime()
  })

  // Filter past orders (completed/ready_for_pickup within last 14 days)
  const pastOrders = allOrders.filter(order => {
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    fourteenDaysAgo.setHours(0, 0, 0, 0)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const orderDate = new Date(order.createdAt)
    orderDate.setHours(0, 0, 0, 0)
    
    const isCompleted = order.status === "ready_for_pickup"
    const isWithin14Days = orderDate >= fourteenDaysAgo && orderDate < today
    return isCompleted && isWithin14Days
  })

  const displayedOrders = activeTab === "today" ? todayOrders : pastOrders

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  }

  // Map status for display
  const getDisplayStatus = (status: string): "pending" | "accepted" | "completed" => {
    if (status === "ready_for_pickup") return "completed"
    if (status === "accepted") return "accepted"
    return "pending"
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header */}
      <div className="bg-card px-4 pt-5 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button className="text-card-foreground" aria-label="Go back">
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
          <h1 className="text-2xl font-bold text-card-foreground">Orders</h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted overflow-hidden">
              {topOrderImage ? (
                <img src={topOrderImage} alt="Top order" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-200" />
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            id="todayOrdersTab"
            onClick={() => setActiveTab("today")}
            className={`flex-1 pb-3 text-sm font-semibold transition-colors duration-200 ${
              activeTab === "today"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            {"Today's Orders"} ({todayOrders.length})
          </button>
          <button
            id="pastOrdersTab"
            onClick={() => setActiveTab("past")}
            className={`flex-1 pb-3 text-sm font-semibold transition-colors duration-200 ${
              activeTab === "past"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            Past Orders ({pastOrders.length})
          </button>
        </div>
      </div>

      {/* Scrollable Orders List */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 scrollbar-hide">
        {displayedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <p className="text-muted-foreground text-sm">No orders yet</p>
            <p className="text-muted-foreground/70 text-xs mt-1">
              Orders will appear here when received
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayedOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                formatTime={formatTime}
                getDisplayStatus={getDisplayStatus}
                onClick={() => setSelectedOrder(order)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
    </div>
  )
}

interface OrderCardProps {
  order: FirestoreOrder
  formatTime: (date: Date) => string
  getDisplayStatus: (status: string) => "pending" | "accepted" | "completed"
  onClick: () => void
}

function OrderCard({ order, formatTime, getDisplayStatus, onClick }: OrderCardProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer"
    >
      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-primary font-bold text-sm">#{order.orderId.slice(-3)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-card-foreground">#{order.orderId}</p>
          <p className="text-sm font-bold text-card-foreground">
            ZMW {order.total.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">{order.userName}</p>
          <OrderStatusBadge status={getDisplayStatus(order.status)} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{formatTime(order.createdAt)}</p>
      </div>
    </div>
  )
}

function OrderStatusBadge({ status }: { status: "pending" | "accepted" | "completed" }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-[#f97316]/15", text: "text-[#f97316]", label: "Pending" },
    accepted: { bg: "bg-primary/15", text: "text-primary", label: "Accepted" },
    completed: { bg: "bg-[#22c55e]/15", text: "text-[#22c55e]", label: "Completed" },
  }
  const c = config[status] || config.pending
  return (
    <span className={`${c.bg} ${c.text} text-[10px] font-semibold px-2.5 py-1 rounded-full`}>
      {c.label}
    </span>
  )
}

interface OrderDetailsModalProps {
  order: FirestoreOrder
  onClose: () => void
}

function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
        style={{
          backdropFilter: "blur(20px)",
          background: "rgba(255, 255, 255, 0.95)",
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Order #{order.orderId}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Customer Info */}
        <div className="px-6 py-3 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">{order.userName}</h3>
          <p className="text-sm text-gray-500">{order.destinationAddress}</p>
        </div>

        {/* Items List - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-3 border-b border-gray-100">
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
        <div className="px-6 py-4 shrink-0">
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
    </div>
  )
}
