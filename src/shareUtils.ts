import type { DocumentType, SwappableType } from './DocumentStore.ts'
import pako from 'pako'

export type ShareableDocumentData = {
  name: string
  content: string
  swappables: Record<string, SwappableType>
}

/**
 * Encode a document to a shareable URL-safe string
 */
export function encodeDocumentToShare(doc: DocumentType): string {
  // Create a clean copy without the ID (we'll generate a new one on import)
  const shareData: ShareableDocumentData = {
    name: doc.name,
    content: doc.content,
    swappables: doc.swappables
  }

  // Convert to JSON
  const json = JSON.stringify(shareData)

  // Compress using pako (gzip)
  const compressed = pako.deflate(json)

  // Convert to base64 (URL-safe)
  return btoa(String.fromCharCode(...compressed))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Decode a shareable string back to document data
 */
export function decodeDocumentFromShare(encoded: string): ShareableDocumentData | null {
  try {
    // Convert from URL-safe base64
    const base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    // Add padding if needed
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)

    // Decode base64
    const binaryString = atob(padded)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Decompress
    const decompressed = pako.inflate(bytes, { to: 'string' })

    // Parse JSON
    return JSON.parse(decompressed) as ShareableDocumentData
  } catch (error) {
    console.error('Failed to decode shared document:', error)
    return null
  }
}

/**
 * Generate a shareable URL for a document
 */
export function generateShareableURL(doc: DocumentType): string {
  const encoded = encodeDocumentToShare(doc)
  const baseURL = window.location.origin + window.location.pathname
  return `${baseURL}#share=${encoded}`
}

/**
 * Extract shared document data from the current URL
 */
export function getSharedDocumentFromURL(): ShareableDocumentData | null {
  const hash = window.location.hash
  if (!hash.startsWith('#share=')) {
    return null
  }

  const encoded = hash.substring(7) // Remove '#share='
  return decodeDocumentFromShare(encoded)
}

/**
 * Clear the shared document from the URL
 */
export function clearSharedDocumentFromURL(): void {
  if (window.location.hash.startsWith('#share=')) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}

