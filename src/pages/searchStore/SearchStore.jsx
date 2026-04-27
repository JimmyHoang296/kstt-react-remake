import React, { useState } from 'react';
import { Search, MapPin, Phone, Store } from 'lucide-react';
import LoadingModal from '../../components/LoadingModal';
import { api } from '../../api';

const INPUT = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

const InfoRow = ({ label, value }) =>
  value ? (
    <div className="flex items-start gap-1.5 text-sm">
      <span className="text-gray-400 shrink-0 w-14 text-xs pt-0.5">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  ) : null;

const SearchStore = () => {
  const [site,     setSite]     = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAdd,  setSiteAdd]  = useState('');
  const [results,  setResults]  = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSearch = async () => {
    if (!site && !siteName && !siteAdd) { setError('Nhập ít nhất một thông tin tìm kiếm'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await api.searchStore({ site, siteName, siteAdd });
      setResults(data.result || []);
      setSearched(true);
    } catch {
      setError('Có lỗi xảy ra, hãy thử lại');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Tìm kiếm cửa hàng</h2>
      </div>

      {/* Search inputs */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Site</label>
            <input value={site} onChange={(e) => setSite(e.target.value)} onKeyDown={handleKeyDown} placeholder="Mã site..." className={INPUT} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tên CH</label>
            <input value={siteName} onChange={(e) => setSiteName(e.target.value)} onKeyDown={handleKeyDown} placeholder="Tên cửa hàng..." className={INPUT} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Địa chỉ</label>
            <input value={siteAdd} onChange={(e) => setSiteAdd(e.target.value)} onKeyDown={handleKeyDown} placeholder="Địa chỉ..." className={INPUT} />
          </div>
          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Search className="w-4 h-4" /> Tìm kiếm
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>

      {/* Results */}
      <div className="px-6 py-5">
        {searched && (
          <p className="text-xs text-gray-400 mb-4">
            Tìm thấy <span className="font-medium text-gray-600">{results.length}</span> cửa hàng
          </p>
        )}

        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((shop, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                <div className="flex items-start gap-2 mb-3">
                  <Store className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 leading-snug">{shop.siteName}</p>
                    <p className="text-xs text-indigo-600 font-medium">{shop.site}</p>
                  </div>
                </div>

                {shop.address && (
                  <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-3">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{shop.address}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <InfoRow label="CHT" value={shop.CHT} />
                  {shop.CHTPhone && (
                    <div className="flex items-start gap-1.5 text-sm">
                      <span className="text-gray-400 shrink-0 w-14 text-xs pt-0.5">SĐT</span>
                      <a href={`tel:${shop.CHTPhone}`} className="text-indigo-600 hover:underline flex items-center gap-1">
                        <Phone className="w-3 h-3" />{shop.CHTPhone}
                      </a>
                    </div>
                  )}
                  <InfoRow label="QLKV" value={shop.QLKV} />
                  <InfoRow label="GĐV"  value={shop.GDV}  />
                  <InfoRow label="KSTT" value={shop.KSTT} />
                </div>

                {shop.lat && shop.long && (
                  <a
                    href={`https://maps.google.com/?q=${shop.lat},${shop.long}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Xem bản đồ
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : searched && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Store className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Không tìm thấy cửa hàng nào</p>
          </div>
        ) : !searched ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-300">
            <Search className="w-10 h-10 mb-3" />
            <p className="text-sm">Nhập thông tin để tìm kiếm</p>
          </div>
        ) : null}
      </div>

      {loading && <LoadingModal message="Đang tìm kiếm..." />}
    </div>
  );
};

export default SearchStore;
