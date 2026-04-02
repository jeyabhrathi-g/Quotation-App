import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Search, TrendingUp, CheckCircle, Eye } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useSearch } from '../components/Layout';
import { useLocation } from 'react-router-dom';
import './InvoiceDashboard.css';

const InvoiceDashboard = () => {
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
        .select('*, customers(name)')
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

  const stats = useMemo(() => ({
    total: invoices.length,
    active: invoices.filter(i => i.status === 'Active').length,
    totalValue: invoices.reduce((s, i) => s + (i.total || 0), 0)
  }), [invoices]);

  const handleDownloadPDF = async (url, invoiceNo) => {
    if (url) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${invoiceNo}.pdf`;
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
      alert('PDF URL not available for this invoice.');
    }
  };

  const handleViewPDF = (url) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('PDF URL not available for this invoice.');
    }
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
          filteredInvoices.map((inv) => (
            <div key={inv.id} className="inv-table-row">
              <div className="inv-inv-no" data-label="Invoice No">{inv.invoice_no}</div>
              <div className="inv-quote-no" data-label="Quotation No">{inv.quotation_no || '-'}</div>
              <div className="inv-customer" data-label="Customer">{inv.customers?.name || '-'}</div>
              <div className="inv-date" data-label="Date">
                {inv.invoice_date
                  ? new Date(inv.invoice_date).toLocaleDateString('en-GB')
                  : new Date(inv.created_at).toLocaleDateString('en-GB')}
              </div>
              <div className="inv-amount" data-label="Amount">₹{Math.round(inv.total || 0).toLocaleString('en-IN')}</div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  className="inv-view-btn"
                  onClick={() => handleViewPDF(inv.invoice_pdf_url)}
                  title="View Invoice PDF"
                >
                  <Eye size={14} /> View
                </button>
                <button
                  className="inv-download-btn"
                  onClick={() => handleDownloadPDF(inv.invoice_pdf_url, inv.invoice_no)}
                  title="Download Invoice PDF"
                >
                  <Download size={14} /> Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InvoiceDashboard;
