export interface RealMapTemplateDefinition {
  id: string;
  label: string;
  center: {
    latitude: number;
    longitude: number;
  };
  bbox: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
}

export const SHARED_REAL_MAP_TEMPLATE: RealMapTemplateDefinition = {
  id: 'bupt-shared',
  label: '北京邮电大学共享实景模板',
  center: {
    latitude: 39.960227,
    longitude: 116.3519331,
  },
  bbox: {
    south: 39.9568086,
    west: 116.348867,
    north: 39.9636959,
    east: 116.3549669,
  },
};
