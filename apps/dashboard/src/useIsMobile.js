import { useState, useEffect } from 'react'

/**
 * Returns true when the viewport width is <= 768px.
 * Updates on window resize with cleanup.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isMobile
}
