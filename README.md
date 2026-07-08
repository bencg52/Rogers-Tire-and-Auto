# Rogers Tire & Auto V1
React + Vite + Supabase starter.

Netlify build command: `npm run build`
Publish directory: `dist`

Business data is stored in Supabase. No localStorage/sessionStorage is used for services or appointments.


## Repair order invoice PDF update
Completed and Picked Up repair orders now show a Print PDF button. Settings includes a button back to the customer website.


## Sequential RO numbers
New repair orders now use sequential RO numbers starting at RO-100001, then RO-100002, etc. Existing higher RO numbers are respected.


## RO 100-series fix
New repair orders now start at RO-100001 and ignore older random RO numbers such as RO-775731.
