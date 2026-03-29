import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Eye, Search, TrendingUp, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useSearch } from '../components/Layout';
import './InvoiceDashboard.css';

const InvoiceDashboard = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { searchQuery, setSearchQuery, setPageTitle } = useSearch();

  useEffect(() => {
    setPageTitle({ main: 'Invoice Management', sub: 'BILLING & SETTLEMENTS' });
    fetchInvoices();
  }, []);

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
          <div className="inv-stat-icon" style={{ background: '#eff6ff' }}><FileText size={22} color="#3b82f6" /></div>
          <div>
            <div className="inv-stat-label">Total Invoices</div>
            <div className="inv-stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="inv-stat-card">
          <div className="inv-stat-icon" style={{ background: '#f0fdf4' }}><CheckCircle size={22} color="#10b981" /></div>
          <div>
            <div className="inv-stat-label">Active</div>
            <div className="inv-stat-value">{stats.active}</div>
          </div>
        </div>
        <div className="inv-stat-card">
          <div className="inv-stat-icon" style={{ background: '#fef3c7' }}><TrendingUp size={22} color="#f59e0b" /></div>
          <div>
            <div className="inv-stat-label">Total Value</div>
            <div className="inv-stat-value">₹{Math.round(stats.totalValue).toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="inv-filter-bar">
        <div className="inv-search-box">
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search invoice, quotation, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="inv-search-input"
          />
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
              <div className="inv-inv-no">{inv.invoice_no}</div>
              <div className="inv-quote-no">{inv.quotation_no || '-'}</div>
              <div className="inv-customer">{inv.customers?.name || '-'}</div>
              <div className="inv-date">
                {inv.invoice_date
                  ? new Date(inv.invoice_date).toLocaleDateString('en-GB')
                  : new Date(inv.created_at).toLocaleDateString('en-GB')}
              </div>
              <div className="inv-amount">₹{Math.round(inv.total || 0).toLocaleString('en-IN')}</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  className="inv-view-btn"
                  onClick={() => handleViewPDF(inv.invoice_pdf_url)}
                  title="View Invoice PDF"
                >
                  <Eye size={14} /> View
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
