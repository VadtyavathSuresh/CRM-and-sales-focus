import { useState, useEffect } from 'react';
import { Link } from './Router';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/utils';
import {
  LayoutDashboard, Users, LogOut, ChevronDown,
  Zap, Menu, X, UserCircle, Settings
} from 'lucide-react';

export default function Navbar() {
  const { profile, signOut, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const close = () => { setProfileOpen(false); setMenuOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            LeadFlow
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            {isAdmin && (
              <Link
                href="/team"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <Users className="w-4 h-4" />
                Team
              </Link>
            )}
          </div>

          {/* Profile */}
          <div className="flex items-center gap-3">
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setProfileOpen(p => !p)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {profile ? getInitials(profile.full_name || profile.email) : '?'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-800 leading-tight">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-slate-500 capitalize">{profile?.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-800">{profile?.full_name}</p>
                    <p className="text-xs text-slate-500">{profile?.email}</p>
                  </div>
                  <Link href="/profile" className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <UserCircle className="w-4 h-4" /> Profile
                  </Link>
                  {isAdmin && (
                    <Link href="/team" className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                      <Settings className="w-4 h-4" /> Team Settings
                    </Link>
                  )}
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>

            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
              onClick={e => { e.stopPropagation(); setMenuOpen(p => !p); }}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 py-2 px-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          {isAdmin && (
            <Link href="/team" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
              <Users className="w-4 h-4" /> Team
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
