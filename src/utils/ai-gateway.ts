/**
 * Cloudflare AI Gateway client.
 *
 * Per the AI Gateway routing convention, all model calls go through a
 * dynamic route slug (`dynamic/text_gen`, `dynamic/audio_gen`, etc.) on
 * the OpenAI-compatible endpoint. We never call OpenAI / Workers AI /
 * other providers directly — the gateway handles cost routing, caching,
 * fallbacks, and observability.
 *
 * Credentials are stored under three chrome.storage.local keys (set via
 * the extension Options page):
 *   - leanCfAccountId   — your Cloudflare account ID
 *   - leanCfAigToken    — gateway authorization token
 *   - leanCfGatewayId   — gateway slug (defaults to "x")
 */

export const AIG_KEY_ACCOUNT_ID = "leanCfAccountId"
export const AIG_KEY_AIG_TOKEN = "leanCfAigToken"
export const AIG_KEY_GATEWAY_ID = "leanCfGatewayId"

export const DEFAULT_GATEWAY_ID = "x"

export interface AiGatewayConfig {
  accountId: string
  aigToken: string
  gatewayId: string
}

export async function getAiGatewayConfig(): Promise<AiGatewayConfig | null> {
  try {
    const r = await chrome.storage.local.get([
      AIG_KEY_ACCOUNT_ID,
      AIG_KEY_AIG_TOKEN,
      AIG_KEY_GATEWAY_ID
    ])
    const accountId = r[AIG_KEY_ACCOUNT_ID]
    const aigToken = r[AIG_KEY_AIG_TOKEN]
    if (typeof accountId !== "string" || !accountId) return null
    if (typeof aigToken !== "string" || !aigToken) return null
    const gatewayId =
      typeof r[AIG_KEY_GATEWAY_ID] === "string" && r[AIG_KEY_GATEWAY_ID]
        ? (r[AIG_KEY_GATEWAY_ID] as string)
        : DEFAULT_GATEWAY_ID
    return { accountId, aigToken, gatewayId }
  } catch {
    return null
  }
}

export async function setAiGatewayConfig(cfg: Partial<AiGatewayConfig>): Promise<void> {
  const update: Record<string, string> = {}
  if (typeof cfg.accountId === "string") update[AIG_KEY_ACCOUNT_ID] = cfg.accountId
  if (typeof cfg.aigToken === "string") update[AIG_KEY_AIG_TOKEN] = cfg.aigToken
  if (typeof cfg.gatewayId === "string") update[AIG_KEY_GATEWAY_ID] = cfg.gatewayId
  if (Object.keys(update).length === 0) return
  try {
    await chrome.storage.local.set(update)
  } catch {
    /* ignore */
  }
}

function buildUrl(cfg: AiGatewayConfig, path: string): string {
  return `https://gateway.ai.cloudflare.com/v1/${cfg.accountId}/${cfg.gatewayId}/compat${path}`
}

function authHeaders(cfg: AiGatewayConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "cf-aig-authorization": `Bearer ${cfg.aigToken}`,
    "cf-aig-zdr": "true"
  }
}

export interface TtsOptions {
  voice?: string
  format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm"
}

export interface TtsResult {
  ok: boolean
  dataUrl?: string
  error?: string
}

/**
 * Text-to-speech via dynamic/audio_gen.
 *
 * Returns a base64 data URL the caller can hand straight to `new Audio()`.
 * Returns `{ok: false, error}` on missing credentials, network failure, or
 * non-2xx gateway response. Never throws.
 */
export async function tts(text: string, opts: TtsOptions = {}): Promise<TtsResult> {
  const cfg = await getAiGatewayConfig()
  if (!cfg) {
    return {
      ok: false,
      error: "Configure Cloudflare AI Gateway credentials in extension options"
    }
  }
  const trimmed = text.slice(0, 4000)
  if (!trimmed.trim()) {
    return { ok: false, error: "No text to synthesize" }
  }

  try {
    const res = await fetch(buildUrl(cfg, "/audio/speech"), {
      method: "POST",
      headers: authHeaders(cfg),
      body: JSON.stringify({
        model: "dynamic/audio_gen",
        input: trimmed,
        voice: opts.voice ?? "alloy",
        response_format: opts.format ?? "mp3"
      })
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      return {
        ok: false,
        error: `Gateway ${res.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`
      }
    }
    const blob = await res.blob()
    const dataUrl = await blobToDataUrl(blob)
    return { ok: true, dataUrl }
  } catch (err) {
    return { ok: false, error: (err as Error).message || "TTS request failed" }
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"))
    reader.readAsDataURL(blob)
  })
}
