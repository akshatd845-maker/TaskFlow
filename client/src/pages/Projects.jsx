import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { useAuth } from '../context/AuthContext';

const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await projectService.getAll();
      setProjects(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      const newProject = await projectService.create(projectData);
      setProjects([newProject, ...projects]);
      setShowCreateModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    }
  };

  const handleUpdateProject = async (projectData) => {
    try {
      const updatedProject = await projectService.update(selectedProject._id, projectData);
      setProjects(projects.map(p => p._id === selectedProject._id ? updatedProject : p));
      setShowEditModal(false);
      setSelectedProject(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update project');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? All tasks will be deleted.')) {
      return;
    }

    try {
      await projectService.delete(projectId);
      setProjects(projects.filter(p => p._id !== projectId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete project');
    }
  };

  const handleAddMember = async (email, role) => {
    try {
      const updatedProject = await projectService.addMember(selectedProject._id, email, role);
      setProjects(projects.map(p => p._id === selectedProject._id ? updatedProject : p));
      setSelectedProject(updatedProject);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      const updatedProject = await projectService.removeMember(selectedProject._id, userId);
      setProjects(projects.map(p => p._id === selectedProject._id ? updatedProject : p));
      setSelectedProject(updatedProject);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const openEditModal = (project) => {
    setSelectedProject(project);
    setShowEditModal(true);
  };

  const openMembersModal = (project) => {
    setSelectedProject(project);
    setShowMembersModal(true);
  };

  const handleOpenBoard = async (project) => {
    try {
      let boardId = project.boardId;
      if (!boardId) {
        boardId = await projectService.getBoardId(project._id);
      }
      navigate(`/board/${boardId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to open board');
    }
  };

  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true;
    return project.status === filter;
  });

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-600',
      completed: 'bg-blue-100 text-blue-600',
      'on-hold': 'bg-yellow-100 text-yellow-600',
      archived: 'bg-gray-100 text-gray-600'
    };
    return colors[status] || colors.active;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage your projects and team</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Project</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">Filter:</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Projects</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on-hold">On Hold</option>
        </select>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-500 mb-4">Create your first project to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              currentUser={user}
              onEdit={() => openEditModal(project)}
              onMembers={() => openMembersModal(project)}
              onDelete={() => handleDeleteProject(project._id)}
              onOpenBoard={() => handleOpenBoard(project)}
              getStatusColor={getStatusColor}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <ProjectModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProject}
          title="Create New Project"
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => { setShowEditModal(false); setSelectedProject(null); }}
          onSubmit={handleUpdateProject}
          title="Edit Project"
        />
      )}

      {/* Members Modal */}
      {showMembersModal && selectedProject && (
        <MembersModal
          project={selectedProject}
          onClose={() => { setShowMembersModal(false); setSelectedProject(null); }}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          currentUser={user}
        />
      )}
    </div>
  );
};

// Project Card Component
const ProjectCard = ({ project, currentUser, onEdit, onMembers, onDelete, onOpenBoard, getStatusColor }) => {
  const isOwner = project.owner._id === currentUser._id;
  const isAdmin = project.members?.some(
    (m) => m.user._id === currentUser._id && m.role === 'admin'
  );
  const canEdit = isOwner || isAdmin;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Project Color Header */}
      <div
        className="h-2"
        style={{ backgroundColor: project.color || '#3b82f6' }}
      />

      <div className="p-5">
        {/* Title and Status */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
            {project.title}
          </h3>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
            {project.status}
          </span>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Members */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center border-2 border-white">
              <span className="text-xs font-medium text-gray-600">
                {project.owner.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            {project.members?.slice(0, 3).map((member) => (
              <div
                key={member.user._id}
                className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white"
              >
                <span className="text-xs font-medium text-blue-600">
                  {member.user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            ))}
            {project.members?.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white">
                <span className="text-xs font-medium text-gray-500">
                  +{project.members.length - 3}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenBoard}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open Board
            </button>
            <Link
              to={`/projects/${project._id}/team`}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Team"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </Link>
            <button
              onClick={onMembers}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Manage Members"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>
          </div>
          {(canEdit || isOwner) && (
            <div className="flex items-center space-x-1">
              {canEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit Project"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              )}
              {isOwner && (
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Project"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Project Modal Component
const ProjectModal = ({ project, onClose, onSubmit, title }) => {
  const [formData, setFormData] = useState({
    title: project?.title || '',
    description: project?.description || '',
    status: project?.status || 'active',
    color: project?.color || '#3b82f6'
  });
  const [loading, setLoading] = useState(false);

  const colors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#6366f1'
  ];

  const statuses = [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'archived', label: 'Archived' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter project name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Project description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-lg transition-transform ${
                    formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : project ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Members Modal Component
const MembersModal = ({ project, onClose, onAddMember, onRemoveMember, currentUser }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    await onAddMember(email, role);
    setEmail('');
    setRole('member');
    setLoading(false);
  };

  const isOwner = project.owner._id === currentUser._id;
  const isAdmin = project.members?.some(
    (m) => m.user._id === currentUser._id && m.role === 'admin'
  );
  const canInvite = isOwner || isAdmin;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Team Members</h2>
          <p className="text-sm text-gray-500 mt-1">{project.title}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Add Member Form */}
          {canInvite && (
            <form onSubmit={handleAddMember} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Member email"
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </form>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Members List */}
          <div className="space-y-2">
            {/* Owner */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {project.owner.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{project.owner.name}</p>
                  <p className="text-xs text-gray-500">{project.owner.email}</p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded-full">Owner</span>
            </div>

            {/* Members */}
            {project.members?.map((member) => (
              <div key={member.user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">
                      {member.user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                    <p className="text-xs text-gray-500">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    member.role === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {member.role}
                  </span>
                  {canInvite && (
                    <button
                      onClick={() => onRemoveMember(member.user._id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Projects;