'use client'

import { useState, useRef, useCallback } from 'react'
import { Mic, MicOff, Loader2, Check, X } from 'lucide-react'

interface ActionResult {
  log: { id: string; transcript: string }
  summary: string
}

export function VoiceLogWidget() {
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const startTimeRef = useRef<number>(0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supportsRecognition = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in (window as any))

  const startRecording = useCallback(() => {
    setError(null)
    setResult(null)
    setTranscript('')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setError('Speech recognition not supported')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript
      }
      setTranscript(finalTranscript)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        setError(`Recognition error: ${event.error}`)
      }
      setRecording(false)
    }

    recognition.onend = () => {
      setRecording(false)
    }

    recognitionRef.current = recognition
    startTimeRef.current = Date.now()
    recognition.start()
    setRecording(true)
  }, [])

  const stopRecording = useCallback(async () => {
    recognitionRef.current?.stop()
    setRecording(false)

    const durationMs = Date.now() - startTimeRef.current

    // Wait a moment for final transcript
    await new Promise((r) => setTimeout(r, 300))

    setTranscript((currentTranscript) => {
      if (!currentTranscript.trim()) return currentTranscript
      processTranscript(currentTranscript.trim(), durationMs)
      return currentTranscript
    })
  }, [])

  async function processTranscript(text: string, durationMs: number) {
    setProcessing(true)
    try {
      const res = await fetch('/api/v1/voice-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, duration_ms: durationMs }),
      })
      const { data } = await res.json()
      setResult(data)
    } catch {
      setError('Failed to process voice log')
    } finally {
      setProcessing(false)
    }
  }

  function handleDismiss() {
    setResult(null)
    setTranscript('')
    setError(null)
  }

  if (!supportsRecognition) return null

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Voice Log</h3>
        <p className="text-[10px] text-text-tertiary">Speak to log tasks, habits & mood</p>
      </div>

      {/* Recording controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={processing}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
          style={{
            background: recording
              ? 'rgba(239,68,68,0.2)'
              : 'rgba(99,102,241,0.15)',
            border: `1px solid ${recording ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.3)'}`,
            boxShadow: recording ? '0 0 20px rgba(239,68,68,0.2)' : 'none',
          }}
        >
          {processing ? (
            <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
          ) : recording ? (
            <MicOff className="w-5 h-5 text-red-400" />
          ) : (
            <Mic className="w-5 h-5 text-primary-300" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {recording && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-xs text-red-400 font-medium">Recording...</span>
            </div>
          )}
          {processing && (
            <span className="text-xs text-text-tertiary">Processing with AI...</span>
          )}
          {!recording && !processing && !result && !transcript && (
            <span className="text-xs text-text-tertiary">Tap to start speaking</span>
          )}
        </div>
      </div>

      {/* Live transcript */}
      {transcript && !result && (
        <div className="rounded-lg p-3 text-xs text-text-secondary leading-relaxed" style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {transcript}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-2">
          <div className="rounded-lg p-3 space-y-1" style={{
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.15)',
          }}>
            {result.summary.split('\n').map((line, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-emerald-300">
                <Check className="w-3 h-3 flex-shrink-0" />
                <span>{line}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleDismiss}
            className="text-[10px] text-text-tertiary hover:text-text-secondary flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Dismiss
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
