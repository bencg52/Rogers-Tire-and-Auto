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

const DEFAULT_SHOP_SETTINGS = {
  laborRate: 100,
  shopFee: 15,
  taxRate: 0.06
}

function moneyValue(value) {
  return Number(value || 0).toFixed(2)
}

function defaultLineItems(settings = DEFAULT_SHOP_SETTINGS) {
  const laborRate = moneyValue(settings.laborRate || DEFAULT_SHOP_SETTINGS.laborRate)
  const shopFee = moneyValue(settings.shopFee || DEFAULT_SHOP_SETTINGS.shopFee)

  return [
    { item: 'Labor', description: 'Labor', qty: '1', rate: laborRate, amount: laborRate },
    { item: 'Shop Fee', description: 'Shop Fee', qty: '1', rate: shopFee, amount: shopFee }
  ]
}

function createEmptyJob(settings = DEFAULT_SHOP_SETTINGS) {
  const lineItems = defaultLineItems(settings)
  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const tax = subtotal * Number(settings.taxRate || DEFAULT_SHOP_SETTINGS.taxRate)

  return {
    id: null,
    customerId: '',
    vehicleId: '',
    walkInVehicle: '',
    technician: '',
    mileage: '',
    complaint: '',
    diagnosis: '',
    repairs: '',
    partsTotal: moneyValue(subtotal),
    laborTotal: '0.00',
    tax: moneyValue(tax),
    total: moneyValue(subtotal + tax),
    status: 'Open',
    lineItems
  }
}

export default function Jobs({ openJobId, onJobOpened, initialSearch = '' }) {
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [jobs, setJobs] = useState([])
  const [invoiceItemsByJob, setInvoiceItemsByJob] = useState({})
  const [search, setSearch] = useState('')
  const [showJobForm, setShowJobForm] = useState(false)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [jobForm, setJobForm] = useState(() => createEmptyJob())
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSavingJob, setIsSavingJob] = useState(false)
  const [selectedPdfJob, setSelectedPdfJob] = useState(null)
  const [shopSettings, setShopSettings] = useState(DEFAULT_SHOP_SETTINGS)

  useEffect(() => {
    loadData()
    loadShopSettings()
  }, [])

  useEffect(() => {
    setSearch(initialSearch || '')
  }, [initialSearch])

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

  function cleanMoneyValue(value) {
    return String(value ?? '').replace(/[$,]/g, '')
  }

  function isLaborLine(item) {
    const text = `${item?.item || ''} ${item?.description || ''}`.toLowerCase().trim()
    return text === 'labor' || text.includes(' labor') || text.startsWith('labor')
  }

  function isShopFeeLine(item) {
    const text = `${item?.item || ''} ${item?.description || ''}`.toLowerCase().trim()
    return text === 'shop fee' || text.includes('shop fee') || text.includes('shop supplies')
  }

  function customerName(c) {
    if (!c) return 'Walk-In / No Customer'
    return `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed Customer'
  }

  function vehicleName(v) {
    if (!v) return 'No Vehicle Attached'
    return `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim() || 'Vehicle'
  }

  function jobVehicleName(job, vehicle) {
    return vehicleName(vehicle) === 'No Vehicle Attached'
      ? (job?.walk_in_vehicle || 'No Vehicle Attached')
      : vehicleName(vehicle)
  }

  function calculateSubtotal(items = jobForm.lineItems || []) {
    return items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }

  function calculateTax(items = jobForm.lineItems || []) {
    return (calculateSubtotal(items) * Number(shopSettings.taxRate || DEFAULT_SHOP_SETTINGS.taxRate)).toFixed(2)
  }

  function calculateTotalFromItems(items = jobForm.lineItems || []) {
    return (calculateSubtotal(items) + Number(calculateTax(items))).toFixed(2)
  }

  function updateLineItem(index, field, value) {
    const cleanedValue = ['rate', 'amount'].includes(field) ? cleanMoneyValue(value) : value

    const nextItems = (jobForm.lineItems || []).map((item, itemIndex) => {
      if (itemIndex !== index) return item

      const nextItem = { ...item, [field]: cleanedValue }

      if ((field === 'description' || field === 'item') && isLaborLine(nextItem) && !Number(nextItem.rate || 0)) {
        nextItem.rate = String(shopSettings.laborRate || DEFAULT_SHOP_SETTINGS.laborRate)
      }

      if ((field === 'description' || field === 'item') && isShopFeeLine(nextItem) && !Number(nextItem.rate || 0)) {
        nextItem.rate = String(shopSettings.shopFee || DEFAULT_SHOP_SETTINGS.shopFee)
      }

      if (
        field === 'qty' ||
        field === 'rate' ||
        ((field === 'description' || field === 'item') && (isLaborLine(nextItem) || isShopFeeLine(nextItem)))
      ) {
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

  async function loadShopSettings() {
    const { data, error } = await supabase
      .from('admin_shop_settings')
      .select('shop_labor_rate, shop_fee, sales_tax_rate')
      .eq('id', 1)
      .maybeSingle()

    if (!error && data) {
      setShopSettings({
        laborRate: Number(data.shop_labor_rate || DEFAULT_SHOP_SETTINGS.laborRate),
        shopFee: Number(data.shop_fee || DEFAULT_SHOP_SETTINGS.shopFee),
        taxRate: Number(data.sales_tax_rate || DEFAULT_SHOP_SETTINGS.taxRate)
      })
    }
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
        walkInVehicle: job.walk_in_vehicle || '',
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
      setJobForm(createEmptyJob(shopSettings))
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
        vehicle_id: jobForm.customerId ? (jobForm.vehicleId || null) : null,
        walk_in_vehicle: jobForm.customerId ? '' : jobForm.walkInVehicle,
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

  function buildInvoiceHtml(job, autoPrint = false) {
    const customer = customers.find((c) => c.id === job.customer_id)
    const vehicle = vehicles.find((v) => v.id === job.vehicle_id)
    const displayVehicle = jobVehicleName(job, vehicle)
    const items = invoiceItemsByJob[job.id] || []
    const invoiceNumber = String(job.ro_number || '').replace('RO-', '') || '17919'
    const invoiceDate = job.opened_at ? new Date(job.opened_at).toLocaleDateString() : new Date().toLocaleDateString()
    const subtotal = items.length ? items.reduce((sum, item) => sum + Number(item.amount || 0), 0) : Number(job.parts_total || 0) + Number(job.labor_total || 0)
    const tax = Number(job.tax || (subtotal * 0.06))
    const total = Number(job.total || subtotal + tax)

    const printableRowCount = Math.max(8, Math.min(12, Math.max(items.length, 1)))
    const itemRows = Array.from({ length: printableRowCount }).map((_, index) => {
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

    return `
      <!doctype html>
      <html>
        <head>
          <title>Invoice ${escapeHtml(invoiceNumber)}</title>
          <style>
            @page{size:letter portrait;margin:0.2in}
            *{box-sizing:border-box}
            html,body{width:8.1in;height:10.6in;overflow:hidden}
            body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;margin:0;padding:0;font-size:11.5px;print-color-adjust:exact;-webkit-print-color-adjust:exact}
            .invoice{width:8.0in;max-height:10.55in;margin:0 auto;padding:0.04in 0;background:#fff;overflow:hidden;break-after:avoid;page-break-after:avoid;break-inside:avoid;page-break-inside:avoid}
            .top{display:grid;grid-template-columns:1fr 2.35in;align-items:start;margin-bottom:0.08in;break-inside:avoid;page-break-inside:avoid}
            .shop{font-size:16px;font-weight:700;line-height:1.08;padding-left:0.42in;padding-top:0.1in}
            .shop div:not(:first-child){font-weight:500}
            .invoiceTitle{text-align:right;font-size:29px;font-weight:900;margin:0.1in 0 0.04in 0;padding-right:0.05in}
            .dateBox{width:2.12in;margin-left:auto;border-collapse:collapse;font-size:10.5px;text-align:center;table-layout:fixed}
            .dateBox th,.dateBox td{border:1.15px solid #111;padding:4px 6px;height:0.22in}
            .dateBox th{background:#d9d9d9;font-weight:800;font-size:9.5px}
            .billTo{width:3.85in;height:0.98in;border:1.15px solid #111;margin-left:0.34in;margin-top:0.02in;margin-bottom:0.72in;break-inside:avoid;page-break-inside:avoid}
            .billToHeader{text-align:center;border-bottom:1.15px solid #111;font-weight:800;font-size:9.5px;padding:2px 0;background:#d9d9d9;line-height:1}
            .billToBody{padding:6px 9px;line-height:1.14;font-size:11px;min-height:0.76in;overflow:hidden}
            .items{width:100%;border-collapse:collapse;table-layout:fixed;border:1.15px solid #111;break-inside:avoid;page-break-inside:avoid}
            .items th{border:1.15px solid #111;background:#d9d9d9;font-size:9.5px;padding:3px 3px;text-align:center;font-weight:800;line-height:1}
            .items td{border-left:1.15px solid #111;border-right:1.15px solid #111;height:0.34in;padding:4px 6px;vertical-align:top;font-size:11px;line-height:1.1;overflow:hidden}
            .items tr:last-child td{border-bottom:1.15px solid #111}
            .items .item{width:1.1in}.items .desc{width:3.85in}.items .qty{width:0.75in}.items .rate{width:1.05in}.items .amount{width:1.25in}
            .bottom{display:grid;grid-template-columns:5.7in 1fr;margin-top:0;border-left:1.15px solid #111;border-bottom:1.15px solid #111;border-right:1.15px solid #111;min-height:0.82in;break-inside:avoid;page-break-inside:avoid}
            .notes{border-right:1.15px solid #111;padding:7px 9px;white-space:pre-wrap;font-size:10.5px;line-height:1.12;overflow:hidden}
            .totals{display:grid;grid-template-rows:0.25in 0.25in 0.32in}
            .totals div{border-bottom:1.15px solid #111;padding:5px 8px;font-weight:700;line-height:1}
            .totals div:last-child{border-bottom:0;background:#d9d9d9;font-size:24px;font-weight:900;display:flex;justify-content:space-between;align-items:center;padding-top:3px;padding-bottom:3px}
            .totals span{float:right;font-size:11px;font-weight:700;margin-top:1px}
            .totals div:last-child span{font-size:16px;font-weight:900;margin-top:0}
            @media print{html,body{height:10.6in;overflow:hidden}.invoice{margin:0 auto;transform:scale(.98);transform-origin:top center}}
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
                ${escapeHtml(displayVehicle)}${vehicle?.license_plate ? ' / Plate: ' + escapeHtml(vehicle.license_plate) : ''}${job.mileage_in ? '<br />Mileage In: ' + escapeHtml(job.mileage_in) : ''}
              </div>
            </div>

            <table class="items">
              <thead>
                <tr><th class="item">ITEM</th><th class="desc">DESCRIPTION</th><th class="qty">QTY</th><th class="rate">RATE</th><th class="amount">AMOUNT</th></tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <div class="bottom">
              <div class="notes">Thank you for your business!</div>
              <div class="totals">
                <div>Subtotal <span>$${money(subtotal)}</span></div>
                <div>6% Tax <span>$${money(tax)}</span></div>
                <div>Total <span>$${money(total)}</span></div>
              </div>
            </div>
          </div>
          ${autoPrint ? '<script>window.onload = () => window.print()</script>' : ''}
        </body>
      </html>
    `
  }

  function printJob(job) {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(buildInvoiceHtml(job, true))
    printWindow.document.close()
  }

  const filteredJobs = jobs.filter((job) => {
    const customer = customers.find((c) => c.id === job.customer_id)
    const vehicle = vehicles.find((v) => v.id === job.vehicle_id)
    const text = `${job.ro_number || ''} ${customerName(customer)} ${jobVehicleName(job, vehicle)} ${job.status || ''} ${job.technician || ''} ${job.mileage_in || ''}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  const availableVehicles = jobForm.customerId
    ? vehicles.filter((v) => v.customer_id === jobForm.customerId)
    : []

  return (
    <>
      {successMsg && <div className="saveToast">{successMsg}</div>}

      <h1>Jobs</h1>

      <div className="pageHeader customerTopBar">
        <input
          className="adminSearch"
          placeholder="Search jobs by RO, customer, vehicle, status, technician, mileage..."
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
                <th>Mileage In</th>
                <th>Total</th>
                <th>Opened</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan="9">No jobs found.</td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const customer = customers.find((c) => c.id === job.customer_id)
                  const vehicle = vehicles.find((v) => v.id === job.vehicle_id)
                  return (
                    <tr key={job.id}>
                      <td><strong>{job.ro_number}</strong></td>
                      <td>{customerName(customer)}</td>
                      <td>{jobVehicleName(job, vehicle)}</td>
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
                      <td>{job.mileage_in || '-'}</td>
                      <td>${money(job.total)}</td>
                      <td>{job.opened_at ? new Date(job.opened_at).toLocaleDateString() : '-'}</td>
                      <td className="actionCell">
                        <button className="smallBtn" onClick={() => openJobForm(job)}>Edit</button>
                        <button className="smallBtn viewPdfSmall" onClick={() => setSelectedPdfJob(job)}>View PDF</button>
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

      {selectedPdfJob && (
        <div className="modalOverlay">
          <div className="modalCard pdfPreviewModal">
            <button className="modalClose" onClick={() => setSelectedPdfJob(null)}>×</button>
            <div className="pdfPreviewHeader">
              <h2>Invoice Preview</h2>
              <button className="btn primary" onClick={() => printJob(selectedPdfJob)}>Print PDF</button>
            </div>
            <iframe
              className="pdfPreviewFrame"
              title="Invoice Preview"
              srcDoc={buildInvoiceHtml(selectedPdfJob, false)}
            />
          </div>
        </div>
      )}

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

            <div className="formField fullWidth">
              <label>Customer</label>
              <select value={jobForm.customerId} onChange={(e) => setJobForm({ ...jobForm, customerId: e.target.value, vehicleId: '', walkInVehicle: e.target.value ? '' : jobForm.walkInVehicle })}>
                <option value="">Walk-In / No Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{customerName(c)}</option>
                ))}
              </select>
            </div>

            <div className="formField fullWidth">
              <label>Vehicle</label>
              {jobForm.customerId ? (
                <select value={jobForm.vehicleId} onChange={(e) => setJobForm({ ...jobForm, vehicleId: e.target.value })}>
                  <option value="">No Vehicle Attached</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>{vehicleName(v)}</option>
                  ))}
                </select>
              ) : (
                <input
                  placeholder="Type vehicle for walk-in, ex: 2020 RAM 1500"
                  value={jobForm.walkInVehicle}
                  onChange={(e) => setJobForm({ ...jobForm, walkInVehicle: e.target.value, vehicleId: '' })}
                />
              )}
            </div>

            <div className="formField fullWidth">
              <label>Status</label>
              <select value={jobForm.status} onChange={(e) => setJobForm({ ...jobForm, status: e.target.value })}>
                {jobStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="modalGrid">
              <div className="formField">
                <label>Technician</label>
                <input placeholder="Technician" value={jobForm.technician} onChange={(e) => setJobForm({ ...jobForm, technician: e.target.value })} />
              </div>
              <div className="formField">
                <label>Mileage In</label>
                <input placeholder="Mileage In" value={jobForm.mileage} onChange={(e) => setJobForm({ ...jobForm, mileage: e.target.value })} />
              </div>
            </div>

            <div className="formField fullWidth">
              <label>Customer Complaint / Issue</label>
              <textarea placeholder="Customer Complaint / Issue" value={jobForm.complaint} onChange={(e) => setJobForm({ ...jobForm, complaint: e.target.value })} />
            </div>
            <div className="formField fullWidth">
              <label>Diagnosis</label>
              <textarea placeholder="Diagnosis" value={jobForm.diagnosis} onChange={(e) => setJobForm({ ...jobForm, diagnosis: e.target.value })} />
            </div>
            <div className="formField fullWidth">
              <label>Repairs Performed</label>
              <textarea placeholder="Repairs Performed" value={jobForm.repairs} onChange={(e) => setJobForm({ ...jobForm, repairs: e.target.value })} />
            </div>

            <h3 className="chargeHeading">Invoice Line Items</h3>

            <div className="lineItemsEditor">
              <div className="lineItemHeaderRow">
                <span>Item</span>
                <span>Description</span>
                <span>Qty</span>
                <span>Rate</span>
                <span>Amount</span>
                <span>Action</span>
              </div>
              {(jobForm.lineItems || []).map((item, index) => (
                <div className="lineItemRow" key={index}>
                  <input aria-label="Item" placeholder="Item" value={item.item} onChange={(e) => updateLineItem(index, 'item', e.target.value)} />
                  <input aria-label="Description" className="lineDesc" placeholder="Description" value={item.description} onChange={(e) => updateLineItem(index, 'description', e.target.value)} />
                  <input aria-label="Quantity" type="number" step="0.01" placeholder="Qty" value={item.qty} onChange={(e) => updateLineItem(index, 'qty', e.target.value)} />
                  <div className="currencyInput"><span>$</span><input aria-label="Rate" type="number" step="0.01" placeholder="Rate" value={item.rate} onChange={(e) => updateLineItem(index, 'rate', e.target.value)} /></div>
                  <div className="currencyInput"><span>$</span><input aria-label="Amount" type="number" step="0.01" placeholder="Amount" value={item.amount} onChange={(e) => updateLineItem(index, 'amount', e.target.value)} /></div>
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
