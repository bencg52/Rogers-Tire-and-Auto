import { useState } from 'react'
import AdminLayout from './AdminLayout'

export default function AdminLogin() {
  const [loggedIn, setLoggedIn] = useState(false)

  if (loggedIn) {
    return <AdminLayout />
  }

  return (
    <div className="adminLogin">
      <div className="loginCard">
        <h1>Roger's Tire N Auto</h1>
        <p className="adminSubtitle">Secure Administration Portal</p>

        <input type="text" placeholder="Username" />
        <input type="password" placeholder="Password" />

        <button
          className="btn primary adminButton"
          onClick={() => setLoggedIn(true)}
        >
          Sign In
        </button>
      </div>
    </div>
  )
}