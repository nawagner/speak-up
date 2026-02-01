'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { voice } from '@/lib/api'
import type { VoiceOption, VoicePreference, CustomVoice } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Loader2,
  Volume2,
  VolumeX,
  Save,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
]

export default function TeacherSettingsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([])
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>([])
  const [preferences, setPreferences] = useState<Record<string, VoicePreference>>(
    {}
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [newVoiceId, setNewVoiceId] = useState('')
  const [newVoiceName, setNewVoiceName] = useState('')
  const [isAddingVoice, setIsAddingVoice] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/teacher/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchData = async () => {
      try {
        const [options, prefs, custom] = await Promise.all([
          voice.getOptions(),
          voice.getPreferences(),
          voice.getCustomVoices(),
        ])
        setVoiceOptions(options)
        setPreferences(prefs.preferences)
        setCustomVoices(custom)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load voice settings'
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated])

  const handleVoiceChange = (languageCode: string, voiceId: string) => {
    const selectedVoice = voiceOptions.find((v) => v.voice_id === voiceId)
    setPreferences((prev) => ({
      ...prev,
      [languageCode]: {
        language_code: languageCode,
        voice_id: voiceId,
        voice_name: selectedVoice?.name,
      },
    }))
  }

  const handlePreview = async (voiceId: string, previewUrl?: string) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    if (playingVoice === voiceId) {
      setPlayingVoice(null)
      return
    }

    if (!previewUrl) {
      toast.error('No preview available for this voice')
      return
    }

    setPlayingVoice(voiceId)

    const audio = new Audio(previewUrl)
    audioRef.current = audio

    audio.onended = () => {
      setPlayingVoice(null)
      audioRef.current = null
    }

    audio.onerror = () => {
      toast.error('Failed to play preview')
      setPlayingVoice(null)
      audioRef.current = null
    }

    try {
      await audio.play()
    } catch {
      toast.error('Failed to play preview')
      setPlayingVoice(null)
      audioRef.current = null
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const prefsToSave = Object.values(preferences).filter((p) => p.voice_id)
      await voice.updatePreferences({ preferences: prefsToSave })
      toast.success('Voice preferences saved')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save preferences'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddCustomVoice = async () => {
    if (!newVoiceId.trim()) {
      toast.error('Please enter a voice ID')
      return
    }

    setIsAddingVoice(true)
    try {
      const result = await voice.addCustomVoice({
        voice_id: newVoiceId.trim(),
        voice_name: newVoiceName.trim() || undefined,
      })
      setCustomVoices((prev) => [...prev, result])

      // Refresh voice options to include the new custom voice
      const options = await voice.getOptions()
      setVoiceOptions(options)

      setNewVoiceId('')
      setNewVoiceName('')
      toast.success('Custom voice added')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add custom voice'
      toast.error(message)
    } finally {
      setIsAddingVoice(false)
    }
  }

  const handleRemoveCustomVoice = async (voiceId: string) => {
    try {
      await voice.removeCustomVoice(voiceId)
      setCustomVoices((prev) => prev.filter((v) => v.voice_id !== voiceId))

      // Refresh voice options
      const options = await voice.getOptions()
      setVoiceOptions(options)

      toast.success('Custom voice removed')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to remove custom voice'
      toast.error(message)
    }
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const getSelectedVoice = (languageCode: string): string => {
    return preferences[languageCode]?.voice_id || ''
  }

  const getSelectedVoicePreviewUrl = (languageCode: string): string | undefined => {
    const voiceId = preferences[languageCode]?.voice_id
    if (!voiceId) return undefined
    const voiceOption = voiceOptions.find((v) => v.voice_id === voiceId)
    return voiceOption?.preview_url
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/teacher/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure your voice preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Custom Voices Section */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Custom Voices</CardTitle>
                <CardDescription>
                  Add your own ElevenLabs voice IDs to use during exams. You can find
                  voice IDs in your ElevenLabs dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="voice-id" className="sr-only">
                      Voice ID
                    </Label>
                    <Input
                      id="voice-id"
                      placeholder="Voice ID (e.g., 21m00Tcm4TlvDq8ikWAM)"
                      value={newVoiceId}
                      onChange={(e) => setNewVoiceId(e.target.value)}
                    />
                  </div>
                  <div className="w-48">
                    <Label htmlFor="voice-name" className="sr-only">
                      Voice Name
                    </Label>
                    <Input
                      id="voice-name"
                      placeholder="Name (optional)"
                      value={newVoiceName}
                      onChange={(e) => setNewVoiceName(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleAddCustomVoice}
                    disabled={isAddingVoice || !newVoiceId.trim()}
                    className="gap-2"
                  >
                    {isAddingVoice ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add
                  </Button>
                </div>

                {customVoices.length > 0 && (
                  <div className="space-y-2">
                    {customVoices.map((cv) => (
                      <div
                        key={cv.voice_id}
                        className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                      >
                        <div>
                          <span className="font-medium text-foreground">
                            {cv.voice_name || 'Custom Voice'}
                          </span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            {cv.voice_id}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCustomVoice(cv.voice_id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Voice Preferences Section */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Voice Preferences</CardTitle>
                <CardDescription>
                  Choose which voice students will hear for each language during
                  exams. You can preview voices before selecting them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {LANGUAGES.map((lang) => (
                  <div
                    key={lang.code}
                    className="flex items-center gap-4 rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex min-w-[140px] items-center gap-2">
                      <span className="text-xl">{lang.flag}</span>
                      <span className="font-medium text-foreground">
                        {lang.name}
                      </span>
                    </div>

                    <Select
                      value={getSelectedVoice(lang.code)}
                      onValueChange={(value) => handleVoiceChange(lang.code, value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a voice..." />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceOptions.map((option) => (
                          <SelectItem key={option.voice_id} value={option.voice_id}>
                            <div className="flex flex-col">
                              <span>{option.name}</span>
                              {option.description && (
                                <span className="text-xs text-muted-foreground">
                                  {option.description.slice(0, 50)}
                                  {option.description.length > 50 ? '...' : ''}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handlePreview(
                          getSelectedVoice(lang.code),
                          getSelectedVoicePreviewUrl(lang.code)
                        )
                      }
                      disabled={!getSelectedVoice(lang.code)}
                      className="shrink-0"
                    >
                      {playingVoice === getSelectedVoice(lang.code) ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
