import { useState } from 'react';

const InviteMemberForm = ({ disabled, onInvite }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const submit = async () => {
    setLocalError('');
    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }

    if (submitting) return;

    setSubmitting(true);
    try {
      await onInvite({ email: email.trim(), role });
      setEmail('');
      setRole('member');
    } catch (e) {
      setLocalError(e?.response?.data?.message || e.message || 'Invite failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Invite member</h2>
      <p className="text-sm text-gray-600 mt-1">
        Enter an email to invite a user who already exists in TaskFlow.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={disabled}
            placeholder="name@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={disabled}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {localError ? (
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {localError}
          </div>
        ) : null}

        <button
          onClick={submit}
          disabled={disabled || submitting}
          className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Inviting...' : 'Invite Member'}
        </button>

        {!disabled ? null : (
          <div className="text-xs text-gray-500">
            Only Owner/Admin can invite members.
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteMemberForm;

