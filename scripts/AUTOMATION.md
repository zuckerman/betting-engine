#!/bin/bash
# AUTOMATION SETUP
# Runs prediction pipeline daily at 9 AM UTC

# ============================================================================
# OPTION 1: LOCAL CRON (if running on your server)
# ============================================================================
# Run this command to edit your crontab:
#
#   crontab -e
#
# Then add this line (runs daily at 9 AM UTC):
#
#   0 9 * * * cd /Users/williamtyler-street/Rivva && npx ts-node scripts/send-predictions.ts >> /tmp/predictions.log 2>&1
#
# For Python:
#
#   0 9 * * * cd /Users/williamtyler-street/Rivva && python scripts/send_predictions.py >> /tmp/predictions.log 2>&1


# ============================================================================
# OPTION 2: VERCEL CRON (if using Vercel)
# ============================================================================
# Add to /vercel.json:
#
# {
#   "crons": [
#     {
#       "path": "/api/send-predictions",
#       "schedule": "0 9 * * *"
#     }
#   ]
# }
#
# Then create /src/app/api/send-predictions/route.ts


# ============================================================================
# OPTION 3: GITHUB ACTIONS
# ============================================================================
# Create .github/workflows/predictions.yml
#
# name: Daily Predictions
# on:
#   schedule:
#     - cron: '0 9 * * *'
# jobs:
#   send:
#     runs-on: ubuntu-latest
#     steps:
#       - uses: actions/checkout@v3
#       - uses: actions/setup-node@v3
#       - run: npm install
#       - run: API_URL=https://yourdomain.com npx ts-node scripts/send-predictions.ts


# ============================================================================
# QUICK TEST (do this NOW)
# ============================================================================

echo "🧪 Testing locally..."
echo ""
echo "TypeScript:"
echo "  npx ts-node scripts/send-predictions.ts"
echo ""
echo "Or Python:"
echo "  python scripts/send_predictions.py"
echo ""
echo "Or with custom API URL:"
echo "  API_URL=https://yourdomain.com npx ts-node scripts/send-predictions.ts"
