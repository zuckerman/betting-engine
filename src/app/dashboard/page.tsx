"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GeistMono } from "geist/font/mono";
import StateBar from "@/components/StateBar";
import SignalFeed from "@/components/SignalFeed";
import LiveMetrics from "@/components/LiveMetrics";
import Controls from "@/components/Controls";
import { supabase } from "@/lib/supabase-client";

export default function Dashboard() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/auth/login')
          return
        }

        // Get user from database
        const { data: user } = await supabase
          .from('users')
          .select('isPro')
          .eq('email', session.user.email)
          .single()

        setIsPro(user?.isPro || false)
      } catch (err) {
        console.error('Error checking user:', err)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  const handleUpgrade = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user.email) {
        alert('Not authenticated')
        return
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      alert(`Error: ${(err as Error).message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 h-screen bg-black text-white overflow-hidden">
      {/* TOP BAR */}
      <div className="col-span-12 p-4 border-b border-zinc-800 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          Rivva
        </Link>
        <div className="flex gap-6 items-center">
          <Link href="/performance" className="text-sm text-gray-400 hover:text-white">
            Performance
          </Link>
          {!isPro && (
            <button 
              onClick={handleUpgrade}
              className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 rounded"
            >
              Upgrade to Pro
            </button>
          )}
          <button 
            onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
            className="text-sm text-gray-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>

      {/* LEFT — Signals (7 columns) */}
      <div className="col-span-7 p-4 overflow-y-auto border-r border-zinc-800 scrollbar-hide">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold mb-4">Signal Terminal</h1>
          <StateBar />
          {!isPro && (
            <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
              <p className="text-sm text-blue-200">
                📊 Upgrade to Pro to see all signals
              </p>
            </div>
          )}
          <SignalFeed isPro={isPro} />
        </div>
      </div>

      {/* CENTER-RIGHT — Metrics (3 columns) */}
      <div className={`col-span-3 p-4 border-r border-zinc-800 overflow-y-auto scrollbar-hide ${GeistMono.className}`}>
        <div className="sticky top-0">
          <h2 className="text-lg font-bold mb-4">Live Metrics</h2>
          <LiveMetrics />
        </div>
      </div>

      {/* RIGHT — Controls (2 columns) */}
      <div className="col-span-2 p-4 overflow-y-auto scrollbar-hide">
        <div className="sticky top-0">
          <h2 className="text-lg font-bold mb-4">Control</h2>
          <Controls />
        </div>
      </div>
    </div>
  );
}
