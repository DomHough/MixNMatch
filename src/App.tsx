import './App.css'
import {EditorContent, useEditor} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {Placeholder} from "@tiptap/extension-placeholder";
import {useEffect, useMemo, useState} from "react";
import {TipTapMenuBar} from "./components/TipTapMenuBar.tsx";
import Button from "./components/Button.tsx"
import SideDocument from "./components/SideDocument.tsx";
import {
  MdAutoFixHigh,
  MdLightMode,
  MdDarkMode,
  MdOutlineArticle,
  MdDelete,
  MdCloudDone,
  MdCloudQueue,
} from "react-icons/md";
import {Swappable} from "./Swappable.ts";
import StringInput from "./components/StringInput.tsx";
import {useActiveDocument, useAllDocuments} from "./useDocumentStore.ts";
import {createDocumentStore, type VariantType, type SwappableType} from "./DocumentStore.ts";
import DropdownButton from "./components/DropdownButton.tsx";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveDocumentsToStorage, loadDocumentsFromStorage } from './storage.ts';





function App() {
  const store = useMemo(() => {
    const savedDocuments = loadDocumentsFromStorage()
    return createDocumentStore(savedDocuments)
  }, []);

  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const getActiveDocId = () => activeDocId
  const activeDoc   = useActiveDocument(store, getActiveDocId)
  const documents   = useAllDocuments(store)

  // Theme state: 'light', 'dark', or 'system' (follows prefers-color-scheme)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('theme')
    if (saved) {
      return saved as 'light' | 'dark' | 'system'
    }

    // On first load, check system preference and set accordingly
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })

  // Apply theme to HTML element
  useEffect(() => {
    const root = document.documentElement

    if (theme === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }

    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(current => {
      if (current === 'system' || current === 'light') return 'dark'
      return 'light'
    })
  }

  // Determine which icon to show based on current effective theme
  const getThemeIcon = () => {
    if (theme === 'dark') return <MdDarkMode />
    return <MdLightMode />
  }

  // Track save status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')


  const [editingSwappableId, setEditingSwappableId] = useState<string>("");
  const editingSwappable = activeDoc?.swappables[editingSwappableId];




  // Whenever activeDoc changes, update the ref and set editor content
  // (use a small effect via immediate code in component body is not possible; add below after editor creation)
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true }),
      Image,
      Placeholder.configure({ placeholder: 'Write something...' }),
      Swappable.configure({
        store,
        getDocId: () => activeDocId,
        onClick: (id: string) => {
          setEditingSwappableId(id || "");
        }
      })
    ],
    content: activeDoc?.content ?? "",
    onUpdate: ({ editor }) => {
      if (!activeDocId) return
      const nextHTML = editor.getHTML()
      const current = store.getDoc(activeDocId)
      if (current && current.content !== nextHTML) {
        store.setContent(activeDocId, nextHTML)   // this will now notify async
      }
    },
    autofocus: true,
  })

  useEffect(() => {
    if (!editor) return
    // keep swappable storage options fresh (cast to any to satisfy TS)
    const storage: any = editor.storage
    if (storage?.swappable) {
      storage.swappable.getDocId = () => activeDocId
    }
  }, [editor, activeDocId])

// when the active document content changes, update the editor
  useEffect(() => {
    if (!editor) return
    const newContent = activeDoc?.content ?? ""
    const current = editor.getHTML()
    if (current !== newContent) {
      editor.commands.setContent(newContent)
    }
  }, [editor, activeDoc?.content])

  useEffect(() => {
    setEditingSwappableId("")
  }, [activeDocId])

  const newSwappable = () => {
    if (!editor || !activeDocId) return
    const { from, to } = editor.state.selection;
    const swappableId = crypto.randomUUID()
    const variantId = crypto.randomUUID()


    // capture selected text before inserting node
    const selectedText = editor.state.doc.textBetween(from, to, '')

    editor.chain().focus().insertSwappable({ id: swappableId, variantId: variantId }).run()

    const newVariant: VariantType = {
      id: variantId,
      content: selectedText,
      name: "Variant 1"
    }
    store.createSwappable(activeDocId, { id: swappableId, variants: { [variantId]: newVariant } })


    return { swappableId, variantId }
  }


  const addNewVariant = () => {
    if (!activeDocId || !editingSwappableId) return

    store.createVariant(activeDocId, editingSwappableId)
  }

  const getSwappableActiveVariants = () => {
    if (!editor) return {}
    const schema = editor.state?.schema
    if (!schema) return {}
    const nodeType = schema.nodes['swappable']
    if (!nodeType) return {}
    const out: Record<string, string> = {}
    editor.state.doc.descendants((node) => {
      if (node.type === nodeType) {
        const id = node.attrs?.id
        const variant = node.attrs?.variantId
        if (id != null && variant != null) out[id] = variant
      }
    })
    return out
  }

  const updateDocumentName = (newName: string) => {
    if (!activeDoc || !activeDocId) return
    store.upsertDoc({ ...activeDoc, name: newName })
  }


  const updateVariantName = (newName: string, variantId: string) => {
    if (!editingSwappableId || !activeDoc || !activeDocId) return
    const swappable = activeDoc.swappables[editingSwappableId]
    const variant = swappable.variants[variantId]
    const updatedVariant: VariantType = {
      ...variant,
      name: newName
    }
    store.upsertVariant(activeDocId, editingSwappableId, updatedVariant)
  }

  const updateVariantContent = (newContent: string, variantId: string) => {
    if (!editingSwappableId || !activeDoc || !activeDocId) return
    const swappable = activeDoc.swappables[editingSwappableId]
    const variant = swappable.variants[variantId]
    const updatedVariant: VariantType = {
      ...variant,
      content: newContent
    }
    store.upsertVariant(activeDocId, editingSwappableId, updatedVariant)
  }

  const deleteVariant = (variantId: string) => {
    if (!editingSwappableId || !activeDoc || !activeDocId || !editor) return
    const swappable = activeDoc.swappables[editingSwappableId]

    // Check if this is the last variant
    const variantCount = Object.keys(swappable.variants).length
    if (variantCount <= 1) {
      alert("Cannot delete the last variant. Delete the swappable instead.")
      return
    }

    // Check if this variant is currently active in the editor
    const activeVariantId = swappableActiveVariants[editingSwappableId]
    if (activeVariantId === variantId) {
      // Switch to a different variant before deleting
      const remainingVariants = Object.keys(swappable.variants).filter(id => id !== variantId)
      if (remainingVariants.length > 0) {
        setSwappableVariant(editingSwappableId, remainingVariants[0])
      }
    }

    // Delete the variant from the store
    store.deleteVariant(activeDocId, editingSwappableId, variantId)
  }

  const deleteSwappable = () => {
    if (!editingSwappableId || !activeDocId || !editor) return

    // Remove the swappable node from the editor
    editor.chain().focus().removeSwappable({ id: editingSwappableId }).run()

    // Delete the swappable from the store
    store.deleteSwappable(activeDocId, editingSwappableId)

    // Close the editing panel
    setEditingSwappableId("")
  }

  const newDocument = () => {
    const newDoc = store.createDocument()
    setActiveDocId(newDoc.id)
  }

  const copyDocument = (docId: string) => {
    const doc = store.getDoc(docId)
    if (!doc) return
    
    // Deep copy the swappables to avoid reference issues
    const copiedSwappables: Record<string, SwappableType> = {}
    for (const swapId in doc.swappables) {
      const swap = doc.swappables[swapId]
      const copiedVariants: Record<string, VariantType> = {}
      for (const varId in swap.variants) {
        const variant = swap.variants[varId]
        copiedVariants[varId] = { ...variant }
      }
      copiedSwappables[swapId] = {
        ...swap,
        variants: copiedVariants
      }
    }
    
    const copiedDoc = store.createDocument({
      name: `${doc.name} (Copy)`,
      content: doc.content,
      swappables: copiedSwappables
    })
    setActiveDocId(copiedDoc.id)
  }

  const deleteDocument = (docId: string) => {
    const success = store.deleteDocument(docId)
    if (success && activeDocId === docId) {
      // If we deleted the active document, clear the active doc
      setActiveDocId(null)
    }
  }

  const downloadDocument = (docId: string) => {
    const doc = store.getDoc(docId)
    if (!doc) return

    // Create JSON string with the document data
    const jsonData = JSON.stringify(doc, null, 2) // Pretty print with 2-space indent

    // Create a blob from the JSON data
    const blob = new Blob([jsonData], { type: 'application/json' })

    // Create a download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = doc.name ? `${doc.name}.mixnmatch` : 'untitled.mixnmatch'

    // Trigger download
    document.body.appendChild(link)
    link.click()

    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const importDocument = () => {
    // Create a file input element
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mixnmatch,.json'

    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      // Read the file
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string
          const importedDoc = JSON.parse(content)

          // Validate that it has the required structure
          if (!importedDoc.content || !importedDoc.swappables) {
            alert('Invalid document format')
            return
          }

          // Create a new document with the imported data
          // Don't use the old ID, let the store generate a new one
          const newDoc = store.createDocument({
            name: importedDoc.name || '',
            content: importedDoc.content,
            swappables: importedDoc.swappables
          })


          // Set as active document
          setActiveDocId(newDoc.id)
        } catch (error) {
          console.error('Failed to import document:', error)
          alert('Failed to import document. Please check the file format.')
        }
      }

      reader.readAsText(file)
    }

    // Trigger file picker
    input.click()
  }

  const exportPDF = async () => {
    if (!activeDoc || !editor) return

    try {
      // Find the editor content element
      const editorElement = document.querySelector('.ProseMirror') as HTMLElement
      if (!editorElement) {
        alert('Could not find editor content to export')
        return
      }

      // Create a temporary container for rendering
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '0'
      tempContainer.style.width = '794px' // A4 width in pixels at 96 DPI
      tempContainer.style.padding = '60px'
      tempContainer.style.backgroundColor = '#ffffff'
      tempContainer.style.color = '#000000'
      tempContainer.style.fontFamily = 'Arial, sans-serif'
      tempContainer.style.fontSize = '16px'
      tempContainer.style.lineHeight = '1.6'
      tempContainer.innerHTML = editorElement.innerHTML
      document.body.appendChild(tempContainer)

      // Remove all class attributes and inline styles that might contain oklab
      // and replace with simple black text on white background
      const allElements = tempContainer.querySelectorAll('*')
      allElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.removeAttribute('class')
          el.style.color = '#000000'
          el.style.backgroundColor = 'transparent'

          // Preserve some basic formatting
          if (el.tagName === 'STRONG' || el.tagName === 'B') {
            el.style.fontWeight = 'bold'
          }
          if (el.tagName === 'EM' || el.tagName === 'I') {
            el.style.fontStyle = 'italic'
          }
          if (el.tagName === 'U') {
            el.style.textDecoration = 'underline'
          }
          if (el.tagName === 'H1') {
            el.style.fontSize = '32px'
            el.style.fontWeight = 'bold'
            el.style.marginTop = '24px'
            el.style.marginBottom = '16px'
          }
          if (el.tagName === 'H2') {
            el.style.fontSize = '24px'
            el.style.fontWeight = 'bold'
            el.style.marginTop = '20px'
            el.style.marginBottom = '12px'
          }
          if (el.tagName === 'H3') {
            el.style.fontSize = '20px'
            el.style.fontWeight = 'bold'
            el.style.marginTop = '16px'
            el.style.marginBottom = '8px'
          }
          if (el.tagName === 'P') {
            el.style.marginTop = '0'
            el.style.marginBottom = '16px'
          }
        }
      })

      // Replace all swappable nodes with their active variant content
      const swappableElements = tempContainer.querySelectorAll('[data-swappable-id]')
      swappableElements.forEach((element) => {
        const swappableId = element.getAttribute('data-swappable-id')
        const variantId = element.getAttribute('data-variant-id')

        if (swappableId && variantId && activeDoc.swappables[swappableId]) {
          const variant = activeDoc.swappables[swappableId].variants[variantId]
          if (variant) {
            // Replace the swappable node with just the text content
            const textNode = document.createTextNode(variant.content)
            element.replaceWith(textNode)
          }
        }
      })

      // Convert to canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      // Remove temporary container
      document.body.removeChild(tempContainer)

      // Create PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Calculate dimensions to fit A4 page
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * pdfWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight

      // Add additional pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      // Download the PDF
      const filename = activeDoc.name ? `${activeDoc.name}.pdf` : 'untitled.pdf'
      pdf.save(filename)
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Failed to export PDF. Please try again.')
    }
  }

  const [swappableActiveVariants, setSwappableActiveVariants] = useState(getSwappableActiveVariants())

  useEffect(() => {
    setSwappableActiveVariants(getSwappableActiveVariants())
  }, [editor, activeDoc])

  // Auto-save documents to localStorage every 5 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      const allDocs = store.getAll()
      saveDocumentsToStorage(allDocs)
      setSaveStatus('saved')
    }, 5000) // 5000ms = 5 seconds

    // Also save when component unmounts
    return () => {
      clearInterval(intervalId)
      const allDocs = store.getAll()
      saveDocumentsToStorage(allDocs)
    }
  }, [store])

  // Mark as unsaved when documents change
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setSaveStatus('saving')
    })
    return () => {
      unsubscribe()
    }
  }, [store])

  const setSwappableVariant = (swappableId: string, variantId: string) => {
    if (!editor) return
    editor.chain().focus().setSwappableVariant({ id: swappableId, variantId }).run()
    setSwappableActiveVariants(getSwappableActiveVariants())
  }

  return (
    <div className="flex flex-row min-h-dvh bg-background">
      <div className="flex flex-col bg-surface p-4 gap-2 border-r-1 border-on-background">
        <div className="flex flex-row items-center text-3xl">
          <MdOutlineArticle className="text-on-surface"/>
          <h1 className="text-on-surface">Documents</h1>
        </div>

        <Button variant="background" onClick={newDocument}>New Document</Button>
        { Object.keys(documents).map(key => (
          <SideDocument
            key={key}
            document={documents[key]}
            active={activeDoc?.id == key}
            setActiveDocument={() => setActiveDocId(key)}
            onCopyDocument={() => copyDocument(key)}
            onDeleteDocument={() => deleteDocument(key)}
          />
        ))}
      </div>
      <div className="flex flex-col flex-1">
        <div className="flex flex-row bg-surface  border-b-1 border-on-background">
          <div className="flex flex-row p-2">
            { activeDocId && (
              <StringInput
                value={activeDoc?.name || ""}
                onChange={e => updateDocumentName(e.target.value)}
                placeholder="Untitled Document"
              />
            )}
          </div>
          <div className="flex flex-row flex-1 gap-2 p-2 justify-end">
            <DropdownButton
              items={[
                {
                  label: "Import Document",
                  onClick: importDocument
                },
                ...(activeDocId ? [
                  {
                    label: "Download Document",
                    onClick: () => downloadDocument(activeDocId)
                  },
                  {
                    label: "Export PDF",
                    onClick: exportPDF
                  }
                ] : [])
              ]}
              variant="background"
            >
              File
            </DropdownButton>
            { activeDocId && (
              <DropdownButton
                items={[
                  {
                    label: "Copy Shareable Link",
                    onClick: () => console.log("Copy Shareable Link")
                  }
                ]}
                variant="primary"
              >
                Share
              </DropdownButton>
            )}
            <div className="flex items-center gap-1 text-on-background" title={saveStatus === 'saved' ? 'All changes saved' : 'Saving...'}>
              {saveStatus === 'saved' ? (
                <MdCloudDone className="text-xl" />
              ) : (
                <MdCloudQueue className="text-xl animate-pulse" />
              )}
              <span className="text-sm">
                {saveStatus === 'saved' ? 'Saved' : 'Saving...'}
              </span>
            </div>
            <Button variant="background" onClick={toggleTheme}>{getThemeIcon()}</Button>
            <DropdownButton
              items={[

              ]}
              variant="background"
            >
              Settings
            </DropdownButton>
          </div>

        </div>
        { activeDocId && (
          <div className="flex flex-row bg-surface border-b-1 border-on-background">
            <TipTapMenuBar editor={editor} />
            <div className="flex flex-row flex-1 justify-end p-2">
              <Button onClick={newSwappable}><MdAutoFixHigh className="text-on-primary text-2xl"/>Make swap</Button>
            </div>
          </div>
        )}

        { activeDocId
          ? (
          <div className="flex flex-row flex-1">
            <div className="flex flex-1 h-full p-8 justify-center">
              <div
                className="flex w-[794px] h-[1123px] bg-surface rounded-xl"
                onClick={() => {
                  // Only move cursor to end if there's no text selection
                  if (editor && editor.state.selection.empty) {
                    editor.commands.focus('end')
                  }
                }}
              >
                <div className="flex h-full w-full p-16">
                  <EditorContent editor={editor} className="w-full h-full rounded-xl"/>
                </div>
              </div>
            </div>
            { editingSwappable && (
              <div className="flex flex-col h-full bg-surface p-4 border-l-1 border-on-background gap-2">
                <div className="flex flex-row items-center justify-between pb-2 border-b-1 border-on-background">
                  <h2 className="text-xl font-semibold text-on-surface">Edit Variants</h2>
                  <Button
                    variant="background"
                    className="w-8 h-8 p-0 flex items-center justify-center text-2xl"
                    onClick={() => setEditingSwappableId("")}
                  >
                    ×
                  </Button>
                </div>
                {Object.keys(editingSwappable.variants).map((key) => (
                  <div key={key} className="flex flex-col gap-1 bg-background p-2 rounded-xl">
                    <div className="flex flex-row gap-1">
                      <StringInput
                        className="bg-surface flex-1"
                        value={editingSwappable.variants[key].name}
                        onChange={(e) => updateVariantName(e.target.value, key)}
                      />
                      <Button variant="primary" onClick={() => setSwappableVariant(editingSwappableId, key)}>
                        {swappableActiveVariants[editingSwappable.id] === key ? "Selected" : "Use"}
                      </Button>
                      <Button
                        variant="background"
                        className="w-8 h-8 p-0 flex items-center justify-center"
                        onClick={() => deleteVariant(key)}
                      >
                        <MdDelete className="text-on-background" />
                      </Button>
                    </div>
                    <textarea
                      className="bg-surface text-on-surface p-1 rounded"
                      value={editingSwappable.variants[key].content}
                      onChange={(e) => updateVariantContent(e.target.value, key)}
                    />
                  </div>
                ))}
                <Button onClick={addNewVariant}>Add Variant</Button>
                <div className="border-t-1 border-on-background pt-2 mt-2">
                  <Button
                    variant="background"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={deleteSwappable}
                  >
                    <MdDelete className="text-on-background" />
                    Delete Swappable
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
            <div className="flex flex-col flex-1 items-center justify-center gap-6 p-8">
              <MdOutlineArticle className="text-6xl text-on-surface/60" />
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-on-surface mb-2">No document selected</h2>
                <p className="text-sm text-on-surface/70">Create a new document or pick one from the list on the left to get started.</p>
              </div>
              <Button variant="primary" onClick={newDocument}>Create Document</Button>
            </div>
        )}

      </div>
    </div>
  )
}

export default App
