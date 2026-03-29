import React, { useState, useEffect, useRef } from 'react';
import { X, Save, User, Mail, Phone, MapPin, Hash, AlertCircle } from 'lucide-react';
import './CustomerModal.css';
import { supabase } from '../supabaseClient';

const CustomerModal = ({ isOpen, customer, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gst_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        gst_number: customer.gst_number || ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        gst_number: ''
      });
    }
    setValidationErrors({});
    setError(null);
  }, [customer, isOpen]);

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is mandatory';
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is mandatory';
    } else if (!/^\d{10}$/.test(formData.phone)) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }
    if (!formData.address.trim()) errors.address = 'Address is mandatory';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Special handling for phone to only allow digits and max 10
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    // Clear validation error when user types
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    setError(null);

    try {
      if (customer) {
        // Update
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', customer.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('customers')
          .insert([formData]);
        if (error) throw error;
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <h2>{customer ? 'Edit Customer' : 'Register New Customer'}</h2>
            <p>Enter client details below</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="top-error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          
          <div className="form-grid">
            <div className={`form-group ${validationErrors.name ? 'has-error' : ''}`}>
              <label>Name <span className="required">*</span></label>
              <div className="input-with-icon">
                <User size={18} className="field-icon" />
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="Full Name" 
                />
              </div>
              {validationErrors.name && <span className="error-hint">{validationErrors.name}</span>}
            </div>

            <div className="form-group">
              <label>Email ID</label>
              <div className="input-with-icon">
                <Mail size={18} className="field-icon" />
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="email@example.com" 
                />
              </div>
            </div>

            <div className={`form-group ${validationErrors.phone ? 'has-error' : ''}`}>
              <label>Phone Number <span className="required">*</span></label>
              <div className="input-with-icon">
                <Phone size={18} className="field-icon" />
                <input 
                  type="text" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  placeholder="10 digit number" 
                  maxLength={10}
                />
              </div>
              {validationErrors.phone && <span className="error-hint">{validationErrors.phone}</span>}
            </div>

            <div className="form-group">
              <label>GST Number</label>
              <div className="input-with-icon">
                <Hash size={18} className="field-icon" />
                <input 
                  type="text" 
                  name="gst_number" 
                  value={formData.gst_number} 
                  onChange={handleChange} 
                  placeholder="Optional GST" 
                />
              </div>
            </div>

            <div className={`form-group full-width ${validationErrors.address ? 'has-error' : ''}`}>
              <label>Address <span className="required">*</span></label>
              <div className="input-with-icon textarea">
                <MapPin size={18} className="field-icon" />
                <textarea 
                  name="address" 
                  value={formData.address} 
                  onChange={handleChange} 
                  placeholder="Enter full client address..." 
                  rows="3"
                ></textarea>
              </div>
              {validationErrors.address && <span className="error-hint">{validationErrors.address}</span>}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-modal-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-modal-btn" disabled={loading}>
              <Save size={18} />
              {loading ? 'Processing...' : customer ? 'Update Profile' : 'Register Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;
