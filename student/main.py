"""Student oral exam client: prompts for session ID, push-to-talk, transcribe, send."""

import argparse
import os
import sys
import threading
from pathlib import Path

try:
    import requests
    from dotenv import load_dotenv
except ImportError as e:
    print("Missing dependency:", e, file=sys.stderr)
    print("From the student folder run: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)

from audio import record_audio
from instructor_client import send_transcript
from transcribe import transcribe

# Load .env from student directory
load_dotenv(Path(__file__).resolve().parent / ".env")


def get_session_id(args: argparse.Namespace) -> str:
    if args.session_id:
        return args.session_id.strip()
    return input("Session ID: ").strip() or "unknown"


def check_config() -> None:
    if not os.environ.get("ELEVENLABS_API_KEY"):
        print("Error: ELEVENLABS_API_KEY is not set. Set it in the environment or in student/.env", file=sys.stderr)
        sys.exit(1)
    if not os.environ.get("INSTRUCTOR_SERVER_URL"):
        print("Error: INSTRUCTOR_SERVER_URL is not set. Set it in the environment or in student/.env", file=sys.stderr)
        sys.exit(1)


def get_question(args: argparse.Namespace) -> str:
    """Get question for this answer: from CLI or prompt."""
    if getattr(args, "question", ""):
        return args.question.strip()
    return input("Question for this answer (optional): ").strip()


def run_push_to_talk_loop(session_id: str, args: argparse.Namespace) -> None:
    print("\nPush-to-talk: Press Enter to start recording, then Enter again to stop and send. Type q and Enter to quit.\n")
    while True:
        question = get_question(args)
        line = input("Press Enter to start recording (or q to quit): ").strip().lower()
        if line == "q":
            print("Exiting.")
            return

        stop_event = threading.Event()
        result_path: list[str] = []

        def record() -> None:
            try:
                path = record_audio(stop_event)
                result_path.append(path)
            except Exception as e:
                print(f"Recording error: {e}", file=sys.stderr)

        record_thread = threading.Thread(target=record)
        record_thread.start()
        print("Recording... Press Enter to stop.")
        input()
        stop_event.set()
        record_thread.join()

        if not result_path:
            print("No recording. Try again.")
            continue

        wav_path = result_path[0]
        try:
            transcript_text = transcribe(wav_path)
        except Exception as e:
            print(f"Transcription error: {e}", file=sys.stderr)
            print("You can retry or check your ELEVENLABS_API_KEY and audio.", file=sys.stderr)
            Path(wav_path).unlink(missing_ok=True)
            continue
        finally:
            Path(wav_path).unlink(missing_ok=True)

        if not transcript_text:
            print("Empty transcript. Not sending.")
            continue

        print(f"Transcript: {transcript_text}")
        try:
            send_transcript(session_id, transcript_text, question)
            print("Sent to instructor server.")
        except requests.exceptions.RequestException as e:
            print(f"Failed to send to instructor server: {e}", file=sys.stderr)
            print("Transcript (save if needed):", transcript_text)
        except Exception as e:
            print(f"Error sending: {e}", file=sys.stderr)
            print("Transcript (save if needed):", transcript_text)


def main() -> None:
    parser = argparse.ArgumentParser(description="Student oral exam client: record, transcribe, submit.")
    parser.add_argument("--session-id", type=str, default="", help="Session ID (skip prompt)")
    parser.add_argument("--question", type=str, default="", help="Question for this answer (skip prompt; for automation)")
    args = parser.parse_args()

    check_config()
    session_id = get_session_id(args)
    print(f"Session: {session_id}")
    run_push_to_talk_loop(session_id, args)


if __name__ == "__main__":
    main()
