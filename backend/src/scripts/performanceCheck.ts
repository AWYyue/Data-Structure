import { performance } from 'perf_hooks';
import { initializeDatabase, AppDataSource } from '../config/database';
import { RecommendationService } from '../services/RecommendationService';
import { PathPlanningService } from '../services/PathPlanningService';

interface Metric {
  min: number;
  max: number;
  avg: number;
  p95: number;
}

async function measure(label: string, rounds: number, fn: () => Promise<unknown>): Promise<Metric> {
  const samples: number[] = [];
  for (let i = 0; i < rounds; i += 1) {
    const start = performance.now();
    await fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const min = samples[0] ?? 0;
  const max = samples[samples.length - 1] ?? 0;
  const avg = samples.reduce((sum, value) => sum + value, 0) / Math.max(samples.length, 1);
  const p95Index = Math.min(samples.length - 1, Math.floor(samples.length * 0.95));
  const p95 = samples[p95Index] ?? 0;

  console.log(
    `${label} -> min=${min.toFixed(2)}ms, avg=${avg.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, max=${max.toFixed(2)}ms`,
  );

  return { min, max, avg, p95 };
}

async function run() {
  await initializeDatabase();

  const recommendationService = new RecommendationService();
  const pathPlanningService = new PathPlanningService();
  await pathPlanningService.initializeRoadGraph();

  console.log('== 性能检查（每项 20 次）==');

  await measure('推荐-热度榜', 20, async () => {
    await recommendationService.getPopularityRanking(10);
  });

  await measure('推荐-评分榜', 20, async () => {
    await recommendationService.getRatingRanking(10);
  });

  const network = await pathPlanningService.getRoadNetwork();
  if (network.nodes.length >= 2) {
    const startNodeId = network.nodes[0].id;
    const endNodeId = network.nodes[Math.min(5, network.nodes.length - 1)].id;

    await measure('路径-最短时间', 20, async () => {
      await pathPlanningService.getShortestTimePath(startNodeId, endNodeId);
    });
  } else {
    console.log('路径-最短时间 -> 跳过（节点数不足）');
  }

  if (AppDataSource?.isInitialized) {
    await AppDataSource.destroy();
  }
}

run().catch(async (error) => {
  console.error('性能检查失败:', error);
  if (AppDataSource?.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
