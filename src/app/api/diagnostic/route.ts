export async function GET() {
  return new Response(
    JSON.stringify({ 
      message: "diagnostic endpoint working",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      status: "ready"
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
