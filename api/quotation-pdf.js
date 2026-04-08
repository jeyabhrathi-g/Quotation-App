import { createClient } from '@supabase/supabase-js';

export default async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Quotation ID is required' });
  }

  // Use environment variables for Supabase connection
  // These should be set in Vercel project settings
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lcwaqyxbhaeeujdqqjzh.supabase.co';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase key not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // 1. Fetch quotation data
    const { data: quote, error: quoteError } = await supabase
      .from('quotations')
      .select('pdf_url, quotation_no')
      .eq('id', id)
      .single();

    if (quoteError || !quote) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    if (!quote.pdf_url) {
      return res.status(404).json({ error: 'PDF not available for this quotation' });
    }

    // 2. Fetch the file from the URL or Storage
    // Optimization: If the pdf_url is already a public Supabase URL, we can just fetch it.
    const response = await fetch(quote.pdf_url);

    if (!response.ok) {
      console.error('Failed to fetch PDF from storage:', response.statusText);
      return res.status(404).json({ error: 'PDF file not found in storage' });
    }

    const pdfBuffer = await response.arrayBuffer();

    // 3. Set headers and return the PDF
    res.setHeader('Content-Type', 'application/pdf');
    // For view, we use 'inline'. For download, it's 'attachment'. 
    // We can use a query param 'download' to toggle this.
    const isDownload = req.query.download === 'true';
    res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${quote.quotation_no}.pdf"`);
    
    return res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
