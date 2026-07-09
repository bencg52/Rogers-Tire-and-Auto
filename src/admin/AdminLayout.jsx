import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Jobs from './pages/Jobs'
import Invoices from './pages/Invoices'

export default function AdminLayout({ onSignOut }) {
  const [page, setPage] = useState('dashboard')
  const [jobToOpen, setJobToOpen] = useState(null)
  const [jobsInitialSearch, setJobsInitialSearch] = useState('')
  const [invoicesInitialStatus, setInvoicesInitialStatus] = useState('All')
  const [invoicesInitialSearch, setInvoicesInitialSearch] = useState('')

  function openJobsPage(search = '') {
    setJobToOpen(null)
    setJobsInitialSearch(search)
    setPage('jobs')
  }

  function openInvoicesPage(status = 'All', search = '') {
    setInvoicesInitialStatus(status)
    setInvoicesInitialSearch(search)
    setPage('invoices')
  }

  const renderPage = () => {
    switch (page) {
      case 'customers':
        return <Customers onOpenJob={(jobId) => { setJobToOpen(jobId); setPage('jobs') }} />
      case 'jobs':
        return <Jobs openJobId={jobToOpen} initialSearch={jobsInitialSearch} onJobOpened={() => setJobToOpen(null)} />
      case 'invoices':
        return <Invoices initialStatusFilter={invoicesInitialStatus} initialSearch={invoicesInitialSearch} onOpenJob={(jobId) => { setJobToOpen(jobId); setPage('jobs') }} />
      default:
        return <Dashboard
          onOpenJob={(jobId) => { setJobToOpen(jobId); setPage('jobs') }}
          onOpenJobs={openJobsPage}
          onOpenCustomers={() => setPage('customers')}
          onOpenInvoices={openInvoicesPage}
        />
    }
  }

  return (
    <div className="adminShell">
      <aside className="adminSidebar">
        <div className="adminBrandBlock">
          <div className="adminBrandMain">Roger's Tire -N- Auto</div>
          <div className="adminBrandSub">Admin Portal</div>
        </div>

        <button onClick={() => setPage('dashboard')}>Dashboard</button>
        <button onClick={() => setPage('customers')}>Customers</button>
        <button onClick={() => openJobsPage('')}>Jobs</button>
        <button onClick={() => openInvoicesPage('All', '')}>Invoices</button>

        <a className="adminSiteLink" href="/">Return to Website</a>

        <div className="adminSessionBlock">
          <button type="button" className="adminSignOut" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="adminContent">
        {renderPage()}
      </main>
    </div>
  )
}
