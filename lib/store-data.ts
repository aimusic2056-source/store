// Placeholder data bindings for Firebase/Firestore connection
// All values here are placeholders that will be replaced with live data

export interface Order {
  id: string
  customerName: string
  time: string
  price: number
  status: "pending" | "accepted" | "completed"
  image: string
}

export interface Notification {
  id: string
  type: "order" | "payment" | "driver" | "system"
  title: string
  message: string
  timestamp: string
  read: boolean
}

export interface Product {
  id: string
  name: string
  price: number
  stock: number
  category: string
  unit: string
  description: string
  image: string
  available: boolean
}

export interface OpeningHour {
  day: string
  isOpen: boolean
  openTime: string
  closeTime: string
}

export interface StoreInfo {
  logo: string
  name: string
  address: string
  phone: string
}

export interface StoreData {
  storeName: string
  storeStatus: boolean
  storeStatusManualOverride: boolean
  revenueToday: number
  ordersToday: number
  completedOrders: number
  pendingOrders: number
  weeklyRevenue: number
  customerRating: number
  totalReviews: number
  recentOrders: Order[]
  notifications: Notification[]
  products: Product[]
  openingHours: OpeningHour[]
  storeInfo: StoreInfo
}

// Placeholder data - will be replaced by Firebase/Firestore bindings
export const placeholderStoreData: StoreData = {
  storeName: "",
  storeStatus: true, // {storeStatus}
  storeStatusManualOverride: false, // {storeStatusManualOverride}
  revenueToday: 0, // {revenueToday} - calculated from Firestore orders
  ordersToday: 0, // {ordersToday} - calculated from Firestore orders
  completedOrders: 0, // {completedOrders} - calculated from Firestore orders
  pendingOrders: 0, // {pendingOrders} - calculated from Firestore orders
  weeklyRevenue: 0, // {weeklyRevenue} - calculated from Firestore orders
  customerRating: 0, // {customerRating} - from store.rating in Firestore
  totalReviews: 0, // {totalReviews} - from store.reviewCount in Firestore
  recentOrders: [
    // {orderList} - populated from Firestore real-time orders
  ],
  notifications: [
    // {notifications} - populated from Firestore real-time orders
  ],
  products: [
    // {products} - placeholder binding for Firebase - populated from Firestore
  ],
  openingHours: [
    // {openingHours} - placeholder binding for Firebase
    { day: "Monday", isOpen: true, openTime: "09:00", closeTime: "21:00" },
    { day: "Tuesday", isOpen: true, openTime: "10:00", closeTime: "22:00" },
    { day: "Wednesday", isOpen: true, openTime: "09:00", closeTime: "20:00" },
    { day: "Thursday", isOpen: false, openTime: "09:00", closeTime: "21:00" },
    { day: "Friday", isOpen: true, openTime: "11:00", closeTime: "23:00" },
    { day: "Saturday", isOpen: true, openTime: "12:00", closeTime: "23:30" },
    { day: "Sunday", isOpen: false, openTime: "10:00", closeTime: "18:00" },
  ],
  storeInfo: {
    // {storeInfo} - placeholder binding for Firebase
    logo: "",
    name: "",
    address: "",
    phone: "",
  },
}
