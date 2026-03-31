/**
 * Sportmonks API client
 * Fetches fixture data with participants and scores
 */

const BASE_URL = "https://api.sportmonks.com/v3/football"

export async function fetchFixture(fixtureId: number) {
  const apiKey = process.env.SPORTMONKS_KEY

  if (!apiKey) {
    throw new Error("SPORTMONKS_KEY not configured")
  }

  const url = `${BASE_URL}/fixtures/${fixtureId}?api_token=${apiKey}&include=participants;scores`

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Sportmonks error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}
