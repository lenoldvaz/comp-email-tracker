"use client"

import type {
  DraftBlock,
  TextBlockProps,
  ImageBlockProps,
  ButtonBlockProps,
  ColumnsBlockProps,
  DividerBlockProps,
  SpacerBlockProps,
  HeaderBlockProps,
  FooterBlockProps,
} from "@/types/draft"

interface BlockPropertiesProps {
  block: DraftBlock
  onChange: (id: string, properties: DraftBlock["properties"]) => void
  className?: string
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500">{children}</label>
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
      />
    </div>
  )
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-7 cursor-pointer rounded border" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded border px-2 py-1.5 text-xs" />
      </div>
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded border px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function TextEditor({ block, onChange }: { block: DraftBlock; onChange: (p: DraftBlock["properties"]) => void }) {
  const p = block.properties as TextBlockProps
  const update = (partial: Partial<TextBlockProps>) => onChange({ ...p, ...partial })
  return (
    <div className="space-y-3">
      <div>
        <Label>Content (HTML)</Label>
        <textarea
          value={p.content}
          onChange={(e) => update({ content: e.target.value })}
          className="mt-1 w-full rounded border px-2 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
          rows={4}
        />
      </div>
      <Input label="Font Size (px)" value={p.fontSize} onChange={(v) => update({ fontSize: parseInt(v) || 16 })} type="number" />
      <ColorInput label="Text Color" value={p.color} onChange={(v) => update({ color: v })} />
      <Select label="Alignment" value={p.alignment} onChange={(v) => update({ alignment: v as TextBlockProps["alignment"] })} options={[
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ]} />
      <Input label="Padding" value={p.padding} onChange={(v) => update({ padding: v })} />
    </div>
  )
}

function ImageEditor({ block, onChange }: { block: DraftBlock; onChange: (p: DraftBlock["properties"]) => void }) {
  const p = block.properties as ImageBlockProps
  const update = (partial: Partial<ImageBlockProps>) => onChange({ ...p, ...partial })
  return (
    <div className="space-y-3">
      <Input label="Image URL" value={p.src} onChange={(v) => update({ src: v })} />
      <Input label="Alt Text" value={p.alt} onChange={(v) => update({ alt: v })} />
      <Input label="Width" value={p.width} onChange={(v) => update({ width: v })} />
      <Input label="Link URL" value={p.link} onChange={(v) => update({ link: v })} />
      <Select label="Alignment" value={p.alignment} onChange={(v) => update({ alignment: v as ImageBlockProps["alignment"] })} options={[
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ]} />
    </div>
  )
}

function ButtonEditor({ block, onChange }: { block: DraftBlock; onChange: (p: DraftBlock["properties"]) => void }) {
  const p = block.properties as ButtonBlockProps
  const update = (partial: Partial<ButtonBlockProps>) => onChange({ ...p, ...partial })
  return (
    <div className="space-y-3">
      <Input label="Button Text" value={p.text} onChange={(v) => update({ text: v })} />
      <Input label="URL" value={p.url} onChange={(v) => update({ url: v })} />
      <ColorInput label="Background" value={p.backgroundColor} onChange={(v) => update({ backgroundColor: v })} />
      <ColorInput label="Text Color" value={p.textColor} onChange={(v) => update({ textColor: v })} />
      <Input label="Border Radius" value={p.borderRadius} onChange={(v) => update({ borderRadius: v })} />
      <Input label="Padding" value={p.padding} onChange={(v) => update({ padding: v })} />
      <Select label="Alignment" value={p.alignment} onChange={(v) => update({ alignment: v as ButtonBlockProps["alignment"] })} options={[
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ]} />
    </div>
  )
}

function ColumnsEditor({ block, onChange }: { block: DraftBlock; onChange: (p: DraftBlock["properties"]) => void }) {
  const p = block.properties as ColumnsBlockProps
  const update = (partial: Partial<ColumnsBlockProps>) => onChange({ ...p, ...partial })
  return (
    <div className="space-y-3">
      <Select label="Columns" value={String(p.columns)} onChange={(v) => {
        const cols = parseInt(v)
        const contents = [...p.contents]
        while (contents.length < cols) contents.push("")
        update({ columns: cols, contents: contents.slice(0, cols) })
      }} options={[
        { value: "2", label: "2 Columns" },
        { value: "3", label: "3 Columns" },
      ]} />
      <Input label="Gap" value={p.gap} onChange={(v) => update({ gap: v })} />
      {p.contents.map((content, i) => (
        <div key={i}>
          <Label>Column {i + 1} (HTML)</Label>
          <textarea
            value={content}
            onChange={(e) => {
              const newContents = [...p.contents]
              newContents[i] = e.target.value
              update({ contents: newContents })
            }}
            className="mt-1 w-full rounded border px-2 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
            rows={3}
          />
        </div>
      ))}
    </div>
  )
}

function DividerEditor({ block, onChange }: { block: DraftBlock; onChange: (p: DraftBlock["properties"]) => void }) {
  const p = block.properties as DividerBlockProps
  const update = (partial: Partial<DividerBlockProps>) => onChange({ ...p, ...partial })
  return (
    <div className="space-y-3">
      <ColorInput label="Color" value={p.color} onChange={(v) => update({ color: v })} />
      <Input label="Thickness (px)" value={p.thickness} onChange={(v) => update({ thickness: parseInt(v) || 1 })} type="number" />
      <Input label="Width %" value={p.widthPercent} onChange={(v) => update({ widthPercent: parseInt(v) || 100 })} type="number" />
      <Input label="Margin" value={p.margin} onChange={(v) => update({ margin: v })} />
    </div>
  )
}

function SpacerEditor({ block, onChange }: { block: DraftBlock; onChange: (p: DraftBlock["properties"]) => void }) {
  const p = block.properties as SpacerBlockProps
  const update = (partial: Partial<SpacerBlockProps>) => onChange({ ...p, ...partial })
  return (
    <div className="space-y-3">
      <Input label="Height (px)" value={p.height} onChange={(v) => update({ height: parseInt(v) || 20 })} type="number" />
    </div>
  )
}

function HeaderEditor({ block, onChange }: { block: DraftBlock; onChange: (p: DraftBlock["properties"]) => void }) {
  const p = block.properties as HeaderBlockProps
  const update = (partial: Partial<HeaderBlockProps>) => onChange({ ...p, ...partial })
  return (
    <div className="space-y-3">
      <div>
        <Label>Content (HTML)</Label>
        <textarea value={p.content} onChange={(e) => update({ content: e.target.value })} className="mt-1 w-full rounded border px-2 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none" rows={3} />
      </div>
      <ColorInput label="Background" value={p.backgroundColor} onChange={(v) => update({ backgroundColor: v })} />
      <Input label="Padding" value={p.padding} onChange={(v) => update({ padding: v })} />
      <Input label="Logo URL" value={p.logoSrc} onChange={(v) => update({ logoSrc: v })} />
      <Input label="Logo Alt" value={p.logoAlt} onChange={(v) => update({ logoAlt: v })} />
    </div>
  )
}

function FooterEditor({ block, onChange }: { block: DraftBlock; onChange: (p: DraftBlock["properties"]) => void }) {
  const p = block.properties as FooterBlockProps
  const update = (partial: Partial<FooterBlockProps>) => onChange({ ...p, ...partial })
  return (
    <div className="space-y-3">
      <div>
        <Label>Content (HTML)</Label>
        <textarea value={p.content} onChange={(e) => update({ content: e.target.value })} className="mt-1 w-full rounded border px-2 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none" rows={3} />
      </div>
      <ColorInput label="Background" value={p.backgroundColor} onChange={(v) => update({ backgroundColor: v })} />
      <Input label="Padding" value={p.padding} onChange={(v) => update({ padding: v })} />
      <Input label="Font Size (px)" value={p.fontSize} onChange={(v) => update({ fontSize: parseInt(v) || 12 })} type="number" />
      <ColorInput label="Text Color" value={p.color} onChange={(v) => update({ color: v })} />
    </div>
  )
}

const EDITORS: Record<string, (props: { block: DraftBlock; onChange: (p: DraftBlock["properties"]) => void }) => React.ReactNode> = {
  text: TextEditor,
  image: ImageEditor,
  button: ButtonEditor,
  columns: ColumnsEditor,
  divider: DividerEditor,
  spacer: SpacerEditor,
  header: HeaderEditor,
  footer: FooterEditor,
}

export function BlockProperties({ block, onChange, className }: BlockPropertiesProps) {
  const Editor = EDITORS[block.type]

  return (
    <div className={className}>
      <div className="border-b px-3 py-2">
        <h3 className="text-xs font-semibold uppercase text-gray-500">{block.type} Properties</h3>
      </div>
      <div className="p-3">
        {Editor ? <Editor block={block} onChange={(p) => onChange(block.id, p)} /> : (
          <p className="text-xs text-gray-400">No properties available</p>
        )}
      </div>
    </div>
  )
}
