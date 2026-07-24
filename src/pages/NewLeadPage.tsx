import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createLead } from '@/lib/leads';
import { navigate } from '@/components/Router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import type { LeadStatus, LeadSource, LeadPriority } from '@/types';
import { PIPELINE_STAGES, STATUS_CONFIG } from '@/lib/utils';

const SOURCES = [
  { value: 'web_form', label: 'Web Form' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'social', label: 'Social Media' },
  { value: 'other', label: 'Other' },
];

export default function NewLeadPage() {
  const { isAdmin, user } = useAuth();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    company: '', source: 'referral' as LeadSource,
    status: 'new' as LeadStatus, priority: 'medium' as LeadPriority,
    value: '', message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isAdmin) {
    navigate('/dashboard');
    return null;
  }

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const lead = await createLead({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || undefined,
        company: form.company || undefined,
        source: form.source,
        status: form.status,
        priority: form.priority,
        value: form.value ? Math.round(parseFloat(form.value) * 100) : undefined,
        message: form.message || undefined,
      });
      navigate(`/leads/${lead.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Add New Lead</h1>

          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl mb-5 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name *</label>
                <input required value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} placeholder="Jane" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name *</label>
                <input required value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} placeholder="Smith" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
              <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="jane@company.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Company</label>
                <input value={form.company} onChange={e => set('company', e.target.value)} className={inputCls} placeholder="Acme Corp" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Source</label>
                <select value={form.source} onChange={e => set('source', e.target.value)} className={inputCls + ' bg-white'}>
                  {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls + ' bg-white'}>
                  {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
                <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls + ' bg-white'}>
                  {['low','medium','high'].map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Estimated Value ($)</label>
                <input type="number" min="0" step="0.01" value={form.value} onChange={e => set('value', e.target.value)} className={inputCls} placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes / Message</label>
              <textarea rows={3} value={form.message} onChange={e => set('message', e.target.value)} className={inputCls + ' resize-none'} placeholder="Any additional context…" />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit" disabled={loading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
              >
                {loading ? 'Creating…' : 'Create Lead'}
              </button>
              <button type="button" onClick={() => navigate('/dashboard')} className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
