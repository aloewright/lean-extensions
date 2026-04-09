import type { Settings } from "../types"

interface Props {
  settings: Settings
  onUpdate: (u: Partial<Settings>) => void
}

export function SettingsSection({ settings, onUpdate }: Props) {
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
          <p className="text-xs text-fg/30">These extensions survive profile switches. Pin them from the Extensions tab using the star icon.</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(settings.alwaysEnabled || []).length === 0 && <span className="text-xs text-fg/20">None pinned</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
