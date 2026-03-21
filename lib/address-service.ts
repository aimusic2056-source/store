// Address Service - Backend-like resolver function
// This service can be easily swapped with a real address API (Google Places, Mapbox, etc.)
// without touching the UI components

export interface AddressSuggestion {
  id: string
  name: string
  fullAddress: string
  placeId?: string
  coordinates?: {
    lat: number
    lng: number
  }
}

// Mock resolver function - replace with actual API integration later
// The UI calls this function and doesn't need to know the implementation details
async function mockAddressSearch(query: string): Promise<AddressSuggestion[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  // Mock data for Zambia addresses
  const mockAddresses: AddressSuggestion[] = [
    {
      id: "1",
      name: "Cairo Road",
      fullAddress: "Cairo Road, Lusaka, Zambia",
      placeId: "mock_1",
      coordinates: { lat: -15.4167, lng: 28.2833 },
    },
    {
      id: "2",
      name: "Manda Hill Shopping Mall",
      fullAddress: "Manda Hill, Great East Road, Lusaka, Zambia",
      placeId: "mock_2",
      coordinates: { lat: -15.3875, lng: 28.3228 },
    },
    {
      id: "3",
      name: "Arcades Shopping Centre",
      fullAddress: "Great East Road, Lusaka, Zambia",
      placeId: "mock_3",
      coordinates: { lat: -15.3897, lng: 28.3356 },
    },
    {
      id: "4",
      name: "Woodlands Shopping Mall",
      fullAddress: "Woodlands, Lusaka, Zambia",
      placeId: "mock_4",
      coordinates: { lat: -15.4456, lng: 28.3012 },
    },
    {
      id: "5",
      name: "Levy Junction Mall",
      fullAddress: "Church Road, Kabulonga, Lusaka, Zambia",
      placeId: "mock_5",
      coordinates: { lat: -15.4089, lng: 28.3234 },
    },
    {
      id: "6",
      name: "East Park Mall",
      fullAddress: "Great East Road, Lusaka, Zambia",
      placeId: "mock_6",
      coordinates: { lat: -15.3923, lng: 28.3445 },
    },
    {
      id: "7",
      name: "Cosmopolitan Mall",
      fullAddress: "Kafue Road, Lusaka, Zambia",
      placeId: "mock_7",
      coordinates: { lat: -15.4567, lng: 28.2678 },
    },
    {
      id: "8",
      name: "Ndola City Centre",
      fullAddress: "Broadway, Ndola, Zambia",
      placeId: "mock_8",
      coordinates: { lat: -12.9587, lng: 28.6366 },
    },
    {
      id: "9",
      name: "Kitwe Central Business District",
      fullAddress: "Oxford Street, Kitwe, Zambia",
      placeId: "mock_9",
      coordinates: { lat: -12.8024, lng: 28.2132 },
    },
    {
      id: "10",
      name: "Livingstone Town Centre",
      fullAddress: "Mosi-oa-Tunya Road, Livingstone, Zambia",
      placeId: "mock_10",
      coordinates: { lat: -17.8419, lng: 25.8544 },
    },
  ]

  // Filter based on query
  const lowercaseQuery = query.toLowerCase()
  return mockAddresses.filter(
    (address) =>
      address.name.toLowerCase().includes(lowercaseQuery) ||
      address.fullAddress.toLowerCase().includes(lowercaseQuery)
  )
}

// ============================================
// MAIN RESOLVER FUNCTION
// ============================================
// To integrate with a real API:
// 1. Create a new function (e.g., googlePlacesSearch, mapboxSearch)
// 2. Replace the mockAddressSearch call below with your new function
// 3. Ensure the new function returns AddressSuggestion[] format

type AddressResolver = (query: string) => Promise<AddressSuggestion[]>

// Current resolver - swap this with your API integration
const currentResolver: AddressResolver = mockAddressSearch

// ============================================
// EXPORTED FUNCTION - UI CALLS THIS
// ============================================
export async function searchAddress(query: string): Promise<AddressSuggestion[]> {
  if (!query || query.length < 2) {
    return []
  }

  try {
    return await currentResolver(query)
  } catch (error) {
    console.error("Address search error:", error)
    return []
  }
}

// ============================================
// FUTURE API INTEGRATION TEMPLATES
// ============================================

// Google Places API example (for future use):
// async function googlePlacesSearch(query: string): Promise<AddressSuggestion[]> {
//   const response = await fetch(
//     `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&components=country:zm`
//   )
//   const data = await response.json()
//   return data.predictions.map((p: any) => ({
//     id: p.place_id,
//     name: p.structured_formatting.main_text,
//     fullAddress: p.description,
//     placeId: p.place_id,
//   }))
// }

// Mapbox API example (for future use):
// async function mapboxSearch(query: string): Promise<AddressSuggestion[]> {
//   const response = await fetch(
//     `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=zm`
//   )
//   const data = await response.json()
//   return data.features.map((f: any) => ({
//     id: f.id,
//     name: f.text,
//     fullAddress: f.place_name,
//     coordinates: { lat: f.center[1], lng: f.center[0] },
//   }))
// }
