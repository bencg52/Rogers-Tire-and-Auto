import { BUSINESS } from '../config/business'

export default function MeetTheShop() {
  return (
    <section id="about" className="meetShop">
      <div className="meetImage">
        <img src="/images/shop-front-angle.jpg.png" alt="Rogers Tire N Auto storefront" />
      </div>

      <div className="meetText">
        <p className="eyebrow">Meet The Shop</p>
        <h2>Local, Honest, Family-Owned Service</h2>

        <p>
          {BUSINESS.name} proudly serves Piedmont and the surrounding Upstate
          with honest automotive repair, tire service, oil changes, brakes,
          diagnostics, alignments, and maintenance.
        </p>

        <ul>
          <li>Honest recommendations</li>
          <li>Fair pricing</li>
          <li>Quality workmanship</li>
          <li>Trusted local reputation</li>
        </ul>

        <a className="btn primary" href="#appointment">
          Schedule Service
        </a>
      </div>
    </section>
  )
}