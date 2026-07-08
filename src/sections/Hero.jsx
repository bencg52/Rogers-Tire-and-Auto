import { Phone, CalendarDays, Star } from 'lucide-react'
import { BUSINESS } from '../config/business'

export default function Hero() {
  return (
    <section className="hero">
      <div className="heroOverlay">
        <div className="heroText">

          <p className="eyebrow">
            FAMILY OWNED • TRUSTED LOCAL SERVICE
          </p>

          <h1 className="heroTitleOneLine">Rogers Tire N Auto</h1>

          <h2 className="heroSubTitle">
            Honest Auto Repair & Tire Service Since Day One
          </h2>

          <p className="heroDescription">
            Serving Piedmont, Greenville, and the surrounding Upstate with
            honest automotive repair, quality tires, alignments, brake service,
            diagnostics, oil changes, suspension work, A/C repair, and
            dependable maintenance.
          </p>

          <div className="heroButtons">
            <a href="#appointment" className="btn primary">
              <CalendarDays size={18} />
              Schedule Service
            </a>

            <a
              href={`tel:${BUSINESS.phoneLink}`}
              className="btn secondary"
            >
              <Phone size={18} />
              {BUSINESS.phone}
            </a>
          </div>

          <div className="heroBadges">

            <div className="badge">
              <Star size={18} />
              <div>
                <strong>Highly Rated</strong>
                <span>Trusted by Local Customers</span>
              </div>
            </div>

            <div className="badge">
              <Star size={18} />
              <div>
                <strong>Family Owned</strong>
                <span>Proudly Serving Piedmont</span>
              </div>
            </div>

            <div className="badge">
              <Star size={18} />
              <div>
                <strong>Quality Repairs</strong>
                <span>Done Right The First Time</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  )
}