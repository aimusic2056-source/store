"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { FirestoreOrder } from "@/components/order-popup-panel"

interface UseRealtimeOrdersReturn {
  pendingOrders: FirestoreOrder[]
  acceptedOrders: FirestoreOrder[]
  allOrders: FirestoreOrder[]
  todayOrders: FirestoreOrder[]
  pastOrders: FirestoreOrder[]
  isLoading: boolean
  error: string | null
  pendingOrderForPopup: FirestoreOrder | null
  dismissPopup: () => void
  handleStatusUpdate: (orderId: string, newStatus: string) => void
}

export function useRealtimeOrders(storeId: string | null): UseRealtimeOrdersReturn {
  const [allOrders, setAllOrders] = useState<FirestoreOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingOrderForPopup, setPendingOrderForPopup] = useState<FirestoreOrder | null>(null)
  const [dismissedOrderIds, setDismissedOrderIds] = useState<Set<string>>(new Set())

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

  // Dismiss popup handler
  const dismissPopup = useCallback(() => {
    if (pendingOrderForPopup) {
      setDismissedOrderIds(prev => new Set([...prev, pendingOrderForPopup.id]))
    }
    setPendingOrderForPopup(null)
  }, [pendingOrderForPopup])

  // Handle status update from popup
  const handleStatusUpdate = useCallback((orderId: string, newStatus: string) => {
    // Update local state immediately for instant UI feedback
    setAllOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus as FirestoreOrder["status"] }
        : order
    ))
    
    // Add to dismissed so popup doesn't reappear
    setDismissedOrderIds(prev => new Set([...prev, orderId]))
    
    // Clear popup if this was the displayed order
    if (pendingOrderForPopup?.id === orderId) {
      setPendingOrderForPopup(null)
    }
  }, [pendingOrderForPopup])

  useEffect(() => {
    if (!storeId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    // Calculate 14 days ago for the query
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    fourteenDaysAgo.setHours(0, 0, 0, 0)

    // Query for ALL orders for this store (to include completed orders for persistence)
    // This fetches pending, accepted, and ready_for_pickup orders
    const ordersQuery = query(
      collection(db, "orders"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc")
    )

    // Set up real-time listener
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

        // Filter out rejected orders and orders older than 14 days
        const filteredOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt)
          orderDate.setHours(0, 0, 0, 0)
          
          // Exclude rejected orders
          if (order.status === "rejected") return false
          
          // Keep orders from last 14 days
          return orderDate >= fourteenDaysAgo
        })
        
        setAllOrders(filteredOrders)
        setIsLoading(false)
      },
      (err) => {
        console.error("Error listening to orders:", err)
        setError(err.message)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [storeId])

  // Separate effect to handle popup triggering based on pending orders
  useEffect(() => {
    // Find pending orders
    const pendingOrders = allOrders.filter(o => o.status === "pending")
    
    // Find the first pending order that hasn't been dismissed
    const nextOrder = pendingOrders.find(o => !dismissedOrderIds.has(o.id))
    
    // If there's a pending order that's not dismissed and we're not showing any popup
    if (nextOrder && !pendingOrderForPopup) {
      setPendingOrderForPopup(nextOrder)
    }
  }, [allOrders, dismissedOrderIds, pendingOrderForPopup])

  // Compute derived values
  const pendingOrders = allOrders.filter(o => o.status === "pending")
  const acceptedOrders = allOrders.filter(o => o.status === "accepted")

  // Today's orders (all statuses except rejected)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todayOrders = allOrders.filter(order => {
    const orderDate = new Date(order.createdAt)
    orderDate.setHours(0, 0, 0, 0)
    return orderDate.getTime() === today.getTime()
  })

  // Past orders (accepted or completed within last 14 days, excluding today)
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  fourteenDaysAgo.setHours(0, 0, 0, 0)

  const pastOrders = allOrders.filter(order => {
    const orderDate = new Date(order.createdAt)
    orderDate.setHours(0, 0, 0, 0)
    const isAcceptedOrCompleted = order.status === "ready_for_pickup" || order.status === "accepted"
    const isWithin14Days = orderDate >= fourteenDaysAgo && orderDate < today
    return isAcceptedOrCompleted && isWithin14Days
  })

  return {
    pendingOrders,
    acceptedOrders,
    allOrders,
    todayOrders,
    pastOrders,
    isLoading,
    error,
    pendingOrderForPopup,
    dismissPopup,
    handleStatusUpdate,
  }
}
