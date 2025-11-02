import {MdContentCopy, MdOutlineDelete} from "react-icons/md";
import type {DocumentType} from "../DocumentStore.ts";
import Button from "./Button.tsx";

type Props = {
  document: DocumentType
  active: boolean
  setActiveDocument: () => void
  onCopyDocument: () => void
  onDeleteDocument: () => void
}

export default function SideDocument({ document, active, setActiveDocument, onCopyDocument, onDeleteDocument }: Props) {
  const bgColor = active ? "bg-background" : "bg-surface"

  const handleCopy = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    onCopyDocument()
  }

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    onDeleteDocument()
  }

  return (
    <div className={`flex flex-col p-2 rounded-xl gap-2 ${bgColor} hover:bg-background`} onClick={setActiveDocument}>
      <div className="flex flex-row">
        <div>
          <h2 className="text-on-background">{document.name || "Untitled Document"}</h2>
          <p className="text-on-background">{document.modified.toLocaleString()}</p>
        </div>
        { active && (
          <div className="bg-on-background rounded-2xl h-fit px-4 font-bold">Active</div>
        )}

      </div>
      <div className="flex flex-row gap-2">
        <Button variant={active ? "background" : "surface"} className="w-10 h-10 items-center justify-center p-0" onClick={handleCopy}>
          <MdContentCopy className="text-on-background text-2xl" />
        </Button>
        <Button variant={active ? "background" : "surface"} className="w-10 h-10 items-center justify-center p-0" onClick={handleDelete}>
          <MdOutlineDelete className="text-on-background text-2xl" />
        </Button>

      </div>
    </div>
  )
}