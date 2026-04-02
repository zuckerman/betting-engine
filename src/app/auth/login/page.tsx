'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { GeistMono } from 'geist/font/mono'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
      setSubmitted(true)
    } catch (err) {
      alert(`Error: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Rivva</h1>
          <p className="text-gray-600">Quant-driven sports signals</p>
        </div>

        {submitted ? (
          /* Success state */
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-green-800">
                ✓ Check your email for a sign-in link
              </p>
            </div>
            <p className="text-sm text-gray-600">
              We sent a link to <strong>{email}</strong>. Click it to log in.
            </p>
            <button
              onClick={() => {
                setSubmitted(false)
                setEmail('')
              }}
              className="w-full text-sm text-gray-600 hover:text-black underline"
            >
              Try another email
            </button>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={signIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-black text-white py-2 rounded-lg font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending...' : 'Sign in'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className={`mt-8 text-xs text-gray-500 ${GeistMono.className}`}>
          <p>🔐 Email-based sign-in only. No passwords stored.</p>
        </div>
      </div>
    </div>
  )
}
