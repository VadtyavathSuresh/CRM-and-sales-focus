import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchRoute } from '@/components/Router';

// ─── Router unit tests ────────────────────────────────────────────────────────
describe('matchRoute', () => {
  it('matches the root path', () => {
    const result = matchRoute('/');
    expect(result?.route).toBe('/');
    expect(result?.params).toEqual({});
  });

  it('matches /login', () => {
    expect(matchRoute('/login')?.route).toBe('/login');
  });

  it('matches /signup', () => {
    expect(matchRoute('/signup')?.route).toBe('/signup');
  });

  it('matches /dashboard', () => {
    expect(matchRoute('/dashboard')?.route).toBe('/dashboard');
  });

  it('matches /leads/:id and extracts the id param', () => {
    const result = matchRoute('/leads/abc-123');
    expect(result?.route).toBe('/leads/:id');
    expect(result?.params?.id).toBe('abc-123');
  });

  it('matches /leads/new before /leads/:id', () => {
    expect(matchRoute('/leads/new')?.route).toBe('/leads/new');
  });

  it('matches /team', () => {
    expect(matchRoute('/team')?.route).toBe('/team');
  });

  it('matches /profile', () => {
    expect(matchRoute('/profile')?.route).toBe('/profile');
  });

  it('returns null for unknown paths', () => {
    expect(matchRoute('/unknown/path')).toBeNull();
  });
});

// ─── Utility function tests ───────────────────────────────────────────────────
import { formatCurrency, getInitials, PIPELINE_STAGES, STATUS_CONFIG } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats cents to dollars', () => {
    expect(formatCurrency(100000)).toBe('$1,000');
  });

  it('returns em dash for missing value', () => {
    expect(formatCurrency(undefined)).toBe('—');
    expect(formatCurrency(0)).toBe('—');
  });
});

describe('getInitials', () => {
  it('returns two uppercase initials', () => {
    expect(getInitials('Jane Smith')).toBe('JS');
  });

  it('returns one initial for single name', () => {
    expect(getInitials('Jane')).toBe('J');
  });

  it('handles extra spaces / multiple names', () => {
    expect(getInitials('John Paul Jones')).toBe('JP');
  });
});

describe('PIPELINE_STAGES', () => {
  it('has 7 stages', () => {
    expect(PIPELINE_STAGES).toHaveLength(7);
  });

  it('starts with new and ends with closed_lost', () => {
    expect(PIPELINE_STAGES[0]).toBe('new');
    expect(PIPELINE_STAGES[PIPELINE_STAGES.length - 1]).toBe('closed_lost');
  });
});

describe('STATUS_CONFIG', () => {
  it('has a config entry for every pipeline stage', () => {
    for (const stage of PIPELINE_STAGES) {
      expect(STATUS_CONFIG[stage]).toBeDefined();
      expect(STATUS_CONFIG[stage].label).toBeTruthy();
    }
  });
});

// ─── Auth permission logic tests ──────────────────────────────────────────────
describe('Auth permission rules', () => {
  // These mirror the RLS / API logic; they are unit tests of the business rules

  function canEditLead(
    userRole: 'admin' | 'member',
    userId: string,
    assignedTo: string | null
  ): boolean {
    if (userRole === 'admin') return true;
    return assignedTo === userId;
  }

  function canDeleteLead(userRole: 'admin' | 'member'): boolean {
    return userRole === 'admin';
  }

  function canAccessTeamPage(userRole: 'admin' | 'member'): boolean {
    return userRole === 'admin';
  }

  it('admin can edit any lead', () => {
    expect(canEditLead('admin', 'user-1', null)).toBe(true);
    expect(canEditLead('admin', 'user-1', 'user-2')).toBe(true);
    expect(canEditLead('admin', 'user-1', 'user-1')).toBe(true);
  });

  it('member can edit only their assigned lead', () => {
    expect(canEditLead('member', 'user-1', 'user-1')).toBe(true);
  });

  it('member cannot edit another member\'s lead', () => {
    expect(canEditLead('member', 'user-1', 'user-2')).toBe(false);
  });

  it('member cannot edit an unassigned lead', () => {
    expect(canEditLead('member', 'user-1', null)).toBe(false);
  });

  it('only admin can delete leads', () => {
    expect(canDeleteLead('admin')).toBe(true);
    expect(canDeleteLead('member')).toBe(false);
  });

  it('only admin can access team management page', () => {
    expect(canAccessTeamPage('admin')).toBe(true);
    expect(canAccessTeamPage('member')).toBe(false);
  });
});

// ─── Lead validation tests ────────────────────────────────────────────────────
describe('Lead API field validation', () => {
  const VALID_STATUSES = ['new','contacted','qualified','proposal','negotiation','closed_won','closed_lost'];
  const VALID_SOURCES = ['web_form','referral','cold_outreach','social','other'];
  const VALID_PRIORITIES = ['low','medium','high'];

  function validateLeadPayload(body: Record<string, unknown>): string | null {
    if (!body.first_name) return 'Missing required field: first_name';
    if (!body.last_name) return 'Missing required field: last_name';
    if (!body.email) return 'Missing required field: email';
    return null;
  }

  function sanitizeStatus(status: unknown): string {
    return VALID_STATUSES.includes(String(status)) ? String(status) : 'new';
  }

  function sanitizeSource(source: unknown): string {
    return VALID_SOURCES.includes(String(source)) ? String(source) : 'other';
  }

  it('rejects payload missing first_name', () => {
    expect(validateLeadPayload({ last_name: 'Smith', email: 'a@b.com' })).toBe('Missing required field: first_name');
  });

  it('rejects payload missing last_name', () => {
    expect(validateLeadPayload({ first_name: 'Jane', email: 'a@b.com' })).toBe('Missing required field: last_name');
  });

  it('rejects payload missing email', () => {
    expect(validateLeadPayload({ first_name: 'Jane', last_name: 'Smith' })).toBe('Missing required field: email');
  });

  it('accepts valid full payload', () => {
    expect(validateLeadPayload({ first_name: 'Jane', last_name: 'Smith', email: 'jane@acme.com' })).toBeNull();
  });

  it('sanitizes unknown status to "new"', () => {
    expect(sanitizeStatus('garbage')).toBe('new');
    expect(sanitizeStatus('new')).toBe('new');
    expect(sanitizeStatus('closed_won')).toBe('closed_won');
  });

  it('sanitizes unknown source to "other"', () => {
    expect(sanitizeSource('garbage')).toBe('other');
    expect(sanitizeSource('referral')).toBe('referral');
  });
});

// ─── Activity trail tests ─────────────────────────────────────────────────────
describe('Activity description logic', () => {
  const STATUS_LABELS: Record<string, string> = {
    new: 'New', contacted: 'Contacted', qualified: 'Qualified',
    proposal: 'Proposal', negotiation: 'Negotiation',
    closed_won: 'Won', closed_lost: 'Lost',
  };

  function describeActivity(type: string, metadata: Record<string, unknown>, actorName: string): string {
    switch (type) {
      case 'lead_created': return `Lead submitted via ${metadata.source}`;
      case 'status_changed': return `${actorName} moved from ${STATUS_LABELS[String(metadata.from)]} → ${STATUS_LABELS[String(metadata.to)]}`;
      case 'note_added': return `${actorName} added a note`;
      case 'assigned': return `${actorName} assigned to ${metadata.assignee_name ?? 'nobody'}`;
      default: return `${actorName} made a change`;
    }
  }

  it('describes lead_created activity', () => {
    expect(describeActivity('lead_created', { source: 'web_form' }, 'System')).toBe('Lead submitted via web_form');
  });

  it('describes status_changed activity', () => {
    const desc = describeActivity('status_changed', { from: 'new', to: 'contacted' }, 'Jane');
    expect(desc).toBe('Jane moved from New → Contacted');
  });

  it('describes note_added activity', () => {
    expect(describeActivity('note_added', {}, 'Bob')).toBe('Bob added a note');
  });

  it('describes assigned activity', () => {
    expect(describeActivity('assigned', { assignee_name: 'Carol' }, 'Admin')).toBe('Admin assigned to Carol');
  });
});
