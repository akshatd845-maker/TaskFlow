/**
 * Tests for pagination utility
 */

import {
  parsePagination,
  buildPaginationMeta,
  parseSort,
  PROJECT_SORT_MAP,
  CARD_SORT_MAP
} from '../utils/pagination.js';

describe('pagination utility', () => {
  describe('parsePagination', () => {
    it('should return default values when no query provided', () => {
      const result = parsePagination({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(0);
    });

    it('should parse valid page and limit', () => {
      const result = parsePagination({ page: '2', limit: '20' });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(20);
    });

    it('should enforce minimum page of 1', () => {
      const result = parsePagination({ page: '0' });
      expect(result.page).toBe(1);
    });

    it('should enforce maximum limit', () => {
      const result = parsePagination({}, { maxLimit: 50 });
      expect(result.limit).toBe(50);
    });

    it('should handle custom defaults', () => {
      const result = parsePagination({}, { defaultPage: 5, defaultLimit: 25 });
      expect(result.page).toBe(5);
      expect(result.limit).toBe(25);
    });
  });

  describe('buildPaginationMeta', () => {
    it('should calculate total pages correctly', () => {
      const meta = buildPaginationMeta(25, 10);
      expect(meta.totalPages).toBe(3);
      expect(meta.hasMore).toBe(true);
    });

    it('should handle exact division', () => {
      const meta = buildPaginationMeta(20, 10);
      expect(meta.totalPages).toBe(2);
      expect(meta.hasMore).toBe(false);
    });

    it('should handle zero items', () => {
      const meta = buildPaginationMeta(0, 10);
      expect(meta.totalPages).toBe(1);
    });
  });

  describe('parseSort', () => {
    it('should return default when no sort provided', () => {
      const result = parseSort(undefined, {});
      expect(result).toEqual({ createdAt: -1 });
    });

    it('should return mapped sort option', () => {
      const result = parseSort('oldest', PROJECT_SORT_MAP);
      expect(result).toEqual({ createdAt: 1 });
    });

    it('should return default for unknown sort', () => {
      const result = parseSort('unknown', PROJECT_SORT_MAP);
      expect(result).toEqual({ createdAt: -1 });
    });

    it('should handle custom sort map', () => {
      const customMap = { priority: { priority: -1 } };
      const result = parseSort('priority', customMap, { title: 1 });
      expect(result).toEqual({ priority: -1 });
    });
  });
});