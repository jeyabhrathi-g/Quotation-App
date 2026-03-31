import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, MapPin, Hash, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import { supabase } from '../supabaseClient';
import CustomerModal from '../components/CustomerModal';
import './CustomerDashboard.css';

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
      if (error) throw error;
      setCustomer(data);
    } catch (error) {
      console.error('Error:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };



  if (loading) return <div className="table-status">Syncing customer profile...</div>;

  return (
    <div className="dashboard-content-wrapper">
      <div className="detail-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <button className="back-link" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
          <span>Back to Customers</span>
        </button>
        
        <div className="detail-actions">
          <button 
            className="btn-primary" 
            style={{ borderRadius: '999px', padding: '12px 28px', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--primary-navy)', color: 'white', border: 'none', fontWeight: 600 }}
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit2 size={16} />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      <div className="main-scroll-area">
        <div className="detail-card">
          <div className="detail-hero">
            <div className="avatar-lg">
              {customer?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hero-content">
              <h1 className="hero-title">{customer?.name}</h1>
              <p className="hero-subtitle">
                Customer since {new Date(customer?.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="details-grid">
            <div className="info-group">
              <h3 className="group-title">Contact Information</h3>
              <div className="info-item">
                <div className="info-icon"><Phone size={18} /></div>
                <div className="info-text">
                  <span className="info-label">Phone Number</span>
                  <span className="info-value">{customer?.phone}</span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon"><Mail size={18} /></div>
                <div className="info-text">
                  <span className="info-label">Email Address</span>
                  <span className="info-value">{customer?.email || 'Not Provided'}</span>
                </div>
              </div>
            </div>

            <div className="info-group">
              <h3 className="group-title">Business Details</h3>
              <div className="info-item">
                <div className="info-icon"><Hash size={18} /></div>
                <div className="info-text">
                  <span className="info-label">GST Number</span>
                  <span className={`status-badge ${customer?.gst_number ? 'success' : 'danger'}`}>
                    {customer?.gst_number || 'Unregistered'}
                  </span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon"><MapPin size={18} /></div>
                <div className="info-text">
                  <span className="info-label">Billing Address</span>
                  <span className="info-value address">{customer?.address}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <CustomerModal
          isOpen={isEditModalOpen}
          customer={customer}
          onClose={() => {
            setIsEditModalOpen(false);
            fetchCustomer();
          }}
        />
      )}
    </div>
  );
};

export default CustomerDetails;
