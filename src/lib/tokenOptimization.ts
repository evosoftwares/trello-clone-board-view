import { queryClient, QUERY_KEYS } from './queryClient';

interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  cacheSize: number;
  memoryUsage: number;
}

interface OptimizationConfig {
  maxCacheAge: number;
  maxCacheSize: number;
  batchSize: number;
  debounceTime: number;
}

const DEFAULT_CONFIG: OptimizationConfig = {
  maxCacheAge: 10 * 60 * 1000, // 10 minutes
  maxCacheSize: 50, // Max number of cached queries
  batchSize: 5, // Max requests to batch together
  debounceTime: 300, // Debounce time in ms
};

class TokenOptimizationManager {
  private config: OptimizationConfig;
  private pendingRequests: Map<string, Promise<any>>;
  private batchQueue: Array<{ key: string; resolver: Function }>;
  private debounceTimers: Map<string, NodeJS.Timeout>;
  private metrics: {
    hits: number;
    misses: number;
    totalRequests: number;
  };

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pendingRequests = new Map();
    this.batchQueue = [];
    this.debounceTimers = new Map();
    this.metrics = { hits: 0, misses: 0, totalRequests: 0 };
  }

  // Request deduplication
  async deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    this.metrics.totalRequests++;

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      console.log(`[TOKEN OPT] Deduplicating request: ${key}`);
      this.metrics.hits++;
      return this.pendingRequests.get(key);
    }

    // Create new request
    this.metrics.misses++;
    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  // Batch multiple requests
  async batchRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ key, resolver: resolve });

      // Process batch when it reaches max size or after debounce time
      if (this.batchQueue.length >= this.config.batchSize) {
        this.processBatch();
      } else {
        this.debounceBatch();
      }
    });
  }

  private debounceBatch() {
    const batchId = 'batch';
    
    if (this.debounceTimers.has(batchId)) {
      clearTimeout(this.debounceTimers.get(batchId)!);
    }

    const timer = setTimeout(() => {
      this.processBatch();
      this.debounceTimers.delete(batchId);
    }, this.config.debounceTime);

    this.debounceTimers.set(batchId, timer);
  }

  private async processBatch() {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue.length = 0;

    console.log(`[TOKEN OPT] Processing batch of ${batch.length} requests`);

    // Group requests by type for efficient batching
    const groupedRequests = batch.reduce((groups, item) => {
      const [type] = item.key.split(':');
      if (!groups[type]) groups[type] = [];
      groups[type].push(item);
      return groups;
    }, {} as { [key: string]: typeof batch });

    // Execute batched requests
    for (const [type, requests] of Object.entries(groupedRequests)) {
      try {
        await this.executeBatchedRequests(type, requests);
      } catch (error) {
        console.error(`[TOKEN OPT] Batch error for type ${type}:`, error);
        requests.forEach(req => req.resolver(null));
      }
    }
  }

  private async executeBatchedRequests(type: string, requests: Array<{ key: string; resolver: Function }>) {
    switch (type) {
      case 'kanban':
        // Batch kanban data fetching
        const projectIds = requests.map(r => r.key.split(':')[1]).filter(Boolean);
        if (projectIds.length > 0) {
          const results = await this.batchFetchKanbanData(projectIds);
          requests.forEach((req, index) => {
            req.resolver(results[index]);
          });
        }
        break;
      
      case 'tasks':
        // Batch task fetching
        const taskProjectIds = requests.map(r => r.key.split(':')[1]).filter(Boolean);
        if (taskProjectIds.length > 0) {
          const results = await this.batchFetchTasks(taskProjectIds);
          requests.forEach((req, index) => {
            req.resolver(results[index]);
          });
        }
        break;
        
      default:
        // Fallback: execute individually
        for (const req of requests) {
          req.resolver(null);
        }
    }
  }

  private async batchFetchKanbanData(projectIds: string[]) {
    // Implementation would fetch all project data in one query
    // This is a placeholder - actual implementation would use Supabase
    console.log(`[TOKEN OPT] Batch fetching kanban data for projects:`, projectIds);
    return projectIds.map(() => ({})); // Placeholder
  }

  private async batchFetchTasks(projectIds: string[]) {
    // Implementation would fetch all tasks for multiple projects in one query
    console.log(`[TOKEN OPT] Batch fetching tasks for projects:`, projectIds);
    return projectIds.map(() => []); // Placeholder
  }

  // Cache management
  async optimizeCache() {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    console.log(`[TOKEN OPT] Optimizing cache with ${queries.length} queries`);

    // Remove stale queries
    const now = Date.now();
    let removedCount = 0;

    queries.forEach(query => {
      const lastUpdate = query.state.dataUpdatedAt;
      const age = now - lastUpdate;

      if (age > this.config.maxCacheAge) {
        queryClient.removeQueries({ queryKey: query.queryKey });
        removedCount++;
      }
    });

    // Limit cache size
    if (queries.length > this.config.maxCacheSize) {
      const toRemove = queries.length - this.config.maxCacheSize;
      const oldestQueries = queries
        .sort((a, b) => a.state.dataUpdatedAt - b.state.dataUpdatedAt)
        .slice(0, toRemove);

      oldestQueries.forEach(query => {
        queryClient.removeQueries({ queryKey: query.queryKey });
        removedCount++;
      });
    }

    console.log(`[TOKEN OPT] Cache optimization complete. Removed ${removedCount} queries`);
  }

  // Metrics and monitoring
  getMetrics(): CacheMetrics {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    return {
      hitRate: this.metrics.totalRequests > 0 ? this.metrics.hits / this.metrics.totalRequests : 0,
      missRate: this.metrics.totalRequests > 0 ? this.metrics.misses / this.metrics.totalRequests : 0,
      totalRequests: this.metrics.totalRequests,
      cacheSize: queries.length,
      memoryUsage: this.estimateMemoryUsage(queries),
    };
  }

  private estimateMemoryUsage(queries: any[]): number {
    // Rough estimate of memory usage
    return queries.reduce((total, query) => {
      const data = query.state.data;
      if (data) {
        // Simple heuristic: assume each object uses ~1KB
        const dataSize = typeof data === 'object' ? JSON.stringify(data).length : 0;
        return total + dataSize;
      }
      return total;
    }, 0);
  }

  // Cleanup
  destroy() {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.pendingRequests.clear();
    this.batchQueue.length = 0;
  }
}

// Global instance
export const tokenOptimizer = new TokenOptimizationManager();

// Auto-cleanup every 5 minutes
setInterval(() => {
  tokenOptimizer.optimizeCache();
}, 5 * 60 * 1000);

// Utility functions
export const optimizeRequest = <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
  return tokenOptimizer.deduplicateRequest(key, requestFn);
};

export const batchRequest = <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
  return tokenOptimizer.batchRequest(key, requestFn);
};

export const getOptimizationMetrics = () => {
  return tokenOptimizer.getMetrics();
};

export const optimizeCache = () => {
  return tokenOptimizer.optimizeCache();
};