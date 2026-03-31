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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <h2>Add New Category</h2>
            <p>Create a group for your products</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="top-error-message">
              <Tag size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group full-width">
            <label>Category Name <span className="required">*</span></label>
            <div className="input-with-icon">
              <Tag size={18} className="field-icon" />
              <input
                type="text"
                placeholder="e.g. Grinders, Ovens, etc."
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-modal-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-modal-btn" disabled={loading}>
              {loading ? 'Adding...' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
