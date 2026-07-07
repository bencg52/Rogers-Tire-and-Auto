import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CalendarDays, Car, Gauge, Mail, MapPin, Phone, ShieldCheck, Wrench } from 'lucide-react'
import { supabase, supabaseReady } from './lib/supabase'
import './styles.css'

const fallbackServices = [
  { service_name: 'Brake Repair', category: 'Brakes', description: 'Brake inspections, pads, rotors, and complete brake repair.', base_price: 159.99 },
  { service_name: 'Oil Change', category: 'Maintenance', description: 'Conventional, synthetic blend, and full synthetic oil changes.', base_price: 39.99 },
  { service_name: 'Diagnostics', category: 'Diagnostics', description: 'Check engine light and electrical diagnostics.', base_price: 89.99 },
  { service_name: 'Tires & Alignment', category: 'Tires', description: 'New tires, rotations, balancing, and wheel alignments.', base_price: 89.99 },
  { service_name: 'A/C Service', category: 'A/C', description: 'A/C inspection, recharge, and cooling system service.', base_price: 99.99 },
  { service_name: 'Engine Repair', category: 'Engine', description: 'Engine performance, leaks, belts, hoses, and repair work.', base_price: 149.99 }
]

function App() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', vehicle_info: '', requested_service: '', preferred_date: '', notes: '' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadServices() {
      if (!supabaseReady) { setServices(fallbackServices); setLoading(false); return }
      const { data, error } = await supabase.from('services').select('*').eq('active', true).order('service_name')
      setServices(error || !data?.length ? fallbackServices : data)
      setLoading(false)
    }
    loadServices()
  }, [])

  async function submitAppointment(e) {
    e.preventDefault()
    setMessage('')
    if (!form.full_name || !form.phone) { setMessage('Please enter your name and phone number.'); return }
    if (!supabaseReady) { setMessage('Supabase is not connected yet. Check Netlify environment variables.'); return }
    const payload = { ...form, preferred_date: form.preferred_date || null }
    const { error } = await supabase.from('appointment_requests').insert(payload)
    if (error) setMessage('Could not submit appointment request: ' + error.message)
    else { setMessage('Appointment request submitted. Rogers Tire & Auto will follow up.'); setForm({ full_name: '', phone: '', email: '', vehicle_info: '', requested_service: '', preferred_date: '', notes: '' }) }
  }

  return <>
    <header className="topbar">
      <div className="brand"><div className="logo">R</div><div><strong>ROGERS</strong><span>TIRE & AUTO</span></div></div>
      <nav><a href="#services">Services</a><a href="#tires">Tires</a><a href="#about">About</a><a href="#contact">Contact</a><a href="#login">Employee Login</a></nav>
      <a className="phone" href="tel:8645550198"><Phone size={18}/> (864) 555-0198</a>
    </header>

    <section className="hero">
      <div className="heroText"><p className="eyebrow">Rogers Tire & Auto</p><h1>Honest Repairs. Quality Tires. Built on Trust.</h1><p>Dependable auto repair, maintenance, tires, diagnostics, and alignment service for your neighborhood.</p><div className="actions"><a className="btn primary" href="#appointment">Request Appointment</a><a className="btn secondary" href="#services">View Services</a></div></div>
    </section>

    <section id="services" className="section"><p className="eyebrow center">Our Services</p><h2>Complete Auto Repair</h2>{loading ? <p>Loading services...</p> : <div className="cards">{services.map((s) => <article className="card" key={s.id || s.service_name}><Wrench/><h3>{s.service_name}</h3><p>{s.description}</p><strong>Starting at ${Number(s.base_price || 0).toFixed(2)}</strong></article>)}</div>}</section>

    <section id="tires" className="split"><div><p className="eyebrow">Tires & Alignment</p><h2>New Tires, Rotations, Balancing & Alignments</h2><p>Keep your vehicle safe, smooth, and road-ready with tire service backed by honest recommendations.</p></div><div className="featureGrid"><div><Car/> Tire sales</div><div><Gauge/> Alignment checks</div><div><ShieldCheck/> Safety inspections</div></div></section>

    <section id="about" className="section dark"><p className="eyebrow center">About Us</p><h2>Your Neighborhood Auto Repair Shop</h2><p className="wide">Rogers Tire & Auto is built around clear communication, fair pricing, and reliable repairs. V1 is connected to Supabase so services and appointment requests are database-driven.</p></section>

    <section id="appointment" className="section"><p className="eyebrow center">Book Appointment</p><h2>Request Service</h2><form className="form" onSubmit={submitAppointment}><input placeholder="Full Name *" value={form.full_name} onChange={e=>setForm({...form, full_name:e.target.value})}/><input placeholder="Phone *" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/><input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/><input placeholder="Vehicle info" value={form.vehicle_info} onChange={e=>setForm({...form, vehicle_info:e.target.value})}/><select value={form.requested_service} onChange={e=>setForm({...form, requested_service:e.target.value})}><option value="">Select service</option>{services.map(s=><option key={s.id || s.service_name}>{s.service_name}</option>)}</select><input type="date" value={form.preferred_date} onChange={e=>setForm({...form, preferred_date:e.target.value})}/><textarea placeholder="What seems to be the issue?" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})}/><button className="btn primary">Submit Request</button>{message && <p className="message">{message}</p>}</form></section>

    <section id="contact" className="contact"><div><Mail/> info@rogerstireandauto.com</div><div><Phone/> (864) 555-0198</div><div><MapPin/> Greenville, SC</div><div><CalendarDays/> Mon-Fri 7:30am-5:30pm</div></section>

    <section id="login" className="section login"><h2>Employee Login</h2><p>Admin authentication shell is reserved for Sprint 2.</p><button className="btn secondary">Coming Next</button></section>

    <footer>© 2026 Rogers Tire & Auto. Built on GitHub, Netlify, and Supabase.</footer>
  </>
}

createRoot(document.getElementById('root')).render(<App />)
