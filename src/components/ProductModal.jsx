import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Tag, Info, Cpu, Recycle, Zap, HardDrive } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './CustomerModal.css'; // Reuse form patterns

const ProductModal = ({ isOpen, product, onClose }) => {
  const [formData, setFormData] = useState({
    category: '',
    sub_category: '',
    phase: '',
    rpm: '',
    steel: 'MS',
    energy: 'Gas',
    rate: '',
    Description: ''
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        category: product.category || '',
        sub_category: product.sub_category || '',
        phase: product.phase || '',
        rpm: product.rpm || '',
        steel: product.steel || 'MS',
        energy: product.energy || 'Gas',
        rate: product.rate || '',
        Description: product.Description || ''
      });
    } else {
      setFormData({
        category: '',
        sub_category: '',
        phase: '',
        rpm: '',
        steel: 'MS',
        energy: 'Gas',
        rate: '',
        Description: ''
      });
    }
  }, [product, isOpen]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('category')
        .select('*')
        .order('category_name', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error.message);
    }
  };

  const validate = () => {
    if (!formData.category.trim()) return 'Check Category';
    if (!formData.sub_category.trim()) return 'Check Sub Category Name';
    if (!formData.rate || isNaN(formData.rate)) return 'Check Base Rate (Must be a number)';
    if (!formData.steel) return 'Check Steel Type';
    if (!formData.energy) return 'Check Energy Type';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errorMsg = validate();
    if (errorMsg) {
      setError(errorMsg);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const dataToSubmit = {
        category: formData.category,
        sub_category: formData.sub_category.trim(),
        phase: formData.phase ? parseFloat(formData.phase) : null,
        rpm: formData.rpm ? parseFloat(formData.rpm) : null,
        steel: formData.steel,
        energy: formData.energy,
        rate: parseFloat(formData.rate),
        Description: formData.Description.trim()
      };

      if (product) {
        const { error } = await supabase
          .from('products')
          .update(dataToSubmit)
          .eq('id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([dataToSubmit]);
        if (error) throw error;
      }
      onClose();
    } catch (error) {
      setError(error.message);
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
            <h2>{product ? 'Edit Product' : 'Add New Product'}</h2>
            <p>Update your equipment catalog details</p>
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

          <div className="form-grid">
            <div className="form-group">
              <label>Category <span className="required">*</span></label>
              <div className="input-with-icon">
                <Tag size={18} className="field-icon" />
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.category_name}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Sub Category / Model <span className="required">*</span></label>
              <div className="input-with-icon">
                <ShoppingBag size={18} className="field-icon" />
                <input
                  type="text"
                  placeholder="e.g. Wet Grinder 10L"
                  value={formData.sub_category}
                  onChange={(e) => setFormData({ ...formData, sub_category: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Standard Phase</label>
              <div className="input-with-icon">
                <Zap size={18} className="field-icon" />
                <input
                  type="number"
                  placeholder="1 / 3"
                  value={formData.phase}
                  onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Motor RPM</label>
              <div className="input-with-icon">
                <Cpu size={18} className="field-icon" />
                <input
                  type="number"
                  placeholder="e.g. 1440"
                  value={formData.rpm}
                  onChange={(e) => setFormData({ ...formData, rpm: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Steel Type <span className="required">*</span></label>
              <div className="input-with-icon">
                <HardDrive size={18} className="field-icon" />
                <select
                  value={formData.steel}
                  onChange={(e) => setFormData({ ...formData, steel: e.target.value })}
                  required
                >
                  <option value="MS">MS (Mild Steel)</option>
                  <option value="SS">SS (Stainless Steel)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Energy Source <span className="required">*</span></label>
              <div className="input-with-icon">
                <Recycle size={18} className="field-icon" />
                <select
                  value={formData.energy}
                  onChange={(e) => setFormData({ ...formData, energy: e.target.value })}
                  required
                >
                  <option value="Gas">Gas</option>
                  <option value="Electric">Electric</option>
                </select>
              </div>
            </div>

            <div className="form-group full-width">
              <label>Base Rate (₹) <span className="required">*</span></label>
              <div className="input-with-icon">
                <Tag size={18} className="field-icon" style={{ transform: 'rotate(90deg)' }} />
                <input
                  type="number"
                  placeholder="Enter standard rate"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Technical Description</label>
              <div className="input-with-icon textarea">
                <Info size={18} className="field-icon" />
                <textarea
                  placeholder="Enter detailed specifications..."
                  value={formData.Description}
                  onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                  rows="3"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-modal-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-modal-btn" disabled={loading}>
              {loading ? 'Saving...' : product ? 'Update Item' : 'Add to Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
