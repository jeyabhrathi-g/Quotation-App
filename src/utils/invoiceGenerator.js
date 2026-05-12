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
  const pageW = doc.internal.pageSize.getWidth();
  const L = 10; // left margin
  const R = 10; // right margin
  const items = typeof invoiceData.items === 'string' ? JSON.parse(invoiceData.items) : (invoiceData.items || []);

  // Safe number formatter — avoids unicode non-breaking spaces from en-IN locale
  const fmt = (n, dec = 2) => {
    const fixed = parseFloat(n).toFixed(dec);
    const [int, frac] = fixed.split('.');
    const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return dec > 0 ? `${intFmt}.${frac}` : intFmt;
  };

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Tax Invoice', pageW / 2, 12, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('ORIGINAL FOR RECIPIENT', pageW - 10, 10, { align: 'right' });

  // ── SELLER + META BLOCK (3-column: 90 | 55 | auto — must match buyer block) ──
  const fmtDate = (d) => {
    const date = new Date(d);
    const dd = String(date.getDate()).padStart(2, '0');
    const mon = date.toLocaleString('en-GB', { month: 'short' });
    const yy = String(date.getFullYear()).slice(2);
    return `${dd}-${mon}-${yy}`;
  };

  const invoiceDate = fmtDate(invoiceData.invoice_date || invoiceData.created_at);
  const COL1 = 90; // shared width — MUST stay identical in buyer block below
  const COL2 = 55;

  autoTable(doc, {
    startY: 16,
    margin: { left: L, right: R },
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 2 },
    body: [
      [
        {
          content: `${appName}\n1/145A, Sarogini Nagar, Kalaikoil Nagar,\nKrishnapuram, Tirunelveli - 627011\nGSTIN: 33SGXPS5865Q1ZJ\nState Name : Tamil Nadu, Code : 627011\nContact : 88072 70873`,
          rowSpan: 3,
          styles: { fontStyle: 'bold', cellWidth: COL1, valign: 'top' }
        },
        { content: 'Invoice No.', styles: { fontStyle: 'bold', cellWidth: COL2 } },
        { content: 'Dated', styles: { fontStyle: 'bold' } },
      ],
      [
        { content: invoiceData.invoice_no || '', styles: { fontStyle: 'bold', cellWidth: COL2 } },
        { content: invoiceDate },
      ],
      [
        { content: 'Delivery Note', styles: { cellWidth: COL2 } },
        { content: 'Mode/Terms of Payment' },
      ],
    ],
  });

  let currY = doc.lastAutoTable.finalY;

  // ── BUYER BLOCK (3-column: 90 | 55 | auto — same as seller block above) ──────
  // Build buyer lines — show GST only if available (DB field is gst_number)
  const buyerLines = [];
  if (customerData?.name)         buyerLines.push(customerData.name);
  if (customerData?.address)      buyerLines.push(customerData.address);
  if (customerData?.phone)        buyerLines.push(`Contact: ${customerData.phone}`);
  const gstNo = customerData?.gst_number || customerData?.gstin || '';
  if (gstNo.trim() !== '')        buyerLines.push(`GSTIN: ${gstNo}`);

  autoTable(doc, {
    startY: currY,
    margin: { left: L, right: R },
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 2 },
    body: [
      [
        { content: 'Buyer (Bill to)', styles: { fontStyle: 'bold', cellWidth: COL1 } },
        { content: "Buyer's Order No.", styles: { cellWidth: COL2 } },
        { content: 'Dated' },
      ],
      [
        {
          content: buyerLines.join('\n'),
          styles: { minCellHeight: 22, cellWidth: COL1, fontStyle: 'bold' },
        },
        { content: 'Dispatch Doc No.', styles: { cellWidth: COL2 } },
        { content: 'Delivery Note Date' },
      ],
      [
        { content: '', styles: { cellWidth: COL1 } },
        { content: 'Dispatched through', styles: { cellWidth: COL2 } },
        { content: 'Destination' },
      ],
      [
        { content: '', styles: { cellWidth: COL1 } },
        { content: 'Terms of Delivery', colSpan: 2, styles: { minCellHeight: 12 } },
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
      { content: String(index + 1), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: productName, styles: { fontStyle: 'bold' } },
      { content: qty.toString(), styles: { halign: 'center' } },
      { content: `₹${fmt(rate, 2)}`, styles: { halign: 'right' } },
      { content: `${(Number(item.cgst_pct) || 0) + (Number(item.sgst_pct) || 0)}%`, styles: { halign: 'center' } },
      { content: `₹${fmt(rowTotal)}`, styles: { halign: 'right' } }
    ]);
  });

  const grandTotal = taxableTotal + cgstTotal + sgstTotal - discountValue;

  autoTable(doc, {
    startY: currY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    head: [[
      { content: 'SI No.', styles: { halign: 'center' } },
      { content: 'Product Name', styles: { halign: 'center' } },
      { content: 'Qty', styles: { halign: 'center' } },
      { content: 'Rate', styles: { halign: 'center' } },
      { content: 'GST', styles: { halign: 'center' } },
      { content: 'Amount', styles: { halign: 'right' } }
    ]],
    body: itemRows,
    styles: {
      fontSize: 8,
      textColor: [17, 24, 39],
      lineColor: [148, 163, 184],
      lineWidth: 0.15,
      cellPadding: 3,
      minCellHeight: 8,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [17, 24, 39],
      fontStyle: 'bold',
      lineColor: [148, 163, 184],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 88 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 'auto', halign: 'right' }
    }
  });

  currY = doc.lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: currY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 8, textColor: [17, 24, 39], lineColor: [148, 163, 184], lineWidth: 0.15, cellPadding: 3 },
    body: [
      [
        { content: 'Subtotal', styles: { halign: 'right', fontStyle: 'bold', cellWidth: 138 } },
        { content: `₹${fmt(taxableTotal)}`, styles: { halign: 'right' } }
      ],
      [
        { content: 'CGST Total', styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `₹${fmt(cgstTotal)}`, styles: { halign: 'right' } }
      ],
      [
        { content: 'SGST Total', styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `₹${fmt(sgstTotal)}`, styles: { halign: 'right' } }
      ],
      ...(discountValue ? [[
        { content: 'Discount', styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `- ₹${fmt(discountValue)}`, styles: { halign: 'right' } }
      ]] : []),
      [
        { content: 'Grand Total', styles: { halign: 'right', fontStyle: 'bold', cellWidth: 138, fillColor: [241, 245, 249] } },
        { content: `₹${fmt(grandTotal)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } }
      ]
    ],
    columnStyles: { 0: { cellWidth: 138 }, 1: { cellWidth: 40, halign: 'right' } }
  });

  currY = doc.lastAutoTable.finalY;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('E. & O.E', pageW - 10, doc.lastAutoTable.finalY - 2, { align: 'right' });

  currY = doc.lastAutoTable.finalY;

  // E. & O.E note
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('E. & O.E', 200, doc.lastAutoTable.finalY - 2, { align: 'right' });

  // Amount Chargeable (no separate Grand Total table - it's in last item row already)
  // Amount in Words
  currY = doc.lastAutoTable.finalY;

  // Amount in Words
  autoTable(doc, {
    startY: currY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 2 },
    body: [
      [{ content: 'Amount Chargeable (in words)', styles: { fontStyle: 'normal', fontSize: 7.5 } }],
      [{ content: numberToWords(grandTotal), styles: { fontStyle: 'bold', fontSize: 9 } }]
    ]
  });

  currY = doc.lastAutoTable.finalY + 2;

  // Tax Summary - matching reference image exactly
  autoTable(doc, {
    startY: currY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 7.5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 1.5 },
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
        const base = item.qty * item.rate;
        return [
          { content: '7222', styles: { halign: 'center' } },
          { content: base.toFixed(2), styles: { halign: 'right' } },
          { content: `${item.cgst_pct}%`, styles: { halign: 'center' } },
          { content: (base * item.cgst_pct / 100).toFixed(2), styles: { halign: 'right' } },
          { content: `${item.sgst_pct}%`, styles: { halign: 'center' } },
          { content: (base * item.sgst_pct / 100).toFixed(2), styles: { halign: 'right' } },
          { content: (base * (item.cgst_pct + item.sgst_pct) / 100).toFixed(2), styles: { halign: 'right' } }
        ];
      }),
      [
        { content: 'Total', styles: { fontStyle: 'bold', halign: 'right' } },
        { content: taxableTotal.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } },
        '',
        { content: cgstTotal.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } },
        '',
        { content: sgstTotal.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: (cgstTotal + sgstTotal).toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } }
      ]
    ],
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 22 }, 1: { cellWidth: 28 }, 2: { cellWidth: 18 },
      3: { cellWidth: 22 }, 4: { cellWidth: 18 }, 5: { cellWidth: 22 }, 6: { cellWidth: 'auto' }
    }
  });

  currY = doc.lastAutoTable.finalY + 2;

  // Tax in words
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Tax Amount (in words) :  ${numberToWords(cgstTotal + sgstTotal)}`, 10, currY + 5);

  currY += 14;

  // Declaration + Bank Details
  autoTable(doc, {
    startY: currY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 7.5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 2 },
    body: [
      [
        {
          content: `Declaration\nWe declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.`,
          styles: { cellWidth: 95, valign: 'top', textColor: [0, 0, 180] }
        },
        {
          content: `Company's Bank Details\nBank Name  :  Indian Overseas Bank\nA/c No.          :  271101000008129\nBranch & IFS Code  :  Krishnapuram & IOBA0002711`,
          styles: { cellWidth: 'auto', fontStyle: 'normal' }
        }
      ],
      [
        { content: `Customer's Seal and Signature`, styles: { cellWidth: 95, minCellHeight: 22, valign: 'top' } },
        {
          content: `for ${appName}\n\n\n\n\nAuthorised Signatory`,
          styles: { cellWidth: 'auto', halign: 'right', valign: 'bottom', minCellHeight: 22 }
        }
      ]
    ]
  });

  currY = doc.lastAutoTable.finalY + 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(0, 0, 180);
  doc.text('This is a Computer Generated Invoice', 105, currY, { align: 'center' });
  doc.setTextColor(0, 0, 0);

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
