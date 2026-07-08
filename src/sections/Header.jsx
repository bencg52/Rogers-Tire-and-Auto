import { Phone } from 'lucide-react'
import { BUSINESS } from '../config/business'

export default function Header() {
  return (
    <header className="topbar">
      <div className="brand">
        <img
          className="brandSign"
          src="/images/rogers-logo-sign.jpg"
          alt="Roger's Tire -N- Auto"
        />

        <div>
          <strong>{BUSINESS.name}</strong>
          <span>
            {BUSINESS.city}, {BUSINESS.state}
          </span>
        </div>
      </div>

      <nav>
        <a href="#services">Services</a>
        <a href="#tires">Tires</a>
        <a href="#about">About</a>
        <a href="#appointment">Appointments</a>
        <a href="#contact">Contact</a>
        <a href="/admin" className="adminHeaderLink">Admin</a>
      </nav>

      <a className="phone" href={`tel:${BUSINESS.phoneLink}`}>
        <Phone size={18} />
        {BUSINESS.phone}
      </a>
    </header>
  )
}