import { Routes, Route } from 'react-router-dom'
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

function dedupeServices(serviceList) {
  const preferredNames = {
    ac: ['a/c service'],
    brakes: ['brake repair', 'brake inspection'],
    diagnostics: ['diagnostics', 'check engine diagnostic'],
    engine: ['engine repair'],
    oil: ['oil change'],
    tires: ['tires & alignment', 'wheel alignment', 'tire rotation']
  }

  function groupFor(service) {
    const text = `${service.category || ''} ${service.service_name || ''} ${service.description || ''}`.toLowerCase()
    const name = String(service.service_name || '').trim().toLowerCase()

    if (!name) return ''
    if (text.includes('a/c') || text.includes('air conditioning')) return 'ac'
    if (text.includes('brake')) return 'brakes'
    if (text.includes('diagnostic') || text.includes('check engine') || text.includes('electrical')) return 'diagnostics'
    if (text.includes('engine')) return 'engine'
    if (text.includes('oil')) return 'oil'
    if (text.includes('tire') || text.includes('alignment')) return 'tires'

    return name
  }

  function priorityFor(service, group) {
    const name = String(service.service_name || '').trim().toLowerCase()
    const rank = preferredNames[group]?.indexOf(name)
    const emptyPricePenalty = Number(service.base_price || 0) <= 0 ? 20 : 0

    return (rank >= 0 ? rank : 10) + emptyPricePenalty
  }

  const selected = new Map()

  ;(serviceList || []).forEach((service) => {
    const group = groupFor(service)
    if (!group) return

    const current = selected.get(group)
    if (!current || priorityFor(service, group) < priorityFor(current, group)) {
      selected.set(group, service)
    }
  })

  return Array.from(selected.values()).sort((a, b) =>
    String(a.service_name || '').localeCompare(String(b.service_name || ''))
  )
}

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

      setServices(dedupeServices(error || !data?.length ? fallbackServices : data))
      setLoading(false)
    }

    loadServices()
  }, [])

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
            Questions, repairs, tires, or inspections — give us a call and we’ll help you get pointed in the right direction.
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
      </section>

      <footer>
        <small>Website managed by Faith Forged Digital.</small>
      </footer>
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
