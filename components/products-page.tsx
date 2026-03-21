"use client"

import { ChevronLeft, Search, Pencil, Trash2, Loader2 } from "lucide-react"
import { doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Product } from "@/lib/store-data"
import { useState } from "react"

interface ProductsPageProps {
  products: Product[]
  storeId: string
  onBack: () => void
  onEditProduct: (product: Product) => void
  onDeleteProduct: (productId: string) => void
  onToggleAvailability: (productId: string) => void
}

export function ProductsPage({
  products,
  storeId,
  onBack,
  onEditProduct,
  onDeleteProduct,
  onToggleAvailability,
}: ProductsPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (productId: string) => {
    if (deletingId) return // Prevent multiple deletions

    setDeletingId(productId)
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "stores", storeId, "products", productId))
      // Update local state
      onDeleteProduct(productId)
    } catch (error) {
      console.error("Error deleting product:", error)
      alert("Failed to delete product. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed Header */}
      <div className="bg-card px-4 pt-5 pb-4 shrink-0 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-card-foreground transition-colors hover:text-primary"
              aria-label="Go back"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-card-foreground">My Products</h1>
          </div>
          <button
            className="p-2 text-muted-foreground hover:text-card-foreground transition-colors"
            aria-label="Search products"
            onClick={() => {
              const input = document.getElementById("productSearchInput")
              if (input) input.focus()
            }}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="productSearchInput"
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Scrollable Product List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        <div className="flex flex-col gap-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 shadow-sm"
              >
                {/* Product Image */}
                <img
                  src={product.image || "/images/placeholder.jpg"}
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-card-foreground truncate">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    ZMW {product.price.toFixed(2)} - In Stock: {product.stock}
                  </p>
                  {!product.available && (
                    <span className="inline-block mt-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onEditProduct(product)}
                    className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 hover:bg-primary/90"
                    aria-label={`Edit ${product.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    disabled={deletingId === product.id}
                    className="flex items-center justify-center bg-destructive text-destructive-foreground p-2 rounded-lg transition-all duration-200 active:scale-95 hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Delete ${product.name}`}
                  >
                    {deletingId === product.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
