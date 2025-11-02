import { useSyncExternalStore } from 'react';
import type {createDocumentStore} from "./DocumentStore.ts";

type Store = ReturnType<typeof createDocumentStore>
export function useAllDocuments(store: Store) {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getAll(),
    () => store.getAll()
  )
}

// b) Subscribe to a single doc via swappables-only channel
export function useActiveDocument(
  store: Store,
  getDocId: () => string | null
) {
  return useSyncExternalStore(
    store.subscribeSwappables,
    () => {
      const id = getDocId()
      return id ? store.getDoc(id) : null
    },
    () => {
      const id = getDocId()
      return id ? store.getDoc(id) : null
    }
  )
}