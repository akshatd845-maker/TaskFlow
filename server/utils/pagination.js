/**
 * Unified pagination utility for consistent pagination across all controllers.
 * Consolidates duplicated pagination logic found in projectController, cardController, etc.
 */

/**
 * Parse and validate pagination parameters from query string
 * @param {Object} query - Express query object
 * @param {Object} options - Configuration options
 * @param {number} options.defaultPage - Default page number (default: 1)
 * @param {number} options.defaultLimit - Default limit (default: 10)
 * @param {number} options.maxLimit - Maximum allowed limit (default: 100)
 * @returns {Object} { page, limit, skip }
 */
export const parsePagination = (query, { defaultPage = 1, defaultLimit = 10, maxLimit = 100 } = {}) => {
  const page = Math.max(parseInt(query.page, 10) || defaultPage, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build pagination response metadata
 * @param {number} totalItems - Total number of items
 * @param {number} limit - Items per page
 * @returns {Object} { totalPages, hasMore }
 */
export const buildPaginationMeta = (totalItems, limit) => {
  const totalPages = Math.max(Math.ceil(totalItems / limit) || 1, 1);
  return {
    totalPages,
    hasMore: totalItems > limit
  };
};

/**
 * Parse sort option with support for multiple fields
 * @param {string|undefined} sort - Sort query parameter
 * @param {Object} sortMap - Map of sort strings to MongoDB sort objects
 * @param {Object} defaultSort - Default sort object
 * @returns {Object} MongoDB sort object
 */
export const parseSort = (sort, sortMap = {}, defaultSort = { createdAt: -1 }) => {
  if (!sort) return defaultSort;
  const normalizedSort = String(sort).toLowerCase();
  return sortMap[normalizedSort] || defaultSort;
};

/**
 * Predefined sort mappings for common resources
 */
export const PROJECT_SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  alphabetical: { title: 1 }
};

export const CARD_SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  dueDate: { dueDate: 1 },
  priority: { priority: -1 } // urgent first
};

export const BOARD_SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  alphabetical: { name: 1 }
};