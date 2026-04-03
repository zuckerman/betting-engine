# 🚀 FINAL SETUP - GO LIVE (30 minutes)

**Status:** ✅ All systems ready  
**Next Step:** Add API key and start testing  

---

## ⚙️ Step 1: Get API Key (2 min)

1. Go to: **https://the-odds-api.com**
2. Sign up (free account)
3. Copy your API key
4. **DO NOT share it publicly** (treat like password)

---

## 🔐 Step 2: Add to System (1 min)

Edit `.env.local`:

```bash
# Open file
nano .env.local

# Add this line:
ODDS_API_KEY=your_key_here

# Save (Ctrl+X, Y, Enter)
```

---

## ✅ Step 3: Verify Pipeline (5 min)

Run the verification script:

```bash
ODDS_API_KEY=your_key_here node scripts/verify-sharp-clv-pipeline.js
```

You should see:

```
✅ API Key found
✅ API Connection OK
✅ Got live odds
✅ Found sharp books
✅ Consensus calculated
✅ Spread validated
✅ CLV calculated
✅ VERIFICATION COMPLETE
```

If you see ❌ anywhere, **STOP and debug** (don't proceed).

---

## 🚀 Step 4: Start System (2 min)

```bash
npm run dev
```

Wait for:

```
✓ Ready in Xms
→ Local: http://localhost:3000
```

---

## 📊 Step 5: Check Dashboard (5 min)

Visit: **http://localhost:3000/dashboard/operator**

Verify:

- ✅ Dashboard loads
- ✅ Predictions appear
- ✅ CLV column shows numbers (not 0)
- ✅ No error messages

If anything missing, **STOP and check console** for errors.

---

## 🧪 Step 6: Manual Test (10 min)

Check one bet manually:

1. Go to dashboard
2. Find a recent prediction (last hour)
3. Check if:
   - Entry odds exist
   - Closing odds exist
   - CLV is calculated
   - Spread is < 3%

Should look like:

```
Entry: 2.10
Closing: 2.00
CLV: +4.76%
Spread: 1.2%
Status: ✅
```

If CLV is 0 or weird, **STOP and debug**.

---

## ⏱️ Step 7: Start 14-Day Protocol (ongoing)

Now you're live. System will:

- Collect predictions ✅
- Fetch odds from Odds API ✅
- Calculate sharp CLV ✅
- Track metrics ✅
- Show on dashboard ✅

Follow the 14-day protocol: [14_DAY_VALIDATION_PROTOCOL.md](./14_DAY_VALIDATION_PROTOCOL.md)

---

## 📈 What Happens Now

```
Every prediction gets:
  1. Entry odds (from your model)
  2. Sharp prices from Odds API
  3. Spread validation
  4. Consensus calculation
  5. CLV measurement
  6. Dashboard display
  7. Database storage
```

---

## 🧠 Key Reminders

```
✅ DO:
  - Track metrics daily
  - Run for full 14 days
  - Be honest about results
  - Note all anomalies

❌ DON'T:
  - Share API key
  - Change model/filters
  - Interfere with system
  - Cherry-pick best days
  - Trust day 1-2 results
```

---

## 🆘 Troubleshooting

### "API key error"

```
Fix: Verify ODDS_API_KEY in .env.local
     Make sure no quotes/spaces
     Restart system
```

### "No odds data"

```
Fix: Check that sport exists (soccer_epl for UK)
     Verify API has events for today
     Wait for new matches to load
```

### "Spread too wide"

```
Fix: This is OK - system auto-skips
     Just means that market is unclear
     Will process next market
```

### "CLV always 0"

```
Fix: Run verification script
     Check API is returning real prices
     Verify sharp books have prices
     Check consensus calculation
```

### "System crashes"

```
Fix: Check error in terminal
     Restart: npm run dev
     Check that .env.local is correct
     Check that port 3000 is free
```

---

## 📞 When You Have Data

After 3 days, message me with:

```
Day 3 Status:
- Bets: X
- Avg CLV: +X.XX%
- % Positive: XX%
- Issues: [list or "none"]
```

I'll tell you if:
- ✅ System working correctly
- ❌ Bug needs fixing
- ⚠️ Something looks odd

---

## 🎯 Timeline

```
Today (Apr 3):         Setup phase
Tomorrow (Apr 4):      ✅ Go live
Day 3 (Apr 6):         First metrics
Day 7 (Apr 10):        Pattern check
Day 14 (Apr 17):       Decision
```

---

## ✨ Final Checklist

Before you run:

```
☐ API key obtained from The Odds API
☐ API key added to .env.local
☐ Verification script passed (all ✅)
☐ System starts without errors
☐ Dashboard loads and shows data
☐ First bet has valid CLV
☐ Spread validation working
☐ Read 14_DAY_VALIDATION_PROTOCOL.md
☐ Ready to trust the data
```

If all checked, you're **ready to run**.

---

## 🚀 LET'S GO

```
1. Add API key
2. Run verification script
3. Start system (npm run dev)
4. Monitor dashboard
5. Wait 14 days
6. Let data decide
```

**No more building. Just data now.** 🎯

The market will tell you if you have an edge in 14 days.

---

## 📌 Important Files

- [14_DAY_VALIDATION_PROTOCOL.md](./14_DAY_VALIDATION_PROTOCOL.md) - Daily tracking guide
- [SHARP_EXECUTION_SYSTEM.md](./SHARP_EXECUTION_SYSTEM.md) - Technical details
- [EXECUTION_ENGINE_QUICK_REF.md](./EXECUTION_ENGINE_QUICK_REF.md) - Quick reference
- [SHARP_EXECUTION_COMPLETE.md](./SHARP_EXECUTION_COMPLETE.md) - System overview

---

**Status: 🔥 PRODUCTION READY 🔥**
