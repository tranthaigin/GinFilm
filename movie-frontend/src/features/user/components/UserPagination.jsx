import React from 'react';

export default function UserPagination({ currentPage, totalPages, setCurrentPage, className = "mt-12" }) {
  if (totalPages <= 1) return null;

  const getPaginationGroup = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-2 py-1 rounded text-gray-500 dark:text-[#9D9D9D] hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="font-bold text-lg">{'<'}</span>
        </button>
        
        {getPaginationGroup().map((p, idx) => (
          <button
            key={idx}
            onClick={() => p !== '...' && setCurrentPage(p)}
            disabled={p === '...'}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              p === currentPage 
                ? 'bg-[#dc2626] text-white shadow-sm' 
                : p === '...' 
                  ? 'text-gray-400 dark:text-gray-500 cursor-default' 
                  : 'text-gray-500 dark:text-[#9D9D9D] hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}

        <button 
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-2 py-1 rounded text-gray-500 dark:text-[#9D9D9D] hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="font-bold text-lg">{'>'}</span>
        </button>
      </div>
    </div>
  );
}
