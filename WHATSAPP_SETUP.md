# WhatsApp Invoice Sharing Setup Guide

## Overview
The Invoice Management system includes a **Share via WhatsApp** feature that sends invoices directly to customers' WhatsApp numbers using the Twilio WhatsApp API.

## Prerequisites

### 1. Twilio Account Setup
1. Sign up at [https://www.twilio.com](https://www.twilio.com)
2. Navigate to **Console → Messaging → Services**
3. Create a new Messaging Service (or use existing one)
4. Add **WhatsApp** as a channel
5. Connect your WhatsApp Business Account or use Twilio's sandbox for testing

### 2. Get Your Credentials
From Twilio Console, obtain:
- **Account SID**: Found in Twilio Console dashboard (looks like: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
- **Auth Token**: Found in Twilio Console dashboard (keep this secret!)
- **WhatsApp From Number**: Your Twilio WhatsApp number (format: `+1234567890`)

### 3. Configure Environment Variables

Add the following to your `.env` file:

```env
# Existing variables
VITE_SUPABASE_URL=https://lcwaqyxbhaeeujdqqjzh.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here

# Add these for WhatsApp sharing
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=+1234567890
```

### 4. Test the Feature
1. Restart the dev server: `npm run dev`
2. Navigate to **Invoice Management**
3. Click the **Share** button on any invoice
4. The system will:
   - Fetch the customer's phone number from the database
   - Generate/retrieve the invoice PDF
   - Send it via WhatsApp to the customer

## How It Works

### Customer Phone Number Format
- Stored in `customers.phone` table as **10 digits** (e.g., `9876543210`)
- System automatically adds India country code: `+91`
- Supported formats:
  - `9876543210` → `+919876543210`
  - `09876543210` → `+919876543210`
  - `919876543210` → `+919876543210`

### API Flow
1. **Frontend** (`InvoiceDashboard.jsx`):
   - User clicks "Share" button
   - Sends POST to `/api/share-invoice-whatsapp?id=invoiceId`

2. **Backend** (`api/share-invoice-whatsapp.js`):
   - Fetches invoice and customer details from Supabase
   - Validates phone number format
   - Calls Twilio WhatsApp API with:
     - Invoice PDF URL
     - Customer's WhatsApp number
     - Message: "Please find your invoice attached."

3. **Twilio** sends the message to customer's WhatsApp

## Troubleshooting

### Error: "WhatsApp sending is not configured"
→ Missing environment variables. Follow step 3 above.

### Error: "Invalid customer phone number format"
→ Customer phone number is missing or in wrong format. Check `customers.phone` table.

### Error: "Failed to send WhatsApp message"
→ Check Twilio credentials are correct. Verify:
- Account SID is active
- Auth Token is current (regenerate if needed)
- WhatsApp From number is correctly configured in Twilio
- Target number is in E.164 format: `+[country code][number]`

### Error: "Invoice PDF not available"
→ Invoice PDF hasn't been generated yet. Generate the PDF first using the quotation builder.

## Testing in Twilio Sandbox

For development/testing:
1. Use Twilio's WhatsApp Sandbox number (provided in Twilio Console)
2. Send a message from your phone to the sandbox number to join
3. Use your testing phone number (in E.164 format) as the target

## Production Considerations

- Use a **production WhatsApp Business Account** instead of sandbox
- Store credentials securely (use Vercel/hosting platform secrets)
- Implement rate limiting to prevent abuse
- Log all WhatsApp sends for audit trail
- Add retry logic for failed sends
