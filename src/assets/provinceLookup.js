import provincesGeoJSON from './vn_provinces.json';

// Ranh giới 34 tỉnh/thành (2025), tham khảo từ dự án "Danh sach BHX"
// (vietnamese-provinces-database), đơn giản hoá toạ độ 4 chữ số thập phân.

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, rings) {
  if (!pointInRing(point, rings[0])) return false;
  for (let k = 1; k < rings.length; k++) {
    if (pointInRing(point, rings[k])) return false; // inside a hole
  }
  return true;
}

function pointInMultiPolygon(point, polygons) {
  return polygons.some((rings) => pointInPolygon(point, rings));
}

// Bỏ tiền tố "Thành phố "/"Tỉnh " để hiển thị gọn hơn.
export const shortProvinceName = (name) => name?.replace(/^(Thành phố|Tỉnh)\s+/, '') ?? name;

export function findProvince(lat, lng) {
  if (lat == null || lng == null || lat === '' || lng === '') return null;
  const point = [Number(lng), Number(lat)];
  if (Number.isNaN(point[0]) || Number.isNaN(point[1])) return null;
  const feature = provincesGeoJSON.features.find((f) => pointInMultiPolygon(point, f.geometry.coordinates));
  return feature ? feature.properties.name : null;
}
