import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function RepairOrders() {
  const [showForm, setShowForm] = useState(false)
  const [selectedRO, setSelectedRO] = useState(null)
  const [repairOrders, setRepairOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({
    customerId: '',
    vehicleId: '',
    technician: '',
    mileage: '',
    complaint: '',
    diagnosis: '',
    repairs: '',
    status: 'Open'
  })

  useEffect(() => {
    loadData()
  }, [])

  function showSuccess(message) {
    setSuccessMsg(message)
    setTimeout(() => setSuccessMsg(''), 2500)
  }

  function resetForm() {
    setForm({
      customerId: '',
      vehicleId: '',
      technician: '',
      mileage: '',
      complaint: '',
      diagnosis: '',
      repairs: '',
      status: 'Open'
    })
  }

  async function loadData() {
    const { data: roData } = await supabase
      .from('admin_repair_orders')
      .select(`
        *,
        admin_customers(first_name,last_name,phone,email),
        admin_vehicles(year,make,model,vin,license_plate)
      `)
      .order('opened_at', { ascending: false })

    const { data: customerData } = await supabase
      .from('admin_customers')
      .select('id,first_name,last_name')
      .order('last_name')

    const { data: vehicleData } = await supabase
      .from('admin_vehicles')
      .select('*')

    setRepairOrders(roData || [])
    setCustomers(customerData || [])
    setVehicles(vehicleData || [])
  }

  function openRO(ro) {
    setSelectedRO(ro)
    setForm({
      customerId: ro.customer_id || '',
      vehicleId: ro.vehicle_id || '',
      technician: ro.technician || '',
      mileage: ro.mileage_in || '',
      complaint: ro.customer_complaint || '',
      diagnosis: ro.diagnosis || '',
      repairs: ro.repairs_performed || '',
      status: ro.status || 'Open'
    })
  }

  async function saveRepairOrder() {
    setErrorMsg('')
    const roNumber = 'RO-' + Date.now().toString().slice(-6)

    const { error } = await supabase.from('admin_repair_orders').insert({
      ro_number: roNumber,
      customer_id: form.customerId || null,
      vehicle_id: form.vehicleId || null,
      technician: form.technician,
      mileage_in: form.mileage,
      customer_complaint: form.complaint,
      diagnosis: form.diagnosis,
      repairs_performed: form.repairs,
      status: form.status
    })

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setShowForm(false)
    resetForm()
    await loadData()
    showSuccess('Repair order saved')
  }

  async function updateRepairOrder() {
    setErrorMsg('')

    const { error } = await supabase
      .from('admin_repair_orders')
      .update({
        customer_id: form.customerId || null,
        vehicle_id: form.vehicleId || null,
        technician: form.technician,
        mileage_in: form.mileage,
        customer_complaint: form.complaint,
        diagnosis: form.diagnosis,
        repairs_performed: form.repairs,
        status: form.status
      })
      .eq('id', selectedRO.id)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    await loadData()
    showSuccess('Changes saved')
  }

  async function deleteRepairOrder() {
    if (!confirm('Delete this repair order?')) return

    const { error } = await supabase
      .from('admin_repair_orders')
      .delete()
      .eq('id', selectedRO.id)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setSelectedRO(null)
    resetForm()
    await loadData()
    showSuccess('Repair order deleted')
  }

  const filteredVehicles = vehicles.filter(v => v.customer_id === form.customerId)

  const filteredRepairOrders = repairOrders.filter((ro) => {
    const customerName = ro.admin_customers ? `${ro.admin_customers.first_name} ${ro.admin_customers.last_name}` : ''
    const vehicleName = ro.admin_vehicles ? `${ro.admin_vehicles.year} ${ro.admin_vehicles.make} ${ro.admin_vehicles.model}` : ''
    const text = `${ro.ro_number || ''} ${customerName} ${vehicleName} ${ro.status || ''} ${ro.technician || ''}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  if (selectedRO) {
    return (
      <>
        {successMsg && <div className="saveToast">{successMsg}</div>}

        <button className="btn secondary" onClick={() => setSelectedRO(null)}>
          ← Back to Repair Orders
        </button>

        <div className="detailCard">
          <h1>Edit {selectedRO.ro_number}</h1>

          {errorMsg && <p style={{ color: 'red', fontWeight: 800 }}>{errorMsg}</p>}

          <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value, vehicleId: '' })}>
            <option value="">Select Customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>

          <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
            <option value="">Select Vehicle</option>
            {filteredVehicles.map(v => (
              <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
            ))}
          </select>

          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>Open</option>
            <option>In Progress</option>
            <option>Waiting on Parts</option>
            <option>Completed</option>
            <option>Picked Up</option>
            <option>Cancelled</option>
          </select>

          <input placeholder="Technician" value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} />
          <input placeholder="Mileage In" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
          <textarea placeholder="Customer Complaint" value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} />
          <textarea placeholder="Diagnosis" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
          <textarea placeholder="Repairs Performed" value={form.repairs} onChange={(e) => setForm({ ...form, repairs: e.target.value })} />

          <div className="modalActions">
            <button className="btn secondary" onClick={deleteRepairOrder}>
              Delete Repair Order
            </button>
            <button className="btn primary" onClick={updateRepairOrder}>
              Save Changes
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {successMsg && <div className="saveToast">{successMsg}</div>}

      <h1>Repair Orders</h1>

      <div className="pageHeader customerTopBar">
        <input
          className="adminSearch"
          placeholder="Search repair orders by RO, customer, vehicle, status, or technician..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button className="btn primary" onClick={() => setShowForm(true)}>
          + New Repair Order
        </button>
      </div>

      {errorMsg && <p style={{ color: 'red', fontWeight: 800 }}>{errorMsg}</p>}

      <table className="adminTable">
        <thead>
          <tr>
            <th>RO #</th>
            <th>Customer</th>
            <th>Vehicle</th>
            <th>Status</th>
            <th>Technician</th>
          </tr>
        </thead>

        <tbody>
          {filteredRepairOrders.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                No repair orders.
              </td>
            </tr>
          ) : (
            filteredRepairOrders.map(ro => (
              <tr key={ro.id} onClick={() => openRO(ro)} style={{ cursor: 'pointer' }}>
                <td>{ro.ro_number}</td>
                <td>
                  {ro.admin_customers
                    ? `${ro.admin_customers.first_name} ${ro.admin_customers.last_name}`
                    : '-'}
                </td>
                <td>
                  {ro.admin_vehicles
                    ? `${ro.admin_vehicles.year} ${ro.admin_vehicles.make} ${ro.admin_vehicles.model}`
                    : '-'}
                </td>
                <td>{ro.status}</td>
                <td>{ro.technician}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showForm && (
        <div className="modalOverlay">
          <div className="modalCard">
            <button className="modalClose" onClick={() => setShowForm(false)}>×</button>

            <h2>New Repair Order</h2>

            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value, vehicleId: '' })}>
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>

            <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
              <option value="">Select Vehicle</option>
              {filteredVehicles.map(v => (
                <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
              ))}
            </select>

            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Open</option>
              <option>In Progress</option>
              <option>Waiting on Parts</option>
              <option>Completed</option>
              <option>Picked Up</option>
              <option>Cancelled</option>
            </select>

            <input placeholder="Technician" value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} />
            <input placeholder="Mileage In" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
            <textarea placeholder="Customer Complaint" value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} />
            <textarea placeholder="Diagnosis" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
            <textarea placeholder="Repairs Performed" value={form.repairs} onChange={(e) => setForm({ ...form, repairs: e.target.value })} />

            <div className="modalActions">
              <button className="btn secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn primary" onClick={saveRepairOrder}>Save Repair Order</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}