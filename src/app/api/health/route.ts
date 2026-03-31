export async function GET() {
  return new Response(
    JSON.stringify({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
