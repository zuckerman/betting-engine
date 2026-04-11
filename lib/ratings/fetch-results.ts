import Papa from 'papaparse'

export interface MatchResult {
  date: string
  homeTeam: string
  awayTeam: string
  homeGoals: number
  awayGoals: number
  pinnacleHome: number | null
  pinnacleDraw: number | null
  pinnacleAway: number | null
}

// football-data.co.uk season codes: 2425 = 2024/25, 2324 = 2023/24
const SEASON_URLS = [
  'https://www.football-data.co.uk/mmz4281/2425/E0.csv',
  'https://www.football-data.co.uk/mmz4281/2324/E0.csv',
  'https://www.football-data.co.uk/mmz4281/2223/E0.csv',
]

export async function fetchEPLResults(seasons = 2): Promise<MatchResult[]> {
  const urls = SEASON_URLS.slice(0, seasons)
  const allResults: MatchResult[] = []

  for (const url of urls) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
    const csv = await res.text()

    const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true })

    for (const row of data as any[]) {
      // football-data columns: Date, HomeTeam, AwayTeam, FTHG, FTAG, PSH, PSD, PSA
      if (!row.HomeTeam || !row.FTHG || row.FTHG === '') continue

      allResults.push({
        date: row.Date,
        homeTeam: normaliseTeamName(row.HomeTeam),
        awayTeam: normaliseTeamName(row.AwayTeam),
        homeGoals: parseInt(row.FTHG),
        awayGoals: parseInt(row.FTAG),
        pinnacleHome: row.PSH ? parseFloat(row.PSH) : null,
        pinnacleDraw: row.PSD ? parseFloat(row.PSD) : null,
        pinnacleAway: row.PSA ? parseFloat(row.PSA) : null,
      })
    }
  }

  return allResults
}

// football-data uses different names to The Odds API — normalise both to a common key
function normaliseTeamName(name: string): string {
  const map: Record<string, string> = {
    'Man City': 'Manchester City',
    'Man United': 'Manchester United',
    'Newcastle': 'Newcastle United',
    'Spurs': 'Tottenham Hotspur',
    'Wolves': 'Wolverhampton Wanderers',
    'Brighton': 'Brighton and Hove Albion',
    "Nott'm Forest": 'Nottingham Forest',
    'Leicester': 'Leicester City',
    'Leeds': 'Leeds United',
    'West Ham': 'West Ham United',
    'West Brom': 'West Bromwich Albion',
    'Sheffield United': 'Sheffield United',
    'Luton': 'Luton Town',
  }
  return map[name] ?? name
}
