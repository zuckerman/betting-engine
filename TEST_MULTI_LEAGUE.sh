#!/bin/bash

# Test multi-league signal generation
echo "🔄 Testing multi-league signal generation..."
echo ""

# Test EPL signals
echo "📊 Generating EPL signals (seed-signals v1)..."
curl -s -X POST "http://localhost:3000/api/seed-signals?league=EPL" | jq . | head -20

echo ""
echo "---"
echo ""

# Test Championship signals
echo "📊 Generating Championship signals (seed-signals v1)..."
curl -s -X POST "http://localhost:3000/api/seed-signals?league=Championship" | jq . | head -20

echo ""
echo "---"
echo ""

# Test EPL v2 signals
echo "📊 Generating EPL signals (seed-signals v2)..."
curl -s -X POST "http://localhost:3000/api/seed-signals-v2?league=EPL" | jq . | head -20

echo ""
echo "---"
echo ""

# Test Championship v2 signals
echo "📊 Generating Championship signals (seed-signals v2)..."
curl -s -X POST "http://localhost:3000/api/seed-signals-v2?league=Championship" | jq . | head -20

echo ""
echo "---"
echo ""

# Test generate endpoint with league
echo "📊 Testing generate endpoint with league parameter..."
curl -s -X POST "http://localhost:3000/api/generate?league=Championship" \
  -H "Content-Type: application/json" \
  -d '{
    "fixture_id": "champ-test-001",
    "home": "Leeds",
    "away": "Sheffield United",
    "market": "HOME",
    "modelProbability": 0.55,
    "oddsTaken": 2.0,
    "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'",
    "kickoff": "'$(date -u -v+6H +'%Y-%m-%dT%H:%M:%SZ')'"
  }' | jq .

echo ""
echo "✅ Multi-league signal generation test complete!"
