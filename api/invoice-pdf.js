import { createClient } from '@supabase/supabase-js';

export default async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Invoice ID is required' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lcwaqyxbhaeeujdqqjzh.supabase.co';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase key not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('invoice_pdf_url, invoice_no')
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.invoice_pdf_url) {
      return res.status(404).json({ error: 'PDF not available for this invoice' });
    }

    const filePath = `invoices/${invoice.invoice_no}.pdf`;
    let buffer;
    let downloadError = null;

    try {
      const { data: fileData, error: storageError } = await supabase.storage
        .from('invoice_pdfs')
        .download(filePath);

      if (storageError || !fileData) {
        downloadError = storageError || new Error('Unable to download file from storage');
      } else {
        const arrayBuffer = await fileData.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }
    } catch (e) {
      downloadError = e;
    }

    if (!buffer) {
      const response = await fetch(invoice.invoice_pdf_url);
      if (!response.ok) {
        console.error('Public URL fetch failed:', response.status, response.statusText, downloadError);
        return res.status(404).json({ error: 'PDF file not found in storage' });
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    res.setHeader('Content-Type', 'application/pdf');
    const isDownload = req.query.download === 'true';
    res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${invoice.invoice_no}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);

  } catch (error) {
    console.error('Invoice PDF API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
