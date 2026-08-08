import imageCompression from 'browser-image-compression'

export async function compressToBlob(file: File): Promise<Blob> {
  try {
    return await imageCompression(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1080,
      useWebWorker: true
    })
  } catch {
    return file
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta.match(/data:(.*?);/)?.[1] || 'image/jpeg'
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
