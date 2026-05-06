import { createClient } from '@supabase/supabase-js';

const normalizeWhatsappNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
};

const formatWhatsappSender = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.startsWith('whatsapp:')) return trimmed;
  return trimmed.startsWith('+') ? `whatsapp:${trimmed}` : `whatsapp:+${trimmed}`;
};

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Invoice ID is required' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lcwaqyxbhaeeujdqqjzh.supabase.co';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase key not configured' });
  }

  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioWhatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

  if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsappFrom) {
    return res.status(500).json({ error: 'WhatsApp sending is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM.' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('invoice_pdf_url, invoice_no, customers(name, phone)')
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.invoice_pdf_url) {
      return res.status(404).json({ error: 'Invoice PDF not available for this invoice' });
    }

    const customerPhone = invoice.customers?.phone;
    if (!customerPhone) {
      return res.status(400).json({ error: 'Customer phone number not available' });
    }

    const normalizedPhone = normalizeWhatsappNumber(customerPhone);
    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Invalid customer phone number format' });
    }

    const from = formatWhatsappSender(twilioWhatsappFrom);
    const to = `whatsapp:${normalizedPhone}`;

    const whatsappMessage = `Please find your invoice attached.\nInvoice No: ${invoice.invoice_no}`;
    const form = new URLSearchParams();
    form.append('From', from);
    form.append('To', to);
    form.append('Body', whatsappMessage);
    form.append('MediaUrl', invoice.invoice_pdf_url);

    const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`
      },
      body: form
    });

    const twilioText = await twilioResponse.text();
    let twilioResult;
    try {
      twilioResult = JSON.parse(twilioText);
    } catch (parseError) {
      twilioResult = { raw: twilioText };
    }

    if (!twilioResponse.ok) {
      console.error('Twilio WhatsApp error:', {
        status: twilioResponse.status,
        statusText: twilioResponse.statusText,
        body: twilioResult
      });
      return res.status(502).json({
        error: 'Failed to send WhatsApp message',
        status: twilioResponse.status,
        statusText: twilioResponse.statusText,
        details: twilioResult
      });
    }

    return res.status(200).json({ success: true, message: 'Invoice sent over WhatsApp', sid: twilioResult.sid || null });
  } catch (error) {
    console.error('Share invoice WhatsApp error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
