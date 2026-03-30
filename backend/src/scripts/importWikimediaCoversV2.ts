import https from 'https';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from '../config/database';
import { REAL_SCENIC_CATALOG, ScenicCatalogItem } from '../data/realScenicCatalog';
import { ScenicArea } from '../entities/ScenicArea';

type WikimediaImageInfo = {
  width?: number;
  height?: number;
  thumburl?: string;
  url?: string;
  descriptionurl?: string;
  extmetadata?: Record<string, { value?: string }>;
};

type WikimediaApiPage = {
  title: string;
  imageinfo?: WikimediaImageInfo[];
};

type WikimediaApiResponse = {
  query?: {
    pages?: Record<string, WikimediaApiPage>;
  };
};

type WikimediaCandidate = {
  page: WikimediaApiPage;
  source: string;
  score: number;
};

type CoverImportResult = {
  coverImageUrl: string | null;
  coverSource: string;
  coverAuthor: string;
  coverLicense: string;
  coverPageUrl: string | null;
  source: string;
};

type PexelsPhoto = {
  width?: number;
  height?: number;
  url?: string;
  alt?: string;
  src?: {
    large2x?: string;
    large?: string;
    landscape?: string;
    medium?: string;
  };
  photographer?: string;
};

type PexelsSearchResponse = {
  photos?: PexelsPhoto[];
};

type UnsplashPhoto = {
  width?: number;
  height?: number;
  alt_description?: string | null;
  description?: string | null;
  urls?: {
    regular?: string;
    full?: string;
    small?: string;
  };
  links?: {
    html?: string;
  };
  user?: {
    name?: string;
  };
};

type UnsplashSearchResponse = {
  results?: UnsplashPhoto[];
};

const COMMONS_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';
const REQUEST_DELAY_MS = Number(process.env.WIKIMEDIA_IMPORT_DELAY_MS ?? 120);
const MAX_QUERY_RESULTS = Number(process.env.WIKIMEDIA_QUERY_LIMIT ?? 8);
const FORCE_UPDATE = ['1', 'true', 'yes'].includes((process.env.WIKIMEDIA_FORCE_UPDATE || '').toLowerCase());
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const COVER_PROVIDER_ORDER = (process.env.COVER_PROVIDER_ORDER || 'wikimedia,pexels,unsplash')
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);
const TARGET_NAMES = new Set(
  (process.env.WIKIMEDIA_TARGET_NAMES || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);
const USER_AGENT =
  process.env.WIKIMEDIA_USER_AGENT ||
  'PersonalizedTravelSystem/1.0 (course-project demo; contact=local-dev@example.com)';
const UNSPLASH_APP_NAME = process.env.UNSPLASH_APP_NAME || 'personalized-travel-system';

const exactTitleOverrides: Record<string, string[]> = {
  湖北省博物馆: ['Hubei Provincial Museum.JPG'],
  西安邮电大学: ["Yanta Campus of Xi'an University of Post & Telecommunications.jpg", '西安邮电大学图书馆.jpg'],
  华东政法大学: ['East China University of Political Science and Law, Shanghai.jpg'],
  上海大学: ['上海大学延长校区第四教学楼.JPG'],
  重庆医科大学: ['重慶醫科大學.JPG'],
  天津理工大学: ['TJUT front facade.jpg'],
  南京工业大学: ['Nanjing Tech Univ. Dingjiaqiao Campus 180313.jpg'],
  红山森林动物园: ['Nanjing Hongshan Forest Zoo.jpg', '南京红山森林动物园门口.jpg'],
  北京交通大学: ['Beijing Jiaotong University South Gate.jpg', 'BJTUgate.jpg'],
  西北大学: ['Northwest University Taibai Campus.JPG'],
  北京航空航天大学: ['South Gate of BUAA Shahe Campus.jpg', 'Main building of Beihang University Shahe Campus.jpg'],
  杭州师范大学: ['Hangzhou Normal University Stadium.jpg'],
  电子科技大学: ['Gingko Avenue, University of Electronic Science and Technology of China.jpg'],
  重庆动物园: ['Main entrance, Chongqing Zoo, China.JPG', 'Giant panda, Chongqing Zoo, China.JPG'],
  中南财经政法大学: ['The South Lake Campus of Zhongnan University of Economics and Law.jpg'],
  五大道文化旅游区: ['Five Great Avenues 21453-Tianjin (49063743276).jpg'],
  南越王博物院: ['Museum of the Mausoleum of the Nanyue King.JPG'],
  西南交通大学: ['The Lake in Jiuli Campus of SWJTU.jpg', 'Building No.0 of Jiuli Campus of SWJTU.jpg'],
  六和塔景区: ['Liuhe Pagoda, Hangzhou.jpg', 'Liuhe Pagoda.jpg'],
  湘湖旅游度假区: ['Xiang Hu.jpg', 'Hushan Sq, Xianghu (1).jpg'],
  白公馆: ['ChongqingBaigongguan.jpg', '20250521 Baigongguan.jpg'],
};

const queryOverrides: Record<string, string[]> = {
  湖北省博物馆: ['Hubei Provincial Museum', '湖北省博物馆'],
  西安邮电大学: ["Yanta Campus of Xi'an University of Post & Telecommunications", 'Xi\'an University of Posts and Telecommunications', '西安邮电大学'],
  华东政法大学: ['East China University of Political Science and Law, Shanghai', 'East China University of Political Science and Law', '华东政法大学'],
  上海大学: ['上海大学 延长校区 第四教学楼', '上海大学', 'Shanghai University campus'],
  重庆医科大学: ['重慶醫科大學', 'Chongqing Medical University', '重庆医科大学'],
  天津理工大学: ['TJUT front facade', 'Tianjin University of Technology', '天津理工大学'],
  南京工业大学: ['Nanjing Tech Univ. Dingjiaqiao Campus', 'Nanjing Tech University campus', '南京工业大学'],
  红山森林动物园: ['Nanjing Hongshan Forest Zoo', '南京红山森林动物园', 'Hongshan Forest Zoo'],
  西北大学: ['西北大学 太白校区', 'Northwest University Taibai Campus', '西北大学 中国', '西北大学'],
  天津大学: ['Tianjin University campus', 'Peiyang Campus, Tianjin University', '天津大学'],
  天津海昌极地海洋公园: ['天津海昌极地海洋世界', 'Tianjin Haichang Polar Ocean World', '天津海昌极地海洋公园'],
  楼观台景区: ['Louguantai', 'Louguantai Temple', '楼观台景区'],
  武隆喀斯特旅游区: ['Wulong Karst', 'Wulong Karst Three Natural Bridges', '武隆喀斯特旅游区'],
  北京交通大学: ['Beijing Jiaotong University South Gate', 'BJTUgate', 'Beijing Jiaotong University campus', '北京交通大学'],
  北京航空航天大学: [
    'South Gate of BUAA Shahe Campus',
    'Main building of Beihang University Shahe Campus',
    'Street view of Beihang University Shahe Campus',
    'Beihang University Shahe Campus',
    '北京航空航天大学',
  ],
  杭州师范大学: ['Hangzhou Normal University Stadium', 'Hangzhou Normal University', '杭州师范大学'],
  电子科技大学: [
    'Gingko Avenue, University of Electronic Science and Technology of China',
    'University of Electronic Science and Technology of China campus',
    '电子科技大学',
  ],
  武汉大学: ['University Wuhan Campus', 'Wuhan University campus', 'Whu old library', '武汉大学'],
  五大道文化旅游区: ['Five Great Avenues Tianjin', 'Five Great Avenues 21453 Tianjin', '五大道文化旅游区'],
  重庆动物园: ['Main entrance Chongqing Zoo China', 'Chongqing Zoo', '重庆动物园'],
  中南财经政法大学: ['The South Lake Campus of Zhongnan University of Economics and Law', 'Zhongnan University of Economics and Law'],
  南越王博物院: ['Museum of the Mausoleum of the Nanyue King', 'Nanyue King Museum', '南越王博物院'],
  西南交通大学: ['The Lake in Jiuli Campus of SWJTU', 'Building No.0 of Jiuli Campus of SWJTU', 'Southwest Jiaotong University'],
  六和塔景区: ['Liuhe Pagoda Hangzhou', 'Liuhe Pagoda', '六和塔景区'],
  湘湖旅游度假区: ['Xiang Hu Hangzhou', 'Xiang Hu', '湘湖旅游度假区'],
  白公馆: ['ChongqingBaigongguan', 'Baigongguan', '白公馆'],
};

const themeFallbackOnlyNames = new Set(['天津医科大学', '天津财经大学', '东湖海洋乐园', '成都大学', '天津科技大学']);

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

const hardNegativeSearchPatterns = [
  /student card/i,
  /temporary site/i,
  /name wall/i,
  /logo/i,
  /icon/i,
  /badge/i,
  /seal/i,
  /emblem/i,
  /pdf/i,
  /djvu/i,
  /hospital/i,
  /middle school/i,
  /affiliated/i,
  /station/i,
  /subway/i,
  /metro/i,
  /platform/i,
  /exit [a-z0-9]/i,
  /ceremony/i,
  /graduation/i,
  /portrait/i,
  /statue/i,
  /stone/i,
  /campaign/i,
  /decoration/i,
  /memorial/i,
  /lion/i,
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

const decodeUrlText = (value: string) => {
  if (!value) {
    return '';
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeSearchableText = (...parts: Array<string | null | undefined>) =>
  parts
    .filter(Boolean)
    .flatMap((part) => {
      const value = String(part);
      return [value, decodeUrlText(value)];
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const getVisualSearchQueries = (item: ScenicCatalogItem) => {
  const baseQueries = [item.name, `${item.city}${item.name}`, `${item.city} ${item.name}`];
  const scenicLike = !isCampusItem(item);
  const text = `${item.name} ${item.category}`.toLowerCase();
  const themedQueries: string[] = [];

  if (isCampusItem(item)) {
    themedQueries.push(`${item.city} university campus`, `${item.city} university architecture`, `${item.city} campus building`);
  } else if (/博物馆|museum/i.test(text)) {
    themedQueries.push(`${item.city} museum exterior`, `${item.city} museum architecture`);
  } else if (/动物园|zoo/i.test(text)) {
    themedQueries.push(`${item.city} zoo entrance`, `${item.city} zoo landscape`);
  } else if (/公园|park|湿地|湖|lake|园林|garden/i.test(text)) {
    themedQueries.push(`${item.city} park landscape`, `${item.city} garden landscape`, `${item.city} lake view`);
  } else if (/寺|庙|塔|pagoda|temple/i.test(text)) {
    themedQueries.push(`${item.city} temple architecture`, `${item.city} pagoda landmark`);
  } else if (/山|峰|谷|karst|grotto/i.test(text)) {
    themedQueries.push(`${item.city} mountain scenic`, `${item.city} natural landscape`);
  } else if (scenicLike) {
    themedQueries.push(`${item.city} landmark travel`, `${item.city} scenic landscape`);
  }

  return Array.from(new Set([...baseQueries, ...themedQueries])).filter(Boolean);
};

const scoreLandscapeAsset = (item: ScenicCatalogItem, width?: number, height?: number, searchable = '') => {
  const ratio = width && height ? width / height : 0;
  let score = 0;

  if ((width || 0) >= 1200) score += 10;
  if ((width || 0) >= 1800) score += 8;
  if (ratio >= 1.25) score += 18;
  if (ratio >= 1.5) score += 10;
  if (ratio > 0 && ratio < 1) score -= 12;
  if (searchable.includes(item.city.toLowerCase())) score += 8;

  if (isCampusItem(item)) {
    if (/campus|university|college|library|gate|building|architecture|校园|大学|图书馆|校门|教学楼/i.test(searchable)) {
      score += 18;
    }
  } else if (/park|museum|temple|mountain|lake|garden|landmark|travel|scenic|公园|博物馆|寺|山|湖|园林|地标/i.test(searchable)) {
    score += 18;
  }

  return score;
};

const isCampusItem = (item: ScenicCatalogItem) => {
  const text = `${item.name} ${item.category}`;
  return /大学|学院|校园|校区|campus|university/i.test(text);
};

const clearCoverFields = (scenic: ScenicArea) => {
  scenic.coverImageUrl = null;
  scenic.coverSource = null;
  scenic.coverAuthor = null;
  scenic.coverLicense = null;
  scenic.coverPageUrl = null;
};

const isPoorQualityCover = (scenic: ScenicArea) => {
  const searchable = normalizeSearchableText(scenic.coverImageUrl, scenic.coverPageUrl, scenic.coverAuthor, scenic.coverLicense);
  return hardNegativeSearchPatterns.some((pattern) => pattern.test(searchable));
};

const requestJson = <T>(url: string, extraHeaders?: Record<string, string>): Promise<T> =>
  new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json',
            ...(extraHeaders || {}),
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

const buildTitleUrl = (title: string) => {
  const url = new URL(COMMONS_ENDPOINT);
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', title.startsWith('File:') ? title : `File:${title}`);
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|size|extmetadata');
  url.searchParams.set('iiurlwidth', '1400');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  return url.toString();
};

const buildPexelsSearchUrl = (query: string) => {
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(Math.min(MAX_QUERY_RESULTS, 10)));
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('size', 'large');
  return url.toString();
};

const buildUnsplashSearchUrl = (query: string) => {
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(Math.min(MAX_QUERY_RESULTS, 10)));
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('content_filter', 'high');
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
  const searchable = normalizeSearchableText(title, categories, description);
  const ratio = info.width && info.height ? info.width / info.height : 0;
  const campusItem = isCampusItem(item);

  if (hardNegativeSearchPatterns.some((pattern) => pattern.test(searchable))) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;

  if ((info.width || 0) >= 1200) score += 10;
  if ((info.width || 0) >= 1800) score += 8;
  if (ratio >= 1.25) score += 18;
  if (ratio >= 1.5) score += 10;
  if (ratio > 0 && ratio < 1) score -= 12;
  if (searchable.includes(item.name.toLowerCase())) score += 20;
  if (searchable.includes(item.city.toLowerCase())) score += 10;

  if (campusItem) {
    if (/university|campus|大学|校园|校区/i.test(searchable)) score += 12;
    if (/gate|building|teaching|library|lake|stadium|avenue|entrance|main building|street view|old library|校门|教学楼|图书馆|体育馆|大道|入口|主楼|远景/i.test(searchable)) {
      score += 20;
    }
    if (/south gate|west gate|north gate|east gate|正门|南门|西门|东门|北门/i.test(searchable)) {
      score += 18;
    }
  } else {
    if (/park|scenic|temple|museum|景区|公园|古镇|博物馆|长城|石窟/i.test(searchable)) score += 12;
    if (/bridge|mountain|karst|grotto|lake|garden|pagoda|风景|景观|主景|塔/i.test(searchable)) score += 16;
    if (/main entrance|entrance|gate|front view|panorama|全景|入口|正门|远景/i.test(searchable)) score += 12;
  }

  const preferredTitles = exactTitleOverrides[item.name] || [];
  const normalizedTitle = title.replace(/^File:/i, '').toLowerCase();
  if (preferredTitles.some((preferredTitle) => preferredTitle.toLowerCase() === normalizedTitle)) {
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

const fetchExactTitleCandidates = async (titles: string[]) => {
  const pages: WikimediaApiPage[] = [];

  for (const title of titles) {
    const response = await requestJson<WikimediaApiResponse>(buildTitleUrl(title));
    const resultPages = Object.values(response.query?.pages || {}).filter((page) => page.imageinfo?.length);
    pages.push(...resultPages);
    await sleep(REQUEST_DELAY_MS);
  }

  return pages;
};

const findBestCommonsImage = async (item: ScenicCatalogItem) => {
  if (themeFallbackOnlyNames.has(item.name)) {
    return null;
  }

  let bestMatch: WikimediaCandidate | null = null;

  const exactTitles = exactTitleOverrides[item.name] || [];
  if (exactTitles.length > 0) {
    const exactPages = await fetchExactTitleCandidates(exactTitles);
    for (const page of exactPages) {
      const score = scoreCandidate(item, page);
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { page, source: 'exact-title', score };
      }
    }
  }

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

  for (const query of queries) {
    const response = await requestJson<WikimediaApiResponse>(buildSearchUrl(query));
    const pages = Object.values(response.query?.pages || {});
    for (const page of pages) {
      const score = scoreCandidate(item, page);
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { page, source: query, score };
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
    source: bestMatch?.source || item.name,
  };
};

const findBestPexelsImage = async (item: ScenicCatalogItem): Promise<CoverImportResult | null> => {
  if (!PEXELS_API_KEY) {
    return null;
  }

  let bestMatch: { photo: PexelsPhoto; source: string; score: number } | null = null;

  for (const query of getVisualSearchQueries(item)) {
    const response = await requestJson<PexelsSearchResponse>(buildPexelsSearchUrl(query), {
      Authorization: PEXELS_API_KEY,
    });
    const photos = response.photos || [];
    for (const photo of photos) {
      const searchable = normalizeSearchableText(query, photo.alt, photo.url, photo.photographer);
      if (hardNegativeSearchPatterns.some((pattern) => pattern.test(searchable))) {
        continue;
      }
      const score = scoreLandscapeAsset(item, photo.width, photo.height, searchable);
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { photo, source: query, score };
      }
    }
    await sleep(REQUEST_DELAY_MS);
  }

  const imageUrl = bestMatch?.photo.src?.large2x || bestMatch?.photo.src?.large || bestMatch?.photo.src?.landscape || bestMatch?.photo.src?.medium;
  if (!imageUrl || (bestMatch?.score || 0) < 12) {
    return null;
  }

  return {
    coverImageUrl: imageUrl,
    coverSource: 'Pexels',
    coverAuthor: bestMatch?.photo.photographer || 'Unknown',
    coverLicense: 'Pexels License',
    coverPageUrl: bestMatch?.photo.url || null,
    source: bestMatch?.source || item.name,
  };
};

const findBestUnsplashImage = async (item: ScenicCatalogItem): Promise<CoverImportResult | null> => {
  if (!UNSPLASH_ACCESS_KEY) {
    return null;
  }

  let bestMatch: { photo: UnsplashPhoto; source: string; score: number } | null = null;

  for (const query of getVisualSearchQueries(item)) {
    const response = await requestJson<UnsplashSearchResponse>(buildUnsplashSearchUrl(query), {
      Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      'Accept-Version': 'v1',
    });
    const photos = response.results || [];
    for (const photo of photos) {
      const searchable = normalizeSearchableText(query, photo.alt_description, photo.description, photo.links?.html, photo.user?.name);
      if (hardNegativeSearchPatterns.some((pattern) => pattern.test(searchable))) {
        continue;
      }
      const score = scoreLandscapeAsset(item, photo.width, photo.height, searchable);
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { photo, source: query, score };
      }
    }
    await sleep(REQUEST_DELAY_MS);
  }

  const imageUrl = bestMatch?.photo.urls?.regular || bestMatch?.photo.urls?.full || bestMatch?.photo.urls?.small;
  if (!imageUrl || (bestMatch?.score || 0) < 12) {
    return null;
  }

  const pageUrl = bestMatch?.photo.links?.html
    ? `${bestMatch.photo.links.html}${bestMatch.photo.links.html.includes('?') ? '&' : '?'}utm_source=${UNSPLASH_APP_NAME}&utm_medium=referral`
    : null;

  return {
    coverImageUrl: imageUrl,
    coverSource: 'Unsplash',
    coverAuthor: bestMatch?.photo.user?.name || 'Unknown',
    coverLicense: 'Unsplash License',
    coverPageUrl: pageUrl,
    source: bestMatch?.source || item.name,
  };
};

const findBestCover = async (item: ScenicCatalogItem): Promise<CoverImportResult | null> => {
  for (const provider of COVER_PROVIDER_ORDER) {
    if (provider === 'wikimedia') {
      const result = await findBestCommonsImage(item);
      if (result) {
        return result;
      }
      continue;
    }

    if (provider === 'pexels') {
      const result = await findBestPexelsImage(item);
      if (result) {
        return result;
      }
      continue;
    }

    if (provider === 'unsplash') {
      const result = await findBestUnsplashImage(item);
      if (result) {
        return result;
      }
    }
  }

  return null;
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
    let clearedCount = 0;
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
          category: scenic.category as ScenicCatalogItem['category'],
          wikimediaQueries: [scenic.name],
        } satisfies ScenicCatalogItem);

      const keepExisting =
        !FORCE_UPDATE &&
        scenic.coverImageUrl &&
        ['Wikimedia Commons', 'Pexels', 'Unsplash'].includes(scenic.coverSource || '') &&
        !isPoorQualityCover(scenic);
      if (keepExisting) {
        skippedCount += 1;
        continue;
      }

      if (themeFallbackOnlyNames.has(scenic.name)) {
        if (scenic.coverImageUrl || scenic.coverPageUrl || scenic.coverSource) {
          clearCoverFields(scenic);
          await scenicRepo.save(scenic);
          clearedCount += 1;
          console.log(`[${index + 1}/${scenicAreas.length}] 已回退主题图：${scenic.name}`);
        } else {
          skippedCount += 1;
        }
        continue;
      }

      const result = await findBestCover(catalogItem);
      if (!result) {
        if (isPoorQualityCover(scenic)) {
          clearCoverFields(scenic);
          await scenicRepo.save(scenic);
          clearedCount += 1;
          console.log(`[${index + 1}/${scenicAreas.length}] 未找到更优封面，已回退主题图：${scenic.name}`);
        } else {
          failedCount += 1;
          console.log(`[${index + 1}/${scenicAreas.length}] 未找到封面：${scenic.name}`);
        }
        continue;
      }

      scenic.coverImageUrl = result.coverImageUrl;
      scenic.coverSource = result.coverSource;
      scenic.coverAuthor = result.coverAuthor;
      scenic.coverLicense = result.coverLicense;
      scenic.coverPageUrl = result.coverPageUrl;
      await scenicRepo.save(scenic);
      successCount += 1;

      console.log(`[${index + 1}/${scenicAreas.length}] 已更新：${scenic.name} <- ${result.source}`);
      await sleep(REQUEST_DELAY_MS);
    }

    console.log(`Wikimedia Commons 导入完成：成功 ${successCount}，跳过 ${skippedCount}，回退 ${clearedCount}，失败 ${failedCount}`);
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
