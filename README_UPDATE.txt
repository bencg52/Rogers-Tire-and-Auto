Update included:
- Repair Order Save Job now saves to Supabase, refreshes the Jobs grid, closes the edit modal, and shows a success toast.
- If saving fails, the edit window stays open and displays the error so entered data is not lost.
- Invoice line item modal CSS fixed so Item, Description, Qty, Rate, Amount, and Remove stay inside the modal.
- Invoice totals continue to auto-calculate Subtotal, 6% Tax, and Total.
- supabase-invoice-items.sql updated with anon/authenticated RLS policies and grants for admin_invoice_items.
- No localStorage/sessionStorage invoice/job storage is used.
