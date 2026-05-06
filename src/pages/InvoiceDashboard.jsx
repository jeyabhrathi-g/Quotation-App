import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Search, TrendingUp, CheckCircle, Eye, Send } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useSearch } from '../components/Layout';
import Pagination from '../components/Pagination';
import { sentenceCase } from '../utils/stringUtils';
import { useLocation } from 'react-router-dom';
import './InvoiceDashboard.css';

const InvoiceDashboard = () => {
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sharingInvoiceId, setSharingInvoiceId] = useState(null);
  const itemsPerPage = 8;
  const { setPageTitle } = useSearch();

  useEffect(() => {
    setPageTitle({ main: 'Invoice Management', sub: 'BILLING & SETTLEMENTS' });
    fetchInvoices();
  }, [setPageTitle]);

  useEffect(() => {
    setSearchQuery('');
    return () => setSearchQuery('');
  }, [location.pathname]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name, phone)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    if (!searchQuery) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(inv =>
      (inv.invoice_no?.toLowerCase() || '').includes(q) ||
      (inv.quotation_no?.toLowerCase() || '').includes(q) ||
      (inv.customers?.name?.toLowerCase() || '').includes(q)
    );
  }, [invoices, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const visibleInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  const stats = useMemo(() => ({
    total: invoices.length,
    active: invoices.filter(i => i.status === 'Active').length,
    totalValue: invoices.reduce((s, i) => s + (i.total || 0), 0)
  }), [invoices]);

  const handleViewPDF = (id) => {
    if (id) {
      window.open(`/api/invoice-pdf?id=${id}`, '_blank');
    } else {
      alert('Invoice ID not available.');
    }
  };

  const handleDownloadPDF = (id, invoiceNo) => {
    if (id) {
      const link = document.createElement('a');
      link.href = `/api/invoice-pdf?id=${id}&download=true`;
      link.download = `${invoiceNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      alert('Invoice ID not available.');
    }
  };

  const handleShareInvoice = async (inv) => {
    const { id, invoice_no: invoiceNo, customers } = inv;
    console.log('Share button clicked for Invoice:', invoiceNo);
    if (!id) {
      alert('Invoice ID not available.');
      return;
    }

    setSharingInvoiceId(id);
    try {
      const response = await fetch(`/api/share-invoice-whatsapp?id=${id}`, {
        method: 'POST'
      });
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        result = { error: text || 'Unexpected response from server' };
      }

      if (!response.ok) {
        const msg = result.error || 'Unable to send invoice via WhatsApp.';
        const detail = result.details ? ` Details: ${JSON.stringify(result.details)}` : '';
        const fullError = `${msg}${detail}`;
        
        // Provide helpful guidance for common errors
        if (fullError.includes('not configured') || fullError.includes('TWILIO')) {
          handleFallbackShare(id, invoiceNo, customers?.phone);
          return;
        } else if (fullError.includes('phone') || fullError.includes('invalid')) {
          throw new Error(`${msg}\n\nEnsure the customer's phone number is:\n- Entered correctly in the customer profile\n- In format: 10 digits (e.g., 9876543210)\n- India-based or update country code in settings`);
        }
        throw new Error(fullError);
      }

      alert(`✓ Invoice ${invoiceNo} sent to customer via WhatsApp!`);
    } catch (err) {
      console.error('WhatsApp share failed:', err);
      alert(`Failed to send invoice via WhatsApp:\n\n${err.message || 'Unknown error'}`);
    } finally {
      setSharingInvoiceId(null);
    }
  };

  const handleFallbackShare = (id, invoiceNo, phone) => {
    handleDownloadPDF(id, invoiceNo);
    
    let phoneStr = '';
    if (phone) {
      phoneStr = phone.replace(/\D/g, '');
      if (phoneStr.length === 10) phoneStr = `91${phoneStr}`;
    }
    
    const message = encodeURIComponent(`Please find your invoice attached.\nInvoice No: ${invoiceNo}`);
    const waUrl = phoneStr ? `https://wa.me/${phoneStr}?text=${message}` : `https://wa.me/?text=${message}`;
    
    // Open WhatsApp first to reduce the chance of the popup blocker stopping it
    window.open(waUrl, '_blank');
    
    setTimeout(() => {
      alert(`WhatsApp API is not configured.\n\nThe PDF is being downloaded. A WhatsApp chat will open now.\nPlease manually attach the downloaded PDF (${invoiceNo}.pdf) to the chat.`);
    }, 100);
  };

  return (
    <div className="inv-wrapper">

      {/* Stats */}
      <div className="inv-stats">
        <div className="inv-stat-card">
          <div className="inv-stat-icon"><FileText size={20} /></div>
          <div>
            <div className="inv-stat-label">Total Invoices</div>
            <div className="inv-stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="inv-stat-card">
          <div className="inv-stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><CheckCircle size={20} /></div>
          <div>
            <div className="inv-stat-label">Active</div>
            <div className="inv-stat-value">{stats.active}</div>
          </div>
        </div>
        <div className="inv-stat-card">
          <div className="inv-stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}><TrendingUp size={20} /></div>
          <div>
            <div className="inv-stat-label">Total Value</div>
            <div className="inv-stat-value">₹{Math.round(stats.totalValue).toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      <div className="inv-filter-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="action-row-left" style={{ flex: '1 1 300px' }}>
          <div className="local-search-box" style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search invoices..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '999px', border: '1px solid var(--border-color)', outline: 'none', background: 'white', color: 'var(--text-main)' }}
            />
          </div>
        </div>
        <div className="action-row-right" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div className="action-stats">
            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>Total: {filteredInvoices.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="inv-table-card">
        <div className="inv-table-header">
          <div>INVOICE NO</div>
          <div>QUOTATION NO</div>
          <div>CUSTOMER</div>
          <div>DATE</div>
          <div style={{ textAlign: 'right' }}>AMOUNT</div>
          <div style={{ textAlign: 'center' }}>ACTION</div>
        </div>

        {loading ? (
          <div className="inv-empty">Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="inv-empty">
            <FileText size={40} color="#cbd5e1" />
            <p>No invoices found. Create one from a Pending Quotation.</p>
          </div>
        ) : (
          visibleInvoices.map((inv) => (
            <div key={inv.id} className="inv-table-row">
              <div className="inv-inv-no" data-label="Invoice No">{inv.invoice_no}</div>
              <div className="inv-quote-no" data-label="Quotation No">{inv.quotation_no || '-'}</div>
              <div className="inv-customer" data-label="Customer">{inv.customers?.name ? sentenceCase(inv.customers.name) : '-'}</div>
              <div className="inv-date" data-label="Date">
                {inv.invoice_date
                  ? new Date(inv.invoice_date).toLocaleDateString('en-GB')
                  : new Date(inv.created_at).toLocaleDateString('en-GB')}
              </div>
              <div className="inv-amount" data-label="Amount">₹{Math.round(inv.total || 0).toLocaleString('en-IN')}</div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  className="inv-view-btn"
                  onClick={() => handleViewPDF(inv.id)}
                  title="View Invoice PDF"
                >
                  <Eye size={14} /> View
                </button>
                <button
                  className="inv-share-btn"
                  onClick={() => handleShareInvoice(inv)}
                  title="Share Invoice via WhatsApp"
                  disabled={sharingInvoiceId === inv.id}
                >
                  <Send size={14} /> {sharingInvoiceId === inv.id ? 'Sending...' : 'Share'}
                </button>
                <button
                  className="inv-download-btn"
                  onClick={() => handleDownloadPDF(inv.id, inv.invoice_no)}
                  title="Download Invoice PDF"
                >
                  <Download size={14} /> Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <Pagination
        currentPage={currentPage}
        totalItems={filteredInvoices.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default InvoiceDashboard;
