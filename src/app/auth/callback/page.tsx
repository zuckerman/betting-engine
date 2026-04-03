import { redirect } from 'next/navigation'

export default async function AuthCallbackPage() {
  // This handles the OAuth callback from Supabase
  // In a real app, you'd verify the session and redirect

  // For now, redirect to dashboard
  redirect('/dashboard')
}
