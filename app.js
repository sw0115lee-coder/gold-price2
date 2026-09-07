// 금·은·동 PWA - 클라이언트 로직
const TROY_OZT_PER_TONNE = 32150.7466; // 1 tonne = 32,150.75 troy oz

// 과거 월별 근사 추정치 (차트 배경 + 동 최신값 폴백)
const HIST = [
  {m:"2025-01",gold:2624,silver:30,copper:8818},
  {m:"2025-02",gold:2830,silver:32,copper:9200},
  {m:"2025-03",gold:3050,silver:33,copper:9500},
  {m:"2025-04",gold:3300,silver:33,copper:9300},
  {m:"2025-05",gold:3250,silver:34,copper:9500},
  {m:"2025-06",gold:3350,silver:36,copper:9800},
  {m:"2025-07",gold:3350,silver:38,copper:9900},
  {m:"2025-08",gold:3600,silver:39,copper:9950},
  {m:"2025-09",gold:3800,silver:41,copper:10126},
  {m:"2025-10",gold:4050,silver:48,copper:11200},
  {m:"2025-11",gold:4200,silver:56,copper:10850},
  {m:"2025-12",gold:4400,silver:75,copper:11771},
  {m:"2026-01",gold:4865,silver:110,copper:12500},
  {m:"2026-02",gold:5000,silver:95,copper:12700},
  {m:"2026-03",gold:4400,silver:85,copper:12800},
  {m:"2026-04",gold:4300,silver:80,copper:12841},
  {m:"2026-05",gold:4400,silver:77,copper:12841},
  {m:"2026-06",gold:4500,silver:75,copper:12900},
  {m:"2026-07",gold:4600,silver:66,copper:12986},
  {m:"2026-08",gold:4700,silver:66,copper:12800},
  {m:"2026-09",gold:4800,silver:66,copper:12842},
];
const COPPER_EST = HIST[HIST.length-1].copper; // 동 추정치

const fmt = (n,d=0)=>Number(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
const $ = id => document.getElementById(id);
let LIVE = {gold:null, silver:null, copper:COPPER_EST, ok:false};

async function fetchPrice(sym){
  const r = await fetch(`https://api.gold-api.com/price/${sym}`, {cache:"no-store"});
  if(!r.ok) throw new Error("HTTP "+r.status);
  const j = await r.json();
  return {price:+j.price, updated:j.updatedAt};
}

async function refresh(){
  const btn = $("refreshBtn"); btn.classList.add("spin");
  $("gSt").textContent="…"; $("sSt").textContent="…";
  let updated=null, ok=false;
  try{
    const [g,s] = await Promise.all([fetchPrice("XAU"), fetchPrice("XAG")]);
    LIVE.gold=+g.price.toFixed(2); LIVE.silver=+s.price.toFixed(2); updated=g.updated; ok=true;
    setStatus("gSt","실시간",true); setStatus("sSt","실시간",true);
  }catch(e){
    // 실패 시 최신 추정치 폴백
    LIVE.gold=HIST[HIST.length-1].gold; LIVE.silver=HIST[HIST.length-1].silver;
    setStatus("gSt","추정치(오프라인)",false); setStatus("sSt","추정치(오프라인)",false);
  }
  LIVE.copper=COPPER_EST; setStatus("cSt","추정치",false);
  LIVE.ok=ok;
  render(updated);
  btn.classList.remove("spin");
}
function setStatus(id,txt,ok){ const el=$(id); el.textContent=txt; el.className="st "+(ok?"ok":"est"); }

function render(updated){
  $("gVal").textContent="$"+fmt(LIVE.gold,2);
  $("sVal").textContent="$"+fmt(LIVE.silver,2);
  $("cVal").textContent="$"+fmt(LIVE.copper,0);
  // 환산
  $("gOz").textContent="$"+fmt(LIVE.gold,2)+" / oz";
  $("gT").textContent="→ $"+fmt(LIVE.gold*TROY_OZT_PER_TONNE,0)+" / 톤";
  $("sOz").textContent="$"+fmt(LIVE.silver,2)+" / oz";
  $("sT").textContent="→ $"+fmt(LIVE.silver*TROY_OZT_PER_TONNE,0)+" / 톤";
  $("cT").textContent="$"+fmt(LIVE.copper,0)+" / 톤";
  $("cOz").textContent="→ $"+fmt(LIVE.copper/TROY_OZT_PER_TONNE,4)+" / oz";
  // 배지 + 시각
  const badge=$("liveBadge");
  if(LIVE.ok){ badge.textContent="● LIVE"; badge.className="live-badge"; }
  else{ badge.textContent="● 오프라인"; badge.className="live-badge off"; }
  const t = updated ? new Date(updated) : new Date();
  const ts = t.toLocaleString("ko-KR",{dateStyle:"medium",timeStyle:"short"});
  $("updated").textContent = (LIVE.ok?"실시간 조회: ":"마지막 시도: ")+ts;
  $("foot").textContent = "업데이트 "+ts;
  buildTable();
}

// ── 데이터(오늘 포함) ─────────────────────────────
function fullData(){
  const today = new Date().toISOString().slice(0,10);
  return HIST.concat([{m:today,gold:LIVE.gold,silver:LIVE.silver,copper:LIVE.copper,today:true}]);
}
function buildTable(){
  const tb=$("tbody"); tb.innerHTML="";
  fullData().forEach(d=>{
    const tr=document.createElement("tr");
    if(d.today) tr.className="today-row";
    tr.innerHTML=`<td>${d.today?d.m+" (오늘)":d.m}</td>
      <td class="g">$${fmt(d.gold)}</td><td class="s">$${Number(d.silver).toFixed(2)}</td><td class="c">$${fmt(d.copper)}</td>`;
    tb.appendChild(tr);
  });
}

// ── 차트 (탭 전환) ─────────────────────────────
let chart=null, curKey="gold";
const COLORS={gold:"#d4af37",silver:"#9aa0a6",copper:"#b87333"};
function drawChart(key){
  curKey=key;
  const data=fullData();
  const labels=data.map(d=>d.m);
  const opt=(unit)=>({responsive:true,plugins:{legend:{display:key==="norm"},tooltip:{callbacks:{label:c=>` ${unit}${c.parsed.y.toLocaleString()}`}}},
    scales:{x:{ticks:{color:"#9aa0a6",maxRotation:60,minRotation:60,font:{size:9},autoSkip:true,maxTicksLimit:8},grid:{color:"#2a2e37"}},
      y:{ticks:{color:"#9aa0a6",font:{size:10}},grid:{color:"#2a2e37"}}}});
  const line=(c)=>({borderColor:c,backgroundColor:c+"22",fill:key!=="norm",tension:.3,pointRadius:2,borderWidth:2});
  let ds, options;
  if(key==="norm"){
    const base=data[0], nz=k=>data.map(d=>+(d[k]/base[k]*100).toFixed(1));
    ds=[{label:"금",data:nz("gold"),...line(COLORS.gold),fill:false},
        {label:"은",data:nz("silver"),...line(COLORS.silver),fill:false},
        {label:"동",data:nz("copper"),...line(COLORS.copper),fill:false}];
    options=opt("");
    options.plugins.legend.labels={color:"#e6e8eb"};
  }else{
    ds=[{data:data.map(d=>d[key]),...line(COLORS[key])}];
    options=opt("$");
  }
  if(chart) chart.destroy();
  chart=new Chart($("chart"),{type:"line",data:{labels,datasets:ds},options});
}
document.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  t.classList.add("active"); drawChart(t.dataset.k);
}));

// ── 다운로드 ─────────────────────────────
function dl(content,filename,type){
  const blob=new Blob(["﻿"+content],{type});const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(url);
}
function downloadCSV(){
  const today=new Date().toISOString().slice(0,10);
  const h="월,금(USD/oz),은(USD/oz),동(USD/톤)";
  const rows=fullData().map(d=>`${d.today?d.m+" (오늘)":d.m},${d.gold},${d.silver},${d.copper}`);
  dl([h,...rows].join("\r\n"),`금은동_${today}.csv`,"text/csv;charset=utf-8");
}
function downloadJSON(){
  const today=new Date().toISOString().slice(0,10);
  dl(JSON.stringify({title:"금·은·동 시세",date:today,live:LIVE,data:fullData()},null,2),`금은동_${today}.json`,"application/json");
}

// ── PWA 설치 ─────────────────────────────
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); deferredPrompt=e; $("installBar").classList.add("show"); });
$("installBtn").addEventListener("click",async()=>{
  if(!deferredPrompt) return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice;
  deferredPrompt=null; $("installBar").classList.remove("show");
});
window.addEventListener("appinstalled",()=>$("installBar").classList.remove("show"));

// ── Service Worker ─────────────────────────────
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}

// ── 시작 ─────────────────────────────
$("refreshBtn").addEventListener("click",refresh);
(async()=>{ await refresh(); drawChart("gold"); })();
setInterval(refresh, 60000); // 60초마다 자동 갱신
