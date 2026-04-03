import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

  // Demo data (replace with actual DB query when you have predictions)
  const demoData = [
    { odds: 1.95, closing_odds: 1.92, result: 'win', stake: 100 },
    { odds: 2.10, closing_odds: 2.15, result: 'win', stake: 100 },
    { odds: 1.88, closing_odds: 1.85, result: 'loss', stake: 100 },
    { odds: 2.05, closing_odds: 2.08, result: 'win', stake: 100 },
    { odds: 1.92, closing_odds: 1.89, result: 'loss', stake: 100 },
    { odds: 2.20, closing_odds: 2.25, result: 'win', stake: 100 },
  ]

  // Calculate metrics
  let wins = 0
  let total = demoData.length
  let profit = 0
  let totalStake = 0
  let totalCLV = 0

  const cumulativeData: Array<{ x: number; y: number; date: string }> = []
  let cumulativeProfit = 0

  demoData.forEach((bet, i) => {
    totalStake += bet.stake

    if (bet.result === 'win') {
      wins++
      profit += (bet.odds - 1) * bet.stake
      cumulativeProfit += (bet.odds - 1) * bet.stake
    } else {
      profit -= bet.stake
      cumulativeProfit -= bet.stake
    }

    const clv = bet.closing_odds - bet.odds
    totalCLV += clv

    cumulativeData.push({
      x: i + 1,
      y: cumulativeProfit,
      date: new Date(Date.now() - (demoData.length - i - 1) * 24 * 60 * 60 * 1000)
        .toLocaleDateString(),
    })
  })

  const winRate = (wins / total) * 100
  const roi = (profit / totalStake) * 100
  const avgCLV = totalCLV / total

  return NextResponse.json({
    winRate,
    roi,
    avgCLV,
    total,
    profit,
    cumulativeData,
  })
}
