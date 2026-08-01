import { useEffect } from 'react'
import HomeTransitionShell from './components/HomeTransitionShell'
import { siteContent } from './data/siteContent'

export default function App() {
  useEffect(() => {
    document.title = siteContent.meta.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', siteContent.meta.description)
  }, [])

  return (
    <main>
      <HomeTransitionShell />
    </main>
  )
}
