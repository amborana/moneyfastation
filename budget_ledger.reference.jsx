import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import {
  LayoutGrid, PlusCircle, Wallet, History as HistoryIcon, Target,
  Trash2, Pencil, X, Check, ChevronLeft, ChevronRight, ChevronDown, Users,
  AlertTriangle, TrendingUp, CreditCard, Gift, Download, Upload,
} from "lucide-react";

/* ---------------------------------------------------------------
   Design tokens — pale sage stone bg, white cards, deep pine-teal
   accent, muted ochre for flags. Fraunces for display, IBM Plex
   Mono for every number (ledger feel).
----------------------------------------------------------------*/
const COLORS = {
  bg: "#EEF1EC", card: "#FFFFFF", ink: "#1B2420", sub: "#6B7570",
  line: "#DCE3DC", accent: "#1F5F5B", accentSoft: "#DCEAE8",
  flag: "#B5622B", flagSoft: "#F3E1D2",
};
const PALETTE = ["#1F5F5B", "#B5622B", "#6E5A9C", "#3F7CAC", "#8C8B4E",
  "#A24E5C", "#4E8C6F", "#C79A3E", "#5C6E9C", "#946E4E", "#5C9C8C", "#9C5C7C"];
const colorFor = (id) => {
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

const slug = (name) => name.toLowerCase().replace(/\s+/g, "-");
const DEFAULT_CATEGORIES = [
  { name: "Rent", period: "monthly" },
  { name: "Groceries", period: "monthly" },
  { name: "Eating Out", period: "monthly" },
  { name: "Gifting", period: "yearly" },
  { name: "Festivals", period: "yearly" },
  { name: "Home Travel", period: "yearly" },
  { name: "Travel", period: "yearly" },
  { name: "Weekends", period: "monthly" },
  { name: "Investments", period: "monthly" },
  { name: "Shopping", period: "monthly" },
  { name: "Health", period: "monthly" },
].map(({ name, period }) => ({ id: slug(name), name, period, subcategories: [] }));

const PAYMENT_METHODS = ["UPI", "Cash", "Card", "Credit Card"];

const thisMonth = () => new Date().toISOString().slice(0, 7);
const monthLabel = (m) => {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};
const shortMonthLabel = (m) => {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "short" });
};
const lastNMonths = (n) => {
  const arr = [];
  const base = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    arr.push(d.toISOString().slice(0, 7));
  }
  return arr;
};
const inr = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad2 = (n) => String(n).padStart(2, "0");

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;

/* ---------------- Reusable comma-formatted money input ---------------- */
function MoneyInput({ value, onChange, placeholder, style }) {
  const [text, setText] = useState(value === "" || value === undefined || value === null ? "" : Number(value).toLocaleString("en-IN"));
  useEffect(() => {
    setText(value === "" || value === undefined || value === null ? "" : Number(value).toLocaleString("en-IN"));
  }, [value]);
  const handle = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setText(raw === "" ? "" : Number(raw).toLocaleString("en-IN"));
    onChange(raw === "" ? "" : Number(raw));
  };
  return <input inputMode="numeric" className="mono" value={text} onChange={handle} placeholder={placeholder} style={style || inputStyleBase} />;
}
const inputStyleBase = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 7, border: `1px solid ${COLORS.line}`, fontSize: 13.5 };

export default function BudgetLedger() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [userNames, setUserNames] = useState(["Aashish", "Vashnika"]);
  const [activeUser, setActiveUser] = useState("Aashish");
  const [planned, setPlanned] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [recurring, setRecurring] = useState([]); // [{id, label, catId, amount, autoAdd, day}]
  const [creditCardBills, setCreditCardBills] = useState([]); // [{id, cardName, amount, dueDate, paid, by}]
  const [baseIncome, setBaseIncome] = useState({}); // {name: amount}
  const recurringRef = useRef([]);
  const baseIncomeRef = useRef({});
  useEffect(() => { recurringRef.current = recurring; }, [recurring]);
  useEffect(() => { baseIncomeRef.current = baseIncome; }, [baseIncome]);

  const [month, setMonth] = useState(thisMonth());
  const [monthCache, setMonthCache] = useState({});
  const [yearCache, setYearCache] = useState({});
  const [availableMonths, setAvailableMonths] = useState([]);
  const [error, setError] = useState("");

  const emptyMonthData = () => ({ incomeByUser: {}, catBudgets: {}, expenses: [], otherIncome: [] });

  const loadMonth = useCallback(async (m) => {
    let incomeByUser = {}, catBudgets = {}, expenses = [], otherIncome = [];
    let budgetExisted = false;
    try {
      const b = await window.storage.get(`budget:${m}`, true);
      if (b?.value) { budgetExisted = true; const parsed = JSON.parse(b.value); incomeByUser = parsed.incomeByUser || {}; catBudgets = parsed.catBudgets || {}; }
    } catch (e) { /* no budget yet */ }
    try {
      const ex = await window.storage.get(`expenses:${m}`, true);
      if (ex?.value) expenses = JSON.parse(ex.value);
    } catch (e) { /* no expenses yet */ }
    try {
      const oi = await window.storage.get(`other-income:${m}`, true);
      if (oi?.value) otherIncome = JSON.parse(oi.value);
    } catch (e) { /* none yet */ }

    const recurringList = recurringRef.current || [];
    if (!budgetExisted) {
      if (Object.keys(baseIncomeRef.current || {}).length > 0) incomeByUser = { ...baseIncomeRef.current };
      recurringList.forEach((r) => { if (catBudgets[r.catId] === undefined) catBudgets[r.catId] = r.amount; });
      try { await window.storage.set(`budget:${m}`, JSON.stringify({ incomeByUser, catBudgets }), true); } catch (e) { /* best effort */ }
    }
    const already = new Set(expenses.filter((e) => e.recurringId).map((e) => e.recurringId));
    const toAdd = recurringList.filter((r) => r.autoAdd && !already.has(r.id));
    if (toAdd.length > 0) {
      const added = toAdd.map((r) => ({ id: uid(), catId: r.catId, amount: r.amount, date: `${m}-${pad2(r.day || 1)}`, note: r.label || "Recurring", by: "Auto", paymentMethod: r.paymentMethod || "", recurringId: r.id }));
      expenses = [...expenses, ...added];
      try { await window.storage.set(`expenses:${m}`, JSON.stringify(expenses), true); } catch (e) { /* best effort */ }
    }

    const data = { incomeByUser, catBudgets, expenses, otherIncome };
    setMonthCache((prev) => ({ ...prev, [m]: data }));
    return data;
  }, []);

  const loadYearData = useCallback(async (year) => {
    const spentByCat = {};
    for (let mo = 1; mo <= 12; mo++) {
      const key = `expenses:${year}-${pad2(mo)}`;
      try {
        const ex = await window.storage.get(key, true);
        if (ex?.value) JSON.parse(ex.value).forEach((e) => { spentByCat[e.catId] = (spentByCat[e.catId] || 0) + Number(e.amount); });
      } catch (e) { /* no data that month */ }
    }
    let catBudgets = {};
    try {
      const yb = await window.storage.get(`yearly-budget:${year}`, true);
      if (yb?.value) catBudgets = JSON.parse(yb.value);
    } catch (e) { /* none yet */ }
    setYearCache((prev) => ({ ...prev, [year]: { spentByCat, catBudgets } }));
  }, []);

  const refreshAvailableMonths = useCallback(async () => {
    try {
      const res = await window.storage.list("expenses:", true);
      const res2 = await window.storage.list("budget:", true);
      const months = new Set([thisMonth()]);
      (res?.keys || []).forEach((k) => months.add(k.replace("expenses:", "")));
      (res2?.keys || []).forEach((k) => months.add(k.replace("budget:", "")));
      setAvailableMonths(Array.from(months).sort().reverse());
    } catch (e) { setAvailableMonths([thisMonth()]); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cats = await window.storage.get("categories", true);
        if (cats?.value) {
          const parsed = JSON.parse(cats.value).map((c) => ({ ...c, period: c.period || "monthly", subcategories: c.subcategories || [] }));
          setCategories(parsed);
        } else {
          await window.storage.set("categories", JSON.stringify(DEFAULT_CATEGORIES), true);
        }
      } catch (e) { /* first run */ }
      try {
        const names = await window.storage.get("user-names", true);
        if (names?.value) setUserNames(JSON.parse(names.value));
      } catch (e) { /* first run */ }
      try {
        const pl = await window.storage.get("planned", true);
        if (pl?.value) setPlanned(JSON.parse(pl.value));
      } catch (e) { /* first run */ }
      try {
        const inv = await window.storage.get("investments", true);
        if (inv?.value) setInvestments(JSON.parse(inv.value));
      } catch (e) { /* first run */ }
      try {
        const rec = await window.storage.get("recurring", true);
        if (rec?.value) {
          const parsed = JSON.parse(rec.value).map((r) => ({ ...r, day: r.day || 1 }));
          recurringRef.current = parsed; setRecurring(parsed);
        }
      } catch (e) { /* first run */ }
      try {
        const bi = await window.storage.get("base-income", true);
        if (bi?.value) { const parsed = JSON.parse(bi.value); baseIncomeRef.current = parsed; setBaseIncome(parsed); }
      } catch (e) { /* first run */ }
      try {
        const cc = await window.storage.get("credit-card-bills", true);
        if (cc?.value) setCreditCardBills(JSON.parse(cc.value));
      } catch (e) { /* first run */ }
      try {
        const au = await window.storage.get("active-user", false);
        if (au?.value) setActiveUser(au.value);
      } catch (e) { /* first run */ }
      await loadMonth(thisMonth());
      await refreshAvailableMonths();
      setReady(true);
    })();
  }, [loadMonth, refreshAvailableMonths]);

  useEffect(() => { if (ready && !monthCache[month]) loadMonth(month); }, [month, ready, monthCache, loadMonth]);

  useEffect(() => {
    const year = month.slice(0, 4);
    const hasYearly = categories.some((c) => c.period === "yearly");
    if (ready && hasYearly && !yearCache[year]) loadYearData(year);
  }, [month, ready, categories, yearCache, loadYearData]);

  // Prefetch the last 6 months (only ones with real data) for trend charts
  useEffect(() => {
    if (!ready) return;
    lastNMonths(6).forEach((m) => { if (availableMonths.includes(m) && !monthCache[m]) loadMonth(m); });
  }, [ready, availableMonths]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = async (key, value, shared, setErr = true) => {
    try {
      const r = await window.storage.set(key, typeof value === "string" ? value : JSON.stringify(value), shared);
      if (!r) throw new Error("no result");
      return true;
    } catch (e) {
      if (setErr) { setError("Couldn't save — check your connection and try again."); setTimeout(() => setError(""), 4000); }
      return false;
    }
  };

  const saveCategories = async (next) => { setCategories(next); await persist("categories", next, true); };
  const switchUser = async (name) => { setActiveUser(name); await persist("active-user", name, false, false); };
  const saveUserNames = async (names) => { setUserNames(names); await persist("user-names", names, true); };
  const saveBaseIncome = async (next) => { setBaseIncome(next); baseIncomeRef.current = next; await persist("base-income", next, true); };
  const saveCreditCardBills = async (next) => { setCreditCardBills(next); await persist("credit-card-bills", next, true); };

  const saveBudget = async (m, incomeByUser, catBudgets) => {
    setMonthCache((prev) => ({ ...prev, [m]: { ...(prev[m] || emptyMonthData()), incomeByUser, catBudgets } }));
    await persist(`budget:${m}`, { incomeByUser, catBudgets }, true);
    refreshAvailableMonths();
  };

  const saveYearlyBudget = async (year, catBudgets) => {
    setYearCache((prev) => ({ ...prev, [year]: { ...(prev[year] || { spentByCat: {} }), catBudgets } }));
    await persist(`yearly-budget:${year}`, catBudgets, true);
  };

  const saveOtherIncome = async (m, list) => {
    setMonthCache((prev) => ({ ...prev, [m]: { ...(prev[m] || emptyMonthData()), otherIncome: list } }));
    await persist(`other-income:${m}`, list, true);
  };

  const contributeToPlan = async (planId, delta) => {
    setPlanned((prev) => {
      const next = prev.map((p) => (p.id === planId ? { ...p, savedSoFar: Math.max(0, (Number(p.savedSoFar) || 0) + delta) } : p));
      persist("planned", next, true);
      return next;
    });
  };

  const addExpense = async (m, expense) => {
    const currentData = monthCache[m] || (await loadMonth(m));
    const nextExpenses = [...currentData.expenses, expense];
    setMonthCache((prev) => ({ ...prev, [m]: { ...(prev[m] || emptyMonthData()), expenses: nextExpenses } }));
    await persist(`expenses:${m}`, nextExpenses, true);
    refreshAvailableMonths();
    const year = m.slice(0, 4);
    setYearCache((prev) => {
      const yr = prev[year]; if (!yr) return prev;
      return { ...prev, [year]: { ...yr, spentByCat: { ...yr.spentByCat, [expense.catId]: (yr.spentByCat[expense.catId] || 0) + Number(expense.amount) } } };
    });
    if (expense.planId) await contributeToPlan(expense.planId, Number(expense.amount));
  };

  const deleteExpense = async (m, id) => {
    const current = monthCache[m]?.expenses || [];
    const removed = current.find((e) => e.id === id);
    const next = current.filter((e) => e.id !== id);
    setMonthCache((prev) => ({ ...prev, [m]: { ...(prev[m] || emptyMonthData()), expenses: next } }));
    await persist(`expenses:${m}`, next, true);
    if (removed) {
      const year = m.slice(0, 4);
      setYearCache((prev) => {
        const yr = prev[year]; if (!yr) return prev;
        return { ...prev, [year]: { ...yr, spentByCat: { ...yr.spentByCat, [removed.catId]: Math.max(0, (yr.spentByCat[removed.catId] || 0) - Number(removed.amount)) } } };
      });
      if (removed.planId) await contributeToPlan(removed.planId, -Number(removed.amount));
    }
  };

  const savePlanned = async (next) => { setPlanned(next); await persist("planned", next, true); };
  const saveInvestments = async (next) => { setInvestments(next); await persist("investments", next, true); };
  const saveRecurring = async (next) => { setRecurring(next); recurringRef.current = next; await persist("recurring", next, true); };

  const clearAllData = async () => {
    try {
      const all = await window.storage.list(undefined, true);
      for (const k of all?.keys || []) {
        try { await window.storage.delete(k, true); } catch (e) { /* best effort */ }
      }
    } catch (e) { /* best effort */ }
    try { await window.storage.delete("active-user", false); } catch (e) { /* best effort */ }
    setCategories(DEFAULT_CATEGORIES);
    setUserNames(["Aashish", "Vashnika"]);
    setActiveUser("Aashish");
    setPlanned([]); setInvestments([]); setRecurring([]); setCreditCardBills([]); setBaseIncome({});
    recurringRef.current = []; baseIncomeRef.current = {};
    setMonthCache({}); setYearCache({});
    setMonth(thisMonth());
    await persist("categories", DEFAULT_CATEGORIES, true, false);
    await refreshAvailableMonths();
    await loadMonth(thisMonth());
  };

  const exportAllCSV = async () => {
    const rows = [["Date", "Category", "Subcategory", "Amount", "Note", "By", "PaymentMethod"]];
    for (const m of availableMonths) {
      const d = monthCache[m] || (await loadMonth(m));
      d.expenses.forEach((e) => {
        const cat = categories.find((c) => c.id === e.catId);
        const sub = cat?.subcategories?.find((s) => s.id === e.subId);
        rows.push([e.date, cat?.name || "", sub?.name || "", e.amount, (e.note || "").replace(/,/g, ";"), e.by, e.paymentMethod || ""]);
      });
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ledger-export-${thisMonth()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importCSV = async (text) => {
    const lines = text.trim().split(/\r?\n/);
    const rows = lines.slice(1).map((l) => l.split(","));
    const byMonth = {};
    let cats = categories.map((c) => ({ ...c, subcategories: [...(c.subcategories || [])] }));
    rows.forEach(([date, catName, subName, amount, note, by, paymentMethod]) => {
      if (!date || !amount) return;
      let cat = cats.find((c) => c.name.toLowerCase() === (catName || "").toLowerCase());
      if (!cat) { cat = { id: uid(), name: catName || "Other", period: "monthly", subcategories: [] }; cats.push(cat); }
      let subId;
      if (subName) {
        let sub = cat.subcategories.find((s) => s.name.toLowerCase() === subName.toLowerCase());
        if (!sub) { sub = { id: uid(), name: subName }; cat.subcategories.push(sub); }
        subId = sub.id;
      }
      const m = date.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = [];
      byMonth[m].push({ id: uid(), catId: cat.id, subId, amount: Number(amount), date, note: note || "", by: by || userNames[0], paymentMethod: paymentMethod || "" });
    });
    await saveCategories(cats);
    for (const m of Object.keys(byMonth)) {
      const existing = (monthCache[m] || (await loadMonth(m))).expenses;
      const merged = [...existing, ...byMonth[m]];
      setMonthCache((prev) => ({ ...prev, [m]: { ...(prev[m] || emptyMonthData()), expenses: merged } }));
      await persist(`expenses:${m}`, merged, true);
    }
    refreshAvailableMonths();
  };

  if (!ready) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: COLORS.sub }}>
        <style>{FONT_IMPORT}</style>
        Loading ledger…
      </div>
    );
  }

  const data = monthCache[month] || emptyMonthData();
  const year = month.slice(0, 4);
  const yearData = yearCache[year] || { spentByCat: {}, catBudgets: {} };

  const trendMonths = lastNMonths(6);
  const trendData = trendMonths.map((m) => ({
    label: shortMonthLabel(m),
    total: (monthCache[m]?.expenses || []).reduce((s, e) => s + Number(e.amount), 0),
  }));
  const catTotals = {};
  trendMonths.forEach((m) => (monthCache[m]?.expenses || []).forEach((e) => { catTotals[e.catId] = (catTotals[e.catId] || 0) + Number(e.amount); }));
  const topCategories = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id]) => categories.find((c) => c.id === id)).filter(Boolean);
  const categoryTrendData = trendMonths.map((m) => {
    const row = { label: shortMonthLabel(m) };
    topCategories.forEach((c) => { row[c.name] = (monthCache[m]?.expenses || []).filter((e) => e.catId === c.id).reduce((s, e) => s + Number(e.amount), 0); });
    return row;
  });

  return (
    <div style={{ background: COLORS.bg, minHeight: "100%", fontFamily: "Inter, sans-serif", color: COLORS.ink, paddingBottom: 76 }}>
      <style>{`
        ${FONT_IMPORT}
        .disp { font-family: 'Fraunces', serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        .leader { flex: 1; border-bottom: 1.5px dotted ${COLORS.line}; margin: 0 8px; min-width: 12px; height: 0; align-self: flex-end; margin-bottom: 5px; }
        input, select { font-family: inherit; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.line}; border-radius: 4px; }
      `}</style>

      {error && (
        <div style={{ position: "fixed", top: 10, left: "50%", transform: "translateX(-50%)", background: COLORS.flag, color: "white", padding: "8px 16px", borderRadius: 8, fontSize: 13, zIndex: 50 }}>
          {error}
        </div>
      )}

      <Header userNames={userNames} activeUser={activeUser} switchUser={switchUser} saveUserNames={saveUserNames} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 0" }}>
        {tab === "dashboard" && (
          <MonthView
            title="Dashboard" month={month} setMonth={setMonth} availableMonths={availableMonths}
            data={data} categories={categories} userNames={userNames} yearData={yearData} planned={planned}
            trendData={trendData} categoryTrendData={categoryTrendData} topCategories={topCategories}
          />
        )}
        {tab === "add" && (
          <AddExpense
            month={month} categories={categories} userNames={userNames} activeUser={activeUser} planned={planned}
            onAdd={(exp) => { const m = exp.date.slice(0, 7); addExpense(m, exp); }}
            recentExpenses={data.expenses} onDelete={(id) => deleteExpense(month, id)}
          />
        )}
        {tab === "budgets" && (
          <BudgetsTab
            month={month} setMonth={setMonth} categories={categories} setCategories={saveCategories}
            data={data} onSaveBudget={(incomeByUser, cb) => saveBudget(month, incomeByUser, cb)}
            recurring={recurring} onSaveRecurring={saveRecurring} userNames={userNames}
            yearData={yearData} onSaveYearlyBudget={(cb) => saveYearlyBudget(year, cb)}
            baseIncome={baseIncome} onSaveBaseIncome={saveBaseIncome}
            onSaveOtherIncome={(list) => saveOtherIncome(month, list)}
            creditCardBills={creditCardBills} onSaveCreditCardBills={saveCreditCardBills}
            onExport={exportAllCSV} onImport={importCSV} onClearAll={clearAllData}
          />
        )}
        {tab === "history" && (
          <MonthView
            title="History" month={month} setMonth={setMonth} availableMonths={availableMonths}
            data={data} categories={categories} userNames={userNames} yearData={yearData} planned={planned}
            trendData={trendData} categoryTrendData={categoryTrendData} topCategories={topCategories} isHistory
          />
        )}
        {tab === "plan" && (
          <PlanningTab planned={planned} onSave={savePlanned} investments={investments} onSaveInvestments={saveInvestments} userNames={userNames} />
        )}
      </div>

      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

/* ---------------- Header ---------------- */
function Header({ userNames, activeUser, switchUser, saveUserNames }) {
  const [editing, setEditing] = useState(false);
  const [names, setNames] = useState(userNames);
  useEffect(() => setNames(userNames), [userNames]);

  return (
    <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.line}`, padding: "14px 16px", position: "sticky", top: 0, zIndex: 20 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="disp" style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.01em" }}>The Ledger</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!editing ? (
            <>
              {userNames.map((n) => (
                <button key={n} onClick={() => switchUser(n)}
                  style={{ fontSize: 13, padding: "6px 12px", borderRadius: 20, border: `1px solid ${activeUser === n ? COLORS.accent : COLORS.line}`,
                    background: activeUser === n ? COLORS.accentSoft : "transparent", color: activeUser === n ? COLORS.accent : COLORS.sub,
                    cursor: "pointer", fontWeight: 500 }}>{n}</button>
              ))}
              <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.sub, padding: 4 }}><Users size={16} /></button>
            </>
          ) : (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {names.map((n, i) => (
                <input key={i} value={n} onChange={(e) => { const c = [...names]; c[i] = e.target.value; setNames(c); }}
                  style={{ width: 78, fontSize: 13, padding: "5px 8px", borderRadius: 6, border: `1px solid ${COLORS.line}` }} />
              ))}
              <button onClick={() => { saveUserNames(names); setEditing(false); }} style={{ background: COLORS.accent, border: "none", borderRadius: 6, padding: 6, cursor: "pointer" }}>
                <Check size={14} color="white" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Month picker ---------------- */
function MonthPicker({ month, setMonth, availableMonths }) {
  const shift = (dir) => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() + dir); setMonth(d.toISOString().slice(0, 7)); };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
      <button onClick={() => shift(-1)} style={navBtn}><ChevronLeft size={16} /></button>
      <div className="disp" style={{ fontSize: 18, fontWeight: 600, minWidth: 170, textAlign: "center" }}>{monthLabel(month)}</div>
      <button onClick={() => shift(1)} style={navBtn}><ChevronRight size={16} /></button>
      {availableMonths.length > 1 && (
        <select value={month} onChange={(e) => setMonth(e.target.value)}
          style={{ marginLeft: "auto", fontSize: 12, padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.line}`, color: COLORS.sub, background: "white" }}>
          {availableMonths.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      )}
    </div>
  );
}
const navBtn = { background: "white", border: `1px solid ${COLORS.line}`, borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: COLORS.ink };

/* ---------------- Dashboard / History ---------------- */
function MonthView({ title, month, setMonth, availableMonths, data, categories, userNames, yearData, planned, trendData, categoryTrendData, topCategories, isHistory }) {
  const year = month.slice(0, 4);
  const monthlyCats = categories.filter((c) => (c.period || "monthly") !== "yearly");
  const yearlyCats = categories.filter((c) => c.period === "yearly");

  const monthlyRows = useMemo(() => monthlyCats.map((c) => {
    const spent = data.expenses.filter((e) => e.catId === c.id).reduce((s, e) => s + Number(e.amount), 0);
    const budget = data.catBudgets[c.id] || 0;
    return { ...c, spent, budget, remaining: budget - spent };
  }), [monthlyCats, data]);

  const yearlyRows = useMemo(() => yearlyCats.map((c) => {
    const spent = (yearData.spentByCat && yearData.spentByCat[c.id]) || 0;
    const budget = (yearData.catBudgets && yearData.catBudgets[c.id]) || 0;
    return { ...c, spent, budget, remaining: budget - spent };
  }), [yearlyCats, yearData]);

  const totalBudget = monthlyRows.reduce((s, r) => s + r.budget, 0);
  const monthlySpentOnly = monthlyRows.reduce((s, r) => s + r.spent, 0);
  const totalSpentThisMonth = data.expenses.reduce((s, e) => s + Number(e.amount), 0);
  const incomeByUser = data.incomeByUser || {};
  const baseTotal = Object.values(incomeByUser).reduce((s, v) => s + (Number(v) || 0), 0);
  const otherTotal = (data.otherIncome || []).reduce((s, o) => s + Number(o.amount), 0);
  const totalIncome = baseTotal + otherTotal;

  const pieData = categories.filter((c) => data.expenses.some((e) => e.catId === c.id))
    .map((c) => ({ name: c.name, value: data.expenses.filter((e) => e.catId === c.id).reduce((s, e) => s + Number(e.amount), 0), id: c.id }));
  const barData = monthlyRows.filter((r) => r.budget > 0 || r.spent > 0)
    .map((r) => ({ name: r.name.length > 8 ? r.name.slice(0, 7) + "…" : r.name, Budgeted: r.budget, Spent: r.spent }));

  return (
    <div>
      <div className="disp" style={{ fontSize: 15, color: COLORS.sub, marginBottom: 4 }}>{title}</div>
      <MonthPicker month={month} setMonth={setMonth} availableMonths={availableMonths} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        <SummaryCard label="Income" value={totalIncome} />
        <SummaryCard label="Budgeted" value={totalBudget} />
        <SummaryCard label="Spent" value={totalSpentThisMonth} flag={monthlySpentOnly > totalBudget && totalBudget > 0} />
      </div>

      <PersonBreakdown userNames={userNames} expenses={data.expenses} categories={categories} />
      <PlanProgressCard planned={planned} />
      <PaymentMethodBreakdown expenses={data.expenses} />

      {monthlyRows.filter((r) => r.budget > 0 || r.spent > 0).length === 0 ? (
        <EmptyState text={isHistory ? "No monthly-budget data recorded for this month yet." : "No monthly budgets or expenses yet — set a budget or add an expense to get started."} />
      ) : (
        <div style={{ marginBottom: 20 }}>
          <div className="disp" style={{ fontSize: 13, fontWeight: 600, color: COLORS.sub, marginBottom: 6, paddingLeft: 2 }}>This month</div>
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "14px 16px" }}>
            {monthlyRows.filter((r) => r.budget > 0 || r.spent > 0).map((r) => <LedgerRow key={r.id} row={r} />)}
          </div>
        </div>
      )}

      {yearlyCats.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="disp" style={{ fontSize: 13, fontWeight: 600, color: COLORS.sub, marginBottom: 6, paddingLeft: 2 }}>This year ({year}) — yearly-budgeted categories</div>
          {yearlyRows.filter((r) => r.budget > 0 || r.spent > 0).length === 0 ? (
            <EmptyState text="No yearly budgets set or spend recorded yet this year." />
          ) : (
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "14px 16px" }}>
              {yearlyRows.filter((r) => r.budget > 0 || r.spent > 0).map((r) => <LedgerRow key={r.id} row={r} />)}
            </div>
          )}
        </div>
      )}

      {pieData.length > 0 && (
        <ChartCard title="Where it went — this month">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45}>
                {pieData.map((d) => <Cell key={d.id} fill={colorFor(d.id)} />)}
              </Pie>
              <Tooltip formatter={(v) => inr(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {barData.length > 0 && (
        <ChartCard title="Budgeted vs. actual — monthly categories">
          <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 42)}>
            <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => inr(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={64} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => inr(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Budgeted" fill={COLORS.accentSoft} radius={[0, 4, 4, 0]} />
              <Bar dataKey="Spent" fill={COLORS.accent} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {trendData.some((d) => d.total > 0) && (
        <ChartCard title="Spend trend — last 6 months">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData} margin={{ left: -12, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => inr(v)} tick={{ fontSize: 10 }} width={60} />
              <Tooltip formatter={(v) => inr(v)} />
              <Bar dataKey="total" name="Total spent" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {topCategories.length > 0 && (
        <ChartCard title="Top categories — last 6 months">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryTrendData} margin={{ left: -12, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => inr(v)} tick={{ fontSize: 10 }} width={60} />
              <Tooltip formatter={(v) => inr(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {topCategories.map((c) => <Bar key={c.id} dataKey={c.name} fill={colorFor(c.id)} radius={[3, 3, 0, 0]} />)}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function SummaryCard({ label, value, flag }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${flag ? COLORS.flag : COLORS.line}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: COLORS.sub, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: flag ? COLORS.flag : COLORS.ink }}>{inr(value)}</div>
    </div>
  );
}

function LedgerRow({ row }) {
  const pct = row.budget > 0 ? Math.min(100, (row.spent / row.budget) * 100) : row.spent > 0 ? 100 : 0;
  const over = row.budget > 0 && row.spent > row.budget;
  return (
    <div style={{ padding: "9px 0", borderBottom: `1px solid ${COLORS.line}` }}>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: colorFor(row.id), display: "inline-block" }} />
          {row.name}
        </span>
        <span className="leader" />
        <span className="mono" style={{ fontSize: 13 }}>{inr(row.spent)} <span style={{ color: COLORS.sub }}>/ {inr(row.budget)}</span></span>
        {over && <AlertTriangle size={13} color={COLORS.flag} style={{ marginLeft: 6 }} />}
      </div>
      <div style={{ height: 4, background: COLORS.line, borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: over ? COLORS.flag : colorFor(row.id), transition: "width .3s" }} />
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "14px 12px", marginBottom: 20 }}>
      <div className="disp" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, paddingLeft: 4 }}>{title}</div>
      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={{ background: COLORS.card, border: `1px dashed ${COLORS.line}`, borderRadius: 12, padding: "28px 16px", textAlign: "center", color: COLORS.sub, fontSize: 13, marginBottom: 20 }}>{text}</div>;
}

/* By person — spend only (income lives in Budgets tab) */
function PersonBreakdown({ userNames, expenses, categories }) {
  const spentByUser = {};
  userNames.forEach((n) => (spentByUser[n] = 0));
  expenses.forEach((e) => { if (userNames.includes(e.by)) spentByUser[e.by] = (spentByUser[e.by] || 0) + Number(e.amount); });

  const investCats = categories.filter((c) => /invest/i.test(c.name));
  const investByUser = {};
  if (investCats.length > 0) {
    const investIds = new Set(investCats.map((c) => c.id));
    userNames.forEach((n) => (investByUser[n] = 0));
    expenses.forEach((e) => { if (investIds.has(e.catId) && userNames.includes(e.by)) investByUser[e.by] = (investByUser[e.by] || 0) + Number(e.amount); });
  }
  const totalInvested = Object.values(investByUser).reduce((s, v) => s + v, 0);
  if (!Object.values(spentByUser).some((v) => v > 0)) return null;

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
      <div className="disp" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>By person — spent this month</div>
      {userNames.map((n) => (
        <div key={n} style={{ display: "flex", alignItems: "baseline", padding: "6px 0", borderBottom: `1px solid ${COLORS.line}` }}>
          <span style={{ fontSize: 13.5 }}>{n}</span>
          <span className="leader" />
          <span className="mono" style={{ fontSize: 13 }}>{inr(spentByUser[n] || 0)}</span>
        </div>
      ))}
      {investCats.length > 0 && totalInvested > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${COLORS.line}` }}>
          <div style={{ fontSize: 11.5, color: COLORS.sub, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6 }}>Invested this month</div>
          {userNames.filter((n) => investByUser[n] > 0).map((n) => (
            <div key={n} style={{ display: "flex", alignItems: "baseline", padding: "3px 0" }}>
              <span style={{ fontSize: 13 }}>{n}</span>
              <span className="leader" />
              <span className="mono" style={{ fontSize: 13, fontWeight: 500, color: COLORS.accent }}>{inr(investByUser[n])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanProgressCard({ planned }) {
  if (!planned || planned.length === 0) return null;
  const sorted = [...planned].sort((a, b) => (a.targetMonth > b.targetMonth ? 1 : -1)).slice(0, 3);
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
      <div className="disp" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Plan ahead</div>
      {sorted.map((p) => {
        const pct = p.targetAmount > 0 ? Math.min(100, (p.savedSoFar / p.targetAmount) * 100) : 0;
        return (
          <div key={p.id} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span>{p.title}</span>
              <span className="mono" style={{ color: COLORS.sub }}>{inr(p.savedSoFar)} / {inr(p.targetAmount)}</span>
            </div>
            <div style={{ height: 4, background: COLORS.line, borderRadius: 3, marginTop: 4, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: COLORS.accent }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentMethodBreakdown({ expenses }) {
  const totals = {};
  PAYMENT_METHODS.forEach((m) => (totals[m] = 0));
  let unspecified = 0;
  expenses.forEach((e) => { if (e.paymentMethod && totals[e.paymentMethod] !== undefined) totals[e.paymentMethod] += Number(e.amount); else unspecified += Number(e.amount); });
  if (!Object.values(totals).some((v) => v > 0) && unspecified === 0) return null;
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
      <div className="disp" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>By payment method</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PAYMENT_METHODS.filter((m) => totals[m] > 0).map((m) => (
          <div key={m} style={{ background: COLORS.accentSoft, borderRadius: 20, padding: "5px 12px", fontSize: 12 }}>{m} · <span className="mono" style={{ fontWeight: 600 }}>{inr(totals[m])}</span></div>
        ))}
        {unspecified > 0 && <div style={{ background: COLORS.line, borderRadius: 20, padding: "5px 12px", fontSize: 12, color: COLORS.sub }}>Unspecified · <span className="mono">{inr(unspecified)}</span></div>}
      </div>
    </div>
  );
}

/* ---------------- Add Expense ---------------- */
function AddExpense({ month, categories, userNames, activeUser, planned, onAdd, recentExpenses, onDelete }) {
  const [useToday, setUseToday] = useState(true);
  const [catId, setCatId] = useState(categories[0]?.id || "");
  const [subId, setSubId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [by, setBy] = useState(activeUser);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [planId, setPlanId] = useState("");

  useEffect(() => setBy(activeUser), [activeUser]);
  useEffect(() => { if (categories.length && !categories.find((c) => c.id === catId)) setCatId(categories[0]?.id || ""); }, [categories]); // eslint-disable-line
  useEffect(() => { setSubId(""); }, [catId]);
  useEffect(() => { if (useToday) setDate(new Date().toISOString().slice(0, 10)); }, [useToday]);

  const selectedCat = categories.find((c) => c.id === catId);
  const subs = selectedCat?.subcategories || [];

  const submit = () => {
    if (!amount || Number(amount) <= 0 || !catId) return;
    const finalDate = useToday ? new Date().toISOString().slice(0, 10) : date;
    onAdd({ id: uid(), catId, subId: subId || undefined, amount: Number(amount), date: finalDate, note, by, paymentMethod, planId: planId || undefined });
    setAmount(""); setNote(""); setPlanId("");
  };

  const sorted = [...recentExpenses].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 12);
  const catName = (id) => categories.find((c) => c.id === id)?.name || "—";
  const subName = (cId, sId) => categories.find((c) => c.id === cId)?.subcategories?.find((s) => s.id === sId)?.name || "";

  return (
    <div>
      <div className="disp" style={{ fontSize: 18, fontWeight: 600, marginBottom: 14 }}>Add expense</div>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: subs.length > 0 ? "1fr 1fr" : "1fr", gap: 10, marginBottom: 10 }}>
          <Field label="Category">
            <select value={catId} onChange={(e) => setCatId(e.target.value)} style={inputStyle}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.period === "yearly" ? " (yearly)" : ""}</option>)}
            </select>
          </Field>
          {subs.length > 0 && (
            <Field label="Subcategory">
              <select value={subId} onChange={(e) => setSubId(e.target.value)} style={inputStyle}>
                <option value="">— none —</option>
                {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <Field label="Amount"><MoneyInput value={amount} onChange={setAmount} placeholder="0" style={inputStyle} /></Field>
          <Field label="Paid via">
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={inputStyle}>
              {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: COLORS.ink, cursor: "pointer", marginBottom: 8 }}>
          <input type="checkbox" checked={useToday} onChange={(e) => setUseToday(e.target.checked)} /> Use today's date
        </label>
        {!useToday && <div style={{ marginBottom: 10 }}><Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></Field></div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <Field label="Added by">
            <select value={by} onChange={(e) => setBy(e.target.value)} style={inputStyle}>
              {userNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          {planned.length > 0 && (
            <Field label="Counts toward a plan">
              <select value={planId} onChange={(e) => setPlanId(e.target.value)} style={inputStyle}>
                <option value="">— none —</option>
                {planned.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </Field>
          )}
        </div>

        <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Zomato — team dinner" style={inputStyle} /></Field>
        <button onClick={submit} style={{ marginTop: 12, width: "100%", background: COLORS.accent, color: "white", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <PlusCircle size={16} /> Add expense
        </button>
      </div>

      <div className="disp" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Recent — {monthLabel(month)}</div>
      {sorted.length === 0 ? <EmptyState text="No expenses logged for this month yet." /> : (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: "hidden" }}>
          {sorted.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${COLORS.line}`, gap: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: colorFor(e.catId), flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {catName(e.catId)}{e.subId ? ` › ${subName(e.catId, e.subId)}` : ""}{e.note ? <span style={{ color: COLORS.sub, fontWeight: 400 }}> — {e.note}</span> : null}
                </div>
                <div style={{ fontSize: 11, color: COLORS.sub }}>{e.date} · {e.by}{e.paymentMethod ? ` · ${e.paymentMethod}` : ""}</div>
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{inr(e.amount)}</div>
              <button onClick={() => onDelete(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.sub, padding: 2 }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div><div style={{ fontSize: 11, color: COLORS.sub, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>{children}</div>;
}
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 7, border: `1px solid ${COLORS.line}`, fontSize: 13.5, background: "white", color: COLORS.ink };
const iconBtn = { background: "none", border: "none", cursor: "pointer", color: COLORS.sub, padding: 5, borderRadius: 6, display: "flex" };

/* ---------------- Budgets tab ---------------- */
function BudgetsTab({
  month, setMonth, categories, setCategories, data, onSaveBudget, recurring, onSaveRecurring, userNames,
  yearData, onSaveYearlyBudget, baseIncome, onSaveBaseIncome, onSaveOtherIncome, creditCardBills, onSaveCreditCardBills,
  onExport, onImport, onClearAll,
}) {
  const [incomeByUser, setIncomeByUser] = useState(data.incomeByUser || {});
  const [catBudgets, setCatBudgets] = useState(data.catBudgets || {});
  const [yearlyCatBudgets, setYearlyCatBudgets] = useState(yearData.catBudgets || {});
  const [newCat, setNewCat] = useState("");
  const [newCatPeriod, setNewCatPeriod] = useState("monthly");
  const [editingCat, setEditingCat] = useState(null);
  const [expandedCatId, setExpandedCatId] = useState(null);
  const [newSub, setNewSub] = useState({});
  const [dirty, setDirty] = useState(false);
  const [baseIncomeLocal, setBaseIncomeLocal] = useState(baseIncome);

  useEffect(() => { setIncomeByUser(data.incomeByUser || {}); setCatBudgets(data.catBudgets || {}); setYearlyCatBudgets(yearData.catBudgets || {}); setDirty(false); }, [month, data, yearData]);
  useEffect(() => { setBaseIncomeLocal(baseIncome); }, [baseIncome]);

  const updateIncome = (name, val) => { setIncomeByUser((p) => ({ ...p, [name]: Number(val) || 0 })); setDirty(true); };
  const updateCatBudget = (id, val) => { setCatBudgets((p) => ({ ...p, [id]: Number(val) || 0 })); setDirty(true); };
  const updateYearlyCatBudget = (id, val) => { setYearlyCatBudgets((p) => ({ ...p, [id]: Number(val) || 0 })); setDirty(true); };
  const save = () => { onSaveBudget(incomeByUser, catBudgets); onSaveYearlyBudget(yearlyCatBudgets); setDirty(false); };

  const addCategory = () => {
    const name = newCat.trim(); if (!name) return;
    const id = slug(name) + "-" + uid().slice(0, 4);
    setCategories([...categories, { id, name, period: newCatPeriod, subcategories: [] }]);
    setNewCat(""); setNewCatPeriod("monthly");
  };
  const renameCategory = (id, name) => setCategories(categories.map((c) => (c.id === id ? { ...c, name } : c)));
  const removeCategory = (id) => setCategories(categories.filter((c) => c.id !== id));
  const togglePeriod = (id) => setCategories(categories.map((c) => (c.id === id ? { ...c, period: c.period === "yearly" ? "monthly" : "yearly" } : c)));
  const addSubcategory = (catId) => {
    const name = (newSub[catId] || "").trim(); if (!name) return;
    setCategories(categories.map((c) => (c.id === catId ? { ...c, subcategories: [...(c.subcategories || []), { id: uid(), name }] } : c)));
    setNewSub((p) => ({ ...p, [catId]: "" }));
  };
  const removeSubcategory = (catId, subId) => setCategories(categories.map((c) => (c.id === catId ? { ...c, subcategories: (c.subcategories || []).filter((s) => s.id !== subId) } : c)));

  const totalIncome = Object.values(incomeByUser).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalBudget = Object.values(catBudgets).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalYearlyBudget = Object.values(yearlyCatBudgets).reduce((s, v) => s + (Number(v) || 0), 0);

  return (
    <div>
      <div className="disp" style={{ fontSize: 15, color: COLORS.sub, marginBottom: 4 }}>Budgets</div>
      <MonthPicker month={month} setMonth={setMonth} availableMonths={[month]} />

      {/* Base income */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div className="disp" style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Base income</div>
        <div style={{ fontSize: 12, color: COLORS.sub, marginBottom: 10 }}>Set once — auto-applied to every new month. Editing "this month's income" below only overrides the month you have selected.</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${userNames.length}, 1fr)`, gap: 10 }}>
          {userNames.map((n) => (
            <Field key={n} label={n}><MoneyInput value={baseIncomeLocal[n] ?? ""} onChange={(v) => setBaseIncomeLocal((p) => ({ ...p, [n]: v === "" ? "" : Number(v) }))} placeholder="0" style={inputStyle} /></Field>
          ))}
        </div>
        <button onClick={() => onSaveBaseIncome(baseIncomeLocal)} style={{ marginTop: 10, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save base income</button>
      </div>

      {/* This month + other income */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: COLORS.sub, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>This month's income</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${userNames.length}, 1fr)`, gap: 10, marginBottom: 4 }}>
          {userNames.map((n) => (
            <Field key={n} label={n}><MoneyInput value={incomeByUser[n] ?? ""} onChange={(v) => updateIncome(n, v)} placeholder="0" style={inputStyle} /></Field>
          ))}
        </div>
        {userNames.length > 1 && <div style={{ fontSize: 11.5, color: COLORS.sub, marginTop: 2 }}>Combined base: <span className="mono" style={{ color: COLORS.ink, fontWeight: 600 }}>{inr(totalIncome)}</span></div>}

        <OtherIncomeSection otherIncome={data.otherIncome || []} onSave={onSaveOtherIncome} userNames={userNames} />

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: COLORS.sub, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Monthly category budgets</div>
          {categories.filter((c) => (c.period || "monthly") !== "yearly").map((c) => (
            <CategoryRow key={c.id} c={c} editingCat={editingCat} setEditingCat={setEditingCat}
              renameCategory={renameCategory} removeCategory={removeCategory} togglePeriod={togglePeriod}
              expandedCatId={expandedCatId} setExpandedCatId={setExpandedCatId}
              newSub={newSub} setNewSub={setNewSub} addSubcategory={addSubcategory} removeSubcategory={removeSubcategory}
              value={catBudgets[c.id]} onChangeValue={(v) => updateCatBudget(c.id, v)} suffix="" />
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category name" style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && addCategory()} />
          <select value={newCatPeriod} onChange={(e) => setNewCatPeriod(e.target.value)} style={{ ...inputStyle, width: 100 }}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <button onClick={addCategory} style={{ ...iconBtn, background: COLORS.accentSoft, color: COLORS.accent, padding: "0 12px", fontSize: 12, fontWeight: 600 }}>+ Add</button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: `1px solid ${COLORS.line}` }}>
          <div style={{ fontSize: 12, color: COLORS.sub }}>
            Monthly budgeted: <span className="mono" style={{ color: COLORS.ink, fontWeight: 600 }}>{inr(totalBudget)}</span>
            {totalIncome > 0 && <span> · Unallocated: <span className="mono" style={{ fontWeight: 600, color: totalBudget > totalIncome ? COLORS.flag : COLORS.ink }}>{inr(totalIncome - totalBudget)}</span></span>}
          </div>
          <button onClick={save} disabled={!dirty} style={{ background: dirty ? COLORS.accent : COLORS.line, color: dirty ? "white" : COLORS.sub, border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: dirty ? "pointer" : "default" }}>Save budget</button>
        </div>
      </div>

      {/* Yearly budgets */}
      {categories.some((c) => c.period === "yearly") && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div className="disp" style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Yearly budgets — {month.slice(0, 4)}</div>
          <div style={{ fontSize: 12, color: COLORS.sub, marginBottom: 10 }}>One number covers the whole calendar year for these categories.</div>
          {categories.filter((c) => c.period === "yearly").map((c) => (
            <CategoryRow key={c.id} c={c} editingCat={editingCat} setEditingCat={setEditingCat}
              renameCategory={renameCategory} removeCategory={removeCategory} togglePeriod={togglePeriod}
              expandedCatId={expandedCatId} setExpandedCatId={setExpandedCatId}
              newSub={newSub} setNewSub={setNewSub} addSubcategory={addSubcategory} removeSubcategory={removeSubcategory}
              value={yearlyCatBudgets[c.id]} onChangeValue={(v) => updateYearlyCatBudget(c.id, v)} suffix="/yr" />
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${COLORS.line}` }}>
            <div style={{ fontSize: 12, color: COLORS.sub }}>Total yearly budgeted: <span className="mono" style={{ color: COLORS.ink, fontWeight: 600 }}>{inr(totalYearlyBudget)}</span></div>
            <button onClick={save} disabled={!dirty} style={{ background: dirty ? COLORS.accent : COLORS.line, color: dirty ? "white" : COLORS.sub, border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: dirty ? "pointer" : "default" }}>Save</button>
          </div>
        </div>
      )}

      <RecurringSection categories={categories} recurring={recurring} onSave={onSaveRecurring} />
      <CreditCardBillsSection bills={creditCardBills} onSave={onSaveCreditCardBills} userNames={userNames} />
      <ExportImportSection onExport={onExport} onImport={onImport} />
      <DangerZone onClearAll={onClearAll} />
    </div>
  );
}

function CategoryRow({ c, editingCat, setEditingCat, renameCategory, removeCategory, togglePeriod, expandedCatId, setExpandedCatId, newSub, setNewSub, addSubcategory, removeSubcategory, value, onChangeValue, suffix }) {
  const expanded = expandedCatId === c.id;
  return (
    <div style={{ borderBottom: `1px solid ${COLORS.line}`, padding: "7px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => setExpandedCatId(expanded ? null : c.id)} style={{ ...iconBtn, padding: 2 }}>
          <ChevronDown size={13} style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s" }} />
        </button>
        {editingCat === c.id ? (
          <input autoFocus defaultValue={c.name} onBlur={(e) => { renameCategory(c.id, e.target.value.trim() || c.name); setEditingCat(null); }}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()} style={{ ...inputStyle, flex: 1, padding: "4px 6px" }} />
        ) : (
          <span style={{ flex: 1, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: colorFor(c.id) }} />{c.name}
            {(c.subcategories || []).length > 0 && <span style={{ fontSize: 10.5, color: COLORS.sub }}>({c.subcategories.length})</span>}
          </span>
        )}
        <button onClick={() => togglePeriod(c.id)} style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: c.period === "yearly" ? COLORS.accentSoft : "transparent", color: c.period === "yearly" ? COLORS.accent : COLORS.sub, cursor: "pointer", fontWeight: 500 }}>
          {c.period === "yearly" ? "Yearly" : "Monthly"}
        </button>
        <MoneyInput value={value ?? ""} onChange={onChangeValue} placeholder={`0${suffix}`} style={{ width: 100, padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.line}`, fontSize: 13, textAlign: "right" }} />
        <button onClick={() => setEditingCat(c.id)} style={iconBtn}><Pencil size={13} /></button>
        <button onClick={() => removeCategory(c.id)} style={iconBtn}><Trash2 size={13} /></button>
      </div>
      {expanded && (
        <div style={{ marginLeft: 21, marginTop: 6, marginBottom: 2 }}>
          {(c.subcategories || []).map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0", fontSize: 12.5, color: COLORS.sub }}>
              <span>{s.name}</span>
              <button onClick={() => removeSubcategory(c.id, s.id)} style={{ ...iconBtn, padding: 2 }}><X size={11} /></button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <input value={newSub[c.id] || ""} onChange={(e) => setNewSub((p) => ({ ...p, [c.id]: e.target.value }))} placeholder="New subcategory"
              onKeyDown={(e) => e.key === "Enter" && addSubcategory(c.id)} style={{ ...inputStyle, flex: 1, fontSize: 12, padding: "5px 8px" }} />
            <button onClick={() => addSubcategory(c.id)} style={{ ...iconBtn, background: COLORS.accentSoft, color: COLORS.accent, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>+ Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

function OtherIncomeSection({ otherIncome, onSave, userNames }) {
  const [form, setForm] = useState(null);
  const openNew = () => setForm({ id: uid(), label: "", amount: "", by: userNames[0] || "", date: new Date().toISOString().slice(0, 10) });
  const submit = () => {
    if (!form.label.trim() || !form.amount) return;
    onSave([...otherIncome, { ...form, amount: Number(form.amount) }]);
    setForm(null);
  };
  const remove = (id) => onSave(otherIncome.filter((o) => o.id !== id));
  const total = otherIncome.reduce((s, o) => s + Number(o.amount), 0);

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${COLORS.line}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: COLORS.sub, textTransform: "uppercase", letterSpacing: "0.03em", display: "flex", alignItems: "center", gap: 5 }}><Gift size={12} /> Other income this month (bonus, gifts, etc.)</div>
        <button onClick={openNew} style={{ fontSize: 11, color: COLORS.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add</button>
      </div>
      {otherIncome.length === 0 ? (
        <div style={{ fontSize: 12, color: COLORS.sub }}>None this month.</div>
      ) : otherIncome.map((o) => (
        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 12.5 }}>
          <span>{o.label} <span style={{ color: COLORS.sub }}>· {o.by} · {o.date}</span></span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="mono" style={{ fontWeight: 600 }}>+{inr(o.amount)}</span>
            <button onClick={() => remove(o.id)} style={{ ...iconBtn, padding: 2 }}><X size={11} /></button>
          </span>
        </div>
      ))}
      {otherIncome.length > 0 && <div style={{ fontSize: 11.5, color: COLORS.sub, marginTop: 4 }}>Total other income: <span className="mono" style={{ fontWeight: 600, color: COLORS.ink }}>{inr(total)}</span></div>}

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,36,32,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 40 }} onClick={() => setForm(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 480, boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="disp" style={{ fontSize: 16, fontWeight: 600 }}>Add other income</div>
              <button onClick={() => setForm(null)} style={iconBtn}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field label="What is it"><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Diwali bonus" style={inputStyle} /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Amount"><MoneyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} style={inputStyle} /></Field>
                <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} /></Field>
              </div>
              <Field label="Received by">
                <select value={form.by} onChange={(e) => setForm({ ...form, by: e.target.value })} style={inputStyle}>
                  {userNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
            </div>
            <button onClick={submit} style={{ marginTop: 14, width: "100%", background: COLORS.accent, color: "white", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

const INVESTMENT_TYPES = ["SIP", "Mutual Fund", "Stocks", "FD / RD", "PPF / EPF", "Gold", "Real Estate", "Other"];

function RecurringSection({ categories, recurring, onSave }) {
  const [form, setForm] = useState(null);
  const catName = (id) => categories.find((c) => c.id === id)?.name || "—";

  const openNew = () => setForm({ id: uid(), label: "", catId: categories[0]?.id || "", amount: "", autoAdd: true, day: 1, paymentMethod: "" });
  const submit = () => {
    if (!form.label.trim() || !form.amount || !form.catId) return;
    const clean = { ...form, amount: Number(form.amount), day: Math.min(28, Math.max(1, Number(form.day) || 1)) };
    const exists = recurring.find((r) => r.id === form.id);
    onSave(exists ? recurring.map((r) => (r.id === form.id ? clean : r)) : [...recurring, clean]);
    setForm(null);
  };
  const remove = (id) => onSave(recurring.filter((r) => r.id !== id));

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div className="disp" style={{ fontSize: 15, fontWeight: 600 }}>Recurring monthly items</div>
        <button onClick={openNew} style={{ background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Add</button>
      </div>
      <div style={{ fontSize: 12, color: COLORS.sub, marginBottom: 10 }}>Things like rent or bills that repeat every month — pick which day they log on. They'll auto-fill that category's budget, and, if switched on, log themselves as an expense on that day of every new month.</div>

      {recurring.length === 0 ? (
        <div style={{ fontSize: 12.5, color: COLORS.sub, padding: "10px 0" }}>No recurring items yet.</div>
      ) : recurring.map((r) => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${COLORS.line}` }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: colorFor(r.catId), flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{r.label}</div>
            <div style={{ fontSize: 11, color: COLORS.sub }}>{catName(r.catId)}{r.autoAdd ? ` · auto-added on day ${r.day || 1}` : " · budget only"}</div>
          </div>
          <div className="mono" style={{ fontSize: 13 }}>{inr(r.amount)}</div>
          <button onClick={() => setForm({ ...r, amount: r.amount })} style={iconBtn}><Pencil size={13} /></button>
          <button onClick={() => remove(r.id)} style={iconBtn}><Trash2 size={13} /></button>
        </div>
      ))}

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,36,32,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 40 }} onClick={() => setForm(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 480, boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="disp" style={{ fontSize: 16, fontWeight: 600 }}>Recurring item</div>
              <button onClick={() => setForm(null)} style={iconBtn}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field label="Label"><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Rent, Electricity bill" style={inputStyle} /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Category">
                  <select value={form.catId} onChange={(e) => setForm({ ...form, catId: e.target.value })} style={inputStyle}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Amount"><MoneyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} style={inputStyle} /></Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Day of month"><input type="number" min="1" max="28" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} style={inputStyle} /></Field>
                <Field label="Paid via">
                  <select value={form.paymentMethod || ""} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} style={inputStyle}>
                    <option value="">— unspecified —</option>
                    {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.ink, cursor: "pointer", marginTop: 2 }}>
                <input type="checkbox" checked={form.autoAdd} onChange={(e) => setForm({ ...form, autoAdd: e.target.checked })} /> Auto-log this as an expense every month (not just budget it)
              </label>
            </div>
            <button onClick={submit} style={{ marginTop: 16, width: "100%", background: COLORS.accent, color: "white", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save recurring item</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreditCardBillsSection({ bills, onSave, userNames }) {
  const [form, setForm] = useState(null);
  const openNew = () => setForm({ id: uid(), cardName: "", amount: "", dueDate: new Date().toISOString().slice(0, 10), paid: false, by: userNames[0] || "" });
  const submit = () => {
    if (!form.cardName.trim() || !form.amount) return;
    const clean = { ...form, amount: Number(form.amount) };
    const exists = bills.find((b) => b.id === form.id);
    onSave(exists ? bills.map((b) => (b.id === form.id ? clean : b)) : [...bills, clean]);
    setForm(null);
  };
  const remove = (id) => onSave(bills.filter((b) => b.id !== id));
  const togglePaid = (id) => onSave(bills.map((b) => (b.id === id ? { ...b, paid: !b.paid } : b)));
  const sorted = [...bills].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div className="disp" style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><CreditCard size={15} /> Credit card bills</div>
        <button onClick={openNew} style={{ background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Add</button>
      </div>
      <div style={{ fontSize: 12, color: COLORS.sub, marginBottom: 10 }}>Just for tracking due dates and paid status — these don't count as expenses, since the underlying spend is already logged when you use the card.</div>

      {sorted.length === 0 ? <div style={{ fontSize: 12.5, color: COLORS.sub, padding: "10px 0" }}>No bills tracked yet.</div> : sorted.map((b) => {
        const overdue = !b.paid && b.dueDate < today;
        return (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${COLORS.line}` }}>
            <input type="checkbox" checked={!!b.paid} onChange={() => togglePaid(b.id)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, textDecoration: b.paid ? "line-through" : "none", color: b.paid ? COLORS.sub : COLORS.ink }}>{b.cardName}</div>
              <div style={{ fontSize: 11, color: overdue ? COLORS.flag : COLORS.sub }}>Due {b.dueDate}{b.by ? ` · ${b.by}` : ""}{overdue ? " · overdue" : ""}</div>
            </div>
            <div className="mono" style={{ fontSize: 13 }}>{inr(b.amount)}</div>
            <button onClick={() => setForm(b)} style={iconBtn}><Pencil size={13} /></button>
            <button onClick={() => remove(b.id)} style={iconBtn}><Trash2 size={13} /></button>
          </div>
        );
      })}

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,36,32,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 40 }} onClick={() => setForm(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 480, boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="disp" style={{ fontSize: 16, fontWeight: 600 }}>Credit card bill</div>
              <button onClick={() => setForm(null)} style={iconBtn}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field label="Card name"><input value={form.cardName} onChange={(e) => setForm({ ...form, cardName: e.target.value })} placeholder="e.g. HDFC Regalia" style={inputStyle} /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Amount"><MoneyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} style={inputStyle} /></Field>
                <Field label="Due date"><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={inputStyle} /></Field>
              </div>
              <Field label="Responsible">
                <select value={form.by} onChange={(e) => setForm({ ...form, by: e.target.value })} style={inputStyle}>
                  {userNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
            </div>
            <button onClick={submit} style={{ marginTop: 14, width: "100%", background: COLORS.accent, color: "white", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save bill</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExportImportSection({ onExport, onImport }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      await onImport(text);
      setMsg("Imported successfully.");
    } catch (err) {
      setMsg("Import failed — check the file format.");
    }
    setBusy(false);
    setTimeout(() => setMsg(""), 4000);
    e.target.value = "";
  };
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div className="disp" style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Export / Import</div>
      <div style={{ fontSize: 12, color: COLORS.sub, marginBottom: 12 }}>
        Not a live Google Sheets sync (that needs a Google API connection this app doesn't set up) — but export gives you a CSV you can open directly in Google Sheets or Excel, and import brings a CSV back in.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onExport} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: COLORS.accent, color: "white", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Download size={14} /> Export CSV
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={busy} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: COLORS.accentSoft, color: COLORS.accent, border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Upload size={14} /> {busy ? "Importing…" : "Import CSV"}
        </button>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: "none" }} />
      </div>
      {msg && <div style={{ fontSize: 11.5, color: COLORS.sub, marginTop: 8 }}>{msg}</div>}
    </div>
  );
}

function DangerZone({ onClearAll }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleClear = async () => {
    setBusy(true);
    await onClearAll();
    setBusy(false);
    setConfirming(false);
    setDone(true);
    setTimeout(() => setDone(false), 4000);
  };

  return (
    <div style={{ background: COLORS.flagSoft, border: `1px solid ${COLORS.flag}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div className="disp" style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: COLORS.flag, display: "flex", alignItems: "center", gap: 6 }}>
        <AlertTriangle size={15} /> Danger zone
      </div>
      <div style={{ fontSize: 12, color: COLORS.ink, marginBottom: 10 }}>
        Wipes every category, budget, expense, plan, investment, and setting for everyone using this app — categories reset back to the defaults. Use this right before a fresh CSV import. This can't be undone.
      </div>
      {!confirming ? (
        <button onClick={() => setConfirming(true)} style={{ background: "white", color: COLORS.flag, border: `1px solid ${COLORS.flag}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Clear all data
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleClear} disabled={busy} style={{ background: COLORS.flag, color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {busy ? "Clearing…" : "Yes, clear everything"}
          </button>
          <button onClick={() => setConfirming(false)} disabled={busy} style={{ background: "white", color: COLORS.sub, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      )}
      {done && <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 8, fontWeight: 600 }}>Done — the ledger is clean.</div>}
    </div>
  );
}

/* ---------------- Plan tab (future expenses + investments) ---------------- */
function PlanningTab({ planned, onSave, investments, onSaveInvestments, userNames }) {
  const [section, setSection] = useState("future");
  return (
    <div>
      <div style={{ display: "flex", gap: 4, background: COLORS.line, padding: 3, borderRadius: 10, marginBottom: 16 }}>
        {[{ id: "future", label: "Future expenses", icon: Target }, { id: "investments", label: "Investments", icon: TrendingUp }].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSection(id)} style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
            background: section === id ? COLORS.card : "transparent", color: section === id ? COLORS.ink : COLORS.sub, fontSize: 12.5, fontWeight: section === id ? 600 : 500,
            boxShadow: section === id ? "0 1px 2px rgba(27,36,32,0.08)" : "none",
          }}><Icon size={14} /> {label}</button>
        ))}
      </div>
      {section === "future" ? <FutureExpensesSection planned={planned} onSave={onSave} /> : <InvestmentsSection investments={investments} onSave={onSaveInvestments} userNames={userNames} />}
    </div>
  );
}

function FutureExpensesSection({ planned, onSave }) {
  const [form, setForm] = useState(null);
  const openNew = () => setForm({ id: uid(), title: "", targetAmount: "", targetMonth: thisMonth(), savedSoFar: "", notes: "" });
  const submit = () => {
    if (!form.title.trim() || !form.targetAmount) return;
    const exists = planned.find((p) => p.id === form.id);
    const clean = { ...form, targetAmount: Number(form.targetAmount), savedSoFar: Number(form.savedSoFar) || 0 };
    onSave(exists ? planned.map((p) => (p.id === form.id ? clean : p)) : [...planned, clean]);
    setForm(null);
  };
  const remove = (id) => onSave(planned.filter((p) => p.id !== id));
  const sorted = [...planned].sort((a, b) => (a.targetMonth > b.targetMonth ? 1 : -1));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="disp" style={{ fontSize: 18, fontWeight: 600 }}>Planned ahead</div>
        <button onClick={openNew} style={{ background: COLORS.accent, color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Target size={14} /> New</button>
      </div>
      <div style={{ fontSize: 12, color: COLORS.sub, marginBottom: 14 }}>Tip: when adding an expense, you can mark it as "counts toward" one of these — its "saved so far" updates automatically.</div>

      {sorted.length === 0 ? (
        <EmptyState text="Nothing planned yet — add a big upcoming expense like a trip, appliance, or wedding gift." />
      ) : sorted.map((p) => {
        const pct = p.targetAmount > 0 ? Math.min(100, (p.savedSoFar / p.targetAmount) * 100) : 0;
        return (
          <div key={p.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.title}</div>
                <div style={{ fontSize: 11, color: COLORS.sub, marginTop: 2 }}>Target: {monthLabel(p.targetMonth)}{p.notes ? ` · ${p.notes}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setForm(p)} style={iconBtn}><Pencil size={13} /></button>
                <button onClick={() => remove(p.id)} style={iconBtn}><Trash2 size={13} /></button>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, marginBottom: 4 }}>
              <span className="mono" style={{ fontSize: 12.5 }}>{inr(p.savedSoFar)} saved</span>
              <span className="mono" style={{ fontSize: 12.5, color: COLORS.sub }}>of {inr(p.targetAmount)}</span>
            </div>
            <div style={{ height: 5, background: COLORS.line, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: COLORS.accent }} /></div>
          </div>
        );
      })}

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,36,32,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 40 }} onClick={() => setForm(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 480, boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="disp" style={{ fontSize: 16, fontWeight: 600 }}>Plan a future expense</div>
              <button onClick={() => setForm(null)} style={iconBtn}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Goa trip" style={inputStyle} /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Target amount"><MoneyInput value={form.targetAmount} onChange={(v) => setForm({ ...form, targetAmount: v })} style={inputStyle} /></Field>
                <Field label="Saved so far"><MoneyInput value={form.savedSoFar} onChange={(v) => setForm({ ...form, savedSoFar: v })} style={inputStyle} /></Field>
              </div>
              <Field label="Target month"><input type="month" value={form.targetMonth} onChange={(e) => setForm({ ...form, targetMonth: e.target.value })} style={inputStyle} /></Field>
              <Field label="Notes (optional)"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inputStyle} /></Field>
            </div>
            <button onClick={submit} style={{ marginTop: 16, width: "100%", background: COLORS.accent, color: "white", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save plan</button>
          </div>
        </div>
      )}
    </div>
  );
}

function InvestmentsSection({ investments, onSave, userNames }) {
  const OWNERS = [...userNames, "Joint"];
  const [form, setForm] = useState(null);
  const [contribFor, setContribFor] = useState(null);
  const [contribForm, setContribForm] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const currentValue = (inv) => (Number(inv.startingValue) || 0) + (inv.contributions || []).reduce((s, c) => s + Number(c.amount), 0);

  const openNew = () => setForm({ id: uid(), name: "", type: INVESTMENT_TYPES[0], owner: userNames[0] || "Joint", startingValue: "", notes: "", existing: false });
  const openEdit = (inv) => setForm({ ...inv, startingValue: inv.startingValue || "", existing: true });
  const submitInvestment = () => {
    if (!form.name.trim()) return;
    const exists = investments.find((i) => i.id === form.id);
    if (exists) {
      onSave(investments.map((i) => (i.id === form.id ? { ...i, name: form.name, type: form.type, owner: form.owner, startingValue: Number(form.startingValue) || 0, notes: form.notes } : i)));
    } else {
      onSave([...investments, { id: form.id, name: form.name, type: form.type, owner: form.owner, startingValue: Number(form.startingValue) || 0, notes: form.notes, contributions: [] }]);
    }
    setForm(null);
  };
  const removeInvestment = (id) => onSave(investments.filter((i) => i.id !== id));

  const openContrib = (inv) => { setContribFor(inv.id); setContribForm({ amount: "", date: new Date().toISOString().slice(0, 10), by: userNames[0] || OWNERS[0], note: "" }); };
  const submitContrib = () => {
    if (!contribForm.amount) return;
    const c = { id: uid(), amount: Number(contribForm.amount), date: contribForm.date, by: contribForm.by, note: contribForm.note };
    onSave(investments.map((i) => (i.id === contribFor ? { ...i, contributions: [...(i.contributions || []), c] } : i)));
    setContribFor(null); setContribForm(null);
  };
  const removeContrib = (invId, cid) => onSave(investments.map((i) => (i.id === invId ? { ...i, contributions: (i.contributions || []).filter((c) => c.id !== cid) } : i)));

  const totalPortfolio = investments.reduce((s, inv) => s + currentValue(inv), 0);
  const byOwner = {};
  OWNERS.forEach((o) => (byOwner[o] = 0));
  investments.forEach((inv) => { byOwner[inv.owner] = (byOwner[inv.owner] || 0) + currentValue(inv); });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>{inr(totalPortfolio)}</div>
          <div style={{ fontSize: 11, color: COLORS.sub, marginTop: 2 }}>Total portfolio value</div>
        </div>
        <button onClick={openNew} style={{ background: COLORS.accent, color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><TrendingUp size={14} /> Add</button>
      </div>

      {investments.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {OWNERS.filter((o) => byOwner[o] > 0).map((o) => (
            <div key={o} style={{ background: COLORS.accentSoft, borderRadius: 20, padding: "5px 12px", fontSize: 12 }}>{o} · <span className="mono" style={{ fontWeight: 600 }}>{inr(byOwner[o])}</span></div>
          ))}
        </div>
      )}

      {investments.length === 0 ? (
        <EmptyState text="No investments tracked yet. Add one you already hold with its current value, or start a fresh SIP or fund from here." />
      ) : investments.map((inv) => {
        const value = currentValue(inv);
        const contribs = [...(inv.contributions || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
        const expanded = expandedId === inv.id;
        return (
          <div key={inv.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{inv.name}</div>
                <div style={{ fontSize: 11, color: COLORS.sub, marginTop: 2 }}>{inv.type} · {inv.owner}{inv.notes ? ` · ${inv.notes}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => openEdit(inv)} style={iconBtn}><Pencil size={13} /></button>
                <button onClick={() => removeInvestment(inv.id)} style={iconBtn}><Trash2 size={13} /></button>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 10 }}>
              <span className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{inr(value)}</span>
              <div style={{ display: "flex", gap: 10 }}>
                {contribs.length > 0 && (
                  <button onClick={() => setExpandedId(expanded ? null : inv.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: COLORS.sub, textDecoration: "underline" }}>
                    {expanded ? "Hide" : `${contribs.length} contribution${contribs.length > 1 ? "s" : ""}`}
                  </button>
                )}
                <button onClick={() => openContrib(inv)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: COLORS.accent, fontWeight: 600 }}>+ Add contribution</button>
              </div>
            </div>
            {expanded && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${COLORS.line}` }}>
                {contribs.map((c) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0", fontSize: 11.5, color: COLORS.sub }}>
                    <span>{c.date} · {c.by}{c.note ? ` · ${c.note}` : ""}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="mono">+{inr(c.amount)}</span>
                      <button onClick={() => removeContrib(inv.id, c.id)} style={{ ...iconBtn, padding: 2 }}><X size={11} /></button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,36,32,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 40 }} onClick={() => setForm(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 480, boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="disp" style={{ fontSize: 16, fontWeight: 600 }}>{form.existing ? "Edit investment" : "Add investment"}</div>
              <button onClick={() => setForm(null)} style={iconBtn}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. HDFC Flexicap SIP" style={inputStyle} /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Type">
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                    {INVESTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Owner">
                  <select value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} style={inputStyle}>
                    {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Current value (if you already hold this)"><MoneyInput value={form.startingValue} onChange={(v) => setForm({ ...form, startingValue: v })} placeholder="0 if starting fresh" style={inputStyle} /></Field>
              <Field label="Notes (optional)"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inputStyle} /></Field>
            </div>
            <div style={{ fontSize: 11, color: COLORS.sub, marginTop: 8 }}>Already investing in this? Enter what it's worth today as the current value — you don't need to log its past contributions.</div>
            <button onClick={submitInvestment} style={{ marginTop: 14, width: "100%", background: COLORS.accent, color: "white", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save investment</button>
          </div>
        </div>
      )}

      {contribFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,36,32,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 40 }} onClick={() => setContribFor(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "16px 16px 0 0", padding: 20, width: "100%", maxWidth: 480, boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="disp" style={{ fontSize: 16, fontWeight: 600 }}>Add contribution</div>
              <button onClick={() => setContribFor(null)} style={iconBtn}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Amount"><MoneyInput value={contribForm.amount} onChange={(v) => setContribForm({ ...contribForm, amount: v })} style={inputStyle} /></Field>
                <Field label="Date"><input type="date" value={contribForm.date} onChange={(e) => setContribForm({ ...contribForm, date: e.target.value })} style={inputStyle} /></Field>
              </div>
              <Field label="Paid by">
                <select value={contribForm.by} onChange={(e) => setContribForm({ ...contribForm, by: e.target.value })} style={inputStyle}>
                  {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Note (optional)"><input value={contribForm.note} onChange={(e) => setContribForm({ ...contribForm, note: e.target.value })} style={inputStyle} /></Field>
            </div>
            <button onClick={submitContrib} style={{ marginTop: 14, width: "100%", background: COLORS.accent, color: "white", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save contribution</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Bottom nav ---------------- */
function BottomNav({ tab, setTab }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "add", label: "Add", icon: PlusCircle },
    { id: "budgets", label: "Budgets", icon: Wallet },
    { id: "history", label: "History", icon: HistoryIcon },
    { id: "plan", label: "Plan", icon: Target },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: COLORS.card, borderTop: `1px solid ${COLORS.line}`, zIndex: 30 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex" }}>
        {items.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, background: "none", border: "none", padding: "9px 0 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: tab === id ? COLORS.accent : COLORS.sub }}>
            <Icon size={19} strokeWidth={tab === id ? 2.3 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: tab === id ? 600 : 400 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
