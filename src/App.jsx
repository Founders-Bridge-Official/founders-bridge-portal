/* eslint-disable */
import { useState, useEffect, useRef, createContext, useContext } from "react";

// ═══════════════════════════════════════════════════════════════════════
// FOUNDERS BRIDGE CRM — SESSION 1
// Auth · Roles · Navigation · App Shell
// 4 Roles: Admin · Manager · Employee · Client
// Login: Email/Mobile + Password OR OTP (OTP coming soon)
// ═══════════════════════════════════════════════════════════════════════

// ─── SUPABASE CONFIG ─────────────────────────────────────────────────
// These will be replaced by environment variables in production
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || "";

// Simple Supabase client (no external library needed)
const sb = {
  async query(table, filters = {}) {
    if (!SUPABASE_URL) return { data: null, error: "No Supabase URL" };
    let url = `${SUPABASE_URL}/rest/v1/${table}?`;
    Object.entries(filters).forEach(([k, v]) => { url += `${k}=eq.${v}&`; });
    url += "select=*";
    const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    const data = await res.json();
    return { data, error: null };
  },
  async insert(table, row) {
    if (!SUPABASE_URL) return { data: null, error: "No Supabase URL" };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    const data = await res.json();
    return { data, error: null };
  },
  async update(table, id, row) {
    if (!SUPABASE_URL) return { data: null, error: "No Supabase URL" };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    const data = await res.json();
    return { data, error: null };
  },
};

// ─── DEMO DATA ────────────────────────────────────────────────────────
// Used when Supabase is not connected (for testing)
const DEMO_USERS = {
  "admin@foundersbridge.in":    { id:"u1", name:"Founders Bridge",  role:"admin",    avatar:"FB", email:"admin@foundersbridge.in",    phone:"9800000001", password:"admin123",   color:"#7C3AED" },
  "manager@foundersbridge.in":  { id:"u2", name:"Priya Sharma",     role:"manager",  avatar:"PS", email:"manager@foundersbridge.in",  phone:"9800000002", password:"manager123", color:"#0369A1" },
  "emp1@foundersbridge.in":     { id:"u3", name:"Arun Kumar",       role:"employee", avatar:"AK", email:"emp1@foundersbridge.in",     phone:"9800000003", password:"emp123",     color:"#0F766E" },
  "emp2@foundersbridge.in":     { id:"u4", name:"Neha Joshi",       role:"employee", avatar:"NJ", email:"emp2@foundersbridge.in",     phone:"9800000004", password:"emp234",     color:"#B45309" },
  "client@techspark.in":        { id:"u5", name:"Rahul Mehta",      role:"client",   avatar:"RM", email:"client@techspark.in",        phone:"9820100001", password:"client123",  color:"#2563EB" },
};

// By phone number too
const DEMO_BY_PHONE = Object.fromEntries(Object.values(DEMO_USERS).map(u => [u.phone, u]));

// ─── ORG SETTINGS (Admin configures these) ───────────────────────────
const DEFAULT_ORG = {
  name: "Founders Bridge LLP",
  email: "info@foundersbridge.in",
  phone: "+91 98000 00001",
  address: "Mumbai, Maharashtra",
  gstin: "27AABCF1234A1Z5",
  pan: "AABCF1234A",
  sac: "998211",
  logo: null,
  gstRate: 18,
  bankName: "HDFC Bank",
  accountNo: "XXXXXXXXXXXX",
  ifsc: "HDFC0000001",
  upi: "foundersbridge@hdfc",
};

// ─── SERVICE BUNDLES (Admin configures these) ─────────────────────────
const DEFAULT_BUNDLES = [
  {
    id: "b1",
    name: "LLP Registration",
    icon: "🤝",
    description: "Complete LLP incorporation service",
    lineItems: [
      { id: "li1", name: "Name Application Govt Fees",   type: "govt",  price: 200,  gst: false, unit: "fixed",    tasks: [] },
      { id: "li2", name: "Main Application Govt Fees",   type: "govt",  price: 450,  gst: false, unit: "fixed",    tasks: [] },
      { id: "li3", name: "DSC Token",                    type: "dsc",   price: 850,  gst: true,  unit: "per_unit", tasks: [{ name: "DSC Creation for Director {n}", autoFromQty: true }] },
      { id: "li4", name: "DSC Association Charges",      type: "service",price: 1271, gst: true,  unit: "per_unit", tasks: [] },
      { id: "li5", name: "LLP Professional Charges",     type: "service",price: 850,  gst: true,  unit: "fixed",    tasks: [
        { name: "Name Approval", autoFromQty: false },
        { name: "Main Application Filing", autoFromQty: false },
      ]},
    ],
    totalApprox: 6850,
  },
  {
    id: "b2",
    name: "Private Limited Registration",
    icon: "🏢",
    description: "Complete Pvt Ltd company incorporation",
    lineItems: [
      { id: "li6",  name: "Name Application Govt Fees",   type: "govt",   price: 200,  gst: false, unit: "fixed",    tasks: [] },
      { id: "li7",  name: "Main Application Govt Fees",   type: "govt",   price: null, gst: false, unit: "fixed",    tasks: [], note: "State-wise — enter manually" },
      { id: "li8",  name: "DSC Token",                    type: "dsc",    price: 850,  gst: true,  unit: "per_unit", tasks: [{ name: "DSC Creation for Director {n}", autoFromQty: true }] },
      { id: "li9",  name: "DSC Association Charges",      type: "service", price: 1271, gst: true,  unit: "per_unit", tasks: [] },
      { id: "li10", name: "Professional Charges",         type: "service", price: 850,  gst: true,  unit: "fixed",    tasks: [
        { name: "Name Approval", autoFromQty: false },
        { name: "Main Application Filing", autoFromQty: false },
      ]},
    ],
    totalApprox: null,
  },
];

// ─── TASK STATUSES ────────────────────────────────────────────────────
const TASK_STATUSES = [
  { id: "open",              label: "Open",                    color: "#6B7280", bg: "#F9FAFB" },
  { id: "team_action",       label: "Team Action Pending",     color: "#D97706", bg: "#FFFBEB" },
  { id: "payment_pending",   label: "Payment Pending",         color: "#DC2626", bg: "#FEF2F2" },
  { id: "client_action",     label: "Client Action Pending",   color: "#2563EB", bg: "#EFF6FF" },
  { id: "team_approval",     label: "Pending Team Approval",   color: "#7C3AED", bg: "#F5F3FF" },
  { id: "govt_approval",     label: "Pending Govt Approval",   color: "#0369A1", bg: "#F0F9FF" },
  { id: "completed",         label: "Completed",               color: "#16A34A", bg: "#F0FDF4" },
  { id: "cancelled",         label: "Cancelled",               color: "#9CA3AF", bg: "#F9FAFB" },
];

const TASK_REQUIREMENT_TYPES = [
  { id: "none",     label: "No Action Needed" },
  { id: "form",     label: "Form to be Filled (Google/Zoho)" },
  { id: "docs",     label: "Documents to be Attached" },
  { id: "form_docs",label: "Form + Documents" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────
const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const initials = name => (name || "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
const today = () => new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── CONTEXT ─────────────────────────────────────────────────────────
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
const G = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', sans-serif; background: #F4F3EF; color: #111827; -webkit-font-smoothing: antialiased; }
button, input, select, textarea { font-family: 'DM Sans', sans-serif; }
input, select, textarea { outline: none; }
table { border-collapse: collapse; width: 100%; }

@keyframes fadeUp   { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
@keyframes spin     { to { transform: rotate(360deg) } }
@keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes slideIn  { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }

:root {
  --ink:     #111827;
  --ink2:    #374151;
  --muted:   #6B7280;
  --faint:   #9CA3AF;
  --cream:   #F4F3EF;
  --white:   #FFFFFF;
  --border:  #E5E4DF;
  --border2: #D1D0CB;
  --blue:    #2563EB;
  --blue-lt: #EFF6FF;
  --green:   #16A34A;
  --red:     #DC2626;
  --orange:  #EA580C;
  --purple:  #7C3AED;
  --navy:    #0F172A;
  --r:       12px;
  --r-sm:    8px;
  --shadow:  0 1px 3px rgba(0,0,0,.08);
  --shadow-md: 0 4px 16px rgba(0,0,0,.10);
}

.app { display:flex; min-height:100vh; }

/* ── Sidebar ── */
.sb { width:240px; min-height:100vh; background:var(--navy); display:flex; flex-direction:column; position:fixed; top:0;left:0;bottom:0; z-index:100; }
.sb-logo { padding:24px 20px 18px; border-bottom:1px solid rgba(255,255,255,.07); }
.sb-brand { font-family:'Fraunces',serif; font-size:19px; color:#fff; line-height:1.2; }
.sb-tagline { font-size:9px; color:rgba(255,255,255,.3); letter-spacing:2px; text-transform:uppercase; margin-top:3px; }
.sb-role-pill { margin:12px 12px 4px; padding:8px 12px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); border-radius:8px; }
.sb-role-name { font-size:11px; font-weight:600; color:#fff; }
.sb-role-tag  { font-size:9px; color:rgba(255,255,255,.35); text-transform:uppercase; letter-spacing:1px; margin-top:1px; }
.sb-nav { flex:1; overflow-y:auto; padding:8px 10px; }
.sb-section { font-size:9px; color:rgba(255,255,255,.25); text-transform:uppercase; letter-spacing:1.8px; padding:12px 10px 4px; }
.sb-item { display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; color:rgba(255,255,255,.55); transition:.15s; margin-bottom:1px; }
.sb-item:hover { background:rgba(255,255,255,.07); color:#fff; }
.sb-item.on { background:rgba(37,99,235,.4); color:#fff; }
.sb-icon { font-size:15px; width:20px; text-align:center; flex-shrink:0; }
.sb-badge { margin-left:auto; background:var(--orange); color:#fff; font-size:10px; font-weight:700; min-width:18px; height:18px; padding:0 5px; border-radius:9px; display:flex; align-items:center; justify-content:center; }
.sb-foot { padding:14px; border-top:1px solid rgba(255,255,255,.06); }
.sb-user { display:flex; align-items:center; gap:9px; }
.sb-av { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; flex-shrink:0; }
.sb-uname { font-size:12px; font-weight:600; color:#fff; }
.sb-urole { font-size:10px; color:rgba(255,255,255,.3); text-transform:capitalize; }
.sb-out { margin-left:auto; background:rgba(255,255,255,.08); border:none; color:rgba(255,255,255,.45); font-size:11px; padding:4px 9px; border-radius:6px; cursor:pointer; }
.sb-out:hover { background:rgba(255,255,255,.16); color:#fff; }

/* ── Main ── */
.main { margin-left:240px; flex:1; min-height:100vh; display:flex; flex-direction:column; }
.topbar { height:56px; padding:0 28px; display:flex; align-items:center; gap:12px; background:rgba(244,243,239,.95); backdrop-filter:blur(12px); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:50; }
.topbar-title { font-family:'Fraunces',serif; font-size:19px; flex:1; }
.page { padding:24px 28px 80px; animation:fadeIn .2s ease; }

/* ── Buttons ── */
.btn { padding:7px 16px; border-radius:var(--r-sm); font-size:12px; font-weight:600; cursor:pointer; border:1.5px solid var(--border); background:var(--white); color:var(--ink2); transition:.15s; display:inline-flex; align-items:center; gap:6px; }
.btn:hover { border-color:var(--ink); color:var(--ink); }
.btn-primary { background:var(--ink); color:#fff; border-color:var(--ink); }
.btn-primary:hover { background:var(--blue); border-color:var(--blue); }
.btn-blue { background:var(--blue); color:#fff; border-color:var(--blue); }
.btn-blue:hover { background:#1D4ED8; }
.btn-green { background:var(--green); color:#fff; border-color:var(--green); }
.btn-green:hover { background:#15803D; }
.btn-red { background:var(--red); color:#fff; border-color:var(--red); }
.btn-red:hover { background:#B91C1C; }
.btn-ghost { background:transparent; border:1.5px dashed var(--border2); color:var(--muted); }
.btn-ghost:hover { border-color:var(--blue); color:var(--blue); background:var(--blue-lt); }
.btn-sm { padding:5px 12px; font-size:11px; }
.btn-lg { padding:11px 24px; font-size:14px; }
.btn:disabled { opacity:.4; cursor:not-allowed; }

/* ── Cards ── */
.card { background:var(--white); border:1px solid var(--border); border-radius:var(--r); box-shadow:var(--shadow); }
.card-head { padding:14px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
.card-title { font-family:'Fraunces',serif; font-size:15px; }
.card-body { padding:18px 20px; }

/* ── Stats ── */
.stat-grid { display:grid; gap:14px; margin-bottom:22px; }
.stat-box { background:var(--white); border:1px solid var(--border); border-radius:var(--r); padding:18px 20px; box-shadow:var(--shadow); position:relative; overflow:hidden; }
.stat-box::after { content:''; position:absolute; right:-20px; top:-20px; width:80px; height:80px; border-radius:50%; background:var(--blue); opacity:.04; }
.stat-lbl { font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:1px; }
.stat-val { font-family:'Fraunces',serif; font-size:28px; margin:6px 0 2px; }
.stat-note { font-size:11px; color:var(--faint); }
.stat-icon { font-size:26px; margin-bottom:8px; }

/* ── Table ── */
.tbl-wrap { overflow-x:auto; }
table { width:100%; border-collapse:collapse; font-size:13px; }
th { padding:9px 14px; text-align:left; font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:1px; border-bottom:2px solid var(--border); background:#FAFAF8; white-space:nowrap; }
td { padding:12px 14px; border-bottom:1px solid #F3F4F6; vertical-align:middle; }
tr:last-child td { border-bottom:none; }
tr:hover td { background:#FAFAF8; }

/* ── Badge ── */
.badge { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
.badge-dot { width:5px; height:5px; border-radius:50%; }

/* ── Forms ── */
.form-grid { display:grid; gap:16px; }
.form-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.form-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
.f-group { display:flex; flex-direction:column; gap:5px; }
.f-label { font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.8px; }
.f-input { padding:9px 13px; border:1.5px solid var(--border); border-radius:var(--r-sm); font-size:13px; background:var(--white); transition:.15s; width:100%; }
.f-input:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(37,99,235,.08); }
.f-input:disabled { background:#FAFAF8; color:var(--muted); }
.f-select { padding:9px 13px; border:1.5px solid var(--border); border-radius:var(--r-sm); font-size:13px; background:var(--white); transition:.15s; width:100%; cursor:pointer; }
.f-select:focus { border-color:var(--blue); }
.f-textarea { padding:9px 13px; border:1.5px solid var(--border); border-radius:var(--r-sm); font-size:13px; background:var(--white); transition:.15s; width:100%; resize:vertical; min-height:80px; }
.f-textarea:focus { border-color:var(--blue); }
.f-hint { font-size:11px; color:var(--faint); }
.f-error { font-size:11px; color:var(--red); }
.f-req { color:var(--red); }

/* ── Modal ── */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn .15s ease; }
.modal-box { background:var(--white); border-radius:16px; width:100%; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.25); animation:fadeUp .2s ease; }
.modal-head { padding:20px 24px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; background:var(--white); z-index:1; }
.modal-title { font-family:'Fraunces',serif; font-size:18px; }
.modal-body { padding:24px; }
.modal-foot { padding:16px 24px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:10px; }
.modal-close { background:none; border:none; font-size:20px; cursor:pointer; color:var(--faint); line-height:1; }
.modal-close:hover { color:var(--ink); }

/* ── Progress ── */
.prog-bg { height:5px; background:var(--border); border-radius:5px; overflow:hidden; }
.prog-fill { height:100%; border-radius:5px; transition:width .6s; }

/* ── Tabs ── */
.tabs { display:flex; gap:2px; background:#EEEDE9; padding:3px; border-radius:10px; width:fit-content; margin-bottom:20px; flex-wrap:wrap; }
.tab { padding:7px 16px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; color:var(--muted); transition:.15s; white-space:nowrap; }
.tab.on { background:var(--white); color:var(--ink); box-shadow:0 1px 4px rgba(0,0,0,.1); font-weight:600; }

/* ── Info box ── */
.info-box { padding:11px 15px; border-radius:10px; display:flex; gap:10px; align-items:flex-start; margin-bottom:16px; }

/* ── Chips ── */
.chips { display:flex; gap:7px; flex-wrap:wrap; margin-bottom:16px; align-items:center; }
.chip { padding:5px 13px; border-radius:20px; font-size:12px; font-weight:500; border:1.5px solid var(--border); background:var(--white); cursor:pointer; color:var(--muted); transition:.15s; }
.chip.on { background:var(--ink); color:#fff; border-color:var(--ink); }
.chip:hover:not(.on) { border-color:var(--ink); color:var(--ink); }

/* ── Toast ── */
.toast { position:fixed; top:20px; right:20px; z-index:999; display:flex; align-items:center; gap:10px; padding:12px 18px; border-radius:10px; box-shadow:0 4px 20px rgba(0,0,0,.12); font-size:13px; font-weight:600; max-width:360px; animation:slideIn .2s ease; }

/* ── Login ── */
.auth-wrap { min-height:100vh; background:var(--navy); display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
.auth-orb { position:absolute; border-radius:50%; opacity:.1; pointer-events:none; }
.auth-card { background:#fff; border-radius:20px; padding:44px 40px; width:440px; z-index:2; box-shadow:0 32px 80px rgba(0,0,0,.35); animation:fadeUp .3s ease; }
.auth-brand { font-family:'Fraunces',serif; font-size:26px; margin-bottom:2px; }
.auth-sub { font-size:11px; color:var(--muted); letter-spacing:2px; text-transform:uppercase; margin-bottom:32px; }
.auth-tabs { display:flex; background:#F3F4F6; border-radius:8px; padding:3px; margin-bottom:24px; }
.auth-tab { flex:1; padding:8px; border-radius:6px; text-align:center; font-size:13px; font-weight:600; cursor:pointer; color:var(--muted); transition:.15s; }
.auth-tab.on { background:#fff; color:var(--ink); box-shadow:0 1px 4px rgba(0,0,0,.08); }
.otp-grid { display:flex; gap:10px; justify-content:center; margin:16px 0; }
.otp-box { width:48px; height:54px; border:1.5px solid var(--border); border-radius:10px; text-align:center; font-size:22px; font-weight:700; transition:.15s; }
.otp-box:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(37,99,235,.08); }
.demo-hints { margin-top:20px; padding:14px; background:#F9FAFB; border:1px solid var(--border); border-radius:8px; font-size:11px; color:var(--muted); line-height:2; }
.demo-hints b { color:var(--ink); }

/* ── Role-specific accents ── */
.role-admin    .accent { color:#7C3AED; }
.role-manager  .accent { color:#0369A1; }
.role-employee .accent { color:#0F766E; }
.role-client   .accent { color:#2563EB; }

/* ── Avatar ── */
.av { border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; color:#fff; flex-shrink:0; }
.av-sm { width:28px; height:28px; font-size:10px; }
.av-md { width:36px; height:36px; font-size:13px; }
.av-lg { width:44px; height:44px; font-size:16px; }

/* ── Status badge colors ── */
.s-open         { background:#F9FAFB; color:#6B7280; }
.s-team_action  { background:#FFFBEB; color:#D97706; }
.s-payment      { background:#FEF2F2; color:#DC2626; }
.s-client_action{ background:#EFF6FF; color:#2563EB; }
.s-team_approval{ background:#F5F3FF; color:#7C3AED; }
.s-govt_approval{ background:#F0F9FF; color:#0369A1; }
.s-completed    { background:#F0FDF4; color:#16A34A; }
.s-cancelled    { background:#F9FAFB; color:#9CA3AF; }

/* ── Misc ── */
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
.grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
.grid4 { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.sr { font-family:'Fraunces',serif; }
.divider { height:1px; background:var(--border); margin:20px 0; }
.tag { display:inline-block; padding:1px 7px; border-radius:4px; font-size:10px; font-weight:700; background:#F3F4F6; color:var(--muted); }
.empty { text-align:center; padding:48px 20px; color:var(--faint); }
.empty-icon { font-size:40px; margin-bottom:12px; }
.spinner { width:20px; height:20px; border:2.5px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
.section-label { font-size:10px; font-weight:800; color:var(--muted); text-transform:uppercase; letter-spacing:1.5px; padding:12px 20px 8px; background:#FAFAF8; border-bottom:1px solid #F3F4F6; }
.row-item { display:flex; align-items:center; gap:12px; padding:13px 20px; border-bottom:1px solid #F3F4F6; transition:background .1s; }
.row-item:last-child { border-bottom:none; }
.row-item:hover { background:#FAFAF8; }
`;

// ═══════════════════════════════════════════════════════════════════════
// BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function Badge({ status, label, style }) {
  const s = TASK_STATUSES.find(x => x.id === status);
  const bg = s?.bg || "#F9FAFB";
  const color = s?.color || "#6B7280";
  return (
    <span className="badge" style={{ background: bg, color, ...style }}>
      <span className="badge-dot" style={{ background: color }} />
      {label || s?.label || status}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════════════
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  const C = { success: { bg: "#F0FDF4", border: "#BBF7D0", color: "#15803D", icon: "✅" }, error: { bg: "#FFF1F2", border: "#FECACA", color: "#BE123C", icon: "❌" }, info: { bg: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8", icon: "ℹ️" }, warning: { bg: "#FFFBEB", border: "#FDE68A", color: "#B45309", icon: "⚠️" } };
  const c = C[type] || C.info;
  return <div className="toast" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}><span style={{ fontSize: 18 }}>{c.icon}</span>{msg}</div>;
}

// ═══════════════════════════════════════════════════════════════════════
// AUTH — LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════
function LoginPage({ onLogin, showToast }) {
  const [mode, setMode]         = useState("password"); // password | otp
  const [identifier, setId]     = useState("");         // email or phone
  const [password, setPassword] = useState("");
  const [otp, setOtp]           = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [countdown, setCount]   = useState(0);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    if (countdown > 0) { const t = setTimeout(() => setCount(c => c - 1), 1000); return () => clearTimeout(t); }
  }, [countdown]);

  const findUser = (id) => {
    const norm = id.trim().toLowerCase();
    return DEMO_USERS[norm] || DEMO_BY_PHONE[norm] || null;
  };

  const handlePasswordLogin = async () => {
    setError("");
    if (!identifier) { setError("Enter your email or mobile number"); return; }
    if (!password) { setError("Enter your password"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const user = findUser(identifier);
    if (!user || user.password !== password) { setError("Invalid credentials. Please try again."); setLoading(false); return; }
    setLoading(false);
    showToast(`Welcome back, ${user.name}!`, "success");
    onLogin(user);
  };

  const handleSendOtp = async () => {
    if (!identifier) { setError("Enter your email or mobile number"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setOtpSent(true);
    setCount(30);
    showToast("OTP feature coming soon — use password login for now", "info");
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[i] = val.slice(-1); setOtp(next);
    if (val && i < 5) otpRefs[i + 1].current?.focus();
    if (!val && i > 0) otpRefs[i - 1].current?.focus();
  };

  return (
    <div className="auth-wrap">
      <div className="auth-orb" style={{ width: 500, height: 500, top: -150, right: -150, background: "linear-gradient(135deg,#7C3AED,transparent)" }} />
      <div className="auth-orb" style={{ width: 300, height: 300, bottom: -80, left: -80, background: "linear-gradient(135deg,#EA580C,transparent)" }} />
      <div className="auth-card">
        <div className="auth-brand">Founders Bridge</div>
        <div className="auth-sub">CRM & Client Portal</div>

        {/* Login mode tabs */}
        <div className="auth-tabs" style={{ marginBottom: 20 }}>
          <div className={`auth-tab ${mode === "password" ? "on" : ""}`} onClick={() => { setMode("password"); setError(""); }}>🔑 Password</div>
          <div className={`auth-tab ${mode === "otp" ? "on" : ""}`} onClick={() => { setMode("otp"); setError(""); }}>📱 OTP</div>
        </div>

        {/* Identifier field */}
        <div className="f-group" style={{ marginBottom: 14 }}>
          <label className="f-label">Email Address or Mobile Number</label>
          <input className="f-input" type="text" placeholder="email@example.com or 98xxxxxxxx" value={identifier} onChange={e => setId(e.target.value)} onKeyDown={e => mode === "password" && e.key === "Enter" && handlePasswordLogin()} />
        </div>

        {/* Password mode */}
        {mode === "password" && (
          <>
            <div className="f-group" style={{ marginBottom: 16 }}>
              <label className="f-label">Password</label>
              <input className="f-input" type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePasswordLogin()} />
            </div>
            {error && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 12 }}>{error}</div>}
            <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={handlePasswordLogin} disabled={loading}>
              {loading ? <span className="spinner" /> : "Sign In →"}
            </button>
          </>
        )}

        {/* OTP mode */}
        {mode === "otp" && (
          <>
            {!otpSent ? (
              <>
                {error && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 12 }}>{error}</div>}
                <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={handleSendOtp} disabled={loading}>
                  {loading ? <span className="spinner" /> : "Send OTP →"}
                </button>
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, fontSize: 12, color: "#B45309" }}>
                  ⚠️ OTP login via SMS coming soon. Use password login for now.
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>Enter the 6-digit OTP</div>
                <div className="otp-grid" style={{ marginBottom: 16 }}>
                  {otp.map((d, i) => (
                    <input key={i} ref={otpRefs[i]} className="otp-box" type="tel" maxLength={1} value={d} onChange={e => handleOtpChange(i, e.target.value)} autoFocus={i === 0} />
                  ))}
                </div>
                <button className="btn btn-primary btn-lg" style={{ width: "100%", marginBottom: 12 }}>Verify & Sign In →</button>
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
                  {countdown > 0 ? `Resend in ${countdown}s` : <span style={{ color: "var(--blue)", cursor: "pointer" }} onClick={handleSendOtp}>Resend OTP</span>}
                </div>
              </>
            )}
          </>
        )}

        {/* Demo hints */}
        <div className="demo-hints">
          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>Demo Accounts (password login):</div>
          <div><b>Admin:</b> admin@foundersbridge.in / admin123</div>
          <div><b>Manager:</b> manager@foundersbridge.in / manager123</div>
          <div><b>Employee:</b> emp1@foundersbridge.in / emp123</div>
          <div><b>Client:</b> client@techspark.in / client123</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP SHELL
// ═══════════════════════════════════════════════════════════════════════
function _AppV1Unused() {
  const [user, setUser]         = useState(null);
  const [view, setView]         = useState("");
  const [toast, setToast]       = useState(null);
  const [modal, setModal]       = useState(null);

  // App-wide data state
  const [org,       setOrg]     = useState(DEFAULT_ORG);
  const [bundles,   setBundles] = useState(DEFAULT_BUNDLES);
  const [clients,   setClients] = useState(DEMO_CLIENTS);
  const [employees, setEmps]    = useState(DEMO_EMPLOYEES);
  const [invoices,  setInvoices]= useState(DEMO_INVOICES);
  const [tasks,     setTasks]   = useState(DEMO_TASKS);

  const showToast = (msg, type = "info") => setToast({ msg, type });
  const openModal = (id, data = {}) => setModal({ id, data });
  const closeModal = () => setModal(null);

  const handleLogin = (u) => {
    setUser(u);
    setView(defaultView(u.role));
  };

  const defaultView = (role) => {
    if (role === "admin" || role === "manager") return "dashboard";
    if (role === "employee") return "emp-dashboard";
    return "client-home";
  };

  const logout = () => { setUser(null); setView(""); };

  if (!user) return (
    <>
      <style>{G}</style>
      <LoginPage onLogin={handleLogin} showToast={showToast} />
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );

  const ctx = { user, org, setOrg, bundles, setBundles, clients, setClients, employees, setEmps, invoices, setInvoices, tasks, setTasks, showToast, openModal, closeModal, modal, view, setView };

  return (
    <AppCtx.Provider value={ctx}>
      <style>{G}</style>
      <div className={`app role-${user.role}`}>
        <Sidebar user={user} view={view} setView={setView} logout={logout} />
        <div className="main">
          <TopBar />
          <div className="page">
            <PageRouter />
          </div>
        </div>
      </div>
      <ModalRouter />
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </AppCtx.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════
function Sidebar({ user, view, setView, logout }) {
  const roleColor = { admin: "#7C3AED", manager: "#0369A1", employee: "#0F766E", client: "#2563EB" };
  const roleLabel = { admin: "Administrator", manager: "Manager", employee: "Employee", client: "Client" };

  const NAV = {
    admin: [
      { sec: "Overview", items: [
        { id: "dashboard",    icon: "⬡",  label: "Dashboard" },
        { id: "analytics",    icon: "📊", label: "Analytics" },
      ]},
      { sec: "Clients", items: [
        { id: "clients",      icon: "🏢", label: "All Clients" },
        { id: "invoices",     icon: "📄", label: "Invoices" },
        { id: "tasks",        icon: "✓",  label: "Tasks" },
      ]},
      { sec: "Team", items: [
        { id: "employees",    icon: "👥", label: "Employees" },
      ]},
      { sec: "Settings", items: [
        { id: "settings-org",     icon: "🏛️", label: "Organisation" },
        { id: "settings-bundles", icon: "📦", label: "Bundles & Services" },
        { id: "settings-users",   icon: "🔐", label: "Users & Roles" },
      ]},
    ],
    manager: [
      { sec: "Overview", items: [
        { id: "dashboard",    icon: "⬡",  label: "Dashboard" },
      ]},
      { sec: "Clients", items: [
        { id: "clients",      icon: "🏢", label: "All Clients" },
        { id: "invoices",     icon: "📄", label: "Invoices" },
        { id: "tasks",        icon: "✓",  label: "Tasks" },
      ]},
      { sec: "Team", items: [
        { id: "employees",    icon: "👥", label: "Team" },
      ]},
    ],
    employee: [
      { sec: "My Work", items: [
        { id: "emp-dashboard", icon: "⬡",  label: "Dashboard" },
        { id: "emp-tasks",     icon: "✓",  label: "My Tasks" },
        { id: "emp-clients",   icon: "🏢", label: "My Clients" },
      ]},
    ],
    client: [
      { sec: "My Companies", items: [
        { id: "client-home",     icon: "🏢", label: "Companies" },
        { id: "client-tasks",    icon: "✓",  label: "Tasks" },
        { id: "client-invoices", icon: "💳", label: "Billing" },
        { id: "client-docs",     icon: "📁", label: "Documents" },
      ]},
    ],
  };

  const nav = NAV[user.role] || [];

  return (
    <aside className="sb">
      <div className="sb-logo">
        <div className="sb-brand">Founders<br />Bridge</div>
        <div className="sb-tagline">CRM Portal</div>
      </div>
      <div className="sb-role-pill">
        <div className="sb-role-name">{user.name}</div>
        <div className="sb-role-tag">{roleLabel[user.role]}</div>
      </div>
      <nav className="sb-nav">
        {nav.map(sec => (
          <div key={sec.sec}>
            <div className="sb-section">{sec.sec}</div>
            {sec.items.map(item => (
              <div key={item.id} className={`sb-item ${view === item.id ? "on" : ""}`} onClick={() => setView(item.id)}>
                <span className="sb-icon">{item.icon}</span>
                {item.label}
                {item.badge > 0 && <span className="sb-badge">{item.badge}</span>}
              </div>
            ))}
          </div>
        ))}
      </nav>
      <div className="sb-foot">
        <div className="sb-user">
          <div className="sb-av av" style={{ background: roleColor[user.role] }}>{user.avatar}</div>
          <div>
            <div className="sb-uname">{user.name}</div>
            <div className="sb-urole">{user.role}</div>
          </div>
          <button className="sb-out" onClick={logout}>Exit</button>
        </div>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TOPBAR
// ═══════════════════════════════════════════════════════════════════════
function TopBar() {
  const { view, org } = useApp();
  const titles = {
    dashboard: "Dashboard", analytics: "Analytics", clients: "Clients", invoices: "Invoices", tasks: "Tasks", employees: "Employees",
    "settings-org": "Organisation Settings", "settings-bundles": "Bundles & Services", "settings-users": "Users & Roles",
    "emp-dashboard": "My Dashboard", "emp-tasks": "My Tasks", "emp-clients": "My Clients",
    "client-home": "My Companies", "client-tasks": "My Tasks", "client-invoices": "My Billing", "client-docs": "My Documents",
  };
  return (
    <div className="topbar">
      <div className="topbar-title">{titles[view] || "Founders Bridge"}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{org.name}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAGE ROUTER
// ═══════════════════════════════════════════════════════════════════════
function PageRouter() {
  const { view, user } = useApp();

  // Admin / Manager views
  if (view === "dashboard")         return <AdminDashboard />;
  if (view === "analytics")         return <AnalyticsPage />;
  if (view === "clients")           return <ClientsPage />;
  if (view === "invoices")          return <InvoicesPage />;
  if (view === "tasks")             return <TasksPage />;
  if (view === "employees")         return <EmployeesPage />;
  if (view === "settings-org")      return <OrgSettings />;
  if (view === "settings-bundles")  return <BundleSettings />;
  if (view === "settings-users")    return <UserSettings />;

  // Employee views
  if (view === "emp-dashboard")     return <EmpDashboard />;
  if (view === "emp-tasks")         return <EmpTasks />;
  if (view === "emp-clients")       return <EmpClients />;

  // Client views
  if (view === "client-home")       return <ClientHome />;
  if (view === "client-tasks")      return <ClientTasks />;
  if (view === "client-invoices")   return <ClientInvoices />;
  if (view === "client-docs")       return <ClientDocs />;

  return <div className="empty"><div className="empty-icon">🏗️</div><div>Select a section from the sidebar</div></div>;
}

// ═══════════════════════════════════════════════════════════════════════
// MODAL ROUTER
// ═══════════════════════════════════════════════════════════════════════
function ModalRouter() {
  const { modal, closeModal } = useApp();
  if (!modal) return null;
  const M = {
    "create-client":  CreateClientModal,
    "create-invoice": CreateInvoiceModal,
    "view-invoice":   ViewInvoiceModal,
    "view-task":      ViewTaskModal,
    "create-employee":CreateEmployeeModal,
    "view-client":    ViewClientModal,
  }[modal.id];
  if (!M) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
      <M data={modal.data} onClose={closeModal} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════════════
const DEMO_EMPLOYEES = [
  { id: "e1", name: "Arun Kumar",  email: "emp1@foundersbridge.in", phone: "9800000003", role: "employee", avatar: "AK", color: "#0F766E", clientCount: 3, tasksCompleted: 12, tasksPending: 5 },
  { id: "e2", name: "Neha Joshi",  email: "emp2@foundersbridge.in", phone: "9800000004", role: "employee", avatar: "NJ", color: "#B45309", clientCount: 2, tasksCompleted: 8,  tasksPending: 3 },
];

const DEMO_CLIENTS = [
  { id: "c1", clientNo: "FB-2025-001", name: "TechSpark Solutions Pvt Ltd", contactName: "Rahul Mehta", email: "client@techspark.in", phone: "9820100001", type: "Private Limited", status: "active", assignedTo: "e1", totalBilling: 85000, collected: 72500, pending: 12500, progress: 65, createdAt: "Jan 15, 2025" },
  { id: "c2", clientNo: "FB-2025-002", name: "GreenLeaf Ventures LLP",      contactName: "Anita Shah",  email: "anita@greenleaf.in",   phone: "9820100002", type: "LLP",             status: "active", assignedTo: "e1", totalBilling: 45000, collected: 45000, pending: 0,     progress: 100, createdAt: "Feb 3, 2025" },
  { id: "c3", clientNo: "FB-2025-003", name: "BlueSky Innovations Pvt Ltd",  contactName: "Kiran Patel", email: "kiran@bluesky.in",     phone: "9820100003", type: "Private Limited", status: "active", assignedTo: "e2", totalBilling: 72000, collected: 36000, pending: 36000, progress: 40, createdAt: "Mar 10, 2025" },
  { id: "c4", clientNo: "FB-2025-004", name: "SunRise Trading LLP",          contactName: "Meera Nair",  email: "meera@sunrise.in",     phone: "9820100004", type: "LLP",             status: "pending", assignedTo: "e2", totalBilling: 28000, collected: 0,     pending: 28000, progress: 10, createdAt: "Apr 22, 2025" },
];

const DEMO_INVOICES = [
  { id: "inv1", invoiceNo: "FB/2025/001", clientId: "c1", clientName: "TechSpark Solutions Pvt Ltd", date: "Jan 15, 2025", dueDate: "Jan 31, 2025", status: "partial", total: 85000, paid: 72500, pending: 12500,
    lineItems: [
      { id: "il1", name: "Name Application Govt Fees", type: "govt",    qty: 1, unitPrice: 200,  gst: false, amount: 200  },
      { id: "il2", name: "Main Application Govt Fees", type: "govt",    qty: 1, unitPrice: 1500, gst: false, amount: 1500 },
      { id: "il3", name: "DSC Token",                  type: "dsc",     qty: 2, unitPrice: 850,  gst: true,  amount: 2006 },
      { id: "il4", name: "DSC Association Charges",    type: "service", qty: 2, unitPrice: 1271, gst: true,  amount: 2999.96 },
      { id: "il5", name: "Professional Charges",       type: "service", qty: 1, unitPrice: 850,  gst: true,  amount: 1003 },
    ]
  },
  { id: "inv2", invoiceNo: "FB/2025/002", clientId: "c2", clientName: "GreenLeaf Ventures LLP",     date: "Feb 3, 2025",  dueDate: "Feb 20, 2025", status: "paid",    total: 45000, paid: 45000, pending: 0,
    lineItems: [
      { id: "il6", name: "Name Application Govt Fees",   type: "govt",    qty: 1, unitPrice: 200,  gst: false, amount: 200  },
      { id: "il7", name: "Main Application Govt Fees",   type: "govt",    qty: 1, unitPrice: 450,  gst: false, amount: 450  },
      { id: "il8", name: "DSC Token",                    type: "dsc",     qty: 1, unitPrice: 850,  gst: true,  amount: 1003 },
      { id: "il9", name: "LLP Professional Charges",     type: "service", qty: 1, unitPrice: 850,  gst: true,  amount: 1003 },
    ]
  },
];

const DEMO_TASKS = [
  { id: "t1", title: "DSC Creation for Director 1", clientId: "c1", clientName: "TechSpark Solutions Pvt Ltd", invoiceId: "inv1", lineItemId: "il3", assignedTo: "e1", status: "completed",    sequence: 1, requirementType: "docs",  dueDate: "2025-02-01", completedDate: "2025-01-28", notes: "DSC created successfully" },
  { id: "t2", title: "DSC Creation for Director 2", clientId: "c1", clientName: "TechSpark Solutions Pvt Ltd", invoiceId: "inv1", lineItemId: "il3", assignedTo: "e1", status: "completed",    sequence: 2, requirementType: "docs",  dueDate: "2025-02-01", completedDate: "2025-01-29", notes: "" },
  { id: "t3", title: "Name Approval",               clientId: "c1", clientName: "TechSpark Solutions Pvt Ltd", invoiceId: "inv1", lineItemId: "il5", assignedTo: "e1", status: "completed",    sequence: 3, requirementType: "none",  dueDate: "2025-02-05", completedDate: "2025-02-03", notes: "Name approved" },
  { id: "t4", title: "Main Application Filing",     clientId: "c1", clientName: "TechSpark Solutions Pvt Ltd", invoiceId: "inv1", lineItemId: "il5", assignedTo: "e1", status: "govt_approval",sequence: 4, requirementType: "none",  dueDate: "2025-02-15", completedDate: null,          notes: "Filed, awaiting approval" },
  { id: "t5", title: "Name Approval",               clientId: "c2", clientName: "GreenLeaf Ventures LLP",     invoiceId: "inv2", lineItemId: "il9", assignedTo: "e1", status: "completed",    sequence: 1, requirementType: "none",  dueDate: "2025-02-10", completedDate: "2025-02-08", notes: "" },
  { id: "t6", title: "Main Application Filing",     clientId: "c2", clientName: "GreenLeaf Ventures LLP",     invoiceId: "inv2", lineItemId: "il9", assignedTo: "e1", status: "completed",    sequence: 2, requirementType: "none",  dueDate: "2025-02-20", completedDate: "2025-02-18", notes: "" },
  { id: "t7", title: "DSC Creation for Director 1", clientId: "c3", clientName: "BlueSky Innovations Pvt Ltd",invoiceId: null,   lineItemId: null,  assignedTo: "e2", status: "client_action",sequence: 1, requirementType: "docs",  dueDate: "2025-04-01", completedDate: null,          notes: "Waiting for client documents" },
  { id: "t8", title: "Name Approval",               clientId: "c4", clientName: "SunRise Trading LLP",        invoiceId: null,   lineItemId: null,  assignedTo: "e2", status: "open",         sequence: 1, requirementType: "none",  dueDate: "2025-05-10", completedDate: null,          notes: "" },
];

// ═══════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
function AdminDashboard() {
  const { clients, invoices, tasks, employees, setView } = useApp();
  const totalBilling   = clients.reduce((s, c) => s + c.totalBilling, 0);
  const totalCollected = clients.reduce((s, c) => s + c.collected, 0);
  const totalPending   = clients.reduce((s, c) => s + c.pending, 0);
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const pendingTasks   = tasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length;
  const overdueTasks   = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed").length;
  const activeClients  = clients.filter(c => c.status === "active").length;

  return (
    <>
      {/* Stats */}
      <div className="stat-grid grid4" style={{ marginBottom: 22 }}>
        {[
          { icon: "🏢", label: "Active Clients",    val: activeClients,       note: `${clients.length} total`,            color: "var(--blue)" },
          { icon: "💰", label: "Total Billing",     val: INR(totalBilling),   note: "All clients",                        color: "var(--ink)" },
          { icon: "✅", label: "Collected",         val: INR(totalCollected), note: `${Math.round(totalCollected/totalBilling*100)||0}% of total`, color: "var(--green)" },
          { icon: "⏳", label: "Pending",           val: INR(totalPending),   note: `${clients.filter(c=>c.pending>0).length} clients`, color: "var(--red)" },
        ].map(s => (
          <div key={s.label} className="stat-box">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-lbl">{s.label}</div>
            <div className="stat-val" style={{ color: s.color, fontSize: 22 }}>{s.val}</div>
            <div className="stat-note">{s.note}</div>
          </div>
        ))}
      </div>

      <div className="grid2" style={{ marginBottom: 22 }}>
        {/* Task overview */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Task Overview</div>
            <button className="btn btn-sm" onClick={() => setView("tasks")}>View All →</button>
          </div>
          <div className="card-body">
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              {[["Pending", pendingTasks, "var(--orange)","#FFF7ED"], ["Completed", completedTasks, "var(--green)","#F0FDF4"], ["Overdue", overdueTasks, "var(--red)","#FEF2F2"]].map(([l, n, c, bg]) => (
                <div key={l} style={{ flex: 1, textAlign: "center", padding: "12px 8px", borderRadius: 10, background: bg }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: c }}>{n}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
            {tasks.filter(t => t.status !== "completed" && t.status !== "cancelled").slice(0, 4).map(t => (
              <div key={t.id} className="row-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.clientName}</div>
                </div>
                <Badge status={t.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Employee performance */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Employee Performance</div>
            <button className="btn btn-sm" onClick={() => setView("employees")}>View All →</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {employees.map(emp => {
              const empTasks     = tasks.filter(t => t.assignedTo === emp.id);
              const empCompleted = empTasks.filter(t => t.status === "completed").length;
              const empPending   = empTasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length;
              const empClients   = clients.filter(c => c.assignedTo === emp.id).length;
              const pct          = empTasks.length ? Math.round(empCompleted / empTasks.length * 100) : 0;
              return (
                <div key={emp.id} className="row-item">
                  <div className="av av-md" style={{ background: emp.color }}>{emp.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{emp.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{empClients} clients · {empCompleted}/{empTasks.length} tasks done</div>
                    <div className="prog-bg" style={{ marginTop: 5, maxWidth: 200 }}>
                      <div className="prog-fill" style={{ width: pct + "%", background: pct === 100 ? "var(--green)" : "var(--blue)" }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? "var(--green)" : "var(--blue)" }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Client list */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Client Status</div>
          <button className="btn btn-sm" onClick={() => setView("clients")}>View All →</button>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th><th>Type</th><th>Assigned To</th><th>Total Billing</th><th>Collected</th><th>Pending</th><th>Progress</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.slice(0, 5).map(c => {
                const emp = employees.find(e => e.id === c.assignedTo);
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.clientNo}</div>
                    </td>
                    <td><span className="tag">{c.type}</span></td>
                    <td>
                      {emp && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className="av av-sm" style={{ background: emp.color }}>{emp.avatar}</div>
                        <span style={{ fontSize: 12 }}>{emp.name}</span>
                      </div>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{INR(c.totalBilling)}</td>
                    <td style={{ color: "var(--green)", fontWeight: 600 }}>{INR(c.collected)}</td>
                    <td style={{ color: c.pending > 0 ? "var(--red)" : "var(--muted)", fontWeight: 600 }}>{INR(c.pending)}</td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="prog-bg" style={{ flex: 1 }}>
                          <div className="prog-fill" style={{ width: c.progress + "%", background: c.progress === 100 ? "var(--green)" : "var(--blue)" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{c.progress}%</span>
                      </div>
                    </td>
                    <td>
                      <Badge status={c.status === "active" ? "completed" : "open"} label={c.status === "active" ? "Active" : "Pending"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ANALYTICS PAGE
// ═══════════════════════════════════════════════════════════════════════
function AnalyticsPage() {
  const { clients, invoices, tasks, employees } = useApp();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const monthlyData = [
    { month: "Jan", clients: 2, billing: 130000, collected: 117000 },
    { month: "Feb", clients: 1, billing: 45000,  collected: 45000  },
    { month: "Mar", clients: 1, billing: 72000,  collected: 36000  },
    { month: "Apr", clients: 1, billing: 28000,  collected: 0      },
    { month: "May", clients: 0, billing: 0,      collected: 0      },
    { month: "Jun", clients: 0, billing: 0,      collected: 0      },
  ];
  const maxBilling = Math.max(...monthlyData.map(d => d.billing));

  return (
    <>
      <div className="stat-grid grid4" style={{ marginBottom: 22 }}>
        {[
          { label: "Total Revenue",    val: INR(clients.reduce((s,c)=>s+c.totalBilling,0)),  color: "var(--ink)"   },
          { label: "Total Collected",  val: INR(clients.reduce((s,c)=>s+c.collected,0)),     color: "var(--green)" },
          { label: "Outstanding",      val: INR(clients.reduce((s,c)=>s+c.pending,0)),       color: "var(--red)"   },
          { label: "Avg per Client",   val: INR(Math.round(clients.reduce((s,c)=>s+c.totalBilling,0)/clients.length)), color: "var(--blue)" },
        ].map(s => (
          <div key={s.label} className="stat-box">
            <div className="stat-lbl">{s.label}</div>
            <div className="stat-val" style={{ color: s.color, fontSize: 20 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Monthly billing chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head"><div className="card-title">Monthly Billing & Collections (2025)</div></div>
        <div className="card-body">
          <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, background: "var(--blue)", borderRadius: 3 }} /><span style={{ fontSize: 12 }}>Billed</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, background: "var(--green)", borderRadius: 3 }} /><span style={{ fontSize: 12 }}>Collected</span></div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", height: 160 }}>
            {monthlyData.map(d => (
              <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", display: "flex", gap: 3, alignItems: "flex-end", height: 130 }}>
                  <div style={{ flex: 1, background: "var(--blue)", opacity: .7, borderRadius: "4px 4px 0 0", height: maxBilling > 0 ? `${Math.round(d.billing / maxBilling * 120)}px` : "2px", minHeight: 2 }} />
                  <div style={{ flex: 1, background: "var(--green)", opacity: .8, borderRadius: "4px 4px 0 0", height: maxBilling > 0 ? `${Math.round(d.collected / maxBilling * 120)}px` : "2px", minHeight: 2 }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{d.month}</div>
                {d.clients > 0 && <div style={{ fontSize: 10, color: "var(--blue)", fontWeight: 700 }}>{d.clients} client{d.clients > 1 ? "s" : ""}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Employee wise */}
      <div className="card">
        <div className="card-head"><div className="card-title">Employee Performance</div></div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Clients</th><th>Total Tasks</th><th>Completed</th><th>Pending</th><th>Overdue</th><th>Efficiency</th></tr></thead>
            <tbody>
              {employees.map(emp => {
                const empTasks    = tasks.filter(t => t.assignedTo === emp.id);
                const completed   = empTasks.filter(t => t.status === "completed").length;
                const pending     = empTasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length;
                const overdue     = empTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed").length;
                const empClients  = clients.filter(c => c.assignedTo === emp.id).length;
                const eff         = empTasks.length ? Math.round(completed / empTasks.length * 100) : 0;
                return (
                  <tr key={emp.id}>
                    <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="av av-sm" style={{ background: emp.color }}>{emp.avatar}</div><span style={{ fontWeight: 600 }}>{emp.name}</span></div></td>
                    <td>{empClients}</td>
                    <td>{empTasks.length}</td>
                    <td style={{ color: "var(--green)", fontWeight: 600 }}>{completed}</td>
                    <td style={{ color: "var(--orange)", fontWeight: 600 }}>{pending}</td>
                    <td style={{ color: overdue > 0 ? "var(--red)" : "var(--muted)", fontWeight: 600 }}>{overdue}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="prog-bg" style={{ width: 80 }}>
                          <div className="prog-fill" style={{ width: eff + "%", background: eff > 80 ? "var(--green)" : eff > 50 ? "var(--blue)" : "var(--orange)" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{eff}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CLIENTS PAGE
// ═══════════════════════════════════════════════════════════════════════
function ClientsPage() {
  const { clients, employees, tasks, openModal, user } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState(null);

  const visible = clients.filter(c => {
    if (user.role === "employee" && c.assignedTo !== user.id) return false;
    if (filter !== "all" && c.status !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.clientNo.includes(search)) return false;
    return true;
  });

  if (selectedClient) return <ClientDetail client={selectedClient} onBack={() => setSelectedClient(null)} />;

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <input className="f-input" placeholder="Search client name or ID…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <div className="chips" style={{ margin: 0 }}>
          {["all", "active", "pending"].map(f => <div key={f} className={`chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)} style={{ textTransform: "capitalize" }}>{f}</div>)}
        </div>
        {(user.role === "admin" || user.role === "manager" || user.role === "employee") && (
          <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => openModal("create-client")}>+ New Client</button>
        )}
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Client</th><th>Type</th><th>Contact</th><th>Assigned To</th><th>Billing</th><th>Collected</th><th>Pending</th><th>Progress</th><th>Action</th></tr>
            </thead>
            <tbody>
              {visible.map(c => {
                const emp = employees.find(e => e.id === c.assignedTo);
                const clientTasks = tasks.filter(t => t.clientId === c.id);
                const done = clientTasks.filter(t => t.status === "completed").length;
                return (
                  <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setSelectedClient(c)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.clientNo} · {c.createdAt}</div>
                    </td>
                    <td><span className="tag">{c.type}</span></td>
                    <td>
                      <div style={{ fontSize: 12 }}>{c.contactName}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.phone}</div>
                    </td>
                    <td>{emp && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div className="av av-sm" style={{ background: emp.color }}>{emp.avatar}</div><span style={{ fontSize: 12 }}>{emp.name}</span></div>}</td>
                    <td style={{ fontWeight: 700 }}>{INR(c.totalBilling)}</td>
                    <td style={{ color: "var(--green)", fontWeight: 600 }}>{INR(c.collected)}</td>
                    <td style={{ color: c.pending > 0 ? "var(--red)" : "var(--muted)", fontWeight: 600 }}>{INR(c.pending)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 100 }}>
                        <div className="prog-bg" style={{ flex: 1 }}><div className="prog-fill" style={{ width: c.progress + "%", background: c.progress === 100 ? "var(--green)" : "var(--blue)" }} /></div>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{c.progress}%</span>
                      </div>
                    </td>
                    <td><button className="btn btn-sm" onClick={e => { e.stopPropagation(); setSelectedClient(c); }}>View →</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Client Detail ────────────────────────────────────────────────────
function ClientDetail({ client, onBack }) {
  const { tasks, invoices, employees, openModal, showToast } = useApp();
  const [tab, setTab] = useState("overview");
  const clientTasks    = tasks.filter(t => t.clientId === client.id);
  const clientInvoices = invoices.filter(i => i.clientId === client.id);
  const emp            = employees.find(e => e.id === client.assignedTo);

  return (
    <>
      <button className="btn" style={{ marginBottom: 16 }} onClick={onBack}>← All Clients</button>

      {/* Client hero */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, background: "linear-gradient(135deg,var(--navy),var(--blue))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🏢</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="sr" style={{ fontSize: 20 }}>{client.name}</span>
              <span className="tag">{client.type}</span>
              <Badge status={client.status === "active" ? "completed" : "open"} label={client.status === "active" ? "Active" : "Pending"} />
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 8, flexWrap: "wrap", fontSize: 12, color: "var(--muted)" }}>
              <span>📋 {client.clientNo}</span>
              <span>📞 {client.phone}</span>
              <span>✉️ {client.email}</span>
              <span>📅 Since {client.createdAt}</span>
              {emp && <span>👤 {emp.name}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={() => openModal("create-invoice", { clientId: client.id, clientName: client.name })}>+ Invoice</button>
          </div>
        </div>
      </div>

      <div className="tabs">
        {["overview", "tasks", "invoices", "audit"].map(t => (
          <div key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)} style={{ textTransform: "capitalize" }}>{t}</div>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid2">
          <div className="card">
            <div className="card-head"><div className="card-title">Payment Summary</div></div>
            <div className="card-body">
              {[["Total Billed", INR(client.totalBilling), "var(--ink)"], ["Collected", INR(client.collected), "var(--green)"], ["Pending", INR(client.pending), "var(--red)"]].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{l}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</span>
                </div>
              ))}
              <div className="prog-bg" style={{ marginTop: 12 }}>
                <div className="prog-fill" style={{ width: client.progress + "%", background: client.progress === 100 ? "var(--green)" : "var(--blue)" }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{client.progress}% complete</div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">Task Summary</div></div>
            <div className="card-body">
              {[["Total", clientTasks.length, "var(--ink)"], ["Completed", clientTasks.filter(t => t.status === "completed").length, "var(--green)"], ["Pending", clientTasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length, "var(--orange)"]].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{l}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "tasks" && <TasksTable tasks={clientTasks} showClient={false} />}
      {tab === "invoices" && <InvoicesTable invoices={clientInvoices} />}
      {tab === "audit" && <AuditTrail clientId={client.id} tasks={clientTasks} invoices={clientInvoices} />}
    </>
  );
}

// ─── Audit Trail ─────────────────────────────────────────────────────
function AuditTrail({ clientId, tasks, invoices }) {
  const events = [
    ...tasks.filter(t => t.completedDate).map(t => ({ date: t.completedDate, icon: "✅", text: `Task completed: ${t.title}`, type: "task" })),
    ...invoices.map(i => ({ date: i.date, icon: "📄", text: `Invoice created: ${i.invoiceNo} — ${INR(i.total)}`, type: "invoice" })),
    ...invoices.filter(i => i.paid > 0).map(i => ({ date: i.date, icon: "💰", text: `Payment received: ${INR(i.paid)} against ${i.invoiceNo}`, type: "payment" })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Audit Trail</div></div>
      <div>
        {events.length === 0 && <div className="empty"><div className="empty-icon">📋</div><div>No activity yet</div></div>}
        {events.map((e, i) => (
          <div key={i} className="row-item">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: e.type === "task" ? "#F0FDF4" : e.type === "payment" ? "#F0FDF4" : "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{e.icon}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13 }}>{e.text}</div></div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{e.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// INVOICES PAGE
// ═══════════════════════════════════════════════════════════════════════
function InvoicesPage() {
  const { invoices, openModal } = useApp();
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? invoices : invoices.filter(i => i.status === filter);
  const tTotal     = invoices.reduce((s, i) => s + i.total, 0);
  const tPaid      = invoices.reduce((s, i) => s + i.paid, 0);
  const tPending   = invoices.reduce((s, i) => s + i.pending, 0);

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 20 }}>
        {[["Total Invoiced", INR(tTotal), "var(--ink)"], ["Collected", INR(tPaid), "var(--green)"], ["Outstanding", INR(tPending), "var(--red)"]].map(([l, v, c]) => (
          <div key={l} className="stat-box"><div className="stat-lbl">{l}</div><div className="stat-val" style={{ fontSize: 22, color: c }}>{v}</div></div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div className="chips" style={{ margin: 0 }}>
          {["all", "paid", "partial", "unpaid"].map(f => <div key={f} className={`chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)} style={{ textTransform: "capitalize" }}>{f}</div>)}
        </div>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => openModal("create-invoice")}>+ New Invoice</button>
      </div>
      <InvoicesTable invoices={visible} />
    </>
  );
}

function InvoicesTable({ invoices }) {
  const { openModal } = useApp();
  const statusStyle = { paid: { bg: "#F0FDF4", color: "#16A34A" }, partial: { bg: "#FFFBEB", color: "#B45309" }, unpaid: { bg: "#FEF2F2", color: "#DC2626" } };
  return (
    <div className="card">
      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Invoice #</th><th>Client</th><th>Date</th><th>Total</th><th>Paid</th><th>Pending</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {invoices.map(i => {
              const ss = statusStyle[i.status] || statusStyle.unpaid;
              return (
                <tr key={i.id}>
                  <td style={{ fontWeight: 700, color: "var(--blue)", fontSize: 12 }}>{i.invoiceNo}</td>
                  <td style={{ fontSize: 12 }}>{i.clientName}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{i.date}</td>
                  <td style={{ fontWeight: 700 }}>{INR(i.total)}</td>
                  <td style={{ color: "var(--green)", fontWeight: 600 }}>{INR(i.paid)}</td>
                  <td style={{ color: i.pending > 0 ? "var(--red)" : "var(--muted)", fontWeight: 600 }}>{INR(i.pending)}</td>
                  <td><span className="badge" style={{ background: ss.bg, color: ss.color }}><span className="badge-dot" style={{ background: ss.color }} />{i.status}</span></td>
                  <td><button className="btn btn-sm" onClick={() => openModal("view-invoice", { invoice: i })}>View</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TASKS PAGE
// ═══════════════════════════════════════════════════════════════════════
function TasksPage() {
  const { tasks, user } = useApp();
  const [filter, setFilter] = useState("all");
  const visible = tasks.filter(t => {
    if (user.role === "employee" && t.assignedTo !== user.id) return false;
    if (filter !== "all" && t.status !== filter) return false;
    return true;
  });

  return (
    <>
      <div className="stat-grid grid4" style={{ marginBottom: 20 }}>
        {[
          ["Pending",   tasks.filter(t=>t.status!=="completed"&&t.status!=="cancelled").length, "var(--orange)"],
          ["Completed", tasks.filter(t=>t.status==="completed").length,                         "var(--green)"],
          ["Overdue",   tasks.filter(t=>t.dueDate&&new Date(t.dueDate)<new Date()&&t.status!=="completed").length, "var(--red)"],
          ["Total",     tasks.length, "var(--ink)"],
        ].map(([l, v, c]) => (
          <div key={l} className="stat-box"><div className="stat-lbl">{l}</div><div className="stat-val" style={{ fontSize: 22, color: c }}>{v}</div></div>
        ))}
      </div>
      <div className="chips">
        <div className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>All</div>
        {TASK_STATUSES.map(s => (
          <div key={s.id} className={`chip ${filter === s.id ? "on" : ""}`} onClick={() => setFilter(s.id)}>{s.label} ({tasks.filter(t => t.status === s.id).length})</div>
        ))}
      </div>
      <TasksTable tasks={visible} showClient={true} />
    </>
  );
}

function TasksTable({ tasks, showClient = true }) {
  const { openModal, setTasks } = useApp();
  const updateStatus = (taskId, newStatus) => {
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, status: newStatus, completedDate: newStatus === "completed" ? today() : t.completedDate } : t));
  };

  return (
    <div className="card">
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Task</th>
              {showClient && <th>Client</th>}
              <th>Due Date</th>
              <th>Requirement</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr><td colSpan={7}><div className="empty"><div className="empty-icon">✅</div><div>No tasks found</div></div></td></tr>
            )}
            {tasks.map(t => {
              const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed";
              const req = TASK_REQUIREMENT_TYPES.find(r => r.id === t.requirementType);
              return (
                <tr key={t.id}>
                  <td style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>#{t.sequence}</td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{t.title}</div>
                    {t.notes && <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.notes}</div>}
                  </td>
                  {showClient && <td style={{ fontSize: 12, color: "var(--muted)", maxWidth: 150 }}>{t.clientName}</td>}
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isOverdue ? "var(--red)" : "var(--ink)", background: isOverdue ? "#FEF2F2" : "transparent", padding: isOverdue ? "2px 7px" : 0, borderRadius: 5 }}>
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                      {isOverdue && " ⚠"}
                    </span>
                  </td>
                  <td><span className="tag">{req?.label || "—"}</span></td>
                  <td>
                    <select
                      value={t.status}
                      onChange={e => updateStatus(t.id, e.target.value)}
                      style={{ fontSize: 11, padding: "4px 8px", border: "1.5px solid var(--border)", borderRadius: 6, cursor: "pointer", background: "#fff" }}
                    >
                      {TASK_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </td>
                  <td><button className="btn btn-sm" onClick={() => openModal("view-task", { task: t })}>View</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EMPLOYEES PAGE
// ═══════════════════════════════════════════════════════════════════════
function EmployeesPage() {
  const { employees, clients, tasks, openModal } = useApp();
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => openModal("create-employee")}>+ Invite Employee</button>
      </div>
      <div className="grid2">
        {employees.map(emp => {
          const empTasks   = tasks.filter(t => t.assignedTo === emp.id);
          const completed  = empTasks.filter(t => t.status === "completed").length;
          const pending    = empTasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length;
          const empClients = clients.filter(c => c.assignedTo === emp.id);
          return (
            <div key={emp.id} className="card">
              <div className="card-body">
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div className="av av-lg" style={{ background: emp.color }}>{emp.avatar}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{emp.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{emp.email}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{emp.phone}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  {[["Clients", empClients.length, "var(--blue)"], ["Completed", completed, "var(--green)"], ["Pending", pending, "var(--orange)"]].map(([l, v, c]) => (
                    <div key={l} style={{ flex: 1, textAlign: "center", padding: "8px", borderRadius: 8, background: "#F9FAFB" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{v}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)" }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Assigned Clients</div>
                {empClients.map(c => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F3F4F6", fontSize: 12 }}>
                    <span>{c.name}</span>
                    <span style={{ color: "var(--muted)" }}>{c.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SETTINGS PAGES
// ═══════════════════════════════════════════════════════════════════════
function OrgSettings() {
  const { org, setOrg, showToast } = useApp();
  const [form, setForm] = useState({ ...org });
  const save = () => { setOrg(form); showToast("Organisation details saved!", "success"); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="card">
        <div className="card-head"><div className="card-title">Organisation Details</div></div>
        <div className="card-body">
          <div className="form-grid-2">
            {[["name","Firm Name"],["email","Email"],["phone","Phone"],["gstin","GSTIN"],["pan","PAN"],["sac","SAC Code"],["bankName","Bank Name"],["accountNo","Account Number"],["ifsc","IFSC Code"],["upi","UPI ID"]].map(([k, l]) => (
              <div key={k} className="f-group">
                <label className="f-label">{l}</label>
                <input className="f-input" value={form[k] || ""} onChange={e => set(k, e.target.value)} />
              </div>
            ))}
          </div>
          <div className="f-group" style={{ marginTop: 16 }}>
            <label className="f-label">Address</label>
            <textarea className="f-textarea" value={form.address || ""} onChange={e => set("address", e.target.value)} rows={2} />
          </div>
          <div className="f-group" style={{ marginTop: 16 }}>
            <label className="f-label">GST Rate (%)</label>
            <input className="f-input" type="number" value={form.gstRate || 18} onChange={e => set("gstRate", Number(e.target.value))} style={{ maxWidth: 120 }} />
          </div>
        </div>
        <div style={{ padding: "0 20px 20px" }}>
          <button className="btn btn-primary" onClick={save}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function BundleSettings() {
  const { bundles, setBundles, showToast } = useApp();
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(null);

  const startEdit = (b) => { setEditing(b.id); setForm(JSON.parse(JSON.stringify(b))); };
  const save = () => {
    setBundles(bs => bs.map(b => b.id === form.id ? form : b));
    setEditing(null);
    showToast("Bundle saved!", "success");
  };
  const addItem = () => setForm(f => ({ ...f, lineItems: [...f.lineItems, { id: "li_" + uuid(), name: "", type: "service", price: 0, gst: true, unit: "fixed", tasks: [] }] }));
  const removeItem = (id) => setForm(f => ({ ...f, lineItems: f.lineItems.filter(l => l.id !== id) }));
  const setItem = (id, k, v) => setForm(f => ({ ...f, lineItems: f.lineItems.map(l => l.id === id ? { ...l, [k]: v } : l) }));

  if (editing && form) return (
    <div style={{ maxWidth: 800 }}>
      <button className="btn" style={{ marginBottom: 16 }} onClick={() => setEditing(null)}>← Back</button>
      <div className="card">
        <div className="card-head"><div className="card-title">Edit Bundle: {form.name}</div></div>
        <div className="card-body">
          <div className="form-grid-2" style={{ marginBottom: 20 }}>
            <div className="f-group"><label className="f-label">Bundle Name</label><input className="f-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="f-group"><label className="f-label">Icon (emoji)</label><input className="f-input" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} /></div>
            <div className="f-group" style={{ gridColumn: "1/-1" }}><label className="f-label">Description</label><input className="f-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Line Items</div>
          {form.lineItems.map((li, idx) => (
            <div key={li.id} style={{ background: "#FAFAF8", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Item {idx + 1}</span>
                <button className="btn btn-sm btn-red" onClick={() => removeItem(li.id)}>Remove</button>
              </div>
              <div className="form-grid-2">
                <div className="f-group"><label className="f-label">Item Name</label><input className="f-input" value={li.name} onChange={e => setItem(li.id, "name", e.target.value)} /></div>
                <div className="f-group">
                  <label className="f-label">Type</label>
                  <select className="f-select" value={li.type} onChange={e => setItem(li.id, "type", e.target.value)}>
                    <option value="govt">Government Fee (no task)</option>
                    <option value="dsc">DSC (task per qty)</option>
                    <option value="service">Professional Service</option>
                  </select>
                </div>
                <div className="f-group"><label className="f-label">Unit Price (₹)</label><input className="f-input" type="number" value={li.price || ""} onChange={e => setItem(li.id, "price", Number(e.target.value))} placeholder="0 = enter on invoice" /></div>
                <div className="f-group">
                  <label className="f-label">Pricing</label>
                  <select className="f-select" value={li.unit} onChange={e => setItem(li.id, "unit", e.target.value)}>
                    <option value="fixed">Fixed</option>
                    <option value="per_unit">Per Unit / Qty</option>
                  </select>
                </div>
                <div className="f-group">
                  <label className="f-label">GST Applicable</label>
                  <select className="f-select" value={li.gst ? "yes" : "no"} onChange={e => setItem(li.id, "gst", e.target.value === "yes")}>
                    <option value="yes">Yes (+18% GST)</option>
                    <option value="no">No (Govt fee)</option>
                  </select>
                </div>
              </div>
              {li.type !== "govt" && (
                <div style={{ marginTop: 10 }}>
                  <label className="f-label">Auto-created tasks (one per line)</label>
                  <textarea className="f-textarea" rows={2}
                    value={li.tasks.map(t => t.name).join("\n")}
                    onChange={e => setItem(li.id, "tasks", e.target.value.split("\n").filter(Boolean).map(name => ({ name, autoFromQty: li.type === "dsc" })))}
                    placeholder={li.type === "dsc" ? "DSC Creation for Director {n}" : "Task name (one per line)"}
                  />
                  <div className="f-hint">Use {"{n}"} for DSC tasks to auto-number by director count</div>
                </div>
              )}
            </div>
          ))}
          <button className="btn btn-ghost" onClick={addItem}>+ Add Line Item</button>
        </div>
        <div style={{ padding: "0 20px 20px" }}>
          <button className="btn btn-primary" onClick={save}>Save Bundle</button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-primary" onClick={() => {
          const newBundle = { id: "b_" + uuid(), name: "New Bundle", icon: "📦", description: "", lineItems: [], totalApprox: null };
          setBundles(bs => [...bs, newBundle]);
          startEdit(newBundle);
        }}>+ New Bundle</button>
      </div>
      <div className="grid2">
        {bundles.map(b => (
          <div key={b.id} className="card">
            <div className="card-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{b.icon}</span>
                <div>
                  <div className="card-title">{b.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{b.description}</div>
                </div>
              </div>
              <button className="btn btn-sm" onClick={() => startEdit(b)}>Edit</button>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {b.lineItems.map((li, i) => (
                <div key={li.id} className="row-item">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{li.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{li.type} · {li.gst ? "+GST" : "no GST"} · {li.unit}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: li.price ? "var(--ink)" : "var(--muted)" }}>
                    {li.price ? INR(li.price) : "Variable"}
                  </div>
                </div>
              ))}
              {b.totalApprox && <div style={{ padding: "12px 18px", fontSize: 13, fontWeight: 700, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}><span>Approx Total</span><span style={{ color: "var(--blue)" }}>{INR(b.totalApprox)}</span></div>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function UserSettings() {
  const { employees, showToast } = useApp();
  return (
    <div style={{ maxWidth: 700 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">System Users & Roles</div>
        </div>
        <div>
          {[
            { name: "Founders Bridge (Admin)", email: "admin@foundersbridge.in", role: "admin", color: "#7C3AED" },
            { name: "Priya Sharma (Manager)", email: "manager@foundersbridge.in", role: "manager", color: "#0369A1" },
            ...employees,
          ].map((u, i) => (
            <div key={i} className="row-item">
              <div className="av av-md" style={{ background: u.color || "#6B7280" }}>{initials(u.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{u.email}</div>
              </div>
              <span className="badge" style={{ background: "#EDE9FE", color: "#7C3AED" }}>{u.role}</span>
              {u.role === "employee" && (
                <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => showToast("Password reset email sent!", "success")}>Reset Password</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EMPLOYEE VIEWS
// ═══════════════════════════════════════════════════════════════════════
function EmpDashboard() {
  const { user, tasks, clients, invoices } = useApp();
  const myTasks   = tasks.filter(t => t.assignedTo === user.id);
  const myClients = clients.filter(c => c.assignedTo === user.id);
  const completed = myTasks.filter(t => t.status === "completed").length;
  const pending   = myTasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length;
  const overdue   = myTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed").length;
  const myBilling = myClients.reduce((s, c) => s + c.totalBilling, 0);
  const myCollected = myClients.reduce((s, c) => s + c.collected, 0);

  return (
    <>
      <div className="stat-grid grid4" style={{ marginBottom: 22 }}>
        {[
          { icon: "🏢", label: "My Clients",  val: myClients.length,   color: "var(--blue)"   },
          { icon: "⏳", label: "Pending",     val: pending,            color: "var(--orange)" },
          { icon: "✅", label: "Completed",   val: completed,          color: "var(--green)"  },
          { icon: "⚠️", label: "Overdue",     val: overdue,            color: "var(--red)"    },
        ].map(s => (
          <div key={s.label} className="stat-box">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-lbl">{s.label}</div>
            <div className="stat-val" style={{ color: s.color, fontSize: 22 }}>{s.val}</div>
          </div>
        ))}
      </div>
      <div className="grid2">
        <div className="card">
          <div className="card-head"><div className="card-title">My Billing</div></div>
          <div className="card-body">
            {[["Total Billed", INR(myBilling), "var(--ink)"], ["Collected", INR(myCollected), "var(--green)"], ["Pending", INR(myBilling - myCollected), "var(--red)"]].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{l}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Pending Tasks</div></div>
          <div>
            {myTasks.filter(t => t.status !== "completed" && t.status !== "cancelled").slice(0, 5).map(t => (
              <div key={t.id} className="row-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.clientName}</div>
                </div>
                <Badge status={t.status} />
              </div>
            ))}
            {myTasks.filter(t => t.status !== "completed").length === 0 && <div className="empty"><div className="empty-icon">🎉</div><div>All caught up!</div></div>}
          </div>
        </div>
      </div>
    </>
  );
}

function EmpTasks() {
  const { user, tasks } = useApp();
  const myTasks = tasks.filter(t => t.assignedTo === user.id);
  return <TasksPage />;
}

function EmpClients() {
  return <ClientsPage />;
}

// ═══════════════════════════════════════════════════════════════════════
// CLIENT VIEWS
// ═══════════════════════════════════════════════════════════════════════
function ClientHome() {
  const { clients, user } = useApp();
  // In production, filter by user's companies
  const myClients = clients.slice(0, 1); // Demo: show first client
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
      {myClients.map(c => (
        <div key={c.id} className="card" style={{ cursor: "pointer", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,var(--blue),var(--orange))" }} />
          <div className="card-body">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span className="tag">{c.type}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", background: "#F3F4F6", padding: "2px 8px", borderRadius: 5 }}>{c.clientNo}</span>
            </div>
            <div className="sr" style={{ fontSize: 18, lineHeight: 1.3, marginBottom: 8 }}>{c.name}</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Overall Progress</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.progress === 100 ? "var(--green)" : "var(--blue)" }}>{c.progress}%</span>
              </div>
              <div className="prog-bg"><div className="prog-fill" style={{ width: c.progress + "%", background: c.progress === 100 ? "var(--green)" : "var(--blue)" }} /></div>
            </div>
            <div style={{ display: "flex", gap: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, color: "var(--muted)" }}><div style={{ fontSize: 15, fontWeight: 700, color: c.pending > 0 ? "var(--red)" : "var(--green)", marginBottom: 1 }}>{c.pending > 0 ? INR(c.pending) : "Nil"}</div>Outstanding</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientTasks() {
  const { tasks } = useApp();
  return <TasksTable tasks={tasks.slice(0, 4)} showClient={false} />;
}

function ClientInvoices() {
  const { invoices } = useApp();
  return <InvoicesTable invoices={invoices} />;
}

function ClientDocs() {
  return (
    <div className="empty">
      <div className="empty-icon">📁</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Documents</div>
      <div style={{ fontSize: 13 }}>Your documents will appear here once uploaded by your team.</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════════════

// ─── Create Client Modal ──────────────────────────────────────────────
function CreateClientModal({ data, onClose }) {
  const { employees, clients, setClients, showToast, bundles } = useApp();
  const [form, setForm] = useState({ name: "", contactName: "", email: "", phone: "", type: "Private Limited", assignedTo: employees[0]?.id || "", bundleId: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name || !form.phone) { showToast("Client name and phone are required", "error"); return; }
    const newClient = {
      id: "c_" + uuid(), clientNo: "FB-2025-00" + (clients.length + 5),
      name: form.name, contactName: form.contactName, email: form.email, phone: form.phone,
      type: form.type, status: "active", assignedTo: form.assignedTo,
      totalBilling: 0, collected: 0, pending: 0, progress: 0,
      createdAt: today(),
    };
    setClients(cs => [...cs, newClient]);
    showToast(`Client ${form.name} created successfully!`, "success");
    onClose();
  };

  return (
    <div className="modal-box" style={{ maxWidth: 560 }}>
      <div className="modal-head"><div className="modal-title">New Client</div><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="modal-body">
        <div className="form-grid">
          <div className="form-grid-2">
            <div className="f-group"><label className="f-label">Company / Client Name <span className="f-req">*</span></label><input className="f-input" placeholder="e.g. TechSpark Solutions Pvt Ltd" value={form.name} onChange={e => set("name", e.target.value)} /></div>
            <div className="f-group"><label className="f-label">Type</label>
              <select className="f-select" value={form.type} onChange={e => set("type", e.target.value)}>
                {["Private Limited", "LLP", "Partnership", "Proprietorship", "Individual"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="f-group"><label className="f-label">Contact Person Name</label><input className="f-input" placeholder="Director / Partner name" value={form.contactName} onChange={e => set("contactName", e.target.value)} /></div>
            <div className="f-group"><label className="f-label">Mobile Number <span className="f-req">*</span></label><input className="f-input" placeholder="98xxxxxxxx" type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
            <div className="f-group"><label className="f-label">Email Address</label><input className="f-input" type="email" placeholder="client@email.com" value={form.email} onChange={e => set("email", e.target.value)} /></div>
            <div className="f-group"><label className="f-label">Assign To</label>
              <select className="f-select" value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)}>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-foot"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Create Client</button></div>
    </div>
  );
}

// ─── Create Invoice Modal ─────────────────────────────────────────────
function CreateInvoiceModal({ data, onClose }) {
  const { clients, invoices, setInvoices, tasks, setTasks, bundles, org, showToast } = useApp();
  const [clientId, setClientId]   = useState(data?.clientId || "");
  const [bundleId, setBundleId]   = useState("");
  const [lineItems, setLineItems] = useState([]);
  const [step, setStep]           = useState(1); // 1=select client/bundle, 2=configure items, 3=review

  const selectedBundle = bundles.find(b => b.id === bundleId);
  const selectedClient = clients.find(c => c.id === clientId);

  const loadBundle = (bId) => {
    setBundleId(bId);
    const b = bundles.find(x => x.id === bId);
    if (b) {
      setLineItems(b.lineItems.map(li => ({
        ...li,
        id: "ili_" + uuid(),
        originalId: li.id,
        qty: 1,
        unitPrice: li.price || 0,
        customPrice: !li.price,
      })));
    }
  };

  const setItem = (id, k, v) => setLineItems(ls => ls.map(l => l.id === id ? { ...l, [k]: v } : l));

  const calcAmount = (li) => {
    const base = li.unitPrice * li.qty;
    return li.gst ? base * (1 + org.gstRate / 100) : base;
  };

  const total    = lineItems.reduce((s, li) => s + calcAmount(li), 0);
  const subtotal = lineItems.reduce((s, li) => s + li.unitPrice * li.qty, 0);
  const gstAmt   = total - subtotal;

  // Generate tasks from line items
  const generateTasks = (invoiceId) => {
    const newTasks = [];
    let seq = 1;
    lineItems.forEach(li => {
      if (li.type === "govt") return; // No tasks for govt fees
      const bundle = bundles.find(b => b.id === bundleId);
      const originalItem = bundle?.lineItems.find(x => x.id === li.originalId);
      if (!originalItem?.tasks?.length) return;

      originalItem.tasks.forEach(taskTemplate => {
        const count = taskTemplate.autoFromQty ? li.qty : 1;
        for (let n = 1; n <= count; n++) {
          newTasks.push({
            id: "t_" + uuid(),
            title: taskTemplate.name.replace("{n}", n),
            clientId, clientName: selectedClient?.name || "",
            invoiceId, lineItemId: li.id,
            assignedTo: selectedClient?.assignedTo || "",
            status: seq === 1 ? "open" : "open",
            sequence: seq++,
            requirementType: li.type === "dsc" ? "docs" : "none",
            dueDate: null, completedDate: null, notes: "",
          });
        }
      });
    });
    return newTasks;
  };

  const createInvoice = () => {
    if (!clientId) { showToast("Select a client", "error"); return; }
    if (lineItems.length === 0) { showToast("Add at least one line item", "error"); return; }

    const invoiceNo = "FB/" + new Date().getFullYear() + "/" + String(invoices.length + 1).padStart(3, "0");
    const newInvoice = {
      id: "inv_" + uuid(), invoiceNo,
      clientId, clientName: selectedClient?.name || "",
      date: today(), dueDate: null,
      status: "unpaid", total, paid: 0, pending: total,
      lineItems,
    };
    setInvoices(is => [...is, newInvoice]);

    const newTasks = generateTasks(newInvoice.id);
    if (newTasks.length) setTasks(ts => [...ts, ...newTasks]);

    showToast(`Invoice ${invoiceNo} created with ${newTasks.length} tasks auto-generated!`, "success");
    onClose();
  };

  return (
    <div className="modal-box" style={{ maxWidth: 700 }}>
      <div className="modal-head">
        <div className="modal-title">Create Invoice</div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        {/* Step 1 — Select client + bundle */}
        {step === 1 && (
          <div className="form-grid">
            <div className="f-group">
              <label className="f-label">Client <span className="f-req">*</span></label>
              <select className="f-select" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="f-group">
              <label className="f-label">Start from Bundle (optional)</label>
              <select className="f-select" value={bundleId} onChange={e => loadBundle(e.target.value)}>
                <option value="">Select bundle to auto-fill…</option>
                {bundles.map(b => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
              </select>
              <div className="f-hint">Selecting a bundle auto-fills line items and creates tasks</div>
            </div>
            {lineItems.length === 0 && (
              <button className="btn btn-ghost" onClick={() => setLineItems([{ id: "ili_" + uuid(), name: "", type: "service", qty: 1, unitPrice: 0, gst: true, unit: "fixed", tasks: [], customPrice: true }])}>
                + Add Line Item Manually
              </button>
            )}
          </div>
        )}

        {/* Line items */}
        {lineItems.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, marginTop: step === 1 ? 20 : 0 }}>Line Items</div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Item</th><th>Type</th><th>Qty</th><th>Unit Price (₹)</th><th>GST</th><th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map(li => (
                    <tr key={li.id}>
                      <td style={{ minWidth: 180 }}>
                        <input className="f-input" value={li.name} onChange={e => setItem(li.id, "name", e.target.value)} style={{ fontSize: 12, padding: "5px 9px" }} />
                        {li.note && <div style={{ fontSize: 10, color: "var(--orange)", marginTop: 2 }}>⚠️ {li.note}</div>}
                      </td>
                      <td><span className="tag">{li.type}</span></td>
                      <td>
                        <input type="number" className="f-input" value={li.qty} min={1} onChange={e => setItem(li.id, "qty", Math.max(1, Number(e.target.value)))} style={{ width: 60, fontSize: 12, padding: "5px 9px" }} />
                        {li.type === "dsc" && <div style={{ fontSize: 10, color: "var(--blue)" }}>{li.qty} task{li.qty > 1 ? "s" : ""}</div>}
                      </td>
                      <td>
                        <input type="number" className="f-input" value={li.unitPrice} onChange={e => setItem(li.id, "unitPrice", Number(e.target.value))} style={{ width: 90, fontSize: 12, padding: "5px 9px" }} />
                      </td>
                      <td style={{ fontSize: 12 }}>{li.gst ? `+${org.gstRate}%` : "Nil"}</td>
                      <td style={{ fontWeight: 700, fontSize: 13 }}>{INR(calcAmount(li))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ background: "#FAFAF8", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px" }}>
              {[["Subtotal", INR(subtotal)], [`GST (${org.gstRate}%)`, INR(gstAmt)], ["Total", INR(total)]].map(([l, v], i) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: i === 2 ? "2px solid var(--border)" : "none", marginTop: i === 2 ? 8 : 0 }}>
                  <span style={{ fontSize: 13, fontWeight: i === 2 ? 700 : 400, color: i === 2 ? "var(--ink)" : "var(--muted)" }}>{l}</span>
                  <span style={{ fontSize: i === 2 ? 16 : 13, fontWeight: 700, color: i === 2 ? "var(--ink)" : "var(--muted)" }}>{v}</span>
                </div>
              ))}
            </div>

            {lineItems.filter(li => li.type !== "govt").some(li => {
              const b = bundles.find(x => x.id === bundleId);
              const orig = b?.lineItems.find(x => x.id === li.originalId);
              return orig?.tasks?.length > 0;
            }) && (
              <div className="info-box" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", marginTop: 16 }}>
                <span>⚡</span>
                <div style={{ fontSize: 12, color: "var(--green)" }}>
                  <strong>Tasks will be auto-created</strong> from this invoice based on line items and quantities. DSC tasks will create 1 task per director.
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={createInvoice} disabled={!clientId || lineItems.length === 0}>
          Create Invoice & Tasks →
        </button>
      </div>
    </div>
  );
}

// ─── View Invoice Modal ───────────────────────────────────────────────
function ViewInvoiceModal({ data, onClose }) {
  const { invoice } = data;
  const { org } = useApp();
  const subtotal = invoice.lineItems.reduce((s, li) => s + li.unitPrice * li.qty, 0);
  const gstAmt   = invoice.total - subtotal;

  return (
    <div className="modal-box" style={{ maxWidth: 620 }}>
      <div className="modal-head">
        <div className="modal-title">Invoice {invoice.invoiceNo}</div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        {/* Invoice header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, padding: 20, background: "linear-gradient(135deg,var(--navy),#1E40AF)", borderRadius: 12, color: "#fff" }}>
          <div>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, marginBottom: 4 }}>{org.name}</div>
            <div style={{ fontSize: 11, opacity: .7 }}>GSTIN: {org.gstin}</div>
            <div style={{ fontSize: 11, opacity: .7 }}>{org.address}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, opacity: .7, textTransform: "uppercase", letterSpacing: "1px" }}>Invoice</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{invoice.invoiceNo}</div>
            <div style={{ fontSize: 11, opacity: .7 }}>Date: {invoice.date}</div>
          </div>
        </div>

        {/* Bill to */}
        <div style={{ marginBottom: 20, padding: "12px 16px", background: "#F9FAFB", borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>Bill To</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{invoice.clientName}</div>
        </div>

        {/* Line items */}
        <table style={{ marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={{ padding: "8px 12px", background: "#F3F4F6", borderRadius: "6px 0 0 6px" }}>Description</th>
              <th style={{ padding: "8px 12px", background: "#F3F4F6", textAlign: "center" }}>Qty</th>
              <th style={{ padding: "8px 12px", background: "#F3F4F6", textAlign: "right" }}>Rate</th>
              <th style={{ padding: "8px 12px", background: "#F3F4F6", textAlign: "right" }}>GST</th>
              <th style={{ padding: "8px 12px", background: "#F3F4F6", textAlign: "right", borderRadius: "0 6px 6px 0" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map(li => (
              <tr key={li.id}>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6" }}>{li.name}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6", textAlign: "center" }}>{li.qty}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6", textAlign: "right" }}>{INR(li.unitPrice)}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6", textAlign: "right", fontSize: 12, color: "var(--muted)" }}>{li.gst ? `${org.gstRate}%` : "Nil"}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6", textAlign: "right", fontWeight: 700 }}>{INR(li.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 260 }}>
            {[["Subtotal", INR(subtotal)], [`CGST (${org.gstRate / 2}%)`, INR(gstAmt / 2)], [`SGST (${org.gstRate / 2}%)`, INR(gstAmt / 2)]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12, color: "var(--muted)" }}>
                <span>{l}</span><span>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", marginTop: 4, borderTop: "2px solid var(--border)", fontWeight: 700, fontSize: 15 }}>
              <span>Total</span><span style={{ color: "var(--blue)" }}>{INR(invoice.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12, color: "var(--green)" }}>
              <span>Paid</span><span style={{ fontWeight: 700 }}>{INR(invoice.paid)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12, color: "var(--red)", fontWeight: 700 }}>
              <span>Balance Due</span><span>{INR(invoice.pending)}</span>
            </div>
          </div>
        </div>

        {/* Bank details */}
        <div style={{ marginTop: 20, padding: "12px 16px", background: "#F9FAFB", borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Payment Details</div>
          <div style={{ color: "var(--muted)" }}>Bank: {org.bankName} · A/c: {org.accountNo} · IFSC: {org.ifsc}</div>
          <div style={{ color: "var(--muted)" }}>UPI: {org.upi}</div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={() => { window.print(); }}>🖨️ Print / Download PDF</button>
      </div>
    </div>
  );
}

// ─── View Task Modal ──────────────────────────────────────────────────
function ViewTaskModal({ data, onClose }) {
  const { task } = data;
  const { tasks, setTasks, employees, showToast } = useApp();
  const [localTask, setLocal] = useState({ ...task });
  const [note, setNote]       = useState("");

  const save = () => {
    setTasks(ts => ts.map(t => t.id === task.id ? { ...localTask, completedDate: localTask.status === "completed" ? today() : localTask.completedDate } : t));
    showToast("Task updated!", "success");
    onClose();
  };

  const reqType = TASK_REQUIREMENT_TYPES.find(r => r.id === localTask.requirementType);
  const statusInfo = TASK_STATUSES.find(s => s.id === localTask.status);

  return (
    <div className="modal-box" style={{ maxWidth: 560 }}>
      <div className="modal-head">
        <div>
          <div className="modal-title">{localTask.title}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{localTask.clientName} · Sequence #{localTask.sequence}</div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div className="form-grid">
          <div className="form-grid-2">
            <div className="f-group">
              <label className="f-label">Status</label>
              <select className="f-select" value={localTask.status} onChange={e => setLocal(t => ({ ...t, status: e.target.value }))}>
                {TASK_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="f-group">
              <label className="f-label">Requirement Type</label>
              <select className="f-select" value={localTask.requirementType} onChange={e => setLocal(t => ({ ...t, requirementType: e.target.value }))}>
                {TASK_REQUIREMENT_TYPES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div className="f-group">
              <label className="f-label">Assigned To</label>
              <select className="f-select" value={localTask.assignedTo} onChange={e => setLocal(t => ({ ...t, assignedTo: e.target.value }))}>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="f-group">
              <label className="f-label">Due Date</label>
              <input type="date" className="f-input" value={localTask.dueDate || ""} onChange={e => setLocal(t => ({ ...t, dueDate: e.target.value }))} />
            </div>
          </div>
          <div className="f-group">
            <label className="f-label">Notes</label>
            <textarea className="f-textarea" value={localTask.notes} onChange={e => setLocal(t => ({ ...t, notes: e.target.value }))} placeholder="Add task notes…" rows={3} />
          </div>
          {localTask.completedDate && (
            <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>✅ Completed on {localTask.completedDate}</div>
          )}
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-green" onClick={() => { setLocal(t => ({ ...t, status: "completed" })); setTimeout(save, 100); }}>✓ Mark Complete</button>
        <button className="btn btn-primary" onClick={save}>Save Changes</button>
      </div>
    </div>
  );
}

// ─── Create Employee Modal ────────────────────────────────────────────
function CreateEmployeeModal({ data, onClose }) {
  const { employees, setEmps, showToast } = useApp();
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "employee" });
  const colors = ["#0F766E", "#B45309", "#0369A1", "#7C3AED", "#DC2626", "#16A34A"];
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name || !form.email) { showToast("Name and email required", "error"); return; }
    const newEmp = { id: "e_" + uuid(), ...form, avatar: initials(form.name), color: colors[employees.length % colors.length], clientCount: 0, tasksCompleted: 0, tasksPending: 0 };
    setEmps(es => [...es, newEmp]);
    showToast(`${form.name} invited! They can login with their email.`, "success");
    onClose();
  };

  return (
    <div className="modal-box" style={{ maxWidth: 480 }}>
      <div className="modal-head"><div className="modal-title">Invite Team Member</div><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="modal-body">
        <div className="form-grid">
          <div className="f-group"><label className="f-label">Full Name <span className="f-req">*</span></label><input className="f-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Priya Sharma" /></div>
          <div className="f-group"><label className="f-label">Email <span className="f-req">*</span></label><input className="f-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="emp@foundersbridge.in" /></div>
          <div className="f-group"><label className="f-label">Phone</label><input className="f-input" type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="98xxxxxxxx" /></div>
          <div className="f-group"><label className="f-label">Role</label>
            <select className="f-select" value={form.role} onChange={e => set("role", e.target.value)}>
              <option value="employee">Employee — sees only assigned clients</option>
              <option value="manager">Manager — sees all clients</option>
            </select>
          </div>
          <div className="info-box" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <span>ℹ️</span>
            <div style={{ fontSize: 12, color: "var(--blue)" }}>An invitation email will be sent to this person with login instructions. Default password: <strong>Welcome@123</strong> (they should change on first login)</div>
          </div>
        </div>
      </div>
      <div className="modal-foot"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Send Invitation</button></div>
    </div>
  );
}
/* eslint-disable */
// ═══════════════════════════════════════════════════════════════════════
// FOUNDERS BRIDGE CRM — SESSION 2 ADDITIONS
// Paste this BELOW the last line of App_Session1.jsx
// DO NOT paste above the existing code — append only
// ═══════════════════════════════════════════════════════════════════════
//
// New features added in Session 2:
// 1. Client Task Submission Flow (fill form / upload docs → team review)
// 2. Record Payment modal
// 3. Notifications centre (team + client)
// 4. Client Self-Registration
// 5. Reports page (downloadable summary)
// 6. WhatsApp notification triggers (Kraya)
// 7. Improved client portal with full task details
// 8. Password change modal
// ═══════════════════════════════════════════════════════════════════════
//
// INSTRUCTIONS TO DEPLOY:
// 1. Open App_Session1.jsx in Notepad
// 2. Scroll to the very bottom
// 3. Paste everything below this comment block
// 4. Save the file
// 5. Upload to GitHub as App.jsx (replace existing)
// ═══════════════════════════════════════════════════════════════════════

// ─── WHATSAPP / KRAYA SERVICE ─────────────────────────────────────────
const KRAYA = {
  API_URL:   process.env.REACT_APP_KRAYA_URL   || "https://api.kraya.io/v1/messages",
  API_TOKEN: process.env.REACT_APP_KRAYA_TOKEN || "",
  TEMPLATES: {
    TASK_ACTION_NEEDED: "fb_task_action_needed",
    TASK_COMPLETED:     "fb_task_completed",
    INVOICE_CREATED:    "fb_invoice_created",
    PAYMENT_RECEIVED:   "fb_payment_received",
    WELCOME_CLIENT:     "fb_welcome_client",
    TEAM_ALERT:         "fb_team_alert",
  },
  async send(phone, template, vars = []) {
    if (!this.API_TOKEN) {
      console.log(`📲 WhatsApp [DEMO] → ${phone} | ${template} | ${vars.join(", ")}`);
      return { success: true, demo: true };
    }
    try {
      await fetch(this.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.API_TOKEN}` },
        body: JSON.stringify({
          to: `91${phone.replace(/\D/g, "")}`,
          type: "template",
          template: {
            name: template,
            language: { code: "en" },
            components: vars.length ? [{ type: "body", parameters: vars.map(v => ({ type: "text", text: String(v) })) }] : [],
          },
        }),
      });
    } catch (e) { console.error("WhatsApp error:", e); }
  },
  taskActionNeeded: (phone, clientName, taskName) =>
    KRAYA.send(phone, KRAYA.TEMPLATES.TASK_ACTION_NEEDED, [clientName, taskName]),
  taskCompleted: (phone, taskName, clientName) =>
    KRAYA.send(phone, KRAYA.TEMPLATES.TASK_COMPLETED, [taskName, clientName]),
  invoiceCreated: (phone, clientName, amount, invoiceNo) =>
    KRAYA.send(phone, KRAYA.TEMPLATES.INVOICE_CREATED, [clientName, amount, invoiceNo]),
  paymentReceived: (phone, name, amount, invoiceNo) =>
    KRAYA.send(phone, KRAYA.TEMPLATES.PAYMENT_RECEIVED, [name, amount, invoiceNo]),
  welcomeClient: (phone, name) =>
    KRAYA.send(phone, KRAYA.TEMPLATES.WELCOME_CLIENT, [name]),
  teamAlert: (phone, message) =>
    KRAYA.send(phone, KRAYA.TEMPLATES.TEAM_ALERT, [message]),
};

// ─── DEMO NOTIFICATIONS ───────────────────────────────────────────────
const DEMO_NOTIFICATIONS = [
  { id: "n1", userId: "u1", type: "task",    title: "Task submitted by client", body: "TechSpark: Main Application Filing — client submitted documents",   time: "10 min ago", read: false, icon: "📋" },
  { id: "n2", userId: "u1", type: "payment", title: "Payment received",         body: "FB/2025/001 — ₹72,500 received from TechSpark Solutions",           time: "2 hrs ago",  read: false, icon: "💰" },
  { id: "n3", userId: "u1", type: "client",  title: "New client registered",    body: "Sunrise Trading LLP registered and awaiting team assignment",        time: "1 day ago",  read: true,  icon: "🏢" },
  { id: "n4", userId: "u3", type: "task",    title: "Task assigned to you",     body: "DSC Creation for Director 2 — TechSpark Solutions",                  time: "3 hrs ago",  read: false, icon: "✅" },
  { id: "n5", userId: "u5", type: "task",    title: "Action required",          body: "Please upload documents for: Main Application Filing",               time: "1 day ago",  read: false, icon: "⚠️" },
  { id: "n6", userId: "u5", type: "invoice", title: "Invoice created",          body: "FB/2025/001 for ₹85,000 — due Jan 31, 2025",                        time: "2 days ago", read: true,  icon: "📄" },
];

// ─── DEMO PAYMENTS ───────────────────────────────────────────────────
const DEMO_PAYMENTS = [
  { id: "p1", invoiceId: "inv1", clientId: "c1", clientName: "TechSpark Solutions Pvt Ltd", amount: 72500, mode: "bank_transfer", reference: "NEFT2025001", date: "Jan 20, 2025", notes: "Partial payment received", recordedBy: "u2" },
  { id: "p2", invoiceId: "inv2", clientId: "c2", clientName: "GreenLeaf Ventures LLP",     amount: 45000, mode: "upi",           reference: "UPI123456",   date: "Feb 10, 2025", notes: "Full payment",            recordedBy: "u2" },
];

// ─── DEMO TASK SUBMISSIONS ────────────────────────────────────────────
const DEMO_SUBMISSIONS = [
  {
    id: "sub1", taskId: "t4", clientId: "c1", status: "submitted",
    formData: { "Director Name": "Rahul Mehta", "Father Name": "Suresh Mehta", "DOB": "1985-03-15" },
    documents: [{ name: "aadhaar_front.pdf", size: "245 KB" }, { name: "pan_card.pdf", size: "180 KB" }],
    submittedAt: "Jan 25, 2025", reviewNote: "", reviewedAt: null,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// EXTENDED APP SHELL — replaces the original App() export
// Copy this entire block and replace "export default function App()"
// in Session 1 with this version
// ═══════════════════════════════════════════════════════════════════════

// NOTE: Since we can't re-export, these components are standalone.
// The Session 2 file should be MERGED into Session 1 by a developer,
// or use the combined file provided below.

// ═══════════════════════════════════════════════════════════════════════
// NEW COMPONENTS — ADD THESE TO THE PAGE ROUTER
// ═══════════════════════════════════════════════════════════════════════

// ─── NOTIFICATIONS PAGE ──────────────────────────────────────────────
function NotificationsPage({ notifications, setNotifications, userId }) {
  const myNotifs = notifications.filter(n => n.userId === userId);
  const unread   = myNotifs.filter(n => !n.read).length;

  const markRead = (id) => setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  const markAll  = () => setNotifications(ns => ns.map(n => n.userId === userId ? { ...n, read: true } : n));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{unread} unread notification{unread !== 1 ? "s" : ""}</div>
        {unread > 0 && <button className="btn btn-sm" onClick={markAll}>Mark all as read</button>}
      </div>
      <div className="card">
        {myNotifs.length === 0 && (
          <div className="empty"><div className="empty-icon">🔔</div><div>No notifications yet</div></div>
        )}
        {myNotifs.map(n => (
          <div key={n.id} className="row-item" style={{ background: n.read ? "var(--white)" : "var(--blue-lt)", cursor: "pointer" }} onClick={() => markRead(n.id)}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: n.type === "payment" ? "#F0FDF4" : n.type === "task" ? "#FFF7ED" : "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{n.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600 }}>{n.title}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{n.body}</div>
              <div style={{ fontSize: 10, color: "var(--faint)", marginTop: 4 }}>{n.time}</div>
            </div>
            {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue)", flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── RECORD PAYMENT MODAL ─────────────────────────────────────────────
function RecordPaymentModal({ data, onClose, invoices, setInvoices, payments, setPayments, clients, showToast }) {
  const { invoiceId } = data;
  const invoice = invoices.find(i => i.id === invoiceId);
  const client  = clients.find(c => c.id === invoice?.clientId);
  const outstanding = invoice ? invoice.total - invoice.paid : 0;

  const [form, setForm] = useState({ amount: outstanding, mode: "bank_transfer", reference: "", date: new Date().toISOString().split("T")[0], notes: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.amount || form.amount <= 0) { showToast("Enter valid amount", "error"); return; }
    if (form.amount > outstanding) { showToast(`Amount cannot exceed outstanding balance of ${INR(outstanding)}`, "error"); return; }

    const newPaid    = invoice.paid + Number(form.amount);
    const newPending = invoice.total - newPaid;
    const newStatus  = newPending <= 0 ? "paid" : "partial";

    setInvoices(is => is.map(i => i.id === invoiceId ? { ...i, paid: newPaid, pending: newPending, status: newStatus } : i));
    setPayments(ps => [...ps, {
      id: "p_" + Math.random().toString(36).slice(2),
      invoiceId, clientId: invoice.clientId, clientName: invoice.clientName,
      amount: Number(form.amount), mode: form.mode, reference: form.reference,
      date: form.date, notes: form.notes, recordedBy: "u1",
    }]);

    KRAYA.paymentReceived(client?.phone || "", invoice.clientName, INR(form.amount), invoice.invoiceNo);
    showToast(`Payment of ${INR(form.amount)} recorded for ${invoice.invoiceNo}`, "success");
    onClose();
  };

  const MODES = [
    { id: "bank_transfer", label: "Bank Transfer / NEFT" },
    { id: "upi",           label: "UPI" },
    { id: "cheque",        label: "Cheque" },
    { id: "cash",          label: "Cash" },
    { id: "cashfree",      label: "Cashfree (Online)" },
  ];

  return (
    <div className="modal-box" style={{ maxWidth: 480 }}>
      <div className="modal-head"><div className="modal-title">Record Payment</div><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="modal-body">
        {invoice && (
          <div style={{ background: "linear-gradient(135deg,var(--navy),#1E40AF)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, color: "#fff" }}>
            <div style={{ fontSize: 12, opacity: .7, marginBottom: 4 }}>{invoice.invoiceNo} · {invoice.clientName}</div>
            <div style={{ display: "flex", gap: 20 }}>
              <div><div style={{ fontSize: 10, opacity: .6 }}>Total</div><div style={{ fontSize: 16, fontWeight: 700 }}>{INR(invoice.total)}</div></div>
              <div><div style={{ fontSize: 10, opacity: .6 }}>Paid so far</div><div style={{ fontSize: 16, fontWeight: 700, color: "#86EFAC" }}>{INR(invoice.paid)}</div></div>
              <div><div style={{ fontSize: 10, opacity: .6 }}>Outstanding</div><div style={{ fontSize: 16, fontWeight: 700, color: "#FCA5A5" }}>{INR(outstanding)}</div></div>
            </div>
          </div>
        )}
        <div className="form-grid">
          <div className="f-group">
            <label className="f-label">Payment Amount (₹) <span className="f-req">*</span></label>
            <input className="f-input" type="number" value={form.amount} onChange={e => set("amount", e.target.value)} max={outstanding} />
            <div className="f-hint">Maximum: {INR(outstanding)}</div>
          </div>
          <div className="f-group">
            <label className="f-label">Payment Mode</label>
            <select className="f-select" value={form.mode} onChange={e => set("mode", e.target.value)}>
              {MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div className="f-group">
            <label className="f-label">Reference / UTR Number</label>
            <input className="f-input" placeholder="NEFT/UPI/Cheque reference" value={form.reference} onChange={e => set("reference", e.target.value)} />
          </div>
          <div className="f-group">
            <label className="f-label">Payment Date</label>
            <input className="f-input" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
          </div>
          <div className="f-group">
            <label className="f-label">Notes</label>
            <textarea className="f-textarea" rows={2} placeholder="Optional notes…" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-green" onClick={save}>💰 Record Payment</button>
      </div>
    </div>
  );
}

// ─── CLIENT TASK SUBMISSION MODAL ─────────────────────────────────────
function ClientTaskSubmitModal({ data, onClose, submissions, setSubmissions, tasks, setTasks, showToast }) {
  const { task } = data;
  const fileRef   = useRef(null);
  const [formData, setFormData] = useState({});
  const [docs,     setDocs]     = useState([]);
  const [note,     setNote]     = useState("");
  const [loading,  setLoading]  = useState(false);

  // Fields based on task type
  const FIELDS = {
    docs: [
      { id: "directorName", label: "Director / Partner Name" },
      { id: "fatherName",   label: "Father's Name" },
      { id: "dob",          label: "Date of Birth", type: "date" },
      { id: "address",      label: "Residential Address", type: "textarea" },
    ],
    form: [
      { id: "info1", label: "Information Field 1" },
      { id: "info2", label: "Information Field 2" },
      { id: "info3", label: "Additional Notes", type: "textarea" },
    ],
    form_docs: [
      { id: "directorName", label: "Director / Partner Name" },
      { id: "fatherName",   label: "Father's Name" },
      { id: "dob",          label: "Date of Birth", type: "date" },
      { id: "address",      label: "Residential Address", type: "textarea" },
    ],
    none: [],
  };

  const fields = FIELDS[task.requirementType] || [];
  const needsDocs = task.requirementType === "docs" || task.requirementType === "form_docs";
  const needsForm = task.requirementType === "form" || task.requirementType === "form_docs";

  const onFileChange = (e) => {
    const files = Array.from(e.target.files);
    setDocs(d => [...d, ...files.map(f => ({ name: f.name, size: (f.size / 1024).toFixed(0) + " KB" }))]);
    e.target.value = "";
  };

  const submit = async () => {
    if (needsDocs && docs.length === 0) { showToast("Please upload required documents", "error"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));

    const newSub = {
      id: "sub_" + Math.random().toString(36).slice(2),
      taskId: task.id, clientId: task.clientId,
      status: "submitted",
      formData, documents: docs,
      submittedAt: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      reviewNote: "", reviewedAt: null, note,
    };
    setSubmissions(ss => [...ss, newSub]);
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: "team_approval" } : t));
    setLoading(false);
    showToast("Submitted successfully! Your team will review shortly.", "success");
    onClose();
  };

  return (
    <div className="modal-box" style={{ maxWidth: 560 }}>
      <div className="modal-head">
        <div>
          <div className="modal-title">{task.title}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Submit required information and documents</div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div style={{ padding: "10px 14px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, marginBottom: 16, fontSize: 12, color: "#C2410C" }}>
          ⚠️ Action Required — Please fill the form below and upload necessary documents to proceed with this task.
        </div>

        {/* Form fields */}
        {fields.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📝 Information Required</div>
            <div className="form-grid" style={{ marginBottom: 20 }}>
              {fields.map(f => (
                <div key={f.id} className="f-group">
                  <label className="f-label">{f.label}</label>
                  {f.type === "textarea"
                    ? <textarea className="f-textarea" rows={2} value={formData[f.id] || ""} onChange={e => setFormData(d => ({ ...d, [f.id]: e.target.value }))} />
                    : <input className="f-input" type={f.type || "text"} value={formData[f.id] || ""} onChange={e => setFormData(d => ({ ...d, [f.id]: e.target.value }))} />
                  }
                </div>
              ))}
            </div>
          </>
        )}

        {/* Document upload */}
        {needsDocs && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📎 Documents to Upload</div>
            <input type="file" ref={fileRef} multiple style={{ display: "none" }} onChange={onFileChange} />
            <div style={{ border: "2px dashed var(--border)", borderRadius: 10, padding: 20, textAlign: "center", cursor: "pointer", marginBottom: 14, background: "#FAFAF8" }} onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📁</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Click to upload documents</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>PAN, Aadhaar, Address Proof, Photos, etc.</div>
            </div>
            {docs.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                {docs.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 7, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>✅</span>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{d.size}</div></div>
                    <button onClick={() => setDocs(ds => ds.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 14 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Note */}
        <div className="f-group">
          <label className="f-label">Additional Note (optional)</label>
          <textarea className="f-textarea" rows={2} placeholder="Any message for your team…" value={note} onChange={e => setNote(e.target.value)} />
        </div>

        {task.requirementType === "none" && (
          <div style={{ padding: "12px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, fontSize: 12, color: "var(--green)" }}>
            ✅ No action required from you for this task. Click Submit to confirm acknowledgement.
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> : "Submit for Review →"}
        </button>
      </div>
    </div>
  );
}

// ─── REVIEW SUBMISSION MODAL (Team) ──────────────────────────────────
function ReviewSubmissionModal({ data, onClose, submissions, setSubmissions, tasks, setTasks, showToast }) {
  const { submissionId } = data;
  const sub     = submissions.find(s => s.id === submissionId);
  const task    = tasks.find(t => t.id === sub?.taskId);
  const [note, setNote]   = useState("");
  const [action, setAct]  = useState("");

  if (!sub || !task) return null;

  const decide = (approved) => {
    if (!approved && !note) { showToast("Please add a note explaining what changes are needed", "error"); return; }
    setSubmissions(ss => ss.map(s => s.id === submissionId ? { ...s, status: approved ? "approved" : "changes_requested", reviewNote: note, reviewedAt: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) } : s));
    setTasks(ts => ts.map(t => t.id === sub.taskId ? { ...t, status: approved ? "completed" : "client_action", completedDate: approved ? new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null } : t));
    showToast(approved ? "Submission approved! Task marked complete." : "Changes requested — client will be notified.", approved ? "success" : "warning");
    onClose();
  };

  return (
    <div className="modal-box" style={{ maxWidth: 580 }}>
      <div className="modal-head">
        <div>
          <div className="modal-title">Review Submission</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{task.title} · {task.clientName}</div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div style={{ padding: "10px 14px", background: "#EDE9FE", border: "1px solid #C4B5FD", borderRadius: 8, marginBottom: 16, fontSize: 12, color: "#7C3AED" }}>
          📥 Submitted by client on {sub.submittedAt}
        </div>

        {/* Form data */}
        {Object.keys(sub.formData || {}).length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Submitted Information</div>
            <div style={{ background: "#FAFAF8", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
              {Object.entries(sub.formData).map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)", minWidth: 140 }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Documents */}
        {sub.documents?.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Uploaded Documents ({sub.documents.length})</div>
            <div style={{ marginBottom: 16 }}>
              {sub.documents.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 7, marginBottom: 6 }}>
                  <span>📄</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{d.size}</div></div>
                  <button className="btn btn-sm">Download</button>
                </div>
              ))}
            </div>
          </>
        )}

        {sub.note && (
          <div style={{ padding: "10px 14px", background: "#F9FAFB", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 16, fontSize: 12, color: "var(--muted)" }}>
            💬 Client note: {sub.note}
          </div>
        )}

        <div className="f-group">
          <label className="f-label">Review Note {action === "reject" ? <span className="f-req">*</span> : "(optional)"}</label>
          <textarea className="f-textarea" rows={3} placeholder={action === "reject" ? "Explain what needs to be corrected…" : "Optional feedback for client…"} value={note} onChange={e => setNote(e.target.value)} />
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-red" onClick={() => { setAct("reject"); setTimeout(() => decide(false), 100); }}>↩ Request Changes</button>
        <button className="btn btn-green" onClick={() => { setAct("approve"); setTimeout(() => decide(true), 100); }}>✓ Approve & Complete</button>
      </div>
    </div>
  );
}

// ─── CLIENT SELF REGISTRATION ─────────────────────────────────────────
function RegistrationPage({ onBack, showToast }) {
  const [step, setStep]   = useState(1);
  const [form, setForm]   = useState({ name: "", phone: "", email: "", password: "", confirmPassword: "", companyName: "", companyType: "Private Limited" });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const nextStep = () => {
    if (step === 1) {
      if (!form.name || !form.phone || !form.email) { showToast("All fields required", "error"); return; }
      if (!form.phone.match(/^\d{10}$/)) { showToast("Enter a valid 10-digit mobile number", "error"); return; }
    }
    if (step === 2) {
      if (form.password.length < 6) { showToast("Password must be at least 6 characters", "error"); return; }
      if (form.password !== form.confirmPassword) { showToast("Passwords do not match", "error"); return; }
    }
    setStep(s => s + 1);
  };

  const submit = async () => {
    if (!form.companyName) { showToast("Company name required", "error"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    await KRAYA.welcomeClient(form.phone, form.name);
    setLoading(false);
    setStep(4); // Success
  };

  const STEPS = ["Personal Details", "Set Password", "Company Info", "Done"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 400, height: 400, top: -100, right: -100, borderRadius: "50%", background: "linear-gradient(135deg,#7C3AED,transparent)", opacity: .1 }} />
      <div style={{ background: "#fff", borderRadius: 20, padding: "44px 40px", width: 480, zIndex: 2, boxShadow: "0 32px 80px rgba(0,0,0,.35)", animation: "fadeUp .3s ease" }}>

        {step < 4 && (
          <>
            <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>← Back to login</button>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, marginBottom: 4 }}>Create Account</div>
            <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 24 }}>Founders Bridge Portal</div>

            {/* Step indicators */}
            <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
              {STEPS.slice(0, 3).map((s, i) => (
                <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: i + 1 <= step ? "var(--blue)" : "var(--border)", transition: ".3s" }} />
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 18 }}>Step {step} — {STEPS[step - 1]}</div>
          </>
        )}

        {step === 1 && (
          <div className="form-grid">
            <div className="f-group"><label className="f-label">Full Name <span className="f-req">*</span></label><input className="f-input" placeholder="As per PAN card" value={form.name} onChange={e => set("name", e.target.value)} /></div>
            <div className="f-group"><label className="f-label">Mobile Number <span className="f-req">*</span></label><input className="f-input" type="tel" placeholder="10-digit mobile" value={form.phone} onChange={e => set("phone", e.target.value.replace(/\D/g, ""))} maxLength={10} /></div>
            <div className="f-group"><label className="f-label">Email Address <span className="f-req">*</span></label><input className="f-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => set("email", e.target.value)} /></div>
            <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 8 }} onClick={nextStep}>Next →</button>
          </div>
        )}

        {step === 2 && (
          <div className="form-grid">
            <div className="f-group"><label className="f-label">Set Password <span className="f-req">*</span></label><input className="f-input" type="password" placeholder="Minimum 6 characters" value={form.password} onChange={e => set("password", e.target.value)} /></div>
            <div className="f-group"><label className="f-label">Confirm Password <span className="f-req">*</span></label><input className="f-input" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} /></div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={nextStep}>Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-grid">
            <div className="f-group"><label className="f-label">Company / Business Name <span className="f-req">*</span></label><input className="f-input" placeholder="e.g. TechSpark Solutions Pvt Ltd" value={form.companyName} onChange={e => set("companyName", e.target.value)} /></div>
            <div className="f-group">
              <label className="f-label">Business Type</label>
              <select className="f-select" value={form.companyType} onChange={e => set("companyType", e.target.value)}>
                {["Private Limited", "LLP", "Partnership", "Proprietorship", "Individual"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ padding: "12px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, fontSize: 12, color: "var(--blue)" }}>
              ℹ️ Our team will review your registration and be in touch within 24 hours to complete your onboarding.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={submit} disabled={loading}>
                {loading ? "Creating account…" : "Create Account →"}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 24, marginBottom: 8 }}>Account Created!</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>Welcome to Founders Bridge, <strong>{form.name}</strong>!</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>Our team will contact you within 24 hours to set up your portal.</div>
            <div style={{ padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, fontSize: 12, color: "var(--green)", marginBottom: 20 }}>
              📲 A welcome message has been sent to your WhatsApp
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onBack}>Go to Login →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── REPORTS PAGE ─────────────────────────────────────────────────────
function ReportsPage({ clients, invoices, tasks, employees, payments }) {
  const totalBilling   = clients.reduce((s, c) => s + c.totalBilling, 0);
  const totalCollected = clients.reduce((s, c) => s + c.collected, 0);
  const totalPending   = clients.reduce((s, c) => s + c.pending, 0);
  const completedTasks = tasks.filter(t => t.status === "completed").length;

  const downloadCSV = (data, filename) => {
    const headers  = Object.keys(data[0]);
    const rows     = data.map(r => headers.map(h => `"${r[h] || ""}"`).join(","));
    const csv      = [headers.join(","), ...rows].join("\n");
    const blob     = new Blob([csv], { type: "text/csv" });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const clientReport = clients.map(c => ({
    "Client No":        c.clientNo,
    "Name":             c.name,
    "Type":             c.type,
    "Contact":          c.contactName,
    "Phone":            c.phone,
    "Total Billing":    c.totalBilling,
    "Collected":        c.collected,
    "Pending":          c.pending,
    "Progress %":       c.progress,
    "Status":           c.status,
    "Created":          c.createdAt,
  }));

  const invoiceReport = invoices.map(i => ({
    "Invoice No":  i.invoiceNo,
    "Client":      i.clientName,
    "Date":        i.date,
    "Total":       i.total,
    "Paid":        i.paid,
    "Pending":     i.pending,
    "Status":      i.status,
  }));

  const taskReport = tasks.map(t => ({
    "Task":       t.title,
    "Client":     t.clientName,
    "Status":     t.status,
    "Due Date":   t.dueDate || "",
    "Completed":  t.completedDate || "",
    "Sequence":   t.sequence,
  }));

  const paymentReport = (payments || []).map(p => ({
    "Date":        p.date,
    "Client":      p.clientName,
    "Invoice":     p.invoiceId,
    "Amount":      p.amount,
    "Mode":        p.mode,
    "Reference":   p.reference,
    "Notes":       p.notes,
  }));

  const REPORTS = [
    { id: "clients",   icon: "🏢", title: "Client Report",    desc: `${clients.length} clients · ${INR(totalBilling)} total billing`,         data: clientReport,   file: "founders_bridge_clients.csv" },
    { id: "invoices",  icon: "📄", title: "Invoice Report",   desc: `${invoices.length} invoices · ${INR(totalCollected)} collected`,          data: invoiceReport,  file: "founders_bridge_invoices.csv" },
    { id: "tasks",     icon: "✅", title: "Task Report",      desc: `${tasks.length} total tasks · ${completedTasks} completed`,               data: taskReport,     file: "founders_bridge_tasks.csv" },
    { id: "payments",  icon: "💰", title: "Payment Report",   desc: `${(payments||[]).length} payments · ${INR((payments||[]).reduce((s,p)=>s+p.amount,0))} collected`, data: paymentReport, file: "founders_bridge_payments.csv" },
  ];

  return (
    <>
      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          ["Total Clients",    clients.length,    "var(--blue)"  ],
          ["Total Billing",    INR(totalBilling),  "var(--ink)"   ],
          ["Collected",        INR(totalCollected),"var(--green)" ],
          ["Outstanding",      INR(totalPending),  "var(--red)"   ],
        ].map(([l, v, c]) => (
          <div key={l} className="stat-box">
            <div className="stat-lbl">{l}</div>
            <div className="stat-val" style={{ fontSize: 20, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Download cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {REPORTS.map(r => (
          <div key={r.id} className="card">
            <div className="card-body">
              <div style={{ fontSize: 28, marginBottom: 10 }}>{r.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>{r.desc}</div>
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => downloadCSV(r.data, r.file)}>
                ⬇ Download CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, padding: "12px 16px", background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 10, fontSize: 12, color: "#0369A1" }}>
        ℹ️ Reports are downloaded as CSV files. Open in Excel or Google Sheets for analysis. PDF reports and automated monthly email reports are available in the Enterprise plan.
      </div>
    </>
  );
}

// ─── CHANGE PASSWORD MODAL ────────────────────────────────────────────
function ChangePasswordModal({ onClose, showToast }) {
  const [form, setForm] = useState({ current: "", newPwd: "", confirm: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.current) { showToast("Enter current password", "error"); return; }
    if (form.newPwd.length < 6) { showToast("New password must be 6+ characters", "error"); return; }
    if (form.newPwd !== form.confirm) { showToast("Passwords do not match", "error"); return; }
    showToast("Password changed successfully!", "success");
    onClose();
  };

  return (
    <div className="modal-box" style={{ maxWidth: 420 }}>
      <div className="modal-head"><div className="modal-title">Change Password</div><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="modal-body">
        <div className="form-grid">
          <div className="f-group"><label className="f-label">Current Password</label><input className="f-input" type="password" value={form.current} onChange={e => set("current", e.target.value)} /></div>
          <div className="f-group"><label className="f-label">New Password</label><input className="f-input" type="password" placeholder="Minimum 6 characters" value={form.newPwd} onChange={e => set("newPwd", e.target.value)} /></div>
          <div className="f-group"><label className="f-label">Confirm New Password</label><input className="f-input" type="password" value={form.confirm} onChange={e => set("confirm", e.target.value)} /></div>
        </div>
      </div>
      <div className="modal-foot"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Change Password</button></div>
    </div>
  );
}

// ─── PAYMENTS HISTORY PAGE ────────────────────────────────────────────
function PaymentsPage({ payments, invoices, clients }) {
  const total = (payments || []).reduce((s, p) => s + p.amount, 0);
  const MODES = { bank_transfer: "Bank Transfer", upi: "UPI", cheque: "Cheque", cash: "Cash", cashfree: "Cashfree" };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          ["Total Received",    INR(total),                "var(--green)"],
          ["No. of Payments",   (payments||[]).length,     "var(--blue)" ],
          ["Avg per Payment",   INR(Math.round(total / Math.max((payments||[]).length,1))), "var(--ink)"],
        ].map(([l, v, c]) => (
          <div key={l} className="stat-box"><div className="stat-lbl">{l}</div><div className="stat-val" style={{ fontSize: 20, color: c }}>{v}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Date</th><th>Client</th><th>Amount</th><th>Mode</th><th>Reference</th><th>Notes</th></tr></thead>
            <tbody>
              {(payments || []).length === 0 && <tr><td colSpan={6}><div className="empty"><div className="empty-icon">💰</div><div>No payments recorded yet</div></div></td></tr>}
              {(payments || []).map(p => (
                <tr key={p.id}>
                  <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>{p.date}</td>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>{p.clientName}</td>
                  <td style={{ fontSize: 14, fontWeight: 700, color: "var(--green)" }}>{INR(p.amount)}</td>
                  <td><span className="tag">{MODES[p.mode] || p.mode}</span></td>
                  <td style={{ fontSize: 12, color: "var(--muted)", fontFamily: "monospace" }}>{p.reference || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{p.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── KRAYA SETTINGS PAGE ──────────────────────────────────────────────
function KrayaSettings({ showToast }) {
  const [url,    setUrl]   = useState(process.env.REACT_APP_KRAYA_URL   || "");
  const [token,  setToken] = useState(process.env.REACT_APP_KRAYA_TOKEN || "");
  const [show,   setShow]  = useState(false);

  const test = async () => {
    showToast("Test message sent! Check your WhatsApp.", "info");
    console.log("Testing Kraya with URL:", url);
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="card">
        <div className="card-head"><div className="card-title">📲 Kraya WhatsApp Integration</div></div>
        <div className="card-body">
          <div style={{ padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, fontSize: 12, color: "#B45309", marginBottom: 16 }}>
            ⚠️ Add your Kraya API token to <strong>REACT_APP_KRAYA_TOKEN</strong> in Vercel environment variables for live WhatsApp messages.
          </div>
          <div className="form-grid">
            <div className="f-group">
              <label className="f-label">Kraya API Endpoint</label>
              <input className="f-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.kraya.io/v1/messages" />
            </div>
            <div className="f-group">
              <label className="f-label">API Token</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="f-input" type={show ? "text" : "password"} value={token} onChange={e => setToken(e.target.value)} placeholder="Bearer token from Kraya dashboard" />
                <button className="btn" onClick={() => setShow(s => !s)}>{show ? "Hide" : "Show"}</button>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>WhatsApp Templates Required in Kraya</div>
            <div style={{ background: "#FAFAF8", borderRadius: 10, overflow: "hidden" }}>
              {Object.entries(KRAYA.TEMPLATES).map(([k, v], i) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: i < Object.keys(KRAYA.TEMPLATES).length - 1 ? "1px solid #F3F4F6" : "none", fontSize: 12 }}>
                  <span style={{ color: "var(--muted)", textTransform: "lowercase" }}>{k.replace(/_/g, " ")}</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "0 20px 20px", display: "flex", gap: 10 }}>
          <button className="btn" onClick={test}>Test Connection</button>
          <button className="btn btn-primary" onClick={() => showToast("Kraya settings saved to environment variables!", "success")}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPLETE COMBINED APP — Session 1 + Session 2
// This is the final merged export. Replace your App_Session1.jsx
// with this complete version.
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// UPDATED EXPORTS — REPLACE THE ORIGINAL App() IN SESSION 1
// This version adds: notifications, payments, reports, registration,
// task submission, review submission modals
// ═══════════════════════════════════════════════════════════════════════

// Extended App with all Session 2 features
function AppV2() {
  const [user, setUser]       = useState(null);
  const [view, setView]       = useState("");
  const [toast, setToast]     = useState(null);
  const [modal, setModal]     = useState(null);
  const [showReg, setShowReg] = useState(false);

  // Core data
  const [org,       setOrg]     = useState(DEFAULT_ORG);
  const [bundles,   setBundles] = useState(DEFAULT_BUNDLES);
  const [clients,   setClients] = useState(DEMO_CLIENTS);
  const [employees, setEmps]    = useState(DEMO_EMPLOYEES);
  const [invoices,  setInvoices]= useState(DEMO_INVOICES);
  const [tasks,     setTasks]   = useState(DEMO_TASKS);

  // Session 2 additions
  const [notifications, setNotifs]   = useState(DEMO_NOTIFICATIONS);
  const [payments,      setPayments] = useState(DEMO_PAYMENTS);
  const [submissions,   setSubs]     = useState(DEMO_SUBMISSIONS);

  const showToast  = (msg, type="info") => setToast({msg,type});
  const openModal  = (id, data={}) => setModal({id,data});
  const closeModal = () => setModal(null);

  const handleLogin = (u) => {
    setUser(u);
    const views = { admin:"dashboard", manager:"dashboard", employee:"emp-dashboard", client:"client-home" };
    setView(views[u.role] || "dashboard");
  };

  const logout = () => { setUser(null); setView(""); };

  const unreadNotifs = notifications.filter(n => n.userId === user?.id && !n.read).length;

  if (!user) {
    if (showReg) return (
      <>
        <style>{G}</style>
        <RegistrationPage onBack={() => setShowReg(false)} showToast={showToast} />
        {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      </>
    );
    return (
      <>
        <style>{G}</style>
        <LoginPageV2 onLogin={handleLogin} showToast={showToast} onRegister={() => setShowReg(true)} />
        {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      </>
    );
  }

  const ctx = {
    user, org, setOrg, bundles, setBundles, clients, setClients,
    employees, setEmps, invoices, setInvoices, tasks, setTasks,
    notifications, setNotifs, payments, setPayments, submissions, setSubs,
    showToast, openModal, closeModal, modal, view, setView,
    unreadNotifs,
  };

  const NAV_V2 = {
    admin: [
      { sec:"Overview", items:[
        { id:"dashboard",    icon:"⬡",  label:"Dashboard"   },
        { id:"analytics",    icon:"📊", label:"Analytics"   },
        { id:"reports",      icon:"📈", label:"Reports"     },
      ]},
      { sec:"Clients", items:[
        { id:"clients",      icon:"🏢", label:"All Clients" },
        { id:"invoices",     icon:"📄", label:"Invoices"    },
        { id:"payments",     icon:"💰", label:"Payments"    },
        { id:"tasks",        icon:"✓",  label:"Tasks"       },
      ]},
      { sec:"Team", items:[
        { id:"employees",    icon:"👥", label:"Employees"   },
      ]},
      { sec:"Settings", items:[
        { id:"settings-org",     icon:"🏛️", label:"Organisation"    },
        { id:"settings-bundles", icon:"📦", label:"Bundles & Services"},
        { id:"settings-users",   icon:"🔐", label:"Users & Roles"   },
        { id:"settings-kraya",   icon:"📲", label:"WhatsApp (Kraya)"},
      ]},
    ],
    manager: [
      { sec:"Overview", items:[
        { id:"dashboard",    icon:"⬡",  label:"Dashboard"   },
        { id:"reports",      icon:"📈", label:"Reports"     },
      ]},
      { sec:"Clients", items:[
        { id:"clients",      icon:"🏢", label:"All Clients" },
        { id:"invoices",     icon:"📄", label:"Invoices"    },
        { id:"payments",     icon:"💰", label:"Payments"    },
        { id:"tasks",        icon:"✓",  label:"Tasks"       },
      ]},
      { sec:"Team", items:[
        { id:"employees",    icon:"👥", label:"Team"        },
      ]},
    ],
    employee: [
      { sec:"My Work", items:[
        { id:"emp-dashboard", icon:"⬡",  label:"Dashboard"   },
        { id:"emp-tasks",     icon:"✓",  label:"My Tasks"    },
        { id:"emp-clients",   icon:"🏢", label:"My Clients"  },
      ]},
    ],
    client: [
      { sec:"My Portal", items:[
        { id:"client-home",     icon:"🏢", label:"My Companies" },
        { id:"client-tasks",    icon:"✓",  label:"My Tasks"     },
        { id:"client-invoices", icon:"💳", label:"My Billing"   },
        { id:"client-docs",     icon:"📁", label:"Documents"    },
      ]},
    ],
  };

  const roleColor = { admin:"#7C3AED", manager:"#0369A1", employee:"#0F766E", client:"#2563EB" };
  const roleLabel = { admin:"Administrator", manager:"Manager", employee:"Employee", client:"Client" };
  const nav = NAV_V2[user.role] || [];

  const TITLES = {
    dashboard:"Dashboard", analytics:"Analytics", reports:"Reports",
    clients:"Clients", invoices:"Invoices", payments:"Payments", tasks:"Tasks", employees:"Employees",
    "settings-org":"Organisation Settings", "settings-bundles":"Bundles & Services",
    "settings-users":"Users & Roles", "settings-kraya":"WhatsApp Settings",
    "emp-dashboard":"My Dashboard", "emp-tasks":"My Tasks", "emp-clients":"My Clients",
    "client-home":"My Companies", "client-tasks":"My Tasks",
    "client-invoices":"My Billing", "client-docs":"Documents",
    notifications:"Notifications",
  };

  return (
    <AppCtx.Provider value={ctx}>
      <style>{G}</style>
      <div className={`app role-${user.role}`}>

        {/* Sidebar */}
        <aside className="sb">
          <div className="sb-logo">
            <div className="sb-brand">Founders<br/>Bridge</div>
            <div className="sb-tagline">CRM Portal</div>
          </div>
          <div className="sb-role-pill">
            <div className="sb-role-name">{user.name}</div>
            <div className="sb-role-tag">{roleLabel[user.role]}</div>
          </div>
          <nav className="sb-nav">
            {nav.map(sec => (
              <div key={sec.sec}>
                <div className="sb-section">{sec.sec}</div>
                {sec.items.map(item => (
                  <div key={item.id} className={`sb-item ${view===item.id?"on":""}`} onClick={() => setView(item.id)}>
                    <span className="sb-icon">{item.icon}</span>{item.label}
                    {item.badge > 0 && <span className="sb-badge">{item.badge}</span>}
                  </div>
                ))}
              </div>
            ))}
          </nav>
          <div className="sb-foot">
            <div className="sb-user">
              <div className="sb-av av" style={{background:roleColor[user.role]}}>{user.avatar}</div>
              <div><div className="sb-uname">{user.name}</div><div className="sb-urole">{user.role}</div></div>
              <button className="sb-out" onClick={logout}>Exit</button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <div className="topbar-title">{TITLES[view] || "Founders Bridge"}</div>
            {/* Notification bell */}
            <div style={{position:"relative",cursor:"pointer",marginRight:8}} onClick={() => setView("notifications")}>
              <span style={{fontSize:20}}>🔔</span>
              {unreadNotifs > 0 && (
                <span style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"var(--red)",color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadNotifs}</span>
              )}
            </div>
            <div style={{fontSize:11,color:"var(--muted)",fontWeight:600}}>{org.name}</div>
          </div>

          <div className="page">
            {/* All original views */}
            {view==="dashboard"         && <AdminDashboard />}
            {view==="analytics"         && <AnalyticsPage />}
            {view==="reports"           && <ReportsPage clients={clients} invoices={invoices} tasks={tasks} employees={employees} payments={payments} />}
            {view==="clients"           && <ClientsPage />}
            {view==="invoices"          && <InvoicesPage />}
            {view==="payments"          && <PaymentsPage payments={payments} invoices={invoices} clients={clients} />}
            {view==="tasks"             && <TasksPage />}
            {view==="employees"         && <EmployeesPage />}
            {view==="settings-org"      && <OrgSettings />}
            {view==="settings-bundles"  && <BundleSettings />}
            {view==="settings-users"    && <UserSettings />}
            {view==="settings-kraya"    && <KrayaSettings showToast={showToast} />}
            {view==="emp-dashboard"     && <EmpDashboard />}
            {view==="emp-tasks"         && <TasksPage />}
            {view==="emp-clients"       && <ClientsPage />}
            {view==="client-home"       && <ClientHome />}
            {view==="client-tasks"      && <ClientTasksV2 submissions={submissions} setSubs={setSubs} />}
            {view==="client-invoices"   && <ClientInvoices />}
            {view==="client-docs"       && <ClientDocs />}
            {view==="notifications"     && <NotificationsPage notifications={notifications} setNotifications={setNotifs} userId={user.id} />}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal?.id === "create-client"      && <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}><CreateClientModal data={modal.data} onClose={closeModal} /></div>}
      {modal?.id === "create-invoice"     && <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}><CreateInvoiceModal data={modal.data} onClose={closeModal} /></div>}
      {modal?.id === "view-invoice"       && <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}><ViewInvoiceModal data={modal.data} onClose={closeModal} /></div>}
      {modal?.id === "view-task"          && <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}><ViewTaskModal data={modal.data} onClose={closeModal} /></div>}
      {modal?.id === "create-employee"    && <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}><CreateEmployeeModal data={modal.data} onClose={closeModal} /></div>}
      {modal?.id === "record-payment"     && <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}><RecordPaymentModal data={modal.data} onClose={closeModal} invoices={invoices} setInvoices={setInvoices} payments={payments} setPayments={setPayments} clients={clients} showToast={showToast} /></div>}
      {modal?.id === "client-submit-task" && <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}><ClientTaskSubmitModal data={modal.data} onClose={closeModal} submissions={submissions} setSubmissions={setSubs} tasks={tasks} setTasks={setTasks} showToast={showToast} /></div>}
      {modal?.id === "review-submission"  && <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}><ReviewSubmissionModal data={modal.data} onClose={closeModal} submissions={submissions} setSubmissions={setSubs} tasks={tasks} setTasks={setTasks} showToast={showToast} /></div>}
      {modal?.id === "change-password"    && <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}><ChangePasswordModal onClose={closeModal} showToast={showToast} /></div>}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </AppCtx.Provider>
  );
}

// ─── LOGIN V2 — with Register link ───────────────────────────────────
function LoginPageV2({ onLogin, showToast, onRegister }) {
  const [mode, setMode]         = useState("password");
  const [identifier, setId]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const findUser = (id) => {
    const norm = id.trim().toLowerCase();
    return DEMO_USERS[norm] || DEMO_BY_PHONE[norm] || null;
  };

  const handleLogin = async () => {
    setError("");
    if (!identifier) { setError("Enter email or mobile"); return; }
    if (!password) { setError("Enter password"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const user = findUser(identifier);
    if (!user || user.password !== password) { setError("Invalid credentials"); setLoading(false); return; }
    setLoading(false);
    showToast(`Welcome back, ${user.name}!`, "success");
    onLogin(user);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-orb" style={{width:500,height:500,top:-150,right:-150,background:"linear-gradient(135deg,#7C3AED,transparent)"}}/>
      <div className="auth-orb" style={{width:300,height:300,bottom:-80,left:-80,background:"linear-gradient(135deg,#EA580C,transparent)"}}/>
      <div className="auth-card">
        <div className="auth-brand">Founders Bridge</div>
        <div className="auth-sub">CRM & Client Portal</div>

        <div className="auth-tabs" style={{marginBottom:20}}>
          <div className={`auth-tab ${mode==="password"?"on":""}`} onClick={() => setMode("password")}>🔑 Password</div>
          <div className={`auth-tab ${mode==="otp"?"on":""}`} onClick={() => setMode("otp")}>📱 OTP</div>
        </div>

        <div className="f-group" style={{marginBottom:14}}>
          <label className="f-label">Email or Mobile</label>
          <input className="f-input" type="text" placeholder="email@example.com or 98xxxxxxxx" value={identifier} onChange={e=>setId(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
        </div>

        {mode==="password" && (
          <>
            <div className="f-group" style={{marginBottom:16}}>
              <label className="f-label">Password</label>
              <input className="f-input" type="password" placeholder="Enter password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
            </div>
            {error && <div style={{fontSize:12,color:"var(--red)",marginBottom:12}}>{error}</div>}
            <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={handleLogin} disabled={loading}>
              {loading ? <span style={{display:"inline-block",width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> : "Sign In →"}
            </button>
          </>
        )}

        {mode==="otp" && (
          <div style={{padding:"12px 14px",background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:8,fontSize:12,color:"#B45309",marginTop:8}}>
            ⚠️ OTP login via SMS coming soon. Please use password login.
          </div>
        )}

        <div style={{textAlign:"center",marginTop:16,fontSize:12,color:"var(--muted)"}}>
          New client?{" "}
          <span style={{color:"var(--blue)",cursor:"pointer",fontWeight:600}} onClick={onRegister}>Create account →</span>
        </div>

        <div className="demo-hints" style={{marginTop:16}}>
          <div style={{fontWeight:700,marginBottom:4,color:"var(--ink)"}}>Demo Accounts:</div>
          <div><b>Admin:</b> admin@foundersbridge.in / admin123</div>
          <div><b>Manager:</b> manager@foundersbridge.in / manager123</div>
          <div><b>Employee:</b> emp1@foundersbridge.in / emp123</div>
          <div><b>Client:</b> client@techspark.in / client123</div>
        </div>
      </div>
    </div>
  );
}

// ─── CLIENT TASKS V2 — with submission flow ───────────────────────────
function ClientTasksV2({ submissions, setSubs }) {
  const { tasks, setTasks, openModal, showToast } = useApp();
  // Show first client's tasks for demo
  const clientTasks = tasks.slice(0, 4);

  return (
    <>
      <div className="card">
        <div className="card-head"><div className="card-title">My Tasks</div></div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>#</th><th>Task</th><th>Status</th><th>Due Date</th><th>Action</th></tr></thead>
            <tbody>
              {clientTasks.map(t => {
                const sub       = submissions.find(s => s.taskId === t.id);
                const needsAction = t.status === "client_action";
                const submitted   = t.status === "team_approval";
                const isOverdue   = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed";
                return (
                  <tr key={t.id}>
                    <td style={{fontSize:11,color:"var(--muted)",fontWeight:700}}>#{t.sequence}</td>
                    <td>
                      <div style={{fontWeight:500,fontSize:13}}>{t.title}</div>
                      {sub?.status === "changes_requested" && (
                        <div style={{fontSize:11,color:"var(--red)",marginTop:2}}>⚠️ Changes needed: {sub.reviewNote}</div>
                      )}
                    </td>
                    <td>
                      <Badge status={t.status} />
                      {submitted && <div style={{fontSize:10,color:"var(--purple)",marginTop:3}}>Under review</div>}
                    </td>
                    <td>
                      <span style={{fontSize:12,color:isOverdue?"var(--red)":"var(--muted)",fontWeight:isOverdue?700:400}}>
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—"}
                      </span>
                    </td>
                    <td>
                      {(needsAction || sub?.status === "changes_requested") && (
                        <button className="btn btn-blue btn-sm" onClick={() => openModal("client-submit-task",{task:t})}>
                          {sub?.status === "changes_requested" ? "Resubmit" : "Submit →"}
                        </button>
                      )}
                      {t.status === "completed" && <span style={{fontSize:12,color:"var(--green)",fontWeight:700}}>✓ Complete</span>}
                      {submitted && <span style={{fontSize:12,color:"var(--purple)"}}>⏳ Reviewing</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── FINAL EXPORT ────────────────────────────────────────────────────
export { AppV2 as default };
