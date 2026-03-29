import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Mail, Phone, MapPin, Hash, UserPlus } from 'lucide-react';
import './CustomerDashboard.css';
import { supabase } from '../supabaseClient';
import { useSearch } from '../components/Layout';
import CustomerModal from '../components/CustomerModal';

const CustomerDashboard = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const { searchQuery, setSearchQuery, setPageTitle } = useSearch();

  useEffect(() => {
    setPageTitle({ main: 'Customer Dashboard', sub: 'MANAGE CLIENTS' });
    fetchCustomers();
  }, []);

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
      <div className="page-action-bar">
        <div className="content-search-box">
          <Search size={20} className="search-icon-inside" />
          <input
            type="text"
            placeholder="Search by name, phone or email..."
            className="content-search-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="register-btn" onClick={handleAddCustomer}>
          <UserPlus size={20} />
          <span>Register Customer</span>
        </button>
      </div>

      <div className="main-scroll-area">
        <div className="table-container">
          <div className="table-header">
            <div className="col profile">CUSTOMER PROFILE</div>
            <div className="col contact">CONTACT INFO</div>
            <div className="col gst">GST NUMBER</div>
            <div className="col address">ADDRESS</div>
            <div className="col actions">ACTIONS</div>
          </div>

          {loading ? (
            <div className="table-status">Syncing customers data...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="table-status">No customers found matching your criteria.</div>
          ) : (
            <div className="table-body">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="table-row">
                  <div className="col profile">
                    <div className="avatar">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="customer-details-text">
                      <span className="customer-name-text">{customer.name}</span>
                      <span className="email-small-hidden">{customer.email || 'No email provided'}</span>
                    </div>
                  </div>

                  <div className="col contact">
                    <div className="contact-details">
                      <span className="phone-bold">{customer.phone}</span>
                      <span className="email-small-detail">{customer.email || 'no-email'}</span>
                    </div>
                  </div>

                  <div className="col gst">
                    <span className={`gst-badge ${!customer.gst_number ? 'unregistered' : ''}`}>
                      {customer.gst_number || 'UNREGISTERED'}
                    </span>
                  </div>

                  <div className="col address">
                    <span className="address-text">{customer.address}</span>
                  </div>

                  <div className="col actions">
                    <div className="action-buttons">
                      <button className="icon-btn edit" onClick={() => handleEditCustomer(customer)}>
                        <Edit2 size={18} />
                      </button>
                    </div>
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
