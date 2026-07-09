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
  status: 'Open',
  lineItems: [
    { item: '1', description: '', qty: '1', rate: '', amount: '' }
  ]
}

export default function Jobs({ openJobId, onJobOpened }) {
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [jobs, setJobs] = useState([])
  const [invoiceItemsByJob, setInvoiceItemsByJob] = useState({})
  const [search, setSearch] = useState('')
  const [showJobForm, setShowJobForm] = useState(false)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [jobForm, setJobForm] = useState(emptyJob)
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSavingJob, setIsSavingJob] = useState(false)

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

  function calculateSubtotal(items = jobForm.lineItems || []) {
    return items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }

  function calculateTax(items = jobForm.lineItems || []) {
    return (calculateSubtotal(items) * 0.06).toFixed(2)
  }

  function calculateTotalFromItems(items = jobForm.lineItems || []) {
    return (calculateSubtotal(items) + Number(calculateTax(items))).toFixed(2)
  }

  function updateLineItem(index, field, value) {
    const nextItems = (jobForm.lineItems || []).map((item, itemIndex) => {
      if (itemIndex !== index) return item

      const nextItem = { ...item, [field]: value }
      if (field === 'qty' || field === 'rate') {
        nextItem.amount = (Number(nextItem.qty || 0) * Number(nextItem.rate || 0)).toFixed(2)
      }
      return nextItem
    })

    setJobForm({
      ...jobForm,
      lineItems: nextItems,
      partsTotal: calculateSubtotal(nextItems).toFixed(2),
      laborTotal: '0.00',
      tax: calculateTax(nextItems),
      total: calculateTotalFromItems(nextItems)
    })
  }

  function addLineItem() {
    setJobForm({
      ...jobForm,
      lineItems: [
        ...(jobForm.lineItems || []),
        { item: String((jobForm.lineItems || []).length + 1), description: '', qty: '1', rate: '', amount: '' }
      ]
    })
  }

  function removeLineItem(index) {
    const nextItems = (jobForm.lineItems || []).filter((_, itemIndex) => itemIndex !== index)
    setJobForm({
      ...jobForm,
      lineItems: nextItems.length ? nextItems : [{ item: '1', description: '', qty: '1', rate: '', amount: '' }],
      partsTotal: calculateSubtotal(nextItems).toFixed(2),
      laborTotal: '0.00',
      tax: calculateTax(nextItems),
      total: calculateTotalFromItems(nextItems)
    })
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

    const jobIds = (jobData || []).map((job) => job.id)
    let itemsByJob = {}

    if (jobIds.length) {
      const { data: itemData, error: itemError } = await supabase
        .from('admin_invoice_items')
        .select('*')
        .in('repair_order_id', jobIds)
        .order('line_number', { ascending: true })

      if (!itemError) {
        itemsByJob = (itemData || []).reduce((acc, item) => {
          acc[item.repair_order_id] = acc[item.repair_order_id] || []
          acc[item.repair_order_id].push(item)
          return acc
        }, {})
      }
    }

    setCustomers(customerData || [])
    setVehicles(vehicleData || [])
    setJobs(jobData || [])
    setInvoiceItemsByJob(itemsByJob)
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
        status: job.status || 'Open',
        lineItems: (invoiceItemsByJob[job.id] || []).length
          ? invoiceItemsByJob[job.id].map((item, index) => ({
              item: item.item_code || String(index + 1),
              description: item.description || '',
              qty: item.qty || '1',
              rate: item.rate || '',
              amount: item.amount || ''
            }))
          : [
              { item: '1', description: job.repairs_performed || job.customer_complaint || '', qty: '1', rate: job.total || '', amount: job.total || '' }
            ]
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
      .like('ro_number', 'RO-1%')
      .limit(5000)

    if (error) {
      throw error
    }

    /*
      Start the clean shop sequence at RO-100001.
      Older random RO numbers like RO-775731 are ignored so they do not
      force the new sequence to continue from the old random format.
    */
    const highest = (data || []).reduce((max, row) => {
      const match = String(row.ro_number || '').match(/^RO-(\d+)$/)
      if (!match) return max

      const number = Number(match[1])

      if (!Number.isFinite(number)) return max
      if (number < 100001 || number > 199999) return max

      return number > max ? number : max
    }, 100000)

    return `RO-${highest + 1}`
  }

  async function saveJob() {
    if (isSavingJob) return

    setErrorMsg('')
    setIsSavingJob(true)

    try {
      const lineItems = jobForm.lineItems || []
      const payload = {
        customer_id: jobForm.customerId || null,
        vehicle_id: jobForm.vehicleId || null,
        technician: jobForm.technician,
        mileage_in: jobForm.mileage,
        customer_complaint: jobForm.complaint,
        diagnosis: jobForm.diagnosis,
        repairs_performed: jobForm.repairs,
        parts_total: Number(calculateSubtotal(lineItems).toFixed(2)),
        labor_total: 0,
        tax: Number(calculateTax(lineItems)),
        total: Number(calculateTotalFromItems(lineItems)),
        status: jobForm.status
      }

      let savedJobId = editingJob?.id
      let savedRoNumber = editingJob?.ro_number

      if (editingJob) {
        const { error } = await supabase
          .from('admin_repair_orders')
          .update(payload)
          .eq('id', editingJob.id)

        if (error) throw error
      } else {
        const roNumber = await generateNextRoNumber()
        const { data, error } = await supabase
          .from('admin_repair_orders')
          .insert({ ...payload, ro_number: roNumber })
          .select('id, ro_number')
          .single()

        if (error) throw error

        savedJobId = data.id
        savedRoNumber = data.ro_number
      }

      if (savedJobId) {
        const { error: deleteItemsError } = await supabase
          .from('admin_invoice_items')
          .delete()
          .eq('repair_order_id', savedJobId)

        if (deleteItemsError) throw deleteItemsError

        const itemPayload = lineItems
          .filter((item) => item.description || item.amount || item.rate || item.item)
          .map((item, index) => {
            const qty = Number(item.qty || 0)
            const rate = Number(item.rate || 0)
            const amount = Number(item.amount || (qty * rate) || 0)

            return {
              repair_order_id: savedJobId,
              line_number: index + 1,
              item_code: item.item || String(index + 1),
              description: item.description || '',
              qty,
              rate,
              amount
            }
          })

        if (itemPayload.length) {
          const { error: itemError } = await supabase
            .from('admin_invoice_items')
            .insert(itemPayload)

          if (itemError) throw itemError
        }
      }

      await loadData()
      setShowJobForm(false)
      setEditingJob(null)
      setJobForm(emptyJob)
      showSuccess(`${savedRoNumber || 'Repair Order'} saved successfully`)
    } catch (error) {
      setErrorMsg(error.message || 'Unable to save job. Please try again.')
    } finally {
      setIsSavingJob(false)
    }
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

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]))
  }

  function printJob(job) {
    const customer = customers.find((c) => c.id === job.customer_id)
    const vehicle = vehicles.find((v) => v.id === job.vehicle_id)
    const items = invoiceItemsByJob[job.id] || []
    const invoiceNumber = String(job.ro_number || '').replace('RO-', '') || '17919'
    const invoiceDate = job.opened_at ? new Date(job.opened_at).toLocaleDateString() : new Date().toLocaleDateString()
    const subtotal = items.length ? items.reduce((sum, item) => sum + Number(item.amount || 0), 0) : Number(job.parts_total || 0) + Number(job.labor_total || 0)
    const tax = Number(job.tax || (subtotal * 0.06))
    const total = Number(job.total || subtotal + tax)

    const itemRows = Array.from({ length: 13 }).map((_, index) => {
      const item = items[index]
      return `
        <tr>
          <td>${escapeHtml(item?.item_code || '')}</td>
          <td>${escapeHtml(item?.description || '')}</td>
          <td>${item ? escapeHtml(item.qty) : ''}</td>
          <td>${item ? '$' + money(item.rate) : ''}</td>
          <td>${item ? '$' + money(item.amount) : ''}</td>
        </tr>
      `
    }).join('')

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Invoice ${escapeHtml(invoiceNumber)}</title>
          <style>
            @page{size:letter;margin:0.33in 0.38in}
            *{box-sizing:border-box}
            body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;margin:0;padding:0;font-size:12px}
            .invoice{width:7.75in;min-height:10.25in;margin:0 auto;padding:0.08in 0}
            .top{display:grid;grid-template-columns:1fr 2.45in;align-items:start;margin-bottom:0.12in}
            .shop{font-size:17px;font-weight:700;line-height:1.13;padding-left:0.42in;padding-top:0.18in}
            .shop div:not(:first-child){font-weight:500}
            .invoiceTitle{text-align:right;font-size:30px;font-weight:900;margin:0.18in 0 0.06in 0;padding-right:0.05in}
            .dateBox{width:2.22in;margin-left:auto;border-collapse:collapse;font-size:11px;text-align:center;table-layout:fixed}
            .dateBox th,.dateBox td{border:1.25px solid #111;padding:6px 7px;height:0.25in}
            .dateBox th{background:#d9d9d9;font-weight:800;font-size:10px}
            .billTo{width:3.85in;height:1.06in;border:1.25px solid #111;margin-left:0.34in;margin-top:0.02in;margin-bottom:1.32in}
            .billToHeader{text-align:center;border-bottom:1.25px solid #111;font-weight:800;font-size:10px;padding:3px 0;background:#d9d9d9;line-height:1}
            .billToBody{padding:7px 10px;line-height:1.22;font-size:12px;min-height:0.83in}
            .items{width:100%;border-collapse:collapse;table-layout:fixed;border:1.25px solid #111}
            .items th{border:1.25px solid #111;background:#d9d9d9;font-size:10px;padding:4px 3px;text-align:center;font-weight:800;line-height:1}
            .items td{border-left:1.25px solid #111;border-right:1.25px solid #111;height:0.43in;padding:5px 7px;vertical-align:top;font-size:12px}
            .items tr:last-child td{border-bottom:1.25px solid #111}
            .items .item{width:1.08in}.items .desc{width:3.55in}.items .qty{width:0.78in}.items .rate{width:1.05in}.items .amount{width:1.29in}
            .bottom{display:grid;grid-template-columns:1fr 3.0in;margin-top:0;border-left:1.25px solid #111;border-bottom:1.25px solid #111;border-right:1.25px solid #111;min-height:1.02in}
            .notes{border-right:1.25px solid #111;padding:9px 10px;white-space:pre-wrap;font-size:11px}
            .totals{display:grid;grid-template-rows:0.31in 0.31in 0.4in}
            .totals div{border-bottom:1.25px solid #111;padding:7px 9px;font-weight:700;line-height:1}
            .totals div:last-child{border-bottom:0;background:#d9d9d9;font-size:28px;font-weight:900;display:flex;justify-content:space-between;align-items:center;padding-top:4px;padding-bottom:4px}
            .totals span{float:right;font-size:12px;font-weight:700;margin-top:3px}
            .totals div:last-child span{font-size:18px;font-weight:900;margin-top:0}
            @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.invoice{margin:0 auto}}
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="top">
              <div class="shop">
                <div>Roger's Tire-N-Auto and Upstate Exhaust</div>
                <div>7774 Augusta Road</div>
                <div>Piedmont, S.C. 29673</div>
                <div>864-277-7800</div>
              </div>
              <div>
                <div class="invoiceTitle">Invoice</div>
                <table class="dateBox">
                  <tr><th>DATE</th><th>INVOICE #</th></tr>
                  <tr><td>${escapeHtml(invoiceDate)}</td><td>${escapeHtml(invoiceNumber)}</td></tr>
                </table>
              </div>
            </div>

            <div class="billTo">
              <div class="billToHeader">BILL TO</div>
              <div class="billToBody">
                <strong>${escapeHtml(customerName(customer))}</strong><br />
                ${escapeHtml(customer?.phone || '')}<br />
                ${escapeHtml(customer?.address || '')}<br />
                ${escapeHtml(vehicleName(vehicle))}${vehicle?.license_plate ? ' / Plate: ' + escapeHtml(vehicle.license_plate) : ''}
              </div>
            </div>

            <table class="items">
              <thead>
                <tr><th class="item">ITEM</th><th class="desc">DESCRIPTION</th><th class="qty">QTY</th><th class="rate">RATE</th><th class="amount">AMOUNT</th></tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <div class="bottom">
              <div class="notes">${escapeHtml(job.customer_complaint || '')}</div>
              <div class="totals">
                <div>Subtotal <span>$${money(subtotal)}</span></div>
                <div>6% Tax <span>$${money(tax)}</span></div>
                <div>Total <span>$${money(total)}</span></div>
              </div>
            </div>
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

            <h3 className="chargeHeading">Invoice Line Items</h3>

            <div className="lineItemsEditor">
              {(jobForm.lineItems || []).map((item, index) => (
                <div className="lineItemRow" key={index}>
                  <input placeholder="Item" value={item.item} onChange={(e) => updateLineItem(index, 'item', e.target.value)} />
                  <input className="lineDesc" placeholder="Description" value={item.description} onChange={(e) => updateLineItem(index, 'description', e.target.value)} />
                  <input type="number" step="0.01" placeholder="Qty" value={item.qty} onChange={(e) => updateLineItem(index, 'qty', e.target.value)} />
                  <input type="number" step="0.01" placeholder="Rate" value={item.rate} onChange={(e) => updateLineItem(index, 'rate', e.target.value)} />
                  <input type="number" step="0.01" placeholder="Amount" value={item.amount} onChange={(e) => updateLineItem(index, 'amount', e.target.value)} />
                  <button type="button" className="smallBtn dangerSmall" onClick={() => removeLineItem(index)}>Remove</button>
                </div>
              ))}

              <button type="button" className="smallBtn" onClick={addLineItem}>+ Add Line Item</button>
            </div>

            <div className="invoiceTotalsPreview">
              <strong>Subtotal:</strong> ${calculateSubtotal(jobForm.lineItems).toFixed(2)} &nbsp;|&nbsp;
              <strong>6% Tax:</strong> ${calculateTax(jobForm.lineItems)} &nbsp;|&nbsp;
              <strong>Total:</strong> ${calculateTotalFromItems(jobForm.lineItems)}
            </div>

            {(jobForm.status === 'Completed' || jobForm.status === 'Picked Up') && (
              <p className="printNotice">After saving, this job will show a Print PDF button.</p>
            )}

            <div className="modalActions">
              <button className="btn secondary" onClick={() => setShowJobForm(false)}>Cancel</button>
              <button className="btn primary" onClick={saveJob} disabled={isSavingJob}>{isSavingJob ? 'Saving...' : (editingJob ? 'Save Job' : 'Create Job')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
