const RoleSelector = ({ value, onChange, disabled }) => {
  return (
    <select
      className="rounded-lg border border-gray-300 px-2 py-2 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
    >
      <option value="admin">Admin</option>
      <option value="member">Member</option>
    </select>
  );
};

export default RoleSelector;

