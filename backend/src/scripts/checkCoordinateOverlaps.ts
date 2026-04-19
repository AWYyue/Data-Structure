import { initializeDatabase, AppDataSource } from '../config/database';
import { ScenicArea } from '../entities/ScenicArea';
import { Attraction } from '../entities/Attraction';
import { Facility } from '../entities/Facility';
import { RoadGraphNode } from '../entities/RoadGraphNode';

type DuplicateRow = {
  latitude: number;
  longitude: number;
  count: number;
  scenicAreaId?: string;
};

const checkTableOverlaps = async (
  label: string,
  tableName: string,
  groupByScenicArea: boolean = false,
) => {
  if (!AppDataSource) {
    throw new Error('Database not initialized');
  }

  const scenicAreaProjection = groupByScenicArea ? 'scenicAreaId, ' : '';
  const scenicAreaGrouping = groupByScenicArea ? ', scenicAreaId' : '';
  const rows = (await AppDataSource.query(`
    SELECT ${scenicAreaProjection}latitude, longitude, COUNT(*) AS count
    FROM ${tableName}
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    GROUP BY latitude, longitude${scenicAreaGrouping}
    HAVING COUNT(*) > 1
    ORDER BY count DESC, latitude ASC, longitude ASC
  `)) as DuplicateRow[];

  console.log(`\n[${label}] exact overlaps: ${rows.length}`);
  if (!rows.length) {
    console.log('  none');
    return false;
  }

  rows.slice(0, 10).forEach((row) => {
    const scenicAreaSuffix = row.scenicAreaId ? `, scenicAreaId=${row.scenicAreaId}` : '';
    console.log(
      `  latitude=${row.latitude}, longitude=${row.longitude}, count=${row.count}${scenicAreaSuffix}`,
    );
  });
  return true;
};

async function main() {
  const dataSource = await initializeDatabase();
  const scenicAreaTable = dataSource.getRepository(ScenicArea).metadata.tableName;
  const attractionTable = dataSource.getRepository(Attraction).metadata.tableName;
  const facilityTable = dataSource.getRepository(Facility).metadata.tableName;
  const roadNodeTable = dataSource.getRepository(RoadGraphNode).metadata.tableName;

  const scenicAreaHasOverlap = await checkTableOverlaps('scenic_areas', scenicAreaTable);
  const attractionHasOverlap = await checkTableOverlaps('attractions', attractionTable);
  const facilityHasOverlap = await checkTableOverlaps('facilities', facilityTable);
  const roadNodeHasOverlap = await checkTableOverlaps('road_graph_nodes', roadNodeTable);
  const roadNodeByScenicHasOverlap = await checkTableOverlaps('road_graph_nodes_by_scenic_area', roadNodeTable, true);

  const hasAnyOverlap =
    scenicAreaHasOverlap ||
    attractionHasOverlap ||
    facilityHasOverlap ||
    roadNodeHasOverlap ||
    roadNodeByScenicHasOverlap;

  console.log(`\nCoordinate overlap summary: ${hasAnyOverlap ? 'duplicates found' : 'no exact duplicates found'}`);
  process.exitCode = hasAnyOverlap ? 1 : 0;
}

main()
  .catch((error) => {
    console.error('Failed to inspect coordinate overlaps:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (AppDataSource?.isInitialized) {
      await AppDataSource.destroy();
    }
  });
