import https from 'https';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from '../config/database';
import { REAL_SCENIC_CATALOG, ScenicCatalogItem } from '../data/realScenicCatalog';
import { ScenicArea } from '../entities/ScenicArea';

type WikimediaApiPage = {
  title: string;
  imageinfo?: Array<{
    width?: number;
    height?: number;
    thumburl?: string;
    url?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }>;
};

type WikimediaApiResponse = {
  query?: {
    pages?: Record<string, WikimediaApiPage>;
  };
};

const COMMONS_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';
const REQUEST_DELAY_MS = Number(process.env.WIKIMEDIA_IMPORT_DELAY_MS ?? 120);
const MAX_QUERY_RESULTS = Number(process.env.WIKIMEDIA_QUERY_LIMIT ?? 8);
const FORCE_UPDATE = ['1', 'true', 'yes'].includes((process.env.WIKIMEDIA_FORCE_UPDATE || '').toLowerCase());
const TARGET_NAMES = new Set(
  (process.env.WIKIMEDIA_TARGET_NAMES || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);
const USER_AGENT =
  process.env.WIKIMEDIA_USER_AGENT ||
  'PersonalizedTravelSystem/1.0 (course-project demo; contact=local-dev@example.com)';

const queryOverrides: Record<string, string[]> = {
  西北大学: ['西北大学 太白校区', 'Northwest University Taibai Campus', '西北大学 中国', '西北大学'],
  天津大学: ['Tianjin University campus', 'Peiyang Campus, Tianjin University', '天津大学'],
  天津海昌极地海洋公园: ['天津海昌极地海洋世界', '天津海昌极地海洋公园'],
  楼观台景区: ['Louguantai', 'Louguantai Temple', '楼观台景区'],
  武隆喀斯特旅游区: ['Wulong Karst', 'Wulong Karst Three Natural Bridges', '武隆喀斯特旅游区'],
  北京交通大学: [
    'Beijing Jiaotong University South Gate',
    'Beijing Jiaotong University West Gate',
    'BJTUgate',
    'Bjtu siyuan building',
    'Beijing Jiaotong University campus',
    '北京交通大学',
  ],
  北京航空航天大学: [
    'Campus view of Beihang University Shahe Campus',
    'Main building of Beihang University Shahe Campus',
    'Street view of Beihang University Shahe Campus',
    'Beihang University Shahe Campus',
    '北京航空航天大学',
  ],
  杭州师范大学: ['Hangzhou Normal University Stadium', '杭州师范大学', 'Hangzhou Normal University'],
  电子科技大学: [
    'Gingko Avenue, University of Electronic Science and Technology of China',
    'Uestc library',
    'University of Electronic Science and Technology of China campus',
    '电子科技大学',
  ],
  武汉大学: ['University Wuhan - Campus', 'Whu old library', 'Wuhan University campus', '武汉大学'],
  五大道文化旅游区: ['Five Great Avenues Tianjin', 'Five Great Avenues 21453 Tianjin', '五大道'],
};

const preferredTitleOverrides: Record<string, string[]> = {
  北京交通大学: ['bjtugate.jpg', 'beijing jiaotong university south gate.jpg', 'beijing jiaotong university west gate.jpg'],
};

const negativeTitlePatterns = [
  /logo/i,
  /icon/i,
  /map/i,
  /badge/i,
  /seal/i,
  /diagram/i,
  /plan/i,
  /route/i,
  /ticket/i,
  /name\.svg/i,
  /\bname\b/i,
  /student card/i,
  /temporary site/i,
  /name wall/i,
  /station/i,
  /emblem/i,
  /\.pdf$/i,
  /\.djvu$/i,
  /hospital/i,
  /middle school/i,
  /ceremony/i,
  /portrait/i,
  /statue/i,
  /stone/i,
  /platform/i,
  /subway/i,
  /metro/i,
  /exit [a-z0-9]/i,
  /under construction/i,
  /xiong'?an/i,
  /weihai/i,
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const decodeHtml = (value: string) =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const isPoorQualityCover = (scenic: ScenicArea) => {
  const text = `${scenic.coverImageUrl || ''} ${scenic.coverPageUrl || ''}`.toLowerCase();
  return (
    text.includes('.svg') ||
    text.includes('.pdf') ||
    text.includes('.djvu') ||
    text.includes('logo') ||
    text.includes('name.svg') ||
    text.includes('name.png') ||
    text.includes('student_card') ||
    text.includes('student card') ||
    text.includes('temporary_site') ||
    text.includes('temporary site') ||
    text.includes('name_wall') ||
    text.includes('name wall') ||
    text.includes('emblem') ||
    text.includes('hospital') ||
    text.includes('middle_school') ||
    text.includes('middle school') ||
    text.includes('station') ||
    text.includes('metro') ||
    text.includes('subway') ||
    text.includes('platform') ||
    text.includes('ceremony') ||
    text.includes('graduation') ||
    text.includes('statue') ||
    text.includes('stone') ||
    text.includes('michel_talagrand') ||
    text.includes('liu_yu') ||
    text.includes('附属') ||
    text.includes('医院') ||
    text.includes('中学')
  );
};

const requestJson = <T>(url: string): Promise<T> =>
  new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json',
          },
        },
        (response) => {
          if ((response.statusCode || 0) >= 400) {
            reject(new Error(`请求 Wikimedia Commons 失败：HTTP ${response.statusCode}`));
            response.resume();
            return;
          }

          let raw = '';
          response.on('data', (chunk) => {
            raw += chunk;
          });
          response.on('end', () => {
            try {
              resolve(JSON.parse(raw) as T);
            } catch (error) {
              reject(error);
            }
          });
        },
      )
      .on('error', reject);
  });

const buildSearchUrl = (query: string) => {
  const url = new URL(COMMONS_ENDPOINT);
  url.searchParams.set('action', 'query');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('gsrsearch', query);
  url.searchParams.set('gsrlimit', String(MAX_QUERY_RESULTS));
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|size|extmetadata');
  url.searchParams.set('iiurlwidth', '1400');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  return url.toString();
};

const scoreCandidate = (item: ScenicCatalogItem, page: WikimediaApiPage) => {
  const info = page.imageinfo?.[0];
  if (!info) {
    return Number.NEGATIVE_INFINITY;
  }

  const title = page.title || '';
  const categories = decodeHtml(info.extmetadata?.Categories?.value || '');
  const description = decodeHtml(info.extmetadata?.ImageDescription?.value || '');
  const searchable = `${title} ${categories} ${description}`.toLowerCase();
  const normalizedTitle = title.toLowerCase();
  const ratio = info.width && info.height ? info.width / info.height : 0;

  if (/\.pdf$|\.djvu$|route map|line map|student card|temporary site|name wall/i.test(title)) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;
  if ((info.width || 0) >= 1200) score += 8;
  if ((info.width || 0) >= 1800) score += 6;
  if (ratio >= 1.25) score += 16;
  if (ratio >= 1.5) score += 8;
  if (ratio > 0 && ratio < 1) score -= 10;
  if (searchable.includes(item.name.toLowerCase())) score += 20;
  if (searchable.includes(item.city.toLowerCase())) score += 10;
  if (item.category === '校园' && /university|campus|大学|校园/i.test(searchable)) score += 10;
  if (item.category === '校园' && /campus|gate|building|teaching|library|lake|校门|教学楼|校区/i.test(searchable)) score += 14;
  if (item.category === '校园' && /main building|campus view|street view|old library|stadium|avenue|entrance|主楼|图书馆|体育馆|大道|校园风光|校门/i.test(searchable)) score += 18;
  if (item.category === '校园' && /south gate|west gate|north gate|east gate|正门|南门|西门|东门|北门/i.test(searchable)) score += 20;
  if (item.category === '景区' && /park|scenic|temple|museum|景区|公园|古镇|博物馆|长城|石窟/i.test(searchable)) score += 10;
  if (item.category === '景区' && /bridge|mountain|karst|grotto|lake|garden|pagoda|古塔|风景|景观/i.test(searchable)) score += 12;
  if (/student card|temporary site|name wall|logo|icon|badge|seal|emblem|pdf|djvu/.test(searchable)) score -= 28;
  if (/hospital|middle school|affiliated|station|subway|metro|platform|exit [a-z0-9]|ceremony|graduation|portrait|statue|stone|医院|附属|中学|地铁|站台|毕业/i.test(searchable)) score -= 36;
  if (/lion|left lion|right lion|stone lion|石狮/i.test(searchable)) score -= 16;
  if (/under construction|xiong'?an|weihai|附属中学|campus station/i.test(searchable)) score -= 32;
  if (/michel talagrand|liu yu/i.test(searchable)) score -= 40;

  const preferredTitles = preferredTitleOverrides[item.name] || [];
  if (preferredTitles.some((preferredTitle) => normalizedTitle === `file:${preferredTitle}` || normalizedTitle.endsWith(preferredTitle))) {
    score += 120;
  }
  if (info.extmetadata?.LicenseShortName?.value || info.extmetadata?.UsageTerms?.value) score += 6;
  if (info.thumburl) score += 6;

  for (const pattern of negativeTitlePatterns) {
    if (pattern.test(title)) {
      score -= 18;
    }
  }

  return score;
};

const findBestCommonsImage = async (item: ScenicCatalogItem) => {
  const queries = Array.from(
    new Set([
      ...(queryOverrides[item.name] || []),
      ...(item.wikimediaQueries || []),
      item.name,
      `${item.city}${item.name}`,
      `${item.city} ${item.name}`,
      `${item.name} ${item.city}`,
    ]),
  );

  let bestMatch:
    | {
        page: WikimediaApiPage;
        query: string;
        score: number;
      }
    | null = null;

  for (const query of queries) {
    const response = await requestJson<WikimediaApiResponse>(buildSearchUrl(query));
    const pages = Object.values(response.query?.pages || {});
    if (!pages.length) {
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    for (const page of pages) {
      const score = scoreCandidate(item, page);
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { page, query, score };
      }
    }

    await sleep(REQUEST_DELAY_MS);
  }

  const info = bestMatch?.page.imageinfo?.[0];
  if (!info?.thumburl && !info?.url) {
    return null;
  }

  if ((bestMatch?.score || 0) < 8) {
    return null;
  }

  return {
    coverImageUrl: info.thumburl || info.url || null,
    coverSource: 'Wikimedia Commons',
    coverAuthor: decodeHtml(info.extmetadata?.Artist?.value || info.extmetadata?.Credit?.value || 'Unknown'),
    coverLicense: decodeHtml(
      info.extmetadata?.LicenseShortName?.value || info.extmetadata?.UsageTerms?.value || info.extmetadata?.License?.value || 'Unknown',
    ),
    coverPageUrl: info.descriptionurl || null,
    query: bestMatch?.query || item.name,
  };
};

async function runImport() {
  const dataSource = new DataSource(createDatabaseOptions());

  try {
    await dataSource.initialize();
    const scenicRepo = dataSource.getRepository(ScenicArea);
    const catalogMap = new Map(REAL_SCENIC_CATALOG.map((item) => [item.name, item]));
    const scenicAreas = await scenicRepo.find({ order: { category: 'ASC', name: 'ASC' } });

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (let index = 0; index < scenicAreas.length; index += 1) {
      const scenic = scenicAreas[index];
      if (TARGET_NAMES.size > 0 && !TARGET_NAMES.has(scenic.name)) {
        continue;
      }
      const catalogItem =
        catalogMap.get(scenic.name) ||
        ({
          name: scenic.name,
          city: scenic.name.slice(0, 2),
          category: (scenic.category as '景区' | '校园') || '景区',
        } satisfies ScenicCatalogItem);

      if (!FORCE_UPDATE && scenic.coverImageUrl && scenic.coverSource === 'Wikimedia Commons' && !isPoorQualityCover(scenic)) {
        skippedCount += 1;
        continue;
      }

      const result = await findBestCommonsImage(catalogItem);
      if (!result) {
        failedCount += 1;
        console.log(`[${index + 1}/${scenicAreas.length}] 未找到封面：${scenic.name}`);
        continue;
      }

      scenic.coverImageUrl = result.coverImageUrl;
      scenic.coverSource = result.coverSource;
      scenic.coverAuthor = result.coverAuthor;
      scenic.coverLicense = result.coverLicense;
      scenic.coverPageUrl = result.coverPageUrl;
      await scenicRepo.save(scenic);
      successCount += 1;

      console.log(`[${index + 1}/${scenicAreas.length}] 已更新：${scenic.name} <- ${result.query}`);
      await sleep(REQUEST_DELAY_MS);
    }

    console.log(`Wikimedia Commons 导入完成：成功 ${successCount}，跳过 ${skippedCount}，失败 ${failedCount}`);
  } catch (error) {
    console.error('Wikimedia Commons 批量导入失败:', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void runImport();
