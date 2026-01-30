'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { auth, getToken, clearToken } from './api'
import type { TeacherResponse, TeacherLogin, TeacherCreate } from './types'

interface AuthContextType {
  user: TeacherResponse | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: TeacherLogin) => Promise<void>
  register: (data: TeacherCreate) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TeacherResponse | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const storedToken = getToken()
    if (!storedToken) {
      setIsLoading(false)
      return
    }

    setToken(storedToken)

    try {
      const userData = await auth.me()
      setUser(userData)
    } catch {
      clearToken()
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (data: TeacherLogin) => {
    const response = await auth.login(data)
    setToken(response.access_token)
    const userData = await auth.me()
    setUser(userData)
  }

  const register = async (data: TeacherCreate) => {
    await auth.register(data)
    await login({ username: data.username, password: data.password })
  }

  const logout = () => {
    auth.logout()
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
