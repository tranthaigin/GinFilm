import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalElements,
  itemsPerPage,
  showInfo = true,
}) {
  const [pageInputVal, setPageInputVal] = useState(currentPage ? currentPage.toString() : '1');

  useEffect(() => {
    setPageInputVal(currentPage ? currentPage.toString() : '1');
  }, [currentPage]);

  if (!totalPages || totalPages < 1) return null;

  const handleJumpPage = () => {
    const pageNum = parseInt(pageInputVal, 10);
    if (!isNaN(pageNum)) {
      const target = Math.max(1, Math.min(totalPages, pageNum));
      onPageChange(target);
      setPageInputVal(target.toString());
    }
  };

  const getPaginationGroup = () => {
    if (totalPages <= 1) return [1];
    const pages = new Set();
    pages.add(1);
    pages.add(totalPages);
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
      pages.add(i);
    }
    const sorted = Array.from(pages).sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
        result.push('...');
      }
      result.push(sorted[i]);
    }
    return result;
  };

  const startItem = itemsPerPage && totalElements ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endItem = itemsPerPage && totalElements ? Math.min(currentPage * itemsPerPage, totalElements) : null;

  return (
    <div className="flex flex-wrap items-center justify-between py-4 px-5 border-t border-white/10 w-full gap-3">
      {showInfo && totalElements > 0 && startItem && endItem && (
        <div className="text-[13px] text-white/50">
          Hiển thị từ {startItem} đến {endItem} trên tổng số {totalElements} mục
        </div>
      )}
      
      <div className={`flex items-center gap-2 ${showInfo && totalElements ? '' : 'ml-auto'}`}>
        {/* Prev Button */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-white/10 bg-[#222] text-white disabled:text-white/20 disabled:cursor-not-allowed hover:bg-[#333] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page Buttons */}
        {getPaginationGroup().map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => typeof item === 'number' && onPageChange(item)}
            disabled={item === '...'}
            className={`min-w-[32px] h-8 flex items-center justify-center px-2 rounded-md transition-colors ${
              currentPage === item
                ? 'bg-[#dc2626] text-white font-bold'
                : item === '...'
                ? 'bg-transparent text-white/40 cursor-default'
                : 'bg-[#222] border border-white/10 text-white hover:bg-[#333]'
            }`}
          >
            {item}
          </button>
        ))}

        {/* Next Button */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-white/10 bg-[#222] text-white disabled:text-white/20 disabled:cursor-not-allowed hover:bg-[#333] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
