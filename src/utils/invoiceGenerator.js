import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient';

export const generateInvoiceNumber = async (quotationNo) => {
  // Extract month/year from quotation number e.g. SSV-03-26-Q005 → SSV-03-26-INV
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  const prefix = `SSV-${mm}-${yy}-INV`;

  const { data } = await supabase
    .from('invoices')
    .select('invoice_no')
    .like('invoice_no', `${prefix}%`)
    .order('invoice_no', { ascending: false })
    .limit(1);

  if (data && data.length > 0 && data[0].invoice_no) {
    const lastNum = parseInt(data[0].invoice_no.split('INV')[1], 10);
    return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
  }
  return `${prefix}001`;
};

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };

  const rounded = Math.round(num);
  if (rounded === 0) return 'Zero Rupees Only';
  return convert(rounded) + ' Rupees Only';
};

export const generateInvoicePDF = async (invoiceData, customerData) => {
  const appName = localStorage.getItem('ssv_app_name') || 'SSV Food Tech';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_W = doc.internal.pageSize.getWidth(); // 210
  const MARGIN = 10;
  const SAFE_W = PAGE_W - (MARGIN * 2); // 190
  
  const items = typeof invoiceData.items === 'string' ? JSON.parse(invoiceData.items) : (invoiceData.items || []);

  // Column Widths for Items Table (Sum = 190)
  const COL_W = {
    SL: 12,
    NAME: 85,
    QTY: 18,
    RATE: 25,
    GST: 18,
    AMT: 32
  };

  // Safe number formatter
  const fmt = (n, dec = 2) => {
    if (n === null || n === undefined) return '0.00';
    const fixed = parseFloat(n).toFixed(dec);
    const [int, frac] = fixed.split('.');
    const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return dec > 0 ? `${intFmt}.${frac}` : intFmt;
  };

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Tax Invoice', PAGE_W / 2, 12, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('ORIGINAL FOR RECIPIENT', PAGE_W - MARGIN, 10, { align: 'right' });
  doc.setTextColor(0);

  // ── SELLER + META BLOCK ─────────────────────────────────────────────────────
  // 1. Fetch Company Settings (Dynamic vs Fallback)
  let sellerName = appName;
  let sellerAddress = "1/145A, Sarogini Nagar, Kalaikoil Nagar,\nKrishnapuram, Tirunelveli - 627011";
  let sellerGSTIN = "33SGXPS5865Q1ZJ";
  let sellerPhone = "88072 70873";
  let sellerEmail = "";

  try {
    const { data: settings } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
    if (settings) {
      if (settings.company_name) sellerName = settings.company_name;
      if (settings.address)      sellerAddress = settings.address;
      if (settings.gstin)        sellerGSTIN = settings.gstin;
      if (settings.phone)        sellerPhone = settings.phone;
      if (settings.email)        sellerEmail = settings.email;
    }
  } catch (err) {
    console.error('Error fetching company settings for PDF:', err);
  }

  const fmtDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    const dd = String(date.getDate()).padStart(2, '0');
    const mon = date.toLocaleString('en-GB', { month: 'short' });
    const yy = String(date.getFullYear()).slice(2);
    return `${dd}-${mon}-${yy}`;
  };

  const invoiceDate = fmtDate(invoiceData.invoice_date || invoiceData.created_at);
  
  // Split 190mm into 90 | 50 | 50
  const C1 = 90;
  const C2 = 50;
  const C3 = 50;

  autoTable(doc, {
    startY: 16,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.15, cellPadding: 2 },
    body: [
      [
        {
          content: `${sellerName}\n${sellerAddress}\nGSTIN: ${sellerGSTIN}\nState Name : Tamil Nadu, Code : 33\nContact : ${sellerPhone}${sellerEmail ? '\nEmail : ' + sellerEmail : ''}`,
          rowSpan: 3,
          styles: { fontStyle: 'bold', cellWidth: C1, valign: 'top' }
        },
        { content: 'Invoice No.', styles: { fontStyle: 'bold', cellWidth: C2 } },
        { content: 'Dated', styles: { fontStyle: 'bold', cellWidth: C3 } },
      ],
      [
        { content: invoiceData.invoice_no || '', styles: { fontStyle: 'bold', textColor: [30, 64, 175] } },
        { content: invoiceDate },
      ],
      [
        { content: 'Delivery Note', styles: { cellWidth: C2 } },
        { content: 'Mode/Terms of Payment', styles: { cellWidth: C3 } },
      ],
    ],
  });

  let currY = doc.lastAutoTable.finalY;

  // ── BUYER BLOCK (3-column: 90 | 50 | 50) ───────────────────────────────────
  const buyerLines = [];
  if (customerData?.name)         buyerLines.push(customerData.name);
  if (customerData?.address)      buyerLines.push(customerData.address);
  if (customerData?.phone)        buyerLines.push(`Contact: ${customerData.phone}`);
  const gstNo = customerData?.gst_number || customerData?.gstin || '';
  if (gstNo.trim() !== '')        buyerLines.push(`GSTIN: ${gstNo}`);

  autoTable(doc, {
    startY: currY,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.15, cellPadding: 2 },
    body: [
      [
        { content: 'Buyer (Bill to)', styles: { fontStyle: 'bold', cellWidth: C1 } },
        { content: "Buyer's Order No.", styles: { cellWidth: C2 } },
        { content: 'Dated', styles: { cellWidth: C3 } },
      ],
      [
        {
          content: buyerLines.join('\n'),
          styles: { minCellHeight: 22, cellWidth: C1, fontStyle: 'bold', valign: 'top' },
        },
        { content: 'Dispatch Doc No.', styles: { cellWidth: C2 } },
        { content: 'Delivery Note Date', styles: { cellWidth: C3 } },
      ],
      [
        { content: '', styles: { cellWidth: C1 } },
        { content: 'Dispatched through', styles: { cellWidth: C2 } },
        { content: 'Destination', styles: { cellWidth: C3 } },
      ],
      [
        { content: '', styles: { cellWidth: C1 } },
        { content: 'Terms of Delivery', colSpan: 2, styles: { minCellHeight: 12, valign: 'top' } },
      ],
    ],
  });

  currY = doc.lastAutoTable.finalY;

  // ── ITEMS TABLE ──────────────────────────────────────────────────────────────
  const discountValue = Number(invoiceData.discount || 0);
  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let totalQty = 0;
  const itemRows = [];

  items.forEach((item, index) => {
    const qty = Number(item.qty || 0);
    const rate = Number(item.rate || 0);
    const base = qty * rate;
    const cgstAmt = base * ((Number(item.cgst_pct) || 0) / 100);
    const sgstAmt = base * ((Number(item.sgst_pct) || 0) / 100);
    const rowTotal = base + cgstAmt + sgstAmt;
    const productName = item.desc || item.product_name || item.name || '';

    taxableTotal += base;
    cgstTotal += cgstAmt;
    sgstTotal += sgstAmt;
    totalQty += qty;

    itemRows.push([
      { content: String(index + 1), styles: { halign: 'center' } },
      { content: productName, styles: { fontStyle: 'bold' } },
      { content: qty.toString(), styles: { halign: 'center' } },
      { content: fmt(rate, 2), styles: { halign: 'right' } },
      { content: `${(Number(item.cgst_pct) || 0) + (Number(item.sgst_pct) || 0)}%`, styles: { halign: 'center' } },
      { content: fmt(rowTotal), styles: { halign: 'right' } }
    ]);
  });

  const grandTotal = taxableTotal + cgstTotal + sgstTotal - discountValue;

  autoTable(doc, {
    startY: currY,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'grid',
    head: [[
      { content: 'SI No.', styles: { halign: 'center' } },
      { content: 'Product Name', styles: { halign: 'center' } },
      { content: 'Qty', styles: { halign: 'center' } },
      { content: 'Rate', styles: { halign: 'center' } },
      { content: 'GST', styles: { halign: 'center' } },
      { content: 'Amount', styles: { halign: 'center' } }
    ]],
    body: itemRows,
    styles: {
      fontSize: 8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      cellPadding: 2,
      minCellHeight: 8,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { cellWidth: COL_W.SL },
      1: { cellWidth: COL_W.NAME, overflow: 'linebreak' },
      2: { cellWidth: COL_W.QTY },
      3: { cellWidth: COL_W.RATE },
      4: { cellWidth: COL_W.GST },
      5: { cellWidth: COL_W.AMT }
    }
  });

  currY = doc.lastAutoTable.finalY;

  // ── TOTALS SECTION ─────────────────────────────────────────────────────────
  const labelWidth = SAFE_W - COL_W.AMT; // 158mm
  const valueWidth = COL_W.AMT; // 32mm

  autoTable(doc, {
    startY: currY,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.15, cellPadding: 2 },
    body: [
      [
        { content: 'Subtotal', styles: { halign: 'right', fontStyle: 'bold', cellWidth: labelWidth } },
        { content: fmt(taxableTotal), styles: { halign: 'right', cellWidth: valueWidth } }
      ],
      [
        { content: 'CGST Total', styles: { halign: 'right', fontStyle: 'bold' } },
        { content: fmt(cgstTotal), styles: { halign: 'right' } }
      ],
      [
        { content: 'SGST Total', styles: { halign: 'right', fontStyle: 'bold' } },
        { content: fmt(sgstTotal), styles: { halign: 'right' } }
      ],
      ...(discountValue ? [[
        { content: 'Discount', styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `- ${fmt(discountValue)}`, styles: { halign: 'right' } }
      ]] : []),
      [
        { content: 'Grand Total', styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: fmt(grandTotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } }
      ]
    ],
  });

  // ── AMOUNT IN WORDS ─────────────────────────────────────────────────────────
  currY = doc.lastAutoTable.finalY;

  autoTable(doc, {
    startY: currY,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.15, cellPadding: 2 },
    body: [
      [{ content: 'Amount Chargeable (in words)', styles: { fontStyle: 'normal', fontSize: 7 } }],
      [{ content: numberToWords(grandTotal), styles: { fontStyle: 'bold', fontSize: 8.5 } }]
    ]
  });

  currY = doc.lastAutoTable.finalY + 2;

  // ── TAX SUMMARY (HSN) ──────────────────────────────────────────────────────
  autoTable(doc, {
    startY: currY,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'grid',
    styles: { fontSize: 7.5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.15, cellPadding: 1.5 },
    head: [
      [
        { content: 'HSN/SAC', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Taxable Value', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Central Tax', colSpan: 2, styles: { halign: 'center' } },
        { content: 'State Tax', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Total Tax Amount', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
      ],
      [
        { content: 'Rate', styles: { halign: 'center' } },
        { content: 'Amount', styles: { halign: 'center' } },
        { content: 'Rate', styles: { halign: 'center' } },
        { content: 'Amount', styles: { halign: 'center' } }
      ]
    ],
    body: [
      ...items.map(item => {
        const base = (Number(item.qty) || 0) * (Number(item.rate) || 0);
        return [
          { content: '7222', styles: { halign: 'center' } },
          { content: fmt(base), styles: { halign: 'right' } },
          { content: `${item.cgst_pct}%`, styles: { halign: 'center' } },
          { content: fmt(base * item.cgst_pct / 100), styles: { halign: 'right' } },
          { content: `${item.sgst_pct}%`, styles: { halign: 'center' } },
          { content: fmt(base * item.sgst_pct / 100), styles: { halign: 'right' } },
          { content: fmt(base * (item.cgst_pct + item.sgst_pct) / 100), styles: { halign: 'right' } }
        ];
      }),
      [
        { content: 'Total', styles: { fontStyle: 'bold', halign: 'right' } },
        { content: fmt(taxableTotal), styles: { fontStyle: 'bold', halign: 'right' } },
        '',
        { content: fmt(cgstTotal), styles: { fontStyle: 'bold', halign: 'right' } },
        '',
        { content: fmt(sgstTotal), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: fmt(cgstTotal + sgstTotal), styles: { fontStyle: 'bold', halign: 'right' } }
      ]
    ],
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.15 },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 'auto', halign: 'right' }
    }
  });

  currY = doc.lastAutoTable.finalY + 1;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Tax Amount (in words) :  ${numberToWords(cgstTotal + sgstTotal)}`, MARGIN, currY + 4);

  currY += 8;

  // ── DECLARATION + BANK DETAILS ──────────────────────────────────────────────
  autoTable(doc, {
    startY: currY,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'grid',
    styles: { fontSize: 7.5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.15, cellPadding: 2 },
    body: [
      [
        {
          content: `Declaration\nWe declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.`,
          styles: { cellWidth: 95, valign: 'top', textColor: [0, 0, 150] }
        },
        {
          content: `Company's Bank Details\nBank Name  :  Indian Overseas Bank\nA/c No.          :  271101000008129\nBranch & IFS Code  :  Krishnapuram & IOBA0002711`,
          styles: { cellWidth: 'auto', fontStyle: 'normal' }
        }
      ],
      [
        { content: `Customer's Seal and Signature`, styles: { cellWidth: 95, minCellHeight: 18, valign: 'top' } },
        {
          content: `for ${appName}\n\n\n\nAuthorised Signatory`,
          styles: { cellWidth: 'auto', halign: 'right', valign: 'bottom', minCellHeight: 18 }
        }
      ]
    ]
  });

  currY = doc.lastAutoTable.finalY + 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(0, 0, 150);
  doc.text('This is a Computer Generated Invoice', PAGE_W / 2, currY, { align: 'center' });
  doc.setTextColor(0);

  // ── UPLOAD PDF TO SUPABASE ───────────────────────────────────────────────────
  const pdfBytes = new Uint8Array(doc.output('arraybuffer'));
  const fileName = `invoices/${invoiceData.invoice_no}.pdf`;

  doc.save(`${invoiceData.invoice_no}.pdf`);

  try {
    const { error: uploadError } = await supabase.storage
      .from('invoice_pdfs')
      .upload(fileName, pdfBytes, { upsert: true, contentType: 'application/pdf', cacheControl: '3600' });

    if (uploadError) {
      console.error('[Invoice PDF] Upload failed:', uploadError);
      return null;
    }

    const { data: pubData } = supabase.storage.from('invoice_pdfs').getPublicUrl(fileName);
    return pubData?.publicUrl || null;
  } catch (e) {
    console.error('[Invoice PDF] Unexpected error:', e);
    return null;
  }
};
