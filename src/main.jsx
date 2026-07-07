import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabaseClient'
import { Car, CalendarDays, Phone, Mail, MapPin, ShieldCheck, Wrench, Tire, Gauge, Settings, Lock, Plus, RefreshCw } from 'lucide-react'
import './styles.css'

const starterServices = [
  { service_name: 'Oil Change', category: 'Maintenance', description: 'Conventional, synthetic blend, and full synthetic oil changes.', base_price: 49.99 },
  { service_name: 'Brake Inspection', category: 'Brakes', description: 'Brake pad, rotor, caliper, and fluid inspection.', base_price: 0 },
  { service_name: 'Brake Pad Replacement', category: 'Brakes', description: 'Front or rear brake pad replacement service.', base_price: 159.99 },
  { service_name: 'Tire Rotation', category: 'Tires', description: 'Rotate tires to improve tread life and ride quality.', base_price: 24.99 },
  { service_name: 'Wheel Alignment', category: 'Tires', description: 'Computerized wheel alignment service.', base_price: 89.99 },
  { service_name: 'Check Engine Diagnostic', category: 'Diagnostics', description: 'Scan and diagnose check engine light concerns.', base_price: 89.99 }
]

function App() {
  const [services, setServices] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [serviceForm, setServiceForm] = useState({ service_name: '', category: '', description: '', base_price: '' })
  const [appointmentForm, setAppointmentForm] = useState({ customer_name: '', phone: '', email: '', vehicle_info: '', requested_service: '', notes: '' })

  useEffect(() => { loadDatabaseData() }, [])

  async function loadDatabaseData() {
    setLoading(true)
    const [serviceRes, appointmentRes] = await Promise.all([
      supabase.from('services').select('*').eq('active', true).order('service_name'),
      supabase.from('appointment_requests').select('*').order('created_at', { ascending: false }).limit(20)
    ])
    if (!serviceRes.error) setServices(serviceRes.data || [])
    if (!appointmentRes.error) setAppointments(appointmentRes.data || [])
    setLoading(false)
  }

  async function seedServices() {
    setMessage('Adding starter services to Supabase...')
    const { error } = await supabase.from('services').insert(starterServices)
    if (error) return setMessage('Could not add services: ' + error.message)
    setMessage('Starter services added to the database.')
    loadDatabaseData()
  }

  async function submitAppointment(e) {
    e.preventDefault()
    const { error } = await supabase.from('appointment_requests').insert({ ...appointmentForm, status: 'New' })
    if (error) return setMessage('Appointment request failed: ' + error.message)
    setAppointmentForm({ customer_name: '', phone: '', email: '', vehicle_info: '', requested_service: '', notes: '' })
    setMessage('Appointment request saved to Supabase.')
    loadDatabaseData()
  }

  async function addService(e) {
    e.preventDefault()
    const payload = { ...serviceForm, base_price: Number(serviceForm.base_price || 0), active: true }
    const { error } = await supabase.from('services').insert(payload)
    if (error) return setMessage('Service failed to save: ' + error.message)
    setServiceForm({ service_name: '', category: '', description: '', base_price: '' })
    setMessage('Service saved to Supabase.')
    loadDatabaseData()
  }

  return <div>
    <header className="site-header">
      <div className="brand"><div className="logo"><Tire /></div><div><strong>ROGERS</strong><span>TIRE & AUTO</span></div></div>
      <nav><a href="#services">Services</a><a href="#tires">Tires</a><a href="#appointment">Appointment</a><a href="#admin">Admin</a></nav>
      <a className="call" href="tel:8645550198"><Phone size={18}/> (864) 555-0198</a>
    </header>

    <section className="hero">
      <div className="hero-content">
        <p className="eyebrow">Greenville's neighborhood tire & auto shop</p>
        <h1>Honest repairs. Quality tires. Driven by trust.</h1>
        <p>Service pricing, appointment requests, and admin data are powered by Supabase — not browser storage.</p>
        <div className="hero-actions"><a href="#appointment" className="btn primary">Request Appointment</a><a href="#services" className="btn secondary">View Services</a></div>
      </div>
    </section>

    <section className="trust-row">
      <div><ShieldCheck/> Honest & Fair Pricing</div><div><Wrench/> Experienced Technicians</div><div><Gauge/> Fast Turnaround</div>
    </section>

    <section id="services" className="section light">
      <div className="section-title"><span>Our Services</span><h2>Complete Auto Repair</h2></div>
      {loading ? <p>Loading services from Supabase...</p> : services.length === 0 ? <div className="empty"><p>No services found in Supabase yet.</p><button onClick={seedServices} className="btn primary">Add Starter Services</button></div> :
      <div className="service-grid">{services.map(s => <article className="service-card" key={s.id}><Car/><h3>{s.service_name}</h3><p>{s.description}</p><strong>{Number(s.base_price) > 0 ? `$${Number(s.base_price).toFixed(2)}` : 'Call for pricing'}</strong></article>)}</div>}
    </section>

    <section id="tires" className="section split">
      <div><h2>Tires, Alignments & Maintenance</h2><p>From rotations and balancing to alignments and repairs, Rogers Tire & Auto keeps vehicles safe and road-ready.</p></div>
      <div className="feature-box"><Tire/><h3>Future Phase</h3><p>Tire inventory and purchase order workflows will be added after Phase 1.</p></div>
    </section>

    <section id="appointment" className="section light">
      <div className="section-title"><span>Book Service</span><h2>Request an Appointment</h2></div>
      <form className="form" onSubmit={submitAppointment}>
        <input required placeholder="Full Name" value={appointmentForm.customer_name} onChange={e=>setAppointmentForm({...appointmentForm, customer_name:e.target.value})}/>
        <input required placeholder="Phone Number" value={appointmentForm.phone} onChange={e=>setAppointmentForm({...appointmentForm, phone:e.target.value})}/>
        <input placeholder="Email Address" value={appointmentForm.email} onChange={e=>setAppointmentForm({...appointmentForm, email:e.target.value})}/>
        <input placeholder="Vehicle Information" value={appointmentForm.vehicle_info} onChange={e=>setAppointmentForm({...appointmentForm, vehicle_info:e.target.value})}/>
        <select value={appointmentForm.requested_service} onChange={e=>setAppointmentForm({...appointmentForm, requested_service:e.target.value})}><option value="">Select Service</option>{services.map(s=><option key={s.id}>{s.service_name}</option>)}</select>
        <textarea placeholder="What seems to be the issue?" value={appointmentForm.notes} onChange={e=>setAppointmentForm({...appointmentForm, notes:e.target.value})}/>
        <button className="btn primary">Submit Request</button>
      </form>
    </section>

    <section id="admin" className="section admin-section">
      <div className="section-title"><span>Employee Area</span><h2>Admin Dashboard Shell</h2></div>
      {!adminUnlocked ? <div className="admin-lock"><Lock/><p>Phase 1 admin preview. Full Supabase Auth comes next.</p><button className="btn primary" onClick={()=>setAdminUnlocked(true)}>Open Admin Preview</button></div> :
      <div className="admin-grid">
        <div className="panel"><div className="panel-head"><h3><Settings/> Services Manager</h3><button onClick={loadDatabaseData}><RefreshCw size={16}/></button></div>
          <form onSubmit={addService} className="mini-form">
            <input required placeholder="Service Name" value={serviceForm.service_name} onChange={e=>setServiceForm({...serviceForm, service_name:e.target.value})}/>
            <input placeholder="Category" value={serviceForm.category} onChange={e=>setServiceForm({...serviceForm, category:e.target.value})}/>
            <input placeholder="Price" type="number" step="0.01" value={serviceForm.base_price} onChange={e=>setServiceForm({...serviceForm, base_price:e.target.value})}/>
            <textarea placeholder="Description" value={serviceForm.description} onChange={e=>setServiceForm({...serviceForm, description:e.target.value})}/>
            <button className="btn primary"><Plus size={16}/> Add Service</button>
          </form>
        </div>
        <div className="panel"><h3><CalendarDays/> Appointment Requests</h3>{appointments.length === 0 ? <p>No appointment requests yet.</p> : appointments.map(a=><div className="request" key={a.id}><strong>{a.customer_name}</strong><span>{a.phone}</span><p>{a.vehicle_info} — {a.requested_service}</p></div>)}</div>
      </div>}
      {message && <p className="message">{message}</p>}
    </section>

    <footer><div><strong>Rogers Tire & Auto</strong><p><MapPin size={15}/> 123 Main Street, Greenville, SC</p><p><Mail size={15}/> info@rogerstireandauto.com</p></div><p>© 2026 Rogers Tire & Auto. Phase 1 database-connected build.</p></footer>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
