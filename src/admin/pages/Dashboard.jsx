export default function Dashboard() {
  return (
    <>
      <h1>Dashboard</h1>
      <p>Welcome back.</p>

      <div className="dashboardGrid">

        <div className="dashCard">
          <h3>🚗 Vehicles in Shop</h3>
          <span>0</span>
        </div>

        <div className="dashCard">
          <h3>📅 Today's Appointments</h3>
          <span>0</span>
        </div>

        <div className="dashCard">
          <h3>🔧 Open Repair Orders</h3>
          <span>0</span>
        </div>

        <div className="dashCard">
          <h3>📦 Purchase Orders</h3>
          <span>0</span>
        </div>

      </div>
    </>
  )
}