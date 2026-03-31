import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Plus, FileText, CheckCircle, Trash2, List } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './QuotationBuilder.css';

const QuotationBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { appName } = useAppContext();

  // Reference Data
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  // Quotation Meta State
  const [customerId, setCustomerId] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [currentQuoteNo, setCurrentQuoteNo] = useState(null);

  // Items State
  const [items, setItems] = useState([]);

  // Add Item Draft State
  const [draftCategory, setDraftCategory] = useState('');
  const [draftProduct, setDraftProduct] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftQty, setDraftQty] = useState(1);
  const [draftRate, setDraftRate] = useState('');
  const [draftCgst, setDraftCgst] = useState(9);
  const [draftSgst, setDraftSgst] = useState(9);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDependencies();
    if (id) {
      loadDraft(id);
    } else {
      // Set default dates for new quotation
      const today = new Date();
      setQuoteDate(today.toISOString().split('T')[0]);
      
      const expiry = new Date(today);
      expiry.setDate(today.getDate() + 15);
      setExpiryDate(expiry.toISOString().split('T')[0]);
    }
  }, [id]);

  const loadDraft = async (draftId) => {
    try {
      const { data, error } = await supabase.from('quotations').select('*').eq('id', draftId).single();
      if (data) {
        setCustomerId(data.customer_id);
        setCurrentQuoteNo(data.quotation_no);
        setQuoteDate(data.quotation_date);
        setExpiryDate(data.expiry_date);
        setOverallDiscount(data.discount || 0);
        const parsedItems = typeof data.items === 'string' ? JSON.parse(data.items) : (data.items || []);
        setItems(parsedItems);
        
        // Auto-fill left side builder controls with first item
        if (parsedItems.length > 0) {
          const firstItem = parsedItems[0];
          setDraftProduct(firstItem.product_id || '');
          setDraftDesc(firstItem.desc || '');
          setDraftQty(firstItem.qty || 1);
          setDraftRate(firstItem.rate || '');
          setDraftCgst(firstItem.cgst_pct || 9);
          setDraftSgst(firstItem.sgst_pct || 9);
        }
      }
    } catch (e) {
      console.error('Error loading draft', e);
    }
  };

  // Attempt to recover category when products load
  useEffect(() => {
    if (draftProduct && products.length > 0 && categories.length > 0 && !draftCategory) {
      const prod = products.find(p => p.id === draftProduct);
      if (prod) {
        const cat = categories.find(c => c.category_name === prod.category);
        if (cat) {
          setDraftCategory(cat.id.toString());
        }
      }
    }
  }, [draftProduct, products, categories, draftCategory]);

  const fetchDependencies = async () => {
    try {
      const [cusRes, catRes, prodRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('category').select('*'),
        supabase.from('products').select('*')
      ]);
      if (cusRes.data) setCustomers(cusRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (prodRes.data) setProducts(prodRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!draftCategory) return products;
    const cat = categories.find(c => c.id.toString() === draftCategory);
    return products.filter(p => p.category?.trim() === cat?.category_name?.trim());
  }, [products, categories, draftCategory]);

  const handleProductSelect = (e) => {
    const pId = e.target.value;
    setDraftProduct(pId);
    if (!pId) return;

    const prod = products.find(p => p.id === pId);
    if (prod) {
      setDraftRate(prod.rate || 0);
      setDraftDesc(`${prod.sub_category || ''} - ${prod.Description || ''}`);
    }
  };

  const addItem = () => {
    if (!customerId || !draftCategory || !draftProduct || !draftQty || !draftRate) {
      alert("Please fill all mandatory fields");
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      product_id: draftProduct,
      desc: draftDesc,
      qty: Number(draftQty),
      rate: Number(draftRate),
      cgst_pct: Number(draftCgst),
      sgst_pct: Number(draftSgst)
    };

    setItems([...items, newItem]);
    
    // Reset Add Item Box
    setDraftProduct('');
    setDraftDesc('');
    setDraftQty(1);
    setDraftRate('');
  };

  const removeItem = (itemId) => {
    setItems(items.filter(i => i.id !== itemId));
  };

  const calcTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;

    items.forEach(item => {
      const itemAmount = item.qty * item.rate;
      subtotal += itemAmount;
      const cgstAmt = itemAmount * (item.cgst_pct / 100);
      const sgstAmt = itemAmount * (item.sgst_pct / 100);
      taxTotal += (cgstAmt + sgstAmt);
    });

    const finalTotal = subtotal + taxTotal - Number(overallDiscount);
    return { subtotal, taxTotal, finalTotal };
  };

  const { subtotal, taxTotal, finalTotal } = calcTotals();

  const generateDraftNumber = async () => {
    if (currentQuoteNo && currentQuoteNo.startsWith('Draft')) return currentQuoteNo;
    const { data } = await supabase.from('quotations').select('quotation_no').like('quotation_no', `Draft%`).order('quotation_no', { ascending: false }).limit(1);
    if (data && data.length > 0 && data[0].quotation_no) {
      const lastQ = data[0].quotation_no;
      const lastNum = parseInt(lastQ.replace('Draft', ''), 10);
      return `Draft${String(lastNum + 1).padStart(3, '0')}`;
    }
    return `Draft001`;
  };

  const generateFinalNumber = async () => {
    if (currentQuoteNo && currentQuoteNo.startsWith('SSV-')) return currentQuoteNo;
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(2);
    const prefix = `SSV-${mm}-${yy}-Q`;

    const { data } = await supabase.from('quotations').select('quotation_no').like('quotation_no', `${prefix}%`).order('quotation_no', { ascending: false }).limit(1);

    if (data && data.length > 0 && data[0].quotation_no) {
      const lastQ = data[0].quotation_no;
      const lastNum = parseInt(lastQ.split('-Q')[1], 10);
      return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
    }
    return `${prefix}001`;
  };

  const saveQuotation = async (status, shouldGeneratePdf = false) => {
    if (!customerId) return alert("Please select a customer.");
    if (items.length === 0) return alert("Please add at least one item.");

    setLoading(true);
    try {
      const quoteNo = status === 'Draft' ? await generateDraftNumber() : await generateFinalNumber();
      const primaryItem = items.length > 0 ? items[0] : null;

      const payload = {
        quotation_no: quoteNo,
        customer_id: customerId,
        status: status,
        quotation_date: quoteDate,
        expiry_date: expiryDate,
        total: Math.round(finalTotal),
        discount: Number(overallDiscount),
        cgst: taxTotal / 2,
        sgst: taxTotal / 2,
        qty: primaryItem ? primaryItem.qty : null,
        rate: primaryItem ? primaryItem.rate : null,
        product_id: primaryItem ? primaryItem.product_id : null,
        items: JSON.stringify(items)
      };

      let dbRes;
      if (id) {
        dbRes = await supabase.from('quotations').update(payload).eq('id', id).select('*, customers(*)').single();
      } else {
        dbRes = await supabase.from('quotations').insert([payload]).select('*, customers(*)').single();
      }

      if (dbRes.error) throw dbRes.error;

      // Wait for PDF generation + upload to COMPLETE before navigating away
      // (navigating first would unmount the component and abort the upload)
      if (shouldGeneratePdf && dbRes.data) {
        await generateAndUploadPDF(dbRes.data);
      }

      // Navigate only after everything is done
      navigate('/quotations');
    } catch (err) {
      console.error(err);
      alert('Error saving quotation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getNumberInWords = (amount) => {
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

    const rounded = Math.round(Number(amount) || 0);
    if (rounded === 0) return 'Zero Only';
    return convert(rounded) + ' Only';
  };

  const generateAndUploadPDF = async (quoteData) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(appName, 105, 15, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('1/145A,Sarogini Nagar,Kalaikoil Nagar,Krishnapuram,Tirunelveli-627011 | GSTIN: 33SSVXP5865Q1ZJ', 105, 20, { align: 'center' });

    // Meta Block
    autoTable(doc, {
      startY: 28,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.2
      },
      head: [['Quotation No:', quoteData.quotation_no, 'Quotation Date:', new Date(quoteData.quotation_date).toLocaleDateString('en-GB'), 'Expiry Date:', new Date(quoteData.expiry_date).toLocaleDateString('en-GB')]],
      headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 25 }, 1: { cellWidth: 35 },
        2: { fontStyle: 'bold', cellWidth: 28 }, 3: { cellWidth: 35 },
        4: { fontStyle: 'bold', cellWidth: 25 }, 5: { cellWidth: 'auto' },
      }
    });

    const currY1 = doc.lastAutoTable.finalY;

    // Buyer Grids — show GST number only if available
    autoTable(doc, {
      startY: currY1,
      theme: 'grid',
      styles: { fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 2 },
      body: [
        [{ content: 'BILL TO', styles: { fontStyle: 'bold' } }, { content: 'SHIP TO', styles: { fontStyle: 'bold' } }],
        [
          {
            content: [
              quoteData.customers?.name,
              quoteData.customers?.address,
              `Phone: ${quoteData.customers?.phone || ''}`,
              quoteData.customers?.gst_number ? `GSTIN: ${quoteData.customers.gst_number}` : null
            ].filter(Boolean).join('\n'),
            styles: { minCellHeight: 20 }
          },
          {
            content: [
              quoteData.customers?.name,
              quoteData.customers?.address,
              `Phone: ${quoteData.customers?.phone || ''}`
            ].filter(Boolean).join('\n'),
            styles: { minCellHeight: 20 }
          }
        ]
      ],
      columnStyles: { 0: { cellWidth: '50%' }, 1: { cellWidth: '50%' } }
    });

    let currY = doc.lastAutoTable.finalY + 2;

    // Required PDF Item Fix - Exact strict match to visual sample
    const tableColumn = ["S.NO", "ITEMS", "QTY", "RATE", "Tax %", "AMOUNT"];
    const tableRows = [];
    const currentItems = typeof quoteData.items === 'string' ? JSON.parse(quoteData.items) : (quoteData.items || []);
    
    currentItems.forEach((item, index) => {
      const amt = item.qty * item.rate;
      const combinedTax = (item.cgst_pct || 0) + (item.sgst_pct || 0);
      const taxAmt = amt * (combinedTax / 100);
      const grandAmt = amt + taxAmt;

      tableRows.push([
        (index + 1).toString(),
        item.desc || '',
        item.qty.toString(),
        item.rate.toFixed(0),
        combinedTax.toString(),
        Math.round(grandAmt).toString()
      ]);
    });

    autoTable(doc, {
      startY: currY,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
      headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 80 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 'auto', halign: 'right' },
      }
    });

    currY = doc.lastAutoTable.finalY;

    // Grand total line inside table row mimicking exactly the PDF logic
    autoTable(doc, {
      startY: currY,
      theme: 'grid',
      showHead: false,
      styles: { fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
      body: [
        [
          { content: '', styles: { cellWidth: 15, lineWidth: 0 } },
          { content: '', styles: { cellWidth: 80, lineWidth: 0 } },
          { content: '', styles: { cellWidth: 20, lineWidth: 0 } },
          { content: '', styles: { cellWidth: 25, lineWidth: 0 } },
          { content: 'Grand Total', styles: { fontStyle: 'bold', halign: 'center' } },
          { content: `${Math.round(quoteData.total)}`, styles: { fontStyle: 'bold', halign: 'right' } }
        ]
      ]
    });

    currY = doc.lastAutoTable.finalY + 5;

    // Total Words Box
    autoTable(doc, {
      startY: currY,
      theme: 'grid',
      styles: { fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
      body: [
        [{ content: 'Total Amount In Words:', styles: { fontStyle: 'bold' } }],
        [{ content: getNumberInWords(quoteData.total) }]
      ]
    });

    currY = doc.lastAutoTable.finalY + 5;

    // Layout Footer 2-Col
    autoTable(doc, {
      startY: currY,
      theme: 'grid',
      styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 1 },
      body: [
        [{ content: 'Bank Details', styles: { fontStyle: 'bold'} }, { content: 'Payment QR Code', styles: { fontStyle: 'bold' } }],
        [
          { content: `Name: Sathya R\nIFSC Code: IOBA0002711\nA/C No: 271101000008129\nBank Name: Indian Overseas Bank, Krishnapuram, Tirunelveli` },
          { content: `UPI ID: 8807270873@ibl`, styles: { minCellHeight: 25 } }
        ]
      ],
      columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 'auto' } }
    });

    currY = doc.lastAutoTable.finalY;

    // Terms
    autoTable(doc, {
      startY: currY,
      theme: 'grid',
      styles: { fontSize: 7, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
      body: [
        [{ content: 'Terms and Condition', styles: { fontStyle: 'bold'} }, { content: `Authorized Signatory For ${appName}`, styles: { fontStyle: 'bold', halign: 'center' } }],
        [
          { content: `Payment Terms: 50% advance along with purchase order and 50% before dispatch.\nDelivery Period: 30 working days from the date of advance payment confirmation.\nGST: GST will be charged extra as applicable (CGST + SGST / IGST).\nTransportation: Transportation charges will be extra at actuals.\nWarranty: 6 months warranty on motor against manufacturing defects (excluding wear & tear parts).\nCancellation: Advance payment is non-refundable once production is started.\nForce Majeure: Delivery may be delayed due to circumstances beyond our control.\nJurisdiction: All disputes are subject to Chennai jurisdiction only. Damage or Shortage Of Good in Transit.` },
          { content: `\n\n\n\nSathya R,\n${appName}`, styles: { halign: 'center', valign: 'bottom' } }
        ]
      ],
      columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 'auto' } }
    });

    // Handle File Storage & Download
    const pdfOutput = doc.output('arraybuffer');
    const pdfBytes = new Uint8Array(pdfOutput);
    const fileName = `quotes/${quoteData.quotation_no}.pdf`;

    // Always download locally first
    doc.save(`${quoteData.quotation_no}.pdf`);

    // Then upload to Supabase Storage
    try {
      console.log('[PDF Upload] Starting upload to bucket: quotation_pdfs, file:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('quotation_pdfs')
        .upload(fileName, pdfBytes, {
          upsert: true,
          contentType: 'application/pdf',
          cacheControl: '3600'
        });

      if (uploadError) {
        // Log full error object so we can see exact Supabase rejection reason
        console.error('[PDF Upload] FAILED:', JSON.stringify(uploadError, null, 2));
        alert(
          `⚠️ PDF downloaded locally, but Supabase upload failed!\n\n` +
          `Error: ${uploadError.message}\n\n` +
          `Please check Supabase Storage Policies:\n` +
          `Storage → quotation_pdfs → Policies → Add INSERT policy for anon or authenticated role.`
        );
        return;
      }

      console.log('[PDF Upload] SUCCESS:', uploadData);

      // Get public URL and save to DB
      const { data: pubData } = supabase.storage
        .from('quotation_pdfs')
        .getPublicUrl(fileName);

      if (pubData?.publicUrl) {
        const { error: urlError } = await supabase
          .from('quotations')
          .update({ pdf_url: pubData.publicUrl })
          .eq('id', quoteData.id);

        if (urlError) {
          console.error('[PDF Upload] Failed to save URL to DB:', urlError);
        } else {
          console.log('[PDF Upload] URL saved to DB:', pubData.publicUrl);
        }
      }
    } catch (e) {
      console.error('[PDF Upload] Unexpected error:', e);
      alert(`PDF downloaded, but cloud save failed unexpectedly.\n\nError: ${e.message}`);
    }
  };

  return (
    <div className="builder-container">
      <div className="builder-header">
        <button className="back-link" onClick={() => navigate('/quotations')}>
          <ArrowLeft size={16} /> <span>Back to Quotations</span>
        </button>
      </div>

      <div className="builder-main">
        {/* LEFT PANEL */}
        <div className="builder-panel">
          <div className="panel-header">
            <h2 className="panel-title"><Edit size={20} /> Builder Controls</h2>
            <span className="badge-auto">{currentQuoteNo || 'AUTO-GENERATED'}</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quote Date</label>
              <input type="date" className="form-input" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input type="date" className="form-input" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Select Customer</label>
            <select className="form-select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">-- Select Customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="item-add-box">
            <div className="form-label" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.05em' }}>ADD ITEM TO LIST</div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={draftCategory} onChange={(e) => setDraftCategory(e.target.value)}>
                <option value="">- Category -</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Product / Description</label>
              <select className="form-select" value={draftProduct} onChange={handleProductSelect}>
                <option value="">- Sub Category -</option>
                {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.sub_category} - {p.Description}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Qty</label>
                <input type="number" className="form-input" value={draftQty} onChange={(e) => setDraftQty(e.target.value)} min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">Rate (₹)</label>
                <input type="number" className="form-input" value={draftRate} onChange={(e) => setDraftRate(e.target.value)} />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">CGST (%)</label>
                <input type="number" className="form-input" value={draftCgst} onChange={(e) => setDraftCgst(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">SGST (%)</label>
                <input type="number" className="form-input" value={draftSgst} onChange={(e) => setDraftSgst(e.target.value)} />
              </div>
            </div>

            <button className="add-item-btn" onClick={addItem}>
              <Plus size={18} /> Add Item
            </button>
          </div>

          <div className="form-group" style={{ marginTop: 'auto' }}>
            <label className="form-label">Overall Discount (₹)</label>
            <input type="number" className="form-input" value={overallDiscount} onChange={(e) => setOverallDiscount(e.target.value)} />
          </div>

          <div className="action-row">
            <button className="save-draft-btn" onClick={() => saveQuotation('Draft', false)} disabled={loading}>
              <FileText size={18} /> Save Draft
            </button>
            <button className="save-pdf-btn" onClick={() => saveQuotation('Pending', true)} disabled={loading}>
              <CheckCircle size={18} /> Save & PDF
            </button>
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          <div className="items-list-box">
            <div className="panel-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="panel-title" style={{ fontSize: '0.9rem' }}><List size={18} /> Added Items</h2>
            </div>

            <div className="items-header">
              <div>#</div>
              <div>Description</div>
              <div style={{ textAlign: 'center' }}>Qty</div>
              <div style={{ textAlign: 'right' }}>Rate & Tax</div>
              <div style={{ textAlign: 'center' }}>Actions</div>
            </div>

            <div className="items-list-scroll">
              {items.length === 0 ? (
                <div className="empty-state">No items added yet.</div>
              ) : (
                items.map((item, idx) => (
                  <div key={item.id} className="item-row">
                    <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{idx + 1}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.desc}</div>
                    <div style={{ textAlign: 'center', fontWeight: 600 }}>{item.qty}</div>
                    <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 600 }}>₹{item.rate.toLocaleString()}</div>
                      <div style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>+{item.cgst_pct + item.sgst_pct}%</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button className="icon-btn-delete-small" title="Delete Item" onClick={() => removeItem(item.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="calc-box">
            <div className="calc-row">
              <span>Subtotal:</span>
              <span>₹{Math.round(subtotal).toLocaleString('en-IN')}</span>
            </div>
            <div className="calc-row">
              <span>Tax Total:</span>
              <span>₹{Math.round(taxTotal).toLocaleString('en-IN')}</span>
            </div>
            <div className="calc-row discount">
              <span>Discount:</span>
              <span>-₹{Math.round(overallDiscount).toLocaleString('en-IN')}</span>
            </div>
            <div className="calc-row final-total">
              <span style={{ color: '#4f46e5' }}>Total:</span>
              <span>₹{Math.round(finalTotal).toLocaleString('en-IN')}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default QuotationBuilder;
