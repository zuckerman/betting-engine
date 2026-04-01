# 📇 RIVVA DOCUMENTATION INDEX

**Version**: 1.0 | **Status**: Production Ready | **Last Updated**: 1 Apr 2026

---

## 🚀 START HERE

**New to the system?**

1. **[GETTING_STARTED.md](GETTING_STARTED.md)** ← Start here (10 min)
   - Setup in 5 minutes
   - How it works (simple)
   - Your first day flow

2. **[QUICK_REF_INSTITUTIONAL.md](QUICK_REF_INSTITUTIONAL.md)** ← Bookmark this (5 min)
   - Copy-paste commands
   - Metrics cheat sheet
   - Daily checks

3. **[INSTITUTIONAL_ENGINE.md](INSTITUTIONAL_ENGINE.md)** ← Understand this (15 min)
   - Complete system overview
   - How CLV works
   - How Kelly works
   - All safety features

---

## 📚 DEEP DIVES

### Architecture & Design
- **[INSTITUTIONAL_ENGINE.md](INSTITUTIONAL_ENGINE.md)**
  - System flow (8-step orchestrator)
  - Schema design (5 tables)
  - API endpoints (7 core)
  - Key metrics explained
  - Safety guarantees

### Deployment & Operations
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)**
  - 7-step deployment
  - Schema migration
  - Data initialization
  - Validation checklist
  - Rollback procedures

- **[README_INSTITUTIONAL.md](README_INSTITUTIONAL.md)**
  - Quick start (4-step)
  - API reference (4 endpoints)
  - Phase 1 validation (150 bets)
  - Monitoring checklist

### Analysis & Queries
- **[SQL_REFERENCE.md](SQL_REFERENCE.md)**
  - 18 production queries
  - Health checks
  - Trend analysis
  - Filter validation

### Validation Framework
- **[VALIDATION_ROADMAP.md](VALIDATION_ROADMAP.md)**
  - 5-phase framework
  - Success criteria
  - Exit conditions
  - Decision trees

### Market Strategy
- **[MULTI_MARKET_STRATEGY.md](MULTI_MARKET_STRATEGY.md)**
  - Regime isolation
  - Why separate markets
  - When to combine

- **[SHADOW_BETS_GUIDE.md](SHADOW_BETS_GUIDE.md)**
  - Filter validation
  - Skip reasons taxonomy
  - Analysis queries

---

## 🎯 BY USE CASE

### I want to...

**Deploy the system**
→ [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)

**Start Phase 1 testing**
→ [GETTING_STARTED.md](GETTING_STARTED.md) + [VALIDATION_ROADMAP.md](VALIDATION_ROADMAP.md)

**Check if it's working**
→ [QUICK_REF_INSTITUTIONAL.md](QUICK_REF_INSTITUTIONAL.md) (daily checks)

**Understand the math**
→ [INSTITUTIONAL_ENGINE.md](INSTITUTIONAL_ENGINE.md) (Kelly section)

**Write custom analysis**
→ [SQL_REFERENCE.md](SQL_REFERENCE.md) (query examples)

**Validate my filters**
→ [SHADOW_BETS_GUIDE.md](SHADOW_BETS_GUIDE.md)

**Decide Phase 1 success**
→ [VALIDATION_ROADMAP.md](VALIDATION_ROADMAP.md) (success criteria)

**Understand CLV**
→ [INSTITUTIONAL_ENGINE.md](INSTITUTIONAL_ENGINE.md) (key concepts)

**Setup monitoring**
→ [README_INSTITUTIONAL.md](README_INSTITUTIONAL.md) (checklist)

---

## 🔑 KEY CONCEPTS (FIND THEM HERE)

### CLV (Closing Line Value)
- **What**: (closing_odds / odds_taken) - 1
- **Why**: Proves you beat market BEFORE adjustment
- **Found in**: INSTITUTIONAL_ENGINE.md → Key Concepts
- **Queries**: SQL_REFERENCE.md → Query 1-5

### Kelly Criterion
- **What**: Mathematical formula for optimal bet sizing
- **Why**: Grows capital exponentially while surviving variance
- **Found in**: INSTITUTIONAL_ENGINE.md → Key Concepts
- **Implementation**: /api/run-loop → getKellyStake()

### Shadow Bets
- **What**: Predictions you track but don't place (stake=0)
- **Why**: Validates if your filters add or remove edge
- **Found in**: SHADOW_BETS_GUIDE.md
- **Analysis**: SQL_REFERENCE.md → Query 3

### Regime Isolation
- **What**: Keeping EPL separate from World Cup data
- **Why**: Different markets need separate validation
- **Found in**: MULTI_MARKET_STRATEGY.md
- **Implementation**: Experiment model with competition field

### Kill Switches
- **What**: Automatic system stop if edge disappears
- **Triggers**: avg_clv < 0, positive_rate < 48%, drawdown > 30%
- **Found in**: INSTITUTIONAL_ENGINE.md → Safety Features
- **Code**: /api/run-loop → checkCLVHealth()

---

## 📊 SYSTEM COMPONENTS

### Database Schema (5 models)
1. **Experiment** – Regime isolation
2. **Bankroll** – Capital tracking
3. **Prediction** – Model output
4. **Bet** – Real + shadow bets
5. **DailySnapshot** – Daily metrics

📖 Details: [INSTITUTIONAL_ENGINE.md](INSTITUTIONAL_ENGINE.md) → Database Structure

### API Endpoints (7 core)
1. `/api/run-loop` – Main orchestrator
2. `/api/dashboard` – Live metrics
3. `/api/experiment/create` – Initialize experiment
4. `/api/analytics/query` – Advanced analysis
5. `/api/health` – System status
6. `/api/diagnostic` – Debug info
7. `/api/test/insert` – Test data

📖 Details: [README_INSTITUTIONAL.md](README_INSTITUTIONAL.md) → API Reference

### Orchestrator Steps (8-phase)
1. Get active experiment
2. Check CLV health (kill switch)
3. Check 150-bet completion
4. Generate bets (Kelly sizing)
5. Calculate CLV
6. Update bankroll
7. Detect anomalies
8. Log results

📖 Details: [INSTITUTIONAL_ENGINE.md](INSTITUTIONAL_ENGINE.md) → System Flow

---

## ✅ CHECKLIST BY PHASE

### Pre-Deployment
- [ ] Read [GETTING_STARTED.md](GETTING_STARTED.md)
- [ ] Read [INSTITUTIONAL_ENGINE.md](INSTITUTIONAL_ENGINE.md)
- [ ] Understand CLV concept
- [ ] Understand Kelly concept
- [ ] Understand kill switches

### Deployment
- [ ] Run schema migration
- [ ] Create first experiment
- [ ] Verify dashboard loads
- [ ] Test run-loop endpoint
- [ ] Configure cron schedule
- [ ] Set up monitoring

📖 Details: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) → Deployment Steps

### Phase 1 (Days 1-10)
- [ ] Daily: Check dashboard
- [ ] Daily: Log observations in DAILY_LOG.md
- [ ] Day 3: First checkpoint (50 bets)
- [ ] Day 7: Second checkpoint (100 bets)
- [ ] Day 10: Final decision (150 bets)

📖 Details: [VALIDATION_ROADMAP.md](VALIDATION_ROADMAP.md) → Phase 1

### Phase 1 Decision
- [ ] avg_clv > 0? ✅
- [ ] positive_clv_rate > 50%? ✅
- [ ] no decline in peak_balance? ✅
- [ ] All three pass → Phase 2
- [ ] Any fail → Rebuild + restart

📖 Details: [VALIDATION_ROADMAP.md](VALIDATION_ROADMAP.md) → Success Criteria

---

## 🚨 TROUBLESHOOTING GUIDE

| Problem | Solution | Reference |
| ------- | -------- | --------- |
| Dashboard shows 0 bets | Run loop hasn't triggered yet | QUICK_REF → Troubleshooting |
| avg_clv is very small | Sample size too small, wait | SQL_REFERENCE → Health Check |
| System stops betting | CLV went negative (kill switch) | INSTITUTIONAL_ENGINE → Kill Switches |
| Migration fails | Check database connection | MIGRATION_GUIDE → Troubleshooting |
| Schema validation error | Review updated schema.prisma | MIGRATION_GUIDE → Schema Changes |
| Cron not running | Verify vercel.json config | MIGRATION_GUIDE → Cron Setup |

---

## 📈 MONITORING TEMPLATES

### Daily Check (2 min)
```bash
curl "http://localhost:3000/api/dashboard?experimentId=$ID" | jq '.metrics'
```
📖 Template: [QUICK_REF_INSTITUTIONAL.md](QUICK_REF_INSTITUTIONAL.md) → Daily Checks

### Weekly Analysis (10 min)
- CLV trend (is it positive or negative?)
- Real vs shadow (are filters working?)
- Drawdown status (is capital preserved?)

📖 Queries: [SQL_REFERENCE.md](SQL_REFERENCE.md) → Deep Analysis

### Monthly Report (30 min)
- Compare experiments (EPL vs World Cup)
- Filter effectiveness (shadow bet analysis)
- Model decay (CLV over time)

📖 Framework: [VALIDATION_ROADMAP.md](VALIDATION_ROADMAP.md) → Metrics

---

## 🎓 LEARNING PATH

**For complete understanding**, read in order:

1. **GETTING_STARTED.md** (10 min) – Setup + overview
2. **QUICK_REF_INSTITUTIONAL.md** (5 min) – Commands + cheat sheet
3. **INSTITUTIONAL_ENGINE.md** (20 min) – Deep dive system
4. **VALIDATION_ROADMAP.md** (15 min) – Phase framework
5. **SQL_REFERENCE.md** (15 min) – Query examples
6. **MIGRATION_GUIDE.md** (10 min) – Deployment details

**Total**: ~75 minutes for complete mastery.

---

## 📞 QUICK REFERENCE CARDS

### Metrics Cheat Sheet
```
avg_clv:
  > +0.05 = strong edge ✅
  0 to +0.05 = weak edge ⚠️
  < 0 = losing ❌

positive_rate:
  > 52% = good
  48-52% = caution
  < 48% = kill switch 🛑

drawdown:
  < 10% = normal
  10-20% = reduce 50%
  > 30% = stop 🛑
```

### Command Cheat Sheet
```bash
# Health check (daily)
curl "http://localhost:3000/api/dashboard?experimentId=$ID"

# Trend analysis (weekly)
curl -X POST .../api/analytics/query -d '{"experimentId":"$ID","query":"clv-trend"}'

# Filter validation (weekly)
curl -X POST .../api/analytics/query -d '{"experimentId":"$ID","query":"real-vs-shadow"}'

# Risk assessment (daily)
curl -X POST .../api/analytics/query -d '{"experimentId":"$ID","query":"drawdown-status"}'
```

---

## 🔗 FILE MANIFEST

### Documentation Files (6)
- `GETTING_STARTED.md` – Entry point (10 min)
- `QUICK_REF_INSTITUTIONAL.md` – Reference card (5 min)
- `INSTITUTIONAL_ENGINE.md` – System overview (20 min)
- `MIGRATION_GUIDE.md` – Deployment (10 min)
- `README_INSTITUTIONAL.md` – Quick start (5 min)
- `SQL_REFERENCE.md` – Query examples (15 min)

### Support Documentation (3)
- `VALIDATION_ROADMAP.md` – 5-phase framework
- `SHADOW_BETS_GUIDE.md` – Filter validation
- `MULTI_MARKET_STRATEGY.md` – Regime isolation

### Code Files (New)
- `prisma/schema.prisma` – Updated (5 new models)
- `src/app/api/run-loop/route.ts` – Orchestrator
- `src/app/api/dashboard/route.ts` – Metrics
- `src/app/api/experiment/create/route.ts` – Setup
- `src/app/api/analytics/query/route.ts` – Analysis

---

## 🎯 SUCCESS CRITERIA

**After 150 EPL bets** (Phase 1 completion):

✅ **PASS** if all true:
- avg_clv > 0
- positive_clv_rate > 50%
- no decline in peak_balance

🚀 **Action**: Proceed to Phase 2 (50-bet confirmation)

❌ **FAIL** if any false:
- avg_clv ≤ 0
- positive_clv_rate ≤ 50%
- peak_balance declined

🔧 **Action**: Analyze, rebuild model, restart Phase 1

---

## 📍 YOU ARE HERE

**Current Status**: Deployed ✅

- Schema: Ready
- Endpoints: Ready
- Documentation: Complete
- System: Production-ready

**Next Step**: Deploy to Supabase + start Phase 1

---

## 🚀 READY?

1. Open: [GETTING_STARTED.md](GETTING_STARTED.md)
2. Follow: 5-minute setup
3. Verify: Dashboard works
4. Configure: Cron schedule
5. Monitor: Daily metrics

**Phase 1 starts now.**

---

**This documentation is your system's manual.**

**Bookmark this page.**

**Update it as you learn.**

✅ **You're ready to launch.**
