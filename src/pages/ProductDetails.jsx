import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Tag, Box, Info, Edit2, Trash2, IndianRupee, Cpu, Zap, Layers } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ProductModal from '../components/ProductModal';
import './ProductDashboard.css';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Error:', error);
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this product? This will also remove it from any existing catalog links.')) {
      try {
        setIsDeleting(true);
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        navigate('/products');
      } catch (error) {
        alert('Error deleting product: ' + error.message);
        setIsDeleting(false);
      }
    }
  };

  if (loading) return <div className="table-status">Syncing product details...</div>;

  return (
    <div className="dashboard-content-wrapper">
      <div className="detail-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <button className="back-link" onClick={() => navigate('/products')}>
          <ArrowLeft size={18} />
          <span>Back to Products</span>
        </button>
        
        <div className="detail-actions" style={{ display: 'flex', gap: '16px' }}>
          <button 
            className="btn-primary" 
            style={{ borderRadius: '999px', padding: '12px 28px', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--primary-navy)', color: 'white', border: 'none', fontWeight: 600 }}
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit2 size={16} />
            <span>Edit Product</span>
          </button>
          <button 
            className="btn-danger-outline" 
            style={{ borderRadius: '999px', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'white', color: 'var(--danger)', border: '1px solid var(--danger)', fontWeight: 600 }}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 size={16} />
            <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>

      <div className="main-scroll-area">
        <div className="detail-card">
          <div className="detail-hero product-hero">
            <div className="hero-content">
              <span className="status-badge info" style={{ marginBottom: '16px' }}>{product?.category}</span>
              <h1 className="hero-title">{product?.sub_category}</h1>
              <p className="hero-subtitle" style={{ maxWidth: '800px', marginTop: '8px' }}>
                {product?.Description || 'High-performance modular component designed for industrial food processing systems.'}
              </p>
            </div>
          </div>

          <div className="details-grid">
            <div className="spec-card">
               <div className="spec-card-icon"><Cpu size={20} /></div>
               <span className="spec-label">Technical Output</span>
               <p className="spec-value">{product?.rpm || 'Variable'} RPM</p>
               <p className="info-label">Motor Speed Specification</p>
            </div>

            <div className="spec-card">
               <div className="spec-card-icon" style={{color: 'var(--danger)'}}><Zap size={20} /></div>
               <span className="spec-label">Power Input</span>
               <p className="spec-value">{product?.phase || 'Single'} Phase</p>
               <p className="info-label">Voltage Requirement</p>
            </div>

            <div className="spec-card">
               <div className="spec-card-icon" style={{color: 'var(--success)'}}><Layers size={20} /></div>
               <span className="spec-label">Material & Energy</span>
               <p className="spec-value">{product?.steel} | {product?.energy}</p>
               <p className="info-label">Construction & Consumption</p>
            </div>

            <div className="spec-card" style={{ background: 'var(--primary-light)', borderColor: 'var(--primary-navy)' }}>
               <div className="spec-card-icon" style={{ background: 'white' }}><IndianRupee size={20} /></div>
               <span className="spec-label" style={{ color: 'var(--primary-navy)' }}>Catalog Rate</span>
               <p className="spec-value" style={{ fontSize: '1.5rem' }}>₹{parseFloat(product?.rate || 0).toLocaleString()}</p>
               <p className="info-label" style={{ color: 'var(--primary-navy)', opacity: 0.8 }}>Standard Unit Price</p>
            </div>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <ProductModal
          isOpen={isEditModalOpen}
          product={product}
          onClose={() => {
            setIsEditModalOpen(false);
            fetchProduct();
          }}
        />
      )}
    </div>
  );
};

export default ProductDetails;
