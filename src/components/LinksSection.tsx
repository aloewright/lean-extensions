import { useState } from "react"
import type { CollectedLink, Settings } from "../types"

interface Props {
  links: CollectedLink[]
  onAdd: (url: string, title: string, tags?: string[]) => void
  onRemove: (id: string) => void
  onClear: () => void
  settings: Settings
  onUpdateSettings: (u: Partial<Settings>) => void
}

export function LinksSection({ links, onAdd, onRemove, onClear, settings, onUpdateSettings }: Props) {
  const [urlInput, setUrlInput] = useState("")
  const [search, setSearch] = useState("")
  const [copied, setCopied] = useState(false)

  const filtered = links.filter((l) =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.url.toLowerCase().includes(search.toLowerCase())
  )

  const sendToNotebook = () => {
    const toSend = filtered.length ? filtered : links
    chrome.runtime.sendMessage({ type: "SEND_TO_NOTEBOOK", links: toSend })
  }

  const addCurrentTab = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.url && tab?.title) {
      onAdd(tab.url, tab.title)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Collected Links</h2>
          <p className="text-xs text-fg/40 mt-0.5">{links.length} links saved</p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-xs text-fg/50">
            <input
              type="checkbox"
              checked={settings.notebookMode === "append"}
              onChange={(e) => onUpdateSettings({ notebookMode: e.target.checked ? "append" : "new" })}
              className="accent-chart-1"
            />
            Append to last notebook
          </label>
          <button
            onClick={() => {
              const md = (filtered.length ? filtered : links)
                .map((l) => `- [${l.title}](${l.url})`)
                .join("\n")
              navigator.clipboard.writeText(md)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="text-xs py-1.5 px-3 rounded bg-accent hover:bg-accent/80 transition-colors">
            {copied ? "Copied!" : "Copy as Markdown"}
          </button>
          <button onClick={sendToNotebook} className="text-xs py-1.5 px-3 rounded bg-chart-5/20 text-chart-5 hover:bg-chart-5/30 transition-colors">
            Send to NotebookLM
          </button>
          <button onClick={onClear} className="text-xs py-1.5 px-3 rounded text-destructive hover:bg-destructive/10 transition-colors">Clear All</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Paste a URL to save..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && urlInput.trim()) {
              onAdd(urlInput.trim(), urlInput.trim())
              setUrlInput("")
            }
          }}
          className="flex-1 text-sm py-2 px-3 rounded bg-card border border-border text-fg placeholder-fg/30 outline-none focus:border-primary/50"
        />
        <button onClick={addCurrentTab} className="text-xs py-2 px-3 rounded bg-accent hover:bg-accent/80 transition-colors whitespace-nowrap">
          + Current Tab
        </button>
      </div>

      <input
        type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter links..."
        className="w-full text-sm py-2 px-3 rounded bg-card border border-border text-fg placeholder-fg/30 outline-none focus:border-primary/50 mb-4"
      />

      <div className="grid gap-1">
        {filtered.map((link) => (
          <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-card/50 transition-colors group">
            <div className="flex-1 min-w-0">
              <a href={link.url} target="_blank" rel="noopener" className="text-sm text-chart-1 hover:underline truncate block">{link.title}</a>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-fg/30 truncate">{link.url}</span>
                {link.tags.map((t) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-fg/50">{t}</span>
                ))}
              </div>
            </div>
            <span className="text-[10px] text-fg/20">{new Date(link.date).toLocaleDateString()}</span>
            <button onClick={() => onRemove(link.id)} className="p-1 rounded text-fg/20 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-fg/30">No links yet. Save URLs from the popup or paste them above.</p>}
      </div>
    </div>
  )
}
