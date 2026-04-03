# 🚨 Alert System Setup Guide

## Overview

Complete Telegram-based alerting system for the betting engine. Receives real-time notifications for:
- High-edge bets (A+ signals)
- Drawdown warnings & critical events
- Negative CLV detection
- Daily exposure limits
- System errors
- Daily health summaries

---

## 🤖 Step 1: Create Telegram Bot

### 1. Search for @BotFather on Telegram

Open Telegram → Search "BotFather" → Start conversation

### 2. Send `/newbot`

Follow the prompts:
- **Bot name:** "Betting Engine Alerts" (or any name)
- **Bot username:** Something unique like `betting_engine_alerts_bot`

### 3. Save Your BOT TOKEN

BotFather will return:
```
Use this token to access the HTTP API:
123456789:ABCdefGHIjklmnoPQRstuvWXYZ...
```

✅ Copy this token - you'll need it in `.env.local`

---

## 📱 Step 2: Get Your Chat ID

### Option A: Direct Message Bot (Easiest)

1. Search for your bot username in Telegram
2. Send it a message: `hello`
3. Go to: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Replace `<YOUR_BOT_TOKEN>` with your actual token
5. Find your message in the JSON response
6. Look for `"chat"{"id": XXXXXXX}` - that's your Chat ID

### Option B: Group Chat

1. Create a new group in Telegram
2. Add your bot to the group
3. Send a message in the group
4. Get Chat ID same way as above
5. Use the group Chat ID

**Pro Tip:** Use a group for better alert organization!

---

## 🔑 Step 3: Add to `.env.local`

Create or update `/Users/williamtyler-street/Rivva/.env.local`:

```bash
TELEGRAM_TOKEN=123456789:ABCdefGHIjklmnoPQRstuvWXYZ...
TELEGRAM_CHAT_ID=1234567890
```

Example:
```bash
TELEGRAM_TOKEN=6123456789:ABCdefGHIjklmnoPQRstuvWXYZ1a2b3c4d
TELEGRAM_CHAT_ID=987654321
```

---

## 📊 Step 4: Enable Alerts in Production

Alerts are automatically triggered from:

### 1. **Bet Placement** (`onBetPlaced`)
```
Triggered when: New bet placed with A+ edge (>8%)
Alert: "🔥 High-Edge Bet Detected"
```

### 2. **Bet Settlement** (`onBetSettled`)
```
Triggered when:
- CLV drops below 0% (after 50+ bets)
- Drawdown exceeds 15% or 25%
- Daily exposure exceeds limits

Alerts:
- "⚠️ Drawdown Warning"
- "🚨 CRITICAL: Drawdown Limit Hit"
- "❌ CLV Negative"
- "⚠️ High Daily Exposure"
```

### 3. **System Monitor** (`/api/monitor`)
```
Triggered: Every 30 minutes (or by cron)
Checks: All metrics, sends alerts if thresholds crossed
Provides: Full system health snapshot
```

### 4. **Daily Summary** (`sendDailySummary`)
```
Triggered: Once per day (9 AM recommended)
Contains:
- Total bets placed
- Average CLV
- Beat market %
- Daily P&L
- Current drawdown
- System status
```

---

## 🧪 Step 5: Test Your Alerts

### Test 1: Manual Alert

```bash
node -e "
const { sendTelegramAlert } = require('./src/lib/alerts');
sendTelegramAlert('Test Alert', 'System is working!', {
  severity: 'info'
}).then(() => console.log('Alert sent!'));
"
```

### Test 2: Manual High-Edge Alert

```bash
node -e "
const { alertHighEdgeBet } = require('./src/lib/alerts');
alertHighEdgeBet('Arsenal vs Chelsea', 2.1, 0.085, 'A+').then(() => console.log('High-edge alert sent!'));
"
```

### Test 3: System Monitor Check

```bash
curl http://localhost:3000/api/monitor
```

Should return:
```json
{
  "ok": true,
  "status": "healthy",
  "alerts": [],
  "metrics": {
    "totalBets": 24,
    "activeBets": 3,
    "avgClv": 0.0142,
    "drawdown": 0.12,
    "dailyExposure": 0.08,
    "beatMarket": 55.2
  },
  "timestamp": "2026-04-03T15:30:00Z"
}
```

---

## 📈 Alert Thresholds (Customizable)

Located in `src/lib/alerts.ts`:

```typescript
const ALERT_CONFIG = {
  DRAWDOWN_WARNING: 0.15,           // 15%
  DRAWDOWN_CRITICAL: 0.25,          // 25%
  CLV_NEGATIVE: 0,                  // < 0%
  DAILY_EXPOSURE_WARNING: 0.15,     // 15%
  DAILY_EXPOSURE_CRITICAL: 0.25,    // 25%
  HIGH_EDGE_THRESHOLD: 0.08,        // 8% (A+ tier)
  SYSTEM_ERROR_THRESHOLD: 1,        // Any error
}
```

To change: Edit `src/lib/alerts.ts` and update thresholds.

---

## 🔗 Integration Points

### In `/api/settle-bets`:
```typescript
import { ALERT_INTEGRATION } from "@/lib/alert-integration"

// After settlement calculation
await ALERT_INTEGRATION.onBetSettled(result, metrics, portfolio)
```

### In `/api/generate`:
```typescript
import { ALERT_INTEGRATION } from "@/lib/alert-integration"

// After bet acceptance
await ALERT_INTEGRATION.onBetPlaced(bet, portfolio)
```

### In Cron Job (every 30 min):
```typescript
import { MONITOR } from "@/lib/monitor"

const report = await MONITOR.monitorSystem()
```

---

## 🎯 Typical Alert Flow

### Day 1
```
9:00 AM  → Daily Summary sent
         → "Daily Summary: 0 bets placed, monitoring..."

12:30 PM → Bet placed
         → "High-Edge Bet: Arsenal @ 2.1, +7.4% edge"

6:00 PM  → Daily Summary sent
         → "Daily Summary: 8 bets placed, avg CLV +1.2%"
```

### Day 7
```
3:00 PM  → Drawdown crosses 15%
         → "⚠️ Drawdown Warning: 15.3%"
         → System continues (warning only)

4:00 PM  → High exposure day
         → "⚠️ High Daily Exposure: 16.2%"
         → New bets still allowed
```

### Day 14 (If Edge Disappears)
```
2:00 PM  → CLV turns negative
         → "❌ CLV Negative: -0.8% (after 127 bets)"
         → Action: Review model

If Drawdown hits 25%:
         → "🚨 CRITICAL: Drawdown Limit Hit: 25.1%"
         → Action: System PAUSED
         → No new bets accepted
```

---

## 🚨 What Do Alerts Mean?

### 🔥 High-Edge Bet Detected
- **Meaning:** Model found strong signal (A+ tier, >8% edge)
- **Action:** Monitor closely, bet will execute normally

### ⚠️ Drawdown Warning
- **Meaning:** Portfolio down 15%+ from peak
- **Action:** Be cautious, continue monitoring
- **Auto-Action:** None (system continues)

### 🚨 CRITICAL: Drawdown Limit
- **Meaning:** Portfolio down 25%+ from peak
- **Action:** IMMEDIATE INVESTIGATION REQUIRED
- **Auto-Action:** System PAUSED, no new bets

### ❌ CLV Negative
- **Meaning:** After 50+ bets, average CLV is negative (no edge)
- **Action:** INVESTIGATE MODEL
- **Auto-Action:** None (but strong signal to pause)

### ⚠️ High Daily Exposure
- **Meaning:** Daily exposure exceeds 15%
- **Action:** Monitor, bets may be rejected if exceeds 25%
- **Auto-Action:** None if under 25%

### 💥 System Error
- **Meaning:** Unexpected error in system
- **Action:** Check logs immediately
- **Auto-Action:** Alert sent, system continues if possible

---

## 🔍 Monitoring Services

Can integrate with external monitoring:

### UptimeRobot
1. Create new monitor: `http://localhost:3000/api/monitor`
2. Method: GET
3. Frequency: Every 5 minutes
4. Alerts: If status is not 200

### Datadog / New Relic / Others
- Use `/api/monitor` endpoint
- Parse JSON response
- Set thresholds on metrics

---

## 📝 Troubleshooting

### Alerts Not Sending?

1. **Check credentials:**
   ```bash
   echo "Token: $TELEGRAM_TOKEN"
   echo "Chat ID: $TELEGRAM_CHAT_ID"
   ```

2. **Test directly:**
   ```bash
   curl -X POST https://api.telegram.org/bot<TOKEN>/sendMessage \
     -H "Content-Type: application/json" \
     -d '{"chat_id":"<CHAT_ID>","text":"Test"}'
   ```

3. **Check logs:**
   ```bash
   tail -f /tmp/betting-engine.log | grep ALERT
   ```

### Getting Wrong Chat ID?

- Make sure bot is in the group
- Send a message in the group FIRST
- Then fetch updates and look for your message

### Telegram API Rate Limit?

System has built-in retry logic. If alerts are failing:
- Wait 1 minute
- System will retry

---

## ✅ Final Checklist

- [ ] Created Telegram bot with @BotFather
- [ ] Have BOT TOKEN
- [ ] Have CHAT ID
- [ ] Added to `.env.local`
- [ ] Tested `/api/monitor` endpoint
- [ ] Sent test alert manually
- [ ] Configured alert thresholds (if custom)
- [ ] Integrated into settlement pipeline
- [ ] Set up cron for daily summary
- [ ] Documented for your team

---

## 🎯 You're Ready!

Alerts now active. You'll receive real-time notifications for:
- Every A+ bet placed
- Any drawdown crossing thresholds
- Negative CLV detection
- System errors
- Daily summaries

**Next:** Wait for Betfair verification, deploy, and let alerts keep you informed.

👉 Come back on **Day 3** with your first alert messages!
