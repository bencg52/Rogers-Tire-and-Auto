import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Jobs from './pages/Jobs'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function AdminLayout() {
  const [page, setPage] = useState('dashboard')
  const [jobToOpen, setJobToOpen] = useState(null)

  const renderPage = () => {
    switch (page) {
      case 'customers':
        return <Customers onOpenJob={(jobId) => { setJobToOpen(jobId); setPage('jobs') }} />
      case 'jobs':
        return <Jobs openJobId={jobToOpen} onJobOpened={() => setJobToOpen(null)} />
      case 'reports':
        return <Reports />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard onOpenJob={(jobId) => { setJobToOpen(jobId); setPage('jobs') }} />
    }
  }

  return (
    <div className="adminShell">

      <aside className="adminSidebar">

        <div className="adminBrandBlock">
          <div className="adminBrandMain">Roger's Tire -N- Auto</div>
          <div className="adminBrandSub">Admin Portal</div>
        </div>

        <button onClick={() => setPage('dashboard')}>🏠 Dashboard</button>
        <button onClick={() => setPage('customers')}>👥 Customers</button>
        <button onClick={() => { setJobToOpen(null); setPage('jobs') }}>🔧 Jobs / Invoices</button>
        <button onClick={() => setPage('reports')}>📊 Reports</button>
        <button onClick={() => setPage('settings')}>⚙️ Settings</button>

        <a className="adminSiteLink" href="/">← Return to Website</a>

      </aside>

      <main className="adminContent">
        {renderPage()}
      </main>

    </div>
  )
}