import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function error(message: string, status = 400) {
  return json({ error: message }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");

  // Use service role for reading (to bypass RLS for API queries),
  // but validate JWT for write operations
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Validate user JWT for authenticated endpoints
  async function getUser() {
    if (!authHeader) return null;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error) return null;
    return user;
  }

  async function getUserProfile(userId: string) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    return data;
  }

  const url = new URL(req.url);
  // Strip the function prefix: /leads-api/leads → /leads
  const pathParts = url.pathname.replace(/^\/leads-api/, "").split("/").filter(Boolean);
  // pathParts[0] should be "leads", pathParts[1] is optional id

  if (pathParts[0] !== "leads") {
    return error("Not found", 404);
  }

  const leadId = pathParts[1] ?? null;

  try {
    // ─── GET /leads ───────────────────────────────────────────────────────────
    if (req.method === "GET" && !leadId) {
      const sp = url.searchParams;
      const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
      const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("page_size") ?? "20")));
      const status = sp.get("status");
      const priority = sp.get("priority");
      const source = sp.get("source");
      const assigned_to = sp.get("assigned_to");
      const search = sp.get("search");

      let query = supabaseAdmin
        .from("leads")
        .select("*, assignee:assigned_to(id, email, full_name, role)", { count: "exact" });

      if (status) query = query.eq("status", status);
      if (priority) query = query.eq("priority", priority);
      if (source) query = query.eq("source", source);
      if (assigned_to) query = query.eq("assigned_to", assigned_to);
      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`
        );
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error: dbErr } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (dbErr) return error(dbErr.message, 500);

      const total = count ?? 0;
      return json({
        data: data ?? [],
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: Math.ceil(total / pageSize),
          has_next: page < Math.ceil(total / pageSize),
          has_prev: page > 1,
        },
      });
    }

    // ─── GET /leads/:id ───────────────────────────────────────────────────────
    if (req.method === "GET" && leadId) {
      const { data, error: dbErr } = await supabaseAdmin
        .from("leads")
        .select("*, assignee:assigned_to(id, email, full_name, role)")
        .eq("id", leadId)
        .maybeSingle();

      if (dbErr) return error(dbErr.message, 500);
      if (!data) return error("Lead not found", 404);
      return json(data);
    }

    // ─── POST /leads (public — no auth required) ──────────────────────────────
    if (req.method === "POST" && !leadId) {
      let body: Record<string, unknown>;
      try { body = await req.json(); } catch { return error("Invalid JSON body"); }

      const required = ["first_name", "last_name", "email"];
      for (const field of required) {
        if (!body[field]) return error(`Missing required field: ${field}`, 422);
      }

      const validStatuses = ["new","contacted","qualified","proposal","negotiation","closed_won","closed_lost"];
      const validSources = ["web_form","referral","cold_outreach","social","other"];
      const validPriorities = ["low","medium","high"];

      const payload: Record<string, unknown> = {
        first_name: String(body.first_name).trim(),
        last_name: String(body.last_name).trim(),
        email: String(body.email).trim().toLowerCase(),
        status: validStatuses.includes(String(body.status)) ? body.status : "new",
        source: validSources.includes(String(body.source)) ? body.source : "other",
        priority: validPriorities.includes(String(body.priority)) ? body.priority : "medium",
      };
      if (body.phone) payload.phone = String(body.phone).trim();
      if (body.company) payload.company = String(body.company).trim();
      if (body.message) payload.message = String(body.message).trim();
      if (body.value) payload.value = Math.round(Number(body.value));

      const { data, error: dbErr } = await supabaseAdmin
        .from("leads")
        .insert(payload)
        .select()
        .maybeSingle();

      if (dbErr) return error(dbErr.message, 500);
      if (!data) return error("Failed to create lead", 500);

      // Record activity
      await supabaseAdmin.from("lead_activities").insert({
        lead_id: data.id,
        activity_type: "lead_created",
        metadata: { source: payload.source },
      });

      return json(data, 201);
    }

    // ─── PATCH /leads/:id (authenticated) ────────────────────────────────────
    if (req.method === "PATCH" && leadId) {
      const user = await getUser();
      if (!user) return error("Unauthorized", 401);

      const profile = await getUserProfile(user.id);
      if (!profile) return error("Forbidden", 403);

      // Check permission: admin can update any lead; member can only update assigned
      const { data: existing } = await supabaseAdmin
        .from("leads")
        .select("assigned_to")
        .eq("id", leadId)
        .maybeSingle();

      if (!existing) return error("Lead not found", 404);

      if (profile.role !== "admin" && existing.assigned_to !== user.id) {
        return error("Forbidden: you can only update leads assigned to you", 403);
      }

      let body: Record<string, unknown>;
      try { body = await req.json(); } catch { return error("Invalid JSON body"); }

      // Whitelist updatable fields
      const allowed = ["first_name","last_name","email","phone","company","status","priority","assigned_to","value","message"];
      const updates: Record<string, unknown> = {};
      for (const key of allowed) {
        if (key in body) updates[key] = body[key];
      }
      // Members cannot reassign
      if (profile.role !== "admin") delete updates.assigned_to;

      if (Object.keys(updates).length === 0) return error("No valid fields to update", 422);

      const { data, error: dbErr } = await supabaseAdmin
        .from("leads")
        .update(updates)
        .eq("id", leadId)
        .select("*, assignee:assigned_to(id, email, full_name, role)")
        .maybeSingle();

      if (dbErr) return error(dbErr.message, 500);
      if (!data) return error("Lead not found", 404);

      // Record activities
      if (updates.status && updates.status !== existing.assigned_to) {
        await supabaseAdmin.from("lead_activities").insert({
          lead_id: leadId,
          actor_id: user.id,
          activity_type: "status_changed",
          metadata: { to: updates.status },
        });
      }

      return json(data);
    }

    // ─── DELETE /leads/:id (admin only) ──────────────────────────────────────
    if (req.method === "DELETE" && leadId) {
      const user = await getUser();
      if (!user) return error("Unauthorized", 401);

      const profile = await getUserProfile(user.id);
      if (!profile || profile.role !== "admin") {
        return error("Forbidden: only admins can delete leads", 403);
      }

      const { error: dbErr } = await supabaseAdmin
        .from("leads")
        .delete()
        .eq("id", leadId);

      if (dbErr) return error(dbErr.message, 500);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return error("Method not allowed", 405);

  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return error(message, 500);
  }
});
