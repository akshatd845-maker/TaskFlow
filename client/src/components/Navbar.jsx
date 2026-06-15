import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './notifications/NotificationBell';
import socket from '../services/socket';


const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showDropdown, setShowDropdown] = useState(false);

  const [onlineCount, setOnlineCount] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);


  const handleLogout = useCallback(async () => {
    setShowDropdown(false);
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e) => {
      if (!e.target.closest('#navbar-user-menu')) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  // ⌘K / Ctrl+K search focus shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const onCount = (payload) => {
      if (payload && typeof payload.count === 'number') setOnlineCount(payload.count);
    };
    socket.on('onlineUsersCount', onCount);
    return () => { socket.off('onlineUsersCount', onCount); };
  }, []);

  return (
    <header
      className="glass-navbar flex items-center justify-between px-4 lg:px-6 flex-shrink-0"
      style={{ height: '64px', position: 'sticky', top: 0, zIndex: 40 }}
    >
      {/* ── Left ── */}
      <div className="flex items-center gap-4">
        {/* Mobile menu trigger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg transition-colors"
          style={{ color: '#918fa1' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#e4e1ee'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#918fa1'; e.currentTarget.style.background = 'transparent'; }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Global Search */}
        <div className="hidden md:block relative">
          <input
            id="global-search"
            type="text"
            placeholder="Search…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-56 pl-9 pr-14 py-2 rounded-xl text-sm outline-none transition-all duration-200"
            style={{
              background: searchFocused ? 'rgba(79,70,229,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${searchFocused ? 'rgba(195,192,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: '#e4e1ee',
              fontFamily: 'Inter, sans-serif',
              boxShadow: searchFocused ? '0 0 0 3px rgba(195,192,255,0.08)' : 'none',
            }}
          />
          {/* Search icon */}
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
            style={{ color: '#918fa1' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {/* ⌘K badge */}
          <kbd
            className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium select-none pointer-events-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#464555',
              fontFamily: 'Geist, monospace',
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-2">

        {/* New Project button */}
        <button
          type="button"
          id="navbar-new-project"
          onClick={() => navigate('/projects')}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c6fff 100%)',
            color: '#e4e1ee',
            boxShadow: '0 0 12px rgba(79,70,229,0.35)',
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(195,192,255,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.boxShadow = '0 0 12px rgba(79,70,229,0.35)'; }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>

        {/* Notifications */}

        <NotificationBell />

        {/* Online presence pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium"
          style={{
            background: 'rgba(74,222,128,0.08)',
            border: '1px solid rgba(74,222,128,0.15)',
            color: '#4ade80',
            fontFamily: 'Geist, monospace',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {onlineCount}
        </div>

        {/* User menu */}
        <div className="relative" id="navbar-user-menu">
          <button
            onClick={() => setShowDropdown(v => !v)}
            className="flex items-center gap-2 p-1.5 rounded-xl transition-all duration-200"
            style={{ color: '#918fa1' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { if (!showDropdown) e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #c3c0ff 100%)',
                color: '#1d00a5',
                boxShadow: '0 0 8px rgba(195,192,255,0.25)',
              }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: '#464555' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-2xl overflow-hidden z-50 fade-in"
              style={{
                background: 'rgba(26,25,35,0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
              }}
            >
              {/* User info header */}
              <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[13px] font-semibold" style={{ color: '#e4e1ee' }}>{user?.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#464555', fontFamily: 'Geist, monospace' }}>{user?.email}</p>
              </div>

              {/* Links */}
              <div className="py-1.5">
                {[
                  { to: '/settings', label: 'Profile', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
                  { to: '/settings', label: 'Settings', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></> },
                ].map(({ to, label, icon }) => (
                  <Link
                    key={label}
                    to={to}
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-[13px] transition-all duration-150"
                    style={{ color: '#c7c4d8' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#e4e1ee'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#c7c4d8'; }}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {icon}
                    </svg>
                    {label}
                  </Link>
                ))}
              </div>

              {/* Logout */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} className="py-1.5">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] transition-all duration-150"
                  style={{ color: '#ff8f85' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,180,171,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
