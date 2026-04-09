const CLOUDOS_API = "https://notes.pdx.software/api"

async function getConfig(): Promise<{ apiUrl: string; token: string }> {
  const result = await chrome.storage.local.get("cloudosConfig")
  return result.cloudosConfig || { apiUrl: CLOUDOS_API, token: "" }
}

function headers(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-CloudOS-Service-Token": token,
  }
}

// Save a note (page HTML, text, etc.)
export async function saveNote(title: string, contentHtml: string, contentText: string): Promise<{ id: string } | null> {
  const config = await getConfig()
  if (!config.token) return null
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
  } catch {
    return null
  }
}

// Upload a file (image, PDF) to R2 via media endpoint
export async function uploadMedia(file: Blob, filename: string): Promise<{ key: string; url: string } | null> {
  const config = await getConfig()
  if (!config.token) return null
  try {
    const form = new FormData()
    form.append("file", file, filename)
    const res = await fetch(`${config.apiUrl}/media/upload`, {
      method: "POST",
      headers: { "X-CloudOS-Service-Token": config.token },
      body: form,
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Save a highlight
export async function saveHighlight(text: string, url: string, siteName: string): Promise<{ id: string } | null> {
  const config = await getConfig()
  if (!config.token) return null
  try {
    const res = await fetch(`${config.apiUrl}/highlights`, {
      method: "POST",
      headers: headers(config.token),
      body: JSON.stringify({ text, url, site_name: siteName }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
