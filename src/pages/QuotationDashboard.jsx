import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FilePlus, Search, FileText, Calendar, Filter, Clock, CheckCircle, Package, AlertTriangle, X, Plus, Eye, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useSearch } from '../components/Layout';
import { generateInvoiceNumber, generateInvoicePDF } from '../utils/invoiceGenerator';
import './QuotationDashboard.css';
import '../pages/CustomerDashboard.css';

const QuotationDashboard = () => {
  const location = useLocation();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { setPageTitle } = useSearch();
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const navigate = useNavigate();

  // Invoice confirmation modal state
  const [invoiceModal, setInvoiceModal] = useState({ open: false, quote: null });
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  useEffect(() => {
    setPageTitle({ main: 'Quotation Dashboard', sub: 'SALES PIPELINE' });
    fetchQuotations();
  }, [setPageTitle]);

  useEffect(() => {
    setSearchQuery('');
    return () => setSearchQuery('');
  }, [location.pathname]);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotations')
        .select('*, customers(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error fetching quotations:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = quotations.length;
    const pending = quotations.filter(q => q.status?.toUpperCase() === 'PENDING').length;
    const closed = quotations.filter(q => q.status?.toUpperCase() === 'CLOSED').length;
    const draft = quotations.filter(q => q.status?.toUpperCase() === 'DRAFT').length;
    return { total, pending, closed, draft };
  }, [quotations]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      if (statusFilter !== 'All' && q.status?.toUpperCase() !== statusFilter.toUpperCase()) return false;
      if (dateFilter) {
        const qDate = new Date(q.created_at).toISOString().split('T')[0];
        if (qDate !== dateFilter) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          (q.quotation_no?.toLowerCase() || "").includes(query) ||
          (q.customers?.name?.toLowerCase() || "").includes(query)
        );
      }
      return true;
    });
  }, [quotations, searchQuery, statusFilter, dateFilter]);

  const handleQuoteClick = (quote) => {
    if (quote.status === 'Draft') {
      navigate(`/quotations/edit/${quote.id}`);
    } else if (quote.status === 'Pending') {
      setInvoiceModal({ open: true, quote });
    }
  };

  const handleCreateInvoice = async () => {
    const { quote } = invoiceModal;
    if (!quote) return;

    setInvoiceLoading(true);
    try {
      // 1. Check if invoice already exists for this quotation
      const { data: existing } = await supabase
        .from('invoices')
        .select('id, invoice_no')
        .eq('quotation_id', quote.id)
        .single();

      if (existing) {
        alert(`Invoice already exists: ${existing.invoice_no}`);
        setInvoiceModal({ open: false, quote: null });
        setInvoiceLoading(false);
        return;
      }

      // 2. Generate invoice number
      const invoiceNo = await generateInvoiceNumber(quote.quotation_no);

      // 3. Insert invoice record
      const { data: newInvoice, error: insertError } = await supabase
        .from('invoices')
        .insert([{
          invoice_no: invoiceNo,
          quotation_id: quote.id,
          quotation_no: quote.quotation_no,
          customer_id: quote.customer_id,
          items: quote.items,
          total: quote.total,
          cgst: quote.cgst,
          sgst: quote.sgst,
          discount: quote.discount || 0,
          status: 'Active',
          invoice_date: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // 4. Update quotation status → Closed
      await supabase
        .from('quotations')
        .update({ status: 'Closed' })
        .eq('id', quote.id);

      // 5. Generate + upload PDF → get URL → save to DB
      const pdfUrl = await generateInvoicePDF(
        { ...newInvoice },
        quote.customers
      );

      if (pdfUrl) {
        await supabase
          .from('invoices')
          .update({ invoice_pdf_url: pdfUrl })
          .eq('id', newInvoice.id);
      }

      setInvoiceModal({ open: false, quote: null });
      fetchQuotations();
      alert(`✅ Invoice ${invoiceNo} created successfully!`);
    } catch (err) {
      console.error('Invoice creation failed:', err);
      alert(`Invoice creation failed: ${err.message}`);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleViewPDF = (url, quotationNo) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert(`PDF URL not available for quotation ${quotationNo}.`);
    }
  };

  const handleDownloadPDF = async (url, quotationNo) => {
    if (url) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${quotationNo}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      } catch (err) {
        console.error('Download failed:', err);
        // Fallback: open in new tab if download fails
        window.open(url, '_blank');
      }
    } else {
      alert(`PDF URL not available for quotation ${quotationNo}.`);
    }
  };

  return (
    <div className="dashboard-content-wrapper">

      {/* Invoice Confirmation Modal */}
      {invoiceModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white', borderRadius: '20px', padding: '36px',
            maxWidth: '440px', width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '10px' }}>
                  <AlertTriangle size={24} color="#d97706" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', fontWeight: 800 }}>Create Invoice</h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Quotation: <strong>{invoiceModal.quote?.quotation_no}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setInvoiceModal({ open: false, quote: null })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Do you want to create an <strong>Invoice</strong> from this quotation?<br />
              <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>
                ⚠️ This will mark the quotation as <strong>Closed</strong>.
              </span>
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setInvoiceModal({ open: false, quote: null })}
                style={{
                  padding: '12px 24px', borderRadius: '10px', border: '1px solid #e2e8f0',
                  background: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
                }}>
                No, Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={invoiceLoading}
                style={{
                  padding: '12px 24px', borderRadius: '10px', border: 'none',
                  background: '#10b981', color: 'white', fontWeight: 800, cursor: 'pointer',
                  fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                {invoiceLoading ? '⏳ Creating...' : '✅ Yes, Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper"><FileText size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Total Quotes</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}><Clock size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Pending</span>
            <span className="stat-value">{stats.pending}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><CheckCircle size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Invoiced</span>
            <span className="stat-value">{stats.closed}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}><Package size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Drafts</span>
            <span className="stat-value">{stats.draft}</span>
          </div>
        </div>
      </div>

      <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="action-row-left" style={{ flex: '1 1 250px' }}>
          <div className="local-search-box" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search quotations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 16px 10px 42px', borderRadius: '999px', border: '1px solid var(--border-color)', outline: 'none', background: 'white', color: 'var(--text-main)' }}
            />
          </div>
        </div>
        <div className="filter-controls" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="action-stats" style={{ marginRight: '8px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>Total: {filteredQuotations.length}</span>
          </div>
          <div className="date-filter-box" style={{ padding: '8px 12px' }}>
            <Calendar size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
            <input type="date" className="date-input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
          <div className="status-filter-box" style={{ padding: '8px 12px' }}>
            <Filter size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
            <select className="status-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Draft">Draft</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <button className="new-quote-btn" onClick={() => navigate('/quotations/new')} style={{ borderRadius: '999px', padding: '10px 24px', boxShadow: 'var(--shadow-sm)' }}>
            <Plus size={18} />
            <span>New Quotation</span>
          </button>
        </div>
      </div>

      <div className="main-scroll-area">
        <div className="table-container quote-table">
          <div className="table-header">
            <div className="col">QUOTE NUMBER</div>
            <div className="col">CREATION DATE</div>
            <div className="col">CUSTOMER NAME</div>
            <div className="col" style={{ textAlign: 'right' }}>NET AMOUNT</div>
            <div className="col" style={{ textAlign: 'center' }}>STATUS</div>
            <div className="col" style={{ textAlign: 'center' }}>ACTION</div>
          </div>

          {loading ? (
            <div className="table-status">Synchronizing pipeline data...</div>
          ) : filteredQuotations.length === 0 ? (
            <div className="table-status">No matching quotations found.</div>
          ) : (
            <div className="table-body">
              {filteredQuotations.map((quote) => {
                const isPending = quote.status === 'Pending';
                const isDraft = quote.status === 'Draft';
                const isClickable = isPending || isDraft;

                return (
                  <div key={quote.id} className="table-row quote-row">
                    <div className="col" data-label="Quote Number">
                      <span
                        className="quote-no-text"
                        style={{
                          cursor: isClickable ? 'pointer' : 'default',
                          color: isPending ? 'var(--success)' : isDraft ? 'var(--primary-navy)' : 'inherit',
                          textDecoration: isClickable ? 'underline' : 'none',
                          fontWeight: 700
                        }}
                        onClick={() => isClickable && handleQuoteClick(quote)}
                        title={isPending ? 'Click to create Invoice' : isDraft ? 'Click to edit Draft' : ''}
                      >
                        {quote.quotation_no || '-'}
                      </span>
                    </div>
                    <div className="col" data-label="Creation Date">
                      <span className="date-text">{new Date(quote.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div className="col" data-label="Customer Name">
                      <span className="customer-name-bold">{quote.customers?.name || '-'}</span>
                    </div>
                    <div className="col" data-label="Net Amount" style={{ textAlign: 'right' }}>
                      <span className="amount-text">₹{quote.total != null ? Math.round(quote.total).toLocaleString('en-IN') : '0'}</span>
                    </div>
                    <div className="col" data-label="Status" style={{ textAlign: 'center' }}>
                      <span
                        className={`status-pill ${quote.status?.toLowerCase()}`}
                        style={{ cursor: isClickable ? 'pointer' : 'default' }}
                        onClick={() => isClickable && handleQuoteClick(quote)}
                      >
                        {quote.status}
                      </span>
                    </div>
                    <div className="col" data-label="Action" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {quote.pdf_url && (
                        <>
                          <button
                            className="quote-view-btn"
                            onClick={() => handleViewPDF(quote.pdf_url, quote.quotation_no)}
                            title="View Quotation PDF"
                          >
                            <Eye size={14} /> View
                          </button>
                          <button
                            className="quote-download-btn"
                            onClick={() => handleDownloadPDF(quote.pdf_url, quote.quotation_no)}
                            title="Download Quotation PDF"
                          >
                            <Download size={14} /> Download
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuotationDashboard;
