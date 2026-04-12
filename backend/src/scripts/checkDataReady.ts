import fs from 'fs';
import path from 'path';
import { DataSource } from 'typeorm';
import { createDatabaseOptions, getDatabaseConfigSummary } from '../config/database';

const MIN_COUNTS = {
  scenic_areas: 1,
  attractions: 1,
  facilities: 1,
  road_graph_nodes: 1,
  road_graph_edges: 1,
  diaries: 20,
  diary_comments: 50,
  user_behaviors: 100,
};

const LEGACY_ARRAY_FIELD_CHECKS = [
  { label: 'users.interests', table: 'users', column: 'interests' },
  { label: 'users.viewedItems', table: 'users', column: 'viewedItems' },
  { label: 'users.favorites', table: 'users', column: 'favorites' },
  { label: 'users.dislikedCategories', table: 'users', column: 'dislikedCategories' },
  { label: 'diaries.route', table: 'diaries', column: 'route' },
  { label: 'attractions.tags', table: 'attractions', column: 'tags' },
  { label: 'foods.tags', table: 'foods', column: 'tags' },
];

async function main() {
  const options = createDatabaseOptions();
  const summary = getDatabaseConfigSummary();

  console.log('当前数据库配置:');
  console.log(JSON.stringify(summary, null, 2));

  if (options.type === 'sqlite') {
    const dbFile = String(options.database || '');
    const exists = fs.existsSync(dbFile);
    const projectRoot = path.resolve(__dirname, '..', '..', '..');
    const legacyRootDb = path.join(projectRoot, 'travel_system.db');

    console.log(`SQLite 文件: ${dbFile}`);
    console.log(`文件存在: ${exists ? '是' : '否'}`);

    if (fs.existsSync(legacyRootDb)) {
      console.log(`警告: 检测到根目录历史数据库 ${legacyRootDb}`);
      console.log('当前项目统一使用 backend/travel_system.db，请不要误连根目录旧库。');
    }

    if (!exists) {
      console.log('\n未检测到数据库文件。');
      console.log('请先在仓库根目录执行: npm run setup:data');
      process.exitCode = 1;
      return;
    }

    const stats = fs.statSync(dbFile);
    console.log(`文件大小: ${stats.size} 字节`);
  }

  const dataSource = new DataSource(options);

  try {
    await dataSource.initialize();

    const rows = await Promise.all(
      Object.keys(MIN_COUNTS).map(async (tableName) => {
        const result = await dataSource.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
        const count = Number(result?.[0]?.count ?? result?.[0]?.['COUNT(*)'] ?? 0);
        return { tableName, count };
      }),
    );

    const legacyArrayChecks = await Promise.all(
      LEGACY_ARRAY_FIELD_CHECKS.map(async ({ label, table, column }) => {
        const result = await dataSource.query(
          `SELECT COUNT(*) AS count FROM ${table} WHERE ${column} = ? OR (${column} IS NOT NULL AND TRIM(${column}) <> '' AND ${column} <> '[]' AND SUBSTR(TRIM(${column}), 1, 1) <> '[')`,
          ['[object Object]'],
        );
        const count = Number(result?.[0]?.count ?? result?.[0]?.['COUNT(*)'] ?? 0);
        return { label, count };
      }),
    );

    console.log('\n数据表统计:');
    rows.forEach(({ tableName, count }) => {
      console.log(`- ${tableName}: ${count}`);
    });

    const missing = rows.filter(({ tableName, count }) => count < MIN_COUNTS[tableName as keyof typeof MIN_COUNTS]);
    if (missing.length) {
      console.log('\n检测结果: 演示数据未准备完整。');
      console.log('建议执行: npm run setup:data');
      process.exitCode = 1;
      return;
    }

    const legacyArrayFields = legacyArrayChecks.filter(({ count }) => count > 0);
    if (legacyArrayFields.length) {
      console.log('\n检测结果: 发现旧格式数组字段数据，建议先修复。');
      legacyArrayFields.forEach(({ label, count }) => {
        console.log(`- ${label}: ${count}`);
      });
      console.log('建议执行: cd backend && npm run repair-data:arrays');
      process.exitCode = 1;
      return;
    }

    console.log('\n检测结果: 演示数据已就绪，可以正常启动前后端并进行答辩演示。');
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void main().catch((error) => {
  console.error('检查失败:', error);
  console.log('如果你是刚 clone 仓库，请先在仓库根目录执行 npm run setup:data');
  process.exitCode = 1;
});
