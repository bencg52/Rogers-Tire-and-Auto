import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Jobs from './pages/Jobs'
import Appointments from './pages/Appointments'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function AdminLayout() {
  const [page, setPage] = useState('dashboard')

  const renderPage = () => {
    switch (page) {
      case 'customers':
        return <Customers />
      case 'jobs':
        return <Jobs />
      case 'appointments':
        return <Appointments />
      case 'reports':
        return <Reports />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="adminShell">

      <aside className="adminSidebar">

        <h2>Roger's Admin</h2>

        <button onClick={() => setPage('dashboard')}>🏠 Dashboard</button>
        <button onClick={() => setPage('customers')}>👥 Customers</button>
        <button onClick={() => setPage('jobs')}>🔧 Jobs / Invoices</button>
        <button onClick={() => setPage('appointments')}>📅 Appointments</button>
        <button onClick={() => setPage('reports')}>📊 Reports</button>
        <button onClick={() => setPage('settings')}>⚙️ Settings</button>

        <a className="adminSiteLink" href="/">🌐 Customer Website</a>

      </aside>

      <main className="adminContent">
        {renderPage()}
      </main>

    </div>
  )
}