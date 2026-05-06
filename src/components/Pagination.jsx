import React, { useMemo } from 'react';
import './Pagination.css';

const getPageButtons = (currentPage, totalPages, maxButtons) => {
  const pages = [];
  const half = Math.floor(maxButtons / 2);
  const left = Math.max(2, currentPage - half);
  const right = Math.min(totalPages - 1, currentPage + half);

  if (totalPages <= maxButtons) {
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push(page);
    }
    return pages;
  }

  pages.push(1);

  if (left > 2) {
    pages.push('...');
  }

  for (let page = left; page <= right; page += 1) {
    pages.push(page);
  }

  if (right < totalPages - 1) {
    pages.push('...');
  }

  pages.push(totalPages);
  return pages;
};

const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  maxPageButtons = 5
}) => {
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / itemsPerPage)),
    [itemsPerPage, totalItems]
  );

  const pages = useMemo(
    () => getPageButtons(currentPage, totalPages, maxPageButtons),
    [currentPage, totalPages, maxPageButtons]
  );

  if (totalPages <= 1) {
    return null;
  }

  const handleChange = (page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="pagination-container">
      <button
        type="button"
        className="pagination-nav"
        onClick={() => handleChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>

      <div className="pagination-pages">
        {pages.map((page, index) =>
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
          ) : (
            <button
              type="button"
              key={page}
              className={`pagination-page ${page === currentPage ? 'active' : ''}`}
              onClick={() => handleChange(page)}
            >
              {page}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        className="pagination-nav"
        onClick={() => handleChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
