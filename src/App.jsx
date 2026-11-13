import { useState, useEffect } from 'react'
import Header from './components/Header'
import Navigation from './components/Navigation'
import Hero from './components/Hero'
import Overview from './components/Overview'
import EvaluationSystem from './components/EvaluationSystem'
import ComparisonPlans from './components/ComparisonPlans'
import Timeline from './components/Timeline'
import Dashboard from './components/Dashboard'
import FAQ from './components/FAQ'
import Footer from './components/Footer'

function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [currentPage, setCurrentPage] = useState('home')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true'
    setDarkMode(isDark)
  }, [])

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode)
    document.body.classList.toggle('dark-mode', darkMode)
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode(!darkMode)

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      {currentPage === 'home' && (
        <>
          <Hero />
          <Overview />
          <EvaluationSystem />
          <ComparisonPlans />
        </>
      )}

      {currentPage === 'system' && <EvaluationSystem />}
      {currentPage === 'comparison' && <ComparisonPlans />}
      {currentPage === 'timeline' && <Timeline />}
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'faq' && <FAQ />}

      <Footer />
    </div>
  )
}

export default App
