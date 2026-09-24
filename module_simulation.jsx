import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Users, CalendarCheck, Wallet, TrendingUp, Monitor,
  Shield, CreditCard, Award, Gift,
  Plus, X, Check, RotateCcw, Power, ChevronDown, ChevronUp, ChevronRight, Fingerprint, Bell,
  FileText, Calendar, Clock, Receipt, UserCheck, FolderPlus, Download, FileSpreadsheet, LifeBuoy,
  Database, Search, Filter, Eye, ArrowRight, CheckCircle2, AlertTriangle, AlertCircle, XCircle, ExternalLink, RefreshCw,
  Zap, Sliders, BarChart3, Building2, Sparkles,
  Laptop, GraduationCap, CheckSquare, Square, ArrowLeft
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const COLORS = {
  emp_docs: "#4FD1C5", attendance_leave: "#7DD3FC", payroll: "#8CE99A",
  performance: "#F2B84B", ess: "#D8A6F2", assets: "#F2946B",
  loans: "#93C4D4", comp_incentives: "#F59E0B", awards: "#FFD166", special_allowances: "#F26B8A",
  budget: "#F5A524", finance_ledger: "#9AE6B4", attrition: "#FC8181",
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

/* ═════════════════════════════════════════════════════════════════════════════
   FINANCE / ACCOUNTANT LAYER — WORKFORCE COST, ATTRITION & RETENTION TWIN
   ─────────────────────────────────────────────────────────────────────────────
   Everything below is a *pure* model: same inputs → same outputs, no React, no
   side effects. The UI simply renders what these functions derive from the live
   employee table. That is what makes this a digital twin rather than a report —
   the numbers re-derive themselves the instant anyone is hired, promoted,
   retained or offboarded.
   ═════════════════════════════════════════════════════════════════════════════ */

// Accountant-owned master plan. Sanctioned headcount is the ceiling HR may not
// cross; annualBudget is the money envelope every workforce action draws from.
const DEPT_BUDGET_PLAN = {
  "Engineering": { sanctioned: 10, annualBudget: 32000000, criticality: "High" },
  "Human Resources": { sanctioned: 4, annualBudget: 9600000, criticality: "Medium" },
  "Finance": { sanctioned: 5, annualBudget: 13500000, criticality: "High" },
  "Product": { sanctioned: 6, annualBudget: 19000000, criticality: "High" },
  "Sales & Marketing": { sanctioned: 8, annualBudget: 22000000, criticality: "High" },
  "Customer Support": { sanctioned: 7, annualBudget: 12000000, criticality: "Medium" },
  "Operations": { sanctioned: 6, annualBudget: 14000000, criticality: "Medium" },
  "Legal": { sanctioned: 3, annualBudget: 8500000, criticality: "Low" },
};

// Employer statutory load on base salary (PF + ESI + gratuity accrual + insurance).
const STATUTORY_LOAD = 0.18;

// Per-grade economics. `annualValue` is the revenue/output a fully-ramped person
// at that grade is expected to generate — the other half of the P&L question.
const GRADE_ECONOMICS = {
  "Associate": {
    onboarding: { recruitmentFee: 45000, training: 35000, travel: 12000, itProvisioning: 55000, onboardingAdmin: 8000, bgVerification: 4000 },
    overheadAnnual: 60000, annualValue: 780000, rampUpMonths: 2, rampUpProductivity: 0.45, daysToFill: 30,
  },
  "Specialist": {
    onboarding: { recruitmentFee: 70000, training: 48000, travel: 18000, itProvisioning: 62000, onboardingAdmin: 10000, bgVerification: 5000 },
    overheadAnnual: 72000, annualValue: 1150000, rampUpMonths: 2, rampUpProductivity: 0.5, daysToFill: 38,
  },
  "Senior Specialist": {
    onboarding: { recruitmentFee: 110000, training: 62000, travel: 26000, itProvisioning: 70000, onboardingAdmin: 12000, bgVerification: 6000 },
    overheadAnnual: 84000, annualValue: 1520000, rampUpMonths: 3, rampUpProductivity: 0.5, daysToFill: 45,
  },
  "Lead": {
    onboarding: { recruitmentFee: 165000, training: 78000, travel: 38000, itProvisioning: 82000, onboardingAdmin: 15000, bgVerification: 8000 },
    overheadAnnual: 96000, annualValue: 1980000, rampUpMonths: 3, rampUpProductivity: 0.55, daysToFill: 55,
  },
  "Manager": {
    onboarding: { recruitmentFee: 245000, training: 95000, travel: 52000, itProvisioning: 92000, onboardingAdmin: 18000, bgVerification: 10000 },
    overheadAnnual: 108000, annualValue: 2750000, rampUpMonths: 4, rampUpProductivity: 0.55, daysToFill: 68,
  },
  "Senior Manager": {
    onboarding: { recruitmentFee: 330000, training: 110000, travel: 68000, itProvisioning: 100000, onboardingAdmin: 22000, bgVerification: 12000 },
    overheadAnnual: 115000, annualValue: 3900000, rampUpMonths: 4, rampUpProductivity: 0.6, daysToFill: 80,
  },
  "Director": {
    onboarding: { recruitmentFee: 420000, training: 120000, travel: 85000, itProvisioning: 110000, onboardingAdmin: 25000, bgVerification: 15000 },
    overheadAnnual: 120000, annualValue: 6100000, rampUpMonths: 5, rampUpProductivity: 0.6, daysToFill: 95,
  },
};

const ONBOARDING_LABELS = {
  recruitmentFee: "Recruitment / Agency Fee",
  training: "Induction & Skills Training",
  travel: "Relocation & Travel",
  itProvisioning: "IT Asset Provisioning",
  onboardingAdmin: "Onboarding Admin & Payroll Setup",
  bgVerification: "Background Verification",
};

// Retention levers the accountant can price against the cost of losing someone.
const RETENTION_LEVERS = [
  { key: "correction", label: "Pay Correction", detail: "+8% band correction", hikePct: 8, riskCut: 14, oneTimeMonths: 0 },
  { key: "retention_hike", label: "Retention Hike", detail: "+15% off-cycle raise", hikePct: 15, riskCut: 26, oneTimeMonths: 0 },
  { key: "promotion", label: "Promotion", detail: "Elevate to next grade", hikePct: null, riskCut: 38, oneTimeMonths: 0, requiresAppraisal: true },
  { key: "bonus", label: "Retention Bonus", detail: "2 months one-time, no run-rate impact", hikePct: 0, riskCut: 18, oneTimeMonths: 2 },
];

const RISK_BANDS = [
  { min: 75, band: "Critical", color: "#F26B6B" },
  { min: 55, band: "High", color: "#F2946B" },
  { min: 30, band: "Moderate", color: "#F2B84B" },
  { min: 0, band: "Low", color: "#8CE99A" },
];

function riskBandOf(score) {
  return RISK_BANDS.find((b) => score >= b.min) || RISK_BANDS[RISK_BANDS.length - 1];
}

function gradeEcon(designation) {
  return GRADE_ECONOMICS[designation] || GRADE_ECONOMICS["Associate"];
}

function gradeRank(designation) {
  if (!designation) return 0;
  const raw = String(designation).trim();
  const exact = DESIG_POOL.indexOf(raw);
  if (exact !== -1) return exact;
  const lower = raw.toLowerCase();
  if (lower.includes("director")) return 6;
  if (lower.includes("senior manager") || lower.includes("sr. manager")) return 5;
  if (lower.includes("manager")) return 4;
  if (lower.includes("lead")) return 3;
  if (lower.includes("senior specialist") || lower.includes("sr. specialist")) return 2;
  if (lower.includes("specialist")) return 1;
  return 0;
}

function fmtINR(n) {
  return "Rs." + Math.round(Number(n) || 0).toLocaleString("en-IN");
}

// Compact Indian-notation money for dense KPI tiles (Rs.1.24Cr / Rs.45.0L).
function fmtMoneyShort(n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 10000000) return `${sign}Rs.${(a / 10000000).toFixed(2)}Cr`;
  if (a >= 100000) return `${sign}Rs.${(a / 100000).toFixed(1)}L`;
  if (a >= 1000) return `${sign}Rs.${(a / 1000).toFixed(1)}K`;
  return `${sign}Rs.${Math.round(a)}`;
}

function monthsBetween(fromStr, toStr) {
  if (!fromStr) return 0;
  const f = new Date(typeof fromStr === "string" && !fromStr.includes("T") ? fromStr + "T00:00:00" : fromStr);
  const t = new Date(typeof toStr === "string" && !toStr.includes("T") ? toStr + "T00:00:00" : toStr);
  if (isNaN(f.getTime()) || isNaN(t.getTime())) return 0;
  return Math.max(0, (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth()) + (t.getDate() >= f.getDate() ? 0 : -1));
}

function daysBetween(fromStr, toStr) {
  if (!fromStr) return 0;
  const f = new Date(typeof fromStr === "string" && !fromStr.includes("T") ? fromStr + "T00:00:00" : fromStr);
  const t = new Date(typeof toStr === "string" && !toStr.includes("T") ? toStr + "T00:00:00" : toStr);
  if (isNaN(f.getTime()) || isNaN(t.getTime())) return 0;
  return Math.max(0, Math.round((t - f) / 86400000));
}

/** Itemised one-time cost of bringing one person of `designation` on board. */
function onboardingCostModel(designation) {
  const g = gradeEcon(designation);
  const heads = Object.entries(g.onboarding).map(([key, amount]) => ({
    key, label: ONBOARDING_LABELS[key] || key, amount,
  }));
  return { heads, total: heads.reduce((s, h) => s + h.amount, 0) };
}

/** Recurring annual cost to carry one person: salary + statutory + overhead. */
function annualCostModel(emp) {
  const desig = emp.designation || emp.desig || "Associate";
  const rate = Number(emp.dailyRate) || DESIGNATION_RATES[desig] || 1000;
  const baseSalary = rate * 30 * 12;
  const statutory = Math.round(baseSalary * STATUTORY_LOAD);
  const overhead = gradeEcon(desig).overheadAnnual;
  return { rate, baseSalary, statutory, overhead, total: baseSalary + statutory + overhead };
}

/**
 * Per-employee profit & loss twin. Answers the two questions the accountant
 * actually cares about: is this person worth their cost at steady state, and
 * have they paid back what it cost to hire them yet?
 */
function employeeROIModel(emp, today) {
  const desig = emp.designation || emp.desig || "Associate";
  const g = gradeEcon(desig);
  const cost = annualCostModel(emp);
  const onboarding = onboardingCostModel(desig);
  const annualValue = g.annualValue;

  const steadyMargin = annualValue - cost.total;
  // Output forgone while the new joiner is still ramping to full productivity.
  const rampUpLoss = Math.round((annualValue / 12) * g.rampUpMonths * (1 - g.rampUpProductivity));
  const year1Net = steadyMargin - onboarding.total - rampUpLoss;

  const tenureMonths = (emp.tenureMonths !== undefined && emp.tenureMonths !== null)
    ? Number(emp.tenureMonths)
    : monthsBetween(emp.joined, today);
  const rampedMonths = Math.min(tenureMonths, g.rampUpMonths);
  const fullMonths = Math.max(0, tenureMonths - g.rampUpMonths);
  const valueToDate = Math.round((annualValue / 12) * (rampedMonths * g.rampUpProductivity + fullMonths));
  const costToDate = Math.round((cost.total / 12) * tenureMonths) + onboarding.total;
  const netToDate = valueToDate - costToDate;

  const investment = onboarding.total + rampUpLoss;
  const breakEvenMonths = steadyMargin > 0 ? Math.ceil(investment / (steadyMargin / 12)) : null;

  let verdict = "Break-even";
  if (steadyMargin > annualValue * 0.08) verdict = "Profitable";
  else if (steadyMargin < 0) verdict = "Loss-making";

  return {
    designation: desig, annualValue, cost, onboarding, steadyMargin, rampUpLoss,
    year1Net, tenureMonths, valueToDate, costToDate, netToDate, breakEvenMonths,
    verdict, recovered: netToDate >= 0,
  };
}

/**
 * Attrition flight-risk twin. `sig` is a bundle of live signals assembled from
 * the HRMS tables — the model stays pure and returns its own reasoning so the
 * UI can show *why* someone is at risk, not just a number.
 */
function flightRiskModel(sig) {
  const drivers = [];
  let score = 10; // everyone carries some baseline probability of leaving

  const add = (points, label) => {
    if (points === 0) return;
    score += points;
    drivers.push({ points, label });
  };

  if (sig.onNotice) {
    return { score: 100, band: "Departing", color: "#F26B6B", drivers: [{ points: 100, label: "Already serving notice period" }] };
  }

  // Tenure risk curve: peaks between the 1st and 3rd year, flattens after.
  const t = sig.tenureMonths;
  if (t < 6) add(12, `Early tenure (${t}mo) — onboarding attrition window`);
  else if (t < 12) add(8, `Under 1 year (${t}mo) — still settling`);
  else if (t <= 30) add(22, `Peak-risk tenure band (${t}mo) — most marketable point`);
  else if (t <= 48) add(12, `Mid tenure (${t}mo)`);
  else add(4, `Long tenure (${t}mo) — anchored`);

  // Career stagnation: no grade movement for a long stretch.
  if (sig.monthsSinceGradeChange >= 30) add(20, `No promotion in ${sig.monthsSinceGradeChange}mo — career stagnation`);
  else if (sig.monthsSinceGradeChange >= 18) add(11, `No promotion in ${sig.monthsSinceGradeChange}mo`);

  // Pay position within the grade band. Retention raises push this above 1.0.
  if (sig.compaRatio < 0.95) add(18, `Paid below grade band (compa-ratio ${sig.compaRatio.toFixed(2)})`);
  else if (sig.compaRatio < 1.0) add(9, `Slightly below band median (${sig.compaRatio.toFixed(2)})`);
  else if (sig.compaRatio >= 1.1) add(-10, `Paid above band (${sig.compaRatio.toFixed(2)}) — retention premium active`);

  // High performers who are not moving are the most expensive people to lose.
  if (sig.rating === "Outstanding" || sig.rating === "Exceeds Expectations") {
    if (sig.monthsSinceGradeChange >= 18) add(16, `High performer (${sig.rating}) with no recent progression`);
    else add(5, `High performer (${sig.rating}) — market-attractive`);
  } else if (sig.rating === "Needs Improvement" || sig.rating === "Unsatisfactory") {
    add(12, `Low appraisal rating (${sig.rating}) — disengagement risk`);
  } else if (!sig.rating) {
    add(8, "No appraisal on file — unmanaged / unrecognised");
  }

  if (sig.awardsCount > 0) add(-8, `${sig.awardsCount} excellence award(s) — recognised`);

  // Behavioural signals pulled from attendance and the self-service desk.
  if (sig.recentLeaveDays >= 6) add(10, `${sig.recentLeaveDays} leave days recently — disengagement signal`);
  if (sig.openTickets > 0) add(sig.openTickets >= 2 ? 10 : 6, `${sig.openTickets} unresolved ESS/helpdesk request(s)`);

  // An active loan is a real financial anchor that suppresses voluntary exits.
  if (sig.hasActiveLoan) add(-12, "Active company loan — financial anchor");

  // Structural risk: a team with no leader bleeds people.
  if (!sig.deptHasManager) add(9, "Department has no active manager — leadership vacuum");
  if (sig.deptVacancyRate >= 0.3) add(8, `${Math.round(sig.deptVacancyRate * 100)}% of team seats vacant — workload strain`);
  if (sig.attritionShock > 0) add(sig.attritionShock, `Market attrition shock (+${sig.attritionShock} pts)`);

  score = Math.max(2, Math.min(97, Math.round(score)));
  const b = riskBandOf(score);
  return { score, band: b.band, color: b.color, drivers: drivers.sort((a, c) => Math.abs(c.points) - Math.abs(a.points)) };
}

/**
 * What it actually costs the company when this person walks out. This is the
 * number every retention offer gets priced against.
 */
function attritionLossModel(emp, ctx) {
  const desig = emp.designation || emp.desig || "Associate";
  const g = gradeEcon(desig);
  const cost = annualCostModel(emp);
  const onboarding = onboardingCostModel(desig);

  // An internal successor collapses the vacancy window dramatically.
  const daysVacant = ctx.internalSuccessor ? Math.min(12, g.daysToFill) : g.daysToFill;
  const dailyValue = g.annualValue / 365;

  const heads = [];
  heads.push({
    label: "Backfill recruitment & onboarding",
    amount: ctx.internalSuccessor ? Math.round(onboarding.total * 0.35) : onboarding.total,
    note: ctx.internalSuccessor ? "Reduced — internal successor available, agency fee avoided" : `Full external hire at ${desig} grade`,
  });
  heads.push({
    label: "Vacancy output loss",
    amount: Math.round(dailyValue * daysVacant),
    note: `${daysVacant} days seat empty x ${fmtINR(dailyValue)}/day of forgone output`,
  });
  heads.push({
    label: "Knowledge & handover loss",
    amount: Math.round((Math.min(ctx.tenureMonths, 36) / 36) * g.annualValue * 0.18),
    note: `${ctx.tenureMonths}mo of accumulated context leaving the building`,
  });
  heads.push({
    label: "Team coverage strain",
    amount: Math.round(dailyValue * daysVacant * 0.22 + (ctx.teamSize > 0 ? cost.total * 0.03 : 0)),
    note: `Overtime and context-switching across ${ctx.teamSize} remaining teammate(s)`,
  });
  if (ctx.isManager) {
    heads.push({
      label: "Leadership gap premium",
      amount: Math.round(g.annualValue * 0.22 * (daysVacant / 365) + 85000),
      note: "Decision latency and unsupervised reports until succession completes",
    });
  }
  heads.push({
    label: "Exit admin & F&F processing",
    amount: 18000 + gradeRank(desig) * 6000,
    note: "Clearance, settlement computation, compliance filing",
  });

  const total = heads.reduce((s, h) => s + h.amount, 0);
  return { heads, total, daysVacant, dailyValue: Math.round(dailyValue) };
}

/**
 * Prices one retention lever against the modelled cost of the exit it prevents.
 * Positive netBenefit = cheaper to keep them than to replace them.
 */
function retentionOfferModel(emp, lever, riskScore, attritionLoss, rating = null) {
  const desig = emp.designation || emp.desig || "Associate";
  const rate = Number(emp.dailyRate) || DESIGNATION_RATES[desig] || 1000;
  const currentAnnual = rate * 30 * 12;
  const rank = gradeRank(desig);

  // Ineligible promotion conditions:
  // 1. Employee is already at the maximum grade (Director - rank 6)
  // 2. Promotion requires an approved performance appraisal
  const effectiveRating = rating || emp.rating || emp.performanceScore;
  if (lever.key === "promotion") {
    if (rank >= DESIG_POOL.length - 1 || (lever.requiresAppraisal && !effectiveRating)) {
      return {
        lever,
        newRate: rate,
        newDesignation: desig,
        currentAnnual,
        newAnnual: currentAnnual,
        recurringCost: 0,
        oneTimeCost: 0,
        yearOneCost: 0,
        residualRisk: riskScore,
        expectedSaving: 0,
        netBenefit: -Infinity,
        roi: 0,
        ineligible: true,
        ineligibleReason: rank >= DESIG_POOL.length - 1
          ? "Already at highest rank (Director)"
          : "Requires completed performance appraisal",
        verdict: "RELEASE",
      };
    }
  }

  let newRate = rate;
  let newDesignation = desig;
  if (lever.key === "promotion") {
    const nextIdx = Math.min(rank + 1, DESIG_POOL.length - 1);
    newDesignation = DESIG_POOL[nextIdx];
    newRate = DESIGNATION_RATES[newDesignation] || rate;
  } else if (lever.hikePct) {
    newRate = Math.round(rate * (1 + lever.hikePct / 100));
  }

  const newAnnual = newRate * 30 * 12;
  const recurringCost = Math.round((newAnnual - currentAnnual) * (1 + STATUTORY_LOAD));
  const oneTimeCost = Math.round((lever.oneTimeMonths || 0) * rate * 30);
  const yearOneCost = recurringCost + oneTimeCost;

  const residualRisk = Math.max(5, riskScore - lever.riskCut);
  const expectedLossNow = (attritionLoss * riskScore) / 100;
  const expectedLossAfter = (attritionLoss * residualRisk) / 100;
  const expectedSaving = Math.round(expectedLossNow - expectedLossAfter);
  const netBenefit = expectedSaving - yearOneCost;
  const roi = yearOneCost > 0 ? expectedSaving / yearOneCost : (expectedSaving > 0 ? Infinity : 0);

  return {
    lever, newRate, newDesignation, currentAnnual, newAnnual,
    recurringCost, oneTimeCost, yearOneCost, residualRisk,
    expectedSaving, netBenefit, roi,
    verdict: netBenefit > 0 ? "RETAIN" : "RELEASE",
  };
}

/**
 * Succession / replacement search, in the order a real HR team would look:
 * same grade in the same team, then a promotable junior (which cascades a new
 * vacancy one grade down), then a lateral from another department.
 */
const DEPT_AFFINITY = {
  "Engineering": ["Engineering", "Product"],
  "Product": ["Product", "Engineering", "Operations", "Customer Support", "Sales & Marketing"],
  "Sales & Marketing": ["Sales & Marketing", "Customer Support", "Product", "Operations"],
  "Customer Support": ["Customer Support", "Sales & Marketing", "Operations", "Human Resources"],
  "Finance": ["Finance", "Operations", "Legal", "Human Resources"],
  "Human Resources": ["Human Resources", "Operations", "Legal", "Finance"],
  "Operations": ["Operations", "Finance", "Product", "Customer Support", "Human Resources", "Sales & Marketing"],
  "Legal": ["Legal", "Finance", "Human Resources", "Operations"],
};

/**
 * Succession / replacement search, in the order a real HR team would look:
 * same grade in the same team, then a promotable junior (which cascades a new
 * vacancy one grade down), then a lateral from another domain-compatible department.
 */
function findReplacementCandidates(emp, activeEmps, ratingOf) {
  const desig = emp.designation || emp.desig || "Associate";
  const dept = emp.department || emp.dept;
  const rank = gradeRank(desig);
  const pool = activeEmps.filter((e) => e.id !== emp.id && !e.status?.includes("Notice Period"));
  const out = [];

  pool.forEach((c) => {
    const cDesig = c.designation || c.desig || "Associate";
    const cDept = c.department || c.dept;
    const cRank = gradeRank(cDesig);
    const rating = ratingOf(c.name);
    const promotable = rating && rating !== "Needs Improvement" && rating !== "Unsatisfactory";

    if (cDept === dept && cRank === rank) {
      out.push({
        emp: c, mode: "Lateral Cover", fitScore: 92, cascades: false, cost: 0,
        note: `Same grade in ${dept} — can absorb the seat immediately`
      });
    } else if (cDept === dept && cRank === rank - 1 && promotable) {
      const delta = Math.round(((DESIGNATION_RATES[desig] || 0) - (DESIGNATION_RATES[cDesig] || 0)) * 30 * 12 * (1 + STATUTORY_LOAD));
      out.push({
        emp: c, mode: "Internal Promotion", fitScore: 85, cascades: true, cost: delta,
        note: `One grade below in ${dept}, appraisal "${rating}" — cascades a ${cDesig} vacancy`
      });
    } else if (cDept !== dept && cRank === rank) {
      const compatible = (DEPT_AFFINITY[dept] || [dept]).includes(cDept);
      if (compatible) {
        out.push({
          emp: c, mode: "Cross-Dept Transfer", fitScore: 68, cascades: true, cost: 0,
          note: `Same grade in aligned dept (${cDept}) — transferable domain skill overlap`
        });
      }
    }
  });

  return out.sort((a, b) => b.fitScore - a.fitScore).slice(0, 5);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const INITIAL_MODULES = [
  { id: "emp_docs", name: "Employee & Docs", layer: 0, table: "employee_records", active: true },
  { id: "attendance_leave", name: "Attendance & Leave", layer: 1, table: "attendance_leave", active: true },
  { id: "performance", name: "Performance & Appraisal", layer: 1, table: "performance_cycles", active: true },
  { id: "assets", name: "Asset Management", layer: 1, table: "company_assets", active: true },
  { id: "loans", name: "Loan Management", layer: 1, table: "employee_loans", active: true },
  { id: "comp_incentives", name: "Compensation & Incentives", layer: 1, table: "comp_incentives", active: true },
  { id: "payroll", name: "Payroll & Statutory", layer: 2, table: "payroll_records", active: true },
  { id: "ess", name: "Self-Service (ESS)", layer: 3, table: "ess_requests", active: true },
  { id: "budget", name: "Dept Budget & Headcount", layer: 0, table: "dept_budget_control", active: true },
  { id: "finance_ledger", name: "Cost & P/L Ledger", layer: 2, table: "finance_ledger", active: true },
  { id: "attrition", name: "Attrition & Retention", layer: 2, table: "attrition_register", active: true },
];

const INITIAL_EDGES = [
  { dependent: "attendance_leave", dependency: "emp_docs" },
  { dependent: "performance", dependency: "emp_docs" },
  { dependent: "assets", dependency: "emp_docs" },
  { dependent: "loans", dependency: "emp_docs" },
  { dependent: "comp_incentives", dependency: "emp_docs" },
  { dependent: "comp_incentives", dependency: "performance" },
  { dependent: "payroll", dependency: "emp_docs" },
  { dependent: "payroll", dependency: "attendance_leave" },
  { dependent: "payroll", dependency: "loans" },
  { dependent: "payroll", dependency: "comp_incentives" },
  { dependent: "ess", dependency: "emp_docs" },
  { dependent: "ess", dependency: "attendance_leave" },
  { dependent: "ess", dependency: "payroll" },
  { dependent: "ess", dependency: "performance" },
  { dependent: "ess", dependency: "comp_incentives" },
  // Finance / accountant layer
  { dependent: "emp_docs", dependency: "budget" },
  { dependent: "finance_ledger", dependency: "budget" },
  { dependent: "finance_ledger", dependency: "emp_docs" },
  { dependent: "finance_ledger", dependency: "payroll" },
  { dependent: "attrition", dependency: "emp_docs" },
  { dependent: "attrition", dependency: "performance" },
  { dependent: "attrition", dependency: "finance_ledger" },
];

// The accountant's opening balance sheet: one budget control row per department.
function seedBudgetRows(fiscalYear = "FY 2026-27") {
  return Object.entries(DEPT_BUDGET_PLAN).map(([dept, plan]) => ({
    id: `BUD-${dept.replace(/[^A-Za-z]/g, "").slice(0, 10).toUpperCase()}`,
    dept,
    fiscalYear,
    sanctioned: plan.sanctioned,
    annualBudget: plan.annualBudget,
    criticality: plan.criticality,
    oneTimeSpent: 0,      // onboarding + retention + attrition charges booked to date
    status: "Within Budget",
  }));
}

const INITIAL_DB = {
  emp_docs: [],
  attendance_leave: [],
  performance: [], assets: [], loans: [], comp_incentives: [],
  payroll: [], ess: [],
  budget: seedBudgetRows(), finance_ledger: [], attrition: [],
};

const KEYWORD_RULES = [
  { kws: ["pay", "salary", "statutory", "pf", "esi", "tds", "pt", "compensat"], deps: ["emp_docs", "attendance_leave"] },
  { kws: ["report", "analytic", "dashboard", "insight"], deps: ["emp_docs", "attendance_leave", "payroll", "performance"] },
  { kws: ["recruit", "hiring", "onboard", "document", "doc"], deps: ["emp_docs"] },
  { kws: ["asset", "inventory", "equipment", "laptop", "hardware"], deps: ["emp_docs", "assets"] },
  { kws: ["perform", "appraisal", "goal", "kpi", "review"], deps: ["emp_docs", "performance"] },
  { kws: ["leave", "vacation", "attend", "shift", "time", "half"], deps: ["emp_docs", "attendance_leave"] },
  { kws: ["loan", "advance", "borrow", "repay", "emi"], deps: ["emp_docs", "loans"] },
  { kws: ["award", "excel", "recogni", "nominat", "star", "allowance", "lta", "sca", "stipend", "incentive", "bonus"], deps: ["emp_docs", "comp_incentives"] },
  { kws: ["self", "ess", "portal", "profile"], deps: ["emp_docs", "attendance_leave", "payroll", "performance"] },
];

function suggestDeps(name, moduleIds) {
  const n = name.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.kws.some((k) => n.includes(k))) return rule.deps.filter((d) => moduleIds.includes(d));
  }
  return moduleIds.includes("emp_docs") ? ["emp_docs"] : [];
}

let idSeed = 250;
const knownIds = new Set();

function registerKnownId(id) {
  if (id && typeof id === "string") {
    knownIds.add(id);
    const m = id.match(/-(\d+)$/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num >= idSeed) idSeed = num + 1;
    }
  }
}

const nextId = (prefix) => {
  let candidate;
  do {
    candidate = `${prefix}-${idSeed++}`;
  } while (knownIds.has(candidate));
  knownIds.add(candidate);
  return candidate;
};

function getLocalDateStr(d = new Date()) {
  if (typeof d === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return d.trim();
    d = new Date(d.includes("T") ? d : d + "T00:00:00");
  }
  const dt = (d instanceof Date && !isNaN(d.getTime())) ? d : new Date();
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEssUsageDetails(r) {
  if (!r) return { usage: "Unknown", issueOrUpdate: "—", impact: "—", category: "General" };
  const req = r.request || "ESS Request";
  let usage = req;
  let issueOrUpdate = "";
  let impact = "";
  let category = req;

  if (req === "Reimbursement Claim") {
    usage = "Expense Reimbursement Claim";
    category = r.claimCategory || (r.details?.split("—")?.[0]?.trim()) || "Travel / Business Expense";
    const amt = r.claimAmount != null
      ? `₹${Number(r.claimAmount).toLocaleString("en-IN")}`
      : (r.details?.match(/Rs\.[\d,]+/)?.[0]?.replace("Rs.", "₹") || "₹1,200");
    issueOrUpdate = `Claimed ${amt} for ${category}`;
    if (r.details && !r.details.includes(amt) && !r.details.includes(category)) {
      issueOrUpdate += ` • ${r.details}`;
    }
    if (r.status?.includes("Approved")) {
      impact = `Approved by HR: ${amt} credited to Special Allowances (Disbursed in Payroll)`;
    } else if (r.status?.includes("Rejected")) {
      impact = "Rejected by HR: Expense claim denied; employee notified";
    } else {
      impact = "Submitted by Employee: Pending HR receipt verification & payroll allowance credit";
    }
  } else if (req === "HR & IT Helpdesk" || req === "IT Declaration Submission") {
    usage = "HR & IT Helpdesk Ticket";
    const prio = r.ticketPriority || "High";
    const sub = r.ticketSubject || (r.details?.split(":")?.[1]?.trim()) || "IT Support Request";
    category = r.ticketCategory || (r.details?.match(/\[.*?\]\s*([^:]+)/)?.[1]?.trim()) || "IT Hardware & Equipment";
    const desc = r.ticketDescription ? ` — "${r.ticketDescription}"` : "";
    issueOrUpdate = `[${prio} Priority] ${category}: ${sub}${desc}`;
    if (r.status?.includes("Resolved")) {
      impact = "Resolved & Closed: Service diagnostics executed & ticket marked closed";
    } else if (r.status?.includes("Escalated")) {
      impact = "Escalated: Priority raised to Critical Tier-2 Engineering / Facilities Lead";
    } else {
      impact = "Submitted by Employee: Open ticket awaiting technician diagnostic or HR resolution";
    }
  } else if (req === "Profile Update") {
    usage = "Master Profile Modification";
    const field = r.profileField || (r.details?.split(":")?.[0]?.trim()) || "Residential Address";
    category = field;
    const val = r.profileValue || (r.details?.includes(":") ? r.details.split(":").slice(1).join(":").trim() : r.details) || "Updated";
    issueOrUpdate = `${field} ➔ "${val}"`;
    if (r.status?.includes("Approved")) {
      impact = `Approved by HR: Master Employee Directory & KYC permanently updated with new ${field}`;
    } else if (r.status?.includes("Rejected")) {
      impact = `Rejected by HR: Profile modification declined by HR; employee notified`;
    } else {
      impact = `Submitted by Employee: Pending HR KYC & address verification in Approvals Drawer`;
    }
  } else if (req === "Attendance Correction") {
    usage = "Attendance Regularization";
    const dt = r.corrDate || (r.details?.match(/\d{4}-\d{2}-\d{2}/)?.[0]) || "Logged Date";
    const sess = r.corrSession || (r.details?.match(/\((.*?)\)/)?.[1]) || "Morning Punch IN";
    const rsn = r.corrReason || (r.details?.includes("—") ? r.details.split("—")[1]?.trim() : "Biometric Hardware Error");
    category = sess;
    issueOrUpdate = `${dt} (${sess}) • Reason: ${rsn}`;
    if (r.status?.includes("Approved")) {
      impact = `Approved by HR: Attendance punch registered on ${dt} (${sess}) in Attendance Sheet`;
    } else if (r.status?.includes("Rejected")) {
      impact = `Rejected by HR: Attendance regularization for ${dt} declined; employee notified`;
    } else {
      impact = `Submitted by Employee: Awaiting supervisor approval in Approvals Drawer`;
    }
  } else if (req === "Document Request") {
    usage = "Official HR Document Request";
    const doc = r.docType || (r.details?.split("[")?.[0]?.trim()) || "Bonafide Certificate";
    const purp = r.docPurpose || (r.details?.match(/\[Purpose:\s*(.*?)\]/)?.[1]) || "";
    category = doc;
    issueOrUpdate = `Request "${doc}"${purp ? ` [Purpose: ${purp}]` : ""}`;
    if (r.status?.includes("Approved")) {
      impact = `Approved by HR: "${doc}" authorized with digital company seal & issued`;
    } else if (r.status?.includes("Rejected")) {
      impact = `Rejected by HR: Document issuance declined; employee notified`;
    } else {
      impact = `Submitted by Employee: Pending HR verification & digital seal authorization`;
    }
  } else if (req === "Payslip Download") {
    usage = "Encrypted Salary Statement";
    category = "Payroll Statement";
    issueOrUpdate = r.details || "Monthly Encrypted Salary Payslip generated";
    impact = "Instant Self-Service: Encrypted monthly payslip statement delivered";
  } else if (req === "Leave Balance Check") {
    usage = "Leave Balance Inquiry";
    category = "Leave Quota";
    issueOrUpdate = r.details || "Annual / Casual / Sick leave quota ledger queried";
    impact = "Instant Self-Service: Live 3-tier leave balance fetched";
  } else {
    issueOrUpdate = r.details || `${req} executed via ESS Portal`;
    impact = "Executed via ESS Portal";
  }

  return { usage, issueOrUpdate, impact, category };
}

function getStatusBadge(status) {
  const s = String(status || "Completed").trim();
  if (s.includes("Approved")) {
    return { label: s === "Approved" ? "Approved by HR" : s, color: "#8CE99A", bg: "rgba(140,233,154,0.14)", border: "rgba(140,233,154,0.35)", icon: "✓" };
  }
  if (s.includes("Resolved")) {
    return { label: "Resolved & Closed", color: "#6BF2C2", bg: "rgba(107,242,194,0.14)", border: "rgba(107,242,194,0.35)", icon: "✓" };
  }
  if (s.includes("Pending") || s.includes("Open")) {
    return { label: s.includes("HR") ? "Submitted (Pending HR)" : s, color: "#F2B84B", bg: "rgba(242,184,75,0.15)", border: "rgba(242,184,75,0.45)", icon: "⏳" };
  }
  if (s.includes("Escalated")) {
    return { label: "Escalated to Tier-2", color: "#F2946B", bg: "rgba(242,148,107,0.16)", border: "rgba(242,148,107,0.45)", icon: "⚠️" };
  }
  if (s.includes("Rejected")) {
    return { label: "Rejected by HR", color: "#F26B6B", bg: "rgba(242,107,107,0.15)", border: "rgba(242,107,107,0.45)", icon: "✕" };
  }
  return { label: s, color: "#7DD3FC", bg: "rgba(125,211,252,0.12)", border: "rgba(125,211,252,0.3)", icon: "●" };
}

const OrgChart = ({ db, gradeRank }) => {
  const activeEmps = (db.emp_docs || []).filter(e => !e.status?.includes("Inactive"));

  const depts = {};
  activeEmps.forEach(emp => {
    const d = emp.dept || emp.department;
    if (!depts[d]) depts[d] = [];
    depts[d].push(emp);
  });

  const Node = ({ emp, isTop }) => (
    <div style={{
      background: isTop ? "rgba(255,215,0,0.05)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${isTop ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.1)"}`,
      borderRadius: 6, padding: "8px 12px",
      minWidth: 120, textAlign: "center", zIndex: 2,
      boxShadow: isTop ? "0 0 10px rgba(255,215,0,0.1)" : "none"
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: isTop ? "#F2D9A6" : "#DCE6F2" }}>
        {emp?.name} {(emp?.designation || emp?.desig || "").toLowerCase().includes("director") && <span title="Executive Director" style={{ filter: "drop-shadow(0 0 4px rgba(255,215,0,0.6))" }}>👑</span>}
      </div>
      <div style={{ fontSize: 9, color: "#7C93AA", textTransform: "uppercase", marginTop: 4 }}>{emp?.designation || emp?.desig}</div>
    </div>
  );

  return (
    <div className="scrollbar-thin" style={{ height: "100%", minHeight: 460, maxHeight: 540, overflowY: "auto", padding: "20px 20px 60px 20px", display: "flex", flexDirection: "column", gap: 60 }}>
      {Object.entries(depts).map(([deptName, emps]) => {
        const sorted = [...emps].sort((a, b) => gradeRank(b.designation || b.desig) - gradeRank(a.designation || a.desig));
        const director = sorted[0];
        const others = sorted.slice(1);
        const middle = others.filter(e => (e.designation || e.desig || "").toLowerCase().match(/manager|lead/));
        const bottom = others.filter(e => !(e.designation || e.desig || "").toLowerCase().match(/manager|lead/));

        return (
          <div key={deptName} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="mono" style={{ fontSize: 12, color: "#5C7891", marginBottom: 16, letterSpacing: "0.15em", background: "rgba(0,0,0,0.3)", padding: "4px 12px", borderRadius: 4 }}>{deptName}</div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {director && <Node emp={director} isTop={true} />}

              {(middle.length > 0 || bottom.length > 0) && (
                <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.15)" }} />
              )}

              {middle.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                  <div style={{
                    display: "flex", justifyContent: "center", gap: 24, position: "relative",
                    paddingTop: 12, borderTop: middle.length > 1 ? "1px solid rgba(255,255,255,0.15)" : "none"
                  }}>
                    {middle.map((m, i) => (
                      <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                        {middle.length > 1 && <div style={{ position: "absolute", top: -12, width: 1, height: 12, background: "rgba(255,255,255,0.15)" }} />}
                        <Node emp={m} />
                      </div>
                    ))}
                  </div>

                  {bottom.length > 0 && (
                    <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.15)" }} />
                  )}
                </div>
              )}

              {bottom.length > 0 && (
                <div style={{
                  display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, maxWidth: 500,
                  paddingTop: 12, borderTop: (bottom.length > 1 && middle.length === 0) ? "1px solid rgba(255,255,255,0.15)" : "none",
                  position: "relative"
                }}>
                  {bottom.map((b, i) => (
                    <div key={b.id} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      {(bottom.length > 1 && middle.length === 0) && <div style={{ position: "absolute", top: -12, width: 1, height: 12, background: "rgba(255,255,255,0.15)" }} />}
                      <Node emp={b} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

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
  const [leftPanelView, setLeftPanelView] = useState("dependencies");
  // Three simulated personas: HR Admin, Employee (self-service), and the new
  // Accountant / Finance Controller who owns budgets and approves headcount cost.
  const [simRole, setSimRole] = useState("HR"); // "HR" | "EMP" | "FIN" | "SUPERADMIN"
  const hrViewEnabled = simRole === "HR" || simRole === "SUPERADMIN";
  const financeView = simRole === "FIN" || simRole === "SUPERADMIN";
  // Back-compat shim so existing "switch to HR view" call sites keep working.
  const setHrViewEnabled = (v) =>
    setSimRole((prev) => ((typeof v === "function" ? v(prev === "HR") : v) ? "HR" : "EMP"));
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDeps, setNewDeps] = useState(new Set());
  const [newModScope, setNewModScope] = useState("empty"); // "empty", "all", "specific"
  const [newModEmpId, setNewModEmpId] = useState("");
  // ── Employee form modal (2-Step Onboarding Wizard) ──────────────────────
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [empFormName, setEmpFormName] = useState("");
  const [empFormDept, setEmpFormDept] = useState(DEPT_POOL[0]);
  const [empFormDesig, setEmpFormDesig] = useState(DESIG_POOL[0]);
  const [onboardStep, setOnboardStep] = useState(1); // 1 = Details & Vacancy, 2 = Provisioning Checklist
  const [hireMode, setHireMode] = useState("new"); // "new" | "rehire"
  const [rehireEmpId, setRehireEmpId] = useState("");
  const [selectedVacancyId, setSelectedVacancyId] = useState("");
  const [onboardLeaves, setOnboardLeaves] = useState({ annual: 12, casual: 6, sick: 6 });
  const [onboardLaptop, setOnboardLaptop] = useState(true);
  const [onboardTraining, setOnboardTraining] = useState(true);
  const [onboardBiometric, setOnboardBiometric] = useState(true);
  const [onboardStatutory, setOnboardStatutory] = useState(true);
  // ── Leave wizard modal ────────────────────────────────────────────────────
  const [showLeave, setShowLeave] = useState(false);
  const [leaveStep, setLeaveStep] = useState(1);   // 1 = pick emp, 2 = type+days
  const [leaveEmpId, setLeaveEmpId] = useState("");
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveStartDate, setLeaveStartDate] = useState(getLocalDateStr());
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySession, setHalfDaySession] = useState("First Half (Morning)");
  const [odPurpose, setOdPurpose] = useState("Client Site Visit");
  const [compOffWorkedDate, setCompOffWorkedDate] = useState("2026-09-13 (Sunday Deployment)");
  const [medicalCertDate, setMedicalCertDate] = useState("EDD: Oct 2026 / Medical Cert #MC-9021");
  // ── Unified action modal ───────────────────────────────────────────────────
  const [modal, setModal] = useState(null);
  const [customData, setCustomData] = useState({});
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState("idle"); // idle, syncing, synced, error
  const [expandedDb, setExpandedDb] = useState(new Set(["emp_docs"]));
  const [showNotifications, setShowNotifications] = useState(false);
  const [dbTab, setDbTab] = useState("ess");
  const [dbSearch, setDbSearch] = useState("");
  const [dbStatusFilter, setDbStatusFilter] = useState("ALL");
  const [inspectRecord, setInspectRecord] = useState(null);
  const [isDbExplorerExpanded, setIsDbExplorerExpanded] = useState(true);
  const [ffStatement, setFfStatement] = useState(null);

  const [chartAnim, setChartAnim] = useState({
    active: false,
    type: null, // "ADD" | "OFFBOARD"
    empName: "",
    empDesig: "",
    dept: "",
    stage: 0,
    message: ""
  });
  const [offboardChecklist, setOffboardChecklist] = useState({
    itHardware: true,
    accessCard: true,
    emailRevoked: true,
    biometricRevoked: true,
    loansCleared: true,
    claimsAudited: true,
    managerHandover: true,
    ndaSigned: true
  });
  const [selectedFlowDept, setSelectedFlowDept] = useState("ACTIVE"); // "ACTIVE" | "ALL" | specific dept
  // ── Finance control tower ────────────────────────────────────────────────
  const [finTab, setFinTab] = useState("overview"); // overview | risk | vacancy | scenario | roi
  const [expandedRisk, setExpandedRisk] = useState(null);
  const [scenario, setScenario] = useState({
    hiringFreeze: false,
    blanketHikePct: 0,
    attritionShockPct: 0,
    retainCriticalOnly: true,
  });
  const syncTimerRef = useRef(null);

  const activeDepts = useMemo(() => {
    const deptsWithStaff = DEPT_POOL.filter(d =>
      (db.emp_docs || []).some(e => (e.department === d || e.dept === d) && !e.status?.includes("Inactive"))
    );
    return deptsWithStaff.length > 0 ? deptsWithStaff : DEPT_POOL.slice(0, 4);
  }, [db.emp_docs]);

  const displayedFlowDepts = useMemo(() => {
    return DEPT_POOL;
  }, []);

  const computeAutoOffboardChecklist = useCallback(() => {
    return {
      itHardware: true,
      accessCard: true,
      emailRevoked: true,
      biometricRevoked: true,
      loansCleared: true,
      claimsAudited: true,
      managerHandover: true,
      ndaSigned: true
    };
  }, []);

  useEffect(() => {
    if (modal?.type === "offboard" && modal?.empId) {
      setOffboardChecklist(computeAutoOffboardChecklist(modal.empId));
    }
  }, [modal?.type, modal?.empId, computeAutoOffboardChecklist]);

  const pendingLeaves = useMemo(() => {
    return (db.attendance_leave || []).filter(r => r.type !== "Attendance" && r.dates !== "Balance" && r.status === "Pending Approval");
  }, [db.attendance_leave]);

  const pendingLoans = useMemo(() => {
    return (db.loans || []).filter(r => r.status === "Under Review");
  }, [db.loans]);

  const pendingClaims = useMemo(() => {
    return (db.ess || []).filter(r => r.request === "Reimbursement Claim" && (r.status === "Pending HR Approval" || r.status === "Pending Approval"));
  }, [db.ess]);

  const pendingAttendanceCorrections = useMemo(() => {
    return (db.ess || []).filter(r => r.request === "Attendance Correction" && (r.status === "Pending HR Approval" || r.status === "Pending Approval"));
  }, [db.ess]);

  const pendingDocRequests = useMemo(() => {
    return (db.ess || []).filter(r => r.request === "Document Request" && (r.status === "Pending HR Approval" || r.status === "Pending Approval"));
  }, [db.ess]);

  const pendingProfileUpdates = useMemo(() => {
    return (db.ess || []).filter(r => r.request === "Profile Update" && (r.status === "Pending HR Approval" || r.status === "Pending Approval"));
  }, [db.ess]);

  const pendingTickets = useMemo(() => {
    return (db.ess || []).filter(r => (r.request === "HR & IT Helpdesk" || r.request === "IT Declaration Submission") && (r.status?.includes("Pending") || r.status?.includes("Open") || r.status?.includes("Escalated")));
  }, [db.ess]);

  const pendingCount = pendingLeaves.length + pendingLoans.length + pendingClaims.length + pendingAttendanceCorrections.length + pendingDocRequests.length + pendingProfileUpdates.length + pendingTickets.length;

  function getLeaveBalance(empName, type) {
    let quotaType = "Annual Leave Balance";
    if (type && type.includes("Casual")) quotaType = "Casual Leave Balance";
    else if (type && type.includes("Sick")) quotaType = "Sick Leave Balance";

    const balRow = (db.attendance_leave || []).find(r => {
      if (r.emp !== empName) return false;
      if (r.type === quotaType) return true;
      if (r.dates === "Balance" && r.type && r.type.includes(quotaType.split(" ")[0])) return true;
      return false;
    });

    if (balRow && balRow.balance !== undefined) {
      return Number(balRow.balance);
    }
    if (balRow && balRow.status) {
      const m = String(balRow.status).match(/[\d.]+/);
      if (m) return parseFloat(m[0]);
    }
    if (quotaType === "Casual Leave Balance") return 6.0;
    if (quotaType === "Sick Leave Balance") return 6.0;
    return 12.0;
  }

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
          fetch(`${API_BASE}/api/modules`),
          fetch(`${API_BASE}/api/records`)
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
            if (rec.id) registerKnownId(rec.id);
            if (rec.data?.id) registerKnownId(rec.data.id);
            if (!newDb[rec.module_id]) newDb[rec.module_id] = [];
            // Auto-heal: Ensure both dept and department match on emp_docs records
            if (rec.module_id === "emp_docs" && rec.data) {
              const d = rec.data.dept || rec.data.department;
              if (d) {
                rec.data.dept = d;
                rec.data.department = d;
              }
            }
            newDb[rec.module_id].push(rec.data);
          });

          // Self-healing asset auto-reconciliation:
          // If any employee is Inactive, ensure their assets are marked "Returned (Offboarded)"
          const inactiveEmpNames = new Set(
            (newDb.emp_docs || [])
              .filter(e => e.status && e.status.includes("Inactive"))
              .map(e => e.name?.trim().toLowerCase())
          );
          if (newDb.assets) {
            newDb.assets = newDb.assets.map(a => {
              const custodian = a.emp?.trim().toLowerCase();
              if (custodian && inactiveEmpNames.has(custodian) && (a.status === "Allocated" || (!a.status?.includes("Returned") && !a.status?.includes("Recovered")))) {
                const autoReturned = {
                  ...a,
                  status: "Returned (Offboarded)",
                  returnReason: "Employee Offboarding",
                  returnedDate: a.returnedDate || getLocalDateStr()
                };
                fetch(`${API_BASE}/api/records`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: a.id, module_id: "assets", data: autoReturned })
                }).catch(() => { });
                return autoReturned;
              }
              return a;
            });
          }

          // Auto-reconcile and populate dailyRate for all employees based on DESIGNATION_RATES
          if (newDb.emp_docs) {
            newDb.emp_docs = newDb.emp_docs.map(e => {
              const expectedRate = DESIGNATION_RATES[e.designation] || 1000;
              if (e.dailyRate === undefined || e.dailyRate === null || e.dailyRate === "") {
                const updatedEmp = { ...e, dailyRate: expectedRate };
                fetch(`${API_BASE}/api/records`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: e.id, module_id: "emp_docs", data: updatedEmp })
                }).catch(() => { });
                return updatedEmp;
              }
              return e;
            });
          }

          // Budget control rows are the accountant's opening balance. If the
          // database has never been seeded, lay them down and persist once so
          // every later action has an envelope to draw from.
          if (!newDb.budget || newDb.budget.length === 0) {
            newDb.budget = seedBudgetRows();
            newDb.budget.forEach(row => {
              fetch(`${API_BASE}/api/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: row.id, module_id: "budget", data: row })
              }).catch(() => { });
            });
          } else {
            // Self-heal: a department added to the plan after seeding still needs a row.
            const known = new Set(newDb.budget.map(b => b.dept));
            seedBudgetRows().forEach(row => {
              if (!known.has(row.dept)) {
                newDb.budget.push(row);
                fetch(`${API_BASE}/api/records`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: row.id, module_id: "budget", data: row })
                }).catch(() => { });
              }
            });
          }

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

  function checkNetworkOrWarn() {
    if (!networkOn) {
      pushLog("WARN", "system", "Network down — approvals and database operations offline.");
      setHlAlert(true);
      setTimeout(() => setHlAlert(false), 1200);
      return false;
    }
    return true;
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
        fetch(`${API_BASE}/api/records`, {
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
      await sleep(steps.length > 25 ? 120 : (steps.length > 10 ? 250 : 620));
    }
    await sleep(500);
    setHlNodes(new Set());
    setHlEdges(new Set());
    setHlAlert(false);
    setRunning(false);
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // Opens the Add Employee form
  function actionAddEmployee(prefillVacancyId = null) {
    setEmpFormName("");
    setHireMode("new");
    setRehireEmpId("");
    setSelectedVacancyId(openVacancies[0]?.id || "");
    const availableDept = DEPT_POOL.find(d => {
      const b = budgetByDept[d];
      return b && b.headcount < b.sanctioned;
    }) || DEPT_POOL[0];
    setEmpFormDept(availableDept);
    setEmpFormDesig(DESIG_POOL[0]);
    setOnboardStep(1);
    setOnboardLeaves({ annual: 12, casual: 6, sick: 6 });
    setOnboardLaptop(true);
    setOnboardTraining(true);
    setOnboardBiometric(true);
    setOnboardStatutory(true);
    setShowEmpForm(true);
  }

  function confirmAddEmployee() {
    if (!empFormName.trim() || running) return;
    const today = getLocalDateStr();
    const name = empFormName.trim();
    const targetAlumni = hireMode === "rehire" ? (db.emp_docs || []).find(e => e.id === rehireEmpId) : null;
    if (hireMode === "new") {
      const duplicateEmp = (db.emp_docs || []).find(e => e.name.toLowerCase() === name.toLowerCase());
      if (duplicateEmp) {
        if (duplicateEmp.status?.includes("Inactive")) {
          pushLog("WARN", "emp_docs", `Cannot add as new employee: An alumni record for "${name}" already exists (${duplicateEmp.id}). Switch to the "Rehire Alumni" tab to bring them back!`);
        } else {
          pushLog("WARN", "emp_docs", `Cannot add employee: An active employee named "${name}" already exists (${duplicateEmp.id}). Please use a distinct name.`);
        }
        setShowEmpForm(false);
        return;
      }
    }
    const dept = empFormDept;
    const designation = empFormDesig;

    // Rule: One Director per department maximum
    if (designation.toLowerCase().includes("director")) {
      const existingDirector = (db.emp_docs || []).find(e =>
        (e.department === dept || e.dept === dept) &&
        !e.status?.includes("Inactive") &&
        e.id !== targetAlumni?.id &&
        (e.designation || e.desig || "").toLowerCase().includes("director")
      );
      if (existingDirector) {
        pushLog("WARN", "emp_docs", `Cannot hire as Director. ${dept} already has an active Director (${existingDirector.name}). A department can only have one Director.`);
        setShowEmpForm(false);
        return;
      }
    }

    /* ── Finance gate ──────────────────────────────────────────────────────
       No one joins this company until the accountant's model says the seat is
       both sanctioned and funded. This is the control the whole twin hangs on. */
    const gate = evaluateHire(dept, designation);
    if (!gate.allowed) {
      gate.reasons.forEach(r => pushLog("WARN", "budget", `🚫 Hire blocked by Finance — ${r}`));
      pushLog("SELECT", "budget", `💡 Options: raise the sanctioned strength / envelope from the Finance Control Tower, fill the seat through internal succession, or pick a lower grade for this role.`);
      setShowEmpForm(false);
      return;
    }
    (gate.warnings || []).forEach(w => pushLog("WARN", "budget", `⚠️ Finance advisory — ${w}`));

    const dailyRate = DESIGNATION_RATES[designation] || 1000;
    const newEmpId = targetAlumni ? targetAlumni.id : nextId("EMP");
    const empRow = targetAlumni ? {
      ...targetAlumni,
      name,
      designation,
      dept,
      department: dept,
      status: "Active",
      dailyRate,
      rejoinedDate: today,
      lastGradeChange: today,
      exit_date: null,
      exitReason: null,
      onboardingCost: Math.round(gate.onboarding.total * 0.4),
    } : {
      id: newEmpId, name, designation, dept, department: dept,
      status: "Active", joined: today, dailyRate,
      lastGradeChange: today,
      onboardingCost: gate.onboarding.total,
    };

    // If this hire backfills an open vacancy, close it and realise the gap loss.
    const matchingVacancy = hireMode === "vacancy"
      ? (openVacancies.find(v => v.id === selectedVacancyId) || openVacancies.find(v => v.dept === dept && v.grade === designation))
      : openVacancies.find(v => v.dept === dept && v.grade === designation);

    const onboardingLedger = ledgerRow({
      dept, category: "Onboarding", subCategory: "New Hire Acquisition", emp: name,
      amount: gate.onboarding.total,
      note: gate.onboarding.heads.map(h => `${h.label} ${fmtINR(h.amount)}`).join(" · "),
    });
    const budgetUpdate = chargeBudget(dept, gate.onboarding.total);
    const attRow = { id: nextId("ATT"), emp: name, date: today, type: "Attendance", status: "— (Ledger Initialized)" };

    // User configured leave quotas
    const annualDays = Math.max(0, Number(onboardLeaves.annual) || 0);
    const casualDays = Math.max(0, Number(onboardLeaves.casual) || 0);
    const sickDays = Math.max(0, Number(onboardLeaves.sick) || 0);

    const alRow = { id: nextId("LV"), emp: name, type: "Annual Leave Balance", dates: "Balance", balance: annualDays, status: `${annualDays}.0 days credited` };
    const clRow = { id: nextId("LV"), emp: name, type: "Casual Leave Balance", dates: "Balance", balance: casualDays, status: `${casualDays}.0 days credited` };
    const slRow = { id: nextId("LV"), emp: name, type: "Sick Leave Balance", dates: "Balance", balance: sickDays, status: `${sickDays}.0 days credited` };

    // Laptop hardware allocation
    const isTechDept = ["Engineering", "Product"].includes(dept);
    const laptopModel = isTechDept ? 'MacBook Pro 16" (M3)' : "Dell Latitude 7440";
    const assetCode = `AST-${Math.floor(Math.random() * 9000 + 1000)}`;
    const assetRow = onboardLaptop ? {
      id: nextId("ASST"),
      emp: name,
      asset: "Laptop",
      code: assetCode,
      status: "Allocated",
      department: dept
    } : null;

    setShowEmpForm(false);

    // Trigger visual flowchart onboarding simulation
    setChartAnim({
      active: true,
      type: "ADD",
      empId: newEmpId,
      empName: name,
      empDesig: designation,
      dept: dept,
      stage: 1,
      message: `🏢 Enterprise HQ: Provisioning headcount position in ${dept}...`
    });

    setTimeout(() => {
      setChartAnim(prev => ({
        ...prev,
        stage: 2,
        message: `👔 ${dept} Manager acknowledged: Workstation & checklist items allocated`
      }));
    }, 700);

    setTimeout(() => {
      setChartAnim(prev => ({
        ...prev,
        stage: 3,
        message: `✨ ${name} (${designation}) successfully onboarded to ${dept}!`
      }));
    }, 1500);

    setTimeout(() => {
      setChartAnim({ active: false, type: null, empId: "", empName: "", empDesig: "", dept: "", stage: 0, message: "" });
    }, 4500);

    execute([
      {
        node: "emp_docs",
        op: targetAlumni ? "UPDATE" : "INSERT",
        text: targetAlumni
          ? `🔄 Boomerang Rehire Approved: ${name} (${designation}) restored from Inactive to Active in ${dept}`
          : `Creating employee master record — ${name} (${designation})`,
        row: empRow
      },
      { node: "attendance_leave", op: "INSERT", edge: ["attendance_leave", "emp_docs"], text: `Auto-initializing attendance ledger for ${name}`, row: attRow },
      { node: "attendance_leave", op: "INSERT", edge: ["attendance_leave", "emp_docs"], text: `Allocating 3-tier leave quota for ${name} — ${annualDays}d Annual, ${casualDays}d Casual, ${sickDays}d Sick credited`, row: alRow },
      { node: "attendance_leave", op: "INSERT", text: `Crediting ${casualDays}.0 days Casual Leave quota for ${name}`, row: clRow },
      { node: "attendance_leave", op: "INSERT", text: `Crediting ${sickDays}.0 days Sick Leave quota for ${name}`, row: slRow },
      ...(assetRow ? [{
        node: "assets", op: "INSERT", edge: ["assets", "emp_docs"],
        text: `💻 Provisioned IT Workstation: ${laptopModel} (${assetCode}) for ${name} (${dept})`,
        row: assetRow,
      }] : []),
      ...(onboardTraining ? [{
        node: "emp_docs", op: "SELECT", edge: ["emp_docs", "attendance_leave"],
        text: `🎓 Enrolled ${name} into Mandatory Compliance Induction (POSH & Ethics Track)`,
      }] : []),
      ...(onboardBiometric ? [{
        node: "attendance_leave", op: "SELECT", edge: ["attendance_leave", "emp_docs"],
        text: `👆 Registered Biometric IoT punch sensor profile for ${name}`,
      }] : []),
      ...(onboardStatutory ? [{
        node: "payroll", op: "SELECT", edge: ["payroll", "emp_docs"],
        text: `💳 Initialized Statutory Payroll ledger (PF 12% + Standard TDS) for ${name}`,
      }] : []),
      {
        node: "finance_ledger", op: "INSERT", edge: ["finance_ledger", "budget"], alert: true,
        text: `💸 Onboarding cost booked — ${fmtINR(gate.onboarding.total)} for ${name}: ${gate.onboarding.heads.map(h => `${h.label} ${fmtINR(h.amount)}`).join(", ")}.`,
        row: onboardingLedger,
      },
      ...(budgetUpdate ? [{
        node: "budget", op: "UPDATE",
        text: `🏦 ${dept} budget drawn down. Envelope ${fmtINR(gate.budget?.annualBudget || 0)} · committed run-rate ${fmtINR((gate.budget?.totalCommitted || 0) + gate.roi.cost.total)} · uncommitted ${fmtINR((gate.budget?.available || 0) - gate.firstYearDraw)}. Headcount ${(gate.budget?.headcount || 0) + 1}/${gate.budget?.sanctioned || 0} sanctioned.`,
        row: budgetUpdate,
      }] : []),
      {
        node: "finance_ledger", op: "SELECT", edge: ["finance_ledger", "emp_docs"],
        text: `📊 P&L verdict for ${name} (${designation}) — annual cost ${fmtINR(gate.roi.cost.total)} (salary ${fmtINR(gate.roi.cost.baseSalary)} + statutory ${fmtINR(gate.roi.cost.statutory)} + overhead ${fmtINR(gate.roi.cost.overhead)}) vs modelled output ${fmtINR(gate.roi.annualValue)}. Steady-state margin ${fmtINR(gate.roi.steadyMargin)}/yr → ${gate.roi.verdict.toUpperCase()}. Year one nets ${fmtINR(gate.roi.year1Net)} after onboarding and ${gate.roi.rampUpLoss > 0 ? `${fmtINR(gate.roi.rampUpLoss)} ramp-up drag` : "no ramp-up drag"}; breaks even in ~${gate.roi.breakEvenMonths ?? "—"} months.`,
      },
      ...(matchingVacancy ? [{
        node: "attrition", op: "UPDATE", edge: ["attrition", "emp_docs"],
        text: `✅ Vacancy ${matchingVacancy.id} closed by external hire after ${matchingVacancy.daysOpen} day(s) open. Realised output loss during the gap: ${fmtINR(matchingVacancy.cumulativeLoss)}.`,
        row: { id: matchingVacancy.id, status: "Filled (External)", filledOn: today, filledBy: name, fillMode: "External Hire", realisedLoss: matchingVacancy.cumulativeLoss },
      }] : []),
    ]);
  }

  // ── Mark Attendance ────────────────────────────────────────────────────────
  function actionMarkAttendance() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "attendance_leave", "No active employees to mark attendance for."); return; }
    setModal({ type: "attendance", empId: activeEmps[0].id, status: "Punch IN", date: getLocalDateStr() });
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

    // Rule: Block Punch IN / Punch OUT if employee is on Approved Leave on this date
    const punchDate = modal.date;
    const onApprovedLeave = (db.attendance_leave || []).find(r => {
      if (r.emp !== emp.name || r.status !== "Approved") return false;
      if (r.startDate && r.endDate) {
        return punchDate >= r.startDate && punchDate <= r.endDate;
      }
      if (r.dates) {
        if (r.dates.includes(" to ")) {
          const [s, e] = r.dates.split(" to ");
          return punchDate >= s.trim() && punchDate <= e.trim();
        }
        return r.dates.trim() === punchDate;
      }
      return false;
    });

    if (onApprovedLeave) {
      if (onApprovedLeave.type && onApprovedLeave.type.includes("On-Duty")) {
        const dest = onApprovedLeave.purpose || "Official Travel";
        if (onApprovedLeave.isHalfDay || Number(onApprovedLeave.days) === 0.5) {
          const session = onApprovedLeave.session || "Half-Day Session";
          pushLog("INFO", "attendance_leave", `Biometric Client Visit Notice: ${emp.name} is on Half-Day Client Visit (${dest} - ${session}). Physical biometric punch allowed for in-office session.`);
        } else {
          pushLog("INFO", "attendance_leave", `Biometric Exemption: ${emp.name} is on approved Full-Day On-Duty Travel (${dest}). Physical biometric punch waived for official duty.`);
          setModal(null);
          return;
        }
      } else if (onApprovedLeave.isHalfDay || Number(onApprovedLeave.days) === 0.5) {
        const session = onApprovedLeave.session || "Half Day";
        pushLog("WARN", "attendance_leave", `Biometric Notice: ${emp.name} has an approved Half-Day Leave (${session}) on ${punchDate}. Active shift punch logged.`);
      } else {
        pushLog("ERROR", "attendance_leave", `Biometric Punch Blocked: ${emp.name} is on official ${onApprovedLeave.type} (${onApprovedLeave.dates}). Attendance punches are strictly prohibited during full-day approved leave.`);
        setHlAlert(true);
        setHlNodes(new Set(["attendance_leave"]));
        setTimeout(() => { setHlAlert(false); setHlNodes(new Set()); }, 1600);
        setModal(null);
        return;
      }
    }

    // Rule 2: Block any biometric punch if attendance on this date is already recorded / regularized by HR (Present / Full Day)
    const existingFullDay = (db.attendance_leave || []).find(r =>
      r.emp === emp.name &&
      r.date === modal.date &&
      r.type === "Attendance" &&
      (r.status === "Present" || r.status === "Work From Home")
    );
    if (existingFullDay) {
      pushLog("ERROR", "attendance_leave", `Punch ${modal.status} rejected for ${emp.name}: Attendance on ${modal.date} is already completed / regularized by HR (${existingFullDay.status} · ${existingFullDay.time_logged || "Full Day"}).`);
      setHlAlert(true);
      setHlNodes(new Set(["attendance_leave"]));
      setTimeout(() => { setHlAlert(false); setHlNodes(new Set()); }, 1600);
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

      const alreadyPunchedOut = db.attendance_leave.some(r => r.emp === emp.name && r.date === modal.date && r.status === "Punch OUT");
      if (alreadyPunchedOut) {
        pushLog("ERROR", "attendance_leave", `Punch IN rejected for ${emp.name}: Shift already completed (Punched OUT) on ${modal.date}.`);
        setModal(null);
        return;
      }
    }

    if (modal.status === "Punch OUT") {
      const alreadyPunchedOut = db.attendance_leave.some(r => r.emp === emp.name && r.date === modal.date && r.status === "Punch OUT");
      if (alreadyPunchedOut) {
        pushLog("ERROR", "attendance_leave", `Punch OUT rejected for ${emp.name}: Already punched OUT on ${modal.date}.`);
        setModal(null);
        return;
      }

      const hasPunchIn = db.attendance_leave.some(r => r.emp === emp.name && r.date === modal.date && r.status === "Punch IN");
      if (!hasPunchIn) {
        pushLog("ERROR", "attendance_leave", `Punch OUT rejected for ${emp.name}: No prior Punch IN found on ${modal.date}.`);
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
    setIsHalfDay(false);
    setHalfDaySession("First Half (Morning)");
    setOdPurpose("Client Site Visit");
    setCompOffWorkedDate("2026-09-13 (Sunday Deployment)");
    setMedicalCertDate("EDD: Oct 2026 / Medical Cert #MC-9021");
    setLeaveStep(1);
    setShowLeave(true);
  }

  function confirmApplyLeave() {
    if (!leaveEmpId || running) return;
    const emp = db.emp_docs.find((e) => e.id === leaveEmpId);
    if (!emp) return;

    const isOnDuty = leaveType.includes("On-Duty");
    const isSpecialFullDayPolicy = leaveType === "Maternity Leave" || leaveType === "Paternity Leave";
    if (isSpecialFullDayPolicy && isHalfDay) {
      pushLog("WARN", "attendance_leave", `${leaveType} cannot be applied as a half-day. Requests must be filed in full-day increments.`);
      setShowLeave(false);
      return;
    }
    const actualDays = isHalfDay ? 0.5 : Number(leaveDays);
    const quotaTracked = ["Annual Leave", "Casual Leave", "Sick Leave"].includes(leaveType);
    const availableBal = quotaTracked ? getLeaveBalance(emp.name, leaveType) : 999;

    if (quotaTracked && actualDays > availableBal) {
      pushLog("WARN", "attendance_leave", `Leave rejected for ${emp.name}: Requested ${actualDays} day(s), but available ${leaveType} balance is only ${availableBal.toFixed(1)} day(s).`);
      setShowLeave(false);
      return;
    }

    // Special Policy Rules & Max Days Validation
    if (leaveType === "Paternity Leave" && actualDays > 10) {
      pushLog("WARN", "attendance_leave", `Paternity Leave rejected for ${emp.name}: Maximum corporate entitlement is 10 days (requested ${actualDays} days).`);
      setShowLeave(false);
      return;
    }
    if (leaveType === "Maternity Leave" && actualDays > 84) {
      pushLog("WARN", "attendance_leave", `Maternity Leave rejected for ${emp.name}: Standard statutory allocation is 84 days max per cycle (requested ${actualDays} days).`);
      setShowLeave(false);
      return;
    }
    if (leaveType === "Comp Off" && actualDays > 2) {
      pushLog("WARN", "attendance_leave", `Comp Off rejected for ${emp.name}: Maximum 2 consecutive Comp Off days can be redeemed at a time (requested ${actualDays} days).`);
      setShowLeave(false);
      return;
    }

    const start = new Date(leaveStartDate);
    const end = new Date(start);
    if (!isHalfDay) {
      end.setDate(end.getDate() + Number(leaveDays) - 1);
    }
    const fmt = (d) => getLocalDateStr(d);
    const newStartStr = fmt(start);
    const newEndStr = fmt(end);

    // Rule: Check if requested dates overlap with existing approved or pending leaves
    const overlappingLeave = (db.attendance_leave || []).find(r => {
      if (r.emp !== emp.name || (r.status !== "Approved" && r.status !== "Pending Approval")) return false;
      let existingStart = r.startDate;
      let existingEnd = r.endDate;
      if (!existingStart && r.dates) {
        if (r.dates.includes(" to ")) {
          const [s, e] = r.dates.split(" to ");
          existingStart = s.trim();
          existingEnd = e.trim();
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(r.dates.trim())) {
          existingStart = r.dates.trim();
          existingEnd = r.dates.trim();
        }
      }
      if (existingStart && existingEnd) {
        return newStartStr <= existingEnd && existingStart <= newEndStr;
      }
      return false;
    });

    if (overlappingLeave) {
      pushLog("WARN", "attendance_leave", `Leave request rejected for ${emp.name}: Dates (${newStartStr} to ${newEndStr}) overlap with an existing ${overlappingLeave.type} (${overlappingLeave.dates} - ${overlappingLeave.status}).`);
      setShowLeave(false);
      return;
    }

    const dates = isHalfDay ? `${fmt(start)} (${halfDaySession})` : (Number(leaveDays) === 1 ? fmt(start) : `${fmt(start)} to ${fmt(end)}`);
    const row = {
      id: nextId("LV"),
      emp: emp.name,
      type: leaveType,
      days: actualDays,
      dates,
      startDate: fmt(start),
      endDate: fmt(end),
      purpose: isOnDuty ? (odPurpose.trim() || "Client Site Visit") : null,
      compOffWorkedDate: leaveType === "Comp Off" ? (compOffWorkedDate.trim() || "Weekend/Holiday Shift") : null,
      medicalCertDate: leaveType === "Maternity Leave" ? (medicalCertDate.trim() || "Medical Certificate Verified") : null,
      isHalfDay,
      session: isHalfDay ? halfDaySession : null,
      status: "Pending Approval"
    };

    setShowLeave(false);
    const logPrefix = isOnDuty ? `Filing On-Duty ${isHalfDay ? `Half-Day Client Visit (${actualDays}d)` : `Travel Request (${actualDays}d)`} for ${emp.name} — ${odPurpose || "Client Visit"}` : `Filing ${leaveType} (${actualDays} day${actualDays !== 1 ? "s" : ""}) for ${emp.name}`;
    execute([
      { node: "emp_docs", op: "SELECT", text: `Checking employment status for ${emp.name}` },
      { node: "attendance_leave", op: "INSERT", edge: ["attendance_leave", "emp_docs"], text: logPrefix, row },
      { node: "attendance_leave", op: "SELECT", text: `🔔 Notification sent to HR: ${isOnDuty ? (isHalfDay ? "Half-Day Client Visit" : "On-Duty Travel") : "Leave"} request (${actualDays}d) from ${emp.name} is pending approval.` }
    ]);
  }

  // ── HR Approvals & Balance Deduction Logic ─────────────────────────────────
  function handleApproveLeave(req) {
    if (running || !checkNetworkOrWarn()) return;
    const emp = db.emp_docs.find(e => e.name === req.emp);

    const isOnDuty = req.type && req.type.includes("On-Duty");
    const reqDays = Number(req.days) || (req.isHalfDay ? 0.5 : 1);
    const updatedReq = { ...req, status: "Approved" };

    if (isOnDuty) {
      // Auto-credit Travel / Per Diem Allowance (Rs. 1,000 / day, Rs. 500 for Half-Day)
      const travelAllowanceAmt = Math.round(reqDays * 1000);
      const fmt = (n) => Number(n).toLocaleString("en-IN");
      const allowanceRow = {
        id: nextId("CMP"),
        emp: req.emp,
        type: "Allowance",
        subType: req.isHalfDay || reqDays === 0.5 ? "Travel / Client Visit (Half-Day)" : "Travel / Per Diem Allowance",
        amount: `Rs.${fmt(travelAllowanceAmt)}`,
        amountNum: travelAllowanceAmt,
        period: "Current Cycle",
        reason: `On-Duty Trip: ${req.purpose || "Client Visit"} (${req.dates})`,
        status: "Approved",
        bonusDisbursed: false
      };

      execute([
        { node: "emp_docs", op: "SELECT", text: `Verifying employment status for ${req.emp}` },
        { node: "attendance_leave", op: "UPDATE", edge: ["attendance_leave", "emp_docs"], text: `✈️ On-Duty Travel Approved: ${reqDays} day(s) for ${req.emp} (0 leaves deducted, 100% paid attendance)`, row: updatedReq },
        { node: "comp_incentives", op: "INSERT", edge: ["comp_incentives", "emp_docs"], text: `💰 Travel Allowance Credited: Rs.${fmt(travelAllowanceAmt)} for ${req.emp} (${reqDays === 0.5 ? "Rs.500 prorated for Half-Day" : "Rs.1,000/day"})`, row: allowanceRow },
        { node: "attendance_leave", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Your On-Duty Travel (${reqDays}d) is approved with Rs.${fmt(travelAllowanceAmt)} Travel Allowance!` }
      ]);
      return;
    }

    // Special Policies: Maternity, Paternity, Comp Off (0 quota deducted from Annual/Casual/Sick)
    if (req.type && (req.type.includes("Maternity") || req.type.includes("Paternity") || req.type.includes("Comp Off"))) {
      let icon = "👶";
      let title = "Maternity Benefit";
      if (req.type.includes("Paternity")) { icon = "🍼"; title = "Paternity Leave"; }
      else if (req.type.includes("Comp Off")) { icon = "🔄"; title = "Compensatory Off"; }

      execute([
        { node: "emp_docs", op: "SELECT", text: `Verifying statutory & corporate policy eligibility for ${req.emp}` },
        { node: "attendance_leave", op: "UPDATE", edge: ["attendance_leave", "emp_docs"], text: `✅ ${icon} ${title} Approved: ${reqDays} day(s) for ${req.emp} (100% paid, 0 Annual/Casual quota deducted)`, row: updatedReq },
        { node: "attendance_leave", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Your ${req.type} (${reqDays}d) has been approved as 100% paid leave!` }
      ]);
      return;
    }

    let quotaType = "Annual Leave Balance";
    if (req.type && req.type.includes("Casual")) quotaType = "Casual Leave Balance";
    else if (req.type && req.type.includes("Sick")) quotaType = "Sick Leave Balance";

    const balRow = (db.attendance_leave || []).find(r => {
      if (r.emp !== req.emp) return false;
      if (r.type === quotaType) return true;
      if (r.dates === "Balance" && r.type && r.type.includes(quotaType.split(" ")[0])) return true;
      return false;
    });

    const curBal = getLeaveBalance(req.emp, req.type);
    const newBal = Math.max(0, parseFloat((curBal - reqDays).toFixed(1)));

    const updatedBalRow = balRow
      ? { ...balRow, balance: newBal, status: `${newBal.toFixed(1)} days remaining` }
      : { id: nextId("LV"), emp: req.emp, type: quotaType, dates: "Balance", balance: newBal, status: `${newBal.toFixed(1)} days remaining` };

    execute([
      { node: "emp_docs", op: "SELECT", text: `Verifying ${req.type} entitlement for ${req.emp}` },
      { node: "attendance_leave", op: "UPDATE", edge: ["attendance_leave", "emp_docs"], text: `✅ Leave Approved: ${reqDays} day(s) ${req.type} for ${req.emp}`, row: updatedReq },
      { node: "attendance_leave", op: balRow ? "UPDATE" : "INSERT", text: `📉 ${quotaType} Decremented for ${req.emp}: ${curBal.toFixed(1)} → ${newBal.toFixed(1)} days remaining`, row: updatedBalRow },
      { node: "attendance_leave", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Your ${req.type} (${reqDays} day${reqDays !== 1 ? "s" : ""}) has been approved!` }
    ]);
  }

  function handleRejectLeave(req) {
    if (running || !checkNetworkOrWarn()) return;
    const isOnDuty = req.type && req.type.includes("On-Duty");
    const updatedReq = { ...req, status: "Rejected by HR" };
    execute([
      { node: "attendance_leave", op: "UPDATE", text: `❌ ${isOnDuty ? "On-Duty Request" : "Leave"} Rejected: ${req.type} for ${req.emp} was rejected by HR`, row: updatedReq },
      { node: "attendance_leave", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Your ${isOnDuty ? "On-Duty travel" : "leave"} application was rejected.` }
    ]);
  }

  // ── Approved Leave Cancellation & Quota Refund Logic (Item 2.2) ─────────────
  function handleCancelApprovedLeave(req) {
    if (running || !checkNetworkOrWarn()) return;
    const isOnDuty = req.type && req.type.includes("On-Duty");
    const isMaternity = req.type && req.type.includes("Maternity");
    const isPaternity = req.type && req.type.includes("Paternity");
    const isCompOff = req.type && req.type.includes("Comp Off");
    const isSpecial = isOnDuty || isMaternity || isPaternity || isCompOff;
    const reqDays = Number(req.days) || (req.isHalfDay ? 0.5 : 1);

    const updatedReq = {
      ...req,
      status: "Cancelled by HR (Quota Restored)",
      cancelledDate: getLocalDateStr()
    };

    const steps = [
      { node: "emp_docs", op: "SELECT", text: `Verifying leave record #${req.id} for cancellation — ${req.emp}` },
      { node: "attendance_leave", op: "UPDATE", text: `↩️ Leave Cancelled: ${req.type} (${req.dates || `${reqDays}d`}) cancelled by HR for ${req.emp}`, row: updatedReq }
    ];

    if (isOnDuty) {
      // Void travel allowance in comp_incentives
      const travelAllowance = (db.comp_incentives || []).find(sa =>
        sa.emp === req.emp && sa.status === "Approved" && (sa.reason?.includes(req.dates) || sa.subType?.includes("Travel") || sa.type?.includes("Travel"))
      );
      if (travelAllowance) {
        steps.push({
          node: "comp_incentives",
          op: "UPDATE",
          edge: ["comp_incentives", "attendance_leave"],
          text: `🚫 Travel Allowance Voided: ${travelAllowance.amount || "Rs.1,000"} cancelled for ${req.emp} due to trip cancellation`,
          row: { ...travelAllowance, status: "Voided (Trip Cancelled)" },
          alert: true
        });
      }
    } else if (!isSpecial) {
      // Refund quota to balance row
      let quotaType = "Annual Leave Balance";
      if (req.type && req.type.includes("Casual")) quotaType = "Casual Leave Balance";
      else if (req.type && req.type.includes("Sick")) quotaType = "Sick Leave Balance";

      const balRow = (db.attendance_leave || []).find(r => {
        if (r.emp !== req.emp) return false;
        if (r.type === quotaType) return true;
        if (r.dates === "Balance" && r.type && r.type.includes(quotaType.split(" ")[0])) return true;
        return false;
      });

      const curBal = getLeaveBalance(req.emp, req.type);
      const newBal = parseFloat((curBal + reqDays).toFixed(1));
      const updatedBalRow = balRow
        ? { ...balRow, balance: newBal, status: `${newBal.toFixed(1)} days remaining` }
        : { id: nextId("LV"), emp: req.emp, type: quotaType, dates: "Balance", balance: newBal, status: `${newBal.toFixed(1)} days remaining` };

      steps.push({
        node: "attendance_leave",
        op: balRow ? "UPDATE" : "INSERT",
        text: `📈 ${quotaType} Restored for ${req.emp}: ${curBal.toFixed(1)} → ${newBal.toFixed(1)} days remaining (+${reqDays}d refunded)`,
        row: updatedBalRow
      });
    }

    steps.push({
      node: "attendance_leave",
      op: "SELECT",
      text: `🔔 Notification sent to ${req.emp}: Approved ${req.type} (${reqDays}d) was cancelled by HR and quota has been refunded.`
    });

    execute(steps);
  }

  function handleApproveLoan(req) {
    if (running || !checkNetworkOrWarn()) return;
    const principal = Number(String(req.amount || "0").replace(/[^\d]/g, '')) || 0;
    const tenureYears = parseInt(req.tenure, 10) || 1;
    const updatedReq = {
      ...req,
      status: "Active (Disbursed)",
      remainingBalance: req.remainingBalance !== undefined ? req.remainingBalance : principal,
      monthsRemaining: req.monthsRemaining !== undefined ? req.monthsRemaining : (tenureYears * 12)
    };
    execute([
      { node: "emp_docs", op: "SELECT", text: `Verifying employment & credit eligibility for ${req.emp}` },
      { node: "loans", op: "UPDATE", edge: ["loans", "emp_docs"], text: `✅ Loan Approved & Disbursed: ${req.type} (${req.amount}) to ${req.emp} | EMI: ${req.emi} (${tenureYears * 12} mo amortization)`, row: updatedReq },
      { node: "loans", op: "SELECT", text: `💰 Finance Notification: ${req.amount} disbursed to ${req.emp}. Scheduled for monthly payroll EMI deduction.` }
    ]);
  }

  function handleRejectLoan(req) {
    if (running || !checkNetworkOrWarn()) return;
    const updatedReq = { ...req, status: "Rejected by HR" };
    execute([
      { node: "loans", op: "UPDATE", text: `❌ Loan Rejected: ${req.type} (${req.amount}) for ${req.emp} was rejected by HR`, row: updatedReq },
      { node: "loans", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Your loan application was rejected.` }
    ]);
  }

  // ── HR Approvals for ESS Requests ──────────────────────────────────────────
  function handleApproveClaim(req) {
    if (running || !checkNetworkOrWarn()) return;
    const amt = Number(req.claimAmount) || 1200;
    const fmt = (n) => Number(n).toLocaleString("en-IN");
    const updatedReq = { ...req, status: "Approved" };

    const allowanceRow = {
      id: nextId("CMP"),
      emp: req.emp,
      type: "Reimbursement",
      subType: req.claimCategory || "Expense Reimbursement",
      amount: `Rs.${fmt(amt)}`,
      amountNum: amt,
      period: "Current Cycle",
      reason: `ESS Reimbursement: ${req.claimCategory || "Expense"} (${req.details || ""})`,
      status: "Approved",
      bonusDisbursed: false
    };

    execute([
      { node: "emp_docs", op: "SELECT", text: `Verifying employment record for ${req.emp}` },
      { node: "comp_incentives", op: "INSERT", edge: ["comp_incentives", "emp_docs"], text: `💰 Reimbursement Approved: Rs.${fmt(amt)} for ${req.emp} added to Compensation & Incentives (Disbursable in Payroll)`, row: allowanceRow },
      { node: "ess", op: "UPDATE", edge: ["ess", "comp_incentives"], text: `ESS Reimbursement Claim Approved: ${req.id} for ${req.emp}`, row: updatedReq },
      { node: "comp_incentives", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Your reimbursement claim of Rs.${fmt(amt)} was approved and credited to Compensation & Incentives for next payroll payout!` }
    ]);
  }

  function handleRejectClaim(req) {
    if (running || !checkNetworkOrWarn()) return;
    const updatedReq = { ...req, status: "Rejected by HR" };
    execute([
      { node: "ess", op: "UPDATE", text: `❌ Reimbursement Claim Rejected: ${req.claimCategory || "Claim"} for ${req.emp} was rejected by HR`, row: updatedReq },
      { node: "ess", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Your reimbursement claim of Rs.${(Number(req.claimAmount) || 0).toLocaleString("en-IN")} was rejected.` }
    ]);
  }

  function handleApproveAttendanceCorrection(req) {
    if (running || !checkNetworkOrWarn()) return;
    const updatedReq = { ...req, status: "Approved" };

    let status = "Punch IN";
    let time = "09:00";
    if (req.corrSession && (req.corrSession.includes("Evening") || req.corrSession.includes("OUT"))) {
      status = "Punch OUT";
      time = "18:00";
    } else if (req.corrSession && req.corrSession.includes("Full Day")) {
      status = "Present";
      time = "09:00 - 18:00";
    }

    const attRow = {
      id: nextId("ATT"),
      emp: req.emp,
      date: req.corrDate || getLocalDateStr(),
      time_logged: time,
      type: "Attendance",
      status,
      mode: "Biometric (HR Regularized)",
      reason: `Regularization Approved: ${req.corrReason || "Biometric Failure"}`
    };

    execute([
      { node: "emp_docs", op: "SELECT", text: `Verifying attendance master for ${req.emp}` },
      { node: "attendance_leave", op: "INSERT", edge: ["attendance_leave", "emp_docs"], text: `⏱️ Attendance Sheet Updated: ${req.emp} marked ${status} on ${attRow.date} (${req.corrReason || "Regularized"})`, row: attRow },
      { node: "ess", op: "UPDATE", edge: ["ess", "attendance_leave"], text: `ESS Attendance Regularization Approved: ${req.id} for ${req.emp}`, row: updatedReq },
      { node: "attendance_leave", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Your attendance punch on ${attRow.date} (${req.corrSession}) has been approved and logged to Attendance.` }
    ]);
  }

  function handleRejectAttendanceCorrection(req) {
    if (running || !checkNetworkOrWarn()) return;
    const updatedReq = { ...req, status: "Rejected by HR" };
    execute([
      { node: "ess", op: "UPDATE", text: `❌ Attendance Regularization Rejected for ${req.emp} (${req.corrDate})`, row: updatedReq },
      { node: "ess", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Your attendance regularization request for ${req.corrDate} was rejected by HR.` }
    ]);
  }

  function handleApproveDocRequest(req) {
    if (running || !checkNetworkOrWarn()) return;
    const updatedReq = { ...req, status: "Approved (Issued)" };
    const docTitle = req.docType || "Official HR Document";
    execute([
      { node: "emp_docs", op: "SELECT", text: `Verifying digital signature key and authorized company seal for ${req.emp}` },
      { node: "ess", op: "UPDATE", edge: ["ess", "emp_docs"], text: `📄 HR Document Issued: "${docTitle}" digitally authorized & sealed for ${req.emp}`, row: updatedReq },
      { node: "emp_docs", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Your requested "${docTitle}" has been approved and officially issued with company seal!` }
    ]);
  }

  function handleRejectDocRequest(req) {
    if (running || !checkNetworkOrWarn()) return;
    const updatedReq = { ...req, status: "Rejected by HR" };
    execute([
      { node: "ess", op: "UPDATE", text: `❌ HR Document Request Rejected: "${req.docType || "Document"}" for ${req.emp}`, row: updatedReq },
      { node: "emp_docs", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Your request for "${req.docType || "Document"}" was rejected by HR.` }
    ]);
  }

  function handleApproveProfileUpdate(req) {
    if (running || !checkNetworkOrWarn()) return;
    const emp = db.emp_docs.find(e => e.name === req.emp);
    const updatedReq = { ...req, status: "Approved" };

    const fieldMap = {
      "Residential Address": "address",
      "Personal Mobile Number": "phone",
      "Personal Phone": "phone",
      "Emergency Contact": "emergency_contact",
      "Emergency Contact Person": "emergency_contact",
      "Personal Email Address": "personal_email",
      "Personal Email": "personal_email",
      "Bank Account & IFSC": "bank_details",
      "Blood Group": "blood_group"
    };
    const empKey = fieldMap[req.profileField] || "address";
    const updatedEmp = emp ? { ...emp, [empKey]: req.profileValue } : null;

    const steps = [
      { node: "emp_docs", op: "SELECT", text: `Verifying digital KYC & address/identity proof for ${req.emp}` },
      ...(updatedEmp ? [{ node: "emp_docs", op: "UPDATE", edge: ["ess", "emp_docs"], text: `👤 Master Profile Updated: ${req.profileField} updated for ${req.emp}`, row: updatedEmp }] : []),
      { node: "ess", op: "UPDATE", text: `ESS Profile Modification Approved: ${req.id} for ${req.emp}`, row: updatedReq },
      { node: "emp_docs", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Your profile modification (${req.profileField}) has been verified and updated in Employee Master!` }
    ];

    execute(steps);
  }

  function handleRejectProfileUpdate(req) {
    if (running || !checkNetworkOrWarn()) return;
    const updatedReq = { ...req, status: "Rejected by HR" };
    execute([
      { node: "ess", op: "UPDATE", text: `❌ Profile Update Rejected: ${req.profileField} for ${req.emp} was rejected by HR`, row: updatedReq },
      { node: "emp_docs", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Your profile modification request for ${req.profileField} was rejected by HR.` }
    ]);
  }

  function handleResolveTicket(req) {
    if (running || !checkNetworkOrWarn()) return;
    const updatedReq = { ...req, status: "Resolved & Closed" };
    const targetNode = (req.ticketCategory?.includes("IT") || req.ticketCategory?.includes("Hardware") || req.ticketCategory?.includes("Laptop") || req.ticketCategory?.includes("Equipment")) ? "assets" : (req.ticketCategory?.includes("Payroll") || req.ticketCategory?.includes("Salary") ? "payroll" : "emp_docs");
    execute([
      { node: targetNode, op: "SELECT", text: `Dispatching service resolution & technical diagnostics for Ticket #${req.id}` },
      { node: "ess", op: "UPDATE", edge: ["ess", targetNode], text: `🎫 Helpdesk Ticket Resolved: #${req.id} (${req.ticketSubject || req.ticketCategory || "Issue"}) for ${req.emp}`, row: updatedReq },
      { node: "emp_docs", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Your Helpdesk Ticket #${req.id} (${req.ticketSubject || "Issue"}) has been resolved & closed!` }
    ]);
  }

  function handleEscalateTicket(req) {
    if (running || !checkNetworkOrWarn()) return;
    const updatedReq = { ...req, status: "Escalated to Tier-2 Support" };
    execute([
      { node: "ess", op: "UPDATE", text: `⚠️ Ticket #${req.id} Escalated: Priority raised to Critical Tier-2 for ${req.emp}`, row: updatedReq },
      { node: "emp_docs", op: "SELECT", text: `🔔 Notification sent to ${req.emp}: Ticket #${req.id} has been escalated to Tier-2 Engineering / Facilities Lead.` }
    ]);
  }

  // ── Log Appraisal ──────────────────────────────────────────────────────────
  function actionLogAppraisal() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "performance_cycles", "No active employees to log appraisal for."); return; }
    setModal({ type: "appraisal", empId: activeEmps[0].id, fiscalYear: 2026, quarter: "Q3", cycle: "Q3 FY2026", rating: "Meets Expectations", kpi: 80 });
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

  // ── Manage Assets (Unified Allocation & In-Service Return) ──────────────────
  function actionManageAssets(prefillSubTab = "allocate", prefillAssetId = null) {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "company_assets", "No active employees to manage assets for."); return; }
    const firstEmp = activeEmps[0];
    const allocatedAssets = (db.assets || []).filter(r => r.status === "Allocated");
    const targetAsset = prefillAssetId ? (allocatedAssets.find(a => a.id === prefillAssetId) || allocatedAssets[0]) : allocatedAssets[0];
    const targetEmp = (prefillSubTab === "return" && targetAsset) ? ((db.emp_docs || []).find(e => e.name === targetAsset.emp) || firstEmp) : firstEmp;

    setModal({
      type: "manage_asset",
      subTab: prefillSubTab,
      empId: targetEmp.id,
      assetType: "Laptop",
      assetId: targetAsset ? targetAsset.id : (allocatedAssets[0]?.id || ""),
      reason: "Hardware Refresh / Upgrade"
    });
  }

  // ── Assign Asset ───────────────────────────────────────────────────────────
  function actionAssignAsset() {
    actionManageAssets("allocate");
  }
  function confirmAssignAsset() {
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;

    if (emp.status.includes("Inactive")) {
      pushLog("WARN", "company_assets", `Cannot assign asset: ${emp.name} is Inactive (${emp.status}).`);
      setModal(null);
      return;
    }

    // Rule: Block duplicate asset type for the same employee
    const alreadyHas = (db.assets || []).some(r =>
      r.emp?.trim().toLowerCase() === emp.name?.trim().toLowerCase() &&
      r.asset === modal.assetType &&
      (!r.status?.includes("Returned") && !r.status?.includes("Recovered"))
    );
    if (alreadyHas) {
      pushLog("WARN", "company_assets", `${emp.name} already has an active ${modal.assetType}. Return it before assigning a new one.`);
      setModal(null);
      return;
    }

    const code = `AST-${Math.floor(Math.random() * 9000 + 1000)}`;
    const row = { id: nextId("ASST"), emp: emp.name, asset: modal.assetType, code, status: "Allocated", department: emp.dept };
    setModal(null);
    execute([
      { node: "emp_docs", op: "SELECT", text: `Verifying ${emp.name} for asset allocation` },
      { node: "assets", op: "INSERT", edge: ["assets", "emp_docs"], text: `Assigning ${modal.assetType} (${code}) to ${emp.name} (${emp.dept})`, row },
    ]);
  }

  // ── Return Asset (Item 2.1) ────────────────────────────────────────────────
  function actionReturnAsset(prefillAssetId = null) {
    actionManageAssets("return", prefillAssetId);
  }

  function confirmReturnAsset() {
    if (running || !checkNetworkOrWarn()) return;
    const asset = (db.assets || []).find(a => a.id === modal.assetId);
    if (!asset) {
      pushLog("WARN", "company_assets", "Selected asset could not be found.");
      setModal(null);
      return;
    }
    const returnReason = modal.reason || "Normal Project Return";
    const updatedAsset = {
      ...asset,
      status: `Returned (${returnReason})`,
      returnedDate: getLocalDateStr()
    };
    setModal(null);
    execute([
      { node: "emp_docs", op: "SELECT", text: `Verifying custodian profile for ${asset.emp}` },
      { node: "assets", op: "UPDATE", edge: ["assets", "emp_docs"], text: `📦 Asset Returned: ${asset.asset} (${asset.code || asset.id}) returned by ${asset.emp} [Reason: ${returnReason}]`, row: updatedAsset },
      { node: "assets", op: "SELECT", text: `🔔 Inventory Notification: ${asset.asset} checked back into IT Inventory pool. Hardware slot cleared for ${asset.emp}.` }
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
    const pendingLoan = db.loans.find(r => r.emp === emp.name && (r.status === "Under Review" || r.status.includes("Active")));
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

  // ── Compensation & Incentives Modal & Confirmation ─────────────────────────
  const AWARD_REWARDS = {
    "Star Performer": 5000,
    "Innovation Champion": 3500,
    "Team Player": 2000,
    "Rising Star": 1500,
    "Spot Excellence Award": 1500,
  };

  function actionCompIncentives(initialTab = "award") {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "comp_incentives", "No active employees found."); return; }
    const firstEmp = activeEmps[0];
    const perfRecords = (db.performance || []).filter(r => r.emp === firstEmp.name);
    const latest = perfRecords.length ? perfRecords[perfRecords.length - 1] : null;
    let defCat = "Team Player";
    if (latest?.rating === "Outstanding") defCat = "Star Performer";
    else if (latest?.rating === "Exceeds Expectations") defCat = "Innovation Champion";
    else if (latest?.rating === "Meets Expectations") defCat = "Team Player";

    setModal({
      type: "comp_incentives",
      subTab: initialTab || "award",
      empId: firstEmp.id,
      category: defCat,
      period: "Q3 FY2026",
      cashReward: AWARD_REWARDS[defCat] || 2000,
      allowanceType: "LTA (Leave Travel Allowance)",
      amount: 5000,
      fiscalYear: 2026
    });
  }

  function actionNominateAward() {
    actionCompIncentives("award");
  }

  function confirmNominateAward() {
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;

    // Rule: An employee can only be nominated once per cycle
    const cyclePeriod = modal.period || "Q3 FY2026";
    const alreadyNominated = (db.comp_incentives || []).some(
      a => a.emp === emp.name && a.period === cyclePeriod && (a.type === "Award" || a.category?.includes("Award"))
    );
    if (alreadyNominated) {
      pushLog("WARN", "comp_incentives", `Nomination rejected — ${emp.name} is already nominated for an award in ${cyclePeriod}. Only one nomination per cycle is permitted.`);
      setModal(null);
      return;
    }

    const perfRecords = (db.performance || []).filter(r => r.emp === emp.name);
    const latest = perfRecords.length ? perfRecords[perfRecords.length - 1] : null;
    const rating = latest ? latest.rating : "Direct Spot Nomination";
    const kpi = latest ? latest.kpiScore : "—";
    const rewardAmt = modal.cashReward || AWARD_REWARDS[modal.category] || 2000;
    const fmt = (n) => Number(n).toLocaleString("en-IN");
    const row = {
      id: nextId("CMP"),
      emp: emp.name,
      type: "Award",
      category: modal.category,
      subType: modal.category,
      rating,
      kpi,
      period: modal.period || "Q3 FY2026",
      amount: `Rs.${fmt(rewardAmt)}`,
      reward: `Rs.${fmt(rewardAmt)}`,
      amountNum: rewardAmt,
      status: "Nominated",
      bonusDisbursed: false,
    };
    setModal(null);

    const steps = [
      { node: "emp_docs", op: "SELECT", text: `Loading nominee profile — ${emp.name}` },
    ];
    if (latest) {
      steps.push({
        node: "performance", op: "SELECT", edge: ["comp_incentives", "performance"],
        text: `Appraisal verified for ${emp.name} | Rating: ${rating} | KPI: ${kpi}`
      });
    }
    steps.push({
      node: "comp_incentives", op: "INSERT", edge: ["comp_incentives", "emp_docs"],
      text: `Nominating ${emp.name} for "${modal.category}" | Cash Reward Rs.${fmt(rewardAmt)}`, row
    });
    steps.push({
      node: "comp_incentives", op: "SELECT",
      text: `🎉 Notification sent to ${emp.name}: Nominated for ${modal.category} with Rs.${fmt(rewardAmt)} bonus!`
    });
    execute(steps);
  }

  function getDaysInMonth(year, monthNameOrKey = "Oct") {
    const ALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mStr = String(monthNameOrKey).trim().slice(0, 3);
    const idx = ALL_MONTHS.findIndex(m => m.toLowerCase() === mStr.toLowerCase());
    const mIdx = idx !== -1 ? idx : 9;
    const y = parseInt(year, 10) || 2026;
    return new Date(y, mIdx + 1, 0).getDate();
  }

  function getWorkingDaysInMonthUpToDate(dateStr) {
    if (!dateStr) return { workingDays: 15, weekendDays: 6, totalCalendarDays: 21 };
    const parts = dateStr.split("-");
    const y = parseInt(parts[0], 10) || 2026;
    const m = (parseInt(parts[1], 10) || 9) - 1; // 0-indexed month
    const exitDay = Math.min(31, Math.max(1, parseInt(parts[2], 10) || 21));

    let workingDays = 0;
    let weekendDays = 0;
    for (let day = 1; day <= exitDay; day++) {
      const cur = new Date(y, m, day);
      const dow = cur.getDay(); // 0 = Sunday, 6 = Saturday
      if (dow === 0 || dow === 6) {
        weekendDays++;
      } else {
        workingDays++;
      }
    }
    return { workingDays, weekendDays, totalCalendarDays: exitDay };
  }

  function actionRunPayroll() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "payroll_records", "No active employees to process payroll for."); return; }

    const initialDays = getDaysInMonth(2026, "Oct");
    setModal({
      type: "payroll_cycle",
      month: "Oct 2026",
      selectedYear: 2026,
      mode: "standard",
      standardDays: initialDays
    });
  }

  function confirmRunPayrollCycle() {
    if (!modal || modal.type !== "payroll_cycle") return;
    const targetMonth = modal.month ? modal.month.trim() : "Oct 2026";
    const mode = modal.mode || "standard";
    const targetYear = parseInt(targetMonth.match(/\d{4}/)?.[0] || String(modal.selectedYear || 2026), 10);
    const monthKey = targetMonth.slice(0, 3);
    const monthDays = getDaysInMonth(targetYear, monthKey);
    setModal(null);
    executeRunPayroll(targetMonth, mode, monthDays);
  }

  function executeRunPayroll(targetMonth = "Oct 2026", mode = "standard", maxMonthDays = null) {
    const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN");
    const steps = [];
    const PAID_LEAVE_TYPES = ["Annual Leave", "Sick Leave", "Casual Leave", "Maternity Leave", "Paternity Leave", "Comp Off", "On-Duty (OD) / Business Travel"];

    const targetYear = parseInt(targetMonth.match(/\d{4}/)?.[0] || "2026", 10);
    const monthMap = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
    const monthKey = targetMonth.slice(0, 3).toLowerCase();
    const monthNum = monthMap[monthKey];
    const monthPrefix = monthNum ? `${targetYear}-${monthNum}` : null;
    const monthDays = maxMonthDays || getDaysInMonth(targetYear, monthKey);

    // Strict Separation & Post-Exit Payroll Protection Guards
    const activeEmps = db.emp_docs.filter(e => {
      // Guard 1: Exclude archived / inactive employees
      if (e.status.includes("Inactive")) return false;

      // Guard 2: Exclude employees who already received their Full & Final (F&F) Settlement for this cycle.
      // If the employee is Active with no exit date (e.g. re-hired/re-joined), past F&F from previous months only block their exit month.
      const hasFF = (db.payroll || []).some(p => {
        if (p.emp !== e.name || p.payrollMode !== "Full & Final Settlement") return false;
        if (e.status === "Active" && !e.exit_date && monthPrefix) {
          const ffMonthPrefix = (p.exitDate || p.month || "").slice(0, 7);
          return ffMonthPrefix === monthPrefix;
        }
        return true;
      });
      if (hasFF) return false;

      // Guard 3: Exclude employees whose notice period ended before this payroll cycle
      if (e.exit_date && monthPrefix) {
        const exitMonthPrefix = e.exit_date.slice(0, 7);
        if (monthPrefix > exitMonthPrefix) return false;
      }

      return true;
    });

    if (!activeEmps.length) {
      pushLog("WARN", "payroll_records", `No eligible active employees to process for ${targetMonth} (inactive, post-exit, or already settled via F&F).`);
      return;
    }

    activeEmps.forEach((emp) => {
      let billableDays = monthDays;
      let presentDays = 0;

      if (mode === "attendance") {
        const empAtt = db.attendance_leave.filter(record => {
          if (record.emp !== emp.name) return false;
          if (monthPrefix) {
            const d = record.date || record.startDate || "";
            return d.startsWith(monthPrefix);
          }
          return true;
        });

        // Track day credits per calendar date to eliminate double-counting
        const dayCredits = {};

        // 1. Process Approved Paid Leaves & On-Duty Travel
        empAtt.forEach(record => {
          const isApprovedPaidLeave = (record.status === "Approved" && (PAID_LEAVE_TYPES.includes(record.type) || (record.type && record.type.includes("On-Duty")))) ||
            (PAID_LEAVE_TYPES.includes(record.status) || (record.status && record.status.includes("On-Duty")));

          if (isApprovedPaidLeave) {
            const days = Number(record.days) || (record.isHalfDay ? 0.5 : 1);
            if (record.startDate && record.endDate) {
              const cur = new Date(record.startDate);
              const last = new Date(record.endDate);
              while (cur <= last) {
                const dStr = getLocalDateStr(cur);
                if (!monthPrefix || dStr.startsWith(monthPrefix)) {
                  dayCredits[dStr] = Math.min(1, (dayCredits[dStr] || 0) + (record.isHalfDay ? 0.5 : 1));
                }
                cur.setDate(cur.getDate() + 1);
              }
            } else if (record.date) {
              dayCredits[record.date] = Math.min(1, (dayCredits[record.date] || 0) + (record.isHalfDay ? 0.5 : days));
            } else if (record.dates && /^\d{4}-\d{2}-\d{2}$/.test(record.dates.trim())) {
              const dStr = record.dates.trim();
              dayCredits[dStr] = Math.min(1, (dayCredits[dStr] || 0) + (record.isHalfDay ? 0.5 : days));
            }
          }
        });

        // 2. Process Verified Present / WFH / Regularized Attendance entries
        empAtt.forEach(record => {
          if (record.type === "Attendance" && (record.status === "Present" || record.status === "Work From Home")) {
            if (record.date) {
              dayCredits[record.date] = 1.0;
            }
          } else if (record.type === "Attendance" && record.status === "Half-day") {
            if (record.date) {
              dayCredits[record.date] = Math.min(1, (dayCredits[record.date] || 0) + 0.5);
            }
          }
        });

        // 3. Process Physical Biometric Punches (Punch IN + Punch OUT pair on same date)
        const punchesByDate = {};
        empAtt.forEach(record => {
          if (record.type === "Attendance" && (record.status === "Punch IN" || record.status === "Punch OUT")) {
            if (record.date) {
              if (!punchesByDate[record.date]) punchesByDate[record.date] = { in: false, out: false };
              if (record.status === "Punch IN") punchesByDate[record.date].in = true;
              if (record.status === "Punch OUT") punchesByDate[record.date].out = true;
            }
          }
        });

        Object.entries(punchesByDate).forEach(([d, p]) => {
          if (p.in && p.out) {
            dayCredits[d] = Math.min(1, (dayCredits[d] || 0) + 1.0);
          }
        });

        presentDays = Object.values(dayCredits).reduce((sum, v) => sum + v, 0);
        billableDays = Math.min(presentDays, monthDays);
      } else {
        // Standard Mode: month calendar days minus unpaid leaves
        const unpaidLeaves = (db.attendance_leave || []).filter(r => {
          if (r.emp !== emp.name || r.type !== "Unpaid Leave" || r.status !== "Approved") return false;
          if (monthPrefix) {
            const d = r.date || r.startDate || "";
            return d.startsWith(monthPrefix);
          }
          return true;
        });
        const unpaidDays = unpaidLeaves.reduce((sum, r) => sum + (Number(r.days) || 1), 0);
        presentDays = Math.max(0, monthDays - unpaidDays);
        billableDays = Math.min(presentDays, monthDays);
      }

      // Exit-Month Proration: If notice period ends within this cycle, cap days worked up to exit date
      if (emp.exit_date && monthPrefix && emp.exit_date.slice(0, 7) === monthPrefix) {
        const exitWd = getWorkingDaysInMonthUpToDate(emp.exit_date).workingDays;
        billableDays = Math.min(billableDays, exitWd);
      }

      const dailyRate = emp.dailyRate || (emp.designation ? DESIGNATION_RATES[emp.designation] : 1000) || 1000;
      const baseGross = billableDays * dailyRate;

      // Compensation & Incentives Logic (Unified Allowances + Awards)
      const empIncentives = (db.comp_incentives || []).filter(ci =>
        ci.emp === emp.name && (ci.status === "Approved" || ci.status === "Nominated" || (!ci.bonusDisbursed && ci.status !== "Rejected") || ci.disbursedMonth === targetMonth)
      );
      let totalAllowances = 0;
      let awardBonus = 0;
      let awardLabel = "";
      empIncentives.forEach(ci => {
        const amt = Number(String(ci.amount || ci.reward || "0").replace(/[^\d]/g, '')) ||
          (AWARD_REWARDS[ci.category] || AWARD_REWARDS[ci.subType] || 0);
        if (ci.type === "Award" || ci.category?.includes("Award") || ci.subType?.includes("Award") || AWARD_REWARDS[ci.category] || AWARD_REWARDS[ci.subType]) {
          awardBonus += amt;
        } else {
          totalAllowances += amt;
        }
      });
      if (awardBonus > 0) {
        awardLabel = ` (+Rs.${fmt(awardBonus)} award)`;
      }

      // Performance Bonus Logic
      const perfRecords = db.performance.filter(r =>
        r.emp === emp.name && (r.bonusPaid !== true || r.disbursedMonth === targetMonth)
      );
      let perfBonus = 0;
      let perfLabel = "";
      let latestPerf = null;
      if (perfRecords.length > 0) {
        latestPerf = perfRecords[perfRecords.length - 1];
        if (latestPerf.rating === "Outstanding") {
          perfBonus = 5000;
          perfLabel = " (+Rs.5,000 bonus)";
        } else if (latestPerf.rating === "Exceeds Expectations") {
          perfBonus = 2500;
          perfLabel = " (+Rs.2,500 bonus)";
        } else if (latestPerf.kpiScore === "100%" || latestPerf.kpiScore === 100) {
          perfBonus = 3000;
          perfLabel = " (+Rs.3,000 100% KPI bonus)";
        }
      }

      // Active Loan EMI Deductions
      const empActiveLoans = (db.loans || []).filter(l => l.emp === emp.name && (l.status === "Active" || l.status === "Active (Disbursed)"));
      let loanEmiSum = 0;
      empActiveLoans.forEach(l => {
        const emiNum = Number(String(l.emi || "0").replace(/[^\d]/g, ''));
        if (!isNaN(emiNum)) loanEmiSum += emiNum;
      });

      const gross = baseGross + totalAllowances + perfBonus + awardBonus;
      const pf = Math.round(gross * 0.12);
      const tds = Math.round(gross * 0.07);
      const statutoryDeductions = pf + tds;
      const netAvailable = Math.max(0, gross - statutoryDeductions);
      const emiShortfall = loanEmiSum > netAvailable ? loanEmiSum - netAvailable : 0;
      const actualEmiDeducted = Math.min(loanEmiSum, netAvailable);
      const net = Math.max(0, netAvailable - actualEmiDeducted);
      const emiLabel = loanEmiSum > 0 ? ` | Loan EMI -Rs.${fmt(actualEmiDeducted)}${emiShortfall > 0 ? ` (⚠️ Arrears Shortfall: Rs.${fmt(emiShortfall)})` : ""}` : "";

      steps.push({ node: "emp_docs", op: "SELECT", text: `Reading salary structure for ${emp.name}` });
      steps.push({ node: "attendance_leave", op: "SELECT", edge: ["payroll", "attendance_leave"], text: `Aggregating ${targetMonth} attendance & leave for ${emp.name} (${mode === "standard" ? "Standard 30d Mode" : "Strict Attendance Mode"})` });

      if (emiShortfall > 0) {
        steps.push({
          node: "loans",
          op: "WARN",
          edge: ["payroll", "loans"],
          alert: true,
          text: `⚠️ Loan EMI Arrears: ${emp.name}'s loan EMI (Rs.${fmt(loanEmiSum)}) exceeded net earnings (Rs.${fmt(netAvailable)}). Shortfall of Rs.${fmt(emiShortfall)} rolled over as uncollected arrears.`
        });
      }

      if (loanEmiSum > 0 && empActiveLoans.length > 0) {
        steps.push({ node: "loans", op: "SELECT", edge: ["payroll", "loans"], text: `Deducting active loan EMI (Rs.${fmt(actualEmiDeducted)} collected${emiShortfall > 0 ? `, Rs.${fmt(emiShortfall)} shortfall` : ""}) for ${emp.name}` });

        let remainingDeductionBudget = actualEmiDeducted;
        empActiveLoans.forEach(l => {
          const emiNum = Number(String(l.emi || "0").replace(/[^\d]/g, ''));
          const isSameMonth = l.lastDeductionMonth === targetMonth;
          const currentTenureMonths = l.monthsRemaining !== undefined
            ? l.monthsRemaining
            : ((parseInt(l.tenure, 10) || 3) * 12);
          const currentBal = l.remainingBalance !== undefined
            ? l.remainingBalance
            : (Number(String(l.amount).replace(/[^\d]/g, '')) || 100000);

          const deductedForThisLoan = Math.min(emiNum, remainingDeductionBudget);
          remainingDeductionBudget = Math.max(0, remainingDeductionBudget - deductedForThisLoan);

          // Bug 2 Fix: Tenure only decrements when payment is collected.
          // If 0 was deducted due to shortfall, tenure freezes.
          // Loan is strictly marked "Fully Repaid" when nextBal === 0 (never prematurely while balance remains).
          const nextMonths = isSameMonth
            ? currentTenureMonths
            : (deductedForThisLoan > 0 ? Math.max(0, currentTenureMonths - 1) : currentTenureMonths);
          const nextBal = isSameMonth ? currentBal : Math.max(0, currentBal - deductedForThisLoan);
          const isRepaid = nextBal === 0;
          const hasShortfall = emiNum > deductedForThisLoan;

          const updatedLoan = {
            ...l,
            monthsRemaining: nextMonths,
            remainingBalance: nextBal,
            status: isRepaid ? "Fully Repaid" : (hasShortfall ? "Active (EMI in Arrears)" : l.status),
            lastDeductionMonth: targetMonth
          };
          if (emiShortfall > 0) {
            updatedLoan.arrearsBalance = (Number(l.arrearsBalance) || 0) + (emiNum - deductedForThisLoan);
          }

          let logText = "";
          if (isRepaid) {
            logText = `🎉 Final EMI deducted for ${emp.name}'s ${l.type}. Loan Fully Repaid!`;
          } else if (deductedForThisLoan === 0) {
            logText = `⚠️ Loan EMI Skipped for ${emp.name}'s ${l.type}: Net earnings insufficient (Rs.0 collected of nominal Rs.${fmt(emiNum)}). Tenure frozen at ${nextMonths} mo (Bal: Rs.${fmt(nextBal)}).`;
          } else {
            logText = `Loan EMI deducted for ${emp.name} (Rs.${fmt(deductedForThisLoan)}${deductedForThisLoan < emiNum ? ` of nominal Rs.${fmt(emiNum)}` : ""}) · ${nextMonths} mo remaining (Bal: Rs.${fmt(nextBal)})`;
          }

          steps.push({
            node: "loans",
            op: "UPDATE",
            edge: ["payroll", "loans"],
            text: logText,
            row: updatedLoan
          });
        });
      }

      if (empIncentives.length > 0) {
        steps.push({
          node: "comp_incentives",
          op: "SELECT",
          edge: ["payroll", "comp_incentives"],
          text: `Applying Compensation & Incentives for ${emp.name} (Rs.${fmt(totalAllowances + awardBonus)} total)`
        });
        empIncentives.forEach(ci => {
          const itemTitle = ci.subType || ci.type || ci.category || "Incentive";
          steps.push({
            node: "comp_incentives",
            op: "UPDATE",
            edge: ["comp_incentives", "payroll"],
            text: `Marking ${itemTitle} as Disbursed (${targetMonth})`,
            row: { ...ci, status: "Disbursed", bonusDisbursed: true, disbursedMonth: targetMonth }
          });
        });
      }

      if (perfBonus > 0 && latestPerf) {
        steps.push({ node: "performance", op: "SELECT", edge: ["payroll", "performance"], text: `Applying performance bonus for ${emp.name}` });
        steps.push({ node: "performance", op: "UPDATE", edge: ["performance", "payroll"], text: `Marking ${latestPerf.cycle} bonus as Disbursed (${targetMonth})`, row: { ...latestPerf, bonusPaid: true, disbursedMonth: targetMonth } });
      }

      const allowLabel = totalAllowances > 0 ? ` (+Rs.${fmt(totalAllowances)} allow)` : "";
      const daysLabel = presentDays > monthDays ? `${billableDays} Days (Capped at ${monthDays}d/mo max)` : `${billableDays} Days`;
      const textMsg = `Payslip (${targetMonth}) — ${emp.name} | ${daysLabel} @ Rs.${fmt(dailyRate)} | Gross Rs.${fmt(gross)}${allowLabel}${perfLabel}${awardLabel} | PF Rs.${fmt(pf)} | TDS Rs.${fmt(tds)}${emiLabel} | Net Rs.${fmt(net)}`;

      const existingPayslip = (db.payroll || []).find(r => r.emp === emp.name && r.month === targetMonth);
      const prId = existingPayslip ? existingPayslip.id : nextId("PR");

      const prRow = { id: prId, emp: emp.name, month: targetMonth, daysWorked: `${billableDays}/${monthDays} days`, gross: `Rs.${fmt(gross)}`, pf: `Rs.${fmt(pf)}`, net: `Rs.${fmt(net)}`, status: "Processed" };
      if (loanEmiSum > 0) prRow.loanEmi = `Rs.${fmt(actualEmiDeducted)}`;
      if (emiShortfall > 0) prRow.loanArrears = `Rs.${fmt(emiShortfall)}`;

      steps.push({
        node: "payroll", op: existingPayslip ? "UPDATE" : "INSERT", edge: ["payroll", "emp_docs"],
        text: (existingPayslip ? "🔄 Updated " : "") + textMsg,
        row: prRow,
      });
    });
    execute(steps);
  }

  // ── Add Allowance ──────────────────────────────────────────────────────────
  function actionAddAllowance() {
    actionCompIncentives("allowance");
  }
  function confirmAddAllowance() {
    if (running || !checkNetworkOrWarn()) return;
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;
    const amt = Math.max(500, Number(modal.amount) || 5000);
    const fmt = (n) => Number(n).toLocaleString("en-IN");
    const fy = Number(modal.fiscalYear) || 2026;
    const period = `FY${fy}–${String(fy + 1).slice(2)}`;
    const row = {
      id: nextId("CMP"),
      emp: emp.name,
      type: "Allowance",
      subType: modal.allowanceType,
      amount: `Rs.${fmt(amt)}`,
      amountNum: amt,
      period,
      fiscalYear: fy,
      status: "Approved",
      bonusDisbursed: false
    };
    setModal(null);
    execute([
      { node: "emp_docs", op: "SELECT", text: `Verifying allowance eligibility & budget allocation for ${emp.name}` },
      { node: "payroll", op: "SELECT", edge: ["comp_incentives", "payroll"], text: `Reading ${period} payroll base and statutory caps for ${emp.name}` },
      { node: "comp_incentives", op: "INSERT", edge: ["comp_incentives", "emp_docs"], text: `💰 Special Allowance Authorized: ${modal.allowanceType} of Rs.${fmt(amt)} (${period}) for ${emp.name} (Disbursable in Payroll)`, row, alert: true },
      { node: "comp_incentives", op: "SELECT", text: `🔔 Notification sent to ${emp.name}: Your ${modal.allowanceType} of Rs.${fmt(amt)} for ${period} has been authorized and queued for payroll disbursement.` }
    ]);
  }

  const PROFILE_FIELD_CONFIG = {
    "Residential Address": {
      label: "Residential Address",
      placeholder: "e.g. Flat 4B, Emerald Heights, 5th Cross, Indiranagar, Bangalore - 560038",
      defaultVal: "Flat 4B, Emerald Heights, 5th Cross, Indiranagar, Bangalore - 560038",
      empKey: "address",
      isTextarea: true,
      hint: "Permanent / Current residential address for official communication & statutory records",
      proofHint: "📎 Rental Agreement / Utility Bill proof self-declared"
    },
    "Personal Phone": {
      label: "Personal Mobile Number",
      placeholder: "e.g. +91 98765 43210",
      defaultVal: "+91 98765 43210",
      empKey: "phone",
      isTextarea: false,
      hint: "10-digit primary mobile number for corporate 2FA and emergency SMS alerts",
      proofHint: "📎 Telecom subscriber verification proof"
    },
    "Emergency Contact": {
      label: "Emergency Contact Person",
      placeholder: "e.g. Priya Sharma (Spouse) - +91 98111 22233",
      defaultVal: "Priya Sharma (Spouse) - +91 98111 22233",
      empKey: "emergency_contact",
      isTextarea: false,
      hint: "Primary kin contact name, relationship, and reachable emergency phone number",
      proofHint: "📎 Kin relationship self-declaration"
    },
    "Personal Email": {
      label: "Personal Email Address",
      placeholder: "e.g. employee.personal@gmail.com",
      defaultVal: "employee.personal@gmail.com",
      empKey: "personal_email",
      isTextarea: false,
      hint: "Secondary personal email for Form 16, tax slips, and offboarding communications",
      proofHint: "📎 Email OTP verification completed"
    },
    "Bank Account & IFSC": {
      label: "Bank Account & IFSC (Salary Credit)",
      placeholder: "e.g. HDFC Bank · A/C 50100456789012 · IFSC HDFC0001234",
      defaultVal: "HDFC Bank · A/C 50100456789012 · IFSC HDFC0001234",
      empKey: "bank_details",
      isTextarea: false,
      hint: "Requires cancelled cheque / bank statement for HR payroll disbursement verification",
      proofHint: "📎 Cancelled Cheque / Bank Passbook attached"
    },
    "Blood Group": {
      label: "Blood Group",
      placeholder: "e.g. O+ Positive",
      defaultVal: "O+ Positive",
      empKey: "blood_group",
      isTextarea: false,
      hint: "Employee medical record and corporate emergency health registry",
      proofHint: "📎 Diagnostic blood report self-declaration"
    }
  };

  // ── ESS Request ────────────────────────────────────────────────────────────
  function actionESS() {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "ess_requests", "No active employees to make ESS requests."); return; }
    setModal({
      type: "ess",
      empId: activeEmps[0].id,
      req: "Payslip Download",
      payslipMonth: "Oct 2026",
      corrDate: getLocalDateStr(),
      corrSession: "Morning Punch IN",
      corrReason: "Biometric Hardware Error",
      claimCategory: "Local Conveyance / Travel",
      claimAmount: 1200,
      ticketCategory: "IT Hardware & Equipment",
      ticketPriority: "High",
      ticketSubject: "Laptop Screen Flickering & Battery Glitch",
      ticketDescription: "Display blanks out intermittently during video calls and battery drains rapidly. Requesting hardware diagnostic inspection.",
      profileField: "Residential Address",
      profileValue: "Flat 4B, Emerald Heights, 5th Cross, Indiranagar, Bangalore - 560038",
      docType: "Bonafide Certificate",
      customDocTitle: "",
      docPurpose: ""
    });
  }

  function confirmESS() {
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;

    let detailStr = "";
    let targetNode = "emp_docs";
    let stepLog = "";
    let status = "Completed";

    if (modal.req === "Payslip Download") {
      const pMonth = modal.payslipMonth || "Oct 2026";
      const pSlip = (db.payroll || []).find(p => p.emp === emp.name && p.month === pMonth);
      detailStr = pSlip ? `Month: ${pMonth} | Gross: ${pSlip.gross} | Net: ${pSlip.net}` : `Month: ${pMonth} | Verified Digital Payslip`;
      targetNode = "payroll";
      stepLog = `Fetching encrypted ${pMonth} payslip statement for ${emp.name}`;
    } else if (modal.req === "Leave Balance Check") {
      const a = getLeaveBalance(emp.name, "Annual Leave");
      const c = getLeaveBalance(emp.name, "Casual Leave");
      const s = getLeaveBalance(emp.name, "Sick Leave");
      detailStr = `Annual: ${a.toFixed(1)}d | Casual: ${c.toFixed(1)}d | Sick: ${s.toFixed(1)}d`;
      targetNode = "attendance_leave";
      stepLog = `Querying live 3-tier leave ledger balances for ${emp.name}`;
    } else if (modal.req === "Attendance Correction") {
      const corrDate = modal.corrDate || getLocalDateStr();
      const corrSession = modal.corrSession || "Morning Punch IN";
      const corrReason = modal.corrReason || "Biometric Hardware Error";
      detailStr = `${corrDate} (${corrSession}) — ${corrReason}`;
      targetNode = "attendance_leave";
      status = "Pending HR Approval";
      stepLog = `Filing attendance punch regularization on ${corrDate} (${corrSession}) for ${emp.name}`;
    } else if (modal.req === "Reimbursement Claim") {
      const amt = Number(modal.claimAmount) || 1200;
      const cat = modal.claimCategory || "Local Conveyance / Travel";
      detailStr = `${cat} — Rs.${amt.toLocaleString("en-IN")}`;
      targetNode = "comp_incentives";
      status = "Pending HR Approval";
      stepLog = `Filing expense reimbursement claim (Rs.${amt.toLocaleString("en-IN")}) for ${emp.name}`;
    } else if (modal.req === "HR & IT Helpdesk" || modal.req === "IT Declaration Submission") {
      const cat = modal.ticketCategory || "IT Hardware & Equipment";
      const prio = modal.ticketPriority || "High";
      const sub = (modal.ticketSubject || "").trim() || "Hardware Support";
      const desc = (modal.ticketDescription || "").trim();
      detailStr = `[${prio}] ${cat}: ${sub}`;
      targetNode = (cat.includes("IT") || cat.includes("Hardware") || cat.includes("Laptop") || cat.includes("Equipment")) ? "assets" : (cat.includes("Payroll") || cat.includes("Salary") ? "payroll" : "emp_docs");
      status = "Pending HR/IT Resolution";
      stepLog = `Filing internal support ticket [${prio}] "${sub}" for ${emp.name}`;
    } else if (modal.req === "Profile Update") {
      const pField = modal.profileField || "Residential Address";
      const config = PROFILE_FIELD_CONFIG[pField] || PROFILE_FIELD_CONFIG["Residential Address"];
      const pVal = (modal.profileValue !== undefined && modal.profileValue !== null && String(modal.profileValue).trim() !== "")
        ? String(modal.profileValue).trim()
        : config.defaultVal;
      detailStr = `${pField}: ${pVal}`;
      targetNode = "emp_docs";
      status = "Pending HR Approval";
      stepLog = `Submitting master profile modification (${pField}) for ${emp.name}`;
    } else if (modal.req === "Document Request") {
      const isCustom = modal.docType === "Other (Custom Document / Letter)...";
      const docName = isCustom ? (modal.customDocTitle?.trim() || "Custom HR Document") : (modal.docType || "Bonafide Certificate");
      const purposeStr = modal.docPurpose?.trim() ? ` [Purpose: ${modal.docPurpose.trim()}]` : "";
      detailStr = `${docName}${purposeStr}`;
      targetNode = "emp_docs";
      status = "Pending HR Approval";
      stepLog = `Requesting official signed HR document "${docName}" for ${emp.name}`;
    }

    const row = {
      id: nextId("ESS"),
      emp: emp.name,
      request: modal.req === "IT Declaration Submission" ? "HR & IT Helpdesk" : modal.req,
      details: detailStr,
      ...(modal.req === "Reimbursement Claim" && {
        claimCategory: modal.claimCategory || "Local Conveyance / Travel",
        claimAmount: Number(modal.claimAmount) || 1200,
      }),
      ...(modal.req === "Attendance Correction" && {
        corrDate: modal.corrDate || getLocalDateStr(),
        corrSession: modal.corrSession || "Morning Punch IN",
        corrReason: modal.corrReason || "Biometric Hardware Error",
      }),
      ...((modal.req === "HR & IT Helpdesk" || modal.req === "IT Declaration Submission") && {
        ticketCategory: modal.ticketCategory || "IT Hardware & Equipment",
        ticketPriority: modal.ticketPriority || "High",
        ticketSubject: (modal.ticketSubject || "").trim() || "Hardware Diagnostic",
        ticketDescription: (modal.ticketDescription || "").trim() || "Technician inspection requested",
      }),
      ...(modal.req === "Profile Update" && {
        profileField: modal.profileField || "Residential Address",
        profileValue: (modal.profileValue !== undefined && modal.profileValue !== null && String(modal.profileValue).trim() !== "")
          ? String(modal.profileValue).trim()
          : (PROFILE_FIELD_CONFIG[modal.profileField || "Residential Address"]?.defaultVal || "Updated"),
      }),
      ...(modal.req === "Document Request" && {
        docType: modal.docType === "Other (Custom Document / Letter)..."
          ? (modal.customDocTitle?.trim() || "Custom HR Document")
          : (modal.docType || "Bonafide Certificate"),
        ...(modal.docPurpose?.trim() && { docPurpose: modal.docPurpose.trim() }),
      }),
      channel: "ESS Portal",
      status
    };


    setModal(null);
    const isPending = status.includes("Pending");
    const logText = isPending
      ? `ESS Request Submitted: "${modal.req}" for ${emp.name} routed to Operations & Approvals Drawer`
      : `ESS Processed: "${modal.req}" (${detailStr}) for ${emp.name}`;

    execute([
      { node: "emp_docs", op: "SELECT", text: `Authenticating portal SSO session — ${emp.name}` },
      { node: targetNode, op: "SELECT", edge: ["ess", targetNode], text: stepLog },
      { node: "ess", op: "INSERT", edge: ["ess", "emp_docs"], text: logText, row },
      ...(isPending ? [
        { node: "ess", op: "SELECT", text: `🔔 Notification sent to HR & IT Support: New ${modal.req} from ${emp.name} awaits resolution in Approvals Drawer.` }
      ] : [])
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

  // ── Internal Talent Mobility (Unified Promotion & Department Transfer) ──────
  function actionMobility(prefillSubTab = "promote") {
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "emp_docs", "No active employees available for mobility."); return; }
    const firstEmp = activeEmps[0];
    const curRank = DESIG_POOL.indexOf(firstEmp.designation);
    const nextDesig = curRank >= 0 && curRank < DESIG_POOL.length - 1 ? DESIG_POOL[curRank + 1] : DESIG_POOL[0];
    const targetDept = DEPT_POOL.find(d => d !== firstEmp.dept) || DEPT_POOL[0];

    setModal({
      type: "mobility",
      subTab: prefillSubTab, // "promote" or "transfer"
      empId: firstEmp.id,
      newDesig: nextDesig,
      newDept: targetDept,
      transferReason: "Project Reallocation",
      transferEffectiveDate: getLocalDateStr()
    });
  }

  // ── Transfer Employee ────────────────────────────────────────────────────────
  function actionTransfer() {
    actionMobility("transfer");
  }
  function confirmTransfer() {
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;
    const oldDept = emp.dept || emp.department;
    const newDept = modal.newDept;

    // Rule: Target department must be different from current department
    if (newDept === oldDept) {
      pushLog("WARN", "emp_docs", `Transfer rejected — ${emp.name} is already in the ${oldDept} department.`);
      setModal(null);
      return;
    }

    // Rule: One Director per department maximum
    if ((emp.designation || emp.desig || "").toLowerCase().includes("director")) {
      const existingDirector = (db.emp_docs || []).find(e =>
        (e.department === newDept || e.dept === newDept) &&
        e.id !== emp.id &&
        !e.status?.includes("Inactive") &&
        (e.designation || e.desig || "").toLowerCase().includes("director")
      );
      if (existingDirector) {
        pushLog("WARN", "emp_docs", `Cannot transfer Director. ${newDept} already has an active Director (${existingDirector.name}). A department can only have one Director.`);
        setModal(null);
        return;
      }
    }

    const transferReason = modal.transferReason || "Project Reallocation";
    const effectiveDate = modal.transferEffectiveDate || getLocalDateStr();
    const updatedEmp = {
      ...emp,
      id: emp.id,
      dept: newDept,
      department: newDept,
      previous_dept: oldDept,
      transfer_reason: transferReason,
      transfer_date: effectiveDate
    };

    const empAssets = (db.assets || []).filter(a =>
      a.emp?.trim().toLowerCase() === emp.name?.trim().toLowerCase() &&
      (!a.status?.includes("Returned") && !a.status?.includes("Recovered"))
    );

    setModal(null);

    const steps = [
      { node: "emp_docs", op: "SELECT", text: `Verifying transfer eligibility & career record for ${emp.name} (${oldDept})` },
      {
        node: "emp_docs",
        op: "UPDATE",
        edge: ["emp_docs", "payroll"],
        text: `🔄 Department Transfer Approved: ${emp.name} moved from ${oldDept} to ${newDept} [Reason: ${transferReason}]`,
        row: updatedEmp
      },
      {
        node: "payroll",
        op: "SELECT",
        edge: ["payroll", "emp_docs"],
        text: `💼 Payroll Cost Center Shift: ${emp.name}'s salary budget transferred from ${oldDept} to ${newDept} (Daily wage Rs.${Number(emp.dailyRate || 1000).toLocaleString("en-IN")}/d preserved)`
      },
      {
        node: "attendance_leave",
        op: "SELECT",
        edge: ["attendance_leave", "emp_docs"],
        text: `⏱️ Shift Schedule Reassigned: Migrated ${emp.name}'s attendance roster to ${newDept} operational calendar`
      }
    ];

    if (empAssets.length > 0) {
      empAssets.forEach(a => {
        steps.push({
          node: "assets",
          op: "UPDATE",
          edge: ["assets", "emp_docs"],
          text: `📦 Hardware Cost Center Tagged: ${a.asset} (${a.code || a.id}) updated to ${newDept} custodian pool`,
          row: { ...a, department: newDept }
        });
      });
    }

    steps.push({
      node: "emp_docs",
      op: "SELECT",
      text: `🔔 Handoff Notification: Digital clearance and onboarding dossier dispatched to ${oldDept} & ${newDept} leadership`
    });

    execute(steps);
  }

  // ── Promote Employee ─────────────────────────────────────────────────────────
  function actionPromote() {
    actionMobility("promote");
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

    // Rule: One Director per department maximum
    if (modal.newDesig.toLowerCase().includes("director")) {
      const existingDirector = (db.emp_docs || []).find(e =>
        (e.department === emp.dept || e.dept === emp.dept) &&
        e.id !== emp.id &&
        !e.status?.includes("Inactive") &&
        (e.designation || e.desig || "").toLowerCase().includes("director")
      );
      if (existingDirector) {
        pushLog("WARN", "emp_docs", `Cannot promote to Director. ${emp.dept || emp.department} already has an active Director (${existingDirector.name}). A department can only have one Director.`);
        setModal(null);
        return;
      }
    }

    // Rule: Require at least one completed performance appraisal cycle on file (Item 2.3)
    const perfRecords = db.performance.filter(r => r.emp === emp.name);
    if (perfRecords.length === 0) {
      pushLog("WARN", "emp_docs", `Promotion blocked for ${emp.name} — No verified performance appraisal on file. Corporate policy requires at least 1 completed evaluation cycle before promotion eligibility.`);
      setModal(null);
      return;
    }

    const latestRating = perfRecords[perfRecords.length - 1].rating;
    if (latestRating === "Needs Improvement" || latestRating === "Unsatisfactory") {
      pushLog("WARN", "emp_docs", `Promotion blocked for ${emp.name} — latest appraisal rating is "${latestRating}". Performance improvement required before promotion.`);
      setModal(null);
      return;
    }

    // S.4: Calculate Compensation Delta & Wage Bump
    const oldRate = DESIGNATION_RATES[oldDesig] || 1000;
    const newRate = DESIGNATION_RATES[modal.newDesig] || 1000;
    const wageDelta = newRate - oldRate;
    const wagePct = oldRate > 0 ? Math.round((wageDelta / oldRate) * 100) : 0;
    const fmt = (n) => Number(n).toLocaleString("en-IN");

    setModal(null);
    execute([
      { node: "performance", op: "SELECT", edge: ["emp_docs", "performance"], text: `Reviewing performance history for ${emp.name} (Verified Appraisal Rating: ${latestRating})` },
      {
        node: "emp_docs",
        op: "UPDATE",
        edge: ["emp_docs", "payroll"],
        text: `⭐ Promoted ${emp.name} from ${oldDesig} (Rs.${fmt(oldRate)}/d) to ${modal.newDesig} (Rs.${fmt(newRate)}/d)! Wage revised (+${wagePct}%, +Rs.${fmt(wageDelta)}/day bump)`,
        row: { id: emp.id, designation: modal.newDesig, dailyRate: newRate },
        alert: true
      },
      {
        node: "payroll",
        op: "SELECT",
        edge: ["payroll", "emp_docs"],
        text: `📈 Payroll Grade Scale Adjusted: ${emp.name}'s standard monthly base earnings scale updated to Rs.${fmt(newRate * 30)}/mo (+Rs.${fmt(wageDelta * 30)}/mo increment)`
      }
    ]);
  }

  // ── Offboard Employee ────────────────────────────────────────────────────────
  function actionOffboard() {
    if (running || !checkNetworkOrWarn()) return;
    const activeEmps = db.emp_docs.filter(e => !e.status.includes("Inactive"));
    if (!activeEmps.length) { pushLog("WARN", "emp_docs", "No active employees to offboard."); return; }
    const todayStr = getLocalDateStr();
    const targetEmp = activeEmps[0];
    const isAlreadyOnNotice = targetEmp.status?.includes("Notice Period");
    const exitDate = isAlreadyOnNotice && targetEmp.exit_date ? targetEmp.exit_date : todayStr;
    const wdInfo = getWorkingDaysInMonthUpToDate(exitDate);

    const ALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const exitD = new Date(exitDate);
    const exitMonthStr = `${ALL_MONTHS[exitD.getMonth()]} ${exitD.getFullYear()}`;
    const alreadyPaid = (db.payroll || []).some(p => p.emp === targetEmp.name && p.month === exitMonthStr && p.payrollMode !== "Full & Final Settlement");
    const defaultWorkingDays = alreadyPaid ? 0 : wdInfo.workingDays;

    setOffboardChecklist(computeAutoOffboardChecklist(targetEmp.id));

    setModal({
      type: "offboard",
      empId: targetEmp.id,
      reason: "Resignation",
      exitDate,
      workingDays: defaultWorkingDays,
      separationMode: isAlreadyOnNotice ? "final_clearance" : (exitDate > todayStr ? "notice" : "final_clearance")
    });
  }
  async function confirmOffboard() {
    if (running || !checkNetworkOrWarn()) return;
    const emp = db.emp_docs.find(e => e.id === modal.empId); if (!emp) return;
    const exitReason = modal.reason || "Resignation";
    const exitDate = modal.exitDate || getLocalDateStr();
    const separationMode = modal.separationMode || "final_clearance";
    const modalWorkingDays = modal.workingDays;
    setModal(null);

    // Trigger visual flowchart deprovisioning animation
    setChartAnim({
      active: true,
      type: "OFFBOARD",
      empId: emp.id,
      empName: emp.name,
      empDesig: emp.designation || emp.desig,
      dept: emp.department || emp.dept,
      stage: 1,
      message: `⚠️ Deprovisioning Alert: Offboarding initiated for ${emp.name} in ${emp.department || emp.dept}...`
    });

    setTimeout(() => {
      setChartAnim(prev => ({
        ...prev,
        stage: 2,
        message: `🔄 Manager Handover & Asset Recovery: Revoking IT assets, credentials & biometric access`
      }));
    }, 800);

    setTimeout(() => {
      setChartAnim(prev => ({
        ...prev,
        stage: 3,
        message: `🔒 Separation Completed: ${emp.name} deprovisioned & archived on org chart`
      }));
    }, 1800);

    setTimeout(() => {
      setChartAnim({ active: false, type: null, empId: "", empName: "", empDesig: "", dept: "", stage: 0, message: "" });
    }, 4500);

    // ── Mode A: Notice Period Scheduled (Employee remains active for Oct/Nov payroll) ──
    if (separationMode === "notice") {
      const steps = [
        {
          node: "emp_docs",
          op: "UPDATE",
          text: `📋 Resignation Accepted: ${emp.name} is now Serving Notice Period until ${exitDate} (${exitReason}). Access credentials and hardware assets remain active for intervening monthly payroll.`,
          row: { ...emp, status: `Serving Notice Period (Exit: ${exitDate})`, exit_date: exitDate, exitReason: exitReason },
          alert: true
        },
        {
          node: "emp_docs",
          op: "SELECT",
          text: `🔔 Notification sent to ${emp.name}: Separation notice acknowledged (${exitReason}). Scheduled Last Working Day: ${exitDate}. Access credentials, company assets, and monthly payroll remain active throughout notice period.`
        }
      ];
      await execute(steps);
      return;
    }

    // ── Mode B: Final Day Clearance & F&F Settlement ──
    const wdInfo = getWorkingDaysInMonthUpToDate(exitDate);
    const workedDays = (typeof modalWorkingDays === "number" && !isNaN(modalWorkingDays) && modalWorkingDays >= 0)
      ? modalWorkingDays
      : wdInfo.workingDays;

    const steps = [];
    steps.push({ node: "emp_docs", op: "SELECT", text: `Initiating final offboarding clearance for ${emp.name}`, alert: true });

    steps.push({ node: "attendance_leave", op: "SELECT", edge: ["attendance_leave", "emp_docs"], text: `🔒 Access Revoked: Biometric profile locked for ${emp.name}`, alert: true });

    // Asset Return & Recovery upon Offboarding
    const empAssets = (db.assets || []).filter(a =>
      a.emp?.trim().toLowerCase() === emp.name?.trim().toLowerCase() &&
      (!a.status?.includes("Returned") && !a.status?.includes("Recovered"))
    );
    if (empAssets.length > 0) {
      steps.push({ node: "assets", op: "SELECT", edge: ["assets", "emp_docs"], text: `Checking allocated company assets for offboarding ${emp.name}...`, alert: true });
      empAssets.forEach(a => {
        const returnedAsset = {
          ...a,
          status: `Returned (Offboarded - ${exitReason})`,
          returnReason: `Offboarding (${exitReason})`,
          returnedDate: exitDate || getLocalDateStr()
        };
        steps.push({
          node: "assets",
          op: "UPDATE",
          edge: ["assets", "emp_docs"],
          text: `📦 Asset Returned: ${a.asset} (${a.code || a.id}) returned by ${emp.name} upon offboarding (${exitReason})`,
          row: returnedAsset,
          alert: true
        });
      });
      steps.push({
        node: "assets",
        op: "SELECT",
        text: `🔔 Inventory Notification: ${empAssets.length} asset(s) returned to IT inventory pool. Hardware custodian record cleared for ${emp.name}.`
      });
    } else {
      steps.push({ node: "assets", op: "SELECT", edge: ["assets", "emp_docs"], text: `No active assets to recover for ${emp.name}.`, alert: true });
    }

    // Cancel pending leaves for offboarded employee
    const pendingEmpLeaves = (db.attendance_leave || []).filter(r => r.emp === emp.name && r.status === "Pending Approval");
    if (pendingEmpLeaves.length > 0) {
      pendingEmpLeaves.forEach(lv => {
        steps.push({
          node: "attendance_leave",
          op: "UPDATE",
          text: `❌ Cancelled pending ${lv.type} (${lv.dates}) for offboarded employee ${emp.name}`,
          row: { ...lv, status: "Cancelled (Employee Offboarded)" },
          alert: true
        });
      });
    }

    // Void pending ESS requests (claims, corrections, tickets, docs, profile updates)
    const pendingEmpEss = (db.ess || []).filter(r => r.emp === emp.name && (r.status?.includes("Pending") || r.status?.includes("Open") || r.status?.includes("Escalated")));
    if (pendingEmpEss.length > 0) {
      pendingEmpEss.forEach(req => {
        steps.push({
          node: "ess",
          op: "UPDATE",
          text: `❌ Voided pending ESS request #${req.id} (${req.request}) for offboarded employee ${emp.name}`,
          row: { ...req, status: "Voided (Employee Offboarded)" },
          alert: true
        });
      });
    }

    // ── Financial Full & Final Settlement Calculation ──
    const dailyRate = emp.dailyRate || (emp.designation ? DESIGNATION_RATES[emp.designation] : 1000) || 1000;
    const earnedWage = workedDays * dailyRate;
    const alBalance = getLeaveBalance(emp.name, "Annual Leave");
    const leaveEncashment = Math.max(0, Math.round(alBalance * dailyRate));
    const grossSettlement = earnedWage + leaveEncashment;
    const pf = Math.round(earnedWage * 0.12);
    const tds = Math.round(earnedWage * 0.07);
    const statutoryDeductions = pf + tds;
    const netAvailableBeforeLoans = Math.max(0, grossSettlement - statutoryDeductions);

    // Loan Recovery with Deficit Accounting (Bug 2 Fix)
    const empLoans = db.loans.filter(l => l.emp === emp.name && (l.status.includes("Active") || l.status === "Under Review"));
    let remainingLoanRecoveryBudget = netAvailableBeforeLoans;
    let totalLoanBalance = 0;
    let actualLoanRecovered = 0;

    if (empLoans.length > 0) {
      steps.push({ node: "loans", op: "SELECT", edge: ["loans", "emp_docs"], text: `Auditing outstanding loan obligations for ${emp.name} against net settlement capacity (Available: Rs.${netAvailableBeforeLoans.toLocaleString("en-IN")})...`, alert: true });
      empLoans.forEach(l => {
        const bal = l.remainingBalance !== undefined
          ? Number(l.remainingBalance)
          : (Number(String(l.amount || "0").replace(/[^\d]/g, '')) || 0);
        totalLoanBalance += bal;
        const recoverAmount = Math.min(bal, remainingLoanRecoveryBudget);
        remainingLoanRecoveryBudget -= recoverAmount;
        actualLoanRecovered += recoverAmount;
        const unpaidDeficit = bal - recoverAmount;

        if (unpaidDeficit <= 0) {
          steps.push({
            node: "loans",
            op: "UPDATE",
            edge: ["loans", "emp_docs"],
            text: `💰 Loan Cleared: Full remaining balance (Rs.${bal.toLocaleString("en-IN")}) recovered via F&F settlement for ${l.type}`,
            row: { ...l, status: "Cleared via F&F", remainingBalance: 0 },
            alert: true
          });
        } else {
          steps.push({
            node: "loans",
            op: "UPDATE",
            edge: ["loans", "emp_docs"],
            text: `⚠️ Loan Partially Recovered: Rs.${recoverAmount.toLocaleString("en-IN")} deducted via F&F. Unpaid deficit of Rs.${unpaidDeficit.toLocaleString("en-IN")} remains due from ${emp.name}`,
            row: { ...l, status: `Deficit Post-F&F (Rs.${unpaidDeficit.toLocaleString("en-IN")} due)`, remainingBalance: unpaidDeficit },
            alert: true
          });
        }
      });
    }

    const loanDeficit = totalLoanBalance - actualLoanRecovered;
    const netSettlement = remainingLoanRecoveryBudget;

    const ffRecord = {
      id: nextId("PR"),
      emp: emp.name,
      month: `F&F Settlement (${exitDate})`,
      year: new Date(exitDate).getFullYear(),
      payrollMode: "Full & Final Settlement",
      daysWorked: `${workedDays} business days (${wdInfo.weekendDays} weekend days excluded)`,
      baseGross: `Rs.${earnedWage.toLocaleString("en-IN")}`,
      allowances: `Rs.${leaveEncashment.toLocaleString("en-IN")} (Leave Encashment)`,
      bonus: "Rs.0",
      gross: `Rs.${grossSettlement.toLocaleString("en-IN")}`,
      pf: `Rs.${pf.toLocaleString("en-IN")}`,
      tds: `Rs.${tds.toLocaleString("en-IN")}`,
      loanDeduction: `Rs.${actualLoanRecovered.toLocaleString("en-IN")}${loanDeficit > 0 ? ` (Deficit Due: Rs.${loanDeficit.toLocaleString("en-IN")})` : ""}`,
      net: `Rs.${netSettlement.toLocaleString("en-IN")}`,
      status: loanDeficit > 0 ? `Settled (Loan Deficit Rs.${loanDeficit.toLocaleString("en-IN")})` : "Settled (F&F Closure)",
      exitReason: exitReason,
      exitDate: exitDate
    };

    steps.push({
      node: "payroll",
      op: "INSERT",
      edge: ["payroll", "emp_docs"],
      text: `💳 Generated Full & Final (F&F) Settlement for ${emp.name}: Net Payout Rs.${netSettlement.toLocaleString("en-IN")} (Earned: Rs.${earnedWage.toLocaleString("en-IN")} [${workedDays}d @ Rs.${dailyRate}/d] + Encashment: Rs.${leaveEncashment.toLocaleString("en-IN")} - Loan Recovered: Rs.${actualLoanRecovered.toLocaleString("en-IN")}${loanDeficit > 0 ? ` [Deficit Due: Rs.${loanDeficit.toLocaleString("en-IN")}]` : ""})`,
      row: ffRecord,
      alert: true
    });

    steps.push({
      node: "emp_docs",
      op: "UPDATE",
      text: `🛑 Offboarded ${emp.name} (${exitReason}) — Master record archived`,
      row: { ...emp, status: `Inactive (${exitReason})`, exit_date: exitDate, exitReason: exitReason },
      alert: true
    });

    /* ── Finance & attrition consequences of the exit ──────────────────────
       The settlement above is only the visible cost. What follows is the part
       the business actually feels: the vacancy, the lost output, and — if this
       was a manager — the leadership gap until someone steps up. */
    const twin = twinByEmpId[emp.id];
    const empDept = emp.department || emp.dept;
    const empDesig = emp.designation || emp.desig || "Associate";
    const tenureMonths = monthsBetween(emp.joined, exitDate);
    const stillActive = (db.emp_docs || []).filter(e => e.id !== emp.id && !e.status?.includes("Inactive"));
    const successors = findReplacementCandidates(emp, stillActive, ratingOf);
    const isMgr = /manager|director|lead/i.test(empDesig);
    const loss = twin ? twin.loss : attritionLossModel(emp, {
      tenureMonths, isManager: isMgr,
      teamSize: stillActive.filter(e => (e.department || e.dept) === empDept).length,
      internalSuccessor: successors.length > 0,
    });
    const roiAtExit = employeeROIModel(emp, exitDate);

    const exitRow = {
      id: nextId("EXIT"),
      type: "Exit",
      emp: emp.name,
      dept: empDept,
      grade: empDesig,
      exitDate,
      reason: exitReason,
      tenureMonths,
      attritionLoss: loss.total,
      lifetimeNet: roiAtExit.netToDate,
      wasManager: isMgr,
      successorAvailable: successors.length > 0,
      riskScoreAtExit: twin ? twin.risk.score : null,
      status: "Completed",
    };

    const exitLedger = ledgerRow({
      dept: empDept, category: "Attrition Loss", subCategory: exitReason, emp: emp.name,
      amount: loss.total,
      note: loss.heads.map(h => `${h.label} ${fmtINR(h.amount)}`).join(" · "),
    });

    const g = gradeEcon(empDesig);
    const vacancyRow = {
      id: nextId("VAC"),
      type: "Vacancy",
      dept: empDept,
      grade: empDesig,
      openedOn: exitDate,
      reason: `Backfill — ${exitReason}`,
      causedBy: `${emp.name} exited on ${exitDate}`,
      status: "Open",
      dailyLoss: Math.round(g.annualValue / 365),
      expectedDaysToFill: successors.length ? Math.min(12, g.daysToFill) : g.daysToFill,
      wasManagerSeat: isMgr,
    };

    steps.push({
      node: "attrition", op: "INSERT", edge: ["attrition", "emp_docs"], alert: true,
      text: `📉 Attrition booked — ${emp.name} (${empDesig}, ${empDept}) after ${tenureMonths} month(s). Modelled cost of this exit: ${fmtINR(loss.total)} — ${loss.heads.map(h => `${h.label} ${fmtINR(h.amount)}`).join(", ")}.`,
      row: exitRow,
    });
    steps.push({
      node: "finance_ledger", op: "INSERT", edge: ["finance_ledger", "budget"],
      text: `📒 Ledger: ${fmtINR(loss.total)} attrition loss charged to ${empDept}. Lifetime contribution of this employee to date: ${fmtINR(roiAtExit.netToDate)} (${roiAtExit.netToDate >= 0 ? "recovered their hiring investment" : "left before recovering the hiring investment"}).`,
      row: exitLedger,
    });
    steps.push({
      node: "attrition", op: "INSERT", edge: ["attrition", "budget"], alert: true,
      text: `🪑 Vacancy ${vacancyRow.id} opened — ${empDesig} seat in ${empDept} now empty. Carrying cost ${fmtINR(vacancyRow.dailyLoss)}/day of forgone output; expected ${vacancyRow.expectedDaysToFill} days to fill${successors.length ? " with an internal successor" : " via external hiring"}.`,
      row: vacancyRow,
    });

    const budgetUpdateExit = chargeBudget(empDept, loss.total);
    if (budgetUpdateExit) {
      steps.push({
        node: "budget", op: "UPDATE",
        text: `🏦 ${empDept} budget absorbs ${fmtINR(loss.total)} of attrition cost. Salary run-rate frees up ${fmtINR(roiAtExit.cost.total)}/yr, but the seat now produces nothing until refilled.`,
        row: budgetUpdateExit,
      });
    }

    // Succession: when a leader leaves, the strongest same-team candidate steps up.
    if (isMgr) {
      const heir = successors[0];
      if (heir) {
        const heirDesig = heir.emp.designation || heir.emp.desig;
        const actingRate = DESIGNATION_RATES[empDesig] || heir.emp.dailyRate;
        steps.push({
          node: "emp_docs", op: "UPDATE", edge: ["emp_docs", "attrition"], alert: true,
          text: `👑 Succession triggered — ${heir.emp.name} (${heirDesig}, appraisal "${ratingOf(heir.emp.name) || "unrated"}") is the closest-grade successor and takes charge of ${empDept} as Acting ${empDesig}. Leadership gap closed in ${vacancyRow.expectedDaysToFill} days instead of ${g.daysToFill}.`,
          row: { id: heir.emp.id, actingRole: `Acting ${empDesig} — ${empDept}`, successionFor: emp.name, actingSince: exitDate },
        });
        steps.push({
          node: "attrition", op: "SELECT",
          text: `🧭 Succession plan: confirm ${heir.emp.name} into the ${empDesig} grade from the Finance Control Tower to make the move permanent (run-rate impact ${fmtINR(Math.round((actingRate - (Number(heir.emp.dailyRate) || 0)) * 30 * 12 * (1 + STATUTORY_LOAD)))}/yr), or run an external search.`,
        });
      } else {
        steps.push({
          node: "attrition", op: "SELECT", alert: true,
          text: `⚠️ No internal successor found for the ${empDesig} seat in ${empDept} — no same-grade peer and no promotable junior with a clean appraisal. This department is now leaderless, which raises flight risk for everyone still in it.`,
        });
      }
    }

    await execute(steps);

    // Present the official Full & Final Settlement & No-Dues Statement
    setFfStatement({
      emp,
      exitDate,
      exitReason,
      dailyRate,
      exitDay: workedDays,
      calendarDays: wdInfo.totalCalendarDays,
      weekendDays: wdInfo.weekendDays,
      earnedWage,
      alBalance,
      leaveEncashment,
      empAssetsRecovered: empAssets.map(a => `${a.asset} (${a.code || a.id})`),
      empLoansCleared: empLoans.map(l => `${l.type} (Rs.${Number(String(l.amount || "0").replace(/[^\d]/g, '')).toLocaleString("en-IN")})`),
      totalLoanBalance,
      actualLoanRecovered,
      loanDeficit,
      grossSettlement,
      pf,
      tds,
      statutoryDeductions,
      netSettlement,
      refId: `FF-CLEAR-${Math.floor(100000 + Math.random() * 900000)}`,
      generatedAt: new Date().toLocaleTimeString()
    });
  }

  // ── Workforce Digital Twin & "What-If" Memos & Handlers ───────────────────────
  const activeEmpsList = useMemo(() => {
    return (db.emp_docs || []).filter(e => !e.status?.includes("Inactive"));
  }, [db.emp_docs]);



  /* ═══════════════════════════════════════════════════════════════════════════
     FINANCE CONTROL TOWER — DERIVED STATE
     Every number below is recomputed from the live tables. Nothing here is
     stored twice, so the twin can never drift out of sync with the HRMS.
     ═══════════════════════════════════════════════════════════════════════════ */

  const todayStr = getLocalDateStr();

  /** Latest appraisal rating on file for an employee, or null. */
  const ratingOf = useCallback((empName) => {
    const recs = (db.performance || []).filter(r => r.emp === empName);
    return recs.length ? recs[recs.length - 1].rating : null;
  }, [db.performance]);

  /** Employees currently away on an approved leave that spans today. */
  const onLeaveToday = useMemo(() => {
    return (db.attendance_leave || []).filter(r =>
      r.status === "Approved" && r.dates !== "Balance" && r.startDate && r.endDate &&
      r.startDate <= todayStr && r.endDate >= todayStr
    );
  }, [db.attendance_leave, todayStr]);

  const onLeaveNames = useMemo(() => new Set(onLeaveToday.map(r => r.emp)), [onLeaveToday]);

  /**
   * The heart of the twin: one fully-modelled record per active employee,
   * combining cost, value, flight risk and the price of losing them.
   */
  const workforceTwin = useMemo(() => {
    const active = (db.emp_docs || []).filter(e => !e.status?.includes("Inactive"));

    // Pre-compute department-level structural signals once.
    const deptStats = {};
    DEPT_POOL.forEach(d => {
      const staff = active.filter(e => (e.department === d || e.dept === d));
      const hasManager = staff.some(e => {
        const t = (e.designation || e.desig || "").toLowerCase();
        return t.includes("manager") || t.includes("director") || t.includes("lead");
      });
      const sanctioned = DEPT_BUDGET_PLAN[d]?.sanctioned || 0;
      deptStats[d] = {
        staff, hasManager, sanctioned,
        vacancyRate: sanctioned > 0 ? Math.max(0, (sanctioned - staff.length) / sanctioned) : 0,
      };
    });

    return active.map(emp => {
      const dept = emp.department || emp.dept;
      const desig = emp.designation || emp.desig || "Associate";
      const ds = deptStats[dept] || { staff: [], hasManager: true, vacancyRate: 0 };

      const roi = employeeROIModel(emp, todayStr);
      const rating = ratingOf(emp.name);

      // Assemble the live behavioural + structural signals for the risk model.
      const recentCutoff = getLocalDateStr(new Date(Date.now() - 90 * 86400000));
      const recentLeaveDays = (db.attendance_leave || [])
        .filter(r => r.emp === emp.name && r.dates !== "Balance" && r.status === "Approved" &&
          r.startDate && r.startDate >= recentCutoff)
        .reduce((s, r) => s + (Number(r.days) || daysBetween(r.startDate, r.endDate) + 1), 0);

      const openTickets = (db.ess || []).filter(r => r.emp === emp.name &&
        (r.status?.includes("Pending") || r.status?.includes("Open") || r.status?.includes("Escalated"))).length;

      const hasActiveLoan = (db.loans || []).some(l => l.emp === emp.name && l.status?.includes("Active"));
      const awardsCount = (db.comp_incentives || []).filter(a => a.emp === emp.name && (a.type === "Award" || a.category?.includes("Award") || a.subType?.includes("Award"))).length;

      const bandRate = DESIGNATION_RATES[desig] || 1000;
      const compaRatio = bandRate > 0 ? (Number(emp.dailyRate) || bandRate) / bandRate : 1;

      // Months since the last grade change — falls back to tenure if never promoted.
      const monthsSinceGradeChange = (emp.monthsSinceLastPromotion !== undefined && emp.monthsSinceLastPromotion !== null)
        ? Number(emp.monthsSinceLastPromotion)
        : emp.lastGradeChange
          ? monthsBetween(emp.lastGradeChange, todayStr)
          : roi.tenureMonths;

      const risk = flightRiskModel({
        tenureMonths: roi.tenureMonths,
        monthsSinceGradeChange,
        compaRatio,
        rating,
        awardsCount,
        recentLeaveDays,
        openTickets,
        hasActiveLoan,
        deptHasManager: ds.hasManager,
        deptVacancyRate: ds.vacancyRate,
        onNotice: !!emp.status?.includes("Notice Period"),
        attritionShock: scenario.attritionShockPct || 0,
      });

      const isManager = /manager|director|lead/i.test(desig);
      const successors = findReplacementCandidates(emp, active, ratingOf);
      const loss = attritionLossModel(emp, {
        tenureMonths: roi.tenureMonths,
        isManager,
        teamSize: Math.max(0, ds.staff.length - 1),
        internalSuccessor: successors.length > 0,
      });

      // Expected (probability-weighted) loss is what belongs in a risk provision.
      const expectedLoss = Math.round((loss.total * risk.score) / 100);

      return {
        emp, dept, desig, roi, risk, loss, successors, isManager, rating,
        compaRatio, monthsSinceGradeChange, expectedLoss,
        onLeave: onLeaveNames.has(emp.name),
        onNotice: !!emp.status?.includes("Notice Period"),
      };
    });
  }, [db.emp_docs, db.performance, db.attendance_leave, db.ess, db.loans, db.comp_incentives, todayStr, ratingOf, onLeaveNames, scenario.attritionShockPct]);

  const twinByEmpId = useMemo(
    () => Object.fromEntries(workforceTwin.map(t => [t.emp.id, t])),
    [workforceTwin]
  );

  /** Open vacancies raised by exits or transfers and not yet filled. */
  const openVacancies = useMemo(() => {
    return (db.attrition || [])
      .filter(r => r.type === "Vacancy" && r.status === "Open")
      .map(v => ({
        ...v,
        daysOpen: daysBetween(v.openedOn, todayStr),
        cumulativeLoss: Math.round((Number(v.dailyLoss) || 0) * daysBetween(v.openedOn, todayStr)),
      }));
  }, [db.attrition, todayStr]);

  /**
   * Department budget ledger. Committed = annualised run-rate of people actually
   * on the books today. Spent = one-time charges already booked this year.
   */
  const budgetModel = useMemo(() => {
    const rows = (db.budget || []).length ? db.budget : seedBudgetRows();
    return rows.map(b => {
      const twins = workforceTwin.filter(t => t.dept === b.dept);
      const headcount = twins.length;
      const committed = twins.reduce((s, t) => s + t.roi.cost.total, 0);
      const oneTimeSpent = Number(b.oneTimeSpent) || 0;
      const totalCommitted = committed + oneTimeSpent;
      const available = b.annualBudget - totalCommitted;
      const utilisation = b.annualBudget > 0 ? totalCommitted / b.annualBudget : 0;

      const vacant = Math.max(0, b.sanctioned - headcount);
      const deptVacancies = openVacancies.filter(v => v.dept === b.dept);
      const annualValue = twins.reduce((s, t) => s + t.roi.annualValue, 0);
      const netPL = annualValue - totalCommitted;
      const expectedAttritionLoss = twins.reduce((s, t) => s + t.expectedLoss, 0);

      let status = "Within Budget";
      if (utilisation > 1) status = "Over Budget";
      else if (utilisation > 0.9) status = "Near Ceiling";
      else if (headcount > b.sanctioned) status = "Headcount Breach";

      return {
        ...b, headcount, vacant, committed, oneTimeSpent, totalCommitted,
        available, utilisation, annualValue, netPL, status,
        onLeave: twins.filter(t => t.onLeave).length,
        onNotice: twins.filter(t => t.onNotice).length,
        openVacancyCount: deptVacancies.length,
        expectedAttritionLoss,
        atRisk: twins.filter(t => t.risk.score >= 55).length,
      };
    });
  }, [db.budget, workforceTwin, openVacancies]);

  const budgetByDept = useMemo(
    () => Object.fromEntries(budgetModel.map(b => [b.dept, b])),
    [budgetModel]
  );

  /** Company-wide KPI roll-up shown in the control tower header strip. */
  const workforceKPIs = useMemo(() => {
    const totalSanctioned = budgetModel.reduce((s, b) => s + b.sanctioned, 0);
    const headcount = workforceTwin.length;
    const totalBudget = budgetModel.reduce((s, b) => s + b.annualBudget, 0);
    const totalCommitted = budgetModel.reduce((s, b) => s + b.totalCommitted, 0);
    const totalValue = budgetModel.reduce((s, b) => s + b.annualValue, 0);
    const exits = (db.attrition || []).filter(r => r.type === "Exit");
    const avgHeadcount = Math.max(1, (headcount + exits.length) / 2);

    return {
      headcount,
      totalSanctioned,
      vacant: Math.max(0, totalSanctioned - headcount),
      openVacancies: openVacancies.length,
      onLeave: workforceTwin.filter(t => t.onLeave).length,
      onNotice: workforceTwin.filter(t => t.onNotice).length,
      atRisk: workforceTwin.filter(t => t.risk.score >= 55 && !t.onNotice).length,
      totalBudget,
      totalCommitted,
      available: totalBudget - totalCommitted,
      utilisation: totalBudget > 0 ? totalCommitted / totalBudget : 0,
      totalValue,
      netPL: totalValue - totalCommitted,
      profitable: workforceTwin.filter(t => t.roi.steadyMargin > 0).length,
      lossMaking: workforceTwin.filter(t => t.roi.steadyMargin <= 0).length,
      exitCount: exits.length,
      attritionRate: exits.length / avgHeadcount,
      attritionLossBooked: exits.reduce((s, r) => s + (Number(r.attritionLoss) || 0), 0),
      retentionSpend: (db.finance_ledger || [])
        .filter(r => r.category === "Retention")
        .reduce((s, r) => s + (Number(r.amount) || 0), 0),
      expectedLossProvision: workforceTwin.reduce((s, t) => s + t.expectedLoss, 0),
    };
  }, [budgetModel, workforceTwin, openVacancies, db.attrition, db.finance_ledger]);

  /** Flight-risk watchlist, worst first — the accountant's intervention queue. */
  const riskRegister = useMemo(() => {
    return [...workforceTwin]
      .filter(t => !t.onNotice)
      .sort((a, b) => b.expectedLoss - a.expectedLoss || b.risk.score - a.risk.score);
  }, [workforceTwin]);

  /* ── What-if scenario engine ──────────────────────────────────────────────
     Projects the same model forward under changed assumptions without ever
     touching the real tables. This is the "test before you commit" use case. */
  const scenarioResult = useMemo(() => {
    const base = {
      headcount: workforceKPIs.headcount,
      cost: workforceKPIs.totalCommitted,
      value: workforceKPIs.totalValue,
      netPL: workforceKPIs.netPL,
      expectedLoss: workforceKPIs.expectedLossProvision,
    };

    const hikeFactor = 1 + (scenario.blanketHikePct / 100);
    let projCost = 0, projValue = 0, projExpectedLoss = 0, projHeadcount = 0, retentionSpend = 0;

    workforceTwin.forEach(t => {
      // A blanket hike lifts salary + statutory, but lowers flight risk.
      const salaryPart = t.roi.cost.baseSalary * hikeFactor;
      const newCost = salaryPart * (1 + STATUTORY_LOAD) + t.roi.cost.overhead;
      retentionSpend += newCost - t.roi.cost.total;

      // Each 5% of hike is modelled as ~9 points of risk relief.
      const riskRelief = (scenario.blanketHikePct / 5) * 9;
      let projRisk = Math.max(3, t.risk.score - riskRelief + scenario.attritionShockPct);
      if (scenario.retainCriticalOnly && t.isManager) projRisk = Math.max(3, projRisk - 8);
      projRisk = Math.min(99, projRisk);

      projCost += newCost;
      projValue += t.roi.annualValue;
      projExpectedLoss += (t.loss.total * projRisk) / 100;
      projHeadcount += 1;
    });

    // A hiring freeze leaves every vacant seat unfilled — output never arrives.
    let frozenOutputLoss = 0;
    if (scenario.hiringFreeze) {
      budgetModel.forEach(b => {
        if (b.vacant > 0) {
          // Value a vacant seat at the department's average annual value per head.
          const perHead = b.headcount > 0 ? b.annualValue / b.headcount : 1200000;
          frozenOutputLoss += perHead * b.vacant;
        }
      });
    }

    const projNetPL = projValue - projCost - projExpectedLoss - frozenOutputLoss;
    const baseNetPL = base.value - base.cost - base.expectedLoss;

    return {
      base: { ...base, netPLWithRisk: baseNetPL },
      projected: {
        headcount: projHeadcount,
        cost: Math.round(projCost),
        value: Math.round(projValue),
        expectedLoss: Math.round(projExpectedLoss),
        retentionSpend: Math.round(retentionSpend),
        frozenOutputLoss: Math.round(frozenOutputLoss),
        netPL: Math.round(projNetPL),
      },
      delta: Math.round(projNetPL - baseNetPL),
      riskAverted: Math.round(base.expectedLoss - projExpectedLoss),
    };
  }, [workforceTwin, workforceKPIs, budgetModel, scenario]);

  /* ═══════════════════════════════════════════════════════════════════════════
     FINANCE CONTROL TOWER — ACTIONS
     ═══════════════════════════════════════════════════════════════════════════ */

  /** Builds a ledger row. Every rupee that moves gets one of these. */
  function ledgerRow({ dept, category, subCategory, emp, amount, note }) {
    return {
      id: nextId("FIN"),
      date: getLocalDateStr(),
      dept, category, subCategory,
      emp: emp || "—",
      amount: Math.round(amount),
      note: note || "",
      approvedBy: "Accountant / Finance Control",
    };
  }

  /** Charges a one-time amount against a department's annual envelope. */
  function chargeBudget(dept, amount) {
    const row = (db.budget || []).find(b => b.dept === dept);
    if (!row) return null;
    const oneTimeSpent = (Number(row.oneTimeSpent) || 0) + Math.round(amount);
    return { id: row.id, oneTimeSpent };
  }

  /**
   * The budget gate HR must clear before a hire is allowed. Checks both the
   * sanctioned-headcount ceiling and the money envelope, and reports whether
   * the hire pays for itself.
   */
  function evaluateHire(dept, designation) {
    const b = budgetByDept[dept];
    const onboarding = onboardingCostModel(designation);
    const probe = { designation, dailyRate: DESIGNATION_RATES[designation] || 1000, joined: todayStr };
    const roi = employeeROIModel(probe, todayStr);

    if (!b) {
      return { allowed: true, onboarding, roi, reasons: [], budget: null, firstYearDraw: onboarding.total + roi.cost.total };
    }

    const firstYearDraw = onboarding.total + roi.cost.total;
    const reasons = [];
    let allowed = true;

    // An open vacancy means the seat was already budgeted for — a backfill does
    // not breach the ceiling even though headcount is momentarily short.
    if (b.headcount >= b.sanctioned) {
      allowed = false;
      reasons.push(`Headcount ceiling reached — ${b.dept} is sanctioned for ${b.sanctioned} and already carries ${b.headcount}. Finance must revise the sanctioned strength before this hire.`);
    }
    if (firstYearDraw > b.available) {
      allowed = false;
      reasons.push(`Insufficient budget — ${b.dept} has ${fmtINR(b.available)} uncommitted but this ${designation} draws ${fmtINR(firstYearDraw)} in year one (${fmtINR(onboarding.total)} one-time + ${fmtINR(roi.cost.total)} run-rate).`);
    }

    const warnings = [];
    if (allowed && roi.steadyMargin <= 0) {
      warnings.push(`This grade is loss-making at plan: annual cost ${fmtINR(roi.cost.total)} exceeds modelled output ${fmtINR(roi.annualValue)}.`);
    }
    if (allowed && firstYearDraw > b.available * 0.6) {
      warnings.push(`This single hire consumes ${Math.round((firstYearDraw / b.available) * 100)}% of the department's remaining budget.`);
    }

    return { allowed, reasons, warnings, onboarding, roi, budget: b, firstYearDraw };
  }

  /** Opens the retention decision desk for one at-risk employee. */
  function actionRetention(empId) {
    const t = twinByEmpId[empId] || riskRegister[0];
    if (!t) { pushLog("WARN", "attrition", "No active employees available for a retention review."); return; }
    const offers = RETENTION_LEVERS.map(l => retentionOfferModel(t.emp, l, t.risk.score, t.loss.total, t.rating));
    const best = offers.filter(o => o.netBenefit > 0 && !o.ineligible).sort((a, b) => b.netBenefit - a.netBenefit)[0];
    setModal({
      type: "retention",
      empId: t.emp.id,
      leverKey: best ? best.lever.key : "retention_hike",
    });
  }

  /** Commits a retention package: raises pay/grade, books the cost, logs the call. */
  async function confirmRetention() {
    const t = twinByEmpId[modal.empId];
    if (!t) { setModal(null); return; }
    const lever = RETENTION_LEVERS.find(l => l.key === modal.leverKey) || RETENTION_LEVERS[1];
    const offer = retentionOfferModel(t.emp, lever, t.risk.score, t.loss.total, t.rating);
    const b = budgetByDept[t.dept];

    // Finance gate: a retention package is still a budget draw.
    if (b && offer.yearOneCost > b.available) {
      pushLog("WARN", "budget", `Retention package for ${t.emp.name} rejected — ${fmtINR(offer.yearOneCost)} required but ${t.dept} has only ${fmtINR(b.available)} uncommitted. Escalate for a budget revision or proceed to backfill.`);
      setModal(null);
      return;
    }
    if (lever.requiresAppraisal && !t.rating) {
      pushLog("WARN", "performance", `Promotion-based retention blocked for ${t.emp.name} — no appraisal on file. Log an appraisal cycle first, or use a retention hike instead.`);
      setModal(null);
      return;
    }

    setModal(null);

    const empUpdate = {
      id: t.emp.id,
      dailyRate: offer.newRate,
      designation: offer.newDesignation,
      lastGradeChange: todayStr,
      retentionApplied: lever.label,
    };

    const attritionRow = {
      id: nextId("RET"),
      type: "Retention",
      emp: t.emp.name,
      dept: t.dept,
      grade: offer.newDesignation,
      date: todayStr,
      lever: lever.label,
      riskBefore: t.risk.score,
      riskAfter: offer.residualRisk,
      cost: offer.yearOneCost,
      lossAverted: offer.expectedSaving,
      netBenefit: offer.netBenefit,
      status: "Package Accepted",
      topDriver: t.risk.drivers[0]?.label || "—",
    };

    const fin = ledgerRow({
      dept: t.dept, category: "Retention", subCategory: lever.label, emp: t.emp.name,
      amount: offer.yearOneCost,
      note: `Flight risk ${t.risk.score}→${offer.residualRisk}. Modelled exit loss ${fmtINR(t.loss.total)}; expected saving ${fmtINR(offer.expectedSaving)}; net benefit ${fmtINR(offer.netBenefit)}.`,
    });

    const budgetUpdate = chargeBudget(t.dept, offer.yearOneCost);

    const steps = [
      {
        node: "attrition", op: "SELECT", edge: ["attrition", "emp_docs"],
        text: `🔍 Retention review — ${t.emp.name} (${t.desig}, ${t.dept}) flagged at ${t.risk.score}/100 flight risk. Primary driver: ${t.risk.drivers[0]?.label || "n/a"}. Modelled cost of losing them: ${fmtINR(t.loss.total)}.`
      },
      {
        node: "attrition", op: "INSERT", edge: ["attrition", "finance_ledger"],
        text: `🤝 Retention package approved — ${lever.label} (${lever.detail}) for ${t.emp.name}. Risk ${t.risk.score} → ${offer.residualRisk}.`, row: attritionRow, alert: true
      },
      {
        node: "emp_docs", op: "UPDATE", edge: ["emp_docs", "payroll"],
        text: `💰 ${t.emp.name} revised: ${t.desig} Rs.${Number(t.emp.dailyRate || 0).toLocaleString("en-IN")}/d → ${offer.newDesignation} ${fmtINR(offer.newRate)}/d. Payroll run-rate updated from next cycle.`, row: empUpdate
      },
      {
        node: "finance_ledger", op: "INSERT", edge: ["finance_ledger", "budget"],
        text: `📒 Ledger: ${fmtINR(offer.yearOneCost)} booked to ${t.dept} under Retention. Avoids a modelled ${fmtINR(offer.expectedSaving)} probability-weighted attrition loss — net ${offer.netBenefit >= 0 ? "gain" : "cost"} ${fmtINR(Math.abs(offer.netBenefit))}.`, row: fin
      },
    ];
    if (budgetUpdate) {
      steps.push({
        node: "budget", op: "UPDATE",
        text: `🏦 ${t.dept} budget envelope drawn down by ${fmtINR(offer.yearOneCost)}. Remaining uncommitted: ${fmtINR((b?.available || 0) - offer.yearOneCost)}.`, row: budgetUpdate
      });
    }
    await execute(steps);
  }

  /** Opens the vacancy fill desk — internal succession vs external hire. */
  function actionFillVacancy(vacancyId) {
    const v = openVacancies.find(x => x.id === vacancyId) || openVacancies[0];
    if (!v) { pushLog("WARN", "attrition", "No open vacancies to fill."); return; }
    const active = (db.emp_docs || []).filter(e => !e.status?.includes("Inactive"));
    const probe = { id: "__vacancy__", designation: v.grade, department: v.dept, dept: v.dept };
    const candidates = findReplacementCandidates(probe, active, ratingOf);
    setModal({
      type: "fill_vacancy",
      vacancyId: v.id,
      fillMode: candidates.length ? "internal" : "external",
      candidateId: candidates[0]?.emp.id || "",
    });
  }

  /** Commits a vacancy fill. Internal moves cascade a new, lower-grade vacancy. */
  async function confirmFillVacancy() {
    const v = openVacancies.find(x => x.id === modal.vacancyId);
    if (!v) { setModal(null); return; }
    const mode = modal.fillMode;
    setModal(null);

    if (mode === "internal") {
      const cand = (db.emp_docs || []).find(e => e.id === modal.candidateId);
      if (!cand) { pushLog("WARN", "attrition", "Selected internal candidate is no longer available."); return; }
      const candDesig = cand.designation || cand.desig;
      const candDept = cand.department || cand.dept;
      const isPromotion = gradeRank(v.grade) > gradeRank(candDesig);
      const newRate = DESIGNATION_RATES[v.grade] || cand.dailyRate;
      const deltaCost = Math.round(((newRate - (Number(cand.dailyRate) || 0)) * 30 * 12) * (1 + STATUTORY_LOAD));

      const empUpdate = {
        id: cand.id,
        designation: v.grade,
        department: v.dept,
        dept: v.dept,
        dailyRate: newRate,
        lastGradeChange: todayStr,
      };

      const fin = ledgerRow({
        dept: v.dept, category: "Succession", subCategory: isPromotion ? "Internal Promotion" : "Lateral Cover",
        emp: cand.name, amount: Math.max(0, deltaCost),
        note: `Filled ${v.grade} vacancy internally. Avoided ${fmtINR(onboardingCostModel(v.grade).total)} of external onboarding cost and ${v.daysOpen > 0 ? v.daysOpen : 0} further days of vacancy loss.`,
      });

      const vacancyClose = {
        id: v.id, status: "Filled (Internal)", filledOn: todayStr, filledBy: cand.name,
        fillMode: isPromotion ? "Internal Promotion" : "Lateral Cover",
        realisedLoss: v.cumulativeLoss,
      };

      const steps = [
        {
          node: "attrition", op: "SELECT", edge: ["attrition", "emp_docs"],
          text: `🔎 Succession search for the ${v.grade} vacancy in ${v.dept} — ${cand.name} (${candDesig}, ${candDept}) identified as the closest-grade internal match.`
        },
        {
          node: "emp_docs", op: "UPDATE", edge: ["emp_docs", "payroll"],
          text: `⬆️ ${cand.name} ${isPromotion ? `promoted ${candDesig} → ${v.grade}` : `moved into the ${v.grade} seat`} in ${v.dept}. Run-rate impact ${fmtINR(deltaCost)}/yr versus ${fmtINR(onboardingCostModel(v.grade).total)} to hire externally.`, row: empUpdate, alert: true
        },
        {
          node: "attrition", op: "UPDATE", edge: ["attrition", "finance_ledger"],
          text: `✅ Vacancy ${v.id} closed internally after ${v.daysOpen} day(s). Realised output loss during the gap: ${fmtINR(v.cumulativeLoss)}.`, row: vacancyClose
        },
        {
          node: "finance_ledger", op: "INSERT", edge: ["finance_ledger", "budget"],
          text: `📒 Ledger: ${fmtINR(Math.max(0, deltaCost))} booked to ${v.dept} under Succession.`, row: fin
        },
      ];

      // A promotion empties the seat the successor just left — the cascade.
      if (isPromotion) {
        const g = gradeEcon(candDesig);
        const cascade = {
          id: nextId("VAC"),
          type: "Vacancy",
          dept: candDept,
          grade: candDesig,
          openedOn: todayStr,
          reason: "Backfill — internal promotion cascade",
          causedBy: `${cand.name} promoted into ${v.grade}`,
          status: "Open",
          dailyLoss: Math.round(g.annualValue / 365),
          expectedDaysToFill: g.daysToFill,
        };
        steps.push({
          node: "attrition", op: "INSERT", edge: ["attrition", "budget"],
          text: `🔁 Cascade: promoting ${cand.name} opens a new ${candDesig} vacancy in ${candDept}. Carrying cost ${fmtINR(cascade.dailyLoss)}/day until filled.`, row: cascade, alert: true
        });
      }

      const budgetUpdate = chargeBudget(v.dept, Math.max(0, deltaCost));
      if (budgetUpdate) {
        steps.push({
          node: "budget", op: "UPDATE",
          text: `🏦 ${v.dept} envelope adjusted for the internal move.`, row: budgetUpdate
        });
      }
      await execute(steps);
      return;
    }

    // External hire route — hand off to the budget-gated onboarding form.
    setEmpFormName("");
    setEmpFormDept(v.dept);
    setEmpFormDesig(v.grade);
    setShowEmpForm(true);
    pushLog("SELECT", "attrition", `🧾 External backfill selected for vacancy ${v.id} (${v.grade} · ${v.dept}). Onboarding cost ${fmtINR(onboardingCostModel(v.grade).total)} will be budget-checked before the hire is allowed.`);
  }

  /** Opens the accountant's budget revision desk for one department. */
  function actionReviseBudget(deptName) {
    const b = budgetByDept[deptName] || budgetModel[0];
    if (!b) { pushLog("WARN", "budget", "No budget control rows available."); return; }
    setModal({
      type: "revise_budget",
      dept: b.dept,
      sanctioned: b.sanctioned,
      annualBudget: b.annualBudget,
    });
  }

  /** Commits a revised sanctioned strength / annual envelope. */
  async function confirmReviseBudget() {
    const b = budgetByDept[modal.dept];
    if (!b) { setModal(null); return; }
    const newSanctioned = Math.max(0, parseInt(modal.sanctioned, 10) || 0);
    const newBudget = Math.max(0, Math.round(Number(modal.annualBudget) || 0));
    setModal(null);

    if (newBudget < b.totalCommitted) {
      pushLog("WARN", "budget", `Budget revision rejected — ${b.dept} already has ${fmtINR(b.totalCommitted)} committed against live headcount and booked costs. The envelope cannot be cut below what is already spent.`);
      return;
    }
    if (newSanctioned < b.headcount) {
      pushLog("WARN", "budget", `Sanctioned strength cannot drop to ${newSanctioned} — ${b.dept} currently carries ${b.headcount} active employees. Offboard or redeploy first, then reduce the ceiling.`);
      return;
    }

    const existingBudgetRow = (db.budget || []).find(r => r.id === b.id) || b;
    const row = { ...existingBudgetRow, sanctioned: newSanctioned, annualBudget: newBudget };
    const fin = ledgerRow({
      dept: b.dept, category: "Budget Revision", subCategory: "Plan Amendment", emp: "—",
      amount: newBudget - b.annualBudget,
      note: `Sanctioned strength ${b.sanctioned} → ${newSanctioned}; envelope ${fmtINR(b.annualBudget)} → ${fmtINR(newBudget)}.`,
    });

    await execute([
      {
        node: "budget", op: "UPDATE", alert: true,
        text: `🏦 Budget revised for ${b.dept}: headcount ceiling ${b.sanctioned} → ${newSanctioned}, annual envelope ${fmtINR(b.annualBudget)} → ${fmtINR(newBudget)}. Uncommitted funds now ${fmtINR(newBudget - b.totalCommitted)}.`, row
      },
      {
        node: "finance_ledger", op: "INSERT", edge: ["finance_ledger", "budget"],
        text: `📒 Plan amendment recorded against ${b.dept}.`, row: fin
      },
    ]);
  }

  const ACTIONS = [
    { key: "add_emp", label: "Add Employee", run: actionAddEmployee, modId: "emp_docs", role: "HR" },
    { key: "mobility", label: "Internal Mobility", run: () => actionMobility("promote"), modId: "emp_docs", role: "HR" },
    { key: "offboard", label: "Offboard Employee", run: actionOffboard, modId: "emp_docs", role: "HR" },
    { key: "mark_att", label: "Mark Attendance", run: actionMarkAttendance, modId: "attendance_leave", role: "EMP" },
    { key: "apply_lv", label: "Apply Leave", run: actionApplyLeave, modId: "attendance_leave", role: "EMP" },
    { key: "log_perf", label: "Log Appraisal", run: actionLogAppraisal, modId: "performance", role: "HR" },
    { key: "manage_ast", label: "Manage Assets", run: () => actionManageAssets("allocate"), modId: "assets", role: "HR" },
    { key: "loan_req", label: "Apply for Loan", run: actionApplyLoan, modId: "loans", role: "EMP" },
    { key: "comp_inc", label: "Comp & Incentives", run: () => actionCompIncentives(), modId: "comp_incentives", role: "HR" },
    { key: "payroll", label: "Run Payroll", run: actionRunPayroll, modId: "payroll", role: "HR" },
    { key: "ess", label: "ESS Request", run: actionESS, modId: "ess", role: "EMP" },
    { key: "retention", label: "Retention Desk", run: () => actionRetention(riskRegister[0]?.emp.id), modId: "attrition", role: "FIN" },
    { key: "budget_rev", label: "Revise Budget", run: actionReviseBudget, modId: "budget", role: "FIN" },
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
      await fetch(`${API_BASE}/api/modules`, {
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

    fetch(`${API_BASE}/api/modules/${moduleId}`, {
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
      await fetch(`${API_BASE}/api/reset`, { method: 'DELETE' });
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
    // Restore the accountant's opening budget plan so the finance twin has a
    // clean envelope to model against after a reset.
    setDb(prev => ({ ...prev, budget: seedBudgetRows() }));
    setFinTab("overview");
    setExpandedRisk(null);
    setScenario({ hiringFreeze: false, blanketHikePct: 0, attritionShockPct: 0, retainCriticalOnly: true });

    setLog([{ id: 0, time: new Date().toTimeString().slice(0, 8), op: "SYSTEM", table: "—", text: "Simulation reset. Custom modules deactivated (data preserved). Department budgets restored to the sanctioned opening plan." }]);
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
          <select
            value={simRole}
            onChange={(e) => {
              setSimRole(e.target.value);
              setInspectRecord(null);
            }}
            className="btn"
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", outline: "none",
              borderColor: simRole === "SUPERADMIN" ? "rgba(239,68,68,0.5)" : simRole === "HR" ? "rgba(125,211,252,0.4)" : simRole === "FIN" ? "rgba(245,165,36,0.5)" : "rgba(242,184,75,0.4)",
              color: simRole === "SUPERADMIN" ? "#EF4444" : simRole === "HR" ? "#7DD3FC" : simRole === "FIN" ? "#F5A524" : "#F2B84B",
              background: "#101828",
              cursor: "pointer"
            }}
          >
            <option value="EMP">ROLE: EMPLOYEE</option>
            <option value="HR">ROLE: HR ADMIN</option>
            <option value="FIN">ROLE: ACCOUNTANT</option>
            <option value="SUPERADMIN">ROLE: SUPERADMIN</option>
          </select>
          {hrViewEnabled && (
            <button className="btn" onClick={() => setShowNotifications(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                borderColor: pendingCount > 0 ? "rgba(242,184,75,0.8)" : "rgba(255,255,255,0.18)",
                color: pendingCount > 0 ? "#F2D9A6" : "#7C93AA",
                background: pendingCount > 0 ? "rgba(242,184,75,0.14)" : "transparent",
                boxShadow: pendingCount > 0 ? "0 0 10px rgba(242,184,75,0.25)" : "none"
              }}>
              <Bell size={14} color={pendingCount > 0 ? "#F2B84B" : "#7C93AA"} />
              <span>APPROVALS</span>
              {pendingCount > 0 && (
                <span style={{
                  background: "#F2B84B", color: "#0A0F1A", fontSize: 10, fontWeight: 700,
                  borderRadius: 10, padding: "1px 6px", lineHeight: "14px"
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          )}
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

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, padding: 16 }}>
        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Graph */}
          <div className="grid-bg" style={{ position: "relative", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, background: "#0D1420", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "absolute", top: 10, left: 12, right: 12, zIndex: 10 }}>
              <div style={{ display: "flex", gap: 16 }}>
                <div
                  className="mono"
                  onClick={() => setLeftPanelView("dependencies")}
                  style={{ cursor: "pointer", fontSize: 10, color: leftPanelView === "dependencies" ? "#4FD1C5" : "#5C7891", letterSpacing: "0.1em", borderBottom: leftPanelView === "dependencies" ? "1px solid #4FD1C5" : "none", paddingBottom: 2, transition: "all 0.2s" }}
                >
                  DEPENDENCY GRAPH
                </div>
                <div
                  className="mono"
                  onClick={() => setLeftPanelView("org_chart")}
                  style={{ cursor: "pointer", fontSize: 10, color: leftPanelView === "org_chart" ? "#4FD1C5" : "#5C7891", letterSpacing: "0.1em", borderBottom: leftPanelView === "org_chart" ? "1px solid #4FD1C5" : "none", paddingBottom: 2, transition: "all 0.2s" }}
                >
                  ORG CHART
                </div>
              </div>
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
            {leftPanelView === "dependencies" ? (
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

                  // Adaptive edge path routing for same-layer siblings vs cross-layer flows
                  let edgePath = "";
                  const isSameLayer = Math.abs(s.y - t.y) < 25;
                  if (isSameLayer) {
                    if (s.x < t.x) {
                      const startX = s.x + 72;
                      const startY = s.y;
                      const endX = t.x - 72;
                      const endY = t.y;
                      const dx = endX - startX;
                      edgePath = `M ${startX} ${startY} C ${startX + dx * 0.35} ${startY - 25}, ${endX - dx * 0.35} ${endY - 25}, ${endX} ${endY}`;
                    } else {
                      const startX = s.x - 72;
                      const startY = s.y;
                      const endX = t.x + 72;
                      const endY = t.y;
                      const dx = startX - endX;
                      edgePath = `M ${startX} ${startY} C ${startX - dx * 0.35} ${startY - 25}, ${endX + dx * 0.35} ${endY - 25}, ${endX} ${endY}`;
                    }
                  } else if (s.y > t.y) {
                    const midY = (s.y + t.y) / 2;
                    edgePath = `M ${s.x} ${s.y - 26} C ${s.x} ${midY}, ${t.x} ${midY}, ${t.x} ${t.y + 26}`;
                  } else {
                    const midY = (s.y + t.y) / 2;
                    edgePath = `M ${s.x} ${s.y + 26} C ${s.x} ${midY}, ${t.x} ${midY}, ${t.x} ${t.y - 26}`;
                  }

                  return (
                    <g key={i}>
                      <path d={edgePath}
                        fill="none" stroke={active ? (hlAlert ? "#EF4444" : "#F2B84B") : "rgba(79,209,197,0.32)"}
                        strokeWidth={active ? 2.4 : 1.4}
                        markerEnd={active ? (hlAlert ? "url(#arrowAlert)" : "url(#arrowActive)") : "url(#arrow)"}
                      />
                      {active && (
                        <path d={edgePath}
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
            ) : (
              <OrgChart db={db} gradeRank={gradeRank} />
            )}
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 7 }}>
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
                      if (a.role === "FIN" && !financeView) {
                        pushLog("WARN", "system", `🔒 SECURITY ALERT: Access Denied. '${a.label}' is restricted to the Accountant / Finance Controller role.`);
                        setHlAlert(true);
                        setHlNodes(new Set([a.modId]));
                        setTimeout(() => { setHlAlert(false); setHlNodes(new Set()); }, 1500);
                        return;
                      }
                      a.run();
                    }}
                    style={{
                      padding: "8px 6px",
                      fontSize: 11,
                      textAlign: "center",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      ...(isDeactivated
                        ? { opacity: 0.4, cursor: "not-allowed" }
                        : ((a.role === "HR" && !hrViewEnabled) || (a.role === "FIN" && !financeView)
                          ? { opacity: 0.5, borderStyle: "dashed" }
                          : {})),
                      ...(a.role === "FIN" && financeView ? { borderColor: "rgba(245,165,36,0.5)", color: "#F5A524" } : {})
                    }}>
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
                  style={{ padding: "8px 6px", fontSize: 11, textAlign: "center", borderColor: "rgba(242,107,107,0.35)", color: "#F2B8B8", opacity: !hrViewEnabled ? 0.5 : 1, borderStyle: !hrViewEnabled ? "dashed" : "solid", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  + {m.name}
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

          {/* DB SUMMARY & LIVE SYNC MONITOR */}
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, background: "#0D1420", padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Database size={14} color="#D8A6F2" />
                <span className="mono" style={{ fontSize: 10.5, color: "#DCE6F2", fontWeight: 700, letterSpacing: "0.08em" }}>
                  POSTGRESQL STORAGE
                </span>
              </div>
              <span className="mono" style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 10, background: dbStatus === "synced" ? "rgba(140,233,154,0.12)" : "rgba(125,211,252,0.12)", color: dbStatus === "synced" ? "#8CE99A" : "#7DD3FC", border: dbStatus === "synced" ? "1px solid rgba(140,233,154,0.3)" : "1px solid rgba(125,211,252,0.3)", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: dbStatus === "synced" ? "#8CE99A" : "#7DD3FC" }}></span>
                hrms_records
              </span>
            </div>

            <div className="mono" style={{ fontSize: 10, color: "#7C93AA", marginBottom: 12, lineHeight: 1.4 }}>
              All 11 modules and ESS self-service transactions commit live to PostgreSQL. Full audit trail, issue details, and approval stages are consolidated in the Master Explorer below.
            </div>

            {/* Active Table Chips with Row Counts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
              {modules.filter(m => m.active).map(m => {
                const rows = db[m.id] || [];
                const color = COLORS[m.id] || CUSTOM_PALETTE[m.name.length % CUSTOM_PALETTE.length];
                const isFlashing = hlNodes.has(m.id);

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      if (!hrViewEnabled) setHrViewEnabled(true);
                      setDbTab(m.id);
                      setIsDbExplorerExpanded(true);
                      setTimeout(() => {
                        const el = document.getElementById("master-records-explorer");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }, 50);
                    }}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px",
                      background: isFlashing ? "rgba(242,184,75,0.15)" : "rgba(255,255,255,0.02)",
                      border: isFlashing ? "1px solid #F2B84B" : "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 4, cursor: "pointer", transition: "all 0.15s ease"
                    }}
                    className="mono"
                    title={`View detailed ${m.name} records in explorer below`}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }}></span>
                      <span style={{ fontSize: 10, color: isFlashing ? "#F2B84B" : "#DCE6F2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.table}
                      </span>
                    </div>
                    <span style={{ fontSize: 9.5, color: color, fontWeight: 700, marginLeft: 4 }}>
                      {rows.length}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick Action Button */}
            <button
              onClick={() => {
                if (!hrViewEnabled) setHrViewEnabled(true);
                setDbTab("ess");
                setIsDbExplorerExpanded(true);
                setTimeout(() => {
                  const el = document.getElementById("master-records-explorer");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }, 50);
              }}
              className="mono"
              style={{
                width: "100%", padding: "8px 12px", background: "rgba(216,166,242,0.12)",
                border: "1px solid rgba(216,166,242,0.35)", borderRadius: 4, color: "#D8A6F2",
                fontSize: 11, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7
              }}>
              <Database size={13} /> Open Detailed Records Explorer Below ↓
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── DEPARTMENT & WORKFORCE HIERARCHY FLOWCHART (COMPACT ORG TREE) ──── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div id="department-hierarchy-flowchart" style={{
        marginTop: 16, border: "1px solid rgba(125,211,252,0.25)", borderRadius: 8,
        background: "#080E18", padding: "14px 18px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", position: "relative"
      }}>
        {/* Compact Flowchart Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, background: "rgba(125,211,252,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(125,211,252,0.3)"
            }}>
              <Building2 size={15} color="#7DD3FC" />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F4F7FB", display: "flex", alignItems: "center", gap: 8 }}>
                Department Workforce Flowchart
                <span className="mono" style={{ fontSize: 9.5, padding: "1px 7px", borderRadius: 10, background: "rgba(140,233,154,0.12)", color: "#8CE99A", border: "1px solid rgba(140,233,154,0.3)", fontWeight: 600 }}>
                  ● Live Org Simulator
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: "#7C93AA" }}>
                Enterprise Hierarchy: HQ ➔ Department Managers ➔ Team Staff. Live Onboarding &amp; Offboarding simulation.
              </div>
            </div>
          </div>

          {/* Quick Filters & Onboard Button */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(125,211,252,0.12)", borderRadius: 5, padding: "4px 10px",
              border: "1px solid rgba(125,211,252,0.25)", color: "#7DD3FC", fontSize: 10, fontWeight: 600
            }}>
              <Building2 size={12} /> All Depts ({DEPT_POOL.length})
            </div>

            <button
              onClick={actionAddEmployee}
              className="btn"
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
                background: "linear-gradient(135deg, rgba(140,233,154,0.18) 0%, rgba(79,209,197,0.18) 100%)",
                borderColor: "rgba(140,233,154,0.45)", color: "#8CE99A", fontWeight: 700, fontSize: 10.5
              }}>
              <Plus size={12} /> + Onboard
            </button>
          </div>
        </div>

        {/* Live Simulation Animation Status Banner */}
        {chartAnim.active && (
          <div style={{
            marginTop: 8, padding: "6px 14px", borderRadius: 5,
            background: chartAnim.type === "ADD" ? "rgba(140,233,154,0.12)" : "rgba(242,107,107,0.14)",
            border: `1px solid ${chartAnim.type === "ADD" ? "rgba(140,233,154,0.5)" : "rgba(242,107,107,0.5)"}`,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RotateCcw size={13} color={chartAnim.type === "ADD" ? "#8CE99A" : "#F26B6B"} className="spin" />
              <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: chartAnim.type === "ADD" ? "#8CE99A" : "#F26B6B" }}>
                {chartAnim.type === "ADD" ? "⚡ ONBOARDING SEQUENCE" : "⚠️ DEPROVISIONING SEQUENCE"}:
              </span>
              <span style={{ fontSize: 11, color: "#F4F7FB", fontWeight: 600 }}>
                {chartAnim.message}
              </span>
            </div>
            <span className="mono" style={{ fontSize: 9.5, color: "#9FB4C8" }}>Stage {chartAnim.stage}/3</span>
          </div>
        )}

        {/* Compact Tree Root: Enterprise HQ Node */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 10 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 16px", borderRadius: 20,
            background: chartAnim.active && chartAnim.stage === 1 ? "rgba(140,233,154,0.25)" : "#0D1420",
            border: chartAnim.active && chartAnim.stage === 1 ? "1.5px solid #8CE99A" : "1px solid rgba(125,211,252,0.35)",
            boxShadow: chartAnim.active && chartAnim.stage === 1 ? "0 0 16px rgba(140,233,154,0.4)" : "none",
            transition: "all 0.3s ease"
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#F4F7FB" }}>🏢 Enterprise HQ</span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#7DD3FC" }} />
            <span className="mono" style={{ fontSize: 10, color: "#7DD3FC", fontWeight: 600 }}>
              {activeEmpsList.length} Staff · {DEPT_POOL.length} Departments
            </span>
          </div>

          {/* Central Stem Line */}
          <div style={{ width: 2, height: 12, background: "rgba(125,211,252,0.3)" }} />
        </div>

        {/* Compact Department Cards Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
          gap: 10,
          marginTop: 2
        }}>
          {displayedFlowDepts.map(deptName => {
            const deptEmployees = (db.emp_docs || []).filter(e => (e.department === deptName || e.dept === deptName));
            const activeDeptEmps = deptEmployees.filter(e => !e.status?.includes("Inactive"));

            // True Manager / Lead qualification: must have Manager, Lead, Director in designation
            const candidateManagers = deptEmployees.filter(e => {
              const d = (e.designation || e.desig || "").toLowerCase();
              return !e.status?.includes("Inactive") && (d.includes("director") || d.includes("manager") || d.includes("lead"));
            });
            const deptManager = candidateManagers.sort((a, b) => {
              return gradeRank(b.designation || b.desig) - gradeRank(a.designation || a.desig);
            })[0] || null;

            // Direct Reports / Subordinates (sorted: Directors first, then Managers/Leads, then rest by ranks)
            const deptStaff = deptEmployees
              .filter(e => e.id !== deptManager?.id)
              .sort((a, b) => {
                const rankA = gradeRank(a.designation || a.desig);
                const rankB = gradeRank(b.designation || b.desig);
                if (rankB !== rankA) return rankB - rankA;
                return (a.name || "").localeCompare(b.name || "");
              });

            const isDeptActiveInAnim = chartAnim.active && chartAnim.dept === deptName;
            const deptColors = {
              "Engineering": "#4FD1C5",
              "Product": "#F2B84B",
              "Finance": "#8CE99A",
              "Sales & Marketing": "#FFD166",
              "Human Resources": "#D8A6F2",
              "Customer Support": "#7DD3FC",
              "Operations": "#F2946B",
              "Legal": "#93C4D4"
            };
            const accentColor = deptColors[deptName] || "#7DD3FC";

            return (
              <div key={deptName} style={{
                background: "#0D1420",
                border: isDeptActiveInAnim
                  ? `1.5px solid ${chartAnim.type === "ADD" ? "#8CE99A" : "#F26B6B"}`
                  : "1px solid rgba(255,255,255,0.07)",
                borderRadius: 6, padding: "8px 10px",
                boxShadow: isDeptActiveInAnim
                  ? `0 0 16px ${chartAnim.type === "ADD" ? "rgba(140,233,154,0.35)" : "rgba(242,107,107,0.35)"}`
                  : "none",
                display: "flex", flexDirection: "column", gap: 6,
                transition: "all 0.25s ease"
              }}>
                {/* Header row: Dept name + count badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: accentColor }} />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#F4F7FB" }}>{deptName}</span>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8,
                    background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}33`
                  }}>
                    {activeDeptEmps.length} Staff
                  </span>
                </div>

                {/* Live workforce & budget vitals for this department */}
                {(() => {
                  const bm = budgetByDept[deptName];
                  if (!bm) return null;
                  const utilColor = bm.utilisation > 1 ? "#F26B6B" : bm.utilisation > 0.9 ? "#F2B84B" : "#8CE99A";
                  return (
                    <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 4, padding: "5px 7px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {[
                          { l: "Working", v: bm.headcount - bm.onLeave, c: "#8CE99A" },
                          { l: "On Leave", v: bm.onLeave, c: "#7DD3FC" },
                          { l: "Vacant", v: bm.vacant, c: bm.vacant > 0 ? "#F2B84B" : "#5C7891" },
                          { l: "Notice", v: bm.onNotice, c: bm.onNotice > 0 ? "#F2946B" : "#5C7891" },
                          { l: "At Risk", v: bm.atRisk, c: bm.atRisk > 0 ? "#FC8181" : "#5C7891" },
                        ].map(x => (
                          <span key={x.l} className="mono" style={{ fontSize: 8.5, color: "#5C7891" }}>
                            <span style={{ color: x.c, fontWeight: 700 }}>{x.v}</span> {x.l}
                          </span>
                        ))}
                      </div>
                      <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
                        <div style={{ width: `${Math.min(100, bm.utilisation * 100)}%`, height: "100%", background: utilColor }} />
                      </div>
                      <div className="mono" style={{ fontSize: 8, color: "#5C7891", marginTop: 2, display: "flex", justifyContent: "space-between" }}>
                        <span>{Math.round(bm.utilisation * 100)}% of {fmtMoneyShort(bm.annualBudget)}</span>
                        <span style={{ color: bm.netPL >= 0 ? "#8CE99A" : "#F26B6B" }}>P&amp;L {fmtMoneyShort(bm.netPL)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Manager / Department Lead row */}
                {deptManager ? (
                  <div style={{
                    padding: "5px 7px", borderRadius: 4,
                    background: (isDeptActiveInAnim && chartAnim.stage === 2)
                      ? "rgba(140,233,154,0.18)"
                      : "rgba(255,255,255,0.03)",
                    border: (isDeptActiveInAnim && chartAnim.stage === 2)
                      ? "1px solid #8CE99A"
                      : `1px solid ${accentColor}44`,
                    display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 11 }}>👔</span>
                      <div>
                        <div style={{ color: "#F4F7FB", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                          {deptManager.name}
                          {(deptManager.designation || deptManager.desig || "").toLowerCase().includes("director") && (
                            <span title="Executive Director" style={{ fontSize: 13, filter: "drop-shadow(0 0 4px rgba(255,215,0,0.6))" }}>👑</span>
                          )}
                          <span style={{
                            fontSize: 7.5, fontWeight: 700, padding: "1px 4px", borderRadius: 2,
                            background: `${accentColor}25`, color: accentColor, border: `1px solid ${accentColor}55`,
                            letterSpacing: "0.05em"
                          }}>
                            LEAD
                          </span>
                        </div>
                        <div style={{ fontSize: 8.5, color: "#8EABC2" }}>
                          {deptManager.designation || deptManager.desig || "Manager"}
                        </div>
                      </div>
                    </div>

                    {!deptManager.status?.includes("Inactive") && (
                      <button
                        onClick={() => {
                          setOffboardChecklist(computeAutoOffboardChecklist(deptManager.id));
                          setModal({
                            type: "offboard",
                            empId: deptManager.id,
                            reason: "Resignation",
                            exitDate: getLocalDateStr(),
                            workingDays: getWorkingDaysInMonthUpToDate(getLocalDateStr()).workingDays,
                            separationMode: "final_clearance"
                          });
                        }}
                        className="mono"
                        style={{
                          padding: "1px 5px", fontSize: 8.5, background: "rgba(242,107,107,0.1)",
                          border: "1px solid rgba(242,107,107,0.3)", borderRadius: 2, color: "#F26B6B", cursor: "pointer"
                        }}
                        title="Offboard Department Lead (Triggers Succession)">
                        ✕ Offboard
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{
                    fontSize: 9, color: "#F2B84B", background: "rgba(242,184,75,0.06)",
                    border: "1px dashed rgba(242,184,75,0.3)", borderRadius: 4, padding: "4px 6px",
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span>⚠️</span>
                      <span style={{ color: "#FFEAA7", fontWeight: 600 }}>Vacant · No Lead Assigned</span>
                    </span>
                    <span
                      onClick={() => {
                        setEmpFormName("");
                        setEmpFormDept(deptName);
                        setEmpFormDesig("Manager");
                        setShowEmpForm(true);
                      }}
                      style={{ color: "#F2B84B", cursor: "pointer", textDecoration: "underline", fontSize: 8.5 }}>
                      + Appoint Lead
                    </span>
                  </div>
                )}

                {/* Subordinate Staff List (only employees reporting to the manager, without duplication) */}
                {deptStaff.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                    <div style={{ fontSize: 8, color: "#5C7891", textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 2px" }}>
                      Team Members ({deptStaff.filter(e => !e.status?.includes("Inactive")).length})
                    </div>
                    {deptStaff.map(emp => {
                      const isInactive = emp.status?.includes("Inactive");
                      const isThisEmpInAnim = chartAnim.active && chartAnim.empName === emp.name;

                      return (
                        <div key={emp.id} style={{
                          padding: "4px 7px", borderRadius: 3,
                          background: isThisEmpInAnim
                            ? (chartAnim.type === "ADD" ? "rgba(140,233,154,0.2)" : "rgba(242,107,107,0.2)")
                            : isInactive ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.03)",
                          border: isThisEmpInAnim
                            ? `1px solid ${chartAnim.type === "ADD" ? "#8CE99A" : "#F26B6B"}`
                            : isInactive ? "1px dashed rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.05)",
                          opacity: isInactive ? 0.5 : 1,
                          display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ color: isInactive ? "#7C93AA" : "#F4F7FB", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                              👤 {emp.name}
                              {(emp.designation || emp.desig || "").toLowerCase().includes("director") && (
                                <span title="Executive Director" style={{ fontSize: 11, filter: "drop-shadow(0 0 4px rgba(255,215,0,0.6))" }}>👑</span>
                              )}
                            </span>
                            <span style={{
                              fontSize: 8.5,
                              color: (emp.designation || emp.desig || "").toLowerCase().includes("director")
                                ? "#F2D9A6"
                                : (emp.designation || emp.desig || "").toLowerCase().includes("manager")
                                  ? "#8CE99A"
                                  : (emp.designation || emp.desig || "").toLowerCase().includes("lead")
                                    ? "#7DD3FC"
                                    : "#6C859C",
                              fontWeight: (emp.designation || emp.desig || "").toLowerCase().match(/director|manager|lead/) ? 600 : 400
                            }}>
                              ({emp.designation || emp.desig || "Staff"})
                            </span>
                            {isThisEmpInAnim && (
                              <span style={{
                                fontSize: 8, padding: "1px 4px", borderRadius: 2,
                                background: chartAnim.type === "ADD" ? "#8CE99A" : "#F26B6B",
                                color: "#0A0F1A", fontWeight: 700
                              }}>
                                {chartAnim.type === "ADD" ? "✨ ADDED" : "⚠️ OFFBOARDING"}
                              </span>
                            )}
                          </div>

                          {!isInactive && (
                            <button
                              onClick={() => {
                                setOffboardChecklist(computeAutoOffboardChecklist(emp.id));
                                setModal({
                                  type: "offboard",
                                  empId: emp.id,
                                  reason: "Resignation",
                                  exitDate: getLocalDateStr(),
                                  workingDays: getWorkingDaysInMonthUpToDate(getLocalDateStr()).workingDays,
                                  separationMode: "final_clearance"
                                });
                              }}
                              className="mono"
                              style={{
                                padding: "1px 5px", fontSize: 8.5, background: "rgba(242,107,107,0.1)",
                                border: "1px solid rgba(242,107,107,0.3)", borderRadius: 2, color: "#F26B6B", cursor: "pointer"
                              }}
                              title="Offboard this employee with clearance checklist">
                              ✕ Offboard
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, color: "#5C7891", padding: "2px 4px" }}>
                    <span>{deptManager ? "No direct reports" : "0 staff"}</span>
                    <span
                      onClick={() => {
                        setEmpFormDept(deptName);
                        setShowEmpForm(true);
                      }}
                      style={{ color: "#7DD3FC", cursor: "pointer", textDecoration: "underline" }}>
                      + Add Staff
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── FINANCE CONTROL TOWER (ACCOUNTANT) — BUDGET · ATTRITION · RETENTION  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div id="finance-control-tower" style={{
        marginTop: 16, border: "1px solid rgba(245,165,36,0.28)", borderRadius: 8,
        background: "#080E18", padding: "14px 18px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, background: "rgba(245,165,36,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(245,165,36,0.35)"
            }}>
              <Wallet size={15} color="#F5A524" />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F4F7FB", display: "flex", alignItems: "center", gap: 8 }}>
                Finance Control Tower
                <span className="mono" style={{ fontSize: 9.5, padding: "1px 7px", borderRadius: 10, background: "rgba(245,165,36,0.12)", color: "#F5A524", border: "1px solid rgba(245,165,36,0.35)", fontWeight: 600 }}>
                  ACCOUNTANT
                </span>
                {!financeView && (
                  <span className="mono" style={{ fontSize: 9, padding: "1px 7px", borderRadius: 10, background: "rgba(255,255,255,0.05)", color: "#7C93AA", border: "1px solid rgba(255,255,255,0.1)" }}>
                    read-only — switch ROLE to ACCOUNTANT to act
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: "#7C93AA" }}>
                Department budgets, per-employee unit economics, attrition cost &amp; retention decisions — all re-derived live from the HRMS tables.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 5, padding: 2, border: "1px solid rgba(255,255,255,0.08)", flexWrap: "wrap" }}>
            {[
              { k: "overview", label: "Budgets" },
              { k: "risk", label: `Attrition Risk (${workforceKPIs.atRisk})` },
              { k: "vacancy", label: `Vacancies (${workforceKPIs.openVacancies})` },
              { k: "roi", label: "Unit Economics" },
              { k: "scenario", label: "What-If" },
            ].map(t => (
              <button key={t.k} onClick={() => setFinTab(t.k)}
                style={{
                  background: finTab === t.k ? "rgba(245,165,36,0.2)" : "transparent",
                  color: finTab === t.k ? "#F5A524" : "#7C93AA",
                  border: "none", borderRadius: 3, padding: "4px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer"
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── KPI Strip: the live workforce vitals ───────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))", gap: 8, marginTop: 12 }}>
          {[
            { label: "Headcount", value: `${workforceKPIs.headcount}/${workforceKPIs.totalSanctioned}`, sub: "active / sanctioned", color: "#4FD1C5" },
            { label: "On Leave Today", value: workforceKPIs.onLeave, sub: "approved absence", color: "#7DD3FC" },
            { label: "Vacant Seats", value: workforceKPIs.vacant, sub: `${workforceKPIs.openVacancies} formally open`, color: "#F2B84B" },
            { label: "Serving Notice", value: workforceKPIs.onNotice, sub: "exiting soon", color: "#F2946B" },
            { label: "Flight Risk", value: workforceKPIs.atRisk, sub: "high / critical", color: "#F26B6B" },
            { label: "Budget Used", value: `${Math.round(workforceKPIs.utilisation * 100)}%`, sub: `${fmtMoneyShort(workforceKPIs.available)} free`, color: workforceKPIs.utilisation > 0.9 ? "#F26B6B" : "#8CE99A" },
            { label: "Net Annual P&L", value: fmtMoneyShort(workforceKPIs.netPL), sub: `${workforceKPIs.profitable} profitable · ${workforceKPIs.lossMaking} loss`, color: workforceKPIs.netPL >= 0 ? "#8CE99A" : "#F26B6B" },
            { label: "Attrition Rate", value: `${(workforceKPIs.attritionRate * 100).toFixed(1)}%`, sub: `${workforceKPIs.exitCount} exit(s) booked`, color: "#D8A6F2" },
            { label: "Risk Provision", value: fmtMoneyShort(workforceKPIs.expectedLossProvision), sub: "prob-weighted exit cost", color: "#FC8181" },
          ].map(k => (
            <div key={k.label} style={{
              background: "#0D1420", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "7px 9px"
            }}>
              <div className="mono" style={{ fontSize: 8.5, color: "#7C93AA", letterSpacing: "0.06em", textTransform: "uppercase" }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: k.color, lineHeight: 1.25 }}>{k.value}</div>
              <div style={{ fontSize: 8.5, color: "#5C7891" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── TAB: Department Budgets ────────────────────────────────────────── */}
        {finTab === "overview" && (
          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {["Department", "Headcount", "Vacant", "Leave", "Notice", "Annual Envelope", "Committed", "Uncommitted", "Utilisation", "Net P&L / yr", "Status", ""].map(h => (
                    <th key={h} className="mono" style={{ textAlign: h === "Department" || h === "Status" ? "left" : "right", padding: "7px 8px", color: "#7C93AA", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {budgetModel.map(b => {
                  const statusColor = b.status === "Over Budget" || b.status === "Headcount Breach" ? "#F26B6B"
                    : b.status === "Near Ceiling" ? "#F2B84B" : "#8CE99A";
                  return (
                    <tr key={b.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "7px 8px", color: "#F4F7FB", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {b.dept}
                        <span className="mono" style={{ fontSize: 8.5, color: "#5C7891", marginLeft: 6 }}>{b.criticality}</span>
                      </td>
                      <td className="mono" style={{ textAlign: "right", padding: "7px 8px", color: b.headcount > b.sanctioned ? "#F26B6B" : "#DCE6F2" }}>
                        {b.headcount}/{b.sanctioned}
                      </td>
                      <td className="mono" style={{ textAlign: "right", padding: "7px 8px", color: b.vacant > 0 ? "#F2B84B" : "#5C7891" }}>{b.vacant}</td>
                      <td className="mono" style={{ textAlign: "right", padding: "7px 8px", color: b.onLeave > 0 ? "#7DD3FC" : "#5C7891" }}>{b.onLeave}</td>
                      <td className="mono" style={{ textAlign: "right", padding: "7px 8px", color: b.onNotice > 0 ? "#F2946B" : "#5C7891" }}>{b.onNotice}</td>
                      <td className="mono" style={{ textAlign: "right", padding: "7px 8px", color: "#DCE6F2" }}>{fmtMoneyShort(b.annualBudget)}</td>
                      <td className="mono" style={{ textAlign: "right", padding: "7px 8px", color: "#9FB4C8" }}>{fmtMoneyShort(b.totalCommitted)}</td>
                      <td className="mono" style={{ textAlign: "right", padding: "7px 8px", color: b.available < 0 ? "#F26B6B" : "#8CE99A" }}>{fmtMoneyShort(b.available)}</td>
                      <td style={{ padding: "7px 8px", minWidth: 90 }}>
                        <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, b.utilisation * 100)}%`, height: "100%", background: statusColor, transition: "width 0.3s ease" }} />
                        </div>
                        <div className="mono" style={{ fontSize: 8.5, color: "#7C93AA", marginTop: 2, textAlign: "right" }}>{Math.round(b.utilisation * 100)}%</div>
                      </td>
                      <td className="mono" style={{ textAlign: "right", padding: "7px 8px", color: b.netPL >= 0 ? "#8CE99A" : "#F26B6B", fontWeight: 600 }}>{fmtMoneyShort(b.netPL)}</td>
                      <td style={{ padding: "7px 8px" }}>
                        <span className="mono" style={{ fontSize: 8.5, padding: "2px 6px", borderRadius: 8, background: `${statusColor}1F`, color: statusColor, border: `1px solid ${statusColor}55`, whiteSpace: "nowrap" }}>
                          {b.status}
                        </span>
                        {b.atRisk > 0 && (
                          <span className="mono" style={{ fontSize: 8.5, padding: "2px 6px", borderRadius: 8, background: "rgba(252,129,129,0.12)", color: "#FC8181", border: "1px solid rgba(252,129,129,0.35)", marginLeft: 4, whiteSpace: "nowrap" }}>
                            {b.atRisk} at risk
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "7px 8px", textAlign: "right" }}>
                        <button className="btn" disabled={!financeView || running} onClick={() => actionReviseBudget(b.dept)}
                          style={{ padding: "3px 8px", fontSize: 9.5, borderColor: "rgba(245,165,36,0.4)", color: "#F5A524" }}>
                          Revise
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "1px solid rgba(255,255,255,0.14)" }}>
                  <td className="mono" style={{ padding: "8px", color: "#F5A524", fontWeight: 700, fontSize: 10 }}>TOTAL</td>
                  <td className="mono" style={{ textAlign: "right", padding: "8px", color: "#F4F7FB", fontWeight: 700 }}>{workforceKPIs.headcount}/{workforceKPIs.totalSanctioned}</td>
                  <td className="mono" style={{ textAlign: "right", padding: "8px", color: "#F2B84B", fontWeight: 700 }}>{workforceKPIs.vacant}</td>
                  <td className="mono" style={{ textAlign: "right", padding: "8px", color: "#7DD3FC", fontWeight: 700 }}>{workforceKPIs.onLeave}</td>
                  <td className="mono" style={{ textAlign: "right", padding: "8px", color: "#F2946B", fontWeight: 700 }}>{workforceKPIs.onNotice}</td>
                  <td className="mono" style={{ textAlign: "right", padding: "8px", color: "#F4F7FB", fontWeight: 700 }}>{fmtMoneyShort(workforceKPIs.totalBudget)}</td>
                  <td className="mono" style={{ textAlign: "right", padding: "8px", color: "#9FB4C8", fontWeight: 700 }}>{fmtMoneyShort(workforceKPIs.totalCommitted)}</td>
                  <td className="mono" style={{ textAlign: "right", padding: "8px", color: workforceKPIs.available < 0 ? "#F26B6B" : "#8CE99A", fontWeight: 700 }}>{fmtMoneyShort(workforceKPIs.available)}</td>
                  <td className="mono" style={{ textAlign: "right", padding: "8px", color: "#7C93AA", fontWeight: 700 }}>{Math.round(workforceKPIs.utilisation * 100)}%</td>
                  <td className="mono" style={{ textAlign: "right", padding: "8px", color: workforceKPIs.netPL >= 0 ? "#8CE99A" : "#F26B6B", fontWeight: 700 }}>{fmtMoneyShort(workforceKPIs.netPL)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
            <div style={{ marginTop: 8, fontSize: 9.5, color: "#5C7891", lineHeight: 1.6 }}>
              <strong style={{ color: "#7C93AA" }}>How to read this:</strong> <em>Committed</em> = annualised salary + {Math.round(STATUTORY_LOAD * 100)}% statutory load + per-seat overhead for everyone currently on the books, plus one-time charges (onboarding, retention, attrition) already booked. <em>Net P&amp;L</em> compares that against the modelled annual output of the people in the department. HR cannot onboard past the sanctioned ceiling or the uncommitted balance — the accountant must revise the plan first.
            </div>
          </div>
        )}

        {/* ── TAB: Attrition Risk & Retention ────────────────────────────────── */}
        {finTab === "risk" && (
          <div style={{ marginTop: 12 }}>
            {/* Simulation Stress Test Control Bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(245,165,36,0.06)", border: "1px solid rgba(245,165,36,0.22)",
              borderRadius: 6, padding: "8px 12px", marginBottom: 12, flexWrap: "wrap", gap: 10
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={14} style={{ color: "#F5A524" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#F4F7FB" }}>
                  Digital Twin Market Stress Test:
                </span>
                <span className="mono" style={{ fontSize: 10, color: scenario.attritionShockPct > 0 ? "#F26B6B" : "#8CE99A", fontWeight: 600 }}>
                  {scenario.attritionShockPct > 0 ? `🔥 +${scenario.attritionShockPct} pts competitor poaching shock` : "🌱 Baseline Market (Normal)"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="mono" style={{ fontSize: 9.5, color: "#9FB4C8" }}>Shock Slider:</span>
                <input
                  type="range" min="0" max="40" step="5"
                  value={scenario.attritionShockPct}
                  onChange={e => setScenario(s => ({ ...s, attritionShockPct: Number(e.target.value) }))}
                  style={{ width: 110, accentColor: "#F26B6B", cursor: "pointer" }}
                />
                <div style={{ display: "flex", gap: 5 }}>
                  <button
                    onClick={() => setScenario(s => ({ ...s, attritionShockPct: 0 }))}
                    className="btn mono"
                    style={{ fontSize: 9, padding: "2px 8px", borderColor: scenario.attritionShockPct === 0 ? "#4FD1C5" : "rgba(255,255,255,0.15)", color: scenario.attritionShockPct === 0 ? "#4FD1C5" : "#7C93AA", background: scenario.attritionShockPct === 0 ? "rgba(79,209,197,0.15)" : "transparent" }}>
                    Baseline (0)
                  </button>
                  <button
                    onClick={() => setScenario(s => ({ ...s, attritionShockPct: 15 }))}
                    className="btn mono"
                    style={{ fontSize: 9, padding: "2px 8px", borderColor: scenario.attritionShockPct === 15 ? "#F5A524" : "rgba(255,255,255,0.15)", color: scenario.attritionShockPct === 15 ? "#F5A524" : "#7C93AA", background: scenario.attritionShockPct === 15 ? "rgba(245,165,36,0.15)" : "transparent" }}>
                    +15 Shock
                  </button>
                  <button
                    onClick={() => setScenario(s => ({ ...s, attritionShockPct: 25 }))}
                    className="btn mono"
                    style={{ fontSize: 9, padding: "2px 8px", borderColor: scenario.attritionShockPct === 25 ? "#F26B6B" : "rgba(255,255,255,0.15)", color: scenario.attritionShockPct === 25 ? "#F26B6B" : "#7C93AA", background: scenario.attritionShockPct === 25 ? "rgba(242,107,107,0.15)" : "transparent" }}>
                    +25 Shock (Retain Active)
                  </button>
                </div>
              </div>
            </div>

            {riskRegister.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#5C7891", fontSize: 11 }}>
                No active employees yet. Onboard someone to populate the attrition model.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {riskRegister.map(t => {
                  const offers = RETENTION_LEVERS.map(l => retentionOfferModel(t.emp, l, t.risk.score, t.loss.total, t.rating));
                  const best = offers.filter(o => o.netBenefit > 0 && !o.ineligible).sort((a, b) => b.netBenefit - a.netBenefit)[0];
                  const isOpen = expandedRisk === t.emp.id;
                  return (
                    <div key={t.emp.id} style={{
                      background: "#0D1420", border: `1px solid ${t.risk.score >= 55 ? t.risk.color + "55" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 6, overflow: "hidden"
                    }}>
                      <div onClick={() => setExpandedRisk(isOpen ? null : t.emp.id)}
                        style={{ display: "grid", gridTemplateColumns: "1.5fr 90px 1fr 1fr 1fr auto", gap: 10, alignItems: "center", padding: "8px 10px", cursor: "pointer" }}>
                        <div>
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: "#F4F7FB", display: "flex", alignItems: "center", gap: 6 }}>
                            {isOpen ? <ChevronDown size={12} color="#7C93AA" /> : <ChevronRight size={12} color="#7C93AA" />}
                            {t.emp.name}
                            {t.isManager && <span className="mono" style={{ fontSize: 8, padding: "1px 5px", borderRadius: 7, background: "rgba(245,165,36,0.14)", color: "#F5A524" }}>LEADER</span>}
                            {t.onLeave && <span className="mono" style={{ fontSize: 8, padding: "1px 5px", borderRadius: 7, background: "rgba(125,211,252,0.14)", color: "#7DD3FC" }}>ON LEAVE</span>}
                          </div>
                          <div className="mono" style={{ fontSize: 9, color: "#7C93AA", marginLeft: 18 }}>
                            {t.desig} · {t.dept} · {t.roi.tenureMonths}mo tenure · {t.rating || "no appraisal"}
                          </div>
                        </div>

                        <div>
                          <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${t.risk.score}%`, height: "100%", background: t.risk.color }} />
                          </div>
                          <div className="mono" style={{ fontSize: 8.5, color: t.risk.color, marginTop: 2, fontWeight: 700 }}>{t.risk.score} {t.risk.band}</div>
                        </div>

                        <div className="mono" style={{ fontSize: 9.5, color: "#9FB4C8" }}>
                          <span style={{ color: "#5C7891" }}>top driver </span>{t.risk.drivers[0]?.label.slice(0, 40) || "—"}
                        </div>

                        <div className="mono" style={{ fontSize: 9.5 }}>
                          <div style={{ color: "#F26B6B", fontWeight: 700 }}>{fmtMoneyShort(t.loss.total)}</div>
                          <div style={{ color: "#5C7891", fontSize: 8.5 }}>cost if they leave</div>
                        </div>

                        <div className="mono" style={{ fontSize: 9.5 }}>
                          {best ? (
                            <>
                              <div style={{ color: "#8CE99A", fontWeight: 700 }}>{best.lever.label}</div>
                              <div style={{ color: "#5C7891", fontSize: 8.5 }}>net +{fmtMoneyShort(best.netBenefit)}</div>
                            </>
                          ) : (
                            <>
                              <div style={{ color: "#F2946B", fontWeight: 700 }}>Let go &amp; backfill</div>
                              <div style={{ color: "#5C7891", fontSize: 8.5 }}>no lever pays back</div>
                            </>
                          )}
                        </div>

                        <button className="btn" disabled={!financeView || running}
                          onClick={(e) => { e.stopPropagation(); actionRetention(t.emp.id); }}
                          style={{ padding: "4px 10px", fontSize: 9.5, borderColor: "rgba(140,233,154,0.4)", color: "#8CE99A" }}>
                          Retention Desk
                        </button>
                      </div>

                      {isOpen && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, background: "rgba(255,255,255,0.015)" }}>
                          {/* Why they are at risk */}
                          <div>
                            <div className="mono" style={{ fontSize: 9, color: "#F5A524", letterSpacing: "0.08em", marginBottom: 5 }}>WHY THIS SCORE</div>
                            {t.risk.drivers.map((d, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10, padding: "2px 0", color: "#9FB4C8" }}>
                                <span>{d.label}</span>
                                <span className="mono" style={{ color: d.points > 0 ? "#F26B6B" : "#8CE99A", fontWeight: 600 }}>{d.points > 0 ? "+" : ""}{d.points}</span>
                              </div>
                            ))}
                            <div className="mono" style={{ fontSize: 9, color: "#F5A524", letterSpacing: "0.08em", margin: "10px 0 5px" }}>COST OF LOSING THEM</div>
                            {t.loss.heads.map((h, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10, padding: "2px 0", color: "#9FB4C8" }}>
                                <span title={h.note}>{h.label}</span>
                                <span className="mono" style={{ color: "#DCE6F2" }}>{fmtINR(h.amount)}</span>
                              </div>
                            ))}
                            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 4, paddingTop: 4, fontSize: 10.5, fontWeight: 700 }}>
                              <span style={{ color: "#F4F7FB" }}>Total exit cost</span>
                              <span className="mono" style={{ color: "#F26B6B" }}>{fmtINR(t.loss.total)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#7C93AA", marginTop: 2 }}>
                              <span>Probability-weighted ({t.risk.score}%)</span>
                              <span className="mono">{fmtINR(t.expectedLoss)}</span>
                            </div>
                          </div>

                          {/* Retention lever pricing */}
                          <div>
                            <div className="mono" style={{ fontSize: 9, color: "#F5A524", letterSpacing: "0.08em", marginBottom: 5 }}>RETENTION LEVERS PRICED AGAINST THAT LOSS</div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
                              <thead>
                                <tr style={{ color: "#5C7891" }}>
                                  {["Lever", "Yr-1 cost", "Risk →", "Saving", "Net", ""].map(h => (
                                    <th key={h} className="mono" style={{ textAlign: h === "Lever" ? "left" : "right", padding: "3px 4px", fontSize: 8.5, fontWeight: 600 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {offers.map(o => (
                                  <tr key={o.lever.key} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                    <td style={{ padding: "3px 4px", color: "#DCE6F2" }}>
                                      {o.lever.label}
                                      <div style={{ color: "#5C7891", fontSize: 8.5 }}>
                                        {o.ineligible ? (o.ineligibleReason || "Ineligible") : o.lever.detail}
                                      </div>
                                    </td>
                                    <td className="mono" style={{ textAlign: "right", padding: "3px 4px", color: o.ineligible ? "#5C7891" : "#F2946B" }}>
                                      {o.ineligible ? "—" : fmtMoneyShort(o.yearOneCost)}
                                    </td>
                                    <td className="mono" style={{ textAlign: "right", padding: "3px 4px", color: "#9FB4C8" }}>
                                      {o.ineligible ? "—" : `${t.risk.score}→${o.residualRisk}`}
                                    </td>
                                    <td className="mono" style={{ textAlign: "right", padding: "3px 4px", color: "#8CE99A" }}>
                                      {o.ineligible ? "—" : fmtMoneyShort(o.expectedSaving)}
                                    </td>
                                    <td className="mono" style={{ textAlign: "right", padding: "3px 4px", color: o.ineligible ? "#5C7891" : (o.netBenefit >= 0 ? "#8CE99A" : "#F26B6B"), fontWeight: 700 }}>
                                      {o.ineligible ? "—" : fmtMoneyShort(o.netBenefit)}
                                    </td>
                                    <td style={{ textAlign: "right", padding: "3px 4px" }}>
                                      <span className="mono" style={{
                                        fontSize: 8, padding: "1px 5px", borderRadius: 7,
                                        background: o.ineligible ? "rgba(255,255,255,0.06)" : (o.verdict === "RETAIN" ? "rgba(140,233,154,0.14)" : "rgba(242,107,107,0.14)"),
                                        color: o.ineligible ? "#7C93AA" : (o.verdict === "RETAIN" ? "#8CE99A" : "#F26B6B")
                                      }}>
                                        {o.ineligible ? "INELIGIBLE" : o.verdict}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            <div className="mono" style={{ fontSize: 9, color: "#F5A524", letterSpacing: "0.08em", margin: "10px 0 5px" }}>IF THEY LEAVE — WHO COVERS THE SEAT</div>
                            {t.successors.length === 0 ? (
                              <div style={{ fontSize: 10, color: "#F26B6B" }}>
                                No internal successor. A full external search at {gradeEcon(t.desig).daysToFill} days and {fmtINR(onboardingCostModel(t.desig).total)} of onboarding cost would be required.
                              </div>
                            ) : t.successors.map((s, i) => (
                              <div key={i} style={{ fontSize: 10, color: "#9FB4C8", padding: "2px 0" }}>
                                <span style={{ color: "#F4F7FB", fontWeight: 600 }}>{s.emp.name}</span>
                                <span className="mono" style={{ color: "#8CE99A", marginLeft: 6, fontSize: 9 }}>{s.mode}</span>
                                <span className="mono" style={{ color: "#5C7891", marginLeft: 6, fontSize: 9 }}>fit {s.fitScore}%{s.cascades ? " · cascades a vacancy" : ""}</span>
                                <div style={{ color: "#5C7891", fontSize: 9 }}>{s.note}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Vacancies & Succession ────────────────────────────────────── */}
        {finTab === "vacancy" && (
          <div style={{ marginTop: 12 }}>
            {openVacancies.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#5C7891", fontSize: 11 }}>
                No open vacancies. Seats open automatically when an employee is offboarded or an internal promotion cascades.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {openVacancies.map(v => {
                  const active = (db.emp_docs || []).filter(e => !e.status?.includes("Inactive"));
                  const cands = findReplacementCandidates({ id: "__v__", designation: v.grade, department: v.dept, dept: v.dept }, active, ratingOf);
                  const overdue = v.daysOpen > (v.expectedDaysToFill || 30);
                  return (
                    <div key={v.id} style={{
                      background: "#0D1420", border: `1px solid ${overdue ? "rgba(242,107,107,0.45)" : "rgba(242,184,75,0.3)"}`,
                      borderRadius: 6, padding: "10px 12px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#F4F7FB" }}>{v.grade}</div>
                          <div className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>{v.dept} · {v.id}</div>
                        </div>
                        <span className="mono" style={{ fontSize: 8.5, padding: "2px 6px", borderRadius: 8, background: overdue ? "rgba(242,107,107,0.14)" : "rgba(242,184,75,0.14)", color: overdue ? "#F26B6B" : "#F2B84B", border: `1px solid ${overdue ? "rgba(242,107,107,0.4)" : "rgba(242,184,75,0.4)"}`, whiteSpace: "nowrap" }}>
                          {v.daysOpen}d open
                        </span>
                      </div>

                      <div style={{ fontSize: 9.5, color: "#5C7891", marginTop: 4 }}>{v.causedBy}</div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                        <div>
                          <div className="mono" style={{ fontSize: 8, color: "#7C93AA", textTransform: "uppercase" }}>Daily output loss</div>
                          <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#F2946B" }}>{fmtMoneyShort(v.dailyLoss)}</div>
                        </div>
                        <div>
                          <div className="mono" style={{ fontSize: 8, color: "#7C93AA", textTransform: "uppercase" }}>Lost so far</div>
                          <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#F26B6B" }}>{fmtMoneyShort(v.cumulativeLoss)}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: 8, paddingTop: 7, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="mono" style={{ fontSize: 8, color: "#7C93AA", textTransform: "uppercase", marginBottom: 3 }}>Succession bench</div>
                        {cands.length === 0 ? (
                          <div style={{ fontSize: 10, color: "#F26B6B" }}>
                            Empty — external hire only ({fmtINR(onboardingCostModel(v.grade).total)} onboarding, ~{gradeEcon(v.grade).daysToFill}d lead time)
                          </div>
                        ) : cands.slice(0, 2).map((c, i) => (
                          <div key={i} style={{ fontSize: 10, color: "#9FB4C8" }}>
                            <span style={{ color: "#8CE99A", fontWeight: 600 }}>{c.emp.name}</span>
                            <span className="mono" style={{ fontSize: 9, color: "#5C7891" }}> · {c.mode} · fit {c.fitScore}%</span>
                          </div>
                        ))}
                      </div>

                      <button className="btn" disabled={!financeView || running} onClick={() => actionFillVacancy(v.id)}
                        style={{ width: "100%", marginTop: 8, textAlign: "center", padding: "5px", fontSize: 10, borderColor: "rgba(140,233,154,0.4)", color: "#8CE99A" }}>
                        Fill This Seat
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Closed vacancy history */}
            {(db.attrition || []).filter(r => r.type === "Vacancy" && r.status !== "Open").length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="mono" style={{ fontSize: 9, color: "#7C93AA", letterSpacing: "0.08em", marginBottom: 5 }}>CLOSED VACANCIES</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                  <thead>
                    <tr style={{ color: "#5C7891", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {["Seat", "Department", "Filled by", "Route", "Realised loss"].map(h => (
                        <th key={h} className="mono" style={{ textAlign: h === "Realised loss" ? "right" : "left", padding: "4px 6px", fontSize: 8.5, fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(db.attrition || []).filter(r => r.type === "Vacancy" && r.status !== "Open").map(v => (
                      <tr key={v.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "4px 6px", color: "#DCE6F2" }}>{v.grade}</td>
                        <td style={{ padding: "4px 6px", color: "#9FB4C8" }}>{v.dept}</td>
                        <td style={{ padding: "4px 6px", color: "#8CE99A" }}>{v.filledBy || "—"}</td>
                        <td className="mono" style={{ padding: "4px 6px", color: "#7C93AA", fontSize: 9 }}>{v.fillMode || v.status}</td>
                        <td className="mono" style={{ padding: "4px 6px", color: "#F26B6B", textAlign: "right" }}>{fmtMoneyShort(v.realisedLoss || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Per-Employee Unit Economics ───────────────────────────────── */}
        {finTab === "roi" && (
          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {["Employee", "Grade", "Dept", "Tenure", "Annual Cost", "Annual Value", "Margin / yr", "Onboarding", "Break-even", "Net to date", "Verdict"].map(h => (
                    <th key={h} className="mono" style={{ textAlign: ["Employee", "Grade", "Dept", "Verdict"].includes(h) ? "left" : "right", padding: "7px 8px", color: "#7C93AA", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...workforceTwin].sort((a, b) => b.roi.steadyMargin - a.roi.steadyMargin).map(t => {
                  const vColor = t.roi.verdict === "Profitable" ? "#8CE99A" : t.roi.verdict === "Loss-making" ? "#F26B6B" : "#F2B84B";
                  return (
                    <tr key={t.emp.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "6px 8px", color: "#F4F7FB", fontWeight: 600, whiteSpace: "nowrap" }}>{t.emp.name}</td>
                      <td style={{ padding: "6px 8px", color: "#9FB4C8", whiteSpace: "nowrap" }}>{t.desig}</td>
                      <td style={{ padding: "6px 8px", color: "#7C93AA", whiteSpace: "nowrap" }}>{t.dept}</td>
                      <td className="mono" style={{ textAlign: "right", padding: "6px 8px", color: "#9FB4C8" }}>{t.roi.tenureMonths}mo</td>
                      <td className="mono" style={{ textAlign: "right", padding: "6px 8px", color: "#F2946B" }}>{fmtMoneyShort(t.roi.cost.total)}</td>
                      <td className="mono" style={{ textAlign: "right", padding: "6px 8px", color: "#7DD3FC" }}>{fmtMoneyShort(t.roi.annualValue)}</td>
                      <td className="mono" style={{ textAlign: "right", padding: "6px 8px", color: t.roi.steadyMargin >= 0 ? "#8CE99A" : "#F26B6B", fontWeight: 700 }}>{fmtMoneyShort(t.roi.steadyMargin)}</td>
                      <td className="mono" style={{ textAlign: "right", padding: "6px 8px", color: "#7C93AA" }}>{fmtMoneyShort(t.roi.onboarding.total)}</td>
                      <td className="mono" style={{ textAlign: "right", padding: "6px 8px", color: "#9FB4C8" }}>{t.roi.breakEvenMonths != null ? `${t.roi.breakEvenMonths}mo` : "never"}</td>
                      <td className="mono" style={{ textAlign: "right", padding: "6px 8px", color: t.roi.netToDate >= 0 ? "#8CE99A" : "#F2B84B" }}>{fmtMoneyShort(t.roi.netToDate)}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <span className="mono" style={{ fontSize: 8.5, padding: "2px 6px", borderRadius: 8, background: `${vColor}1F`, color: vColor, border: `1px solid ${vColor}55`, whiteSpace: "nowrap" }}>
                          {t.roi.verdict}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: 8, fontSize: 9.5, color: "#5C7891", lineHeight: 1.6 }}>
              <strong style={{ color: "#7C93AA" }}>Annual cost</strong> = daily rate x 30 x 12, plus {Math.round(STATUTORY_LOAD * 100)}% employer statutory load (PF, ESI, gratuity accrual, insurance), plus per-grade workspace and tooling overhead. <strong style={{ color: "#7C93AA" }}>Annual value</strong> is the modelled output of a fully-ramped person at that grade. <strong style={{ color: "#7C93AA" }}>Break-even</strong> is how long the steady-state margin takes to repay the one-time onboarding spend and the ramp-up productivity drag. <strong style={{ color: "#7C93AA" }}>Net to date</strong> is what this person has actually contributed so far — a negative number means the company has not yet earned back what it spent to hire them, which is exactly why an early exit hurts.
            </div>
          </div>
        )}

        {/* ── TAB: What-If Scenario Simulator ────────────────────────────────── */}
        {finTab === "scenario" && (
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "300px 1fr", gap: 14 }}>
            {/* Levers */}
            <div style={{ background: "#0D1420", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: 12 }}>
              <div className="mono" style={{ fontSize: 9, color: "#F5A524", letterSpacing: "0.08em", marginBottom: 10 }}>SCENARIO LEVERS</div>

              <label style={{ display: "block", marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, color: "#DCE6F2", marginBottom: 4 }}>
                  Blanket salary hike: <span className="mono" style={{ color: "#8CE99A", fontWeight: 700 }}>{scenario.blanketHikePct}%</span>
                </div>
                <input type="range" min="0" max="25" step="1" value={scenario.blanketHikePct}
                  onChange={e => setScenario(s => ({ ...s, blanketHikePct: Number(e.target.value) }))}
                  style={{ width: "100%", accentColor: "#8CE99A" }} />
                <div style={{ fontSize: 9, color: "#5C7891" }}>Raises run-rate cost but lowers flight risk across the board.</div>
              </label>

              <label style={{ display: "block", marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, color: "#DCE6F2", marginBottom: 4 }}>
                  Market attrition shock: <span className="mono" style={{ color: "#F26B6B", fontWeight: 700 }}>+{scenario.attritionShockPct} pts</span>
                </div>
                <input type="range" min="0" max="40" step="2" value={scenario.attritionShockPct}
                  onChange={e => setScenario(s => ({ ...s, attritionShockPct: Number(e.target.value) }))}
                  style={{ width: "100%", accentColor: "#F26B6B" }} />
                <div style={{ fontSize: 9, color: "#5C7891" }}>A competitor hiring spree pushing everyone's risk up.</div>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={scenario.hiringFreeze}
                  onChange={e => setScenario(s => ({ ...s, hiringFreeze: e.target.checked }))}
                  style={{ accentColor: "#F2B84B" }} />
                <span style={{ fontSize: 10.5, color: "#DCE6F2" }}>Hiring freeze — leave every vacant seat unfilled</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={scenario.retainCriticalOnly}
                  onChange={e => setScenario(s => ({ ...s, retainCriticalOnly: e.target.checked }))}
                  style={{ accentColor: "#8CE99A" }} />
                <span style={{ fontSize: 10.5, color: "#DCE6F2" }}>Extra retention focus on leadership roles</span>
              </label>

              <button className="btn" onClick={() => setScenario({ hiringFreeze: false, blanketHikePct: 0, attritionShockPct: 0, retainCriticalOnly: true })}
                style={{ width: "100%", marginTop: 12, textAlign: "center", padding: "5px", fontSize: 10 }}>
                Reset to baseline
              </button>

              <div style={{ marginTop: 10, fontSize: 9, color: "#5C7891", lineHeight: 1.6 }}>
                Nothing here touches the live tables. The twin re-runs the same cost, risk and vacancy model under your assumptions so you can see the outcome before committing to it.
              </div>
            </div>

            {/* Projection */}
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                {[
                  { label: "Payroll run-rate", base: scenarioResult.base.cost, proj: scenarioResult.projected.cost, invert: true },
                  { label: "Modelled output", base: scenarioResult.base.value, proj: scenarioResult.projected.value, invert: false },
                  { label: "Expected attrition loss", base: scenarioResult.base.expectedLoss, proj: scenarioResult.projected.expectedLoss, invert: true },
                  { label: "Net P&L (risk-adjusted)", base: scenarioResult.base.netPLWithRisk, proj: scenarioResult.projected.netPL, invert: false },
                ].map(m => {
                  const diff = m.proj - m.base;
                  const good = m.invert ? diff <= 0 : diff >= 0;
                  return (
                    <div key={m.label} style={{ background: "#0D1420", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "9px 11px" }}>
                      <div className="mono" style={{ fontSize: 8.5, color: "#7C93AA", textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#F4F7FB", marginTop: 2 }}>{fmtMoneyShort(m.proj)}</div>
                      <div className="mono" style={{ fontSize: 9, color: "#5C7891" }}>
                        base {fmtMoneyShort(m.base)}
                        <span style={{ color: good ? "#8CE99A" : "#F26B6B", marginLeft: 6, fontWeight: 700 }}>
                          {diff >= 0 ? "▲" : "▼"} {fmtMoneyShort(Math.abs(diff))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{
                marginTop: 10, background: "#0D1420", borderRadius: 6, padding: "12px 14px",
                border: `1px solid ${scenarioResult.delta >= 0 ? "rgba(140,233,154,0.35)" : "rgba(242,107,107,0.35)"}`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  {scenarioResult.delta >= 0
                    ? <CheckCircle2 size={15} color="#8CE99A" />
                    : <AlertTriangle size={15} color="#F26B6B" />}
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: scenarioResult.delta >= 0 ? "#8CE99A" : "#F26B6B" }}>
                    {scenarioResult.delta >= 0 ? "Scenario improves the bottom line" : "Scenario destroys value"} by {fmtMoneyShort(Math.abs(scenarioResult.delta))}/yr
                  </span>
                </div>
                <div style={{ fontSize: 10.5, color: "#9FB4C8", lineHeight: 1.7 }}>
                  A <strong style={{ color: "#F4F7FB" }}>{scenario.blanketHikePct}% blanket hike</strong> adds{" "}
                  <span className="mono" style={{ color: "#F2946B" }}>{fmtINR(scenarioResult.projected.retentionSpend)}</span> to the annual wage bill
                  and averts <span className="mono" style={{ color: "#8CE99A" }}>{fmtINR(Math.max(0, scenarioResult.riskAverted))}</span> of
                  probability-weighted attrition loss
                  {scenario.attritionShockPct > 0 && <> against a <strong style={{ color: "#F26B6B" }}>+{scenario.attritionShockPct} point market shock</strong></>}.
                  {scenario.hiringFreeze && <> The hiring freeze leaves <strong style={{ color: "#F2B84B" }}>{workforceKPIs.vacant} seat(s)</strong> empty, forgoing <span className="mono" style={{ color: "#F26B6B" }}>{fmtINR(scenarioResult.projected.frozenOutputLoss)}</span> of output.</>}
                  {" "}Headcount holds at <strong style={{ color: "#F4F7FB" }}>{scenarioResult.projected.headcount}</strong>.
                </div>
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 10, color: "#7C93AA" }}>
                  <strong style={{ color: "#F5A524" }}>Recommendation: </strong>
                  {scenarioResult.delta >= 0
                    ? `Proceed. Every rupee of the hike returns about ${scenarioResult.projected.retentionSpend > 0 ? (scenarioResult.riskAverted / scenarioResult.projected.retentionSpend).toFixed(2) : "∞"} rupees of avoided attrition cost. Apply it selectively from the Attrition Risk tab to squeeze more out of the same spend.`
                    : `Hold. The spend outruns the risk it removes. Target the ${workforceKPIs.atRisk} high-risk individual(s) on the Attrition Risk tab instead of raising everyone — the same money buys far more retention when aimed at the people who would actually leave.`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── DOWN ON FRONTEND: MASTER DATABASE & ESS RECORDS EXPLORER (RBAC) ─── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {hrViewEnabled ? (
        <div id="master-records-explorer" style={{ marginTop: 22, border: "1px solid rgba(216,166,242,0.25)", borderRadius: 8, background: "#0A0F1A", padding: 18, boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
          {/* Top Header Banner */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, background: "rgba(216,166,242,0.15)", border: "1px solid rgba(216,166,242,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Database size={18} color="#D8A6F2" />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#F4F7FB", letterSpacing: "0.02em", display: "flex", alignItems: "center", gap: 8 }}>
                    Master Database &amp; Live Records Explorer
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(79,209,197,0.12)", color: "#4FD1C5", border: "1px solid rgba(79,209,197,0.3)", fontWeight: 600 }}>
                      PostgreSQL Live Sync
                    </span>
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: "#7C93AA", marginTop: 2 }}>
                    Direct mirror of persistent storage (<code style={{ color: "#D8A6F2" }}>hrms_db.hrms_records</code>) · Complete audit trail of all ESS submissions, HR approvals &amp; system updates
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="mono" style={{ fontSize: 10.5, color: "#5C7891", display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.03)", padding: "5px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: dbStatus === "synced" ? "#8CE99A" : (dbStatus === "syncing" ? "#F2B84B" : "#4FD1C5"), boxShadow: dbStatus === "synced" ? "0 0 8px #8CE99A" : "none" }} />
                {dbStatus === "synced" ? "PostgreSQL Synced" : (dbStatus === "syncing" ? "Syncing to Postgres..." : "Live Active Session")}
              </div>

              {pendingCount > 0 && (
                <button className="btn" onClick={() => setShowNotifications(true)}
                  style={{ fontSize: 11, padding: "5px 11px", borderColor: "rgba(242,184,75,0.4)", color: "#F2B84B", background: "rgba(242,184,75,0.1)", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                  <Bell size={13} /> {pendingCount} Pending HR Action{pendingCount > 1 ? "s" : ""}
                </button>
              )}

              {/* Collapse / Expand Toggle Button */}
              <button
                onClick={() => setIsDbExplorerExpanded(prev => !prev)}
                className="mono"
                style={{
                  fontSize: 11, padding: "5px 12px", borderRadius: 4, cursor: "pointer",
                  background: isDbExplorerExpanded ? "rgba(216,166,242,0.12)" : "rgba(216,166,242,0.22)",
                  border: "1px solid rgba(216,166,242,0.35)", color: "#D8A6F2",
                  display: "flex", alignItems: "center", gap: 6, fontWeight: 700,
                  transition: "all 0.15s ease"
                }}>
                {isDbExplorerExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {isDbExplorerExpanded ? "Collapse View" : "Expand Detailed Database"}
              </button>
            </div>
          </div>

          {/* When Collapsed: Clean 1-Line Teaser Bar */}
          {!isDbExplorerExpanded && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
              <span className="mono" style={{ fontSize: 11, color: "#7C93AA" }}>
                Detailed database view is collapsed. Click <strong>"Expand Detailed Database"</strong> to view full records, submission details &amp; approval statuses.
              </span>
              <button
                onClick={() => setIsDbExplorerExpanded(true)}
                className="mono"
                style={{ fontSize: 10.5, padding: "5px 12px", background: "rgba(216,166,242,0.15)", border: "1px solid rgba(216,166,242,0.3)", borderRadius: 4, color: "#D8A6F2", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                <ChevronDown size={13} /> Expand Tables
              </button>
            </div>
          )}

          {/* When Expanded: Full Tables & Detailed Views */}
          {isDbExplorerExpanded && (
            <>
              {/* Module / Table Tabs */}
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 16 }} className="scrollbar-thin">
                {modules.filter(m => m.active).map(m => {
                  const isSel = dbTab === m.id;
                  const rows = db[m.id] || [];
                  const color = COLORS[m.id] || CUSTOM_PALETTE[m.name.length % CUSTOM_PALETTE.length];
                  const isEss = m.id === "ess";

                  return (
                    <button key={m.id} onClick={() => { setDbTab(m.id); setDbStatusFilter("ALL"); setDbSearch(""); }}
                      className="mono"
                      style={{
                        padding: "7px 12px", borderRadius: 5, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 7,
                        border: isSel ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
                        background: isSel ? `${color}18` : "rgba(255,255,255,0.02)",
                        color: isSel ? color : "#7C93AA",
                        fontWeight: isSel ? 700 : 500,
                        transition: "all 0.15s ease",
                        boxShadow: isSel && isEss ? "0 0 12px rgba(216,166,242,0.2)" : "none"
                      }}>
                      <span>{m.name}</span>
                      <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 8, background: isSel ? `${color}30` : "rgba(255,255,255,0.06)", color: isSel ? "#FFFFFF" : "#5C7891", fontWeight: 700 }}>
                        {rows.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Controls: Search, Filter & Summary */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                {/* Search Box */}
                <div style={{ position: "relative", minWidth: 280, flex: 1, maxWidth: 440 }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#5C7891" }} />
                  <input
                    type="text"
                    className="mono"
                    placeholder={`Search ${dbTab === "ess" ? "ESS requests, employee, issue, updates..." : "records in table..."}`}
                    value={dbSearch}
                    onChange={(e) => setDbSearch(e.target.value)}
                    style={{
                      width: "100%", padding: "7px 10px 7px 32px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 4, color: "#F4F7FB", fontSize: 11, boxSizing: "border-box"
                    }}
                  />
                  {dbSearch && (
                    <X size={13} onClick={() => setDbSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#7C93AA", cursor: "pointer" }} />
                  )}
                </div>

                {/* Status Filters */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {dbTab === "ess" && (
                    <>
                      <span className="mono" style={{ fontSize: 10, color: "#5C7891", marginRight: 2 }}>STATUS:</span>
                      {[
                        { id: "ALL", label: "All" },
                        { id: "PENDING", label: "Pending HR", color: "#F2B84B" },
                        { id: "APPROVED", label: "Approved", color: "#8CE99A" },
                        { id: "RESOLVED", label: "Resolved", color: "#6BF2C2" },
                        { id: "REJECTED", label: "Rejected", color: "#F26B6B" }
                      ].map(f => {
                        const active = dbStatusFilter === f.id;
                        return (
                          <button key={f.id} onClick={() => setDbStatusFilter(f.id)}
                            className="mono"
                            style={{
                              fontSize: 10, padding: "4px 8px", borderRadius: 3, cursor: "pointer",
                              border: active ? (f.color ? `1px solid ${f.color}` : "1px solid #D8A6F2") : "1px solid rgba(255,255,255,0.08)",
                              background: active ? (f.color ? `${f.color}22` : "rgba(216,166,242,0.18)") : "transparent",
                              color: active ? (f.color || "#D8A6F2") : "#7C93AA",
                              fontWeight: active ? 700 : 500
                            }}>
                            {f.label}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* ESS Key Metrics Strip (When viewing ESS) */}
              {dbTab === "ess" && (() => {
                const essList = db.ess || [];
                const pending = essList.filter(r => r.status?.includes("Pending") || r.status?.includes("Open"));
                const approved = essList.filter(r => r.status?.includes("Approved"));
                const resolved = essList.filter(r => r.status?.includes("Resolved"));

                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
                    <div style={{ background: "rgba(216,166,242,0.06)", border: "1px solid rgba(216,166,242,0.18)", borderRadius: 5, padding: "8px 12px" }}>
                      <div className="mono" style={{ fontSize: 9.5, color: "#D8A6F2", textTransform: "uppercase" }}>Total Requests Submitted</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#F4F7FB", marginTop: 2 }}>{essList.length}</div>
                      <div className="mono" style={{ fontSize: 9, color: "#7C93AA", marginTop: 1 }}>Logged across 7 ESS services</div>
                    </div>

                    <div style={{ background: "rgba(242,184,75,0.06)", border: "1px solid rgba(242,184,75,0.22)", borderRadius: 5, padding: "8px 12px" }}>
                      <div className="mono" style={{ fontSize: 9.5, color: "#F2B84B", textTransform: "uppercase" }}>⏳ Pending HR Verification</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#F2B84B", marginTop: 2 }}>{pending.length}</div>
                      <div className="mono" style={{ fontSize: 9, color: "#7C93AA", marginTop: 1 }}>Awaiting review in Approvals Drawer</div>
                    </div>

                    <div style={{ background: "rgba(140,233,154,0.06)", border: "1px solid rgba(140,233,154,0.22)", borderRadius: 5, padding: "8px 12px" }}>
                      <div className="mono" style={{ fontSize: 9.5, color: "#8CE99A", textTransform: "uppercase" }}>✓ Approved &amp; Executed</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#8CE99A", marginTop: 2 }}>{approved.length}</div>
                      <div className="mono" style={{ fontSize: 9, color: "#7C93AA", marginTop: 1 }}>Applied to payroll, attendance &amp; profile</div>
                    </div>

                    <div style={{ background: "rgba(107,242,194,0.06)", border: "1px solid rgba(107,242,194,0.22)", borderRadius: 5, padding: "8px 12px" }}>
                      <div className="mono" style={{ fontSize: 9.5, color: "#6BF2C2", textTransform: "uppercase" }}>🎫 Helpdesk Resolved</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#6BF2C2", marginTop: 2 }}>{resolved.length}</div>
                      <div className="mono" style={{ fontSize: 9, color: "#7C93AA", marginTop: 1 }}>IT &amp; HR support tickets closed</div>
                    </div>
                  </div>
                );
              })()}

              {/* The Master Table */}
              <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, overflowX: "auto", background: "#0D1420", maxHeight: "440px", overflowY: "auto" }} className="scrollbar-thin">
                {dbTab === "ess" ? (() => {
                  let list = [...(db.ess || [])].reverse(); // latest first
                  if (dbStatusFilter === "PENDING") list = list.filter(r => r.status?.includes("Pending") || r.status?.includes("Open"));
                  else if (dbStatusFilter === "APPROVED") list = list.filter(r => r.status?.includes("Approved"));
                  else if (dbStatusFilter === "RESOLVED") list = list.filter(r => r.status?.includes("Resolved"));
                  else if (dbStatusFilter === "REJECTED") list = list.filter(r => r.status?.includes("Rejected"));

                  if (dbSearch.trim()) {
                    const q = dbSearch.toLowerCase();
                    list = list.filter(r => {
                      const { usage, issueOrUpdate, impact } = getEssUsageDetails(r);
                      return (
                        String(r.id).toLowerCase().includes(q) ||
                        String(r.emp).toLowerCase().includes(q) ||
                        String(r.status).toLowerCase().includes(q) ||
                        usage.toLowerCase().includes(q) ||
                        issueOrUpdate.toLowerCase().includes(q) ||
                        impact.toLowerCase().includes(q)
                      );
                    });
                  }

                  if (!list.length) {
                    return (
                      <div className="mono" style={{ padding: "32px 20px", textAlign: "center", color: "#5C7891", fontSize: 12 }}>
                        — No ESS records matching active search / filter criteria —
                      </div>
                    );
                  }

                  return (
                    <table className="mono" style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", minWidth: 960 }}>
                      <thead>
                        <tr style={{ background: "rgba(216,166,242,0.1)", borderBottom: "1px solid rgba(216,166,242,0.25)" }}>
                          <th style={{ padding: "9px 12px", textAlign: "left", color: "#D8A6F2", fontWeight: 700, width: 85 }}>REQ ID</th>
                          <th style={{ padding: "9px 12px", textAlign: "left", color: "#D8A6F2", fontWeight: 700, width: 140 }}>EMPLOYEE</th>
                          <th style={{ padding: "9px 12px", textAlign: "left", color: "#D8A6F2", fontWeight: 700, width: 190 }}>SERVICE / USAGE</th>
                          <th style={{ padding: "9px 12px", textAlign: "left", color: "#D8A6F2", fontWeight: 700 }}>SUBMITTED ISSUE / UPDATES</th>
                          <th style={{ padding: "9px 12px", textAlign: "left", color: "#D8A6F2", fontWeight: 700, width: 160 }}>STATUS</th>
                          <th style={{ padding: "9px 12px", textAlign: "left", color: "#D8A6F2", fontWeight: 700 }}>SYSTEM WORKFLOW &amp; IMPACT</th>
                          <th style={{ padding: "9px 12px", textAlign: "center", color: "#D8A6F2", fontWeight: 700, width: 110 }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r) => {
                          const { usage, issueOrUpdate, impact } = getEssUsageDetails(r);
                          const badge = getStatusBadge(r.status);
                          const emp = (db.emp_docs || []).find(e => e.name?.toLowerCase() === r.emp?.toLowerCase());
                          const isPending = r.status?.includes("Pending") || r.status?.includes("Open");

                          return (
                            <tr key={r.id} className={flash.has(`ess:${r.id}`) ? "flash-row" : ""} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: isPending ? "rgba(242,184,75,0.03)" : "transparent" }}>
                              {/* ID */}
                              <td style={{ padding: "8px 12px", color: "#D8A6F2", fontWeight: 700, whiteSpace: "nowrap" }}>
                                {r.id}
                              </td>

                              {/* Employee */}
                              <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#DCE6F2" }}>
                                    {r.emp?.[0]?.toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ color: "#F4F7FB", fontWeight: 600, textTransform: "capitalize" }}>{r.emp}</div>
                                    <div style={{ fontSize: 9.5, color: "#5C7891" }}>{emp?.dept || "Operations"}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Service / Usage */}
                              <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                                <div style={{ color: "#F4F7FB", fontWeight: 600 }}>{usage}</div>
                                <div style={{ fontSize: 9.5, color: "#7C93AA" }}>Channel: {r.channel || "ESS Portal"}</div>
                              </td>

                              {/* Submitted Issue / Updates */}
                              <td style={{ padding: "8px 12px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                  {r.request === "Reimbursement Claim" && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                      <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 3, background: "rgba(242,107,138,0.15)", color: "#F26B8A", border: "1px solid rgba(242,107,138,0.3)" }}>
                                        {r.claimCategory || "Travel & Expense"}
                                      </span>
                                      <span style={{ color: "#8CE99A", fontWeight: 700, fontSize: 12 }}>
                                        {r.claimAmount != null ? `₹${Number(r.claimAmount).toLocaleString("en-IN")}` : (r.details?.match(/Rs\.[\d,]+/)?.[0]?.replace("Rs.", "₹") || "₹1,200")}
                                      </span>
                                      {r.details && (
                                        <span style={{ fontSize: 9.5, color: "#9FB4C8" }}>({r.details})</span>
                                      )}
                                    </div>
                                  )}

                                  {(r.request === "HR & IT Helpdesk" || r.request === "IT Declaration Submission") && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                      <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 3, background: r.ticketPriority === "Urgent" ? "rgba(242,107,107,0.2)" : "rgba(147,196,212,0.15)", color: r.ticketPriority === "Urgent" ? "#F26B6B" : "#93C4D4", border: "1px solid rgba(147,196,212,0.3)" }}>
                                        {r.ticketPriority || "Standard"} Priority
                                      </span>
                                      <span style={{ color: "#F4F7FB", fontWeight: 600 }}>
                                        {r.ticketSubject || r.details}
                                      </span>
                                      {r.ticketDescription && (
                                        <div style={{ fontSize: 9.5, color: "#7C93AA", fontStyle: "italic", width: "100%" }}>
                                          "{r.ticketDescription}"
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {r.request === "Profile Update" && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                      <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 3, background: "rgba(79,209,197,0.15)", color: "#4FD1C5", border: "1px solid rgba(79,209,197,0.3)" }}>
                                        {r.profileField || "Profile Field"}
                                      </span>
                                      <span style={{ color: "#7C93AA" }}>➔</span>
                                      <span style={{ color: "#DCE6F2", fontWeight: 600, background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: 3 }}>
                                        "{r.profileValue || (r.details?.includes(":") ? r.details.split(":").slice(1).join(":").trim() : r.details) || "Updated"}"
                                      </span>
                                    </div>
                                  )}

                                  {r.request === "Attendance Correction" && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                      <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 3, background: "rgba(242,184,75,0.15)", color: "#F2B84B", border: "1px solid rgba(242,184,75,0.3)" }}>
                                        {r.corrDate || "Today"}
                                      </span>
                                      <span style={{ color: "#F4F7FB", fontWeight: 600 }}>{r.corrSession || "Morning Punch IN"}</span>
                                      <span style={{ fontSize: 9.5, color: "#7C93AA" }}>({r.corrReason || "Biometric Failure"})</span>
                                    </div>
                                  )}

                                  {r.request === "Document Request" && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                      <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 3, background: "rgba(255,209,102,0.15)", color: "#FFD166", border: "1px solid rgba(255,209,102,0.3)" }}>
                                        {r.docType || "Bonafide Certificate"}
                                      </span>
                                      {r.docPurpose && (
                                        <span style={{ fontSize: 9.5, color: "#7C93AA" }}>Purpose: {r.docPurpose}</span>
                                      )}
                                    </div>
                                  )}

                                  {r.request !== "Reimbursement Claim" && r.request !== "HR & IT Helpdesk" && r.request !== "IT Declaration Submission" && r.request !== "Profile Update" && r.request !== "Attendance Correction" && r.request !== "Document Request" && (
                                    <div style={{ color: "#DCE6F2" }}>{issueOrUpdate}</div>
                                  )}
                                </div>
                              </td>

                              {/* Approval / Execution Status */}
                              <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                                <span style={{
                                  display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 12,
                                  background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontWeight: 700, fontSize: 10
                                }}>
                                  <span>{badge.icon}</span>
                                  <span>{badge.label}</span>
                                </span>
                              </td>

                              {/* System Workflow & Impact */}
                              <td style={{ padding: "8px 12px", color: "#9FB4C8", fontSize: 10 }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                                  <span style={{ color: isPending ? "#F2B84B" : "#8CE99A", flexShrink: 0 }}>⚡</span>
                                  <span>{impact}</span>
                                </div>
                              </td>

                              {/* Actions */}
                              <td style={{ padding: "8px 12px", textAlign: "center", whiteSpace: "nowrap" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                  <button
                                    onClick={() => setInspectRecord({ id: r.id, module: "Self-Service (ESS)", table: "ess_requests", row: r })}
                                    className="mono"
                                    style={{ padding: "3px 7px", fontSize: 9.5, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}
                                    title="Inspect full database record & JSON">
                                    <Eye size={10} /> Inspect
                                  </button>
                                  {isPending && (
                                    <button
                                      onClick={() => setShowNotifications(true)}
                                      className="mono"
                                      style={{ padding: "3px 7px", fontSize: 9.5, background: "rgba(242,184,75,0.12)", border: "1px solid rgba(242,184,75,0.35)", borderRadius: 3, color: "#F2B84B", cursor: "pointer", fontWeight: 600 }}
                                      title="Open Approvals Drawer to approve or reject">
                                      Review
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })() : (() => {
                  const currentMod = modules.find(m => m.id === dbTab);
                  let rows = [...(db[dbTab] || [])];
                  if (dbSearch.trim()) {
                    const q = dbSearch.toLowerCase();
                    rows = rows.filter(r => Object.values(r).some(val => String(val).toLowerCase().includes(q)));
                  }

                  if (!rows.length) {
                    return (
                      <div className="mono" style={{ padding: "32px 20px", textAlign: "center", color: "#5C7891", fontSize: 12 }}>
                        — No records found in {currentMod?.table || dbTab} —
                      </div>
                    );
                  }

                  // Bug 1 Fix: Compute union of all unique keys across all rows in the dataset
                  const allKeys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
                  // Sort to ensure primary identifier and core business fields appear first
                  const PRIMARY_KEYS = [
                    "id", "emp", "name", "type", "asset", "code", "dates", "date", "status",
                    "balance", "days", "amount", "gross", "pf", "net", "designation", "dept",
                    "returnedDate", "returnReason", "emiShortfall", "loanArrears", "disbursedMonth"
                  ];
                  const cols = [
                    ...PRIMARY_KEYS.filter(k => allKeys.includes(k)),
                    ...allKeys.filter(k => !PRIMARY_KEYS.includes(k))
                  ];

                  return (
                    <table className="mono" style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          <th style={{ padding: "9px 12px", textAlign: "left", color: COLORS[dbTab] || "#DCE6F2", fontWeight: 700, width: 50 }}>#</th>
                          {cols.map(c => (
                            <th key={c} style={{ padding: "9px 12px", textAlign: "left", color: COLORS[dbTab] || "#DCE6F2", fontWeight: 700, textTransform: "uppercase", fontSize: 10 }}>
                              {c.replace(/_/g, " ")}
                            </th>
                          ))}
                          <th style={{ padding: "9px 12px", textAlign: "center", color: "#7C93AA", width: 80 }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, idx) => (
                          <tr key={r.id || idx} className={flash.has(`${dbTab}:${r.id}`) ? "flash-row" : ""} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td style={{ padding: "7px 12px", color: "#5C7891", fontSize: 10 }}>{idx + 1}</td>
                            {cols.map(c => {
                              let val = r[c];
                              // Auto-resolve missing dailyRate for emp_docs from DESIGNATION_RATES
                              if (dbTab === "emp_docs" && c === "dailyRate" && (val === undefined || val === null || val === "")) {
                                val = DESIGNATION_RATES[r.designation] || 1000;
                              }
                              const displayVal = val === undefined || val === null || val === "" ? "—" : String(val);
                              const isDailyRate = c === "dailyRate" && displayVal !== "—";
                              return (
                                <td key={c} style={{
                                  padding: "7px 12px",
                                  color: c === "id" ? "#F2B84B" : (isDailyRate ? "#8CE99A" : (displayVal === "—" ? "#415569" : "#DCE6F2")),
                                  fontWeight: isDailyRate ? 600 : 400,
                                  whiteSpace: "nowrap",
                                  maxWidth: 220,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis"
                                }}>
                                  {isDailyRate ? `₹${Number(displayVal).toLocaleString("en-IN")}` : displayVal}
                                </td>
                              );
                            })}
                            <td style={{ padding: "7px 12px", textAlign: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                                <button
                                  onClick={() => setInspectRecord({ id: r.id, module: currentMod?.name || dbTab, table: currentMod?.table || dbTab, row: r })}
                                  className="mono"
                                  style={{ padding: "3px 7px", fontSize: 9.5, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", cursor: "pointer" }}
                                  title="Inspect full database record">
                                  <Eye size={10} />
                                </button>
                                {/* Item 2.1: In-Service Asset Return Quick Action */}
                                {dbTab === "assets" && r.status === "Allocated" && (
                                  <button
                                    onClick={() => actionReturnAsset(r.id)}
                                    className="mono"
                                    style={{ padding: "3px 7px", fontSize: 9.5, background: "rgba(242,148,107,0.15)", border: "1px solid rgba(242,148,107,0.4)", borderRadius: 3, color: "#F2946B", cursor: "pointer", fontWeight: 600 }}
                                    title="Return or decommission this allocated asset">
                                    Return
                                  </button>
                                )}
                                {/* Item 2.2: Approved Leave Cancellation Quick Action */}
                                {dbTab === "attendance_leave" && r.type !== "Attendance" && r.dates !== "Balance" && r.status === "Approved" && (
                                  <button
                                    onClick={() => handleCancelApprovedLeave(r)}
                                    className="mono"
                                    style={{ padding: "3px 7px", fontSize: 9.5, background: "rgba(242,107,107,0.15)", border: "1px solid rgba(242,107,107,0.4)", borderRadius: 3, color: "#F26B6B", cursor: "pointer", fontWeight: 600 }}
                                    title="Cancel Approved Leave & Restore Quota Balance">
                                    Cancel
                                  </button>
                                )}

                                {/* Item 2.4: Notice Period Quick Action: Final Clearance & F&F */}
                                {dbTab === "emp_docs" && r.status?.includes("Notice Period") && (
                                  <button
                                    onClick={() => {
                                      const ALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                      const exitDate = r.exit_date || getLocalDateStr();
                                      const exitD = new Date(exitDate);
                                      const exitMonthStr = `${ALL_MONTHS[exitD.getMonth()]} ${exitD.getFullYear()}`;
                                      const alreadyPaid = (db.payroll || []).some(p => p.emp === r.name && p.month === exitMonthStr && p.payrollMode !== "Full & Final Settlement");
                                      const wd = getWorkingDaysInMonthUpToDate(exitDate);
                                      setModal({
                                        type: "offboard",
                                        empId: r.id,
                                        reason: r.exitReason || "Resignation",
                                        exitDate: exitDate,
                                        workingDays: alreadyPaid ? 0 : wd.workingDays,
                                        separationMode: "final_clearance"
                                      });
                                    }}
                                    className="mono"
                                    style={{ padding: "3px 8px", fontSize: 9.5, background: "rgba(242,107,107,0.18)", border: "1px solid rgba(242,107,107,0.5)", borderRadius: 3, color: "#F26B6B", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}
                                    title="Notice Period Completed: Open Final Day Clearance & Full and Final (F&F) Settlement">
                                    ⚡ Final Clearance
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      ) : (
        <div id="master-records-explorer-restricted" style={{
          marginTop: 22,
          border: "1px dashed rgba(242,184,75,0.35)",
          borderRadius: 8,
          background: "linear-gradient(135deg, rgba(13,20,32,0.95), rgba(242,184,75,0.04))",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 8,
              background: "rgba(242,184,75,0.12)",
              border: "1px solid rgba(242,184,75,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0
            }}>
              <Shield size={22} color="#F2B84B" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: "#F4F7FB" }}>
                  Master Database &amp; System Audit Trail Restricted
                </span>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 10,
                  background: "rgba(242,184,75,0.15)", color: "#F2B84B",
                  border: "1px solid rgba(242,184,75,0.35)", fontWeight: 700
                }}>
                  RBAC: EMPLOYEE VIEW ACTIVE
                </span>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "#7C93AA", marginTop: 4, lineHeight: 1.5 }}>
                Direct PostgreSQL database inspection, raw JSON payloads, and company-wide cross-module records are restricted to HR Administrators and System Auditors under data confidentiality policies.
              </div>
            </div>
          </div>

          <button
            onClick={() => setHrViewEnabled(true)}
            className="mono"
            style={{
              padding: "8px 16px",
              background: "rgba(125,211,252,0.12)",
              border: "1px solid rgba(125,211,252,0.35)",
              borderRadius: 5,
              color: "#7DD3FC",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 7,
              transition: "all 0.15s ease"
            }}>
            <Users size={14} /> Switch to HR Admin Role
          </button>
        </div>
      )}

      {/* ── Inspect Record Payload Modal ───────────────────────────────────── */}
      {inspectRecord && hrViewEnabled && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4,8,14,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 85 }}>
          <div style={{ width: 640, maxHeight: "85vh", background: "#0D1420", border: "1px solid rgba(216,166,242,0.4)", borderRadius: 8, padding: 22, display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Database size={18} color="#D8A6F2" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#F4F7FB" }}>
                    Record Payload: {inspectRecord.id}
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: "#7C93AA" }}>
                    Module: {inspectRecord.module} · Table: <code style={{ color: "#D8A6F2" }}>{inspectRecord.table}</code>
                  </div>
                </div>
              </div>
              <X size={18} style={{ cursor: "pointer", color: "#7C93AA" }} onClick={() => setInspectRecord(null)} />
            </div>

            <div style={{ overflowY: "auto", flex: 1, paddingRight: 4 }} className="scrollbar-thin">
              <div className="mono" style={{ fontSize: 10, color: "#5C7891", marginBottom: 8, letterSpacing: "0.08em" }}>PARSED ATTRIBUTES</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {Object.entries(inspectRecord.row || {})
                  .filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== "—")
                  .map(([k, v]) => (
                    <div key={k} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4, padding: "7px 10px" }} className="mono">
                      <div style={{ fontSize: 9.5, color: "#7C93AA", textTransform: "uppercase" }}>{k.replace(/_/g, " ")}</div>
                      <div style={{ fontSize: 11, color: "#DCE6F2", marginTop: 2, wordBreak: "break-word" }}>{String(v)}</div>
                    </div>
                  ))}

              </div>

              <div className="mono" style={{ fontSize: 10, color: "#5C7891", marginBottom: 6, letterSpacing: "0.08em" }}>RAW JSON PAYLOAD</div>
              <pre className="mono" style={{ background: "#070B12", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: 12, fontSize: 10.5, color: "#8CE99A", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                {JSON.stringify(inspectRecord.row, null, 2)}
              </pre>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button className="btn" onClick={() => {
                navigator.clipboard?.writeText(JSON.stringify(inspectRecord.row, null, 2));
              }} style={{ borderColor: "#D8A6F2", color: "#D8A6F2", background: "rgba(216,166,242,0.1)" }}>
                Copy JSON
              </button>
              <button className="btn" onClick={() => setInspectRecord(null)} style={{ borderColor: "rgba(255,255,255,0.2)", color: "#7C93AA" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
      {/* ── Add Employee Modal (2-Step Onboarding Wizard) ──────────────────── */}
      {showEmpForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4,8,14,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ width: 480, maxWidth: "95vw", background: "#0D1420", border: "1px solid rgba(79,209,197,0.4)", borderRadius: 8, padding: 22, boxShadow: "0 24px 48px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#F4F7FB" }}>
                  {onboardStep === 1 ? "Add New Employee — Hire Requisition" : "New Hire Onboarding Checklist"}
                </div>
                <div style={{ fontSize: 11, color: "#7C93AA", marginTop: 2 }}>
                  {onboardStep === 1 ? "Step 1 of 2: Position details & vacancy verification" : "Step 2 of 2: Provisioning, leave quotas & IT assets"}
                </div>
              </div>
              <X size={16} style={{ cursor: "pointer", color: "#7C93AA" }} onClick={() => setShowEmpForm(false)} />
            </div>

            {/* Stepper Progress Indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div
                onClick={() => setOnboardStep(1)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 11,
                  color: onboardStep === 1 ? "#4FD1C5" : "#8CE99A",
                  fontWeight: 600, cursor: onboardStep === 2 ? "pointer" : "default"
                }}>
                <span style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: onboardStep === 1 ? "rgba(79,209,197,0.2)" : "rgba(140,233,154,0.2)",
                  border: `1px solid ${onboardStep === 1 ? "#4FD1C5" : "#8CE99A"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10
                }}>
                  {onboardStep === 1 ? "1" : "✓"}
                </span>
                1. Requisition
              </div>
              <div style={{ flex: 1, height: 2, background: onboardStep === 2 ? "rgba(79,209,197,0.4)" : "rgba(255,255,255,0.1)", margin: "0 6px" }} />
              <div style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 11,
                color: onboardStep === 2 ? "#4FD1C5" : "#5C7891",
                fontWeight: onboardStep === 2 ? 600 : 400
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: onboardStep === 2 ? "rgba(79,209,197,0.2)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${onboardStep === 2 ? "#4FD1C5" : "rgba(255,255,255,0.2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10
                }}>
                  2
                </span>
                2. Provisioning Checklist
              </div>
            </div>

            {(() => {
              const selectedDeptBudget = budgetByDept[empFormDept];
              const selectedDeptVacant = selectedDeptBudget ? Math.max(0, selectedDeptBudget.sanctioned - selectedDeptBudget.headcount) : 0;
              const isSelectedDeptFull = selectedDeptBudget && selectedDeptBudget.headcount >= selectedDeptBudget.sanctioned;
              const alumniList = (db.emp_docs || []).filter(e => e.status?.includes("Inactive"));
              const targetAlumni = alumniList.find(e => e.id === rehireEmpId) || alumniList[0];
              const isTechDept = ["Engineering", "Product"].includes(empFormDept);
              const laptopModel = isTechDept ? 'MacBook Pro 16" (M3)' : "Dell Latitude 7440";

              const totalCompanyVacantSeats = Object.values(budgetByDept).reduce((sum, b) => sum + Math.max(0, b.sanctioned - b.headcount), 0);

              const handleSwitchToNew = () => {
                setHireMode("new");
                setEmpFormName("");
                const availableDept = DEPT_POOL.find(d => {
                  const b = budgetByDept[d];
                  return b && b.headcount < b.sanctioned;
                }) || DEPT_POOL[0];
                setEmpFormDept(availableDept);
                setEmpFormDesig(DESIG_POOL[0]);
              };

              const existingDirectorInDept = (db.emp_docs || []).find(e =>
                (e.department === empFormDept || e.dept === empFormDept) &&
                !e.status?.includes("Inactive") &&
                e.id !== targetAlumni?.id &&
                (e.designation || e.desig || "").toLowerCase().includes("director")
              );
              const isDirectorBlocked = empFormDesig.toLowerCase().includes("director") && !!existingDirectorInDept;

              const handleSwitchToRehire = () => {
                setHireMode("rehire");
                if (alumniList.length > 0) {
                  const target = rehireEmpId && alumniList.some(e => e.id === rehireEmpId)
                    ? alumniList.find(e => e.id === rehireEmpId)
                    : alumniList[0];
                  setRehireEmpId(target.id);
                  setEmpFormName(target.name);
                  const dept = target.department || target.dept || DEPT_POOL[0];
                  setEmpFormDept(dept);
                  let desig = target.designation || target.desig || DESIG_POOL[0];
                  if (desig.toLowerCase().includes("director")) {
                    const hasDir = (db.emp_docs || []).some(e =>
                      (e.department === dept || e.dept === dept) &&
                      !e.status?.includes("Inactive") &&
                      (e.designation || e.desig || "").toLowerCase().includes("director")
                    );
                    if (hasDir) desig = "Senior Manager";
                  }
                  setEmpFormDesig(desig);
                }
              };

              const handleSelectAlumni = (empId) => {
                setRehireEmpId(empId);
                const target = alumniList.find(e => e.id === empId);
                if (target) {
                  setEmpFormName(target.name);
                  const dept = target.department || target.dept || DEPT_POOL[0];
                  setEmpFormDept(dept);
                  let desig = target.designation || target.desig || DESIG_POOL[0];
                  if (desig.toLowerCase().includes("director")) {
                    const hasDir = (db.emp_docs || []).some(e =>
                      (e.department === dept || e.dept === dept) &&
                      !e.status?.includes("Inactive") &&
                      (e.designation || e.desig || "").toLowerCase().includes("director")
                    );
                    if (hasDir) desig = "Senior Manager";
                  }
                  setEmpFormDesig(desig);
                }
              };

              if (onboardStep === 1) {
                return (
                  <>
                    {/* Auto Employee ID badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "7px 12px", background: "rgba(79,209,197,0.07)", border: "1px solid rgba(79,209,197,0.2)", borderRadius: 4 }}>
                      <span className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>AUTO EMP ID</span>
                      <span className="mono" style={{ fontSize: 13, color: "#4FD1C5", fontWeight: 600 }}>EMP-{idSeed}</span>
                    </div>

                    {/* Requisition Mode Dual-Tab Selector */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                      <button
                        type="button"
                        onClick={handleSwitchToNew}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 5,
                          border: hireMode === "new" ? "1px solid #4FD1C5" : "1px solid rgba(255,255,255,0.1)",
                          background: hireMode === "new" ? "rgba(79,209,197,0.15)" : "rgba(255,255,255,0.02)",
                          color: hireMode === "new" ? "#4FD1C5" : "#7C93AA",
                          fontSize: 11,
                          fontWeight: hireMode === "new" ? 600 : 400,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          transition: "all 0.15s ease"
                        }}>
                        <Building2 size={13} style={{ color: hireMode === "new" ? "#4FD1C5" : "#7C93AA" }} />
                        <span>New Candidate</span>
                        <span style={{
                          fontSize: 9.5,
                          padding: "1px 6px",
                          borderRadius: 10,
                          background: hireMode === "new" ? "#4FD1C5" : "rgba(79,209,197,0.25)",
                          color: hireMode === "new" ? "#0D1420" : "#4FD1C5",
                          fontWeight: 700
                        }}>
                          {totalCompanyVacantSeats} seats
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSwitchToRehire}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 5,
                          border: hireMode === "rehire" ? "1px solid #8CE99A" : "1px solid rgba(255,255,255,0.1)",
                          background: hireMode === "rehire" ? "rgba(140,233,154,0.15)" : "rgba(255,255,255,0.02)",
                          color: hireMode === "rehire" ? "#8CE99A" : "#7C93AA",
                          fontSize: 11,
                          fontWeight: hireMode === "rehire" ? 600 : 400,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          transition: "all 0.15s ease"
                        }}>
                        <RotateCcw size={13} style={{ color: hireMode === "rehire" ? "#8CE99A" : "#7C93AA" }} />
                        <span>Rehire Alumni</span>
                        <span style={{
                          fontSize: 9.5,
                          padding: "1px 6px",
                          borderRadius: 10,
                          background: alumniList.length > 0
                            ? (hireMode === "rehire" ? "#8CE99A" : "rgba(140,233,154,0.25)")
                            : "rgba(255,255,255,0.08)",
                          color: alumniList.length > 0
                            ? (hireMode === "rehire" ? "#0D1420" : "#8CE99A")
                            : "#7C93AA",
                          fontWeight: 700
                        }}>
                          {alumniList.length} alumni
                        </span>
                      </button>
                    </div>

                    {hireMode === "rehire" ? (
                      alumniList.length === 0 ? (
                        <div style={{
                          padding: "16px 14px", background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
                          textAlign: "center", marginBottom: 14
                        }}>
                          <div style={{ fontSize: 13, color: "#8CE99A", fontWeight: 600, marginBottom: 4 }}>
                            ✨ No Inactive Alumni Records
                          </div>
                          <div style={{ fontSize: 11, color: "#7C93AA", marginBottom: 12, lineHeight: 1.5 }}>
                            All staff members are currently active. When an employee resigns or offboards, they are archived here for fast-track boomerang rehire.
                          </div>
                          <button
                            type="button"
                            className="btn"
                            onClick={handleSwitchToNew}
                            style={{ fontSize: 11, padding: "6px 14px", borderColor: "#4FD1C5", color: "#4FD1C5" }}>
                            Switch to New Candidate →
                          </button>
                        </div>
                      ) : (
                        <>
                          <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>
                            SELECT EX-EMPLOYEE TO REHIRE (BOOMERANG HIRE)
                          </label>
                          <select
                            value={rehireEmpId || targetAlumni?.id}
                            onChange={(e) => handleSelectAlumni(e.target.value)}
                            className="mono"
                            style={{
                              width: "100%", marginTop: 5, marginBottom: 12, padding: "8px 10px",
                              background: "#0A0F1A", border: "1px solid rgba(140,233,154,0.35)",
                              borderRadius: 4, color: "#8CE99A", fontSize: 11.5, boxSizing: "border-box", appearance: "auto", fontWeight: 600
                            }}>
                            {alumniList.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.id}) — Ex-{a.designation || a.desig} · {a.department || a.dept} (Exit: {a.exitReason || "Resignation"})
                              </option>
                            ))}
                          </select>

                          {/* Rehire Boomerang Advantages Card */}
                          {targetAlumni && (
                            <div style={{
                              padding: "10px 12px", background: "rgba(140,233,154,0.07)",
                              border: "1px solid rgba(140,233,154,0.3)", borderRadius: 6,
                              marginBottom: 14, fontSize: 11, color: "#DCE6F2"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <div style={{ fontWeight: 600, color: "#8CE99A", display: "flex", alignItems: "center", gap: 6 }}>
                                  🔄 Boomerang Rehire: {targetAlumni.name}
                                </div>
                                <span className="mono" style={{ fontSize: 9.5, color: "#7DD3FC", background: "rgba(125,211,252,0.15)", padding: "2px 6px", borderRadius: 3 }}>
                                  {targetAlumni.id}
                                </span>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 10, color: "#7C93AA" }}>
                                <div>Past Role: <strong style={{ color: "#DCE6F2" }}>{targetAlumni.designation || targetAlumni.desig}</strong></div>
                                <div>Past Dept: <strong style={{ color: "#DCE6F2" }}>{targetAlumni.department || targetAlumni.dept}</strong></div>
                                <div>Agency Fee: <strong style={{ color: "#8CE99A" }}>Rs. 0 (Waived)</strong></div>
                                <div>DB Status: <strong style={{ color: "#F2B84B" }}>Inactive ➔ Active</strong></div>
                              </div>
                              <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "#8CE99A" }}>
                                ✓ Re-activating this alumnus restores their master employee record, allocates a fresh attendance ledger, and updates PostgreSQL database status to Active.
                              </div>
                            </div>
                          )}
                        </>
                      )
                    ) : (
                      <>
                        <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>FULL NAME</label>
                        <input
                          autoFocus value={empFormName} onChange={(e) => setEmpFormName(e.target.value)}
                          placeholder="e.g. Priya Nair"
                          className="mono"
                          style={{ width: "100%", marginTop: 5, marginBottom: 14, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "#DCE6F2", fontSize: 12.5, boxSizing: "border-box" }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && empFormName.trim() && !isSelectedDeptFull) {
                              setOnboardStep(2);
                            }
                          }}
                        />
                      </>
                    )}

                    <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>DEPARTMENT</label>
                    <select
                      value={empFormDept} onChange={(e) => setEmpFormDept(e.target.value)}
                      className="mono"
                      style={{ width: "100%", marginTop: 5, marginBottom: 14, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "#DCE6F2", fontSize: 12, boxSizing: "border-box", appearance: "auto" }}>
                      {DEPT_POOL.map((d) => {
                        const b = budgetByDept[d];
                        const vCount = b ? Math.max(0, b.sanctioned - b.headcount) : 0;
                        const full = b && b.headcount >= b.sanctioned;
                        return (
                          <option key={d} value={d} disabled={full}>
                            {d} {full ? "— (0 Vacant · Ceiling Full)" : `— (${vCount} vacant of ${b?.sanctioned || 0})`}
                          </option>
                        );
                      })}
                    </select>

                    <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>DESIGNATION</label>
                    <select
                      value={empFormDesig} onChange={(e) => setEmpFormDesig(e.target.value)}
                      className="mono"
                      style={{ width: "100%", marginTop: 5, marginBottom: 14, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "#DCE6F2", fontSize: 12, boxSizing: "border-box", appearance: "auto" }}>
                      {DESIG_POOL.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>

                    {isDirectorBlocked ? (
                      <div style={{
                        padding: "8px 10px", background: "rgba(242,107,107,0.1)",
                        border: "1px solid rgba(242,107,107,0.35)", borderRadius: 4,
                        marginBottom: 16, fontSize: 10.5, color: "#F26B6B", display: "flex", alignItems: "flex-start", gap: 7
                      }}>
                        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ lineHeight: 1.5 }}>
                          <strong>Director Seat Occupied:</strong> {empFormDept} already has an active Director ({existingDirectorInDept?.name}). Only 1 Director is permitted per department. Please select Senior Manager or another grade.
                        </div>
                      </div>
                    ) : hireMode === "rehire" ? (
                      <div style={{
                        padding: "8px 10px", background: "rgba(140,233,154,0.08)",
                        border: "1px solid rgba(140,233,154,0.3)", borderRadius: 4,
                        marginBottom: 16, fontSize: 10.5, color: "#8CE99A", display: "flex", alignItems: "flex-start", gap: 7
                      }}>
                        <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ lineHeight: 1.5 }}>
                          <strong>Boomerang Rehire Ready:</strong> Restoring <strong>{empFormName || "Alumni"}</strong> to <strong>{empFormDept}</strong> as <strong>{empFormDesig}</strong>.
                        </div>
                      </div>
                    ) : isSelectedDeptFull ? (
                      <div style={{
                        padding: "8px 10px", background: "rgba(242,107,107,0.1)",
                        border: "1px solid rgba(242,107,107,0.35)", borderRadius: 4,
                        marginBottom: 16, fontSize: 10.5, color: "#F26B6B", display: "flex", alignItems: "flex-start", gap: 7
                      }}>
                        <XCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ lineHeight: 1.5 }}>
                          <strong>Headcount Ceiling Full:</strong> {empFormDept} has {selectedDeptBudget?.headcount}/{selectedDeptBudget?.sanctioned} seats filled (0 vacancies). Go to <strong>Revise Budget</strong> to expand sanctioned strength before adding staff.
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: "8px 10px", background: "rgba(125,211,252,0.08)",
                        border: "1px solid rgba(125,211,252,0.22)", borderRadius: 4,
                        marginBottom: 16, fontSize: 10.5, color: "#7DD3FC", display: "flex", alignItems: "flex-start", gap: 7
                      }}>
                        <Building2 size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ lineHeight: 1.5 }}>
                          <strong>Sanctioned Expansion Hire:</strong> {selectedDeptVacant} vacancy slot(s) available in {empFormDept} ({selectedDeptBudget?.headcount}/{selectedDeptBudget?.sanctioned} filled).
                        </div>
                      </div>
                    )}

                    <button
                      className="btn"
                      disabled={!empFormName.trim() || isSelectedDeptFull || isDirectorBlocked || (hireMode === "rehire" && alumniList.length === 0)}
                      onClick={() => setOnboardStep(2)}
                      style={{
                        width: "100%", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        borderColor: isSelectedDeptFull || isDirectorBlocked ? "rgba(242,107,107,0.4)" : "#4FD1C5",
                        color: isSelectedDeptFull || isDirectorBlocked ? "#F26B6B" : "#0D1420",
                        background: isSelectedDeptFull || isDirectorBlocked ? "rgba(242,107,107,0.08)" : "linear-gradient(135deg, #4FD1C5, #38B2AC)",
                        opacity: isSelectedDeptFull || isDirectorBlocked || !empFormName.trim() ? 0.6 : 1,
                        cursor: isSelectedDeptFull || isDirectorBlocked || !empFormName.trim() ? "not-allowed" : "pointer",
                        fontWeight: 700, padding: "10px 14px", borderRadius: 4
                      }}>
                      {isSelectedDeptFull
                        ? "CANNOT HIRE — CEILING FULL"
                        : isDirectorBlocked
                          ? "CANNOT HIRE — DIRECTOR SEAT OCCUPIED"
                          : !empFormName.trim()
                            ? (hireMode === "rehire" ? "SELECT ALUMNI TO PROCEED" : "ENTER FULL NAME TO PROCEED")
                            : hireMode === "rehire"
                              ? `Proceed to Rehire ${empFormName} (Step 2) →`
                              : "Proceed to Provisioning Checklist (Step 2) →"}
                    </button>
                  </>
                );
              }

              // Step 2: Onboarding Provisioning Checklist
              return (
                <>
                  {/* Candidate Summary Strip */}
                  <div style={{
                    padding: "9px 12px", background: "rgba(79,209,197,0.06)",
                    border: "1px solid rgba(79,209,197,0.25)", borderRadius: 6,
                    marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    <div>
                      <div style={{ color: "#F4F7FB", fontWeight: 600, fontSize: 13.5 }}>
                        {empFormName.trim() || "New Hire"}
                      </div>
                      <div className="mono" style={{ color: "#7C93AA", fontSize: 10.5, marginTop: 2 }}>
                        {empFormDesig} · <span style={{ color: "#4FD1C5" }}>{empFormDept}</span>
                        {hireMode === "rehire" && targetAlumni && (
                          <span style={{ color: "#8CE99A", marginLeft: 6 }}>· 🔄 Boomerang Rehire</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="mono" style={{ fontSize: 10, color: "#8CE99A", background: "rgba(140,233,154,0.12)", padding: "2px 7px", borderRadius: 3, border: "1px solid rgba(140,233,154,0.3)" }}>
                        {hireMode === "rehire" && targetAlumni ? targetAlumni.id : `EMP-${idSeed}`}
                      </span>
                      <div className="mono" style={{ fontSize: 9.5, color: "#5C7891", marginTop: 3 }}>
                        Daily: ₹{(DESIGNATION_RATES[empFormDesig] || 1000).toLocaleString()}/day
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                    {/* Item 1: 3-Tier Leave Quotas */}
                    <div style={{
                      padding: "10px 12px", background: "#0A0F1A",
                      border: "1px solid rgba(125,211,252,0.25)", borderRadius: 6
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <CalendarCheck size={14} style={{ color: "#7DD3FC" }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>3-Tier Leave Quota Allocation</span>
                        </div>
                        <span className="mono" style={{ fontSize: 9.5, color: "#7DD3FC", background: "rgba(125,211,252,0.12)", padding: "2px 6px", borderRadius: 3 }}>
                          Total: {(Number(onboardLeaves.annual) || 0) + (Number(onboardLeaves.casual) || 0) + (Number(onboardLeaves.sick) || 0)} Days Credited
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        <div>
                          <label className="mono" style={{ fontSize: 9, color: "#7C93AA", display: "block", marginBottom: 3 }}>ANNUAL (DAYS)</label>
                          <input
                            type="number" min="0" max="30"
                            value={onboardLeaves.annual}
                            onChange={(e) => setOnboardLeaves(prev => ({ ...prev, annual: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="mono"
                            style={{ width: "100%", padding: "5px 8px", background: "#060A12", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#7DD3FC", fontSize: 12, fontWeight: 600, boxSizing: "border-box" }}
                          />
                        </div>
                        <div>
                          <label className="mono" style={{ fontSize: 9, color: "#7C93AA", display: "block", marginBottom: 3 }}>CASUAL (DAYS)</label>
                          <input
                            type="number" min="0" max="20"
                            value={onboardLeaves.casual}
                            onChange={(e) => setOnboardLeaves(prev => ({ ...prev, casual: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="mono"
                            style={{ width: "100%", padding: "5px 8px", background: "#060A12", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#8CE99A", fontSize: 12, fontWeight: 600, boxSizing: "border-box" }}
                          />
                        </div>
                        <div>
                          <label className="mono" style={{ fontSize: 9, color: "#7C93AA", display: "block", marginBottom: 3 }}>SICK (DAYS)</label>
                          <input
                            type="number" min="0" max="20"
                            value={onboardLeaves.sick}
                            onChange={(e) => setOnboardLeaves(prev => ({ ...prev, sick: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="mono"
                            style={{ width: "100%", padding: "5px 8px", background: "#060A12", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#F2B84B", fontSize: 12, fontWeight: 600, boxSizing: "border-box" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Item 2: IT Workstation & Hardware Allocation */}
                    <div
                      onClick={() => setOnboardLaptop(!onboardLaptop)}
                      style={{
                        padding: "9px 12px", background: onboardLaptop ? "rgba(242,148,107,0.06)" : "#0A0F1A",
                        border: `1px solid ${onboardLaptop ? "rgba(242,148,107,0.35)" : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10,
                        transition: "all 0.15s ease"
                      }}>
                      {onboardLaptop ? <CheckSquare size={16} style={{ color: "#F2946B", flexShrink: 0, marginTop: 2 }} /> : <Square size={16} style={{ color: "#5C7891", flexShrink: 0, marginTop: 2 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: onboardLaptop ? "#F4F7FB" : "#7C93AA" }}>
                            IT Hardware & Workstation Setup
                          </span>
                          <span className="mono" style={{ fontSize: 9.5, color: "#F2946B", background: "rgba(242,148,107,0.12)", padding: "2px 6px", borderRadius: 3 }}>
                            {laptopModel}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: "#7C93AA", marginTop: 2 }}>
                          Allocate dedicated corporate laptop into <strong>company_assets</strong> table &amp; issue RFID badge.
                        </div>
                      </div>
                    </div>

                    {/* Item 3: Mandatory Induction & Compliance Training */}
                    <div
                      onClick={() => setOnboardTraining(!onboardTraining)}
                      style={{
                        padding: "9px 12px", background: onboardTraining ? "rgba(216,166,242,0.06)" : "#0A0F1A",
                        border: `1px solid ${onboardTraining ? "rgba(216,166,242,0.35)" : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10,
                        transition: "all 0.15s ease"
                      }}>
                      {onboardTraining ? <CheckSquare size={16} style={{ color: "#D8A6F2", flexShrink: 0, marginTop: 2 }} /> : <Square size={16} style={{ color: "#5C7891", flexShrink: 0, marginTop: 2 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: onboardTraining ? "#F4F7FB" : "#7C93AA" }}>
                            Workplace Ethics & POSH Induction Track
                          </span>
                          <span className="mono" style={{ fontSize: 9.5, color: "#D8A6F2", background: "rgba(216,166,242,0.12)", padding: "2px 6px", borderRadius: 3 }}>
                            Mandatory LMS
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: "#7C93AA", marginTop: 2 }}>
                          Assign 4-module statutory compliance course and schedule 30-day compliance audit.
                        </div>
                      </div>
                    </div>

                    {/* Item 4: Biometric IoT Punch Profile */}
                    <div
                      onClick={() => setOnboardBiometric(!onboardBiometric)}
                      style={{
                        padding: "9px 12px", background: onboardBiometric ? "rgba(79,209,197,0.06)" : "#0A0F1A",
                        border: `1px solid ${onboardBiometric ? "rgba(79,209,197,0.35)" : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10,
                        transition: "all 0.15s ease"
                      }}>
                      {onboardBiometric ? <CheckSquare size={16} style={{ color: "#4FD1C5", flexShrink: 0, marginTop: 2 }} /> : <Square size={16} style={{ color: "#5C7891", flexShrink: 0, marginTop: 2 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: onboardBiometric ? "#F4F7FB" : "#7C93AA" }}>
                            Biometric IoT Access Profile
                          </span>
                          <span className="mono" style={{ fontSize: 9.5, color: "#4FD1C5", background: "rgba(79,209,197,0.12)", padding: "2px 6px", borderRadius: 3 }}>
                            Fingerprint Punch
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: "#7C93AA", marginTop: 2 }}>
                          Register key in biometric sensor controller for instant terminal check-in synchronization.
                        </div>
                      </div>
                    </div>

                    {/* Item 5: Statutory Payroll Setup */}
                    <div
                      onClick={() => setOnboardStatutory(!onboardStatutory)}
                      style={{
                        padding: "9px 12px", background: onboardStatutory ? "rgba(140,233,154,0.06)" : "#0A0F1A",
                        border: `1px solid ${onboardStatutory ? "rgba(140,233,154,0.35)" : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10,
                        transition: "all 0.15s ease"
                      }}>
                      {onboardStatutory ? <CheckSquare size={16} style={{ color: "#8CE99A", flexShrink: 0, marginTop: 2 }} /> : <Square size={16} style={{ color: "#5C7891", flexShrink: 0, marginTop: 2 }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: onboardStatutory ? "#F4F7FB" : "#7C93AA" }}>
                            Statutory PF & Payroll Ledger Enrollment
                          </span>
                          <span className="mono" style={{ fontSize: 9.5, color: "#8CE99A", background: "rgba(140,233,154,0.12)", padding: "2px 6px", borderRadius: 3 }}>
                            PF 12% + Tax
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: "#7C93AA", marginTop: 2 }}>
                          Initialize EPF/ESI statutory deduction ledger and auto-link to monthly payroll batch.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 Action Buttons */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="btn"
                      onClick={() => setOnboardStep(1)}
                      style={{
                        flex: "0 0 100px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        borderColor: "rgba(255,255,255,0.2)", color: "#94A3B8", background: "rgba(255,255,255,0.04)",
                        padding: "10px 14px", borderRadius: 4, cursor: "pointer"
                      }}>
                      <ArrowLeft size={14} />
                      Back
                    </button>
                    <button
                      className="btn"
                      onClick={confirmAddEmployee}
                      style={{
                        flex: 1, textAlign: "center",
                        borderColor: "#4FD1C5", color: "#060A12",
                        background: "linear-gradient(135deg, #4FD1C5, #38B2AC)",
                        fontWeight: 700, letterSpacing: "0.03em",
                        boxShadow: "0 0 16px rgba(79,209,197,0.35)",
                        padding: "10px 14px", borderRadius: 4, cursor: "pointer"
                      }}>
                      {hireMode === "rehire"
                        ? `CONFIRM REHIRE & RESTORE ${empFormName.toUpperCase()} TO ACTIVE`
                        : hireMode === "vacancy" && currentVac
                          ? `CONFIRM & BACKFILL VACANCY ${currentVac.id}`
                          : exactMatchingVacancy
                            ? `CONFIRM & BACKFILL VACANCY ${exactMatchingVacancy.id}`
                            : "CONFIRM ONBOARDING & PROVISION"}
                    </button>
                  </div>
                </>
              );
            })()}
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", marginBottom: 12, background: "rgba(216,166,242,0.08)", border: "1px solid rgba(216,166,242,0.25)", borderRadius: 3 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(216,166,242,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span className="mono" style={{ fontSize: 9, color: "#D8A6F2" }}>{emp?.name.split(" ").map(w => w[0]).join("").slice(0, 2)}</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#E4C6FA" }}>{emp?.name}</div>
                        <div className="mono" style={{ fontSize: 10, color: "#7C5C90", marginLeft: 4 }}>{emp?.dept}</div>
                        <button onClick={() => setLeaveStep(1)}
                          className="mono" style={{ marginLeft: "auto", fontSize: 9, color: "#7C5C90", background: "none", border: "none", cursor: "pointer" }}>← Change</button>
                      </div>

                      {/* Quota balance banner for tracked leaves vs On-Duty vs Special Policies */}
                      {(() => {
                        if (leaveType === "On-Duty (OD) / Business Travel") {
                          return (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "7px 10px", background: "rgba(147,196,212,0.08)", border: "1px solid rgba(147,196,212,0.3)", borderRadius: 3 }}>
                              <span className="mono" style={{ fontSize: 10, color: "#93C4D4" }}>✈️ OFFICIAL BUSINESS / CLIENT TRIP:</span>
                              <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "#8CE99A" }}>
                                0 Leaves Deducted · {isHalfDay ? "Rs.500 Half-Day Allowance" : "Rs.1,000/d Allowance"}
                              </span>
                            </div>
                          );
                        }
                        if (leaveType === "Maternity Leave") {
                          return (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "7px 10px", background: "rgba(242,107,138,0.08)", border: "1px solid rgba(242,107,138,0.3)", borderRadius: 3 }}>
                              <span className="mono" style={{ fontSize: 10, color: "#F26B8A" }}>👶 STATUTORY MATERNITY:</span>
                              <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "#8CE99A" }}>
                                Up to 84 Days · 100% Fully Paid · 0 Quota Deducted
                              </span>
                            </div>
                          );
                        }
                        if (leaveType === "Paternity Leave") {
                          return (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "7px 10px", background: "rgba(107,194,242,0.08)", border: "1px solid rgba(107,194,242,0.3)", borderRadius: 3 }}>
                              <span className="mono" style={{ fontSize: 10, color: "#6BC2F2" }}>🍼 CORPORATE PATERNITY:</span>
                              <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "#8CE99A" }}>
                                Up to 10 Days Max · 100% Fully Paid · 0 Quota Deducted
                              </span>
                            </div>
                          );
                        }
                        if (leaveType === "Comp Off") {
                          return (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "7px 10px", background: "rgba(242,184,75,0.08)", border: "1px solid rgba(242,184,75,0.3)", borderRadius: 3 }}>
                              <span className="mono" style={{ fontSize: 10, color: "#F2B84B" }}>🔄 COMPENSATORY OFF:</span>
                              <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "#8CE99A" }}>
                                Weekend/Holiday Credit · 100% Paid (Max 2d)
                              </span>
                            </div>
                          );
                        }
                        const quotaTracked = ["Annual Leave", "Casual Leave", "Sick Leave"].includes(leaveType);
                        const curAvail = quotaTracked ? getLeaveBalance(emp?.name, leaveType) : null;
                        return quotaTracked ? (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "6px 10px", background: curAvail > 0 ? "rgba(125,211,252,0.06)" : "rgba(242,107,107,0.08)", border: `1px solid ${curAvail > 0 ? "rgba(125,211,252,0.25)" : "rgba(242,107,107,0.3)"}`, borderRadius: 3 }}>
                            <span className="mono" style={{ fontSize: 10, color: "#7C93AA" }}>AVAILABLE {leaveType.toUpperCase()} QUOTA:</span>
                            <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: curAvail > 0 ? "#7DD3FC" : "#F26B6B" }}>
                              {curAvail.toFixed(1)} days
                            </span>
                          </div>
                        ) : null;
                      })()}

                      <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>LEAVE TYPE</label>
                      <select value={leaveType} onChange={(e) => {
                        const t = e.target.value;
                        setLeaveType(t);
                        if (t === "Maternity Leave" || t === "Paternity Leave") {
                          setIsHalfDay(false);
                        } else if (t.includes("On-Duty") && isHalfDay) {
                          setHalfDaySession("Morning Session (Client Visit AM · Office PM)");
                        }
                      }}
                        className="mono"
                        style={{ width: "100%", marginTop: 5, marginBottom: 14, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 12.5, boxSizing: "border-box" }}>
                        {["Annual Leave", "Casual Leave", "Sick Leave", "On-Duty (OD) / Business Travel", "Maternity Leave", "Paternity Leave", "Comp Off", "Unpaid Leave"].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>

                      {leaveType === "On-Duty (OD) / Business Travel" && (
                        <>
                          <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>DESTINATION & TRIP PURPOSE</label>
                          <input type="text" value={odPurpose} onChange={e => setOdPurpose(e.target.value)}
                            placeholder="e.g. Client Site Visit, Mumbai / Tech Conference"
                            className="mono"
                            style={{ width: "100%", marginTop: 5, marginBottom: 14, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 12.5, boxSizing: "border-box" }}
                          />
                        </>
                      )}

                      {leaveType === "Comp Off" && (
                        <>
                          <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>DATE OF WEEKEND / HOLIDAY WORKED</label>
                          <input type="text" value={compOffWorkedDate} onChange={e => setCompOffWorkedDate(e.target.value)}
                            placeholder="e.g. 2026-09-13 (Sunday Production Deployment)"
                            className="mono"
                            style={{ width: "100%", marginTop: 5, marginBottom: 14, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 12.5, boxSizing: "border-box" }}
                          />
                        </>
                      )}

                      {leaveType === "Maternity Leave" && (
                        <>
                          <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>MEDICAL CERTIFICATE / EDD DETAILS</label>
                          <input type="text" value={medicalCertDate} onChange={e => setMedicalCertDate(e.target.value)}
                            placeholder="e.g. Expected Delivery: Oct 2026 / Medical Cert #MC-9021"
                            className="mono"
                            style={{ width: "100%", marginTop: 5, marginBottom: 14, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 12.5, boxSizing: "border-box" }}
                          />
                        </>
                      )}

                      {(() => {
                        const isHalfDayEligible = leaveType !== "Maternity Leave" && leaveType !== "Paternity Leave";
                        if (!isHalfDayEligible) {
                          return (
                            <div className="mono" style={{
                              padding: "9px 12px",
                              marginTop: 2,
                              marginBottom: 14,
                              background: "rgba(242,107,138,0.08)",
                              border: "1px solid rgba(242,107,138,0.3)",
                              borderRadius: 3,
                              fontSize: 11,
                              lineHeight: 1.45,
                              color: "#F26B8A"
                            }}>
                              {leaveType === "Maternity Leave"
                                ? "👶 STATUTORY POLICY: Maternity leave is continuous statutory leave granted in full days (up to 84 days) with 100% paid attendance."
                                : "👨‍🍼 CORPORATE POLICY: Paternity leave is granted in full-day increments upon childbirth (up to 10 days)."}
                            </div>
                          );
                        }
                        return (
                          <>
                            <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>
                              {leaveType.includes("On-Duty") ? "CLIENT TRIP DURATION" : "LEAVE DURATION"}
                            </label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 5, marginBottom: 14 }}>
                              <div onClick={() => setIsHalfDay(false)}
                                style={{
                                  padding: "7px 6px", borderRadius: 3, cursor: "pointer", textAlign: "center", fontSize: 11,
                                  border: !isHalfDay ? (leaveType.includes("On-Duty") ? "1px solid #93C4D4" : "1px solid #D8A6F2") : "1px solid rgba(255,255,255,0.08)",
                                  background: !isHalfDay ? (leaveType.includes("On-Duty") ? "rgba(147,196,212,0.18)" : "rgba(216,166,242,0.18)") : "transparent",
                                  color: !isHalfDay ? (leaveType.includes("On-Duty") ? "#93C4D4" : "#EDD4FA") : "#7C93AA"
                                }} className="mono">
                                {leaveType.includes("On-Duty") ? "Full Day (Rs.1,000)" : "Full Day"}
                              </div>
                              <div onClick={() => {
                                setIsHalfDay(true);
                                if (leaveType.includes("On-Duty") && !halfDaySession.includes("Client Visit")) {
                                  setHalfDaySession("Morning Session (Client Visit AM · Office PM)");
                                }
                              }}
                                style={{
                                  padding: "7px 6px", borderRadius: 3, cursor: "pointer", textAlign: "center", fontSize: 11,
                                  border: isHalfDay ? (leaveType.includes("On-Duty") ? "1px solid #93C4D4" : "1px solid #D8A6F2") : "1px solid rgba(255,255,255,0.08)",
                                  background: isHalfDay ? (leaveType.includes("On-Duty") ? "rgba(147,196,212,0.18)" : "rgba(216,166,242,0.18)") : "transparent",
                                  color: isHalfDay ? (leaveType.includes("On-Duty") ? "#93C4D4" : "#EDD4FA") : "#7C93AA"
                                }} className="mono">
                                {leaveType.includes("On-Duty") ? "Half Day (Rs.500)" : "Half Day (0.5d)"}
                              </div>
                            </div>

                            {leaveType.includes("On-Duty") && isHalfDay && (
                              <div className="mono" style={{
                                padding: "7px 10px", marginBottom: 12, borderRadius: 3, fontSize: 10.5,
                                background: "rgba(147,196,212,0.08)", border: "1px solid rgba(147,196,212,0.25)", color: "#93C4D4"
                              }}>
                                🏢 Office session attendance punch remains active &amp; required for the other half of the workday.
                              </div>
                            )}

                            {isHalfDay && (
                              <>
                                <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>HALF-DAY SHIFT SESSION</label>
                                <select value={halfDaySession} onChange={e => setHalfDaySession(e.target.value)}
                                  className="mono"
                                  style={{ width: "100%", marginTop: 5, marginBottom: 14, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 12.5, boxSizing: "border-box" }}>
                                  {leaveType.includes("On-Duty") ? (
                                    <>
                                      <option value="Morning Session (Client Visit AM · Office PM)">Morning Session (Client Visit AM · Office PM)</option>
                                      <option value="Afternoon Session (Office AM · Client Visit PM)">Afternoon Session (Office AM · Client Visit PM)</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="First Half (Morning)">First Half (Morning Shift)</option>
                                      <option value="Second Half (Afternoon)">Second Half (Afternoon Shift)</option>
                                    </>
                                  )}
                                </select>
                              </>
                            )}
                          </>
                        );
                      })()}

                      <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>{isHalfDay ? "LEAVE DATE" : "FROM DATE"}</label>
                      <input type="date" value={leaveStartDate} onChange={e => setLeaveStartDate(e.target.value)}
                        className="mono"
                        style={{ width: "100%", marginTop: 5, marginBottom: 14, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 13, boxSizing: "border-box", colorScheme: "dark" }}
                      />

                      {!isHalfDay ? (
                        <>
                          <label className="mono" style={{ fontSize: 10, color: "#5C7891", letterSpacing: "0.08em" }}>NUMBER OF DAYS</label>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5, marginBottom: 14 }}>
                            <input type="number" min={1} max={leaveType === "Maternity Leave" ? 84 : (leaveType === "Paternity Leave" ? 10 : (leaveType === "Comp Off" ? 2 : 30))} value={leaveDays}
                              onChange={(e) => setLeaveDays(Math.max(1, Math.min(leaveType === "Maternity Leave" ? 84 : (leaveType === "Paternity Leave" ? 10 : (leaveType === "Comp Off" ? 2 : 30)), Number(e.target.value))))}
                              className="mono"
                              style={{ width: 80, padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 13, textAlign: "center" }}
                            />
                            <div className="mono" style={{ fontSize: 11, color: "#4A6070", lineHeight: 1.5 }}>
                              {fmt(start)}{Number(leaveDays) > 1 ? ` → ${fmt(end)}` : ""}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="mono" style={{ fontSize: 11, color: "#8CE99A", marginBottom: 14 }}>
                          ⚡ Half-day request: 0.5 days allocated on {fmt(start)} ({halfDaySession})
                        </div>
                      )}

                      <button className="btn" onClick={confirmApplyLeave}
                        style={{ width: "100%", textAlign: "center", borderColor: leaveType.includes("On-Duty") ? "#93C4D4" : "#D8A6F2", color: leaveType.includes("On-Duty") ? "#93C4D4" : "#EDD4FA", background: leaveType.includes("On-Duty") ? "rgba(147,196,212,0.1)" : "rgba(216,166,242,0.1)" }}>
                        {leaveType.includes("On-Duty") ? "SUBMIT ON-DUTY TRAVEL REQUEST" : "SUBMIT LEAVE REQUEST"}
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
          return_asset: { title: "Return Company Asset", border: "rgba(242,148,107,0.4)", accent: "#F2946B" },
          manage_asset: { title: "Company Asset Management", border: "rgba(242,148,107,0.4)", accent: "#F2946B" },
          loan: { title: "Apply for Loan", border: "rgba(147,196,212,0.4)", accent: "#93C4D4" },
          comp_incentives: { title: "Compensation & Incentives", border: "rgba(245,158,11,0.45)", accent: "#F59E0B" },
          allowance: { title: "Add Special Allowance", border: "rgba(242,107,138,0.4)", accent: "#F26B8A" },
          ess: { title: "ESS Request", border: "rgba(216,166,242,0.4)", accent: "#D8A6F2" },
          transfer: { title: "Internal Transfer", border: "rgba(110,231,183,0.4)", accent: "#6EE7B7" },
          promote: { title: "Promote Employee", border: "rgba(252,211,77,0.4)", accent: "#FCD34D" },
          mobility: { title: "Internal Talent Mobility & Career", border: "rgba(110,231,183,0.4)", accent: "#6EE7B7" },
          offboard: { title: "Offboard Employee", border: "rgba(239,68,68,0.4)", accent: "#EF4444" },
          custom: { title: modal.modName, border: "rgba(129,140,248,0.4)", accent: "#818CF8" },
          award: { title: "Nominate Excellence Award", border: "rgba(255,209,102,0.4)", accent: "#FFD166" },
          payroll_cycle: { title: "Run Monthly Payroll Cycle", border: "rgba(140,233,154,0.4)", accent: "#8CE99A" },
          retention: { title: "Retention Desk — Price the Counter-Offer", border: "rgba(140,233,154,0.45)", accent: "#8CE99A" },
          fill_vacancy: { title: "Fill Vacancy — Succession or External Hire", border: "rgba(242,184,75,0.45)", accent: "#F2B84B" },
          revise_budget: { title: "Revise Department Budget & Sanctioned Strength", border: "rgba(245,165,36,0.45)", accent: "#F5A524" },
        };
        const meta = MODAL_META[modal.type] || {};
        const INP = { width: "100%", padding: "8px 10px", background: "#0A0F1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#DCE6F2", fontSize: 12.5, boxSizing: "border-box", marginTop: 5, marginBottom: 14 };
        const SEL = { ...INP, appearance: "auto" };
        const LBL = { fontSize: 10, color: "#5C7891", letterSpacing: "0.08em", textTransform: "uppercase" };
        const CONFIRM_FN = {
          attendance: confirmMarkAttendance,
          appraisal: confirmLogAppraisal,
          asset: confirmAssignAsset,
          return_asset: confirmReturnAsset,
          manage_asset: () => (modal.subTab === "return" ? confirmReturnAsset() : confirmAssignAsset()),
          loan: confirmApplyLoan,
          comp_incentives: () => (modal.subTab === "allowance" ? confirmAddAllowance() : confirmNominateAward()),
          allowance: confirmAddAllowance,
          ess: confirmESS,
          transfer: confirmTransfer,
          promote: confirmPromote,
          mobility: () => (modal.subTab === "transfer" ? confirmTransfer() : confirmPromote()),
          offboard: confirmOffboard,
          custom: confirmCustomAction,
          award: confirmNominateAward,
          payroll_cycle: confirmRunPayrollCycle,
          retention: confirmRetention,
          fill_vacancy: confirmFillVacancy,
          revise_budget: confirmReviseBudget
        };

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
                    <div key={emp.id} onClick={() => setModal(m => {
                      const next = { ...m, empId: emp.id };
                      if (m.type === "transfer" || (m.type === "mobility" && m.subTab === "transfer")) {
                        const currentDept = emp.dept || emp.department;
                        if (m.newDept === currentDept) {
                          const alternativeDept = DEPT_POOL.find(d => d !== currentDept) || DEPT_POOL[0];
                          next.newDept = alternativeDept;
                        }
                      }
                      if (m.type === "return_asset" || (m.type === "manage_asset" && m.subTab === "return")) {
                        const matchingAsset = (db.assets || []).find(a => a.emp === emp.name && a.status === "Allocated");
                        if (matchingAsset) next.assetId = matchingAsset.id;
                      }
                      if (m.type === "offboard") {
                        const todayStr = getLocalDateStr();
                        const isNotice = emp.status?.includes("Notice Period");
                        const exitDate = isNotice && emp.exit_date ? emp.exit_date : (m.exitDate || todayStr);
                        const ALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        const exitD = new Date(exitDate);
                        const exitMonthStr = `${ALL_MONTHS[exitD.getMonth()]} ${exitD.getFullYear()}`;
                        const alreadyPaid = (db.payroll || []).some(p => p.emp === emp.name && p.month === exitMonthStr && p.payrollMode !== "Full & Final Settlement");
                        const wd = getWorkingDaysInMonthUpToDate(exitDate);
                        next.exitDate = exitDate;
                        next.workingDays = alreadyPaid ? 0 : wd.workingDays;
                        next.separationMode = isNotice ? "final_clearance" : (exitDate > todayStr ? "notice" : "final_clearance");
                      }
                      return next;
                    })}
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

              {!["custom", "payroll_cycle", "revise_budget", "fill_vacancy", "retention"].includes(modal.type) && (
                <>
                  <EmpPicker />
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 14 }} />
                </>
              )}

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
              {modal.type === "offboard" && (() => {
                const offEmp = (db.emp_docs || []).find(e => e.id === modal.empId);
                const offEmpName = offEmp?.name?.trim().toLowerCase() || "";
                const empAssetsToClear = (db.assets || []).filter(a =>
                  a.emp?.trim().toLowerCase() === offEmpName &&
                  (!a.status?.includes("Returned") && !a.status?.includes("Recovered"))
                );
                const empLoansToClear = (db.loans || []).filter(l =>
                  l.emp?.trim().toLowerCase() === offEmpName &&
                  (l.status?.includes("Active") || l.status === "Under Review")
                );
                const isNoticeEmp = offEmp?.status?.includes("Notice Period");
                const todayStr = getLocalDateStr();
                const isFutureDate = (modal.exitDate || todayStr) > todayStr;
                const currentMode = modal.separationMode || (isNoticeEmp ? "final_clearance" : (isFutureDate ? "notice" : "final_clearance"));

                /* Before anyone is released, the twin prices the alternative:
                   what this exit costs versus what it would cost to keep them. */
                const offTwin = twinByEmpId[modal.empId];
                const offOffers = offTwin
                  ? RETENTION_LEVERS.map(l => retentionOfferModel(offTwin.emp, l, offTwin.risk.score, offTwin.loss.total))
                  : [];
                const bestOffer = offOffers.filter(o => o.netBenefit > 0).sort((a, b) => b.netBenefit - a.netBenefit)[0];

                return (
                  <>
                    {offTwin && (
                      <div style={{
                        background: bestOffer ? "rgba(140,233,154,0.08)" : "rgba(242,148,107,0.08)",
                        border: `1px solid ${bestOffer ? "rgba(140,233,154,0.4)" : "rgba(242,148,107,0.4)"}`,
                        borderRadius: 4, padding: "10px 12px", marginBottom: 14
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: bestOffer ? "#8CE99A" : "#F2946B" }}>
                            {bestOffer ? "💡 Finance says: retention is cheaper than replacement" : "📉 Finance says: no retention lever pays for itself here"}
                          </div>
                          {bestOffer && (
                            <button className="btn" disabled={!financeView}
                              onClick={() => actionRetention(offTwin.emp.id)}
                              style={{ padding: "3px 9px", fontSize: 9.5, borderColor: "rgba(140,233,154,0.5)", color: "#8CE99A" }}>
                              Open Retention Desk
                            </button>
                          )}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 10.5, color: "#9FB4C8", lineHeight: 1.7 }}>
                          Losing {offTwin.emp.name} costs a modelled <strong style={{ color: "#F26B6B" }}>{fmtINR(offTwin.loss.total)}</strong>
                          {" "}— backfill {fmtINR(offTwin.loss.heads[0].amount)}, {offTwin.loss.daysVacant} days of vacancy at{" "}
                          {fmtINR(offTwin.loss.dailyValue)}/day, plus knowledge loss from {offTwin.roi.tenureMonths} months of context.
                          {bestOffer
                            ? <> A <strong style={{ color: "#F4F7FB" }}>{bestOffer.lever.label}</strong> at{" "}
                              <strong style={{ color: "#F2946B" }}>{fmtINR(bestOffer.yearOneCost)}</strong> would cut flight risk{" "}
                              {offTwin.risk.score}→{bestOffer.residualRisk} for a net benefit of{" "}
                              <strong style={{ color: "#8CE99A" }}>{fmtINR(bestOffer.netBenefit)}</strong>.</>
                            : <> Every available lever costs more than the expected loss it prevents, so releasing and backfilling is the rational call.</>}
                          {offTwin.successors.length > 0
                            ? <> <strong style={{ color: "#7DD3FC" }}>{offTwin.successors[0].emp.name}</strong> can cover the seat as {offTwin.successors[0].mode.toLowerCase()}.</>
                            : <> <strong style={{ color: "#F26B6B" }}>No internal successor</strong> — the seat will need a full external search.</>}
                          {offTwin.isManager && <> This is a <strong style={{ color: "#F5A524" }}>leadership seat</strong>; succession will trigger automatically on exit.</>}
                        </div>
                      </div>
                    )}

                    <div className="mono" style={LBL}>SEPARATION PROTOCOL</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 12 }}>
                      <div
                        onClick={() => setModal(m => ({ ...m, separationMode: "notice" }))}
                        style={{
                          padding: "8px 10px", borderRadius: 4, cursor: "pointer",
                          border: currentMode === "notice" ? "1px solid #FFD166" : "1px solid rgba(255,255,255,0.08)",
                          background: currentMode === "notice" ? "rgba(255,209,102,0.14)" : "rgba(255,255,255,0.02)",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: currentMode === "notice" ? "#FFD166" : "#DCE6F2" }}>
                          📋 Notice Period
                        </div>
                        <div className="mono" style={{ fontSize: 9, color: currentMode === "notice" ? "#FFEAA7" : "#7C93AA", marginTop: 2 }}>
                          Active for Oct/Nov payroll
                        </div>
                      </div>

                      <div
                        onClick={() => setModal(m => ({ ...m, separationMode: "final_clearance" }))}
                        style={{
                          padding: "8px 10px", borderRadius: 4, cursor: "pointer",
                          border: currentMode === "final_clearance" ? "1px solid #F26B6B" : "1px solid rgba(255,255,255,0.08)",
                          background: currentMode === "final_clearance" ? "rgba(242,107,107,0.14)" : "rgba(255,255,255,0.02)",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: currentMode === "final_clearance" ? "#F26B6B" : "#DCE6F2" }}>
                          ⚡ Final Clearance (F&amp;F)
                        </div>
                        <div className="mono" style={{ fontSize: 9, color: currentMode === "final_clearance" ? "#FCA5A5" : "#7C93AA", marginTop: 2 }}>
                          Return assets &amp; F&amp;F closure
                        </div>
                      </div>
                    </div>

                    {currentMode === "notice" && (
                      <div className="mono" style={{ fontSize: 9.5, color: "#FFD166", background: "rgba(255,209,102,0.08)", border: "1px solid rgba(255,209,102,0.25)", padding: "7px 10px", borderRadius: 4, marginBottom: 12 }}>
                        ℹ️ <strong>Notice Period Protocol:</strong> {offEmp?.name || "Employee"} will transition to <em>"Serving Notice Period"</em> until {modal.exitDate}. They will <strong>remain active</strong> in the employee directory for monthly payroll runs (Oct, Nov, etc.) and attendance tracking until final clearance is executed on their exit date.
                      </div>
                    )}
                    {isNoticeEmp && currentMode === "final_clearance" && (
                      <div className="mono" style={{ fontSize: 9.5, color: "#8CE99A", background: "rgba(140,233,154,0.08)", border: "1px solid rgba(140,233,154,0.25)", padding: "7px 10px", borderRadius: 4, marginBottom: 12 }}>
                        🛡️ <strong>Notice Period Complete / Clearance Ready:</strong> {offEmp?.name} is serving notice (Exit: {offEmp?.exit_date || modal.exitDate}). Executing will finalize asset recovery, clear outstanding loans, and disburse Full &amp; Final (F&amp;F) Settlement.
                      </div>
                    )}

                    <div className="mono" style={LBL}>OFFBOARDING REASON</div>
                    <select value={modal.reason} onChange={e => setModal(m => ({ ...m, reason: e.target.value }))} className="mono" style={SEL}>
                      {["Resignation", "Termination", "Retirement", "Contract Ended"].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>

                    <div style={{ display: "grid", gridTemplateColumns: currentMode === "notice" ? "1fr" : "1.2fr 1fr", gap: 10 }}>
                      <div>
                        <div className="mono" style={LBL}>{currentMode === "notice" ? "FINAL WORKING DAY (EXIT DATE)" : "EXIT DATE"}</div>
                        <input
                          type="date"
                          value={modal.exitDate}
                          onChange={e => {
                            const newDate = e.target.value;
                            const ALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            const exitD = new Date(newDate);
                            const exitMonthStr = `${ALL_MONTHS[exitD.getMonth()]} ${exitD.getFullYear()}`;
                            const alreadyPaid = offEmp && (db.payroll || []).some(p => p.emp === offEmp.name && p.month === exitMonthStr && p.payrollMode !== "Full & Final Settlement");
                            const wd = getWorkingDaysInMonthUpToDate(newDate);
                            const autoMode = isNoticeEmp ? "final_clearance" : (newDate > todayStr ? "notice" : "final_clearance");
                            setModal(m => ({
                              ...m,
                              exitDate: newDate,
                              workingDays: alreadyPaid ? 0 : wd.workingDays,
                              separationMode: autoMode
                            }));
                          }}
                          className="mono"
                          style={INP}
                        />
                      </div>
                      {currentMode !== "notice" && (
                        <div>
                          <div className="mono" style={LBL}>FINAL MONTH BILLABLE DAYS</div>
                          <input
                            type="number"
                            min={0}
                            max={31}
                            value={modal.workingDays !== undefined ? modal.workingDays : getWorkingDaysInMonthUpToDate(modal.exitDate).workingDays}
                            onChange={e => setModal(m => ({ ...m, workingDays: Math.max(0, Math.min(31, Number(e.target.value))) }))}
                            className="mono"
                            style={INP}
                          />
                        </div>
                      )}
                    </div>

                    {currentMode === "final_clearance" ? (
                      /* Clearance Preview Card */
                      (() => {
                        const ALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        const exitD = new Date(modal.exitDate || new Date());
                        const exitMonthStr = `${ALL_MONTHS[exitD.getMonth()]} ${exitD.getFullYear()}`;
                        const alreadyPaid = offEmp && (db.payroll || []).some(p => p.emp === offEmp.name && p.month === exitMonthStr && p.payrollMode !== "Full & Final Settlement");

                        const empAssetsToClear = (db.assets || []).filter(a =>
                          a.emp?.trim().toLowerCase() === offEmp?.name?.trim().toLowerCase() &&
                          (!a.status?.includes("Returned") && !a.status?.includes("Recovered"))
                        );
                        const empLoansToClear = (db.loans || []).filter(l => l.emp === offEmp?.name && (l.status.includes("Active") || l.status === "Under Review"));
                        const alBal = offEmp ? getLeaveBalance(offEmp.name, "Annual Leave") : 0;
                        const dailyR = offEmp?.dailyRate || (offEmp?.designation ? DESIGNATION_RATES[offEmp.designation] : 1000) || 1000;
                        const wdInfo = getWorkingDaysInMonthUpToDate(modal.exitDate);
                        const activeWd = modal.workingDays !== undefined ? modal.workingDays : (alreadyPaid ? 0 : wdInfo.workingDays);
                        const estEarned = Math.round(activeWd * dailyR);
                        const estEncash = Math.round(alBal * dailyR);

                        return (
                          <div style={{
                            marginTop: 10, marginBottom: 12, padding: "10px 12px",
                            background: "rgba(242,107,107,0.06)", border: "1px solid rgba(242,107,107,0.25)",
                            borderRadius: 4
                          }}>
                            <div className="mono" style={{ fontSize: 9.5, color: "#F26B6B", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                              <AlertTriangle size={12} color="#F26B6B" /> PRE-OFFBOARDING CLEARANCE PREVIEW ({offEmp?.name || "EMPLOYEE"})
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }} className="mono">
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#7C93AA" }}>💼 Prorated Earned Wage:</span>
                                <span style={{ color: activeWd > 0 ? "#8CE99A" : "#7C93AA", fontWeight: 600 }}>
                                  {activeWd > 0
                                    ? `${activeWd} working days (Est: Rs.${estEarned.toLocaleString("en-IN")})`
                                    : (alreadyPaid ? `Rs.0 (Payroll for ${exitMonthStr} already disbursed)` : "Rs.0 (0 days)")}
                                </span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#7C93AA" }}>🌴 Leave Encashment:</span>
                                <span style={{ color: "#7DD3FC", fontWeight: 600 }}>
                                  {alBal.toFixed(1)}d Annual Leave (Est: Rs.{estEncash.toLocaleString("en-IN")})
                                </span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#7C93AA" }}>📦 Hardware Assets:</span>
                                <span style={{ color: empAssetsToClear.length > 0 ? "#FFD166" : "#8CE99A", fontWeight: 600 }}>
                                  {empAssetsToClear.length > 0 ? `${empAssetsToClear.length} to recover (${empAssetsToClear.map(a => a.asset).join(", ")})` : "None (Clear)"}
                                </span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#7C93AA" }}>💳 Outstanding Loans:</span>
                                <span style={{ color: empLoansToClear.length > 0 ? "#F26B6B" : "#8CE99A", fontWeight: 600 }}>
                                  {empLoansToClear.length > 0 ? `${empLoansToClear.length} to settle via F&F` : "None (Clear)"}
                                </span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#7C93AA" }}>🔒 Access Credentials:</span>
                                <span style={{ color: "#F26B6B", fontWeight: 600 }}>Biometrics Locked · Account Inactivated</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      /* Notice Period Active Summary */
                      <div style={{
                        marginTop: 10, marginBottom: 12, padding: "10px 12px",
                        background: "rgba(255,209,102,0.06)", border: "1px solid rgba(255,209,102,0.25)",
                        borderRadius: 4
                      }}>
                        <div className="mono" style={{ fontSize: 9.5, color: "#FFD166", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                          🛡️ ACTIVE NOTICE PERIOD STATUS
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }} className="mono">
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#7C93AA" }}>🏢 Roster Status:</span>
                            <span style={{ color: "#8CE99A", fontWeight: 600 }}>Active (Included in Oct &amp; Nov Payroll)</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#7C93AA" }}>💻 Hardware Assets:</span>
                            <span style={{ color: "#8CE99A", fontWeight: 600 }}>Retained during notice period</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#7C93AA" }}>👆 Biometric Access:</span>
                            <span style={{ color: "#8CE99A", fontWeight: 600 }}>Active (Punches permitted)</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#7C93AA" }}>💳 F&amp;F Settlement:</span>
                            <span style={{ color: "#FFD166", fontWeight: 600 }}>Scheduled on Final Working Day</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentMode === "final_clearance" && (
                      <div style={{
                        marginTop: 14, marginBottom: 14, padding: "12px 14px",
                        background: "#080E18", border: "1px solid rgba(140,233,154,0.3)", borderRadius: 6
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <div className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: "#8CE99A", display: "flex", alignItems: "center", gap: 6 }}>
                            <CheckCircle2 size={13} color="#8CE99A" />
                            OFFBOARDING CLEARANCE CHECKLIST
                          </div>
                          <button
                            type="button"
                            onClick={() => setOffboardChecklist({
                              itHardware: true, accessCard: true, emailRevoked: true, biometricRevoked: true,
                              loansCleared: true, claimsAudited: true, managerHandover: true, ndaSigned: true
                            })}
                            className="mono"
                            style={{
                              fontSize: 9.5, padding: "3px 8px", background: "rgba(140,233,154,0.15)",
                              border: "1px solid rgba(140,233,154,0.4)", color: "#8CE99A", borderRadius: 3, cursor: "pointer", fontWeight: 700
                            }}>
                            ✓ Verify &amp; Sign-Off All Items
                          </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, fontSize: 11 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 3, border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
                            <input type="checkbox" checked={!!offboardChecklist.itHardware} onChange={e => setOffboardChecklist(c => ({ ...c, itHardware: e.target.checked }))} style={{ accentColor: "#8CE99A" }} />
                            <div>
                              <span style={{ color: offboardChecklist.itHardware ? "#F4F7FB" : "#F2B84B" }}>💻 Laptop &amp; Hardware</span>
                              <div style={{ fontSize: 9, color: "#8CE99A" }}>
                                {empAssetsToClear.length === 0 ? "✓ Auto-Checked (0 pending)" : `✓ Auto-Recovery (${empAssetsToClear.length} asset will auto-return)`}
                              </div>
                            </div>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 3, border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
                            <input type="checkbox" checked={!!offboardChecklist.accessCard} onChange={e => setOffboardChecklist(c => ({ ...c, accessCard: e.target.checked }))} style={{ accentColor: "#8CE99A" }} />
                            <div>
                              <span style={{ color: offboardChecklist.accessCard ? "#F4F7FB" : "#7C93AA" }}>🔑 RFID Security Badge</span>
                              <div style={{ fontSize: 9, color: "#8CE99A" }}>✓ Auto-Checked (Revoked)</div>
                            </div>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 3, border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
                            <input type="checkbox" checked={!!offboardChecklist.emailRevoked} onChange={e => setOffboardChecklist(c => ({ ...c, emailRevoked: e.target.checked }))} style={{ accentColor: "#8CE99A" }} />
                            <div>
                              <span style={{ color: offboardChecklist.emailRevoked ? "#F4F7FB" : "#7C93AA" }}>🔐 Email &amp; Cloud Accounts</span>
                              <div style={{ fontSize: 9, color: "#8CE99A" }}>✓ Auto-Checked (Deactivated)</div>
                            </div>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 3, border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
                            <input type="checkbox" checked={!!offboardChecklist.biometricRevoked} onChange={e => setOffboardChecklist(c => ({ ...c, biometricRevoked: e.target.checked }))} style={{ accentColor: "#8CE99A" }} />
                            <div>
                              <span style={{ color: offboardChecklist.biometricRevoked ? "#F4F7FB" : "#7C93AA" }}>👆 Biometric Punch Profile</span>
                              <div style={{ fontSize: 9, color: "#8CE99A" }}>✓ Auto-Checked (Profile Locked)</div>
                            </div>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 3, border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
                            <input type="checkbox" checked={!!offboardChecklist.loansCleared} onChange={e => setOffboardChecklist(c => ({ ...c, loansCleared: e.target.checked }))} style={{ accentColor: "#8CE99A" }} />
                            <div>
                              <span style={{ color: offboardChecklist.loansCleared ? "#F4F7FB" : "#F2B84B" }}>💳 Outstanding Loans</span>
                              <div style={{ fontSize: 9, color: "#8CE99A" }}>
                                {empLoansToClear.length === 0 ? "✓ Auto-Checked (Nil debt)" : `✓ Auto-Settle (${empLoansToClear.length} loan audited in F&F)`}
                              </div>
                            </div>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 3, border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
                            <input type="checkbox" checked={!!offboardChecklist.claimsAudited} onChange={e => setOffboardChecklist(c => ({ ...c, claimsAudited: e.target.checked }))} style={{ accentColor: "#8CE99A" }} />
                            <div>
                              <span style={{ color: offboardChecklist.claimsAudited ? "#F4F7FB" : "#7C93AA" }}>🧾 Travel &amp; Expense Claims</span>
                              <div style={{ fontSize: 9, color: "#8CE99A" }}>✓ Auto-Checked (Claims Voided)</div>
                            </div>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 3, border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
                            <input type="checkbox" checked={!!offboardChecklist.managerHandover} onChange={e => setOffboardChecklist(c => ({ ...c, managerHandover: e.target.checked }))} style={{ accentColor: "#8CE99A" }} />
                            <div>
                              <span style={{ color: offboardChecklist.managerHandover ? "#F4F7FB" : "#7C93AA" }}>🤝 Manager Handover</span>
                              <div style={{ fontSize: 9, color: "#8CE99A" }}>✓ Auto-Checked (Handover Signed)</div>
                            </div>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 3, border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
                            <input type="checkbox" checked={!!offboardChecklist.ndaSigned} onChange={e => setOffboardChecklist(c => ({ ...c, ndaSigned: e.target.checked }))} style={{ accentColor: "#8CE99A" }} />
                            <div>
                              <span style={{ color: offboardChecklist.ndaSigned ? "#F4F7FB" : "#7C93AA" }}>📄 Exit NDA &amp; Interview</span>
                              <div style={{ fontSize: 9, color: "#8CE99A" }}>✓ Auto-Checked (Completed)</div>
                            </div>
                          </label>
                        </div>

                        <div style={{
                          marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)",
                          display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10
                        }}>
                          <span style={{ color: "#7C93AA" }}>
                            Verification: <strong style={{ color: Object.values(offboardChecklist).filter(Boolean).length >= 8 ? "#8CE99A" : "#F2B84B" }}>
                              {Object.values(offboardChecklist).filter(Boolean).length}/8 Items Verified
                            </strong>
                          </span>
                          {Object.values(offboardChecklist).filter(Boolean).length >= 8 ? (
                            <span style={{ color: "#8CE99A", fontWeight: 700 }}>✓ All Clearances Approved for Offboarding</span>
                          ) : (
                            <span style={{ color: "#F2B84B" }}>⚠️ All 8 items must be signed off to execute offboarding</span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* ── Appraisal fields ── */}
              {modal.type === "appraisal" && (() => {
                const curYear = modal.fiscalYear || (modal.cycle ? parseInt(modal.cycle.match(/\d{4}/)?.[0], 10) : 2026) || 2026;
                const quarters = ["Q1", "Q2", "Q3", "Q4"];
                const curQuarter = modal.quarter || quarters.find(q => modal.cycle?.startsWith(q)) || "Q3";

                const handleYearChange = (delta) => {
                  const newYear = Math.max(2020, Math.min(2035, curYear + delta));
                  const newCycle = `${curQuarter} FY${newYear}`;
                  setModal(m => ({ ...m, fiscalYear: newYear, cycle: newCycle }));
                };

                const handleResetYear = () => {
                  const resetYear = 2026;
                  const newCycle = `${curQuarter} FY${resetYear}`;
                  setModal(m => ({ ...m, fiscalYear: resetYear, cycle: newCycle }));
                };

                return (
                  <>
                    {/* Fiscal Year Stepper with Reset Year Option */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div className="mono" style={LBL}>FISCAL YEAR</div>
                      {curYear !== 2026 && (
                        <button
                          type="button"
                          onClick={handleResetYear}
                          className="mono"
                          style={{
                            fontSize: 10, padding: "2px 8px", background: "rgba(255,209,102,0.12)",
                            border: "1px solid rgba(255,209,102,0.35)", color: "#FFD166", borderRadius: 3, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 3
                          }}>
                          ↺ Reset Year (2026)
                        </button>
                      )}
                    </div>

                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                      marginBottom: 12, background: "rgba(0,0,0,0.3)", padding: "6px 10px",
                      borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)"
                    }}>
                      <button
                        type="button"
                        onClick={() => handleYearChange(-1)}
                        className="mono"
                        style={{
                          padding: "4px 9px", fontSize: 11, background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.15)", borderRadius: 3, color: "#DCE6F2", cursor: "pointer"
                        }}>
                        ◀ Prev FY
                      </button>
                      <div style={{ textAlign: "center" }}>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: meta.accent, letterSpacing: "0.04em" }}>
                          FY{curYear}
                        </span>
                        <span style={{ fontSize: 9.5, color: "#5C7891", marginLeft: 6 }}>
                          ({curYear}–{String(curYear + 1).slice(2)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleYearChange(1)}
                        className="mono"
                        style={{
                          padding: "4px 9px", fontSize: 11, background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.15)", borderRadius: 3, color: "#DCE6F2", cursor: "pointer"
                        }}>
                        Next FY ▶
                      </button>
                    </div>

                    <div className="mono" style={LBL}>APPRAISAL CYCLE (QUARTER)</div>
                    <select
                      value={modal.cycle || `${curQuarter} FY${curYear}`}
                      onChange={e => {
                        const val = e.target.value;
                        const q = quarters.find(k => val.startsWith(k)) || "Q3";
                        setModal(m => ({ ...m, cycle: val, quarter: q }));
                      }}
                      className="mono"
                      style={SEL}
                    >
                      {quarters.map(q => {
                        const optVal = `${q} FY${curYear}`;
                        return <option key={optVal} value={optVal}>{optVal}</option>;
                      })}
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
                  </>
                );
              })()}

              {/* ── Compensation & Incentives (Unified Awards & Special Allowances) ── */}
              {(modal.type === "comp_incentives" || modal.type === "award") && (() => {
                const isAwardTab = modal.subTab !== "allowance";
                const selectedEmp = (db.emp_docs || []).find(e => e.id === modal.empId);
                const perfRecords = (db.performance || []).filter(r => r.emp === selectedEmp?.name);
                const latest = perfRecords.length ? perfRecords[perfRecords.length - 1] : null;
                const awardCats = ["Star Performer", "Innovation Champion", "Team Player", "Rising Star", "Spot Excellence Award"];
                return (
                  <>
                    {/* Segmented Sub-Tab Switcher: Awards vs Allowances */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                      <button
                        type="button"
                        onClick={() => setModal(m => ({ ...m, subTab: "award" }))}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 5,
                          border: isAwardTab ? "1px solid #FFD166" : "1px solid rgba(255,255,255,0.1)",
                          background: isAwardTab ? "rgba(255,209,102,0.15)" : "rgba(255,255,255,0.02)",
                          color: isAwardTab ? "#FFD166" : "#7C93AA",
                          fontSize: 11,
                          fontWeight: isAwardTab ? 700 : 400,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          transition: "all 0.15s ease"
                        }}>
                        <Award size={14} style={{ color: isAwardTab ? "#FFD166" : "#7C93AA" }} />
                        <span>🏆 Excellence Award</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModal(m => ({ ...m, subTab: "allowance" }))}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 5,
                          border: !isAwardTab ? "1px solid #F59E0B" : "1px solid rgba(255,255,255,0.1)",
                          background: !isAwardTab ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.02)",
                          color: !isAwardTab ? "#F59E0B" : "#7C93AA",
                          fontSize: 11,
                          fontWeight: !isAwardTab ? 700 : 400,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          transition: "all 0.15s ease"
                        }}>
                        <Gift size={14} style={{ color: !isAwardTab ? "#F59E0B" : "#7C93AA" }} />
                        <span>💰 Special Allowance</span>
                      </button>
                    </div>

                    {isAwardTab ? (
                      <>
                        {/* Appraisal status banner */}
                        <div style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 14,
                          background: latest ? "rgba(255,209,102,0.08)" : "rgba(255,255,255,0.04)",
                          border: latest ? "1px solid rgba(255,209,102,0.3)" : "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 3
                        }}>
                          <Award size={16} style={{ color: "#FFD166", flexShrink: 0 }} />
                          <div style={{ fontSize: 11 }}>
                            {latest ? (
                              <>
                                <span style={{ color: "#F4F7FB", fontWeight: 600 }}>Appraisal on File: </span>
                                <span style={{ color: "#FFD166" }}>{latest.cycle} — {latest.rating} ({latest.kpiScore || "—"} KPI)</span>
                              </>
                            ) : (
                              <span style={{ color: "#7C93AA" }}>Direct Spot Award (No prior appraisal required)</span>
                            )}
                          </div>
                        </div>

                        <div className="mono" style={LBL}>AWARD CATEGORY</div>
                        <select
                          value={modal.category}
                          onChange={e => {
                            const cat = e.target.value;
                            setModal(m => ({ ...m, category: cat, cashReward: AWARD_REWARDS[cat] || 2000 }));
                          }}
                          className="mono"
                          style={SEL}
                        >
                          {awardCats.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <div className="mono" style={LBL}>CASH REWARD (RS.) — DISBURSED IN PAYROLL</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 14 }}>
                          {[1500, 2000, 3500, 5000].map(amt => (
                            <div
                              key={amt}
                              onClick={() => setModal(m => ({ ...m, cashReward: amt }))}
                              style={{
                                flex: 1, padding: "7px 0", textAlign: "center", borderRadius: 3, cursor: "pointer", fontSize: 11,
                                border: modal.cashReward === amt ? "1px solid #FFD166" : "1px solid rgba(255,255,255,0.08)",
                                background: modal.cashReward === amt ? "rgba(255,209,102,0.15)" : "transparent",
                                color: modal.cashReward === amt ? "#FFD166" : "#7C93AA"
                              }}
                              className="mono"
                            >
                              ₹{amt.toLocaleString("en-IN")}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mono" style={LBL}>ALLOWANCE TYPE</div>
                        <select value={modal.allowanceType || "LTA (Leave Travel Allowance)"} onChange={e => setModal(m => ({ ...m, allowanceType: e.target.value }))} className="mono" style={SEL}>
                          {["LTA (Leave Travel Allowance)", "SCA (School/Children Allowance)", "Performance Bonus / Incentive", "Project Milestone Bonus", "Retention Allowance", "Meal Allowance", "Transport Allowance", "Medical Reimbursement", "Relocation Allowance", "Internet / Remote Work Allowance"].map(t => <option key={t}>{t}</option>)}
                        </select>

                        {/* Infinite Fiscal Year Stepper */}
                        <div className="mono" style={LBL}>FISCAL YEAR / PERIOD</div>
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                          marginBottom: 14, background: "rgba(0,0,0,0.3)", padding: "7px 10px",
                          borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)"
                        }}>
                          <button type="button" onClick={() => setModal(m => ({ ...m, fiscalYear: (m.fiscalYear || 2026) - 1 }))}
                            className="mono"
                            style={{
                              padding: "4px 10px", fontSize: 11, background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.15)", borderRadius: 3, color: "#DCE6F2", cursor: "pointer"
                            }}>
                            ◀ Prev FY
                          </button>
                          <div style={{ textAlign: "center" }}>
                            <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B", letterSpacing: "0.04em" }}>
                              FY{(modal.fiscalYear || 2026)}–{String((modal.fiscalYear || 2026) + 1).slice(2)}
                            </span>
                            <span style={{ fontSize: 9.5, color: "#5C7891", marginLeft: 6 }}>
                              (Apr {(modal.fiscalYear || 2026)} – Mar {(modal.fiscalYear || 2026) + 1})
                            </span>
                          </div>
                          <button type="button" onClick={() => setModal(m => ({ ...m, fiscalYear: (m.fiscalYear || 2026) + 1 }))}
                            className="mono"
                            style={{
                              padding: "4px 10px", fontSize: 11, background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.15)", borderRadius: 3, color: "#DCE6F2", cursor: "pointer"
                            }}>
                            Next FY ▶
                          </button>
                        </div>

                        <div className="mono" style={LBL}>DISBURSEMENT AMOUNT (Rs.)</div>
                        <input type="number" min={500} max={100000} step={500} value={modal.amount || 5000}
                          onChange={e => setModal(m => ({ ...m, amount: Number(e.target.value) }))} className="mono" style={INP} />
                        <div className="mono" style={{ fontSize: 10, color: "#5C7891", marginBottom: 14, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 3, padding: "7px 10px" }}>
                          💡 One-time / annual allowance for FY{(modal.fiscalYear || 2026)}–{String((modal.fiscalYear || 2026) + 1).slice(2)}. Total entered amount (₹{Number(modal.amount || 0).toLocaleString("en-IN")}) will be credited directly to employee's gross pay in the next payroll run.
                        </div>
                      </>
                    )}
                  </>
                );
              })()}

              {/* ── Manage Assets (Unified Allocation & In-Service Return) ── */}
              {(modal.type === "manage_asset" || modal.type === "asset" || modal.type === "return_asset") && (() => {
                const isManage = modal.type === "manage_asset";
                const isReturn = isManage ? modal.subTab === "return" : modal.type === "return_asset";
                const selectedEmp = (db.emp_docs || []).find(e => e.id === modal.empId);
                const empAllocatedAssets = (db.assets || []).filter(a => a.emp === selectedEmp?.name && a.status === "Allocated");
                const allAllocatedAssets = (db.assets || []).filter(a => a.status === "Allocated");
                const assetsToPick = empAllocatedAssets.length > 0 ? empAllocatedAssets : allAllocatedAssets;
                const activeAsset = (db.assets || []).find(a => a.id === modal.assetId) || assetsToPick[0];

                return (
                  <>
                    {/* Segmented Sub-Tab Switcher (when launched from Manage Assets) */}
                    {isManage && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "rgba(0,0,0,0.3)", padding: 4, borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)" }}>
                        <button type="button" onClick={() => setModal(m => ({ ...m, subTab: "allocate" }))}
                          className="mono"
                          style={{
                            flex: 1, padding: "7px 0", textAlign: "center", borderRadius: 3, cursor: "pointer", fontSize: 11, fontWeight: !isReturn ? 700 : 500,
                            border: !isReturn ? "1px solid #F2946B" : "1px solid transparent",
                            background: !isReturn ? "rgba(242,148,107,0.2)" : "transparent",
                            color: !isReturn ? "#F2946B" : "#7C93AA"
                          }}>
                          📦 Allocate Hardware
                        </button>
                        <button type="button" onClick={() => {
                          const targetAsset = empAllocatedAssets[0] || allAllocatedAssets[0];
                          setModal(m => ({ ...m, subTab: "return", assetId: targetAsset ? targetAsset.id : m.assetId }));
                        }}
                          className="mono"
                          style={{
                            flex: 1, padding: "7px 0", textAlign: "center", borderRadius: 3, cursor: "pointer", fontSize: 11, fontWeight: isReturn ? 700 : 500,
                            border: isReturn ? "1px solid #F2946B" : "1px solid transparent",
                            background: isReturn ? "rgba(242,148,107,0.2)" : "transparent",
                            color: isReturn ? "#F2946B" : "#7C93AA"
                          }}>
                          ↩️ Return Equipment
                        </button>
                      </div>
                    )}

                    {!isReturn ? (
                      <>
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
                        <div className="mono" style={{ fontSize: 10, color: "#7C93AA", marginBottom: 14 }}>
                          Generates asset code and logs custody to digital inventory.
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mono" style={LBL}>SELECT ASSET TO RETURN</div>
                        {assetsToPick.length === 0 ? (
                          <div className="mono" style={{ fontSize: 11, color: "#F26B6B", padding: "10px", background: "rgba(242,107,107,0.1)", borderRadius: 3, marginBottom: 14 }}>
                            ⚠️ No allocated assets found for {selectedEmp?.name || "this employee"}.
                          </div>
                        ) : (
                          <select
                            value={modal.assetId || assetsToPick[0]?.id}
                            onChange={e => setModal(m => ({ ...m, assetId: e.target.value }))}
                            className="mono"
                            style={SEL}
                          >
                            {assetsToPick.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.asset} — {a.code || a.id} (Held by {a.emp})
                              </option>
                            ))}
                          </select>
                        )}

                        <div className="mono" style={LBL}>RETURN REASON / CONDITION</div>
                        <select
                          value={modal.reason || "Hardware Refresh / Upgrade"}
                          onChange={e => setModal(m => ({ ...m, reason: e.target.value }))}
                          className="mono"
                          style={SEL}
                        >
                          <option value="Hardware Refresh / Upgrade">Hardware Refresh / Upgrade</option>
                          <option value="Normal Project Return">Normal Project Return</option>
                          <option value="Damaged / Maintenance Required">Damaged / Maintenance Required</option>
                          <option value="Surplus Equipment Return">Surplus Equipment Return</option>
                        </select>

                        {activeAsset && (
                          <div className="mono" style={{ fontSize: 10.5, color: "#7C93AA", background: "rgba(242,148,107,0.08)", border: "1px solid rgba(242,148,107,0.25)", padding: "8px 10px", borderRadius: 3, marginBottom: 14 }}>
                            📦 Returning <strong style={{ color: "#F2946B" }}>{activeAsset.asset}</strong> ({activeAsset.code || activeAsset.id}) will release this equipment back into inventory and clear the custodian record.
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}

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



              {/* ── Internal Talent Mobility & Career (Promotion & Transfer) ── */}
              {(modal.type === "mobility" || modal.type === "promote" || modal.type === "transfer") && (() => {
                const isMobility = modal.type === "mobility";
                const isTransfer = isMobility ? modal.subTab === "transfer" : modal.type === "transfer";
                const emp = (db.emp_docs || []).find(e => e.id === modal.empId);

                return (
                  <>
                    {/* Segmented Sub-Tab Switcher (when launched from Internal Mobility) */}
                    {isMobility && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "rgba(0,0,0,0.3)", padding: 4, borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)" }}>
                        <button type="button" onClick={() => setModal(m => ({ ...m, subTab: "promote" }))}
                          className="mono"
                          style={{
                            flex: 1, padding: "7px 0", textAlign: "center", borderRadius: 3, cursor: "pointer", fontSize: 11, fontWeight: !isTransfer ? 700 : 500,
                            border: !isTransfer ? "1px solid #6EE7B7" : "1px solid transparent",
                            background: !isTransfer ? "rgba(110,231,183,0.18)" : "transparent",
                            color: !isTransfer ? "#6EE7B7" : "#7C93AA"
                          }}>
                          ⭐ Promotion & Wage Revision
                        </button>
                        <button type="button" onClick={() => setModal(m => ({ ...m, subTab: "transfer" }))}
                          className="mono"
                          style={{
                            flex: 1, padding: "7px 0", textAlign: "center", borderRadius: 3, cursor: "pointer", fontSize: 11, fontWeight: isTransfer ? 700 : 500,
                            border: isTransfer ? "1px solid #6EE7B7" : "1px solid transparent",
                            background: isTransfer ? "rgba(110,231,183,0.18)" : "transparent",
                            color: isTransfer ? "#6EE7B7" : "#7C93AA"
                          }}>
                          🔄 Departmental Transfer
                        </button>
                      </div>
                    )}

                    {isTransfer ? (
                      /* ── Departmental Transfer Section with Handover Card ── */
                      (() => {
                        const curDept = emp?.dept || "—";
                        const targetDept = modal.newDept;
                        const isSameDept = curDept === targetDept;
                        const assignedAssets = (db.assets || []).filter(a =>
                          a.emp?.trim().toLowerCase() === emp?.name?.trim().toLowerCase() &&
                          (!a.status?.includes("Returned") && !a.status?.includes("Recovered"))
                        );
                        const dailyWage = emp?.dailyRate || (DESIGNATION_RATES[emp?.designation] || 1000);
                        const monthlySalary = dailyWage * 30;

                        return (
                          <>
                            <div className="mono" style={LBL}>CURRENT DEPARTMENT</div>
                            <input type="text" readOnly value={curDept} className="mono" style={{ ...INP, background: "rgba(255,255,255,0.03)", color: "#7C93AA" }} />

                            <div className="mono" style={LBL}>TARGET DESTINATION DEPARTMENT</div>
                            <select className="mono" style={SEL} value={modal.newDept} onChange={e => setModal(m => ({ ...m, newDept: e.target.value }))}>
                              {DEPT_POOL.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>

                            <div className="mono" style={LBL}>TRANSFER REASON / MANDATE</div>
                            <select className="mono" style={SEL} value={modal.transferReason || "Project Reallocation"} onChange={e => setModal(m => ({ ...m, transferReason: e.target.value }))}>
                              {["Project Reallocation", "Career Development & Rotation", "Strategic Department Restructure", "Employee Requested Relocation", "Inter-Division Promotion Support"].map(r => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>

                            <div className="mono" style={LBL}>EFFECTIVE HANDOVER DATE</div>
                            <input type="date" value={modal.transferEffectiveDate || getLocalDateStr()} onChange={e => setModal(m => ({ ...m, transferEffectiveDate: e.target.value }))} className="mono" style={INP} />

                            {/* Organizational Mobility & Handover Card */}
                            <div style={{
                              marginTop: 6,
                              marginBottom: 14,
                              padding: "10px 12px",
                              borderRadius: 4,
                              background: !isSameDept ? "rgba(110,231,183,0.08)" : "rgba(242,107,107,0.08)",
                              border: !isSameDept ? "1px solid rgba(110,231,183,0.3)" : "1px solid rgba(242,107,107,0.35)"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: !isSameDept ? "#6EE7B7" : "#F26B6B", textTransform: "uppercase" }}>
                                  {!isSameDept ? "🌐 Cross-Functional Mobility & Handover Card" : "⚠️ Same Department Selected"}
                                </span>
                                {!isSameDept && (
                                  <span className="mono" style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 10, background: "rgba(110,231,183,0.18)", color: "#6EE7B7", fontWeight: 700 }}>
                                    4-Node Causal Graph
                                  </span>
                                )}
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, marginBottom: 8 }}>
                                <div style={{ background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 3 }}>
                                  <div className="mono" style={{ fontSize: 9, color: "#5C7891" }}>CURRENT DEPT / COST CENTER</div>
                                  <div className="mono" style={{ color: "#DCE6F2", fontWeight: 600 }}>{curDept}</div>
                                </div>
                                <div style={{ background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 3 }}>
                                  <div className="mono" style={{ fontSize: 9, color: "#5C7891" }}>DESTINATION DEPT / COST CENTER</div>
                                  <div className="mono" style={{ color: !isSameDept ? "#6EE7B7" : "#F26B6B", fontWeight: 600 }}>{targetDept}</div>
                                </div>
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, marginBottom: 6 }}>
                                <div>
                                  <span className="mono" style={{ fontSize: 9, color: "#5C7891" }}>PAYROLL REALLOCATION: </span>
                                  <span className="mono" style={{ color: "#8CE99A", fontWeight: 600 }}>₹{Number(monthlySalary).toLocaleString("en-IN")}/mo</span>
                                </div>
                                <div>
                                  <span className="mono" style={{ fontSize: 9, color: "#5C7891" }}>ASSETS IN TRANSIT: </span>
                                  <span className="mono" style={{ color: assignedAssets.length ? "#F2B84B" : "#7C93AA", fontWeight: 600 }}>
                                    {assignedAssets.length} Device{assignedAssets.length === 1 ? "" : "s"}
                                  </span>
                                </div>
                              </div>

                              {assignedAssets.length > 0 && (
                                <div className="mono" style={{ fontSize: 9.5, color: "#9FB4C8", background: "rgba(242,184,75,0.08)", border: "1px solid rgba(242,184,75,0.2)", padding: "5px 8px", borderRadius: 3, marginTop: 4 }}>
                                  📦 Custodian Assets ({assignedAssets.map(a => a.asset).join(", ")}) will be tagged with new department code.
                                </div>
                              )}

                              <div className="mono" style={{ fontSize: 9.5, color: "#6A859E", marginTop: 7, lineHeight: 1.4 }}>
                                ⚡ Cascade: Updates <strong>emp_docs</strong> → Shifts <strong>payroll</strong> budget → Reallocates <strong>assets</strong> → Reassigns <strong>attendance_leave</strong> roster.
                              </div>
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      /* ── Promotion & Compensation Revision Section ── */
                      (() => {
                        const perfRecords = (db.performance || []).filter(r => r.emp === emp?.name);
                        const latest = perfRecords.length ? perfRecords[perfRecords.length - 1] : null;
                        const isCleared = perfRecords.length > 0 && latest?.rating !== "Needs Improvement" && latest?.rating !== "Unsatisfactory";

                        return (
                          <>
                            {/* Appraisal verification badge */}
                            <div style={{
                              display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 14,
                              background: isCleared ? "rgba(140,233,154,0.08)" : "rgba(242,107,107,0.1)",
                              border: isCleared ? "1px solid rgba(140,233,154,0.3)" : "1px solid rgba(242,107,107,0.35)",
                              borderRadius: 3
                            }}>
                              <span style={{ fontSize: 13 }}>{isCleared ? "✅" : "⚠️"}</span>
                              <div style={{ fontSize: 11 }}>
                                {isCleared ? (
                                  <>
                                    <span style={{ color: "#8CE99A", fontWeight: 600 }}>Appraisal Verified: </span>
                                    <span style={{ color: "#DCE6F2" }}>{latest.cycle} — {latest.rating} ({latest.kpiScore || "—"} KPI)</span>
                                  </>
                                ) : perfRecords.length === 0 ? (
                                  <span style={{ color: "#F26B6B", fontWeight: 600 }}>
                                    No appraisal on file — Corporate policy requires at least 1 completed appraisal cycle before promotion.
                                  </span>
                                ) : (
                                  <span style={{ color: "#F26B6B", fontWeight: 600 }}>
                                    Promotion Ineligible — Latest appraisal rating "{latest.rating}" does not meet promotion criteria.
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mono" style={LBL}>CURRENT DESIGNATION</div>
                            <input type="text" readOnly value={emp?.designation || "—"} className="mono" style={{ ...INP, background: "rgba(255,255,255,0.03)", color: "#7C93AA" }} />

                            <div className="mono" style={LBL}>NEW DESIGNATION</div>
                            <select className="mono" style={SEL} value={modal.newDesig} onChange={e => setModal(m => ({ ...m, newDesig: e.target.value }))}>
                              {DESIG_POOL.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>

                            {/* S.4: Live Compensation Delta & Wage Bump Card */}
                            {(() => {
                              const curRank = DESIG_POOL.indexOf(emp?.designation);
                              const newRank = DESIG_POOL.indexOf(modal.newDesig);
                              const curRate = DESIGNATION_RATES[emp?.designation] || 1000;
                              const targetRate = DESIGNATION_RATES[modal.newDesig] || 1000;
                              const wageDelta = targetRate - curRate;
                              const wagePct = curRate > 0 ? Math.round((wageDelta / curRate) * 100) : 0;
                              const isPromotion = newRank > curRank;
                              const fmt = (n) => Number(n).toLocaleString("en-IN");

                              return (
                                <div style={{
                                  marginTop: 8,
                                  marginBottom: 14,
                                  padding: "10px 12px",
                                  borderRadius: 4,
                                  background: isPromotion ? "rgba(140,233,154,0.08)" : (modal.newDesig === emp?.designation ? "rgba(255,255,255,0.03)" : "rgba(242,107,107,0.08)"),
                                  border: isPromotion ? "1px solid rgba(140,233,154,0.3)" : (modal.newDesig === emp?.designation ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(242,107,107,0.35)")
                                }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                                    <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: isPromotion ? "#8CE99A" : (modal.newDesig === emp?.designation ? "#7C93AA" : "#F26B6B"), textTransform: "uppercase" }}>
                                      {isPromotion ? "📈 Compensation Delta & Wage Bump (S.4)" : (modal.newDesig === emp?.designation ? "ℹ️ Same Rank Selected" : "⚠️ Lateral / Demotion Not Permitted")}
                                    </span>
                                    {isPromotion && (
                                      <span className="mono" style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "rgba(140,233,154,0.18)", color: "#8CE99A", fontWeight: 700 }}>
                                        +{wagePct}% Wage Hike
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11 }}>
                                    <div>
                                      <div className="mono" style={{ fontSize: 9, color: "#5C7891" }}>CURRENT RATE</div>
                                      <div className="mono" style={{ color: "#DCE6F2", fontWeight: 600 }}>₹{fmt(curRate)}/d</div>
                                      <div className="mono" style={{ fontSize: 9.5, color: "#5C7891" }}>₹{fmt(curRate * 30)}/mo</div>
                                    </div>
                                    <div>
                                      <div className="mono" style={{ fontSize: 9, color: "#5C7891" }}>REVISED RATE</div>
                                      <div className="mono" style={{ color: isPromotion ? "#8CE99A" : (modal.newDesig === emp?.designation ? "#DCE6F2" : "#F26B6B"), fontWeight: 600 }}>₹{fmt(targetRate)}/d</div>
                                      <div className="mono" style={{ fontSize: 9.5, color: isPromotion ? "#8CE99A" : (modal.newDesig === emp?.designation ? "#5C7891" : "#F26B6B") }}>₹{fmt(targetRate * 30)}/mo</div>
                                    </div>
                                    <div>
                                      <div className="mono" style={{ fontSize: 9, color: "#5C7891" }}>INCREMENT</div>
                                      <div className="mono" style={{ color: isPromotion ? "#8CE99A" : (modal.newDesig === emp?.designation ? "#7C93AA" : "#F26B6B"), fontWeight: 700 }}>
                                        {wageDelta > 0 ? `+₹${fmt(wageDelta)}/d` : (wageDelta === 0 ? "₹0" : `₹${fmt(wageDelta)}/d`)}
                                      </div>
                                      <div className="mono" style={{ fontSize: 9.5, color: isPromotion ? "#8CE99A" : (modal.newDesig === emp?.designation ? "#7C93AA" : "#F26B6B") }}>
                                        {wageDelta > 0 ? `+₹${fmt(wageDelta * 30)}/mo` : (wageDelta === 0 ? "₹0/mo" : `₹${fmt(wageDelta * 30)}/mo`)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                            <div className="mono" style={{ fontSize: 10, color: "#4A6070", marginBottom: 14 }}>
                              Promotions are logged to performance history and immediately update designation and payroll grade scale.
                            </div>
                          </>
                        );
                      })()
                    )}
                  </>
                );
              })()}

              {/* ── ESS fields ── */}
              {modal.type === "ess" && (() => {
                const emp = (db.emp_docs || []).find(e => e.id === modal.empId);
                const ESS_SERVICES = [
                  { id: "Payslip Download", title: "Payslip Download", desc: "Salary slip & tax statement", icon: FileText, color: "#8CE99A" },
                  { id: "Leave Balance Check", title: "Leave Balance Check", desc: "Live 3-tier quota ledger", icon: Calendar, color: "#7DD3FC" },
                  { id: "Attendance Correction", title: "Attendance Regularization", desc: "Missed punch / biometrics", icon: Clock, color: "#F2B84B" },
                  { id: "Reimbursement Claim", title: "Reimbursement Claim", desc: "Travel & meal expense claim", icon: Receipt, color: "#F26B8A" },
                  { id: "HR & IT Helpdesk", title: "HR & IT Helpdesk", desc: "Support ticket & grievance", icon: LifeBuoy, color: "#93C4D4" },
                  { id: "Profile Update", title: "Profile Modification", desc: "Contact & address update", icon: UserCheck, color: "#4FD1C5" },
                  { id: "Document Request", title: "HR Document Request", desc: "Bonafide or salary certificate", icon: FolderPlus, color: "#FFD166" },
                ];

                return (
                  <>
                    <div className="mono" style={LBL}>SELECT ESS SERVICE</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 6, marginBottom: 14 }}>
                      {ESS_SERVICES.map((srv, idx) => {
                        const isSel = modal.req === srv.id;
                        const IconComp = srv.icon;
                        return (
                          <div key={srv.id} onClick={() => setModal(m => ({ ...m, req: srv.id }))}
                            style={{
                              display: "flex", alignItems: "flex-start", gap: 9, padding: "8px 10px", borderRadius: 4, cursor: "pointer",
                              border: isSel ? "1px solid #D8A6F2" : "1px solid rgba(255,255,255,0.08)",
                              background: isSel ? "rgba(216,166,242,0.14)" : "rgba(255,255,255,0.02)",
                              gridColumn: idx === 6 ? "span 2" : "span 1",
                              transition: "all 0.15s ease"
                            }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                              background: isSel ? `${srv.color}25` : "rgba(255,255,255,0.05)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: isSel ? srv.color : "#7C93AA"
                            }}>
                              <IconComp size={15} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                                <span className="mono" style={{ fontSize: 11, fontWeight: isSel ? 700 : 600, color: isSel ? "#EDD4FA" : "#DCE6F2" }}>
                                  {srv.title}
                                </span>
                                {isSel && <Check size={12} style={{ color: "#D8A6F2", flexShrink: 0 }} />}
                              </div>
                              <div className="mono" style={{ fontSize: 9.5, color: isSel ? "#C9A7E8" : "#6A859E", marginTop: 2, lineHeight: 1.3 }}>
                                {srv.desc}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Contextual Interactive Sub-Panel ── */}
                    <div style={{
                      background: "rgba(0,0,0,0.35)", border: "1px solid rgba(216,166,242,0.25)",
                      borderRadius: 4, padding: "10px 12px", marginBottom: 14
                    }}>
                      {modal.req === "Payslip Download" && (() => {
                        const pMonth = modal.payslipMonth || "Oct 2026";
                        const pSlip = (db.payroll || []).find(p => p.emp === emp?.name && p.month === pMonth);
                        const availableMonths = Array.from(new Set([
                          "Oct 2026", "Sep 2026", "Aug 2026", "Jul 2026",
                          ...(db.payroll || []).filter(p => p.emp === emp?.name).map(p => p.month)
                        ]));
                        return (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <span className="mono" style={{ fontSize: 10, color: "#8CE99A", letterSpacing: "0.08em" }}>SELECT PAYROLL MONTH</span>
                              <span className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>🔒 256-BIT ENCRYPTED</span>
                            </div>
                            <select value={pMonth} onChange={e => setModal(m => ({ ...m, payslipMonth: e.target.value }))}
                              className="mono" style={{ ...SEL, marginTop: 0, marginBottom: 8 }}>
                              {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            {pSlip ? (
                              <div className="mono" style={{ padding: "8px 10px", background: "rgba(140,233,154,0.08)", border: "1px solid rgba(140,233,154,0.3)", borderRadius: 3, fontSize: 11, color: "#8CE99A" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span>Gross: {pSlip.gross}</span>
                                  <span>PF: {pSlip.pf}</span>
                                  <span style={{ fontWeight: 700, color: "#F4F7FB" }}>Net: {pSlip.net}</span>
                                </div>
                                <div style={{ fontSize: 9.5, color: "#7C93AA", marginTop: 4 }}>
                                  Status: {pSlip.status} · Days Worked: {pSlip.daysWorked || "Full Month"}
                                </div>
                              </div>
                            ) : (
                              <div className="mono" style={{ fontSize: 10.5, color: "#9FB4C8", lineHeight: 1.4 }}>
                                ℹ️ Direct download for <strong>{pMonth}</strong> will fetch a digitally certified PDF payslip once approved in payroll.
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {modal.req === "Leave Balance Check" && (() => {
                        const a = emp ? getLeaveBalance(emp.name, "Annual Leave") : 12;
                        const c = emp ? getLeaveBalance(emp.name, "Casual Leave") : 6;
                        const s = emp ? getLeaveBalance(emp.name, "Sick Leave") : 6;
                        return (
                          <>
                            <div className="mono" style={{ fontSize: 10, color: "#7DD3FC", letterSpacing: "0.08em", marginBottom: 8 }}>
                              LIVE 3-TIER LEAVE QUOTA LEDGER ({emp?.name || "EMPLOYEE"})
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
                              <div style={{ padding: "8px 4px", textAlign: "center", background: "rgba(125,211,252,0.08)", border: "1px solid rgba(125,211,252,0.25)", borderRadius: 3 }}>
                                <div className="mono" style={{ fontSize: 9.5, color: "#7DD3FC" }}>🌴 ANNUAL</div>
                                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "#F4F7FB", marginTop: 2 }}>{a.toFixed(1)}d</div>
                              </div>
                              <div style={{ padding: "8px 4px", textAlign: "center", background: "rgba(216,166,242,0.08)", border: "1px solid rgba(216,166,242,0.25)", borderRadius: 3 }}>
                                <div className="mono" style={{ fontSize: 9.5, color: "#D8A6F2" }}>☕ CASUAL</div>
                                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "#F4F7FB", marginTop: 2 }}>{c.toFixed(1)}d</div>
                              </div>
                              <div style={{ padding: "8px 4px", textAlign: "center", background: "rgba(242,107,138,0.08)", border: "1px solid rgba(242,107,138,0.25)", borderRadius: 3 }}>
                                <div className="mono" style={{ fontSize: 9.5, color: "#F26B8A" }}>💊 SICK</div>
                                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "#F4F7FB", marginTop: 2 }}>{s.toFixed(1)}d</div>
                              </div>
                            </div>
                            <div className="mono" style={{ fontSize: 9.5, color: "#6A859E" }}>
                              ✅ Quota balances are synchronized in real-time with Attendance &amp; Leave module ledger.
                            </div>
                          </>
                        );
                      })()}

                      {modal.req === "Attendance Correction" && (
                        <>
                          <div className="mono" style={{ fontSize: 10, color: "#F2B84B", letterSpacing: "0.08em", marginBottom: 6 }}>
                            ATTENDANCE REGULARIZATION DETAILS
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                            <div>
                              <label className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>MISSED PUNCH DATE</label>
                              <input type="date" value={modal.corrDate || getLocalDateStr()}
                                onChange={e => setModal(m => ({ ...m, corrDate: e.target.value }))}
                                className="mono" style={{ ...INP, marginTop: 3, marginBottom: 0, colorScheme: "dark" }}
                              />
                            </div>
                            <div>
                              <label className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>SHIFT SESSION</label>
                              <select value={modal.corrSession || "Morning Punch IN"}
                                onChange={e => setModal(m => ({ ...m, corrSession: e.target.value }))}
                                className="mono" style={{ ...SEL, marginTop: 3, marginBottom: 0 }}>
                                <option value="Morning Punch IN">Morning Shift (Punch IN)</option>
                                <option value="Evening Punch OUT">Evening Shift (Punch OUT)</option>
                                <option value="Full Day Biometric Failure">Full Day Biometric Failure</option>
                              </select>
                            </div>
                          </div>
                          <label className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>JUSTIFICATION REASON</label>
                          <select value={modal.corrReason || "Biometric Hardware Error"}
                            onChange={e => setModal(m => ({ ...m, corrReason: e.target.value }))}
                            className="mono" style={{ ...SEL, marginTop: 3, marginBottom: 0 }}>
                            <option value="Biometric Hardware Error">Biometric Sensor Offline / Hardware Glitch</option>
                            <option value="On-Duty Client Site Punch">Client Site Visit / Field Duty</option>
                            <option value="Forgot to Punch In">Forgot to Punch (In Office Working)</option>
                            <option value="Network / System Maintenance">Corporate Network Maintenance</option>
                          </select>
                        </>
                      )}

                      {modal.req === "Reimbursement Claim" && (
                        <>
                          <div className="mono" style={{ fontSize: 10, color: "#F26B8A", letterSpacing: "0.08em", marginBottom: 6 }}>
                            EXPENSE REIMBURSEMENT DETAILS
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 6, marginBottom: 8 }}>
                            <div>
                              <label className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>EXPENSE CATEGORY</label>
                              <select value={modal.claimCategory || "Local Conveyance / Travel"}
                                onChange={e => setModal(m => ({ ...m, claimCategory: e.target.value }))}
                                className="mono" style={{ ...SEL, marginTop: 3, marginBottom: 0 }}>
                                <option value="Local Conveyance / Travel">Local Conveyance / Cab Fare</option>
                                <option value="Client Lunch / Dining">Client Business Meal</option>
                                <option value="Broadband / Internet Allowance">Broadband / Work From Home</option>
                                <option value="Office Equipment / Peripherals">Hardware &amp; Office Supplies</option>
                              </select>
                            </div>
                            <div>
                              <label className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>CLAIM AMOUNT (₹)</label>
                              <input type="number" min={100} max={50000} step={100}
                                value={modal.claimAmount || 1200}
                                onChange={e => setModal(m => ({ ...m, claimAmount: Number(e.target.value) }))}
                                className="mono" style={{ ...INP, marginTop: 3, marginBottom: 0 }}
                              />
                            </div>
                          </div>
                          <div className="mono" style={{ fontSize: 9.5, color: "#8CE99A" }}>
                            📎 Digital Tax Invoice attached · Routed to Finance for disbursement
                          </div>
                        </>
                      )}

                      {(modal.req === "HR & IT Helpdesk" || modal.req === "IT Declaration Submission") && (
                        <>
                          <div className="mono" style={{ fontSize: 10, color: "#93C4D4", letterSpacing: "0.08em", marginBottom: 6 }}>
                            HR &amp; IT INTERNAL SUPPORT HELPDESK
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8, marginBottom: 8 }}>
                            <div>
                              <label className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>TICKET CATEGORY</label>
                              <select value={modal.ticketCategory || "IT Hardware & Equipment"}
                                onChange={e => setModal(m => ({ ...m, ticketCategory: e.target.value }))}
                                className="mono" style={{ ...SEL, marginTop: 3, marginBottom: 0 }}>
                                <option value="IT Hardware & Equipment">IT Hardware &amp; Laptop Support</option>
                                <option value="Payroll & Salary Slip Query">Payroll &amp; Salary Slip Query</option>
                                <option value="Biometric Sensor & Access Card">Biometric Punch &amp; Access Card</option>
                                <option value="Corporate HR Policy & Benefits">HR Policy &amp; Benefits Clarification</option>
                                <option value="Workplace Facilities & Ergonomics">Facilities &amp; Ergonomic Furniture</option>
                              </select>
                            </div>
                            <div>
                              <label className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>PRIORITY LEVEL</label>
                              <select value={modal.ticketPriority || "High"}
                                onChange={e => setModal(m => ({ ...m, ticketPriority: e.target.value }))}
                                className="mono" style={{ ...SEL, marginTop: 3, marginBottom: 0 }}>
                                <option value="Low">Low (General Inquiry)</option>
                                <option value="Medium">Medium (Standard Request)</option>
                                <option value="High">High (Impacting Daily Work)</option>
                                <option value="Critical">Critical (System Blocker)</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <label className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>TICKET SUBJECT / SUMMARY</label>
                            <input type="text"
                              value={modal.ticketSubject !== undefined ? modal.ticketSubject : "Laptop Screen Flickering & Battery Glitch"}
                              onChange={e => setModal(m => ({ ...m, ticketSubject: e.target.value }))}
                              placeholder="e.g. Laptop Display Glitch or Salary Slip TDS Discrepancy"
                              className="mono" style={{ ...INP, marginTop: 3, marginBottom: 0 }}
                            />
                          </div>
                          <div style={{ marginBottom: 6 }}>
                            <label className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>ISSUE DETAILS &amp; STEPS TO REPRODUCE</label>
                            <textarea
                              rows={2}
                              value={modal.ticketDescription !== undefined ? modal.ticketDescription : "Display blanks out intermittently during client video calls and battery drains within 45 mins. Requesting hardware diagnostic inspection."}
                              onChange={e => setModal(m => ({ ...m, ticketDescription: e.target.value }))}
                              placeholder="Describe the issue, error codes, or support needed..."
                              className="mono"
                              style={{ ...INP, marginTop: 3, marginBottom: 0, resize: "vertical", minHeight: 46, paddingTop: 6, lineHeight: 1.35 }}
                            />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                            <span className="mono" style={{ fontSize: 9.5, color: "#93C4D4" }}>
                              🎫 Auto-routed to HR &amp; IT Service Desk
                            </span>
                            <span className="mono" style={{ fontSize: 9.5, color: "#8CE99A" }}>
                              SLA: 24hr Guaranteed Response
                            </span>
                          </div>
                        </>
                      )}

                      {modal.req === "Profile Update" && (() => {
                        const curField = modal.profileField || "Residential Address";
                        const config = PROFILE_FIELD_CONFIG[curField] || PROFILE_FIELD_CONFIG["Residential Address"];
                        const currentEmp = emp;
                        const existingVal = currentEmp ? currentEmp[config.empKey] : null;

                        return (
                          <>
                            <div className="mono" style={{ fontSize: 10, color: "#4FD1C5", letterSpacing: "0.08em", marginBottom: 6 }}>
                              EMPLOYEE MASTER PROFILE UPDATE
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: 8, marginBottom: 8 }}>
                              <div>
                                <label className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>FIELD TO UPDATE</label>
                                <select value={curField}
                                  onChange={e => {
                                    const nextField = e.target.value;
                                    const nextCfg = PROFILE_FIELD_CONFIG[nextField] || PROFILE_FIELD_CONFIG["Residential Address"];
                                    setModal(m => ({
                                      ...m,
                                      profileField: nextField,
                                      profileValue: nextCfg.defaultVal
                                    }));
                                  }}
                                  className="mono" style={{ ...SEL, marginTop: 3, marginBottom: 0 }}>
                                  {Object.keys(PROFILE_FIELD_CONFIG).map(f => (
                                    <option key={f} value={f}>{PROFILE_FIELD_CONFIG[f].label}</option>
                                  ))}
                                </select>
                                <div className="mono" style={{ fontSize: 9, color: "#6A859E", marginTop: 4, lineHeight: 1.3 }}>
                                  {config.hint}
                                </div>
                              </div>
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <label className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>NEW REQUESTED VALUE</label>
                                  {existingVal && (
                                    <span className="mono" style={{ fontSize: 9, color: "#7C93AA" }}>On File: {String(existingVal).slice(0, 16)}</span>
                                  )}
                                </div>
                                {config.isTextarea ? (
                                  <textarea
                                    rows={2}
                                    value={modal.profileValue !== undefined ? modal.profileValue : config.defaultVal}
                                    onChange={e => setModal(m => ({ ...m, profileValue: e.target.value }))}
                                    placeholder={config.placeholder}
                                    className="mono"
                                    style={{ ...INP, marginTop: 3, marginBottom: 0, resize: "vertical", minHeight: 46, paddingTop: 6, lineHeight: 1.35 }}
                                  />
                                ) : (
                                  <input
                                    type={curField === "Personal Phone" ? "tel" : curField === "Personal Email" ? "email" : "text"}
                                    value={modal.profileValue !== undefined ? modal.profileValue : config.defaultVal}
                                    onChange={e => setModal(m => ({ ...m, profileValue: e.target.value }))}
                                    placeholder={config.placeholder}
                                    className="mono"
                                    style={{ ...INP, marginTop: 3, marginBottom: 0 }}
                                  />
                                )}
                              </div>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                              <span className="mono" style={{ fontSize: 9.5, color: "#8CE99A" }}>
                                {config.proofHint}
                              </span>
                              <span className="mono" style={{ fontSize: 9.5, color: "#4FD1C5" }}>
                                ⚡ Routes to HR Approvals Center
                              </span>
                            </div>
                          </>
                        );
                      })()}

                      {modal.req === "Document Request" && (
                        <>
                          <div className="mono" style={{ fontSize: 10, color: "#FFD166", letterSpacing: "0.08em", marginBottom: 6 }}>
                            OFFICIAL HR DOCUMENT &amp; CERTIFICATE REQUEST
                          </div>
                          <label className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>SELECT OR SPECIFY DOCUMENT TYPE</label>
                          <select value={modal.docType || "Bonafide Certificate"}
                            onChange={e => setModal(m => ({ ...m, docType: e.target.value }))}
                            className="mono" style={{ ...SEL, marginTop: 3, marginBottom: 8 }}>
                            <option value="Bonafide Certificate">Bonafide Certificate (Banking / Housing)</option>
                            <option value="Employment Verification Letter">Employment Verification Letter (Visa / Embassy)</option>
                            <option value="Salary Certificate">Official Annual Salary Certificate</option>
                            <option value="No Objection Certificate (NOC)">No Objection Certificate (NOC for Travel / Passport)</option>
                            <option value="Other (Custom Document / Letter)...">Other (Type Custom Document / Letter)...</option>
                          </select>

                          {modal.docType === "Other (Custom Document / Letter)..." && (
                            <div style={{ marginTop: 2, marginBottom: 8 }}>
                              <label className="mono" style={{ fontSize: 9.5, color: "#FFD166", letterSpacing: "0.06em" }}>
                                ✍️ TYPE DOCUMENT NAME / CERTIFICATE TITLE *
                              </label>
                              <input type="text"
                                value={modal.customDocTitle || ""}
                                onChange={e => setModal(m => ({ ...m, customDocTitle: e.target.value }))}
                                placeholder="e.g. Relieving Letter / Internship Certificate / Address Proof Affidavit"
                                className="mono" style={{ ...INP, marginTop: 3, marginBottom: 8 }}
                              />
                            </div>
                          )}

                          <label className="mono" style={{ fontSize: 9.5, color: "#7C93AA" }}>SUBMISSION PURPOSE / NOTES</label>
                          <input type="text"
                            value={modal.docPurpose || ""}
                            onChange={e => setModal(m => ({ ...m, docPurpose: e.target.value }))}
                            placeholder="e.g. Required for Higher Education Visa / Bank Loan Verification"
                            className="mono" style={{ ...INP, marginTop: 3, marginBottom: 8 }}
                          />

                          <div className="mono" style={{ fontSize: 9.5, color: "#8CE99A" }}>
                            ⚡ Routed to HR Approvals Center: Authorized digital document with official QR code and seal will be issued upon HR approval.
                          </div>
                        </>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* ── Payroll Cycle fields ── */}
              {modal.type === "payroll_cycle" && (() => {
                const activeEmps = (db.emp_docs || []).filter(e => !e.status.includes("Inactive"));
                const ALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const parts = (modal.month || "Oct 2026").trim().split(" ");
                const currentMonthName = ALL_MONTHS.includes(parts[0]) ? parts[0] : "Oct";
                const parsedYear = parseInt(parts[1], 10);
                const currentYear = !isNaN(parsedYear) ? parsedYear : (modal.selectedYear || 2026);
                const currentDaysInMonth = getDaysInMonth(currentYear, currentMonthName);
                const isLeap = currentMonthName === "Feb" && currentDaysInMonth === 29;

                const handleYearChange = (y) => {
                  setModal(prev => ({ ...prev, selectedYear: y, month: `${currentMonthName} ${y}` }));
                };

                const handleAdvanceMonth = () => {
                  const idx = ALL_MONTHS.indexOf(currentMonthName);
                  let nextIdx = idx + 1;
                  let nextYear = currentYear;
                  if (nextIdx > 11) {
                    nextIdx = 0;
                    nextYear += 1;
                  }
                  const nextM = ALL_MONTHS[nextIdx];
                  setModal(prev => ({ ...prev, selectedYear: nextYear, month: `${nextM} ${nextYear}` }));
                };

                return (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "8px 12px", background: "rgba(140,233,154,0.08)", border: "1px solid rgba(140,233,154,0.3)", borderRadius: 4 }}>
                      <span className="mono" style={{ fontSize: 10.5, color: "#8CE99A" }}>🏢 ACTIVE PAYROLL COVERAGE:</span>
                      <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: "#F4F7FB" }}>
                        {activeEmps.length} Employees Scheduled
                      </span>
                    </div>

                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      marginBottom: 12, padding: "8px 12px",
                      background: isLeap ? "rgba(255,209,102,0.12)" : "rgba(140,233,154,0.08)",
                      border: `1px solid ${isLeap ? "rgba(255,209,102,0.4)" : "rgba(140,233,154,0.3)"}`,
                      borderRadius: 4
                    }}>
                      <span className="mono" style={{ fontSize: 10.5, color: isLeap ? "#FFD166" : "#8CE99A" }}>
                        {isLeap ? "⭐ LEAP YEAR CALENDAR CYCLE:" : "📅 CALENDAR DAYS IN CYCLE:"}
                      </span>
                      <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: isLeap ? "#FFD166" : "#8CE99A" }}>
                        {currentMonthName} {currentYear} ({currentDaysInMonth} Days)
                      </span>
                    </div>

                    {/* Year Selector & Quick Advance Bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div className="mono" style={LBL}>SELECT PAYROLL MONTH &amp; YEAR</div>
                      <button type="button" onClick={handleAdvanceMonth}
                        className="mono"
                        style={{
                          fontSize: 10, padding: "3px 8px", background: "rgba(140,233,154,0.15)", border: "1px solid rgba(140,233,154,0.35)",
                          color: "#8CE99A", borderRadius: 3, cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                        }}>
                        ⏩ +1 Month ({ALL_MONTHS[(ALL_MONTHS.indexOf(currentMonthName) + 1) % 12]})
                      </button>
                    </div>

                    {/* Year Stepper */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10, background: "rgba(0,0,0,0.3)", padding: "6px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)" }}>
                      <button type="button" onClick={() => handleYearChange(currentYear - 1)}
                        className="mono"
                        style={{ padding: "4px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#DCE6F2", borderRadius: 3, cursor: "pointer", fontSize: 11 }}>
                        ◀ Prev
                      </button>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="mono" style={{ fontSize: 11, color: "#7C93AA" }}>YEAR:</span>
                        <select value={currentYear} onChange={e => handleYearChange(parseInt(e.target.value, 10))}
                          className="mono"
                          style={{ background: "#0A0F1A", color: "#8CE99A", border: "1px solid rgba(140,233,154,0.35)", borderRadius: 3, padding: "4px 8px", fontSize: 13, fontWeight: 700 }}>
                          {[2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <button type="button" onClick={() => handleYearChange(currentYear + 1)}
                        className="mono"
                        style={{ padding: "4px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#DCE6F2", borderRadius: 3, cursor: "pointer", fontSize: 11 }}>
                        Next ▶
                      </button>
                    </div>

                    {/* 12-Month Calendar Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 14 }}>
                      {ALL_MONTHS.map((m) => {
                        const isSel = currentMonthName === m && currentYear === (parsedYear || currentYear);
                        const mDays = getDaysInMonth(currentYear, m);
                        return (
                          <div key={m} onClick={() => setModal(prev => ({ ...prev, month: `${m} ${currentYear}` }))}
                            style={{
                              padding: "7px 4px", borderRadius: 3, cursor: "pointer", textAlign: "center", fontSize: 11.5,
                              border: isSel ? "1px solid #8CE99A" : "1px solid rgba(255,255,255,0.08)",
                              background: isSel ? "rgba(140,233,154,0.2)" : "rgba(255,255,255,0.02)",
                              color: isSel ? "#8CE99A" : "#9FB4C8",
                              fontWeight: isSel ? 700 : 500
                            }} className="mono">
                            <div>{m}</div>
                            <div style={{ fontSize: 9.5, opacity: 0.75, marginTop: 1 }}>{mDays}d</div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mono" style={LBL}>TARGET CYCLE LABEL</div>
                    <input type="text" value={modal.month} onChange={e => setModal(prev => ({ ...prev, month: e.target.value }))}
                      placeholder="e.g. Oct 2026 or Q4-2026"
                      className="mono" style={INP}
                    />

                    <div className="mono" style={LBL}>ATTENDANCE CALCULATION MODE</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 5, marginBottom: 10 }}>
                      <div onClick={() => setModal(prev => ({ ...prev, mode: "standard" }))}
                        style={{
                          padding: "8px 8px", borderRadius: 3, cursor: "pointer", textAlign: "center", fontSize: 11,
                          border: modal.mode === "standard" ? "1px solid #8CE99A" : "1px solid rgba(255,255,255,0.08)",
                          background: modal.mode === "standard" ? "rgba(140,233,154,0.18)" : "transparent",
                          color: modal.mode === "standard" ? "#8CE99A" : "#7C93AA"
                        }} className="mono">
                        ⚡ Standard ({currentDaysInMonth} Days)
                      </div>
                      <div onClick={() => setModal(prev => ({ ...prev, mode: "attendance" }))}
                        style={{
                          padding: "8px 8px", borderRadius: 3, cursor: "pointer", textAlign: "center", fontSize: 11,
                          border: modal.mode === "attendance" ? "1px solid #8CE99A" : "1px solid rgba(255,255,255,0.08)",
                          background: modal.mode === "attendance" ? "rgba(140,233,154,0.18)" : "transparent",
                          color: modal.mode === "attendance" ? "#8CE99A" : "#7C93AA"
                        }} className="mono">
                        🔍 Strict Attendance (Max {currentDaysInMonth}d)
                      </div>
                    </div>

                    <div className="mono" style={{ fontSize: 10, color: "#6A859E", marginBottom: 14, background: "rgba(0,0,0,0.25)", padding: "7px 10px", borderRadius: 3, lineHeight: 1.4 }}>
                      {modal.mode === "standard"
                        ? `💡 Standard Mode: Simulates full monthly salary based on ${currentDaysInMonth} calendar days for ${modal.month || "the selected cycle"} (minus unpaid leaves).`
                        : `💡 Strict Mode: Aggregates only physical punches and approved leaves specifically dated in ${modal.month || "this month"} (capped at ${currentDaysInMonth} calendar days).`}
                    </div>
                  </>
                );
              })()}

              {/* ── Retention Desk: price the counter-offer against the exit ── */}
              {modal.type === "retention" && (() => {
                const t = twinByEmpId[modal.empId];
                if (!t) return <div style={{ color: "#F26B6B", fontSize: 12 }}>This employee is no longer active.</div>;
                const offers = RETENTION_LEVERS.map(l => retentionOfferModel(t.emp, l, t.risk.score, t.loss.total));
                const sel = offers.find(o => o.lever.key === modal.leverKey) || offers[1];
                const b = budgetByDept[t.dept];
                const affordable = !b || sel.yearOneCost <= b.available;
                const blockedByAppraisal = sel.lever.requiresAppraisal && !t.rating;

                return (
                  <>
                    {/* Employee Selector for Retention Desk */}
                    <div style={{ marginBottom: 12 }}>
                      <label className="mono" style={LBL}>Select Employee for Retention Review</label>
                      <select
                        value={modal.empId}
                        onChange={(e) => {
                          const newEmpId = e.target.value;
                          const newTwin = twinByEmpId[newEmpId];
                          if (newTwin) {
                            const newOffers = RETENTION_LEVERS.map(l => retentionOfferModel(newTwin.emp, l, newTwin.risk.score, newTwin.loss.total));
                            const best = newOffers.filter(o => o.netBenefit > 0).sort((a, b) => b.netBenefit - a.netBenefit)[0];
                            setModal(prev => ({
                              ...prev,
                              empId: newEmpId,
                              leverKey: best ? best.lever.key : "retention_hike"
                            }));
                          }
                        }}
                        className="mono"
                        style={{ ...INP, marginTop: 4, marginBottom: 0 }}>
                        {workforceTwin.filter(wt => !wt.emp.status?.includes("Inactive")).map(wt => (
                          <option key={wt.emp.id} value={wt.emp.id}>
                            {wt.emp.name} ({wt.desig} · {wt.dept}) — Flight Risk: {wt.risk.score}/100 ({wt.risk.band})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#F4F7FB" }}>{t.emp.name}</div>
                          <div className="mono" style={{ fontSize: 10, color: "#7C93AA" }}>
                            {t.desig} · {t.dept} · {t.roi.tenureMonths}mo tenure · appraisal {t.rating || "none on file"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: t.risk.color }}>{t.risk.score}/100</div>
                          <div className="mono" style={{ fontSize: 9, color: "#7C93AA" }}>{t.risk.band} flight risk</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 10.5, color: "#9FB4C8", lineHeight: 1.6 }}>
                        <strong style={{ color: "#F5A524" }}>Why: </strong>
                        {t.risk.drivers.filter(d => d.points > 0).slice(0, 3).map(d => d.label).join(" · ") || "no material risk drivers"}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 10.5, color: "#9FB4C8" }}>
                        <strong style={{ color: "#F26B6B" }}>If they walk: </strong>
                        {fmtINR(t.loss.total)} total ({fmtINR(t.expectedLoss)} probability-weighted) ·{" "}
                        {t.successors.length ? `${t.successors[0].emp.name} could cover as ${t.successors[0].mode}` : "no internal successor — full external search"}
                      </div>
                    </div>

                    <div className="mono" style={LBL}>CHOOSE A LEVER</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, marginBottom: 14 }}>
                      {offers.map(o => {
                        const active = o.lever.key === modal.leverKey;
                        const ok = o.netBenefit > 0;
                        return (
                          <div key={o.lever.key} onClick={() => setModal(m => ({ ...m, leverKey: o.lever.key }))}
                            style={{
                              padding: "8px 10px", borderRadius: 4, cursor: "pointer",
                              border: active ? `1px solid ${ok ? "#8CE99A" : "#F2946B"}` : "1px solid rgba(255,255,255,0.08)",
                              background: active ? (ok ? "rgba(140,233,154,0.12)" : "rgba(242,148,107,0.12)") : "transparent",
                              display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 8, alignItems: "center"
                            }}>
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 600, color: active ? "#F4F7FB" : "#9FB4C8" }}>{o.lever.label}</div>
                              <div className="mono" style={{ fontSize: 9, color: "#5C7891" }}>
                                {o.lever.detail}
                                {o.lever.key === "promotion" && ` → ${o.newDesignation}`}
                              </div>
                            </div>
                            <div className="mono" style={{ fontSize: 10, textAlign: "right" }}>
                              <div style={{ color: "#F2946B", fontWeight: 700 }}>{fmtINR(o.yearOneCost)}</div>
                              <div style={{ color: "#5C7891", fontSize: 8.5 }}>year-1 cost</div>
                            </div>
                            <div className="mono" style={{ fontSize: 10, textAlign: "right" }}>
                              <div style={{ color: "#7DD3FC", fontWeight: 700 }}>{t.risk.score}→{o.residualRisk}</div>
                              <div style={{ color: "#5C7891", fontSize: 8.5 }}>risk after</div>
                            </div>
                            <div className="mono" style={{ fontSize: 10, textAlign: "right" }}>
                              <div style={{ color: o.netBenefit >= 0 ? "#8CE99A" : "#F26B6B", fontWeight: 700 }}>{fmtINR(o.netBenefit)}</div>
                              <div style={{ color: "#5C7891", fontSize: 8.5 }}>net benefit</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{
                      background: sel.netBenefit >= 0 ? "rgba(140,233,154,0.08)" : "rgba(242,107,107,0.08)",
                      border: `1px solid ${sel.netBenefit >= 0 ? "rgba(140,233,154,0.35)" : "rgba(242,107,107,0.35)"}`,
                      borderRadius: 4, padding: "10px 12px", marginBottom: 14, fontSize: 10.5, color: "#9FB4C8", lineHeight: 1.7
                    }}>
                      <div style={{ fontWeight: 700, color: sel.netBenefit >= 0 ? "#8CE99A" : "#F26B6B", fontSize: 12, marginBottom: 4 }}>
                        {sel.netBenefit >= 0 ? "✓ RETAIN — cheaper to keep than to replace" : "✗ RELEASE — this package costs more than the exit it prevents"}
                      </div>
                      Pay moves {fmtINR(t.emp.dailyRate || 0)}/day → <strong style={{ color: "#F4F7FB" }}>{fmtINR(sel.newRate)}/day</strong>
                      {sel.lever.key === "promotion" && <> and the grade moves <strong style={{ color: "#F4F7FB" }}>{t.desig} → {sel.newDesignation}</strong></>}.
                      That is <strong style={{ color: "#F2946B" }}>{fmtINR(sel.yearOneCost)}</strong> in year one against a modelled exit cost of{" "}
                      <strong style={{ color: "#F26B6B" }}>{fmtINR(t.loss.total)}</strong>, so the expected saving is{" "}
                      <strong style={{ color: "#8CE99A" }}>{fmtINR(sel.expectedSaving)}</strong> — a net{" "}
                      {sel.netBenefit >= 0 ? "gain" : "loss"} of <strong style={{ color: sel.netBenefit >= 0 ? "#8CE99A" : "#F26B6B" }}>{fmtINR(Math.abs(sel.netBenefit))}</strong>
                      {sel.roi !== Infinity && sel.yearOneCost > 0 && <> ({sel.roi.toFixed(2)}x return on the retention spend)</>}.
                      {b && <> {t.dept} has <strong style={{ color: affordable ? "#8CE99A" : "#F26B6B" }}>{fmtINR(b.available)}</strong> uncommitted.</>}
                    </div>

                    {!affordable && (
                      <div className="mono" style={{ fontSize: 10.5, color: "#F26B6B", background: "rgba(242,107,107,0.1)", border: "1px solid rgba(242,107,107,0.35)", borderRadius: 3, padding: "8px 10px", marginBottom: 14 }}>
                        ⚠️ Budget shortfall — this package needs {fmtINR(sel.yearOneCost)} but only {fmtINR(b.available)} is uncommitted in {t.dept}. Revise the department envelope first, or choose a cheaper lever.
                      </div>
                    )}
                    {blockedByAppraisal && (
                      <div className="mono" style={{ fontSize: 10.5, color: "#F2B84B", background: "rgba(242,184,75,0.1)", border: "1px solid rgba(242,184,75,0.35)", borderRadius: 3, padding: "8px 10px", marginBottom: 14 }}>
                        ⚠️ Promotion needs a completed appraisal cycle on file for {t.emp.name}. Log one first, or use a retention hike instead.
                      </div>
                    )}
                  </>
                );
              })()}

              {/* ── Fill Vacancy: internal succession vs external hire ── */}
              {modal.type === "fill_vacancy" && (() => {
                const v = openVacancies.find(x => x.id === modal.vacancyId);
                if (!v) return <div style={{ color: "#F26B6B", fontSize: 12 }}>This vacancy is no longer open.</div>;
                const active = (db.emp_docs || []).filter(e => !e.status?.includes("Inactive"));
                const cands = findReplacementCandidates({ id: "__v__", designation: v.grade, department: v.dept, dept: v.dept }, active, ratingOf);
                const extOnboard = onboardingCostModel(v.grade);
                const b = budgetByDept[v.dept];
                const extRoi = employeeROIModel({ designation: v.grade, dailyRate: DESIGNATION_RATES[v.grade], joined: todayStr }, todayStr);

                return (
                  <>
                    <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F4F7FB" }}>{v.grade} — {v.dept}</div>
                      <div className="mono" style={{ fontSize: 10, color: "#7C93AA", marginTop: 2 }}>
                        {v.id} · opened {v.openedOn} · {v.causedBy}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 10.5, color: "#9FB4C8" }}>
                        This seat has been empty <strong style={{ color: "#F2B84B" }}>{v.daysOpen} day(s)</strong>, forgoing{" "}
                        <strong style={{ color: "#F26B6B" }}>{fmtINR(v.dailyLoss)}/day</strong> of output —{" "}
                        <strong style={{ color: "#F26B6B" }}>{fmtINR(v.cumulativeLoss)}</strong> lost so far.
                      </div>
                    </div>

                    <div className="mono" style={LBL}>FILL ROUTE</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6, marginBottom: 14 }}>
                      {[
                        { k: "internal", title: "Internal Succession", sub: cands.length ? `${cands.length} candidate(s) on the bench` : "no candidates available", ok: cands.length > 0 },
                        { k: "external", title: "External Hire", sub: `${fmtINR(extOnboard.total)} · ~${gradeEcon(v.grade).daysToFill}d lead time`, ok: true },
                      ].map(r => (
                        <div key={r.k} onClick={() => r.ok && setModal(m => ({ ...m, fillMode: r.k }))}
                          style={{
                            padding: "9px 11px", borderRadius: 4, cursor: r.ok ? "pointer" : "not-allowed", opacity: r.ok ? 1 : 0.45,
                            border: modal.fillMode === r.k ? "1px solid #F2B84B" : "1px solid rgba(255,255,255,0.08)",
                            background: modal.fillMode === r.k ? "rgba(242,184,75,0.14)" : "transparent"
                          }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: modal.fillMode === r.k ? "#F2B84B" : "#9FB4C8" }}>{r.title}</div>
                          <div className="mono" style={{ fontSize: 9.5, color: "#5C7891" }}>{r.sub}</div>
                        </div>
                      ))}
                    </div>

                    {modal.fillMode === "internal" && (
                      <>
                        <div className="mono" style={LBL}>SUCCESSION BENCH</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6, marginBottom: 14 }}>
                          {cands.length === 0 && (
                            <div style={{ fontSize: 11, color: "#F26B6B" }}>No internal candidate matches this grade. Switch to an external hire.</div>
                          )}
                          {cands.map(c => {
                            const active2 = modal.candidateId === c.emp.id;
                            const cRate = Number(c.emp.dailyRate) || 0;
                            const delta = Math.round(((DESIGNATION_RATES[v.grade] || cRate) - cRate) * 30 * 12 * (1 + STATUTORY_LOAD));
                            return (
                              <div key={c.emp.id} onClick={() => setModal(m => ({ ...m, candidateId: c.emp.id }))}
                                style={{
                                  padding: "8px 10px", borderRadius: 4, cursor: "pointer",
                                  border: active2 ? "1px solid #8CE99A" : "1px solid rgba(255,255,255,0.08)",
                                  background: active2 ? "rgba(140,233,154,0.12)" : "transparent",
                                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10
                                }}>
                                <div>
                                  <div style={{ fontSize: 11.5, fontWeight: 600, color: active2 ? "#F4F7FB" : "#9FB4C8" }}>
                                    {c.emp.name}
                                    <span className="mono" style={{ fontSize: 9, color: "#8CE99A", marginLeft: 6 }}>{c.mode}</span>
                                    <span className="mono" style={{ fontSize: 9, color: "#5C7891", marginLeft: 6 }}>fit {c.fitScore}%</span>
                                  </div>
                                  <div className="mono" style={{ fontSize: 9, color: "#5C7891" }}>{c.note}</div>
                                </div>
                                <div className="mono" style={{ fontSize: 10, textAlign: "right", whiteSpace: "nowrap" }}>
                                  <div style={{ color: "#F2946B", fontWeight: 700 }}>{fmtINR(Math.max(0, delta))}</div>
                                  <div style={{ color: "#5C7891", fontSize: 8.5 }}>added run-rate</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ background: "rgba(140,233,154,0.08)", border: "1px solid rgba(140,233,154,0.3)", borderRadius: 4, padding: "9px 11px", marginBottom: 14, fontSize: 10.5, color: "#9FB4C8", lineHeight: 1.7 }}>
                          Filling internally avoids <strong style={{ color: "#8CE99A" }}>{fmtINR(extOnboard.total)}</strong> of external onboarding cost and closes the gap in days rather than weeks.
                          {cands.find(c => c.emp.id === modal.candidateId)?.cascades && (
                            <> Note: this move <strong style={{ color: "#F2B84B" }}>cascades a new vacancy</strong> at the successor's old grade, which the twin will open automatically.</>
                          )}
                        </div>
                      </>
                    )}

                    {modal.fillMode === "external" && (
                      <div style={{ background: "rgba(242,184,75,0.08)", border: "1px solid rgba(242,184,75,0.3)", borderRadius: 4, padding: "10px 12px", marginBottom: 14, fontSize: 10.5, color: "#9FB4C8", lineHeight: 1.8 }}>
                        <div style={{ fontWeight: 700, color: "#F2B84B", marginBottom: 5 }}>External hire — cost to acquire</div>
                        {extOnboard.heads.map(h => (
                          <div key={h.key} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>{h.label}</span><span className="mono" style={{ color: "#DCE6F2" }}>{fmtINR(h.amount)}</span>
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 4, paddingTop: 4, fontWeight: 700 }}>
                          <span style={{ color: "#F4F7FB" }}>One-time total</span><span className="mono" style={{ color: "#F2B84B" }}>{fmtINR(extOnboard.total)}</span>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          Plus <strong style={{ color: "#F2946B" }}>{fmtINR(extRoi.cost.total)}/yr</strong> run-rate against a modelled{" "}
                          <strong style={{ color: "#7DD3FC" }}>{fmtINR(extRoi.annualValue)}/yr</strong> of output — steady margin{" "}
                          <strong style={{ color: extRoi.steadyMargin >= 0 ? "#8CE99A" : "#F26B6B" }}>{fmtINR(extRoi.steadyMargin)}</strong>, breaking even in ~{extRoi.breakEvenMonths ?? "—"} months.
                          {b && <> {v.dept} has <strong style={{ color: "#8CE99A" }}>{fmtINR(b.available)}</strong> uncommitted and {b.headcount}/{b.sanctioned} seats filled — the hire form will re-run this gate before anyone is created.</>}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* ── Revise Budget: the accountant amends the plan ── */}
              {modal.type === "revise_budget" && (() => {
                const b = budgetByDept[modal.dept];
                if (!b) return <div style={{ color: "#F26B6B", fontSize: 12 }}>No budget row for this department.</div>;
                const newBudget = Math.max(0, Number(modal.annualBudget) || 0);
                const newSanctioned = Math.max(0, parseInt(modal.sanctioned, 10) || 0);
                const newAvailable = newBudget - b.totalCommitted;
                const cutTooDeep = newBudget < b.totalCommitted;
                const ceilingTooLow = newSanctioned < b.headcount;

                return (
                  <>
                    {/* Department Selector */}
                    <div style={{ marginBottom: 12 }}>
                      <label className="mono" style={LBL}>Select Department to Revise</label>
                      <select
                        value={modal.dept}
                        onChange={(e) => {
                          const newDept = e.target.value;
                          const targetB = budgetByDept[newDept];
                          if (targetB) {
                            setModal(prev => ({
                              ...prev,
                              dept: newDept,
                              sanctioned: targetB.sanctioned,
                              annualBudget: targetB.annualBudget,
                            }));
                          }
                        }}
                        className="mono"
                        style={{ ...INP, marginTop: 4, marginBottom: 0 }}>
                        {budgetModel.map(bRow => (
                          <option key={bRow.dept} value={bRow.dept}>
                            {bRow.dept} — {bRow.headcount}/{bRow.sanctioned} seats · Budget: {fmtINR(bRow.annualBudget)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 4, padding: "10px 12px", marginBottom: 14, fontSize: 10.5, color: "#9FB4C8", lineHeight: 1.7 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F4F7FB", marginBottom: 4 }}>{b.dept}</div>
                      Currently carrying <strong style={{ color: "#F4F7FB" }}>{b.headcount} of {b.sanctioned}</strong> sanctioned seats
                      ({b.vacant} vacant, {b.onLeave} on leave, {b.onNotice} on notice).
                      Committed <strong style={{ color: "#F2946B" }}>{fmtINR(b.totalCommitted)}</strong> of{" "}
                      <strong style={{ color: "#F4F7FB" }}>{fmtINR(b.annualBudget)}</strong> — {Math.round(b.utilisation * 100)}% utilised,{" "}
                      <strong style={{ color: b.available < 0 ? "#F26B6B" : "#8CE99A" }}>{fmtINR(b.available)}</strong> uncommitted.
                    </div>

                    <div className="mono" style={LBL}>SANCTIONED HEADCOUNT CEILING</div>
                    <input type="number" min="0" value={modal.sanctioned}
                      onChange={e => setModal(m => ({ ...m, sanctioned: e.target.value }))}
                      className="mono" style={INP} />

                    <div className="mono" style={LBL}>ANNUAL BUDGET ENVELOPE (INR)</div>
                    <input type="number" min="0" step="100000" value={modal.annualBudget}
                      onChange={e => setModal(m => ({ ...m, annualBudget: e.target.value }))}
                      className="mono" style={INP} />

                    <div style={{
                      background: cutTooDeep || ceilingTooLow ? "rgba(242,107,107,0.08)" : "rgba(245,165,36,0.08)",
                      border: `1px solid ${cutTooDeep || ceilingTooLow ? "rgba(242,107,107,0.35)" : "rgba(245,165,36,0.3)"}`,
                      borderRadius: 4, padding: "10px 12px", marginBottom: 14, fontSize: 10.5, color: "#9FB4C8", lineHeight: 1.7
                    }}>
                      {cutTooDeep && (
                        <div style={{ color: "#F26B6B", fontWeight: 700, marginBottom: 4 }}>
                          ⚠️ Cannot cut below {fmtINR(b.totalCommitted)} — that money is already committed to live headcount and booked costs.
                        </div>
                      )}
                      {ceilingTooLow && (
                        <div style={{ color: "#F26B6B", fontWeight: 700, marginBottom: 4 }}>
                          ⚠️ Cannot set the ceiling to {newSanctioned} while {b.headcount} people are active. Offboard or redeploy first.
                        </div>
                      )}
                      {!cutTooDeep && !ceilingTooLow && (
                        <>
                          After this revision {b.dept} can carry <strong style={{ color: "#F4F7FB" }}>{Math.max(0, newSanctioned - b.headcount)} more</strong> hire(s)
                          against <strong style={{ color: "#8CE99A" }}>{fmtINR(newAvailable)}</strong> of uncommitted budget — roughly{" "}
                          <strong style={{ color: "#F4F7FB" }}>
                            {Math.max(0, Math.floor(newAvailable / Math.max(1, onboardingCostModel("Specialist").total + annualCostModel({ designation: "Specialist", dailyRate: DESIGNATION_RATES["Specialist"] }).total)))}
                          </strong>{" "}
                          Specialist-grade hires at full year-one load.
                        </>
                      )}
                    </div>
                  </>
                );
              })()}

              <button className="btn"
                disabled={
                  (!["payroll_cycle", "revise_budget", "fill_vacancy"].includes(modal.type) && !modal.empId) ||
                  (modal.type === "fill_vacancy" && modal.fillMode === "internal" && !modal.candidateId) ||
                  (modal.type === "retention" && (() => {
                    const t = twinByEmpId[modal.empId];
                    if (!t) return true;
                    const lever = RETENTION_LEVERS.find(l => l.key === modal.leverKey);
                    if (!lever) return true;
                    if (lever.requiresAppraisal && !t.rating) return true;
                    const o = retentionOfferModel(t.emp, lever, t.risk.score, t.loss.total);
                    const b = budgetByDept[t.dept];
                    return !!b && o.yearOneCost > b.available;
                  })()) ||
                  (modal.type === "revise_budget" && (() => {
                    const b = budgetByDept[modal.dept];
                    if (!b) return true;
                    return (Number(modal.annualBudget) || 0) < b.totalCommitted ||
                      (parseInt(modal.sanctioned, 10) || 0) < b.headcount;
                  })()) ||
                  (modal.type === "offboard" && (modal.separationMode || "final_clearance") === "final_clearance" && Object.values(offboardChecklist).filter(Boolean).length < 8) ||
                  ((modal.type === "return_asset" || (modal.type === "manage_asset" && modal.subTab === "return")) && !modal.assetId && !(db.assets || []).some(a => a.status === "Allocated")) ||
                  ((modal.type === "promote" || (modal.type === "mobility" && modal.subTab !== "transfer")) && (() => {
                    const emp = (db.emp_docs || []).find(e => e.id === modal.empId);
                    const perf = (db.performance || []).filter(r => r.emp === emp?.name);
                    if (!perf.length) return true;
                    const l = perf[perf.length - 1];
                    if (l?.rating === "Needs Improvement" || l?.rating === "Unsatisfactory") return true;
                    const curRank = DESIG_POOL.indexOf(emp?.designation);
                    const newRank = DESIG_POOL.indexOf(modal.newDesig);
                    return newRank <= curRank;
                  })()) ||
                  ((modal.type === "transfer" || (modal.type === "mobility" && modal.subTab === "transfer")) && (() => {
                    const emp = (db.emp_docs || []).find(e => e.id === modal.empId);
                    return emp && modal.newDept === (emp.dept || emp.department);
                  })()) ||
                  (modal.type === "comp_incentives" && modal.subTab === "allowance" && (!modal.amount || modal.amount < 500))
                }
                onClick={CONFIRM_FN[modal.type]}
                style={{ width: "100%", textAlign: "center", borderColor: meta.accent, color: "#F4F7FB", background: `${meta.accent}18`, fontWeight: 600 }}>
                {modal.type === "comp_incentives"
                  ? (modal.subTab === "allowance" ? "AUTHORIZE SPECIAL ALLOWANCE & QUEUE IN PAYROLL" : "CONFIRM NOMINATION FOR EXCELLENCE AWARD")
                  : modal.type === "retention"
                    ? "APPROVE RETENTION PACKAGE & BOOK THE COST"
                    : modal.type === "fill_vacancy"
                      ? (modal.fillMode === "internal" ? "CONFIRM INTERNAL SUCCESSION" : "PROCEED TO BUDGET-GATED EXTERNAL HIRE")
                      : modal.type === "revise_budget"
                        ? "COMMIT REVISED BUDGET PLAN"
                        : modal.type === "payroll_cycle"
                          ? `PROCESS PAYROLL — ${(modal.month || "CYCLE").toUpperCase()}`
                          : modal.type === "offboard"
                            ? ((modal.separationMode || "final_clearance") === "final_clearance" && Object.values(offboardChecklist).filter(Boolean).length < 8
                              ? `COMPLETE ALL 8 CLEARANCE ITEMS (${Object.values(offboardChecklist).filter(Boolean).length}/8 VERIFIED)`
                              : (modal.separationMode === "notice"
                                ? "SCHEDULE RESIGNATION (START NOTICE PERIOD)"
                                : "CONFIRM OFFBOARD & RUN FLOWCHART SIMULATION"))
                            : modal.type === "manage_asset"
                              ? (modal.subTab === "return" ? "CONFIRM ASSET RETURN" : "ALLOCATE HARDWARE ASSET")
                              : modal.type === "mobility"
                                ? (modal.subTab === "transfer" ? "CONFIRM DEPARTMENT TRANSFER" : "CONFIRM PROMOTION & REVISE SCALE")
                                : (modal.type === "ess" && (modal.req === "Reimbursement Claim" || modal.req === "Attendance Correction" || modal.req === "Document Request")
                                  ? "SUBMIT FOR HR APPROVAL"
                                  : modal.type === "return_asset"
                                    ? "CONFIRM ASSET RETURN"
                                    : modal.type === "promote"
                                      ? "CONFIRM PROMOTION & REVISE SCALE"
                                      : modal.type === "transfer"
                                        ? "CONFIRM DEPARTMENT TRANSFER"
                                        : "CONFIRM & SUBMIT")}
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── HR Approval & Notification Center Modal ───────────────────────── */}
      {showNotifications && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4,8,14,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 75 }}>
          <div style={{ width: 560, maxHeight: "88vh", overflowY: "auto", background: "#0D1420", border: "1px solid rgba(242,184,75,0.5)", borderRadius: 6, padding: 22 }} className="scrollbar-thin">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bell size={18} color="#F2B84B" />
                <span style={{ fontWeight: 700, fontSize: 16, color: "#F4F7FB" }}>HR Approval &amp; Notification Center</span>
              </div>
              <X size={16} style={{ cursor: "pointer", color: "#7C93AA" }} onClick={() => setShowNotifications(false)} />
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: "#5C7891", marginBottom: 18 }}>
              Review pending employee requests with automated balance deduction &amp; payroll synchronization.
            </div>

            {!networkOn && (
              <div style={{
                background: "rgba(242,107,107,0.14)",
                border: "1px solid rgba(242,107,107,0.45)",
                borderRadius: 4,
                padding: "9px 12px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#F26B6B"
              }} className="mono">
                <span style={{ fontSize: 13 }}>⚠️</span>
                <span style={{ fontSize: 10.5, fontWeight: 600, lineHeight: 1.4 }}>
                  SIMULATION NETWORK OFFLINE — Approvals and database synchronization are currently disabled. Please restore network connectivity in the top toolbar to process or reject requests.
                </span>
              </div>
            )}

            {/* Section 1: Leave Applications */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid rgba(125,211,252,0.2)" }}>
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "#7DD3FC", letterSpacing: "0.06em" }}>
                  🏖️ LEAVE APPLICATIONS ({pendingLeaves.length})
                </span>
              </div>
              {pendingLeaves.length === 0 ? (
                <div className="mono" style={{ fontSize: 11, color: "#4A6070", padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: 3, textAlign: "center" }}>
                  — No pending leave requests —
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pendingLeaves.map((req) => {
                    const emp = (db.emp_docs || []).find(e => e.name === req.emp);
                    const isOnDuty = req.type && req.type.includes("On-Duty");
                    const isMaternity = req.type && req.type.includes("Maternity");
                    const isPaternity = req.type && req.type.includes("Paternity");
                    const isCompOff = req.type && req.type.includes("Comp Off");
                    const isSpecialLeave = isOnDuty || isMaternity || isPaternity || isCompOff;
                    const reqDays = Number(req.days) || (req.isHalfDay ? 0.5 : 1);
                    const curBal = !isSpecialLeave ? getLeaveBalance(req.emp, req.type) : null;
                    const newBal = !isSpecialLeave ? Math.max(0, parseFloat((curBal - reqDays).toFixed(1))) : null;
                    const travelAllowanceAmt = isOnDuty ? Math.round(reqDays * 1000) : 0;

                    let badgeColor = "#F2B84B";
                    let badgeBg = "rgba(242,184,75,0.15)";
                    let badgeBorder = "rgba(242,184,75,0.3)";
                    let badgeText = "Pending HR";
                    let cardBorder = "rgba(125,211,252,0.25)";
                    let cardBg = "rgba(125,211,252,0.04)";

                    if (isOnDuty) {
                      badgeColor = "#93C4D4"; badgeBg = "rgba(147,196,212,0.18)"; badgeBorder = "rgba(147,196,212,0.4)";
                      badgeText = "✈️ On-Duty Trip"; cardBorder = "rgba(147,196,212,0.35)"; cardBg = "rgba(147,196,212,0.06)";
                    } else if (isMaternity) {
                      badgeColor = "#F26B8A"; badgeBg = "rgba(242,107,138,0.18)"; badgeBorder = "rgba(242,107,138,0.4)";
                      badgeText = "👶 Statutory Maternity"; cardBorder = "rgba(242,107,138,0.35)"; cardBg = "rgba(242,107,138,0.06)";
                    } else if (isPaternity) {
                      badgeColor = "#6BC2F2"; badgeBg = "rgba(107,194,242,0.18)"; badgeBorder = "rgba(107,194,242,0.4)";
                      badgeText = "🍼 Parental Paternity"; cardBorder = "rgba(107,194,242,0.35)"; cardBg = "rgba(107,194,242,0.06)";
                    } else if (isCompOff) {
                      badgeColor = "#F2B84B"; badgeBg = "rgba(242,184,75,0.18)"; badgeBorder = "rgba(242,184,75,0.4)";
                      badgeText = "🔄 Compensatory Off"; cardBorder = "rgba(242,184,75,0.35)"; cardBg = "rgba(242,184,75,0.06)";
                    }

                    return (
                      <div key={req.id} style={{ padding: 12, borderRadius: 4, background: cardBg, border: `1px solid ${cardBorder}`, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#F4F7FB" }}>{req.emp}</div>
                            <div className="mono" style={{ fontSize: 10, color: "#7C93AA" }}>
                              {emp?.dept || "Staff"} · {req.type} ({reqDays} day{reqDays !== 1 ? "s" : ""})
                            </div>
                          </div>
                          <span className="mono" style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 10, background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}` }}>
                            {badgeText}
                          </span>
                        </div>
                        <div className="mono" style={{ fontSize: 10.5, color: "#9FB4C8", background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 3 }}>
                          Dates: <span style={{ color: "#DCE6F2" }}>{req.dates}</span>
                          {isOnDuty && (
                            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                              <div>Purpose: <span style={{ color: "#93C4D4" }}>{req.purpose || "Client Site Visit"}</span></div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                                <span>Leave Impact:</span>
                                <span style={{ color: "#8CE99A", fontWeight: 600 }}>0 Leaves Deducted (100% Paid)</span>
                              </div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span>Travel Allowance:</span>
                                <span style={{ color: "#FFD166", fontWeight: 600 }}>+Rs.{travelAllowanceAmt.toLocaleString("en-IN")} (Auto-Credited)</span>
                              </div>
                            </div>
                          )}
                          {isMaternity && (
                            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                              <div>Documentation: <span style={{ color: "#F26B8A" }}>{req.medicalCertDate || "Medical Cert #MC-9021 Verified"}</span></div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                                <span>Statutory Benefit:</span>
                                <span style={{ color: "#8CE99A", fontWeight: 600 }}>0 Quota Deducted · 100% Fully Paid (84d max)</span>
                              </div>
                            </div>
                          )}
                          {isPaternity && (
                            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span>Parental Policy:</span>
                                <span style={{ color: "#8CE99A", fontWeight: 600 }}>0 Quota Deducted · 100% Fully Paid (10d max)</span>
                              </div>
                            </div>
                          )}
                          {isCompOff && (
                            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                              <div>Shift Worked: <span style={{ color: "#F2B84B" }}>{req.compOffWorkedDate || "Sunday Deployment Verified"}</span></div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                                <span>Comp Credit:</span>
                                <span style={{ color: "#8CE99A", fontWeight: 600 }}>Overtime/Holiday Relief Applied (100% Paid)</span>
                              </div>
                            </div>
                          )}
                          {!isSpecialLeave && (
                            <div style={{ marginTop: 3, display: "flex", gap: 6, alignItems: "center" }}>
                              <span>{req.type} Balance:</span>
                              <span style={{ color: "#7DD3FC", fontWeight: 600 }}>{curBal.toFixed(1)}d</span>
                              <span>→ After Approval:</span>
                              <span style={{ color: newBal > 0 ? "#8CE99A" : "#F26B6B", fontWeight: 600 }}>{newBal.toFixed(1)}d remaining</span>
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button className="btn" disabled={running} onClick={() => handleApproveLeave(req)}
                            style={{ flex: 1, textAlign: "center", borderColor: "#8CE99A", color: "#8CE99A", background: "rgba(140,233,154,0.12)", fontWeight: 600, padding: "6px 10px" }}>
                            {isOnDuty ? `✓ Approve On-Duty (+Rs.${travelAllowanceAmt.toLocaleString("en-IN")})` : (isSpecialLeave ? `✓ Approve ${req.type} (-${reqDays}d)` : `✓ Approve Leave (-${reqDays}d)`)}
                          </button>
                          <button className="btn" disabled={running} onClick={() => handleRejectLeave(req)}
                            style={{ textAlign: "center", borderColor: "rgba(242,107,107,0.4)", color: "#F26B6B", background: "rgba(242,107,107,0.08)", padding: "6px 12px" }}>
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Loan Requests */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid rgba(147,196,212,0.2)" }}>
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "#93C4D4", letterSpacing: "0.06em" }}>
                  💰 LOAN REQUESTS ({pendingLoans.length})
                </span>
              </div>
              {pendingLoans.length === 0 ? (
                <div className="mono" style={{ fontSize: 11, color: "#4A6070", padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: 3, textAlign: "center" }}>
                  — No pending loan requests —
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pendingLoans.map((req) => {
                    const emp = (db.emp_docs || []).find(e => e.name === req.emp);
                    return (
                      <div key={req.id} style={{ padding: 12, borderRadius: 4, background: "rgba(147,196,212,0.04)", border: "1px solid rgba(147,196,212,0.25)", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#F4F7FB" }}>{req.emp}</div>
                            <div className="mono" style={{ fontSize: 10, color: "#7C93AA" }}>{emp?.dept || "Staff"} · {req.type}</div>
                          </div>
                          <span className="mono" style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 10, background: "rgba(242,184,75,0.15)", color: "#F2B84B", border: "1px solid rgba(242,184,75,0.3)" }}>
                            Under Review
                          </span>
                        </div>
                        <div className="mono" style={{ fontSize: 10.5, color: "#9FB4C8", background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 3, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                          <div>Principal: <span style={{ color: "#F4F7FB", fontWeight: 600 }}>{req.amount}</span></div>
                          <div>Rate: <span style={{ color: "#93C4D4" }}>{req.rate}</span> ({req.tenure})</div>
                          <div style={{ gridColumn: "span 2", marginTop: 2, color: "#F2B84B", fontWeight: 600 }}>
                            Monthly EMI: {req.emi} (Payroll Deduction)
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button className="btn" disabled={running} onClick={() => handleApproveLoan(req)}
                            style={{ flex: 1, textAlign: "center", borderColor: "#93C4D4", color: "#93C4D4", background: "rgba(147,196,212,0.12)", fontWeight: 600, padding: "6px 10px" }}>
                            ✓ Approve &amp; Disburse Loan
                          </button>
                          <button className="btn" disabled={running} onClick={() => handleRejectLoan(req)}
                            style={{ textAlign: "center", borderColor: "rgba(242,107,107,0.4)", color: "#F26B6B", background: "rgba(242,107,107,0.08)", padding: "6px 12px" }}>
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 3: Reimbursement Claims */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid rgba(242,107,138,0.25)" }}>
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "#F26B8A", letterSpacing: "0.06em" }}>
                  🧾 EXPENSE REIMBURSEMENT CLAIMS ({pendingClaims.length})
                </span>
              </div>
              {pendingClaims.length === 0 ? (
                <div className="mono" style={{ fontSize: 11, color: "#4A6070", padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: 3, textAlign: "center" }}>
                  — No pending reimbursement claims —
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pendingClaims.map((req) => {
                    const emp = (db.emp_docs || []).find(e => e.name === req.emp);
                    const amt = Number(req.claimAmount) || 1200;
                    return (
                      <div key={req.id} style={{ padding: 12, borderRadius: 4, background: "rgba(242,107,138,0.05)", border: "1px solid rgba(242,107,138,0.3)", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#F4F7FB" }}>{req.emp}</div>
                            <div className="mono" style={{ fontSize: 10, color: "#7C93AA" }}>{emp?.dept || "Staff"} · ESS Claim #{req.id}</div>
                          </div>
                          <span className="mono" style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 10, background: "rgba(242,107,138,0.18)", color: "#F26B8A", border: "1px solid rgba(242,107,138,0.35)" }}>
                            Pending HR
                          </span>
                        </div>
                        <div className="mono" style={{ fontSize: 10.5, color: "#9FB4C8", background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 3, display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Category: <strong style={{ color: "#DCE6F2" }}>{req.claimCategory || "Expense"}</strong></span>
                            <span>Claim: <strong style={{ color: "#8CE99A", fontSize: 12 }}>Rs.{amt.toLocaleString("en-IN")}</strong></span>
                          </div>
                          <div style={{ color: "#FFD166", fontSize: 10 }}>
                            ⚡ On approval: Will auto-credit to Special Allowances &amp; disburse in payroll.
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button className="btn" disabled={running} onClick={() => handleApproveClaim(req)}
                            style={{ flex: 1, textAlign: "center", borderColor: "#8CE99A", color: "#8CE99A", background: "rgba(140,233,154,0.12)", fontWeight: 600, padding: "6px 10px" }}>
                            ✓ Approve &amp; Add to Special Allowances
                          </button>
                          <button className="btn" disabled={running} onClick={() => handleRejectClaim(req)}
                            style={{ textAlign: "center", borderColor: "rgba(242,107,107,0.4)", color: "#F26B6B", background: "rgba(242,107,107,0.08)", padding: "6px 12px" }}>
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 4: Attendance Regularizations */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid rgba(242,184,75,0.25)" }}>
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "#F2B84B", letterSpacing: "0.06em" }}>
                  ⏱️ ATTENDANCE REGULARIZATIONS ({pendingAttendanceCorrections.length})
                </span>
              </div>
              {pendingAttendanceCorrections.length === 0 ? (
                <div className="mono" style={{ fontSize: 11, color: "#4A6070", padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: 3, textAlign: "center" }}>
                  — No pending attendance corrections —
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pendingAttendanceCorrections.map((req) => {
                    const emp = (db.emp_docs || []).find(e => e.name === req.emp);
                    return (
                      <div key={req.id} style={{ padding: 12, borderRadius: 4, background: "rgba(242,184,75,0.05)", border: "1px solid rgba(242,184,75,0.3)", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#F4F7FB" }}>{req.emp}</div>
                            <div className="mono" style={{ fontSize: 10, color: "#7C93AA" }}>{emp?.dept || "Staff"} · ESS Correction #{req.id}</div>
                          </div>
                          <span className="mono" style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 10, background: "rgba(242,184,75,0.18)", color: "#F2B84B", border: "1px solid rgba(242,184,75,0.35)" }}>
                            Pending HR
                          </span>
                        </div>
                        <div className="mono" style={{ fontSize: 10.5, color: "#9FB4C8", background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 3, display: "flex", flexDirection: "column", gap: 3 }}>
                          <div>Date: <strong style={{ color: "#DCE6F2" }}>{req.corrDate}</strong> · Session: <strong style={{ color: "#F2B84B" }}>{req.corrSession}</strong></div>
                          <div>Reason: <span style={{ color: "#7DD3FC" }}>{req.corrReason || "Hardware Glitch / Punch Error"}</span></div>
                          <div style={{ color: "#8CE99A", fontSize: 10, marginTop: 2 }}>
                            ⚡ On approval: Will write verified punch to Attendance &amp; update live attendance sheet.
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button className="btn" disabled={running} onClick={() => handleApproveAttendanceCorrection(req)}
                            style={{ flex: 1, textAlign: "center", borderColor: "#8CE99A", color: "#8CE99A", background: "rgba(140,233,154,0.12)", fontWeight: 600, padding: "6px 10px" }}>
                            ✓ Approve &amp; Update Attendance Sheet
                          </button>
                          <button className="btn" disabled={running} onClick={() => handleRejectAttendanceCorrection(req)}
                            style={{ textAlign: "center", borderColor: "rgba(242,107,107,0.4)", color: "#F26B6B", background: "rgba(242,107,107,0.08)", padding: "6px 12px" }}>
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 5: HR Document Requests */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid rgba(255,209,102,0.25)" }}>
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "#FFD166", letterSpacing: "0.06em" }}>
                  📄 HR DOCUMENT &amp; CERTIFICATE REQUESTS ({pendingDocRequests.length})
                </span>
              </div>
              {pendingDocRequests.length === 0 ? (
                <div className="mono" style={{ fontSize: 11, color: "#4A6070", padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: 3, textAlign: "center" }}>
                  — No pending document requests —
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pendingDocRequests.map((req) => {
                    const emp = (db.emp_docs || []).find(e => e.name === req.emp);
                    return (
                      <div key={req.id} style={{ padding: 12, borderRadius: 4, background: "rgba(255,209,102,0.05)", border: "1px solid rgba(255,209,102,0.3)", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#F4F7FB" }}>{req.emp}</div>
                            <div className="mono" style={{ fontSize: 10, color: "#7C93AA" }}>{emp?.dept || "Staff"} · ESS Doc #{req.id}</div>
                          </div>
                          <span className="mono" style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 10, background: "rgba(255,209,102,0.18)", color: "#FFD166", border: "1px solid rgba(255,209,102,0.35)" }}>
                            Pending HR
                          </span>
                        </div>
                        <div className="mono" style={{ fontSize: 10.5, color: "#9FB4C8", background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 3, display: "flex", flexDirection: "column", gap: 3 }}>
                          <div>Document Title: <strong style={{ color: "#FFD166" }}>{req.docType || "Official HR Certificate"}</strong></div>
                          {req.docPurpose && <div>Purpose: <span style={{ color: "#DCE6F2" }}>{req.docPurpose}</span></div>}
                          <div style={{ color: "#8CE99A", fontSize: 10, marginTop: 2 }}>
                            ⚡ On approval: Official digitally authorized certificate with QR code and seal is issued to employee.
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button className="btn" disabled={running} onClick={() => handleApproveDocRequest(req)}
                            style={{ flex: 1, textAlign: "center", borderColor: "#FFD166", color: "#FFD166", background: "rgba(255,209,102,0.12)", fontWeight: 600, padding: "6px 10px" }}>
                            ✓ Authorize &amp; Issue Certificate
                          </button>
                          <button className="btn" disabled={running} onClick={() => handleRejectDocRequest(req)}
                            style={{ textAlign: "center", borderColor: "rgba(242,107,107,0.4)", color: "#F26B6B", background: "rgba(242,107,107,0.08)", padding: "6px 12px" }}>
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 6: Profile Modification Requests */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid rgba(79,209,197,0.25)" }}>
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "#4FD1C5", letterSpacing: "0.06em" }}>
                  👤 PROFILE MODIFICATION REQUESTS ({pendingProfileUpdates.length})
                </span>
              </div>
              {pendingProfileUpdates.length === 0 ? (
                <div className="mono" style={{ fontSize: 11, color: "#4A6070", padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: 3, textAlign: "center" }}>
                  — No pending profile updates —
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pendingProfileUpdates.map((req) => {
                    const emp = (db.emp_docs || []).find(e => e.name === req.emp);
                    return (
                      <div key={req.id} style={{ padding: 12, borderRadius: 4, background: "rgba(79,209,197,0.05)", border: "1px solid rgba(79,209,197,0.28)", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#F4F7FB" }}>{req.emp}</div>
                            <div className="mono" style={{ fontSize: 10, color: "#7C93AA" }}>{emp?.dept || "Staff"} · ESS #{req.id}</div>
                          </div>
                          <span className="mono" style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 10, background: "rgba(79,209,197,0.18)", color: "#4FD1C5", border: "1px solid rgba(79,209,197,0.35)" }}>
                            Pending HR
                          </span>
                        </div>
                        <div className="mono" style={{ fontSize: 10.5, color: "#9FB4C8", background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 3, display: "flex", flexDirection: "column", gap: 3 }}>
                          <div>Field to Modify: <strong style={{ color: "#4FD1C5" }}>{req.profileField || "Profile Record"}</strong></div>
                          <div>New Requested Value: <span style={{ color: "#DCE6F2", fontWeight: 600 }}>{req.profileValue || req.details}</span></div>
                          <div style={{ color: "#8CE99A", fontSize: 10, marginTop: 2 }}>
                            ⚡ On approval: Will update employee master record in emp_docs &amp; notify employee.
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button className="btn" disabled={running} onClick={() => handleApproveProfileUpdate(req)}
                            style={{ flex: 1, textAlign: "center", borderColor: "#4FD1C5", color: "#4FD1C5", background: "rgba(79,209,197,0.12)", fontWeight: 600, padding: "6px 10px" }}>
                            ✓ Approve &amp; Update Master Record
                          </button>
                          <button className="btn" disabled={running} onClick={() => handleRejectProfileUpdate(req)}
                            style={{ textAlign: "center", borderColor: "rgba(242,107,107,0.4)", color: "#F26B6B", background: "rgba(242,107,107,0.08)", padding: "6px 12px" }}>
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 7: HR & IT Helpdesk Tickets */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid rgba(147,196,212,0.25)" }}>
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "#93C4D4", letterSpacing: "0.06em" }}>
                  🎫 HR &amp; IT HELPDESK TICKETS ({pendingTickets.length})
                </span>
              </div>
              {pendingTickets.length === 0 ? (
                <div className="mono" style={{ fontSize: 11, color: "#4A6070", padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: 3, textAlign: "center" }}>
                  — No pending support tickets —
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pendingTickets.map((req) => {
                    const emp = (db.emp_docs || []).find(e => e.name === req.emp);
                    const prioColor = req.ticketPriority === "Critical" ? "#EF4444" : (req.ticketPriority === "High" ? "#F2946B" : "#FFD166");
                    const prioBg = req.ticketPriority === "Critical" ? "rgba(239,68,68,0.18)" : (req.ticketPriority === "High" ? "rgba(242,148,107,0.18)" : "rgba(255,209,102,0.18)");
                    return (
                      <div key={req.id} style={{ padding: 12, borderRadius: 4, background: "rgba(147,196,212,0.05)", border: "1px solid rgba(147,196,212,0.28)", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#F4F7FB" }}>{req.emp}</div>
                            <div className="mono" style={{ fontSize: 10, color: "#7C93AA" }}>{emp?.dept || "Staff"} · Ticket #{req.id}</div>
                          </div>
                          <span className="mono" style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 10, background: prioBg, color: prioColor, border: `1px solid ${prioColor}44` }}>
                            {req.ticketPriority || "Standard"} Priority
                          </span>
                        </div>
                        <div className="mono" style={{ fontSize: 10.5, color: "#9FB4C8", background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 3, display: "flex", flexDirection: "column", gap: 3 }}>
                          <div>Category: <strong style={{ color: "#93C4D4" }}>{req.ticketCategory || "General IT / HR Support"}</strong></div>
                          <div>Subject: <span style={{ color: "#DCE6F2", fontWeight: 600 }}>{req.ticketSubject || req.details}</span></div>
                          {req.ticketDescription && (
                            <div style={{ fontSize: 9.5, color: "#7C93AA", marginTop: 2, fontStyle: "italic" }}>
                              "{req.ticketDescription}"
                            </div>
                          )}
                          <div style={{ color: "#8CE99A", fontSize: 10, marginTop: 2 }}>
                            ⚡ Resolution action: Dispatches technician or HR resolution protocol.
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button className="btn" disabled={running} onClick={() => handleResolveTicket(req)}
                            style={{ flex: 1, textAlign: "center", borderColor: "#8CE99A", color: "#8CE99A", background: "rgba(140,233,154,0.12)", fontWeight: 600, padding: "6px 10px" }}>
                            ✓ Resolve &amp; Close Ticket
                          </button>
                          {!req.status?.includes("Escalated") ? (
                            <button className="btn" disabled={running} onClick={() => handleEscalateTicket(req)}
                              style={{ textAlign: "center", borderColor: "rgba(242,148,107,0.4)", color: "#F2946B", background: "rgba(242,148,107,0.08)", padding: "6px 12px" }}>
                              ⚠️ Escalate
                            </button>
                          ) : (
                            <div className="mono" style={{ display: "flex", alignItems: "center", fontSize: 9.5, padding: "4px 8px", background: "rgba(242,148,107,0.14)", border: "1px solid rgba(242,148,107,0.35)", borderRadius: 3, color: "#F2946B" }}>
                              ⚠️ Escalated to Tier-2
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button className="btn" onClick={() => setShowNotifications(false)}
              style={{ width: "100%", textAlign: "center", marginTop: 10, borderColor: "rgba(255,255,255,0.15)", color: "#7C93AA" }}>
              Close Center
            </button>
          </div>
        </div>
      )}

      {/* ── Full & Final Settlement & No-Dues Clearance Statement Modal ── */}
      {ffStatement && (
        <div id="ff-print-backdrop" style={{
          position: "fixed", inset: 0, background: "rgba(4,8,14,0.85)",
          backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 75, padding: 16
        }}>
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm 14mm;
              }
              body * {
                visibility: hidden !important;
              }
              #ff-print-container,
              #ff-print-container * {
                visibility: visible !important;
              }
              #ff-print-backdrop {
                position: static !important;
                background: none !important;
                backdrop-filter: none !important;
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
                inset: auto !important;
              }
              #ff-print-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                max-height: none !important;
                overflow: visible !important;
                background: #ffffff !important;
                color: #0f172a !important;
                border: 1.5px solid #0f172a !important;
                border-radius: 4px !important;
                padding: 24px 28px !important;
                box-shadow: none !important;
              }
              .no-print {
                display: none !important;
              }
              #ff-print-container div,
              #ff-print-container span {
                color: #0f172a !important;
              }
              #ff-print-container .print-border-box {
                background: #f8fafc !important;
                border: 1px solid #cbd5e1 !important;
              }
              #ff-print-container .print-net-banner {
                background: #f1f5f9 !important;
                border: 2px solid #0f172a !important;
              }
              #ff-print-container .print-net-banner * {
                color: #0f172a !important;
              }
            }
          `}</style>
          <div id="ff-print-container" style={{
            width: 620, maxHeight: "92vh", overflowY: "auto",
            background: "#0D1420", border: "1px solid rgba(140,233,154,0.4)",
            borderRadius: 6, padding: "24px 28px", boxShadow: "0 25px 60px rgba(0,0,0,0.85)"
          }} className="scrollbar-thin">

            {/* Top Bar with Print/Copy/Close */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div className="mono" style={{ fontSize: 9.5, color: "#8CE99A", letterSpacing: "0.12em", fontWeight: 700 }}>
                  ENTERPRISE HR DIGITAL TWIN · DEPROVISIONING &amp; DISBURSEMENT
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, color: "#F4F7FB", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                  <Shield size={20} color="#8CE99A" />
                  Full &amp; Final Settlement &amp; No-Dues Clearance
                </div>
              </div>
              <X className="no-print" size={18} style={{ cursor: "pointer", color: "#7C93AA" }} onClick={() => setFfStatement(null)} />
            </div>

            {/* Employee Banner */}
            <div className="print-border-box" style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 14px", background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, marginBottom: 16
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#F4F7FB" }}>{ffStatement.emp.name}</div>
                <div className="mono" style={{ fontSize: 10.5, color: "#7C93AA", marginTop: 2 }}>
                  {ffStatement.emp.designation} · {ffStatement.emp.dept} · {ffStatement.emp.id}
                </div>
              </div>
              <div style={{ textAlign: "right" }} className="mono">
                <div style={{ fontSize: 10.5, color: "#F26B6B", fontWeight: 700 }}>
                  Reason: {ffStatement.exitReason}
                </div>
                <div style={{ fontSize: 9.5, color: "#7C93AA", marginTop: 2 }}>
                  Exit Date: {ffStatement.exitDate} · Daily Rate: Rs.{ffStatement.dailyRate.toLocaleString("en-IN")}/d
                </div>
              </div>
            </div>

            {/* Section A: No-Dues Departmental Clearance */}
            <div style={{ marginBottom: 16 }}>
              <div className="mono" style={{ fontSize: 10, color: "#7DD3FC", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 700 }}>
                1. DEPARTMENTAL NO-DUES &amp; SYSTEM RECOVERY
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div className="print-border-box" style={{ padding: "8px 10px", background: "rgba(125,211,252,0.05)", border: "1px solid rgba(125,211,252,0.2)", borderRadius: 3 }}>
                  <div className="mono" style={{ fontSize: 9.5, color: "#7DD3FC", display: "flex", alignItems: "center", gap: 5 }}>
                    <CheckCircle2 size={12} color="#7DD3FC" /> BIOMETRIC &amp; ACCESS
                  </div>
                  <div style={{ fontSize: 11, color: "#F4F7FB", marginTop: 4, fontWeight: 500 }}>
                    Profile Locked · Revoked
                  </div>
                </div>

                <div className="print-border-box" style={{ padding: "8px 10px", background: "rgba(242,148,107,0.05)", border: "1px solid rgba(242,148,107,0.25)", borderRadius: 3 }}>
                  <div className="mono" style={{ fontSize: 9.5, color: "#F2946B", display: "flex", alignItems: "center", gap: 5 }}>
                    <CheckCircle2 size={12} color="#F2946B" /> HARDWARE &amp; ASSETS POOL
                  </div>
                  <div style={{ fontSize: 11, color: "#F4F7FB", marginTop: 4, fontWeight: 500 }}>
                    {ffStatement.empAssetsRecovered.length > 0 ? `${ffStatement.empAssetsRecovered.length} Returned to Pool` : "No Assets Allocated"}
                  </div>
                </div>

                <div className="print-border-box" style={{ padding: "8px 10px", background: "rgba(147,196,212,0.05)", border: "1px solid rgba(147,196,212,0.25)", borderRadius: 3 }}>
                  <div className="mono" style={{ fontSize: 9.5, color: "#93C4D4", display: "flex", alignItems: "center", gap: 5 }}>
                    <CheckCircle2 size={12} color="#93C4D4" /> LOANS &amp; LIABILITIES
                  </div>
                  <div style={{ fontSize: 11, color: "#F4F7FB", marginTop: 4, fontWeight: 500 }}>
                    {ffStatement.totalLoanBalance > 0
                      ? (ffStatement.loanDeficit > 0
                        ? `Rs.${ffStatement.actualLoanRecovered.toLocaleString("en-IN")} Recovered (Rs.${ffStatement.loanDeficit.toLocaleString("en-IN")} Deficit Due)`
                        : `Rs.${ffStatement.totalLoanBalance.toLocaleString("en-IN")} Cleared via F&F`)
                      : "Zero Loan Liabilities"}
                  </div>
                </div>

                <div className="print-border-box" style={{ padding: "8px 10px", background: "rgba(216,166,242,0.05)", border: "1px solid rgba(216,166,242,0.25)", borderRadius: 3 }}>
                  <div className="mono" style={{ fontSize: 9.5, color: "#D8A6F2", display: "flex", alignItems: "center", gap: 5 }}>
                    <CheckCircle2 size={12} color="#D8A6F2" /> LEAVE &amp; ESS REQUESTS
                  </div>
                  <div style={{ fontSize: 11, color: "#F4F7FB", marginTop: 4, fontWeight: 500 }}>
                    Pending Requests Voided
                  </div>
                </div>
              </div>
            </div>

            {/* Section B: Financial Settlement Breakdown */}
            <div style={{ marginBottom: 16 }}>
              <div className="mono" style={{ fontSize: 10, color: "#FFD166", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 700 }}>
                2. FINANCIAL SETTLEMENT BREAKDOWN (AUDITED)
              </div>
              <div className="print-border-box mono" style={{
                background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 4, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                  <span style={{ color: "#7C93AA" }}>(+) Prorated Earned Wage ({ffStatement.exitDay} working days{ffStatement.exitDay === 0 ? " · Already disbursed in regular payroll" : (ffStatement.weekendDays ? ` · ${ffStatement.weekendDays} weekends excluded` : "")}):</span>
                  <span style={{ color: "#DCE6F2", fontWeight: 600 }}>+Rs.{ffStatement.earnedWage.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                  <span style={{ color: "#7C93AA" }}>(+) Leave Encashment ({ffStatement.alBalance.toFixed(1)}d unused Annual Leave):</span>
                  <span style={{ color: "#8CE99A", fontWeight: 600 }}>+Rs.{ffStatement.leaveEncashment.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 4 }}>
                  <span style={{ color: "#9FB4C8" }}>Gross Accrued Settlement:</span>
                  <span style={{ color: "#F4F7FB", fontWeight: 700 }}>Rs.{ffStatement.grossSettlement.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                  <span style={{ color: "#7C93AA" }}>(-) Statutory Deductions (12% PF: Rs.{ffStatement.pf.toLocaleString("en-IN")} · 7% TDS: Rs.{ffStatement.tds.toLocaleString("en-IN")}):</span>
                  <span style={{ color: "#F26B6B", fontWeight: 600 }}>-Rs.{ffStatement.statutoryDeductions.toLocaleString("en-IN")}</span>
                </div>
                {ffStatement.totalLoanBalance > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                      <span style={{ color: "#7C93AA" }}>(-) Loan Principal Deducted via F&F:</span>
                      <span style={{ color: "#F26B6B", fontWeight: 600 }}>-Rs.{ffStatement.actualLoanRecovered.toLocaleString("en-IN")}</span>
                    </div>
                    {ffStatement.loanDeficit > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, background: "rgba(242,107,107,0.1)", padding: "2px 6px", borderRadius: 3 }}>
                        <span style={{ color: "#F26B6B", fontWeight: 600 }}>⚠️ Unpaid Loan Deficit Due from Employee:</span>
                        <span style={{ color: "#F26B6B", fontWeight: 700 }}>Rs.{ffStatement.loanDeficit.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Net Payout Banner */}
                <div className="print-net-banner" style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginTop: 6, paddingTop: 8, borderTop: "1px solid rgba(140,233,154,0.3)",
                  background: "rgba(140,233,154,0.08)", padding: "10px 12px", borderRadius: 4
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#8CE99A" }}>NET SETTLEMENT DISBURSABLE</div>
                    <div style={{ fontSize: 9.5, color: "#7C93AA" }}>Status: Cleared for final bank transfer &amp; archived</div>
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: "#8CE99A" }}>
                    Rs. {ffStatement.netSettlement.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer / System Verification Badge */}
            <div className="print-border-box mono" style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)", borderRadius: 3, marginBottom: 14
            }}>
              <div style={{ fontSize: 9.5, color: "#5C7891" }}>
                <div>Clearance Reference: <span style={{ color: "#9FB4C8" }}>{ffStatement.refId}</span></div>
                <div>Timestamp: <span style={{ color: "#9FB4C8" }}>{ffStatement.generatedAt}</span> · Master DB Record: <span style={{ color: "#8CE99A" }}>payroll_records (PR)</span></div>
              </div>
              <div style={{
                fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 2,
                background: "rgba(140,233,154,0.15)", color: "#8CE99A", border: "1px solid rgba(140,233,154,0.35)"
              }}>
                ✓ OFFICIALLY SETTLED
              </div>
            </div>

            {/* Modal action buttons */}
            <div className="no-print" style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => window.print()}
                className="btn mono"
                style={{
                  flex: 1, padding: "10px 18px", background: "rgba(125,211,252,0.12)",
                  border: "1px solid rgba(125,211,252,0.4)", color: "#7DD3FC", fontWeight: 600,
                  textAlign: "center", borderRadius: 4, cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center", gap: 6
                }}>
                🖨️ Print / Save Statement
              </button>
              <button
                onClick={() => setFfStatement(null)}
                className="btn mono"
                style={{
                  flex: 1, padding: "10px 18px", background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.18)", color: "#DCE6F2", fontWeight: 600,
                  textAlign: "center", borderRadius: 4, cursor: "pointer"
                }}>
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

