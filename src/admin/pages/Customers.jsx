import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const emptyCustomer = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  notes: ''
}

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

const emptyRepairOrder = {
  id: null,
  customerId: '',
  vehicleId: '',
  technician: '',
  mileage: '',
  complaint: '',
  diagnosis: '',
  repairs: '',
  status: 'Open'
}

export default function Customers() {
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [showRepairForm, setShowRepairForm] = useState(false)

  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [repairOrders, setRepairOrders] = useState([])

  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [editingRepairOrder, setEditingRepairOrder] = useState(null)

  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [search, setSearch] = useState('')
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [repairSearch, setRepairSearch] = useState('')

  const [customerForm, setCustomerForm] = useState(emptyCustomer)
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle)
  const [repairForm, setRepairForm] = useState(emptyRepairOrder)

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
      .select('*, admin_customers(first_name,last_name)')
      .order('created_at', { ascending: false })

    if (vehicleError) {
      setErrorMsg(vehicleError.message)
      return
    }

    const { data: roData, error: roError } = await supabase
      .from('admin_repair_orders')
      .select(`
        *,
        admin_customers(first_name,last_name,phone,email),
        admin_vehicles(year,make,model,vin,license_plate)
      `)
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

  function resetVehicleForm(customerId = selectedCustomer?.id || '') {
    setVehicleForm({ ...emptyVehicle, customerId })
    setEditingVehicle(null)
  }

  function resetRepairForm(customerId = selectedCustomer?.id || '', vehicleId = '') {
    setRepairForm({ ...emptyRepairOrder, customerId, vehicleId })
    setEditingRepairOrder(null)
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
    setVehicleSearch('')
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

  function allRepairOrderRows() {
    return repairOrders.filter((ro) => {
      const customer = customers.find((c) => c.id === ro.customer_id)
      const vehicle = vehicles.find((v) => v.id === ro.vehicle_id)
      const text = `${ro.ro_number || ''} ${ro.status || ''} ${ro.technician || ''} ${customerName(customer)} ${vehicleName(vehicle)}`.toLowerCase()
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

  async function deleteCustomer() {
    if (!confirm('Delete this customer? Existing vehicles and repair orders may remain depending on database rules.')) return

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

  function openVehicleForm(vehicle = null) {
    if (vehicle) {
      setEditingVehicle(vehicle)
      setVehicleForm({
        id: vehicle.id,
        customerId: vehicle.customer_id || selectedCustomer?.id || '',
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
      resetVehicleForm(selectedCustomer?.id || '')
    }

    setShowVehicleForm(true)
  }

  async function saveVehicle() {
    setErrorMsg('')

    const payload = {
      customer_id: vehicleForm.customerId || selectedCustomer?.id || null,
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
      const { error } = await supabase
        .from('admin_vehicles')
        .update(payload)
        .eq('id', editingVehicle.id)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      showSuccess('Vehicle updated')
    } else {
      const { error } = await supabase
        .from('admin_vehicles')
        .insert(payload)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      showSuccess('Vehicle saved')
    }

    setShowVehicleForm(false)
    resetVehicleForm()
    await loadData()
  }

  async function deleteVehicle(vehicleId) {
    if (!confirm('Delete this vehicle?')) return

    const { error } = await supabase
      .from('admin_vehicles')
      .delete()
      .eq('id', vehicleId)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setVehicles(vehicles.filter((v) => v.id !== vehicleId))
    showSuccess('Vehicle deleted')
  }

  function openRepairForm(ro = null, vehicleId = '') {
    if (ro) {
      setEditingRepairOrder(ro)
      setRepairForm({
        id: ro.id,
        customerId: ro.customer_id || selectedCustomer?.id || '',
        vehicleId: ro.vehicle_id || '',
        technician: ro.technician || '',
        mileage: ro.mileage_in || '',
        complaint: ro.customer_complaint || '',
        diagnosis: ro.diagnosis || '',
        repairs: ro.repairs_performed || '',
        status: ro.status || 'Open'
      })
    } else {
      resetRepairForm(selectedCustomer?.id || '', vehicleId)
    }

    setShowRepairForm(true)
  }

  async function saveRepairOrder() {
    setErrorMsg('')

    const payload = {
      customer_id: repairForm.customerId || selectedCustomer?.id || null,
      vehicle_id: repairForm.vehicleId || null,
      technician: repairForm.technician,
      mileage_in: repairForm.mileage,
      customer_complaint: repairForm.complaint,
      diagnosis: repairForm.diagnosis,
      repairs_performed: repairForm.repairs,
      status: repairForm.status
    }

    if (editingRepairOrder) {
      const { error } = await supabase
        .from('admin_repair_orders')
        .update(payload)
        .eq('id', editingRepairOrder.id)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      showSuccess('Repair order updated')
    } else {
      const roNumber = 'RO-' + Date.now().toString().slice(-6)

      const { error } = await supabase
        .from('admin_repair_orders')
        .insert({
          ...payload,
          ro_number: roNumber
        })

      if (error) {
        setErrorMsg(error.message)
        return
      }

      showSuccess('Repair order saved')
    }

    setShowRepairForm(false)
    resetRepairForm()
    await loadData()
  }

  async function deleteRepairOrder(roId) {
    if (!confirm('Delete this repair order?')) return

    const { error } = await supabase
      .from('admin_repair_orders')
      .delete()
      .eq('id', roId)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setRepairOrders(repairOrders.filter((ro) => ro.id !== roId))
    showSuccess('Repair order deleted')
  }

  function workspaceVehicles() {
    if (!selectedCustomer) return vehicles

    return customerVehicles(selectedCustomer.id).filter((v) => {
      const text = `${vehicleName(v)} ${v.vin || ''} ${v.mileage || ''} ${v.status || ''}`.toLowerCase()
      return text.includes(vehicleSearch.toLowerCase())
    })
  }

  function workspaceRepairOrders() {
    if (!selectedCustomer) return allRepairOrderRows()

    return customerRepairOrders(selectedCustomer.id).filter((ro) => {
      const vehicle = vehicles.find((v) => v.id === ro.vehicle_id)
      const text = `${ro.ro_number || ''} ${ro.status || ''} ${ro.technician || ''} ${vehicleName(vehicle)}`.toLowerCase()
      return text.includes(repairSearch.toLowerCase())
    })
  }

  function renderVehicleTable(rows) {
    return (
      <div className="modernTableWrap">
        <table className="modernTable">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>VIN</th>
              <th>Mileage</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <td><strong>{vehicleName(v)}</strong></td>
                <td>{v.vin || '-'}</td>
                <td>{v.mileage || '-'}</td>
                <td><span className="statusPill">{v.status || 'Active'}</span></td>
                <td className="actionCell">
                  <button className="smallBtn" onClick={() => openVehicleForm(v)}>Edit</button>
                  <button className="smallBtn dangerSmall" onClick={() => deleteVehicle(v.id)}>Delete</button>
                  <button className="smallBtn" onClick={() => openRepairForm(null, v.id)}>New RO</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderRepairTable(rows) {
    return (
      <div className="modernTableWrap">
        <table className="modernTable">
          <thead>
            <tr>
              <th>RO #</th>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th>Technician</th>
              <th>Opened</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((ro) => {
              const customer = customers.find((c) => c.id === ro.customer_id)
              const vehicle = vehicles.find((v) => v.id === ro.vehicle_id)

              return (
                <tr key={ro.id}>
                  <td><strong>{ro.ro_number}</strong></td>
                  <td>{customerName(customer)}</td>
                  <td>{vehicleName(vehicle)}</td>
                  <td><span className="statusPill">{ro.status || 'Open'}</span></td>
                  <td>{ro.technician || '-'}</td>
                  <td>{ro.opened_at ? new Date(ro.opened_at).toLocaleDateString() : '-'}</td>
                  <td className="actionCell">
                    <button className="smallBtn" onClick={() => openRepairForm(ro)}>Edit</button>
                    <button className="smallBtn dangerSmall" onClick={() => deleteRepairOrder(ro.id)}>Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  if (selectedCustomer) {
    const linkedVehicles = workspaceVehicles()
    const linkedRepairOrders = workspaceRepairOrders()

    return (
      <>
        {successMsg && <div className="saveToast">{successMsg}</div>}

        <div className="profilePageTop">
          <button className="btn secondary" onClick={() => setSelectedCustomer(null)}>
            ← Back to Customers / Jobs
          </button>

          <button className="btn primary" onClick={() => openRepairForm()}>
            + New Repair Order
          </button>
        </div>

        <div className="customerProfileHero">
          <div className="customerAvatar">{customerInitials(selectedCustomer)}</div>

          <div className="customerHeroInfo">
            <p className="profileEyebrow">Customer Workspace</p>
            <h1>{customerName(selectedCustomer)}</h1>
            <p>{selectedCustomer.phone || 'No phone'} <span>•</span> {selectedCustomer.email || 'No email'}</p>
          </div>

          <div className="customerStatCards">
            <div className="customerStatCard">
              <span>Vehicles</span>
              <strong>{customerVehicles(selectedCustomer.id).length}</strong>
            </div>

            <div className="customerStatCard">
              <span>Repair Orders</span>
              <strong>{customerRepairOrders(selectedCustomer.id).length}</strong>
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
            <div className="panelHeader">
              <div className="panelTitle">
                <span>🚗</span>
                <h2>Vehicles</h2>
              </div>

              <div className="panelTools">
                <input
                  className="miniSearch"
                  placeholder="Search vehicles..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                />

                <button className="btn primary" onClick={() => openVehicleForm()}>
                  + Add Vehicle
                </button>
              </div>
            </div>

            {linkedVehicles.length === 0 ? (
              <p className="emptyState">No vehicles found.</p>
            ) : renderVehicleTable(linkedVehicles)}
          </section>

          <section className="profilePanel fullWidth">
            <div className="panelHeader">
              <div className="panelTitle">
                <span>🔧</span>
                <h2>Repair Orders</h2>
              </div>

              <div className="panelTools">
                <input
                  className="miniSearch"
                  placeholder="Search repair orders..."
                  value={repairSearch}
                  onChange={(e) => setRepairSearch(e.target.value)}
                />

                <button className="btn primary" onClick={() => openRepairForm()}>
                  + New Repair Order
                </button>
              </div>
            </div>

            {linkedRepairOrders.length === 0 ? (
              <p className="emptyState">No repair orders found.</p>
            ) : renderRepairTable(linkedRepairOrders)}
          </section>
        </div>

        {showVehicleForm && renderVehicleModal()}
        {showRepairForm && renderRepairModal()}
      </>
    )
  }

  function renderVehicleModal() {
    return (
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
    )
  }

  function renderRepairModal() {
    const availableVehicles = repairForm.customerId
      ? vehicles.filter((v) => v.customer_id === repairForm.customerId)
      : vehicles

    return (
      <div className="modalOverlay">
        <div className="modalCard wideModal">
          <button className="modalClose" onClick={() => setShowRepairForm(false)}>×</button>

          <h2>{editingRepairOrder ? 'Edit Repair Order' : 'New Repair Order'}</h2>

          <select value={repairForm.customerId} onChange={(e) => setRepairForm({ ...repairForm, customerId: e.target.value, vehicleId: '' })}>
            <option value="">Walk-In / No Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{customerName(c)}</option>
            ))}
          </select>

          <select value={repairForm.vehicleId} onChange={(e) => setRepairForm({ ...repairForm, vehicleId: e.target.value })}>
            <option value="">No Vehicle Attached</option>
            {availableVehicles.map((v) => (
              <option key={v.id} value={v.id}>{vehicleName(v)}</option>
            ))}
          </select>

          <select value={repairForm.status} onChange={(e) => setRepairForm({ ...repairForm, status: e.target.value })}>
            <option>Open</option>
            <option>In Progress</option>
            <option>Waiting on Parts</option>
            <option>Completed</option>
            <option>Picked Up</option>
            <option>Cancelled</option>
          </select>

          <div className="modalGrid">
            <input placeholder="Technician" value={repairForm.technician} onChange={(e) => setRepairForm({ ...repairForm, technician: e.target.value })} />
            <input placeholder="Mileage In" value={repairForm.mileage} onChange={(e) => setRepairForm({ ...repairForm, mileage: e.target.value })} />
          </div>

          <textarea placeholder="Customer Complaint" value={repairForm.complaint} onChange={(e) => setRepairForm({ ...repairForm, complaint: e.target.value })} />
          <textarea placeholder="Diagnosis" value={repairForm.diagnosis} onChange={(e) => setRepairForm({ ...repairForm, diagnosis: e.target.value })} />
          <textarea placeholder="Repairs Performed" value={repairForm.repairs} onChange={(e) => setRepairForm({ ...repairForm, repairs: e.target.value })} />

          <div className="modalActions">
            <button className="btn secondary" onClick={() => setShowRepairForm(false)}>Cancel</button>
            <button className="btn primary" onClick={saveRepairOrder}>{editingRepairOrder ? 'Save Repair Order' : 'Create Repair Order'}</button>
          </div>
        </div>
      </div>
    )
  }

  const jobs = allRepairOrderRows()
  const customerRows = filteredCustomerRows()

  return (
    <>
      {successMsg && <div className="saveToast">{successMsg}</div>}

      <h1>Customers / Jobs</h1>

      <div className="pageHeader customerTopBar">
        <input
          className="adminSearch"
          placeholder="Search customers, jobs, vehicles, phone, VIN, status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="topButtonGroup">
          <button className="btn secondary" onClick={() => openRepairForm()}>
            + Quick Repair Order
          </button>

          <button className="btn primary" onClick={() => setShowCustomerForm(true)}>
            + Add Customer
          </button>
        </div>
      </div>

      {errorMsg && <p className="adminError">{errorMsg}</p>}

      <div className="workspaceGrid">
        <section className="profilePanel">
          <div className="panelTitle">
            <span>👥</span>
            <h2>Customers</h2>
          </div>

          <table className="modernTable workspaceTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Vehicles</th>
                <th>ROs</th>
                <th>Last Visit</th>
              </tr>
            </thead>

            <tbody>
              {customerRows.length === 0 ? (
                <tr>
                  <td colSpan="5">No customers found.</td>
                </tr>
              ) : (
                customerRows.map((c) => (
                  <tr key={c.id} onClick={() => openCustomer(c)} style={{ cursor: 'pointer' }}>
                    <td><strong>{customerName(c)}</strong></td>
                    <td>{c.phone || '-'}</td>
                    <td>{customerVehicles(c.id).length}</td>
                    <td>{customerRepairOrders(c.id).length}</td>
                    <td>{latestVisit(c.id)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="profilePanel">
          <div className="panelTitle">
            <span>🔧</span>
            <h2>Open / Recent Jobs</h2>
          </div>

          {jobs.length === 0 ? (
            <p className="emptyState">No repair orders found.</p>
          ) : renderRepairTable(jobs)}
        </section>
      </div>

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

      {showVehicleForm && renderVehicleModal()}
      {showRepairForm && renderRepairModal()}
    </>
  )
}
