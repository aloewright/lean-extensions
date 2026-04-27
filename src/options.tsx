import { useEffect, useState } from "react"

import "./style.css"

import {
  DEFAULT_GATEWAY_ID,
  getAiGatewayConfig,
  setAiGatewayConfig,
  type AiGatewayConfig
} from "./utils/ai-gateway"

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
