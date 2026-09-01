"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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

// Session storage key for dismissed order IDs (persists across page refreshes but not browser close)
const DISMISSED_ORDERS_KEY = "dismissed_order_ids"

// Get dismissed order IDs from session storage
function getDismissedOrderIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const stored = sessionStorage.getItem(DISMISSED_ORDERS_KEY)
    if (stored) {
      return new Set(JSON.parse(stored))
    }
  } catch {
    // Ignore parsing errors
  }
  return new Set()
}

// Save dismissed order IDs to session storage
function saveDismissedOrderIds(ids: Set<string>) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(DISMISSED_ORDERS_KEY, JSON.stringify([...ids]))
  } catch {
    // Ignore storage errors
  }
}

export function useRealtimeOrders(storeId: string | null): UseRealtimeOrdersReturn {
  const [allOrders, setAllOrders] = useState<FirestoreOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingOrderForPopup, setPendingOrderForPopup] = useState<FirestoreOrder | null>(null)
  const [dismissedOrderIds, setDismissedOrderIds] = useState<Set<string>>(() => getDismissedOrderIds())
  
  // Track previously seen order IDs to detect NEW orders
  const seenOrderIds = useRef<Set<string>>(new Set())
  const isInitialLoad = useRef(true)
  
  // Ref to access dismissedOrderIds inside callbacks without adding to dependencies
  const dismissedOrderIdsRef = useRef(dismissedOrderIds)
  dismissedOrderIdsRef.current = dismissedOrderIds

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
      setDismissedOrderIds(prev => {
        const newSet = new Set([...prev, pendingOrderForPopup.id])
        saveDismissedOrderIds(newSet)
        return newSet
      })
    }
    setPendingOrderForPopup(null)
  }, [pendingOrderForPopup])

  // Handle status update from popup
  const handleStatusUpdate = useCallback((orderId: string, newStatus: string) => {
    console.log("[v0] handleStatusUpdate called:", orderId, newStatus)
    
    // Update local state immediately for instant UI feedback
    setAllOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus as FirestoreOrder["status"] }
        : order
    ))
    
    // Add to dismissed so popup doesn't reappear
    setDismissedOrderIds(prev => {
      const newSet = new Set([...prev, orderId])
      saveDismissedOrderIds(newSet)
      return newSet
    })
    
    // Clear popup if this was the displayed order
    setPendingOrderForPopup(prev => prev?.id === orderId ? null : prev)
  }, [])

  useEffect(() => {
    if (!storeId) {
      setIsLoading(false)
      return
    }

    console.log("[v0] Setting up Firestore listener for storeId:", storeId)
    setIsLoading(true)
    setError(null)
    isInitialLoad.current = true

    // Calculate 14 days ago for filtering
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    fourteenDaysAgo.setHours(0, 0, 0, 0)

    // Query for ALL orders for this store
    const ordersQuery = query(
      collection(db, "orders"),
      where("storeId", "==", storeId),
      orderBy("createdAt", "desc")
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        console.log("[v0] Firestore snapshot received, docs:", snapshot.docs.length)
        
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
        
        console.log("[v0] Filtered orders:", filteredOrders.length, "Pending:", filteredOrders.filter(o => o.status === "pending").length)
        
        // Detect NEW pending orders (not seen before)
        const currentOrderIds = new Set(filteredOrders.map(o => o.id))
        const currentDismissedIds = dismissedOrderIdsRef.current
        const newPendingOrders = filteredOrders.filter(order => 
          order.status === "pending" && 
          !seenOrderIds.current.has(order.id) &&
          !currentDismissedIds.has(order.id)
        )
        
        console.log("[v0] New pending orders detected:", newPendingOrders.length)
        
        // Update seen order IDs
        seenOrderIds.current = currentOrderIds
        
        // If this is initial load, mark all existing pending orders as "seen" 
        // but still show popup for the most recent one
        if (isInitialLoad.current) {
          isInitialLoad.current = false
          
          // On initial load, show popup for the most recent pending order that hasn't been dismissed
          const pendingOnLoad = filteredOrders.filter(o => 
            o.status === "pending" && !currentDismissedIds.has(o.id)
          )
          
          console.log("[v0] Initial load - pending orders not dismissed:", pendingOnLoad.length)
          
          if (pendingOnLoad.length > 0) {
            // Show the most recent one (first in the list since sorted by createdAt desc)
            setPendingOrderForPopup(pendingOnLoad[0])
            console.log("[v0] Showing popup for order:", pendingOnLoad[0].orderId)
          }
        } else {
          // For subsequent updates, show popup for new pending orders
          if (newPendingOrders.length > 0) {
            setPendingOrderForPopup(newPendingOrders[0])
            console.log("[v0] Showing popup for NEW order:", newPendingOrders[0].orderId)
          }
        }
        
        setAllOrders(filteredOrders)
        setIsLoading(false)
      },
      (err) => {
        console.error("[v0] Error listening to orders:", err)
        setError(err.message)
        setIsLoading(false)
      }
    )

    return () => {
      console.log("[v0] Cleaning up Firestore listener")
      unsubscribe()
    }
  // Note: dismissedOrderIds is intentionally not in deps - we use a ref for access inside the callback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

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
