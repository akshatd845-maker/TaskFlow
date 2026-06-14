const RoleBadge = ({ role }) => {
  const normalized = String(role || '').toLowerCase();
  const style =
    normalized === 'owner'
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
      : normalized === 'admin'
        ? 'bg-blue-100 text-blue-800 border-blue-200'
        : 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-lg border ${style} text-xs font-semibold`}>
      {normalized}
    </span>
  );
};

const TeamMemberRow = ({ member, canRemove, canChangeRoles, onRemove, onChangeRole }) => {
  const isOwner = member.role === 'owner';

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50/50">
      <td className="py-3">
        <div className="flex items-center gap-3">
          <img
            src={member.avatar || '/favicon.svg'}
            alt={member.name}
            className="w-9 h-9 rounded-full object-cover bg-gray-100"
          />
          <div>
            <div className="font-medium text-gray-900">{member.name}</div>
            <div className="text-xs text-gray-500">{member.email}</div>
          </div>
        </div>
      </td>

      <td className="py-3">
        <RoleBadge role={member.role} />
      </td>

      <td className="py-3">
        {canChangeRoles && !isOwner ? (
          <select
            className="rounded-lg border border-gray-300 px-2 py-2 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={member.role}
            onChange={(e) => onChangeRole(member._id, e.target.value)}
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
        ) : (
          <div className="text-sm text-gray-600">—</div>
        )}
      </td>

      <td className="py-3">
        <div className="flex items-center justify-end gap-2">
          {canRemove && !isOwner ? (
            <button
              onClick={() => {
                const ok = window.confirm(`Remove ${member.name} from this project?`);
                if (ok) onRemove(member._id);
              }}
              className="inline-flex items-center justify-center rounded-lg border border-red-200 text-red-700 px-3 py-2 text-sm hover:bg-red-50"
            >
              Remove
            </button>
          ) : (
            <span className="text-xs text-gray-400">N/A</span>
          )}
        </div>
      </td>
    </tr>
  );
};

export default TeamMemberRow;

