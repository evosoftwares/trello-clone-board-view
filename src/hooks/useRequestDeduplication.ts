import { useRef, useCallback } from 'react';

interface RequestCache {
  [key: string]: {
    promise: Promise<any>;
    timestamp: number;
    data?: any;
  };
}

const CACHE_DURATION = 30 * 1000; // 30 seconds

export const useRequestDeduplication = () => {
  const cacheRef = useRef<RequestCache>({});

  const deduplicate = useCallback(<T>(
    key: string,
    requestFn: () => Promise<T>,
    cacheDuration = CACHE_DURATION
  ): Promise<T> => {
    const now = Date.now();
    const cached = cacheRef.current[key];

    // Return cached promise if it's still pending and recent
    if (cached && (now - cached.timestamp) < cacheDuration) {
      console.log(`[DEDUP] Using cached request for key: ${key}`);
      return cached.promise;
    }

    // Clean expired entries
    Object.keys(cacheRef.current).forEach(cacheKey => {
      const entry = cacheRef.current[cacheKey];
      if (now - entry.timestamp > cacheDuration) {
        delete cacheRef.current[cacheKey];
      }
    });

    // Create new request
    console.log(`[DEDUP] Creating new request for key: ${key}`);
    const promise = requestFn().finally(() => {
      // Clean up after request completes
      setTimeout(() => {
        delete cacheRef.current[key];
      }, cacheDuration);
    });

    cacheRef.current[key] = {
      promise,
      timestamp: now
    };

    return promise;
  }, []);

  const clearCache = useCallback((key?: string) => {
    if (key) {
      delete cacheRef.current[key];
    } else {
      cacheRef.current = {};
    }
  }, []);

  const getCacheStats = useCallback(() => {
    const keys = Object.keys(cacheRef.current);
    const now = Date.now();
    
    return {
      totalEntries: keys.length,
      activeEntries: keys.filter(key => 
        (now - cacheRef.current[key].timestamp) < CACHE_DURATION
      ).length,
      keys: keys
    };
  }, []);

  return {
    deduplicate,
    clearCache,
    getCacheStats
  };
};