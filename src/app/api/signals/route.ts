import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const MAX_FREE_SIGNALS = 2

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignore
          }
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get user profile from database
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/User?id=eq.${user.id}&select=tier,trialEndsAt,signalsUsedToday`,
    {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const profiles = await response.json()
  const profile = profiles[0]

  if (!profile) {
    return NextResponse.json(
      { error: 'Profile not found' },
      { status: 404 }
    )
  }

  // Your signals/predictions (replace with actual signals)
  const allSignals = [
    {
      id: '1',
      match: 'Lakers vs Celtics',
      prediction: 'Lakers ML',
      odds: 1.95,
      confidence: 0.72,
      market: 'moneyline',
    },
    {
      id: '2',
      match: 'Warriors vs Suns',
      prediction: 'Warriors -5.5',
      odds: 1.92,
      confidence: 0.68,
      market: 'spread',
    },
    {
      id: '3',
      match: 'Nets vs Heat',
      prediction: 'Heat ML',
      odds: 2.10,
      confidence: 0.65,
      market: 'moneyline',
    },
    {
      id: '4',
      match: 'Mavericks vs Nuggets',
      prediction: 'Over 221.5',
      odds: 1.88,
      confidence: 0.70,
      market: 'over_under',
    },
  ]

  // Check if user is on trial
  const now = new Date()
  const isOnTrial = profile.trialEndsAt && new Date(profile.trialEndsAt) > now

  // Determine if user should see full signals
  let signals = allSignals
  let locked = false

  if (profile.tier === 'free' && !isOnTrial) {
    // Free tier: limit to 2 signals per day
    if (profile.signalsUsedToday >= MAX_FREE_SIGNALS) {
      signals = []
      locked = true
    } else {
      signals = allSignals.slice(0, MAX_FREE_SIGNALS)
    }
  }
  // Pro tier or on trial: full access

  return NextResponse.json({
    signals,
    locked,
    tier: profile.tier,
    signalsUsedToday: profile.signalsUsedToday,
    isOnTrial,
    trialEndsAt: profile.trialEndsAt,
  })
}
