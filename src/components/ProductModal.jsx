import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Tag, Info, Cpu, Recycle, Zap, HardDrive } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { sentenceCase } from '../utils/stringUtils';
import { useToast } from './ToastProvider';
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
    gst: '',
    Description: '',
    status: 'Active'
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

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
        gst: product.gst ?? product.GST ?? '',
        Description: product.Description || '',
        status: product.status || 'Active'
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
        gst: '',
        Description: '',
        status: 'Active'
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
    if (!formData.sub_category.trim()) return 'Check Product Name';
    if (!formData.rate || isNaN(formData.rate)) return 'Check Base Rate (Must be a number)';
    if (formData.gst !== '' && formData.gst !== null && isNaN(formData.gst)) return 'Check GST % (Must be a number)';
    if (!formData.steel) return 'Check Steel Type';
    if (!formData.energy) return 'Check Energy Type';
    if (!formData.status) return 'Check Product Status';
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
        gst: formData.gst !== '' && formData.gst !== null ? parseFloat(formData.gst) : null,
        Description: formData.Description.trim(),
        status: formData.status
      };

      if (product) {
        const { error } = await supabase
          .from('products')
          .update(dataToSubmit)
          .eq('id', product.id);
        if (error) throw error;
        addToast({ message: 'Updated successfully', type: 'success' });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([dataToSubmit]);
        if (error) throw error;
        addToast({ message: 'Product created successfully', type: 'success' });
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
                      {sentenceCase(cat.category_name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Product Name <span className="required">*</span></label>
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

            <div className="form-group">
              <label>GST (%)</label>
              <div className="input-with-icon">
                <Tag size={18} className="field-icon" style={{ transform: 'rotate(90deg)' }} />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Enter GST %"
                  value={formData.gst}
                  onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                />
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

            <div className="form-group full-width">
              <label>Status <span className="required">*</span></label>
              <div className="input-with-icon">
                <Info size={18} className="field-icon" />
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
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
