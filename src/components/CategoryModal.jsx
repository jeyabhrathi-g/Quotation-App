import React, { useState } from 'react';
import { X, Tag } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './CustomerModal.css'; // Reuse form patterns

const CategoryModal = ({ isOpen, onClose, onCategoryAdded }) => {
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError('Please enter a category name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('category')
        .insert([{ category_name: categoryName.trim() }])
        .select();

      if (error) throw error;
      
      onCategoryAdded(data[0]);
      onClose();
      setCategoryName('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <div className="header-title">
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>NEW CATEGORY</h2>
          </div>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="top-error-message">
              <span>{error}</span>
            </div>
          )}

          <div className="form-group full-width">
            <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>CATEGORY NAME</label>
            <div className="input-with-icon">
              <input
                type="text"
                placeholder="e.g., Grinders"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid #eef2f6',
                  fontSize: '1rem',
                  color: '#1e293b',
                  backgroundColor: '#fff',
                  transition: 'all 0.2s ease'
                }}
                required
              />
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: 'none', padding: '0 0 24px 0', marginTop: '10px' }}>
            <button 
              type="submit" 
              className="submit-modal-btn" 
              style={{ 
                width: '100%', 
                backgroundColor: '#1e293b', 
                color: '#fff',
                height: '52px',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                boxShadow: '0 4px 12px rgba(30, 41, 59, 0.15)'
              }}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'ADD TO CATALOG'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
