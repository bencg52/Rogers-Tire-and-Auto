import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Invoices({ onOpenJob, initialStatusFilter = 'All', initialSearch = '' }) {
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [jobs, setJobs] = useState([])
  const [invoiceItemsByJob, setInvoiceItemsByJob] = useState({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    loadInvoices()
  }, [])

  useEffect(() => {
    setStatusFilter(initialStatusFilter || 'All')
    setSearch(initialSearch || '')
  }, [initialStatusFilter, initialSearch])

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

  function invoiceNumber(job) {
    return String(job?.ro_number || '').replace('RO-', '') || '-'
  }

  function invoiceStatus(job) {
    if (job.status === 'Picked Up') return 'Paid'
    if (job.status === 'Completed') return 'Open'
    if (job.status === 'Cancelled') return 'Void'
    return 'Draft'
  }


  function showSuccess(message) {
    setSuccessMsg(message)
    setTimeout(() => setSuccessMsg(''), 2500)
  }

  function invoiceStatusToJobStatus(status) {
    if (status === 'Open') return 'Completed'
    if (status === 'Paid') return 'Picked Up'
    if (status === 'Void') return 'Cancelled'
    return 'Open'
  }

  async function updateInvoiceStatus(jobId, nextInvoiceStatus) {
    setErrorMsg('')
    const nextJobStatus = invoiceStatusToJobStatus(nextInvoiceStatus)

    const { error } = await supabase
      .from('admin_repair_orders')
      .update({ status: nextJobStatus })
      .eq('id', jobId)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setJobs((currentJobs) => currentJobs.map((job) => (
      job.id === jobId ? { ...job, status: nextJobStatus } : job
    )))
    setSelectedInvoice((currentInvoice) => (
      currentInvoice?.id === jobId ? { ...currentInvoice, status: nextJobStatus } : currentInvoice
    ))
    showSuccess('Invoice status updated')
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]))
  }

  async function loadInvoices() {
    setErrorMsg('')

    const { data: customerData, error: customerError } = await supabase
      .from('admin_customers')
      .select('id, first_name, last_name, phone, email, address')
      .order('last_name')

    if (customerError) {
      setErrorMsg(customerError.message)
      return
    }

    const { data: vehicleData, error: vehicleError } = await supabase
      .from('admin_vehicles')
      .select('id, customer_id, year, make, model, vin, license_plate')
      .order('created_at', { ascending: false })

    if (vehicleError) {
      setErrorMsg(vehicleError.message)
      return
    }

    const { data: jobData, error: jobError } = await supabase
      .from('admin_repair_orders')
      .select('*')
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

      if (itemError) {
        setErrorMsg(itemError.message)
      } else {
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

  function getInvoiceTotals(job) {
    const items = invoiceItemsByJob[job.id] || []
    const subtotal = items.length
      ? items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      : Number(job.parts_total || 0) + Number(job.labor_total || 0)
    const tax = Number(job.tax || (subtotal * 0.06))
    const total = Number(job.total || subtotal + tax)
    return { subtotal, tax, total }
  }

  function printInvoice(job) {
    const customer = customers.find((c) => c.id === job.customer_id)
    const vehicle = vehicles.find((v) => v.id === job.vehicle_id)
    const items = invoiceItemsByJob[job.id] || []
    const number = invoiceNumber(job)
    const invoiceDate = job.opened_at ? new Date(job.opened_at).toLocaleDateString() : new Date().toLocaleDateString()
    const { subtotal, tax, total } = getInvoiceTotals(job)

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
          <title>Invoice ${escapeHtml(number)}</title>
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
                  <tr><td>${escapeHtml(invoiceDate)}</td><td>${escapeHtml(number)}</td></tr>
                </table>
              </div>
            </div>

            <div class="billTo">
              <div class="billToHeader">BILL TO</div>
              <div class="billToBody">
                <strong>${escapeHtml(customerName(customer))}</strong><br />
                ${escapeHtml(customer?.phone || '')}<br />
                ${escapeHtml(customer?.address || '')}<br />
                ${escapeHtml(vehicleName(vehicle))}${vehicle?.license_plate ? ' / Plate: ' + escapeHtml(vehicle.license_plate) : ''}${job.mileage_in ? '<br />Mileage In: ' + escapeHtml(job.mileage_in) : ''}
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

  const invoiceRows = useMemo(() => jobs.map((job) => {
    const customer = customers.find((c) => c.id === job.customer_id)
    const vehicle = vehicles.find((v) => v.id === job.vehicle_id)
    const totals = getInvoiceTotals(job)
    return { job, customer, vehicle, totals, status: invoiceStatus(job) }
  }), [jobs, customers, vehicles, invoiceItemsByJob])

  const filteredInvoices = invoiceRows.filter(({ job, customer, vehicle, status }) => {
    const text = `${invoiceNumber(job)} ${job.ro_number || ''} ${customerName(customer)} ${vehicleName(vehicle)} ${job.mileage_in || ''} ${status}`.toLowerCase()
    const matchesSearch = text.includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All' || status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <>
      {successMsg && <div className="saveToast">{successMsg}</div>}

      <h1>Invoices</h1>

      <div className="pageHeader customerTopBar">
        <input
          className="adminSearch"
          placeholder="Search invoices by invoice #, RO #, customer, vehicle, mileage, or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="topButtonGroup invoiceFilterButtons">
          {['All', 'Draft', 'Open', 'Paid', 'Void'].map((status) => (
            <button
              key={status}
              className={`smallBtn ${statusFilter === status ? 'activeFilterBtn' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && <p className="adminError">{errorMsg}</p>}

      <section className="profilePanel jobsPanel">
        <div className="panelTitle">
          <span>🧾</span>
          <h2>Saved Invoices</h2>
        </div>

        <div className="modernTableWrap">
          <table className="modernTable">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>RO #</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Mileage In</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9">No saved invoices found.</td>
                </tr>
              ) : (
                filteredInvoices.map(({ job, customer, vehicle, totals, status }) => (
                  <tr key={job.id}>
                    <td><strong>{invoiceNumber(job)}</strong></td>
                    <td>{job.ro_number || '-'}</td>
                    <td>{customerName(customer)}</td>
                    <td>{vehicleName(vehicle)}</td>
                    <td>{job.mileage_in || '-'}</td>
                    <td>{job.opened_at ? new Date(job.opened_at).toLocaleDateString() : '-'}</td>
                    <td>
                      <select
                        className={`invoiceInlineStatus ${status.toLowerCase()}`}
                        value={status}
                        onChange={(e) => updateInvoiceStatus(job.id, e.target.value)}
                      >
                        {['Draft', 'Open', 'Paid', 'Void'].map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td>${money(totals.total)}</td>
                    <td className="actionCell">
                      <button className="smallBtn viewPdfSmall" onClick={() => setSelectedInvoice(job)}>View</button>
                      <button className="smallBtn printSmall" onClick={() => printInvoice(job)}>Print PDF</button>
                      <button className="smallBtn" onClick={() => onOpenJob?.(job.id)}>Edit RO</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedInvoice && (() => {
        const job = selectedInvoice
        const customer = customers.find((c) => c.id === job.customer_id)
        const vehicle = vehicles.find((v) => v.id === job.vehicle_id)
        const items = invoiceItemsByJob[job.id] || []
        const totals = getInvoiceTotals(job)
        return (
          <div className="modalOverlay">
            <div className="modalCard wideModal invoiceViewModal">
              <button className="modalClose" onClick={() => setSelectedInvoice(null)}>×</button>
              <h2>Invoice #{invoiceNumber(job)}</h2>

              <div className="invoiceSummaryGrid">
                <div><strong>RO #</strong><span>{job.ro_number || '-'}</span></div>
                <div><strong>Customer</strong><span>{customerName(customer)}</span></div>
                <div><strong>Vehicle</strong><span>{vehicleName(vehicle)}</span></div>
                <div><strong>Mileage In</strong><span>{job.mileage_in || '-'}</span></div>
                <div>
                  <strong>Status</strong>
                  <select
                    className={`invoiceInlineStatus ${invoiceStatus(job).toLowerCase()}`}
                    value={invoiceStatus(job)}
                    onChange={(e) => updateInvoiceStatus(job.id, e.target.value)}
                  >
                    {['Draft', 'Open', 'Paid', 'Void'].map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div><strong>Date</strong><span>{job.opened_at ? new Date(job.opened_at).toLocaleDateString() : '-'}</span></div>
                <div><strong>Total</strong><span>${money(totals.total)}</span></div>
              </div>

              <div className="modernTableWrap compactInvoiceItems">
                <table className="modernTable">
                  <thead>
                    <tr><th>Item</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan="5">No invoice line items saved.</td></tr>
                    ) : items.map((item) => (
                      <tr key={item.id || `${item.repair_order_id}-${item.line_number}`}>
                        <td>{item.item_code || item.line_number}</td>
                        <td>{item.description || '-'}</td>
                        <td>{item.qty}</td>
                        <td>${money(item.rate)}</td>
                        <td>${money(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="invoiceModalTotals">
                <div><strong>Subtotal:</strong> ${money(totals.subtotal)}</div>
                <div><strong>6% Tax:</strong> ${money(totals.tax)}</div>
                <div><strong>Total:</strong> ${money(totals.total)}</div>
              </div>

              <div className="modalActions">
                <button className="btn secondary" onClick={() => setSelectedInvoice(null)}>Close</button>
                <button className="btn secondary" onClick={() => onOpenJob?.(job.id)}>Edit RO</button>
                <button className="btn primary" onClick={() => printInvoice(job)}>Print PDF</button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
