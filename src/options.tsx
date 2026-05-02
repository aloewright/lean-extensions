import { useEffect, useState } from "react"

import "./style.css"

import {
  DEFAULT_GATEWAY_ID,
  getAiGatewayConfig,
  setAiGatewayConfig,
  type AiGatewayConfig
} from "./utils/ai-gateway"
import { getPolicies, setPolicies } from "./storage"
import type { ExtensionPolicy, PolicyAction } from "./types"

type ConditionKind = "hostname-match" | "tab-open"

function Options() {
  const [accountId, setAccountId] = useState("")
  const [aigToken, setAigToken] = useState("")
  const [gatewayId, setGatewayId] = useState(DEFAULT_GATEWAY_ID)
  const [showToken, setShowToken] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void getAiGatewayConfig().then((cfg) => {
      if (cfg) {
        setAccountId(cfg.accountId)
        setAigToken(cfg.aigToken)
        setGatewayId(cfg.gatewayId)
      }
      setLoaded(true)
    })
  }, [])

  const onSave = async () => {
    const next: Partial<AiGatewayConfig> = {
      accountId: accountId.trim(),
      aigToken: aigToken.trim(),
      gatewayId: gatewayId.trim() || DEFAULT_GATEWAY_ID
    }
    await setAiGatewayConfig(next)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  const onClear = async () => {
    setAccountId("")
    setAigToken("")
    setGatewayId(DEFAULT_GATEWAY_ID)
    await setAiGatewayConfig({ accountId: "", aigToken: "", gatewayId: DEFAULT_GATEWAY_ID })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-fg/40 text-sm">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg text-fg font-sans p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <header>
          <h1 className="text-lg font-semibold tracking-tight">Lean Extensions Options</h1>
          <p className="text-xs text-fg/40 mt-1">
            Configure Cloudflare AI Gateway credentials. These are stored locally
            (chrome.storage.local) and never leave your device except to the gateway.
          </p>
        </header>

        <section className="p-4 rounded-lg bg-card border border-border space-y-3">
          <div>
            <h2 className="text-sm font-medium">AI Gateway</h2>
            <p className="text-[11px] text-fg/40 mt-0.5">
              Used by the selection toolbar's read-aloud button. Calls go to{" "}
              <code className="font-mono text-fg/60">
                gateway.ai.cloudflare.com/v1/&lt;account&gt;/&lt;gateway&gt;/compat/audio/speech
              </code>{" "}
              with model <code className="font-mono text-fg/60">dynamic/audio_gen</code>.
            </p>
          </div>

          <Field
            label="Cloudflare account ID"
            placeholder="abc123def4567890abcdef1234567890"
            value={accountId}
            onChange={setAccountId}
            mono
          />
          <Field
            label="AI Gateway token"
            placeholder="••••••••"
            value={aigToken}
            onChange={setAigToken}
            mono
            type={showToken ? "text" : "password"}
            after={
              <button
                onClick={() => setShowToken((s) => !s)}
                className="text-[10px] text-fg/40 hover:text-fg/70 px-2 transition-colors">
                {showToken ? "hide" : "show"}
              </button>
            }
          />
          <Field
            label="Gateway slug"
            placeholder={DEFAULT_GATEWAY_ID}
            value={gatewayId}
            onChange={setGatewayId}
            mono
          />

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={onSave}
              className={`text-xs py-1.5 px-4 rounded font-medium transition-colors ${
                saved ? "bg-chart-2/20 text-chart-2" : "bg-chart-1 text-bg hover:bg-chart-1/90"
              }`}>
              {saved ? "Saved" : "Save"}
            </button>
            <button
              onClick={onClear}
              className="text-xs py-1.5 px-3 rounded text-fg/40 hover:text-destructive transition-colors">
              Clear
            </button>
          </div>
        </section>

        <PoliciesSection />

        <section className="p-4 rounded-lg bg-card border border-border space-y-2">
          <h2 className="text-sm font-medium">Where to find your credentials</h2>
          <ol className="text-[11px] text-fg/60 space-y-1 list-decimal list-inside">
            <li>
              Account ID — top-right of any page in the Cloudflare dashboard, under "API".
            </li>
            <li>
              AI Gateway token — Cloudflare dashboard → AI → AI Gateway → your gateway →
              Settings → "Authenticated gateway" → create a token with the "Run" permission.
            </li>
            <li>
              Gateway slug — defaults to{" "}
              <code className="font-mono text-fg/60">{DEFAULT_GATEWAY_ID}</code>. Change
              it only if you've named your gateway something else.
            </li>
          </ol>
        </section>
      </div>
    </div>
  )
}

function PoliciesSection() {
  const [policies, setLocalPolicies] = useState<ExtensionPolicy[]>([])
  const [loaded, setLoaded] = useState(false)

  // Draft form state for adding a new rule.
  const [extensionId, setExtensionId] = useState("")
  const [kind, setKind] = useState<ConditionKind>("hostname-match")
  const [pattern, setPattern] = useState("")
  const [action, setAction] = useState<PolicyAction>("disable")

  useEffect(() => {
    void getPolicies().then((p) => {
      setLocalPolicies(p)
      setLoaded(true)
    })
  }, [])

  const persist = async (next: ExtensionPolicy[]) => {
    setLocalPolicies(next)
    await setPolicies(next)
    try {
      await chrome.runtime.sendMessage({ type: "REAPPLY_POLICIES" })
    } catch {
      /* options page may run outside the SW context during tests */
    }
  }

  const onAdd = async () => {
    const trimmedId = extensionId.trim()
    const trimmedPattern = pattern.trim()
    if (!trimmedId || !trimmedPattern) return

    const condition =
      kind === "hostname-match"
        ? { kind: "hostname-match" as const, pattern: trimmedPattern }
        : { kind: "tab-open" as const, urlPattern: trimmedPattern }

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `pol-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const next: ExtensionPolicy[] = [
      ...policies,
      { id, extensionId: trimmedId, condition, action }
    ]
    await persist(next)

    setExtensionId("")
    setPattern("")
  }

  const onRemove = async (id: string) => {
    const next = policies.filter((p) => p.id !== id)
    await persist(next)
  }

  return (
    <section className="p-4 rounded-lg bg-card border border-border space-y-3">
      <div>
        <h2 className="text-sm font-medium">Per-extension policy rules</h2>
        <p className="text-[11px] text-fg/40 mt-0.5">
          Force an extension off or on based on the active tab's hostname or
          whether a specific URL pattern is open. Rules are evaluated on every
          toggle and tab change.
        </p>
      </div>

      {!loaded ? (
        <div className="text-[11px] text-fg/40">Loading…</div>
      ) : policies.length === 0 ? (
        <div className="text-[11px] text-fg/40">No rules yet.</div>
      ) : (
        <ul className="space-y-1.5">
          {policies.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 text-[11px] bg-bg border border-border rounded px-2 py-1.5">
              <code className="font-mono text-fg/70 flex-shrink-0">{p.extensionId}</code>
              <span className="text-fg/40">·</span>
              <span className="text-fg/70">{p.action}</span>
              <span className="text-fg/40">when</span>
              <span className="text-fg/70 truncate">
                {p.condition.kind === "hostname-match"
                  ? `host = ${p.condition.pattern}`
                  : `tab open = ${p.condition.urlPattern}`}
              </span>
              <button
                onClick={() => onRemove(p.id)}
                className="ml-auto text-[10px] text-fg/40 hover:text-destructive transition-colors">
                remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border pt-3 space-y-2">
        <Field
          label="Extension ID"
          placeholder="abcdefghijklmnopabcdefghijklmnop"
          value={extensionId}
          onChange={setExtensionId}
          mono
        />

        <div>
          <label className="text-[11px] text-fg/50 block mb-1">Condition</label>
          <div className="flex items-center gap-2">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ConditionKind)}
              className="text-xs py-1.5 px-2 bg-bg border border-border rounded text-fg outline-none">
              <option value="hostname-match">hostname match</option>
              <option value="tab-open">tab open</option>
            </select>
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder={
                kind === "hostname-match"
                  ? "*.bank.com"
                  : "*://*.notebooklm.google.com/*"
              }
              className="flex-1 text-xs py-1.5 px-3 bg-bg border border-border rounded text-fg placeholder-fg/30 outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-fg/50 block mb-1">Action</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as PolicyAction)}
            className="text-xs py-1.5 px-2 bg-bg border border-border rounded text-fg outline-none">
            <option value="disable">disable when condition matches</option>
            <option value="enable-only">enable only while condition matches</option>
          </select>
        </div>

        <button
          onClick={onAdd}
          disabled={!extensionId.trim() || !pattern.trim()}
          className="text-xs py-1.5 px-4 rounded font-medium transition-colors bg-chart-1 text-bg hover:bg-chart-1/90 disabled:opacity-40 disabled:cursor-not-allowed">
          Add rule
        </button>
      </div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
  type = "text",
  after
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
  type?: "text" | "password"
  after?: React.ReactNode
}) {
  return (
    <div>
      <label className="text-[11px] text-fg/50 block mb-1">{label}</label>
      <div className="flex items-center bg-bg border border-border rounded">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 text-xs py-1.5 px-3 bg-transparent text-fg placeholder-fg/30 outline-none ${
            mono ? "font-mono" : ""
          }`}
        />
        {after}
      </div>
    </div>
  )
}

export default Options
