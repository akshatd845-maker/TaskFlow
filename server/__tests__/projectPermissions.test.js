/**
 * Tests for project permissions utility
 */

import {
  EFFECTIVE_ROLES,
  getEffectiveRoleForUser,
  hasPermission,
  VALID_MEMBER_ROLES
} from '../utils/projectPermissions.js';

describe('projectPermissions utility', () => {
  const mockProject = {
    _id: 'proj123',
    owner: { _id: 'user1' },
    members: [
      { user: { _id: 'user2' }, role: 'admin' },
      { user: { _id: 'user3' }, role: 'member' }
    ]
  };

  describe('getEffectiveRoleForUser', () => {
    it('should return OWNER for project owner', () => {
      const role = getEffectiveRoleForUser(mockProject, 'user1');
      expect(role).toBe(EFFECTIVE_ROLES.OWNER);
    });

    it('should return ADMIN for admin member', () => {
      const role = getEffectiveRoleForUser(mockProject, 'user2');
      expect(role).toBe(EFFECTIVE_ROLES.ADMIN);
    });

    it('should return MEMBER for regular member', () => {
      const role = getEffectiveRoleForUser(mockProject, 'user3');
      expect(role).toBe(EFFECTIVE_ROLES.MEMBER);
    });

    it('should return null for non-member', () => {
      const role = getEffectiveRoleForUser(mockProject, 'user4');
      expect(role).toBeNull();
    });

    it('should handle empty members array', () => {
      const project = { ...mockProject, members: [] };
      const role = getEffectiveRoleForUser(project, 'user2');
      expect(role).toBeNull();
    });

    it('should handle null members', () => {
      const project = { ...mockProject, members: null };
      const role = getEffectiveRoleForUser(project, 'user2');
      expect(role).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('should allow all permissions for OWNER', () => {
      expect(hasPermission(EFFECTIVE_ROLES.OWNER, 'editProject')).toBe(true);
      expect(hasPermission(EFFECTIVE_ROLES.OWNER, 'deleteProject')).toBe(true);
      expect(hasPermission(EFFECTIVE_ROLES.OWNER, 'inviteMembers')).toBe(true);
    });

    it('should allow limited permissions for ADMIN', () => {
      expect(hasPermission(EFFECTIVE_ROLES.ADMIN, 'editProject')).toBe(true);
      expect(hasPermission(EFFECTIVE_ROLES.ADMIN, 'deleteProject')).toBe(false);
      expect(hasPermission(EFFECTIVE_ROLES.ADMIN, 'inviteMembers')).toBe(true);
    });

    it('should allow minimal permissions for MEMBER', () => {
      expect(hasPermission(EFFECTIVE_ROLES.MEMBER, 'viewProject')).toBe(true);
      expect(hasPermission(EFFECTIVE_ROLES.MEMBER, 'createCard')).toBe(true);
      expect(hasPermission(EFFECTIVE_ROLES.MEMBER, 'editProject')).toBe(false);
    });

    it('should deny for null role', () => {
      expect(hasPermission(null, 'viewProject')).toBe(false);
    });
  });

  describe('EFFECTIVE_ROLES', () => {
    it('should have correct role values', () => {
      expect(EFFECTIVE_ROLES.OWNER).toBe('owner');
      expect(EFFECTIVE_ROLES.ADMIN).toBe('admin');
      expect(EFFECTIVE_ROLES.MEMBER).toBe('member');
    });
  });

  describe('VALID_MEMBER_ROLES', () => {
    it('should contain admin and member', () => {
      expect(VALID_MEMBER_ROLES).toContain('admin');
      expect(VALID_MEMBER_ROLES).toContain('member');
    });
  });
});