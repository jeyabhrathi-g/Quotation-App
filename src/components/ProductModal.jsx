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
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div className="header-title">
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
              {product ? 'Edit Catalog Entry' : 'New Catalog Entry'}
            </h2>
          </div>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="top-error-message">
              <span>{error}</span>
            </div>
          )}

          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>CATEGORY *</label>
              <select
                className="modal-select-field"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                <option value="">-- Choose Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.category_name}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 1' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>SUB CATEGORY NAME *</label>
              <input
                type="text"
                className="modal-input-field"
                placeholder="e.g. Wet Grinder 10L"
                value={formData.sub_category}
                onChange={(e) => setFormData({ ...formData, sub_category: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 1' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>PHASE</label>
                  <input
                    type="number"
                    className="modal-input-field"
                    placeholder="1 / 3"
                    value={formData.phase}
                    onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>RPM</label>
                  <input
                    type="number"
                    className="modal-input-field"
                    placeholder="1440"
                    value={formData.rpm}
                    onChange={(e) => setFormData({ ...formData, rpm: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 1' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>STEEL TYPE *</label>
                  <select
                    className="modal-select-field"
                    value={formData.steel}
                    onChange={(e) => setFormData({ ...formData, steel: e.target.value })}
                    required
                  >
                    <option value="MS">MS</option>
                    <option value="SS">SS</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>ENERGY *</label>
                  <select
                    className="modal-select-field"
                    value={formData.energy}
                    onChange={(e) => setFormData({ ...formData, energy: e.target.value })}
                    required
                  >
                    <option value="Gas">Gas</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group full-width" style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>BASE RATE (₹) *</label>
              <input
                type="number"
                className="modal-input-field"
                placeholder="Enter base rate"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                required
              />
            </div>

            <div className="form-group full-width" style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>TECHNICAL DESCRIPTION</label>
              <textarea
                className="modal-input-field"
                style={{ height: '80px', padding: '12px' }}
                placeholder="Enter details..."
                value={formData.Description}
                onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: 'none', padding: '10px 0 24px 0' }}>
            <button
              type="submit"
              className="submit-modal-btn"
              style={{
                width: '100%',
                backgroundColor: '#00a870',
                color: '#fff',
                height: '52px',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
              disabled={loading}
            >
              {loading ? 'Processing...' : product ? 'UPDATE CATALOG ITEM' : 'UPDATE CATALOG ITEM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
