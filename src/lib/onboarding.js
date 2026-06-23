// src/lib/onboarding.js
// BACKEND-ONLY — call from a Cloudflare Worker or Supabase Edge Function.
// Never expose the service role key to the browser.

import { createClient } from '@supabase/supabase-js';

function getServiceClient(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

/**
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} opts.email
 * @param {string} opts.companyId       UUID of the company in public.companies
 * @param {string} [opts.role]          'director' | 'employee' | 'client' (default: 'client')
 * @param {string} [opts.tempPassword]  If omitted, user logs in via magic link only
 * @param {object} opts.env             Cloudflare Worker env (or equivalent)
 */
export async function createClientUser({ name, email, companyId, role = 'client', tempPassword, env }) {
  const supabaseAdmin = getServiceClient(env);
  const appUrl = env.APP_URL ?? 'https://foundersbridge.co.in';

  // 1. Create auth user — email_confirm:true skips Supabase's built-in email
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password:      tempPassword ?? undefined,
    email_confirm: true,
    user_metadata: { name, role },
  });
  if (authError) throw new Error('Auth creation failed: ' + authError.message);
  const authUid = authData.user.id;

  // 2. Insert into public.users
  const { data: userRow, error: userError } = await supabaseAdmin
    .from('users').insert({ name, email, role, auth_uid: authUid }).select().single();
  if (userError) throw new Error('Profile creation failed: ' + userError.message);

  // 3. Link to company
  const { error: ucError } = await supabaseAdmin
    .from('user_companies').insert({ user_id: userRow.id, company_id: companyId, role, is_primary: true });
  if (ucError) throw new Error('Company link failed: ' + ucError.message);

  // 4. Look up company name for the email
  const { data: company } = await supabaseAdmin
    .from('companies').select('name').eq('id', companyId).single();

  // 5. Send branded welcome email via Edge Function
  const emailRes = await fetch(env.SUPABASE_URL + '/functions/v1/welcome-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY },
    body: JSON.stringify({
      name,
      email,
      company_name:  company?.name ?? '',
      temp_password: tempPassword ?? null,
      login_url:     appUrl + '/login',
    }),
  });
  if (!emailRes.ok) {
    const errText = await emailRes.text().catch(() => '');
    console.warn('Welcome email failed:', errText);
  }

  return userRow;
}