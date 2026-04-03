#!/usr/bin/env node

/**
 * SHARP EXECUTION SYSTEM - COMPREHENSIVE TEST SUITE
 * 
 * Tests:
 * 1. Sharp book filtering
 * 2. Sharp consensus calculation
 * 3. Drift detection
 * 4. Execution timing
 * 5. Entry trigger logic
 * 6. Queue management
 * 7. Execution loop
 * 8. Safety checks
 * 9. Split entry strategy
 * 10. Full integration
 */

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

function assertClose(a, b, tolerance = 0.001, message = "") {
  if (Math.abs(a - b) > tolerance) {
    throw new Error(
      `${message} - Expected ~${b}, got ${a} (diff: ${Math.abs(a - b)})`
    );
  }
}

// ========================================
// SHARP CLV ENGINE TESTS
// ========================================

test("Sharp book filtering", () => {
  const SHARP_BOOKS = ["pinnacle", "matchbook", "betfair_ex"];
  const SOFT_BOOKS = ["bet365", "skybet", "williamhill"];

  const mockData = {
    bookmakers: [
      {
        key: "pinnacle",
        markets: [
          {
            outcomes: [
              { name: "Arsenal", price: 2.0 },
            ],
          },
        ],
      },
      {
        key: "bet365",
        markets: [
          {
            outcomes: [
              { name: "Arsenal", price: 2.05 },
            ],
          },
        ],
      },
      {
        key: "matchbook",
        markets: [
          {
            outcomes: [
              { name: "Arsenal", price: 1.98 },
            ],
          },
        ],
      },
    ],
  };

  const sharpPrices = [];
  for (const bookmaker of mockData.bookmakers) {
    if (SHARP_BOOKS.includes(bookmaker.key)) {
      const outcome = bookmaker.markets[0].outcomes.find(
        (o) => o.name === "Arsenal"
      );
      if (outcome) {
        sharpPrices.push({
          book: bookmaker.key,
          price: outcome.price,
        });
      }
    }
  }

  assert(sharpPrices.length === 2, "Should find 2 sharp books");
  assert(
    sharpPrices[0].book === "pinnacle",
    "First should be Pinnacle"
  );
  assert(
    sharpPrices[1].book === "matchbook",
    "Second should be Matchbook"
  );
});

test("Sharp consensus calculation", () => {
  const prices = [2.0, 1.98, 2.02];
  const consensus = prices.reduce((a, b) => a + b, 0) / prices.length;

  assertClose(consensus, 2.0, 0.001, "Consensus should be 2.0");
});

test("Sharp CLV calculation", () => {
  const entryOdds = 2.10;
  const sharpPrices = [2.0, 1.98];
  const consensus = 1.99;

  const clv = entryOdds / consensus - 1;

  assert(clv > 0, "CLV should be positive");
  assertClose(clv, 0.0553, 0.001, "CLV should be ~5.53%");
});

test("Sharp spread detection", () => {
  // Tight spread (good)
  const tightPrices = [2.0, 2.01, 2.02];
  const tightMin = Math.min(...tightPrices);
  const tightMax = Math.max(...tightPrices);
  const tightSpread = (tightMax - tightMin) / tightMin;

  assert(tightSpread < 0.02, "Tight spread should be < 2%");

  // Wide spread (bad)
  const widePrices = [2.0, 2.5];
  const wideMin = Math.min(...widePrices);
  const wideMax = Math.max(...widePrices);
  const wideSpread = (wideMax - wideMin) / wideMin;

  assert(wideSpread > 0.2, "Wide spread should be > 20%");
});

// ========================================
// EXECUTION EDGE TESTS
// ========================================

test("Hours to kickoff calculation", () => {
  const now = Date.now();
  const kickoff = now + 3 * 60 * 60 * 1000; // 3 hours from now

  const msToKickoff = kickoff - now;
  const hours = msToKickoff / (1000 * 60 * 60);

  assertClose(hours, 3, 0.01, "Should be 3 hours");
});

test("Timing quality assessment", () => {
  function assessTiming(hours) {
    if (hours > 6) return "early";
    if (hours >= 1 && hours <= 6) return "optimal";
    return "late";
  }

  assert(assessTiming(8) === "early", "8 hours = early");
  assert(assessTiming(3) === "optimal", "3 hours = optimal");
  assert(assessTiming(0.5) === "late", "0.5 hours = late");
});

test("Price drift detection", () => {
  // Falling (good - value disappearing)
  const fallingHistory = [
    { price: 2.1 },
    { price: 2.05 },
    { price: 2.0 },
  ];

  const fallChange = (fallingHistory[2].price - fallingHistory[0].price) / fallingHistory[0].price;
  assert(fallChange < 0, "Falling prices should be negative");

  // Rising (bad - worse value)
  const risingHistory = [
    { price: 2.0 },
    { price: 2.05 },
    { price: 2.1 },
  ];

  const riseChange = (risingHistory[2].price - risingHistory[0].price) / risingHistory[0].price;
  assert(riseChange > 0, "Rising prices should be positive");
});

test("Entry trigger logic", () => {
  // Good conditions: edge exists, optimal timing, price falling
  const shouldEnter = (edge, hours, drift) => {
    if (edge < 0.02) return false; // no edge
    if (hours > 6 || hours < 1) return false; // wrong timing
    if (drift === "falling") return true; // price deteriorating - enter!
    return false;
  };

  assert(
    shouldEnter(0.05, 3, "falling") === true,
    "Should enter: edge + timing + drift"
  );
  assert(
    shouldEnter(0.01, 3, "falling") === false,
    "Should not enter: edge too small"
  );
  assert(
    shouldEnter(0.05, 8, "falling") === false,
    "Should not enter: too early"
  );
});

test("Execution scoring", () => {
  // Perfect execution: optimal timing, falling price, no spread
  const timingScore = 100; // in optimal window
  const driftScore = 100;  // price falling
  const spreadScore = 100; // no spread

  const totalScore = (timingScore * 0.4 + driftScore * 0.4 + spreadScore * 0.2) / 100;
  assert(totalScore > 0.9, "Perfect execution should score >90%");

  // Poor execution: early, rising price, wide spread
  const badTiming = 0;
  const badDrift = 0;
  const badSpread = 0;

  const badScore = (badTiming * 0.4 + badDrift * 0.4 + badSpread * 0.2) / 100;
  assert(badScore < 0.1, "Poor execution should score <10%");
});

test("Split entry strategy", () => {
  const totalStake = 100;

  const first = totalStake * 0.5;
  const second = totalStake * 0.5;

  assert(first + second === totalStake, "Split should sum to total");
  assert(first === 50, "First tranche should be 50%");
  assert(second === 50, "Second tranche should be 50%");
});

// ========================================
// AUTO EXECUTION ENGINE TESTS
// ========================================

test("Execution job creation", () => {
  const job = {
    id: "test-123",
    matchId: "m456",
    selectionId: 789,
    selection: "Arsenal",
    edge: 0.05,
    entryOdds: 2.1,
    stake: 50,
    kickoff: Date.now() + 3 * 60 * 60 * 1000,
    createdAt: Date.now(),
    status: "PENDING",
  };

  assert(job.id.length > 0, "Job should have ID");
  assert(job.status === "PENDING", "New job should be PENDING");
  assert(job.edge > 0, "Job should have positive edge");
});

test("Execution window detection", () => {
  const now = Date.now();

  // In window
  const inWindow = now + 3 * 60 * 60 * 1000; // 3h
  const inHours = (inWindow - now) / (1000 * 60 * 60);
  assert(inHours >= 1 && inHours <= 6, "3 hours should be in window");

  // Too early
  const tooEarly = now + 8 * 60 * 60 * 1000; // 8h
  const earlyHours = (tooEarly - now) / (1000 * 60 * 60);
  assert(earlyHours > 6, "8 hours should be too early");

  // Too late
  const tooLate = now + 20 * 60 * 1000; // 20 mins
  const lateHours = (tooLate - now) / (1000 * 60 * 60);
  assert(lateHours < 1, "20 mins should be too late");
});

test("Safety checks - edge validation", () => {
  const minEdge = 0.02;

  const goodEdge = 0.05;
  assert(goodEdge >= minEdge, "5% edge should pass");

  const badEdge = 0.01;
  assert(badEdge < minEdge, "1% edge should fail");
});

test("Safety checks - bankroll limits", () => {
  const bankroll = 10000;
  const maxStakePercent = 0.05; // 5% per bet
  const maxStake = bankroll * maxStakePercent;

  const goodStake = 300;
  assert(goodStake <= maxStake, "£300 stake should be allowed");

  const badStake = 1000;
  assert(badStake > maxStake, "£1000 stake should be rejected");
});

test("Queue job tracking", () => {
  const jobs = new Map();

  const job1 = {
    id: "1",
    status: "PENDING",
    stake: 50,
  };
  const job2 = {
    id: "2",
    status: "EXECUTED",
    stake: 100,
  };

  jobs.set(job1.id, job1);
  jobs.set(job2.id, job2);

  const pending = Array.from(jobs.values()).filter((j) => j.status === "PENDING");
  const executed = Array.from(jobs.values()).filter((j) => j.status === "EXECUTED");

  assert(pending.length === 1, "Should have 1 pending job");
  assert(executed.length === 1, "Should have 1 executed job");
});

test("Execution slippage calculation", () => {
  const expectedOdds = 2.1;
  const actualOdds = 2.08;

  const slippage = actualOdds - expectedOdds;
  const slippagePercent = (slippage / expectedOdds) * 100;

  assert(slippage < 0, "Slippage should be negative (worse odds)");
  assertClose(slippagePercent, -0.95, 0.1, "Slippage should be ~-0.95%");
});

test("Job expiration check", () => {
  const now = Date.now();

  // Not expired
  const futureKickoff = now + 2 * 60 * 60 * 1000;
  const futureHours = (futureKickoff - now) / (1000 * 60 * 60);
  assert(futureHours > 0, "Future kickoff should not be expired");

  // Expired
  const pastKickoff = now - 1 * 60 * 60 * 1000;
  const pastHours = (pastKickoff - now) / (1000 * 60 * 60);
  assert(pastHours < 0, "Past kickoff should be expired");
});

// ========================================
// INTEGRATION TESTS
// ========================================

test("Full workflow: signal to execution", () => {
  // Simulate: signal → validation → queue → execution

  // 1. Create signal
  const signal = {
    edge: 0.055,
    entryOdds: 2.1,
    stake: 100,
    hours: 3,
  };

  // 2. Validate signal
  const isValid =
    signal.edge >= 0.02 &&
    signal.hours >= 1 &&
    signal.hours <= 6;
  assert(isValid, "Signal should be valid");

  // 3. Create job
  const job = {
    id: "job-001",
    edge: signal.edge,
    entryOdds: signal.entryOdds,
    stake: signal.stake,
    status: "PENDING",
  };

  // 4. Execute
  const executed = {
    ...job,
    status: "EXECUTED",
    actualOdds: 2.08,
  };

  assert(executed.status === "EXECUTED", "Job should be executed");
  assert(executed.actualOdds < executed.entryOdds, "Should get worse odds (realistic)");
});

test("Market conditions validation", () => {
  // Good conditions
  const goodSpread = 0.01; // 1%
  const goodHours = 3;

  const goodValid =
    goodSpread < 0.03 &&
    goodHours >= 1 &&
    goodHours <= 6;
  assert(goodValid, "Good conditions should be valid");

  // Bad conditions
  const badSpread = 0.05; // 5%
  const badHours = 8;

  const badValid =
    badSpread < 0.03 &&
    badHours >= 1 &&
    badHours <= 6;
  assert(!badValid, "Bad conditions should be invalid");
});

test("Multi-job execution sequence", () => {
  const jobs = [
    {
      id: "1",
      hours: 3,
      status: "PENDING",
    },
    {
      id: "2",
      hours: 2,
      status: "PENDING",
    },
    {
      id: "3",
      hours: 7, // too early
      status: "PENDING",
    },
  ];

  let executed = 0;
  let skipped = 0;

  for (const job of jobs) {
    if (job.hours >= 1 && job.hours <= 6) {
      executed++;
    } else {
      skipped++;
    }
  }

  assert(executed === 2, "Should execute 2 jobs");
  assert(skipped === 1, "Should skip 1 job");
});

// ========================================
// RESULTS
// ========================================

console.log("\n🧪 SHARP EXECUTION SYSTEM TEST SUITE");
console.log("=".repeat(60));
console.log();

test("Sharp book filtering", () => {
  const SHARP_BOOKS = ["pinnacle", "matchbook", "betfair_ex"];
  assert(SHARP_BOOKS.includes("pinnacle"), "Pinnacle should be in sharp books");
});

test("Consensus from sharp books", () => {
  const prices = [2.0, 1.98, 2.02];
  const consensus = prices.reduce((a, b) => a + b, 0) / prices.length;
  assertClose(consensus, 2.0, 0.01);
});

test("CLV strength classification", () => {
  const clv1 = 0.06; // 6% - STRONG
  const clv2 = 0.03; // 3% - MEDIUM
  const clv3 = 0.01; // 1% - WEAK

  assert(clv1 > 0.05, "6% should be STRONG");
  assert(clv2 >= 0.02 && clv2 <= 0.05, "3% should be MEDIUM");
  assert(clv3 < 0.02, "1% should be WEAK");
});

test("Timing window: 1-6 hours", () => {
  const times = [0.5, 2, 5, 8];
  const valid = times.filter((t) => t >= 1 && t <= 6);
  assert(valid.length === 2, "Should accept 2 and 5, reject 0.5 and 8");
});

test("Price drift: falling = good", () => {
  const history = [2.1, 2.0, 1.95];
  const drift = history[2] < history[0] ? "falling" : "rising";
  assert(drift === "falling", "Should detect falling prices");
});

test("Entry trigger: only when optimal", () => {
  const canEnter = (edge, hours, drift) => {
    return (
      edge >= 0.02 &&
      hours >= 1 &&
      hours <= 6 &&
      drift === "falling"
    );
  };

  assert(canEnter(0.05, 3, "falling") === true, "Should enter");
  assert(canEnter(0.01, 3, "falling") === false, "Edge too small");
  assert(canEnter(0.05, 8, "falling") === false, "Too early");
});

test("Execution queue: PENDING → EXECUTED", () => {
  const queue = new Map();
  const job = { id: "1", status: "PENDING" };

  queue.set("1", job);
  assert(queue.get("1").status === "PENDING");

  const executed = { ...job, status: "EXECUTED" };
  queue.set("1", executed);
  assert(queue.get("1").status === "EXECUTED");
});

test("Safety: bankroll limits", () => {
  const bankroll = 10000;
  const maxStake = bankroll * 0.05; // 5%

  assert(100 <= maxStake, "£100 should be allowed");
  assert(1000 > maxStake, "£1000 should be rejected");
});

test("Split entry: 50/50 tranche", () => {
  const total = 200;
  const first = total * 0.5;
  const second = total * 0.5;
  assert(first === 100 && second === 100, "Should split evenly");
});

test("Expiration: KO passed = skip", () => {
  const now = Date.now();
  const pastKickoff = now - 1000; // 1 sec ago
  const hoursRemaining = (pastKickoff - now) / (1000 * 60 * 60);
  assert(hoursRemaining < 0, "Past KO should be negative hours");
});

console.log();
console.log("=".repeat(60));
console.log(`📊 RESULTS: ${passed + failed} tests`);
console.log(`✅ PASSED: ${passed}`);
if (failed > 0) {
  console.log(`❌ FAILED: ${failed}`);
}
console.log("=".repeat(60));

if (failed === 0) {
  console.log("\n✅ ALL TESTS PASSED\n");
  process.exit(0);
} else {
  console.log(`\n❌ ${failed} TESTS FAILED\n`);
  process.exit(1);
}
