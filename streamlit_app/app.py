"""
Speak-Up Teacher Dashboard

Main Streamlit application entry point.
"""

import streamlit as st
import httpx
from typing import Optional

# Configure page
st.set_page_config(
    page_title="Speak-Up Teacher Dashboard",
    page_icon="🎤",
    layout="wide",
    initial_sidebar_state="expanded",
)

# API configuration
API_BASE_URL = "http://localhost:8000"


def get_api_client() -> httpx.Client:
    """Get HTTP client with auth headers if logged in."""
    headers = {}
    if "token" in st.session_state:
        headers["Authorization"] = f"Bearer {st.session_state.token}"
    return httpx.Client(base_url=API_BASE_URL, headers=headers, timeout=30.0)


def is_authenticated() -> bool:
    """Check if user is authenticated."""
    return "token" in st.session_state and st.session_state.token is not None


def logout():
    """Clear session state."""
    for key in list(st.session_state.keys()):
        del st.session_state[key]
    st.rerun()


def login_page():
    """Display login/register page."""
    st.title("🎤 Speak-Up")
    st.subheader("Oral Exam Platform for Teachers")

    tab1, tab2 = st.tabs(["Login", "Register"])

    with tab1:
        with st.form("login_form"):
            username = st.text_input("Username")
            password = st.text_input("Password", type="password")
            submitted = st.form_submit_button("Login", use_container_width=True)

            if submitted:
                if not username or not password:
                    st.error("Please enter both username and password")
                else:
                    try:
                        with get_api_client() as client:
                            response = client.post(
                                "/internal/auth/login",
                                json={"username": username, "password": password}
                            )
                            if response.status_code == 200:
                                data = response.json()
                                st.session_state.token = data["access_token"]
                                st.session_state.username = username
                                st.success("Login successful!")
                                st.rerun()
                            else:
                                st.error("Invalid credentials")
                    except Exception as e:
                        st.error(f"Connection error: {e}")

    with tab2:
        with st.form("register_form"):
            new_username = st.text_input("Username", key="reg_username")
            new_password = st.text_input("Password", type="password", key="reg_password")
            confirm_password = st.text_input("Confirm Password", type="password")
            display_name = st.text_input("Display Name (optional)")
            submitted = st.form_submit_button("Register", use_container_width=True)

            if submitted:
                if not new_username or not new_password:
                    st.error("Please enter username and password")
                elif new_password != confirm_password:
                    st.error("Passwords do not match")
                else:
                    try:
                        with get_api_client() as client:
                            response = client.post(
                                "/internal/auth/register",
                                json={
                                    "username": new_username,
                                    "password": new_password,
                                    "display_name": display_name or None
                                }
                            )
                            if response.status_code == 200:
                                st.success("Registration successful! Please login.")
                            else:
                                error = response.json().get("detail", "Registration failed")
                                st.error(error)
                    except Exception as e:
                        st.error(f"Connection error: {e}")


def main_dashboard():
    """Display main dashboard for authenticated users."""
    # Sidebar
    with st.sidebar:
        st.title("🎤 Speak-Up")
        st.write(f"Welcome, **{st.session_state.get('username', 'Teacher')}**")
        st.divider()

        # Navigation
        page = st.radio(
            "Navigation",
            ["Dashboard", "Rubrics", "Start Exam", "Monitor Exam", "Transcripts", "Analytics"],
            label_visibility="collapsed"
        )

        st.divider()
        if st.button("Logout", use_container_width=True):
            logout()

    # Main content based on selected page
    if page == "Dashboard":
        show_dashboard()
    elif page == "Rubrics":
        show_rubrics()
    elif page == "Start Exam":
        show_start_exam()
    elif page == "Monitor Exam":
        show_monitor_exam()
    elif page == "Transcripts":
        show_transcripts()
    elif page == "Analytics":
        show_analytics()


def show_dashboard():
    """Show main dashboard with overview stats."""
    st.title("Dashboard")

    try:
        with get_api_client() as client:
            # Get analytics overview
            response = client.get("/internal/analytics/overview")
            if response.status_code == 200:
                data = response.json()

                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Total Exams", data.get("total_exams", 0))
                with col2:
                    st.metric("Completed", data.get("completed_exams", 0))
                with col3:
                    st.metric("Active", data.get("active_exams", 0))
                with col4:
                    st.metric("Total Students", data.get("total_student_sessions", 0))

            # Check for active exam
            st.divider()
            active_response = client.get("/internal/exams/active")
            if active_response.status_code == 200:
                active = active_response.json()
                if active:
                    st.info(f"🔴 Active Exam - Room Code: **{active['room_code']}**")
                    if st.button("Go to Monitor"):
                        st.session_state.selected_exam = active["id"]
                        st.rerun()
                else:
                    st.success("No active exam. Ready to start a new one!")

            # Recent exams
            st.subheader("Recent Exams")
            exams_response = client.get("/internal/exams")
            if exams_response.status_code == 200:
                exams = exams_response.json()
                if exams:
                    for exam in exams[:5]:
                        with st.expander(f"Room: {exam['room_code']} - {exam['status']}"):
                            st.write(f"**Status:** {exam['status']}")
                            st.write(f"**Started:** {exam.get('started_at', 'N/A')}")
                            if exam.get('ended_at'):
                                st.write(f"**Ended:** {exam['ended_at']}")
                else:
                    st.info("No exams yet. Create a rubric and start your first exam!")

    except Exception as e:
        st.error(f"Error loading dashboard: {e}")


def show_rubrics():
    """Show rubric management page."""
    st.title("Rubrics")

    # Create new rubric
    with st.expander("Create New Rubric", expanded=False):
        with st.form("create_rubric"):
            title = st.text_input("Title")
            content = st.text_area(
                "Rubric Content (Markdown)",
                height=300,
                help="Enter your rubric in markdown format. Include criteria, descriptions, and point values."
            )
            submitted = st.form_submit_button("Create Rubric", use_container_width=True)

            if submitted and title and content:
                try:
                    with get_api_client() as client:
                        response = client.post(
                            "/internal/rubrics",
                            json={"title": title, "content": content}
                        )
                        if response.status_code == 200:
                            st.success("Rubric created successfully!")
                            st.rerun()
                        else:
                            st.error("Failed to create rubric")
                except Exception as e:
                    st.error(f"Error: {e}")

    st.divider()

    # List existing rubrics
    st.subheader("Your Rubrics")

    try:
        with get_api_client() as client:
            response = client.get("/internal/rubrics")
            if response.status_code == 200:
                rubrics = response.json()
                if rubrics:
                    for rubric in rubrics:
                        with st.expander(f"📋 {rubric['title']}"):
                            st.markdown(rubric['content'])

                            parsed = rubric.get('parsed_criteria')
                            if parsed:
                                st.divider()
                                st.write("**Parsed Criteria:**")
                                for criterion in parsed.get('criteria', []):
                                    st.write(f"- **{criterion['name']}**: {criterion['description']}")
                            else:
                                st.warning("Rubric not yet parsed")
                                if st.button("Parse Now", key=f"parse_{rubric['id']}"):
                                    parse_response = client.post(f"/internal/rubrics/{rubric['id']}/parse")
                                    if parse_response.status_code == 200:
                                        st.success("Parsed successfully!")
                                        st.rerun()

                            col1, col2 = st.columns(2)
                            with col1:
                                if st.button("Delete", key=f"del_{rubric['id']}", type="secondary"):
                                    client.delete(f"/internal/rubrics/{rubric['id']}")
                                    st.rerun()
                            with col2:
                                if parsed:
                                    if st.button("Use for Exam", key=f"use_{rubric['id']}", type="primary"):
                                        st.session_state.selected_rubric = rubric['id']
                                        st.session_state.page = "Start Exam"
                                        st.rerun()
                else:
                    st.info("No rubrics yet. Create your first rubric above!")
    except Exception as e:
        st.error(f"Error loading rubrics: {e}")


def show_start_exam():
    """Show start exam page."""
    st.title("Start Exam")

    try:
        with get_api_client() as client:
            # Check for active exam
            active_response = client.get("/internal/exams/active")
            if active_response.status_code == 200:
                active = active_response.json()
                if active:
                    st.warning("You already have an active exam!")
                    st.info(f"Room Code: **{active['room_code']}**")
                    if st.button("Go to Monitor"):
                        st.rerun()
                    if st.button("End Current Exam", type="secondary"):
                        end_response = client.post(f"/internal/exams/{active['id']}/end")
                        if end_response.status_code == 200:
                            st.success("Exam ended!")
                            st.rerun()
                    return

            # Get available rubrics
            rubrics_response = client.get("/internal/rubrics")
            if rubrics_response.status_code == 200:
                rubrics = rubrics_response.json()
                parsed_rubrics = [r for r in rubrics if r.get('parsed_criteria')]

                if not parsed_rubrics:
                    st.warning("No parsed rubrics available. Please create and parse a rubric first.")
                    return

                # Select rubric
                rubric_options = {r['id']: r['title'] for r in parsed_rubrics}
                selected_id = st.selectbox(
                    "Select Rubric",
                    options=list(rubric_options.keys()),
                    format_func=lambda x: rubric_options[x],
                    index=0 if not st.session_state.get('selected_rubric') else
                    list(rubric_options.keys()).index(st.session_state.selected_rubric)
                    if st.session_state.get('selected_rubric') in rubric_options else 0
                )

                # Show rubric preview
                selected_rubric = next(r for r in parsed_rubrics if r['id'] == selected_id)
                with st.expander("Preview Rubric"):
                    st.markdown(selected_rubric['content'])

                st.divider()

                # Start exam button
                if st.button("🚀 Start Exam", use_container_width=True, type="primary"):
                    response = client.post(
                        "/internal/exams",
                        json={"rubric_id": selected_id}
                    )
                    if response.status_code == 200:
                        exam = response.json()
                        st.session_state.selected_exam = exam['id']
                        st.balloons()
                        st.success(f"Exam started! Room Code: **{exam['room_code']}**")
                        st.info("Share this code with your students to let them join.")
                    else:
                        error = response.json().get('detail', 'Failed to start exam')
                        st.error(error)

    except Exception as e:
        st.error(f"Error: {e}")


def show_monitor_exam():
    """Show exam monitoring page."""
    st.title("Monitor Exam")

    try:
        with get_api_client() as client:
            # Get active exam
            active_response = client.get("/internal/exams/active")
            if active_response.status_code != 200:
                st.error("Failed to check for active exam")
                return

            active = active_response.json()
            if not active:
                st.info("No active exam. Start an exam to monitor it.")
                return

            # Display room code prominently
            st.markdown(f"### Room Code: `{active['room_code']}`")
            st.caption(f"Started at: {active.get('started_at', 'N/A')}")

            col1, col2 = st.columns([3, 1])
            with col2:
                if st.button("🔄 Refresh"):
                    st.rerun()
                if st.button("End Exam", type="secondary"):
                    client.post(f"/internal/exams/{active['id']}/end")
                    st.success("Exam ended!")
                    st.rerun()

            st.divider()

            # Get struggle alerts
            struggles_response = client.get(f"/internal/exams/{active['id']}/struggles")
            if struggles_response.status_code == 200:
                struggles = struggles_response.json()
                if struggles:
                    st.warning(f"⚠️ {len(struggles)} student(s) need attention!")
                    for s in struggles:
                        st.error(f"**{s['struggle_type'].upper()}** ({s['severity']}): {s['reasoning'][:100]}...")

            # Get sessions
            sessions_response = client.get(f"/internal/exams/{active['id']}/sessions")
            if sessions_response.status_code == 200:
                sessions = sessions_response.json()

                if not sessions:
                    st.info("No students have joined yet. Waiting for students...")
                else:
                    st.subheader(f"Students ({len(sessions)})")

                    for session in sessions:
                        status_emoji = {
                            "active": "🟢",
                            "completed": "✅",
                            "terminated": "🔴"
                        }.get(session['status'], "⚪")

                        with st.expander(
                            f"{status_emoji} {session['student_name']} ({session['student_id']}) - "
                            f"{session['coverage_pct']*100:.0f}% coverage"
                        ):
                            # Progress bar
                            st.progress(session['coverage_pct'], text=f"Coverage: {session['coverage_pct']*100:.0f}%")

                            if session['struggle_count'] > 0:
                                st.warning(f"⚠️ {session['struggle_count']} struggle event(s)")

                            # Transcript preview
                            entries = session.get('entries', [])
                            if entries:
                                st.write("**Recent Activity:**")
                                for entry in entries[-4:]:
                                    if entry['entry_type'] == 'question':
                                        st.markdown(f"**Q:** {entry['content'][:100]}...")
                                    elif entry['entry_type'] == 'response':
                                        st.markdown(f"**A:** {entry['content'][:100]}...")

                            # Actions
                            if session['status'] == 'active':
                                col1, col2, col3 = st.columns(3)
                                with col1:
                                    if st.button("View Full", key=f"view_{session['session_id']}"):
                                        st.session_state.selected_session = session['session_id']
                                with col2:
                                    if st.button("Message", key=f"msg_{session['session_id']}"):
                                        st.session_state.message_session = session['session_id']
                                with col3:
                                    if st.button("Terminate", key=f"term_{session['session_id']}", type="secondary"):
                                        client.post(f"/internal/sessions/{session['session_id']}/terminate")
                                        st.rerun()

                            # Message form
                            if st.session_state.get('message_session') == session['session_id']:
                                with st.form(f"msg_form_{session['session_id']}"):
                                    msg = st.text_input("Message to student")
                                    if st.form_submit_button("Send"):
                                        client.post(
                                            f"/internal/sessions/{session['session_id']}/message",
                                            json={"message": msg}
                                        )
                                        del st.session_state.message_session
                                        st.rerun()

    except Exception as e:
        st.error(f"Error: {e}")


def show_transcripts():
    """Show transcript viewer page."""
    st.title("Transcripts")

    try:
        with get_api_client() as client:
            # Get all exams
            exams_response = client.get("/internal/exams")
            if exams_response.status_code != 200:
                st.error("Failed to load exams")
                return

            exams = exams_response.json()
            if not exams:
                st.info("No exams yet.")
                return

            # Select exam
            exam_options = {e['id']: f"Room {e['room_code']} - {e['status']}" for e in exams}
            selected_exam = st.selectbox(
                "Select Exam",
                options=list(exam_options.keys()),
                format_func=lambda x: exam_options[x]
            )

            # Get sessions for exam
            sessions_response = client.get(f"/internal/exams/{selected_exam}/sessions")
            if sessions_response.status_code != 200:
                st.error("Failed to load sessions")
                return

            sessions = sessions_response.json()
            if not sessions:
                st.info("No sessions for this exam.")
                return

            # Select session
            session_options = {
                s['session_id']: f"{s['student_name']} ({s['student_id']}) - {s['status']}"
                for s in sessions
            }
            selected_session = st.selectbox(
                "Select Student",
                options=list(session_options.keys()),
                format_func=lambda x: session_options[x]
            )

            st.divider()

            # Get transcript
            transcript_response = client.get(f"/internal/sessions/{selected_session}/transcript")
            if transcript_response.status_code != 200:
                st.error("Failed to load transcript")
                return

            transcript = transcript_response.json()

            # Display info
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Status", transcript['status'])
            with col2:
                st.metric("Coverage", f"{transcript['coverage_pct']*100:.0f}%")
            with col3:
                st.metric("Struggles", transcript['struggle_count'])

            st.divider()

            # Display transcript
            st.subheader("Transcript")
            for entry in transcript.get('entries', []):
                entry_type = entry['entry_type']

                if entry_type == 'question':
                    st.markdown(f"**🎤 Question:**")
                    st.info(entry['content'])
                elif entry_type == 'response':
                    st.markdown(f"**👤 Response:**")
                    st.success(entry['content'])
                elif entry_type == 'teacher_message':
                    st.markdown(f"**👩‍🏫 Teacher:**")
                    st.warning(entry['content'])
                elif entry_type == 'system_note':
                    st.caption(f"📝 {entry['content']}")

                st.caption(f"_{entry['timestamp']}_")

    except Exception as e:
        st.error(f"Error: {e}")


def show_analytics():
    """Show analytics dashboard page."""
    st.title("Analytics")

    try:
        with get_api_client() as client:
            # Get overview
            overview_response = client.get("/internal/analytics/overview")
            if overview_response.status_code == 200:
                overview = overview_response.json()

                st.subheader("Overview")
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("Total Exams", overview.get("total_exams", 0))
                    st.metric("Completed", overview.get("completed_exams", 0))
                with col2:
                    st.metric("Active", overview.get("active_exams", 0))
                with col3:
                    st.metric("Total Students", overview.get("total_student_sessions", 0))
                    st.metric("Completed Students", overview.get("completed_student_sessions", 0))

            st.divider()

            # Per-exam analytics
            st.subheader("Exam Details")

            exams_response = client.get("/internal/exams")
            if exams_response.status_code == 200:
                exams = exams_response.json()
                completed_exams = [e for e in exams if e['status'] == 'completed']

                if not completed_exams:
                    st.info("No completed exams yet for detailed analytics.")
                else:
                    for exam in completed_exams:
                        analytics_response = client.get(f"/internal/exams/{exam['id']}/analytics")
                        if analytics_response.status_code == 200:
                            analytics = analytics_response.json()

                            with st.expander(f"Room: {exam['room_code']}"):
                                col1, col2, col3 = st.columns(3)
                                with col1:
                                    st.metric("Students", analytics['total_students'])
                                    st.metric("Completed", analytics['completed_students'])
                                with col2:
                                    st.metric("Avg Coverage", f"{analytics['average_coverage_pct']*100:.0f}%")
                                with col3:
                                    if analytics.get('average_duration_minutes'):
                                        st.metric("Avg Duration", f"{analytics['average_duration_minutes']:.1f} min")

                                if analytics.get('struggle_frequency'):
                                    st.write("**Struggle Types:**")
                                    for stype, count in analytics['struggle_frequency'].items():
                                        st.write(f"- {stype}: {count}")

    except Exception as e:
        st.error(f"Error: {e}")


# Main app
if is_authenticated():
    main_dashboard()
else:
    login_page()
