import { useEffect, useRef, useState } from 'react';
import {
  BrowserCurrentLocation,
  BrowserLocationRequestOptions,
  clearBrowserCurrentLocationWatch,
  requestBrowserCurrentLocation,
  resolveCurrentLocationErrorMessage,
  watchBrowserCurrentLocation,
} from '../utils/currentLocation';

interface UseCurrentLocationOptions extends BrowserLocationRequestOptions {
  autoRequest?: boolean;
  watchOnMount?: boolean;
}

interface UseCurrentLocationResult {
  location: BrowserCurrentLocation | null;
  error: string | null;
  isLoading: boolean;
  isWatching: boolean;
  requestLocation: (options?: BrowserLocationRequestOptions) => Promise<BrowserCurrentLocation | null>;
  startWatching: (options?: BrowserLocationRequestOptions) => boolean;
  stopWatching: () => void;
  getLatestError: () => string | null;
  clearError: () => void;
}

export const useCurrentLocation = ({
  autoRequest = false,
  watchOnMount = false,
  enableHighAccuracy,
  timeout,
  maximumAge,
}: UseCurrentLocationOptions = {}): UseCurrentLocationResult => {
  const [location, setLocation] = useState<BrowserCurrentLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const isMountedRef = useRef(true);
  const watchIdRef = useRef<number | null>(null);
  const latestErrorRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearBrowserCurrentLocationWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, []);

  const requestLocation = async (options: BrowserLocationRequestOptions = {}) => {
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }
    latestErrorRef.current = null;

    try {
      const result = await requestBrowserCurrentLocation({
        enableHighAccuracy,
        timeout,
        maximumAge,
        ...options,
      });
      if (isMountedRef.current) {
        setLocation(result);
      }
      return result;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '当前位置获取失败，请稍后重试。';
      latestErrorRef.current = message;
      if (isMountedRef.current) {
        setError(message);
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const stopWatching = () => {
    clearBrowserCurrentLocationWatch(watchIdRef.current);
    watchIdRef.current = null;
    if (isMountedRef.current) {
      setIsWatching(false);
      setIsLoading(false);
    }
  };

  const startWatching = (options: BrowserLocationRequestOptions = {}) => {
    stopWatching();

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (isMountedRef.current) {
        setError(resolveCurrentLocationErrorMessage());
      }
      return false;
    }

    if (isMountedRef.current) {
      setError(null);
      setIsLoading(true);
      setIsWatching(true);
    }
    latestErrorRef.current = null;

    try {
      watchIdRef.current = watchBrowserCurrentLocation(
        (nextLocation) => {
          if (!isMountedRef.current) {
            return;
          }
          setLocation(nextLocation);
          setError(null);
          setIsLoading(false);
        },
        (message) => {
          latestErrorRef.current = message;
          if (!isMountedRef.current) {
            return;
          }
          setError(message);
          setIsLoading(false);
          setIsWatching(false);
          clearBrowserCurrentLocationWatch(watchIdRef.current);
          watchIdRef.current = null;
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
          ...options,
        },
      );
      return true;
    } catch (watchError) {
      if (isMountedRef.current) {
        const message = watchError instanceof Error ? watchError.message : resolveCurrentLocationErrorMessage();
        latestErrorRef.current = message;
        setError(message);
        setIsLoading(false);
        setIsWatching(false);
      }
      return false;
    }
  };

  useEffect(() => {
    if (!autoRequest) {
      return;
    }

    void requestLocation();
  }, [autoRequest, enableHighAccuracy, maximumAge, timeout]);

  useEffect(() => {
    if (!watchOnMount) {
      return;
    }

    startWatching();
    return () => {
      stopWatching();
    };
  }, [watchOnMount, enableHighAccuracy, maximumAge, timeout]);

  return {
    location,
    error,
    isLoading,
    isWatching,
    requestLocation,
    startWatching,
    stopWatching,
    getLatestError: () => latestErrorRef.current,
    clearError: () => {
      latestErrorRef.current = null;
      setError(null);
    },
  };
};

export default useCurrentLocation;
