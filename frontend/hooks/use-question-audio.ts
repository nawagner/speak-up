'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { student } from '@/lib/api'

interface UseQuestionAudioReturn {
  isPlaying: boolean
  isLoading: boolean
  error: string | null
  playQuestion: (sessionId: string, questionText: string) => Promise<void>
  replay: () => void
  stop: () => void
}

export function useQuestionAudio(): UseQuestionAudioReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const playQuestion = useCallback(async (sessionId: string, questionText: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const audioBlob = await student.getQuestionAudio(sessionId, questionText)

      // Revoke previous URL if exists
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }

      const url = URL.createObjectURL(audioBlob)
      audioUrlRef.current = url

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
      }

      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => setIsPlaying(false)
      audio.onerror = () => {
        setError('Failed to play audio')
        setIsPlaying(false)
      }

      setIsPlaying(true)
      await audio.play()
    } catch (err) {
      // Handle autoplay restrictions or API errors gracefully
      const message = err instanceof Error ? err.message : 'Could not load audio'
      setError(message)
      setIsPlaying(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const replay = useCallback(() => {
    if (audioRef.current && audioUrlRef.current) {
      setError(null)
      audioRef.current.currentTime = 0
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setError('Playback failed'))
    }
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }, [])

  return { isPlaying, isLoading, error, playQuestion, replay, stop }
}
