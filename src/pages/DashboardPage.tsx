import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchLeads, updateLeadStatus, assignLead, deleteLead } from '@/lib/leads';
import { fetchProfiles } from '@/lib/profiles';
import type { Lead, LeadFilters, LeadStatus, Profile } from '@/types';
import { STATUS_CONFIG, PIPELINE_STAGES, SOURCE_LABELS, formatCurrency, formatRelativeTime, getInitials } from '@/lib/utils';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { navigate, Link } from '@/components/Router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Plus, Search, Filter, ChevronLeft, ChevronRight,
  UserCircle, Trash2, Eye, RefreshCw, TrendingUp,
  Users, CheckCircle, DollarSign, X
} from 'lucide-react';

const PAGE_SIZE = 15;

export default function DashboardPage() {
  const { isAdmin, user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filters, setFilters] = useState<LeadFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Members see only their assigned leads
      const activeFilters = isAdmin ? filters : { ...filters, assigned_to: user?.id };
      const result = await fetchLeads(page, PAGE_SIZE, activeFilters);
      setLeads(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, filters, isAdmin, user?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchProfiles().then(setProfiles); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setFilters(f => ({ ...f, search: searchInput || undefined }));
    setPage(1);
  }

  function clearFilter(key: keyof LeadFilters) {
    setFilters(f => { const n = { ...f }; delete n[key]; return n; });
    if (key === 'search') setSearchInput('');
    setPage(1);
  }

  async function handleStatusChange(lead: Lead, status: LeadStatus) {
    await updateLeadStatus(lead.id, status, user?.id);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    setDeletingId(id);
    await deleteLead(id);
    setDeletingId(null);
    load();
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const wonLeads = leads.filter(l => l.status === 'closed_won').length;
  const totalValue = leads.reduce((s, l) => s + (l.value ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: TrendingUp, label: 'Total Leads', value: total, color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: Users, label: 'In Pipeline', value: leads.filter(l => !['closed_won','closed_lost'].includes(l.status)).length, color: 'text-violet-600', bg: 'bg-violet-50' },
            { icon: CheckCircle, label: 'Won', value: wonLeads, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: DollarSign, label: 'Total Value', value: formatCurrency(totalValue), color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Pipeline overview */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Pipeline Overview</h3>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {PIPELINE_STAGES.map(status => {
              const count = leads.filter(l => l.status === status).length;
              const cfg = STATUS_CONFIG[status];
              return (
                <button
                  key={status}
                  onClick={() => { setFilters(f => ({ ...f, status })); setPage(1); }}
                  className={`flex flex-col items-center min-w-[80px] px-3 py-2.5 rounded-xl border transition-all ${
                    filters.status === status ? `${cfg.bg} border-current ${cfg.color}` : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className={`text-lg font-bold ${filters.status === status ? cfg.color : 'text-slate-900'}`}>{count}</span>
                  <span className="text-xs mt-0.5 whitespace-nowrap">{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px] flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search leads…"
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button type="submit" className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-600 transition-colors">Go</button>
            </form>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setShowFilters(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  showFilters || activeFilterCount > 0 ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:border-slate-400'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>}
              </button>
              <button onClick={load} className="p-2 rounded-xl border border-slate-300 text-slate-500 hover:bg-slate-50 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {isAdmin && (
                <Link href="/leads/new" className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                  <Plus className="w-4 h-4" /> New Lead
                </Link>
              )}
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="px-5 py-2.5 flex items-center gap-2 flex-wrap border-b border-slate-100">
              {filters.status && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                  Status: {STATUS_CONFIG[filters.status].label}
                  <button onClick={() => clearFilter('status')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.priority && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                  Priority: {filters.priority}
                  <button onClick={() => clearFilter('priority')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.search && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                  Search: {filters.search}
                  <button onClick={() => clearFilter('search')}><X className="w-3 h-3" /></button>
                </span>
              )}
              <button onClick={() => { setFilters({}); setSearchInput(''); setPage(1); }} className="text-xs text-slate-400 hover:text-slate-600 underline">
                Clear all
              </button>
            </div>
          )}

          {/* Filter panel */}
          {showFilters && (
            <div className="px-5 py-4 border-b border-slate-100 flex gap-4 flex-wrap">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
                <select
                  value={filters.status ?? ''}
                  onChange={e => { setFilters(f => ({ ...f, status: e.target.value as LeadStatus || undefined })); setPage(1); }}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All</option>
                  {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Priority</label>
                <select
                  value={filters.priority ?? ''}
                  onChange={e => { setFilters(f => ({ ...f, priority: (e.target.value as 'low'|'medium'|'high') || undefined })); setPage(1); }}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All</option>
                  {['low','medium','high'].map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </div>
              {isAdmin && (
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Assigned To</label>
                  <select
                    value={filters.assigned_to ?? ''}
                    onChange={e => { setFilters(f => ({ ...f, assigned_to: e.target.value || undefined })); setPage(1); }}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">All</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Assigned</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Value</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-40" /></td>
                      <td className="px-4 py-3"><div className="h-5 bg-slate-100 rounded-full animate-pulse w-20" /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 bg-slate-100 rounded animate-pulse w-16" /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-slate-100 rounded animate-pulse w-16" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-slate-100 rounded animate-pulse w-24" /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-slate-100 rounded animate-pulse w-16" /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 bg-slate-100 rounded animate-pulse w-16" /></td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400">
                      <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No leads found</p>
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  leads.map(lead => (
                    <tr
                      key={lead.id}
                      className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${deletingId === lead.id ? 'opacity-40' : ''}`}
                    >
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-semibold text-slate-900">{lead.first_name} {lead.last_name}</p>
                          <p className="text-xs text-slate-500">{lead.email}</p>
                          {lead.company && <p className="text-xs text-slate-400">{lead.company}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {isAdmin ? (
                          <select
                            value={lead.status}
                            onChange={e => handleStatusChange(lead, e.target.value as LeadStatus)}
                            className="text-xs border-0 bg-transparent focus:outline-none cursor-pointer font-medium"
                            style={{ color: STATUS_CONFIG[lead.status].color.replace('text-', '') }}
                          >
                            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                          </select>
                        ) : (
                          <StatusBadge status={lead.status} />
                        )}
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <PriorityBadge priority={lead.priority} />
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell text-slate-500 text-xs">
                        {SOURCE_LABELS[lead.source]}
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {lead.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {getInitials(lead.assignee.full_name || lead.assignee.email)}
                            </div>
                            <span className="text-xs text-slate-600">{lead.assignee.full_name?.split(' ')[0] ?? lead.assignee.email}</span>
                          </div>
                        ) : (
                          isAdmin ? (
                            <select
                              value=""
                              onChange={e => { if (e.target.value) assignLead(lead.id, e.target.value, user?.id ?? '').then(load); }}
                              className="text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg px-2 py-1 bg-transparent focus:outline-none"
                            >
                              <option value="">Assign…</option>
                              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                            </select>
                          ) : <span className="text-xs text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell text-slate-600 font-medium text-xs">
                        {formatCurrency(lead.value)}
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell text-xs text-slate-400">
                        {formatRelativeTime(lead.created_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(lead.id)}
                              disabled={deletingId === lead.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} leads
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = i + Math.max(1, page - 3);
                  if (p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm transition-colors ${p === page ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
