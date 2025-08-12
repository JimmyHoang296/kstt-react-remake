import React, { useState } from 'react';
import LoadingModal from '../../components/LoadingModal';

const URL =
  'https://script.google.com/macros/s/AKfycbzpnjGlXSJheKpWsN9C-YqD5npxEF07yIiz3WTDAh3xFFmjDFHovVY7uSVDBmh4xjMu/exec';

const SearchStore = () => {
  const [site, setSite] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAdd, setSiteAdd] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!site && !siteName && !siteAdd) {
      alert('Nhập thông tin tìm kiếm')
      return;
    }
    
    setLoading(true);

    try {
      const submitData = {
        type: 'searchStore',
        data: { site, siteName, siteAdd },
      };

      const res = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();
      setResults(data.result || []);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra, hãy thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Tìm kiếm cửa hàng</h2>

      {/* Input fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input
          type="text"
          placeholder="Site"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          className="px-4 py-2 border rounded"
        />
        <input
          type="text"
          placeholder="Tên CH"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          className="px-4 py-2 border rounded"
        />
        <input
          type="text"
          placeholder="Địa chỉ"
          value={siteAdd}
          onChange={(e) => setSiteAdd(e.target.value)}
          className="px-4 py-2 border rounded"
        />
      </div>

      {/* Search button */}
      <button
        onClick={handleSearch}
        className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        Tìm kiếm
      </button>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {results.length > 0 ? (
          results.map((shop, index) => (
            <div
              key={index}
              className="bg-gray-50 border rounded-xl p-4 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-indigo-600">
                {shop.siteName} - {shop.site}
              </h3>
              <p className="text-gray-600">{shop.address}</p>
              <div className="mt-2 text-sm">
                <p>
                  <strong>QLKV:</strong> {shop.QLKV}
                </p>
                <p>
                  <strong>GĐV:</strong> {shop.GDV}
                </p>
                <p>
                  <strong>KSTT:</strong> {shop.KSTT}
                </p>
              </div>
              <div className="mt-2">
                <a
                  href={`https://maps.google.com/?q=${shop.lat},${shop.long}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-500 underline"
                >
                  Xem bản đồ
                </a>
              </div>
            </div>
          ))
        ) : (
          !loading && <p className="text-gray-500">Không tìm thấy cửa hàng nào.</p>
        )}
      </div>
      {loading && <LoadingModal message={"loading..."}/>}
    </div>
  );
};

export default SearchStore;
