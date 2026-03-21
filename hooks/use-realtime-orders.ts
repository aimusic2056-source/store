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
  const [pendingOrders, setPendingOrders] = useState<FirestoreOrder[]>([])
  const [acceptedOrders, setAcceptedOrders] = useState<FirestoreOrder[]>([])
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

  // Filter today's orders
  const getTodayOrders = useCallback((orders: FirestoreOrder[]): FirestoreOrder[] => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      orderDate.setHours(0, 0, 0, 0)
      return orderDate.getTime() === today.getTime()
    })
  }, [])

  // Filter past orders (last 14 days, status = ready_for_pickup/completed)
  const getPastOrders = useCallback((orders: FirestoreOrder[]): FirestoreOrder[] => {
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    fourteenDaysAgo.setHours(0, 0, 0, 0)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      orderDate.setHours(0, 0, 0, 0)
      const isCompleted = order.status === "ready_for_pickup" || order.status === "rejected"
      const isWithin14Days = orderDate >= fourteenDaysAgo && orderDate < today
      return isCompleted && isWithin14Days
    })
  }, [])

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
    if (newStatus === "accepted") {
      setPendingOrders(prev => prev.filter(o => o.id !== orderId))
      setAcceptedOrders(prev => {
        const order = pendingOrders.find(o => o.id === orderId)
        if (order) {
          return [...prev, { ...order, status: "accepted" as const }]
        }
        return prev
      })
    } else if (newStatus === "rejected" || newStatus === "ready_for_pickup") {
      setPendingOrders(prev => prev.filter(o => o.id !== orderId))
      setAcceptedOrders(prev => prev.filter(o => o.id !== orderId))
    }
    
    // Add to dismissed so popup doesn't reappear
    setDismissedOrderIds(prev => new Set([...prev, orderId]))
  }, [pendingOrders])

  useEffect(() => {
    if (!storeId) {
      setIsLoading(false)
      return
    }

    console.log("[v0] Listening for storeId:", storeId)

    setIsLoading(true)
    setError(null)

    // Query for pending and accepted orders
    const ordersQuery = query(
      collection(db, "orders"),
      where("storeId", "==", storeId),
      where("status", "in", ["pending", "accepted"]),
      orderBy("createdAt", "desc")
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        console.log("[v0] Snapshot received, docs count:", snapshot.docs.length)
        
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

        const pending = orders.filter(o => o.status === "pending")
        const accepted = orders.filter(o => o.status === "accepted")
        
        console.log("[v0] Pending orders:", pending.length, "Accepted orders:", accepted.length)
        
        // Update state
        setPendingOrders(pending)
        setAcceptedOrders(accepted)
        setAllOrders(orders)
        setIsLoading(false)
      },
      (err) => {
        console.error("[v0] Error listening to orders:", err)
        setError(err.message)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [storeId])

  // Separate effect to handle popup triggering based on pending orders
  // This runs whenever pendingOrders changes and checks if we should show a popup
  useEffect(() => {
    // Find the first pending order that hasn't been dismissed
    const nextOrder = pendingOrders.find(o => !dismissedOrderIds.has(o.id))
    
    console.log("[v0] Checking for popup - pendingOrders:", pendingOrders.length, 
      "dismissedIds:", dismissedOrderIds.size, 
      "currentPopup:", pendingOrderForPopup?.id || "none",
      "nextOrder:", nextOrder?.id || "none")
    
    // If there's a pending order that's not dismissed and we're not showing any popup
    if (nextOrder && !pendingOrderForPopup) {
      console.log("[v0] Showing popup for order:", nextOrder.id)
      setPendingOrderForPopup(nextOrder)
    }
  }, [pendingOrders, dismissedOrderIds, pendingOrderForPopup])

  // Compute derived values
  const todayOrders = getTodayOrders(allOrders)
  const pastOrders = getPastOrders(allOrders)

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
