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

  // ── SELLER + META BLOCK ──────────────────────────────────────────────────────
  autoTable(doc, {
    startY: 16,
    margin: { left: L, right: R },
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 2 },
    body: [
      [
        {
          content: `${appName}\n1/145A, Sarogini Nagar, Kalaikoil Nagar,\nKrishnapuram, Tirunelveli - 627011\nState: Tamil Nadu, Code - 33\nGSTIN: 33SGXPS5865Q1ZJ`,
          styles: { fontStyle: 'bold', cellWidth: 90 }
        },
        {
          content: [
            `Invoice No: ${invoiceData.invoice_no}`,
            `Invoice Date: ${new Date(invoiceData.invoice_date || invoiceData.created_at).toLocaleDateString('en-GB')}`,
            `Due Date: ${new Date(new Date(invoiceData.created_at).getTime() + 7 * 86400000).toLocaleDateString('en-GB')}`,
          ].join('\n'),
          styles: { cellWidth: 'auto' }
        }
      ]
    ],
  });

  let currY = doc.lastAutoTable.finalY;

  // ── BUYER BLOCK ──────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: currY,
    margin: { left: L, right: R },
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 2 },
    body: [
      [
        { content: `Bill To / Buyer Details`, styles: { fontStyle: 'bold', cellWidth: 90 } },
        { content: `Ship To`, styles: { fontStyle: 'bold' } }
      ],
      [
        {
          content: `${customerData?.name || ''}\n${customerData?.address || ''}\n${customerData?.city || ''} ${customerData?.state || ''}\nGSTIN: ${customerData?.gstin || 'N/A'}`,
          styles: { minCellHeight: 18, cellWidth: 90 }
        },
        {
          content: `${customerData?.name || ''}\n${customerData?.address || ''}\n${customerData?.city || ''} ${customerData?.state || ''}`,
          styles: { minCellHeight: 18 }
        }
      ]
    ]
  });

  currY = doc.lastAutoTable.finalY;

  // ── ITEMS TABLE ──────────────────────────────────────────────────────────────
  const itemRows = [];
  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;

  items.forEach((item, index) => {
    const base = item.qty * item.rate;
    const cgstAmt = base * (item.cgst_pct / 100);
    const sgstAmt = base * (item.sgst_pct / 100);
    const grandAmt = base + cgstAmt + sgstAmt;

    taxableTotal += base;
    cgstTotal += cgstAmt;
    sgstTotal += sgstAmt;

    // Main item row
    itemRows.push([
      { content: (index + 1).toString(), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: item.desc, styles: { fontStyle: 'bold' } },
      { content: '---', styles: { halign: 'center' } },
      { content: `${item.qty} nos`, styles: { halign: 'center' } },
      { content: fmt(item.rate, 0), styles: { halign: 'right' } },
      { content: 'nos', styles: { halign: 'center' } },
      { content: fmt(base), styles: { halign: 'right' } }
    ]);
    // Base subtotal repeat
    itemRows.push([
      '', '', '', '', '', '',
      { content: fmt(base), styles: { halign: 'right', fontSize: 7 } }
    ]);
    // CGST sub-row
    itemRows.push([
      '',
      { content: `CGST @ ${item.cgst_pct}%`, styles: { halign: 'right', fontStyle: 'bold' } },
      '', '',
      { content: `${item.cgst_pct} %`, styles: { halign: 'right' } },
      '',
      { content: fmt(cgstAmt), styles: { halign: 'right', fontStyle: 'bold' } }
    ]);
    // SGST sub-row
    itemRows.push([
      '',
      { content: `SGST @ ${item.sgst_pct}%`, styles: { halign: 'right', fontStyle: 'bold' } },
      '', '',
      { content: `${item.sgst_pct} %`, styles: { halign: 'right' } },
      '',
      { content: fmt(sgstAmt), styles: { halign: 'right', fontStyle: 'bold' } }
    ]);
    // Spacer rows
    itemRows.push(['', '', '', '', '', '', '']);
    itemRows.push(['', '', '', '', '', '', '']);
    itemRows.push(['', '', '', '', '', '', '']);
  });

  // Total row — clean separate row with bold right-aligned amount
  const grandTotal = taxableTotal + cgstTotal + sgstTotal - (invoiceData.discount || 0);
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  itemRows.push([
    { content: '', styles: { } },
    { content: 'Total', styles: { halign: 'center', fontStyle: 'bold', fontSize: 9 } },
    { content: '' },
    { content: `${totalQty} nos`, styles: { halign: 'center', fontStyle: 'bold' } },
    { content: '' },
    { content: '' },
    { content: `Rs. ${fmt(grandTotal)}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } }
  ]);

  autoTable(doc, {
    startY: currY,
    margin: { left: 10, right: 10 },
    head: [[
      { content: 'SI\nNo.', styles: { halign: 'center' } },
      { content: 'Description of Goods', styles: { halign: 'center' } },
      { content: 'HSN/SAC', styles: { halign: 'center' } },
      { content: 'Quantity', styles: { halign: 'center' } },
      { content: 'Rate', styles: { halign: 'center' } },
      { content: 'per', styles: { halign: 'center' } },
      { content: 'Amount', styles: { halign: 'right' } }
    ]],
    body: itemRows,
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 1.5 },
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 60 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 'auto', halign: 'right' },
    }
  });

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
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.2 },
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
