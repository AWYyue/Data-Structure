import type { ScenicArea } from '../services/recommendationService';

const tianjinMedicalName = '\u5929\u6d25\u533b\u79d1\u5927\u5b66';
const buptName = '\u5317\u4eac\u90ae\u7535\u5927\u5b66';

export const replaceTianjinMedicalWithBupt = (items: ScenicArea[]) => {
  const actualBupt = items.find((item) => item.name === buptName);
  if (!actualBupt) {
    return items;
  }

  const mapped = items.map((item) => {
    if (item.name !== tianjinMedicalName) {
      return item;
    }

    return { ...actualBupt };
  });

  return mapped.filter((item, index) => {
    if (item.name !== buptName) {
      return true;
    }

    return mapped.findIndex((candidate) => candidate.name === buptName) === index;
  });
};

export const promotedBuptId = '';
export const promotedBuptKeyword = buptName;
