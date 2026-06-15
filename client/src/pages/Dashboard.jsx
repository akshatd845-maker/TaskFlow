import { useEffect, useState } from 'react';
import { analyticsService } from '../services/analyticsService';
import { Link } from 'react-router-dom';
import StatsCard from '../components/StatsCard';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [overview, setOverview] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    completionRate: 0
  });

  const [projectProgress, setProjectProgress] = useState([]);
  const [teamProductivity, setTeamProductivity] = useState([]);
  const [taskStatus, setTaskStatus] = useState({ completed: 0, pending: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const [o, p, t, s] = await Promise.all([
          analyticsService.getOverview(),
          analyticsService.getProjectProgress(),
          analyticsService.getTeamProductivity(),
          analyticsService.getTaskStatus()
        ]);

        setOverview(o.data);
        setProjectProgress(p.data);
        setTeamProductivity(t.data);
        setTaskStatus(s.data);
      } catch (e) {
        setError(e?.response?.data?.message || e.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const completionPie = [
    { name: 'Completed', value: taskStatus.completed || 0, color: '#22c55e' },
    { name: 'Pending', value: taskStatus.pending || 0, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-8 transition-colors">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Live project and team metrics.</p>
        </div>
        <div className="flex items-center space-x-2">
          <select className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100" disabled>
            <option>This Week</option>
            <option>This Month</option>
            <option>This Year</option>
          </select>
          <button className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => window.location.reload()}>
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-200 rounded-lg transition-colors">
          {error}
        </div>
      ) : null}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Projects" value={overview.totalProjects} color="blue" trend="up" trendValue="" />
        <StatsCard title="Total Tasks" value={overview.totalTasks} color="purple" trend="up" trendValue="" />
        <StatsCard title="Completed Tasks" value={overview.completedTasks} color="green" trend="up" trendValue="" />
        <StatsCard title="Pending Tasks" value={overview.pendingTasks} color="orange" trend="down" trendValue="" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Completion Rate (Donut) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Task Completion Rate</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed vs Pending</p>
            </div>
          </div>

          <div className="h-72 relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={completionPie}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {completionPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f1f28',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      color: '#e4e1ee'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{overview.completionRate || 0}%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completion</div>
              </div>
            </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {completionPie.map((item) => (
              <div key={item.name} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600 dark:text-gray-300">{item.name}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Project Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Progress</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Progress % by project</p>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectProgress.length ? projectProgress : [{ projectName: 'No Projects', progress: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="projectName" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => `${v}%`} />
                <Tooltip />
                <Bar dataKey="progress" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Productivity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team Productivity</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed tasks by member</p>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  teamProductivity.length
                    ? teamProductivity.map((u) => ({ member: u.name, completedTasks: u.completedTasks }))
                    : [{ member: 'No Team', completedTasks: 0 }]
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="member" stroke="#6b7280" fontSize={12} interval={0} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Bar dataKey="completedTasks" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending vs Completed Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pending vs Completed Tasks</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Task status aggregation</p>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={[
                  { label: 'Completed', value: taskStatus.completed || 0, color: '#22c55e' },
                  { label: 'Pending', value: taskStatus.pending || 0, color: '#f59e0b' }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="label" type="category" stroke="#6b7280" fontSize={12} width={120} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {[
                    { key: 'completed', color: '#22c55e' },
                    { key: 'pending', color: '#f59e0b' }
                  ].map((c, idx) => (
                    <Cell key={c.key} fill={idx === 0 ? '#22c55e' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


