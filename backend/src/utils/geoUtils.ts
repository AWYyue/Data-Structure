/**
 * 计算两个坐标点之间的Haversine距离（公里）
 * @param lat1 起点纬度
 * @param lon1 起点经度
 * @param lat2 终点纬度
 * @param lon2 终点经度
 * @returns 距离（公里）
 */
export const haversineDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371; // 地球半径（公里）
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

/**
 * 计算两个坐标点之间的Haversine距离（米）
 * @param lat1 起点纬度
 * @param lon1 起点经度
 * @param lat2 终点纬度
 * @param lon2 终点经度
 * @returns 距离（米）
 */
export const haversineDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  return haversineDistanceKm(lat1, lon1, lat2, lon2) * 1000;
};
