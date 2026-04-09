import type { ExtensionInfo, Settings } from "../types"

interface Props {
  settings: Settings
  extensions: ExtensionInfo[]
  onUpdate: (u: Partial<Settings>) => void
}

const SHORTCUTS = [
  { keys: "Alt+Shift+D", action: "Disable all extensions (except pinned)" },
  { keys: "Alt+Shift+E", action: "Enable all extensions" },
  { keys: "Alt+Shift+S", action: "Save current page link" },
  { keys: "Alt+Shift+L", action: "Open dashboard" },
]

export function SettingsSection({ settings, extensions, onUpdate }: Props) {
  const pinnedExts = (settings.alwaysEnabled || [])
    .map((id) => extensions.find((e) => e.id === id))
    .filter(Boolean)

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Settings</h2>
      <p className="text-xs text-fg/40 mb-6">Configure Lean Extensions behavior</p>

      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-card border border-border">
          <h3 className="text-sm font-medium mb-3">NotebookLM</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notebookMode === "append"}
              onChange={(e) => onUpdate({ notebookMode: e.target.checked ? "append" : "new" })}
              className="accent-chart-1"
            />
            <div>
              <span className="text-sm">Append to last notebook</span>
              <p className="text-xs text-fg/30">When off, creates a new notebook each time</p>
            </div>
          </label>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border">
          <h3 className="text-sm font-medium mb-3">Always Enabled</h3>
          <p className="text-xs text-fg/30 mb-2">These extensions survive profile switches. Pin them from the Extensions tab using the star icon.</p>
          <div className="flex flex-wrap gap-1.5">
            {pinnedExts.length === 0 && <span className="text-xs text-fg/20">None pinned</span>}
            {pinnedExts.map((ext) => (
              <div key={ext!.id} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-bg border border-border">
                <span className="text-fg/70">{ext!.name}</span>
                <button
                  onClick={() => onUpdate({ alwaysEnabled: settings.alwaysEnabled.filter((id) => id !== ext!.id) })}
                  className="text-fg/30 hover:text-destructive transition-colors">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border">
          <h3 className="text-sm font-medium mb-3">Keyboard Shortcuts</h3>
          <p className="text-xs text-fg/30 mb-3">Customize in chrome://extensions/shortcuts</p>
          <div className="grid gap-2">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center justify-between">
                <span className="text-xs text-fg/60">{s.action}</span>
                <kbd className="text-[10px] px-2 py-0.5 rounded bg-bg border border-border text-fg/50 font-mono">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border">
          <h3 className="text-sm font-medium mb-2">About</h3>
          <p className="text-xs text-fg/30">Lean Extensions v0.1.0</p>
          <p className="text-xs text-fg/30 mt-1">Keep your browser lean and fast.</p>
        </div>
      </div>
    </div>
  )
}
