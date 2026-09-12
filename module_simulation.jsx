import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Users, CalendarCheck, Wallet, TrendingUp, Monitor,
  Shield, CreditCard, Award, Gift,
  Plus, X, Check, RotateCcw, Power, ChevronDown, ChevronRight, Fingerprint
} from "lucide-react";

const COLORS = {
  emp_docs: "#4FD1C5", attendance_leave: "#7DD3FC", payroll: "#8CE99A",
  performance: "#F2B84B", ess: "#D8A6F2", assets: "#F2946B",
  loans: "#93C4D4", awards: "#FFD166", special_allowances: "#F26B8A",
};
const CUSTOM_PALETTE = ["#F26B6B", "#6BC2F2", "#F2D96B", "#B98CF2", "#6BF2C2"];


const DEPT_POOL = [
  "Engineering", "Human Resources", "Finance", "Product", "Sales & Marketing", "Customer Support", "Operations", "Legal",
];
const DESIG_POOL = [
  "Associate", "Specialist", "Senior Specialist", "Lead", "Manager", "Senior Manager", "Director"
];
const DESIGNATION_RATES = {
  "Associate": 1000,
  "Specialist": 1500,
  "Senior Specialist": 2000,
  "Lead": 2500,
  "Manager": 3500,
  "Senior Manager": 5000,
  "Director": 8000
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const INITIAL_MODULES = [
  { id: "emp_docs", name: "Employee & Docs", layer: 0, table: "employee_records", active: true },
  { id: "attendance_leave", name: "Attendance & Leave", layer: 1, table: "attendance_leave", active: true },
  { id: "performance", name: "Performance & Appraisal", layer: 1, table: "performance_cycles", active: true },
  { id: "assets", name: "Asset Management", layer: 1, table: "company_assets", active: true },
  { id: "loans", name: "Loan Management", layer: 1, table: "employee_loans", active: true },
  { id: "awards", name: "Excellence Awards", layer: 1, table: "excellence_awards", active: true },
  { id: "payroll", name: "Payroll & Statutory", layer: 2, table: "payroll_records", active: true },
  { id: "special_allowances", name: "Special Allowances", layer: 2, table: "special_allowances", active: true },
  { id: "ess", name: "Self-Service (ESS)", layer: 3, table: "ess_requests", active: true },
];

const INITIAL_EDGES = [
  { dependent: "attendance_leave", dependency: "emp_docs" },
  { dependent: "performance", dependency: "emp_docs" },
  { dependent: "assets", dependency: "emp_docs" },
  { dependent: "loans", dependency: "emp_docs" },
  { dependent: "awards", dependency: "emp_docs" },
  { dependent: "payroll", dependency: "emp_docs" },
  { dependent: "payroll", dependency: "attendance_leave" },
  { dependent: "special_allowances", dependency: "emp_docs" },
  { dependent: "special_allowances", dependency: "payroll" },
  { dependent: "ess", dependency: "emp_docs" },
  { dependent: "ess", dependency: "attendance_leave" },
  { dependent: "ess", dependency: "payroll" },
  { dependent: "ess", dependency: "performance" },
];

const INITIAL_DB = {
  emp_docs: [],
  attendance_leave: [],
  performance: [], assets: [], loans: [], awards: [],
  payroll: [], special_allowances: [], ess: [],
};

const KEYWORD_RULES = [
  { kws: ["pay", "salary", "statutory", "pf", "esi", "tds", "pt", "compensat"], deps: ["emp_docs", "attendance_leave"] },
  { kws: ["report", "analytic", "dashboard", "insight"], deps: ["emp_docs", "attendance_leave", "payroll", "performance"] },
  { kws: ["recruit", "hiring", "onboard", "document", "doc"], deps: ["emp_docs"] },
  { kws: ["asset", "inventory", "equipment", "laptop", "hardware"], deps: ["emp_docs", "assets"] },
  { kws: ["perform", "appraisal", "goal", "kpi", "review"], deps: ["emp_docs", "performance"] },
  { kws: ["leave", "vacation", "attend", "shift", "time", "half"], deps: ["emp_docs", "attendance_leave"] },
  { kws: ["loan", "advance", "borrow", "repay", "emi"], deps: ["emp_docs", "loans"] },
  { kws: ["award", "excel", "recogni", "nominat", "star"], deps: ["emp_docs", "awards"] },
  { kws: ["allowance", "lta", "sca", "school", "children", "travel"], deps: ["emp_docs", "payroll"] },
  { kws: ["self", "ess", "portal", "profile"], deps: ["emp_docs", "attendance_leave", "payroll", "performance"] },
];

function suggestDeps(name, moduleIds) {
  const n = name.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.kws.some((k) => n.includes(k))) return rule.deps.filter((d) => moduleIds.includes(d));
  }
  return moduleIds.includes("emp_docs") ? ["emp_docs"] : [];
}

let idSeed = 100;
const nextId = (prefix) => `${prefix}-${idSeed++}`;

export default function ModuleSimulation() {
  const [modules, setModules] = useState(INITIAL_MODULES);
  const [edges, setEdges] = useState(INITIAL_EDGES);
  const [db, setDb] = useState(INITIAL_DB);
  const [log, setLog] = useState([
    { id: 0, time: "09:00:00", op: "SYSTEM", table: "—", text: "Simulation initialized. 9 HRMS modules loaded." },
  ]);
  const [hlNodes, setHlNodes] = useState(new Set());
  const [hlEdges, setHlEdges] = useState(new Set());
  const [hlAlert, setHlAlert] = useState(false);
  const [flash, setFlash] = useState(new Set());
  const [running, setRunning] = useState(false);
  const [networkOn, setNetworkOn] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [hrViewEnabled, setHrViewEnabled] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDeps, setNewDeps] = useState(new Set());
  const [newModScope, setNewModScope] = useState("empty"); // "empty", "all", "specific"
  const [newModEmpId, setNewModEmpId] = useState("");
  // ── Employee form modal ──────────────────────────────────────────────────
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [empFormName, setEmpFormName] = useState("");
  const [empFormDept, setEmpFormDept] = useState(DEPT_POOL[0]);
  const [empFormDesig, setEmpFormDesig] = useState(DESIG_POOL[0]);
  // ── Leave wizard modal ────────────────────────────────────────────────────
  const [showLeave, setShowLeave] = useState(false);
  const [leaveStep, setLeaveStep] = useState(1);   // 1 = pick emp, 2 = type+days
  const [leaveEmpId, setLeaveEmpId] = useState("");
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().slice(0, 10));
  // ── Unified action modal ───────────────────────────────────────────────────
  const [modal, setModal] = useState(null);
  const [customData, setCustomData] = useState({});
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState("idle"); // idle, syncing, synced, error
  const [expandedDb, setExpandedDb] = useState(new Set(["emp_docs"]));
  const syncTimerRef = useRef(null);

  function toggleDbExpanded(id) {
    setExpandedDb((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }



  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [modRes, recRes] = await Promise.all([
          fetch('http://localhost:3000/api/modules'),
          fetch('http://localhost:3000/api/records')
        ]);

        if (modRes.ok && recRes.ok) {
          const fetchedMods = await modRes.json();
          const fetchedRecs = await recRes.json();

          // Merge custom modules from DB
          const mergedModules = [...INITIAL_MODULES];
          fetchedMods.forEach(fm => {
            if (fm.is_custom) {
              mergedModules.push({
                id: fm.id,
                name: fm.name,
                layer: fm.layer,
                table: fm.table_name,
                custom: true,
                active: fm.active,
                schema: fm.schema || { fields: [{ name: "Notes", type: "text", key: "notes", placeholder: "Enter details..." }] }
              });
            } else {
              // update active status of built-ins if changed
              const bm = mergedModules.find(m => m.id === fm.id);
              if (bm) bm.active = fm.active;
            }
          });
          setModules(mergedModules);

          // Group records by module_id
          // Use fresh arrays (not shared refs from INITIAL_DB) to avoid mutation bugs
          const newDb = Object.fromEntries(Object.keys(INITIAL_DB).map(k => [k, []]));
          fetchedRecs.forEach(rec => {
            if (!newDb[rec.module_id]) newDb[rec.module_id] = [];
            newDb[rec.module_id].push(rec.data);
          });
          setDb(newDb);

          // Re-build edges for custom modules
          const newEdges = [...INITIAL_EDGES];
          fetchedMods.filter(m => m.is_custom).forEach(fm => {
            newEdges.push({ dependent: fm.id, dependency: 'emp_docs' });
          });
          setEdges(newEdges);

          // Calculate correct idSeed from database records
          let maxId = 100;
          fetchedRecs.forEach(rec => {
            const parts = rec.id.split('-');
            if (parts.length > 1) {
              const num = parseInt(parts[1], 10);
              if (!isNaN(num) && num >= maxId) maxId = num + 1;
            }
          });
          idSeed = maxId;

        }
      } catch (err) {
        console.error("Failed to fetch initial data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  const modMap = useMemo(() => Object.fromEntries(modules.map((m) => [m.id, m])), [modules]);

  const layout = useMemo(() => {
    const byLayer = {};
    modules.forEach((m) => { (byLayer[m.layer] = byLayer[m.layer] || []).push(m); });
    const pos = {};
    const maxItems = Math.max(...Object.values(byLayer).map(arr => arr.length));
    const W = Math.max(920, maxItems * 180 + 100);
    Object.entries(byLayer).forEach(([layer, mods]) => {
      const y = 70 + Number(layer) * 128;
      mods.forEach((m, i) => { pos[m.id] = { x: (W / (mods.length + 1)) * (i + 1), y }; });
    });
    const maxLayer = Math.max(...modules.map((m) => m.layer));
    return { pos, width: W, height: 70 + maxLayer * 128 + 80 };
  }, [modules]);

  function pushLog(op, table, text) {
    const time = new Date().toTimeString().slice(0, 8);
    setLog((prev) => [...prev, { id: prev.length, time, op, table, text }]);
  }

  function addRow(tableId, row) {
    setDb((prev) => ({ ...prev, [tableId]: [...(prev[tableId] || []), row] }));
    const key = `${tableId}:${row.id}`;
    setFlash((prev) => new Set(prev).add(key));
    setTimeout(() => setFlash((prev) => { const n = new Set(prev); n.delete(key); return n; }), 1400);
  }

  function updateRow(tableId, id, updates) {
    setDb((prev) => {
      const table = prev[tableId] || [];
      return {
        ...prev,
        [tableId]: table.map(r => r.id === id ? { ...r, ...updates } : r)
      };
    });
    const key = `${tableId}:${id}`;
    setFlash((prev) => new Set(prev).add(key));
    setTimeout(() => setFlash((prev) => { const n = new Set(prev); n.delete(key); return n; }), 1400);
  }

  async function execute(steps) {
    setRunning(true);
    for (const step of steps) {
      setHlAlert(!!step.alert);
      setHlNodes((prev) => new Set(prev).add(step.node));
      if (step.edge) setHlEdges((prev) => new Set(prev).add(`${step.edge[0]}|${step.edge[1]}`).add(`${step.edge[1]}|${step.edge[0]}`));
      pushLog(step.op, modMap[step.node]?.table || step.node, step.text);
      if (step.row) {
        if (step.op === "UPDATE") {
          updateRow(step.node, step.row.id, step.row);
        } else {
          addRow(step.node, step.row);
        }
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        setDbStatus("syncing");
        // Persist to Postgres
        fetch('http://localhost:3000/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: step.row.id,
            module_id: step.node,
            data: step.row
          })
        }).then(res => {
          if (res.ok) {
            setDbStatus("synced");
            syncTimerRef.current = setTimeout(() => setDbStatus("idle"), 3000);
          } else {
            setDbStatus("error");
          }
        }).catch(err => {
          console.error('Failed to save record:', err);
          setDbStatus("error");
        });
      }
      await sleep(620);
    }
    await sleep(500);
    setHlNodes(new Set());
    setHlEdges(new Set());
    setHlAlert(false);
    setRunning(false);
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // Opens the Add Employee form
  function actionAddEmployee() {
    setEmpFormName("");
    setEmpFormDept(DEPT_POOL[0]);
    setEmpFormDesig(DESIG_POOL[0]);
    setShowEmpForm(true);
  }

  function confirmAddEmployee() {
    if (!empFormName.trim() || running) return;
    const today = new Date().toISOString().slice(0, 10);
    const name = empFormName.trim();
    const dept = empFormDept;
    const designation = empFormDesig;
    const empRow = { id: nextId("EMP"), name, designation, dept, status: "Active", joined: today };
    const attRow = { id: nextId("ATT"), emp: name, date: today, type: "Attendance", status: "— (Ledger Initialized)" };
    const lvRow = { id: nextId("LV"), emp: name, type: "Annual Leave", dates: "Balance", status: "12 days credited" };
    setShowEmpForm(false);
    execute([
      { node: "emp_docs", op: "INSERT", text: `Creating employee master record — ${name} (${designation})`, row: empRow },
      { node: "attendance_leave", op: "INSERT", edge: ["attendance_leave", "emp_docs"], text: `Auto-initializing attendance ledger for ${name}`, row: attRow },
      { node: "attendance_leave", op: "INSERT", edge: ["attendance_leave", "emp_docs"], text: `Allocating default leave balance for ${name} — 12 days Annual Leave credited`, row: lvRow },
    ]);
  }

  // ── Mark Attendance ────────────────────────────────────────────────────────
  function actionMarkAttendance() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "attendance_leave", "No active employees to mark attendance for."); return; }
    setModal({ type: "attendance", empId: activeEmps[0].id, status: "Punch IN", date: new Date().toISOString().slice(0, 10) });
  }
  function confirmMarkAttendance() {
    if (!biometricEnabled) {
      pushLog("ERROR", "attendance_leave", "Biometric Sensor is Offline! Attendance punch rejected.");
      setModal(null);
      return;
    }
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;

    if (emp.status.includes("Inactive")) {
      pushLog("ERROR", "attendance_leave", `Security Alert: Biometric access revoked for ${emp.name} (Inactive).`);
      setModal(null);
      return;
    }

    if (modal.status === "Punch IN") {
      const alreadyPunchedIn = db.attendance_leave.some(r => r.emp === emp.name && r.date === modal.date && r.status === "Punch IN");
      if (alreadyPunchedIn) {
        pushLog("ERROR", "attendance_leave", `Punch IN rejected for ${emp.name}: Already punched IN on ${modal.date}.`);
        setModal(null);
        return;
      }
    }

    if (modal.status === "Punch OUT") {
      const hasPunchIn = db.attendance_leave.some(r => r.emp === emp.name && r.date === modal.date && r.status === "Punch IN");
      if (!hasPunchIn) {
        pushLog("ERROR", "attendance_leave", `Punch OUT rejected for ${emp.name}: No prior Punch IN found on ${modal.date}.`);
        setModal(null);
        return;
      }

      const alreadyPunchedOut = db.attendance_leave.some(r => r.emp === emp.name && r.date === modal.date && r.status === "Punch OUT");
      if (alreadyPunchedOut) {
        pushLog("ERROR", "attendance_leave", `Punch OUT rejected for ${emp.name}: Already punched OUT on ${modal.date}.`);
        setModal(null);
        return;
      }
    }

    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const row = { id: nextId("ATT"), emp: emp.name, date: modal.date, type: "Attendance", status: modal.status, time_logged: currentTime };
    setModal(null);
    execute([
      { node: "emp_docs", op: "SELECT", text: `Verifying employee record for ${emp.name}` },
      { node: "attendance_leave", op: "INSERT", edge: ["attendance_leave", "emp_docs"], text: `Biometric Punch Accepted! Logging ${modal.status} for ${emp.name}`, row },
    ]);
  }

  // Opens the Apply Leave wizard at step 1
  function actionApplyLeave() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "attendance_leave", "No active employees to apply leave for."); return; }
    setLeaveEmpId(activeEmps[0].id);
    setLeaveType("Annual Leave");
    setLeaveDays(1);
    setLeaveStep(1);
    setShowLeave(true);
  }

  function confirmApplyLeave() {
    if (!leaveEmpId || running) return;
    const emp = db.emp_docs.find((e) => e.id === leaveEmpId);
    if (!emp) return;
    const start = new Date(leaveStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + Number(leaveDays) - 1);
    const fmt = (d) => d.toISOString().slice(0, 10);
    const dates = Number(leaveDays) === 1 ? fmt(start) : `${fmt(start)} to ${fmt(end)}`;
    const row = { id: nextId("LV"), emp: emp.name, type: leaveType, days: leaveDays, dates, status: "Pending Approval" };
    setShowLeave(false);
    execute([
      { node: "emp_docs", op: "SELECT", text: `Checking employment status for ${emp.name}` },
      { node: "attendance_leave", op: "INSERT", edge: ["attendance_leave", "emp_docs"], text: `Filing ${leaveType} (${leaveDays} day${Number(leaveDays) > 1 ? "s" : ""}) for ${emp.name}`, row },
      { node: "attendance_leave", op: "SELECT", text: `🔔 Notification sent to Manager: Leave application from ${emp.name} is pending approval.` }
    ]);
  }

  // ── Log Appraisal ──────────────────────────────────────────────────────────
  function actionLogAppraisal() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "performance_cycles", "No active employees to log appraisal for."); return; }
    setModal({ type: "appraisal", empId: activeEmps[0].id, cycle: "Q3 FY2026", rating: "Meets Expectations", kpi: 80 });
  }
  function confirmLogAppraisal() {
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;

    // Rule: Block duplicate appraisal for same employee + same cycle
    const alreadyLogged = db.performance.some(r => r.emp === emp.name && r.cycle === modal.cycle);
    if (alreadyLogged) {
      pushLog("WARN", "performance_cycles", `Appraisal already logged for ${emp.name} in ${modal.cycle}. Cannot submit duplicate.`);
      setModal(null);
      return;
    }

    const row = { id: nextId("PERF"), emp: emp.name, cycle: modal.cycle, kpiScore: `${modal.kpi}%`, rating: modal.rating, bonusPaid: false };
    setModal(null);
    execute([
      { node: "emp_docs", op: "SELECT", text: `Loading employee profile for ${emp.name}` },
      { node: "performance", op: "INSERT", edge: ["performance", "emp_docs"], text: `Recording ${modal.cycle} appraisal — ${emp.name} | ${modal.rating}`, row },
      { node: "performance", op: "SELECT", text: `🔔 Notification sent to ${emp.name}: Your ${modal.cycle} appraisal rating has been recorded.` }
    ]);
  }

  // ── Assign Asset ───────────────────────────────────────────────────────────
  function actionAssignAsset() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "company_assets", "No active employees to assign assets to."); return; }
    setModal({ type: "asset", empId: activeEmps[0].id, assetType: "Laptop" });
  }
  function confirmAssignAsset() {
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;

    // Rule: Block duplicate asset type for the same employee
    const alreadyHas = db.assets.some(r => r.emp === emp.name && r.asset === modal.assetType && r.status === "Allocated");
    if (alreadyHas) {
      pushLog("WARN", "company_assets", `${emp.name} already has an allocated ${modal.assetType}. Return it before assigning a new one.`);
      setModal(null);
      return;
    }

    const code = `AST-${Math.floor(Math.random() * 9000 + 1000)}`;
    const row = { id: nextId("ASST"), emp: emp.name, asset: modal.assetType, code, status: "Allocated" };
    setModal(null);
    execute([
      { node: "emp_docs", op: "SELECT", text: `Verifying ${emp.name} for asset allocation` },
      { node: "assets", op: "INSERT", edge: ["assets", "emp_docs"], text: `Assigning ${modal.assetType} (${code}) to ${emp.name}`, row },
    ]);
  }

  // ── Apply for Loan ─────────────────────────────────────────────────────────
  function actionApplyLoan() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "employee_loans", "No active employees to apply for loan."); return; }
    setModal({ type: "loan", empId: activeEmps[0].id, loanType: "Personal Loan", amount: 100000, rate: 10, years: 3 });
  }
  function confirmApplyLoan() {
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;

    // Rule: Block new loan if employee already has one pending or active
    const pendingLoan = db.loans.find(r => r.emp === emp.name && (r.status === "Under Review" || r.status === "Active"));
    if (pendingLoan) {
      pushLog("WARN", "employee_loans", `${emp.name} already has a ${pendingLoan.type} ${pendingLoan.status === "Under Review" ? "pending review" : "currently active"}. Clear existing loan before applying for a new one.`);
      setModal(null);
      return;
    }

    const fmt = (n) => Number(n).toLocaleString("en-IN");
    const r = modal.rate / 12 / 100;
    const n = modal.years * 12;
    const emi = r ? Math.round((modal.amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : Math.round(modal.amount / n);
    const row = { id: nextId("LN"), emp: emp.name, type: modal.loanType, amount: `Rs.${fmt(modal.amount)}`, rate: `${modal.rate}%`, emi: `Rs.${fmt(emi)}/mo`, tenure: `${modal.years} yr`, status: "Under Review" };
    setModal(null);
    execute([
      { node: "emp_docs", op: "SELECT", text: `Verifying employment eligibility for ${emp.name}` },
      { node: "loans", op: "INSERT", edge: ["loans", "emp_docs"], text: `Filing ${modal.loanType} of Rs.${fmt(modal.amount)} @ ${modal.rate}% for ${emp.name} | EMI Rs.${fmt(emi)}/mo`, row },
      { node: "loans", op: "SELECT", text: `📨 Notification sent to Finance Dept: New ${modal.loanType} request submitted by ${emp.name}.` }
    ]);
  }

  // ── Nominate Award — performance-based ─────────────────────────────────────
  function actionNominateAward() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "excellence_awards", "No active employees to nominate."); return; }

    // Pick a random active employee
    const emp = pick(activeEmps);

    // Check their performance records
    const perfRecords = db.performance.filter(r => r.emp === emp.name);

    if (!perfRecords.length) {
      pushLog("WARN", "excellence_awards",
        `Cannot nominate ${emp.name} — no appraisal record found. Log an appraisal first.`);
      return;
    }

    // Use the most recent appraisal rating to determine the award category
    const latestRating = perfRecords[perfRecords.length - 1].rating;
    const latestKpi    = perfRecords[perfRecords.length - 1].kpiScore || "—";

    const RATING_TO_AWARD = {
      "Outstanding":           "Star Performer",
      "Exceeds Expectations":  "Innovation Champion",
      "Meets Expectations":    "Team Player",
      "Needs Improvement":     "Rising Star",
      "Unsatisfactory":        "Rising Star",
    };

    const category = RATING_TO_AWARD[latestRating] || "Team Player";
    const row = { id: nextId("AWD"), emp: emp.name, category, rating: latestRating, kpi: latestKpi, period: "Q3 FY2026", status: "Nominated" };

    execute([
      { node: "emp_docs",   op: "SELECT", text: `Loading nominee profile — ${emp.name}` },
      { node: "performance", op: "SELECT", edge: ["awards", "performance"],
        text: `Checking appraisal record — ${emp.name} | Rating: ${latestRating} | KPI: ${latestKpi}` },
      { node: "awards", op: "INSERT", edge: ["awards", "emp_docs"],
        text: `Nominating ${emp.name} for "${category}" based on ${latestRating} rating`, row },
      { node: "awards", op: "SELECT",
        text: `🎉 Notification sent to ${emp.name}: Nominated for ${category} — well deserved!` }
    ]);
  }

  function actionRunPayroll() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "payroll_records", "No active employees to process payroll for."); return; }
    const steps = [];
    const PAID_LEAVE_TYPES = ["Annual Leave", "Sick Leave", "Casual Leave", "Maternity Leave", "Paternity Leave", "Comp Off"];

    activeEmps.forEach((emp) => {
      // Find attendance/leave records for this employee
      const empAtt = db.attendance_leave.filter(record => record.emp === emp.name);

      let presentDays = 0;
      let inCount = 0;
      let outCount = 0;

      empAtt.forEach(record => {
        if (record.status === "Present" || record.status === "Work From Home") {
          presentDays += 1;
        } else if (record.status === "Punch IN") {
          inCount += 1;
        } else if (record.status === "Punch OUT") {
          outCount += 1;
        } else if (record.status === "Half-day") {
          presentDays += 0.5;
        } else if (PAID_LEAVE_TYPES.includes(record.status)) {
          if (record.date && record.date.includes("days")) {
            presentDays += parseInt(record.date) || 1;
          } else {
            presentDays += 1;
          }
        }
      });

      // Calculate paired punches (every full pair = 1 day)
      presentDays += Math.min(inCount, outCount);

      const dailyRate = DESIGNATION_RATES[emp.designation] || 1000;
      const baseGross = presentDays * dailyRate;

      const empAllowances = db.special_allowances.filter(sa => sa.emp === emp.name && sa.status === "Approved");
      const totalAllowances = empAllowances.reduce((sum, sa) => {
        const amountStr = String(sa.amount).replace(/[^\d]/g, '');
        return sum + Number(amountStr);
      }, 0);

      // Performance Bonus Logic
      const perfRecords = db.performance.filter(r => r.emp === emp.name && r.bonusPaid !== true);
      let perfBonus = 0;
      let perfLabel = "";
      let latestPerf = null;
      if (perfRecords.length > 0) {
        // Grab the most recent rating (last in array)
        latestPerf = perfRecords[perfRecords.length - 1];
        if (latestPerf.rating === "Outstanding") {
          perfBonus = 5000;
          perfLabel = " (+Rs.5,000 bonus)";
        } else if (latestPerf.rating === "Exceeds Expectations") {
          perfBonus = 2500;
          perfLabel = " (+Rs.2,500 bonus)";
        }
      }

      const gross = baseGross + totalAllowances + perfBonus;
      const pf = Math.round(gross * 0.12);
      const tds = Math.round(gross * 0.07);
      const net = gross - pf - tds;
      const fmt = (n) => n.toLocaleString("en-IN");

      steps.push({ node: "emp_docs", op: "SELECT", text: `Reading salary structure for ${emp.name}` });
      steps.push({ node: "attendance_leave", op: "SELECT", edge: ["payroll", "attendance_leave"], text: `Aggregating attendance & leave for ${emp.name}` });

      if (empAllowances.length > 0) {
        steps.push({ node: "special_allowances", op: "SELECT", edge: ["payroll", "special_allowances"], text: `Applying special allowances for ${emp.name}` });
        empAllowances.forEach(sa => {
          steps.push({ node: "special_allowances", op: "UPDATE", edge: ["special_allowances", "payroll"], text: `Marking ${sa.type} as Disbursed`, row: { ...sa, status: "Disbursed" } });
        });
      }

      if (perfBonus > 0 && latestPerf) {
        steps.push({ node: "performance", op: "SELECT", edge: ["payroll", "performance"], text: `Applying performance bonus for ${emp.name}` });
        steps.push({ node: "performance", op: "UPDATE", edge: ["performance", "payroll"], text: `Marking ${latestPerf.cycle} bonus as Disbursed`, row: { ...latestPerf, bonusPaid: true } });
      }

      const allowLabel = totalAllowances > 0 ? ` (+Rs.${fmt(totalAllowances)} allow)` : "";
      const textMsg = `Payslip — ${emp.name} | ${presentDays} Days @ Rs.${fmt(dailyRate)} | Gross Rs.${fmt(gross)}${allowLabel}${perfLabel} | PF Rs.${fmt(pf)} | TDS Rs.${fmt(tds)} | Net Rs.${fmt(net)}`;

      const currentMonth = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });
      steps.push({
        node: "payroll", op: "INSERT", edge: ["payroll", "emp_docs"],
        text: textMsg,
        row: { id: nextId("PR"), emp: emp.name, month: currentMonth, gross: `Rs.${fmt(gross)}`, pf: `Rs.${fmt(pf)}`, net: `Rs.${fmt(net)}`, status: "Processed" },
      });
    });
    execute(steps);
  }

  // ── Add Allowance ──────────────────────────────────────────────────────────
  function actionAddAllowance() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "special_allowances", "No active employees to add allowance for."); return; }
    setModal({ type: "allowance", empId: activeEmps[0].id, allowanceType: "LTA (Leave Travel Allowance)", amount: 5000 });
  }
  function confirmAddAllowance() {
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;
    const fmt = (n) => Number(n).toLocaleString("en-IN");
    const row = { id: nextId("SA"), emp: emp.name, type: modal.allowanceType, amount: `Rs.${fmt(modal.amount)}`, period: "FY2026", status: "Approved" };
    setModal(null);
    execute([
      { node: "emp_docs", op: "SELECT", text: `Verifying eligibility for ${emp.name}` },
      { node: "payroll", op: "SELECT", edge: ["special_allowances", "payroll"], text: `Reading payroll base for ${emp.name}` },
      { node: "special_allowances", op: "INSERT", edge: ["special_allowances", "emp_docs"], text: `Adding ${modal.allowanceType} of Rs.${fmt(modal.amount)} for ${emp.name}`, row },
    ]);
  }

  // ── ESS Request ────────────────────────────────────────────────────────────
  function actionESS() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "ess_requests", "No active employees to make ESS requests."); return; }
    setModal({ type: "ess", empId: activeEmps[0].id, req: "Payslip Download" });
  }
  function confirmESS() {
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;
    const row = { id: nextId("ESS"), emp: emp.name, request: modal.req, channel: "ESS Portal", status: "Completed" };
    setModal(null);
    execute([
      { node: "emp_docs", op: "SELECT", text: `Authenticating portal session — ${emp.name}` },
      { node: "attendance_leave", op: "SELECT", edge: ["ess", "attendance_leave"], text: `Fetching leave & attendance for ${emp.name}` },
      { node: "payroll", op: "SELECT", edge: ["ess", "payroll"], text: `Fetching payslip data for ${emp.name}` },
      { node: "performance", op: "SELECT", edge: ["ess", "performance"], text: `Fetching appraisal data for ${emp.name}` },
      { node: "ess", op: "INSERT", edge: ["ess", "emp_docs"], text: `Processing ESS: "${modal.req}" for ${emp.name}`, row },
    ]);
  }

  function actionCustom(mod) {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", mod.id, "No active employees available."); return; }

    const initialData = {};
    if (mod.schema && mod.schema.fields) {
      mod.schema.fields.forEach(f => initialData[f.key] = "");
    }
    setCustomData(initialData);

    setModal({
      type: "custom",
      empId: activeEmps[0].id,
      modId: mod.id,
      modName: mod.name,
      schema: mod.schema || { fields: [{ name: "Notes", type: "text", key: "notes" }] }
    });
  }

  function confirmCustomAction() {
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;
    const mod = modMap[modal.modId];
    if (!mod) return;

    const deps = edges.filter((e) => e.dependent === mod.id).map((e) => e.dependency);
    const steps = deps.map((d) => ({ node: d, op: "SELECT", edge: [mod.id, d], text: `Reading ${modMap[d]?.table} for ${mod.name}` }));

    const row = { id: nextId(mod.id.slice(0, 2).toUpperCase()), emp: emp.name, ...customData, status: "Logged" };

    steps.push({
      node: mod.id, op: "INSERT", edge: [mod.id, "emp_docs"], text: `Recording ${mod.name} entry for ${emp.name}`, row
    });

    setModal(null);
    execute(steps);
  }

  // ── Transfer Employee ────────────────────────────────────────────────────────
  function actionTransfer() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "emp_docs", "No active employees to transfer."); return; }
    setModal({ type: "transfer", empId: activeEmps[0].id, newDept: DEPT_POOL[0] });
  }
  function confirmTransfer() {
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;
    const oldDept = emp.dept;

    // Rule: Target department must be different from current department
    if (modal.newDept === oldDept) {
      pushLog("WARN", "emp_docs", `Transfer rejected — ${emp.name} is already in the ${oldDept} department.`);
      setModal(null);
      return;
    }

    setModal(null);
    execute([
      { node: "emp_docs", op: "SELECT", edge: ["emp_docs", "payroll"], text: `Verifying transfer eligibility for ${emp.name}` },
      { node: "emp_docs", op: "UPDATE", text: `🔄 Transferring ${emp.name} from ${oldDept} to ${modal.newDept}`, row: { id: emp.id, dept: modal.newDept } },
    ]);
  }

  // ── Promote Employee ─────────────────────────────────────────────────────────
  function actionPromote() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "emp_docs", "No active employees to promote."); return; }
    setModal({ type: "promote", empId: activeEmps[0].id, newDesig: DESIG_POOL[0] });
  }
  function confirmPromote() {
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;
    const oldDesig = emp.designation;

    // Rule: New designation must be a higher rank than current
    const oldRank = DESIG_POOL.indexOf(oldDesig);
    const newRank = DESIG_POOL.indexOf(modal.newDesig);
    if (newRank <= oldRank) {
      pushLog("WARN", "emp_docs", `Promotion rejected — "${modal.newDesig}" is not a higher rank than current "${oldDesig}".`);
      setModal(null);
      return;
    }

    // Rule: Block promotion if latest performance rating is poor
    const perfRecords = db.performance.filter(r => r.emp === emp.name);
    if (perfRecords.length > 0) {
      const latestRating = perfRecords[perfRecords.length - 1].rating;
      if (latestRating === "Needs Improvement" || latestRating === "Unsatisfactory") {
        pushLog("WARN", "emp_docs", `Promotion blocked for ${emp.name} — latest appraisal rating is "${latestRating}". Performance improvement required before promotion.`);
        setModal(null);
        return;
      }
    }

    setModal(null);
    execute([
      { node: "performance", op: "SELECT", edge: ["emp_docs", "performance"], text: `Reviewing performance history for ${emp.name}` },
      { node: "emp_docs", op: "UPDATE", text: `⭐ Promoted ${emp.name} from ${oldDesig} to ${modal.newDesig}!`, row: { id: emp.id, designation: modal.newDesig } },
    ]);
  }

  // ── Offboard Employee ────────────────────────────────────────────────────────
  function actionOffboard() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "emp_docs", "No active employees to offboard."); return; }
    setModal({ type: "offboard", empId: activeEmps[0].id, reason: "Resignation", exitDate: new Date().toISOString().slice(0, 10) });
  }
  function confirmOffboard() {
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;
    setModal(null);

    const steps = [];
    steps.push({ node: "emp_docs", op: "SELECT", text: `Initiating offboarding sequence for ${emp.name}`, alert: true });
    
    steps.push({ node: "attendance_leave", op: "SELECT", edge: ["attendance_leave", "emp_docs"], text: `🔒 Access Revoked: Biometric profile locked for ${emp.name}`, alert: true });

    const empAssets = db.assets.filter(a => a.emp === emp.name && a.status === "Allocated");
    if (empAssets.length > 0) {
      steps.push({ node: "assets", op: "SELECT", edge: ["assets", "emp_docs"], text: `Checking allocated assets for ${emp.name}...`, alert: true });
      empAssets.forEach(a => {
        steps.push({ node: "assets", op: "UPDATE", edge: ["assets", "emp_docs"], text: `📦 Recovered Asset: ${a.asset} (${a.code})`, row: { ...a, status: "Recovered" }, alert: true });
      });
    } else {
      steps.push({ node: "assets", op: "SELECT", edge: ["assets", "emp_docs"], text: `No active assets to recover for ${emp.name}.`, alert: true });
    }

    const empLoans = db.loans.filter(l => l.emp === emp.name && (l.status === "Active" || l.status === "Under Review"));
    if (empLoans.length > 0) {
      steps.push({ node: "loans", op: "SELECT", edge: ["loans", "emp_docs"], text: `Checking outstanding loans for ${emp.name}...`, alert: true });
      empLoans.forEach(l => {
        steps.push({ node: "loans", op: "UPDATE", edge: ["loans", "emp_docs"], text: `💰 Loan Cleared: Deducted remaining balance for ${l.type}`, row: { ...l, status: "Cleared via F&F" }, alert: true });
      });
    }

    steps.push({ node: "payroll", op: "SELECT", edge: ["payroll", "emp_docs"], text: `Generating Full & Final (F&F) Settlement for ${emp.name}...`, alert: true });
    
    steps.push({ node: "emp_docs", op: "UPDATE", text: `🛑 Offboarded ${emp.name} (${modal.reason})`, row: { id: emp.id, status: `Inactive (${modal.reason})`, exit_date: modal.exitDate }, alert: true });

    execute(steps);
  }

  const ACTIONS = [
    { key: "add_emp", label: "Add Employee", run: actionAddEmployee, modId: "emp_docs", role: "HR" },
    { key: "transfer", label: "Transfer Employee", run: actionTransfer, modId: "emp_docs", role: "HR" },
    { key: "promote", label: "Promote Employee", run: actionPromote, modId: "emp_docs", role: "HR" },
    { key: "offboard", label: "Offboard Employee", run: actionOffboard, modId: "emp_docs", role: "HR" },
    { key: "mark_att", label: "Mark Attendance", run: actionMarkAttendance, modId: "attendance_leave", role: "EMP" },
    { key: "apply_lv", label: "Apply Leave", run: actionApplyLeave, modId: "attendance_leave", role: "EMP" },
    { key: "log_perf", label: "Log Appraisal", run: actionLogAppraisal, modId: "performance", role: "HR" },
    { key: "assign_ast", label: "Assign Asset", run: actionAssignAsset, modId: "assets", role: "HR" },
    { key: "loan_req", label: "Apply for Loan", run: actionApplyLoan, modId: "loans", role: "EMP" },
    { key: "nominate", label: "Nominate Award", run: actionNominateAward, modId: "awards", role: "HR" },
    { key: "payroll", label: "Run Payroll", run: actionRunPayroll, modId: "payroll", role: "HR" },
    { key: "allowance", label: "Add Allowance", run: actionAddAllowance, modId: "special_allowances", role: "HR" },
    { key: "ess", label: "ESS Request", run: actionESS, modId: "ess", role: "EMP" },
  ];

  function toggleDep(id) {
    setNewDeps((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function guessSchema(prompt) {
    const p = prompt.toLowerCase();
    if (p.includes("expense") || p.includes("travel") || p.includes("reimburse")) {
      return { fields: [{ name: "Amount", type: "number", key: "amount", placeholder: "e.g. 500" }, { name: "Reason", type: "text", key: "reason", placeholder: "e.g. Client Meeting" }] };
    }
    if (p.includes("train") || p.includes("learn") || p.includes("course") || p.includes("skill")) {
      return { fields: [{ name: "Course Name", type: "text", key: "course", placeholder: "e.g. React Mastery" }, { name: "Score (%)", type: "number", key: "score", placeholder: "e.g. 95" }] };
    }
    if (p.includes("disciplin") || p.includes("warn") || p.includes("pip") || p.includes("infraction") || p.includes("terminat")) {
      return { fields: [{ name: "Infraction", type: "text", key: "infraction", placeholder: "e.g. Policy Violation" }, { name: "Action Taken", type: "text", key: "action", placeholder: "e.g. Written Warning" }] };
    }
    return { fields: [{ name: "Notes", type: "text", key: "notes", placeholder: "Enter details..." }] };
  }

  function openAddModule() {
    setNewName("");
    setNewDeps(new Set(suggestDeps("", modules.map((m) => m.id))));
    setNewModScope("empty");
    setNewModEmpId("");
    setShowAdd(true);
  }

  function onNameChange(v) {
    setNewName(v);
    setNewDeps(new Set(suggestDeps(v, modules.map((m) => m.id))));
  }

  async function confirmAddModule() {
    if (!newName.trim() || running) return;
    if (newModScope === "specific" && !newModEmpId) { pushLog("WARN", "schema", "Please select a specific employee."); return; }

    const id = "m_" + newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (modMap[id]) { pushLog("WARN", "schema", `Module "${newName}" already exists.`); return; }
    const depIds = Array.from(newDeps);
    const depLayer = depIds.length ? Math.max(...depIds.map((d) => modMap[d].layer)) + 1 : 0;
    const table = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_records";
    const schema = guessSchema(newName.trim());
    const newMod = { id, name: newName.trim(), layer: depLayer, table, custom: true, active: true, schema };
    setShowAdd(false);
    setRunning(true);
    for (const d of depIds) {
      setHlNodes((prev) => new Set(prev).add(d));
      pushLog("SCHEMA", table, `Linking "${table}" to ${modMap[d].table} via FK`);
      await sleep(500);
    }
    pushLog("SCHEMA", table, `Creating table "${table}" in database`);

    try {
      await fetch('http://localhost:3000/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id, name: newName.trim(), layer: depLayer, table_name: table, active: true, is_custom: true, schema
        })
      });
    } catch (err) {
      console.error("Failed to save module", err);
    }

    await sleep(400);
    setModules((prev) => [...prev, newMod]);
    setEdges((prev) => [...prev, ...depIds.map((d) => ({ dependent: id, dependency: d }))]);
    setDb((prev) => ({ ...prev, [id]: [] }));
    pushLog("SCHEMA", table, `Module "${newMod.name}" registered with ${depIds.length} dependency link(s).`);
    setHlNodes(new Set());
    setRunning(false);

    const additionalSteps = [];
    if (newModScope === "all") {
      db.emp_docs.forEach(emp => {
        additionalSteps.push({ node: id, op: "INSERT", edge: [id, "emp_docs"], text: `Auto-populating record for ${emp.name}`, row: { id: nextId(newName.slice(0, 2).toUpperCase()), emp: emp.name, status: "Initialized" } });
      });
    } else if (newModScope === "specific") {
      const emp = db.emp_docs.find(e => e.id === newModEmpId);
      if (emp) additionalSteps.push({ node: id, op: "INSERT", edge: [id, "emp_docs"], text: `Auto-populating record for ${emp.name}`, row: { id: nextId(newName.slice(0, 2).toUpperCase()), emp: emp.name, status: "Initialized" } });
    }

    if (additionalSteps.length > 0) {
      setTimeout(() => execute(additionalSteps), 200);
    }
  }

  function toggleModuleActive(moduleId) {
    const mod = modMap[moduleId];
    const nextState = !mod.active;
    setModules((prev) => prev.map((m) => m.id === moduleId ? { ...m, active: nextState } : m));

    fetch(`http://localhost:3000/api/modules/${moduleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: nextState })
    }).catch(err => console.error("Failed to update module status", err));

    pushLog(
      nextState ? "ACTIVATE" : "DEACTIVATE", mod.table,
      `Module "${mod.name}" ${nextState ? "reactivated and restored to graph." : "deactivated. Data preserved."}`
    );
  }

  async function resetSim() {
    try {
      await fetch('http://localhost:3000/api/reset', { method: 'DELETE' });
    } catch (err) {
      console.error("Failed to reset backend", err);
    }

    setModules((prev) =>
      prev.map((m) => {
        if (!m.custom) {
          const init = INITIAL_MODULES.find((im) => im.id === m.id);
          return init ? { ...init } : m;
        }
        return { ...m, active: false };
      })
    );
    setLog([{ id: 0, time: new Date().toTimeString().slice(0, 8), op: "SYSTEM", table: "—", text: "Simulation reset. Custom modules deactivated (data preserved)." }]);
    setHlNodes(new Set()); setHlEdges(new Set()); setFlash(new Set());
  }

  const customActiveActions = modules.filter((m) => m.custom && m.active);
  const deactivatedCustomMods = modules.filter((m) => m.custom && !m.active);

  const opColor = (op) => {
    if (op === "INSERT") return "#8CE99A";
    if (op === "SELECT") return "#7DD3FC";
    if (op === "SCHEMA") return "#D8A6F2";
    if (op === "WARN") return "#F27B7B";
    if (op === "ACTIVATE") return "#4FD1C5";
    if (op === "DEACTIVATE") return "#F2946B";
    return "#93A8C4";
  };

  return (
    <div style={{ background: "#0A0F1A", minHeight: "100vh", color: "#DCE6F2", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {loading && (
        <div style={{ position: "fixed", inset: 0, background: "#0A0F1A", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="mono pulse" style={{ color: "#4FD1C5", fontSize: 14, letterSpacing: "0.2em" }}>CONNECTING TO POSTGRESQL...</div>
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .mono { font-family:'IBM Plex Mono',monospace; }
        .grid-bg {
          background-image:
            linear-gradient(rgba(79,209,197,0.05) 1px,transparent 1px),
            linear-gradient(90deg,rgba(79,209,197,0.05) 1px,transparent 1px);
          background-size:28px 28px;
        }
        @keyframes flashRow{0%{background:rgba(242,184,75,0.55)}100%{background:transparent}}
        .flash-row{animation:flashRow 1.4s ease-out;}
        @keyframes pulseNode{0%,100%{filter:drop-shadow(0 0 0px currentColor)}50%{filter:drop-shadow(0 0 10px currentColor)}}
        .pulse{animation:pulseNode 1.1s ease-in-out infinite;}
        @keyframes pulseNodeAlert{0%,100%{filter:drop-shadow(0 0 0px #EF4444)}50%{filter:drop-shadow(0 0 14px #EF4444)}}
        .pulse-alert{animation:pulseNodeAlert 0.8s ease-in-out infinite; color: #EF4444;}
        @keyframes flowDash { to { stroke-dashoffset: -32; } }
        .flow-line { stroke-dasharray: 4 12; animation: flowDash 0.6s linear infinite; }
        .btn{
          font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:0.02em;
          padding:9px 12px;border-radius:3px;border:1px solid rgba(79,209,197,0.35);
          background:rgba(79,209,197,0.06);color:#CFEFEA;cursor:pointer;text-align:left;
          transition:all 0.15s ease;
        }
        .btn:hover:not(:disabled){background:rgba(79,209,197,0.16);border-color:#4FD1C5;}
        .btn:disabled{opacity:0.4;cursor:not-allowed;}
        .scrollbar-thin::-webkit-scrollbar{width:5px;height:5px;}
        .scrollbar-thin::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.13);border-radius:3px;}
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>



      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: "#4FD1C5", letterSpacing: "0.12em", marginBottom: 4 }}>HRMS SCHEMATIC — LIVE</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#F4F7FB" }}>Module Dependency &amp; Database Simulator</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={() => setHrViewEnabled(!hrViewEnabled)}
            style={{ display: "flex", alignItems: "center", gap: 6, borderColor: hrViewEnabled ? "rgba(125,211,252,0.4)" : "rgba(242,184,75,0.4)", color: hrViewEnabled ? "#7DD3FC" : "#F2B84B" }}>
            <Users size={14} /> ROLE: {hrViewEnabled ? "HR ADMIN" : "EMPLOYEE"}
          </button>
          <button className="btn" onClick={() => setNetworkOn(!networkOn)}
            style={{ display: "flex", alignItems: "center", gap: 6, borderColor: networkOn ? "rgba(125,211,252,0.4)" : "rgba(242,107,107,0.4)", color: networkOn ? "#7DD3FC" : "#F26B6B" }}>
            <Power size={14} /> NETWORK: {networkOn ? "ON" : "DOWN"}
          </button>
          <button className="btn" onClick={() => setBiometricEnabled(!biometricEnabled)}
            style={{ display: "flex", alignItems: "center", gap: 6, borderColor: biometricEnabled ? "rgba(140,233,154,0.4)" : "rgba(242,107,107,0.4)", color: biometricEnabled ? "#8CE99A" : "#F26B6B" }}>
            <Fingerprint size={14} /> BIOMETRIC: {biometricEnabled ? "ON" : "OFF"}
          </button>
          <button className="btn" onClick={openAddModule} disabled={running}
            style={{ display: "flex", alignItems: "center", gap: 6, borderColor: "rgba(242,184,75,0.4)", color: "#F2D9A6" }}>
            <Plus size={14} /> ADD MODULE
          </button>
          <button className="btn" onClick={resetSim} disabled={running}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <RotateCcw size={14} /> RESET
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 16, padding: 16 }}>
        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Graph */}
          <div className="grid-bg" style={{ position: "relative", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, background: "#0D1420", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "absolute", top: 10, left: 12, right: 12, zIndex: 10 }}>
              <div className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.1em" }}>DEPENDENCY GRAPH</div>
              {/* DB Sync Indicator */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                background: dbStatus === "syncing" ? "rgba(242,184,75,0.15)" : dbStatus === "synced" ? "rgba(79,209,197,0.15)" : dbStatus === "error" ? "rgba(242,107,107,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${dbStatus === "syncing" ? "#F2B84B" : dbStatus === "synced" ? "#4FD1C5" : dbStatus === "error" ? "#F26B6B" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 12,
                boxShadow: `0 0 10px ${dbStatus === "syncing" ? "rgba(242,184,75,0.3)" : dbStatus === "synced" ? "rgba(79,209,197,0.3)" : dbStatus === "error" ? "rgba(242,107,107,0.3)" : "transparent"}`,
                animation: dbStatus === "syncing" ? "pulseNode 1.5s infinite" : "none",
                transition: "all 0.3s ease"
              }}>
                {dbStatus === "syncing" && <RotateCcw size={12} color="#F2B84B" className="spin" />}
                {dbStatus === "synced" && <Check size={12} color="#4FD1C5" />}
                {dbStatus === "error" && <X size={12} color="#F26B6B" />}
                {dbStatus === "idle" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4FD1C5" }} />}
                <span className="mono" style={{ fontSize: 9, fontWeight: 600, color: dbStatus === "syncing" ? "#F2D9A6" : dbStatus === "synced" ? "#B0EDE8" : dbStatus === "error" ? "#F2A6A6" : "#7C93AA", letterSpacing: "0.05em" }}>
                  {dbStatus === "syncing" ? "SYNCING TO POSTGRES..." : dbStatus === "synced" ? "DATABASE UPDATED" : dbStatus === "error" ? "SYNC FAILED" : "LIVE & CONNECTED"}
                </span>
              </div>
            </div>
            <svg viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ width: "100%", height: "auto", display: "block" }}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="#4FD1C5" />
                </marker>
                <marker id="arrowActive" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="#F2B84B" />
                </marker>
                <marker id="arrowAlert" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="#EF4444" />
                </marker>
              </defs>

              {edges.map((e, i) => {
                const s = layout.pos[e.dependency], t = layout.pos[e.dependent];
                if (!s || !t) return null;
                if (!modMap[e.dependency]?.active || !modMap[e.dependent]?.active) return null;
                const active = hlEdges.has(`${e.dependent}|${e.dependency}`);
                const midY = (s.y + t.y) / 2;
                return (
                  <g key={i}>
                    <path d={`M ${s.x} ${s.y + 26} C ${s.x} ${midY}, ${t.x} ${midY}, ${t.x} ${t.y - 26}`}
                      fill="none" stroke={active ? (hlAlert ? "#EF4444" : "#F2B84B") : "rgba(79,209,197,0.32)"}
                      strokeWidth={active ? 2.4 : 1.4}
                      markerEnd={active ? (hlAlert ? "url(#arrowAlert)" : "url(#arrowActive)") : "url(#arrow)"}
                    />
                    {active && (
                      <path d={`M ${s.x} ${s.y + 26} C ${s.x} ${midY}, ${t.x} ${midY}, ${t.x} ${t.y - 26}`}
                        fill="none" stroke="#FFFFFF" strokeWidth={2.5} className="flow-line" style={{ opacity: 0.8 }}
                      />
                    )}
                  </g>
                );
              })}

              {modules.map((m) => {
                const p = layout.pos[m.id];
                if (!p) return null;
                const hl = hlNodes.has(m.id);
                const color = COLORS[m.id] || CUSTOM_PALETTE[m.name.length % CUSTOM_PALETTE.length];
                const rows = (db[m.id] || []).length;
                const inactive = !m.active;
                return (
                  <g key={m.id} transform={`translate(${p.x - 72}, ${p.y - 26})`}
                    className={hl ? (hlAlert ? "pulse-alert" : "pulse") : ""} style={{ color: hl && hlAlert ? "#EF4444" : color, opacity: inactive ? 0.42 : 1 }}>
                    <rect width="144" height="52" rx="4"
                      fill={hl ? (hlAlert ? "rgba(239,68,68,0.14)" : "rgba(242,184,75,0.14)") : inactive ? "#090E1A" : "#101828"}
                      stroke={hl ? (hlAlert ? "#EF4444" : "#F2B84B") : inactive ? "rgba(255,255,255,0.18)" : color}
                      strokeWidth={hl ? 2.2 : 1.3} strokeDasharray={inactive ? "5,3" : "none"}
                    />
                    <text x="72" y={inactive ? 17 : 21} textAnchor="middle"
                      fill={inactive ? "#5A7080" : "#F4F7FB"} fontSize="12" fontWeight="600"
                      fontFamily="'IBM Plex Sans', sans-serif">{m.name}</text>
                    {inactive ? (
                      <>
                        <text x="72" y="31" textAnchor="middle" fill="#3D5464" fontSize="8.5"
                          fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.06em">DEACTIVATED</text>
                        <g style={{ cursor: "pointer" }} onClick={() => toggleModuleActive(m.id)}>
                          <rect x="30" y="36" width="84" height="13" rx="2"
                            fill="rgba(79,209,197,0.07)" stroke="rgba(79,209,197,0.25)" strokeWidth="0.8" />
                          <text x="72" y="46" textAnchor="middle" fill="#3A8A80" fontSize="8.5"
                            fontFamily="'IBM Plex Mono', monospace">ACTIVATE</text>
                        </g>
                      </>
                    ) : (
                      <>
                        <text x="72" y="31" textAnchor="middle" fill="#7C93AA" fontSize="9.5"
                          fontFamily="'IBM Plex Mono', monospace">{m.table} · {rows} rows</text>
                        <g style={{ cursor: "pointer" }} onClick={() => toggleModuleActive(m.id)}>
                          <rect x="30" y="36" width="84" height="13" rx="2"
                            fill="rgba(242,107,107,0.07)" stroke="rgba(242,107,107,0.25)" strokeWidth="0.8" />
                          <text x="72" y="46" textAnchor="middle" fill="#F26B6B" fontSize="8.5"
                            fontFamily="'IBM Plex Mono', monospace">DEACTIVATE</text>
                        </g>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Log */}
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, background: "#0D1420" }}>
            <div className="mono" style={{ padding: "10px 12px", fontSize: 10, color: "#5C7891", letterSpacing: "0.1em", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              OPERATION LOG {running && <span style={{ color: "#F2B84B" }}>· EXECUTING…</span>}
            </div>
            <div className="scrollbar-thin mono" style={{ height: 190, overflowY: "auto", padding: "8px 12px", fontSize: 12, lineHeight: 1.75 }}>
              {log.map((l) => (
                <div key={l.id} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#3F5060", flexShrink: 0 }}>{l.time}</span>
                  <span style={{ color: opColor(l.op), minWidth: 82, flexShrink: 0 }}>{l.op}</span>
                  <span style={{ color: "#4A6070", flexShrink: 0, minWidth: 118, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.table}</span>
                  <span style={{ color: "#DCE6F2" }}>{l.text}</span>
                </div>
              ))}

            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Actions */}
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, background: "#0D1420", padding: 12 }}>
            <div className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.1em", marginBottom: 10 }}>MODULE ACTIONS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ACTIONS.map((a) => {
                const mod = a.modId ? modMap[a.modId] : null;
                const isDeactivated = mod && !mod.active;
                return (
                  <button key={a.key} className="btn" disabled={running || isDeactivated}
                    onClick={() => { 
                      if (isDeactivated) { pushLog("WARN", "system", `Module deactivated. Operation blocked.`); return; }
                      if (!networkOn) { pushLog("WARN", "system", "Network down — all modules offline."); return; } 
                      if (a.role === "HR" && !hrViewEnabled) {
                        pushLog("WARN", "system", `🔒 SECURITY ALERT: Access Denied. '${a.label}' requires HR Admin privileges.`);
                        setHlAlert(true);
                        setHlNodes(new Set([a.modId]));
                        setTimeout(() => { setHlAlert(false); setHlNodes(new Set()); }, 1500);
                        return;
                      }
                      a.run(); 
                    }}
                    style={isDeactivated ? { opacity: 0.4, cursor: "not-allowed" } : (a.role === "HR" && !hrViewEnabled ? { opacity: 0.5, borderStyle: "dashed" } : {})}>
                    {a.label}
                  </button>
                );
              })}
              {customActiveActions.map((m) => (
                <button key={m.id} className="btn" disabled={running}
                  onClick={() => { 
                    if (!networkOn) { pushLog("WARN", "system", "Network down — all modules offline."); return; } 
                    if (!hrViewEnabled) {
                        pushLog("WARN", "system", `🔒 SECURITY ALERT: Access Denied. Custom module requires HR Admin privileges.`);
                        setHlAlert(true);
                        setHlNodes(new Set([m.id]));
                        setTimeout(() => { setHlAlert(false); setHlNodes(new Set()); }, 1500);
                        return;
                    }
                    actionCustom(m); 
                  }}
                  style={{ borderColor: "rgba(242,107,107,0.35)", color: "#F2B8B8", opacity: !hrViewEnabled ? 0.5 : 1, borderStyle: !hrViewEnabled ? "dashed" : "solid" }}>
                  Create {m.name} Record
                </button>
              ))}
            </div>

            {deactivatedCustomMods.length > 0 && (
              <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                <div className="mono" style={{ fontSize: 9, color: "#3D5060", letterSpacing: "0.1em", marginBottom: 8 }}>DEACTIVATED CUSTOM MODULES</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {deactivatedCustomMods.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 3, background: "rgba(255,255,255,0.015)" }}>
                      <div>
                        <div className="mono" style={{ fontSize: 11, color: "#566878" }}>{m.name}</div>
                        <div className="mono" style={{ fontSize: 9, color: "#3A4E5C", marginTop: 1 }}>{m.table}</div>
                      </div>
                      <button className="btn" onClick={() => toggleModuleActive(m.id)}
                        style={{ padding: "5px 9px", fontSize: 10, borderColor: "rgba(79,209,197,0.28)", color: "#4ABAAB", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <Power size={10} /> Activate
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DB */}
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, background: "#0D1420", padding: 12, maxHeight: 560, overflowY: "auto" }} className="scrollbar-thin">
            <div className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.1em", marginBottom: 10 }}>DATABASE — LIVE STATE</div>
            {modules.filter((m) => m.active).map((m) => {
              const rows = db[m.id] || [];
              const color = COLORS[m.id] || CUSTOM_PALETTE[m.name.length % CUSTOM_PALETTE.length];
              let cols = rows.length ? Object.keys(rows[0]) : ["id"];
              if (m.id === "emp_docs") cols = ["id", "name", "dept", "designation", "joined", "status"];
              const isExpanded = expandedDb.has(m.id);

              return (
                <div key={m.id} style={{ marginBottom: 14, border: hlNodes.has(m.id) ? "1px solid #F2B84B" : "1px solid rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    onClick={() => toggleDbExpanded(m.id)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(255,255,255,0.03)", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {isExpanded ? <ChevronDown size={14} color={color} /> : <ChevronRight size={14} color={color} />}
                      <span className="mono" style={{ fontSize: 11, color, fontWeight: 600 }}>{m.table}</span>
                    </div>
                    <span className="mono" style={{ fontSize: 10, color: "#5C7891" }}>{rows.length} rows</span>
                  </div>
                  {isExpanded && (
                    rows.length === 0 ? (
                      <div className="mono" style={{ fontSize: 11, color: "#3A5060", padding: "7px 10px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>— empty —</div>
                    ) : (
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", overflowX: "auto", maxHeight: "130px", overflowY: "auto" }} className="scrollbar-thin">
                        <table className="mono" style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
                          <tbody>
                            {rows.map((r) => (
                              <tr key={r.id} className={flash.has(`${m.id}:${r.id}`) ? "flash-row" : ""}>
                                {cols.map((c) => (
                                  <td key={c} style={{ padding: "4px 10px", color: "#9FB4C8", borderTop: "1px solid rgba(255,255,255,0.04)", whiteSpace: "nowrap", maxWidth: 128, overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {String(r[c] ?? "")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4,8,14,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ width: 440, background: "#0D1420", border: "1px solid rgba(242,184,75,0.4)", borderRadius: 6, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#F4F7FB" }}>Register New Module</div>
              <X size={16} style={{ cursor: "pointer", color: "#7C93AA" }} onClick={() => setShowAdd(false)} />
            </div>
            <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>MODULE NAME</label>
            <input autoFocus value={newName} onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Recruitment, Training, Exit Management"
              className="mono"
              style={{ width: "100%", marginTop: 6, marginBottom: 14, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 12.5, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>DEPENDENCIES (auto-suggested · toggle to adjust)</label>
              {newDeps.size > 0 && (
                <button className="mono" onClick={() => setNewDeps(new Set())}
                  style={{ fontSize: 9, padding: "2px 6px", background: "rgba(242,107,107,0.1)", border: "1px solid rgba(242,107,107,0.3)", borderRadius: 3, color: "#F26B6B", cursor: "pointer" }}>
                  Clear Selected
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, marginBottom: 16 }}>
              {modules.filter((m) => m.active).map((m) => {
                const on = newDeps.has(m.id);
                const color = COLORS[m.id] || CUSTOM_PALETTE[m.name.length % CUSTOM_PALETTE.length];
                return (
                  <button key={m.id} onClick={() => toggleDep(m.id)} className="mono"
                    style={{
                      fontSize: 11, padding: "6px 9px", borderRadius: 3, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                      border: on ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.12)",
                      background: on ? `${color}22` : "transparent", color: on ? color : "#7C93AA",
                    }}>
                    {on && <Check size={11} />} {m.name}
                  </button>
                );
              })}
            </div>

            <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>AUTO-POPULATE RECORDS?</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8, marginBottom: newModScope === "specific" ? 8 : 16 }}>
              {[{ id: "empty", lbl: "No (Empty Table)" }, { id: "all", lbl: "All Employees" }, { id: "specific", lbl: "Specific Employee" }].map(opt => (
                <div key={opt.id} onClick={() => setNewModScope(opt.id)}
                  style={{ padding: "8px", borderRadius: 3, cursor: "pointer", textAlign: "center", fontSize: 10, border: newModScope === opt.id ? "1px solid #F2B84B" : "1px solid rgba(255,255,255,0.08)", background: newModScope === opt.id ? "rgba(242,184,75,0.15)" : "transparent", color: newModScope === opt.id ? "#F2D9A6" : "#7C93AA" }} className="mono">
                  {opt.lbl}
                </div>
              ))}
            </div>
            {newModScope === "specific" && (
              <select value={newModEmpId} onChange={(e) => setNewModEmpId(e.target.value)}
                className="mono"
                style={{ width: "100%", marginBottom: 16, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 11, boxSizing: "border-box", appearance: "auto" }}>
                <option value="">-- Select Employee --</option>
                {db.emp_docs.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
              </select>
            )}

            <button className="btn" disabled={!newName.trim()} onClick={confirmAddModule}
              style={{ width: "100%", textAlign: "center", borderColor: "#F2B84B", color: "#F2D9A6", background: "rgba(242,184,75,0.1)" }}>
              CREATE TABLE + LINK DEPENDENCIES
            </button>
          </div>
        </div>
      )}
      {/* ── Add Employee Modal ─────────────────────────────────────────────── */}
      {showEmpForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4,8,14,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ width: 400, background: "#0D1420", border: "1px solid rgba(79,209,197,0.4)", borderRadius: 6, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#F4F7FB" }}>Add New Employee</div>
              <X size={16} style={{ cursor: "pointer", color: "#7C93AA" }} onClick={() => setShowEmpForm(false)} />
            </div>

            {/* Auto Employee ID badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 12px", background: "rgba(79,209,197,0.07)", border: "1px solid rgba(79,209,197,0.2)", borderRadius: 3 }}>
              <span className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>AUTO EMP ID</span>
              <span className="mono" style={{ fontSize: 13, color: "#4FD1C5", fontWeight: 600 }}>EMP-{idSeed}</span>
            </div>

            <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>FULL NAME</label>
            <input
              autoFocus value={empFormName} onChange={(e) => setEmpFormName(e.target.value)}
              placeholder="e.g. Priya Nair"
              className="mono"
              style={{ width: "100%", marginTop: 5, marginBottom: 14, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 12.5, boxSizing: "border-box" }}
              onKeyDown={(e) => e.key === "Enter" && confirmAddEmployee()}
            />

            <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>DEPARTMENT</label>
            <select
              value={empFormDept} onChange={(e) => setEmpFormDept(e.target.value)}
              className="mono"
              style={{ width: "100%", marginTop: 5, marginBottom: 18, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 12.5, boxSizing: "border-box", appearance: "auto" }}>
              {DEPT_POOL.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>DESIGNATION</label>
            <select
              value={empFormDesig} onChange={(e) => setEmpFormDesig(e.target.value)}
              className="mono"
              style={{ width: "100%", marginTop: 5, marginBottom: 18, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 12.5, boxSizing: "border-box", appearance: "auto" }}>
              {DESIG_POOL.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            <div className="mono" style={{ fontSize: 10, color: "#4A6070", marginBottom: 14, lineHeight: 1.6 }}>
              On submit — employee record, attendance ledger &amp; 12-day leave balance will be auto-created.
            </div>

            <button className="btn" disabled={!empFormName.trim()} onClick={confirmAddEmployee}
              style={{ width: "100%", textAlign: "center", borderColor: "#4FD1C5", color: "#B0EDE8", background: "rgba(79,209,197,0.1)" }}>
              CREATE EMPLOYEE + INITIALIZE LEDGER
            </button>
          </div>
        </div>
      )}

      {/* ── Apply Leave Wizard ─────────────────────────────────────────────── */}
      {showLeave && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4,8,14,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ width: 420, background: "#0D1420", border: "1px solid rgba(216,166,242,0.4)", borderRadius: 6, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#F4F7FB" }}>Apply for Leave</div>
              <X size={16} style={{ cursor: "pointer", color: "#7C93AA" }} onClick={() => setShowLeave(false)} />
            </div>

            {/* Step indicator */}
            <div className="mono" style={{ fontSize: 9, color: "#5C7891", letterSpacing: "0.1em", marginBottom: 18 }}>
              STEP {leaveStep} OF 2 — {leaveStep === 1 ? "SELECT EMPLOYEE" : "LEAVE DETAILS"}
            </div>

            {leaveStep === 1 ? (
              /* Step 1: Employee selection */
              <div>
                <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>SELECT EMPLOYEE</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, maxHeight: 220, overflowY: "auto" }} className="scrollbar-thin">
                  {db.emp_docs.filter(e => !e.status.includes("Inactive")).map((emp) => {
                    const selected = leaveEmpId === emp.id;
                    return (
                      <div key={emp.id} onClick={() => setLeaveEmpId(emp.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 3, cursor: "pointer",
                          border: selected ? "1px solid #D8A6F2" : "1px solid rgba(255,255,255,0.08)",
                          background: selected ? "rgba(216,166,242,0.1)" : "rgba(255,255,255,0.02)",
                        }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%", background: selected ? "rgba(216,166,242,0.25)" : "rgba(255,255,255,0.06)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                        }}>
                          <span className="mono" style={{ fontSize: 10, color: selected ? "#D8A6F2" : "#7C93AA" }}>
                            {emp.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: selected ? "#F4F7FB" : "#9FB4C8" }}>{emp.name}</div>
                          <div className="mono" style={{ fontSize: 10, color: "#4A6070" }}>{emp.dept} · {emp.id}</div>
                        </div>
                        {selected && <Check size={14} style={{ color: "#D8A6F2", marginLeft: "auto", flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
                <button className="btn" disabled={!leaveEmpId} onClick={() => setLeaveStep(2)}
                  style={{ width: "100%", textAlign: "center", marginTop: 16, borderColor: "#D8A6F2", color: "#EDD4FA", background: "rgba(216,166,242,0.08)" }}>
                  NEXT — LEAVE DETAILS →
                </button>
              </div>
            ) : (
              /* Step 2: Leave type + days */
              <div>
                {(() => {
                  const emp = db.emp_docs.find(e => e.id === leaveEmpId);
                  const start = new Date(leaveStartDate);
                  const end = new Date(start);
                  end.setDate(end.getDate() + Number(leaveDays) - 1);
                  const fmt = (d) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                  return (
                    <>
                      {/* Selected employee chip */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", marginBottom: 16, background: "rgba(216,166,242,0.08)", border: "1px solid rgba(216,166,242,0.25)", borderRadius: 3 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(216,166,242,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span className="mono" style={{ fontSize: 9, color: "#D8A6F2" }}>{emp?.name.split(" ").map(w => w[0]).join("").slice(0, 2)}</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#E4C6FA" }}>{emp?.name}</div>
                        <div className="mono" style={{ fontSize: 10, color: "#7C5C90", marginLeft: 4 }}>{emp?.dept}</div>
                        <button onClick={() => setLeaveStep(1)}
                          className="mono" style={{ marginLeft: "auto", fontSize: 9, color: "#7C5C90", background: "none", border: "none", cursor: "pointer" }}>← Change</button>
                      </div>

                      <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>LEAVE TYPE</label>
                      <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}
                        className="mono"
                        style={{ width: "100%", marginTop: 5, marginBottom: 14, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 12.5, boxSizing: "border-box" }}>
                        {["Annual Leave", "Sick Leave", "Casual Leave", "Maternity Leave", "Paternity Leave", "Comp Off", "Unpaid Leave"].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>

                      <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>FROM DATE</label>
                      <input type="date" value={leaveStartDate} onChange={e => setLeaveStartDate(e.target.value)}
                        className="mono"
                        style={{ width: "100%", marginTop: 5, marginBottom: 14, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 13, boxSizing: "border-box", colorScheme: "dark" }}
                      />

                      <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>NUMBER OF DAYS</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5, marginBottom: 14 }}>
                        <input type="number" min={1} max={30} value={leaveDays}
                          onChange={(e) => setLeaveDays(Math.max(1, Math.min(30, Number(e.target.value))))}
                          className="mono"
                          style={{ width: 80, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 13, textAlign: "center" }}
                        />
                        <div className="mono" style={{ fontSize: 11, color: "#4A6070", lineHeight: 1.5 }}>
                          {fmt(start)}{Number(leaveDays) > 1 ? ` → ${fmt(end)}` : ""}
                        </div>
                      </div>

                      <button className="btn" onClick={confirmApplyLeave}
                        style={{ width: "100%", textAlign: "center", borderColor: "#D8A6F2", color: "#EDD4FA", background: "rgba(216,166,242,0.1)" }}>
                        SUBMIT LEAVE REQUEST
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── Unified Action Modal ──────────────────────────────────────────── */}
      {modal && (() => {
        const MODAL_META = {
          attendance: { title: "Mark Attendance", border: "rgba(125,211,252,0.4)", accent: "#7DD3FC" },
          appraisal: { title: "Log Appraisal", border: "rgba(242,184,75,0.4)", accent: "#F2B84B" },
          asset: { title: "Assign Company Asset", border: "rgba(242,148,107,0.4)", accent: "#F2946B" },
          loan: { title: "Apply for Loan", border: "rgba(147,196,212,0.4)", accent: "#93C4D4" },
          allowance: { title: "Add Special Allowance", border: "rgba(242,107,138,0.4)", accent: "#F26B8A" },
          ess: { title: "ESS Request", border: "rgba(216,166,242,0.4)", accent: "#D8A6F2" },
          transfer: { title: "Internal Transfer", border: "rgba(110,231,183,0.4)", accent: "#6EE7B7" },
          promote: { title: "Promote Employee", border: "rgba(252,211,77,0.4)", accent: "#FCD34D" },
          offboard: { title: "Offboard Employee", border: "rgba(239,68,68,0.4)", accent: "#EF4444" },
          custom: { title: modal.modName, border: "rgba(129,140,248,0.4)", accent: "#818CF8" },
        };
        const meta = MODAL_META[modal.type] || {};
        const INP = { width: "100%", padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 12.5, boxSizing: "border-box", marginTop: 5, marginBottom: 14 };
        const SEL = { ...INP, appearance: "auto" };
        const LBL = { fontSize: 10, color: "#5C7891", letterSpacing: "0.08em", textTransform: "uppercase" };
        const CONFIRM_FN = { attendance: confirmMarkAttendance, appraisal: confirmLogAppraisal, asset: confirmAssignAsset, loan: confirmApplyLoan, allowance: confirmAddAllowance, ess: confirmESS, transfer: confirmTransfer, promote: confirmPromote, offboard: confirmOffboard, custom: confirmCustomAction };

        /* Shared employee picker */
        const EmpPicker = () => {
          const employees = db.emp_docs || [];
          const filtered = employees.filter(e => !e.status.includes("Inactive"));
          return (
            <div style={{ marginBottom: 14 }}>
              <div className="mono" style={LBL}>EMPLOYEE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6, maxHeight: 160, overflowY: "auto" }} className="scrollbar-thin">
                {filtered.map(emp => {
                  const sel = modal.empId === emp.id;
                  return (
                    <div key={emp.id} onClick={() => setModal(m => ({ ...m, empId: emp.id }))}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 3, cursor: "pointer",
                        border: sel ? `1px solid ${meta.accent}` : "1px solid rgba(255,255,255,0.07)",
                        background: sel ? `${meta.accent}18` : "rgba(255,255,255,0.02)"
                      }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%", background: sel ? `${meta.accent}30` : "rgba(255,255,255,0.06)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                      }}>
                        <span className="mono" style={{ fontSize: 9, color: sel ? meta.accent : "#7C93AA" }}>
                          {(emp.name || "UN").split(" ").map(w => w[0] || "").join("").slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: sel ? "#F4F7FB" : "#9FB4C8" }}>{emp.name || "Unknown"}</div>
                        <div className="mono" style={{ fontSize: 9, color: "#4A6070" }}>{emp.dept} · {emp.id}</div>
                      </div>
                      {sel && <Check size={12} style={{ color: meta.accent, marginLeft: "auto", flexShrink: 0 }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        };

        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(4,8,14,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70 }}>
            <div style={{ width: 420, maxHeight: "90vh", overflowY: "auto", background: "#0D1420", border: `1px solid ${meta.border}`, borderRadius: 6, padding: 22 }} className="scrollbar-thin">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#F4F7FB" }}>{meta.title}</div>
                <X size={16} style={{ cursor: "pointer", color: "#7C93AA" }} onClick={() => setModal(null)} />
              </div>

              <EmpPicker />
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 14 }} />

              {/* ── Attendance fields ── */}
              {modal.type === "attendance" && <>
                <div className="mono" style={LBL}>DATE</div>
                <input type="date" value={modal.date} onChange={e => setModal(m => ({ ...m, date: e.target.value }))}
                  className="mono"
                  style={{ width: "100%", marginTop: 5, marginBottom: 14, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 13, boxSizing: "border-box", colorScheme: "dark" }}
                />

                <div className="mono" style={LBL}>ATTENDANCE STATUS</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6, marginBottom: 14 }}>
                  {["Punch IN", "Punch OUT"].map(s => (
                    <div key={s} onClick={() => setModal(m => ({ ...m, status: s }))}
                      style={{
                        padding: "7px 6px", borderRadius: 3, cursor: "pointer", textAlign: "center", fontSize: 11,
                        border: modal.status === s ? `1px solid ${meta.accent}` : "1px solid rgba(255,255,255,0.08)",
                        background: modal.status === s ? `${meta.accent}22` : "transparent",
                        color: modal.status === s ? meta.accent : "#7C93AA"
                      }} className="mono">{s}</div>
                  ))}
                </div>
                <div className="mono" style={{ fontSize: 10, color: "#7C93AA", marginTop: 4 }}>
                  (Time will be recorded automatically)
                </div>
              </>}

              {/* ── Offboard fields ── */}
              {modal.type === "offboard" && <>
                <div className="mono" style={LBL}>OFFBOARDING REASON</div>
                <select value={modal.reason} onChange={e => setModal(m => ({ ...m, reason: e.target.value }))} className="mono" style={SEL}>
                  {["Resignation", "Termination", "Retirement", "Contract Ended"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="mono" style={LBL}>EXIT DATE</div>
                <input type="date" value={modal.exitDate} onChange={e => setModal(m => ({ ...m, exitDate: e.target.value }))} className="mono" style={INP} />
                <div className="mono" style={{ fontSize: 10, color: "#EF4444", marginTop: 4, lineHeight: 1.6 }}>
                  Warning: Offboarding will immediately revoke biometric access for this employee. Record will be preserved as Inactive.
                </div>
              </>}

              {/* ── Appraisal fields ── */}
              {modal.type === "appraisal" && <>
                <div className="mono" style={LBL}>APPRAISAL CYCLE</div>
                <select value={modal.cycle} onChange={e => setModal(m => ({ ...m, cycle: e.target.value }))} className="mono" style={SEL}>
                  {["Q1 FY2026", "Q2 FY2026", "Q3 FY2026", "Q4 FY2026", "Annual FY2026"].map(c => <option key={c}>{c}</option>)}
                </select>
                <div className="mono" style={LBL}>RATING</div>
                <select value={modal.rating} onChange={e => setModal(m => ({ ...m, rating: e.target.value }))} className="mono" style={SEL}>
                  {["Outstanding", "Exceeds Expectations", "Meets Expectations", "Needs Improvement", "Unsatisfactory"].map(r => <option key={r}>{r}</option>)}
                </select>
                <div className="mono" style={LBL}>KPI SCORE (%)</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5, marginBottom: 14 }}>
                  <input type="range" min={0} max={100} value={modal.kpi} onChange={e => setModal(m => ({ ...m, kpi: Number(e.target.value) }))}
                    style={{ flex: 1, accentColor: meta.accent }} />
                  <span className="mono" style={{ fontSize: 14, color: meta.accent, minWidth: 42, textAlign: "right", fontWeight: 700 }}>{modal.kpi}%</span>
                </div>
              </>}

              {/* ── Asset fields ── */}
              {modal.type === "asset" && <>
                <div className="mono" style={LBL}>ASSET TYPE</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6, marginBottom: 14 }}>
                  {["Laptop", "Mobile Phone", "Monitor", "Ergonomic Chair", "Access Card", "Headset", "Keyboard", "Webcam"].map(a => (
                    <div key={a} onClick={() => setModal(m => ({ ...m, assetType: a }))}
                      style={{
                        padding: "8px 10px", borderRadius: 3, cursor: "pointer", fontSize: 11,
                        border: modal.assetType === a ? `1px solid ${meta.accent}` : "1px solid rgba(255,255,255,0.08)",
                        background: modal.assetType === a ? `${meta.accent}22` : "transparent",
                        color: modal.assetType === a ? meta.accent : "#7C93AA"
                      }} className="mono">{a}</div>
                  ))}
                </div>
              </>}

              {/* ── Loan fields ── */}
              {modal.type === "loan" && (() => {
                const r = modal.rate / 12 / 100;
                const n = modal.years * 12;
                const emi = r ? Math.round((modal.amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : Math.round(modal.amount / n);
                const total = emi * n;
                const interest = total - modal.amount;
                const fmt = (v) => Number(v).toLocaleString("en-IN");
                return <>
                  <div className="mono" style={LBL}>LOAN TYPE</div>
                  <select value={modal.loanType} onChange={e => setModal(m => ({ ...m, loanType: e.target.value }))} className="mono" style={SEL}>
                    {["Personal Loan", "Vehicle Loan", "Housing Advance", "Emergency Advance", "Education Loan"].map(t => <option key={t}>{t}</option>)}
                  </select>
                  <div className="mono" style={LBL}>PRINCIPAL AMOUNT (Rs.)</div>
                  <input type="number" min={10000} max={5000000} step={5000} value={modal.amount}
                    onChange={e => setModal(m => ({ ...m, amount: Number(e.target.value) }))} className="mono" style={INP} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div className="mono" style={LBL}>INTEREST RATE (% p.a.)</div>
                      <input type="number" min={1} max={36} step={0.5} value={modal.rate}
                        onChange={e => setModal(m => ({ ...m, rate: Number(e.target.value) }))} className="mono" style={INP} />
                    </div>
                    <div>
                      <div className="mono" style={LBL}>TENURE (YEARS)</div>
                      <input type="number" min={1} max={30} value={modal.years}
                        onChange={e => setModal(m => ({ ...m, years: Number(e.target.value) }))} className="mono" style={INP} />
                    </div>
                  </div>
                  {/* EMI Summary card */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14, padding: "10px", background: "rgba(147,196,212,0.06)", border: "1px solid rgba(147,196,212,0.2)", borderRadius: 3 }}>
                    {[["Monthly EMI", `Rs.${fmt(emi)}`], ["Total Interest", `Rs.${fmt(interest)}`], ["Total Payable", `Rs.${fmt(total)}`]].map(([l, v]) => (
                      <div key={l} style={{ textAlign: "center" }}>
                        <div className="mono" style={{ fontSize: 8.5, color: "#5C7891", letterSpacing: "0.08em", marginBottom: 3 }}>{l}</div>
                        <div className="mono" style={{ fontSize: 12, color: meta.accent, fontWeight: 700 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </>;
              })()}

              {/* ── Allowance fields ── */}
              {modal.type === "allowance" && <>
                <div className="mono" style={LBL}>ALLOWANCE TYPE</div>
                <select value={modal.allowanceType} onChange={e => setModal(m => ({ ...m, allowanceType: e.target.value }))} className="mono" style={SEL}>
                  {["LTA (Leave Travel Allowance)", "SCA (School/Children Allowance)", "Meal Allowance", "Transport Allowance", "Medical Reimbursement", "Uniform Allowance", "Internet Allowance"].map(t => <option key={t}>{t}</option>)}
                </select>
                <div className="mono" style={LBL}>AMOUNT (Rs.)</div>
                <input type="number" min={500} max={100000} step={500} value={modal.amount}
                  onChange={e => setModal(m => ({ ...m, amount: Number(e.target.value) }))} className="mono" style={INP} />
                <div style={{ padding: "8px 12px", background: "rgba(242,107,138,0.06)", border: "1px solid rgba(242,107,138,0.2)", borderRadius: 3, marginBottom: 14 }}>
                  <span className="mono" style={{ fontSize: 10, color: "#5C7891" }}>ANNUAL EQUIVALENT  </span>
                  <span className="mono" style={{ fontSize: 13, color: meta.accent, fontWeight: 700 }}>Rs.{(modal.amount * 12).toLocaleString("en-IN")}</span>
                </div>
              </>}

              {/* ── Transfer fields ── */}
              {modal.type === "transfer" && <>
                <div className="mono" style={LBL}>NEW DEPARTMENT</div>
                <select className="mono" style={SEL} value={modal.newDept} onChange={e => setModal(m => ({ ...m, newDept: e.target.value }))}>
                  {DEPT_POOL.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="mono" style={{ fontSize: 10, color: "#4A6070", marginBottom: 14 }}>
                  This will instantly update the employee's master record.
                </div>
              </>}

              {/* ── Promote fields ── */}
              {modal.type === "promote" && <>
                <div className="mono" style={LBL}>NEW DESIGNATION</div>
                <select className="mono" style={SEL} value={modal.newDesig} onChange={e => setModal(m => ({ ...m, newDesig: e.target.value }))}>
                  {DESIG_POOL.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="mono" style={{ fontSize: 10, color: "#4A6070", marginBottom: 14 }}>
                  Promotions are logged to performance history and immediately mutate the employee master record.
                </div>
              </>}

              {/* ── ESS fields ── */}
              {modal.type === "ess" && <>
                <div className="mono" style={LBL}>REQUEST TYPE</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6, marginBottom: 14 }}>
                  {["Payslip Download", "Leave Balance Check", "Profile Update", "Document Request", "Attendance Correction", "IT Declaration Submission", "Reimbursement Claim"].map(r => (
                    <div key={r} onClick={() => setModal(m => ({ ...m, req: r }))}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 3, cursor: "pointer",
                        border: modal.req === r ? `1px solid ${meta.accent}` : "1px solid rgba(255,255,255,0.07)",
                        background: modal.req === r ? `${meta.accent}18` : "rgba(255,255,255,0.015)"
                      }}>
                      <span className="mono" style={{ fontSize: 11, color: modal.req === r ? meta.accent : "#9FB4C8" }}>{r}</span>
                      {modal.req === r && <Check size={12} style={{ color: meta.accent, flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
              </>}

              <button className="btn" disabled={!modal.empId} onClick={CONFIRM_FN[modal.type]}
                style={{ width: "100%", textAlign: "center", borderColor: meta.accent, color: "#F4F7FB", background: `${meta.accent}18`, fontWeight: 600 }}>
                CONFIRM &amp; SUBMIT
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

