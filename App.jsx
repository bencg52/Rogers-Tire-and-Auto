import { Routes, Route, Link } from 'react-router-dom'
import AdminLogin from './admin/AdminLogin'
import MeetTheShop from './sections/MeetTheShop'
import Gallery from './sections/Gallery'
import { BUSINESS } from './config/business'
import { useEffect, useState } from 'react'
import {
  Battery,
  Car,
  CircleDot,
  Clock,
  Gauge,
  Mail,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Snowflake,
  Wrench
} from 'lucide-react'

import { supabase, supabaseReady } from './lib/supabase'
import Header from './sections/Header'
import Hero from './sections/Hero'
import Reviews from './sections/Reviews'
import './styles.css'

const fallbackServices = [
  { service_name: 'Brake Repair', category: 'Brakes', description: 'Brake inspections, pads, rotors, and complete brake repair.', base_price: 159.99 },
  { service_name: 'Oil Change', category: 'Maintenance', description: 'Conventional, synthetic blend, and full synthetic oil changes.', base_price: 39.99 },
  { service_name: 'Diagnostics', category: 'Diagnostics', description: 'Check engine light and electrical diagnostics.', base_price: 89.99 },
  { service_name: 'Tires & Alignment', category: 'Tires', description: 'New tires, rotations, balancing, and wheel alignments.', base_price: 89.99 },
  { service_name: 'A/C Service', category: 'A/C', description: 'A/C inspection, recharge, and cooling system service.', base_price: 99.99 },
  { service_name: 'Engine Repair', category: 'Engine', description: 'Engine performance, leaks, belts, hoses, and repair work.', base_price: 149.99 }
]

function ServiceIcon({ category, name }) {
  const text = `${category || ''} ${name || ''}`.toLowerCase()

  if (text.includes('brake')) return <CircleDot className="serviceIcon" />
  if (text.includes('oil')) return <Gauge className="serviceIcon" />
  if (text.includes('diagnostic') || text.includes('electrical')) return <ShieldCheck className="serviceIcon" />
  if (text.includes('tire') || text.includes('alignment')) return <Car className="serviceIcon" />
  if (text.includes('a/c') || text.includes('ac')) return <Snowflake className="serviceIcon" />
  if (text.includes('engine')) return <Wrench className="serviceIcon" />
  if (text.includes('battery')) return <Battery className="serviceIcon" />

  return <Wrench className="serviceIcon" />
}

function PublicSite() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    vehicle_info: '',
    requested_service: '',
    preferred_date: '',
    notes: ''
  })
  const [message, setMessage] = useState('')

  const phoneNumber = BUSINESS.phone || ''
  const callLink = phoneNumber ? `tel:${phoneNumber}` : '#'

  useEffect(() => {
    async function loadServices() {
      if (!supabaseReady) {
        setServices(fallbackServices)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('service_name')

      setServices(error || !data?.length ? fallbackServices : data)
      setLoading(false)
    }

    loadServices()
  }, [])

  async function submitAppointment(e) {
    e.preventDefault()
    setMessage('')

    if (!form.full_name || !form.phone) {
      setMessage('Please enter your name and phone number.')
      return
    }

    if (!supabaseReady) {
      setMessage('Supabase is not connected yet. Check Netlify environment variables.')
      return
    }

    const payload = { ...form, preferred_date: form.preferred_date || null }
    const { error } = await supabase.from('appointment_requests').insert(payload)

    if (error) {
      setMessage('Could not submit appointment request: ' + error.message)
    } else {
      setMessage("Appointment request submitted. Roger's Tire -N- Auto will follow up.")
      setForm({
        full_name: '',
        phone: '',
        email: '',
        vehicle_info: '',
        requested_service: '',
        preferred_date: '',
        notes: ''
      })
    }
  }

  return (
    <>
      <Header />
      <Hero />

      <section id="services" className="section">
        <p className="eyebrow center">Our Services</p>
        <h2>Complete Auto Repair</h2>

        {loading ? (
          <p>Loading services...</p>
        ) : (
          <div className="cards">
            {services.map((s) => (
              <article className="card" key={s.id || s.service_name}>
                <ServiceIcon category={s.category} name={s.service_name} />
                <h3>{s.service_name}</h3>
                <p>{s.description}</p>
                <strong>Starting at ${Number(s.base_price || 0).toFixed(2)}</strong>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="tires" className="split">
        <div>
          <p className="eyebrow">Tires & Alignment</p>
          <h2>New Tires, Rotations, Balancing & Alignments</h2>
          <p>Keep your vehicle safe, smooth, and road-ready with tire service backed by honest recommendations.</p>
        </div>

        <div className="featureGrid">
          <div><Car /> Tire sales</div>
          <div><Gauge /> Alignment checks</div>
          <div><ShieldCheck /> Safety inspections</div>
        </div>
      </section>

      <MeetTheShop />
      <Gallery />

      <section id="appointment" className="section">
        <p className="eyebrow center">Book Appointment</p>
        <h2>Request Service</h2>

        <form className="form" onSubmit={submitAppointment}>
          <input placeholder="Full Name *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Vehicle info" value={form.vehicle_info} onChange={(e) => setForm({ ...form, vehicle_info: e.target.value })} />

          <select value={form.requested_service} onChange={(e) => setForm({ ...form, requested_service: e.target.value })}>
            <option value="">Select service</option>
            {services.map((s) => (
              <option key={s.id || s.service_name}>{s.service_name}</option>
            ))}
          </select>

          <input type="date" value={form.preferred_date} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} />
          <textarea placeholder="What seems to be the issue?" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <button className="btn primary">Submit Request</button>
          {message && <p className="message">{message}</p>}
        </form>
      </section>

      <section className="section why">
        <p className="eyebrow center">Why Choose Us</p>
        <h2>Auto Repair You Can Actually Trust</h2>

        <div className="cards">
          <article className="card">
            <ShieldCheck />
            <h3>Honest Pricing</h3>
            <p>No surprise charges. We explain the work before we do it.</p>
          </article>

          <article className="card">
            <Wrench />
            <h3>Experienced Techs</h3>
            <p>Reliable repairs for brakes, tires, diagnostics, A/C, and more.</p>
          </article>

          <article className="card">
            <Gauge />
            <h3>Fast Turnaround</h3>
            <p>We work hard to get you safely back on the road quickly.</p>
          </article>
        </div>
      </section>

      <Reviews />

      <section id="contact" className="contact contactUpgrade">
        <div className="contactMain">
          <p className="eyebrow">Need Your Car Fixed?</p>
          <h2>Call Roger's Tire -N- Auto Today</h2>
          <p className="contactText">
            Questions, repairs, tires, inspections, or appointments — give us a call and we’ll help you get pointed in the right direction.
          </p>

          <div className="contactButtons">
            <a className="btn primary" href={callLink}>
              <Phone /> Call Now
            </a>

            <a className="btn secondary" href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer">
              <Navigation /> Get Directions
            </a>
          </div>
        </div>

        <div className="contactInfoBox">
          <div><Phone /> {BUSINESS.phone || 'Phone coming soon'}</div>
          <div><Mail /> {BUSINESS.email || 'Email coming soon'}</div>
          <div><MapPin /> {BUSINESS.fullAddress}</div>
          <div><Clock /> {BUSINESS.hoursSummary}</div>
        </div>

        {phoneNumber && (
          <a className="floatingCall" href={callLink} aria-label="Call Roger's Tire -N- Auto">
            <Phone />
          </a>
        )}
      </section>

      <section id="login" className="section login">
        <h2>Admin Login</h2>
        <p>Authorized shop administration only.</p>
        <Link className="btn secondary" to="/admin">Open Admin Portal</Link>
      </section>

      <footer>© 2026 {BUSINESS.name}. Built on GitHub, Netlify, and Supabase.</footer>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicSite />} />
      <Route path="/admin/*" element={<AdminLogin />} />
    </Routes>
  )
}