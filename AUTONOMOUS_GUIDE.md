# Autonomous Execution System Guide

## 🚨 CRITICAL: Read This Before Going Live

This system can:
- ✅ Execute bets automatically
- ✅ Scale decisions instantly
- ✅ Remove emotion from betting

**But it will:**
- ❌ Lose money if edge detection is wrong
- ❌ Account restrictions if too sharp
- ❌ Capital wipeout if safety checks fail

---

## Architecture Overview

```
Signal Engine → Adaptive Decision → Safety Checks → Execution
                                         ↓
                              🚨 MUST PASS OR STOP
```

---

## Three Control Modes

### 🟢 MANUAL
```
Signal detected → System alerts you → You place bet manually
```
**Best for**: Testing, paper trading, learning

---

### 🟡 SEMI_AUTO
```
Signal detected → System sizes stake → You confirm → Bet placed
```
**Best for**: Most production use (recommended)

---

### 🔴 FULL_AUTO
```
Signal detected → Safety check → Bet placed immediately
```
**Best for**: When you're confident in edge detection

⚠️ **DO NOT START IN FULL_AUTO**

---

## Safety Layer (The Guardrails)

```typescript
Before execution:
  ✓ Check kill switch
  ✓ Check drawdown (< 20%)
  ✓ Check daily loss (< 10%)
  ✓ Check system state (not RED)
  ✓ Check model calibration (error < 15%)
  ✓ Check win rate (> 40% on recent bets)
  ✓ Check daily bet limit (< 50 bets)
  ✓ Check minimum bankroll

IF ANY FAIL → STOP, DO NOT BET
```

---

## Mobile Cockpit (/mobile)

Your command center. Always shows:

### 🟢 System State (top)
- Current status (GREEN/AMBER/RED)
- Bankroll
- ROI (7-day)
- Drawdown
- Average edge

### 🚨 Alerts (if any)
- Model calibration drifting
- Drawdown limit approaching
- System issues

### ⚡ Live Signals (main feed)
Each card shows:
- Fixture
- **Edge (highlighted in green)**
- Odds vs model probability
- Recommended stake
- BET / SKIP buttons

### ⚙️ Controls (sticky bottom)
- Mode selector (MANUAL / SEMI_AUTO / FULL_AUTO)
- Kill switch (red button - emergency stop)

---

## Quick Start

### 1. Start in MANUAL mode

```bash
# Your phone/browser
Open: http://localhost:3002/mobile

# Set mode: MANUAL
```

This means:
- System shows signals
- **You place bets manually**
- No execution risk yet

### 2. Test signals

Watch signals come through. For each:
- Review the edge
- Check the odds
- Decide manually if you'd take it

This trains your intuition.

### 3. Switch to SEMI_AUTO after 20-30 bets

```bash
# In mobile cockpit
Click: SEMI_AUTO button
```

Now:
- System sizes the stake
- System sends alert (Telegram)
- **You confirm before bet placed**

This is safer than full auto.

### 4. Only go FULL_AUTO after:
- ✅ 100+ bets in semi-auto
- ✅ Calibration error < 5%
- ✅ Consistent ROI > 0%
- ✅ You trust the model completely

---

## API Reference

### Get System Status

```bash
curl http://localhost:3002/api/control/kill
# {"killSwitch": false, "timestamp": "..."}

curl http://localhost:3002/api/control/mode
# {"mode": "MANUAL", "timestamp": "..."}
```

### Set Mode

```bash
curl -X POST http://localhost:3002/api/control/mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "SEMI_AUTO"}'
```

### Activate Kill Switch

```bash
# Emergency stop - kills all execution
curl -X POST http://localhost:3002/api/control/kill \
  -H "Content-Type: application/json" \
  -d '{"active": true}'
```

### Get Execution History

```bash
curl http://localhost:3002/api/control/executions?limit=50
# Returns: {history, stats, timestamp}
```

---

## Execution Flow Diagram

```
Decision arrives
     ↓
Kill switch active?
  YES → BLOCKED
  NO → continue
     ↓
Safety checks pass?
  NO → BLOCKED (shows reason)
  YES → continue
     ↓
Action is BET?
  NO → REJECTED
  YES → continue
     ↓
Check mode:
  MANUAL  → Alert user
  SEMI_AUTO → Wait for confirmation
  FULL_AUTO → Execute immediately
     ↓
Place bet via broker
     ↓
Log execution
     ↓
Telegram alert sent
```

---

## Safety Checks Explained

### Check 1: Kill Switch
```
If kill switch is ON → STOP EVERYTHING
```
Use when:
- Market crash
- Odds freeze
- You panic
- System error

### Check 2: Drawdown Limit
```
If cumulative loss > 20% of bankroll → STOP
```
Why? Protects against death spiral.

### Check 3: Daily Loss Limit
```
If loss today > 10% of bankroll → NO MORE BETS TODAY
```
Why? Prevents revenge betting.

### Check 4: System State
```
If state is RED (known issue) → STOP
```
Red means: Something's broken, don't trade.

### Check 5: Model Calibration
```
If model error > 15% → STOP or reduce Kelly
```
Why? Model is unreliable, trust less.

### Check 6: Recent Win Rate
```
If win rate last 20 bets < 40% → ALERT
```
Why? Possible model drift.

### Check 7: Daily Bet Limit
```
If placed >= 50 bets today → NO MORE BETS
```
Why? Prevents overtrading.

### Check 8: Minimum Bankroll
```
If bankroll < minimum threshold → STOP
```
Why? Need cushion for variance.

---

## Real-World Constraints

### 1. Odds Slippage
Odds might change between decision and execution.
- Solution: Accept some slippage (handle in broker)
- Track: Log slippage amount

### 2. Bookmaker Limits
They will restrict accounts if:
- You're too sharp
- Too much volume
- Only winning

- Solution: Use multiple bookmakers
- Spread volume across accounts
- Use exchanges (Betfair)

### 3. Latency
- Decision → API call → Broker execution = ~200-500ms
- Real edge degrades as latency increases

- Solution: Accept "good enough" not "perfect"
- Track edge vs slippage

### 4. Account Risk
Bookmakers can:
- Restrict stakes
- Close account
- Void bets

- Solution: Don't be too obvious
- Mix up bet patterns
- Use exchanges for serious volume

---

## Monitoring & Alerts

### What triggers Telegram alerts?

```
🎯 Bet placed
  → Fixture, edge, odds, stake, urgency

🔴 Model calibration changed
  → Error %, new status

⚠️ Safety check failed
  → Which check, recommendation

📊 Daily summary
  → Total bets, ROI, edge

🚨 Kill switch activated
  → Reason (manual or system)
```

---

## Debugging

### Bet not placing?
1. Check kill switch status: `curl /api/control/kill`
2. Check safety context: Any alerts in mobile UI?
3. Check mode: Are you in MANUAL mode?
4. Check execution logs: `curl /api/control/executions`

### Why was bet rejected?
Look at execution log:
```json
{
  "reason": "BLOCKED: Drawdown exceeds 20%",
  "safetyStatus": {
    "status": "🔴 BLOCKED",
    "canExecute": false
  }
}
```

### Edge not working?
1. Check calibration: Is model accurate?
2. Check sample size: Do you have 100+ settled bets?
3. Check variance: Could just be bad luck
4. Check model drift: Review recent results

---

## When to PAUSE Trading

Stop immediately if:

1. **Drawdown > 15%**
   → Approaching safety limit

2. **Win rate < 45% last 20 bets**
   → Model drift likely

3. **Calibration error > 12%**
   → Model unreliable

4. **Multiple accounts limited**
   → Bookmakers catching on

5. **Slippage > expected edge**
   → Market too efficient

6. **Any safety check failing repeatedly**
   → Something is wrong

---

## Production Checklist

Before going SEMI_AUTO:
- [ ] Paper traded 20+ bets
- [ ] Calibration error < 8%
- [ ] Win rate > 50%
- [ ] Edge averaging > 2%
- [ ] No safety checks triggered

Before going FULL_AUTO:
- [ ] Paper traded 100+ bets
- [ ] Calibration error < 5%
- [ ] Win rate > 55%
- [ ] ROI > 0% for 2+ weeks
- [ ] Used SEMI_AUTO successfully for 1 week
- [ ] You can sleep at night

Before scaling capital:
- [ ] Proved system over 200+ bets
- [ ] ROI stable > 2%
- [ ] Drawdown stays < 10%
- [ ] Multiple bookmakers working
- [ ] You understand all risks

---

## The Reality

### What will happen:

1. **First week**: Probably positive (variance helps)
2. **Second week**: Real results show
3. **Month 1**: If edge is real, positive
4. **Month 2+**: Bookmakers restrict accounts
5. **After**: Need to rebuild elsewhere

### Edge degrades because:
- Bookmakers sharpen odds
- Limits reduce volume
- Variance catches up
- Market adapts

---

## Final Truth

This system:
- ✅ Will execute bets faster than you can
- ✅ Will be more consistent than you are
- ✅ Will scale volume efficiently

But:
- ❌ It only works if edge is REAL
- ❌ It will lose money if probabilities are wrong
- ❌ It will hit limits quickly if too sharp

**The edge is everything. Execution is just the delivery mechanism.**

---

## Emergency Procedures

### Immediate Stop (Kill Switch)
```bash
curl -X POST /api/control/kill \
  -d '{"active": true}'
```
Stops all execution immediately.

### Review Why Bet Was Blocked
```bash
curl /api/control/executions?limit=1
# See reason for last execution
```

### Switch to MANUAL Mode (Safe)
```bash
curl -X POST /api/control/mode \
  -d '{"mode": "MANUAL"}'
```

### Check System Health
```bash
curl /api/analytics/report
# See calibration, ROI, drawdown
```

---

**🚀 You're ready. Start in MANUAL mode. Stay humble. Good luck.**
