"use client"

import type { Screen } from "@/app/page"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface PrototypeNavProps {
  screens: { id: Screen; label: string; flow: "shared" | "teacher" | "student" }[]
  currentScreen: Screen
  onNavigate: (screen: Screen) => void
}

export function PrototypeNav({ screens, currentScreen, onNavigate }: PrototypeNavProps) {
  const currentScreenData = screens.find((s) => s.id === currentScreen)
  const sharedScreens = screens.filter((s) => s.flow === "shared")
  const teacherScreens = screens.filter((s) => s.flow === "teacher")
  const studentScreens = screens.filter((s) => s.flow === "student")

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">OE</span>
            </div>
            <span className="font-semibold text-foreground">OralExam</span>
          </div>
          <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted">
            Prototype
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 bg-transparent">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  currentScreenData?.flow === "teacher" && "bg-chart-1",
                  currentScreenData?.flow === "student" && "bg-chart-2",
                  currentScreenData?.flow === "shared" && "bg-muted-foreground"
                )}
              />
              {currentScreenData?.label}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Shared
            </DropdownMenuLabel>
            {sharedScreens.map((screen) => (
              <DropdownMenuItem
                key={screen.id}
                onClick={() => onNavigate(screen.id)}
                className={cn(currentScreen === screen.id && "bg-muted")}
              >
                <span className="h-2 w-2 rounded-full bg-muted-foreground mr-2" />
                {screen.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Teacher Flow
            </DropdownMenuLabel>
            {teacherScreens.map((screen) => (
              <DropdownMenuItem
                key={screen.id}
                onClick={() => onNavigate(screen.id)}
                className={cn(currentScreen === screen.id && "bg-muted")}
              >
                <span className="h-2 w-2 rounded-full bg-chart-1 mr-2" />
                {screen.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Student Flow
            </DropdownMenuLabel>
            {studentScreens.map((screen) => (
              <DropdownMenuItem
                key={screen.id}
                onClick={() => onNavigate(screen.id)}
                className={cn(currentScreen === screen.id && "bg-muted")}
              >
                <span className="h-2 w-2 rounded-full bg-chart-2 mr-2" />
                {screen.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
