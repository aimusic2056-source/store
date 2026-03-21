"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { FirestoreOrder } from "@/components/order-popup-panel"

interface UseRealtimeOrdersReturn {
  pendingOrders: FirestoreOrder[]
  acceptedOrders: FirestoreOrder[]
  completedOrders: FirestoreOrder[]
  allOrders: FirestoreOrder[]
  todayOrders: FirestoreOrder[]
  pastOrders: FirestoreOrder[]
  isLoading: boolean
  error: string | null
  pendingOrderForPopup: FirestoreOrder | null
  dismissPopup: () => void
  handleStatusUpdate: (orderId: string, newStatus: string) => void
  // Revenue tracking - persists when orders move from accepted to completed
  capturedRevenue: number
}

export function useRealtimeOrders(storeId: string | null): UseRealtimeOrdersReturn {
  const [pendingOrders, setPendingOrders] = useState<FirestoreOrder[]>([])
  const [acceptedOrders, setAcceptedOrders] = useState<FirestoreOrder[]>([])
  const [completedOrders, setCompletedOrders] = useState<FirestoreOrder[]>([])
  const [allOrders, setAllOrders] = useState<FirestoreOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingOrderForPopup, setPendingOrderForPopup] = useState<FirestoreOrder | null>(null)
  const [dismissedOrderIds, setDismissedOrderIds] = useState<Set<string>>(new Set())
  
  // Track captured revenue from accepted orders (persists even after becoming completed)
  const [capturedRevenueIds, setCapturedRevenueIds] = useState<Set<string>>(new Set())

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
    // When an order is accepted, capture its revenue
    if (newStatus === "accepted") {
      const order = pendingOrders.find(o => o.id === orderId)
      if (order) {
        setCapturedRevenueIds(prev => new Set([...prev, orderId]))
      }
      setPendingOrders(prev => prev.filter(o => o.id !== orderId))
      setAcceptedOrders(prev => {
        const orderToMove = pendingOrders.find(o => o.id === orderId)
        if (orderToMove) {
          return [...prev, { ...orderToMove, status: "accepted" as const }]
        }
        return prev
      })
    } else if (newStatus === "rejected") {
      setPendingOrders(prev => prev.filter(o => o.id !== orderId))
      setAcceptedOrders(prev => prev.filter(o => o.id !== orderId))
    } else if (newStatus === "ready_for_pickup") {
      // Move from accepted to completed - revenue already captured
      setAcceptedOrders(prev => prev.filter(o => o.id !== orderId))
      const orderToMove = acceptedOrders.find(o => o.id === orderId)
      if (orderToMove) {
        setCompletedOrders(prev => [...prev, { ...orderToMove, status: "ready_for_pickup" as const }])
      }
    }
    
    // Add to dismissed so popup doesn't reappear
    setDismissedOrderIds(prev => new Set([...prev, orderId]))
  }, [pendingOrders, acceptedOrders])

  useEffect(() => {
    if (!storeId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    // Query for ALL orders (pending, accepted, ready_for_pickup, rejected)
    // This ensures we count all orders for "Orders Today"
    const allOrdersQuery = query(
      collection(db, "orders"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc")
    )

    // Set up real-time listener for ALL orders
    const unsubscribe = onSnapshot(
      allOrdersQuery,
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

        // Separate by status
        const pending = orders.filter(o => o.status === "pending")
        const accepted = orders.filter(o => o.status === "accepted")
        const completed = orders.filter(o => o.status === "ready_for_pickup")
        
        // Update captured revenue IDs - include any accepted or completed orders
        // This ensures revenue persists even after logout/login
        const revenueOrders = orders.filter(o => 
          o.status === "accepted" || o.status === "ready_for_pickup"
        )
        setCapturedRevenueIds(new Set(revenueOrders.map(o => o.id)))
        
        // Update state
        setPendingOrders(pending)
        setAcceptedOrders(accepted)
        setCompletedOrders(completed)
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
  useEffect(() => {
    // Find the first pending order that hasn't been dismissed
    const nextOrder = pendingOrders.find(o => !dismissedOrderIds.has(o.id))
    
    // If there's a pending order that's not dismissed and we're not showing any popup
    if (nextOrder && !pendingOrderForPopup) {
      setPendingOrderForPopup(nextOrder)
    }
  }, [pendingOrders, dismissedOrderIds, pendingOrderForPopup])

  // Compute derived values
  const todayOrders = getTodayOrders(allOrders)
  const pastOrders = getPastOrders(allOrders)
  
  // Calculate captured revenue (from accepted and completed orders)
  const capturedRevenue = allOrders
    .filter(o => capturedRevenueIds.has(o.id))
    .reduce((sum, o) => sum + o.total, 0)

  return {
    pendingOrders,
    acceptedOrders,
    completedOrders,
    allOrders,
    todayOrders,
    pastOrders,
    isLoading,
    error,
    pendingOrderForPopup,
    dismissPopup,
    handleStatusUpdate,
    capturedRevenue,
  }
}
