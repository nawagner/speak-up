export async function recordAudio() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm',
  })

  return mediaRecorder
}
