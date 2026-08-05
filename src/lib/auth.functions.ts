import { createServerFn } from "@tanstack/react-start";

import { DEMO_ACCOUNTS } from "@/lib/rbac";

/**
 * Idempotently provisions the fixed Policy Bear department accounts in the
 * identity provider (CEO, Administrator, Operations, HR, Accounting, QC, Agent)
 * together with their profile row and role assignment.
 *
 * It only ever touches the hard-coded department roster, never arbitrary input.
 */
export const provisionStaffAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) throw new Error(listError.message);

  const byEmail = new Map(
    (existing?.users ?? []).map((u) => [(u.email ?? "").toLowerCase(), u.id] as const),
  );

  let created = 0;

  for (const account of DEMO_ACCOUNTS) {
    const email = account.email.toLowerCase();
    let userId = byEmail.get(email);

    if (!userId) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: account.password,
        email_confirm: true,
        user_metadata: { name: account.name, department: account.department },
      });
      if (error) {
        // Race with a concurrent provision call — re-read and continue.
        const { data: retry } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        userId = (retry?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email)?.id;
        if (!userId) continue;
      } else {
        userId = data.user?.id;
        created += 1;
      }
    }
    if (!userId) continue;

    await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        name: account.name,
        email,
        department: account.department,
        title: account.title,
        team: account.team,
        avatar_initials: account.avatarInitials,
        landing: account.landing,
      },
      { onConflict: "id" },
    );

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: account.role }, { onConflict: "user_id,role" });
  }

  return { created, total: DEMO_ACCOUNTS.length };
});
