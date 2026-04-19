import express from 'express';
import { QueryService } from '../services/QueryService';

const router = express.Router();
const queryService = new QueryService();

const parseStringArrayQuery = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(','))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const parseOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

router.get('/scenic-area/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await queryService.getScenicAreaDetails(id);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: error.message },
    });
  }
});

router.get('/scenic-areas/suggestions', async (req, res) => {
  try {
    const { prefix, limit } = req.query;
    const suggestions = await queryService.searchScenicAreaSuggestions(
      String(prefix || ''),
      limit ? parseInt(limit as string, 10) : 10,
    );
    res.status(200).json({ success: true, data: suggestions });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: error.message },
    });
  }
});

router.get('/scenic-areas/categories', async (_req, res) => {
  try {
    const categories = await queryService.listScenicAreaCategories();
    res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: error.message },
    });
  }
});

router.get('/scenic-areas', async (req, res) => {
  try {
    const { query, name, limit, min_rating } = req.query;
    const scenicAreas = await queryService.queryScenicAreas({
      name: String(name || query || ''),
      categories: parseStringArrayQuery(req.query.category),
      minRating: parseOptionalNumber(min_rating),
      limit: limit ? parseInt(limit as string, 10) : 10,
    });
    res.status(200).json({ success: true, data: scenicAreas });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: error.message },
    });
  }
});

router.get('/facilities', async (req, res) => {
  try {
    const { type, scenicAreaId, limit, latitude, longitude, radiusKm } = req.query;
    const hasLocation = latitude !== undefined && longitude !== undefined;

    const facilities = await queryService.searchFacilities({
      type: type as string,
      scenicAreaId: scenicAreaId as string,
      userLocation: hasLocation
        ? {
            latitude: parseFloat(latitude as string),
            longitude: parseFloat(longitude as string),
          }
        : undefined,
      radiusKm: radiusKm !== undefined ? parseFloat(radiusKm as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : 10,
    });

    res.status(200).json({ success: true, data: facilities });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: error.message },
    });
  }
});

router.get('/food', async (req, res) => {
  try {
    const { query, limit } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'query is required' },
      });
    }
    const foods = await queryService.searchFood(
      query as string,
      limit ? parseInt(limit as string, 10) : 10,
    );
    res.status(200).json({ success: true, data: foods });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: error.message },
    });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { query, limit } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'query is required' },
      });
    }
    const results = await queryService.search(
      query as string,
      limit ? parseInt(limit as string, 10) : 15,
    );
    res.status(200).json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: error.message },
    });
  }
});

router.get('/scenic-areas-by-category', async (req, res) => {
  try {
    const { category, limit } = req.query;
    if (!category) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'category is required' },
      });
    }
    const scenicAreas = await queryService.searchScenicAreasByCategory(
      category as string,
      limit ? parseInt(limit as string, 10) : 10,
    );
    res.status(200).json({ success: true, data: scenicAreas });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: error.message },
    });
  }
});

router.get('/scenic-areas-by-tag', async (req, res) => {
  try {
    const { tag, limit } = req.query;
    if (!tag) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'tag is required' },
      });
    }
    const scenicAreas = await queryService.searchScenicAreasByTag(
      tag as string,
      limit ? parseInt(limit as string, 10) : 10,
    );
    res.status(200).json({ success: true, data: scenicAreas });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: error.message },
    });
  }
});

router.get('/diaries', async (req, res) => {
  try {
    const { query, limit } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'query is required' },
      });
    }
    const diaries = await queryService.searchDiaries(
      query as string,
      limit ? parseInt(limit as string, 10) : 10,
    );
    res.status(200).json({ success: true, data: diaries });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: error.message },
    });
  }
});

router.get('/diaries-by-destination', async (req, res) => {
  try {
    const { destination, limit } = req.query;
    if (!destination) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'destination is required' },
      });
    }
    const diaries = await queryService.searchDiariesByDestination(
      destination as string,
      limit ? parseInt(limit as string, 10) : 10,
    );
    res.status(200).json({ success: true, data: diaries });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'QUERY_FAILED', message: error.message },
    });
  }
});

router.get('/export-data', async (_req, res) => {
  try {
    const jsonData = await queryService.exportScenicAreaData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=scenic-area-data-${new Date().toISOString().split('T')[0]}.json`);
    res.setHeader('Content-Length', jsonData.length);
    res.status(200).send(jsonData);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'EXPORT_FAILED', message: error.message },
    });
  }
});

router.post('/import-data', async (req, res) => {
  try {
    const result = await queryService.importScenicAreaData(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'IMPORT_FAILED', message: error.message },
    });
  }
});

export default router;
