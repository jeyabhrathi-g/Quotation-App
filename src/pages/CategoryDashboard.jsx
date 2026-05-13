import React, { useState, useEffect, useMemo } from 'react';
import { Tag, Search, Edit2, Trash2, Plus, Info } from 'lucide-react';
import './CategoryDashboard.css';
import '../pages/CustomerDashboard.css'; // Reuse table patterns
import { supabase } from '../supabaseClient';
import { useSearch } from '../components/Layout';
import CategoryModal from '../components/CategoryModal';
import Pagination from '../components/Pagination';
import { sentenceCase } from '../utils/stringUtils';

const CategoryDashboard = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 5;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { setPageTitle } = useSearch();

  useEffect(() => {
    setPageTitle({ main: 'Category Management', sub: 'ORGANIZE CATALOG' });
    fetchCategories();
  }, [setPageTitle]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('category')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const query = searchQuery.toLowerCase();
    return categories.filter(c =>
      c.category_name.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const visibleCategories = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(start, start + itemsPerPage);
  }, [filteredCategories, currentPage]);

  const handleAddCategory = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  return (
    <div className="dashboard-content-wrapper">
      <div className="page-action-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="action-row-left" style={{ flex: '1 1 300px' }}>
          <div className="local-search-box" style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '999px', border: '1px solid var(--border-color)', outline: 'none', background: 'white', color: 'var(--text-main)' }}
            />
          </div>
        </div>
        <div className="action-row-right" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div className="action-stats">
            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>Total: {filteredCategories.length}</span>
          </div>
          <button className="add-product-btn" onClick={handleAddCategory} style={{ borderRadius: '999px', padding: '12px 28px', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary-navy)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={20} />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      <div className="main-scroll-area">
        <div className="table-container category-table">
          <div className="table-header category-table-header">
            <div className="col name-col">CATEGORY NAME</div>
            <div className="col status-col">STATUS</div>
            <div className="col date-col">CREATED AT</div>
            <div className="col actions-col" style={{ textAlign: 'center' }}>ACTIONS</div>
          </div>

          {loading ? (
            <div className="table-status">Syncing category list...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="table-status">No categories found.</div>
          ) : (
            <div className="table-body">
              {visibleCategories.map((category) => (
                <div key={category.id} className="table-row category-row">
                  <div className="col name-col" data-label="Category Name">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ padding: '8px', background: 'var(--input-bg)', borderRadius: '8px', color: 'var(--primary-navy)' }}>
                        <Tag size={18} />
                      </div>
                      <span className="product-name-bold">{sentenceCase(category.category_name)}</span>
                    </div>
                  </div>

                  <div className="col status-col" data-label="Status">
                    <span className={`status-tag ${(category.status || 'Active').toLowerCase()}`}>
                      {category.status || 'Active'}
                    </span>
                  </div>

                  <div className="col date-col" data-label="Created At">
                    <span className="specs-text">
                      {new Date(category.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="col actions-col" data-label="Actions" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <button className="icon-btn edit-btn" title="Edit Category" onClick={() => handleEditCategory(category)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
                      <Edit2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCategories.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {isModalOpen && (
        <CategoryModal
          isOpen={isModalOpen}
          category={selectedCategory}
          onClose={() => {
            setIsModalOpen(false);
            fetchCategories();
          }}
          onCategoryUpdated={() => fetchCategories()}
        />
      )}
    </div>
  );
};

export default CategoryDashboard;
