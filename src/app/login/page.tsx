'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) {
        alert('Error: ' + error.message)
      } else {
        setSubmitted(true)
      }
    } catch (err) {
      console.error('Sign in error:', err)
      alert('Error signing in')
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-full max-w-md space-y-8 text-center">
          <div>
            <h2 className="text-2xl font-bold">Check your email</h2>
            <p className="text-gray-600 mt-2">
              We sent a magic link to <strong>{email}</strong>
            </p>
          </div>
          <button
            onClick={() => setSubmitted(false)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Try different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-center mb-8">Rivva</h1>
          <h2 className="text-2xl font-bold text-center">Get Access</h2>
          <p className="text-center text-gray-600 mt-2">
            Sign in to view live signals and edge analysis
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-black disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600">
          <p>
            By signing in, you agree to our{" "}
            <a href="#" className="underline">
              terms
            </a>
          </p>
        </div>

        <div className="border-t pt-4">
          <p className="text-center text-sm text-gray-600">
            No account? Start free trial after login
          </p>
        </div>
      </div>
    </div>
  );
}
