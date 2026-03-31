export async function sendAlert(messages: string[]): Promise<void> {
  if (!messages.length) return;

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  // Always log to console
  console.log("🚨 SYSTEM ALERTS:");
  messages.forEach((m) => console.log(`  ${m}`));

  // Send to Slack if configured
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 *Rivva System Alert*\n\n${messages.join("\n")}`,
        }),
      });
    } catch (error) {
      console.error("Slack notification failed:", error);
    }
  }
}
