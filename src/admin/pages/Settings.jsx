import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const DEFAULT_SETTINGS = {
  shop_labor_rate: '175.00',
  sales_tax_rate: '0.06'
}

export default function Settings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setErrorMsg('')
    const { data, error } = await supabase
      .from('admin_shop_settings')
      .select('shop_labor_rate, sales_tax_rate')
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      setErrorMsg('Shop settings table needs to be created in Supabase. Run supabase-shop-settings.sql first.')
      return
    }

    if (data) {
      setSettings({
        shop_labor_rate: Number(data.shop_labor_rate || 175).toFixed(2),
        sales_tax_rate: String(data.sales_tax_rate || 0.06)
      })
    }
  }

  async function saveSettings(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setErrorMsg('')

    const payload = {
      id: 1,
      shop_labor_rate: Number(settings.shop_labor_rate || 175),
      sales_tax_rate: Number(settings.sales_tax_rate || 0.06),
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('admin_shop_settings')
      .upsert(payload, { onConflict: 'id' })

    setSaving(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setSettings({
      shop_labor_rate: Number(payload.shop_labor_rate).toFixed(2),
      sales_tax_rate: String(payload.sales_tax_rate)
    })
    setMessage('Settings saved successfully.')
  }

  return (
    <>
      <h1>Settings</h1>

      {message && <div className="successBanner">{message}</div>}
      {errorMsg && <div className="errorBanner">{errorMsg}</div>}

      <div className="detailCard">
        <h2>Shop Settings</h2>
        <p>These values are stored in Supabase and used when creating new repair orders.</p>

        <form className="settingsForm" onSubmit={saveSettings}>
          <div className="formField">
            <label>Default Shop Labor Rate</label>
            <div className="currencyInput settingsCurrencyInput">
              <span>$</span>
              <input
                type="number"
                step="0.01"
                value={settings.shop_labor_rate}
                onChange={(e) => setSettings({ ...settings, shop_labor_rate: e.target.value })}
              />
            </div>
          </div>

          <div className="formField">
            <label>Sales Tax Rate</label>
            <input
              type="number"
              step="0.0001"
              value={settings.sales_tax_rate}
              onChange={(e) => setSettings({ ...settings, sales_tax_rate: e.target.value })}
            />
            <small>6% should be entered as 0.06.</small>
          </div>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

      <div className="detailCard">
        <h2>Website Access</h2>
        <p>Use this button to leave the admin portal and return to the customer-facing website.</p>

        <a className="btn primary" href="/">
          ← Return to Customer Website
        </a>
      </div>
    </>
  )
}
