import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine
} from "recharts";

// ─────────────────────────────────────────────────────────────
// CONFIG — paste your values here after following README steps
// ─────────────────────────────────────────────────────────────
const SHEET_ID = "https://docs.google.com/spreadsheets/d/1toTdeZuB2rKruSKA-89gcrbdGrDArs37/edit?usp=sharing&ouid=105810007740410412689&rtpof=true&sd=true";
const API_KEY  = "AIzaSyACsm6yTKFg56gBK99MRJZbfHj4Fbrhgsc";
const USING_LIVE_DATA = SHEET_ID !== "YOUR_SPREADSHEET_ID_HERE";

// ─────────────────────────────────────────────────────────────

const GOLD = "#C9A84C", GOLD_L = "#E8C97A", DARK = "#0A0A0B";
const CARD = "#111113", BORDER = "#1E1E22", TEXT = "#F0EDE8";
const MUTED = "#6B6860", GREEN = "#4CAF7C", RED = "#E05C5C";

// Mock data fallback
const MOCK = {
  fund: { name: "Alcott Capital Fund III", vintage: 2021, size: 250, irr: 28, moic: 2.4, dpi: 0.64, dryPowder: 38 },
  portfolio: [
    { name: "Meridian Labs",   sector: "SaaS",          invested: 18, ownership: "22%", moic: 3.4, status: "Active",  currentVal: 102 },
    { name: "Kova Financial",  sector: "FinTech",        invested: 24, ownership: "31%", moic: 2.1, status: "Active",  currentVal: 82  },
    { name: "Apex Supply Co",  sector: "Supply Chain",   invested: 12, ownership: "18%", moic: 1.6, status: "Active",  currentVal: 48  },
    { name: "Helix Health",    sector: "HealthTech",     invested: 31, ownership: "27%", moic: 4.2, status: "Active",  currentVal: 188 },
    { name: "Canopy Systems",  sector: "SaaS",           invested:  9, ownership: "15%", moic: 0.9, status: "Watch",   currentVal: 22  },
  ],
  pipeline: [
    { name: "Vertex Analytics",   sector: "SaaS",         stage: "Diligence", size: 22 },
    { name: "BluePath Logistics", sector: "Supply Chain", stage: "Screening", size: 15 },
    { name: "Nimbus Pay",         sector: "FinTech",      stage: "LOI",       size: 40 },
    { name: "Orion Medical",      sector: "HealthTech",   stage: "Screening", size: 28 },
    { name: "Cascade Data",       sector: "SaaS",         stage: "Closed",    size: 18 },
  ],
  cashFlows: [
    { year: "2021", calls: -52, dist: 0 },
    { year: "2022", calls: -38, dist: 8  },
    { year: "2023", calls: -24, dist: 31 },
    { year: "2024", calls: -10, dist: 58 },
  ],
  jcurve: [
    { q:"Q1'21",nav:-12},{q:"Q2'21",nav:-28},{q:"Q3'21",nav:-38},{q:"Q4'21",nav:-31},
    {q:"Q1'22",nav:-18},{q:"Q2'22",nav:-8},{q:"Q3'22",nav:14},{q:"Q4'22",nav:32},
    {q:"Q1'23",nav:51},{q:"Q2'23",nav:68},{q:"Q3'23",nav:79},{q:"Q4'23",nav:94},
    {q:"Q1'24",nav:112},{q:"Q2'24",nav:128},{q:"Q3'24",nav:141},{q:"Q4'24",nav:158},
  ],
};

async function fetchSheet(sheetName, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetName}!${range}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const data = await res.json();
  return data.values || [];
}

async function loadLiveData() {
  const [portfolioRows, pipelineRows, cfRows, fundRows] = await Promise.all([
    fetchSheet("Portfolio", "A4:L50"),
    fetchSheet("Pipeline",  "A3:H30"),
    fetchSheet("CashFlows", "A3:E30"),
    fetchSheet("Fund",      "B4:B18"),
  ]);

  const portfolio = portfolioRows.filter(r => r[0]).map(r => ({
    name:       r[0] || "",
    sector:     r[1] || "",
    invested:   parseFloat(r[4]) || 0,
    ownership:  r[5] || "",
    currentVal: parseFloat(r[6]) || 0,
    realized:   parseFloat(r[7]) || 0,
    moic:       parseFloat(r[10]) || 0,
    status:     r[11] || "Active",
  }));

  const pipeline = pipelineRows.filter(r => r[0]).map(r => ({
    name:   r[0] || "",
    sector: r[1] || "",
    stage:  r[2] || "",
    size:   parseFloat(r[3]) || 0,
  }));

  // Group cash flows by year
  const cfByYear = {};
  cfRows.filter(r => r[0]).forEach(r => {
    const year = r[0]?.split("-")[0] || r[4]?.split(" ")[1] || "?";
    const amount = parseFloat(r[2]) || 0;
    if (!cfByYear[year]) cfByYear[year] = { year, calls: 0, dist: 0 };
    if (amount < 0) cfByYear[year].calls += amount;
    else cfByYear[year].dist += amount;
  });
  const cashFlows = Object.values(cfByYear).sort((a,b) => a.year.localeCompare(b.year));

  const totalInvested = portfolio.reduce((s, c) => s + c.invested, 0);
  const totalCurrent  = portfolio.reduce((s, c) => s + c.currentVal + c.realized, 0);
  const fundSize      = parseFloat(fundRows[2]?.[0]) || 250;
  const moic          = totalInvested > 0 ? (totalCurrent / totalInvested) : 0;
  const dryPowder     = fundSize - totalInvested;
  const irrRaw        = parseFloat(fundRows[11]?.[0]);
  const irr           = isNaN(irrRaw) ? null : irrRaw;

  return {
    fund: {
      name:      fundRows[0]?.[0] || "Fund",
      vintage:   parseInt(fundRows[1]?.[0]) || 2021,
      size:      fundSize,
      irr:       irr || 28,
      moic:      parseFloat(moic.toFixed(1)),
      dpi:       0.64,
      dryPowder: parseFloat(dryPowder.toFixed(1)),
    },
    portfolio,
    pipeline,
    cashFlows,
    jcurve: MOCK.jcurve,
  };
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=DM+Mono:wght@300;400&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.sb{position:fixed;top:0;left:0;width:210px;height:100vh;background:#0D0D0F;border-right:1px solid ${BORDER};display:flex;flex-direction:column;padding:28px 0;z-index:100}
.logo{padding:0 24px 32px;border-bottom:1px solid ${BORDER};margin-bottom:28px}
.logo-name{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:500;color:${TEXT};letter-spacing:.05em}
.logo-sub{font-size:9px;color:${GOLD};letter-spacing:.25em;text-transform:uppercase;margin-top:4px}
.nav{display:flex;align-items:center;gap:10px;padding:10px 24px;cursor:pointer;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${MUTED};transition:all .2s;border:none;background:none;width:100%;text-align:left;border-left:2px solid transparent;font-family:'DM Mono',monospace}
.nav:hover{color:${TEXT};background:rgba(201,168,76,.04)}
.nav.on{color:${GOLD};border-left-color:${GOLD};background:rgba(201,168,76,.06)}
.dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0}
.main{margin-left:210px;padding:36px 44px;font-family:'DM Mono',monospace;min-height:100vh;background:${DARK}}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
.ptitle{font-family:'Cormorant Garamond',serif;font-size:40px;font-weight:300;color:${TEXT};letter-spacing:-.01em;line-height:1}
.pdate{font-size:9px;color:${MUTED};letter-spacing:.15em;margin-top:6px}
.badge{background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.25);padding:7px 14px;font-size:9px;color:${GOLD};letter-spacing:.2em;text-transform:uppercase}
.divl{width:28px;height:1px;background:${GOLD};margin:6px 0 14px}
.mg{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
.mc{background:${CARD};border:1px solid ${BORDER};padding:24px;position:relative;overflow:hidden;transition:border-color .2s}
.mc:hover{border-color:rgba(201,168,76,.3)}
.mc::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${GOLD},transparent);opacity:0;transition:opacity .3s}
.mc:hover::before{opacity:1}
.ml{font-size:9px;color:${MUTED};letter-spacing:.2em;text-transform:uppercase;margin-bottom:14px}
.mv{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:400;color:${TEXT};line-height:1}
.mu{font-size:13px;color:${MUTED};margin-left:2px}
.mch{font-size:9px;margin-top:10px;display:flex;align-items:center;gap:5px}
.cg{display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:28px}
.cc{background:${CARD};border:1px solid ${BORDER};padding:28px}
.ct{font-size:9px;color:${MUTED};letter-spacing:.2em;text-transform:uppercase;margin-bottom:24px}
.bg{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.pt{width:100%;border-collapse:collapse}
.pt th{font-size:8px;color:${MUTED};letter-spacing:.2em;text-transform:uppercase;text-align:left;padding:0 0 14px;border-bottom:1px solid ${BORDER}}
.pt td{padding:13px 0;font-size:11px;border-bottom:1px solid rgba(30,30,34,.6);vertical-align:middle}
.pt tr:last-child td{border-bottom:none}
.pt tr:hover td{color:${GOLD_L}}
.cn{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:500}
.sb2{font-size:8px;letter-spacing:.12em;text-transform:uppercase;padding:2px 7px;border:1px solid ${BORDER};color:${MUTED};display:inline-block;margin-top:3px}
.pi{padding:14px 0;border-bottom:1px solid rgba(30,30,34,.6);display:flex;align-items:center;gap:14px}
.pi:last-child{border-bottom:none}
.ps{font-size:8px;letter-spacing:.18em;text-transform:uppercase;padding:3px 10px;flex-shrink:0;min-width:76px;text-align:center}
.pn{font-family:'Cormorant Garamond',serif;font-size:15px;flex:1}
.psz{font-size:10px;color:${MUTED};text-align:right}
.live-banner{background:rgba(76,175,124,.08);border:1px solid rgba(76,175,124,.2);padding:8px 16px;margin-bottom:20px;font-size:10px;color:${GREEN};letter-spacing:.1em;display:flex;align-items:center;gap:8px}
.mock-banner{background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.15);padding:8px 16px;margin-bottom:20px;font-size:10px;color:${GOLD};letter-spacing:.08em}
.loading{display:flex;align-items:center;justify-content:center;height:60vh;font-family:'Cormorant Garamond',serif;font-size:28px;color:${MUTED}}
.err{background:rgba(224,92,92,.08);border:1px solid rgba(224,92,92,.2);padding:12px 16px;margin-bottom:20px;font-size:10px;color:${RED}}
`;

const Tip = ({ active, payload, label }) => active && payload?.length ? (
  <div style={{ background:"#16161A", border:`1px solid ${BORDER}`, padding:"10px 14px", fontSize:11, color:TEXT }}>
    <div style={{ color:MUTED, fontSize:9, letterSpacing:"0.15em", marginBottom:5 }}>{label}</div>
    {payload.map((p,i) => <div key={i} style={{ color: p.color || GOLD }}>{p.name}: {p.value}</div>)}
  </div>
) : null;

const STAGE_STYLE = {
  Screening: { bg:"rgba(107,104,96,.2)", color:MUTED },
  Diligence: { bg:"rgba(201,168,76,.15)", color:GOLD },
  LOI:       { bg:"rgba(76,175,124,.15)", color:GREEN },
  Closed:    { bg:"rgba(76,175,124,.25)", color:GREEN },
};

const SECTOR_COLORS = ["#C9A84C","#7A9E8C","#8C7A9E","#9E8C7A","#4A4A52","#6A8C7A"];

export default function App() {
  const [tab, setTab]     = useState("Overview");
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (USING_LIVE_DATA) {
      loadLiveData()
        .then(d => { setData(d); setIsLive(true); setLoading(false); })
        .catch(e => { setError(e.message); setData(MOCK); setLoading(false); });
    } else {
      setTimeout(() => { setData(MOCK); setLoading(false); }, 400);
    }
  }, []);

  if (loading) return <><style>{css}</style><div className="loading" style={{background:DARK}}>Loading fund data…</div></>;

  const { fund, portfolio, pipeline, cashFlows, jcurve } = data;

  // Build sector breakdown from portfolio
  const sectorMap = {};
  portfolio.forEach(c => {
    sectorMap[c.sector] = (sectorMap[c.sector] || 0) + c.invested;
  });
  const totalInv = Object.values(sectorMap).reduce((a,b) => a+b, 0);
  const sectors = Object.entries(sectorMap).map(([name, val], i) => ({
    name, value: Math.round((val / totalInv) * 100), color: SECTOR_COLORS[i % SECTOR_COLORS.length]
  }));

  const navItems = ["Overview", "Portfolio", "Deal Flow", "Cash Flows"];

  return (
    <>
      <style>{css}</style>
      <div style={{ display:"flex", background:DARK, minHeight:"100vh" }}>

        {/* Sidebar */}
        <div className="sb">
          <div className="logo">
            <div className="logo-name">{fund.name.split(" Fund")[0].split(" ").slice(0,-1).join("\n") || fund.name}<br/>{fund.name.split(" ").slice(-2).join(" ")}</div>
            <div className="logo-sub">Fund · {fund.vintage}</div>
          </div>
          {navItems.map(n => (
            <button key={n} className={`nav ${tab===n?"on":""}`} onClick={() => setTab(n)}>
              <div className="dot"/>{n}
            </button>
          ))}
          <div style={{ marginTop:"auto", padding:"0 24px" }}>
            <div style={{ fontSize:9, color:MUTED, letterSpacing:".15em", marginBottom:7 }}>DATA SOURCE</div>
            <div style={{ fontSize:10, color: isLive ? GREEN : GOLD, marginBottom:3 }}>
              {isLive ? "● Live — Google Sheets" : "● Demo Data"}
            </div>
            <div style={{ fontSize:9, color:MUTED }}>${fund.size}M committed</div>
          </div>
        </div>

        {/* Main */}
        <div className="main">

          {/* Banners */}
          {error && <div className="err">⚠ Sheets API error: {error} — showing demo data</div>}
          {isLive && <div className="live-banner">● LIVE DATA — synced from Google Sheets</div>}
          {!isLive && !error && (
            <div className="mock-banner">
              Demo mode — add your SHEET_ID and API_KEY to the CONFIG section to connect live data.
              Download the Excel template and upload it to Google Sheets to get started.
            </div>
          )}

          {/* Header */}
          <div className="hdr">
            <div>
              <div className="ptitle">{tab}</div>
              <div className="divl"/>
              <div className="pdate">AS OF Q4 2024 · MARCH 2026</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:7 }}>
              <div className="badge">{fund.name}</div>
              <div style={{ fontSize:9, color:MUTED, letterSpacing:".15em" }}>${fund.size}M COMMITTED CAPITAL</div>
            </div>
          </div>

          {/* OVERVIEW TAB */}
          {tab === "Overview" && <>
            {/* KPIs */}
            <div className="mg">
              {[
                { label:"Net IRR",     value:fund.irr,        unit:"%",  note:"vs. 8% hurdle",          up:true },
                { label:"Gross MOIC",  value:fund.moic,       unit:"×",  note:"Unrealized component",   up:true },
                { label:"DPI",         value:fund.dpi,        unit:"×",  note:`$${Math.round(fund.dpi * fund.size)}M distributed`, up:null },
                { label:"Dry Powder",  value:`$${fund.dryPowder}`, unit:"M", note:`${Math.round(fund.dryPowder/fund.size*100)}% of fund`, up:null },
              ].map((m,i) => (
                <div className="mc" key={i}>
                  <div className="ml">{m.label}</div>
                  <div className="mv">{m.value}<span className="mu">{m.unit}</span></div>
                  <div className="mch">
                    {m.up !== null && <span style={{ color: m.up ? GREEN : RED }}>{m.up?"▲":"▼"}</span>}
                    <span style={{ color: m.up===true ? GREEN : m.up===false ? RED : MUTED }}>{m.note}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="cg">
              <div className="cc">
                <div className="ct">NAV Performance · J-Curve</div>
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={jcurve} margin={{ top:0, right:0, left:-22, bottom:0 }}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GOLD} stopOpacity={.2}/>
                        <stop offset="95%" stopColor={GOLD} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={BORDER} strokeDasharray="0" vertical={false}/>
                    <XAxis dataKey="q" tick={{ fill:MUTED, fontSize:8, letterSpacing:2 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:MUTED, fontSize:8 }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<Tip/>}/>
                    <ReferenceLine y={0} stroke={BORDER}/>
                    <Area type="monotone" dataKey="nav" stroke={GOLD} strokeWidth={1.5} fill="url(#g)" name="NAV Index" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="cc">
                <div className="ct">Sector Allocation</div>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={sectors} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                      {sectors.map((s,i) => <Cell key={i} fill={s.color}/>)}
                    </Pie>
                    <Tooltip content={<Tip/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:8 }}>
                  {sectors.map((s,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ width:5, height:5, background:s.color, borderRadius:1 }}/>
                        <span style={{ fontSize:9, color:MUTED, letterSpacing:".1em" }}>{s.name}</span>
                      </div>
                      <span style={{ fontSize:9, color:TEXT }}>{s.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom */}
            <div className="bg">
              <div className="cc">
                <div className="ct">Portfolio Companies</div>
                <table className="pt">
                  <thead><tr>
                    <th>Company</th><th>Invested</th><th>Own</th><th style={{textAlign:"right"}}>MOIC</th>
                  </tr></thead>
                  <tbody>
                    {portfolio.map((co,i) => (
                      <tr key={i} style={{ cursor:"pointer" }}>
                        <td><div className="cn">{co.name}</div><span className="sb2">{co.sector}</span></td>
                        <td style={{ color:MUTED, fontSize:11 }}>${co.invested}M</td>
                        <td style={{ color:MUTED, fontSize:11 }}>{co.ownership}</td>
                        <td style={{ textAlign:"right" }}>
                          <span style={{ color: co.moic >= 2 ? GREEN : co.moic < 1 ? RED : MUTED, fontSize:12 }}>
                            {co.moic.toFixed(1)}×
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="cc">
                <div className="ct">Deal Pipeline</div>
                {pipeline.slice(0,5).map((d,i) => {
                  const s = STAGE_STYLE[d.stage] || STAGE_STYLE.Screening;
                  return (
                    <div className="pi" key={i}>
                      <div className="ps" style={{ background:s.bg, color:s.color }}>{d.stage}</div>
                      <div><div className="pn">{d.name}</div><div style={{ fontSize:8, color:MUTED, letterSpacing:".15em", marginTop:2 }}>{d.sector}</div></div>
                      <div className="psz">${d.size}M</div>
                    </div>
                  );
                })}
                <div style={{ marginTop:20, paddingTop:18, borderTop:`1px solid ${BORDER}` }}>
                  <div className="ct">Capital Calls & Distributions ($M)</div>
                  <ResponsiveContainer width="100%" height={105}>
                    <BarChart data={cashFlows} barSize={14} margin={{ left:-32 }}>
                      <CartesianGrid stroke={BORDER} strokeDasharray="0" vertical={false}/>
                      <XAxis dataKey="year" tick={{ fill:MUTED, fontSize:8 }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fill:MUTED, fontSize:8 }} axisLine={false} tickLine={false}/>
                      <Tooltip content={<Tip/>}/>
                      <Bar dataKey="calls" fill={RED} opacity={.7} name="Calls ($M)"/>
                      <Bar dataKey="dist"  fill={GREEN} opacity={.8} name="Dist. ($M)"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>}

          {/* PORTFOLIO TAB */}
          {tab === "Portfolio" && (
            <div className="cc">
              <div className="ct">All Portfolio Companies</div>
              <table className="pt">
                <thead><tr>
                  <th>Company</th><th>Sector</th><th>Invested</th>
                  <th>Current Val</th><th>Ownership</th>
                  <th style={{textAlign:"right"}}>MOIC</th><th style={{textAlign:"center"}}>Status</th>
                </tr></thead>
                <tbody>
                  {portfolio.map((co,i) => (
                    <tr key={i}>
                      <td><div className="cn">{co.name}</div></td>
                      <td><span className="sb2">{co.sector}</span></td>
                      <td style={{ color:MUTED, fontSize:11 }}>${co.invested}M</td>
                      <td style={{ fontSize:11 }}>${co.currentVal}M</td>
                      <td style={{ color:MUTED, fontSize:11 }}>{co.ownership}</td>
                      <td style={{ textAlign:"right", color: co.moic >= 2 ? GREEN : co.moic < 1 ? RED : MUTED, fontSize:12 }}>
                        {co.moic.toFixed(1)}×
                      </td>
                      <td style={{ textAlign:"center" }}>
                        <span style={{ fontSize:8, letterSpacing:".15em", padding:"3px 8px",
                          background: co.status==="Active" ? "rgba(76,175,124,.12)" : "rgba(201,168,76,.12)",
                          color: co.status==="Active" ? GREEN : GOLD }}>
                          {co.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* DEAL FLOW TAB */}
          {tab === "Deal Flow" && (
            <div className="cc">
              <div className="ct">Active Deal Pipeline</div>
              {["Closed","LOI","Diligence","Screening"].map(stage => {
                const deals = pipeline.filter(d => d.stage === stage);
                if (!deals.length) return null;
                const s = STAGE_STYLE[stage] || STAGE_STYLE.Screening;
                return (
                  <div key={stage} style={{ marginBottom:28 }}>
                    <div style={{ fontSize:9, color:s.color, letterSpacing:".2em", marginBottom:12,
                      textTransform:"uppercase", borderBottom:`1px solid ${BORDER}`, paddingBottom:8 }}>
                      {stage} · {deals.length} deal{deals.length!==1?"s":""}
                    </div>
                    {deals.map((d,i) => (
                      <div className="pi" key={i}>
                        <div><div className="pn">{d.name}</div>
                          <div style={{ fontSize:8, color:MUTED, letterSpacing:".15em", marginTop:2 }}>{d.sector}</div>
                        </div>
                        <div className="psz">${d.size}M target</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* CASH FLOWS TAB */}
          {tab === "Cash Flows" && (
            <div className="cc">
              <div className="ct">Capital Calls & Distributions by Year</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cashFlows} barSize={24} margin={{ left:-20 }}>
                  <CartesianGrid stroke={BORDER} strokeDasharray="0" vertical={false}/>
                  <XAxis dataKey="year" tick={{ fill:MUTED, fontSize:9 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:MUTED, fontSize:9 }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<Tip/>}/>
                  <ReferenceLine y={0} stroke={BORDER}/>
                  <Bar dataKey="calls" fill={RED} opacity={.75} name="Capital Calls ($M)"/>
                  <Bar dataKey="dist"  fill={GREEN} opacity={.8}  name="Distributions ($M)"/>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginTop:28 }}>
                {[
                  { label:"Total Called",       value:`$${Math.abs(cashFlows.reduce((s,r)=>s+r.calls,0)).toFixed(0)}M` },
                  { label:"Total Distributed",  value:`$${cashFlows.reduce((s,r)=>s+r.dist,0).toFixed(0)}M` },
                  { label:"DPI",                value:`${fund.dpi}×` },
                ].map((m,i) => (
                  <div className="mc" key={i}>
                    <div className="ml">{m.label}</div>
                    <div className="mv" style={{ fontSize:26 }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
