import { useState, useRef, useEffect } from "react"

type RecordState = "idle" | "recording" | "paused" | "done"
type RecordSource = "tab" | "screen" | "camera"

export function RecordButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title="Screen recording"
      className={`p-1.5 rounded transition-colors relative ${active ? "bg-red-500/20 text-red-400" : "text-fg/60 hover:text-fg hover:bg-accent"}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        {active ? <circle cx="12" cy="12" r="4" fill="currentColor" /> : <circle cx="12" cy="12" r="4" />}
      </svg>
    </button>
  )
}

export function RecordPanel({ onSave }: { onSave: (blob: Blob, filename: string) => void }) {
  const [state, setState] = useState<RecordState>("idle")
  const [source, setSource] = useState<RecordSource>("tab")
  const [duration, setDuration] = useState(0)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [micEnabled, setMicEnabled] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const blobRef = useRef<Blob | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const startRecording = async () => {
    try {
      chunksRef.current = []
      setDownloadUrl(null)
      blobRef.current = null

      let displayStream: MediaStream
      if (source === "camera") {
        displayStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: audioEnabled,
        })
      } else {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: audioEnabled,
        })
      }

      // Add mic if enabled
      if (micEnabled && source !== "camera") {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          for (const track of micStream.getAudioTracks()) {
            displayStream.addTrack(track)
          }
        } catch {}
      }

      streamRef.current = displayStream
      const recorder = new MediaRecorder(displayStream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm",
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

      // Stop when user ends screen share
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
  }

  const saveToCloudOS = () => {
    if (!blobRef.current) return
    onSave(blobRef.current, `recording-${Date.now()}.webm`)
  }

  const reset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    blobRef.current = null
    setState("idle")
    setDuration(0)
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`

  return (
    <div className="border-b border-border px-3 py-2.5 space-y-2">
      <p className="text-[10px] text-fg/30 uppercase tracking-wider">Screen Recording</p>

      {state === "idle" && (
        <>
          {/* Source selector */}
          <div className="flex gap-1">
            {(["tab", "screen", "camera"] as RecordSource[]).map((s) => (
              <button key={s} onClick={() => setSource(s)}
                className={`text-[11px] py-1 px-2.5 rounded capitalize transition-colors ${
                  source === s ? "bg-red-500/20 text-red-400" : "bg-accent/50 text-fg/40 hover:text-fg/60"
                }`}>
                {s}
              </button>
            ))}
          </div>

          {/* Audio toggles */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] text-fg/50 cursor-pointer">
              <input type="checkbox" checked={audioEnabled} onChange={(e) => setAudioEnabled(e.target.checked)} className="accent-red-400" />
              System audio
            </label>
            {source !== "camera" && (
              <label className="flex items-center gap-1.5 text-[11px] text-fg/50 cursor-pointer">
                <input type="checkbox" checked={micEnabled} onChange={(e) => setMicEnabled(e.target.checked)} className="accent-red-400" />
                Microphone
              </label>
            )}
          </div>

          <button onClick={startRecording}
            className="w-full text-xs py-2 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-medium">
            Start Recording
          </button>
        </>
      )}

      {(state === "recording" || state === "paused") && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state === "recording" ? "bg-red-500 animate-pulse" : "bg-yellow-400"}`} />
              <span className="text-sm font-mono font-bold text-fg">{formatTime(duration)}</span>
            </div>
            <span className="text-[10px] text-fg/30">{state === "paused" ? "Paused" : "Recording"}</span>
          </div>
          <div className="flex gap-2">
            {state === "recording" ? (
              <button onClick={pauseRecording} className="flex-1 text-xs py-1.5 rounded bg-accent hover:bg-accent/80 text-fg transition-colors">Pause</button>
            ) : (
              <button onClick={resumeRecording} className="flex-1 text-xs py-1.5 rounded bg-accent hover:bg-accent/80 text-fg transition-colors">Resume</button>
            )}
            <button onClick={stopRecording} className="flex-1 text-xs py-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">Stop</button>
          </div>
        </div>
      )}

      {state === "done" && downloadUrl && (
        <div className="space-y-2">
          <video src={downloadUrl} controls className="w-full rounded" style={{ maxHeight: 140 }} />
          <div className="flex gap-2">
            <button onClick={downloadRecording} className="flex-1 text-xs py-1.5 rounded bg-accent hover:bg-accent/80 text-fg transition-colors">Download</button>
            <button onClick={saveToCloudOS} className="flex-1 text-xs py-1.5 rounded bg-chart-1/20 text-chart-1 hover:bg-chart-1/30 transition-colors">Save to CloudOS</button>
          </div>
          <button onClick={reset} className="w-full text-[11px] py-1 text-fg/30 hover:text-fg/50 transition-colors">New Recording</button>
        </div>
      )}
    </div>
  )
}
