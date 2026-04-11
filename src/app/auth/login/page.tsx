'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GeistMono } from 'geist/font/mono'

const CORRECT_PIN = process.env.NEXT_PUBLIC_RIVVA_PIN!

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)
  const router = useRouter()

  const press = (k: string) => {
    if (k === 'clear') { setPin(''); setError(''); return }
    if (k === 'back') { setPin(p => p.slice(0, -1)); return }
    if (pin.length >= 4) return
    const next = pin + k
    setPin(next)
    if (next.length === 4) {
      if (next === CORRECT_PIN) {
        document.cookie = 'rivva_pin=1; path=/; max-age=86400; samesite=strict'
        router.push('/dashboard')
      } else {
        setShaking(true)
        setError('Incorrect PIN')
        setTimeout(() => { setPin(''); setError(''); setShaking(false) }, 800)
      }
    }
  }

  const dots = Array.from({ length: 4 }, (_, i) => (
    <div key={i} style={{
      width: 14, height: 14, borderRadius: '50%',
      background: i < pin.length ? '#000' : 'transparent',
      border: '2px solid #ccc',
      transition: 'background 0.1s'
    }} />
  ))

  const keys = ['1','2','3','4','5','6','7','8','9','back','0','clear']

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-xs text-center">
        <h1 className="text-3xl font-bold mb-1">Rivva</h1>
        <p className="text-gray-500 text-sm mb-8">Quant-driven sports signals</p>

        <div style={{
          display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 8,
          animation: shaking ? 'shake 0.3s ease' : 'none'
        }}>
          {dots}
        </div>

        <p style={{ minHeight: 20, fontSize: 13, color: '#e24b4a', marginBottom: 16 }}>
          {error}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 220, margin: '0 auto' }}>
          {keys.map(k => (
            <button
              key={k}
              onClick={() => press(k)}
              className="py-3 text-lg font-medium border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-95 transition-all"
            >
              {k === 'back' ? '⌫' : k === 'clear' ? 'CLR' : k}
            </button>
          ))}
        </div>

        <p className={`mt-8 text-xs text-gray-400 ${GeistMono.className}`}>
          🔐 PIN-protected access only.
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) }
          25% { transform: translateX(-8px) }
          75% { transform: translateX(8px) }
        }
      `}</style>
    </div>
  )
}
