/**
 * AUTO EXECUTION ENGINE
 * 
 * Autonomous betting execution system
 * - Queue management
 * - Job creation
 * - Execution loop
 * - Risk control
 * - Full logging
 */

import crypto from "crypto";

export type ExecutionStatus = "PENDING" | "EXECUTED" | "SKIPPED" | "FAILED";

export interface ExecutionJob {
  id: string;
  matchId: string;
  selectionId: number;
  selection: string; // team name
  edge: number; // as decimal (0.05 = 5%)
  entryOdds: number;
  stake: number;
  kickoff: number; // timestamp ms
  createdAt: number;
  status: ExecutionStatus;
  executedAt?: number;
  actualOdds?: number;
  slippage?: number;
  reason?: string;
  partialFilled?: boolean;
}

export interface ExecutionQueue {
  jobs: Map<string, ExecutionJob>;
}

export interface ExecutionStats {
  pending: number;
  executed: number;
  skipped: number;
  failed: number;
  totalStaked: number;
  avgSlippage: number;
}

export interface SafetyCheckResult {
  passed: boolean;
  issues: string[];
}

/**
 * Create new execution queue
 */
export function createExecutionQueue(): ExecutionQueue {
  return {
    jobs: new Map(),
  };
}

/**
 * Create execution job from signal
 */
export function createExecutionJob({
  matchId,
  selectionId,
  selection,
  edge,
  entryOdds,
  stake,
  kickoff,
}: {
  matchId: string;
  selectionId: number;
  selection: string;
  edge: number;
  entryOdds: number;
  stake: number;
  kickoff: number;
}): ExecutionJob {
  return {
    id: crypto.randomUUID(),
    matchId,
    selectionId,
    selection,
    edge,
    entryOdds,
    stake,
    kickoff,
    createdAt: Date.now(),
    status: "PENDING",
  };
}

/**
 * Add job to queue
 */
export function addJobToQueue(queue: ExecutionQueue, job: ExecutionJob): void {
  queue.jobs.set(job.id, job);
}

/**
 * Get pending jobs (ready for execution check)
 */
export function getPendingJobs(queue: ExecutionQueue): ExecutionJob[] {
  return Array.from(queue.jobs.values()).filter((j) => j.status === "PENDING");
}

/**
 * Calculate hours until kickoff for a job
 */
export function hoursUntilKickoff(job: ExecutionJob): number {
  const now = Date.now();
  const msToKickoff = job.kickoff - now;
  return msToKickoff / (1000 * 60 * 60);
}

/**
 * Check if job is in execution window
 */
export function isInExecutionWindow(job: ExecutionJob): boolean {
  const hours = hoursUntilKickoff(job);
  return hours >= 1 && hours <= 6; // 1-6 hours before KO
}

/**
 * Check if job has expired (KO passed)
 */
export function hasExpired(job: ExecutionJob): boolean {
  return hoursUntilKickoff(job) < 0;
}

/**
 * Check if too close to kickoff
 */
export function isTooCloseToKickoff(job: ExecutionJob): boolean {
  return hoursUntilKickoff(job) < 0.5; // <30 mins
}

/**
 * Safety checks before execution
 */
export function performSafetyChecks({
  job,
  activeBets,
  bankroll,
  maxDailyExposure,
  maxDrawdown,
}: {
  job: ExecutionJob;
  activeBets: ExecutionJob[];
  bankroll: number;
  maxDailyExposure?: number;
  maxDrawdown?: number;
}): SafetyCheckResult {
  const issues: string[] = [];

  // Check 1: Job is still valid
  if (hasExpired(job)) {
    issues.push("Job expired (KO passed)");
  }

  if (isTooCloseToKickoff(job)) {
    issues.push("Too close to kickoff (<30 mins)");
  }

  // Check 2: Edge still exists
  if (job.edge < 0.02) {
    issues.push("Edge decayed below 2%");
  }

  // Check 3: Stake is reasonable
  const maxStake = bankroll * 0.05; // 5% of bankroll per bet
  if (job.stake > maxStake) {
    issues.push(`Stake too high (${job.stake} > ${maxStake})`);
  }

  // Check 4: Daily exposure limit
  if (maxDailyExposure !== undefined) {
    const activeExposure = activeBets.reduce((sum, b) => sum + b.stake, 0);
    if (activeExposure + job.stake > bankroll * maxDailyExposure) {
      issues.push(
        `Exposure limit exceeded (${activeExposure + job.stake} > ${bankroll * maxDailyExposure})`
      );
    }
  }

  // Check 5: Drawdown check
  if (maxDrawdown !== undefined) {
    const totalStaked = activeBets.reduce((sum, b) => sum + b.stake, 0);
    if (totalStaked > bankroll * maxDrawdown) {
      issues.push(
        `Drawdown limit exceeded (${totalStaked} > ${bankroll * maxDrawdown})`
      );
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Process execution for a single job
 * This simulates actual bet placement
 */
export function executeJobSimulated(
  job: ExecutionJob,
  currentOdds: number
): ExecutionJob {
  // Calculate slippage
  const slippage = currentOdds - job.entryOdds;
  const slippagePercent = (slippage / job.entryOdds) * 100;

  // Mark as executed
  const updated: ExecutionJob = {
    ...job,
    status: "EXECUTED",
    executedAt: Date.now(),
    actualOdds: currentOdds,
    slippage: slippagePercent,
    reason: `Executed at ${currentOdds.toFixed(2)} (expected ${job.entryOdds.toFixed(2)}, slippage ${slippagePercent.toFixed(2)}%)`,
  };

  return updated;
}

/**
 * Skip job (mark as skipped with reason)
 */
export function skipJob(job: ExecutionJob, reason: string): ExecutionJob {
  return {
    ...job,
    status: "SKIPPED",
    reason,
  };
}

/**
 * Main execution engine loop
 * Runs every 60 seconds
 */
export function runExecutionEngineLoop(
  queue: ExecutionQueue,
  options?: {
    getCurrentOdds?: (job: ExecutionJob) => Promise<number>;
    minActiveBets?: number;
  }
): ExecutionJob[] {
  const executed: ExecutionJob[] = [];
  const pending = getPendingJobs(queue);

  for (const job of pending) {
    // Check timing window
    if (!isInExecutionWindow(job)) {
      const updated = skipJob(job, "Outside execution window");
      queue.jobs.set(job.id, updated);
      continue;
    }

    // Check expiry
    if (hasExpired(job)) {
      const updated = skipJob(job, "Expired (KO passed)");
      queue.jobs.set(job.id, updated);
      continue;
    }

    // Check too close to KO
    if (isTooCloseToKickoff(job)) {
      const updated = skipJob(job, "Too close to kickoff");
      queue.jobs.set(job.id, updated);
      continue;
    }

    // Safety checks
    const activeBets = Array.from(queue.jobs.values()).filter(
      (j) => j.status === "EXECUTED"
    );
    const safetyCheck = performSafetyChecks({
      job,
      activeBets,
      bankroll: 10000, // default
    });

    if (!safetyCheck.passed) {
      const updated = skipJob(job, safetyCheck.issues.join(", "));
      queue.jobs.set(job.id, updated);
      continue;
    }

    // Execute (simulated)
    // In real system, this would be actual Betfair API call
    const currentOdds = job.entryOdds * (0.98 + Math.random() * 0.04); // ±2% random for simulation
    const executed_job = executeJobSimulated(job, currentOdds);
    queue.jobs.set(job.id, executed_job);
    executed.push(executed_job);
  }

  return executed;
}

/**
 * Get queue statistics
 */
export function getQueueStats(queue: ExecutionQueue): ExecutionStats {
  const jobs = Array.from(queue.jobs.values());

  const stats = {
    pending: jobs.filter((j) => j.status === "PENDING").length,
    executed: jobs.filter((j) => j.status === "EXECUTED").length,
    skipped: jobs.filter((j) => j.status === "SKIPPED").length,
    failed: jobs.filter((j) => j.status === "FAILED").length,
    totalStaked: jobs
      .filter((j) => j.status === "EXECUTED")
      .reduce((sum, j) => sum + j.stake, 0),
    avgSlippage:
      jobs.filter((j) => j.slippage !== undefined).length > 0
        ? jobs.filter((j) => j.slippage !== undefined).reduce(
            (sum, j) => sum + (j.slippage || 0),
            0
          ) /
          jobs.filter((j) => j.slippage !== undefined).length
        : 0,
  };

  return stats;
}

/**
 * Get job history (all jobs, sorted by creation time)
 */
export function getJobHistory(
  queue: ExecutionQueue
): (ExecutionJob & { hoursToKO: number })[] {
  return Array.from(queue.jobs.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((job) => ({
      ...job,
      hoursToKO: hoursUntilKickoff(job),
    }));
}

/**
 * Clear completed jobs (older than N hours)
 */
export function clearCompletedJobs(
  queue: ExecutionQueue,
  hoursOld: number = 24
): number {
  const cutoff = Date.now() - hoursOld * 60 * 60 * 1000;
  let removed = 0;

  for (const [id, job] of queue.jobs) {
    if (job.status !== "PENDING" && job.createdAt < cutoff) {
      queue.jobs.delete(id);
      removed++;
    }
  }

  return removed;
}

/**
 * Simulate full execution session (for testing)
 */
export function simulateExecutionSession(
  jobs: ExecutionJob[],
  hoursBeforeKickoff: number[]
): ExecutionJob[] {
  const queue = createExecutionQueue();

  // Create jobs at different times
  for (let i = 0; i < jobs.length; i++) {
    const job = {
      ...jobs[i],
      kickoff:
        Date.now() +
        (hoursBeforeKickoff[i] || 3) * 60 * 60 * 1000,
    };
    addJobToQueue(queue, job);
  }

  // Run engine loop (simulates 1 hour of polling)
  for (let iteration = 0; iteration < 60; iteration++) {
    // Simulate time advancement
    const timeStep = (1 * 60 * 1000) / 60; // 1 minute per iteration

    runExecutionEngineLoop(queue);

    // Check if any jobs executed
    const executed = Array.from(queue.jobs.values()).filter(
      (j) => j.status === "EXECUTED"
    );
    if (executed.length === jobs.length) {
      break; // All done
    }
  }

  return Array.from(queue.jobs.values());
}

/**
 * Estimate daily P&L from executed bets
 */
export function estimateSessionPnL(
  executed: ExecutionJob[]
): {
  totalStaked: number;
  avgOdds: number;
  expectedReturn: number;
  estimatedPnL: number;
} {
  if (executed.length === 0) {
    return {
      totalStaked: 0,
      avgOdds: 0,
      expectedReturn: 0,
      estimatedPnL: 0,
    };
  }

  const totalStaked = executed.reduce((sum, j) => sum + j.stake, 0);
  const avgOdds =
    executed.reduce((sum, j) => sum + (j.actualOdds || j.entryOdds), 0) /
    executed.length;
  const expectedReturn = totalStaked * (avgOdds - 1) * 0.55; // Assume 55% win rate

  return {
    totalStaked,
    avgOdds,
    expectedReturn,
    estimatedPnL: expectedReturn - totalStaked,
  };
}
