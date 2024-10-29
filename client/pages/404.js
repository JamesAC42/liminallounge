import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Custom404() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home page after 3 seconds
    setTimeout(() => {
      router.push('/')
    }, 3000)
  }, [router])

  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <p>Redirecting to home page...</p>
    </div>
  )
}
