import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

const activeStatuses = ['Open', 'Estimate', 'Approved', 'In Progress', 'Waiting on Parts']
const finishedStatuses = ['Completed', 'Picked Up']
const dashboardJobStatuses = ['Open', 'Estimate', 'Approved', 'In Progress', 'Waiting on Parts', 'Completed', 'Picked Up', 'Cancelled']

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD'
  })
}

function number(value) {
  return Number(value || 0).toLocaleString()
}

function DashboardGauge({ title, value, max, label, tone = 'red' }) {
  const pct = Math.min(100, Math.round((Number(value || 0) / Math.max(Number(max || 1), 1)) * 100))

  return (
    <div className="dashboardGaugeCard">
      <div
        className={`dashboardGauge ${tone}`}
        style={{ '--gauge-value': `${pct}%` }}
      >
        <div>
          <strong>{number(value)}</strong>
          <span>{label}</span>
        </div>
      </div>

      <h3>{title}</h3>
      <p>{pct}% of current tracked workload</p>
    </div>
  )
}

export default function Dashboard({ onOpenJob }) {
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [jobs, setJobs] = useState([])
  const [appointments, setAppointments] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setErrorMsg('')
    setLoading(true)

    const { data: customerData, error: customerError } = await supabase
      .from('admin_customers')
      .select('id, created_at')

    if (customerError) {
      setErrorMsg(customerError.message)
      setLoading(false)
      return
    }

    const { data: vehicleData, error: vehicleError } = await supabase
      .from('admin_vehicles')
      .select('id, status, created_at')

    if (vehicleError) {
      setErrorMsg(vehicleError.message)
      setLoading(false)
      return
    }

    const { data: jobData, error: jobError } = await supabase
      .from('admin_repair_orders')
      .select('id, ro_number, customer_id, vehicle_id, status, technician, opened_at, total')

    if (jobError) {
      setErrorMsg(jobError.message)
      setLoading(false)
      return
    }

    const { data: appointmentData } = await supabase
      .from('appointment_requests')
      .select('id, preferred_date, created_at')

    setCustomers(customerData || [])
    setVehicles(vehicleData || [])
    setJobs(jobData || [])
    setAppointments(appointmentData || [])
    setLoading(false)
  }

  async function updateDashboardJobStatus(jobId, status) {
    setErrorMsg('')

    const { error } = await supabase
      .from('admin_repair_orders')
      .update({ status })
      .eq('id', jobId)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setJobs(jobs.map((job) => job.id === jobId ? { ...job, status } : job))
  }

  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)

    const openJobs = jobs.filter((job) => activeStatuses.includes(job.status || 'Open'))
    const completedJobs = jobs.filter((job) => finishedStatuses.includes(job.status || ''))
    const pickedUpJobs = jobs.filter((job) => job.status === 'Picked Up')
    const walkInJobs = jobs.filter((job) => !job.customer_id)

    const vehiclesInShop = vehicles.filter((vehicle) => {
      const status = vehicle.status || ''
      return status === 'In Shop' || status === 'Active'
    })

    const todayAppointments = appointments.filter((appt) => {
      const date = appt.preferred_date || appt.created_at
      return date && String(date).slice(0, 10) === today
    })

    const revenue = jobs.reduce((sum, job) => sum + Number(job.total || 0), 0)
    const collected = pickedUpJobs.reduce((sum, job) => sum + Number(job.total || 0), 0)
    const pendingRevenue = jobs
      .filter((job) => job.status !== 'Picked Up')
      .reduce((sum, job) => sum + Number(job.total || 0), 0)

    const totalWork = Math.max(jobs.length, 1)

    return {
      openJobs,
      completedJobs,
      pickedUpJobs,
      walkInJobs,
      vehiclesInShop,
      todayAppointments,
      revenue,
      collected,
      pendingRevenue,
      totalWork
    }
  }, [appointments, jobs, vehicles])

  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.opened_at || 0) - new Date(a.opened_at || 0))
    .slice(0, 6)

  return (
    <>
      <div className="dashboardHeader">
        <div>
          <p className="profileEyebrow">Roger's Admin</p>
          <h1>Dashboard</h1>
          <p>Today’s shop workload, jobs, revenue, and customer activity.</p>
        </div>

        <button className="btn primary" onClick={loadDashboard}>
          Refresh
        </button>
      </div>

      {errorMsg && <p className="adminError">{errorMsg}</p>}

      {loading ? (
        <div className="profilePanel">
          <p>Loading dashboard...</p>
        </div>
      ) : (
        <>
          <div className="dashboardKpiGrid">
            <div className="dashboardKpi">
              <span>Open Jobs</span>
              <strong>{number(metrics.openJobs.length)}</strong>
              <p>Active repair orders</p>
            </div>

            <div className="dashboardKpi">
              <span>Vehicles Tracked</span>
              <strong>{number(vehicles.length)}</strong>
              <p>Customer and walk-in vehicles</p>
            </div>

            <div className="dashboardKpi">
              <span>Customers</span>
              <strong>{number(customers.length)}</strong>
              <p>Total customer records</p>
            </div>

            <div className="dashboardKpi">
              <span>Total RO Value</span>
              <strong>{money(metrics.revenue)}</strong>
              <p>All repair orders</p>
            </div>
          </div>

          <div className="dashboardGaugeGrid">
            <DashboardGauge
              title="Open Workload"
              value={metrics.openJobs.length}
              max={metrics.totalWork}
              label="Open"
              tone="red"
            />

            <DashboardGauge
              title="Completed / Picked Up"
              value={metrics.completedJobs.length}
              max={metrics.totalWork}
              label="Done"
              tone="green"
            />

            <DashboardGauge
              title="Walk-In Jobs"
              value={metrics.walkInJobs.length}
              max={metrics.totalWork}
              label="Walk-In"
              tone="yellow"
            />
          </div>

          <div className="dashboardLowerGrid">
            <section className="profilePanel">
              <div className="panelTitle">
                <span>💰</span>
                <h2>Revenue Snapshot</h2>
              </div>

              <div className="revenueRows">
                <div>
                  <span>Total RO Value</span>
                  <strong>{money(metrics.revenue)}</strong>
                </div>

                <div>
                  <span>Picked Up / Collected</span>
                  <strong>{money(metrics.collected)}</strong>
                </div>

                <div>
                  <span>Not Picked Up Yet</span>
                  <strong>{money(metrics.pendingRevenue)}</strong>
                </div>

                <div>
                  <span>Today's Appointments</span>
                  <strong>{number(metrics.todayAppointments.length)}</strong>
                </div>
              </div>
            </section>

            <section className="profilePanel">
              <div className="panelTitle">
                <span>🔧</span>
                <h2>Recent Jobs</h2>
              </div>

              <div className="modernTableWrap">
                <table className="modernTable">
                  <thead>
                    <tr>
                      <th>RO #</th>
                      <th>Status</th>
                      <th>Technician</th>
                      <th>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentJobs.length === 0 ? (
                      <tr>
                        <td colSpan="4">No jobs yet.</td>
                      </tr>
                    ) : (
                      recentJobs.map((job) => (
                        <tr
                          key={job.id}
                          className="clickableJobRow"
                          onClick={() => onOpenJob?.(job.id)}
                        >
                          <td><strong>{job.ro_number}</strong></td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <select
                              className={`inlineStatus ${String(job.status || 'Open').toLowerCase().replaceAll(' ', '-')}`}
                              value={job.status || 'Open'}
                              onChange={(e) => updateDashboardJobStatus(job.id, e.target.value)}
                            >
                              {dashboardJobStatuses.map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </td>
                          <td>{job.technician || '-'}</td>
                          <td>{money(job.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  )
}
