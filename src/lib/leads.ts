import { supabase } from '@/lib/supabase';
import type { Lead, LeadNote, LeadActivity, LeadFilters, LeadStatus, PaginatedLeads } from '@/types';

export async function fetchLeads(
  page = 1,
  pageSize = 20,
  filters: LeadFilters = {}
): Promise<PaginatedLeads> {
  let query = supabase
    .from('leads')
    .select('*, assignee:assigned_to(id, email, full_name, role, avatar_url)', { count: 'exact' });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
  if (filters.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const total = count ?? 0;
  return {
    data: (data ?? []) as Lead[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function fetchLead(id: string): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .select('*, assignee:assigned_to(id, email, full_name, role, avatar_url)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Lead not found');
  return data as Lead;
}

export async function createLead(
  lead: Omit<Lead, 'id' | 'notes_count' | 'created_at' | 'updated_at' | 'assignee'>
): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert(lead)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Failed to create lead');

  // Record activity
  await supabase.from('lead_activities').insert({
    lead_id: data.id,
    activity_type: 'lead_created',
    metadata: { source: lead.source },
  });

  return data as Lead;
}

export async function updateLead(
  id: string,
  updates: Partial<Lead>,
  actorId?: string
): Promise<Lead> {
  // Fetch current for activity trail
  const { data: current } = await supabase
    .from('leads')
    .select('status, assigned_to')
    .eq('id', id)
    .maybeSingle();

  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select('*, assignee:assigned_to(id, email, full_name, role, avatar_url)')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Lead not found');

  // Record status change activity
  if (updates.status && current && updates.status !== current.status) {
    await supabase.from('lead_activities').insert({
      lead_id: id,
      actor_id: actorId,
      activity_type: 'status_changed',
      metadata: { from: current.status, to: updates.status },
    });
  }

  // Record assignment activity
  if ('assigned_to' in updates && current && updates.assigned_to !== current.assigned_to) {
    await supabase.from('lead_activities').insert({
      lead_id: id,
      actor_id: actorId,
      activity_type: 'assigned',
      metadata: { from: current.assigned_to ?? null, to: updates.assigned_to ?? null },
    });
  }

  // Record generic field update
  const trackedFields = ['first_name', 'last_name', 'email', 'company', 'phone', 'value', 'priority'];
  const changed = trackedFields.filter(f => f in updates);
  if (changed.length > 0 && !updates.status && !('assigned_to' in updates)) {
    await supabase.from('lead_activities').insert({
      lead_id: id,
      actor_id: actorId,
      activity_type: 'field_updated',
      metadata: { fields: changed },
    });
  }

  return data as Lead;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchNotes(leadId: string): Promise<LeadNote[]> {
  const { data, error } = await supabase
    .from('lead_notes')
    .select('*, author:author_id(id, email, full_name, role, avatar_url)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LeadNote[];
}

export async function addNote(leadId: string, content: string, actorId: string): Promise<LeadNote> {
  const { data, error } = await supabase
    .from('lead_notes')
    .insert({ lead_id: leadId, content, author_id: actorId })
    .select('*, author:author_id(id, email, full_name, role, avatar_url)')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Failed to add note');

  await supabase.from('lead_activities').insert({
    lead_id: leadId,
    actor_id: actorId,
    activity_type: 'note_added',
    metadata: { note_preview: content.slice(0, 100) },
  });

  return data as LeadNote;
}

export async function deleteNote(noteId: string, leadId: string, actorId: string): Promise<void> {
  const { error } = await supabase.from('lead_notes').delete().eq('id', noteId);
  if (error) throw error;

  await supabase.from('lead_activities').insert({
    lead_id: leadId,
    actor_id: actorId,
    activity_type: 'note_deleted',
    metadata: {},
  });
}

export async function fetchActivities(leadId: string): Promise<LeadActivity[]> {
  const { data, error } = await supabase
    .from('lead_activities')
    .select('*, actor:actor_id(id, email, full_name, role, avatar_url)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LeadActivity[];
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
  actorId: string
): Promise<Lead> {
  return updateLead(id, { status }, actorId);
}

export async function assignLead(
  id: string,
  assignedTo: string | null,
  actorId: string
): Promise<Lead> {
  return updateLead(id, { assigned_to: assignedTo ?? undefined }, actorId);
}
