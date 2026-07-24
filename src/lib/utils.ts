import type { LeadStatus, LeadPriority, LeadSource } from '@/types';

export const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; dot: string }> = {
  new:          { label: 'New',          color: 'text-sky-700',    bg: 'bg-sky-50 border-sky-200',    dot: 'bg-sky-500' },
  contacted:    { label: 'Contacted',    color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',  dot: 'bg-blue-500' },
  qualified:    { label: 'Qualified',    color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', dot: 'bg-violet-500' },
  proposal:     { label: 'Proposal',     color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  negotiation:  { label: 'Negotiation',  color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  closed_won:   { label: 'Won',          color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  closed_lost:  { label: 'Lost',         color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200',  dot: 'bg-rose-500' },
};

export const PRIORITY_CONFIG: Record<LeadPriority, { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: 'text-slate-600', bg: 'bg-slate-100' },
  medium: { label: 'Medium', color: 'text-amber-700', bg: 'bg-amber-100' },
  high:   { label: 'High',   color: 'text-rose-700',  bg: 'bg-rose-100' },
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  web_form:      'Web Form',
  referral:      'Referral',
  cold_outreach: 'Cold Outreach',
  social:        'Social',
  other:         'Other',
};

export const PIPELINE_STAGES: LeadStatus[] = [
  'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
];

export function formatCurrency(cents?: number): string {
  if (!cents) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
