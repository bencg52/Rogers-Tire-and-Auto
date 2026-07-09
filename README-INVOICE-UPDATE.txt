Invoice update included:

1. Print PDF now uses a Roger's Tire-N-Auto invoice layout matching the uploaded shop invoice.
2. Jobs now have itemized invoice line items: Item, Description, Qty, Rate, Amount.
3. Invoice subtotal, 6% tax, and total calculate automatically.
4. Invoice line items are stored in Supabase in admin_invoice_items.
5. Nothing is stored in local browser storage for invoices.

IMPORTANT SUPABASE STEP:
Before using the new line-item invoice feature, open Supabase SQL Editor and run:

supabase-invoice-items.sql
