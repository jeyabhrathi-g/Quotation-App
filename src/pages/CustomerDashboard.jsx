import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Mail, Phone, MapPin, Hash, UserPlus } from 'lucide-react';
import './CustomerDashboard.css';
import { supabase } from '../supabaseClient';
import { useSearch } from '../components/Layout';
import CustomerModal from '../components/CustomerModal';
import { useNavigate, useLocation } from 'react-router-dom';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { setPageTitle } = useSearch();

  useEffect(() => {
    setPageTitle({ main: 'Customer Dashboard', sub: 'MANAGE CLIENTS' });
    fetchCustomers();
  }, [setPageTitle]);

  useEffect(() => {
    setSearchQuery('');
    return () => setSearchQuery('');
  }, [location.pathname]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      (c.email && c.email.toLowerCase().includes(query))
    );
  }, [customers, searchQuery]);

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDeleteCustomer = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
        setCustomers(customers.filter(c => c.id !== id));
      } catch (error) {
        alert('Error deleting customer: ' + error.message);
      }
    }
  };

  return (
    <div className="dashboard-content-wrapper">
      <div className="page-action-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="action-row-left" style={{ flex: '1 1 300px' }}>
          <div className="local-search-box" style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '999px', border: '1px solid var(--border-color)', outline: 'none', background: 'white', color: 'var(--text-main)' }}
            />
          </div>
        </div>
        <div className="action-row-right" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div className="action-stats">
            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>Total: {filteredCustomers.length}</span>
          </div>
          <button className="register-btn-medium" onClick={handleAddCustomer} style={{ borderRadius: '999px', padding: '12px 28px', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary-navy)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
            <UserPlus size={18} />
            <span>Register Customer</span>
          </button>
        </div>
      </div>

      <div className="main-scroll-area">
        <div className="table-container">
          <div className="table-header simple-view">
            <div className="col profile">CUSTOMER NAME</div>
            <div className="col contact">PHONE NUMBER</div>
            <div className="col address">ADDRESS</div>
          </div>

          {loading ? (
            <div className="table-status">Syncing customers data...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="table-status">No customers found matching your criteria.</div>
          ) : (
            <div className="table-body">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="table-row simple-view" onClick={() => navigate(`/customers/${customer.id}`)} style={{ cursor: 'pointer' }}>
                  <div className="col profile">
                    <div className="avatar">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="customer-details-text">
                      <span className="customer-name-text clickable">{customer.name}</span>
                    </div>
                  </div>

                  <div className="col contact" data-label="Phone Number">
                    <span className="phone-bold">{customer.phone}</span>
                  </div>

                  <div className="col address" data-label="Address">
                    <span className="address-text">{customer.address}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <CustomerModal
          isOpen={isModalOpen}
          customer={selectedCustomer}
          onClose={() => {
            setIsModalOpen(false);
            fetchCustomers();
          }}
        />
      )}
    </div>
  );
};

export default CustomerDashboard;
