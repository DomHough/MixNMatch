// SwappableView.tsx
import * as React from "react"
import {NodeViewWrapper, type ReactNodeViewProps} from "@tiptap/react"
import type { createDocumentStore } from "../DocumentStore"
import {useCallback, useEffect, useMemo, useRef, useState} from "react";

type DocumentStore = ReturnType<typeof createDocumentStore>

function shallowEqualObj(a: Record<string, any>, b: Record<string, any>) {
  const ak = Object.keys(a), bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  for (const k of ak) if (a[k] !== b[k]) return false
  return true
}

export function SwappableView(props: ReactNodeViewProps) {
  const { node } = props
  const { store, getDocId, onClick } = (props.editor.storage.swappable ??
    props.extension.options) as {
    store: DocumentStore
    getDocId: () => string | null
    onClick?: (id: string | null, variantId: string | null) => void
  }

  const { id, variantId } = node.attrs as { id: string; variantId?: string }

  // Track the current document ID so we can react when it changes
  // Must call this before any early returns to satisfy Rules of Hooks
  const currentDocId = store && getDocId ? getDocId() : null

  // Compute current variants once for initial render
  const compute = useCallback(() => {
    if (!store) return {}
    const doc = currentDocId ? store.getDoc(currentDocId) : null
    return (doc?.swappables?.[id]?.variants ?? {}) as Record<string, { content: string }>
  }, [store, id, currentDocId])

  const [variants, setVariants] = useState<Record<string, { content: string }>>(() => compute())
  const lastRef = useRef(variants)

  // Update variants whenever the document ID changes
  useEffect(() => {
    const next = compute()
    if (!shallowEqualObj(lastRef.current, next)) {
      lastRef.current = next
      setVariants(next)
    }
  }, [currentDocId, compute])

  // Subscribe AFTER mount; update only when value actually changes
  useEffect(() => {
    if (!store) return
    const unsub = store.subscribeSwappables(() => {
      queueMicrotask(() => {
        const next = compute()
        if (!shallowEqualObj(lastRef.current, next)) {
          lastRef.current = next
          setVariants(next)
        }
      })
    })
    return () => { unsub() }
  }, [store, compute])

  const keys = useMemo(() => Object.keys(variants), [variants])

  // Early return AFTER all hooks
  if (!store || !getDocId) {
    return <span data-swappable>[swappable misconfigured]</span>
  }

  const content =
    (variantId && variants[variantId]?.content) ??
    (keys[0] ? variants[keys[0]]?.content : "[missing variants]")

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClick?.(id, variantId ?? null)
  }

  return (
    <NodeViewWrapper
      as="span"
      data-swappable
      onClick={handleClick}
      className="rounded-md ring-1 ring-indigo-300/80 bg-indigo-50/40 dark:bg-indigo-400/10 px-1 hover:bg-indigo-100/60 dark:hover:bg-indigo-400/20 cursor-pointer"
      title={variantId ? `Variant: ${variantId}` : "No variant selected"}
    >
      {content}
    </NodeViewWrapper>
  )
}