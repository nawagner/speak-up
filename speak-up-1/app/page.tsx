"use client"

import { useState } from "react"
import { RoleSelection } from "@/components/prototype/role-selection"
import { TeacherLogin } from "@/components/prototype/teacher-login"
import { StudentLogin } from "@/components/prototype/student-login"
import { TeacherDashboard } from "@/components/prototype/teacher-dashboard"
import { RubricUpload } from "@/components/prototype/rubric-upload"
import { RubricPreview } from "@/components/prototype/rubric-preview"
import { StudentExamStart } from "@/components/prototype/student-exam-start"
import { StudentExamRecording } from "@/components/prototype/student-exam-recording"
import { StudentExamComplete } from "@/components/prototype/student-exam-complete"
import { PrototypeNav } from "@/components/prototype/prototype-nav"

export type Screen =
  | "role-selection"
  | "teacher-login"
  | "student-login"
  | "teacher-dashboard"
  | "rubric-upload"
  | "rubric-preview"
  | "student-exam-start"
  | "student-exam-recording"
  | "student-exam-complete"

const screens: { id: Screen; label: string; flow: "shared" | "teacher" | "student" }[] = [
  { id: "role-selection", label: "Role Selection", flow: "shared" },
  { id: "teacher-login", label: "Teacher Login", flow: "teacher" },
  { id: "teacher-dashboard", label: "Teacher Dashboard", flow: "teacher" },
  { id: "rubric-upload", label: "Upload Rubric", flow: "teacher" },
  { id: "rubric-preview", label: "Preview Rubric", flow: "teacher" },
  { id: "student-login", label: "Student Login", flow: "student" },
  { id: "student-exam-start", label: "Start Exam", flow: "student" },
  { id: "student-exam-recording", label: "Recording", flow: "student" },
  { id: "student-exam-complete", label: "Exam Complete", flow: "student" },
]

export default function PrototypePage() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("role-selection")

  const renderScreen = () => {
    switch (currentScreen) {
      case "role-selection":
        return <RoleSelection onNavigate={setCurrentScreen} />
      case "teacher-login":
        return <TeacherLogin onNavigate={setCurrentScreen} />
      case "student-login":
        return <StudentLogin onNavigate={setCurrentScreen} />
      case "teacher-dashboard":
        return <TeacherDashboard onNavigate={setCurrentScreen} />
      case "rubric-upload":
        return <RubricUpload onNavigate={setCurrentScreen} />
      case "rubric-preview":
        return <RubricPreview onNavigate={setCurrentScreen} />
      case "student-exam-start":
        return <StudentExamStart onNavigate={setCurrentScreen} />
      case "student-exam-recording":
        return <StudentExamRecording onNavigate={setCurrentScreen} />
      case "student-exam-complete":
        return <StudentExamComplete onNavigate={setCurrentScreen} />
      default:
        return <RoleSelection onNavigate={setCurrentScreen} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PrototypeNav
        screens={screens}
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
      />
      <main className="pt-16">
        {renderScreen()}
      </main>
    </div>
  )
}
