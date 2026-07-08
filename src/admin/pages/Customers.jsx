import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Customers() {
  const [showForm, setShowForm] = useState(false)
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [repairOrders, setRepairOrders] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [search, setSearch] = useState('')
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [repairSearch, setRepairSearch] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  function showSuccess(message) {
    setSuccessMsg(message)
    setTimeout(() => setSuccessMsg(''), 2500)
  }

  async function loadData() {
    setErrorMsg('')

    const { data: customerData, error: customerError } = await supabase
      .from('admin_customers')
      .select('id, first_name, last_name, phone, email, address, notes, created_at')
      .order('created_at', { ascending: false })

    if (customerError) {
      setErrorMsg(customerError.message)
      return
    }

    const { data: vehicleData, error: vehicleError } = await supabase
      .from('admin_vehicles')
      .select('id, customer_id, year, make, model, vin, mileage, status, license_plate, color, engine, created_at')
      .order('created_at', { ascending: false })

    if (vehicleError) {
      setErrorMsg(vehicleError.message)
      return
    }

    const { data: roData, error: roError } = await supabase
      .from('admin_repair_orders')
      .select('id, ro_number, customer_id, vehicle_id, status, technician, opened_at, total')
      .order('opened_at', { ascending: false })

    if (roError) {
      setErrorMsg(roError.message)
      return
    }

    setCustomers(customerData || [])
    setVehicles(vehicleData || [])
    setRepairOrders(roData || [])
  }

  function resetForm() {
    setForm({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    })
  }

  function openCustomer(c) {
    setSelectedCustomer(c)
    setVehicleSearch('')
    setRepairSearch('')
    setForm({
      firstName: c.first_name || '',
      lastName: c.last_name || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      notes: c.notes || ''
    })
  }

  function customerVehicles(customerId) {
    return vehicles.filter((v) => v.customer_id === customerId)
  }

  function customerRepairOrders(customerId) {
    return repairOrders.filter((ro) => ro.customer_id === customerId)
  }

  function latestVisit(customerId) {
    const ros = customerRepairOrders(customerId)
    if (!ros.length) return '-'

    const latest = ros[0]?.opened_at
    return latest ? new Date(latest).toLocaleDateString() : '-'
  }

  function customerInitials(c) {
    const first = c?.first_name?.[0] || ''
    const last = c?.last_name?.[0] || ''
    return `${first}${last}`.toUpperCase() || 'C'
  }

  async function saveCustomer() {
    setErrorMsg('')

    const { data, error } = await supabase
      .from('admin_customers')
      .insert({
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        email: form.email,
        address: form.address,
        notes: form.notes
      })
      .select('id, first_name, last_name, phone, email, address, notes, created_at')
      .single()

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setCustomers([data, ...customers])
    resetForm()
    setShowForm(false)
    showSuccess('Customer saved')
  }

  async function updateCustomer() {
    setErrorMsg('')

    const { data, error } = await supabase
      .from('admin_customers')
      .update({
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        email: form.email,
        address: form.address,
        notes: form.notes
      })
      .eq('id', selectedCustomer.id)
      .select('id, first_name, last_name, phone, email, address, notes, created_at')
      .single()

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setCustomers(customers.map((c) => c.id === data.id ? data : c))
    setSelectedCustomer(data)
    showSuccess('Changes saved')
  }

  async function deleteCustomer() {
    if (!confirm('Delete this customer?')) return

    const { error } = await supabase
      .from('admin_customers')
      .delete()
      .eq('id', selectedCustomer.id)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setCustomers(customers.filter((c) => c.id !== selectedCustomer.id))
    setVehicles(vehicles.filter((v) => v.customer_id !== selectedCustomer.id))
    setRepairOrders(repairOrders.filter((ro) => ro.customer_id !== selectedCustomer.id))
    setSelectedCustomer(null)
    resetForm()
    showSuccess('Customer deleted')
  }

  const filteredCustomers = customers.filter((c) => {
    const text = `${c.first_name || ''} ${c.last_name || ''} ${c.phone || ''} ${c.email || ''}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  if (selectedCustomer) {
    const linkedVehicles = customerVehicles(selectedCustomer.id)
    const linkedRepairOrders = customerRepairOrders(selectedCustomer.id)

    const filteredVehicles = linkedVehicles.filter((v) => {
      const text = `${v.year || ''} ${v.make || ''} ${v.model || ''} ${v.vin || ''} ${v.mileage || ''} ${v.status || ''}`.toLowerCase()
      return text.includes(vehicleSearch.toLowerCase())
    })

    const filteredRepairOrders = linkedRepairOrders.filter((ro) => {
      const text = `${ro.ro_number || ''} ${ro.status || ''} ${ro.technician || ''}`.toLowerCase()
      return text.includes(repairSearch.toLowerCase())
    })

    return (
      <>
        {successMsg && <div className="saveToast">{successMsg}</div>}

        <div className="profilePageTop">
          <button className="btn secondary" onClick={() => setSelectedCustomer(null)}>
            ← Back to Customers
          </button>
        </div>

        <div className="customerProfileHero">
          <div className="customerAvatar">{customerInitials(selectedCustomer)}</div>

          <div className="customerHeroInfo">
            <p className="profileEyebrow">Customer Profile</p>
            <h1>{selectedCustomer.first_name} {selectedCustomer.last_name}</h1>
            <p>{selectedCustomer.phone || 'No phone'} <span>•</span> {selectedCustomer.email || 'No email'}</p>
          </div>

          <div className="customerStatCards">
            <div className="customerStatCard">
              <span>Vehicles</span>
              <strong>{linkedVehicles.length}</strong>
            </div>

            <div className="customerStatCard">
              <span>Repair Orders</span>
              <strong>{linkedRepairOrders.length}</strong>
            </div>

            <div className="customerStatCard">
              <span>Last Visit</span>
              <strong>{latestVisit(selectedCustomer.id)}</strong>
            </div>
          </div>
        </div>

        {errorMsg && <p className="adminError">{errorMsg}</p>}

        <div className="profileGrid">
          <section className="profilePanel">
            <div className="panelTitle">
              <span>👤</span>
              <h2>Customer Information</h2>
            </div>

            <div className="profileFormGrid">
              <div>
                <label>First Name</label>
                <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>

              <div>
                <label>Last Name</label>
                <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>

              <div>
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>

              <div>
                <label>Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className="wideField">
                <label>Address</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>

              <div className="wideField">
                <label>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div className="profileActions">
              <button className="btn dangerBtn" onClick={deleteCustomer}>Delete Customer</button>
              <button className="btn primary" onClick={updateCustomer}>Save Changes</button>
            </div>
          </section>

          <section className="profilePanel">
            <div className="panelHeader">
              <div className="panelTitle">
                <span>🚗</span>
                <h2>Vehicles</h2>
              </div>

              <input
                className="miniSearch"
                placeholder="Search vehicles..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
              />
            </div>

            {filteredVehicles.length === 0 ? (
              <p className="emptyState">No vehicles found.</p>
            ) : (
              <div className="modernTableWrap">
                <table className="modernTable">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>VIN</th>
                      <th>Mileage</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredVehicles.map((v) => (
                      <tr key={v.id}>
                        <td><strong>{v.year} {v.make} {v.model}</strong></td>
                        <td>{v.vin || '-'}</td>
                        <td>{v.mileage || '-'}</td>
                        <td><span className="statusPill">{v.status || 'Active'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="profilePanel fullWidth">
            <div className="panelHeader">
              <div className="panelTitle">
                <span>🔧</span>
                <h2>Repair History</h2>
              </div>

              <input
                className="miniSearch"
                placeholder="Search repair orders..."
                value={repairSearch}
                onChange={(e) => setRepairSearch(e.target.value)}
              />
            </div>

            {filteredRepairOrders.length === 0 ? (
              <p className="emptyState">No repair orders found.</p>
            ) : (
              <div className="modernTableWrap">
                <table className="modernTable">
                  <thead>
                    <tr>
                      <th>RO #</th>
                      <th>Status</th>
                      <th>Technician</th>
                      <th>Opened</th>
                      <th>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRepairOrders.map((ro) => (
                      <tr key={ro.id}>
                        <td><strong>{ro.ro_number}</strong></td>
                        <td><span className="statusPill">{ro.status || 'Open'}</span></td>
                        <td>{ro.technician || '-'}</td>
                        <td>{ro.opened_at ? new Date(ro.opened_at).toLocaleDateString() : '-'}</td>
                        <td>${Number(ro.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </>
    )
  }

  return (
    <>
      {successMsg && <div className="saveToast">{successMsg}</div>}

      <h1>Customers</h1>

      <div className="pageHeader customerTopBar">
        <input
          className="adminSearch"
          placeholder="Search customers by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button className="btn primary" onClick={() => setShowForm(true)}>
          + Add Customer
        </button>
      </div>

      {errorMsg && <p className="adminError">{errorMsg}</p>}

      <table className="adminTable">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Vehicles</th>
            <th>Repair Orders</th>
            <th>Last Visit</th>
          </tr>
        </thead>

        <tbody>
          {filteredCustomers.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                No customers found.
              </td>
            </tr>
          ) : (
            filteredCustomers.map((c) => (
              <tr key={c.id} onClick={() => openCustomer(c)} style={{ cursor: 'pointer' }}>
                <td>{c.first_name} {c.last_name}</td>
                <td>{c.phone}</td>
                <td>{c.email}</td>
                <td>{customerVehicles(c.id).length}</td>
                <td>{customerRepairOrders(c.id).length}</td>
                <td>{latestVisit(c.id)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showForm && (
        <div className="modalOverlay">
          <div className="modalCard">
            <button className="modalClose" onClick={() => setShowForm(false)}>×</button>

            <h2>Add Customer</h2>

            <input placeholder="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

            <div className="modalActions">
              <button className="btn secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn primary" onClick={saveCustomer}>Save Customer</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
