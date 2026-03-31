import { PredictionBet } from "./types";

/**
 * In-memory bet storage (will migrate to Supabase)
 */
const bets = new Map<string, PredictionBet>();
const fixtureIndex = new Map<number, string>();

/**
 * Save a bet
 */
export function saveBet(bet: PredictionBet): void {
  bets.set(bet.id, bet);
  fixtureIndex.set(bet.fixture_id, bet.id);
}

/**
 * Get bet by ID
 */
export function getBetById(id: string): PredictionBet | null {
  return bets.get(id) ?? null;
}

/**
 * Get bet by fixture ID
 */
export function getBetByFixture(fixture_id: number): PredictionBet | null {
  const betId = fixtureIndex.get(fixture_id);
  if (!betId) return null;
  return bets.get(betId) ?? null;
}

/**
 * Get all bets
 */
export function getAllBets(): PredictionBet[] {
  return Array.from(bets.values());
}

/**
 * Delete a bet
 */
export function deleteBet(id: string): void {
  const bet = bets.get(id);
  if (bet) {
    fixtureIndex.delete(bet.fixture_id);
  }
  bets.delete(id);
}

/**
 * Clear all bets (for testing)
 */
export function clearAllBets(): void {
  bets.clear();
  fixtureIndex.clear();
}
