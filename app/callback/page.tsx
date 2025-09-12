'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { exchangeCodeForToken } from '@/lib/spotify'
import Cookies from 'js-cookie'

export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        console.error('Spotify auth error:', error)
        router.push('/?error=' + error)
        return
      }

      if (!code) {
        console.error('No authorization code received')
        router.push('/?error=no_code')
        return
      }

      try {
        const accessToken = await exchangeCodeForToken(code)
        Cookies.set('spotify_access_token', accessToken, { expires: 1 }) // 1 day
        router.push('/')
      } catch (error) {
        console.error('Error exchanging code for token:', error)
        router.push('/?error=token_exchange_failed')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="app">
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2>Authenticating with Spotify...</h2>
        <div style={{ marginTop: '20px' }}>
          <div className="loading-spinner"></div>
        </div>
      </div>
    </div>
  )
}