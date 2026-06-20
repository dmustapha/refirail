// File: tests/api-matrix.mjs  (T2 — run against `next dev` on :3000: `node tests/api-matrix.mjs`)
// Hammers all 4 API routes with valid + a full malformed/malicious matrix. ASSERTS:
//   - no 500s anywhere (validation must be defensive, not crash)
//   - malformed input → clean 400 (or 405 wrong-method); valid → 200
//   - no reflection of injected XSS/SQLi strings in responses
const BASE = process.env.BASE ?? "http://localhost:3000";
const ADDR = "0xc98eeaca815f354aaf65df4250d928bfc2fc089507dc005d5ad26ed36ed393b3";
const XSS = "<script>alert(1)</script>";
const SQLI = "0x' OR 1=1--";

let pass = 0, fail = 0;
const fails = [];
function check(name, cond, detail = "") {
  if (cond) { pass++; } else { fail++; fails.push(`${name} ${detail}`); console.log(`  ✗ ${name} ${detail}`); }
}

async function hit(method, path, body) {
  const opt = { method, headers: {} };
  if (body !== undefined) { opt.headers["content-type"] = "application/json"; opt.body = typeof body === "string" ? body : JSON.stringify(body); }
  const r = await fetch(BASE + path, opt);
  let text = ""; try { text = await r.text(); } catch {}
  return { status: r.status, text };
}
const noReflect = (t) => !t.includes("<script>") && !t.includes("OR 1=1");

async function main() {
  console.log(`T2 API matrix → ${BASE}\n`);

  // ---- GET /api/position ----
  console.log("/api/position (GET)");
  let r = await hit("GET", `/api/position?address=${ADDR}`);
  check("position valid", r.status === 200, `(${r.status})`);
  for (const [label, addr] of [["missing", null], ["empty", ""], ["non-hex", "0xZZZ"], ["short", "0x1234"], ["xss", XSS], ["sqli", SQLI]]) {
    r = await hit("GET", `/api/position${addr === null ? "" : `?address=${encodeURIComponent(addr)}`}`);
    check(`position ${label}`, r.status === 400, `→ ${r.status}`);
    check(`position ${label} no-reflect`, noReflect(r.text));
    check(`position ${label} no-500`, r.status !== 500);
  }

  // ---- POST /api/preview ----
  console.log("/api/preview (POST)");
  r = await hit("POST", "/api/preview", { address: ADDR, debtAtomic: "2000000", collateralAtomic: "6000000000" });
  check("preview valid", r.status === 200, `(${r.status})`);
  const previewBad = [
    ["missing-address", { debtAtomic: "1", collateralAtomic: "1" }],
    ["invalid-address", { address: "0xbeef", debtAtomic: "1", collateralAtomic: "1" }],
    ["xss-address", { address: XSS, debtAtomic: "1", collateralAtomic: "1" }],
    ["missing-amounts", { address: ADDR }],
    ["non-numeric-atomic", { address: ADDR, debtAtomic: "abc", collateralAtomic: "1" }],
    ["negative-atomic", { address: ADDR, debtAtomic: "-5", collateralAtomic: "1000" }],
    ["zero-atomic", { address: ADDR, debtAtomic: "0", collateralAtomic: "0" }],
    ["oversize-u64", { address: ADDR, debtAtomic: "99999999999999999999999999", collateralAtomic: "1000" }],
  ];
  for (const [label, body] of previewBad) {
    r = await hit("POST", "/api/preview", body);
    check(`preview ${label}`, r.status === 400, `→ ${r.status}`);
    check(`preview ${label} no-500`, r.status !== 500);
    check(`preview ${label} no-reflect`, noReflect(r.text));
  }
  r = await hit("POST", "/api/preview", "{not json");
  check("preview malformed-json", r.status === 400, `→ ${r.status}`);
  r = await hit("GET", "/api/preview");
  check("preview wrong-method", r.status === 405 || r.status === 404, `→ ${r.status}`);

  // ---- POST /api/deleverage ----
  console.log("/api/deleverage (POST)");
  r = await hit("POST", "/api/deleverage", { address: ADDR, fraction: 0.5 });
  check("deleverage valid", r.status === 200, `(${r.status})`);
  check("deleverage valid no-500", r.status !== 500);
  const delBad = [
    ["missing-address", { fraction: 0.5 }],
    ["invalid-address", { address: "0xbeef", fraction: 0.5 }],
    ["xss-address", { address: XSS, fraction: 0.5 }],
    ["fraction-0", { address: ADDR, fraction: 0 }],
    ["fraction-neg", { address: ADDR, fraction: -0.3 }],
    ["fraction->0.9", { address: ADDR, fraction: 1.5 }],
    ["fraction-NaN", { address: ADDR, fraction: "abc" }],
    ["fraction-missing", { address: ADDR }],
  ];
  for (const [label, body] of delBad) {
    r = await hit("POST", "/api/deleverage", body);
    check(`deleverage ${label}`, r.status === 400, `→ ${r.status}`);
    check(`deleverage ${label} no-500`, r.status !== 500);
    check(`deleverage ${label} no-reflect`, noReflect(r.text));
  }
  r = await hit("POST", "/api/deleverage", "{bad");
  check("deleverage malformed-json", r.status === 400, `→ ${r.status}`);

  // ---- GET /api/deepbook ----
  console.log("/api/deepbook (GET)");
  r = await hit("GET", "/api/deepbook");
  check("deepbook valid", r.status === 200, `(${r.status})`);
  check("deepbook no-500", r.status !== 500);
  try { const j = JSON.parse(r.text); check("deepbook has mid", typeof j.midSuiUsdc === "number" && j.midSuiUsdc > 0); } catch { check("deepbook json", false); }

  console.log(`\nT2 RESULT: ${pass} passed, ${fail} failed`);
  if (fail) { console.log("FAILURES:\n - " + fails.join("\n - ")); process.exit(1); }
  console.log("All API matrix checks passed (no 500s, clean 400s, no reflection).");
}
main().catch((e) => { console.error("matrix runner error:", e); process.exit(1); });
