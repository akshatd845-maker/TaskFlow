const StatsCard = ({ title, value, icon, trend, trendValue, color }) => {
  // Keep the existing semantic colors, but make them dark-mode readable.
  const colorClasses = {
    blue: 'bg-blue-500/10 text-primary',
    green: 'bg-green-500/10 text-green-200',
    orange: 'bg-orange-500/10 text-orange-200',
    purple: 'bg-purple-500/10 text-purple-200',
    red: 'bg-red-500/10 text-red-200',
    indigo: 'bg-indigo-500/10 text-primary'
  };

  const iconBgClasses = {
    blue: 'bg-blue-500/30',
    green: 'bg-green-500/30',
    orange: 'bg-orange-500/30',
    purple: 'bg-purple-500/30',
    red: 'bg-red-500/30',
    indigo: 'bg-indigo-500/30'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <span
                className={`text-sm font-medium ${
                  trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trendValue}
              </span>
              <span className="text-sm text-gray-400 ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <div className={`w-10 h-10 rounded-lg ${iconBgClasses[color]} flex items-center justify-center`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;