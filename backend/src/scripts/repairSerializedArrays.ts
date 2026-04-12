import { DataSource } from 'typeorm';
import { createDatabaseOptions } from '../config/database';
import { normalizeStringArray, serializeStringArray } from '../utils/stringArrayField';

type RepairStats = Record<string, number>;

const shouldRepairValue = (value: unknown) => {
  const normalized = normalizeStringArray(value);
  return {
    normalized,
    serialized: serializeStringArray(normalized),
    needsRepair: !Array.isArray(value) || serializeStringArray(value) !== serializeStringArray(normalized),
  };
};

async function main() {
  const dataSource = new DataSource(createDatabaseOptions());
  const stats: RepairStats = {};

  try {
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const users = await queryRunner.query(
        'SELECT id, interests, viewedItems, favorites, dislikedCategories FROM users',
      );
      for (const user of users as Array<Record<string, unknown>>) {
        const interests = shouldRepairValue(user.interests);
        const viewedItems = shouldRepairValue(user.viewedItems);
        const favorites = shouldRepairValue(user.favorites);
        const dislikedCategories = shouldRepairValue(user.dislikedCategories);

        if (interests.needsRepair || viewedItems.needsRepair || favorites.needsRepair || dislikedCategories.needsRepair) {
          await queryRunner.query(
            'UPDATE users SET interests = ?, viewedItems = ?, favorites = ?, dislikedCategories = ? WHERE id = ?',
            [
              interests.serialized,
              viewedItems.serialized,
              favorites.serialized,
              dislikedCategories.serialized,
              user.id,
            ],
          );
        }

        if (interests.needsRepair) stats['users.interests'] = (stats['users.interests'] || 0) + 1;
        if (viewedItems.needsRepair) stats['users.viewedItems'] = (stats['users.viewedItems'] || 0) + 1;
        if (favorites.needsRepair) stats['users.favorites'] = (stats['users.favorites'] || 0) + 1;
        if (dislikedCategories.needsRepair) {
          stats['users.dislikedCategories'] = (stats['users.dislikedCategories'] || 0) + 1;
        }
      }

      const diaries = await queryRunner.query('SELECT id, route FROM diaries');
      for (const diary of diaries as Array<Record<string, unknown>>) {
        const route = shouldRepairValue(diary.route);
        if (!route.needsRepair) {
          continue;
        }
        await queryRunner.query('UPDATE diaries SET route = ? WHERE id = ?', [route.serialized, diary.id]);
        stats['diaries.route'] = (stats['diaries.route'] || 0) + 1;
      }

      const attractions = await queryRunner.query('SELECT id, tags FROM attractions');
      for (const attraction of attractions as Array<Record<string, unknown>>) {
        const tags = shouldRepairValue(attraction.tags);
        if (!tags.needsRepair) {
          continue;
        }
        await queryRunner.query('UPDATE attractions SET tags = ? WHERE id = ?', [tags.serialized, attraction.id]);
        stats['attractions.tags'] = (stats['attractions.tags'] || 0) + 1;
      }

      const foods = await queryRunner.query('SELECT id, tags FROM foods');
      for (const food of foods as Array<Record<string, unknown>>) {
        const tags = shouldRepairValue(food.tags);
        if (!tags.needsRepair) {
          continue;
        }
        await queryRunner.query('UPDATE foods SET tags = ? WHERE id = ?', [tags.serialized, food.id]);
        stats['foods.tags'] = (stats['foods.tags'] || 0) + 1;
      }

      await queryRunner.commitTransaction();
      console.log('Array field repair completed.');
      Object.entries(stats)
        .sort(([left], [right]) => left.localeCompare(right))
        .forEach(([label, count]) => {
          console.log(`- ${label}: ${count}`);
        });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void main().catch((error) => {
  console.error('Array field repair failed:', error);
  process.exitCode = 1;
});
