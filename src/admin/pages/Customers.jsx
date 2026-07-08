import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const customerJobStatuses = ['Open', 'Estimate', 'Approved', 'In Progress', 'Waiting on Parts', 'Completed', 'Picked Up', 'Cancelled']

const emptyCustomer = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  notes: ''
}

export default function Customers() {
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [repairOrders, setRepairOrders] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [search, setSearch] = useState('')
  const [repairSearch, setRepairSearch] = useState('')
  const [customerForm, setCustomerForm] = useState(emptyCustomer)

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

  function resetCustomerForm() {
    setCustomerForm(emptyCustomer)
  }

  function customerName(c) {
    if (!c) return 'Walk-In / No Customer'
    return `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed Customer'
  }

  function vehicleName(v) {
    if (!v) return 'No Vehicle Attached'
    return `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim() || 'Vehicle'
  }

  function customerInitials(c) {
    const first = c?.first_name?.[0] || ''
    const last = c?.last_name?.[0] || ''
    return `${first}${last}`.toUpperCase() || 'C'
  }

  function openCustomer(c) {
    setSelectedCustomer(c)
    setRepairSearch('')
    setCustomerForm({
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

  function filteredCustomerRows() {
    return customers.filter((c) => {
      const text = `${c.first_name || ''} ${c.last_name || ''} ${c.phone || ''} ${c.email || ''}`.toLowerCase()
      return text.includes(search.toLowerCase())
    })
  }

  async function saveCustomer() {
    setErrorMsg('')

    const { data, error } = await supabase
      .from('admin_customers')
      .insert({
        first_name: customerForm.firstName,
        last_name: customerForm.lastName,
        phone: customerForm.phone,
        email: customerForm.email,
        address: customerForm.address,
        notes: customerForm.notes
      })
      .select('id, first_name, last_name, phone, email, address, notes, created_at')
      .single()

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setCustomers([data, ...customers])
    setShowCustomerForm(false)
    resetCustomerForm()
    showSuccess('Customer saved')
  }

  async function updateCustomer() {
    setErrorMsg('')

    const { data, error } = await supabase
      .from('admin_customers')
      .update({
        first_name: customerForm.firstName,
        last_name: customerForm.lastName,
        phone: customerForm.phone,
        email: customerForm.email,
        address: customerForm.address,
        notes: customerForm.notes
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
    showSuccess('Customer updated')
  }

  async function updateCustomerJobStatus(jobId, status) {
    setErrorMsg('')

    const { error } = await supabase
      .from('admin_repair_orders')
      .update({ status })
      .eq('id', jobId)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setRepairOrders(repairOrders.map((ro) => ro.id === jobId ? { ...ro, status } : ro))
    showSuccess('Status updated')
  }

  async function deleteCustomer() {
    if (!confirm('Delete this customer? Existing vehicles and jobs may remain depending on database rules.')) return

    const { error } = await supabase
      .from('admin_customers')
      .delete()
      .eq('id', selectedCustomer.id)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setCustomers(customers.filter((c) => c.id !== selectedCustomer.id))
    setSelectedCustomer(null)
    resetCustomerForm()
    showSuccess('Customer deleted')
  }

  if (selectedCustomer) {
    const linkedVehicles = customerVehicles(selectedCustomer.id)
    const linkedRepairOrders = customerRepairOrders(selectedCustomer.id).filter((ro) => {
      const vehicle = vehicles.find((v) => v.id === ro.vehicle_id)
      const text = `${ro.ro_number || ''} ${ro.status || ''} ${ro.technician || ''} ${vehicleName(vehicle)}`.toLowerCase()
      return text.includes(repairSearch.toLowerCase())
    })

    return (
      <>
        {successMsg && <div className="saveToast">{successMsg}</div>}

        <div className="profilePageTop">
          <button className="btn secondary" onClick={() => setSelectedCustomer(null)}>
            ← Back to Customers
          </button>

          <a className="btn primary" href="/admin">
            Go to Jobs
          </a>
        </div>

        <div className="customerProfileHero">
          <div className="customerAvatar">{customerInitials(selectedCustomer)}</div>

          <div className="customerHeroInfo">
            <p className="profileEyebrow">Customer Profile</p>
            <h1>{customerName(selectedCustomer)}</h1>
            <p>{selectedCustomer.phone || 'No phone'} <span>•</span> {selectedCustomer.email || 'No email'}</p>
          </div>

          <div className="customerStatCards">
            <div className="customerStatCard">
              <span>Vehicles</span>
              <strong>{linkedVehicles.length}</strong>
            </div>

            <div className="customerStatCard">
              <span>Jobs</span>
              <strong>{customerRepairOrders(selectedCustomer.id).length}</strong>
            </div>

            <div className="customerStatCard">
              <span>Last Visit</span>
              <strong>{latestVisit(selectedCustomer.id)}</strong>
            </div>
          </div>
        </div>

        {errorMsg && <p className="adminError">{errorMsg}</p>}

        <div className="profileGrid customerOnlyGrid">
          <section className="profilePanel">
            <div className="panelTitle">
              <span>👤</span>
              <h2>Customer Information</h2>
            </div>

            <div className="profileFormGrid">
              <div>
                <label>First Name</label>
                <input value={customerForm.firstName} onChange={(e) => setCustomerForm({ ...customerForm, firstName: e.target.value })} />
              </div>

              <div>
                <label>Last Name</label>
                <input value={customerForm.lastName} onChange={(e) => setCustomerForm({ ...customerForm, lastName: e.target.value })} />
              </div>

              <div>
                <label>Phone</label>
                <input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
              </div>

              <div>
                <label>Email</label>
                <input value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
              </div>

              <div className="wideField">
                <label>Address</label>
                <input value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
              </div>

              <div className="wideField">
                <label>Notes</label>
                <textarea value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} />
              </div>
            </div>

            <div className="profileActions">
              <button className="btn dangerBtn" onClick={deleteCustomer}>Delete Customer</button>
              <button className="btn primary" onClick={updateCustomer}>Save Changes</button>
            </div>
          </section>

          <section className="profilePanel">
            <div className="panelTitle">
              <span>🚗</span>
              <h2>Vehicles</h2>
            </div>

            {linkedVehicles.length === 0 ? (
              <p className="emptyState">No vehicles linked to this customer.</p>
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
                    {linkedVehicles.map((v) => (
                      <tr key={v.id}>
                        <td><strong>{vehicleName(v)}</strong></td>
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
                <h2>Customer Job History</h2>
              </div>

              <input
                className="miniSearch"
                placeholder="Search this customer's jobs..."
                value={repairSearch}
                onChange={(e) => setRepairSearch(e.target.value)}
              />
            </div>

            {linkedRepairOrders.length === 0 ? (
              <p className="emptyState">No jobs found for this customer.</p>
            ) : (
              <div className="modernTableWrap">
                <table className="modernTable">
                  <thead>
                    <tr>
                      <th>RO #</th>
                      <th>Vehicle</th>
                      <th>Status</th>
                      <th>Technician</th>
                      <th>Opened</th>
                      <th>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {linkedRepairOrders.map((ro) => {
                      const vehicle = vehicles.find((v) => v.id === ro.vehicle_id)
                      return (
                        <tr key={ro.id}>
                          <td><strong>{ro.ro_number}</strong></td>
                          <td>{vehicleName(vehicle)}</td>
                          <td>
                            <select
                              className={`inlineStatus ${String(ro.status || 'Open').toLowerCase().replaceAll(' ', '-')}`}
                              value={ro.status || 'Open'}
                              onChange={(e) => updateCustomerJobStatus(ro.id, e.target.value)}
                            >
                              {customerJobStatuses.map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </td>
                          <td>{ro.technician || '-'}</td>
                          <td>{ro.opened_at ? new Date(ro.opened_at).toLocaleDateString() : '-'}</td>
                          <td>${Number(ro.total || 0).toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </>
    )
  }

  const customerRows = filteredCustomerRows()

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

        <button className="btn primary" onClick={() => setShowCustomerForm(true)}>
          + Add Customer
        </button>
      </div>

      {errorMsg && <p className="adminError">{errorMsg}</p>}

      <section className="profilePanel">
        <div className="panelTitle">
          <span>👥</span>
          <h2>Customer List</h2>
        </div>

        <table className="modernTable workspaceTable">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Vehicles</th>
              <th>Jobs</th>
              <th>Last Visit</th>
            </tr>
          </thead>

          <tbody>
            {customerRows.length === 0 ? (
              <tr>
                <td colSpan="6">No customers found.</td>
              </tr>
            ) : (
              customerRows.map((c) => (
                <tr key={c.id} onClick={() => openCustomer(c)} style={{ cursor: 'pointer' }}>
                  <td><strong>{customerName(c)}</strong></td>
                  <td>{c.phone || '-'}</td>
                  <td>{c.email || '-'}</td>
                  <td>{customerVehicles(c.id).length}</td>
                  <td>{customerRepairOrders(c.id).length}</td>
                  <td>{latestVisit(c.id)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {showCustomerForm && (
        <div className="modalOverlay">
          <div className="modalCard">
            <button className="modalClose" onClick={() => setShowCustomerForm(false)}>×</button>

            <h2>Add Customer</h2>

            <input placeholder="First Name" value={customerForm.firstName} onChange={(e) => setCustomerForm({ ...customerForm, firstName: e.target.value })} />
            <input placeholder="Last Name" value={customerForm.lastName} onChange={(e) => setCustomerForm({ ...customerForm, lastName: e.target.value })} />
            <input placeholder="Phone" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
            <input placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
            <input placeholder="Address" value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
            <textarea placeholder="Notes" value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} />

            <div className="modalActions">
              <button className="btn secondary" onClick={() => setShowCustomerForm(false)}>Cancel</button>
              <button className="btn primary" onClick={saveCustomer}>Save Customer</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
