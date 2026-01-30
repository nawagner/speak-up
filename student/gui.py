"""
Student GUI for Speak-Up oral exam system.

Provides a graphical interface for students to:
- Join an exam room with their student ID and name
- View the current question from the teacher
- Record and transcribe their spoken answers
- Automatically submit responses to the instructor server
"""

from __future__ import annotations

import os
import sys
import threading
import tkinter as tk
from tkinter import ttk, messagebox
from pathlib import Path
from typing import Optional

try:
    import requests
    from dotenv import load_dotenv
except ImportError as e:
    print("Missing dependency:", e, file=sys.stderr)
    print("From the student folder run: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)

# Load .env from student directory
load_dotenv(Path(__file__).resolve().parent / ".env")

from audio import record_audio
from transcribe import transcribe


class StudentExamGUI:
    """Main GUI application for student oral exams."""

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Speak-Up Student")
        self.root.geometry("600x700")
        self.root.minsize(500, 600)

        # Session state
        self.session_id: str | None = None
        self.room_code: str | None = None
        self.student_name: str = ""
        self.student_id: str = ""
        self.current_question: str = ""
        self.is_recording: bool = False
        self.stop_event: threading.Event | None = None
        self.record_thread: threading.Thread | None = None
        self.polling_active: bool = False

        # Configure grid weight for responsiveness
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)

        # Create main container
        self.main_frame = ttk.Frame(root, padding="20")
        self.main_frame.grid(row=0, column=0, sticky="nsew")
        self.main_frame.columnconfigure(0, weight=1)

        # Show join screen initially
        self._create_join_screen()

    def _clear_main_frame(self):
        """Remove all widgets from the main frame."""
        for widget in self.main_frame.winfo_children():
            widget.destroy()

    def _create_join_screen(self):
        """Create the room join screen."""
        self._clear_main_frame()

        # Title
        title_label = ttk.Label(
            self.main_frame,
            text="Join Oral Exam",
            font=("Helvetica", 24, "bold")
        )
        title_label.grid(row=0, column=0, pady=(0, 30))

        # Form frame
        form_frame = ttk.Frame(self.main_frame)
        form_frame.grid(row=1, column=0, sticky="ew", padx=50)
        form_frame.columnconfigure(1, weight=1)

        # Student ID
        ttk.Label(form_frame, text="Student ID:", font=("Helvetica", 12)).grid(
            row=0, column=0, sticky="w", pady=10
        )
        self.student_id_entry = ttk.Entry(form_frame, font=("Helvetica", 12))
        self.student_id_entry.grid(row=0, column=1, sticky="ew", padx=(10, 0), pady=10)

        # Student Name
        ttk.Label(form_frame, text="Name:", font=("Helvetica", 12)).grid(
            row=1, column=0, sticky="w", pady=10
        )
        self.student_name_entry = ttk.Entry(form_frame, font=("Helvetica", 12))
        self.student_name_entry.grid(row=1, column=1, sticky="ew", padx=(10, 0), pady=10)

        # Room Code
        ttk.Label(form_frame, text="Room Code:", font=("Helvetica", 12)).grid(
            row=2, column=0, sticky="w", pady=10
        )
        self.room_code_entry = ttk.Entry(form_frame, font=("Helvetica", 14))
        self.room_code_entry.grid(row=2, column=1, sticky="ew", padx=(10, 0), pady=10)
        self.room_code_entry.bind("<KeyRelease>", self._on_room_code_change)

        # Join button
        self.join_button = ttk.Button(
            self.main_frame,
            text="Join Room",
            command=self._join_room,
            style="Accent.TButton"
        )
        self.join_button.grid(row=2, column=0, pady=30)

        # Status label
        self.join_status_label = ttk.Label(
            self.main_frame,
            text="",
            font=("Helvetica", 10),
            foreground="gray"
        )
        self.join_status_label.grid(row=3, column=0, pady=10)

        # Focus on first field
        self.student_id_entry.focus()

    def _on_room_code_change(self, event=None):
        """Auto-uppercase the room code as user types."""
        current = self.room_code_entry.get()
        self.room_code_entry.delete(0, tk.END)
        self.room_code_entry.insert(0, current.upper())

    def _join_room(self):
        """Attempt to join the exam room."""
        student_id = self.student_id_entry.get().strip()
        student_name = self.student_name_entry.get().strip()
        room_code = self.room_code_entry.get().strip().upper()

        # Validation
        if not student_id:
            messagebox.showerror("Error", "Please enter your Student ID")
            return
        if not student_name:
            messagebox.showerror("Error", "Please enter your Name")
            return
        if not room_code:
            messagebox.showerror("Error", "Please enter the Room Code")
            return

        self.join_status_label.config(text="Joining room...", foreground="blue")
        self.join_button.config(state="disabled")
        self.root.update()

        # Join in background thread
        def do_join():
            try:
                result = self._call_join_api(room_code, student_name, student_id)
                self.root.after(0, lambda: self._on_join_success(result, room_code, student_name, student_id))
            except Exception as e:
                self.root.after(0, lambda: self._on_join_error(str(e)))

        threading.Thread(target=do_join, daemon=True).start()

    def _call_join_api(self, room_code: str, student_name: str, student_id: str) -> dict:
        """Call the instructor server's join API."""
        base_url = os.environ.get("INSTRUCTOR_SERVER_URL")
        if not base_url:
            raise ValueError("INSTRUCTOR_SERVER_URL is not set in environment")

        url = f"{base_url.rstrip('/')}/api/v1/join"
        payload = {
            "room_code": room_code,
            "student_name": student_name,
            "student_id": student_id,
        }

        response = requests.post(url, json=payload, timeout=30)
        if response.status_code == 404:
            raise ValueError("Room not found or exam not active")
        if response.status_code == 400:
            raise ValueError("Exam is full or not accepting students")
        response.raise_for_status()
        return response.json()

    def _on_join_success(self, result: dict, room_code: str, student_name: str, student_id: str):
        """Handle successful room join."""
        self.session_id = result.get("session_id")
        self.room_code = room_code
        self.student_name = student_name
        self.student_id = student_id
        self.current_question = result.get("first_question", "")

        # Switch to exam screen
        self._create_exam_screen()

        # Start polling for question updates
        self._start_question_polling()

    def _on_join_error(self, error: str):
        """Handle join error."""
        self.join_status_label.config(text=f"Error: {error}", foreground="red")
        self.join_button.config(state="normal")

    def _create_exam_screen(self):
        """Create the main exam screen after joining."""
        self._clear_main_frame()
        self.main_frame.rowconfigure(3, weight=1)

        # Header with session info
        header_frame = ttk.Frame(self.main_frame)
        header_frame.grid(row=0, column=0, sticky="ew", pady=(0, 20))
        header_frame.columnconfigure(1, weight=1)

        # Room code display (prominent)
        room_frame = ttk.Frame(header_frame)
        room_frame.grid(row=0, column=0, sticky="w")

        ttk.Label(room_frame, text="Room:", font=("Helvetica", 12)).pack(side="left")
        room_code_label = ttk.Label(
            room_frame,
            text=self.room_code,
            font=("Helvetica", 18, "bold"),
            foreground="#2563eb"
        )
        room_code_label.pack(side="left", padx=(10, 0))

        # Student info
        info_frame = ttk.Frame(header_frame)
        info_frame.grid(row=0, column=1, sticky="e")
        ttk.Label(
            info_frame,
            text=f"{self.student_name} ({self.student_id})",
            font=("Helvetica", 11)
        ).pack()

        # Separator
        ttk.Separator(self.main_frame, orient="horizontal").grid(
            row=1, column=0, sticky="ew", pady=10
        )

        # Question display
        question_frame = ttk.LabelFrame(self.main_frame, text="Current Question", padding=15)
        question_frame.grid(row=2, column=0, sticky="ew", pady=10)
        question_frame.columnconfigure(0, weight=1)

        self.question_label = ttk.Label(
            question_frame,
            text=self.current_question or "Waiting for question...",
            font=("Helvetica", 14),
            wraplength=500,
            justify="left"
        )
        self.question_label.grid(row=0, column=0, sticky="w")

        # Recording section
        record_frame = ttk.LabelFrame(self.main_frame, text="Your Response", padding=15)
        record_frame.grid(row=3, column=0, sticky="nsew", pady=10)
        record_frame.columnconfigure(0, weight=1)
        record_frame.rowconfigure(1, weight=1)

        # Recording status
        self.record_status_frame = ttk.Frame(record_frame)
        self.record_status_frame.grid(row=0, column=0, sticky="ew", pady=(0, 15))

        self.record_indicator = tk.Canvas(
            self.record_status_frame,
            width=20,
            height=20,
            highlightthickness=0
        )
        self.record_indicator.pack(side="left")
        self._draw_indicator(False)

        self.record_status_label = ttk.Label(
            self.record_status_frame,
            text="Ready to record",
            font=("Helvetica", 12)
        )
        self.record_status_label.pack(side="left", padx=(10, 0))

        # Transcript display
        transcript_container = ttk.Frame(record_frame)
        transcript_container.grid(row=1, column=0, sticky="nsew")
        transcript_container.columnconfigure(0, weight=1)
        transcript_container.rowconfigure(0, weight=1)

        self.transcript_text = tk.Text(
            transcript_container,
            height=8,
            font=("Helvetica", 11),
            wrap="word",
            state="disabled",
            bg="#f8f9fa"
        )
        self.transcript_text.grid(row=0, column=0, sticky="nsew")

        scrollbar = ttk.Scrollbar(transcript_container, orient="vertical", command=self.transcript_text.yview)
        scrollbar.grid(row=0, column=1, sticky="ns")
        self.transcript_text.config(yscrollcommand=scrollbar.set)

        # Record button
        button_frame = ttk.Frame(record_frame)
        button_frame.grid(row=2, column=0, pady=(15, 0))

        self.record_button = ttk.Button(
            button_frame,
            text="🎤 Start Recording",
            command=self._toggle_recording,
            style="Accent.TButton",
            width=25
        )
        self.record_button.pack()

        # Submission status
        self.submit_status_label = ttk.Label(
            self.main_frame,
            text="",
            font=("Helvetica", 10)
        )
        self.submit_status_label.grid(row=4, column=0, pady=10)

        # Leave button
        leave_button = ttk.Button(
            self.main_frame,
            text="Leave Exam",
            command=self._leave_exam
        )
        leave_button.grid(row=5, column=0, pady=(10, 0))

    def _draw_indicator(self, recording: bool):
        """Draw the recording indicator circle."""
        self.record_indicator.delete("all")
        color = "#ef4444" if recording else "#9ca3af"
        self.record_indicator.create_oval(2, 2, 18, 18, fill=color, outline="")

    def _toggle_recording(self):
        """Start or stop recording."""
        if self.is_recording:
            self._stop_recording()
        else:
            self._start_recording()

    def _start_recording(self):
        """Start audio recording."""
        self.is_recording = True
        self.stop_event = threading.Event()

        self._draw_indicator(True)
        self.record_status_label.config(text="Recording... Click to stop")
        self.record_button.config(text="⏹ Stop Recording")
        self._set_transcript("Recording...")

        def do_record():
            try:
                wav_path = record_audio(self.stop_event)
                self.root.after(0, lambda: self._on_recording_complete(wav_path))
            except Exception as e:
                self.root.after(0, lambda: self._on_recording_error(str(e)))

        self.record_thread = threading.Thread(target=do_record, daemon=True)
        self.record_thread.start()

    def _stop_recording(self):
        """Stop the current recording."""
        if self.stop_event:
            self.stop_event.set()

        self._draw_indicator(False)
        self.record_status_label.config(text="Processing...")
        self.record_button.config(state="disabled")

    def _on_recording_complete(self, wav_path: str):
        """Handle completed recording - transcribe and send."""
        self.is_recording = False
        self.record_status_label.config(text="Transcribing...")
        self._set_transcript("Transcribing audio...")

        def do_transcribe():
            try:
                transcript_text = transcribe(wav_path)
                Path(wav_path).unlink(missing_ok=True)

                if transcript_text:
                    self.root.after(0, lambda: self._on_transcription_complete(transcript_text))
                else:
                    self.root.after(0, lambda: self._on_transcription_error("Empty transcript"))
            except Exception as e:
                Path(wav_path).unlink(missing_ok=True)
                self.root.after(0, lambda: self._on_transcription_error(str(e)))

        threading.Thread(target=do_transcribe, daemon=True).start()

    def _on_transcription_complete(self, transcript: str):
        """Handle completed transcription - display and send."""
        self._set_transcript(transcript)
        self.record_status_label.config(text="Sending response...")
        self.submit_status_label.config(text="Submitting...", foreground="blue")

        def do_send():
            try:
                self._send_response(transcript)
                self.root.after(0, self._on_send_success)
            except Exception as e:
                self.root.after(0, lambda: self._on_send_error(str(e)))

        threading.Thread(target=do_send, daemon=True).start()

    def _send_response(self, transcript: str):
        """Send the transcribed response to the instructor server."""
        base_url = os.environ.get("INSTRUCTOR_SERVER_URL")
        if not base_url:
            raise ValueError("INSTRUCTOR_SERVER_URL is not set")

        url = f"{base_url.rstrip('/')}/api/v1/session/{self.session_id}/response"
        payload = {
            "session_id": self.session_id,
            "question": self.current_question,
            "response": transcript,
        }

        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()

    def _on_send_success(self):
        """Handle successful response submission."""
        self.submit_status_label.config(text="✓ Response submitted", foreground="green")
        self.record_status_label.config(text="Ready to record")
        self.record_button.config(text="🎤 Start Recording", state="normal")

        # Clear status after delay
        self.root.after(3000, lambda: self.submit_status_label.config(text=""))

    def _on_send_error(self, error: str):
        """Handle send error."""
        self.submit_status_label.config(text=f"✗ Failed: {error}", foreground="red")
        self.record_status_label.config(text="Ready to record")
        self.record_button.config(text="🎤 Start Recording", state="normal")

    def _on_recording_error(self, error: str):
        """Handle recording error."""
        self.is_recording = False
        self._draw_indicator(False)
        self.record_status_label.config(text="Recording failed")
        self.record_button.config(text="🎤 Start Recording", state="normal")
        self._set_transcript(f"Error: {error}")
        messagebox.showerror("Recording Error", error)

    def _on_transcription_error(self, error: str):
        """Handle transcription error."""
        self.record_status_label.config(text="Transcription failed")
        self.record_button.config(text="🎤 Start Recording", state="normal")
        self._set_transcript(f"Error: {error}")
        messagebox.showerror("Transcription Error", error)

    def _set_transcript(self, text: str):
        """Update the transcript display."""
        self.transcript_text.config(state="normal")
        self.transcript_text.delete("1.0", tk.END)
        self.transcript_text.insert("1.0", text)
        self.transcript_text.config(state="disabled")

    def _start_question_polling(self):
        """Start polling for question updates from the teacher."""
        self.polling_active = True
        self._poll_question()

    def _poll_question(self):
        """Poll the server for the current question."""
        if not self.polling_active or not self.session_id:
            return

        def do_poll():
            try:
                result = self._fetch_current_question()
                if result:
                    self.root.after(0, lambda: self._update_question(result))
            except Exception:
                pass  # Silently continue polling
            finally:
                if self.polling_active:
                    self.root.after(3000, self._poll_question)

        threading.Thread(target=do_poll, daemon=True).start()

    def _fetch_current_question(self) -> dict | None:
        """Fetch the current question from the server."""
        base_url = os.environ.get("INSTRUCTOR_SERVER_URL")
        if not base_url:
            return None

        url = f"{base_url.rstrip('/')}/api/v1/session/{self.session_id}/question"
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                return response.json()
        except Exception:
            pass
        return None

    def _update_question(self, result: dict):
        """Update the displayed question."""
        question_text = result.get("question_text") or result.get("question", "")
        if question_text and question_text != self.current_question:
            self.current_question = question_text
            self.question_label.config(text=question_text)

    def _leave_exam(self):
        """Leave the exam and return to join screen."""
        if messagebox.askyesno("Leave Exam", "Are you sure you want to leave the exam?"):
            self.polling_active = False

            # Notify server
            if self.session_id:
                try:
                    base_url = os.environ.get("INSTRUCTOR_SERVER_URL", "")
                    url = f"{base_url.rstrip('/')}/api/v1/session/{self.session_id}/leave"
                    requests.post(url, timeout=5)
                except Exception:
                    pass

            # Reset state
            self.session_id = None
            self.room_code = None
            self.current_question = ""

            # Return to join screen
            self._create_join_screen()

    def on_closing(self):
        """Handle window close."""
        self.polling_active = False
        if self.stop_event:
            self.stop_event.set()
        self.root.destroy()


def main():
    """Launch the student GUI application."""
    # Check configuration
    if not os.environ.get("ELEVENLABS_API_KEY"):
        print("Warning: ELEVENLABS_API_KEY is not set", file=sys.stderr)
    if not os.environ.get("INSTRUCTOR_SERVER_URL"):
        print("Error: INSTRUCTOR_SERVER_URL is not set. Set it in student/.env", file=sys.stderr)
        sys.exit(1)

    root = tk.Tk()

    # Configure styles
    style = ttk.Style()
    try:
        style.theme_use("clam")
    except Exception:
        pass

    # Custom button style
    style.configure("Accent.TButton", font=("Helvetica", 12))

    app = StudentExamGUI(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()


if __name__ == "__main__":
    main()
