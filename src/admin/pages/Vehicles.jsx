import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Vehicles() {
  const [showForm, setShowForm] = useState(false)
  const [vehicles, setVehicles] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [form, setForm] = useState({
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
    })
  }

  async function loadData() {
    const { data: customerData } = await supabase
      .from('admin_customers')
      .select('id, first_name, last_name')
      .order('last_name')

    const { data: vehicleData } = await supabase
      .from('admin_vehicles')
      .select('*, admin_customers(first_name, last_name)')
      .order('created_at', { ascending: false })

    setCustomers(customerData || [])
    setVehicles(vehicleData || [])
  }

  function openVehicle(v) {
    setSelectedVehicle(v)
    setForm({
      customerId: v.customer_id || '',
      year: v.year || '',
      make: v.make || '',
      model: v.model || '',
      vin: v.vin || '',
      mileage: v.mileage || '',
      licensePlate: v.license_plate || '',
      color: v.color || '',
      engine: v.engine || '',
      notes: v.notes || '',
      status: v.status || 'Active'
    })
  }

  async function saveVehicle() {
    setErrorMsg('')

    const { error } = await supabase.from('admin_vehicles').insert({
      customer_id: form.customerId || null,
      year: form.year,
      make: form.make,
      model: form.model,
      vin: form.vin,
      mileage: form.mileage,
      license_plate: form.licensePlate,
      color: form.color,
      engine: form.engine,
      notes: form.notes,
      status: form.status
    })

    if (error) {
      setErrorMsg(error.message)
      return
    }

    resetForm()
    setShowForm(false)
    await loadData()
    showSuccess('Vehicle saved')
  }

  async function updateVehicle() {
    setErrorMsg('')

    const { error } = await supabase
      .from('admin_vehicles')
      .update({
        customer_id: form.customerId || null,
        year: form.year,
        make: form.make,
        model: form.model,
        vin: form.vin,
        mileage: form.mileage,
        license_plate: form.licensePlate,
        color: form.color,
        engine: form.engine,
        notes: form.notes,
        status: form.status
      })
      .eq('id', selectedVehicle.id)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    await loadData()
    showSuccess('Changes saved')
  }

  async function deleteVehicle() {
    if (!confirm('Delete this vehicle?')) return

    const { error } = await supabase
      .from('admin_vehicles')
      .delete()
      .eq('id', selectedVehicle.id)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setSelectedVehicle(null)
    resetForm()
    await loadData()
    showSuccess('Vehicle deleted')
  }

  if (selectedVehicle) {
    return (
      <>
        {successMsg && <div className="saveToast">{successMsg}</div>}

        <button className="btn secondary" onClick={() => setSelectedVehicle(null)}>
          ← Back to Vehicles
        </button>

        <div className="detailCard">
          <h1>Edit Vehicle</h1>

          {errorMsg && <p style={{ color: 'red', fontWeight: 800 }}>{errorMsg}</p>}

          <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
            <option value="">Select Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          <input placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          <input placeholder="Make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
          <input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <input placeholder="VIN" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
          <input placeholder="Mileage" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
          <input placeholder="License Plate" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
          <input placeholder="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          <input placeholder="Engine" value={form.engine} onChange={(e) => setForm({ ...form, engine: e.target.value })} />

          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>Active</option>
            <option>In Shop</option>
            <option>Completed</option>
            <option>Inactive</option>
          </select>

          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div className="modalActions">
            <button className="btn secondary" onClick={deleteVehicle}>
              Delete Vehicle
            </button>
            <button className="btn primary" onClick={updateVehicle}>
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

      <h1>Vehicles</h1>

      <div className="pageHeader">
        <button className="btn primary" onClick={() => setShowForm(true)}>
          + Add Vehicle
        </button>
      </div>

      {errorMsg && <p style={{ color: 'red', fontWeight: 800 }}>{errorMsg}</p>}

      <table className="adminTable">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Year</th>
            <th>Make</th>
            <th>Model</th>
            <th>VIN</th>
            <th>Mileage</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {vehicles.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                No vehicles found.
              </td>
            </tr>
          ) : (
            vehicles.map((v) => (
              <tr key={v.id} onClick={() => openVehicle(v)} style={{ cursor: 'pointer' }}>
                <td>
                  {v.admin_customers
                    ? `${v.admin_customers.first_name} ${v.admin_customers.last_name}`
                    : '-'}
                </td>
                <td>{v.year}</td>
                <td>{v.make}</td>
                <td>{v.model}</td>
                <td>{v.vin}</td>
                <td>{v.mileage}</td>
                <td>{v.status || 'Active'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showForm && (
        <div className="modalOverlay">
          <div className="modalCard">
            <button className="modalClose" onClick={() => setShowForm(false)}>
              ×
            </button>

            <h2>Add Vehicle</h2>

            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Select Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>

            <input placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            <input placeholder="Make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
            <input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            <input placeholder="VIN" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
            <input placeholder="Mileage" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
            <input placeholder="License Plate" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
            <input placeholder="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            <input placeholder="Engine" value={form.engine} onChange={(e) => setForm({ ...form, engine: e.target.value })} />

            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Active</option>
              <option>In Shop</option>
              <option>Completed</option>
              <option>Inactive</option>
            </select>

            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

            <div className="modalActions">
              <button className="btn secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn primary" onClick={saveVehicle}>Save Vehicle</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}