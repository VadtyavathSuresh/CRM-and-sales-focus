export type Role = 'admin' | 'member';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export type LeadSource = 'web_form' | 'referral' | 'cold_outreach' | 'social' | 'other';
export type LeadPriority = 'low' | 'medium' | 'high';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  assigned_to?: string;
  value?: number;
  message?: string;
  notes_count: number;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}

export type ActivityType =
  | 'lead_created'
  | 'status_changed'
  | 'assigned'
  | 'note_added'
  | 'note_deleted'
  | 'field_updated';

export interface LeadActivity {
  id: string;
  lead_id: string;
  actor_id?: string;
  activity_type: ActivityType;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: Profile;
}

export interface LeadFilters {
  status?: LeadStatus;
  priority?: LeadPriority;
  source?: LeadSource;
  assigned_to?: string;
  search?: string;
}

export interface PaginatedLeads {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
