import { useEffect, useMemo, useState } from 'react';

/**
 * Generic CRUD + search + pagination hook for manager pages.
 *
 * @param {Object} config
 * @param {Array}  config.initialItems   - Initial data array
 * @param {Object} config.initialSearch  - Initial search state object (keys match filter fields)
 * @param {Function} config.filterFn     - (item, searchQuery) => boolean
 * @param {number} [config.pageSize=20]
 */
export function useManagerPage({ initialItems, initialSearch, filterFn, pageSize = 20 }) {
  const [items, setItems] = useState(initialItems);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [filteredItems, setFilteredItems] = useState(initialItems);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFilteredItems(items.filter((item) => filterFn(item, searchQuery)));
  }, [searchQuery, items]);

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchQuery((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const resetSearch = () => {
    setSearchQuery(initialSearch);
    setCurrentPage(1);
  };

  const openModal = (item = null) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return [...filteredItems].reverse().slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredItems.length / pageSize);

  return {
    items,
    setItems,
    searchQuery,
    filteredItems,
    currentPage,
    setCurrentPage,
    isModalOpen,
    selectedItem,
    loading,
    setLoading,
    paginatedItems,
    totalPages,
    handleSearchChange,
    resetSearch,
    openModal,
    closeModal,
  };
}
