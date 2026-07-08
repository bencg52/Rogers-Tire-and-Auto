import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Vehicles from './pages/Vehicles'
import RepairOrders from './pages/RepairOrders'
import Appointments from './pages/Appointments'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function AdminLayout() {
  const [page, setPage] = useState('dashboard')

  const renderPage = () => {
    switch (page) {
      case 'customers':
        return <Customers />
      case 'vehicles':
        return <Vehicles />
      case 'repairorders':
        return <RepairOrders />
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
        <button onClick={() => setPage('customers')}>👥 Customers / Jobs</button>
        <button onClick={() => setPage('appointments')}>📅 Appointments</button>
        <button onClick={() => setPage('reports')}>📊 Reports</button>
        <button onClick={() => setPage('settings')}>⚙️ Settings</button>

      </aside>

      <main className="adminContent">
        {renderPage()}
      </main>

    </div>
  )
}