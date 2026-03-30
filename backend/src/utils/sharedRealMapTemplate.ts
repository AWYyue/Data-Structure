import { RealMapTemplateDefinition, SHARED_REAL_MAP_TEMPLATE } from '../data/realMapTemplates';

type OsmGeometryPoint = {
  lat: number;
  lon: number;
};

type OsmElement = {
  id: number;
  type: 'node' | 'way';
  lat?: number;
  lon?: number;
  center?: OsmGeometryPoint;
  geometry?: OsmGeometryPoint[];
  tags?: Record<string, string>;
};

export interface SharedTemplateRoadNode {
  key: string;
  name: string;
  type: 'junction';
  latitude: number;
  longitude: number;
}

export interface SharedTemplateRoadEdge {
  fromKey: string;
  toKey: string;
  distance: number;
  roadType: string;
  congestionFactor: number;
  allowedTransportation: string[];
  isElectricCartRoute: boolean;
  isBicyclePath: boolean;
}

export interface SharedTemplatePoint {
  key: string;
  name: string;
  latitude: number;
  longitude: number;
  sourceCategory: string;
}

export interface SharedRealMapTemplateData {
  templateId: string;
  label: string;
  center: {
    latitude: number;
    longitude: number;
  };
  roadNodes: SharedTemplateRoadNode[];
  roadEdges: SharedTemplateRoadEdge[];
  buildingPoints: SharedTemplatePoint[];
  facilityPoints: SharedTemplatePoint[];
}

const DEFAULT_HEADERS = {
  'User-Agent': 'travel-system-real-map-import/1.0',
  Accept: 'application/json',
};

const pointKey = (latitude: number, longitude: number) => `${latitude.toFixed(7)},${longitude.toFixed(7)}`;

const toRad = (value: number) => (value * Math.PI) / 180;

const haversineMeters = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) => {
  const earthRadius = 6_371_000;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const normalizeRoadType = (highwayType: string | undefined) => {
  const value = (highwayType || '').toLowerCase();
  if (['footway', 'pedestrian', 'path', 'steps', 'corridor'].includes(value)) {
    return 'footpath';
  }
  if (['cycleway'].includes(value)) {
    return 'bicycle_path';
  }
  if (['service', 'residential', 'living_street', 'unclassified'].includes(value)) {
    return 'side_road';
  }
  return 'main_road';
};

const transportByRoadType = (roadType: string) => {
  if (roadType === 'main_road' || roadType === 'side_road') {
    return ['walk', 'bicycle', 'electric_cart'];
  }
  if (roadType === 'bicycle_path') {
    return ['walk', 'bicycle'];
  }
  return ['walk'];
};

const buildPointFromElement = (element: OsmElement) => {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return {
      latitude: element.lat,
      longitude: element.lon,
    };
  }

  if (element.center) {
    return {
      latitude: element.center.lat,
      longitude: element.center.lon,
    };
  }

  if (element.geometry?.length) {
    const total = element.geometry.reduce(
      (accumulator, point) => ({
        latitude: accumulator.latitude + point.lat,
        longitude: accumulator.longitude + point.lon,
      }),
      { latitude: 0, longitude: 0 },
    );

    return {
      latitude: total.latitude / element.geometry.length,
      longitude: total.longitude / element.geometry.length,
    };
  }

  return null;
};

const scorePointName = (name: string) => {
  const lowerName = name.toLowerCase();
  if (!lowerName.trim()) {
    return -4;
  }

  let score = 0;
  if (/[楼馆门桥园中心馆舍场]/.test(name)) {
    score += 4;
  }
  if (/(building|gate|library|museum|hall|center|garden|tower|bridge|park|campus)/.test(lowerName)) {
    score += 4;
  }
  if (/(医院|附属|停车|公交|地铁|小区|宿舍区大门外)/.test(name)) {
    score -= 6;
  }
  if (/(hospital|subway|station|parking)/.test(lowerName)) {
    score -= 6;
  }
  return score;
};

const uniqueByKey = <T extends { key: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.key)) {
      return false;
    }
    seen.add(item.key);
    return true;
  });
};

const buildOverpassQuery = (template: RealMapTemplateDefinition) => `
[out:json][timeout:60];
(
  way["highway"](${template.bbox.south},${template.bbox.west},${template.bbox.north},${template.bbox.east});
  way["building"](${template.bbox.south},${template.bbox.west},${template.bbox.north},${template.bbox.east});
  node["amenity"](${template.bbox.south},${template.bbox.west},${template.bbox.north},${template.bbox.east});
  node["shop"](${template.bbox.south},${template.bbox.west},${template.bbox.north},${template.bbox.east});
  node["tourism"](${template.bbox.south},${template.bbox.west},${template.bbox.north},${template.bbox.east});
  node["leisure"](${template.bbox.south},${template.bbox.west},${template.bbox.north},${template.bbox.east});
  way["amenity"](${template.bbox.south},${template.bbox.west},${template.bbox.north},${template.bbox.east});
  way["shop"](${template.bbox.south},${template.bbox.west},${template.bbox.north},${template.bbox.east});
  way["tourism"](${template.bbox.south},${template.bbox.west},${template.bbox.north},${template.bbox.east});
  way["leisure"](${template.bbox.south},${template.bbox.west},${template.bbox.north},${template.bbox.east});
);
out center geom tags;
`;

export const fetchSharedRealMapTemplate = async (
  template: RealMapTemplateDefinition = SHARED_REAL_MAP_TEMPLATE,
): Promise<SharedRealMapTemplateData> => {
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: new URLSearchParams({
      data: buildOverpassQuery(template),
    }),
  });

  if (!response.ok) {
    throw new Error(`Overpass request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { elements?: OsmElement[] };
  const elements = payload.elements || [];

  const roadWays = elements.filter((element) => element.type === 'way' && element.tags?.highway && element.geometry?.length);
  const buildingWays = elements.filter((element) => element.type === 'way' && element.tags?.building);
  const facilityElements = elements.filter(
    (element) =>
      (element.tags?.amenity || element.tags?.shop || element.tags?.tourism || element.tags?.leisure) &&
      (element.type === 'node' || element.type === 'way'),
  );

  const roadNodeMap = new Map<string, SharedTemplateRoadNode>();
  const roadEdgeMap = new Map<string, SharedTemplateRoadEdge>();

  for (const way of roadWays) {
    const roadType = normalizeRoadType(way.tags?.highway);
    const allowedTransportation = transportByRoadType(roadType);
    const geometry = way.geometry || [];

    for (let index = 0; index < geometry.length - 1; index += 1) {
      const from = geometry[index];
      const to = geometry[index + 1];
      const fromKey = pointKey(from.lat, from.lon);
      const toKey = pointKey(to.lat, to.lon);

      roadNodeMap.set(fromKey, {
        key: fromKey,
        name: `真实路网节点-${roadNodeMap.size + 1}`,
        type: 'junction',
        latitude: from.lat,
        longitude: from.lon,
      });

      roadNodeMap.set(toKey, {
        key: toKey,
        name: `真实路网节点-${roadNodeMap.size + 1}`,
        type: 'junction',
        latitude: to.lat,
        longitude: to.lon,
      });

      const distance = Number(
        haversineMeters(
          { latitude: from.lat, longitude: from.lon },
          { latitude: to.lat, longitude: to.lon },
        ).toFixed(2),
      );

      const baseEdge: SharedTemplateRoadEdge = {
        fromKey,
        toKey,
        distance,
        roadType,
        congestionFactor: 1,
        allowedTransportation,
        isElectricCartRoute: roadType === 'main_road' || roadType === 'side_road',
        isBicyclePath: roadType === 'bicycle_path',
      };

      roadEdgeMap.set(`${fromKey}->${toKey}`, baseEdge);
      roadEdgeMap.set(`${toKey}->${fromKey}`, {
        ...baseEdge,
        fromKey: toKey,
        toKey: fromKey,
      });
    }
  }

  const buildingPoints = uniqueByKey(
    buildingWays
      .map((element, index) => {
        const point = buildPointFromElement(element);
        if (!point) {
          return null;
        }

        const rawName =
          element.tags?.name ||
          element.tags?.building ||
          element.tags?.office ||
          element.tags?.amenity ||
          `真实建筑-${index + 1}`;

        return {
          key: `building:${pointKey(point.latitude, point.longitude)}`,
          name: rawName,
          latitude: point.latitude,
          longitude: point.longitude,
          sourceCategory: element.tags?.building || 'building',
          score: scorePointName(rawName),
        };
      })
      .filter((item): item is SharedTemplatePoint & { score: number } => Boolean(item))
      .sort((left, right) => right.score - left.score)
      .slice(0, 60)
      .map(({ score: _score, ...item }) => item),
  );

  const facilityPoints = uniqueByKey(
    facilityElements
      .map((element, index) => {
        const point = buildPointFromElement(element);
        if (!point) {
          return null;
        }

        const sourceCategory =
          element.tags?.amenity || element.tags?.shop || element.tags?.tourism || element.tags?.leisure || 'service';
        const rawName = element.tags?.name || sourceCategory || `真实设施-${index + 1}`;

        return {
          key: `facility:${pointKey(point.latitude, point.longitude)}`,
          name: rawName,
          latitude: point.latitude,
          longitude: point.longitude,
          sourceCategory,
          score: scorePointName(rawName),
        };
      })
      .filter((item): item is SharedTemplatePoint & { score: number } => Boolean(item))
      .sort((left, right) => right.score - left.score)
      .slice(0, 100)
      .map(({ score: _score, ...item }) => item),
  );

  if (roadNodeMap.size < 80 || roadEdgeMap.size < 200) {
    throw new Error(`Shared template is too small: nodes=${roadNodeMap.size}, edges=${roadEdgeMap.size}`);
  }

  if (buildingPoints.length < 20 || facilityPoints.length < 50) {
    throw new Error(
      `Shared template missing enough POIs: buildings=${buildingPoints.length}, facilities=${facilityPoints.length}`,
    );
  }

  return {
    templateId: template.id,
    label: template.label,
    center: template.center,
    roadNodes: [...roadNodeMap.values()],
    roadEdges: [...roadEdgeMap.values()],
    buildingPoints,
    facilityPoints,
  };
};
