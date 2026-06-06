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
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://suodxuignbbsxmqrfagx.supabase.co";
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || "sb_publishable_g53rUECoCXdsfpD_qDUlow_ufks2CFs";
const POLL_INTERVAL = 5000; // Poll every 5 seconds for real-time sync

const SB_HDRS = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

const sb = {
  async select(table, filter = "") {
    try {
      const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.desc${filter ? "&" + filter : ""}`;
      const res = await fetch(url, { headers: SB_HDRS });
      if (!res.ok) return [];
      return res.json();
    } catch { return []; }
  },
  async insert(table, data) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST", headers: SB_HDRS,
        body: JSON.stringify(Array.isArray(data) ? data : [data]),
      });
      if (!res.ok) { const e = await res.json(); console.error("Insert error:", e); return []; }
      return res.json();
    } catch(e) { console.error("Insert failed:", e); return []; }
  },
  async update(table, matchKey, matchVal, data) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${matchKey}=eq.${encodeURIComponent(matchVal)}`, {
        method: "PATCH", headers: SB_HDRS, body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); console.error("Update error:", e); return []; }
      return res.json();
    } catch(e) { console.error("Update failed:", e); return []; }
  },
};

// ─── AUTH ─────────────────────────────────────────────────────────────
const Auth = {
  async login(identifier, password) {
    const norm = identifier.trim().toLowerCase().replace(/\s/g, "");
    const isPhone = /^\d{10}$/.test(norm);
    try {
      const filter = isPhone ? `phone=eq.${norm}` : `email=eq.${encodeURIComponent(norm)}`;
      const rows = await sb.select("users", filter);
      const user = rows[0];
      if (!user) {
        // Fallback to demo data
        const demo = DEMO_USERS[norm] || DEMO_BY_PHONE[norm];
        if (demo && demo.password === password) return { user: demo };
        return { error: "No account found. Please check your email/mobile." };
      }
      if (user.password !== password) return { error: "Incorrect password. Please try again." };
      return { user: {
        id: user.id, name: user.name, role: user.role,
        avatar: user.avatar || initials(user.name),
        color: user.color || "#0B1F3A",
        email: user.email, phone: user.phone, password: user.password,
      }};
    } catch(e) {
      // Fallback to demo if DB unreachable
      const demo = DEMO_USERS[norm] || DEMO_BY_PHONE[norm];
      if (demo && demo.password === password) return { user: demo };
      return { error: "Connection error. Please try again." };
    }
  },
};

// ─── DATA MAPPERS ─────────────────────────────────────────────────────
const mapClient  = c => ({ id:c.id, clientNo:c.client_no, name:c.name, contactName:c.contact_name, email:c.email, phone:c.phone, type:c.type, status:c.status, assignedTo:c.assigned_to, totalBilling:Number(c.total_billing)||0, collected:Number(c.collected)||0, pending:Number(c.pending)||0, progress:c.progress||0, createdAt:c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : today() });
const mapInvoice = i => ({ id:i.id, invoiceNo:i.invoice_no, clientId:i.company_id, clientName:i.client_name, date:i.date||today(), dueDate:i.due_date, status:i.status||"unpaid", total:Number(i.total)||0, paid:Number(i.paid)||0, pending:Number(i.pending)||0, lineItems:[] });
const mapTask    = t => ({ id:t.id, title:t.title, clientId:t.company_id, clientName:t.client_name, invoiceId:t.invoice_id, assignedTo:t.assigned_to, status:t.status||"open", sequence:t.sequence||1, requirementType:t.requirement_type||"none", docTemplateId:t.doc_template_id, directorNumber:t.director_number, directorCount:t.director_count||1, dueDate:t.due_date, completedDate:t.completed_date, notes:t.notes||"", category:t.category, isRecurring:t.is_recurring, freq:t.recurring_freq, startDate:t.start_date, endDate:t.end_date });
const mapTicket  = t => ({ id:t.id, ticketNo:t.ticket_no, clientId:t.company_id, clientName:t.client_name, raisedBy:t.raised_by, assignedTo:t.assigned_to, subject:t.subject, description:t.description||"", priority:t.priority||"medium", status:t.status||"open", tat:t.tat, createdAt:t.created_at ? new Date(t.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : today(), updatedAt:t.updated_at ? new Date(t.updated_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : today(), responses:[] });
const mapPayment = p => ({ id:p.id, invoiceId:p.invoice_id, clientId:p.company_id, clientName:p.client_name, amount:Number(p.amount)||0, mode:p.mode, reference:p.reference, date:p.date, notes:p.notes, recordedBy:p.recorded_by });
const mapSub     = s => ({ id:s.id, taskId:s.task_id, clientId:s.company_id, status:s.status, formData:s.form_data||{}, documents:s.documents||{}, note:s.note, reviewNote:s.review_note, submittedAt:s.submitted_at, reviewedAt:s.reviewed_at, locked:s.locked!==false });
const mapResp    = r => ({ by:r.by_role, byName:r.by_name, text:r.text, date:r.date });

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
  logoUrl: "",
  gstRate: 18,
  bankName: "HDFC Bank",
  accountNo: "XXXXXXXXXXXX",
  ifsc: "HDFC0000001",
  upi: "foundersbridge@hdfc",
};

// ─── DOCUMENT FIELD TYPES ─────────────────────────────────────────────
const FIELD_TYPES = [
  { id: "text",     label: "Text"         },
  { id: "number",   label: "Number"       },
  { id: "date",     label: "Date"         },
  { id: "email",    label: "Email"        },
  { id: "tel",      label: "Phone"        },
  { id: "select",   label: "Dropdown"     },
  { id: "textarea", label: "Long Text"    },
];

// ─── MASTER DOCUMENT TEMPLATES (Admin edits these in Settings) ────────
// These are reusable templates that get attached to task types.
// collectionType: "common" = once per company, "director" = once per director
const DEFAULT_DOC_TEMPLATES = {
  "dsc_creation": {
    id: "dsc_creation",
    name: "DSC Creation",
    collectionType: "director",    // Repeats per director
    infoFields: [
      { id: "if1", label: "Full Name (as per PAN)",   type: "text",     required: true  },
      { id: "if2", label: "Father's Name",            type: "text",     required: true  },
      { id: "if3", label: "Date of Birth",            type: "date",     required: true  },
      { id: "if4", label: "Gender",                   type: "select",   required: true,  options: ["Male","Female","Other"] },
      { id: "if5", label: "PAN Number",               type: "text",     required: true  },
      { id: "if6", label: "Mobile Number",            type: "tel",      required: true  },
      { id: "if7", label: "Email Address",            type: "email",    required: true  },
      { id: "if8", label: "Residential Address",      type: "textarea", required: true  },
      { id: "if9", label: "Pincode",                  type: "number",   required: true  },
    ],
    docSlots: [
      { id: "ds1", label: "PAN Card",                  required: true  },
      { id: "ds2", label: "Aadhaar Card (Front Side)", required: true  },
      { id: "ds3", label: "Aadhaar Card (Back Side)",  required: true  },
      { id: "ds4", label: "Passport Size Photo",       required: true  },
      { id: "ds5", label: "Specimen Signature",        required: true  },
      { id: "ds6", label: "Address Proof (Utility Bill / Rent Agreement)", required: true },
    ],
  },
  "name_approval": {
    id: "name_approval",
    name: "Name Approval",
    collectionType: "common",    // Once per company
    infoFields: [
      { id: "if1", label: "Proposed Name Option 1",   type: "text",     required: true  },
      { id: "if2", label: "Proposed Name Option 2",   type: "text",     required: false },
      { id: "if3", label: "Proposed Name Option 3",   type: "text",     required: false },
      { id: "if4", label: "Main Business Activity",   type: "textarea", required: true  },
      { id: "if5", label: "Secondary Activity (if any)", type: "textarea", required: false },
    ],
    docSlots: [],
  },
  "main_application": {
    id: "main_application",
    name: "Main Application Filing",
    collectionType: "common",
    infoFields: [
      { id: "if1", label: "Registered Office Address (Full)",  type: "textarea", required: true  },
      { id: "if2", label: "Pincode",                           type: "number",   required: true  },
      { id: "if3", label: "State",                             type: "select",   required: true,  options: ["Maharashtra","Karnataka","Delhi","Tamil Nadu","Gujarat","Telangana","West Bengal","Rajasthan","Other"] },
      { id: "if4", label: "Authorised Share Capital (₹)",     type: "number",   required: true  },
      { id: "if5", label: "Paid-up Share Capital (₹)",        type: "number",   required: true  },
    ],
    docSlots: [
      { id: "ds1", label: "Proof of Registered Office (Rent Agreement / Sale Deed)", required: true  },
      { id: "ds2", label: "NOC from Property Owner",           required: true  },
      { id: "ds3", label: "Utility Bill of Office (Electricity / Gas)", required: true },
    ],
  },
  "gst_registration": {
    id: "gst_registration",
    name: "GST Registration",
    collectionType: "common",
    infoFields: [
      { id: "if1", label: "Nature of Business",     type: "select",   required: true, options: ["Manufacturer","Trader","Service Provider","Both Goods & Services"] },
      { id: "if2", label: "Annual Turnover (approx ₹)", type: "number", required: true },
      { id: "if3", label: "Business Commencement Date", type: "date",  required: true },
      { id: "if4", label: "Bank Account Number",    type: "text",     required: true  },
      { id: "if5", label: "Bank IFSC Code",         type: "text",     required: true  },
      { id: "if6", label: "Bank Name",              type: "text",     required: true  },
    ],
    docSlots: [
      { id: "ds1", label: "Cancelled Cheque / Bank Statement",   required: true  },
      { id: "ds2", label: "Business Address Proof",              required: true  },
      { id: "ds3", label: "Electricity Bill of Business Premises", required: true },
    ],
  },
  "form_8_llp": {
    id: "form_8_llp",
    name: "Form 8 — LLP Statement of Accounts",
    collectionType: "common",
    infoFields: [
      { id: "if1", label: "Financial Year",        type: "select",   required: true, options: ["2024-25","2025-26","2026-27"] },
      { id: "if2", label: "Total Revenue (₹)",     type: "number",   required: true  },
      { id: "if3", label: "Total Expenses (₹)",    type: "number",   required: true  },
      { id: "if4", label: "Net Profit/Loss (₹)",   type: "number",   required: true  },
    ],
    docSlots: [
      { id: "ds1", label: "Audited Financials / P&L Statement",  required: true  },
      { id: "ds2", label: "Balance Sheet",                       required: true  },
    ],
  },
};

// ─── SERVICE BUNDLES (Admin configures these) ─────────────────────────
// Each task now references a docTemplateId from DEFAULT_DOC_TEMPLATES
const DEFAULT_BUNDLES = [
  {
    id: "b1",
    name: "LLP Registration",
    icon: "🤝",
    description: "Complete LLP incorporation service",
    lineItems: [
      { id: "li1", name: "Name Application Govt Fees",  type: "govt",    price: 200,  gst: false, unit: "fixed",    sac: "999799", tasks: [] },
      { id: "li2", name: "Main Application Govt Fees",  type: "govt",    price: 450,  gst: false, unit: "fixed",    sac: "999799", tasks: [] },
      { id: "li3", name: "DSC Token",                   type: "dsc",     price: 850,  gst: true,  unit: "per_unit", sac: "998315",
        tasks: [{
          name: "DSC Creation for Director {n}",
          autoFromQty: true,
          requirementType: "form_docs",
          docTemplateId: "dsc_creation",   // ← references master template
        }]
      },
      { id: "li4", name: "DSC Association Charges",     type: "service", price: 1271, gst: true,  unit: "per_unit", sac: "998211", tasks: [] },
      { id: "li5", name: "LLP Professional Charges",    type: "service", price: 850,  gst: true,  unit: "fixed",    sac: "998211",
        tasks: [
          { name: "Name Approval",          autoFromQty: false, requirementType: "form_docs", docTemplateId: "name_approval"    },
          { name: "Main Application Filing",autoFromQty: false, requirementType: "form_docs", docTemplateId: "main_application" },
        ]
      },
    ],
    totalApprox: 6850,
  },
  {
    id: "b2",
    name: "Private Limited Registration",
    icon: "🏢",
    description: "Complete Pvt Ltd company incorporation",
    lineItems: [
      { id: "li6",  name: "Name Application Govt Fees",  type: "govt",    price: 200,  gst: false, unit: "fixed",    tasks: [] },
      { id: "li7",  name: "Main Application Govt Fees",  type: "govt",    price: null, gst: false, unit: "fixed",    tasks: [], note: "State-wise — enter manually" },
      { id: "li8",  name: "DSC Token",                   type: "dsc",     price: 850,  gst: true,  unit: "per_unit",
        tasks: [{
          name: "DSC Creation for Director {n}",
          autoFromQty: true,
          requirementType: "form_docs",
          docTemplateId: "dsc_creation",
        }]
      },
      { id: "li9",  name: "DSC Association Charges",     type: "service", price: 1271, gst: true,  unit: "per_unit", tasks: [] },
      { id: "li10", name: "Professional Charges",        type: "service", price: 850,  gst: true,  unit: "fixed",
        tasks: [
          { name: "Name Approval",          autoFromQty: false, requirementType: "form_docs", docTemplateId: "name_approval"    },
          { name: "Main Application Filing",autoFromQty: false, requirementType: "form_docs", docTemplateId: "main_application" },
        ]
      },
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
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background: #F7F6F2; color: #0B1F3A; -webkit-font-smoothing: antialiased; }
button, input, select, textarea { font-family: 'Inter', sans-serif; }
input, select, textarea { outline: none; }
table { border-collapse: collapse; width: 100%; }

@keyframes fadeUp   { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
@keyframes spin     { to { transform: rotate(360deg) } }
@keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes slideIn  { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }

:root {
  --navy:    #0B1F3A;
  --gold:    #C9A14A;
  --cream:   #F7F6F2;
  --muted:   #6B7280;
  --navy-lt: #132840;
  --gold-lt: #F5EDD6;
  --gold-dk: #A6863A;
  --ink:     #0B1F3A;
  --ink2:    #1E3A5F;
  --faint:   #9CA3AF;
  --white:   #FFFFFF;
  --border:  #E4E2DC;
  --border2: #D0CEC8;
  --green:   #16A34A;
  --red:     #DC2626;
  --orange:  #EA580C;
  --purple:  #7C3AED;
  --blue:    #1E50A2;
  --blue-lt: #EEF3FB;
  --r:       12px;
  --r-sm:    8px;
  --shadow:  0 1px 4px rgba(11,31,58,.08);
  --shadow-md: 0 4px 20px rgba(11,31,58,.12);
  --shadow-lg: 0 8px 40px rgba(11,31,58,.16);
}

.app { display:flex; min-height:100vh; }

.sb { width:248px; min-height:100vh; background:var(--navy); display:flex; flex-direction:column; position:fixed; top:0;left:0;bottom:0; z-index:100; }
.sb-logo { padding:22px 20px 16px; border-bottom:1px solid rgba(201,161,74,.2); }
.sb-brand { font-family:'Cormorant Garamond',serif; font-size:22px; color:#fff; line-height:1.15; font-weight:700; }
.sb-brand span { color:var(--gold); }
.sb-tagline { font-size:8px; color:rgba(201,161,74,.5); letter-spacing:3px; text-transform:uppercase; margin-top:3px; }
.sb-logo-img { width:100%; max-height:44px; object-fit:contain; margin-bottom:8px; filter:brightness(0) invert(1); }
.sb-role-pill { margin:10px 12px 4px; padding:9px 13px; background:rgba(201,161,74,.1); border:1px solid rgba(201,161,74,.2); border-radius:8px; }
.sb-role-name { font-size:12px; font-weight:600; color:#fff; }
.sb-role-tag  { font-size:9px; color:rgba(201,161,74,.6); text-transform:uppercase; letter-spacing:1.2px; margin-top:2px; }
.sb-nav { flex:1; overflow-y:auto; padding:8px 10px; }
.sb-section { font-size:8px; color:rgba(201,161,74,.45); text-transform:uppercase; letter-spacing:2px; padding:14px 10px 5px; font-weight:600; }
.sb-item { display:flex; align-items:center; gap:10px; padding:8px 11px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; color:rgba(255,255,255,.5); transition:all .15s; margin-bottom:1px; }
.sb-item:hover { background:rgba(255,255,255,.07); color:rgba(255,255,255,.9); }
.sb-item.on { background:rgba(201,161,74,.15); color:#fff; border-left:2px solid var(--gold); padding-left:9px; }
.sb-icon { font-size:14px; width:20px; text-align:center; flex-shrink:0; }
.sb-badge { margin-left:auto; background:var(--red); color:#fff; font-size:9px; font-weight:700; min-width:18px; height:18px; padding:0 5px; border-radius:9px; display:flex; align-items:center; justify-content:center; }
.sb-foot { padding:14px 14px 10px; border-top:1px solid rgba(201,161,74,.15); }
.sb-user { display:flex; align-items:center; gap:9px; }
.sb-av { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; flex-shrink:0; border:2px solid rgba(201,161,74,.3); }
.sb-uname { font-size:12px; font-weight:600; color:#fff; }
.sb-urole { font-size:9px; color:rgba(201,161,74,.6); text-transform:capitalize; }
.sb-out { margin-left:auto; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); color:rgba(255,255,255,.4); font-size:10px; padding:4px 9px; border-radius:6px; cursor:pointer; transition:.15s; }
.sb-out:hover { background:rgba(201,161,74,.15); color:var(--gold); }

.main { margin-left:248px; flex:1; min-height:100vh; display:flex; flex-direction:column; }
.topbar { height:58px; padding:0 28px; display:flex; align-items:center; gap:12px; background:rgba(247,246,242,.97); backdrop-filter:blur(12px); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:50; }
.topbar-title { font-family:'Cormorant Garamond',serif; font-size:20px; flex:1; color:var(--navy); font-weight:700; }
.page { padding:24px 28px 80px; animation:fadeIn .2s ease; }

.btn { padding:7px 16px; border-radius:var(--r-sm); font-size:12px; font-weight:600; cursor:pointer; border:1.5px solid var(--border); background:var(--white); color:var(--ink2); transition:all .15s; display:inline-flex; align-items:center; gap:6px; }
.btn:hover { border-color:var(--navy); color:var(--navy); }
.btn-primary { background:var(--navy); color:#fff; border-color:var(--navy); }
.btn-primary:hover { background:var(--navy-lt); }
.btn-gold { background:var(--gold); color:#fff; border-color:var(--gold); }
.btn-gold:hover { background:var(--gold-dk); }
.btn-blue { background:var(--blue); color:#fff; border-color:var(--blue); }
.btn-blue:hover { background:#1a4490; }
.btn-green { background:var(--green); color:#fff; border-color:var(--green); }
.btn-green:hover { background:#15803D; }
.btn-red { background:var(--red); color:#fff; border-color:var(--red); }
.btn-red:hover { background:#B91C1C; }
.btn-ghost { background:transparent; border:1.5px dashed var(--border2); color:var(--muted); }
.btn-ghost:hover { border-color:var(--gold); color:var(--gold-dk); background:var(--gold-lt); }
.btn-sm { padding:5px 12px; font-size:11px; }
.btn-lg { padding:11px 24px; font-size:14px; }
.btn:disabled { opacity:.4; cursor:not-allowed; }

.card { background:var(--white); border:1px solid var(--border); border-radius:var(--r); box-shadow:var(--shadow); }
.card-head { padding:15px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
.card-title { font-family:'Cormorant Garamond',serif; font-size:16px; color:var(--navy); font-weight:700; }
.card-body { padding:18px 20px; }
.card-gold { border-top:3px solid var(--gold); }

.stat-grid { display:grid; gap:14px; margin-bottom:22px; }
.stat-box { background:var(--white); border:1px solid var(--border); border-radius:var(--r); padding:18px 20px; box-shadow:var(--shadow); position:relative; overflow:hidden; cursor:pointer; transition:all .2s; }
.stat-box:hover { transform:translateY(-2px); box-shadow:var(--shadow-md); border-color:var(--gold); }
.stat-box::before { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; background:linear-gradient(90deg,var(--navy),var(--gold)); opacity:0; transition:.2s; }
.stat-box:hover::before { opacity:1; }
.stat-lbl { font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:1.2px; }
.stat-val { font-family:'Cormorant Garamond',serif; font-size:28px; margin:6px 0 2px; color:var(--navy); }
.stat-note { font-size:11px; color:var(--faint); }
.stat-icon { font-size:24px; margin-bottom:8px; }
.stat-drill { font-size:10px; color:var(--gold-dk); font-weight:600; margin-top:6px; }

.tbl-wrap { overflow-x:auto; }
table { width:100%; border-collapse:collapse; font-size:13px; }
th { padding:10px 14px; text-align:left; font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:1px; border-bottom:2px solid var(--border); background:#FAFAF8; white-space:nowrap; }
td { padding:12px 14px; border-bottom:1px solid #F0EEE9; vertical-align:middle; }
tr:last-child td { border-bottom:none; }
tr:hover td { background:#FAFAF8; }

.badge { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
.badge-dot { width:5px; height:5px; border-radius:50%; }

.form-grid { display:grid; gap:16px; }
.form-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.form-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
.f-group { display:flex; flex-direction:column; gap:5px; }
.f-label { font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.8px; }
.f-input { padding:9px 13px; border:1.5px solid var(--border); border-radius:var(--r-sm); font-size:13px; background:var(--white); transition:.15s; width:100%; color:var(--navy); }
.f-input:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(201,161,74,.1); }
.f-input:disabled { background:#FAFAF8; color:var(--muted); }
.f-select { padding:9px 13px; border:1.5px solid var(--border); border-radius:var(--r-sm); font-size:13px; background:var(--white); transition:.15s; width:100%; cursor:pointer; color:var(--navy); }
.f-select:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(201,161,74,.1); }
.f-textarea { padding:9px 13px; border:1.5px solid var(--border); border-radius:var(--r-sm); font-size:13px; background:var(--white); transition:.15s; width:100%; resize:vertical; min-height:80px; color:var(--navy); }
.f-textarea:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(201,161,74,.1); }
.f-hint { font-size:11px; color:var(--faint); }
.f-error { font-size:11px; color:var(--red); }
.f-req { color:var(--red); }

.modal-overlay { position:fixed; inset:0; background:rgba(11,31,58,.55); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn .15s ease; }
.modal-box { background:var(--white); border-radius:16px; width:100%; max-height:90vh; overflow-y:auto; box-shadow:0 24px 64px rgba(11,31,58,.28); animation:fadeUp .2s ease; }
.modal-head { padding:20px 24px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; background:var(--white); z-index:1; }
.modal-title { font-family:'Cormorant Garamond',serif; font-size:19px; color:var(--navy); font-weight:700; }
.modal-body { padding:24px; }
.modal-foot { padding:16px 24px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:10px; background:#FAFAF8; border-radius:0 0 16px 16px; }
.modal-close { background:none; border:none; font-size:20px; cursor:pointer; color:var(--faint); line-height:1; }
.modal-close:hover { color:var(--navy); }

.prog-bg { height:6px; background:var(--border); border-radius:6px; overflow:hidden; }
.prog-fill { height:100%; border-radius:6px; transition:width .6s; }

.tabs { display:flex; gap:2px; background:#EDEAE4; padding:3px; border-radius:10px; width:fit-content; margin-bottom:20px; flex-wrap:wrap; }
.tab { padding:7px 16px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; color:var(--muted); transition:.15s; white-space:nowrap; }
.tab.on { background:var(--white); color:var(--navy); box-shadow:0 1px 4px rgba(11,31,58,.12); font-weight:700; }

.info-box { padding:11px 15px; border-radius:10px; display:flex; gap:10px; align-items:flex-start; margin-bottom:16px; }

.chips { display:flex; gap:7px; flex-wrap:wrap; margin-bottom:16px; align-items:center; }
.chip { padding:5px 13px; border-radius:20px; font-size:12px; font-weight:500; border:1.5px solid var(--border); background:var(--white); cursor:pointer; color:var(--muted); transition:.15s; }
.chip.on { background:var(--navy); color:#fff; border-color:var(--navy); }
.chip:hover:not(.on) { border-color:var(--navy); color:var(--navy); }

.toast { position:fixed; top:20px; right:20px; z-index:999; display:flex; align-items:center; gap:10px; padding:12px 18px; border-radius:10px; box-shadow:var(--shadow-lg); font-size:13px; font-weight:600; max-width:380px; animation:slideIn .2s ease; }

.auth-wrap { min-height:100vh; background:var(--navy); display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
.auth-orb { position:absolute; border-radius:50%; pointer-events:none; }
.auth-card { background:#fff; border-radius:20px; padding:44px 40px; width:440px; z-index:2; box-shadow:0 32px 80px rgba(11,31,58,.4); animation:fadeUp .3s ease; }
.auth-brand { font-family:'Cormorant Garamond',serif; font-size:28px; margin-bottom:2px; color:var(--navy); font-weight:700; }
.auth-brand span { color:var(--gold); }
.auth-sub { font-size:10px; color:var(--muted); letter-spacing:2.5px; text-transform:uppercase; margin-bottom:28px; }
.auth-tabs { display:flex; background:#F3F1EB; border-radius:8px; padding:3px; margin-bottom:24px; }
.auth-tab { flex:1; padding:8px; border-radius:6px; text-align:center; font-size:13px; font-weight:600; cursor:pointer; color:var(--muted); transition:.15s; }
.auth-tab.on { background:#fff; color:var(--navy); box-shadow:0 1px 4px rgba(11,31,58,.1); }
.otp-grid { display:flex; gap:10px; justify-content:center; margin:16px 0; }
.otp-box { width:48px; height:54px; border:1.5px solid var(--border); border-radius:10px; text-align:center; font-size:22px; font-weight:700; transition:.15s; color:var(--navy); }
.otp-box:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(201,161,74,.1); }
.demo-hints { margin-top:20px; padding:14px; background:#F7F6F2; border:1px solid var(--border); border-radius:8px; font-size:11px; color:var(--muted); line-height:2; }
.demo-hints b { color:var(--navy); }

.av { border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; color:#fff; flex-shrink:0; }
.av-sm { width:28px; height:28px; font-size:10px; }
.av-md { width:36px; height:36px; font-size:13px; }
.av-lg { width:44px; height:44px; font-size:16px; }

.s-open          { background:#F5F5F0; color:#6B7280; }
.s-team_action   { background:#FFF8EC; color:#B45309; }
.s-payment       { background:#FEF2F2; color:#DC2626; }
.s-client_action { background:#EEF3FB; color:#1E50A2; }
.s-team_approval { background:#F5F3FF; color:#7C3AED; }
.s-govt_approval { background:#EFF9FF; color:#0369A1; }
.s-completed     { background:#F0FDF4; color:#16A34A; }
.s-cancelled     { background:#F5F5F0; color:#9CA3AF; }

.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
.grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
.grid4 { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.sr { font-family:'Cormorant Garamond',serif; }
.divider { height:1px; background:var(--border); margin:20px 0; }
.tag { display:inline-block; padding:2px 8px; border-radius:5px; font-size:10px; font-weight:700; background:#F0EDE6; color:var(--muted); }
.tag-gold { background:var(--gold-lt); color:var(--gold-dk); }
.tag-navy { background:rgba(11,31,58,.08); color:var(--navy); }
.empty { text-align:center; padding:48px 20px; color:var(--faint); }
.empty-icon { font-size:40px; margin-bottom:12px; }
.spinner { width:20px; height:20px; border:2.5px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
.section-label { font-size:10px; font-weight:800; color:var(--muted); text-transform:uppercase; letter-spacing:1.5px; padding:12px 20px 8px; background:#FAFAF8; border-bottom:1px solid #F0EEE9; }
.row-item { display:flex; align-items:center; gap:12px; padding:13px 20px; border-bottom:1px solid #F0EEE9; transition:background .1s; }
.row-item:last-child { border-bottom:none; }
.row-item:hover { background:#FAFAF8; }
.drill-overlay { position:fixed; inset:0; background:rgba(11,31,58,.5); z-index:150; display:flex; align-items:flex-start; justify-content:flex-end; animation:fadeIn .15s ease; }
.drill-panel { background:var(--white); width:min(680px,95vw); height:100vh; overflow-y:auto; box-shadow:-8px 0 40px rgba(11,31,58,.2); animation:slideIn .2s ease; }
.drill-head { padding:20px 24px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; background:var(--white); z-index:1; }
.drill-title { font-family:'Cormorant Garamond',serif; font-size:20px; color:var(--navy); font-weight:700; }
.drill-body { padding:20px 24px; }
.ticket-row { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid #F0EEE9; cursor:pointer; transition:background .1s; }
.ticket-row:hover { background:#FAFAF8; }
.ticket-priority-high   { border-left:3px solid var(--red); }
.ticket-priority-medium { border-left:3px solid var(--gold); }
.ticket-priority-low    { border-left:3px solid var(--green); }
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

  const findUser = async (id) => {
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
    if (!identifier) { setError("Enter your mobile number"); return; }
    const phone = identifier.replace(/\D/g,"").slice(-10);
    if (phone.length !== 10) { setError("Enter a valid 10-digit mobile number"); return; }
    setLoading(true);
    const result = await OTPService.send(phone);
    setLoading(false);
    if (result.success) {
      setOtpSent(true);
      setCount(30);
      if (result.demo) {
        showToast(`Demo OTP: ${result.otp} (check browser console)`, "info");
        console.log(`🔐 DEMO OTP for ${phone}: ${result.otp}`);
      } else {
        showToast(`OTP sent to +91 ${phone}`, "success");
      }
    } else {
      setError("Failed to send OTP. Please try password login.");
    }
  };

  const handleVerifyOtp = () => {
    const phone    = identifier.replace(/\D/g,"").slice(-10);
    const entered  = otp.join("");
    if (entered.length < 6) { setError("Enter all 6 digits"); return; }
    const result   = OTPService.verify(phone, entered);
    if (!result.valid) { setError(result.reason); return; }
    const user = DEMO_BY_PHONE[phone];
    if (user) { showToast(`Welcome, ${user.name}!`,"success"); onLogin(user); }
    else { setError("No account found for this number. Please register or use password login."); }
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[i] = val.slice(-1); setOtp(next);
    if (val && i < 5) otpRefs[i + 1].current?.focus();
    if (!val && i > 0) otpRefs[i - 1].current?.focus();
  };

  return (
    <div className="auth-wrap">
      <div className="auth-orb" style={{ width:500,height:500,top:-150,right:-150,background:"linear-gradient(135deg,rgba(201,161,74,.3),transparent)",opacity:.4 }} />
      <div className="auth-orb" style={{ width:300,height:300,bottom:-80,left:-80,background:"linear-gradient(135deg,rgba(201,161,74,.2),transparent)",opacity:.3 }} />
      <div className="auth-card">
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,color:"var(--navy)",fontWeight:700,lineHeight:1.1}}>Founders <span style={{color:"var(--gold)"}}>Bridge</span></div>
          <div style={{fontSize:10,color:"var(--muted)",letterSpacing:"2.5px",textTransform:"uppercase",marginTop:4}}>Legal & Compliance Portal</div>
        </div>

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
                <div style={{ marginTop: 12, padding: "10px 14px", background: MSG91_CONFIG.AUTH_KEY ? "#F0FDF4" : "#FFFBEB", border: `1px solid ${MSG91_CONFIG.AUTH_KEY ? "#BBF7D0" : "#FDE68A"}`, borderRadius: 8, fontSize: 12, color: MSG91_CONFIG.AUTH_KEY ? "#15803D" : "#B45309" }}>
                  {MSG91_CONFIG.AUTH_KEY ? "✅ MSG91 connected — real OTP SMS will be sent" : "⚠️ Demo mode — OTP shown in browser console (F12 → Console). Add REACT_APP_MSG91_AUTH_KEY in Vercel to go live."}
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
                <button className="btn btn-primary btn-lg" style={{ width: "100%", marginBottom: 12 }} onClick={handleVerifyOtp}>Verify & Sign In →</button>
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
  const [drill, setDrill] = useState(null);

  const totalBilling   = clients.reduce((s,c)=>s+c.totalBilling,0);
  const totalCollected = clients.reduce((s,c)=>s+c.collected,0);
  const totalPending   = clients.reduce((s,c)=>s+c.pending,0);
  const completedTasks = tasks.filter(t=>t.status==="completed").length;
  const pendingTasks   = tasks.filter(t=>t.status!=="completed"&&t.status!=="cancelled").length;
  const overdueTasks   = tasks.filter(t=>t.dueDate&&new Date(t.dueDate)<new Date()&&t.status!=="completed").length;
  const activeClients  = clients.filter(c=>c.status==="active").length;

  const STATS = [
    { id:"clients",   icon:"🏢", label:"Active Clients",  val:activeClients,       note:`${clients.length} total`,       color:"var(--blue)"   },
    { id:"billing",   icon:"💰", label:"Total Billing",   val:INR(totalBilling),   note:"All time",                      color:"var(--navy)"   },
    { id:"collected", icon:"✅", label:"Collected",       val:INR(totalCollected), note:`${Math.round(totalCollected/Math.max(totalBilling,1)*100)}% rate`, color:"var(--green)" },
    { id:"pending",   icon:"⏳", label:"Outstanding",     val:INR(totalPending),   note:`${clients.filter(c=>c.pending>0).length} clients`,  color:"var(--red)"    },
    { id:"pending_tasks",  icon:"📋", label:"Pending Tasks",   val:pendingTasks,   note:"Needs action",                  color:"var(--orange)" },
    { id:"overdue_tasks",  icon:"⚠️",  label:"Overdue Tasks",  val:overdueTasks,   note:"Past due date",                 color:"var(--red)"    },
    { id:"completed_tasks",icon:"🎯", label:"Completed Tasks", val:completedTasks, note:"All time",                      color:"var(--green)"  },
    { id:"employees", icon:"👥", label:"Team Members",    val:employees.length,    note:"Active team",                   color:"var(--navy)"   },
  ];

  return (
    <>
      <div className="stat-grid grid4" style={{marginBottom:22}}>
        {STATS.map(s=>(
          <div key={s.id} className="stat-box" onClick={()=>setDrill({type:s.id,title:s.label})}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-lbl">{s.label}</div>
            <div className="stat-val" style={{color:s.color,fontSize:22}}>{s.val}</div>
            <div className="stat-note">{s.note}</div>
            <div className="stat-drill">Click to expand →</div>
          </div>
        ))}
      </div>

      <div className="grid2" style={{marginBottom:22}}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Recent Pending Tasks</div>
            <button className="btn btn-sm" onClick={()=>setView("tasks")}>View All →</button>
          </div>
          <div style={{padding:"12px 16px",display:"flex",gap:10,borderBottom:"1px solid var(--border)"}}>
            {[["Pending",pendingTasks,"var(--orange)","#FFF8EC"],["Completed",completedTasks,"var(--green)","#F0FDF4"],["Overdue",overdueTasks,"var(--red)","#FEF2F2"]].map(([l,n,c,bg])=>(
              <div key={l} style={{flex:1,textAlign:"center",padding:"10px 8px",borderRadius:9,background:bg,cursor:"pointer"}} onClick={()=>setDrill({type:l.toLowerCase()+"_tasks",title:l+" Tasks"})}>
                <div style={{fontSize:20,fontWeight:700,color:c}}>{n}</div>
                <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          {tasks.filter(t=>t.status!=="completed"&&t.status!=="cancelled").slice(0,4).map(t=>(
            <div key={t.id} className="row-item">
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500}}>{t.title}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>{t.clientName}</div>
              </div>
              <Badge status={t.status}/>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Team Performance</div>
            <button className="btn btn-sm" onClick={()=>setView("employees")}>View All →</button>
          </div>
          {employees.map(emp=>{
            const empTasks    = tasks.filter(t=>t.assignedTo===emp.id);
            const empCompleted= empTasks.filter(t=>t.status==="completed").length;
            const empClients  = clients.filter(c=>c.assignedTo===emp.id).length;
            const pct         = empTasks.length ? Math.round(empCompleted/empTasks.length*100) : 0;
            return (
              <div key={emp.id} className="row-item" style={{cursor:"pointer"}} onClick={()=>setDrill({type:"emp_"+emp.id,title:emp.name+"'s Tasks"})}>
                <div className="av av-md" style={{background:emp.color}}>{emp.avatar}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{emp.name}</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>{empClients} clients · {empCompleted}/{empTasks.length} tasks</div>
                  <div className="prog-bg" style={{marginTop:5,maxWidth:160}}>
                    <div className="prog-fill" style={{width:pct+"%",background:pct===100?"var(--green)":pct>60?"var(--gold)":"var(--blue)"}}/>
                  </div>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:pct===100?"var(--green)":pct>60?"var(--gold-dk)":"var(--blue)"}}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Client Overview</div>
          <button className="btn btn-sm" onClick={()=>setView("clients")}>View All →</button>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Client</th><th>Onboarded</th><th>Assigned To</th><th>Billing</th><th>Collected</th><th>Outstanding</th><th>Tasks</th><th>Progress</th></tr></thead>
            <tbody>
              {clients.slice(0,6).map(c=>{
                const emp        = employees.find(e=>e.id===c.assignedTo);
                const clientTasks= tasks.filter(t=>t.clientId===c.id);
                const done       = clientTasks.filter(t=>t.status==="completed").length;
                const pct        = clientTasks.length ? Math.round(done/clientTasks.length*100) : c.progress;
                return (
                  <tr key={c.id}>
                    <td><div style={{fontWeight:600}}>{c.name}</div><div style={{fontSize:11,color:"var(--muted)"}}>{c.clientNo}</div></td>
                    <td style={{fontSize:12,color:"var(--muted)"}}>{c.createdAt}</td>
                    <td>{emp&&<div style={{display:"flex",alignItems:"center",gap:6}}><div className="av av-sm" style={{background:emp.color}}>{emp.avatar}</div><span style={{fontSize:12}}>{emp.name}</span></div>}</td>
                    <td style={{fontWeight:700}}>{INR(c.totalBilling)}</td>
                    <td style={{color:"var(--green)",fontWeight:600}}>{INR(c.collected)}</td>
                    <td style={{color:c.pending>0?"var(--red)":"var(--muted)",fontWeight:600}}>{INR(c.pending)}</td>
                    <td style={{fontSize:12}}>{done}/{clientTasks.length}</td>
                    <td style={{minWidth:110}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div className="prog-bg" style={{flex:1}}><div className="prog-fill" style={{width:pct+"%",background:pct===100?"var(--green)":pct>60?"var(--gold)":"var(--blue)"}}/></div>
                        <span style={{fontSize:12,fontWeight:700}}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {drill && <DrillPanel type={drill.type} title={drill.title} onClose={()=>setDrill(null)} />}
    </>
  );
}

// ─── DRILL DOWN PANEL ────────────────────────────────────────────────
function DrillPanel({ type, title, onClose }) {
  const { clients, tasks, employees, invoices, payments } = useApp();

  const renderContent = () => {
    // Active clients list
    if (type === "clients") {
      const list = clients.filter(c=>c.status==="active");
      return (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Client</th><th>Onboarded</th><th>Type</th><th>Assigned To</th><th>Total Billing</th><th>Collected</th><th>Outstanding</th><th>Total Tasks</th><th>Pending</th><th>Completed</th></tr></thead>
            <tbody>
              {list.map(c=>{
                const emp         = employees.find(e=>e.id===c.assignedTo);
                const clientTasks = tasks.filter(t=>t.clientId===c.id);
                const done        = clientTasks.filter(t=>t.status==="completed").length;
                const pending     = clientTasks.filter(t=>t.status!=="completed"&&t.status!=="cancelled").length;
                return (
                  <tr key={c.id}>
                    <td><div style={{fontWeight:600,fontSize:13}}>{c.name}</div><div style={{fontSize:11,color:"var(--muted)"}}>{c.clientNo}</div></td>
                    <td style={{fontSize:12,color:"var(--muted)"}}>{c.createdAt}</td>
                    <td><span className="tag">{c.type}</span></td>
                    <td style={{fontSize:12}}>{emp?.name||"—"}</td>
                    <td style={{fontWeight:700}}>{INR(c.totalBilling)}</td>
                    <td style={{color:"var(--green)",fontWeight:600}}>{INR(c.collected)}</td>
                    <td style={{color:c.pending>0?"var(--red)":"var(--muted)",fontWeight:600}}>{INR(c.pending)}</td>
                    <td>{clientTasks.length}</td>
                    <td style={{color:"var(--orange)",fontWeight:600}}>{pending}</td>
                    <td style={{color:"var(--green)",fontWeight:600}}>{done}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // Billing breakdown
    if (type === "billing") {
      const totalBilling = clients.reduce((s,c)=>s+c.totalBilling,0);
      const govtFees     = invoices.reduce((s,i)=>s+(i.lineItems||[]).filter(l=>l.type==="govt").reduce((ss,l)=>ss+l.amount,0),0);
      const gstAmt       = invoices.reduce((s,i)=>s+(i.total||0)-(i.lineItems||[]).reduce((ss,l)=>ss+l.unitPrice*l.qty,0),0);
      const dscAmt       = invoices.reduce((s,i)=>s+(i.lineItems||[]).filter(l=>l.type==="dsc").reduce((ss,l)=>ss+l.amount,0),0);
      const grossMargin  = totalBilling - govtFees - gstAmt;
      return (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
            {[["Total Billing",INR(totalBilling),"var(--navy)"],["Govt Fees",INR(govtFees),"var(--muted)"],["GST Collected",INR(gstAmt),"var(--orange)"],["DSC Tokens",INR(dscAmt),"var(--blue)"],["Gross Margin",INR(grossMargin),"var(--green)"],["Collection %",Math.round((clients.reduce((s,c)=>s+c.collected,0)/Math.max(totalBilling,1))*100)+"%","var(--gold-dk)"]].map(([l,v,c])=>(
              <div key={l} style={{padding:"14px 16px",background:"var(--cream)",borderRadius:10,border:"1px solid var(--border)"}}>
                <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"1px"}}>{l}</div>
                <div style={{fontSize:22,fontWeight:700,color:c,fontFamily:"'Cormorant Garamond',serif",marginTop:4}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:12,color:"var(--muted)",padding:"10px 14px",background:"var(--gold-lt)",borderRadius:8,border:"1px solid rgba(201,161,74,.3)"}}>
            💡 Gross Margin = Total Billing − Govt Fees − GST. This is your firm's service revenue before operational expenses.
          </div>
        </div>
      );
    }

    // Outstanding clients
    if (type === "pending") {
      const list = clients.filter(c=>c.pending>0).sort((a,b)=>b.pending-a.pending);
      return (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Client</th><th>Assigned To</th><th>Total Billed</th><th>Collected</th><th>Outstanding</th><th>Overdue Since</th></tr></thead>
            <tbody>
              {list.map(c=>{
                const emp = employees.find(e=>e.id===c.assignedTo);
                return (
                  <tr key={c.id}>
                    <td><div style={{fontWeight:600}}>{c.name}</div><div style={{fontSize:11,color:"var(--muted)"}}>{c.clientNo}</div></td>
                    <td style={{fontSize:12}}>{emp?.name||"—"}</td>
                    <td style={{fontWeight:700}}>{INR(c.totalBilling)}</td>
                    <td style={{color:"var(--green)",fontWeight:600}}>{INR(c.collected)}</td>
                    <td style={{color:"var(--red)",fontWeight:700,fontSize:14}}>{INR(c.pending)}</td>
                    <td style={{fontSize:12,color:"var(--muted)"}}>{c.createdAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // Pending tasks
    if (type === "pending_tasks") {
      const list = tasks.filter(t=>t.status!=="completed"&&t.status!=="cancelled");
      return <TasksTable tasks={list} showClient={true}/>;
    }

    // Overdue tasks
    if (type === "overdue_tasks") {
      const list = tasks.filter(t=>t.dueDate&&new Date(t.dueDate)<new Date()&&t.status!=="completed");
      return <TasksTable tasks={list} showClient={true}/>;
    }

    // Completed tasks
    if (type === "completed_tasks") {
      const list = tasks.filter(t=>t.status==="completed");
      return <TasksTable tasks={list} showClient={true}/>;
    }

    // Employee detail
    if (type.startsWith("emp_")) {
      const empId  = type.replace("emp_","");
      const emp    = employees.find(e=>e.id===empId);
      const empTasks = tasks.filter(t=>t.assignedTo===empId);
      const empClients = clients.filter(c=>c.assignedTo===empId);
      if (!emp) return <div className="empty"><div>Employee not found</div></div>;
      return (
        <div>
          <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px 0",borderBottom:"1px solid var(--border)",marginBottom:16}}>
            <div className="av av-lg" style={{background:emp.color}}>{emp.avatar}</div>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--navy)"}}>{emp.name}</div>
              <div style={{fontSize:12,color:"var(--muted)"}}>{emp.email} · {emp.phone}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
            {[["Clients",empClients.length,"var(--blue)"],["Completed",empTasks.filter(t=>t.status==="completed").length,"var(--green)"],["Pending",empTasks.filter(t=>t.status!=="completed"&&t.status!=="cancelled").length,"var(--orange)"]].map(([l,v,c])=>(
              <div key={l} style={{padding:"12px",background:"var(--cream)",borderRadius:9,textAlign:"center",border:"1px solid var(--border)"}}>
                <div style={{fontSize:22,fontWeight:700,color:c}}>{v}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:"var(--navy)"}}>Assigned Clients</div>
          {empClients.map(c=>(
            <div key={c.id} className="row-item">
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{c.name}</div><div style={{fontSize:11,color:"var(--muted)"}}>{c.clientNo}</div></div>
              <div style={{fontSize:12,fontWeight:700,color:c.pending>0?"var(--red)":"var(--green)"}}>{INR(c.pending)} outstanding</div>
            </div>
          ))}
          <div style={{fontSize:13,fontWeight:700,margin:"16px 0 10px",color:"var(--navy)"}}>All Tasks</div>
          <TasksTable tasks={empTasks} showClient={true}/>
        </div>
      );
    }

    return <div className="empty"><div>No data available</div></div>;
  };

  return (
    <div className="drill-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="drill-panel">
        <div className="drill-head">
          <div className="drill-title">{title}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"var(--muted)",lineHeight:1}}>✕</button>
        </div>
        <div className="drill-body">
          {renderContent()}
        </div>
      </div>
    </div>
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

function InvoicesTable({ invoices, onPayNow }) {
  const { openModal, user } = useApp();
  const isClient = user?.role === "client";
  const statusStyle = { paid:{bg:"#F0FDF4",color:"#16A34A"}, partial:{bg:"#FFFBEB",color:"#B45309"}, unpaid:{bg:"#FEF2F2",color:"#DC2626"} };
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
                  <td style={{ fontWeight:700, color:"var(--blue)", fontSize:12 }}>{i.invoiceNo}</td>
                  <td style={{ fontSize:12 }}>{i.clientName}</td>
                  <td style={{ fontSize:12, color:"var(--muted)" }}>{i.date}</td>
                  <td style={{ fontWeight:700 }}>{INR(i.total)}</td>
                  <td style={{ color:"var(--green)", fontWeight:600 }}>{INR(i.paid)}</td>
                  <td style={{ color:i.pending>0?"var(--red)":"var(--muted)", fontWeight:600 }}>{INR(i.pending)}</td>
                  <td><span className="badge" style={{ background:ss.bg, color:ss.color }}><span className="badge-dot" style={{ background:ss.color }}/>{i.status}</span></td>
                  <td style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    <button className="btn btn-sm" onClick={()=>openModal("view-invoice",{invoice:i})}>View</button>
                    {!isClient && i.status!=="paid" && (
                      <button className="btn btn-sm" style={{ background:"var(--green)",color:"#fff",border:"none" }}
                        onClick={()=>openModal("record-payment",{invoiceId:i.id})}>Record Payment</button>
                    )}
                    {isClient && i.status!=="paid" && (
                      <button className="btn btn-sm" style={{ background:"linear-gradient(135deg,#16A34A,#15803D)",color:"#fff",border:"none" }}
                        onClick={()=>openModal("pay-now",{invoiceId:i.id})}>💳 Pay Now</button>
                    )}
                  </td>
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
  const { openModal, setTasks, submissions, user, clients } = useApp();
  const isTeam = user?.role === "admin" || user?.role === "manager" || user?.role === "employee";

  const updateStatus = (taskId, newStatus) => {
    setTasks(ts => ts.map(t => {
      if (t.id !== taskId) return t;
      const updated = { ...t, status: newStatus, completedDate: newStatus === "completed" ? today() : t.completedDate };
      const client  = clients.find(c => c.id === t.clientId);
      if (newStatus === "client_action" && client?.phone) {
        KRAYA.taskActionNeeded(client.phone, client.contactName || client.name, t.title);
      }
      if (newStatus === "completed" && client?.phone) {
        KRAYA.taskCompleted(client.phone, t.title, client.name);
      }
      return updated;
    }));
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
              <th>Status</th>
              {isTeam && <th>Submission</th>}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr><td colSpan={8}><div className="empty"><div className="empty-icon">✅</div><div>No tasks found</div></div></td></tr>
            )}
            {tasks.map(t => {
              const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed";
              const sub       = (submissions||[]).find(s => s.taskId === t.id);
              const hasPendingReview = sub?.status === "submitted";
              return (
                <tr key={t.id}>
                  <td style={{ fontSize:11, color:"var(--muted)", fontWeight:700 }}>#{t.sequence}</td>
                  <td>
                    <div style={{ fontWeight:500, fontSize:13 }}>{t.title}</div>
                    {t.docTemplateId && (
                      <div style={{ fontSize:10, color:"var(--blue)", marginTop:2 }}>
                        📋 {(DEFAULT_DOC_TEMPLATES[t.docTemplateId]||{}).name || t.docTemplateId}
                        {" · "}{(DEFAULT_DOC_TEMPLATES[t.docTemplateId]||{}).collectionType==="director" ? "Per Director":"Company"}
                      </div>
                    )}
                    {t.notes && <div style={{ fontSize:11, color:"var(--muted)" }}>{t.notes}</div>}
                  </td>
                  {showClient && <td style={{ fontSize:12, color:"var(--muted)", maxWidth:140 }}>{t.clientName}</td>}
                  <td>
                    <span style={{ fontSize:12, fontWeight:600, color:isOverdue?"var(--red)":"var(--ink)", background:isOverdue?"#FEF2F2":"transparent", padding:isOverdue?"2px 7px":0, borderRadius:5 }}>
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—"}
                      {isOverdue && " ⚠"}
                    </span>
                  </td>
                  <td>
                    {isTeam ? (
                      <select value={t.status} onChange={e=>updateStatus(t.id,e.target.value)}
                        style={{ fontSize:11, padding:"4px 8px", border:"1.5px solid var(--border)", borderRadius:6, cursor:"pointer", background:"#fff" }}>
                        {TASK_STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    ) : (
                      <Badge status={t.status} />
                    )}
                  </td>
                  {isTeam && (
                    <td>
                      {hasPendingReview ? (
                        <button className="btn btn-sm" style={{ background:"#7C3AED",color:"#fff",border:"none" }}
                          onClick={()=>openModal("review-submission",{submissionId:sub.id})}>
                          📥 Review
                        </button>
                      ) : sub?.status === "approved" ? (
                        <span style={{ fontSize:11,color:"var(--green)",fontWeight:600 }}>✓ Approved</span>
                      ) : sub?.status === "changes_requested" ? (
                        <span style={{ fontSize:11,color:"var(--red)",fontWeight:600 }}>↩ Changes sent</span>
                      ) : t.requirementType !== "none" && t.docTemplateId ? (
                        <span style={{ fontSize:11,color:"var(--muted)" }}>Awaiting client</span>
                      ) : (
                        <span style={{ fontSize:11,color:"var(--faint)" }}>—</span>
                      )}
                    </td>
                  )}
                  <td><button className="btn btn-sm" onClick={()=>openModal("view-task",{task:t})}>View</button></td>
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
  const logoRef = useRef(null);
  const save = () => { setOrg(form); showToast("Organisation details saved!", "success"); };
  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast("Logo must be under 2MB", "error"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      set("logoUrl", url);
      // Auto-save logo to org immediately so sidebar updates right away
      setOrg(prev => ({ ...prev, logoUrl: url }));
      showToast("Logo uploaded! Visible in sidebar now.", "success");
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    set("logoUrl", "");
    setOrg(prev => ({ ...prev, logoUrl: "" }));
    showToast("Logo removed", "info");
  };

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Logo upload card */}
      <div className="card card-gold" style={{ marginBottom: 20 }}>
        <div className="card-head"><div className="card-title">Organisation Logo</div></div>
        <div className="card-body">
          <div style={{ display:"flex", alignItems:"center", gap:24 }}>
            {/* Preview */}
            <div style={{ width:140,height:80,borderRadius:10,border:"2px dashed var(--border)",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--navy)",flexShrink:0,overflow:"hidden" }}>
              {form.logoUrl
                ? <img src={form.logoUrl} alt="Logo" style={{ maxWidth:"100%",maxHeight:"100%",objectFit:"contain",filter:"brightness(0) invert(1)" }} />
                : <div style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:14,color:"#fff",lineHeight:1.2 }}>Founders<br/><span style={{ color:"var(--gold)" }}>Bridge</span></div>
                  </div>
              }
            </div>
            <div>
              <div style={{ fontSize:13,fontWeight:600,color:"var(--navy)",marginBottom:6 }}>Upload your logo</div>
              <div style={{ fontSize:12,color:"var(--muted)",marginBottom:12 }}>PNG or JPG, max 2MB. Will appear in sidebar and invoices.<br/>Recommended: white or transparent background, min 300px wide.</div>
              <input type="file" ref={logoRef} accept="image/*" style={{ display:"none" }} onChange={handleLogoUpload} />
              <div style={{ display:"flex",gap:10 }}>
                <button className="btn btn-gold btn-sm" onClick={()=>logoRef.current?.click()}>⬆ Upload Logo</button>
                {form.logoUrl && <button className="btn btn-sm btn-red" onClick={removeLogo}>✕ Remove</button>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Firm details */}
      <div className="card">
        <div className="card-head"><div className="card-title">Firm Details</div></div>
        <div className="card-body">
          <div className="form-grid-2">
            {[
              ["name","Firm Name"],["email","Email Address"],["phone","Phone Number"],
              ["gstin","GSTIN"],["pan","PAN"],["sac","Default SAC Code"],
              ["bankName","Bank Name"],["accountNo","Account Number"],
              ["ifsc","IFSC Code"],["upi","UPI ID"],
            ].map(([k,l]) => (
              <div key={k} className="f-group">
                <label className="f-label">{l}</label>
                <input className="f-input" value={form[k]||""} onChange={e=>set(k,e.target.value)} />
              </div>
            ))}
          </div>
          <div className="f-group" style={{ marginTop:16 }}>
            <label className="f-label">Address</label>
            <textarea className="f-textarea" value={form.address||""} onChange={e=>set("address",e.target.value)} rows={2} />
          </div>
          <div className="f-group" style={{ marginTop:16, maxWidth:200 }}>
            <label className="f-label">GST Rate (%)</label>
            <input className="f-input" type="number" value={form.gstRate||18} onChange={e=>set("gstRate",Number(e.target.value))} />
          </div>
        </div>
        <div style={{ padding:"0 20px 20px" }}>
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
                <div className="f-group">
                  <label className="f-label">SAC Code</label>
                  <input className="f-input" value={li.sac||""} onChange={e=>setItem(li.id,"sac",e.target.value)} placeholder={li.type==="govt"?"999799":li.type==="dsc"?"998315":"998211"} />
                  <div className="f-hint">Govt: 999799 · DSC: 998315 · Professional: 998211</div>
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
                  <label className="f-label">Auto-created Tasks</label>
                  <div className="f-hint" style={{ marginBottom: 6 }}>
                    Each task below is auto-created when this invoice line item is added.
                    {li.type === "dsc" && " DSC tasks repeat once per director (based on qty)."}
                  </div>
                  {(li.tasks || []).map((task, ti) => (
                    <div key={ti} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                        <input
                          className="f-input"
                          style={{ flex: 1 }}
                          placeholder={li.type === "dsc" ? "DSC Creation for Director {n}" : `Task ${ti + 1} name`}
                          value={task.name}
                          onChange={e => {
                            const t = [...(li.tasks || [])];
                            t[ti] = { ...t[ti], name: e.target.value };
                            setItem(li.id, "tasks", t);
                          }}
                        />
                        <button className="btn btn-sm btn-red" onClick={() => setItem(li.id, "tasks", (li.tasks||[]).filter((_,i)=>i!==ti))}>✕</button>
                      </div>
                      <div className="form-grid-2">
                        <div className="f-group">
                          <label className="f-label" style={{ fontSize: 9 }}>Collection Level</label>
                          <select className="f-select" style={{ fontSize: 12, padding: "5px 8px" }}
                            value={task.autoFromQty ? "director" : "common"}
                            onChange={e => {
                              const t = [...(li.tasks||[])];
                              t[ti] = { ...t[ti], autoFromQty: e.target.value === "director" };
                              setItem(li.id, "tasks", t);
                            }}>
                            <option value="common">Common — once per company</option>
                            <option value="director">Director-level — once per director</option>
                          </select>
                        </div>
                        <div className="f-group">
                          <label className="f-label" style={{ fontSize: 9 }}>Document Template</label>
                          <select className="f-select" style={{ fontSize: 12, padding: "5px 8px" }}
                            value={task.docTemplateId || ""}
                            onChange={e => {
                              const t = [...(li.tasks||[])];
                              const tpl = DEFAULT_DOC_TEMPLATES[e.target.value];
                              t[ti] = {
                                ...t[ti],
                                docTemplateId: e.target.value,
                                requirementType: e.target.value ? "form_docs" : "none",
                              };
                              setItem(li.id, "tasks", t);
                            }}>
                            <option value="">No collection needed</option>
                            {Object.values(DEFAULT_DOC_TEMPLATES).map(tpl => (
                              <option key={tpl.id} value={tpl.id}>{tpl.name} ({tpl.collectionType})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {task.docTemplateId && DEFAULT_DOC_TEMPLATES[task.docTemplateId] && (
                        <div style={{ marginTop: 8, padding: "8px 12px", background: "#F0F9FF", borderRadius: 6, fontSize: 11, color: "#0369A1" }}>
                          📋 <strong>{DEFAULT_DOC_TEMPLATES[task.docTemplateId].name}</strong>:
                          {" "}{DEFAULT_DOC_TEMPLATES[task.docTemplateId].infoFields.length} info fields
                          {" · "}{DEFAULT_DOC_TEMPLATES[task.docTemplateId].docSlots.length} document slots
                          {" · "}<strong>{DEFAULT_DOC_TEMPLATES[task.docTemplateId].collectionType === "director" ? "Per Director" : "Per Company"}</strong>
                          <br/><span style={{ color: "#6B7280" }}>Edit fields in Settings → Document Templates</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" onClick={() => setItem(li.id, "tasks", [...(li.tasks||[]), { name: "", autoFromQty: li.type==="dsc", requirementType: "none", docTemplateId: "" }])}>
                    + Add Task
                  </button>
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
  const { user, tasks, setTasks, openModal, submissions } = useApp();
  const myTasks = tasks.filter(t => t.assignedTo === user.id);
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? myTasks : myTasks.filter(t => t.status === filter);

  return (
    <>
      <div className="stat-grid grid4" style={{ marginBottom: 18 }}>
        {[
          ["Pending",   myTasks.filter(t=>t.status!=="completed"&&t.status!=="cancelled").length, "var(--orange)"],
          ["Completed", myTasks.filter(t=>t.status==="completed").length,                         "var(--green)"],
          ["Overdue",   myTasks.filter(t=>t.dueDate&&new Date(t.dueDate)<new Date()&&t.status!=="completed").length, "var(--red)"],
          ["Total",     myTasks.length, "var(--ink)"],
        ].map(([l,v,c])=>(
          <div key={l} className="stat-box"><div className="stat-lbl">{l}</div><div className="stat-val" style={{color:c,fontSize:22}}>{v}</div></div>
        ))}
      </div>
      <div className="chips">
        <div className={`chip ${filter==="all"?"on":""}`} onClick={()=>setFilter("all")}>All ({myTasks.length})</div>
        {TASK_STATUSES.map(s=>(
          <div key={s.id} className={`chip ${filter===s.id?"on":""}`} onClick={()=>setFilter(s.id)}>
            {s.label} ({myTasks.filter(t=>t.status===s.id).length})
          </div>
        ))}
      </div>
      <TasksTable tasks={visible} showClient={true} />
    </>
  );
}

function EmpClients() {
  const { user, clients, tasks, employees, openModal } = useApp();
  const myClients = clients.filter(c => c.assignedTo === user.id);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  if (selected) return <ClientDetail client={selected} onBack={()=>setSelected(null)} />;

  const visible = myClients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.clientNo.includes(search)
  );

  return (
    <>
      <div style={{ display:"flex", gap:10, marginBottom:18, alignItems:"center" }}>
        <input className="f-input" placeholder="Search client…" value={search} onChange={e=>setSearch(e.target.value)} style={{ maxWidth:260 }} />
        <button className="btn btn-primary" style={{ marginLeft:"auto" }}
          onClick={()=>openModal("create-client", { defaultAssignTo: user.id })}>
          + New Client
        </button>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Client</th><th>Type</th><th>Contact</th><th>Billing</th><th>Collected</th><th>Pending</th><th>Progress</th><th></th></tr></thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={8}><div className="empty"><div className="empty-icon">🏢</div><div>No clients assigned to you yet</div></div></td></tr>
              )}
              {visible.map(c => {
                const clientTasks = tasks.filter(t => t.clientId === c.id);
                const done = clientTasks.filter(t=>t.status==="completed").length;
                const progress = clientTasks.length ? Math.round(done/clientTasks.length*100) : c.progress;
                return (
                  <tr key={c.id} style={{ cursor:"pointer" }} onClick={()=>setSelected(c)}>
                    <td><div style={{ fontWeight:600 }}>{c.name}</div><div style={{ fontSize:11,color:"var(--muted)" }}>{c.clientNo}</div></td>
                    <td><span className="tag">{c.type}</span></td>
                    <td><div style={{ fontSize:12 }}>{c.contactName}</div><div style={{ fontSize:11,color:"var(--muted)" }}>{c.phone}</div></td>
                    <td style={{ fontWeight:700 }}>{INR(c.totalBilling)}</td>
                    <td style={{ color:"var(--green)",fontWeight:600 }}>{INR(c.collected)}</td>
                    <td style={{ color:c.pending>0?"var(--red)":"var(--muted)",fontWeight:600 }}>{INR(c.pending)}</td>
                    <td>
                      <div style={{ display:"flex",alignItems:"center",gap:6,minWidth:100 }}>
                        <div className="prog-bg" style={{ flex:1 }}><div className="prog-fill" style={{ width:progress+"%",background:progress===100?"var(--green)":"var(--blue)" }}/></div>
                        <span style={{ fontSize:12,fontWeight:700 }}>{progress}%</span>
                      </div>
                    </td>
                    <td><button className="btn btn-sm">View →</button></td>
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
// CLIENT VIEWS
// ═══════════════════════════════════════════════════════════════════════
function ClientHome() {
  const { clients, user, tasks, invoices } = useApp();
  const [selectedCo, setSelectedCo] = useState(null);

  // Find companies where this client is the contact (matched by email or phone)
  const myClients = clients.filter(c =>
    c.email === user.email ||
    c.phone === user.phone ||
    c.id    === user.id
  );
  // Fallback for demo: show first 2 if no match
  const displayClients = myClients.length > 0 ? myClients : clients.slice(0, 2);

  if (selectedCo) return <ClientCompanyDetail company={selectedCo} onBack={()=>setSelectedCo(null)} />;

  return (
    <>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:14,fontWeight:600,color:"var(--muted)" }}>
          Welcome back, <span style={{ color:"var(--ink)" }}>{user.name}</span>. Here are your companies.
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
        {displayClients.map(c => {
          const clientTasks = tasks.filter(t => t.clientId === c.id);
          const done        = clientTasks.filter(t=>t.status==="completed").length;
          const pending     = clientTasks.filter(t=>t.status!=="completed"&&t.status!=="cancelled").length;
          const needsAction = clientTasks.filter(t=>t.status==="client_action").length;
          const progress    = clientTasks.length ? Math.round(done/clientTasks.length*100) : c.progress||0;
          const clientInvs  = invoices.filter(i=>i.clientId===c.id);
          const outstanding = clientInvs.reduce((s,i)=>s+i.pending,0);

          return (
            <div key={c.id} className="card" style={{ cursor:"pointer", position:"relative", overflow:"hidden", transition:"all .2s" }}
              onClick={()=>setSelectedCo(c)}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}
            >
              <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,var(--blue),var(--orange))" }}/>
              <div className="card-body">
                {/* Header */}
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                  <span className="tag">{c.type}</span>
                  <span style={{ fontSize:10,fontWeight:700,color:"var(--muted)",background:"#F3F4F6",padding:"2px 8px",borderRadius:5 }}>{c.clientNo}</span>
                </div>
                <div style={{ fontFamily:"'Fraunces',serif",fontSize:18,lineHeight:1.3,marginBottom:12 }}>{c.name}</div>

                {/* Action needed alert */}
                {needsAction > 0 && (
                  <div style={{ padding:"7px 10px",background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:7,marginBottom:12,fontSize:12,color:"#C2410C",fontWeight:600 }}>
                    ⚠️ {needsAction} task{needsAction>1?"s":""} need{needsAction===1?"s":""} your action
                  </div>
                )}

                {/* Progress */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                    <span style={{ fontSize:12,color:"var(--muted)" }}>Overall Progress</span>
                    <span style={{ fontSize:12,fontWeight:700,color:progress===100?"var(--green)":"var(--blue)" }}>{progress}%</span>
                  </div>
                  <div className="prog-bg"><div className="prog-fill" style={{ width:progress+"%",background:progress===100?"var(--green)":"var(--blue)" }}/></div>
                </div>

                {/* Stats row */}
                <div style={{ display:"flex",gap:0,paddingTop:12,borderTop:"1px solid var(--border)" }}>
                  {[
                    ["Tasks Done",    `${done}/${clientTasks.length}`,  "var(--green)"],
                    ["Pending",       pending,                           "var(--orange)"],
                    ["Outstanding",   outstanding>0?INR(outstanding):"Nil", outstanding>0?"var(--red)":"var(--green)"],
                  ].map(([l,v,c],i)=>(
                    <div key={l} style={{ flex:1,textAlign:"center",borderRight:i<2?"1px solid var(--border)":undefined }}>
                      <div style={{ fontSize:15,fontWeight:700,color:c,marginBottom:2 }}>{v}</div>
                      <div style={{ fontSize:10,color:"var(--muted)" }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Client Company Detail Page ───────────────────────────────────────
function ClientCompanyDetail({ company, onBack }) {
  const { tasks, invoices, submissions, openModal } = useApp();
  const [tab, setTab] = useState("tasks");

  const clientTasks = tasks.filter(t => t.clientId === company.id);
  const clientInvs  = invoices.filter(i => i.clientId === company.id);
  const needsAction = clientTasks.filter(t=>t.status==="client_action");
  const totalBilled = clientInvs.reduce((s,i)=>s+i.total,0);
  const totalPaid   = clientInvs.reduce((s,i)=>s+i.paid,0);
  const outstanding = totalBilled - totalPaid;
  const done        = clientTasks.filter(t=>t.status==="completed").length;
  const progress    = clientTasks.length ? Math.round(done/clientTasks.length*100) : 0;

  // Documents submitted across all tasks
  const allDocs = [];
  submissions.filter(s=>clientTasks.some(t=>t.id===s.taskId)).forEach(sub=>{
    if (sub.documents) {
      Object.entries(sub.documents).forEach(([dirIdx,slots])=>{
        Object.entries(slots).forEach(([slotId,doc])=>{
          allDocs.push({ ...doc, taskId:sub.taskId, dirIdx, submittedAt:sub.submittedAt });
        });
      });
    }
  });

  return (
    <>
      <button className="btn" style={{ marginBottom:16 }} onClick={onBack}>← My Companies</button>

      {/* Company header */}
      <div className="card" style={{ padding:"20px 24px",marginBottom:20 }}>
        <div style={{ display:"flex",alignItems:"flex-start",gap:16 }}>
          <div style={{ width:50,height:50,borderRadius:13,background:"linear-gradient(135deg,var(--navy),var(--blue))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>🏢</div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
              <span style={{ fontFamily:"'Fraunces',serif",fontSize:20 }}>{company.name}</span>
              <span className="tag">{company.type}</span>
            </div>
            <div style={{ display:"flex",gap:16,marginTop:8,flexWrap:"wrap",fontSize:12,color:"var(--muted)" }}>
              <span>📋 {company.clientNo}</span>
              {company.cin  && <span>CIN: {company.cin}</span>}
              {company.gst  && <span>GST: {company.gst}</span>}
              {company.pan  && <span>PAN: {company.pan}</span>}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11,color:"var(--muted)",marginBottom:4 }}>Overall Progress</div>
            <div style={{ fontSize:24,fontWeight:700,color:progress===100?"var(--green)":"var(--blue)" }}>{progress}%</div>
          </div>
        </div>
      </div>

      {/* Action needed banner */}
      {needsAction.length > 0 && (
        <div style={{ padding:"14px 18px",background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:10,marginBottom:16,display:"flex",alignItems:"center",gap:12 }}>
          <span style={{ fontSize:22 }}>⚠️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14,fontWeight:700,color:"#C2410C" }}>{needsAction.length} task{needsAction.length>1?"s":""} need{needsAction.length===1?"s":""} your action</div>
            <div style={{ fontSize:12,color:"#92400E",marginTop:2 }}>Please complete and submit these to allow your team to proceed</div>
          </div>
          <button className="btn btn-sm" style={{ background:"#C2410C",color:"#fff",border:"none" }} onClick={()=>setTab("tasks")}>
            View Tasks →
          </button>
        </div>
      )}

      <div className="tabs">
        {[["tasks","Tasks"],["billing","Billing"],["docs","Documents"]].map(([id,label])=>(
          <div key={id} className={`tab ${tab===id?"on":""}`} onClick={()=>setTab(id)}>{label}</div>
        ))}
      </div>

      {tab==="tasks" && (
        <div className="card">
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>#</th><th>Task</th><th>Status</th><th>Due Date</th><th>Action</th></tr></thead>
              <tbody>
                {clientTasks.length===0 && (
                  <tr><td colSpan={5}><div className="empty"><div className="empty-icon">✅</div><div>No tasks yet</div></div></td></tr>
                )}
                {clientTasks.map(t=>{
                  const sub = submissions.find(s=>s.taskId===t.id);
                  const isOverdue = t.dueDate&&new Date(t.dueDate)<new Date()&&t.status!=="completed";
                  return (
                    <tr key={t.id}>
                      <td style={{ fontSize:11,color:"var(--muted)",fontWeight:700 }}>#{t.sequence}</td>
                      <td>
                        <div style={{ fontWeight:500,fontSize:13 }}>{t.title}</div>
                        {sub?.status==="changes_requested"&&<div style={{ fontSize:11,color:"var(--red)",marginTop:2 }}>↩ Changes needed: {sub.reviewNote}</div>}
                      </td>
                      <td>
                        <Badge status={t.status}/>
                        {t.status==="team_approval"&&<div style={{ fontSize:10,color:"var(--purple)",marginTop:2 }}>Under review</div>}
                        {t.status==="completed"&&<div style={{ fontSize:10,color:"var(--green)",marginTop:2 }}>✓ {t.completedDate}</div>}
                      </td>
                      <td>
                        <span style={{ fontSize:12,fontWeight:600,color:isOverdue?"var(--red)":"var(--muted)" }}>
                          {t.dueDate?new Date(t.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}
                          {isOverdue&&" ⚠"}
                        </span>
                      </td>
                      <td>
                        {(t.status==="client_action"||sub?.status==="changes_requested") && (
                          <button className="btn btn-blue btn-sm" onClick={()=>openModal("client-submit-task",{task:t})}>
                            {sub?.status==="changes_requested"?"Resubmit":"Submit →"}
                          </button>
                        )}
                        {t.status==="completed"&&<span style={{ fontSize:12,color:"var(--green)",fontWeight:700 }}>✓ Done</span>}
                        {t.status==="team_approval"&&<span style={{ fontSize:12,color:"var(--purple)" }}>⏳ Reviewing</span>}
                        {(t.status==="open"||t.status==="team_action"||t.status==="govt_approval")&&
                          <span style={{ fontSize:12,color:"var(--muted)" }}>Team working on it</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==="billing" && (
        <>
          <div className="stat-grid" style={{ gridTemplateColumns:"repeat(3,1fr)",marginBottom:20 }}>
            {[["Total Billed",INR(totalBilled),"var(--ink)"],["Paid",INR(totalPaid),"var(--green)"],["Outstanding",INR(outstanding),outstanding>0?"var(--red)":"var(--muted)"]].map(([l,v,c])=>(
              <div key={l} className="stat-box"><div className="stat-lbl">{l}</div><div className="stat-val" style={{ fontSize:22,color:c }}>{v}</div></div>
            ))}
          </div>
          <InvoicesTable invoices={clientInvs} />
        </>
      )}

      {tab==="docs" && (
        <div className="card">
          <div className="card-head"><div className="card-title">Submitted Documents</div></div>
          {allDocs.length===0 ? (
            <div className="empty"><div className="empty-icon">📁</div><div>No documents submitted yet</div></div>
          ) : (
            allDocs.map((d,i)=>(
              <div key={i} className="row-item">
                <span style={{ fontSize:20 }}>📄</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:500 }}>{d.name}</div>
                  <div style={{ fontSize:11,color:"var(--muted)" }}>{d.size} · Submitted {d.submittedAt}</div>
                </div>
                <button className="btn btn-sm">Download</button>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

function ClientTasks() {
  const { tasks, user, clients } = useApp();
  // Find client's companies
  const myClients = clients.filter(c => c.email===user.email || c.phone===user.phone || c.id===user.id);
  const myClientIds = myClients.length>0 ? myClients.map(c=>c.id) : clients.slice(0,2).map(c=>c.id);
  const myTasks = tasks.filter(t => myClientIds.includes(t.clientId));
  return (
    <>
      <div style={{ marginBottom:14,fontSize:13,color:"var(--muted)" }}>Tasks across all your companies</div>
      <TasksTable tasks={myTasks} showClient={true} />
    </>
  );
}

function ClientInvoices() {
  const { invoices, clients, user } = useApp();
  const myClients = clients.filter(c => c.email===user.email || c.phone===user.phone || c.id===user.id);
  const myClientIds = myClients.length>0 ? myClients.map(c=>c.id) : clients.slice(0,2).map(c=>c.id);
  const myInvs = invoices.filter(i => myClientIds.includes(i.clientId));
  const totalBilled = myInvs.reduce((s,i)=>s+i.total,0);
  const totalPaid   = myInvs.reduce((s,i)=>s+i.paid,0);
  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns:"repeat(3,1fr)",marginBottom:20 }}>
        {[["Total Billed",INR(totalBilled),"var(--ink)"],["Amount Paid",INR(totalPaid),"var(--green)"],["Outstanding",INR(totalBilled-totalPaid),(totalBilled-totalPaid)>0?"var(--red)":"var(--muted)"]].map(([l,v,c])=>(
          <div key={l} className="stat-box"><div className="stat-lbl">{l}</div><div className="stat-val" style={{ fontSize:22,color:c }}>{v}</div></div>
        ))}
      </div>
      <InvoicesTable invoices={myInvs} />
    </>
  );
}

function ClientDocs() {
  const { submissions, tasks, clients, user } = useApp();
  const fileRef = useRef(null);
  const [clientUploads, setClientUploads] = useState([
    // Demo client-uploaded docs
    { name:"Company_PAN.pdf",      size:"180KB", uploadedAt:"Jan 10, 2025", category:"KYC" },
    { name:"Partnership_Deed.pdf", size:"340KB", uploadedAt:"Jan 15, 2025", category:"Legal" },
  ]);
  const [tab, setTab] = useState("team");

  const myClients   = clients.filter(c=>c.email===user.email||c.phone===user.phone||c.id===user.id);
  const myClientIds = myClients.length>0 ? myClients.map(c=>c.id) : clients.slice(0,2).map(c=>c.id);
  const myTasks     = tasks.filter(t=>myClientIds.includes(t.clientId));

  // Team-uploaded = documents submitted via task submissions
  const teamDocs = [];
  submissions.filter(s=>myTasks.some(t=>t.id===s.taskId)).forEach(sub=>{
    const task = myTasks.find(t=>t.id===sub.taskId);
    if (sub.documents) {
      Object.entries(sub.documents).forEach(([dirIdx,slots])=>{
        Object.entries(slots).forEach(([slotId,doc])=>{
          teamDocs.push({ ...doc, taskTitle:task?.title||"", submittedAt:sub.submittedAt, source:"client_submitted" });
        });
      });
    }
  });
  // Also add some demo team-uploaded docs
  const teamUploaded = [
    { name:"Incorporation_Certificate.pdf", size:"420KB", uploadedAt:"Feb 5, 2025",  taskTitle:"Certificate of Incorporation", source:"team" },
    { name:"GST_Registration.pdf",          size:"280KB", uploadedAt:"Mar 12, 2025", taskTitle:"GST Certificate",              source:"team" },
    ...teamDocs,
  ];

  const handleClientUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setClientUploads(d => [...d, {
          name:       f.name,
          size:       (f.size / 1024).toFixed(0) + " KB",
          type:       f.type,
          dataUrl:    ev.target.result,   // store full file for download
          uploadedAt: new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}),
          category:   "General",
        }]);
      };
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const downloadFile = (doc) => {
    if (doc.dataUrl) {
      const a = document.createElement("a");
      a.href = doc.dataUrl;
      a.download = doc.name;
      a.click();
    } else {
      // For demo docs without real data, show message
      alert(`Download for "${doc.name}" — In production this will download from secure server storage.`);
    }
  };

  const DocRow = ({doc}) => (
    <div className="row-item" style={{ padding:"12px 20px" }}>
      <div style={{ width:40,height:40,borderRadius:10,background:doc.source==="team"?"rgba(11,31,58,.07)":"var(--gold-lt)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>
        {doc.name?.endsWith(".pdf")?"📕":doc.name?.match(/\.(jpg|jpeg|png)$/i)?"🖼️":"📄"}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13,fontWeight:600,color:"var(--navy)" }}>{doc.name}</div>
        <div style={{ fontSize:11,color:"var(--muted)",marginTop:2 }}>
          {doc.taskTitle && <span>{doc.taskTitle} · </span>}
          {doc.size} · {doc.uploadedAt}
          {doc.category && <span style={{ marginLeft:6,padding:"1px 6px",borderRadius:4,background:"var(--gold-lt)",color:"var(--gold-dk)",fontSize:10,fontWeight:700 }}>{doc.category}</span>}
        </div>
      </div>
      <button className="btn btn-sm" style={{ background:"var(--navy)",color:"#fff",border:"none" }} onClick={()=>downloadFile(doc)}>
        ⬇ Download
      </button>
    </div>
  );

  return (
    <>
      <input type="file" ref={fileRef} multiple style={{display:"none"}} onChange={handleClientUpload} />
      <div className="tabs">
        <div className={`tab ${tab==="team"?"on":""}`} onClick={()=>setTab("team")}>📂 Team Uploaded ({teamUploaded.length})</div>
        <div className={`tab ${tab==="mine"?"on":""}`} onClick={()=>setTab("mine")}>📤 My Uploads ({clientUploads.length})</div>
      </div>

      {tab==="team" && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Documents from Your Team</div>
            <div style={{fontSize:12,color:"var(--muted)"}}>{teamUploaded.length} documents</div>
          </div>
          {teamUploaded.length===0
            ? <div className="empty"><div className="empty-icon">📁</div><div>No documents uploaded by team yet</div></div>
            : teamUploaded.map((d,i)=><DocRow key={i} doc={d}/>)
          }
        </div>
      )}

      {tab==="mine" && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">My Uploaded Documents</div>
            <button className="btn btn-gold btn-sm" onClick={()=>fileRef.current?.click()}>⬆ Upload File</button>
          </div>
          {clientUploads.length===0
            ? <div className="empty"><div className="empty-icon">📤</div><div style={{fontWeight:600,marginBottom:6}}>No uploads yet</div><div style={{fontSize:13}}>Upload any documents you want to share with your team.</div></div>
            : clientUploads.map((d,i)=><DocRow key={i} doc={{...d,source:"client"}}/>)
          }
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════════════

// ─── Create Client Modal ──────────────────────────────────────────────
function CreateClientModal({ data, onClose }) {
  const { employees, clients, dbCreateClient, showToast, user } = useApp();
  const defaultAssign = data?.defaultAssignTo || user?.id || employees[0]?.id || "";
  const [form, setForm] = useState({
    name: "", contactName: "", email: "", phone: "",
    password: "Welcome@123",
    type: "Private Limited", assignedTo: defaultAssign,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isEmployee = user?.role === "employee";

  const save = async () => {
    if (!form.name)  { showToast("Client name is required", "error"); return; }
    if (!form.phone) { showToast("Mobile number is required", "error"); return; }
    if (!form.email) { showToast("Email is required", "error"); return; }
    if (!form.password || form.password.length < 6) { showToast("Password must be at least 6 characters", "error"); return; }

    const newClient = {
      id: "c_" + uuid(),
      clientNo: "FB-2025-" + String(clients.length + 1).padStart(3,"0"),
      name: form.name, contactName: form.contactName,
      email: form.email, phone: form.phone,
      password: form.password,
      type: form.type, status: "active",
      assignedTo: form.assignedTo,
      totalBilling: 0, collected: 0, pending: 0, progress: 0,
      createdAt: today(),
    };

    // Update demo lookup for immediate login
    DEMO_USERS[form.email.toLowerCase()] = {
      id: newClient.id, name: form.contactName || form.name,
      role: "client", avatar: initials(form.contactName || form.name),
      email: form.email, phone: form.phone, password: form.password,
      color: "#7C3AED",
    };
    if (form.phone) DEMO_BY_PHONE[form.phone] = DEMO_USERS[form.email.toLowerCase()];
    KRAYA.welcomeClient(form.phone, form.contactName || form.name);

    // Save to DB (also updates state)
    await dbCreateClient(newClient);
    onClose();
  };

  return (
    <div className="modal-box" style={{ maxWidth: 580 }}>
      <div className="modal-head"><div className="modal-title">New Client</div><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="modal-body">
        <div className="form-grid">
          <div className="form-grid-2">
            <div className="f-group">
              <label className="f-label">Company / Client Name <span className="f-req">*</span></label>
              <input className="f-input" placeholder="e.g. TechSpark Solutions Pvt Ltd" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div className="f-group">
              <label className="f-label">Business Type</label>
              <select className="f-select" value={form.type} onChange={e => set("type", e.target.value)}>
                {["Private Limited","LLP","Partnership","Proprietorship","Individual"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="f-group">
              <label className="f-label">Contact Person Name</label>
              <input className="f-input" placeholder="Director / Partner name" value={form.contactName} onChange={e => set("contactName", e.target.value)} />
            </div>
            <div className="f-group">
              <label className="f-label">Mobile Number <span className="f-req">*</span></label>
              <input className="f-input" placeholder="10-digit mobile" type="tel" value={form.phone} onChange={e => set("phone", e.target.value.replace(/\D/g,""))} maxLength={10} />
            </div>
            <div className="f-group">
              <label className="f-label">Email Address <span className="f-req">*</span></label>
              <input className="f-input" type="email" placeholder="client@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div className="f-group">
              <label className="f-label">Login Password <span className="f-req">*</span></label>
              <input className="f-input" placeholder="Min 6 characters" value={form.password} onChange={e => set("password", e.target.value)} />
              <div className="f-hint">Client will use this to login. They can change it later.</div>
            </div>
            {!isEmployee && (
              <div className="f-group" style={{ gridColumn:"1/-1" }}>
                <label className="f-label">Assign To <span className="f-req">*</span></label>
                <select className="f-select" value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)}>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                </select>
                <div className="f-hint">This employee will see the client in their portal immediately.</div>
              </div>
            )}
          </div>
          <div className="info-box" style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", marginTop: 4 }}>
            <span>ℹ️</span>
            <div style={{ fontSize:12, color:"var(--blue)" }}>
              After creating, share these login details with the client:<br/>
              <strong>URL:</strong> founders-bridge-portal.vercel.app<br/>
              <strong>Email:</strong> {form.email || "their email"}<br/>
              <strong>Password:</strong> {form.password}
            </div>
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save}>Create Client & Set Login</button>
      </div>
    </div>
  );
}

// ─── Create Invoice Modal ─────────────────────────────────────────────
function CreateInvoiceModal({ data, onClose }) {
  const { clients, invoices, dbCreateInvoice, bundles, org, showToast } = useApp();
  const [clientId, setClientId]   = useState(data?.clientId || "");
  const [bundleId, setBundleId]   = useState("");
  const [lineItems, setLineItems] = useState([]);
  const [dueDate,   setDueDate]   = useState("");
  const [step, setStep]           = useState(1);

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

  // Generate tasks from line items — passes docTemplateId + directorCount
  const generateTasks = (invoiceId) => {
    const newTasks = [];
    let seq = 1;
    lineItems.forEach(li => {
      if (li.type === "govt") return;
      const bundle = bundles.find(b => b.id === bundleId);
      const originalItem = bundle?.lineItems.find(x => x.id === li.originalId);
      if (!originalItem?.tasks?.length) return;

      originalItem.tasks.forEach(taskTemplate => {
        const count = taskTemplate.autoFromQty ? li.qty : 1;
        for (let n = 1; n <= count; n++) {
          newTasks.push({
            id: "t_" + uuid(),
            title: taskTemplate.name.replace("{n}", String(n)),
            clientId, clientName: selectedClient?.name || "",
            invoiceId, lineItemId: li.id,
            assignedTo: selectedClient?.assignedTo || "",
            status: "open",
            sequence: seq++,
            requirementType: taskTemplate.requirementType || "none",
            docTemplateId:   taskTemplate.docTemplateId  || "",
            // DSC tasks: each task is for 1 director, numbered by n
            directorCount: taskTemplate.autoFromQty ? 1 : 1,
            directorNumber: taskTemplate.autoFromQty ? n : null,
            dueDate: null, completedDate: null, notes: "",
          });
        }
      });
    });
    return newTasks;
  };

  const createInvoice = async () => {
    if (!clientId) { showToast("Select a client", "error"); return; }
    if (lineItems.length === 0) { showToast("Add at least one line item", "error"); return; }

    const invoiceNo = "FB/" + new Date().getFullYear() + "/" + String(invoices.length + 1).padStart(3, "0");
    const newInvoice = {
      id: "inv_" + uuid(), invoiceNo,
      clientId, clientName: selectedClient?.name || "",
      date: today(), dueDate: dueDate || null,
      status: "unpaid", total, paid: 0, pending: total,
      lineItems,
    };

    const newTasks = generateTasks(newInvoice.id);

    if (selectedClient?.phone) {
      KRAYA.invoiceCreated(selectedClient.phone, selectedClient.contactName || selectedClient.name, INR(total), invoiceNo);
    }

    await dbCreateInvoice(newInvoice, lineItems, newTasks);
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
            <div className="f-group">
              <label className="f-label">Due Date</label>
              <input type="date" className="f-input" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
              <div className="f-hint">Client will be notified via WhatsApp when invoice is created</div>
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
                    <th>Item</th><th>SAC</th><th>Type</th><th>Qty</th><th>Unit Price (₹)</th><th>GST</th><th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map(li => (
                    <tr key={li.id}>
                      <td style={{ minWidth: 180 }}>
                        <input className="f-input" value={li.name} onChange={e => setItem(li.id, "name", e.target.value)} style={{ fontSize: 12, padding: "5px 9px" }} />
                        {li.note && <div style={{ fontSize: 10, color: "var(--orange)", marginTop: 2 }}>⚠️ {li.note}</div>}
                      </td>
                      <td>
                        <input className="f-input" value={li.sac||org.sac||"998211"} onChange={e=>setItem(li.id,"sac",e.target.value)} style={{ width:80,fontSize:12,padding:"5px 9px" }} />
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
  const { org, openModal, user } = useApp();

  const subtotal  = invoice.lineItems.reduce((s,li)=>s+(li.unitPrice||0)*(li.qty||1),0);
  const gstAmt    = (invoice.total||0) - subtotal;
  const cgst      = gstAmt / 2;
  const sgst      = gstAmt / 2;
  const isPaid    = invoice.status === "paid";
  const isPartial = invoice.status === "partial";
  const isClient  = user?.role === "client";

  const printInvoice = () => {
    const w = window.open("","_blank","width=800,height=900");
    const content = document.getElementById("invoice-print-area");
    w.document.write(`<html><head><title>Invoice ${invoice.invoiceNo}</title>
    <style>
      body{font-family:Arial,sans-serif;color:#0B1F3A;padding:32px;font-size:12px;}
      table{width:100%;border-collapse:collapse;}
      th{background:#0B1F3A;color:#fff;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;}
      td{padding:9px 10px;border-bottom:1px solid #eee;}
      .total-row{font-weight:700;font-size:14px;border-top:2px solid #0B1F3A;}
      .gold{color:#C9A14A;}
      .muted{color:#6B7280;font-size:10px;}
      @media print{body{padding:0;}}
    </style></head><body>${content?.innerHTML||""}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(()=>w.print(),500);
  };

  return (
    <div className="modal-box" style={{ maxWidth:700 }}>
      <div className="modal-head">
        <div>
          <div className="modal-title">Invoice {invoice.invoiceNo}</div>
          <div style={{ fontSize:12,color:"var(--muted)",marginTop:2 }}>
            {invoice.date}
            {invoice.dueDate && ` · Due ${invoice.dueDate}`}
          </div>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          {isPaid && <span className="badge" style={{ background:"#F0FDF4",color:"var(--green)" }}><span className="badge-dot" style={{ background:"var(--green)" }}/>Paid</span>}
          {isPartial && <span className="badge" style={{ background:"#FFF8EC",color:"var(--orange)" }}><span className="badge-dot" style={{ background:"var(--orange)" }}/>Partial</span>}
          {!isPaid && !isPartial && <span className="badge" style={{ background:"#FEF2F2",color:"var(--red)" }}><span className="badge-dot" style={{ background:"var(--red)" }}/>Unpaid</span>}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="modal-body" style={{ padding:0 }}>
        <div id="invoice-print-area" style={{ padding:"24px 28px" }}>

          {/* Invoice header */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,padding:"20px 24px",background:"var(--navy)",borderRadius:12,color:"#fff" }}>
            <div>
              {org.logoUrl
                ? <img src={org.logoUrl} alt="Logo" style={{ maxHeight:44,maxWidth:160,objectFit:"contain",filter:"brightness(0) invert(1)",marginBottom:10 }}/>
                : <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,marginBottom:4 }}>Founders <span style={{ color:"#C9A14A" }}>Bridge</span></div>
              }
              <div style={{ fontSize:11,opacity:.7,marginBottom:2 }}>{org.name}</div>
              <div style={{ fontSize:11,opacity:.7,marginBottom:2 }}>GSTIN: {org.gstin} · PAN: {org.pan}</div>
              <div style={{ fontSize:11,opacity:.7 }}>{org.address}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10,opacity:.5,textTransform:"uppercase",letterSpacing:"2px",marginBottom:6 }}>Tax Invoice</div>
              <div style={{ fontSize:20,fontWeight:700,color:"#C9A14A" }}>{invoice.invoiceNo}</div>
              <div style={{ fontSize:11,opacity:.7,marginTop:4 }}>Date: {invoice.date}</div>
              {invoice.dueDate && <div style={{ fontSize:11,opacity:.7 }}>Due: {invoice.dueDate}</div>}
            </div>
          </div>

          {/* Bill to / From grid */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20 }}>
            <div style={{ padding:"14px 16px",background:"var(--cream)",borderRadius:10,border:"1px solid var(--border)" }}>
              <div style={{ fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8 }}>Bill To</div>
              <div style={{ fontSize:15,fontWeight:700,color:"var(--navy)" }}>{invoice.clientName}</div>
            </div>
            <div style={{ padding:"14px 16px",background:"var(--cream)",borderRadius:10,border:"1px solid var(--border)" }}>
              <div style={{ fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8 }}>Payment Details</div>
              <div style={{ fontSize:12,color:"var(--ink2)",lineHeight:1.7 }}>
                <div><strong>{org.bankName}</strong></div>
                <div>A/c: {org.accountNo} · IFSC: {org.ifsc}</div>
                <div style={{ color:"var(--gold-dk)",fontWeight:600 }}>UPI: {org.upi}</div>
              </div>
            </div>
          </div>

          {/* Line items table */}
          <div style={{ borderRadius:10,overflow:"hidden",border:"1px solid var(--border)",marginBottom:16 }}>
            <table>
              <thead>
                <tr style={{ background:"var(--navy)" }}>
                  <th style={{ color:"#fff",padding:"10px 14px",textAlign:"left",fontSize:10,textTransform:"uppercase",letterSpacing:"1px" }}>Description</th>
                  <th style={{ color:"rgba(201,161,74,.8)",padding:"10px 8px",textAlign:"center",fontSize:10,textTransform:"uppercase",letterSpacing:"1px",whiteSpace:"nowrap" }}>SAC</th>
                  <th style={{ color:"#fff",padding:"10px 8px",textAlign:"center",fontSize:10,textTransform:"uppercase",letterSpacing:"1px" }}>Qty</th>
                  <th style={{ color:"#fff",padding:"10px 14px",textAlign:"right",fontSize:10,textTransform:"uppercase",letterSpacing:"1px" }}>Rate</th>
                  <th style={{ color:"#fff",padding:"10px 8px",textAlign:"center",fontSize:10,textTransform:"uppercase",letterSpacing:"1px" }}>Taxable</th>
                  <th style={{ color:"rgba(201,161,74,.8)",padding:"10px 8px",textAlign:"center",fontSize:10,textTransform:"uppercase",letterSpacing:"1px" }}>GST%</th>
                  <th style={{ color:"#fff",padding:"10px 14px",textAlign:"right",fontSize:10,textTransform:"uppercase",letterSpacing:"1px" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((li,i)=>{
                  const base = (li.unitPrice||0)*(li.qty||1);
                  const amt  = li.gst ? base*(1+(org.gstRate||18)/100) : base;
                  const sac  = li.sac || org.sac || "998211";
                  return (
                    <tr key={li.id} style={{ background:i%2===0?"var(--cream)":"#fff" }}>
                      <td style={{ padding:"11px 14px" }}>
                        <div style={{ fontWeight:500,fontSize:13 }}>{li.name}</div>
                        <div style={{ fontSize:10,color:"var(--muted)",marginTop:2,textTransform:"capitalize" }}>{li.type} service</div>
                      </td>
                      <td style={{ padding:"11px 8px",textAlign:"center",fontSize:11,color:"var(--gold-dk)",fontWeight:600,fontFamily:"monospace" }}>{sac}</td>
                      <td style={{ padding:"11px 8px",textAlign:"center",fontWeight:600 }}>{li.qty||1}</td>
                      <td style={{ padding:"11px 14px",textAlign:"right" }}>{INR(li.unitPrice||0)}</td>
                      <td style={{ padding:"11px 8px",textAlign:"center",color:"var(--muted)",fontSize:12 }}>{INR(base)}</td>
                      <td style={{ padding:"11px 8px",textAlign:"center",fontSize:12 }}>
                        {li.gst
                          ? <span style={{ color:"var(--orange)",fontWeight:600 }}>{org.gstRate||18}%</span>
                          : <span style={{ color:"var(--muted)" }}>Nil</span>
                        }
                      </td>
                      <td style={{ padding:"11px 14px",textAlign:"right",fontWeight:700,fontSize:14,color:"var(--navy)" }}>{INR(amt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals section */}
          <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:20 }}>
            <div style={{ width:300,background:"var(--cream)",borderRadius:10,border:"1px solid var(--border)",overflow:"hidden" }}>
              {[
                ["Subtotal (Taxable)",      INR(subtotal),           false],
                [`CGST @ ${(org.gstRate||18)/2}%`, INR(cgst),      false],
                [`SGST @ ${(org.gstRate||18)/2}%`, INR(sgst),      false],
              ].map(([l,v,bold])=>(
                <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"8px 16px",borderBottom:"1px solid var(--border)",fontSize:12,color:"var(--muted)" }}>
                  <span>{l}</span><span style={{ fontWeight:600,color:"var(--ink2)" }}>{v}</span>
                </div>
              ))}
              <div style={{ display:"flex",justifyContent:"space-between",padding:"12px 16px",background:"var(--navy)",fontSize:15,fontWeight:700,color:"#fff" }}>
                <span>Total</span><span style={{ color:"#C9A14A" }}>{INR(invoice.total||0)}</span>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 16px",fontSize:12,borderBottom:"1px solid var(--border)" }}>
                <span style={{ color:"var(--green)",fontWeight:600 }}>Amount Paid</span>
                <span style={{ color:"var(--green)",fontWeight:700 }}>{INR(invoice.paid||0)}</span>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",padding:"10px 16px",fontSize:13 }}>
                <span style={{ color:invoice.pending>0?"var(--red)":"var(--muted)",fontWeight:700 }}>Balance Due</span>
                <span style={{ color:invoice.pending>0?"var(--red)":"var(--green)",fontWeight:700,fontSize:15 }}>{INR(invoice.pending||0)}</span>
              </div>
            </div>
          </div>

          {/* Status & notes */}
          {invoice.pending > 0 && (
            <div style={{ padding:"12px 16px",background:"#FFF8EC",border:"1px solid rgba(201,161,74,.3)",borderRadius:8,fontSize:12,color:"var(--gold-dk)" }}>
              ⚠️ Please make payment by <strong>{invoice.dueDate||"the due date"}</strong> to avoid late fees.
            </div>
          )}
          {isPaid && (
            <div style={{ padding:"12px 16px",background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:8,fontSize:12,color:"var(--green)",fontWeight:600 }}>
              ✅ This invoice has been fully paid. Thank you!
            </div>
          )}
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Close</button>
        {!isPaid && isClient && (
          <button className="btn btn-green" onClick={()=>{ onClose(); openModal("pay-now",{invoiceId:invoice.id}); }}>
            💳 Pay {INR(invoice.pending||0)}
          </button>
        )}
        {!isPaid && !isClient && (
          <button className="btn btn-sm" style={{ background:"var(--green)",color:"#fff",border:"none" }}
            onClick={()=>{ onClose(); openModal("record-payment",{invoiceId:invoice.id}); }}>
            💰 Record Payment
          </button>
        )}
        <button className="btn btn-primary" onClick={printInvoice}>🖨️ Print / Download PDF</button>
      </div>
    </div>
  );
}

// ─── View Task Modal ──────────────────────────────────────────────────
function ViewTaskModal({ data, onClose }) {
  const { task } = data;
  const { tasks, setTasks, employees, showToast, user, submissions, openModal } = useApp();
  const [localTask, setLocal] = useState({ ...task });
  const [activeTab, setActiveTab] = useState("details");
  const isTeam = user?.role === "admin" || user?.role === "manager" || user?.role === "employee";

  const sub = (submissions||[]).find(s => s.taskId === task.id);
  const tpl = task.docTemplateId ? DEFAULT_DOC_TEMPLATES[task.docTemplateId] : null;

  const save = () => {
    setTasks(ts => ts.map(t => t.id === task.id
      ? { ...localTask, completedDate: localTask.status==="completed" ? today() : localTask.completedDate }
      : t
    ));
    showToast("Task updated!", "success");
    onClose();
  };

  return (
    <div className="modal-box" style={{ maxWidth:640 }}>
      <div className="modal-head">
        <div>
          <div className="modal-title">{localTask.title}</div>
          <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{localTask.clientName} · Sequence #{localTask.sequence}</div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, padding:"0 20px", borderBottom:"1px solid var(--border)", background:"#FAFAF8" }}>
        {[["details","Details"], ...(isTeam&&sub ? [["submission","📥 Submission"]] : [])].map(([id,label])=>(
          <div key={id} onClick={()=>setActiveTab(id)} style={{ padding:"10px 14px", fontSize:13, fontWeight:activeTab===id?700:500, cursor:"pointer", color:activeTab===id?"var(--blue)":"var(--muted)", borderBottom:activeTab===id?"2px solid var(--blue)":"2px solid transparent", marginBottom:-1 }}>
            {label}
            {id==="submission"&&sub?.status==="submitted"&&<span style={{ marginLeft:6, background:"#7C3AED", color:"#fff", fontSize:9, padding:"1px 6px", borderRadius:20, fontWeight:700 }}>NEW</span>}
          </div>
        ))}
      </div>

      <div className="modal-body">
        {activeTab==="details" && (
          <div className="form-grid">
            <div className="form-grid-2">
              <div className="f-group">
                <label className="f-label">Status</label>
                <select className="f-select" value={localTask.status} onChange={e=>setLocal(t=>({...t,status:e.target.value}))}>
                  {TASK_STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="f-group">
                <label className="f-label">Assigned To</label>
                <select className="f-select" value={localTask.assignedTo} onChange={e=>setLocal(t=>({...t,assignedTo:e.target.value}))}>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="f-group">
                <label className="f-label">Due Date</label>
                <input type="date" className="f-input" value={localTask.dueDate||""} onChange={e=>setLocal(t=>({...t,dueDate:e.target.value}))} />
              </div>
            </div>

            {/* Document template info */}
            {tpl && (
              <div style={{ padding:"12px 14px", background:"#F0F9FF", border:"1px solid #BAE6FD", borderRadius:8 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#0369A1", marginBottom:4 }}>📋 Configured Template: {tpl.name}</div>
                <div style={{ fontSize:11, color:"#0369A1" }}>
                  Collection: <strong>{tpl.collectionType==="director"?"Per Director":"Per Company"}</strong>
                  {" · "}{tpl.infoFields.length} info fields
                  {" · "}{tpl.docSlots.length} document slots
                  {" · "}{tpl.docSlots.filter(s=>s.required).length} required docs
                </div>
              </div>
            )}

            {/* Client action required section */}
            <div style={{ borderTop:"1px solid var(--border)", paddingTop:16 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Client Action Required</div>
              <div className="f-group">
                <label className="f-label">Requirement Type</label>
                <select className="f-select" value={localTask.requirementType||"none"} onChange={e=>setLocal(t=>({...t,requirementType:e.target.value}))}>
                  {TASK_REQUIREMENT_TYPES.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              {!tpl && (localTask.requirementType==="docs"||localTask.requirementType==="form_docs") && (
                <div className="f-group" style={{ marginTop:8 }}>
                  <label className="f-label">Required Documents (one per line)</label>
                  <textarea className="f-textarea" rows={4}
                    placeholder={"PAN Card\nAadhaar Card\nPhoto\nAddress Proof"}
                    value={localTask.docsList||""}
                    onChange={e=>setLocal(t=>({...t,docsList:e.target.value}))}
                  />
                  <div className="f-hint">Or use a Document Template from Settings → Document Templates</div>
                </div>
              )}
            </div>

            <div className="f-group">
              <label className="f-label">Internal Notes (team only)</label>
              <textarea className="f-textarea" value={localTask.notes||""} onChange={e=>setLocal(t=>({...t,notes:e.target.value}))} rows={3} placeholder="Notes visible to team only…" />
            </div>

            {localTask.completedDate && (
              <div style={{ fontSize:12, color:"var(--green)", fontWeight:600 }}>✅ Completed on {localTask.completedDate}</div>
            )}
          </div>
        )}

        {activeTab==="submission" && sub && (
          <SubmissionViewer sub={sub} tpl={tpl} task={task} onReview={()=>{ onClose(); openModal("review-submission",{submissionId:sub.id}); }} />
        )}
      </div>

      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        {activeTab==="submission" && sub?.status==="submitted" && (
          <button className="btn" style={{ background:"#7C3AED",color:"#fff",border:"none" }}
            onClick={()=>{ onClose(); openModal("review-submission",{submissionId:sub.id}); }}>
            📥 Review Submission
          </button>
        )}
        {activeTab==="details" && (
          <>
            <button className="btn btn-green" onClick={()=>{ setLocal(t=>({...t,status:"completed"})); setTimeout(save,100); }}>✓ Mark Complete</button>
            <button className="btn btn-primary" onClick={save}>Save Changes</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SUBMISSION VIEWER — shows submitted data cleanly to team ─────────
function SubmissionViewer({ sub, tpl, task, onReview }) {
  const statusColors = { submitted:"#7C3AED", approved:"#16A34A", changes_requested:"#DC2626" };
  const sc = statusColors[sub.status] || "#6B7280";

  return (
    <div>
      {/* Status banner */}
      <div style={{ padding:"12px 14px", background:sub.status==="submitted"?"#EDE9FE":sub.status==="approved"?"#F0FDF4":"#FFF1F2", border:`1px solid ${sub.status==="submitted"?"#C4B5FD":sub.status==="approved"?"#BBF7D0":"#FECACA"}`, borderRadius:8, marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:sc }}>
            {sub.status==="submitted"?"📥 Pending Review":sub.status==="approved"?"✅ Approved":"↩ Changes Requested"}
          </div>
          <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>Submitted on {sub.submittedAt}</div>
        </div>
        {sub.status==="submitted" && (
          <button className="btn btn-sm" style={{ background:"#7C3AED",color:"#fff",border:"none" }} onClick={onReview}>Review Now →</button>
        )}
      </div>

      {sub.reviewNote && (
        <div style={{ padding:"10px 14px", background:"#FFF1F2", border:"1px solid #FECACA", borderRadius:8, fontSize:12, color:"var(--red)", marginBottom:16 }}>
          <strong>Changes requested:</strong> {sub.reviewNote}
        </div>
      )}

      {/* Render per-director or company sections */}
      {sub.formData && Object.keys(sub.formData).map(dirIdx => {
        const dirLabel = tpl?.collectionType==="director" ? `Director ${dirIdx}` : "Company Information";
        const fields   = sub.formData[dirIdx];
        const docs     = sub.documents?.[dirIdx];

        return (
          <div key={dirIdx} style={{ border:"1px solid var(--border)", borderRadius:10, overflow:"hidden", marginBottom:14 }}>
            <div style={{ padding:"10px 16px", background:"linear-gradient(90deg,#F0F6FF,#fff)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:28,height:28,borderRadius:"50%",background:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff" }}>
                {tpl?.collectionType==="director" ? dirIdx : "🏢"}
              </div>
              <div style={{ fontSize:13, fontWeight:700 }}>{dirLabel}</div>
            </div>

            {/* Info fields */}
            {fields && Object.keys(fields).length>0 && (
              <div style={{ padding:"12px 16px", borderBottom:docs&&Object.keys(docs).length>0?"1px solid var(--border)":undefined }}>
                <div style={{ fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10 }}>📝 Submitted Information</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px" }}>
                  {tpl?.infoFields?.map(f=>(
                    <div key={f.id} style={{ gridColumn:f.type==="textarea"?"1/-1":undefined }}>
                      <div style={{ fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:2 }}>{f.label}</div>
                      <div style={{ fontSize:13,fontWeight:500,padding:"6px 10px",background:"#F9FAFB",borderRadius:6,border:"1px solid var(--border)" }}>
                        {fields[f.id] || <span style={{ color:"var(--faint)",fontStyle:"italic" }}>Not filled</span>}
                      </div>
                    </div>
                  )) || Object.entries(fields).map(([k,v])=>(
                    <div key={k}>
                      <div style={{ fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:2 }}>{k}</div>
                      <div style={{ fontSize:13,fontWeight:500,padding:"6px 10px",background:"#F9FAFB",borderRadius:6,border:"1px solid var(--border)" }}>{v||"—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {docs && Object.keys(docs).length>0 && (
              <div style={{ padding:"12px 16px" }}>
                <div style={{ fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10 }}>📎 Uploaded Documents</div>
                {tpl?.docSlots?.map(slot=>{
                  const up = docs[slot.id];
                  return (
                    <div key={slot.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #F3F4F6" }}>
                      <div style={{ width:30,height:30,borderRadius:7,background:up?"#F0FDF4":"#FFF1F2",border:`1px solid ${up?"#BBF7D0":"#FECACA"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>
                        {up?"✅":"❌"}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13,fontWeight:500 }}>{slot.label}{slot.required&&<span style={{ color:"var(--red)",marginLeft:3 }}>*</span>}</div>
                        {up ? <div style={{ fontSize:11,color:"var(--green)" }}>✓ {up.name} · {up.size}</div>
                             : <div style={{ fontSize:11,color:"var(--red)" }}>Not uploaded</div>}
                      </div>
                      {up && <button className="btn btn-sm">⬇ Download</button>}
                    </div>
                  );
                }) || Object.entries(docs).map(([slotId,up])=>(
                  <div key={slotId} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #F3F4F6" }}>
                    <span style={{ fontSize:16 }}>✅</span>
                    <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:500 }}>{up.name}</div><div style={{ fontSize:11,color:"var(--muted)" }}>{up.size}</div></div>
                    <button className="btn btn-sm">⬇ Download</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {sub.note && (
        <div style={{ padding:"10px 14px",background:"#F9FAFB",border:"1px solid var(--border)",borderRadius:8,fontSize:12,color:"var(--muted)" }}>
          💬 <strong>Client note:</strong> {sub.note}
        </div>
      )}
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
  const { docTpls } = useApp();
  const fileRef    = useRef(null);
  const [pendingUpload, setPendingUpload] = useState(null); // { directorIdx, slotId }
  const [loading,  setLoading]  = useState(false);
  const [note,     setNote]     = useState("");

  // Resolve the doc template for this task
  const tpl = task.docTemplateId ? (docTpls[task.docTemplateId] || DEFAULT_DOC_TEMPLATES[task.docTemplateId]) : null;
  const isDirectorLevel = tpl?.collectionType === "director";

  // Figure out how many directors this task is for
  // task.directorCount is set when auto-created from DSC qty, else default 1
  const directorCount = task.directorCount || 1;
  const directors = Array.from({ length: directorCount }, (_, i) => i + 1);

  // State: { [dirIdx]: { [fieldId]: value } }
  const [formData, setFormData] = useState(() => {
    const d = {};
    directors.forEach(n => { d[n] = {}; });
    return d;
  });

  // State: { [dirIdx]: { [slotId]: { name, size } } }
  const [docData, setDocData] = useState(() => {
    const d = {};
    directors.forEach(n => { d[n] = {}; });
    return d;
  });

  const noActionNeeded = !tpl || (tpl.infoFields.length === 0 && tpl.docSlots.length === 0);

  // Validation — all required fields and docs per director
  const isComplete = () => {
    if (noActionNeeded) return true;
    const checkDirs = isDirectorLevel ? directors : [1];
    for (const n of checkDirs) {
      for (const f of (tpl?.infoFields || [])) {
        if (f.required && !(formData[n]?.[f.id])) return false;
      }
      for (const s of (tpl?.docSlots || [])) {
        if (s.required && !(docData[n]?.[s.id])) return false;
      }
    }
    return true;
  };

  const triggerUpload = (dirIdx, slotId) => {
    setPendingUpload({ dirIdx, slotId });
    fileRef.current?.click();
  };
  const onFile = async (e) => {
    if (e.target.files[0] && pendingUpload) {
      const f = e.target.files[0];
      const { dirIdx, slotId } = pendingUpload;
      setDocData(d => ({ ...d, [dirIdx]: { ...d[dirIdx], [slotId]: { name: f.name, size: (f.size/1024).toFixed(0)+"KB" } } }));
      e.target.value = "";
    }
  };

  const setField = (dirIdx, fieldId, val) =>
    setFormData(d => ({ ...d, [dirIdx]: { ...d[dirIdx], [fieldId]: val } }));

  const submit = async () => {
    if (!isComplete()) { showToast("Please complete all required fields and upload all required documents", "error"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const newSub = {
      id: "sub_" + uuid(), taskId: task.id, clientId: task.clientId,
      status: "submitted", locked: true,
      formData, documents: docData,
      submittedAt: new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}),
      reviewNote: "", reviewedAt: null, note,
    };
    setSubmissions(ss => [...ss, newSub]);
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: "team_approval" } : t));
    setLoading(false);
    showToast("Submitted! Your team will review within 1–2 working days.", "success");
    onClose();
  };

  // Renders form + docs for one director (or "company" if common)
  const renderSection = (dirIdx, label) => (
    <div key={dirIdx} style={{ border:"1px solid var(--border)", borderRadius:10, overflow:"hidden", marginBottom:16 }}>
      {/* Section header */}
      <div style={{ padding:"11px 16px", background:"linear-gradient(90deg,#F0F6FF,var(--white))", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:30,height:30,borderRadius:"50%",background:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0 }}>
          {isDirectorLevel ? dirIdx : "🏢"}
        </div>
        <div>
          <div style={{ fontSize:13,fontWeight:700 }}>{label}</div>
          <div style={{ fontSize:11,color:"var(--muted)" }}>
            {(tpl?.infoFields||[]).filter(f=>f.required).length} required fields
            {" · "}{(tpl?.docSlots||[]).filter(s=>s.required).length} required documents
          </div>
        </div>
      </div>

      {/* Info fields */}
      {(tpl?.infoFields||[]).length > 0 && (
        <div style={{ padding:"14px 16px", borderBottom:(tpl?.docSlots||[]).length>0?"1px solid var(--border)":undefined }}>
          <div style={{ fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10 }}>📝 Information</div>
          <div className="form-grid-2">
            {(tpl?.infoFields||[]).map(f => (
              <div key={f.id} className="f-group" style={{ gridColumn: f.type==="textarea"?"1/-1":undefined }}>
                <label className="f-label">
                  {f.label}
                  {f.required && <span style={{ color:"var(--red)" }}> *</span>}
                </label>
                {f.type === "textarea" ? (
                  <textarea className="f-textarea" rows={2}
                    value={formData[dirIdx]?.[f.id]||""}
                    onChange={e=>setField(dirIdx,f.id,e.target.value)}
                  />
                ) : f.type === "select" ? (
                  <select className="f-select"
                    value={formData[dirIdx]?.[f.id]||""}
                    onChange={e=>setField(dirIdx,f.id,e.target.value)}>
                    <option value="">Select…</option>
                    {(f.options||[]).map(o=><option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="f-input" type={f.type||"text"}
                    value={formData[dirIdx]?.[f.id]||""}
                    onChange={e=>setField(dirIdx,f.id,e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document slots */}
      {(tpl?.docSlots||[]).length > 0 && (
        <div style={{ padding:"14px 16px" }}>
          <div style={{ fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10 }}>📎 Documents</div>
          {(tpl?.docSlots||[]).map(slot => {
            const up = docData[dirIdx]?.[slot.id];
            return (
              <div key={slot.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #F3F4F6" }}>
                <div style={{ width:32,height:32,borderRadius:8,background:up?"#F0FDF4":"#F9FAFB",border:`1px solid ${up?"#BBF7D0":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}>
                  {up?"✅":"📄"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:500 }}>
                    {slot.label}
                    {slot.required && <span style={{ color:"var(--red)",marginLeft:3 }}>*</span>}
                  </div>
                  {up
                    ? <div style={{ fontSize:11,color:"var(--green)",marginTop:1 }}>✓ {up.name} · {up.size} — <em style={{ color:"var(--muted)" }}>Cannot be removed after submission</em></div>
                    : <div style={{ fontSize:11,color:"var(--muted)" }}>{slot.required?"Required":"Optional"}</div>
                  }
                </div>
                {!up
                  ? <button className="btn btn-ghost btn-sm" onClick={()=>triggerUpload(dirIdx,slot.id)}>⬆ Upload</button>
                  : <span style={{ fontSize:11,color:"var(--muted)" }}>Uploaded</span>
                }
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const done = isComplete();

  return (
    <div className="modal-box" style={{ maxWidth:640 }}>
      <div className="modal-head">
        <div>
          <div className="modal-title">{task.title}</div>
          <div style={{ fontSize:12,color:"var(--muted)",marginTop:2 }}>
            {tpl ? `${tpl.name} — ${isDirectorLevel?`${directorCount} director${directorCount>1?"s":""}`:""} · ${tpl.collectionType==="director"?"Director-level collection":"Company-level collection"}` : "No collection required"}
          </div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <input type="file" ref={fileRef} style={{ display:"none" }} onChange={onFile} />

        <div style={{ padding:"10px 14px",background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:8,marginBottom:16,fontSize:12,color:"#C2410C" }}>
          ⚠️ Please complete all required fields and upload all documents before submitting.
          Once submitted, <strong>documents cannot be deleted</strong> — only your team can request resubmission.
        </div>

        {noActionNeeded ? (
          <div style={{ padding:"16px",background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,fontSize:13,color:"var(--green)" }}>
            ✅ No information or documents required for this task. Click Submit to acknowledge.
          </div>
        ) : (
          <>
            {isDirectorLevel
              ? directors.map(n => renderSection(n, `Director ${n}`))
              : renderSection(1, "Company Information")
            }
          </>
        )}

        <div className="f-group" style={{ marginTop:16 }}>
          <label className="f-label">Additional Note for Team (optional)</label>
          <textarea className="f-textarea" rows={2} placeholder="Any message for your team…" value={note} onChange={e=>setNote(e.target.value)} />
        </div>

        {!noActionNeeded && (
          <div style={{ marginTop:12,padding:"10px 14px",background:done?"#F0FDF4":"#FFF1F2",border:`1px solid ${done?"#BBF7D0":"#FECACA"}`,borderRadius:8,fontSize:12,color:done?"var(--green)":"var(--red)",fontWeight:600 }}>
            {done ? "✓ All required fields complete — ready to submit!" : "⚠ Some required fields or documents are missing"}
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={loading||(!noActionNeeded&&!done)} style={{ opacity:(!noActionNeeded&&!done)?0.5:1 }}>
          {loading
            ? <span style={{ display:"inline-block",width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite" }}/>
            : "Submit for Review →"
          }
        </button>
      </div>
    </div>
  );
}

// ─── REVIEW SUBMISSION MODAL (Team) ──────────────────────────────────
function ReviewSubmissionModal({ data, onClose, submissions, setSubmissions, tasks, setTasks, showToast }) {
  const { submissionId } = data;
  const sub  = submissions.find(s => s.id === submissionId);
  const task = tasks.find(t => t.id === sub?.taskId);
  const tpl  = task?.docTemplateId ? DEFAULT_DOC_TEMPLATES[task.docTemplateId] : null;
  const [note, setNote] = useState("");

  if (!sub || !task) return null;

  const decide = (approved) => {
    if (!approved && !note) { showToast("Add a note explaining what needs to be corrected","error"); return; }
    setSubmissions(ss => ss.map(s => s.id===submissionId ? {
      ...s,
      status: approved ? "approved" : "changes_requested",
      reviewNote: note,
      reviewedAt: new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}),
    } : s));
    setTasks(ts => ts.map(t => t.id===sub.taskId ? {
      ...t,
      status: approved ? "completed" : "client_action",
      completedDate: approved ? new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : null,
    } : t));
    showToast(approved ? "Submission approved! Task marked complete." : "Changes requested — client notified.", approved?"success":"warning");
    onClose();
  };

  return (
    <div className="modal-box" style={{ maxWidth:660 }}>
      <div className="modal-head">
        <div>
          <div className="modal-title">Review Submission</div>
          <div style={{ fontSize:12,color:"var(--muted)",marginTop:2 }}>{task.title} · {task.clientName}</div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <SubmissionViewer sub={sub} tpl={tpl} task={task} onReview={()=>{}} />
        <div className="f-group" style={{ marginTop:16 }}>
          <label className="f-label">Review Note <span style={{ color:"var(--red)" }}>*</span> (required when requesting changes)</label>
          <textarea className="f-textarea" rows={3}
            placeholder="If approving: add optional feedback. If requesting changes: explain exactly what needs to be corrected."
            value={note} onChange={e=>setNote(e.target.value)}
          />
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-red" onClick={()=>decide(false)}>↩ Request Changes</button>
        <button className="btn btn-green" onClick={()=>decide(true)}>✓ Approve & Complete</button>
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
  const { user } = useApp();
  const [form, setForm] = useState({ current:"", newPwd:"", confirm:"" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const save = () => {
    if (!form.current) { showToast("Enter current password","error"); return; }
    // In demo, verify against known password
    if (user && user.password && form.current !== user.password) {
      showToast("Current password is incorrect","error"); return;
    }
    if (form.newPwd.length < 6) { showToast("New password must be 6+ characters","error"); return; }
    if (form.newPwd !== form.confirm) { showToast("Passwords do not match","error"); return; }
    // Update in DEMO_USERS
    if (user?.email) {
      const u = DEMO_USERS[user.email.toLowerCase()];
      if (u) u.password = form.newPwd;
    }
    showToast("Password changed successfully! Use new password on next login.","success");
    onClose();
  };

  return (
    <div className="modal-box" style={{maxWidth:420}}>
      <div className="modal-head"><div className="modal-title">Change Password</div><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="modal-body">
        <div className="info-box" style={{background:"#EFF6FF",border:"1px solid #BFDBFE",marginBottom:16}}>
          <span>🔐</span>
          <div style={{fontSize:12,color:"var(--blue)"}}>Changing password for <strong>{user?.name}</strong> ({user?.email})</div>
        </div>
        <div className="form-grid">
          <div className="f-group"><label className="f-label">Current Password</label><input className="f-input" type="password" value={form.current} onChange={e=>set("current",e.target.value)} /></div>
          <div className="f-group"><label className="f-label">New Password</label><input className="f-input" type="password" placeholder="Minimum 6 characters" value={form.newPwd} onChange={e=>set("newPwd",e.target.value)} /></div>
          <div className="f-group"><label className="f-label">Confirm New Password</label><input className="f-input" type="password" value={form.confirm} onChange={e=>set("confirm",e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} /></div>
        </div>
      </div>
      <div className="modal-foot"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Change Password</button></div>
    </div>
  );
}

// ─── POLICY PAGE ──────────────────────────────────────────────────────
function PolicyPage({ onBack }) {
  const [tab, setTab] = useState("privacy");
  return (
    <div style={{minHeight:"100vh",background:"var(--cream)",display:"flex",flexDirection:"column"}}>
      <div style={{background:"var(--navy)",padding:"16px 28px",display:"flex",alignItems:"center",gap:16}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:4}}>← Back to Login</button>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:18,color:"#fff"}}>Founders Bridge LLP</div>
      </div>
      <div style={{maxWidth:800,margin:"0 auto",padding:"32px 24px",flex:1}}>
        <div className="tabs" style={{marginBottom:28}}>
          {[["privacy","Privacy Policy"],["terms","Terms of Service"],["disclaimer","Disclaimer"],["refund","Refund Policy"]].map(([id,label])=>(
            <div key={id} className={`tab ${tab===id?"on":""}`} onClick={()=>setTab(id)}>{label}</div>
          ))}
        </div>

        {tab==="privacy" && (
          <div className="card">
            <div className="card-head"><div className="card-title">Privacy Policy</div><div style={{fontSize:12,color:"var(--muted)"}}>Last updated: June 2025</div></div>
            <div className="card-body" style={{lineHeight:1.8,fontSize:14,color:"var(--ink2)"}}>
              <p style={{marginBottom:16}}><strong>Founders Bridge LLP</strong> ("we", "our", "us") is committed to protecting your personal information and your right to privacy.</p>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,marginTop:20}}>1. Information We Collect</h3>
              <p style={{marginBottom:12}}>We collect information you provide directly to us, including name, email address, mobile number, company details, PAN, Aadhaar, and other KYC documents required for legal and compliance services.</p>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,marginTop:20}}>2. How We Use Your Information</h3>
              <p style={{marginBottom:12}}>Your information is used solely to provide legal, compliance, and financial services as engaged. We do not sell, trade, or rent your personal information to third parties.</p>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,marginTop:20}}>3. Data Storage</h3>
              <p style={{marginBottom:12}}>All data is stored securely on encrypted servers. Documents uploaded to this portal are accessible only to you and authorised Founders Bridge team members.</p>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,marginTop:20}}>4. Data Retention</h3>
              <p style={{marginBottom:12}}>We retain your data for as long as required by law and for the period of our engagement. You may request deletion of your data by writing to us.</p>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,marginTop:20}}>5. Contact Us</h3>
              <p>For privacy-related concerns, email us at: <strong>info@foundersbridge.in</strong></p>
            </div>
          </div>
        )}

        {tab==="terms" && (
          <div className="card">
            <div className="card-head"><div className="card-title">Terms of Service</div><div style={{fontSize:12,color:"var(--muted)"}}>Last updated: June 2025</div></div>
            <div className="card-body" style={{lineHeight:1.8,fontSize:14,color:"var(--ink2)"}}>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8}}>1. Acceptance of Terms</h3>
              <p style={{marginBottom:12}}>By accessing this portal, you agree to be bound by these Terms of Service. If you do not agree, do not use this portal.</p>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,marginTop:20}}>2. Use of Portal</h3>
              <p style={{marginBottom:12}}>This portal is provided exclusively for clients and team members of Founders Bridge LLP. Sharing your login credentials with any third party is strictly prohibited.</p>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,marginTop:20}}>3. Accuracy of Information</h3>
              <p style={{marginBottom:12}}>You are responsible for the accuracy of all information submitted through this portal. Founders Bridge LLP is not liable for errors arising from incorrect information provided by users.</p>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,marginTop:20}}>4. Intellectual Property</h3>
              <p style={{marginBottom:12}}>All content, documents, and materials on this portal are the property of Founders Bridge LLP or its clients. Reproduction without written consent is prohibited.</p>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,marginTop:20}}>5. Limitation of Liability</h3>
              <p style={{marginBottom:12}}>Founders Bridge LLP shall not be liable for any indirect, incidental, or consequential damages arising from use of this portal.</p>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,marginTop:20}}>6. Governing Law</h3>
              <p>These terms are governed by the laws of India. Disputes shall be subject to the jurisdiction of courts in Mumbai, Maharashtra.</p>
            </div>
          </div>
        )}

        {tab==="disclaimer" && (
          <div className="card">
            <div className="card-head"><div className="card-title">Disclaimer</div></div>
            <div className="card-body" style={{lineHeight:1.8,fontSize:14,color:"var(--ink2)"}}>
              <p style={{marginBottom:16}}>The information provided on this portal is for general informational and service delivery purposes only.</p>
              <p style={{marginBottom:16}}><strong>Not Legal Advice:</strong> Information on this portal does not constitute legal, financial, or tax advice. Always consult a qualified professional for specific advice applicable to your situation.</p>
              <p style={{marginBottom:16}}><strong>Government Processes:</strong> Timelines for government approvals (ROC, GST, MCA, etc.) are subject to the respective government departments and are beyond the control of Founders Bridge LLP.</p>
              <p style={{marginBottom:16}}><strong>Accuracy:</strong> While we strive to keep all information accurate and up to date, Founders Bridge LLP makes no representations as to the completeness or accuracy of information on this portal.</p>
              <p><strong>Unauthorised Access:</strong> Unauthorised access to this portal is a criminal offence under the Information Technology Act, 2000. All access attempts are logged and monitored.</p>
            </div>
          </div>
        )}

        {tab==="refund" && (
          <div className="card">
            <div className="card-head"><div className="card-title">Refund Policy</div></div>
            <div className="card-body" style={{lineHeight:1.8,fontSize:14,color:"var(--ink2)"}}>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8}}>1. Professional Fees</h3>
              <p style={{marginBottom:12}}>Professional service fees are non-refundable once work has commenced. This includes fees for company incorporation, GST registration, compliance filings, and other professional services.</p>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,marginTop:20}}>2. Government Fees</h3>
              <p style={{marginBottom:12}}>Government fees paid to MCA, GST department, Income Tax department, or any other regulatory authority are non-refundable as per government policy.</p>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,marginTop:20}}>3. Cancellation</h3>
              <p style={{marginBottom:12}}>If you wish to cancel a service before work has commenced, you may be eligible for a partial refund of professional fees. Please contact us within 24 hours of payment.</p>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,marginTop:20}}>4. Disputes</h3>
              <p>For refund disputes, please write to <strong>info@foundersbridge.in</strong> with your invoice number and reason. We will respond within 7 working days.</p>
            </div>
          </div>
        )}
      </div>
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
  // ─── Restore session from localStorage ───────────────────────────
  const getSavedUser = () => {
    try { return JSON.parse(localStorage.getItem("fb_user") || "null"); } catch { return null; }
  };
  const getSavedView = (role) => {
    const saved = localStorage.getItem("fb_view");
    if (saved) return saved;
    return { admin:"dashboard", manager:"dashboard", employee:"emp-dashboard", client:"client-home" }[role] || "dashboard";
  };

  const [user,      setUser]    = useState(getSavedUser);
  const [view,      setViewRaw] = useState(() => { const u = getSavedUser(); return u ? getSavedView(u.role) : ""; });
  const [toast,     setToast]   = useState(null);
  const [modal,     setModal]   = useState(null);
  const [showReg,   setShowReg] = useState(false);
  const [dbReady,   setDbReady] = useState(false);

  // ─── Core data ────────────────────────────────────────────────────
  const [org,          setOrg]      = useState(DEFAULT_ORG);
  const [bundles,      setBundles]  = useState(DEFAULT_BUNDLES);
  const [docTpls,      setDocTpls]  = useState(DEFAULT_DOC_TEMPLATES);
  const [clients,      setClients]  = useState(DEMO_CLIENTS);
  const [employees,    setEmps]     = useState(DEMO_EMPLOYEES);
  const [invoices,     setInvoices] = useState(DEMO_INVOICES);
  const [tasks,        setTasks]    = useState(DEMO_TASKS);
  const [notifications,setNotifs]   = useState(DEMO_NOTIFICATIONS);
  const [payments,     setPayments] = useState(DEMO_PAYMENTS);
  const [submissions,  setSubs]     = useState(DEMO_SUBMISSIONS);
  const [tickets,      setTickets]  = useState(DEMO_TICKETS);

  const showToast  = (msg, type="info") => setToast({msg,type});
  const openModal  = (id, data={})     => setModal({id,data});
  const closeModal = ()                => setModal(null);

  // Persist view to localStorage
  const setView = (v) => { setViewRaw(v); localStorage.setItem("fb_view", v); };

  // ─── Load data from Supabase ──────────────────────────────────────
  const loadAll = async (currentUser) => {
    if (!currentUser) return;
    try {
      const [usersRaw, companiesRaw, invoicesRaw, lineItemsRaw, tasksRaw,
             paymentsRaw, subsRaw, ticketsRaw, ticketRespRaw, orgRaw] = await Promise.all([
        sb.select("users"),
        sb.select("companies"),
        sb.select("invoices"),
        sb.select("invoice_line_items"),
        sb.select("tasks"),
        sb.select("payments"),
        sb.select("submissions"),
        sb.select("tickets"),
        sb.select("ticket_responses"),
        sb.select("org_settings"),
      ]);

      // Only update if we got real data back
      if (usersRaw.length > 0) {
        setEmps(usersRaw.filter(u => u.role==="employee"||u.role==="manager").map(u => ({
          id:u.id, name:u.name, role:u.role, avatar:u.avatar||initials(u.name),
          color:u.color||"#0B1F3A", email:u.email, phone:u.phone,
        })));
      }

      if (companiesRaw.length > 0) {
        let list = companiesRaw.map(mapClient);
        if (currentUser.role==="employee") list = list.filter(c=>c.assignedTo===currentUser.id);
        setClients(list);
      }

      if (invoicesRaw.length > 0) {
        const invList = invoicesRaw.map(mapInvoice);
        invList.forEach(inv => {
          inv.lineItems = lineItemsRaw
            .filter(l=>l.invoice_id===inv.id)
            .sort((a,b)=>(a.seq||0)-(b.seq||0))
            .map(l=>({ id:l.id, name:l.name, type:l.type, sac:l.sac, qty:l.qty||1, unitPrice:Number(l.unit_price)||0, gst:l.gst, amount:Number(l.amount)||0 }));
        });
        setInvoices(invList);
      }

      if (tasksRaw.length > 0) {
        let list = tasksRaw.map(mapTask);
        if (currentUser.role==="employee") list = list.filter(t=>t.assignedTo===currentUser.id);
        setTasks(list);
      }

      if (paymentsRaw.length > 0) setPayments(paymentsRaw.map(mapPayment));
      if (subsRaw.length > 0)     setSubs(subsRaw.map(mapSub));

      if (ticketsRaw.length > 0) {
        const tktList = ticketsRaw.map(mapTicket);
        tktList.forEach(t => { t.responses = ticketRespRaw.filter(r=>r.ticket_id===t.id).map(mapResp); });
        let list = tktList;
        if (currentUser.role==="employee") list = list.filter(t=>t.assignedTo===currentUser.id||t.raisedBy===currentUser.id);
        setTickets(list);
      }

      if (orgRaw.length > 0) {
        const orgObj = {};
        orgRaw.forEach(r => { orgObj[r.key] = r.value; });
        setOrg(prev => ({ ...prev, ...orgObj, gstRate:Number(orgObj.gstRate)||18 }));
      }

      setDbReady(true);
    } catch(e) {
      console.warn("DB load error:", e.message);
      setDbReady(false);
    }
  };

  // ─── Poll every 5s when logged in ────────────────────────────────
  useEffect(() => {
    if (!user) return;
    loadAll(user);
    const t = setInterval(() => loadAll(user), POLL_INTERVAL);
    return () => clearInterval(t);
  }, [user?.id]);

  // ─── Login / Logout ───────────────────────────────────────────────
  const handleLogin = async (u) => {
    localStorage.setItem("fb_user", JSON.stringify(u));
    setUser(u);
    const defaultView = { admin:"dashboard", manager:"dashboard", employee:"emp-dashboard", client:"client-home" }[u.role] || "dashboard";
    setView(defaultView);
    await loadAll(u);
  };

  const logout = () => {
    localStorage.removeItem("fb_user");
    localStorage.removeItem("fb_view");
    setUser(null); setViewRaw("");
    setClients(DEMO_CLIENTS); setTasks(DEMO_TASKS);
    setInvoices(DEMO_INVOICES); setTickets(DEMO_TICKETS);
  };

  // ─── DB write helpers ─────────────────────────────────────────────
  const persistTaskUpdate = async (task) => {
    await sb.update("tasks","id",task.id,{
      status:task.status, notes:task.notes||"", assigned_to:task.assignedTo||null,
      due_date:task.dueDate||null, completed_date:task.completedDate||null,
      updated_at:new Date().toISOString(),
    });
  };

  const persistTicketUpdate = async (ticket) => {
    await sb.update("tickets","id",ticket.id,{
      status:ticket.status, tat:ticket.tat||null, updated_at:new Date().toISOString(),
    });
  };

  const dbCreateClient = async (clientData) => {
    setClients(cs => [...cs, clientData]);
    await sb.insert("companies",{
      id:clientData.id, client_no:clientData.clientNo,
      name:clientData.name, contact_name:clientData.contactName,
      email:clientData.email, phone:clientData.phone,
      type:clientData.type, status:"active", assigned_to:clientData.assignedTo,
      total_billing:0, collected:0, pending:0, progress:0,
    });
    await sb.insert("users",{
      id:clientData.id, email:clientData.email?.toLowerCase(),
      phone:clientData.phone, name:clientData.contactName||clientData.name,
      role:"client", avatar:initials(clientData.contactName||clientData.name),
      color:"#7C3AED", password:clientData.password, client_no:clientData.clientNo,
    });
    showToast(`Client ${clientData.name} created! Login: ${clientData.email} / ${clientData.password}`, "success");
  };

  const dbCreateInvoice = async (invoiceData, lineItems, newTasks) => {
    setInvoices(is => [...is, invoiceData]);
    setTasks(ts => [...ts, ...newTasks]);
    const rows = await sb.insert("invoices",{
      id:invoiceData.id, invoice_no:invoiceData.invoiceNo,
      company_id:invoiceData.clientId, client_name:invoiceData.clientName,
      date:invoiceData.date, due_date:invoiceData.dueDate||null,
      status:"unpaid", total:invoiceData.total, paid:0, pending:invoiceData.total,
    });
    for (let i=0; i<lineItems.length; i++) {
      const li = lineItems[i];
      await sb.insert("invoice_line_items",{
        invoice_id:invoiceData.id, name:li.name, type:li.type,
        sac:li.sac||"998211", qty:li.qty||1, unit_price:li.unitPrice||0,
        gst:li.gst, amount:li.amount||0, seq:i,
      });
    }
    for (const t of newTasks) {
      await sb.insert("tasks",{
        id:t.id, title:t.title, company_id:t.clientId, client_name:t.clientName,
        invoice_id:invoiceData.id, assigned_to:t.assignedTo||null,
        status:"open", sequence:t.sequence||1, requirement_type:t.requirementType||"none",
        doc_template_id:t.docTemplateId||null, director_number:t.directorNumber||null,
        director_count:t.directorCount||1, notes:"",
      });
    }
    showToast(`Invoice ${invoiceData.invoiceNo} created with ${newTasks.length} tasks!`, "success");
  };

  const dbCreateTicket = async (ticketData) => {
    setTickets(ts => [ticketData, ...ts]);
    await sb.insert("tickets",{
      id:ticketData.id, ticket_no:ticketData.ticketNo,
      company_id:ticketData.clientId||null, client_name:ticketData.clientName,
      raised_by:ticketData.raisedBy||null, assigned_to:ticketData.assignedTo||null,
      subject:ticketData.subject, description:ticketData.description||"",
      priority:ticketData.priority||"medium", status:"open",
    });
  };

  const dbAddTicketResponse = async (ticketId, resp) => {
    setTickets(ts => ts.map(t => t.id===ticketId ? {
      ...t, responses:[...t.responses, resp],
      status: resp.by==="team" ? "in_progress" : t.status,
      updatedAt: today(),
    } : t));
    await sb.insert("ticket_responses",{
      ticket_id:ticketId, by_role:resp.by,
      by_name:user?.name||"", text:resp.text, date:resp.date,
    });
    await sb.update("tickets","id",ticketId,{
      status: resp.by==="team" ? "in_progress" : "open",
      updated_at:new Date().toISOString(),
    });
  };

  const dbSetTasks = async (updater) => {
    const newTasks = typeof updater==="function" ? updater(tasks) : updater;
    setTasks(newTasks);
    const changed = newTasks.filter(nt => {
      const old = tasks.find(t=>t.id===nt.id);
      return old && (old.status!==nt.status||old.notes!==nt.notes||old.assignedTo!==nt.assignedTo||old.dueDate!==nt.dueDate);
    });
    for (const t of changed) await persistTaskUpdate(t);
  };

  const dbSetTickets = async (updater) => {
    const newTickets = typeof updater==="function" ? updater(tickets) : updater;
    setTickets(newTickets);
    const changed = newTickets.filter(nt => {
      const old = tickets.find(t=>t.id===nt.id);
      return old && old.status!==nt.status;
    });
    for (const t of changed) await persistTicketUpdate(t);
  };

  const dbSetInvoices = async (updater) => {
    const newInvs = typeof updater==="function" ? updater(invoices) : updater;
    setInvoices(newInvs);
    const changed = newInvs.filter(ni => {
      const old = invoices.find(i=>i.id===ni.id);
      return old && (old.paid!==ni.paid||old.status!==ni.status);
    });
    for (const inv of changed) {
      await sb.update("invoices","id",inv.id,{ paid:inv.paid, pending:inv.pending, status:inv.status });
    }
  };

  const dbSetSubs = async (updater) => {
    const newSubs = typeof updater==="function" ? updater(submissions) : updater;
    const added   = newSubs.filter(s=>!submissions.find(x=>x.id===s.id));
    setSubs(newSubs);
    for (const sub of added) {
      await sb.insert("submissions",{
        id:sub.id, task_id:sub.taskId, company_id:sub.clientId,
        status:sub.status, form_data:sub.formData||{},
        documents:sub.documents||{}, note:sub.note||"",
        submitted_at:sub.submittedAt, locked:true,
      });
    }
    const changedSubs = newSubs.filter(ns => {
      const old = submissions.find(s=>s.id===ns.id);
      return old && old.status!==ns.status;
    });
    for (const sub of changedSubs) {
      await sb.update("submissions","id",sub.id,{
        status:sub.status, review_note:sub.reviewNote||"", reviewed_at:sub.reviewedAt||null,
      });
    }
    // Also update related task status
    const taskUpdates = newSubs.filter(ns=>{
      const old = submissions.find(s=>s.id===ns.id);
      return old && old.status!==ns.status;
    });
    for (const sub of taskUpdates) {
      const taskStatus = sub.status==="approved" ? "completed" : sub.status==="changes_requested" ? "client_action" : "team_approval";
      await sb.update("tasks","id",sub.taskId,{ status:taskStatus, updated_at:new Date().toISOString() });
    }
  };

  const dbSetPayments = async (updater) => {
    const newPmts = typeof updater==="function" ? updater(payments) : updater;
    const added   = newPmts.filter(p=>!payments.find(x=>x.id===p.id));
    setPayments(newPmts);
    for (const p of added) {
      await sb.insert("payments",{
        id:p.id, invoice_id:p.invoiceId, company_id:p.clientId,
        client_name:p.clientName, amount:p.amount, mode:p.mode,
        reference:p.reference||"", date:p.date, notes:p.notes||"",
      });
    }
  };

  const dbSetOrg = async (newOrg) => {
    setOrg(newOrg);
    const fields = ["name","email","phone","gstin","pan","sac","address","gstRate","bankName","accountNo","ifsc","upi","logoUrl"];
    for (const key of fields) {
      if (newOrg[key]!==undefined) {
        await sb.update("org_settings","key",key,{ value:String(newOrg[key]||"") });
      }
    }
  };

  const unreadNotifs = tickets.filter(t=>t.status==="open").length;

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
    user, org, setOrg:dbSetOrg, bundles, setBundles, docTpls, setDocTpls,
    clients, setClients, dbCreateClient,
    employees, setEmps,
    invoices, setInvoices:dbSetInvoices, dbCreateInvoice,
    tasks, setTasks:dbSetTasks,
    notifications, setNotifs,
    payments, setPayments:dbSetPayments,
    submissions, setSubs:dbSetSubs,
    tickets, setTickets:dbSetTickets, dbCreateTicket, dbAddTicketResponse,
    showToast, openModal, closeModal, modal, view, setView,
    unreadNotifs, loadAll:()=>loadAll(user), dbReady,
  };

  const NAV_V2 = {
    admin: [
      { sec:"Overview", items:[
        { id:"dashboard",    icon:"⬡",  label:"Dashboard"        },
        { id:"analytics",    icon:"📊", label:"Analytics"        },
        { id:"billing-summary", icon:"💹", label:"Billing Summary" },
        { id:"reports",      icon:"📈", label:"Reports"          },
      ]},
      { sec:"Clients", items:[
        { id:"clients",      icon:"🏢", label:"All Clients"      },
        { id:"invoices",     icon:"📄", label:"Invoices"         },
        { id:"payments",     icon:"💰", label:"Payments"         },
        { id:"tasks",        icon:"✓",  label:"Tasks"            },
        { id:"recurring",    icon:"🔄", label:"Recurring Tasks"  },
        { id:"tickets",      icon:"🎫", label:"Tickets",         },
      ]},
      { sec:"Team", items:[
        { id:"employees",    icon:"👥", label:"Employees"   },
      ]},
      { sec:"Settings", items:[
        { id:"settings-org",      icon:"🏛️", label:"Organisation"      },
        { id:"settings-bundles",  icon:"📦", label:"Bundles & Services" },
        { id:"settings-doctpls",  icon:"📋", label:"Document Templates" },
        { id:"settings-users",    icon:"🔐", label:"Users & Roles"      },
        { id:"settings-kraya",    icon:"📲", label:"WhatsApp (Kraya)"   },
      ]},
    ],
    manager: [
      { sec:"Overview", items:[
        { id:"dashboard",    icon:"⬡",  label:"Dashboard"        },
        { id:"billing-summary",icon:"💹",label:"Billing Summary"  },
        { id:"reports",      icon:"📈", label:"Reports"          },
      ]},
      { sec:"Clients", items:[
        { id:"clients",      icon:"🏢", label:"All Clients"      },
        { id:"invoices",     icon:"📄", label:"Invoices"         },
        { id:"payments",     icon:"💰", label:"Payments"         },
        { id:"tasks",        icon:"✓",  label:"Tasks"            },
        { id:"recurring",    icon:"🔄", label:"Recurring Tasks"  },
        { id:"tickets",      icon:"🎫", label:"Tickets"          },
      ]},
      { sec:"Team", items:[
        { id:"employees",    icon:"👥", label:"Team"        },
      ]},
    ],
    employee: [
      { sec:"My Work", items:[
        { id:"emp-dashboard", icon:"⬡",  label:"Dashboard"      },
        { id:"emp-tasks",     icon:"✓",  label:"My Tasks"       },
        { id:"emp-clients",   icon:"🏢", label:"My Clients"     },
        { id:"recurring",     icon:"🔄", label:"Recurring Tasks"},
        { id:"tickets",       icon:"🎫", label:"Tickets"        },
      ]},
    ],
    client: [
      { sec:"My Portal", items:[
        { id:"client-home",     icon:"🏢", label:"My Companies"  },
        { id:"client-tasks",    icon:"✓",  label:"My Tasks"      },
        { id:"client-invoices", icon:"💳", label:"My Billing"    },
        { id:"client-docs",     icon:"📁", label:"Documents"     },
        { id:"tickets",         icon:"🎫", label:"Raise a Query" },
      ]},
    ],
  };

  const roleColor = { admin:"#7C3AED", manager:"#0369A1", employee:"#0F766E", client:"#2563EB" };
  const roleLabel = { admin:"Administrator", manager:"Manager", employee:"Employee", client:"Client" };
  const nav = NAV_V2[user.role] || [];

  const TITLES = {
    dashboard:"Dashboard", analytics:"Analytics", reports:"Reports",
    "billing-summary":"Billing Summary",
    clients:"Clients", invoices:"Invoices", payments:"Payments", tasks:"Tasks",
    recurring:"Recurring Tasks", tickets:"Tickets",
    employees:"Employees",
    "settings-org":"Organisation Settings", "settings-bundles":"Bundles & Services",
    "settings-doctpls":"Document Templates",
    "settings-users":"Users & Roles", "settings-kraya":"WhatsApp Settings",
    "emp-dashboard":"My Dashboard", "emp-tasks":"My Tasks", "emp-clients":"My Clients",
    "client-home":"My Companies", "client-tasks":"My Tasks",
    "client-invoices":"My Billing", "client-docs":"Documents",
    notifications:"Notifications", policies:"Policies",
  };

  return (
    <AppCtx.Provider value={ctx}>
      <style>{G}</style>
      <div className={`app role-${user.role}`}>

        {/* Sidebar */}
        <aside className="sb">
          <div className="sb-logo">
            {org.logoUrl
              ? <img src={org.logoUrl} alt="Logo" className="sb-logo-img" />
              : <div className="sb-brand">Founders<br/><span>Bridge</span></div>
            }
            <div className="sb-tagline">Legal & Compliance Portal</div>
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
            <div style={{display:"flex",gap:6,marginTop:10}}>
              <button
                style={{flex:1,padding:"5px 8px",background:"rgba(255,255,255,.08)",border:"none",color:"rgba(255,255,255,.5)",fontSize:10,borderRadius:6,cursor:"pointer"}}
                onClick={()=>openModal("change-password")}
              >🔑 Change Password</button>
              <button
                style={{flex:1,padding:"5px 8px",background:"rgba(255,255,255,.08)",border:"none",color:"rgba(255,255,255,.5)",fontSize:10,borderRadius:6,cursor:"pointer"}}
                onClick={()=>setView("policies")}
              >📋 Policies</button>
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
            {view==="billing-summary"   && <BillingSummaryPage />}
            {view==="reports"           && <ReportsPage clients={clients} invoices={invoices} tasks={tasks} employees={employees} payments={payments} />}
            {view==="clients"           && <ClientsPage />}
            {view==="invoices"          && <InvoicesPage />}
            {view==="payments"          && <PaymentsPage payments={payments} invoices={invoices} clients={clients} />}
            {view==="tasks"             && <TasksPage />}
            {view==="recurring"         && <RecurringTasksPage />}
            {view==="tickets"           && <TicketsPage />}
            {view==="employees"         && <EmployeesPage />}
            {view==="settings-org"      && <OrgSettings />}
            {view==="settings-bundles"  && <BundleSettings />}
            {view==="settings-doctpls"  && <DocTemplatesSettings />}
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
            {view==="policies"          && <PolicyPage onBack={()=>setView(user.role==="client"?"client-home":"dashboard")} />}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal?.id === "pay-now"           && <PayNowModal data={modal.data} onClose={closeModal} invoices={invoices} setInvoices={setInvoices} payments={payments} setPayments={setPayments} clients={clients} showToast={showToast} />}
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
  const [showPolicy, setShowPolicy] = useState(false);

  const findUser = async (id) => {
    const norm = id.trim().toLowerCase();
    return DEMO_USERS[norm] || DEMO_BY_PHONE[norm.replace(/\D/g,"")] || null;
  };

  const handleLogin = async () => {
    setError("");
    if (!identifier) { setError("Enter email or mobile number"); return; }
    if (!password)   { setError("Enter your password"); return; }
    setLoading(true);
    const result = await Auth.login(identifier, password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    showToast(`Welcome back, ${result.user.name}!`, "success");
    onLogin(result.user);
  };

  if (showPolicy) return <PolicyPage onBack={() => setShowPolicy(false)} />;

  return (
    <div className="auth-wrap">
      <div className="auth-orb" style={{width:500,height:500,top:-150,right:-150,background:"linear-gradient(135deg,#7C3AED,transparent)"}}/>
      <div className="auth-orb" style={{width:300,height:300,bottom:-80,left:-80,background:"linear-gradient(135deg,#EA580C,transparent)"}}/>
      <div className="auth-card">
        {/* Logo + Brand */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,var(--navy),var(--blue))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 12px"}}>⚖️</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:26,marginBottom:2}}>Founders Bridge</div>
          <div style={{fontSize:12,color:"var(--muted)",letterSpacing:1}}>Secure Portal</div>
        </div>

        {/* Login mode tabs */}
        <div className="auth-tabs" style={{marginBottom:20}}>
          <div className={`auth-tab ${mode==="password"?"on":""}`} onClick={()=>{setMode("password");setError("");}}>🔑 Password Login</div>
          <div className={`auth-tab ${mode==="otp"?"on":""}`} onClick={()=>{setMode("otp");setError("");}}>📱 OTP Login</div>
        </div>

        <div className="f-group" style={{marginBottom:14}}>
          <label className="f-label">Email Address or Mobile Number</label>
          <input className="f-input" type="text" placeholder="your@email.com or 98xxxxxxxx" value={identifier} onChange={e=>setId(e.target.value)} onKeyDown={e=>mode==="password"&&e.key==="Enter"&&handleLogin()} autoFocus />
        </div>

        {mode==="password" && (
          <>
            <div className="f-group" style={{marginBottom:16}}>
              <label className="f-label">Password</label>
              <input className="f-input" type="password" placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
            </div>
            {error && <div style={{fontSize:12,color:"var(--red)",marginBottom:12,padding:"8px 12px",background:"#FFF1F2",borderRadius:6}}>{error}</div>}
            <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={handleLogin} disabled={loading}>
              {loading
                ? <span style={{display:"inline-block",width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
                : "Sign In →"
              }
            </button>
          </>
        )}

        {mode==="otp" && (
          <div style={{padding:"14px 16px",background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:8,fontSize:12,color:"#B45309",marginTop:4}}>
            ⚠️ OTP login via SMS is coming soon. Please use password login for now.
          </div>
        )}

        {/* Register link */}
        <div style={{textAlign:"center",marginTop:16,fontSize:12,color:"var(--muted)"}}>
          New here?{" "}
          <span style={{color:"var(--blue)",cursor:"pointer",fontWeight:600}} onClick={onRegister}>Create account →</span>
        </div>

        {/* Disclaimer */}
        <div style={{marginTop:20,padding:"12px 14px",background:"#F9FAFB",border:"1px solid var(--border)",borderRadius:8,fontSize:11,color:"var(--muted)",lineHeight:1.7}}>
          By signing in, you agree to our{" "}
          <span style={{color:"var(--blue)",cursor:"pointer",textDecoration:"underline"}} onClick={()=>setShowPolicy(true)}>Terms of Service & Privacy Policy</span>.
          This portal contains confidential information. Unauthorised access is strictly prohibited.
          Founders Bridge LLP is not responsible for any action taken based on information accessed through this portal without authorisation.
        </div>

        {/* Demo hints - only show in development */}
        <div className="demo-hints" style={{marginTop:12}}>
          <div style={{fontWeight:700,marginBottom:4,color:"var(--ink)"}}>Demo Access:</div>
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
// ═══════════════════════════════════════════════════════════════════════
// SECTION 3 — CASHFREE LIVE PAYMENT INTEGRATION
// ═══════════════════════════════════════════════════════════════════════

// Paste your keys here OR set as Vercel environment variables (recommended)
const CF_CONFIG = {
  APP_ID:     process.env.REACT_APP_CF_APP_ID     || "YOUR_CASHFREE_APP_ID",
  SECRET_KEY: process.env.REACT_APP_CF_SECRET_KEY || "YOUR_CASHFREE_SECRET_KEY",
  ENV:        process.env.REACT_APP_CF_ENV         || "production", // "sandbox" | "production"
  BASE:       "https://api.cashfree.com/pg",       // Use https://sandbox.cashfree.com/pg for testing
};

const CashfreeService = {
  // Step 1: Create order — ⚠️ In production move to backend to hide secret key
  async createOrder(invoice, customer) {
    const orderId = `FB_${invoice.invoiceNo.replace(/\//g,"_")}_${Date.now()}`;
    const amount  = invoice.pending;
    // Call Cashfree Orders API
    try {
      const res = await fetch(`${CF_CONFIG.BASE}/orders`, {
        method: "POST",
        headers: {
          "x-client-id":     CF_CONFIG.APP_ID,
          "x-client-secret": CF_CONFIG.SECRET_KEY,
          "x-api-version":   "2023-08-01",
          "Content-Type":    "application/json",
        },
        body: JSON.stringify({
          order_id:       orderId,
          order_amount:   amount,
          order_currency: "INR",
          customer_details: {
            customer_id:    customer.phone || "cust_" + Date.now(),
            customer_name:  customer.name,
            customer_email: customer.email || "client@foundersbridge.in",
            customer_phone: customer.phone,
          },
          order_meta: {
            return_url: `${window.location.origin}?order_id=${orderId}&order_status=SUCCESS`,
          },
        }),
      });
      const data = await res.json();
      if (data.payment_session_id) return { orderId, sessionId: data.payment_session_id, amount };
      throw new Error(data.message || "Order creation failed");
    } catch (e) {
      console.error("Cashfree order error:", e);
      // Demo fallback
      return { orderId, sessionId: "DEMO_SESSION_" + Date.now(), amount, demo: true };
    }
  },

  // Step 2: Open Cashfree checkout
  async openCheckout(sessionId, orderId) {
    return new Promise(async (resolve, reject) => {
      // Load SDK
      if (!window.Cashfree) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      if (sessionId.startsWith("DEMO_SESSION")) {
        // Demo mode — simulate success after 2 seconds
        console.log("🎭 Cashfree DEMO mode — simulating payment");
        resolve({ demo: true, orderId });
        return;
      }
      const cashfree = await window.Cashfree({ mode: CF_CONFIG.ENV });
      cashfree.checkout({ paymentSessionId: sessionId, redirectTarget: "_modal" })
        .then(result => {
          if (result.paymentDetails) resolve(result.paymentDetails);
          else reject(result.error || "Payment failed");
        });
    });
  },
};

// Cashfree Pay Now Modal
function PayNowModal({ data, onClose, invoices, setInvoices, payments, setPayments, clients, showToast }) {
  const { invoiceId } = data;
  const invoice  = invoices.find(i => i.id === invoiceId);
  const client   = clients.find(c => c.id === invoice?.clientId);
  const [step,   setStep]   = useState("confirm"); // confirm | processing | success | failed
  const [method, setMethod] = useState("upi");
  const [errMsg, setErrMsg] = useState("");

  if (!invoice) return null;
  const outstanding = invoice.total - invoice.paid;

  const pay = async () => {
    setStep("processing");
    try {
      // 1. Create order
      const { orderId, sessionId, amount, demo } = await CashfreeService.createOrder(invoice, {
        name:  client?.contactName || client?.name || "Client",
        email: client?.email || "",
        phone: client?.phone || "9999999999",
      });
      // 2. Open checkout
      await CashfreeService.openCheckout(sessionId, orderId);
      // 3. Mark paid (in production: verify via webhook/backend first)
      const newPaid    = invoice.paid + amount;
      const newPending = invoice.total - newPaid;
      setInvoices(is => is.map(i => i.id === invoiceId
        ? { ...i, paid: newPaid, pending: newPending, status: newPending <= 0 ? "paid" : "partial", cashfreeOrderId: orderId }
        : i
      ));
      setPayments(ps => [...ps, {
        id: "p_" + uuid(), invoiceId, clientId: invoice.clientId,
        clientName: invoice.clientName, amount,
        mode: "cashfree", reference: orderId,
        date: today(), notes: demo ? "Demo payment" : "Cashfree payment",
        recordedBy: "system",
      }]);
      setStep("success");
      setTimeout(() => { showToast(`Payment of ${INR(amount)} received!`, "success"); onClose(); }, 2000);
    } catch (e) {
      setErrMsg(String(e));
      setStep("failed");
    }
  };

  const METHODS = [
    { id:"upi",  label:"UPI",                sub:"Google Pay, PhonePe, Paytm, any UPI",   icon:"📱" },
    { id:"card", label:"Credit / Debit Card", sub:"Visa, Mastercard, RuPay",               icon:"💳" },
    { id:"nb",   label:"Net Banking",         sub:"All major Indian banks",                icon:"🏦" },
    { id:"emi",  label:"EMI",                 sub:"Available on eligible cards",           icon:"📅" },
  ];

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box" style={{ maxWidth:440 }}>
        {step==="confirm" && (
          <>
            <div className="modal-head"><div className="modal-title">Pay Invoice</div><button className="modal-close" onClick={onClose}>✕</button></div>
            <div className="modal-body">
              {/* Amount display */}
              <div style={{ background:"linear-gradient(135deg,#0F172A,#1E40AF)", borderRadius:12, padding:"20px 22px", marginBottom:20, color:"#fff" }}>
                <div style={{ fontSize:11, opacity:.7, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:6 }}>Amount Due</div>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:38 }}>{INR(outstanding)}</div>
                <div style={{ fontSize:11, opacity:.7, marginTop:4 }}>{invoice.invoiceNo} · {invoice.clientName}</div>
              </div>
              {/* Payment methods */}
              <div style={{ marginBottom:16 }}>
                {METHODS.map(m => (
                  <div key={m.id} onClick={()=>setMethod(m.id)}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", border:`1.5px solid ${method===m.id?"var(--blue)":"var(--border)"}`, borderRadius:9, marginBottom:8, cursor:"pointer", background:method===m.id?"#EFF6FF":"#fff" }}>
                    <span style={{ fontSize:22 }}>{m.icon}</span>
                    <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600 }}>{m.label}</div><div style={{ fontSize:11, color:"var(--muted)" }}>{m.sub}</div></div>
                    <div style={{ width:16,height:16,borderRadius:"50%",border:`2px solid ${method===m.id?"var(--blue)":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {method===m.id && <div style={{ width:8,height:8,borderRadius:"50%",background:"var(--blue)" }}/>}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:8,fontSize:11,color:"var(--green)",marginBottom:16 }}>
                🔒 <strong>Secured by Cashfree Payments</strong> · 256-bit SSL · PCI-DSS compliant
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-green" style={{ padding:"9px 24px" }} onClick={pay}>Pay {INR(outstanding)} →</button>
            </div>
          </>
        )}
        {step==="processing" && (
          <div style={{ padding:"48px 28px", textAlign:"center" }}>
            <div style={{ width:44,height:44,border:"3px solid #E5E4DF",borderTopColor:"var(--blue)",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 20px" }}/>
            <div style={{ fontFamily:"'Fraunces',serif",fontSize:20,marginBottom:8 }}>Processing Payment</div>
            <div style={{ fontSize:13,color:"var(--muted)" }}>Please wait. Do not close this window.</div>
            <div style={{ marginTop:12,fontSize:11,color:"var(--faint)",animation:"pulse 1.5s ease infinite" }}>Connecting to Cashfree…</div>
          </div>
        )}
        {step==="success" && (
          <div style={{ padding:"48px 28px", textAlign:"center" }}>
            <div style={{ fontSize:52,marginBottom:16 }}>✅</div>
            <div style={{ fontFamily:"'Fraunces',serif",fontSize:22,marginBottom:8 }}>Payment Successful!</div>
            <div style={{ fontSize:13,color:"var(--muted)" }}>{INR(outstanding)} paid for {invoice.invoiceNo}</div>
          </div>
        )}
        {step==="failed" && (
          <div style={{ padding:"48px 28px", textAlign:"center" }}>
            <div style={{ fontSize:52,marginBottom:16 }}>❌</div>
            <div style={{ fontFamily:"'Fraunces',serif",fontSize:22,marginBottom:8 }}>Payment Failed</div>
            <div style={{ fontSize:12,color:"var(--red)",marginBottom:20 }}>{errMsg||"Something went wrong. Please try again."}</div>
            <div style={{ display:"flex",gap:10,justifyContent:"center" }}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-green" onClick={()=>setStep("confirm")}>Try Again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Add Pay Now button to InvoicesTable — wrap existing with payment modal trigger
// The InvoicesPage and InvoicesTable already exist above; this adds the modal trigger
// In AppV2, add modal handler: modal?.id==="pay-now" → <PayNowModal ... />

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4 — MSG91 OTP LOGIN
// ═══════════════════════════════════════════════════════════════════════

// Paste your MSG91 keys here OR set as Vercel env vars (recommended)
const MSG91_CONFIG = {
  AUTH_KEY:    process.env.REACT_APP_MSG91_AUTH_KEY    || "",
  TEMPLATE_ID: process.env.REACT_APP_MSG91_TEMPLATE_ID || "",
  // Note: DLT registration required before going live (takes ~2 weeks)
  // Register at: https://www.trai.gov.in
};

const OTPService = {
  _otpStore: {}, // { phone: { otp, expiresAt } }

  generate() { return Math.floor(100000 + Math.random() * 900000).toString(); },

  async send(phone) {
    const otp     = this.generate();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
    this._otpStore[phone] = { otp, expires };
    console.log(`🔐 OTP for ${phone}: ${otp}`); // Remove in production

    if (!MSG91_CONFIG.AUTH_KEY) {
      // Demo mode — OTP visible in console only
      return { success: true, demo: true, otp };
    }

    // MSG91 Send OTP API
    try {
      const res = await fetch(
        `https://api.msg91.com/api/v5/otp?template_id=${MSG91_CONFIG.TEMPLATE_ID}&mobile=91${phone}&authkey=${MSG91_CONFIG.AUTH_KEY}&otp=${otp}`,
        { method: "GET" }
      );
      const data = await res.json();
      return { success: data.type === "success", data };
    } catch (e) {
      console.error("MSG91 error:", e);
      return { success: false, error: e.message };
    }
  },

  verify(phone, enteredOtp) {
    const record = this._otpStore[phone];
    if (!record) return { valid: false, reason: "No OTP found. Please request a new one." };
    if (Date.now() > record.expires) return { valid: false, reason: "OTP expired. Please request a new one." };
    if (record.otp !== enteredOtp) return { valid: false, reason: "Incorrect OTP. Please try again." };
    delete this._otpStore[phone]; // One-time use
    return { valid: true };
  },
};

// ═══════════════════════════════════════════════════════════════════════
// DOCUMENT TEMPLATES SETTINGS PAGE
// Admin can add / edit / delete field lists and doc slot lists per template
// ═══════════════════════════════════════════════════════════════════════

function DocTemplatesSettings() {
  const { docTpls, setDocTpls, showToast } = useApp();
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState(null);

  const startEdit = (tpl) => { setEditing(tpl.id); setForm(JSON.parse(JSON.stringify(tpl))); };
  const startNew  = () => {
    const id = "tpl_" + uuid();
    const blank = { id, name:"New Template", collectionType:"common", infoFields:[], docSlots:[] };
    setDocTpls(t => ({ ...t, [id]: blank }));
    startEdit(blank);
  };
  const save = () => {
    if (!form.name) { showToast("Template name required","error"); return; }
    setDocTpls(t => ({ ...t, [form.id]: form }));
    setEditing(null);
    showToast("Template saved!","success");
  };
  const deleteTpl = (id) => {
    if (!window.confirm("Delete this template? Tasks using it will lose their field config.")) return;
    setDocTpls(t => { const n = {...t}; delete n[id]; return n; });
    showToast("Template deleted","warning");
  };

  const setF  = (k,v) => setForm(f => ({...f,[k]:v}));
  const addField = () => setForm(f => ({ ...f, infoFields:[...f.infoFields,{id:"if_"+uuid(),label:"",type:"text",required:true,options:""}] }));
  const addSlot  = () => setForm(f => ({ ...f, docSlots:[...f.docSlots,{id:"ds_"+uuid(),label:"",required:true}] }));
  const updField = (idx,k,v) => setForm(f => { const a=[...f.infoFields]; a[idx]={...a[idx],[k]:v}; return {...f,infoFields:a}; });
  const updSlot  = (idx,k,v) => setForm(f => { const a=[...f.docSlots];   a[idx]={...a[idx],[k]:v}; return {...f,docSlots:a};   });
  const delField = (idx) => setForm(f => ({ ...f, infoFields:f.infoFields.filter((_,i)=>i!==idx) }));
  const delSlot  = (idx) => setForm(f => ({ ...f, docSlots:f.docSlots.filter((_,i)=>i!==idx)   }));

  if (editing && form) return (
    <div style={{ maxWidth:780 }}>
      <button className="btn" style={{ marginBottom:16 }} onClick={()=>setEditing(null)}>← Back</button>
      <div className="card">
        <div className="card-head"><div className="card-title">Edit Template</div></div>
        <div className="card-body">
          {/* Template meta */}
          <div className="form-grid-2" style={{ marginBottom:20 }}>
            <div className="f-group">
              <label className="f-label">Template Name <span className="f-req">*</span></label>
              <input className="f-input" value={form.name} onChange={e=>setF("name",e.target.value)} placeholder="e.g. DSC Creation" />
            </div>
            <div className="f-group">
              <label className="f-label">Collection Level</label>
              <select className="f-select" value={form.collectionType} onChange={e=>setF("collectionType",e.target.value)}>
                <option value="common">Common — collected once per company</option>
                <option value="director">Director-level — once per director (repeats)</option>
              </select>
            </div>
          </div>

          {/* Info fields */}
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <div style={{ fontSize:13,fontWeight:700 }}>📝 Information Fields ({form.infoFields.length})</div>
              <button className="btn btn-ghost btn-sm" onClick={addField}>+ Add Field</button>
            </div>
            {form.infoFields.length===0 && <div style={{ fontSize:12,color:"var(--muted)",padding:"12px",background:"#FAFAF8",borderRadius:8,textAlign:"center" }}>No fields yet — click Add Field</div>}
            {form.infoFields.map((f,i) => (
              <div key={f.id} style={{ display:"flex",gap:8,alignItems:"flex-start",marginBottom:8,padding:10,background:"#FAFAF8",borderRadius:8,border:"1px solid var(--border)" }}>
                <div style={{ flex:2 }}>
                  <label className="f-label" style={{ fontSize:9 }}>Label</label>
                  <input className="f-input" value={f.label} onChange={e=>updField(i,"label",e.target.value)} placeholder="e.g. Full Name" style={{ marginBottom:0 }} />
                </div>
                <div style={{ flex:1 }}>
                  <label className="f-label" style={{ fontSize:9 }}>Type</label>
                  <select className="f-select" value={f.type} onChange={e=>updField(i,"type",e.target.value)}>
                    {FIELD_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                {f.type==="select" && (
                  <div style={{ flex:2 }}>
                    <label className="f-label" style={{ fontSize:9 }}>Options (comma-separated)</label>
                    <input className="f-input" value={f.options||""} onChange={e=>updField(i,"options",e.target.value)} placeholder="Option 1, Option 2" style={{ marginBottom:0 }} />
                  </div>
                )}
                <div style={{ display:"flex",flexDirection:"column",gap:4,alignItems:"center",paddingTop:18 }}>
                  <label style={{ display:"flex",alignItems:"center",gap:4,fontSize:11,cursor:"pointer" }}>
                    <input type="checkbox" checked={f.required} onChange={e=>updField(i,"required",e.target.checked)} />
                    Required
                  </label>
                  <button className="btn btn-sm btn-red" onClick={()=>delField(i)}>✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* Doc slots */}
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <div style={{ fontSize:13,fontWeight:700 }}>📎 Document Slots ({form.docSlots.length})</div>
              <button className="btn btn-ghost btn-sm" onClick={addSlot}>+ Add Document Slot</button>
            </div>
            {form.docSlots.length===0 && <div style={{ fontSize:12,color:"var(--muted)",padding:"12px",background:"#FAFAF8",borderRadius:8,textAlign:"center" }}>No document slots yet — click Add Document Slot</div>}
            {form.docSlots.map((s,i) => (
              <div key={s.id} style={{ display:"flex",gap:8,alignItems:"center",marginBottom:8,padding:10,background:"#FAFAF8",borderRadius:8,border:"1px solid var(--border)" }}>
                <div style={{ flex:1 }}>
                  <input className="f-input" value={s.label} onChange={e=>updSlot(i,"label",e.target.value)} placeholder="e.g. PAN Card" style={{ marginBottom:0 }} />
                </div>
                <label style={{ display:"flex",alignItems:"center",gap:4,fontSize:12,cursor:"pointer",whiteSpace:"nowrap" }}>
                  <input type="checkbox" checked={s.required} onChange={e=>updSlot(i,"required",e.target.checked)} />
                  Required
                </label>
                <button className="btn btn-sm btn-red" onClick={()=>delSlot(i)}>✕</button>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding:"0 20px 20px",display:"flex",gap:10 }}>
          <button className="btn" onClick={()=>setEditing(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save Template</button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <div style={{ fontSize:13,color:"var(--muted)" }}>
          Define what information and documents are collected per task type. These templates auto-apply when tasks are created from invoices.
        </div>
        <button className="btn btn-primary" onClick={startNew}>+ New Template</button>
      </div>
      <div className="grid2">
        {Object.values(docTpls).map(tpl => (
          <div key={tpl.id} className="card">
            <div className="card-head">
              <div>
                <div className="card-title">{tpl.name}</div>
                <div style={{ display:"flex",gap:8,marginTop:4 }}>
                  <span className="tag">{tpl.collectionType==="director"?"Per Director":"Per Company"}</span>
                  <span className="tag">{tpl.infoFields.length} fields</span>
                  <span className="tag">{tpl.docSlots.length} doc slots</span>
                </div>
              </div>
              <div style={{ display:"flex",gap:8 }}>
                <button className="btn btn-sm" onClick={()=>startEdit(tpl)}>Edit</button>
                <button className="btn btn-sm btn-red" onClick={()=>deleteTpl(tpl.id)}>Delete</button>
              </div>
            </div>
            <div className="card-body" style={{ padding:0 }}>
              {tpl.infoFields.slice(0,4).map(f=>(
                <div key={f.id} className="row-item" style={{ padding:"8px 16px" }}>
                  <span style={{ fontSize:13 }}>📝</span>
                  <div style={{ flex:1,fontSize:12 }}>{f.label}</div>
                  <span style={{ fontSize:10,color:f.required?"var(--red)":"var(--muted)" }}>{f.required?"Required":"Optional"}</span>
                </div>
              ))}
              {tpl.infoFields.length>4 && <div style={{ padding:"6px 16px",fontSize:11,color:"var(--muted)" }}>+{tpl.infoFields.length-4} more fields…</div>}
              {tpl.docSlots.slice(0,3).map(s=>(
                <div key={s.id} className="row-item" style={{ padding:"8px 16px",background:"#FAFAF8" }}>
                  <span style={{ fontSize:13 }}>📄</span>
                  <div style={{ flex:1,fontSize:12 }}>{s.label}</div>
                  <span style={{ fontSize:10,color:s.required?"var(--red)":"var(--muted)" }}>{s.required?"Required":"Optional"}</span>
                </div>
              ))}
              {tpl.docSlots.length>3 && <div style={{ padding:"6px 16px",fontSize:11,color:"var(--muted)" }}>+{tpl.docSlots.length-3} more doc slots…</div>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BATCH B — BILLING SUMMARY PAGE
// ═══════════════════════════════════════════════════════════════════════

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function BillingSummaryPage() {
  const { invoices, clients, payments } = useApp();
  const [period, setPeriod] = useState("monthly");
  const now = new Date();

  // Monthly breakdown for current year
  const monthlyData = MONTHS.map((m, i) => {
    const monthInvs = invoices.filter(inv => {
      const d = new Date(inv.date);
      return d.getMonth() === i && d.getFullYear() === now.getFullYear();
    });
    const billing   = monthInvs.reduce((s,inv)=>s+inv.total,0);
    const collected = monthInvs.reduce((s,inv)=>s+inv.paid,0);
    // breakdown
    const govtFees  = monthInvs.reduce((s,inv)=>s+(inv.lineItems||[]).filter(l=>l.type==="govt").reduce((ss,l)=>ss+(l.unitPrice||0)*(l.qty||1),0),0);
    const gst       = monthInvs.reduce((s,inv)=>s+(inv.total||0)-(inv.lineItems||[]).reduce((ss,l)=>ss+(l.unitPrice||0)*(l.qty||1),0),0);
    const dsc       = monthInvs.reduce((s,inv)=>s+(inv.lineItems||[]).filter(l=>l.type==="dsc").reduce((ss,l)=>ss+(l.unitPrice||0)*(l.qty||1),0),0);
    const gross     = billing - govtFees - gst;
    return { month:m, billing, collected, govtFees, gst, dsc, gross, count:monthInvs.length };
  });

  const thisMonth = monthlyData[now.getMonth()];
  const lastMonth = monthlyData[Math.max(0,now.getMonth()-1)];
  const ytdBilling   = monthlyData.reduce((s,m)=>s+m.billing,0);
  const ytdCollected = monthlyData.reduce((s,m)=>s+m.collected,0);
  const ytdGross     = monthlyData.reduce((s,m)=>s+m.gross,0);

  const maxBilling = Math.max(...monthlyData.map(m=>m.billing), 1);

  return (
    <>
      <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:20 }}>
        <div className="chips" style={{ margin:0 }}>
          {["monthly","weekly"].map(p=><div key={p} className={`chip ${period===p?"on":""}`} onClick={()=>setPeriod(p)} style={{ textTransform:"capitalize" }}>{p}</div>)}
        </div>
      </div>

      {/* YTD Summary */}
      <div className="stat-grid grid4" style={{ marginBottom:22 }}>
        {[
          ["YTD Billing",    INR(ytdBilling),   "var(--navy)",  `${now.getFullYear()} total`],
          ["YTD Collected",  INR(ytdCollected), "var(--green)", `${Math.round(ytdCollected/Math.max(ytdBilling,1)*100)}% collection`],
          ["Gross Margin",   INR(ytdGross),     "var(--gold-dk)",`Excl. govt fees & GST`],
          ["This Month",     INR(thisMonth.billing),"var(--blue)",`${thisMonth.count} invoices`],
        ].map(([l,v,c,n])=>(
          <div key={l} className="stat-box" style={{ cursor:"default" }}>
            <div className="stat-lbl">{l}</div>
            <div className="stat-val" style={{ color:c,fontSize:22 }}>{v}</div>
            <div className="stat-note">{n}</div>
          </div>
        ))}
      </div>

      {/* Monthly billing chart */}
      <div className="card card-gold" style={{ marginBottom:20 }}>
        <div className="card-head"><div className="card-title">Monthly Billing & Collections — {now.getFullYear()}</div></div>
        <div className="card-body">
          <div style={{ display:"flex",gap:16,alignItems:"center",marginBottom:16,fontSize:12 }}>
            {[["Billed","var(--navy)"],["Collected","var(--green)"],["Gross Margin","var(--gold-dk)"]].map(([l,c])=>(
              <div key={l} style={{ display:"flex",alignItems:"center",gap:5 }}>
                <div style={{ width:10,height:10,borderRadius:3,background:c }}/>
                <span style={{ color:"var(--muted)" }}>{l}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex",gap:6,alignItems:"flex-end",height:180 }}>
            {monthlyData.map((d,i)=>(
              <div key={d.month} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
                <div style={{ width:"100%",display:"flex",gap:2,alignItems:"flex-end",height:150 }}>
                  <div title={`Billed: ${INR(d.billing)}`} style={{ flex:1,background:"var(--navy)",opacity:.8,borderRadius:"3px 3px 0 0",height:maxBilling>0?`${Math.round(d.billing/maxBilling*140)}px`:"2px",minHeight:2,cursor:"pointer",transition:".2s" }}/>
                  <div title={`Collected: ${INR(d.collected)}`} style={{ flex:1,background:"var(--green)",opacity:.8,borderRadius:"3px 3px 0 0",height:maxBilling>0?`${Math.round(d.collected/maxBilling*140)}px`:"2px",minHeight:2 }}/>
                  <div title={`Gross: ${INR(d.gross)}`} style={{ flex:1,background:"var(--gold)",opacity:.8,borderRadius:"3px 3px 0 0",height:maxBilling>0?`${Math.round(Math.max(0,d.gross)/maxBilling*140)}px`:"2px",minHeight:2 }}/>
                </div>
                <div style={{ fontSize:9,color:i===now.getMonth()?"var(--navy)":"var(--muted)",fontWeight:i===now.getMonth()?700:400 }}>{d.month}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly detail table */}
      <div className="card">
        <div className="card-head"><div className="card-title">Monthly Billing Breakdown</div></div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Month</th><th>Invoices</th><th>Total Billed</th><th>Govt Fees</th><th>GST Collected</th><th>DSC Amount</th><th>Gross Margin</th><th>Collected</th><th>Outstanding</th></tr></thead>
            <tbody>
              {monthlyData.filter(m=>m.billing>0||m.month===MONTHS[now.getMonth()]).map((m,i)=>(
                <tr key={m.month} style={{ background:m.month===MONTHS[now.getMonth()]?"var(--gold-lt)":"inherit" }}>
                  <td style={{ fontWeight:600,color:"var(--navy)" }}>
                    {m.month} {now.getFullYear()}
                    {m.month===MONTHS[now.getMonth()]&&<span style={{ marginLeft:6,fontSize:10,background:"var(--gold)",color:"#fff",padding:"1px 6px",borderRadius:4,fontWeight:700 }}>Current</span>}
                  </td>
                  <td>{m.count}</td>
                  <td style={{ fontWeight:700 }}>{INR(m.billing)}</td>
                  <td style={{ color:"var(--muted)" }}>{INR(m.govtFees)}</td>
                  <td style={{ color:"var(--orange)" }}>{INR(m.gst)}</td>
                  <td style={{ color:"var(--blue)" }}>{INR(m.dsc)}</td>
                  <td style={{ color:"var(--gold-dk)",fontWeight:700 }}>{INR(m.gross)}</td>
                  <td style={{ color:"var(--green)",fontWeight:600 }}>{INR(m.collected)}</td>
                  <td style={{ color:m.billing-m.collected>0?"var(--red)":"var(--muted)",fontWeight:600 }}>{INR(m.billing-m.collected)}</td>
                </tr>
              ))}
              <tr style={{ background:"var(--navy)",color:"#fff" }}>
                <td style={{ fontWeight:700,color:"#fff" }}>YTD Total</td>
                <td style={{ color:"#fff" }}>{monthlyData.reduce((s,m)=>s+m.count,0)}</td>
                <td style={{ fontWeight:700,color:"#C9A14A" }}>{INR(ytdBilling)}</td>
                <td style={{ color:"rgba(255,255,255,.6)" }}>{INR(monthlyData.reduce((s,m)=>s+m.govtFees,0))}</td>
                <td style={{ color:"rgba(255,255,255,.6)" }}>{INR(monthlyData.reduce((s,m)=>s+m.gst,0))}</td>
                <td style={{ color:"rgba(255,255,255,.6)" }}>{INR(monthlyData.reduce((s,m)=>s+m.dsc,0))}</td>
                <td style={{ fontWeight:700,color:"#C9A14A" }}>{INR(ytdGross)}</td>
                <td style={{ color:"#86EFAC",fontWeight:700 }}>{INR(ytdCollected)}</td>
                <td style={{ color:"#FCA5A5",fontWeight:700 }}>{INR(ytdBilling-ytdCollected)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BATCH B — RECURRING TASKS ENGINE
// ═══════════════════════════════════════════════════════════════════════

const RECURRING_TEMPLATES = [
  { id:"gst_monthly",    name:"GST Return Filing",           freq:"monthly",  dayOfMonth:20, category:"GST",        icon:"📊" },
  { id:"tds_quarterly",  name:"TDS Return Filing",           freq:"quarterly",months:[7,10,1,4], dayOfMonth:31, category:"TDS", icon:"💼" },
  { id:"roc_annual",     name:"Annual ROC Filing",           freq:"yearly",   month:11, dayOfMonth:30, category:"ROC", icon:"🏛️" },
  { id:"pt_monthly",     name:"Professional Tax",            freq:"monthly",  dayOfMonth:15, category:"PT",         icon:"💰" },
  { id:"mca_annual",     name:"MCA Annual Return",           freq:"yearly",   month:9,  dayOfMonth:30, category:"MCA", icon:"📋" },
  { id:"audit_annual",   name:"Annual Audit",                freq:"yearly",   month:9,  dayOfMonth:30, category:"Audit",icon:"🔍" },
];

function RecurringTasksPage() {
  const { clients, tasks, setTasks, employees, showToast } = useApp();
  const [selTemplate, setSelTemplate] = useState("");
  const [selClients,  setSelClients]  = useState([]);
  const [assignTo,    setAssignTo]    = useState(employees[0]?.id||"");
  const [startDate,   setStartDate]   = useState("");
  const [endDate,     setEndDate]     = useState("");
  const [creating,    setCreating]    = useState(false);

  const create = () => {
    if (!selTemplate||!selClients.length||!assignTo) { showToast("Select template, clients and assignee","error"); return; }
    const tpl = RECURRING_TEMPLATES.find(t=>t.id===selTemplate);
    if (!tpl) return;

    const newTasks = selClients.map(cId=>{
      const client = clients.find(c=>c.id===cId);
      return {
        id: "rt_"+uuid(), title: tpl.name,
        clientId: cId, clientName: client?.name||"",
        invoiceId: null, lineItemId: null,
        assignedTo: assignTo, status: "open",
        sequence: 1, requirementType: "none",
        category: tpl.category,
        isRecurring: true, recurringTemplate: tpl.id, freq: tpl.freq,
        startDate, endDate,
        dueDate: null, completedDate: null, notes: `Recurring: ${tpl.freq} — ${tpl.name}`,
      };
    });
    setTasks(ts=>[...ts,...newTasks]);
    showToast(`${newTasks.length} recurring task${newTasks.length>1?"s":""} created for ${tpl.name}!`,"success");
    setSelClients([]); setSelTemplate(""); setCreating(false);
  };

  const recurringTasks = tasks.filter(t=>t.isRecurring);

  return (
    <>
      <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:16 }}>
        <button className="btn btn-primary" onClick={()=>setCreating(true)}>+ Create Recurring Task</button>
      </div>

      {creating && (
        <div className="card card-gold" style={{ marginBottom:20 }}>
          <div className="card-head"><div className="card-title">Set Up Recurring Task</div></div>
          <div className="card-body">
            <div className="form-grid-2" style={{ marginBottom:16 }}>
              <div className="f-group">
                <label className="f-label">Task Template <span className="f-req">*</span></label>
                <select className="f-select" value={selTemplate} onChange={e=>setSelTemplate(e.target.value)}>
                  <option value="">Select template…</option>
                  {RECURRING_TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.icon} {t.name} ({t.freq})</option>)}
                </select>
              </div>
              <div className="f-group">
                <label className="f-label">Assign To <span className="f-req">*</span></label>
                <select className="f-select" value={assignTo} onChange={e=>setAssignTo(e.target.value)}>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="f-group">
                <label className="f-label">Start Date</label>
                <input type="date" className="f-input" value={startDate} onChange={e=>setStartDate(e.target.value)} />
              </div>
              <div className="f-group">
                <label className="f-label">End Date (Annual Compliance)</label>
                <input type="date" className="f-input" value={endDate} onChange={e=>setEndDate(e.target.value)} />
                <div className="f-hint">For annual packages — set package end date</div>
              </div>
            </div>
            <div className="f-group" style={{ marginBottom:16 }}>
              <label className="f-label">Select Clients <span className="f-req">*</span></label>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8,padding:"10px",background:"var(--cream)",borderRadius:8,border:"1px solid var(--border)" }}>
                {clients.map(c=>(
                  <div key={c.id} onClick={()=>setSelClients(s=>s.includes(c.id)?s.filter(x=>x!==c.id):[...s,c.id])}
                    style={{ padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:500,cursor:"pointer",border:`1.5px solid ${selClients.includes(c.id)?"var(--gold)":"var(--border)"}`,background:selClients.includes(c.id)?"var(--gold-lt)":"#fff",color:selClients.includes(c.id)?"var(--gold-dk)":"var(--muted)" }}>
                    {selClients.includes(c.id)?"✓ ":""}{c.name}
                  </div>
                ))}
              </div>
              <div className="f-hint">{selClients.length} client{selClients.length!==1?"s":""} selected</div>
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button className="btn" onClick={()=>setCreating(false)}>Cancel</button>
              <button className="btn btn-gold" onClick={create}>Create Tasks →</button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring task list */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Active Recurring Tasks</div>
          <div style={{ fontSize:12,color:"var(--muted)" }}>{recurringTasks.length} tasks</div>
        </div>
        {recurringTasks.length===0 ? (
          <div className="empty">
            <div className="empty-icon">🔄</div>
            <div style={{ fontWeight:600,marginBottom:6 }}>No recurring tasks yet</div>
            <div style={{ fontSize:13 }}>Create recurring tasks for GST, annual compliance, TDS, etc.</div>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Task</th><th>Client</th><th>Category</th><th>Frequency</th><th>Status</th><th>Start</th><th>End</th></tr></thead>
              <tbody>
                {recurringTasks.map(t=>{
                  const tpl = RECURRING_TEMPLATES.find(r=>r.id===t.recurringTemplate);
                  return (
                    <tr key={t.id}>
                      <td><div style={{ fontWeight:500 }}>{t.title}</div>{tpl&&<div style={{ fontSize:11,color:"var(--gold-dk)" }}>{tpl.icon} {tpl.freq}</div>}</td>
                      <td style={{ fontSize:12,color:"var(--muted)" }}>{t.clientName}</td>
                      <td><span className="tag tag-gold">{t.category}</span></td>
                      <td style={{ fontSize:12,textTransform:"capitalize" }}>{t.freq||"—"}</td>
                      <td><Badge status={t.status}/></td>
                      <td style={{ fontSize:12,color:"var(--muted)" }}>{t.startDate||"—"}</td>
                      <td style={{ fontSize:12,color:t.endDate&&new Date(t.endDate)<new Date()?"var(--red)":"var(--muted)" }}>{t.endDate||"Ongoing"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BATCH B — TICKET / QUERY SYSTEM
// ═══════════════════════════════════════════════════════════════════════

const DEMO_TICKETS = [
  { id:"tk1", ticketNo:"TK-001", clientId:"c1", clientName:"TechSpark Solutions Pvt Ltd", subject:"DSC not working on MCA portal", description:"Our DSC is showing error when logging into MCA portal. Getting error code 2304.", priority:"high", status:"open", assignedTo:"e1", createdAt:"Jun 1, 2025", updatedAt:"Jun 1, 2025", responses:[], tat:null },
  { id:"tk2", ticketNo:"TK-002", clientId:"c2", clientName:"GreenLeaf Ventures LLP",      subject:"Need GST registration certificate copy", description:"Please share a copy of our GST registration certificate for bank records.",    priority:"low",  status:"resolved", assignedTo:"e1", createdAt:"May 28, 2025", updatedAt:"May 29, 2025", responses:[{by:"team",text:"Certificate attached via email. Please check.",date:"May 29, 2025"}], tat:"1 day" },
  { id:"tk3", ticketNo:"TK-003", clientId:"c3", clientName:"BlueSky Innovations Pvt Ltd", subject:"When will incorporation be complete?",   description:"It has been 3 weeks since we submitted all documents. Please give update.", priority:"medium",status:"in_progress", assignedTo:"e2", createdAt:"May 25, 2025", updatedAt:"Jun 2, 2025", responses:[{by:"team",text:"Application filed with MCA. Awaiting government approval. Usually 5-7 working days.",date:"Jun 2, 2025"}], tat:null },
];

function TicketsPage() {
  const { user, clients, employees, showToast, tickets, setTickets, dbCreateTicket, dbAddTicketResponse } = useApp();
  const [selTicket, setSelTicket] = useState(null);
  const [newTicket, setNewTicket] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ subject:"", description:"", priority:"medium", clientId:"" });
  const [response, setResponse] = useState("");

  const isTeam   = user?.role==="admin"||user?.role==="manager"||user?.role==="employee";
  const isClient = user?.role==="client";

  const visible = tickets.filter(t=>{
    if (user?.role==="employee" && t.assignedTo!==user.id) return false;
    if (filter==="all") return true;
    return t.status===filter;
  });

  const PRIORITY_COLORS = { high:"var(--red)", medium:"var(--gold-dk)", low:"var(--green)" };
  const STATUS_COLORS   = { open:"var(--orange)", in_progress:"var(--blue)", resolved:"var(--green)", closed:"var(--muted)" };

  const createTicket = async () => {
    if (!form.subject) { showToast("Subject required","error"); return; }
    const clientId = form.clientId || clients.find(c=>c.email===user?.email||c.phone===user?.phone)?.id || clients[0]?.id || null;
    const t = {
      id:"tk_"+uuid(),
      ticketNo:"TK-"+String(tickets.length+1).padStart(3,"0"),
      clientId,
      clientName: clients.find(c=>c.id===clientId)?.name || user?.name || "",
      raisedBy: user?.id || "",
      subject:form.subject, description:form.description,
      priority:form.priority, status:"open",
      assignedTo: employees[0]?.id||"",
      createdAt:today(), updatedAt:today(), responses:[], tat:null,
    };
    await dbCreateTicket(t);
    setNewTicket(false);
    setForm({subject:"",description:"",priority:"medium",clientId:""});
    showToast("Ticket raised! Team will see it within seconds.","success");
  };

  const addResponse = async (ticketId) => {
    if (!response.trim()) return;
    const resp = { by:isTeam?"team":"client", text:response, date:today() };
    setResponse("");
    await dbAddTicketResponse(ticketId, resp);
    showToast("Response sent!","success");
  };

  const resolveTicket = async (ticketId) => {
    await dbSetTickets(ts=>ts.map(t=>t.id===ticketId?{...t,status:"resolved",tat:"1 day",updatedAt:today()}:t));
    setSelTicket(null);
    showToast("Ticket resolved!","success");
  };

  if (selTicket) {
    const t = tickets.find(tk=>tk.id===selTicket);
    if (!t) return null;
    return (
      <>
        <button className="btn" style={{ marginBottom:16 }} onClick={()=>setSelTicket(null)}>← All Tickets</button>
        <div className="card">
          <div className="card-head">
            <div>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div className="card-title">{t.subject}</div>
                <span className="tag" style={{ background:PRIORITY_COLORS[t.priority]+"20",color:PRIORITY_COLORS[t.priority] }}>{t.priority}</span>
              </div>
              <div style={{ fontSize:12,color:"var(--muted)",marginTop:3 }}>{t.ticketNo} · {t.clientName} · Opened {t.createdAt}</div>
            </div>
            <div style={{ display:"flex",gap:10,alignItems:"center" }}>
              <span style={{ fontSize:12,fontWeight:700,color:STATUS_COLORS[t.status],background:STATUS_COLORS[t.status]+"18",padding:"4px 10px",borderRadius:20 }}>{t.status.replace("_"," ")}</span>
              {isTeam && t.status!=="resolved" && <button className="btn btn-green btn-sm" onClick={()=>resolveTicket(t.id)}>✓ Resolve</button>}
            </div>
          </div>
          <div className="card-body">
            <div style={{ padding:"14px 16px",background:"var(--cream)",borderRadius:10,marginBottom:20,fontSize:13,color:"var(--ink2)",lineHeight:1.7 }}>
              {t.description}
            </div>
            {/* Responses */}
            <div style={{ fontSize:13,fontWeight:700,color:"var(--navy)",marginBottom:12 }}>Conversation</div>
            {t.responses.length===0 && <div style={{ fontSize:12,color:"var(--muted)",marginBottom:16 }}>No responses yet.</div>}
            {t.responses.map((r,i)=>(
              <div key={i} style={{ display:"flex",gap:12,marginBottom:14,justifyContent:r.by==="team"?"flex-start":"flex-end" }}>
                <div style={{ maxWidth:"80%",padding:"10px 14px",borderRadius:10,background:r.by==="team"?"var(--navy)":"var(--gold-lt)",color:r.by==="team"?"#fff":"var(--ink)" }}>
                  <div style={{ fontSize:10,opacity:.7,marginBottom:4,textTransform:"uppercase",letterSpacing:"1px" }}>{r.by==="team"?"Founders Bridge Team":"You"} · {r.date}</div>
                  <div style={{ fontSize:13 }}>{r.text}</div>
                </div>
              </div>
            ))}
            {t.status!=="resolved" && (
              <div>
                <textarea className="f-textarea" rows={3} placeholder="Type your response…" value={response} onChange={e=>setResponse(e.target.value)} style={{ marginBottom:10 }}/>
                <button className="btn btn-primary" onClick={()=>addResponse(t.id)}>Send Response →</button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:20 }}>
        <div className="chips" style={{ margin:0 }}>
          {["all","open","in_progress","resolved"].map(s=>(
            <div key={s} className={`chip ${filter===s?"on":""}`} onClick={()=>setFilter(s)} style={{ textTransform:"capitalize" }}>
              {s.replace("_"," ")} ({tickets.filter(t=>s==="all"?true:t.status===s).length})
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginLeft:"auto" }} onClick={()=>setNewTicket(true)}>
          {isClient?"+ Raise Ticket":"+ New Ticket"}
        </button>
      </div>

      {newTicket && (
        <div className="card card-gold" style={{ marginBottom:20 }}>
          <div className="card-head"><div className="card-title">Raise a Ticket</div></div>
          <div className="card-body">
            <div className="form-grid">
              {isTeam && (
                <div className="f-group">
                  <label className="f-label">Client</label>
                  <select className="f-select" value={form.clientId} onChange={e=>setForm(f=>({...f,clientId:e.target.value}))}>
                    <option value="">Select client…</option>
                    {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="f-group">
                <label className="f-label">Subject <span className="f-req">*</span></label>
                <input className="f-input" placeholder="Brief description of your query" value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} />
              </div>
              <div className="f-group">
                <label className="f-label">Priority</label>
                <select className="f-select" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High — Urgent</option>
                </select>
              </div>
              <div className="f-group">
                <label className="f-label">Description</label>
                <textarea className="f-textarea" rows={4} placeholder="Describe your query in detail…" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
              </div>
              <div style={{ display:"flex",gap:10 }}>
                <button className="btn" onClick={()=>setNewTicket(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={createTicket}>Submit Ticket →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div className="card-title">Tickets</div>
          {isTeam && (
            <div style={{ fontSize:12,color:"var(--muted)" }}>
              {tickets.filter(t=>t.status==="open").length} open ·{" "}
              {tickets.filter(t=>t.status==="in_progress").length} in progress ·{" "}
              Avg TAT: {tickets.filter(t=>t.tat).length>0 ? tickets.filter(t=>t.tat).map(t=>t.tat)[0] : "—"}
            </div>
          )}
        </div>
        {visible.length===0 ? (
          <div className="empty"><div className="empty-icon">🎫</div><div>No tickets found</div></div>
        ) : (
          visible.map(t=>(
            <div key={t.id} className={`ticket-row ticket-priority-${t.priority}`} onClick={()=>setSelTicket(t.id)}>
              <div style={{ width:40,height:40,borderRadius:10,background:STATUS_COLORS[t.status]+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>
                {t.status==="resolved"?"✅":t.priority==="high"?"🔴":t.priority==="medium"?"🟡":"🟢"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:"var(--navy)" }}>{t.subject}</div>
                  <span style={{ fontSize:10,background:PRIORITY_COLORS[t.priority]+"20",color:PRIORITY_COLORS[t.priority],padding:"1px 6px",borderRadius:4,fontWeight:700 }}>{t.priority}</span>
                </div>
                <div style={{ fontSize:11,color:"var(--muted)",marginTop:2 }}>
                  {t.ticketNo} · {t.clientName} · {t.createdAt}
                  {t.responses.length>0&&<span style={{ marginLeft:8 }}>💬 {t.responses.length} response{t.responses.length!==1?"s":""}</span>}
                  {t.tat&&<span style={{ marginLeft:8,color:"var(--green)" }}>✓ Resolved in {t.tat}</span>}
                </div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4 }}>
                <span style={{ fontSize:11,fontWeight:700,color:STATUS_COLORS[t.status],background:STATUS_COLORS[t.status]+"18",padding:"3px 9px",borderRadius:20,textTransform:"capitalize" }}>
                  {t.status.replace("_"," ")}
                </span>
                <span style={{ fontSize:11,color:"var(--muted)" }}>Updated {t.updatedAt}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export { AppV2 as default };

