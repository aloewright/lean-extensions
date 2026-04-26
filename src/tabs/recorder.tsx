import { useEffect, useRef, useState } from "react"

import "../style.css"

type RecordState = "idle" | "recording" | "paused" | "done"
type RecordSource = "tab" | "screen" | "camera"

function Recorder() {
  const [state, setState] = useState<RecordState>("idle")
  const [source, setSource] = useState<RecordSource>("screen")
  const [duration, setDuration] = useState(0)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [micEnabled, setMicEnabled] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const blobRef = useRef<Blob | null>(null)

  useEffect(() => {
    document.title = "Lean Extensions — Recorder"
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (state === "recording" || state === "paused") {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [state])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  const startRecording = async () => {
    try {
      chunksRef.current = []
      setDownloadUrl(null)
      blobRef.current = null

      let displayStream: MediaStream
      if (source === "camera") {
        displayStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: audioEnabled })
      } else {
        displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: audioEnabled })
      }

      if (micEnabled && source !== "camera") {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          for (const track of micStream.getAudioTracks()) {
            displayStream.addTrack(track)
          }
        } catch {
          /* mic refused */
        }
      }

      streamRef.current = displayStream
      const recorder = new MediaRecorder(displayStream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm"
      })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" })
        blobRef.current = blob
        const url = URL.createObjectURL(blob)
        setDownloadUrl(url)
        setState("done")
        if (timerRef.current) clearInterval(timerRef.current)
      }

      displayStream.getVideoTracks()[0].onended = () => {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop()
      }

      recorder.start(1000)
      recorderRef.current = recorder
      setState("recording")
      setDuration(0)
      timerRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000)
    } catch {
      setState("idle")
      showToast("Recording cancelled or denied")
    }
  }

  const pauseRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.pause()
      setState("paused")
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const resumeRecording = () => {
    if (recorderRef.current?.state === "paused") {
      recorderRef.current.resume()
      setState("recording")
      timerRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000)
    }
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  const downloadRecording = () => {
    if (!downloadUrl) return
    const a = document.createElement("a")
    a.href = downloadUrl
    a.download = `recording-${Date.now()}.webm`
    a.click()
    showToast("Downloading…")
  }

  const saveToCloudOS = () => {
    if (!blobRef.current) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1]
      chrome.runtime.sendMessage(
        {
          type: "CLOUDOS_UPLOAD_MEDIA",
          base64,
          mimeType: "video/webm",
          filename: `recording-${Date.now()}.webm`
        },
        (result) => {
          showToast(result?.ok ? "Uploaded to CloudOS" : "Upload failed")
        }
      )
    }
    reader.readAsDataURL(blobRef.current)
  }

  const reset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    blobRef.current = null
    setState("idle")
    setDuration(0)
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`

  return (
    <div className="min-h-screen bg-bg text-fg font-sans flex flex-col items-center justify-center p-6">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-xs py-1.5 px-3 rounded bg-chart-1/20 text-chart-1 border border-chart-1/30 animate-fade-in">
          {toast}
        </div>
      )}

      <div className="w-full max-w-md space-y-4">
        <header className="text-center">
          <h1 className="text-lg font-semibold tracking-tight">Recorder</h1>
          <p className="text-xs text-fg/40 mt-1">
            Recording runs in this tab — close the popup any time.
          </p>
        </header>

        {state === "idle" && (
          <div className="p-4 rounded-lg bg-card border border-border space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-fg/40 mb-1.5">Source</p>
              <div className="flex gap-1">
                {(["tab", "screen", "camera"] as RecordSource[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSource(s)}
                    className={`flex-1 text-xs py-1.5 px-2.5 rounded capitalize transition-colors ${
                      source === s
                        ? "bg-red-500/20 text-red-400"
                        : "bg-accent/50 text-fg/40 hover:text-fg/60"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-fg/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={audioEnabled}
                  onChange={(e) => setAudioEnabled(e.target.checked)}
                  className="accent-red-400"
                />
                System audio
              </label>
              {source !== "camera" && (
                <label className="flex items-center gap-1.5 text-xs text-fg/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={micEnabled}
                    onChange={(e) => setMicEnabled(e.target.checked)}
                    className="accent-red-400"
                  />
                  Microphone
                </label>
              )}
            </div>

            <button
              onClick={startRecording}
              className="w-full text-sm py-2.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-medium">
              Start Recording
            </button>
          </div>
        )}

        {(state === "recording" || state === "paused") && (
          <div className="p-4 rounded-lg bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    state === "recording" ? "bg-red-500 animate-pulse" : "bg-yellow-400"
                  }`}
                />
                <span className="text-2xl font-mono font-bold text-fg">{formatTime(duration)}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-fg/40">
                {state === "paused" ? "Paused" : "Recording"}
              </span>
            </div>
            <div className="flex gap-2">
              {state === "recording" ? (
                <button
                  onClick={pauseRecording}
                  className="flex-1 text-sm py-2 rounded bg-accent hover:bg-accent/80 text-fg transition-colors">
                  Pause
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="flex-1 text-sm py-2 rounded bg-accent hover:bg-accent/80 text-fg transition-colors">
                  Resume
                </button>
              )}
              <button
                onClick={stopRecording}
                className="flex-1 text-sm py-2 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-medium">
                Stop
              </button>
            </div>
          </div>
        )}

        {state === "done" && downloadUrl && (
          <div className="p-4 rounded-lg bg-card border border-border space-y-3">
            <video src={downloadUrl} controls className="w-full rounded" />
            <div className="flex gap-2">
              <button
                onClick={downloadRecording}
                className="flex-1 text-sm py-2 rounded bg-accent hover:bg-accent/80 text-fg transition-colors">
                Download
              </button>
              <button
                onClick={saveToCloudOS}
                className="flex-1 text-sm py-2 rounded bg-chart-1/20 text-chart-1 hover:bg-chart-1/30 transition-colors">
                Save to CloudOS
              </button>
            </div>
            <button
              onClick={reset}
              className="w-full text-xs py-1.5 text-fg/40 hover:text-fg/60 transition-colors">
              New recording
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Recorder
