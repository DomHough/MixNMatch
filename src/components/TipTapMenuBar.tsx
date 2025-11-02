import type {Editor} from "@tiptap/react";
import Button from "./Button.tsx";

type MenuProps = {
  editor: Editor
}
export function TipTapMenuBar({ editor }: MenuProps) {
  return (
    <div className="flex flex-row p-2 gap-2">
      <Button variant="surface" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="H1">
        H1
      </Button>
      <Button variant="surface" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="H2">
        H2
      </Button>
      <Button variant="surface" onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold">
        B
      </Button>
      <Button variant="surface" onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic">
        I
      </Button>
      <Button variant="surface" onClick={() => editor.chain().focus().toggleUnderline().run()} aria-label="Underline">
        U
      </Button>
      <Button variant="surface" onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullets">
        .
      </Button>
      <Button
        variant="surface"
        onClick={() => {
          const url = window.prompt('Image URL')
          if (url) editor.chain().focus().setImage({ src: url }).run()
        }}
        aria-label="Image"
      >
        Img
      </Button>
      <Button
        variant="surface"
        onClick={() => {
          const url = window.prompt('Link URL')
          if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
        }}
        aria-label="Link"
      >
        Link
      </Button>
      <Button variant="surface" onClick={() => console.log(editor.getHTML())} aria-label="Log HTML">
        Log HTML
      </Button>
    </div>
  )
}