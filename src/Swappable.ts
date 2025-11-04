import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import {createDocumentStore, type SwappableId, type VariantId} from "./DocumentStore.ts";
import { SwappableView } from './components/SwappableView.tsx';

type DocumentStore = ReturnType<typeof createDocumentStore>

export interface SwappableOpts {
  store: DocumentStore
  onClick?: (id: string | null, variantId: string | null) => void
  getDocId: () => string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    swappable: {
      insertSwappable: (attrs?: { id?: SwappableId; variantId?: VariantId }) => ReturnType
      setSwappableVariant: (payload: { id: SwappableId; variantId: VariantId }) => ReturnType
      removeSwappable: (payload?: { id?: SwappableId }) => ReturnType
    }
  }
}

export const Swappable = Node.create({
  name: 'swappable',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addOptions() {
    return {
      store: null as DocumentStore | null,
      getDocId: (() => null) as () => string | null,
      onClick: undefined as ((id: string | null, variantId: string | null) => void) | undefined,
    }
  },

  addStorage() {
    return {
      store: null as DocumentStore | null,
      getDocId: (() => null) as () => string | null,
      onClick: undefined as ((id: string | null, variantId: string | null) => void) | undefined,
    }
  },

  onCreate() {
    this.storage.store = this.options.store
    this.storage.getDocId = this.options.getDocId
    this.storage.onClick = this.options.onClick
  },

  addAttributes() {
    return {
      id: { default: null },
      variantId: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-swappable]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-swappable': '' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(SwappableView)
  },

  addCommands() {
    return {
      insertSwappable:
        (attrs) =>
          ({ chain }) =>
            chain().insertContent({ type: this.name, attrs }).run(),

      setSwappableVariant:
        ({ id, variantId }) =>
          ({ state, dispatch }) => {
            const { tr } = state
            state.doc.descendants((node, pos) => {
              if (node.type.name === 'swappable' && node.attrs.id === id) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, variantId })
              }
            })
            if (tr.docChanged && dispatch) dispatch(tr)
            return true
          },
      removeSwappable:
        (payload) =>
          ({ state, dispatch }) => {
            const { tr, selection, schema } = state
            let changed = false

            if (payload?.id) {
              state.doc.descendants((node, pos) => {
                if (node.type.name === 'swappable' && node.attrs.id === payload.id) {
                  tr.delete(pos, pos + node.nodeSize)
                  changed = true
                }
              })
            } else {
              const { from } = selection
              const $pos = state.doc.resolve(from)
              for (let i = $pos.depth; i > 0; i--) {
                const node = $pos.node(i)
                const before = $pos.before(i)
                if (node.type === schema.nodes['swappable']) {
                  tr.delete(before, before + node.nodeSize)
                  changed = true
                  break
                }
              }
            }
            if (changed && dispatch) dispatch(tr)
            return changed
          }
    }
  }
})