import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const emptyVehicle = {
  id: null,
  customerId: '',
  year: '',
  make: '',
  model: '',
  vin: '',
  mileage: '',
  licensePlate: '',
  color: '',
  engine: '',
  notes: '',
  status: 'Active'
}

const jobStatuses = ['Open', 'Estimate', 'Approved', 'In Progress', 'Waiting on Parts', 'Completed', 'Picked Up', 'Cancelled']

const emptyJob = {
  id: null,
  customerId: '',
  vehicleId: '',
  technician: '',
  mileage: '',
  complaint: '',
  diagnosis: '',
  repairs: '',
  partsTotal: '',
  laborTotal: '',
  tax: '',
  total: '',
  status: 'Open'
}

export default function Jobs({ openJobId, onJobOpened }) {
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [jobs, setJobs] = useState([])
  const [search, setSearch] = useState('')
  const [showJobForm, setShowJobForm] = useState(false)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [jobForm, setJobForm] = useState(emptyJob)
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!openJobId || !jobs.length) return

    const job = jobs.find((j) => j.id === openJobId)

    if (job) {
      openJobForm(job)
      onJobOpened?.()
    }
  }, [openJobId, jobs])

  function showSuccess(message) {
    setSuccessMsg(message)
    setTimeout(() => setSuccessMsg(''), 2500)
  }

  function money(value) {
    return Number(value || 0).toFixed(2)
  }

  function customerName(c) {
    if (!c) return 'Walk-In / No Customer'
    return `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed Customer'
  }

  function vehicleName(v) {
    if (!v) return 'No Vehicle Attached'
    return `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim() || 'Vehicle'
  }

  function calculateTotal(formData = jobForm) {
    return (
      Number(formData.partsTotal || 0) +
      Number(formData.laborTotal || 0) +
      Number(formData.tax || 0)
    ).toFixed(2)
  }

  function updateCharge(field, value) {
    const next = { ...jobForm, [field]: value }
    next.total = calculateTotal(next)
    setJobForm(next)
  }

  async function loadData() {
    setErrorMsg('')

    const { data: customerData, error: customerError } = await supabase
      .from('admin_customers')
      .select('id, first_name, last_name, phone, email, address, notes, created_at')
      .order('last_name')

    if (customerError) {
      setErrorMsg(customerError.message)
      return
    }

    const { data: vehicleData, error: vehicleError } = await supabase
      .from('admin_vehicles')
      .select('*, admin_customers(first_name,last_name)')
      .order('created_at', { ascending: false })

    if (vehicleError) {
      setErrorMsg(vehicleError.message)
      return
    }

    const { data: jobData, error: jobError } = await supabase
      .from('admin_repair_orders')
      .select(`
        *,
        admin_customers(first_name,last_name,phone,email,address),
        admin_vehicles(year,make,model,vin,license_plate)
      `)
      .order('opened_at', { ascending: false })

    if (jobError) {
      setErrorMsg(jobError.message)
      return
    }

    setCustomers(customerData || [])
    setVehicles(vehicleData || [])
    setJobs(jobData || [])
  }

  function openVehicleForm(vehicle = null) {
    if (vehicle) {
      setEditingVehicle(vehicle)
      setVehicleForm({
        id: vehicle.id,
        customerId: vehicle.customer_id || '',
        year: vehicle.year || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        vin: vehicle.vin || '',
        mileage: vehicle.mileage || '',
        licensePlate: vehicle.license_plate || '',
        color: vehicle.color || '',
        engine: vehicle.engine || '',
        notes: vehicle.notes || '',
        status: vehicle.status || 'Active'
      })
    } else {
      setEditingVehicle(null)
      setVehicleForm(emptyVehicle)
    }

    setShowVehicleForm(true)
  }

  async function saveVehicle() {
    setErrorMsg('')

    const payload = {
      customer_id: vehicleForm.customerId || null,
      year: vehicleForm.year,
      make: vehicleForm.make,
      model: vehicleForm.model,
      vin: vehicleForm.vin,
      mileage: vehicleForm.mileage,
      license_plate: vehicleForm.licensePlate,
      color: vehicleForm.color,
      engine: vehicleForm.engine,
      notes: vehicleForm.notes,
      status: vehicleForm.status
    }

    if (editingVehicle) {
      const { error } = await supabase.from('admin_vehicles').update(payload).eq('id', editingVehicle.id)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      showSuccess('Vehicle updated')
    } else {
      const { error } = await supabase.from('admin_vehicles').insert(payload)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      showSuccess('Vehicle saved')
    }

    setShowVehicleForm(false)
    setEditingVehicle(null)
    setVehicleForm(emptyVehicle)
    await loadData()
  }

  function openJobForm(job = null) {
    if (job) {
      setEditingJob(job)
      setJobForm({
        id: job.id,
        customerId: job.customer_id || '',
        vehicleId: job.vehicle_id || '',
        technician: job.technician || '',
        mileage: job.mileage_in || '',
        complaint: job.customer_complaint || '',
        diagnosis: job.diagnosis || '',
        repairs: job.repairs_performed || '',
        partsTotal: job.parts_total || '',
        laborTotal: job.labor_total || '',
        tax: job.tax || '',
        total: job.total || '',
        status: job.status || 'Open'
      })
    } else {
      setEditingJob(null)
      setJobForm(emptyJob)
    }

    setShowJobForm(true)
  }

  async function generateNextRoNumber() {
    const { data, error } = await supabase
      .from('admin_repair_orders')
      .select('ro_number')
      .like('ro_number', 'RO-%')
      .limit(5000)

    if (error) {
      throw error
    }

    const highest = (data || []).reduce((max, row) => {
      const match = String(row.ro_number || '').match(/^RO-(\d+)$/)
      if (!match) return max

      const number = Number(match[1])
      return Number.isFinite(number) && number > max ? number : max
    }, 100000)

    return `RO-${highest + 1}`
  }

  async function saveJob() {
    setErrorMsg('')

    const payload = {
      customer_id: jobForm.customerId || null,
      vehicle_id: jobForm.vehicleId || null,
      technician: jobForm.technician,
      mileage_in: jobForm.mileage,
      customer_complaint: jobForm.complaint,
      diagnosis: jobForm.diagnosis,
      repairs_performed: jobForm.repairs,
      parts_total: Number(jobForm.partsTotal || 0),
      labor_total: Number(jobForm.laborTotal || 0),
      tax: Number(jobForm.tax || 0),
      total: Number(jobForm.total || calculateTotal()),
      status: jobForm.status
    }

    if (editingJob) {
      const { error } = await supabase
        .from('admin_repair_orders')
        .update(payload)
        .eq('id', editingJob.id)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      showSuccess('Job updated')
    } else {
      const roNumber = await generateNextRoNumber()
      const { error } = await supabase
        .from('admin_repair_orders')
        .insert({ ...payload, ro_number: roNumber })

      if (error) {
        setErrorMsg(error.message)
        return
      }

      showSuccess('Job created')
    }

    setShowJobForm(false)
    setEditingJob(null)
    setJobForm(emptyJob)
    await loadData()
  }

  async function updateJobStatus(jobId, status) {
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
    showSuccess('Status updated')
  }

  async function deleteJob(jobId) {
    if (!confirm('Delete this job?')) return

    const { error } = await supabase.from('admin_repair_orders').delete().eq('id', jobId)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setJobs(jobs.filter((j) => j.id !== jobId))
    showSuccess('Job deleted')
  }

  function printJob(job) {
    const customer = customers.find((c) => c.id === job.customer_id)
    const vehicle = vehicles.find((v) => v.id === job.vehicle_id)
    const isPickedUp = job.status === 'Picked Up'

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>${job.ro_number || 'Repair Order'}</title>
          <style>
            body{font-family:Arial,sans-serif;color:#111;margin:0;padding:32px;background:#fff}
            .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:4px solid #111;padding-bottom:18px;margin-bottom:24px}
            h1{margin:0;font-size:30px}
            p{margin:6px 0}
            .stamp{border:3px solid ${isPickedUp ? '#16a34a' : '#ef3b3b'};color:${isPickedUp ? '#16a34a' : '#ef3b3b'};padding:10px 18px;font-weight:900;font-size:22px;transform:rotate(-3deg)}
            .meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:22px}
            .box{border:1px solid #d1d5db;border-radius:10px;padding:16px}
            .box h2{font-size:15px;text-transform:uppercase;margin:0 0 10px}
            .section{margin:18px 0}
            .section h2{font-size:16px;text-transform:uppercase;border-bottom:1px solid #d1d5db;padding-bottom:8px}
            .notes{white-space:pre-wrap;line-height:1.5}
            table{width:100%;border-collapse:collapse;margin-top:10px}
            th,td{border-bottom:1px solid #e5e7eb;padding:10px;text-align:left}
            th{background:#f3f4f6;text-transform:uppercase;font-size:12px}
            .totals{margin-left:auto;width:320px;margin-top:20px}
            .totals div{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #e5e7eb}
            .grand{font-size:22px;font-weight:900}
            .sig{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:44px}
            .line{border-top:1px solid #111;padding-top:8px}
            @media print{body{padding:20px}}
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>ROGER'S TIRE N AUTO</h1>
              <p>Repair Order / Invoice</p>
              <p>${new Date().toLocaleDateString()}</p>
            </div>
            <div class="stamp">${isPickedUp ? 'PAID / PICKED UP' : 'COMPLETED'}</div>
          </div>

          <div class="meta">
            <div class="box">
              <h2>Repair Order</h2>
              <p><strong>RO #:</strong> ${job.ro_number || '-'}</p>
              <p><strong>Status:</strong> ${job.status || '-'}</p>
              <p><strong>Technician:</strong> ${job.technician || '-'}</p>
              <p><strong>Opened:</strong> ${job.opened_at ? new Date(job.opened_at).toLocaleDateString() : '-'}</p>
            </div>

            <div class="box">
              <h2>Customer</h2>
              <p><strong>Name:</strong> ${customerName(customer)}</p>
              <p><strong>Phone:</strong> ${customer?.phone || '-'}</p>
              <p><strong>Email:</strong> ${customer?.email || '-'}</p>
              <p><strong>Address:</strong> ${customer?.address || '-'}</p>
            </div>

            <div class="box">
              <h2>Vehicle</h2>
              <p><strong>Vehicle:</strong> ${vehicleName(vehicle)}</p>
              <p><strong>VIN:</strong> ${vehicle?.vin || '-'}</p>
              <p><strong>Plate:</strong> ${vehicle?.license_plate || '-'}</p>
              <p><strong>Mileage In:</strong> ${job.mileage_in || '-'}</p>
            </div>

            <div class="box">
              <h2>Charges</h2>
              <p><strong>Parts:</strong> $${money(job.parts_total)}</p>
              <p><strong>Labor:</strong> $${money(job.labor_total)}</p>
              <p><strong>Tax:</strong> $${money(job.tax)}</p>
              <p><strong>Total:</strong> $${money(job.total)}</p>
            </div>
          </div>

          <div class="section">
            <h2>Customer Complaint</h2>
            <div class="notes">${job.customer_complaint || '-'}</div>
          </div>

          <div class="section">
            <h2>Diagnosis</h2>
            <div class="notes">${job.diagnosis || '-'}</div>
          </div>

          <div class="section">
            <h2>Repairs Performed</h2>
            <div class="notes">${job.repairs_performed || '-'}</div>
          </div>

          <div class="section">
            <h2>Charges</h2>
            <table>
              <tbody>
                <tr><td>Parts</td><td>$${money(job.parts_total)}</td></tr>
                <tr><td>Labor</td><td>$${money(job.labor_total)}</td></tr>
                <tr><td>Tax</td><td>$${money(job.tax)}</td></tr>
              </tbody>
            </table>

            <div class="totals">
              <div><span>Parts</span><strong>$${money(job.parts_total)}</strong></div>
              <div><span>Labor</span><strong>$${money(job.labor_total)}</strong></div>
              <div><span>Tax</span><strong>$${money(job.tax)}</strong></div>
              <div class="grand"><span>Total</span><strong>$${money(job.total)}</strong></div>
            </div>
          </div>

          <div class="sig">
            <div class="line">Customer Signature</div>
            <div class="line">Date</div>
          </div>

          <script>window.onload = () => window.print()</script>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const filteredJobs = jobs.filter((job) => {
    const customer = customers.find((c) => c.id === job.customer_id)
    const vehicle = vehicles.find((v) => v.id === job.vehicle_id)
    const text = `${job.ro_number || ''} ${customerName(customer)} ${vehicleName(vehicle)} ${job.status || ''} ${job.technician || ''}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  const availableVehicles = jobForm.customerId
    ? vehicles.filter((v) => v.customer_id === jobForm.customerId)
    : vehicles

  return (
    <>
      {successMsg && <div className="saveToast">{successMsg}</div>}

      <h1>Jobs</h1>

      <div className="pageHeader customerTopBar">
        <input
          className="adminSearch"
          placeholder="Search jobs by RO, customer, vehicle, status, technician..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="topButtonGroup">
          <button className="btn secondary" onClick={() => openVehicleForm()}>
            + Add Vehicle
          </button>

          <button className="btn primary" onClick={() => openJobForm()}>
            + Quick Job / Walk-In
          </button>
        </div>
      </div>

      {errorMsg && <p className="adminError">{errorMsg}</p>}

      <section className="profilePanel jobsPanel">
        <div className="panelTitle">
          <span>🔧</span>
          <h2>Repair Orders / Invoices</h2>
        </div>

        <div className="modernTableWrap">
          <table className="modernTable">
            <thead>
              <tr>
                <th>RO #</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Technician</th>
                <th>Total</th>
                <th>Opened</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan="8">No jobs found.</td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const customer = customers.find((c) => c.id === job.customer_id)
                  const vehicle = vehicles.find((v) => v.id === job.vehicle_id)
                  return (
                    <tr key={job.id}>
                      <td><strong>{job.ro_number}</strong></td>
                      <td>{customerName(customer)}</td>
                      <td>{vehicleName(vehicle)}</td>
                      <td>
                        <select
                          className={`inlineStatus ${String(job.status || 'Open').toLowerCase().replaceAll(' ', '-')}`}
                          value={job.status || 'Open'}
                          onChange={(e) => updateJobStatus(job.id, e.target.value)}
                        >
                          {jobStatuses.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td>{job.technician || '-'}</td>
                      <td>${money(job.total)}</td>
                      <td>{job.opened_at ? new Date(job.opened_at).toLocaleDateString() : '-'}</td>
                      <td className="actionCell">
                        <button className="smallBtn" onClick={() => openJobForm(job)}>Edit</button>
                        <button className="smallBtn printSmall" onClick={() => printJob(job)}>Print PDF</button>
                        <button className="smallBtn dangerSmall" onClick={() => deleteJob(job.id)}>Delete</button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showVehicleForm && (
        <div className="modalOverlay">
          <div className="modalCard wideModal">
            <button className="modalClose" onClick={() => setShowVehicleForm(false)}>×</button>

            <h2>{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>

            <select value={vehicleForm.customerId} onChange={(e) => setVehicleForm({ ...vehicleForm, customerId: e.target.value })}>
              <option value="">No Customer / Walk-In</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{customerName(c)}</option>
              ))}
            </select>

            <div className="modalGrid">
              <input placeholder="Year" value={vehicleForm.year} onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })} />
              <input placeholder="Make" value={vehicleForm.make} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })} />
              <input placeholder="Model" value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} />
              <input placeholder="VIN" value={vehicleForm.vin} onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })} />
              <input placeholder="Mileage" value={vehicleForm.mileage} onChange={(e) => setVehicleForm({ ...vehicleForm, mileage: e.target.value })} />
              <input placeholder="License Plate" value={vehicleForm.licensePlate} onChange={(e) => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value })} />
              <input placeholder="Color" value={vehicleForm.color} onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })} />
              <input placeholder="Engine" value={vehicleForm.engine} onChange={(e) => setVehicleForm({ ...vehicleForm, engine: e.target.value })} />
            </div>

            <select value={vehicleForm.status} onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}>
              <option>Active</option>
              <option>In Shop</option>
              <option>Completed</option>
              <option>Inactive</option>
            </select>

            <textarea placeholder="Notes" value={vehicleForm.notes} onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })} />

            <div className="modalActions">
              <button className="btn secondary" onClick={() => setShowVehicleForm(false)}>Cancel</button>
              <button className="btn primary" onClick={saveVehicle}>{editingVehicle ? 'Save Vehicle' : 'Add Vehicle'}</button>
            </div>
          </div>
        </div>
      )}

      {showJobForm && (
        <div className="modalOverlay">
          <div className="modalCard wideModal">
            <button className="modalClose" onClick={() => setShowJobForm(false)}>×</button>

            <h2>{editingJob ? `Edit ${editingJob.ro_number}` : 'Quick Job / Walk-In'}</h2>

            <select value={jobForm.customerId} onChange={(e) => setJobForm({ ...jobForm, customerId: e.target.value, vehicleId: '' })}>
              <option value="">Walk-In / No Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{customerName(c)}</option>
              ))}
            </select>

            <select value={jobForm.vehicleId} onChange={(e) => setJobForm({ ...jobForm, vehicleId: e.target.value })}>
              <option value="">No Vehicle Attached</option>
              {availableVehicles.map((v) => (
                <option key={v.id} value={v.id}>{vehicleName(v)}</option>
              ))}
            </select>

            <select value={jobForm.status} onChange={(e) => setJobForm({ ...jobForm, status: e.target.value })}>
              {jobStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <div className="modalGrid">
              <input placeholder="Technician" value={jobForm.technician} onChange={(e) => setJobForm({ ...jobForm, technician: e.target.value })} />
              <input placeholder="Mileage In" value={jobForm.mileage} onChange={(e) => setJobForm({ ...jobForm, mileage: e.target.value })} />
            </div>

            <textarea placeholder="Customer Complaint / Issue" value={jobForm.complaint} onChange={(e) => setJobForm({ ...jobForm, complaint: e.target.value })} />
            <textarea placeholder="Diagnosis" value={jobForm.diagnosis} onChange={(e) => setJobForm({ ...jobForm, diagnosis: e.target.value })} />
            <textarea placeholder="Repairs Performed" value={jobForm.repairs} onChange={(e) => setJobForm({ ...jobForm, repairs: e.target.value })} />

            <h3 className="chargeHeading">Charges</h3>

            <div className="modalGrid">
              <input type="number" step="0.01" placeholder="Parts Total" value={jobForm.partsTotal} onChange={(e) => updateCharge('partsTotal', e.target.value)} />
              <input type="number" step="0.01" placeholder="Labor Total" value={jobForm.laborTotal} onChange={(e) => updateCharge('laborTotal', e.target.value)} />
              <input type="number" step="0.01" placeholder="Tax" value={jobForm.tax} onChange={(e) => updateCharge('tax', e.target.value)} />
              <input type="number" step="0.01" placeholder="Grand Total" value={jobForm.total} onChange={(e) => setJobForm({ ...jobForm, total: e.target.value })} />
            </div>

            {(jobForm.status === 'Completed' || jobForm.status === 'Picked Up') && (
              <p className="printNotice">After saving, this job will show a Print PDF button.</p>
            )}

            <div className="modalActions">
              <button className="btn secondary" onClick={() => setShowJobForm(false)}>Cancel</button>
              <button className="btn primary" onClick={saveJob}>{editingJob ? 'Save Job' : 'Create Job'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
