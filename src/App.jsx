import { useState, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════════
// ██████╗ ██╗  ██╗ █████╗ ███████╗███████╗    ██████╗
// ██╔══██╗██║  ██║██╔══██╗██╔════╝██╔════╝    ╚════██╗
// ██████╔╝███████║███████║███████╗█████╗       █████╔╝
// ██╔═══╝ ██╔══██║██╔══██║╚════██║██╔══╝       ╚═══██╗
// ██║     ██║  ██║██║  ██║███████║███████╗    ██████╔╝
// ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝    ╚═════╝
// FOUNDERS BRIDGE — PHASE 3
// OTP Login · Cashfree Payments · WhatsApp Notifications · Self-Registration
// ═══════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
// 💳 CASHFREE CONFIG
// Paste your live keys here. Never expose secret key in frontend —
// in production, the order creation call goes through your backend.
// ─────────────────────────────────────────────────────────────────────
const CASHFREE_CONFIG = {
  APP_ID:     "YOUR_CASHFREE_APP_ID",       // ← paste your App ID here
  SECRET_KEY: "YOUR_CASHFREE_SECRET_KEY",   // ← paste your Secret Key here
  ENV:        "production",                 // "sandbox" | "production"
  BASE_URL:   "https://api.cashfree.com/pg", // production URL
  // Sandbox: "https://sandbox.cashfree.com/pg"
};

// ─────────────────────────────────────────────────────────────────────
// 📲 WHATSAPP / KRAYA CONFIG
// Paste your Kraya API details here when ready.
// ─────────────────────────────────────────────────────────────────────
const KRAYA_CONFIG = {
  API_URL:   "https://api.kraya.io/v1/messages",  // ← update to your Kraya endpoint
  API_TOKEN: "YOUR_KRAYA_API_TOKEN",              // ← paste your token here
  // Template names — set these in your Kraya dashboard
  TEMPLATES: {
    OTP_LOGIN:          "fb_otp_login",
    ONBOARDING_SUBMIT:  "fb_onboarding_submitted",
    INVOICE_PAID:       "fb_invoice_paid",
    WELCOME_CLIENT:     "fb_welcome_new_client",
    TEAM_NEW_SUBMISSION:"fb_team_alert_submission",
  },
};

// ─────────────────────────────────────────────────────────────────────
// MOCK DATA (same as v5 — copied here for standalone use)
// ─────────────────────────────────────────────────────────────────────
const TEAM_MEMBERS = {
  tm1: { id:"tm1", name:"CA Priya Sharma",  role:"Compliance & ROC",  phone:"+91 98201 11001", avatar:"PS", color:"#7C3AED" },
  tm2: { id:"tm2", name:"CA Arun Kumar",    role:"GST & Income Tax",  phone:"+91 98201 11002", avatar:"AK", color:"#0369A1" },
  tm3: { id:"tm3", name:"CS Neha Joshi",    role:"Company Secretary", phone:"+91 98201 11003", avatar:"NJ", color:"#0F766E" },
  tm4: { id:"tm4", name:"CA Ravi Menon",    role:"Accounts & Audit",  phone:"+91 98201 11004", avatar:"RM", color:"#B45309" },
};

// User store — in production this is your database
const USER_STORE = {
  // phone → user record
  "9820100001": { id:"u1", name:"Rahul Mehta",  role:"client", avatar:"RM", phone:"9820100001", email:"rahul@techspark.in",  companies:["c1","c2"], clientNo:"FB-2020-0042" },
  "9820100002": { id:"u2", name:"Priya Sharma", role:"team",   avatar:"PS", phone:"9820100002", email:"priya@foundersbridge.com", companies:["c1","c2","c3"], clientNo:null },
  // Demo — any other number gets a "new registration" flow
};

const COMPANIES = {
  c1: { id:"c1", name:"TechSpark Solutions Pvt Ltd", clientNo:"FB-2020-0042", cin:"U74999MH2020PTC123456", gst:"27AABCT1234A1Z5", pan:"AABCT1234A", incorporated:"March 2020", type:"Private Limited", directors:["Rahul Mehta","Anita Sharma"], state:"Maharashtra", assignedTeam:["tm1","tm2"] },
  c2: { id:"c2", name:"GreenLeaf Ventures LLP",      clientNo:"FB-2021-0078", cin:"AAB-1234",              gst:"27AABCG5678B2Z1", pan:"AABCG5678B", incorporated:"July 2021",  type:"LLP",             directors:["Rahul Mehta"],               state:"Maharashtra", assignedTeam:["tm1","tm3"] },
  c3: { id:"c3", name:"BlueSky Innovations Pvt Ltd", clientNo:"FB-2019-0019", cin:"U72900KA2019PTC987654", gst:"29AABCB9876C3Z2", pan:"AABCB9876C", incorporated:"Jan 2019",   type:"Private Limited", directors:["Kiran Patel"],               state:"Karnataka",   assignedTeam:["tm2","tm4"] },
};

const INVOICES = {
  c1:[
    { id:"i1", number:"FB/2025/089", description:"Annual Compliance Package – FY 2025-26", date:"Apr 1, 2025",  amount:85000, paid:85000, due:"Apr 30, 2025", status:"Paid",    customerName:"Rahul Mehta", customerEmail:"rahul@techspark.in", customerPhone:"9820100001" },
    { id:"i2", number:"FB/2025/112", description:"GST Return Filing – Q1 2025",            date:"Jul 5, 2025",  amount:12000, paid:0,     due:"Jul 31, 2025", status:"Unpaid",  customerName:"Rahul Mehta", customerEmail:"rahul@techspark.in", customerPhone:"9820100001" },
    { id:"i3", number:"FB/2024/245", description:"Annual ROC Filing FY 2023-24",           date:"Oct 1, 2024",  amount:18000, paid:9000,  due:"Oct 31, 2024", status:"Partial", customerName:"Rahul Mehta", customerEmail:"rahul@techspark.in", customerPhone:"9820100001" },
    { id:"i4", number:"FB/2025/134", description:"TDS Return Q1 FY 2025-26",              date:"Jul 20, 2025", amount:6500,  paid:0,     due:"Aug 15, 2025", status:"Unpaid",  customerName:"Rahul Mehta", customerEmail:"rahul@techspark.in", customerPhone:"9820100001" },
  ],
  c2:[
    { id:"i5", number:"FB/2025/091", description:"LLP Compliance Package FY 2025-26",     date:"Apr 1, 2025",  amount:45000, paid:45000, due:"Apr 30, 2025", status:"Paid",    customerName:"Rahul Mehta", customerEmail:"rahul@techspark.in", customerPhone:"9820100001" },
    { id:"i6", number:"FB/2025/115", description:"GST Amendment & Filing",                date:"Jul 8, 2025",  amount:5500,  paid:0,     due:"Jul 31, 2025", status:"Unpaid",  customerName:"Rahul Mehta", customerEmail:"rahul@techspark.in", customerPhone:"9820100001" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// CASHFREE PAYMENT SERVICE
// ═══════════════════════════════════════════════════════════════════════

const CashfreeService = {

  // Step 1: Create order on Cashfree
  // ⚠️  In production: move this to your backend (Node/Python/etc.)
  //     to keep your secret key safe. Pass orderId back to frontend.
  async createOrder(invoice, customer) {
    const orderId = `FB_${invoice.number.replace(/\//g,"_")}_${Date.now()}`;
    const orderAmount = invoice.amount - invoice.paid; // outstanding amount

    // In production, call YOUR backend which calls Cashfree:
    // const res = await fetch("/api/create-cashfree-order", { method:"POST", body: JSON.stringify({orderId, orderAmount, customer}) });

    // For now, simulate order creation:
    console.log("Cashfree Order Created:", { orderId, orderAmount, customer });
    return {
      orderId,
      orderAmount,
      orderCurrency: "INR",
      customerDetails: {
        customerId:    customer.phone,
        customerName:  customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
      },
    };
  },

  // Step 2: Load Cashfree JS SDK and open checkout
  async openCheckout(orderData, onSuccess, onFailure) {
    // Load Cashfree SDK dynamically
    if (!window.Cashfree) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
        script.onload  = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const cashfree = await window.Cashfree({ mode: CASHFREE_CONFIG.ENV });

    // In production: get payment_session_id from your backend
    // For demo, we simulate the checkout flow:
    const checkoutOptions = {
      paymentSessionId: "DEMO_SESSION_" + Date.now(), // ← replace with real session ID from backend
      redirectTarget:   "_modal",
    };

    // cashfree.checkout(checkoutOptions).then(result => {
    //   if (result.error)   onFailure(result.error);
    //   if (result.redirect) console.log("Redirect");
    //   if (result.paymentDetails) onSuccess(result.paymentDetails);
    // });

    // DEMO simulation — in production remove this and uncomment above
    console.log("Opening Cashfree checkout for:", orderData);
    return { demo: true, orderId: orderData.orderId };
  },

  // Step 3: Verify payment (always verify server-side)
  async verifyPayment(orderId) {
    // In production: call your backend to verify with Cashfree
    // const res = await fetch(`/api/verify-payment/${orderId}`);
    console.log("Verifying payment:", orderId);
    return { verified: true, orderId };
  },
};

// ═══════════════════════════════════════════════════════════════════════
// WHATSAPP / KRAYA NOTIFICATION SERVICE
// ═══════════════════════════════════════════════════════════════════════

const WhatsAppService = {

  // Generic send — plug in your Kraya endpoint here
  async send(to, templateName, variables = []) {
    const payload = {
      to:       `91${to}`,   // Indian numbers — prefix 91
      type:     "template",
      template: {
        name:       templateName,
        language:   { code: "en" },
        components: variables.length > 0 ? [{
          type:       "body",
          parameters: variables.map(v => ({ type:"text", text: String(v) })),
        }] : [],
      },
    };

    console.log("📲 WhatsApp via Kraya →", to, templateName, variables);

    // In production — uncomment this:
    // const res = await fetch(KRAYA_CONFIG.API_URL, {
    //   method: "POST",
    //   headers: { "Content-Type":"application/json", "Authorization": `Bearer ${KRAYA_CONFIG.API_TOKEN}` },
    //   body: JSON.stringify(payload),
    // });
    // return res.json();

    return { success: true, demo: true }; // demo response
  },

  // Specific notification helpers
  sendOTP:              (phone, otp)                    => WhatsAppService.send(phone, KRAYA_CONFIG.TEMPLATES.OTP_LOGIN,         [otp, "10 minutes"]),
  sendWelcome:          (phone, name)                   => WhatsAppService.send(phone, KRAYA_CONFIG.TEMPLATES.WELCOME_CLIENT,     [name]),
  sendOnboardingAlert:  (phone, clientName, coName)     => WhatsAppService.send(phone, KRAYA_CONFIG.TEMPLATES.ONBOARDING_SUBMIT,  [clientName, coName]),
  sendTeamAlert:        (phone, clientName, coName)     => WhatsAppService.send(phone, KRAYA_CONFIG.TEMPLATES.TEAM_NEW_SUBMISSION,[clientName, coName]),
  sendPaymentConfirm:   (phone, name, amount, invNo)    => WhatsAppService.send(phone, KRAYA_CONFIG.TEMPLATES.INVOICE_PAID,       [name, amount, invNo]),
};

// ═══════════════════════════════════════════════════════════════════════
// OTP SERVICE (UI only — wire Twilio/MSG91/Kraya SMS later)
// ═══════════════════════════════════════════════════════════════════════

const OTPService = {
  // Generates a 6-digit OTP — in production, generate server-side
  generate: () => Math.floor(100000 + Math.random() * 900000).toString(),

  async send(phone, otp) {
    console.log(`📱 OTP ${otp} → ${phone} (demo — wire SMS here)`);
    // Production: call your backend → Twilio/MSG91/Kraya SMS API
    // Also send via WhatsApp as backup:
    await WhatsAppService.sendOTP(phone, otp);
    return { success: true };
  },

  verify(inputOtp, actualOtp) {
    return inputOtp === actualOtp;
  },
};

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

const INR = n => "₹" + Number(n).toLocaleString("en-IN");

const SS = {
  Pending:           {bg:"#FFF7ED",color:"#C84B00",dot:"#F97316"},
  "In Progress":     {bg:"#EFF6FF",color:"#1D4ED8",dot:"#3B82F6"},
  Completed:         {bg:"#F0FDF4",color:"#15803D",dot:"#22C55E"},
  Paid:              {bg:"#F0FDF4",color:"#15803D",dot:"#22C55E"},
  Unpaid:            {bg:"#FFF1F2",color:"#BE123C",dot:"#F43F5E"},
  Partial:           {bg:"#FFFBEB",color:"#B45309",dot:"#F59E0B"},
  Submitted:         {bg:"#EDE9FE",color:"#6D28D9",dot:"#8B5CF6"},
  Approved:          {bg:"#F0FDF4",color:"#15803D",dot:"#22C55E"},
  "Changes Requested":{bg:"#FFF1F2",color:"#BE123C",dot:"#F43F5E"},
  Processing:        {bg:"#EFF6FF",color:"#1D4ED8",dot:"#3B82F6"},
  Failed:            {bg:"#FFF1F2",color:"#BE123C",dot:"#F43F5E"},
};

function Badge({ status, label }) {
  const s = SS[status] || {bg:"#F3F4F6",color:"#6B7280",dot:"#9CA3AF"};
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:s.bg,color:s.color,whiteSpace:"nowrap"}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:s.dot,flexShrink:0}}/>
      {label||status}
    </span>
  );
}

// Toast notification
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  const colors = { success:{bg:"#F0FDF4",border:"#BBF7D0",color:"#15803D",icon:"✅"}, error:{bg:"#FFF1F2",border:"#FECACA",color:"#BE123C",icon:"❌"}, info:{bg:"#EFF6FF",border:"#BFDBFE",color:"#1D4ED8",icon:"📲"}, warning:{bg:"#FFFBEB",border:"#FDE68A",color:"#B45309",icon:"⚠️"} };
  const c = colors[type] || colors.info;
  return (
    <div style={{position:"fixed",top:20,right:20,zIndex:999,display:"flex",alignItems:"center",gap:10,padding:"12px 18px",background:c.bg,border:`1px solid ${c.border}`,borderRadius:10,boxShadow:"0 4px 20px rgba(0,0,0,.12)",fontSize:13,fontWeight:600,color:c.color,maxWidth:360,animation:"slideIn .2s ease"}}>
      <span style={{fontSize:18}}>{c.icon}</span>{msg}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════

const G = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Geist',sans-serif;background:#F5F4F0;color:#111827;-webkit-font-smoothing:antialiased;}
button,input,select,textarea{font-family:'Geist',sans-serif;}
input,select,textarea{outline:none;}
table{border-collapse:collapse;width:100%;}
@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}

.app{display:flex;min-height:100vh;}

/* ─ Sidebar ─ */
.sb{width:232px;min-height:100vh;background:#0F172A;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100;}
.sb-logo{padding:22px 20px 16px;}
.sb-brand{font-family:'Instrument Serif',serif;font-size:20px;color:#fff;line-height:1.2;}
.sb-tag{font-size:9px;color:rgba(255,255,255,.3);letter-spacing:2px;text-transform:uppercase;margin-top:2px;}
.sb-sep{height:1px;background:rgba(255,255,255,.06);margin:0 16px;}
.sb-sec{font-size:9px;color:rgba(255,255,255,.28);letter-spacing:1.8px;text-transform:uppercase;padding:14px 20px 5px;}
.sb-nav{flex:1;overflow-y:auto;padding:6px 10px;}
.sb-item{display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;color:rgba(255,255,255,.55);transition:all .15s;margin-bottom:1px;}
.sb-item:hover{background:rgba(255,255,255,.07);color:#fff;}
.sb-item.on{background:rgba(37,99,235,.45);color:#fff;}
.sb-icon{font-size:15px;width:20px;text-align:center;flex-shrink:0;}
.sb-badge{margin-left:auto;background:#EA580C;color:#fff;font-size:10px;font-weight:700;min-width:18px;height:18px;padding:0 5px;border-radius:9px;display:flex;align-items:center;justify-content:center;}
.sb-copill{margin:8px 10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:9px 12px;cursor:pointer;}
.sb-copill .lbl{font-size:9px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:1.2px;}
.sb-copill .nm{font-size:12px;font-weight:600;color:#fff;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sb-foot{padding:14px;border-top:1px solid rgba(255,255,255,.06);}
.sb-user{display:flex;align-items:center;gap:9px;}
.sb-av{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#2563EB,#EA580C);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;}
.sb-uname{font-size:12px;font-weight:600;color:#fff;}
.sb-urole{font-size:10px;color:rgba(255,255,255,.3);}
.sb-out{margin-left:auto;background:rgba(255,255,255,.08);border:none;color:rgba(255,255,255,.45);font-size:11px;padding:4px 9px;border-radius:6px;cursor:pointer;}
.sb-out:hover{background:rgba(255,255,255,.16);color:#fff;}

/* ─ Main ─ */
.main{margin-left:232px;flex:1;min-height:100vh;display:flex;flex-direction:column;}
.topbar{height:56px;padding:0 26px;display:flex;align-items:center;gap:12px;background:rgba(245,244,240,.95);backdrop-filter:blur(12px);border-bottom:1px solid #E5E4DF;position:sticky;top:0;z-index:50;}
.topbar-title{font-family:'Instrument Serif',serif;font-size:19px;flex:1;}
.footer{position:fixed;bottom:0;left:232px;right:0;height:56px;background:#fff;border-top:1px solid #E5E4DF;display:flex;align-items:center;padding:0 26px;gap:16px;z-index:90;box-shadow:0 -2px 12px rgba(0,0,0,.06);}
.footer-av{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0;}
.footer-cb{margin-left:auto;display:flex;align-items:center;gap:8px;padding:8px 18px;background:#0F172A;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:.15s;}
.footer-cb:hover{background:#2563EB;}
.page{padding:22px 26px 76px;}

/* ─ Buttons ─ */
.btn{padding:7px 15px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid #E5E4DF;background:#fff;color:#374151;transition:.15s;}
.btn:hover{border-color:#111827;color:#111827;}
.btn-primary{background:#111827;color:#fff;border-color:#111827;}
.btn-primary:hover{background:#2563EB;border-color:#2563EB;}
.btn-green{background:#16A34A;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:.15s;display:inline-flex;align-items:center;gap:6px;}
.btn-green:hover{background:#15803D;}
.btn-red{background:#DC2626;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:.15s;}
.btn-red:hover{background:#B91C1C;}

/* ─ Cards ─ */
.card{background:#fff;border:1px solid #E5E4DF;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.07);}
.card-head{padding:15px 20px;border-bottom:1px solid #E5E4DF;display:flex;align-items:center;justify-content:space-between;}
.card-title{font-family:'Instrument Serif',serif;font-size:15px;}
.card-body{padding:18px 20px;}

/* ─ Stats ─ */
.stat-grid{display:grid;gap:14px;margin-bottom:22px;}
.stat-box{background:#fff;border:1px solid #E5E4DF;border-radius:12px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,.07);}
.stat-lbl{font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;}
.stat-val{font-family:'Instrument Serif',serif;font-size:26px;margin:5px 0 2px;}
.stat-note{font-size:11px;color:#9CA3AF;}

/* ─ Company cards ─ */
.co-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px;}
.co-card{background:#fff;border:1px solid #E5E4DF;border-radius:12px;padding:22px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.07);}
.co-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#2563EB,#EA580C);}
.co-card:hover{transform:translateY(-3px);box-shadow:0 6px 24px rgba(0,0,0,.1);}

/* ─ Tabs ─ */
.tabs{display:flex;gap:2px;background:#EEEDE9;padding:3px;border-radius:10px;width:fit-content;margin-bottom:20px;flex-wrap:wrap;}
.tab{padding:7px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;color:#6B7280;transition:.15s;white-space:nowrap;position:relative;}
.tab.on{background:#fff;color:#111827;box-shadow:0 1px 4px rgba(0,0,0,.1);font-weight:600;}

/* ─ Table ─ */
.inv-th{padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #E5E4DF;background:#FAFAF8;}
.inv-td{padding:13px 14px;border-bottom:1px solid #F3F4F6;vertical-align:middle;font-size:13px;}
tr:last-child .inv-td{border-bottom:none;}
tr:hover .inv-td{background:#FAFAF8;}

/* ─ Filter chips ─ */
.chips{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px;align-items:center;}
.chip{padding:5px 13px;border-radius:20px;font-size:12px;font-weight:500;border:1.5px solid #E5E4DF;background:#fff;cursor:pointer;color:#6B7280;transition:.15s;}
.chip.on{background:#111827;color:#fff;border-color:#111827;}
.chip:hover:not(.on){border-color:#111827;color:#111827;}

/* ─ Progress ─ */
.prog-bg{height:6px;background:#F3F4F6;border-radius:6px;overflow:hidden;}
.prog-fill{height:100%;border-radius:6px;transition:width .6s;}

/* ─ Tags ─ */
.tag-sm{display:inline-block;padding:1px 7px;border-radius:4px;font-size:10px;font-weight:700;background:#F3F4F6;color:#6B7280;}
.sr{font-family:'Instrument Serif',serif;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
.info-box{padding:11px 15px;border-radius:10px;display:flex;gap:10px;align-items:flex-start;margin-bottom:16px;}

/* ─ Modal ─ */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;}
.modal-box{background:#fff;border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:fadeUp .2s ease;}

/* ─ Payment modal specific ─ */
.pay-modal{max-width:440px;}
.pay-step{padding:28px;}
.pay-amount-display{background:linear-gradient(135deg,#0F172A,#1E40AF);color:#fff;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;}
.pay-amount-big{font-family:'Instrument Serif',serif;font-size:40px;font-weight:400;}
.pay-method-option{border:1.5px solid #E5E4DF;border-radius:10px;padding:14px 16px;cursor:pointer;transition:.15s;display:flex;align-items:center;gap:12px;margin-bottom:8px;}
.pay-method-option:hover{border-color:#2563EB;background:#F0F6FF;}
.pay-method-option.selected{border-color:#2563EB;background:#EFF6FF;}
.pay-spinner{width:40px;height:40px;border:3px solid #E5E4DF;border-top-color:#2563EB;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto;}

/* ─ Login / Auth ─ */
.auth-screen{min-height:100vh;background:#0F172A;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
.auth-orb{position:absolute;border-radius:50%;opacity:.1;}
.auth-card{background:#fff;border-radius:20px;padding:44px 40px;width:420px;z-index:2;box-shadow:0 32px 80px rgba(0,0,0,.35);animation:fadeUp .3s ease;}
.auth-brand{font-family:'Instrument Serif',serif;font-size:26px;margin-bottom:2px;}
.auth-sub{font-size:11px;color:#6B7280;letter-spacing:2px;text-transform:uppercase;margin-bottom:32px;}
.auth-phone-row{display:flex;border:1.5px solid #E5E4DF;border-radius:10px;overflow:hidden;margin-bottom:16px;transition:.15s;}
.auth-phone-row:focus-within{border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.08);}
.auth-prefix{padding:0 14px;background:#F9FAFB;display:flex;align-items:center;font-size:14px;font-weight:600;color:#374151;border-right:1.5px solid #E5E4DF;white-space:nowrap;}
.auth-phone-input{flex:1;padding:12px 14px;border:none;font-size:15px;background:transparent;letter-spacing:1px;}
.otp-grid{display:flex;gap:10px;justify-content:center;margin:20px 0;}
.otp-box{width:48px;height:54px;border:1.5px solid #E5E4DF;border-radius:10px;text-align:center;font-size:22px;font-weight:700;transition:.15s;}
.otp-box:focus{border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.08);}
.auth-btn{width:100%;padding:13px;background:#111827;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;transition:.15s;display:flex;align-items:center;justify-content:center;gap:8px;}
.auth-btn:hover{background:#2563EB;}
.auth-btn:disabled{background:#E5E4DF;color:#9CA3AF;cursor:not-allowed;}
.auth-link{font-size:12px;color:#2563EB;cursor:pointer;text-decoration:underline;}
.auth-demo-hint{margin-top:20px;padding:12px 14px;background:#F9FAFB;border:1px solid #E5E4DF;border-radius:8px;font-size:11px;color:#6B7280;text-align:center;line-height:1.8;}

/* ─ Registration ─ */
.reg-steps{display:flex;gap:0;margin-bottom:28px;}
.reg-step{flex:1;text-align:center;position:relative;}
.reg-step::after{content:'';position:absolute;top:14px;left:50%;right:-50%;height:2px;background:#E5E4DF;z-index:0;}
.reg-step:last-child::after{display:none;}
.reg-step-dot{width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;position:relative;z-index:1;margin-bottom:6px;}
.reg-step-dot.done{background:#22C55E;color:#fff;}
.reg-step-dot.active{background:#2563EB;color:#fff;box-shadow:0 0 0 4px rgba(37,99,235,.15);}
.reg-step-dot.pending{background:#F3F4F6;color:#9CA3AF;border:2px solid #E5E4DF;}
.reg-step-label{font-size:10px;font-weight:600;color:#6B7280;}

/* ─ Notification centre ─ */
.notif-item{display:flex;align-items:flex-start;gap:12px;padding:14px 18px;border-bottom:1px solid #F3F4F6;transition:background .1s;cursor:pointer;}
.notif-item:hover{background:#FAFAF8;}
.notif-item.unread{background:#F0F6FF;}
.notif-dot{width:8px;height:8px;border-radius:50%;background:#2563EB;flex-shrink:0;margin-top:5px;}
.notif-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}

/* ─ WhatsApp send button ─ */
.wa-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:7px;background:#25D366;color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer;transition:.15s;}
.wa-btn:hover{background:#128C7E;}

/* ─ Cashfree badge ─ */
.cf-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;font-size:11px;font-weight:700;color:#15803D;}

/* ─ Form inputs ─ */
.f-label{font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:5px;}
.f-input{width:100%;padding:10px 13px;border:1.5px solid #E5E4DF;border-radius:8px;font-size:14px;margin-bottom:14px;transition:.15s;}
.f-input:focus{border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.08);}
`;

// ═══════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════

export default function App() {
  const [user,       setUser]       = useState(null);
  const [authScreen, setAuthScreen] = useState("phone"); // phone|otp|register|done
  const [view,       setView]       = useState("companies");
  const [coId,       setCoId]       = useState(null);
  const [coTab,      setCoTab]      = useState("overview");
  const [toast,      setToast]      = useState(null);
  const [showCB,     setShowCB]     = useState(false);
  const [payModal,   setPayModal]   = useState(null);  // invoice being paid
  const [notifOpen,  setNotifOpen]  = useState(false);

  // Notifications store
  const [notifications, setNotifications] = useState([
    { id:"n1", type:"payment",     title:"Invoice Paid",                body:"FB/2025/089 · ₹85,000 received",      time:"2 days ago",  read:true,  icon:"💳" },
    { id:"n2", type:"onboarding",  title:"Onboarding checklist ready",  body:"TechSpark Solutions — please fill",   time:"3 days ago",  read:false, icon:"📋" },
    { id:"n3", type:"task",        title:"Task due soon",               body:"TDS Return Q1 · due Jul 31",          time:"5 days ago",  read:false, icon:"⏰" },
  ]);

  const unreadCount = notifications.filter(n=>!n.read).length;

  const addNotif = (notif) => setNotifications(ns => [{ id:"n"+Date.now(), time:"Just now", read:false, ...notif }, ...ns]);
  const markAllRead = () => setNotifications(ns=>ns.map(n=>({...n,read:true})));
  const showToast = (msg, type="info") => { setToast({msg,type}); };

  const openCo = (id) => { setCoId(id); setCoTab("overview"); setView("company"); };

  // Payment handler
  const handlePayNow = (invoice, company) => {
    setPayModal({ invoice, company });
  };

  const handlePaymentSuccess = (invoice) => {
    showToast(`Payment of ${INR(invoice.amount - invoice.paid)} received for ${invoice.number}`, "success");
    addNotif({ type:"payment", title:"Payment Successful", body:`${invoice.number} · ${INR(invoice.amount-invoice.paid)} paid`, icon:"💳" });
    WhatsAppService.sendPaymentConfirm(user.phone, user.name, INR(invoice.amount-invoice.paid), invoice.number);
    setPayModal(null);
  };

  if (!user) return (
    <>
      <style>{G}</style>
      <AuthFlow
        screen={authScreen}
        setScreen={setAuthScreen}
        onLogin={(u) => { setUser(u); setView(u.role==="team"?"dashboard":"companies"); }}
        showToast={showToast}
        addNotif={addNotif}
      />
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </>
  );

  const activeCo     = coId ? COMPANIES[coId] : null;
  const assignedTeam = activeCo ? (activeCo.assignedTeam||[]).map(id=>TEAM_MEMBERS[id]).filter(Boolean) : [];
  const allInvoices  = user.companies.flatMap(c=>(INVOICES[c]||[]).map(i=>({...i,coName:COMPANIES[c]?.name})));
  const unpaidCnt    = allInvoices.filter(i=>i.status!=="Paid").length;

  const NAV = [
    {sec:"Workspace", items:[
      {id:"companies",  icon:"🏢", label:"My Companies"},
      {id:"dashboard",  icon:"⬡",  label:"Dashboard"},
    ]},
    {sec:"Company", items:[
      {id:"all-invoices", icon:"₹", label:"Invoices", badge:unpaidCnt},
      ...(user.role==="team" ? [{id:"ob-tracker",icon:"📥",label:"Onboarding Tracker"}] : []),
    ]},
    {sec:"Resources", items:[
      {id:"notifications",icon:"🔔",label:"Notifications", badge:unreadCount},
      {id:"settings",     icon:"⚙",  label:"Settings"},
    ]},
  ];

  const TITLES = { companies:"My Companies", dashboard:"Dashboard", "all-invoices":"Invoices", "ob-tracker":"Onboarding Tracker", notifications:"Notifications", settings:"Settings", company:COMPANIES[coId]?.name||"" };

  return (
    <>
      <style>{G}</style>
      <div className="app">
        <aside className="sb">
          <div className="sb-logo"><div className="sb-brand">Founders<br/>Bridge</div><div className="sb-tag">Client Portal</div></div>
          {view==="company"&&coId&&<div className="sb-copill" onClick={()=>setView("companies")}><div className="lbl">Active Entity</div><div className="nm">{COMPANIES[coId]?.name}</div></div>}
          <div className="sb-sep"/>
          <nav className="sb-nav">
            {NAV.map(sec=>(
              <div key={sec.sec}>
                <div className="sb-sec">{sec.sec}</div>
                {sec.items.map(it=>(
                  <div key={it.id} className={`sb-item ${view===it.id?"on":""}`} onClick={()=>{setView(it.id);setCoId(null);}}>
                    <span className="sb-icon">{it.icon}</span>{it.label}
                    {it.badge>0&&<span className="sb-badge">{it.badge}</span>}
                  </div>
                ))}
              </div>
            ))}
          </nav>
          <div className="sb-foot">
            <div className="sb-user">
              <div className="sb-av">{user.avatar}</div>
              <div>
                <div className="sb-uname">{user.name}</div>
                <div className="sb-urole">{user.role==="team"?"Team Member":"Director"}</div>
              </div>
              <button className="sb-out" onClick={()=>setUser(null)}>Exit</button>
            </div>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <div className="topbar-title">{TITLES[view]||""}</div>
            {view==="company"&&coId&&(
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{padding:"4px 12px",background:"#F0F6FF",border:"1px solid #BFDBFE",borderRadius:6,fontSize:11,fontWeight:700,color:"#1D4ED8"}}>
                  Client ID: {COMPANIES[coId].clientNo}
                </div>
                <button className="btn" onClick={()=>setView("companies")}>← Companies</button>
              </div>
            )}
            {/* Notification bell */}
            <div style={{position:"relative",cursor:"pointer"}} onClick={()=>{setView("notifications");setNotifOpen(true);}}>
              <span style={{fontSize:20}}>🔔</span>
              {unreadCount>0&&<span style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"#DC2626",color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadCount}</span>}
            </div>
          </div>

          <div className="page">
            {view==="companies"     && <CoList user={user} openCo={openCo}/>}
            {view==="dashboard"     && <DashboardView user={user} allInvoices={allInvoices} onPayNow={handlePayNow}/>}
            {view==="all-invoices"  && <InvoicesView invoices={allInvoices} onPayNow={handlePayNow}/>}
            {view==="notifications" && <NotificationsView notifications={notifications} onMarkRead={markAllRead}/>}
            {view==="settings"      && <SettingsView user={user} showToast={showToast}/>}
            {view==="company"&&coId && (
              <CompanyView
                coId={coId} tab={coTab} setTab={setCoTab} user={user}
                onPayNow={handlePayNow}
                showToast={showToast}
                addNotif={addNotif}
              />
            )}
          </div>

          {/* Footer with team + callback */}
          {view==="company"&&coId&&(
            <div className="footer">
              <div style={{fontSize:11,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"1px",marginRight:4}}>Your Team</div>
              {assignedTeam.map(tm=>(
                <div key={tm.id} style={{display:"flex",alignItems:"center",gap:8}} title={tm.name}>
                  <div className="footer-av" style={{background:tm.color}}>{tm.avatar}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:600}}>{tm.name}</div>
                    <div style={{fontSize:10,color:"#6B7280"}}>{tm.phone}</div>
                  </div>
                </div>
              ))}
              <button className="footer-cb" onClick={()=>setShowCB(true)}>📞 Request a Call Back</button>
            </div>
          )}
        </div>
      </div>

      {/* Pay Modal */}
      {payModal && (
        <PaymentModal
          invoice={payModal.invoice}
          company={payModal.company}
          user={user}
          onSuccess={()=>handlePaymentSuccess(payModal.invoice)}
          onClose={()=>setPayModal(null)}
          showToast={showToast}
        />
      )}

      {/* Callback Modal */}
      {showCB && <CallbackModal team={assignedTeam} onClose={()=>setShowCB(false)} showToast={showToast}/>}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// AUTH FLOW — Phone + OTP + Registration
// ═══════════════════════════════════════════════════════════════════════

function AuthFlow({ screen, setScreen, onLogin, showToast, addNotif }) {
  const [phone,      setPhone]      = useState("");
  const [otp,        setOtp]        = useState(["","","","","",""]);
  const [actualOtp,  setActualOtp]  = useState("");
  const [loading,    setLoading]    = useState(false);
  const [countdown,  setCountdown]  = useState(0);
  const [regStep,    setRegStep]    = useState(1);
  const [regData,    setRegData]    = useState({ name:"", email:"", company:"", type:"Private Limited", pan:"", gst:"" });
  const otpRefs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) { const t = setTimeout(()=>setCountdown(c=>c-1),1000); return ()=>clearTimeout(t); }
  },[countdown]);

  const sendOtp = async () => {
    if (phone.length < 10) { showToast("Enter a valid 10-digit number","error"); return; }
    setLoading(true);
    const generated = OTPService.generate();
    setActualOtp(generated);
    await OTPService.send(phone, generated);
    setLoading(false);
    setCountdown(30);
    setScreen("otp");
    showToast(`OTP sent to +91 ${phone} via WhatsApp & SMS`,"info");
    console.log(`🔐 DEMO OTP: ${generated}`); // visible in browser console for testing
  };

  const verifyOtp = () => {
    const entered = otp.join("");
    if (entered.length < 6) { showToast("Enter all 6 digits","error"); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (OTPService.verify(entered, actualOtp)) {
        const existingUser = USER_STORE[phone];
        if (existingUser) {
          showToast(`Welcome back, ${existingUser.name}! 🎉`,"success");
          onLogin(existingUser);
        } else {
          // New user → registration
          setScreen("register");
        }
      } else {
        showToast("Incorrect OTP. Please try again.","error");
        setOtp(["","","","","",""]);
        otpRefs[0].current?.focus();
      }
    }, 800);
  };

  const handleOtpChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) otpRefs[idx+1].current?.focus();
    if (!val && idx > 0) otpRefs[idx-1].current?.focus();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if (pasted.length === 6) { setOtp(pasted.split("")); otpRefs[5].current?.focus(); }
  };

  const completeRegistration = async () => {
    if (!regData.name || !regData.email) { showToast("Fill in all required fields","error"); return; }
    setLoading(true);
    // Simulate saving new user
    await new Promise(r=>setTimeout(r,1000));
    const newUser = { id:"new_"+Date.now(), name:regData.name, role:"client", avatar:regData.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2), phone, email:regData.email, companies:[], clientNo:"FB-2025-"+String(Math.floor(Math.random()*9000)+1000) };
    // Notify team
    WhatsAppService.sendTeamAlert(TEAM_MEMBERS.tm1.phone.replace("+91",""), regData.name, regData.company||"New Company");
    setLoading(false);
    setScreen("done");
    setTimeout(() => {
      showToast(`Welcome to Founders Bridge, ${regData.name}!`,"success");
      onLogin(newUser);
    }, 2000);
  };

  const BG = (
    <>
      <div className="auth-orb" style={{width:500,height:500,top:-150,right:-150,background:"linear-gradient(135deg,#2563EB,transparent)"}}/>
      <div className="auth-orb" style={{width:300,height:300,bottom:-80,left:-80,background:"linear-gradient(135deg,#EA580C,transparent)"}}/>
    </>
  );

  // ── Phone entry ──
  if (screen === "phone") return (
    <div className="auth-screen">
      {BG}
      <div className="auth-card">
        <div className="auth-brand">Founders Bridge</div>
        <div className="auth-sub">Secure Client Portal</div>

        <div style={{marginBottom:10}}>
          <label className="f-label">Mobile Number</label>
          <div className="auth-phone-row">
            <div className="auth-prefix">🇮🇳 +91</div>
            <input className="auth-phone-input" type="tel" maxLength={10} placeholder="98765 00000" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} onKeyDown={e=>e.key==="Enter"&&sendOtp()}/>
          </div>
        </div>
        <button className="auth-btn" onClick={sendOtp} disabled={loading||phone.length<10} style={{marginBottom:12}}>
          {loading ? <><span style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Sending OTP…</> : <>Get OTP →</>}
        </button>

        <div className="auth-demo-hint">
          <strong>Demo numbers:</strong><br/>
          Client: <strong>9820100001</strong> · Team: <strong>9820100002</strong><br/>
          Any other number → new registration flow<br/>
          Check browser console for OTP (📱 DEMO OTP: XXXXXX)
        </div>
      </div>
    </div>
  );

  // ── OTP entry ──
  if (screen === "otp") return (
    <div className="auth-screen">
      {BG}
      <div className="auth-card">
        <button onClick={()=>setScreen("phone")} style={{background:"none",border:"none",color:"#6B7280",cursor:"pointer",fontSize:13,marginBottom:20,display:"flex",alignItems:"center",gap:4}}>← Change number</button>
        <div className="auth-brand">Verify OTP</div>
        <div className="auth-sub">Sent to +91 {phone}</div>

        <div style={{textAlign:"center",marginBottom:8}}>
          <div style={{fontSize:13,color:"#6B7280",marginBottom:16}}>Enter the 6-digit code</div>
          <div className="otp-grid" onPaste={handleOtpPaste}>
            {otp.map((d,i)=>(
              <input key={i} ref={otpRefs[i]} className="otp-box" type="tel" maxLength={1} value={d} onChange={e=>handleOtpChange(i,e.target.value)} onKeyDown={e=>{ if(e.key==="Backspace"&&!d&&i>0) otpRefs[i-1].current?.focus(); }} autoFocus={i===0}/>
            ))}
          </div>
        </div>

        <button className="auth-btn" onClick={verifyOtp} disabled={loading||otp.join("").length<6} style={{marginBottom:14}}>
          {loading ? <><span style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Verifying…</> : "Verify & Sign In →"}
        </button>

        <div style={{textAlign:"center",fontSize:12,color:"#6B7280"}}>
          Didn't receive it?{" "}
          {countdown > 0
            ? <span>Resend in {countdown}s</span>
            : <span className="auth-link" onClick={sendOtp}>Resend OTP</span>
          }
        </div>

        <div style={{marginTop:14,padding:"10px 14px",background:"#F0F6FF",border:"1px solid #BFDBFE",borderRadius:8,fontSize:11,color:"#1D4ED8",textAlign:"center"}}>
          📲 OTP also sent via WhatsApp to +91 {phone}
        </div>
      </div>
    </div>
  );

  // ── New user registration ──
  if (screen === "register") {
    const steps = ["Your Details","Company Info","Done"];
    return (
      <div className="auth-screen" style={{alignItems:"flex-start",paddingTop:40,overflowY:"auto"}}>
        {BG}
        <div className="auth-card" style={{maxWidth:520,width:"100%",margin:"0 auto"}}>
          <div className="auth-brand" style={{marginBottom:4}}>Complete Registration</div>
          <div className="auth-sub">Welcome! Let's set up your account.</div>

          {/* Step indicator */}
          <div className="reg-steps">
            {steps.map((s,i)=>(
              <div key={s} className="reg-step">
                <div className={`reg-step-dot ${i+1<regStep?"done":i+1===regStep?"active":"pending"}`}>
                  {i+1<regStep?"✓":i+1}
                </div>
                <div className="reg-step-label">{s}</div>
              </div>
            ))}
          </div>

          {regStep===1&&(
            <>
              <label className="f-label">Full Name *</label>
              <input className="f-input" placeholder="As per PAN card" value={regData.name} onChange={e=>setRegData(d=>({...d,name:e.target.value}))}/>
              <label className="f-label">Email Address *</label>
              <input className="f-input" placeholder="your@email.com" type="email" value={regData.email} onChange={e=>setRegData(d=>({...d,email:e.target.value}))}/>
              <label className="f-label">Mobile (confirmed)</label>
              <input className="f-input" value={"+91 "+phone} readOnly style={{background:"#FAFAF8",color:"#6B7280"}}/>
              <button className="auth-btn" onClick={()=>{ if(!regData.name||!regData.email){showToast("Fill all required fields","error");return;} setRegStep(2); }}>
                Next →
              </button>
            </>
          )}

          {regStep===2&&(
            <>
              <label className="f-label">Company / Business Name *</label>
              <input className="f-input" placeholder="e.g. TechSpark Solutions Pvt Ltd" value={regData.company} onChange={e=>setRegData(d=>({...d,company:e.target.value}))}/>
              <label className="f-label">Business Type</label>
              <select className="f-input" value={regData.type} onChange={e=>setRegData(d=>({...d,type:e.target.value}))}>
                {["Private Limited","LLP","Partnership","Proprietorship","Individual"].map(t=><option key={t}>{t}</option>)}
              </select>
              <label className="f-label">PAN (optional)</label>
              <input className="f-input" placeholder="ABCDE1234F" value={regData.pan} onChange={e=>setRegData(d=>({...d,pan:e.target.value.toUpperCase()}))}/>
              <label className="f-label">GST Number (if registered)</label>
              <input className="f-input" placeholder="27ABCDE1234F1Z5" value={regData.gst} onChange={e=>setRegData(d=>({...d,gst:e.target.value.toUpperCase()}))} style={{marginBottom:20}}/>
              <div style={{display:"flex",gap:10}}>
                <button className="btn" onClick={()=>setRegStep(1)}>← Back</button>
                <button className="auth-btn" style={{flex:1}} onClick={completeRegistration} disabled={loading}>
                  {loading?<><span style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Creating account…</>:"Create Account →"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Success screen ──
  if (screen === "done") return (
    <div className="auth-screen">
      {BG}
      <div className="auth-card" style={{textAlign:"center"}}>
        <div style={{fontSize:56,marginBottom:16}}>🎉</div>
        <div className="auth-brand" style={{marginBottom:8}}>You're all set!</div>
        <div style={{fontSize:13,color:"#6B7280",marginBottom:8}}>Your account has been created.</div>
        <div style={{fontSize:12,color:"#9CA3AF"}}>Our team will be in touch within 24 hours to set up your company profile.</div>
        <div style={{marginTop:20,animation:"pulse 1.5s ease infinite",fontSize:12,color:"#2563EB"}}>Logging you in…</div>
      </div>
    </div>
  );

  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// CASHFREE PAYMENT MODAL
// ═══════════════════════════════════════════════════════════════════════

function PaymentModal({ invoice, company, user, onSuccess, onClose, showToast }) {
  const [step,     setStep]     = useState("confirm"); // confirm | method | processing | success | failed
  const [method,   setMethod]   = useState("upi");
  const [upiId,    setUpiId]    = useState("");

  const outstanding = invoice.amount - invoice.paid;

  const methods = [
    { id:"upi",   label:"UPI",          sub:"Google Pay, PhonePe, Paytm, any UPI app", icon:"📱" },
    { id:"card",  label:"Credit / Debit Card", sub:"Visa, Mastercard, RuPay",          icon:"💳" },
    { id:"nb",    label:"Net Banking",   sub:"All major banks supported",              icon:"🏦" },
    { id:"emi",   label:"EMI",           sub:"Available on select cards",              icon:"📅" },
  ];

  const handlePay = async () => {
    setStep("processing");
    try {
      // Step 1: Create order
      const orderData = await CashfreeService.createOrder(invoice, {
        name:  user.name,
        email: user.email || "client@foundersbridge.in",
        phone: user.phone,
      });

      // Step 2: Open checkout (production: use real session ID from backend)
      await CashfreeService.openCheckout(orderData, onSuccess, (err)=>{ showToast("Payment failed. Please try again.","error"); setStep("failed"); });

      // In demo: simulate success after 2 seconds
      await new Promise(r=>setTimeout(r,2000));
      await CashfreeService.verifyPayment(orderData.orderId);
      setStep("success");
      setTimeout(()=>onSuccess(invoice), 1500);
    } catch(e) {
      console.error("Payment error:", e);
      setStep("failed");
      showToast("Something went wrong. Please try again.","error");
    }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box pay-modal">

        {/* Confirm step */}
        {step==="confirm"&&(
          <div className="pay-step">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div className="sr" style={{fontSize:20}}>Pay Invoice</div>
              <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#9CA3AF",lineHeight:1}}>✕</button>
            </div>

            <div className="pay-amount-display">
              <div style={{fontSize:12,opacity:.7,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:8}}>Amount Due</div>
              <div className="pay-amount-big">{INR(outstanding)}</div>
              <div style={{fontSize:12,opacity:.7,marginTop:6}}>{invoice.number} · {invoice.description}</div>
            </div>

            <div style={{marginBottom:20}}>
              {[["Invoice",invoice.number],["To","Founders Bridge LLP"],["Due Date",invoice.due],["Company",company?.name||""]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #F3F4F6"}}>
                  <span style={{fontSize:12,color:"#6B7280"}}>{l}</span>
                  <span style={{fontSize:12,fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20,padding:"10px 14px",background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:8}}>
              <span className="cf-badge">🔒 Powered by Cashfree</span>
              <span style={{fontSize:11,color:"#6B7280"}}>256-bit SSL secured · PCI-DSS compliant</span>
            </div>

            <button className="btn-green" style={{width:"100%",padding:"13px",fontSize:14,justifyContent:"center"}} onClick={()=>setStep("method")}>
              Continue to Payment →
            </button>
          </div>
        )}

        {/* Method selection */}
        {step==="method"&&(
          <div className="pay-step">
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <button onClick={()=>setStep("confirm")} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#6B7280"}}>←</button>
              <div>
                <div className="sr" style={{fontSize:18}}>Choose Payment Method</div>
                <div style={{fontSize:12,color:"#6B7280"}}>{INR(outstanding)} · {invoice.number}</div>
              </div>
            </div>

            {methods.map(m=>(
              <div key={m.id} className={`pay-method-option ${method===m.id?"selected":""}`} onClick={()=>setMethod(m.id)}>
                <span style={{fontSize:24}}>{m.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{m.label}</div>
                  <div style={{fontSize:11,color:"#6B7280"}}>{m.sub}</div>
                </div>
                <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${method===m.id?"#2563EB":"#D1D5DB"}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {method===m.id&&<div style={{width:9,height:9,borderRadius:"50%",background:"#2563EB"}}/>}
                </div>
              </div>
            ))}

            {method==="upi"&&(
              <div style={{marginTop:12}}>
                <label className="f-label">UPI ID (optional)</label>
                <input className="f-input" placeholder="yourname@upi" value={upiId} onChange={e=>setUpiId(e.target.value)} style={{marginBottom:0}}/>
                <div style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>Leave blank to scan QR or use app</div>
              </div>
            )}

            <button className="btn-green" style={{width:"100%",padding:"13px",fontSize:14,justifyContent:"center",marginTop:16}} onClick={handlePay}>
              Pay {INR(outstanding)} →
            </button>

            <div style={{textAlign:"center",marginTop:12,fontSize:11,color:"#9CA3AF"}}>
              🔒 Secured by Cashfree Payments
            </div>
          </div>
        )}

        {/* Processing */}
        {step==="processing"&&(
          <div className="pay-step" style={{textAlign:"center",padding:"48px 28px"}}>
            <div className="pay-spinner" style={{marginBottom:20}}/>
            <div className="sr" style={{fontSize:20,marginBottom:8}}>Processing Payment</div>
            <div style={{fontSize:13,color:"#6B7280"}}>Please wait. Do not close this window.</div>
            <div style={{marginTop:16,fontSize:12,color:"#9CA3AF",animation:"pulse 1.5s ease infinite"}}>Connecting to Cashfree…</div>
          </div>
        )}

        {/* Success */}
        {step==="success"&&(
          <div className="pay-step" style={{textAlign:"center",padding:"48px 28px"}}>
            <div style={{fontSize:56,marginBottom:16}}>✅</div>
            <div className="sr" style={{fontSize:22,marginBottom:8}}>Payment Successful!</div>
            <div style={{fontSize:13,color:"#6B7280",marginBottom:16}}>{INR(outstanding)} paid for {invoice.number}</div>
            <div style={{padding:"10px 14px",background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:8,fontSize:12,color:"#15803D"}}>
              📲 Payment confirmation sent to your WhatsApp
            </div>
          </div>
        )}

        {/* Failed */}
        {step==="failed"&&(
          <div className="pay-step" style={{textAlign:"center",padding:"48px 28px"}}>
            <div style={{fontSize:56,marginBottom:16}}>❌</div>
            <div className="sr" style={{fontSize:22,marginBottom:8}}>Payment Failed</div>
            <div style={{fontSize:13,color:"#6B7280",marginBottom:20}}>Something went wrong. Please try again.</div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn-green" onClick={()=>setStep("confirm")}>Try Again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPANY LIST
// ═══════════════════════════════════════════════════════════════════════

function CoList({ user, openCo }) {
  return (
    <div className="co-grid">
      {user.companies.map(id=>{
        const co  = COMPANIES[id];
        if (!co) return null;
        const inv = INVOICES[id]||[];
        const out = inv.reduce((s,i)=>s+(i.amount-i.paid),0);
        return (
          <div key={id} className="co-card" onClick={()=>openCo(id)}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
              <span style={{display:"inline-block",padding:"2px 9px",borderRadius:5,fontSize:10,fontWeight:700,background:"#EFF6FF",color:"#2563EB"}}>{co.type}</span>
              <span style={{fontSize:10,fontWeight:700,color:"#6B7280",background:"#F3F4F6",padding:"2px 8px",borderRadius:5}}>{co.clientNo}</span>
            </div>
            <div className="sr" style={{fontSize:18,lineHeight:1.3,marginBottom:8}}>{co.name}</div>
            <div style={{fontSize:11,color:"#6B7280"}}>CIN: {co.cin}</div>
            <div style={{fontSize:11,color:"#6B7280",marginTop:2}}>GST: {co.gst} · PAN: {co.pan}</div>
            <div style={{display:"flex",gap:4,marginTop:8,alignItems:"center"}}>
              <span style={{fontSize:10,color:"#9CA3AF",marginRight:2}}>Team:</span>
              {(co.assignedTeam||[]).map(tid=>{const tm=TEAM_MEMBERS[tid];return tm?(<div key={tid} title={tm.name} style={{width:22,height:22,borderRadius:"50%",background:tm.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",border:"2px solid #fff"}}>{tm.avatar}</div>):null;})}
            </div>
            <div style={{display:"flex",gap:14,marginTop:12,paddingTop:12,borderTop:"1px solid #F3F4F6"}}>
              <div style={{fontSize:10,color:"#6B7280"}}><div style={{fontSize:14,fontWeight:700,color:out>0?"#DC2626":"#16A34A",marginBottom:1}}>{out>0?INR(out):"Nil"}</div>Outstanding</div>
              <div style={{fontSize:10,color:"#6B7280"}}><div style={{fontSize:14,fontWeight:700,color:"#2563EB",marginBottom:1}}>{inv.filter(i=>i.status!=="Paid").length}</div>Open Invoices</div>
            </div>
          </div>
        );
      })}
      {user.companies.length===0&&(
        <div style={{gridColumn:"1/-1",textAlign:"center",padding:"60px 20px",color:"#9CA3AF"}}>
          <div style={{fontSize:40,marginBottom:12}}>🏢</div>
          <div style={{fontSize:16,fontWeight:600,color:"#374151",marginBottom:6}}>No companies yet</div>
          <div style={{fontSize:13}}>Your team will add your company details after your onboarding is approved.</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPANY VIEW (simplified for Phase 3 focus)
// ═══════════════════════════════════════════════════════════════════════

function CompanyView({ coId, tab, setTab, user, onPayNow, showToast, addNotif }) {
  const co       = COMPANIES[coId];
  const invoices = INVOICES[coId] || [];
  const tabs     = ["invoices","notifications"];
  const TLABELS  = { invoices:"Invoices", notifications:"Updates" };

  return (
    <>
      <div className="card" style={{padding:"20px 24px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:16}}>
          <div style={{width:50,height:50,borderRadius:13,background:"linear-gradient(135deg,#0F172A,#2563EB)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🏢</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span className="sr" style={{fontSize:21}}>{co.name}</span>
              <Badge status="Completed" label="Active"/>
              <span style={{background:"#EFF6FF",color:"#2563EB",padding:"2px 9px",borderRadius:5,fontSize:10,fontWeight:700}}>{co.type}</span>
            </div>
            <div style={{display:"flex",gap:22,marginTop:10,flexWrap:"wrap"}}>
              {[["CIN",co.cin],["GST",co.gst],["PAN",co.pan],["State",co.state]].map(([k,v])=>(
                <div key={k}><div style={{fontSize:9,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"1px"}}>{k}</div><div style={{fontSize:12,fontWeight:600,marginTop:2}}>{v}</div></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(t=><div key={t} className={`tab ${tab===t?"on":""}`} onClick={()=>setTab(t)}>{TLABELS[t]}</div>)}
      </div>

      {tab==="invoices"&&<InvoicesView invoices={invoices} onPayNow={(inv)=>onPayNow(inv,co)} showWA/>}
      {tab==="notifications"&&<UpdatesView coId={coId}/>}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// INVOICES VIEW — with Pay Now + WhatsApp receipt
// ═══════════════════════════════════════════════════════════════════════

function InvoicesView({ invoices, onPayNow, showWA }) {
  const tI = invoices.reduce((s,i)=>s+i.amount,0);
  const tP = invoices.reduce((s,i)=>s+i.paid,0);

  return (
    <>
      <div className="stat-grid" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
        {[["Total Invoiced",INR(tI),"#111827"],["Amount Paid",INR(tP),"#16A34A"],["Outstanding",INR(tI-tP),"#DC2626"]].map(([l,v,c])=>(
          <div key={l} className="stat-box"><div className="stat-lbl">{l}</div><div className="stat-val" style={{fontSize:22,color:c}}>{v}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-head">
          <div className="card-title">All Invoices</div>
          <span className="cf-badge">🔒 Cashfree Payments</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table>
            <thead>
              <tr>{["Invoice #","Description","Date","Total","Paid","Outstanding","Due","Status","Action"].map(h=><th key={h} className="inv-th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {invoices.map(i=>{
                const outstanding = i.amount - i.paid;
                const pct = i.amount>0?Math.round(i.paid/i.amount*100):0;
                return (
                  <tr key={i.id}>
                    <td className="inv-td"><span style={{fontSize:11,fontWeight:700,color:"#2563EB"}}>{i.number}</span></td>
                    <td className="inv-td" style={{maxWidth:200,fontSize:12}}>{i.description}</td>
                    <td className="inv-td" style={{fontSize:12,color:"#6B7280",whiteSpace:"nowrap"}}>{i.date}</td>
                    <td className="inv-td" style={{fontWeight:700}}>{INR(i.amount)}</td>
                    <td className="inv-td">
                      <span style={{color:"#16A34A",fontWeight:600}}>{INR(i.paid)}</span>
                      <div className="prog-bg" style={{marginTop:4}}><div className="prog-fill" style={{width:pct+"%",background:"#16A34A"}}/></div>
                    </td>
                    <td className="inv-td" style={{color:outstanding>0?"#DC2626":"#9CA3AF",fontWeight:600}}>{INR(outstanding)}</td>
                    <td className="inv-td" style={{fontSize:12,color:"#6B7280",whiteSpace:"nowrap"}}>{i.due}</td>
                    <td className="inv-td"><Badge status={i.status}/></td>
                    <td className="inv-td">
                      {i.status!=="Paid"&&(
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          <button
                            onClick={()=>onPayNow(i)}
                            style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:"linear-gradient(135deg,#16A34A,#15803D)",color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}
                          >
                            💳 Pay {INR(outstanding)}
                          </button>
                        </div>
                      )}
                      {i.status==="Paid"&&(
                        <span style={{fontSize:12,color:"#16A34A",fontWeight:600}}>✓ Paid</span>
                      )}
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
// DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════════════

function DashboardView({ user, allInvoices, onPayNow }) {
  const tI  = allInvoices.reduce((s,i)=>s+i.amount,0);
  const tP  = allInvoices.reduce((s,i)=>s+i.paid,0);
  const out = tI - tP;
  const unpaid = allInvoices.filter(i=>i.status!=="Paid");

  return (
    <>
      <div className="stat-grid" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
        {[["Companies",user.companies.length,"Active entities","#111827"],["Outstanding",INR(out),`${unpaid.length} open invoices`,out>0?"#DC2626":"#16A34A"],["Total Invoiced",INR(tI),"All time","#111827"]].map(([l,v,n,c])=>(
          <div key={l} className="stat-box"><div className="stat-lbl">{l}</div><div className="stat-val" style={{color:c}}>{v}</div><div className="stat-note">{n}</div></div>
        ))}
      </div>

      {unpaid.length>0&&(
        <div className="card" style={{marginBottom:20}}>
          <div className="card-head">
            <div className="card-title">Pending Payments</div>
            <span className="cf-badge">🔒 Cashfree Secured</span>
          </div>
          {unpaid.map(i=>(
            <div key={i.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",borderBottom:"1px solid #F3F4F6"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{i.description}</div>
                <div style={{fontSize:11,color:"#6B7280",marginTop:2}}>{i.number} · Due {i.due} · {i.coName}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:16,fontWeight:700,color:"#DC2626"}}>{INR(i.amount-i.paid)}</div>
                <Badge status={i.status}/>
              </div>
              <button
                onClick={()=>onPayNow(i)}
                style={{display:"inline-flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:8,background:"linear-gradient(135deg,#16A34A,#15803D)",color:"#fff",border:"none",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}
              >
                💳 Pay Now
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-head"><div className="card-title">Payment History</div></div>
        {allInvoices.filter(i=>i.status==="Paid").map(i=>(
          <div key={i.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 20px",borderBottom:"1px solid #F3F4F6"}}>
            <span style={{fontSize:20}}>✅</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500}}>{i.description}</div>
              <div style={{fontSize:11,color:"#6B7280"}}>{i.number} · {i.coName}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:14,fontWeight:700,color:"#16A34A"}}>{INR(i.amount)}</div>
              <div style={{fontSize:11,color:"#9CA3AF"}}>{i.date}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// NOTIFICATIONS VIEW
// ═══════════════════════════════════════════════════════════════════════

function NotificationsView({ notifications, onMarkRead }) {
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:13,color:"#6B7280"}}>{notifications.filter(n=>!n.read).length} unread notifications</div>
        <button className="btn" style={{fontSize:12}} onClick={onMarkRead}>Mark all as read</button>
      </div>
      <div className="card">
        {notifications.length===0&&<div style={{padding:"40px",textAlign:"center",color:"#9CA3AF"}}>No notifications yet</div>}
        {notifications.map(n=>(
          <div key={n.id} className={`notif-item ${!n.read?"unread":""}`}>
            <div className="notif-icon" style={{background:n.type==="payment"?"#F0FDF4":n.type==="task"?"#FFF7ED":"#EFF6FF"}}>{n.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{n.title}</div>
              <div style={{fontSize:12,color:"#6B7280",marginTop:2}}>{n.body}</div>
              <div style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>{n.time}</div>
            </div>
            {!n.read&&<div className="notif-dot"/>}
          </div>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// UPDATES VIEW (per company)
// ═══════════════════════════════════════════════════════════════════════

function UpdatesView({ coId }) {
  const updates = [
    { id:"u1", icon:"📋", title:"Onboarding checklist published", body:"Your team has published the onboarding checklist. Please fill it at your earliest.", time:"3 days ago", type:"onboarding" },
    { id:"u2", icon:"✅", title:"GST Registration Approved",      body:"Your GSTIN 27AABCT1234A1Z5 has been activated successfully.",                   time:"2 years ago",type:"milestone" },
    { id:"u3", icon:"🏢", title:"Company Incorporated",           body:"TechSpark Solutions Pvt Ltd has been successfully incorporated.",                time:"5 years ago",type:"milestone" },
  ];
  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Company Updates</div></div>
      {updates.map(u=>(
        <div key={u.id} style={{display:"flex",gap:14,padding:"16px 20px",borderBottom:"1px solid #F3F4F6"}}>
          <div style={{width:36,height:36,borderRadius:10,background:u.type==="milestone"?"#F0FDF4":"#EFF6FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{u.icon}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600}}>{u.title}</div>
            <div style={{fontSize:12,color:"#6B7280",marginTop:3}}>{u.body}</div>
            <div style={{fontSize:11,color:"#9CA3AF",marginTop:6}}>{u.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SETTINGS VIEW — API Key configuration
// ═══════════════════════════════════════════════════════════════════════

function SettingsView({ user, showToast }) {
  const [cfAppId,    setCfAppId]    = useState(CASHFREE_CONFIG.APP_ID==="YOUR_CASHFREE_APP_ID"?"":CASHFREE_CONFIG.APP_ID);
  const [cfSecret,   setCfSecret]   = useState("");
  const [kraToken,   setKraToken]   = useState(KRAYA_CONFIG.API_TOKEN==="YOUR_KRAYA_API_TOKEN"?"":KRAYA_CONFIG.API_TOKEN);
  const [kraUrl,     setKraUrl]     = useState(KRAYA_CONFIG.API_URL);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken,  setShowToken]  = useState(false);

  return (
    <div style={{maxWidth:640}}>

      {/* Cashfree */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-head">
          <div className="card-title">💳 Cashfree Payment Gateway</div>
          <span className="cf-badge">{cfAppId?"✓ Configured":"Not configured"}</span>
        </div>
        <div className="card-body">
          <div className="info-box" style={{background:"#EFF6FF",border:"1px solid #BFDBFE"}}>
            <span>ℹ️</span>
            <div style={{fontSize:12,color:"#1D4ED8"}}>Get your API keys from <strong>merchant.cashfree.com → Developers → API Keys</strong>. Use Production keys for live payments. Keep your Secret Key confidential — in production, store it on your backend server, never in frontend code.</div>
          </div>
          <label className="f-label">App ID (Client ID)</label>
          <input className="f-input" placeholder="CF_APP_ID_XXXXXXXX" value={cfAppId} onChange={e=>setCfAppId(e.target.value)}/>
          <label className="f-label">Secret Key</label>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <input className="f-input" style={{marginBottom:0,flex:1,fontFamily:showSecret?"inherit":"monospace",letterSpacing:showSecret?"normal":"3px"}} type={showSecret?"text":"password"} placeholder="CFsk_XXXXXXXX" value={cfSecret} onChange={e=>setCfSecret(e.target.value)}/>
            <button className="btn" style={{flexShrink:0}} onClick={()=>setShowSecret(s=>!s)}>{showSecret?"Hide":"Show"}</button>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:12,fontWeight:600}}>Environment:</span>
              {["sandbox","production"].map(e=>(
                <span key={e} style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",background:CASHFREE_CONFIG.ENV===e?"#111827":"#F3F4F6",color:CASHFREE_CONFIG.ENV===e?"#fff":"#6B7280"}}>{e==="sandbox"?"🧪 Sandbox":"🔴 Production"}</span>
              ))}
            </div>
          </div>
          <button className="btn-green" onClick={()=>showToast("Cashfree keys saved! Pay Now buttons are now live.","success")}>
            Save Cashfree Config
          </button>
        </div>
      </div>

      {/* Kraya WhatsApp */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-head">
          <div className="card-title">📲 Kraya WhatsApp Notifications</div>
          <span style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:kraToken?"#F0FDF4":"#FFF1F2",color:kraToken?"#15803D":"#BE123C"}}>{kraToken?"✓ Configured":"Not configured"}</span>
        </div>
        <div className="card-body">
          <div className="info-box" style={{background:"#F0FDF4",border:"1px solid #BBF7D0"}}>
            <span>📱</span>
            <div style={{fontSize:12,color:"#15803D"}}>
              Notifications are sent via WhatsApp for: OTP login, payment confirmation, onboarding submission alerts, and welcome messages. Get your API token from your Kraya dashboard.
            </div>
          </div>
          <label className="f-label">Kraya API Endpoint</label>
          <input className="f-input" placeholder="https://api.kraya.io/v1/messages" value={kraUrl} onChange={e=>setKraUrl(e.target.value)}/>
          <label className="f-label">API Token</label>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <input className="f-input" style={{marginBottom:0,flex:1}} type={showToken?"text":"password"} placeholder="Bearer token from Kraya dashboard" value={kraToken} onChange={e=>setKraToken(e.target.value)}/>
            <button className="btn" style={{flexShrink:0}} onClick={()=>setShowToken(s=>!s)}>{showToken?"Hide":"Show"}</button>
          </div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:10}}>WhatsApp Templates (configure in Kraya dashboard)</div>
            {Object.entries(KRAYA_CONFIG.TEMPLATES).map(([key,val])=>(
              <div key={key} style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",background:"#FAFAF8",borderRadius:7,marginBottom:5,fontSize:12}}>
                <span style={{color:"#6B7280",textTransform:"lowercase"}}>{key.replace(/_/g," ")}</span>
                <span style={{fontWeight:600,fontFamily:"monospace",color:"#374151"}}>{val}</span>
              </div>
            ))}
          </div>
          <button className="btn-green" onClick={()=>showToast("Kraya config saved! WhatsApp notifications are live.","success")}>
            Save Kraya Config
          </button>
        </div>
      </div>

      {/* Profile */}
      <div className="card">
        <div className="card-head"><div className="card-title">👤 Your Profile</div></div>
        <div className="card-body">
          {[["Name",user.name],["Phone","+91 "+user.phone],["Role",user.role==="team"?"Team Member":"Director"],["Client ID",user.clientNo||"—"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #F3F4F6"}}>
              <span style={{fontSize:12,color:"#6B7280"}}>{l}</span>
              <span style={{fontSize:13,fontWeight:600}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CALLBACK MODAL
// ═══════════════════════════════════════════════════════════════════════

function CallbackModal({ team, onClose, showToast }) {
  const [name,  setName]  = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("");
  const [sent,  setSent]  = useState(false);

  const submit = async () => {
    if (!name||!phone){ showToast("Fill in your name and number","error"); return; }
    // Send WhatsApp alert to assigned team members
    for (const tm of team) {
      await WhatsAppService.sendTeamAlert(tm.phone.replace("+91","").replace(/\s/g,""), name, topic||"General query");
    }
    setSent(true);
    showToast("Callback request sent to your team!","success");
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box" style={{padding:28}}>
        {!sent?(
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div><div className="sr" style={{fontSize:20}}>Request a Call Back</div><div style={{fontSize:12,color:"#6B7280",marginTop:2}}>We'll call within 2 working hours</div></div>
              <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#9CA3AF",lineHeight:1}}>✕</button>
            </div>
            <div style={{background:"#F8FAFF",border:"1px solid #DBEAFE",borderRadius:10,padding:"12px 14px",marginBottom:18}}>
              <div style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Your Assigned Team</div>
              {team.map(tm=>(
                <div key={tm.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:tm.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{tm.avatar}</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{tm.name}</div><div style={{fontSize:11,color:"#6B7280"}}>{tm.role}</div></div>
                  <a href={`tel:${tm.phone}`} style={{fontSize:12,fontWeight:700,color:"#2563EB",textDecoration:"none"}}>{tm.phone}</a>
                </div>
              ))}
            </div>
            <label className="f-label">Your Name</label>
            <input className="f-input" placeholder="Enter your name" value={name} onChange={e=>setName(e.target.value)}/>
            <label className="f-label">Phone Number</label>
            <input className="f-input" placeholder="+91 98765 00000" value={phone} onChange={e=>setPhone(e.target.value)}/>
            <label className="f-label">Topic (optional)</label>
            <input className="f-input" style={{marginBottom:20}} placeholder="e.g. GST query" value={topic} onChange={e=>setTopic(e.target.value)}/>
            <button className="auth-btn" onClick={submit}>Request Call Back 📞</button>
          </>
        ):(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:48,marginBottom:14}}>✅</div>
            <div className="sr" style={{fontSize:22,marginBottom:8}}>Request Received!</div>
            <div style={{fontSize:13,color:"#6B7280",marginBottom:6}}>Your team will call <strong>{phone}</strong> within 2 working hours.</div>
            <div style={{fontSize:12,color:"#9CA3AF",marginBottom:20}}>📲 Your team has also been notified via WhatsApp</div>
            <button className="btn btn-primary" style={{padding:"9px 24px"}} onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
