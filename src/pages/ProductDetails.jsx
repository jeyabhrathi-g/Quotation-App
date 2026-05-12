import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Tag, Box, Info, Edit2, Trash2, IndianRupee, Cpu, Zap, Layers, Percent } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ProductModal from '../components/ProductModal';
import { sentenceCase } from '../utils/stringUtils';
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
          <div className="details-grid product-detail-grid" style={{ gap: '32px' }}>
            <div className="info-item">
              <div className="info-icon"><Package size={20} /></div>
              <div className="info-text">
                <span className="info-label">Product Name</span>
                <span className="info-value">{sentenceCase(product?.sub_category)}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><Tag size={20} /></div>
              <div className="info-text">
                <span className="info-label">Category</span>
                <span className="info-value">{sentenceCase(product?.category)}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><Cpu size={20} /></div>
              <div className="info-text">
                <span className="info-label">RPM</span>
                <span className="info-value">{product?.rpm || 'Variable'}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><Zap size={20} /></div>
              <div className="info-text">
                <span className="info-label">Phase</span>
                <span className="info-value">{product?.phase || 'Single'}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><Layers size={20} /></div>
              <div className="info-text">
                <span className="info-label">Steel / Energy</span>
                <span className="info-value">{product?.steel} | {product?.energy}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><IndianRupee size={20} /></div>
              <div className="info-text">
                <span className="info-label">Catalog Rate</span>
                <span className="info-value">₹{parseFloat(product?.rate || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><Percent size={20} /></div>
              <div className="info-text">
                <span className="info-label">GST</span>
                <span className="info-value">
                  {(product?.gst ?? product?.GST) != null && (product?.gst ?? product?.GST) !== '' 
                    ? `${product.gst ?? product.GST}% GST` 
                    : 'N/A'}
                </span>
              </div>
            </div>

            <div className="info-item full-width">
              <div className="info-icon"><Info size={20} /></div>
              <div className="info-text">
                <span className="info-label">Technical Description</span>
                <span className="info-value" style={{ fontWeight: 500, whiteSpace: 'normal' }}>{product?.Description || 'No additional specifications provided.'}</span>
              </div>
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
