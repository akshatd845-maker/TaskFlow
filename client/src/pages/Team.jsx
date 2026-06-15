import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import projectService from '../services/projectService';
import InviteMemberForm from '../components/team/InviteMemberForm';
import TeamTable from '../components/team/TeamTable';

const Team = () => {
  const { id: projectId } = useParams();
  const { user } = useAuth();

  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const effectiveCurrentRole = useMemo(() => {
    if (!user || !team?.length) return null;
    const me = team.find((m) => m.email?.toLowerCase() === user.email?.toLowerCase());
    return me?.role || null;
  }, [team, user]);

  const canInvite = effectiveCurrentRole === 'owner' || effectiveCurrentRole === 'admin';
  const canRemove = effectiveCurrentRole === 'owner' || effectiveCurrentRole === 'admin';
  const canChangeRoles = effectiveCurrentRole === 'owner' || effectiveCurrentRole === 'admin';

  const loadTeam = async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const data = await projectService.getTeam(projectId);
      setTeam(data);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const onInvite = async ({ email, role }) => {
    setError('');
    await projectService.inviteMember(projectId, { email, role });
    await loadTeam();
  };

  const onRemove = async (userId) => {
    setError('');
    try {
      await projectService.removeMember(projectId, userId);
      await loadTeam();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to remove member');
    }
  };

  const onChangeRole = async (userId, role) => {
    setError('');
    try {
      await projectService.updateRole(projectId, userId, role);
      await loadTeam();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to update role');
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Team</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage members, roles, and project access.
            </p>
          </div>

          <div className="text-sm text-gray-600 text-right">
            {effectiveCurrentRole ? (
              <span className="inline-flex items-center gap-2">
                <span className="font-semibold">Your role:</span>
                <span className="px-2 py-1 bg-gray-100 rounded-lg">{effectiveCurrentRole}</span>
              </span>
            ) : (
              <span className="text-gray-500">Not in team</span>
            )}
          </div>
        </div>

        {error ? (
          <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <InviteMemberForm
              disabled={!canInvite || loading}
              onInvite={onInvite}
            />
          </div>
          <div className="lg:col-span-2">
            <TeamTable
              loading={loading}
              team={team}
              canRemove={canRemove}
              canChangeRoles={canChangeRoles}
              onRemove={onRemove}
              onChangeRole={onChangeRole}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Team;

