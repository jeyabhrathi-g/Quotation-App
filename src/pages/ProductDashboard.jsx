import React, { useState, useEffect, useMemo } from 'react';
import { PackagePlus, Search, Edit2, Trash2, Tag, Box, Info, Plus } from 'lucide-react';
import './ProductDashboard.css';
import '../pages/CustomerDashboard.css'; // Reuse table patterns
import { supabase } from '../supabaseClient';
import { useSearch } from '../components/Layout';
import ProductModal from '../components/ProductModal';
import CategoryModal from '../components/CategoryModal';

const ProductDashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { searchQuery, setSearchQuery, setPageTitle } = useSearch();

  useEffect(() => {
    setPageTitle({ main: 'Product Dashboard', sub: 'INVENTORY CONTROLS' });
    fetchProducts();
  }, []);

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
      <div className="page-action-bar">
        <div className="content-search-box">
          <Search size={20} className="search-icon-inside" />
          <input
            type="text"
            placeholder="Search in all fields..."
            className="content-search-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="action-buttons-group">
          <button className="add-category-btn" onClick={() => setIsCategoryModalOpen(true)}>
            <Tag size={18} />
            <span>Add Category</span>
          </button>
          <button className="add-product-btn" onClick={handleAddProduct}>
            <Plus size={22} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      <div className="main-scroll-area">
        <div className="table-container product-table">
          <div className="table-header product-table-header">
            <div className="col cat-col">CATEGORY</div>
            <div className="col name-col">PRODUCT NAME</div>
            <div className="col specs-col">SPECS (PHASE/RPM)</div>
            <div className="col steel-col">STEEL / ENERGY</div>
            <div className="col rate-col">RATE (₹)</div>
            <div className="col actions-col">ACTION</div>
          </div>

          {loading ? (
            <div className="table-status">Syncing catalog data...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="table-status">No items found in catalog.</div>
          ) : (
            <div className="table-body">
              {filteredProducts.map((product) => (
                <div key={product.id} className="table-row product-row">
                  <div className="col cat-col">
                    <span className="category-tag-badge">{product.category}</span>
                  </div>

                  <div className="col name-col">
                    <span className="product-name-bold">{product.sub_category}</span>
                  </div>

                  <div className="col specs-col">
                    <span className="specs-text">
                      {product.phase || '-'} Ph / {product.rpm || '-'} RPM
                    </span>
                  </div>

                  <div className="col steel-col">
                    <span className="steel-energy-text">
                      {product.steel} <span className="separator">|</span> {product.energy}
                    </span>
                  </div>

                  <div className="col rate-col">
                    <span className="rate-text-green">₹{parseFloat(product.rate || 0).toLocaleString()}</span>
                  </div>

                  <div className="col actions-col">
                    <div className="action-buttons-list">
                      <button className="icon-btn-edit-small" onClick={() => handleEditProduct(product)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="icon-btn-delete-small" onClick={() => handleDeletePrompt(product)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
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
