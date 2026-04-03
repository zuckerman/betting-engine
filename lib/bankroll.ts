/**
 * Bankroll management - tracks and updates capital after each settled bet
 * 
 * Formula:
 * - Win: bankroll + stake * (odds - 1)
 * - Loss: bankroll - stake
 */

export interface BankrollUpdate {
  bankroll: number
  stake: number
  odds: number
  result: 'win' | 'loss'
}

/**
 * Calculate new bankroll after bet result
 */
export function updateBankroll({
  bankroll,
  stake,
  odds,
  result,
}: BankrollUpdate): number {
  if (result === 'win') {
    // Win: get stake back + profit
    const profit = stake * (odds - 1)
    return bankroll + profit
  }

  // Loss: lose the stake
  return bankroll - stake
}

/**
 * Get max drawdown from peak
 */
export function calculateDrawdown(
  currentBankroll: number,
  peakBankroll: number
): number {
  if (peakBankroll === 0) return 0
  return (peakBankroll - currentBankroll) / peakBankroll
}

/**
 * Check if system should reduce stakes due to drawdown
 * If drawdown > 20%, reduce stakes to 50% of normal
 */
export function getDrawdownMultiplier(drawdown: number): number {
  if (drawdown > 0.2) return 0.5 // half stakes during bad runs
  return 1.0 // normal stakes
}

/**
 * Generate debug info
 */
export function getBankrollDebug({
  bankroll,
  peakBankroll,
  totalBetsSettled,
  totalWins,
}: {
  bankroll: number
  peakBankroll: number
  totalBetsSettled: number
  totalWins: number
}) {
  const drawdown = calculateDrawdown(bankroll, peakBankroll)
  const winRate = totalBetsSettled > 0 ? (totalWins / totalBetsSettled) * 100 : 0

  return {
    bankroll: Math.round(bankroll * 100) / 100,
    peakBankroll: Math.round(peakBankroll * 100) / 100,
    drawdown: Math.round(drawdown * 1000) / 10 + '%',
    totalBetsSettled,
    totalWins,
    winRate: Math.round(winRate * 10) / 10 + '%',
    drawdownMultiplier: getDrawdownMultiplier(drawdown),
  }
}
