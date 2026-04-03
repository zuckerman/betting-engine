'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // VALIDATION MODE: redirect to dashboard, skip login
    router.push('/dashboard')
  }, [router])

  return null
}
