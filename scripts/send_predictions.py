#!/usr/bin/env python3
"""
PREDICTION SENDER (Python)
Transforms model output → API format → sends to /api/generate

Usage:
    python scripts/send_predictions.py
    
Environment:
    API_URL (default: http://localhost:3000)
"""

import json
import requests
import os
from datetime import datetime
from typing import Dict, List, Any, Tuple


# ============================================================================
# STEP 1: VALIDATION (sanity checks)
# ============================================================================

def validate_prediction(pred: Dict[str, Any]) -> Tuple[bool, str]:
    """Check if prediction is well-formed"""
    
    if not (0 < pred.get('modelProbability', -1) < 1):
        return False, 'Probability out of bounds [0,1]'
    
    if pred.get('oddsTaken', 0) <= 1:
        return False, 'Odds must be > 1.0'
    
    required = ['event', 'market', 'timestamp']
    missing = [f for f in required if not pred.get(f)]
    if missing:
        return False, f'Missing: {", ".join(missing)}'
    
    return True, ''


# ============================================================================
# STEP 2: ADAPTER (converts model output → API format)
# ============================================================================

def map_market(market: str) -> str:
    """Normalize market names"""
    mapping = {
        'over_2_5': 'Over 2.5 Goals',
        'under_2_5': 'Under 2.5 Goals',
    }
    return mapping.get(market, market)


def adapt_prediction(model: Dict[str, Any]) -> Dict[str, Any]:
    """Transform model output to API format"""
    return {
        'event': f"{model['home']} vs {model['away']}",
        'market': map_market(model['market']),
        'modelProbability': model['prob_over'],
        'oddsTaken': model['best_odds'],
        'timestamp': model['timestamp'],
    }


# ============================================================================
# STEP 3: SENDER
# ============================================================================

def send_prediction(adapted: Dict[str, Any], api_url: str) -> Dict[str, Any]:
    """POST prediction to API"""
    try:
        res = requests.post(
            f'{api_url}/api/generate',
            json=adapted,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if res.status_code != 200:
            raise Exception(f'HTTP {res.status_code}')
        
        return res.json()
    
    except Exception as e:
        raise Exception(f'Send failed: {str(e)}')


# ============================================================================
# STEP 4: ORCHESTRATOR
# ============================================================================

def run_pipeline(predictions: List[Dict[str, Any]], api_url: str) -> None:
    """Send all predictions through pipeline"""
    
    print(f'\n📊 Pipeline: {len(predictions)} predictions\n')
    
    sent = 0
    skipped = 0
    failed = 0
    
    for pred in predictions:
        try:
            fixture_id = pred['fixture_id']
            
            # Adapt
            adapted = adapt_prediction(pred)
            
            # Validate
            valid, reason = validate_prediction(adapted)
            if not valid:
                print(f'⏭️  SKIPPED: {fixture_id} ({reason})')
                skipped += 1
                continue
            
            # Send
            response = send_prediction(adapted, api_url)
            
            # Log result
            if response.get('success'):
                edge = response.get('prediction', {}).get('edge', 'N/A')
                print(f'✅ SENT: {fixture_id} | event="{adapted["event"]}" | edge={edge}')
                sent += 1
            
            elif response.get('skipped'):
                edge = response.get('edge', 'N/A')
                print(f'⏭️  SKIPPED (API): {fixture_id} | reason="{response.get("reason")}" | edge={edge}')
                skipped += 1
            
            else:
                error = response.get('error', 'Unknown error')
                print(f'❌ FAILED: {fixture_id} | {error}')
                failed += 1
        
        except Exception as e:
            print(f'❌ ERROR: {pred["fixture_id"]} | {str(e)}')
            failed += 1
    
    print(f'\n📈 Results: {sent} sent | {skipped} skipped | {failed} failed\n')


# ============================================================================
# STEP 5: GET YOUR PREDICTIONS (FROM POISSON MODEL)
# ============================================================================

def get_model_predictions() -> List[Dict[str, Any]]:
    """
    Get predictions from your Poisson model.
    
    🔥 EXAMPLE: How to call your model with real data
    
    from src.lib.poisson.model import poisson_model
    
    predictions = []
    fixtures = get_fixtures()  # your data source
    
    for fixture in fixtures:
        output = poisson_model({
            'homeTeam': fixture['home_team'],
            'awayTeam': fixture['away_team'],
            'leagueAvgGoals': 1.4
        })
        
        # Convert expected goals to over_2_5 probability
        over_25_prob = calculate_over_25_probability(
            output['homeLambda'],
            output['awayLambda']
        )
        
        predictions.append({
            'fixture_id': fixture['id'],
            'home': fixture['home'],
            'away': fixture['away'],
            'market': 'over_2_5',
            'prob_over': over_25_prob,
            'best_odds': fixture['current_odds'],
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })
    
    return predictions
    """
    
    # For testing with mock data:
    return [
        {
            'fixture_id': '12345',
            'home': 'Arsenal',
            'away': 'Chelsea',
            'market': 'over_2_5',
            'prob_over': 0.58,
            'best_odds': 1.92,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        },
        {
            'fixture_id': '12346',
            'home': 'Man City',
            'away': 'Liverpool',
            'market': 'over_2_5',
            'prob_over': 0.64,
            'best_odds': 1.88,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        },
    ]


# ============================================================================
# MAIN
# ============================================================================

def main():
    api_url = os.getenv('API_URL', 'http://localhost:3000')
    
    print(f'🚀 Starting prediction pipeline')
    print(f'📍 API: {api_url}\n')
    
    try:
        # Get predictions from model
        predictions = get_model_predictions()
        
        if not predictions:
            print('⚠️  No predictions returned from model')
            return
        
        # Send all predictions
        run_pipeline(predictions, api_url)
        
        print('✅ Pipeline complete')
    
    except Exception as e:
        print(f'❌ Fatal error: {str(e)}')
        exit(1)


if __name__ == '__main__':
    main()
