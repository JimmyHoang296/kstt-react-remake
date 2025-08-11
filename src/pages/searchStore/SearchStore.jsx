import React from 'react'
import { useState } from 'react';
import { mockData } from '../../assets/mockData.js';
// Search Component
const SearchStore = () => {
  const [shops, setShops] = useState(mockData.shops);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    const filteredShops = mockData.shops.filter(shop =>
      shop.shopCode.toLowerCase().includes(query) ||
      shop.shopName.toLowerCase().includes(query) ||
      shop.address.toLowerCase().includes(query)
    );
    setShops(filteredShops);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Tìm kiếm</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Tìm kiếm theo mã CH, tên CH, địa chỉ..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shops.length > 0 ? (
          shops.map(shop => (
            <div key={shop.shopCode} className="bg-gray-50 border rounded-xl p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-indigo-600">{shop.shopName} - {shop.shopCode}</h3>
              <p className="text-gray-600">{shop.address}</p>
              <div className="mt-2 text-sm">
                <p><strong>QLKV:</strong> {shop.qlkv}</p>
                <p><strong>GĐV:</strong> {shop.gdv}</p>
                <p><strong>KSTT:</strong> {shop.kstt}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">Không tìm thấy cửa hàng nào.</p>
        )}
      </div>
    </div>
  );
};

export default SearchStore