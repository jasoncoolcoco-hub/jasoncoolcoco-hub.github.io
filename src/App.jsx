import { useEffect } from 'react'
import { siteContent } from './data/siteContent'
import HomeSection from './sections/HomeSection'

export default function App() {
  useEffect(() => {
    document.title = siteContent.meta.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', siteContent.meta.description)
  }, [])

  return (
    <main>
      <HomeSection />
    </main>
  )
}
