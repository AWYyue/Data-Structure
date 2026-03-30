/**
 * 计算两个坐标点之间的Haversine距离（米）
 * @param fromLat 起点纬度
 * @param fromLng 起点经度
 * @param toLat 终点纬度
 * @param toLng 终点经度
 * @returns 距离（米）
 */
export const haversineDistance = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000; // 地球半径（米）
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * 计算两个坐标点之间的Haversine距离（米）- 数组参数版本
 * @param from 起点坐标 [纬度, 经度]
 * @param to 终点坐标 [纬度, 经度]
 * @returns 距离（米）
 */
export const haversineDistanceArray = (
  from: [number, number],
  to: [number, number]
): number => {
  return haversineDistance(from[0], from[1], to[0], to[1]);
};

/**
 * 计算两个坐标点之间的Haversine距离（公里）
 * @param fromLat 起点纬度
 * @param fromLng 起点经度
 * @param toLat 终点纬度
 * @param toLng 终点经度
 * @returns 距离（公里）
 */
export const haversineDistanceKm = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number => {
  return haversineDistance(fromLat, fromLng, toLat, toLng) / 1000;
};
