import type { DocumentType } from './DocumentStore'

const STORAGE_KEY = 'mixnmatch_documents'

interface SerializableDocument {
  id: string
  name: string
  content: string
  swappables: Record<string, unknown>
  modified: string
}

export function saveDocumentsToStorage(documents: Record<string, DocumentType>) {
  try {
    // Convert Date objects to ISO strings for storage
    const serializable = Object.entries(documents).reduce((acc, [id, doc]) => {
      acc[id] = {
        ...doc,
        modified: doc.modified.toISOString()
      }
      return acc
    }, {} as Record<string, SerializableDocument>)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
  } catch (error) {
    console.error('Failed to save documents to storage:', error)
  }
}

export function loadDocumentsFromStorage(): Record<string, DocumentType> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}

    const parsed = JSON.parse(stored) as Record<string, SerializableDocument>

    // Convert ISO strings back to Date objects
    return Object.entries(parsed).reduce((acc, [id, doc]) => {
      acc[id] = {
        ...(doc as unknown as DocumentType),
        modified: new Date(doc.modified)
      }
      return acc
    }, {} as Record<string, DocumentType>)
  } catch (error) {
    console.error('Failed to load documents from storage:', error)
    return {}
  }
}

