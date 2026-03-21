// Cloudinary configuration and upload utilities

const CLOUDINARY_CLOUD_NAME = "dexo5rpxb"
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`

export interface CloudinaryUploadOptions {
  preset: "store_logo" | "store_products"
  folder: string
  storeId?: string
  productId?: string
}

export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  width: number
  height: number
  format: string
}

export async function uploadToCloudinary(
  file: File,
  options: CloudinaryUploadOptions
): Promise<CloudinaryUploadResult> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", options.preset)
  formData.append("folder", options.folder)
  
  // Add metadata context if provided
  if (options.storeId || options.productId) {
    const context: string[] = []
    if (options.storeId) context.push(`storeId=${options.storeId}`)
    if (options.productId) context.push(`productId=${options.productId}`)
    formData.append("context", context.join("|"))
  }

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || "Failed to upload image to Cloudinary")
  }

  const data = await response.json()
  
  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
  }
}

export async function uploadStoreLogo(
  file: File,
  storeId: string
): Promise<string> {
  const result = await uploadToCloudinary(file, {
    preset: "store_logo",
    folder: "store-images/logos",
    storeId,
  })
  return result.secure_url
}

export async function uploadProductImage(
  file: File,
  storeId: string,
  productId: string
): Promise<string> {
  const result = await uploadToCloudinary(file, {
    preset: "store_products",
    folder: `stores/${storeId}/products/${productId}`,
    storeId,
    productId,
  })
  return result.secure_url
}
