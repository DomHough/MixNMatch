export type Listener = () => void

export type SwappableId = string
export type VariantId = string
export type DocumentId = string

export type VariantType = {
  id: VariantId
  content: string
  name: string
}

export type SwappableType = {
  id: SwappableId
  variants: Record<string, VariantType>
  name: string
}
export type DocumentType = {
  id: DocumentId
  name: string
  content: string
  swappables: Record<string, SwappableType>
  modified: Date
}

export function createDocumentStore(initial: Record<DocumentId, DocumentType>) {
  let docs = initial
  // global listeners (documents, content, everything)
  const listeners = new Set<Listener>()
  // swappables-only listeners (NO content notifications!)
  const swapListeners = new Set<Listener>()

  // microtask batched notifiers
  let pendingAll = false
  const notifyAll = () => {
    if (pendingAll) return
    pendingAll = true
    queueMicrotask(() => {
      pendingAll = false
      for (const l of listeners) l()
    })
  }

  let pendingSwap = false
  const notifySwappables = () => {
    if (pendingSwap) return
    pendingSwap = true
    queueMicrotask(() => {
      pendingSwap = false
      for (const l of swapListeners) l()
    })
  }

  const touch = (doc: DocumentType): DocumentType => ({ ...doc, modified: new Date() })

  return {
    subscribe(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn) },
    subscribeSwappables(fn: Listener) { swapListeners.add(fn); return () => swapListeners.delete(fn) },

    getAll() { return docs },
    getDoc(id: DocumentId) { return docs[id] ?? null },


    // ----------------
    // Documents
    // ----------------
    // Create and add a new document with defaults. Returns the created document.
    createDocument(data?: { id?: DocumentId; name?: string; content?: string; swappables?: Record<string, SwappableType> }) {
      const id = data?.id ?? crypto.randomUUID()
      const newDoc: DocumentType = {
        id: id,
        name: data?.name ?? 'Document',
        content: data?.content ?? '',
        swappables: data?.swappables ?? {},
        modified: new Date(),
      }
      docs = { ...docs, [id]: newDoc }
      notifyAll()
      // If document has swappables, notify swappable listeners too
      if (data?.swappables && Object.keys(data.swappables).length > 0) {
        notifySwappables()
      }
      return newDoc
    },

    upsertDoc(doc: DocumentType) {
      docs = { ...docs, [doc.id]: doc }
      notifyAll()
    },

    updateDoc(id: DocumentId, updater: (prev: DocumentType) => DocumentType) {
      const prev = docs[id]; if (!prev) return
      docs = { ...docs, [id]: updater(prev) }
      notifyAll()
      return true
    },

    setContent(id: DocumentId, nextContent: string) {
      const prev = docs[id]; if (!prev) return
      docs = { ...docs, [id]: { ...prev, content: nextContent, modified: new Date() } }
      notifyAll()
      return true
    },

    deleteDocument: (docId: DocumentId) => {
      if (!(docId in docs)) return false
      const { [docId]: _, ...rest } = docs
      docs = rest
      notifyAll()
      return true
    },

    // ----------------
    // Swappables
    // ----------------
    createSwappable(docId: DocumentId, data?: { id?: SwappableId; name?: string; variants?: Record<string, VariantType> }) {
      const doc = docs[docId]; if (!doc) return null
      const id = data?.id ?? crypto.randomUUID()
      const sw: SwappableType = {
        id,
        name: data?.name ?? 'Swappable',
        variants: data?.variants ?? {},
      }
      docs = {
        ...docs,
        [docId]: touch({
          ...doc,
          swappables: {
            ...doc.swappables,
            [id]: sw
          }
        })
      }
      notifyAll()
      notifySwappables()
      return sw
    },
    upsertSwappable(docId: DocumentId, s: SwappableType) {
      const prev = docs[docId]; if (!prev) return
      docs = {
        ...docs,
        [docId]: {
          ...prev,
          swappables: { ...prev.swappables, [s.id]: s },
          modified: new Date()
        }
      }
      notifyAll()
      notifySwappables()
    },

    deleteSwappable(docId: DocumentId, swappableId: SwappableId) {
      const doc = docs[docId];
      if (!doc || !(swappableId in doc.swappables)) return false
      const { [swappableId]: _, ...rest } = doc.swappables
      docs = {
        ...docs,
        [docId]: touch({
          ...doc,
          swappables: rest
        })
      }
      notifyAll()
      notifySwappables()
      return true
    },

    // ----------------
    // Variants
    // ----------------

    createVariant(docId: DocumentId, swappableId: SwappableId, data?: { id?: VariantId; name?: string; content?: string}) {
      const doc = docs[docId]; if (!doc) return null
      const sw = doc.swappables[swappableId]; if (!sw) return null
      const id = data?.id ?? crypto.randomUUID()
      const variant: VariantType = {
        id,
        name: data?.name ?? 'Variant',
        content: data?.content ?? '',
      }
      docs = {
        ...docs,
        [docId]: touch({
          ...doc,
          swappables: {
            ...doc.swappables,
            [swappableId]: {
              ...sw,
              variants: {
                ...sw.variants,
                [id]: variant
              }
            }
          }
        })
      }
      notifyAll()
      notifySwappables()
      return variant
    },

    upsertVariant(id: DocumentId, swappableId: SwappableId, v: VariantType) {
      const prev = docs[id]; if (!prev) return
      const swappable = prev.swappables[swappableId]; if (!swappable) return
      docs = {
        ...docs,
        [id]: {
          ...prev,
          swappables: {
            ...prev.swappables,
            [swappableId]: {
              ...swappable,
              variants: {
                ...swappable.variants,
                [v.id]: v
              }
            }
          },
          modified: new Date()
        }
      }
      notifyAll()
      notifySwappables()
      return true
    },

    deleteVariant(docId: DocumentId, swappableId: SwappableId, variantId: VariantId) {
      const doc = docs[docId]; if (!doc) return false
      const sw = doc.swappables[swappableId];
      if (!sw || !(variantId in sw.variants)) return false
      const { [variantId]: _, ...rest } = sw.variants
      docs = {
        ...docs,
        [docId]: touch({
          ...doc,
          swappables: {
            ...doc.swappables,
            [swappableId]: {
              ...sw,
              variants: rest
            }
          }
        })
      }
      notifyAll()
      notifySwappables()
      return true
    }

  }
}