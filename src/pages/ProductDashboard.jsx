import React, { useState, useEffect, useMemo } from 'react';
import { PackagePlus, Search, Edit2, Trash2, Tag, Box, Info, Plus } from 'lucide-react';
import './ProductDashboard.css';
import '../pages/CustomerDashboard.css'; // Reuse table patterns
import { supabase } from '../supabaseClient';
import { useSearch } from '../components/Layout';
import ProductModal from '../components/ProductModal';
import CategoryModal from '../components/CategoryModal';
import { useNavigate, useLocation } from 'react-router-dom';

const ProductDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { setPageTitle } = useSearch();

  useEffect(() => {
    setPageTitle({ main: 'Product Dashboard', sub: 'INVENTORY CONTROLS' });
    fetchProducts();
  }, [setPageTitle]);

  useEffect(() => {
    setSearchQuery('');
    return () => setSearchQuery('');
  }, [location.pathname]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p =>
      (p.sub_category && p.sub_category.toLowerCase().includes(query)) ||
      (p.category && p.category.toLowerCase().includes(query)) ||
      (p.Description && p.Description.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const handleDeletePrompt = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', productToDelete.id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== productToDelete.id));
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (error) {
      alert('Error deleting product: ' + error.message);
    }
  };

  return (
    <div className="dashboard-content-wrapper">
      <div className="page-action-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="action-row-left" style={{ flex: '1 1 300px' }}>
          <div className="local-search-box" style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '999px', border: '1px solid var(--border-color)', outline: 'none', background: 'white', color: 'var(--text-main)' }}
            />
          </div>
        </div>
        <div className="action-row-right" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div className="action-stats">
            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>Total: {filteredProducts.length}</span>
          </div>
          <button className="add-category-btn" onClick={() => setIsCategoryModalOpen(true)} style={{ borderRadius: '999px', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>
            <Tag size={18} />
            <span>Add Category</span>
          </button>
          <button className="add-product-btn" onClick={handleAddProduct} style={{ borderRadius: '999px', padding: '12px 28px', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary-navy)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={20} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      <div className="main-scroll-area">
        <div className="table-container product-table">
          <div className="table-header product-table-header">
            <div className="col cat-col">CATEGORY</div>
            <div className="col name-col">SUB CATEGORY</div>
            <div className="col specs-col">SPECS (PHASE/RPM)</div>
            <div className="col steel-col">STEEL / ENERGY</div>
            <div className="col rate-col">RATE (₹)</div>
          </div>

          {loading ? (
            <div className="table-status">Syncing catalog data...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="table-status">No items found in catalog.</div>
          ) : (
            <div className="table-body">
              {filteredProducts.map((product) => (
                <div key={product.id} className="table-row product-row" onClick={() => navigate(`/products/${product.id}`)} style={{ cursor: 'pointer' }}>
                  <div className="col cat-col" data-label="Category">
                    <span className="category-tag-badge">{product.category}</span>
                  </div>

                  <div className="col name-col" data-label="Sub Category">
                    <span className="product-name-bold clickable">{product.sub_category}</span>
                  </div>

                  <div className="col specs-col" data-label="Specs (Phase/RPM)">
                    <span className="specs-text">
                      {product.phase || '-'} Ph / {product.rpm || '-'} RPM
                    </span>
                  </div>

                  <div className="col steel-col" data-label="Steel / Energy">
                    <span className="steel-energy-text">
                      {product.steel} <span className="separator">|</span> {product.energy}
                    </span>
                  </div>

                  <div className="col rate-col" data-label="Rate (₹)">
                    <span className="rate-text-green">₹{parseFloat(product.rate || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isProductModalOpen && (
        <ProductModal
          isOpen={isProductModalOpen}
          product={selectedProduct}
          onClose={() => {
            setIsProductModalOpen(false);
            fetchProducts();
          }}
        />
      )}

      {isCategoryModalOpen && (
        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onCategoryAdded={(newCat) => {
            // Optional: handle new category
            console.log('New category added:', newCat);
          }}
        />
      )}
      {isDeleteModalOpen && (
        <div className="modal-overlay delete-overlay">
          <div className="modal-content delete-modal-content">
            <div className="delete-modal-header">
              <div className="warning-icon-box">
                <Trash2 size={32} />
              </div>
              <h3>Are you sure you want to delete this product?</h3>
              <p>This action cannot be undone. The item will be permanently removed from your catalog.</p>
            </div>
            <div className="delete-modal-actions">
              <button className="no-btn" onClick={() => setIsDeleteModalOpen(false)}>❌ No</button>
              <button className="yes-btn" onClick={confirmDelete}>✅ Yes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDashboard;
