"""Student oral exam client: prompts for ID and test ID, push-to-talk, transcribe, send."""

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


def get_student_id(args: argparse.Namespace) -> str:
    if args.student_id:
        return args.student_id.strip()
    return input("Student ID (or name): ").strip() or "unknown"


def get_test_id(args: argparse.Namespace) -> str:
    if args.test_id:
        return args.test_id.strip()
    return input("Test ID: ").strip() or "unknown"


def check_config() -> None:
    if not os.environ.get("ELEVENLABS_API_KEY"):
        print("Error: ELEVENLABS_API_KEY is not set. Set it in the environment or in student/.env", file=sys.stderr)
        sys.exit(1)
    if not os.environ.get("INSTRUCTOR_SERVER_URL"):
        print("Error: INSTRUCTOR_SERVER_URL is not set. Set it in the environment or in student/.env", file=sys.stderr)
        sys.exit(1)


def run_push_to_talk_loop(student_id: str, test_id: str) -> None:
    print("\nPush-to-talk: Press Enter to start recording, then Enter again to stop and send. Type q and Enter to quit.\n")
    while True:
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
            send_transcript(student_id, test_id, transcript_text)
            print("Sent to instructor server.")
        except requests.exceptions.RequestException as e:
            print(f"Failed to send to instructor server: {e}", file=sys.stderr)
            print("Transcript (save if needed):", transcript_text)
        except Exception as e:
            print(f"Error sending: {e}", file=sys.stderr)
            print("Transcript (save if needed):", transcript_text)


def main() -> None:
    parser = argparse.ArgumentParser(description="Student oral exam client: record, transcribe, submit.")
    parser.add_argument("--student-id", type=str, default="", help="Student ID (skip prompt)")
    parser.add_argument("--test-id", type=str, default="", help="Test ID (skip prompt)")
    args = parser.parse_args()

    check_config()
    student_id = get_student_id(args)
    test_id = get_test_id(args)
    print(f"Student: {student_id}, Test: {test_id}")
    run_push_to_talk_loop(student_id, test_id)


if __name__ == "__main__":
    main()
