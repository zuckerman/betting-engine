export async function sendSlackAlert(
  status: "STOP" | "WARNING" | "DAILY",
  data: {
    experimentName: string
    metrics: any
    timestamp: string
  }
) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.log("⚠️  SLACK_WEBHOOK_URL not set, skipping alert")
    return
  }

  let emoji = "🟢"
  let title = "System Running"

  if (status === "STOP") {
    emoji = "🔴"
    title = "⚠️ SYSTEM STOPPED"
  } else if (status === "WARNING") {
    emoji = "🟡"
    title = "⚠️ WARNING: High Drawdown"
  }

  const message = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} ${title}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Experiment:*\n${data.experimentName}`,
          },
          {
            type: "mrkdwn",
            text: `*Status:*\n${status}`,
          },
          {
            type: "mrkdwn",
            text: `*CLV:*\n${(data.metrics.avgClv * 100).toFixed(2)}%`,
          },
          {
            type: "mrkdwn",
            text: `*Hit Rate:*\n${data.metrics.positiveClvRate.toFixed(1)}%`,
          },
          {
            type: "mrkdwn",
            text: `*Drawdown:*\n${data.metrics.drawdown.toFixed(1)}%`,
          },
          {
            type: "mrkdwn",
            text: `*Total Bets:*\n${data.metrics.totalBets}`,
          },
        ],
      },
      {
        type: "divider",
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_${data.timestamp}_`,
          },
        ],
      },
    ],
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      console.error("Failed to send Slack alert:", response.statusText)
    }
  } catch (error) {
    console.error("Error sending Slack alert:", error)
  }
}

export async function sendSlackWeeklyReport(data: {
  experimentName: string
  metrics: any
  startDate: string
  endDate: string
}) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const message = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📊 Weekly Performance Report",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Experiment:*\n${data.experimentName}`,
          },
          {
            type: "mrkdwn",
            text: `*Period:*\n${data.startDate} → ${data.endDate}`,
          },
          {
            type: "mrkdwn",
            text: `*Total Bets:*\n${data.metrics.totalBets}`,
          },
          {
            type: "mrkdwn",
            text: `*Avg CLV:*\n${(data.metrics.avgClv * 100).toFixed(2)}%`,
          },
          {
            type: "mrkdwn",
            text: `*Hit Rate:*\n${data.metrics.positiveClvRate.toFixed(1)}%`,
          },
          {
            type: "mrkdwn",
            text: `*Max Drawdown:*\n${data.metrics.drawdown.toFixed(1)}%`,
          },
          {
            type: "mrkdwn",
            text: `*Profit/Loss:*\n£${(data.metrics.currentBalance - data.metrics.startingBalance).toFixed(2)}`,
          },
          {
            type: "mrkdwn",
            text: `*Status:*\n${data.metrics.avgClv > 0 ? "✅ Profitable" : "⚠️ In Loss"}`,
          },
        ],
      },
      {
        type: "divider",
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_Report generated: ${new Date().toISOString()}_`,
          },
        ],
      },
    ],
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    })
  } catch (error) {
    console.error("Error sending weekly report:", error)
  }
}
