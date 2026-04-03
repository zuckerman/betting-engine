#!/usr/bin/env node

/**
 * System Status Check
 * Simple verification that real Betfair credentials are configured
 */

require("dotenv").config({ path: ".env.local" })

console.log("\n🔍 SYSTEM STATUS CHECK\n" + "=".repeat(60))

// Check Betfair credentials
const hasAppKey = process.env.BETFAIR_APP_KEY && 
  process.env.BETFAIR_APP_KEY !== "your_app_key_here"
const hasSessionToken = process.env.BETFAIR_SESSION_TOKEN && 
  process.env.BETFAIR_SESSION_TOKEN !== "your_session_token_here"

console.log("\n1️⃣  BETFAIR API CREDENTIALS:")
console.log(`   APP_KEY: ${hasAppKey ? "✅ REAL KEY CONFIGURED" : "🟡 Placeholder/Not set"}`)
console.log(
  `   SESSION_TOKEN: ${hasSessionToken ? "✅ REAL TOKEN CONFIGURED" : "🟡 Placeholder/Not set"}`
)

const isBetfairLive = hasAppKey && hasSessionToken

// Check Telegram
const hasTelegramToken = process.env.TELEGRAM_TOKEN && 
  process.env.TELEGRAM_TOKEN !== "your_bot_token_here"
const hasTelegramChat = process.env.TELEGRAM_CHAT_ID && 
  process.env.TELEGRAM_CHAT_ID !== "your_chat_id_here"

console.log("\n2️⃣  TELEGRAM ALERTS:")
console.log(`   BOT_TOKEN: ${hasTelegramToken ? "✅ Configured" : "🟡 Not set"}`)
console.log(
  `   CHAT_ID: ${hasTelegramChat ? "✅ Configured" : "🟡 Not set"}`
)

// Check Supabase
const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.SUPABASE_SERVICE_ROLE_KEY

console.log("\n3️⃣  SUPABASE DATABASE:")
console.log(
  `   Configuration: ${hasSupabase ? "✅ Complete" : "❌ Missing"}`
)

console.log("\n" + "=".repeat(60))

if (isBetfairLive) {
  console.log("\n✅ SYSTEM STATUS: VALIDATION SWITCH ACTIVE")
  console.log("\n🚀 Real Betfair odds are configured!")
  console.log("\n📊 From this point:")
  console.log("   • CLV = REAL EDGE MEASUREMENT")
  console.log("   • NO model changes allowed (14-day locked protocol)")
  console.log("   • System is measuring real market efficiency")
  console.log("\n🎯 Come back with:")
  console.log("   → 'Day 3 stats' (first signal check)")
  console.log("   → 'Day 7 stats' (pattern forming)")
  console.log("   → 'Day 14 final' (edge decision)")
} else {
  console.log("\n🟡 SYSTEM STATUS: AWAITING BETFAIR VERIFICATION")
  console.log("\n⏳ Currently using MOCK odds for testing")
  console.log("\n📋 To activate REAL Betfair odds when verified:")
  console.log("   1. Get APP_KEY from Betfair Developer Program")
  console.log("   2. Get SESSION_TOKEN from Betfair OAuth")
  console.log("   3. Add to .env.local:")
  console.log("      BETFAIR_APP_KEY=your_actual_key")
  console.log("      BETFAIR_SESSION_TOKEN=your_actual_token")
  console.log("   4. Restart system")
  console.log("   5. System auto-switches to REAL odds")
  console.log("\n⚠️  DO NOT MODIFY any parameters until real switch completes")
}

console.log("\n" + "=".repeat(60) + "\n")
