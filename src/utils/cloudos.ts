const CLOUDOS_API = "https://notes.pdx.software/api"

async function getConfig(): Promise<{ apiUrl: string; token: string }> {
  const result = await chrome.storage.local.get("cloudosConfig")
  return result.cloudosConfig || { apiUrl: CLOUDOS_API, token: "" }
}

function headers(token: string): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" }
  if (token) h["X-CloudOS-Service-Token"] = token
  return h
}

// Save a note (page HTML, text, etc.)
export async function saveNote(title: string, contentHtml: string, contentText: string): Promise<{ id: string } | null> {
  const config = await getConfig()
  try {
    const res = await fetch(`${config.apiUrl}/notes`, {
      method: "POST",
      headers: headers(config.token),
      body: JSON.stringify({
        title,
        content_json: null,
        content_text: contentText,
        content_html: contentHtml,
      }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error("CloudOS saveNote failed:", err)
    return null
  }
}

// Upload a file (image, PDF) to R2 via media endpoint
export async function uploadMedia(file: Blob, filename: string): Promise<{ key: string; url: string } | null> {
  const config = await getConfig()
  try {
    const form = new FormData()
    form.append("file", file, filename)
    const h: HeadersInit = {}
    if (config.token) h["X-CloudOS-Service-Token"] = config.token
    const res = await fetch(`${config.apiUrl}/media/upload`, {
      method: "POST",
      headers: h,
      body: form,
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error("CloudOS uploadMedia failed:", err)
    return null
  }
}

// Save a highlight
export async function saveHighlight(text: string, url: string, siteName: string): Promise<{ id: string } | null> {
  const config = await getConfig()
  try {
    const res = await fetch(`${config.apiUrl}/highlights`, {
      method: "POST",
      headers: headers(config.token),
      body: JSON.stringify({ text, url, site_name: siteName }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error("CloudOS saveHighlight failed:", err)
    return null
  }
}
