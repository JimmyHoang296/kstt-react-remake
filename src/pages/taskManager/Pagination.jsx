import React from 'react'

// Helper to generate page numbers with ellipsis
const getPaginationNumbers = (totalPages, currentPage) => {
  const pages = [];
  const delta = 2; // how many pages before/after current page to show

  const range = [];
  for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
    range.push(i);
  }

  if (currentPage - delta > 2) {
    range.unshift("...");
  }
  if (currentPage + delta < totalPages - 1) {
    range.push("...");
  }

  range.unshift(1);
  if (totalPages > 1) {
    range.push(totalPages);
  }

  return range;
};

const Pagination = ({ totalPages, currentPage, setCurrentPage }) => {
  if (totalPages <= 1) return null; // Hide if only 1 page

  const pageNumbers = getPaginationNumbers(totalPages, currentPage);

  return (
    <div className="flex justify-center mt-6 gap-2 flex-wrap">
      <button
        disabled={currentPage === 1}
        onClick={() => setCurrentPage((p) => p - 1)}
        className="px-3 py-1 border rounded disabled:opacity-50 cursor-pointer"
      >
        Prev
      </button>

      {pageNumbers.map((num, idx) =>
        num === "..." ? (
          <span key={idx} className="px-3 py-1 cursor-pointer">
            ...
          </span>
        ) : (
          <button
            key={idx}
            onClick={() => setCurrentPage(num)}
            className={`px-3 py-1 border rounded cursor-pointer ${currentPage === num ? "bg-indigo-500 text-white" : ""
              }`}
          >
            {num}
          </button>
        )
      )}

      <button
        disabled={currentPage === totalPages}
        onClick={() => setCurrentPage((p) => p + 1)}
        className="px-3 py-1 border rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination