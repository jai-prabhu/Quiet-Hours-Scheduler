"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page immediately
    router.push("/login")
  }, [router])

  // Show a loading state with the same dark theme while redirecting
  return (
    <div className="max-w-screen w-full min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
      <div className="flex items-center justify-center gap-2">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-400 border-t-transparent"></div>
        <span className="text-lg text-white font-medium bg-gray-900/80 px-3 py-1 rounded">Redirecting to login...</span>
      </div>
    </div>
  )
}
