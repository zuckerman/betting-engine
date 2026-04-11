import { redirect } from 'next/navigation'

export default function OldLogin() {
  redirect('/auth/login')
}
