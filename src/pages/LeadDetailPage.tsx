import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchLead, updateLead, fetchNotes, addNote, deleteNote, fetchActivities, assignLead } from '@/lib/leads';
import { fetchProfiles } from '@/lib/profiles';
import type { Lead, LeadNote, LeadActivity, LeadStatus, Profile } from '@/types';
import { STATUS_CONFIG, PRIORITY_CONFIG, PIPELINE_STAGES, SOURCE_LABELS, formatCurrency, formatDate, formatRelativeTime, getInitials } from '@/lib/utils';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { navigate, Link } from '@/components/Router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  ArrowLeft, Edit2, Save, X, User, Mail, Phone, Building2,
  MessageSquare, Clock, Activity, DollarSign, Trash2, Plus,
  ChevronDown, AlertCircle
} from 'lucide-react';

interface LeadDetailPageProps {
  leadId: string;
}

type Tab = 'overview' | 'notes' | 'activity';

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'status_changed': return <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center"><Activity className="w-3.5 h-3.5 text-blue-600" /></div>;
    case 'note_added': return <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center"><MessageSquare className="w-3.5 h-3.5 text-emerald-600" /></div>;
    case 'note_deleted': return <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-rose-600" /></div>;
    case 'assigned': return <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center"><User className="w-3.5 h-3.5 text-violet-600" /></div>;
    case 'lead_created': return <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center"><Plus className="w-3.5 h-3.5 text-amber-600" /></div>;
    default: return <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center"><Edit2 className="w-3.5 h-3.5 text-slate-500" /></div>;
  }
}

function activityDescription(activity: LeadActivity, profiles: Profile[]): string {
  const meta = activity.metadata;
  const actor = activity.actor?.full_name ?? activity.actor?.email ?? 'Someone';
  switch (activity.activity_type) {
    case 'lead_created': return `Lead submitted via ${SOURCE_LABELS[meta.source as string] ?? 'form'}`;
    case 'status_changed': return `${actor} moved from ${STATUS_CONFIG[meta.from as LeadStatus]?.label ?? meta.from} → ${STATUS_CONFIG[meta.to as LeadStatus]?.label ?? meta.to}`;
    case 'assigned': {
      const assignee = meta.to ? profiles.find(p => p.id === meta.to)?.full_name ?? 'a team member' : 'nobody';
      return `${actor} assigned to ${assignee}`;
    }
    case 'note_added': return `${actor} added a note`;
    case 'note_deleted': return `${actor} deleted a note`;
    case 'field_updated': return `${actor} updated ${(meta.fields as string[])?.join(', ')}`;
    default: return `${actor} made a change`;
  }
}

export default function LeadDetailPage({ leadId }: LeadDetailPageProps) {
  const { isAdmin, user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Lead>>({});

  const canEdit = isAdmin || lead?.assigned_to === user?.id;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [leadData, notesData, activitiesData, profilesData] = await Promise.all([
        fetchLead(leadId),
        fetchNotes(leadId),
        fetchActivities(leadId),
        fetchProfiles(),
      ]);
      setLead(leadData);
      setNotes(notesData);
      setActivities(activitiesData);
      setProfiles(profilesData);
      setEditForm(leadData);
    } catch {
      setError('Lead not found');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleSave() {
    if (!lead) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateLead(lead.id, editForm, user?.id);
      setLead(updated);
      setEditing(false);
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote() {
    if (!noteInput.trim() || !user || !lead) return;
    setAddingNote(true);
    try {
      await addNote(lead.id, noteInput.trim(), user.id);
      setNoteInput('');
      loadAll();
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!user || !lead) return;
    await deleteNote(noteId, lead.id, user.id);
    loadAll();
  }

  async function handleAssign(assignedTo: string) {
    if (!lead || !user) return;
    const updated = await assignLead(lead.id, assignedTo || null, user.id);
    setLead(updated);
    loadAll();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-48" />
            <div className="h-40 bg-slate-200 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">{error}</p>
            <button onClick={() => navigate('/dashboard')} className="mt-4 text-blue-600 hover:underline text-sm">Back to dashboard</button>
          </div>
        </main>
      </div>
    );
  }

  if (!lead) return null;

  const cfg = STATUS_CONFIG[lead.status];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-700 font-medium">{lead.first_name} {lead.last_name}</span>
        </div>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0">
                {getInitials(`${lead.first_name} ${lead.last_name}`)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{lead.first_name} {lead.last_name}</h1>
                {lead.company && <p className="text-slate-500 mt-0.5">{lead.company}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <StatusBadge status={lead.status} />
                  <PriorityBadge priority={lead.priority} />
                  {lead.value ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
                      <DollarSign className="w-3 h-3" />
                      {formatCurrency(lead.value)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={() => { setEditing(false); setEditForm(lead); }}
                      className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60"
                    >
                      <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          {(['overview', 'notes', 'activity'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                tab === t ? 'bg-white border border-slate-200 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
              {t === 'notes' && notes.length > 0 && (
                <span className="ml-1.5 bg-slate-200 text-slate-600 text-xs rounded-full px-1.5">{notes.length}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Contact info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Contact Information</h3>
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">First Name</label>
                      <input value={editForm.first_name ?? ''} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Last Name</label>
                      <input value={editForm.last_name ?? ''} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Email</label>
                    <input type="email" value={editForm.email ?? ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Phone</label>
                    <input value={editForm.phone ?? ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Company</label>
                    <input value={editForm.company ?? ''} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 text-sm">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a>
                  </div>
                  {lead.phone && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-slate-700">{lead.phone}</span>
                    </div>
                  )}
                  {lead.company && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-slate-700">{lead.company}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-500">Added {formatDate(lead.created_at)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Pipeline */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Pipeline Details</h3>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
                    <select
                      value={editForm.status ?? lead.status}
                      onChange={e => setEditForm(f => ({ ...f, status: e.target.value as LeadStatus }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Priority</label>
                    <select
                      value={editForm.priority ?? lead.priority}
                      onChange={e => setEditForm(f => ({ ...f, priority: e.target.value as 'low'|'medium'|'high' }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {['low','medium','high'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Estimated Value ($)</label>
                    <input
                      type="number"
                      value={editForm.value ? editForm.value / 100 : ''}
                      onChange={e => setEditForm(f => ({ ...f, value: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  {isAdmin && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Assign To</label>
                      <select
                        value={editForm.assigned_to ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, assigned_to: e.target.value || undefined }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Unassigned</option>
                        {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status pipeline visual */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Current Stage</p>
                    <div className="flex gap-1">
                      {PIPELINE_STAGES.slice(0, 5).map((s, i) => {
                        const currentIdx = PIPELINE_STAGES.indexOf(lead.status);
                        const isActive = i <= currentIdx && !['closed_won','closed_lost'].includes(lead.status);
                        const isWon = lead.status === 'closed_won';
                        const isLost = lead.status === 'closed_lost';
                        return (
                          <div
                            key={s}
                            className={`flex-1 h-1.5 rounded-full transition-all ${
                              isWon ? 'bg-emerald-500' :
                              isLost ? 'bg-rose-500' :
                              isActive ? 'bg-blue-500' : 'bg-slate-200'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">Priority</p>
                      <PriorityBadge priority={lead.priority} />
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">Value</p>
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(lead.value)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">Source</p>
                      <p className="text-xs font-medium text-slate-700">{SOURCE_LABELS[lead.source]}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">Notes</p>
                      <p className="text-sm font-semibold text-slate-800">{lead.notes_count}</p>
                    </div>
                  </div>

                  {/* Assigned to */}
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">Assigned To</p>
                    {lead.assignee ? (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                          {getInitials(lead.assignee.full_name || lead.assignee.email)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{lead.assignee.full_name || lead.assignee.email}</p>
                          <p className="text-xs text-slate-400 capitalize">{lead.assignee.role}</p>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleAssign('')}
                            className="ml-auto p-1 text-slate-400 hover:text-rose-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : isAdmin ? (
                      <div className="relative">
                        <select
                          onChange={e => { if (e.target.value) handleAssign(e.target.value); }}
                          defaultValue=""
                          className="w-full px-3 py-2 border border-dashed border-slate-300 rounded-xl text-sm bg-transparent focus:outline-none cursor-pointer appearance-none text-slate-500"
                        >
                          <option value="">Select team member…</option>
                          {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Unassigned</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Original message */}
            {lead.message && (
              <div className="sm:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  Original Message
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-200">{lead.message}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-4">
            {canEdit && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <textarea
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder="Add a note…"
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleAddNote}
                    disabled={!noteInput.trim() || addingNote}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl"
                  >
                    <Plus className="w-4 h-4" /> {addingNote ? 'Adding…' : 'Add Note'}
                  </button>
                </div>
              </div>
            )}

            {notes.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No notes yet</p>
                {canEdit && <p className="text-sm mt-1">Add the first note above</p>}
              </div>
            ) : (
              notes.map(note => (
                <div key={note.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                        {note.author ? getInitials(note.author.full_name || note.author.email) : '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{note.author?.full_name || note.author?.email || 'Unknown'}</p>
                        <p className="text-xs text-slate-400">{formatRelativeTime(note.created_at)}</p>
                      </div>
                    </div>
                    {(isAdmin || note.author_id === user?.id) && (
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className="space-y-1">
            {activities.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No activity yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-50">
                {activities.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3.5 px-5 py-4">
                    <ActivityIcon type={activity.activity_type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">{activityDescription(activity, profiles)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(activity.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
