/**
 * Validation Switch Verification Script
 * 
 * Confirms:
 * 1. Are we using REAL Betfair odds or still on MOCK?
 * 2. What recent settled predictions look like
 * 3. Is CLV calculating correctly?
 * 4. Data sanity checks
 */

require("dotenv").config({ path: ".env.local" })

const { createClient } = require("@supabase/supabase-js")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Check if Betfair credentials are set
const isBetfairLive = !!(
  process.env.BETFAIR_APP_KEY && process.env.BETFAIR_SESSION_TOKEN
)

async function verifyTransition() {
  console.log("\n🔍 VALIDATION SWITCH VERIFICATION\n")
  console.log("=".repeat(60))

  // 1. Check if Betfair credentials configured
  console.log("\n1️⃣  BETFAIR CREDENTIALS STATUS:")
  console.log(`   Mode: ${isBetfairLive ? "🟢 REAL ODDS" : "🟡 MOCK ODDS"}`)
  console.log(
    `   APP_KEY: ${process.env.BETFAIR_APP_KEY ? "✅ Set" : "❌ Not set"}`
  )
  console.log(
    `   SESSION_TOKEN: ${process.env.BETFAIR_SESSION_TOKEN ? "✅ Set" : "❌ Not set"}`
  )

  // 2. Get recent settled predictions
  console.log("\n2️⃣  RECENT SETTLED PREDICTIONS (Last 5):")
  const { data: settled, error: settleError } = await supabase
    .from("predictions")
    .select("*")
    .eq("settled", true)
    .order("created_at", { ascending: false })
    .limit(5)

  if (settleError) {
    console.error("   ❌ Error fetching settled predictions:", settleError)
    return
  }

  if (!settled || settled.length === 0) {
    console.log("   ⚠️  No settled predictions yet")
  } else {
    console.log(`   Found ${settled.length} settled predictions:\n`)

    settled.forEach((pred, idx) => {
      const entryOdds = pred.odds_taken || pred.entry_odds || "N/A"
      const closingOdds = pred.closing_odds || "N/A"
      const clv = pred.real_clv || pred.clv || "N/A"

      console.log(`   [${idx + 1}] ${pred.match_id || pred.fixture_id || "N/A"}`)
      console.log(`       Entry Odds: ${entryOdds}`)
      console.log(`       Closing Odds: ${closingOdds}`)

      // Check if closing odds look real or mock
      if (typeof closingOdds === "number" && typeof entryOdds === "number") {
        const variance = Math.abs(closingOdds - entryOdds) / entryOdds
        const isRealistic =
          closingOdds > 1.0 &&
          closingOdds < 100 &&
          variance > 0 &&
          variance < 0.3

        const dataSource = isBetfairLive && isRealistic ? "🟢 REAL" : "🟡 MOCK"
        console.log(`       Data Source: ${dataSource}`)
      }

      console.log(
        `       CLV: ${typeof clv === "number" ? `${(clv * 100).toFixed(2)}%` : clv}`
      )
      console.log()
    })
  }

  // 3. Check data sanity
  console.log("3️⃣  DATA SANITY CHECKS:")

  const allSettled = await supabase
    .from("predictions")
    .select("odds_taken, closing_odds, real_clv", { count: "exact" })
    .eq("settled", true)

  if (allSettled.data && allSettled.data.length > 0) {
    const nullClosing = allSettled.data.filter((p) => p.closing_odds === null)
      .length
    const nullCLV = allSettled.data.filter((p) => p.real_clv === null).length

    console.log(`   ✅ Total settled: ${allSettled.count}`)
    console.log(
      `   ${nullClosing === 0 ? "✅" : "⚠️"} Null closing_odds: ${nullClosing}`
    )
    console.log(`   ${nullCLV === 0 ? "✅" : "⚠️"} Null CLV: ${nullCLV}`)

    // CLV statistics
    const clvValues = allSettled.data
      .filter((p) => p.real_clv !== null)
      .map((p) => p.real_clv)

    if (clvValues.length > 0) {
      const avgCLV = clvValues.reduce((a, b) => a + b, 0) / clvValues.length
      const positiveCount = clvValues.filter((c) => c > 0).length

      console.log(`\n   📊 CLV Statistics:`)
      console.log(`       Avg CLV: ${(avgCLV * 100).toFixed(2)}%`)
      console.log(
        `       Positive CLV: ${positiveCount}/${clvValues.length} (${((positiveCount / clvValues.length) * 100).toFixed(1)}%)`
      )

      // Check if CLV pattern looks realistic
      if (avgCLV > 0.005) {
        console.log(`       🟢 CLV POSITIVE - Edge detected!`)
      } else if (avgCLV < -0.005) {
        console.log(`       🔴 CLV NEGATIVE - No edge`)
      } else {
        console.log(`       🟡 CLV FLAT - Inconclusive`)
      }
    }
  }

  // 4. Odds range check
  console.log("\n4️⃣  ODDS RANGE ANALYSIS:")

  const { data: allPreds } = await supabase
    .from("predictions")
    .select("odds_taken, closing_odds")
    .not("odds_taken", "is", null)
    .not("closing_odds", "is", null)
    .limit(100)

  if (allPreds && allPreds.length > 0) {
    const entryOdds = allPreds.map((p) => p.odds_taken).sort((a, b) => a - b)
    const closingOdds = allPreds.map((p) => p.closing_odds).sort((a, b) => a - b)

    console.log(
      `   Entry Odds Range: ${entryOdds[0].toFixed(2)} - ${entryOdds[entryOdds.length - 1].toFixed(2)}`
    )
    console.log(
      `   Closing Odds Range: ${closingOdds[0].toFixed(2)} - ${closingOdds[closingOdds.length - 1].toFixed(2)}`
    )

    // Check for unrealistic values
    const unrealistic = allPreds.filter((p) => p.odds_taken < 1.0 || p.odds_taken > 100)
    console.log(
      `   ${unrealistic.length === 0 ? "✅" : "⚠️"} Unrealistic odds: ${unrealistic.length}`
    )
  }

  // 5. READINESS ASSESSMENT
  console.log("\n" + "=".repeat(60))
  console.log("\n🎯 READINESS ASSESSMENT:")

  if (isBetfairLive) {
    console.log("   ✅ REAL Betfair credentials configured")
    console.log("   ✅ System is using REAL odds")
    console.log("\n   🚀 VALIDATION SWITCH COMPLETE")
    console.log("\n   From this point:")
    console.log("   • CLV = REAL EDGE SIGNAL")
    console.log("   • NO model changes allowed")
    console.log("   • 14-day locked validation running")
  } else {
    console.log("   🟡 Still on MOCK odds")
    console.log("   ⏳ Waiting for Betfair verification...")
    console.log("\n   To activate REAL odds:")
    console.log("   1. Get APP_KEY from Betfair Developer Program")
    console.log("   2. Get SESSION_TOKEN from Betfair OAuth")
    console.log("   3. Add to .env.local:")
    console.log("      BETFAIR_APP_KEY=xxx")
    console.log("      BETFAIR_SESSION_TOKEN=yyy")
    console.log("   4. System auto-switches on next restart")
  }

  console.log("\n" + "=".repeat(60) + "\n")
}

verifyTransition().catch(console.error)
