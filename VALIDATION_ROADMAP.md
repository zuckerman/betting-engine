# Complete Validation Roadmap (5-Phase Framework)

**Current Status:** Phase 1 (EPL Validation) — ACTIVE  
**Date Started:** 31 March 2026  
**Build:** Production-ready ✅

---

## 📋 Executive Summary

This is a **statistically-rigorous, multi-market betting validation engine** designed to prove edge (or disprove it) before scaling.

**What makes this different:**
- ✅ CLV = edge metric (not profit)
- ✅ Shadow bets validate filters
- ✅ Regime isolation (EPL separate from World Cup)
- ✅ No mid-run tweaking allowed
- ✅ Fixed sample sizes (150 bets per market)
- ✅ Professional-grade audit trail

---

## 🔄 5-Phase Framework

### Phase 1: EPL Validation (ACTIVE)

**Duration:** ~10 days (150 bets)  
**Target start:** 31 Mar 2026  
**Target end:** ~10 Apr 2026  

**What you're doing:**
1. Generate predictions (Poisson model)
2. Place bets (where EV > threshold)
3. Log everything in Prediction table
4. Track skipped bets in ShadowBet table
5. Record daily metrics in DailySnapshot

**What you're measuring:**
| Metric | Method | Target |
|--------|--------|--------|
| **CLV** | (closing_odds - odds_taken) | Positive trend |
| **Hit rate** | % beats implied prob | ~55%+ |
| **Filter quality** | ShadowBet CLV vs taken CLV | Taken > Shadow |
| **Sample size** | Count settled bets | 150 minimum |

**Non-negotiables:**
- ✅ All bets logged BEFORE kickoff
- ✅ Fixed stake sizing
- ✅ No model changes mid-run
- ✅ No threshold adjustments mid-run
- ✅ Competition field = "epl"

**Success criteria:**
- CLV consistently positive (avg +1% or better)
- Hit rate >= 53%
- Shadow bets underperform taken bets
- No statistical anomalies

**Failure criteria:**
- CLV flat or negative
- Hit rate < 50%
- Shadow bets outperform taken bets
- Model shows no edge

**Exit decision (at 150 bets):**
| Result | Action |
|--------|--------|
| ✅ CLV > 0, hit rate > 53% | **PROCEED to Phase 2** |
| ⚠️ CLV ≈ 0, hit rate = 50-53% | Run 100 more bets or **tighten filters** |
| ❌ CLV < 0, hit rate < 50% | **STOP, analyze model, rebuild** |

---

### Phase 2: EPL Edge Confirmation (NOT YET)

**Duration:** 2 weeks  
**Bets:** 50 additional (200 total)  
**Purpose:** Confirm Phase 1 wasn't lucky

**What you're doing:**
- Continue same system (no changes)
- Monitor CLV stability
- Check if edge holds under real conditions

**Success criteria:**
- CLV consistency (not widening)
- No trend reversal
- Filter quality maintained

**Exit decision:**
- **CONFIRMED EDGE** → Proceed to Phase 3
- **EDGE UNSTABLE** → Investigate and rebuild
- **EDGE DISAPPEARING** → Stop, signal may be statistical artifact

---

### Phase 3: World Cup Prep (May 25 - Jun 1)

**Duration:** 1 week  
**Purpose:** Set up completely separate experiment

**What you're doing:**
1. Stop EPL betting (season ends, fewer games)
2. Review EPL results (lock in decision)
3. Prepare World Cup infrastructure
4. Set new thresholds if needed (fresh analysis)

**New tables:**
- Same structure as EPL
- `competition = "world_cup"`
- `season = "world_cup_2026"`
- Completely separate tracking

**Why separate:**
- Different market efficiency
- Different team dynamics
- Different public bias
- Need clean dataset to answer: "Does my edge transfer?"

---

### Phase 4: World Cup Validation (Jun 1 - Jul 15)

**Duration:** ~6 weeks (150 bets)  
**Purpose:** Test if edge is universal or league-specific

**What you're doing:**
- Same process as Phase 1
- Fresh Prediction + ShadowBet tracking
- Same metrics (CLV, hit rate)
- Same discipline rules

**Success criteria:**
- CLV positive (may be different magnitude than EPL)
- Hit rate >= 53%
- Shadow bets underperform

**Key question:** Does your edge **transfer**?

| Result | Implication |
|--------|-------------|
| Both markets have +CLV | **Universal edge** → scale both |
| Only EPL has +CLV | **Niche advantage** → EPL only |
| Only World Cup has +CLV | **Leverage public bias** → World Cup focus |
| Neither has +CLV | **Model needs work** → back to research |

---

### Phase 5: Scale Decision (Late Jul → Aug)

**Duration:** Decision point  
**Purpose:** Final go/no-go for multi-market operation

**Scaling rules:**

| Condition | Requirement | Action |
|-----------|-------------|--------|
| **Both CLV > 0** | ✅ | Run both in parallel |
| **One CLV > 0** | ✅ | Scale the positive one only |
| **Any CLV < 0** | ❌ | Don't scale, improve model |
| **Process broken** | ❌ | Stop, audit system |

**Stakes at scale:**
- Start with 1-2% of bankroll per market
- Increase 5-10% per week if metrics hold
- Stop immediately if CLV turns negative
- Daily monitoring (no autopilot)

---

## 📊 Key Metrics You'll Track

### Daily (During Active Phases)

```
Date: [today]
Competition: epl (or world_cup)
Bets placed: [count]
Bets settled: [count]
Rolling CLV: [avg of last 20 closed odds - odds taken]
Beat rate: [% of bets with odds_taken > closing_odds]
Status: [GREEN/AMBER/RED]
Changes made: NONE
```

### Per Phase (150-bet milestone)

```
Total bets: 150
AVG CLV: [target: +0.01 to +0.03]
Hit rate: [target: 53%+]
Shadow CLV: [should be < taken CLV]
Std dev (CLV): [want low variance]
P-value (significance): [want < 0.10]
```

### Multi-market (Phase 5)

```
EPL CLV: [value]
World Cup CLV: [value]
Edge correlated? [yes/no]
Recommendation: [scale/hold/improve]
```

---

## 🔐 Discipline Checkpoints

### Every 50 bets:
- ✅ Review shadow bet quality
- ✅ Check filters aren't removing edge
- ✅ Verify data integrity
- ✅ Log observations (ONLY, no changes)

### At 100 bets:
- ✅ Preliminary trend check
- ✅ Ask: Is CLV moving positive or negative?
- ✅ If RED: Decide to stop or continue
- ✅ Make ZERO changes regardless

### At 150 bets:
- ✅ Full statistical analysis
- ✅ Phase exit decision
- ✅ Document all findings
- ✅ Commit to next phase or revise

---

## 🚨 What NOT to Do

During any phase:

❌ **Change model parameters mid-run**  
❌ **Adjust thresholds after seeing results**  
❌ **Mix regimes (EPL + World Cup together)**  
❌ **Judge on profit instead of CLV**  
❌ **Skip shadow bet logging**  
❌ **Use autopilot (check daily)**  
❌ **Scale before 150-bet validation**  
❌ **Make exceptions to placement rules**

---

## 📁 Files Supporting This Framework

| File | Purpose |
|------|---------|
| [QUICK_REF.md](QUICK_REF.md) | 2-min daily routine |
| [DAILY_LOG.md](DAILY_LOG.md) | Logging template |
| [OPERATOR_HANDBOOK.md](OPERATOR_HANDBOOK.md) | Full discipline guide |
| [SHADOW_BETS_GUIDE.md](SHADOW_BETS_GUIDE.md) | Filter validation |
| [MULTI_MARKET_STRATEGY.md](MULTI_MARKET_STRATEGY.md) | Regime isolation |
| [REGIME_CHANGE_WARNING.md](REGIME_CHANGE_WARNING.md) | Timeline awareness |

---

## 🎯 Success Definition

**This framework succeeds if:**

1. ✅ You reach 150 EPL bets with clean data
2. ✅ CLV signal is clear (positive or negative)
3. ✅ You can replicate it in World Cup
4. ✅ You scale only validated markets
5. ✅ You never deviate from the process

**This framework fails if:**

1. ❌ You change rules mid-test
2. ❌ You judge on profit instead of CLV
3. ❌ You skip shadow bet tracking
4. ❌ You mix markets in one dataset
5. ❌ You scale without validation

---

## 💰 Financial Thesis

**Short term (Phase 1-2):** Small sample, high variance  
**Mid term (Phase 3-4):** Validate across markets  
**Long term (Phase 5+):** Scale multi-market if both work  

**Expected outcomes:**

| Scenario | Probability | Action |
|----------|-------------|--------|
| No edge found | 60-70% | Better than losing money at scale |
| Niche edge found | 20-25% | Profitable single-market strategy |
| Universal edge found | 5-10% | Rare, multi-market operation |

**Why this matters:**
Most traders find out they have no edge AFTER they scale.  
You'll find out BEFORE.

---

## 🚀 Current Status

```
Phase 1: ACTIVE (Day 1, Bets 0-150)
├─ 31 Mar 2026: System live, logging started
├─ ~7 Apr 2026: 50-bet shadow analysis
├─ ~10 Apr 2026: 150-bet decision point
└─ Decision: Proceed to Phase 2 or rebuild

Next milestone: 150 bets (est. 10 Apr 2026)
```

---

## 🔔 When to Come Back

| Event | Action |
|-------|--------|
| **At 50 bets** | Review shadow quality, document observations |
| **At 100 bets** | Preliminary trend check, preliminary decision |
| **At 150 bets** | Final EPL decision, plan Phase 3 (if proceeding) |
| **Late May** | Prepare World Cup infrastructure |
| **Jun 1** | Switch to World Cup (fresh experiment) |
| **Jul 15** | World Cup decision, prepare Phase 5 |

---

## 🎓 What You'll Learn

After completing this framework, you'll know:

1. **Is your edge real?** (CLV proof)
2. **Is it repeatable?** (consistency across samples)
3. **Is it transferable?** (works in multiple markets)
4. **How big is it?** (CLV magnitude by market)
5. **Can you scale it?** (without destroying it)

This is what professional betting syndicates do.

You're building like they do.

---

**Stay disciplined. Let data speak.**
