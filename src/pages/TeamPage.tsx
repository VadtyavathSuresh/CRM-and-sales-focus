import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchProfiles, updateProfile } from '@/lib/profiles';
import type { Profile } from '@/types';
import { navigate } from '@/components/Router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getInitials, formatDate } from '@/lib/utils';
import { Shield, User, Edit2, Save, X, AlertCircle } from 'lucide-react';

export default function TeamPage() {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    fetchProfiles().then(p => { setProfiles(p); setLoading(false); });
  }, [isAdmin]);

  async function handleSaveRole(profile: Profile) {
    try {
      const updated = await updateProfile(profile.id, { role: editRole });
      setProfiles(ps => ps.map(p => p.id === updated.id ? updated : p));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update role');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500 text-sm mt-1">Manage team members and their roles</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl mb-5 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-slate-100 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-slate-100 rounded w-32" />
                    <div className="h-3 bg-slate-100 rounded w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {profiles.map(profile => (
                <div key={profile.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {getInitials(profile.full_name || profile.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{profile.full_name || '—'}</p>
                    <p className="text-sm text-slate-500">{profile.email}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Joined {formatDate(profile.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === profile.id ? (
                      <>
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value as 'admin' | 'member')}
                          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button onClick={() => handleSaveRole(profile)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          profile.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {profile.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {profile.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                        <button
                          onClick={() => { setEditingId(profile.id); setEditRole(profile.role); }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">Role permissions</p>
          <ul className="space-y-1 text-blue-600">
            <li><span className="font-medium">Admin:</span> View all leads, edit any lead, assign leads, manage team, delete leads</li>
            <li><span className="font-medium">Member:</span> View and edit only their assigned leads, add notes</li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
