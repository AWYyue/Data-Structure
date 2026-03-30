export type JourneyIntensity = 'low' | 'medium' | 'high';

export interface JourneyPlanStop {
  attractionId: string;
  name: string;
  arrivalTime: string;
  stayDuration: number;
  isMustVisit: boolean;
}

export interface StoredJourneyContext {
  scenicAreaId: string | null;
  scenicAreaName: string | null;
  intensity: JourneyIntensity;
  plan: JourneyPlanStop[];
  totalDistance: number;
  totalTime: number;
  updatedAt: string;
}

const JOURNEY_CONTEXT_KEY = 'travel-system.journey-context';

const normalizeJourneyPlan = (value: unknown): JourneyPlanStop[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const source = item as Partial<JourneyPlanStop>;
      if (!source?.attractionId || !source?.name || !source?.arrivalTime) {
        return null;
      }

      return {
        attractionId: String(source.attractionId),
        name: String(source.name),
        arrivalTime: String(source.arrivalTime),
        stayDuration: Number(source.stayDuration || 0),
        isMustVisit: Boolean(source.isMustVisit),
      };
    })
    .filter((item): item is JourneyPlanStop => Boolean(item));
};

export const getJourneyContext = (): StoredJourneyContext | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(JOURNEY_CONTEXT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredJourneyContext>;
    return {
      scenicAreaId: parsed.scenicAreaId ? String(parsed.scenicAreaId) : null,
      scenicAreaName: parsed.scenicAreaName ? String(parsed.scenicAreaName) : null,
      intensity:
        parsed.intensity === 'low' || parsed.intensity === 'high' ? parsed.intensity : 'medium',
      plan: normalizeJourneyPlan(parsed.plan),
      totalDistance: Number(parsed.totalDistance || 0),
      totalTime: Number(parsed.totalTime || 0),
      updatedAt: parsed.updatedAt ? String(parsed.updatedAt) : new Date().toISOString(),
    };
  } catch {
    window.sessionStorage.removeItem(JOURNEY_CONTEXT_KEY);
    return null;
  }
};

export const saveJourneyContext = (context: StoredJourneyContext) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(JOURNEY_CONTEXT_KEY, JSON.stringify(context));
};

export const clearJourneyContext = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(JOURNEY_CONTEXT_KEY);
};
