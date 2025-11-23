'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'

export function Providers({ children }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

  if (!googleClientId) {
    console.error(' NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set!')
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {children}
    </GoogleOAuthProvider>
  )
}