import TeamMemberRow from './TeamMemberRow';

const TeamTable = ({
  loading,
  team,
  canRemove,
  canChangeRoles,
  onRemove,
  onChangeRole
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Project team</h2>
        <div className="text-sm text-gray-600">{team?.length ? `${team.length} members` : 'No members'}</div>
      </div>

      {loading ? (
        <div className="p-6 text-gray-600">Loading team...</div>
      ) : !team?.length ? (
        <div className="p-6 text-gray-600">No members yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-600">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Change role</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <TeamMemberRow
                  key={member._id}
                  member={member}
                  canRemove={canRemove}
                  canChangeRoles={canChangeRoles}
                  onRemove={onRemove}
                  onChangeRole={onChangeRole}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeamTable;

