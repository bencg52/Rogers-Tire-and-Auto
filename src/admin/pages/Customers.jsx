import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Customers() {
  const [showForm, setShowForm] = useState(false)
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  function showSuccess(message) {
    setSuccessMsg(message)
    setTimeout(() => setSuccessMsg(''), 2500)
  }

  async function loadCustomers() {
    const { data, error } = await supabase
      .from('admin_customers')
      .select('id, first_name, last_name, phone, email, address, notes, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setCustomers(data || [])
  }

  function openCustomer(c) {
    setSelectedCustomer(c)
    setForm({
      firstName: c.first_name || '',
      lastName: c.last_name || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      notes: c.notes || ''
    })
  }

  function resetForm() {
    setForm({ firstName: '', lastName: '', phone: '', email: '', address: '', notes: '' })
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

    setCustomers(customers.map(c => c.id === data.id ? data : c))
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

    setCustomers(customers.filter(c => c.id !== selectedCustomer.id))
    setSelectedCustomer(null)
    resetForm()
    showSuccess('Customer deleted')
  }

  if (selectedCustomer) {
    return (
      <>
        {successMsg && <div className="saveToast">{successMsg}</div>}

        <button className="btn secondary" onClick={() => setSelectedCustomer(null)}>
          ← Back to Customers
        </button>

        <div className="detailCard">
          <h1>Edit Customer</h1>

          {errorMsg && <p style={{ color: 'red', fontWeight: 800 }}>{errorMsg}</p>}

          <input placeholder="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <input placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div className="modalActions">
            <button className="btn secondary" onClick={deleteCustomer}>
              Delete Customer
            </button>
            <button className="btn primary" onClick={updateCustomer}>
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

      <h1>Customers</h1>

      <div className="pageHeader">
        <button className="btn primary" onClick={() => setShowForm(true)}>
          + Add Customer
        </button>
      </div>

      {errorMsg && <p style={{ color: 'red', fontWeight: 800 }}>{errorMsg}</p>}

      <table className="adminTable">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Vehicles</th>
            <th>Last Visit</th>
          </tr>
        </thead>

        <tbody>
          {customers.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                No customers found.
              </td>
            </tr>
          ) : (
            customers.map((c) => (
              <tr key={c.id} onClick={() => openCustomer(c)} style={{ cursor: 'pointer' }}>
                <td>{c.first_name} {c.last_name}</td>
                <td>{c.phone}</td>
                <td>{c.email}</td>
                <td>0</td>
                <td>-</td>
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