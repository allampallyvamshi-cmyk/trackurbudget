import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { code, action, payload } = body;

    if (!code || !action) {
      return json({ error: "Missing code or action" }, 400);
    }

    // Validate code
    const { data: accessCode, error: codeError } = await supabase
      .from("access_codes")
      .select("user_id, is_active")
      .eq("code", code)
      .eq("is_active", true)
      .single();

    if (codeError || !accessCode) {
      return json({ error: "Invalid or expired access code" }, 401);
    }

    const userId = accessCode.user_id;

    switch (action) {
      // ── Expenses ─────────────────────────────
      case "get_expenses": {
        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }

      case "add_expense": {
        const { description, amount, category, date, payment_method, notes } = payload || {};
        if (!description || !amount || !category) {
          return json({ error: "Missing required fields" }, 400);
        }
        const { data, error } = await supabase.from("expenses").insert({
          user_id: userId,
          description,
          amount: Number(amount),
          category,
          date: date || new Date().toISOString().split("T")[0],
          payment_method: payment_method || "Cash",
          notes: notes || null,
        }).select().single();
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }

      case "update_expense": {
        const { id, ...updates } = payload || {};
        if (!id) return json({ error: "Missing expense id" }, 400);
        const { data, error } = await supabase
          .from("expenses")
          .update(updates)
          .eq("id", id)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }

      case "delete_expense": {
        const { id } = payload || {};
        if (!id) return json({ error: "Missing expense id" }, 400);
        const { error } = await supabase
          .from("expenses")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      // ── Budgets ──────────────────────────────
      case "get_budgets": {
        const { month } = payload || {};
        let query = supabase.from("budgets").select("*").eq("user_id", userId);
        if (month) query = query.eq("month", month);
        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }

      case "add_budget": {
        const { category, amount_limit, month } = payload || {};
        if (!category || !amount_limit || !month) {
          return json({ error: "Missing required fields" }, 400);
        }
        const { data, error } = await supabase.from("budgets").insert({
          user_id: userId,
          category,
          amount_limit: Number(amount_limit),
          month,
        }).select().single();
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }

      // ── Dashboard summary ────────────────────
      case "get_dashboard": {
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const firstDay = `${thisMonth}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

        const [expRes, budRes, recentRes] = await Promise.all([
          supabase.from("expenses").select("amount, category").eq("user_id", userId).gte("date", firstDay).lte("date", lastDay),
          supabase.from("budgets").select("*").eq("user_id", userId).eq("month", thisMonth),
          supabase.from("expenses").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(5),
        ]);

        return json({
          expenses: expRes.data || [],
          budgets: budRes.data || [],
          recent: recentRes.data || [],
        });
      }

      // ── Profile info (name only) ─────────────
      case "get_profile": {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, currency")
          .eq("user_id", userId)
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return json({ error: err.message || "Internal error" }, 500);
  }
});
