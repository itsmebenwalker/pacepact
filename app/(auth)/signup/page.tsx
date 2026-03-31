import { notFound } from 'next/navigation'
import SignupForm from './SignupForm'

export default function SignupPage() {
  if (process.env.NEXT_PUBLIC_SIGNUP_ENABLED === 'false') {
    notFound()
  }

  return <SignupForm />
}
