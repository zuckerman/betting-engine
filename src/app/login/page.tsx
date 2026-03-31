"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Integrate with Supabase/Auth0
      // For now: simple redirect to onboarding
      localStorage.setItem("user_email", email);
      router.push("/onboarding");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div>
          <Link href="/" className="text-3xl font-bold block text-center mb-8">
            Rivva
          </Link>
          <h2 className="text-2xl font-bold text-center">Get Access</h2>
          <p className="text-center text-gray-600 mt-2">
            Sign in to view live signals and edge analysis
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-black"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600">
          <p>
            By signing in, you agree to our{" "}
            <a href="#" className="underline">
              terms
            </a>
          </p>
        </div>

        <div className="border-t pt-4">
          <p className="text-center text-sm text-gray-600">
            No account? Start free trial after login
          </p>
        </div>
      </div>
    </div>
  );
}
