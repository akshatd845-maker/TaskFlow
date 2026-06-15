export const EFFECTIVE_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member'
};

export const normalizeRole = (role) => {
  if (!role) return null;
  const r = String(role).toLowerCase();
  if (r === 'owner') return EFFECTIVE_ROLES.OWNER;
  if (r === 'admin') return EFFECTIVE_ROLES.ADMIN;
  if (r === 'member') return EFFECTIVE_ROLES.MEMBER;
  if (r === 'viewer') return 'viewer';
  return null;
};

export const getEffectiveRoleForUser = (project, userId) => {
  if (!project || !userId) return null;
  const uid = String(userId);

  const ownerId = project.owner?._id ? String(project.owner._id) : String(project.owner);
  if (ownerId === uid) {
    return EFFECTIVE_ROLES.OWNER;
  }

  const member = (project.members || []).find((m) => {
    const memberId = m.user?._id ? String(m.user._id) : String(m.user);
    return memberId === uid;
  });
  if (!member) return null;

  const r = normalizeRole(member.role);
  return r || EFFECTIVE_ROLES.MEMBER; // fallback to member for safety
};

export const getPermissionSet = (effectiveRole) => {
  switch (effectiveRole) {
    case EFFECTIVE_ROLES.OWNER:
      return {
        inviteMembers: true,
        removeMembers: true,
        changeRoles: true,
        editProject: true,
        deleteProject: true,
        viewProject: true,
        createCard: true
      };
    case EFFECTIVE_ROLES.ADMIN:
      return {
        inviteMembers: true,
        removeMembers: true,
        changeRoles: true,
        editProject: true,
        deleteProject: false,
        viewProject: true,
        createCard: true
      };
    case EFFECTIVE_ROLES.MEMBER:
      return {
        inviteMembers: false,
        removeMembers: false,
        changeRoles: false,
        editProject: false,
        deleteProject: false,
        viewProject: true,
        createCard: true
      };
    case 'viewer':
      return {
        inviteMembers: false,
        removeMembers: false,
        changeRoles: false,
        editProject: false,
        deleteProject: false,
        viewProject: true,
        createCard: false
      };
    default:
      return {
        inviteMembers: false,
        removeMembers: false,
        changeRoles: false,
        editProject: false,
        deleteProject: false,
        viewProject: false,
        createCard: false
      };
  }
};

export const hasPermission = (effectiveRole, permissionKey) => {
  const perms = getPermissionSet(effectiveRole);
  return Boolean(perms[permissionKey]);
};

export const assertPermission = (effectiveRole, permissionKey, message) => {
  if (!hasPermission(effectiveRole, permissionKey)) {
    return {
      ok: false,
      status: 403,
      message: message || 'Not authorized'
    };
  }
  return { ok: true };
};

export const VALID_MEMBER_ROLES = ['admin', 'member'];

