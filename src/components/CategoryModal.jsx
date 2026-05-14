import React, { useState, useEffect } from 'react';
import { X, Tag, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from './ToastProvider';
import './CustomerModal.css'; // Reuse form patterns

const CategoryModal = ({ isOpen, category, onClose, onCategoryUpdated }) => {
  const [categoryName, setCategoryName] = useState('');
  const [status, setStatus] = useState('Active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    if (category) {
      setCategoryName(category.category_name || '');
      setStatus(category.status || 'Active');
    } else {
      setCategoryName('');
      setStatus('Active');
    }
  }, [category, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError('Please enter a category name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = { 
        category_name: categoryName.trim(),
        status: status 
      };

      let result;
      if (category) {
        // Update existing
        result = await supabase
          .from('category')
          .update(payload)
          .eq('id', category.id)
          .select();
      } else {
        // Create new
        result = await supabase
          .from('category')
          .insert([payload])
          .select();
      }

      if (result.error) throw result.error;
      
      onCategoryUpdated(result.data[0]);
      addToast({
        message: category ? 'Updated successfully' : 'Category created successfully',
        type: 'success'
      });
      onClose();
      setCategoryName('');
      setStatus('Active');
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
            <h2>{category ? 'Edit Category' : 'Add New Category'}</h2>
            <p>{category ? 'Update category details' : 'Create a group for your products'}</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="top-error-message">
              <Info size={18} />
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

          <div className="form-group full-width">
            <label>Status <span className="required">*</span></label>
            <div className="input-with-icon">
              <Info size={18} className="field-icon" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-modal-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-modal-btn" disabled={loading}>
              {loading ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
