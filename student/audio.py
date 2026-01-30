"""Capture microphone audio to WAV. Used by push-to-talk flow."""

import os
import tempfile
import threading
from pathlib import Path

import numpy as np
import sounddevice as sd
import soundfile as sf

DEFAULT_SAMPLE_RATE = 16000
DEFAULT_CHANNELS = 1
DTYPE = np.float32


def record_audio(stop_event: threading.Event) -> str:
    """
    Record from the default microphone until stop_event is set.
    Returns the path to a temporary WAV file.
    """
    recorded: list[np.ndarray] = []
    block_size = 1024

    def callback(indata: np.ndarray, _frames: int, _time, _status) -> None:
        recorded.append(indata.copy())

    stream = sd.InputStream(
        samplerate=DEFAULT_SAMPLE_RATE,
        channels=DEFAULT_CHANNELS,
        dtype=DTYPE,
        blocksize=block_size,
        callback=callback,
    )
    stream.start()
    try:
        stop_event.wait()
    finally:
        stream.stop()
        stream.close()

    if not recorded:
        raise ValueError("No audio recorded")

    audio = np.concatenate(recorded, axis=0)
    fd, path = tempfile.mkstemp(suffix=".wav")
    try:
        os.close(fd)
        fd = None
        sf.write(path, audio, DEFAULT_SAMPLE_RATE)
        return path
    except Exception:
        Path(path).unlink(missing_ok=True)
        raise
    finally:
        if fd is not None:
            os.close(fd)
