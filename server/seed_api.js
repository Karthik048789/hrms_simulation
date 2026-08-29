const INITIAL_MODULES = [
  { id: "emp_docs", name: "Employee & Docs", layer: 0, table_name: "employee_records", active: true, is_custom: false },
  { id: "attendance_leave", name: "Attendance & Leave", layer: 1, table_name: "attendance_leave", active: true, is_custom: false },
  { id: "performance", name: "Performance & Appraisal", layer: 1, table_name: "performance_cycles", active: true, is_custom: false },
  { id: "assets", name: "Asset Management", layer: 1, table_name: "company_assets", active: true, is_custom: false },
  { id: "loans", name: "Loan Management", layer: 1, table_name: "employee_loans", active: true, is_custom: false },
  { id: "awards", name: "Excellence Awards", layer: 1, table_name: "excellence_awards", active: true, is_custom: false },
  { id: "payroll", name: "Payroll & Statutory", layer: 2, table_name: "payroll_records", active: true, is_custom: false },
  { id: "special_allowances", name: "Special Allowances", layer: 2, table_name: "special_allowances", active: true, is_custom: false },
  { id: "ess", name: "Self-Service (ESS)", layer: 3, table_name: "ess_requests", active: true, is_custom: false },
];

async function seedApi() {
  for (const m of INITIAL_MODULES) {
    try {
      const res = await fetch('http://localhost:3000/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m)
      });
      if (res.ok) {
        console.log(`Inserted ${m.id}`);
      } else {
        console.error(`Failed to insert ${m.id}:`, await res.text());
      }
    } catch (e) {
      console.error(`Fetch error for ${m.id}:`, e);
    }
  }
}

seedApi();
