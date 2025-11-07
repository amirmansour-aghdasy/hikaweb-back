import { logger } from './logger.js';

/**
 * Query optimization utilities
 */
export class QueryOptimizer {
  /**
   * Add pagination to query
   */
  static addPagination(query, page = 1, limit = 25) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit) || 25;

    return {
      query: query.skip(skip).limit(parsedLimit),
      pagination: {
        page: parseInt(page),
        limit: parsedLimit,
        skip
      }
    };
  }

  /**
   * Add sorting to query
   */
  static addSorting(query, sortBy = '-createdAt') {
    const sort = {};
    
    if (sortBy.startsWith('-')) {
      sort[sortBy.substring(1)] = -1;
    } else {
      sort[sortBy] = 1;
    }

    return query.sort(sort);
  }

  /**
   * Add select fields to query (projection)
   */
  static addProjection(query, fields = []) {
    if (fields.length === 0) return query;
    
    const projection = {};
    fields.forEach(field => {
      if (field.startsWith('-')) {
        projection[field.substring(1)] = 0;
      } else {
        projection[field] = 1;
      }
    });

    return query.select(projection);
  }

  /**
   * Optimize populate calls (prevent N+1 queries)
   */
  static optimizePopulate(populatePaths) {
    if (!Array.isArray(populatePaths)) {
      return populatePaths;
    }

    // Combine multiple populate calls
    return populatePaths.map(path => {
      if (typeof path === 'string') {
        return { path };
      }
      return path;
    });
  }

  /**
   * Add lean() for read-only queries (faster, but no Mongoose methods)
   */
  static addLean(query, isReadOnly = true) {
    if (isReadOnly) {
      return query.lean();
    }
    return query;
  }

  /**
   * Build efficient query with all optimizations
   */
  static buildOptimizedQuery(model, filters = {}, options = {}) {
    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      fields = [],
      populate = [],
      lean = true
    } = options;

    let query = model.find(filters);

    // Add sorting
    if (sort) {
      query = this.addSorting(query, sort);
    }

    // Add projection
    if (fields.length > 0) {
      query = this.addProjection(query, fields);
    }

    // Add populate
    if (populate.length > 0) {
      const optimizedPopulate = this.optimizePopulate(populate);
      optimizedPopulate.forEach(pop => {
        query = query.populate(pop);
      });
    }

    // Add pagination
    const { query: paginatedQuery, pagination } = this.addPagination(query, page, limit);

    // Add lean for performance
    const finalQuery = lean ? paginatedQuery.lean() : paginatedQuery;

    return {
      query: finalQuery,
      pagination
    };
  }

  /**
   * Log slow queries
   */
  static async logSlowQuery(query, startTime, threshold = 1000) {
    const duration = Date.now() - startTime;
    if (duration > threshold) {
      logger.warn('Slow query detected', {
        duration: `${duration}ms`,
        query: query.toString()
      });
    }
  }
}

