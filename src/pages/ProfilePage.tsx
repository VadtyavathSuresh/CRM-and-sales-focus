import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getInitials } from '@/lib/utils';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(''); setSuccess(false); setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);
    setLoading(false);
    if (error) setError(error.message);
    else setSuccess(true);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-md mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Profile</h1>

        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold">
              {profile ? getInitials(profile.full_name || profile.email) : '?'}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{profile?.full_name || '—'}</p>
              <p className="text-sm text-slate-500">{profile?.email}</p>
              <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                profile?.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
              }`}>{profile?.role}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl mb-4 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-sm text-emerald-700">
              <CheckCircle className="w-4 h-4" /> Profile updated!
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input
                value={fullName} onChange={e => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input value={profile?.email ?? ''} disabled className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400" />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl"
            >
              <Save className="w-4 h-4" /> {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
