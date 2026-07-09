:root {
  --bg: #f6f8fb;          /* cool white page */
  --bg-2: #ffffff;         /* sidebar / raised */
  --panel: #ffffff;        /* cards */
  --panel-2: #eef2f8;      /* hover / inset */
  --line: #dde4ee;         /* hairline borders */
  --ink: #131a24;          /* primary text */
  --ink-soft: #55606f;     /* secondary text */
  --ink-faint: #909aa8;    /* muted text */
  --gold: #1f5fbf;         /* primary blue (var name kept for compatibility) */
  --gold-soft: #1c56ac;    /* blue text on light */
  --green: #2f9463;
  --red: #c0473f;
  --shadow: 0 1px 2px rgba(19,26,36,.04), 0 6px 20px rgba(19,26,36,.06);
  --shadow-lg: 0 8px 40px rgba(19,26,36,.14);
  --radius: 12px;
  --serif: 'Cormorant Garamond', 'Georgia', serif;
  --sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
  line-height: 1.5;
}
a { color: inherit; }
button { font-family: inherit; cursor: pointer; }
input, textarea, select { font-family: inherit; }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: #c6d0de; border-radius: 20px; }
::-webkit-scrollbar-track { background: transparent; }

.serif { font-family: var(--serif); }

/* ── Auth screens ── */
.auth-wrap {
  min-height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
}
@media (max-width: 900px) { .auth-wrap { grid-template-columns: 1fr; } }

.auth-visual {
  position: relative;
  background: #0a0c10;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
}
@media (max-width: 900px) { .auth-visual { display: none; } }
.auth-visual img.bg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; opacity: 0.5;
  filter: saturate(0.9) contrast(1.05);
}
.auth-visual::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(10,12,16,.45) 0%, rgba(10,12,16,.75) 55%, rgba(10,12,16,.98) 100%);
}
.auth-visual .caption {
  position: relative; z-index: 2; padding: 56px; max-width: 460px;
}
.auth-visual .caption h2 {
  font-family: var(--serif); font-weight: 500; font-size: 40px; line-height: 1.1;
  letter-spacing: .3px; color: #ffffff;
}
.auth-visual .caption p { color: rgba(255,255,255,.85); margin-top: 16px; font-size: 15px; }
.auth-visual .caption .rule { width: 46px; height: 2px; background: var(--gold); margin: 26px 0; }

.auth-form-side {
  display: flex; align-items: center; justify-content: center; padding: 40px 28px;
  background:
    radial-gradient(1000px 600px at 80% -10%, rgba(31,95,191,.06), transparent 60%),
    var(--bg);
}
.auth-card { width: 100%; max-width: 400px; }
.brand-mark { display: flex; flex-direction: column; align-items: center; margin-bottom: 30px; }
.brand-mark img { width: 92px; height: auto; }
.brand-mark .sub {
  margin-top: 10px; font-size: 11px; letter-spacing: 5px; text-transform: uppercase; color: var(--gold-soft);
}
.auth-card h1 { font-family: var(--serif); font-weight: 500; font-size: 30px; text-align: center; }
.auth-card .lead { text-align: center; color: var(--ink-soft); font-size: 14px; margin-top: 6px; margin-bottom: 26px; }

.field { margin-bottom: 15px; }
.field label { display: block; font-size: 12px; color: var(--ink-soft); margin-bottom: 7px; letter-spacing: .3px; }
.field input {
  width: 100%; background: var(--panel); border: 1px solid var(--line); color: var(--ink);
  padding: 12px 14px; border-radius: 9px; font-size: 14px; transition: border-color .15s, box-shadow .15s;
}
.field input:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 3px rgba(31,95,191,.12); }

.btn {
  width: 100%; background: var(--gold); color: #fff; border: none; font-weight: 600;
  padding: 13px; border-radius: 9px; font-size: 14px; letter-spacing: .3px; transition: filter .15s, transform .05s;
}
.btn:hover { filter: brightness(1.06); }
.btn:active { transform: translateY(1px); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn.ghost { background: transparent; color: var(--ink-soft); border: 1px solid var(--line); }
.btn.ghost:hover { color: var(--ink); border-color: var(--ink-faint); filter: none; }

.switch-line { text-align: center; margin-top: 20px; font-size: 13px; color: var(--ink-soft); }
.switch-line button { background: none; border: none; color: var(--gold-soft); font-weight: 600; font-size: 13px; }

.notice { padding: 11px 14px; border-radius: 9px; font-size: 13px; margin-bottom: 16px; }
.notice.err { background: rgba(209,96,96,.12); color: #e6a0a0; border: 1px solid rgba(209,96,96,.25); }
.notice.ok { background: rgba(76,175,125,.1); color: #8fd6b1; border: 1px solid rgba(76,175,125,.25); }
.notice.info { background: rgba(31,95,191,.1); color: var(--gold-soft); border: 1px solid rgba(31,95,191,.22); }

/* ── App shell ── */
.shell { display: grid; grid-template-columns: 300px 1fr; min-height: 100%; }
@media (max-width: 980px) { .shell { grid-template-columns: 1fr; } }

.sidebar {
  background: var(--bg-2); border-right: 1px solid var(--line);
  display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; overflow-y: auto;
}
@media (max-width: 980px) {
  .sidebar { position: fixed; z-index: 60; width: 300px; transform: translateX(-100%); transition: transform .25s; }
  .sidebar.open { transform: translateX(0); }
}
.sb-head { padding: 22px 22px 16px; border-bottom: 1px solid var(--line); }
.sb-head img { width: 54px; }
.sb-head .sub { font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: var(--gold-soft); margin-top: 8px; }
.sb-body { padding: 14px; flex: 1; }
.sb-section-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--ink-faint); padding: 14px 10px 8px; }

.nav-course { margin-bottom: 6px; }
.nav-course > .row {
  display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 9px;
  color: var(--ink-soft); font-size: 14px; font-weight: 500; transition: background .12s, color .12s; user-select: none;
}
.nav-course > .row:hover { background: var(--panel); color: var(--ink); }
.nav-course > .row.active { background: var(--panel-2); color: var(--ink); }
.nav-course .stage-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.dot-beginner { background: #6fae7d; }
.dot-intermediate { background: var(--gold); }
.dot-advanced { background: #b06a9c; }
.nav-course .prog-mini { margin-left: auto; font-size: 11px; color: var(--ink-faint); }

.sb-foot { padding: 14px; border-top: 1px solid var(--line); }
.user-chip { display: flex; align-items: center; gap: 11px; padding: 8px 6px; }
.avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--gold), #8a6d2e);
  display: flex; align-items: center; justify-content: center; color: #14100a; font-weight: 700; font-size: 14px; flex: none; }
.user-chip .meta { overflow: hidden; }
.user-chip .meta .n { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-chip .meta .e { font-size: 11px; color: var(--ink-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Main ── */
.main { min-width: 0; }
.topbar {
  display: flex; align-items: center; gap: 14px; padding: 16px 30px;
  border-bottom: 1px solid var(--line); position: sticky; top: 0; background: rgba(255,255,255,.88);
  backdrop-filter: blur(10px); z-index: 30;
}
.topbar .burger { display: none; background: none; border: 1px solid var(--line); color: var(--ink);
  width: 40px; height: 40px; border-radius: 9px; font-size: 18px; }
@media (max-width: 980px) { .topbar .burger { display: block; } }
.topbar h2 { font-family: var(--serif); font-weight: 500; font-size: 22px; }
.topbar .spacer { flex: 1; }

.content { padding: 30px; max-width: 1100px; }
@media (max-width: 640px) { .content { padding: 20px 16px; } .topbar { padding: 14px 16px; } }

/* Hero on course page */
.course-hero {
  border-radius: var(--radius); overflow: hidden; position: relative; margin-bottom: 26px;
  border: 1px solid var(--line); min-height: 180px; display: flex; align-items: flex-end;
}
.course-hero img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .4; }
.course-hero::after { content: ''; position: absolute; inset: 0;
  background: linear-gradient(120deg, rgba(14,16,20,.9), rgba(14,16,20,.5)); }
.course-hero .inner { position: relative; z-index: 2; padding: 26px 28px; }
.course-hero .eyebrow { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #cddcff; }
.course-hero h1 { font-family: var(--serif); font-weight: 500; font-size: 38px; margin-top: 6px; color: #ffffff; }
.course-hero p { color: rgba(255,255,255,.85); margin-top: 6px; max-width: 560px; font-size: 14px; }

.progress-bar { height: 6px; background: var(--panel); border-radius: 20px; overflow: hidden; margin-top: 16px; }
.progress-bar > span { display: block; height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold-soft)); border-radius: 20px; transition: width .4s; }

/* Section groups */
.section-group { margin-bottom: 14px; border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; background: var(--panel); box-shadow: var(--shadow); }
.section-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px; cursor: pointer; user-select: none; }
.section-head:hover { background: var(--panel-2); }
.section-head .chev { transition: transform .2s; color: var(--ink-faint); font-size: 12px; }
.section-head.open .chev { transform: rotate(90deg); }
.section-head .st { font-weight: 600; font-size: 15px; color: var(--ink); }
.section-head .count { margin-left: auto; font-size: 12px; color: var(--ink-faint); }
.section-body { border-top: 1px solid var(--line); }

.lesson {
  display: flex; align-items: center; gap: 14px; padding: 13px 18px; border-bottom: 1px solid rgba(42,47,57,.5);
  cursor: pointer; transition: background .12s;
}
.lesson:last-child { border-bottom: none; }
.lesson:hover { background: var(--panel-2); }
.lesson .tick {
  width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--line); flex: none;
  display: flex; align-items: center; justify-content: center; font-size: 12px; color: transparent;
}
.lesson .tick.done { background: var(--green); border-color: var(--green); color: #0c1410; }
.lesson .l-title { font-size: 14px; color: var(--ink); }
.lesson .l-meta { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.pill { font-size: 10px; padding: 3px 8px; border-radius: 20px; background: rgba(31,95,191,.14); color: var(--gold-soft); letter-spacing: .3px; }
.pill.pdf { background: rgba(120,140,200,.16); color: #a9b7e0; }

/* Player */
.player-wrap { }
.video-frame { position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--line); }
.video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.player-title { font-family: var(--serif); font-weight: 500; font-size: 26px; margin-top: 20px; }
.player-desc { color: var(--ink-soft); margin-top: 8px; font-size: 14px; white-space: pre-wrap; }

.toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
.mark-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 9px;
  border: 1px solid var(--line); background: var(--panel); color: var(--ink); font-size: 13px; font-weight: 500; }
.mark-btn.done { background: rgba(76,175,125,.14); border-color: rgba(76,175,125,.4); color: #8fd6b1; }

.resource-card { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid var(--line);
  border-radius: 10px; background: var(--panel); margin-top: 12px; text-decoration: none; transition: border-color .15s, box-shadow .15s; box-shadow: var(--shadow); }
.resource-card:hover { border-color: var(--gold); }
.resource-card .ico { width: 40px; height: 40px; border-radius: 8px; background: rgba(120,140,200,.16);
  display: flex; align-items: center; justify-content: center; font-size: 18px; flex: none; }
.resource-card .rn { font-size: 14px; font-weight: 600; }
.resource-card .rs { font-size: 12px; color: var(--ink-faint); }

.back-link { display: inline-flex; align-items: center; gap: 8px; color: var(--ink-soft); font-size: 13px;
  background: none; border: none; margin-bottom: 18px; }
.back-link:hover { color: var(--ink); }

/* Empty states */
.empty { text-align: center; padding: 60px 20px; color: var(--ink-faint); }
.empty .big { font-family: var(--serif); font-size: 22px; color: var(--ink-soft); margin-bottom: 8px; }

/* ── Admin ── */
.admin-tabs { display: flex; gap: 6px; border-bottom: 1px solid var(--line); margin-bottom: 24px; flex-wrap: wrap; }
.admin-tabs button { background: none; border: none; color: var(--ink-soft); padding: 12px 16px; font-size: 14px;
  border-bottom: 2px solid transparent; margin-bottom: -1px; }
.admin-tabs button.active { color: var(--gold-soft); border-bottom-color: var(--gold); }

table.grid { width: 100%; border-collapse: collapse; font-size: 13px; }
table.grid th { text-align: left; color: var(--ink-faint); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--line); font-size: 11px; letter-spacing: .5px; text-transform: uppercase; }
table.grid td { padding: 12px; border-bottom: 1px solid rgba(42,47,57,.5); vertical-align: middle; }
.status-tag { font-size: 11px; padding: 3px 9px; border-radius: 20px; font-weight: 600; }
.s-pending { background: rgba(31,95,191,.15); color: var(--gold-soft); }
.s-approved { background: rgba(76,175,125,.15); color: #8fd6b1; }
.s-rejected, .s-suspended { background: rgba(209,96,96,.15); color: #e6a0a0; }

.mini-btn { padding: 6px 12px; border-radius: 7px; border: 1px solid var(--line); background: var(--panel);
  color: var(--ink); font-size: 12px; margin-right: 6px; }
.mini-btn:hover { border-color: var(--ink-faint); }
.mini-btn.good:hover { border-color: var(--green); color: #8fd6b1; }
.mini-btn.bad:hover { border-color: var(--red); color: #e6a0a0; }

.card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 20px; margin-bottom: 16px; box-shadow: var(--shadow); }
.card h3 { font-family: var(--serif); font-weight: 500; font-size: 20px; margin-bottom: 4px; }
.card .hint { font-size: 12px; color: var(--ink-faint); margin-bottom: 16px; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 600px) { .row2 { grid-template-columns: 1fr; } }
.field textarea { width: 100%; background: var(--bg-2); border: 1px solid var(--line); color: var(--ink);
  padding: 12px 14px; border-radius: 9px; font-size: 14px; resize: vertical; min-height: 80px; }
.field select { width: 100%; background: var(--bg-2); border: 1px solid var(--line); color: var(--ink);
  padding: 12px 14px; border-radius: 9px; font-size: 14px; }

.stat-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 24px; }
@media (max-width: 700px) { .stat-row { grid-template-columns: 1fr 1fr; } }
.stat { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; box-shadow: var(--shadow); }
.stat .v { font-family: var(--serif); font-size: 32px; color: var(--gold-soft); }
.stat .l { font-size: 12px; color: var(--ink-faint); margin-top: 2px; }

.admin-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--line);
  border-radius: 9px; background: var(--bg-2); margin-bottom: 8px; }
.admin-item .drag { color: var(--ink-faint); cursor: grab; }
.admin-item .ai-title { font-size: 14px; }
.admin-item .ai-meta { font-size: 11px; color: var(--ink-faint); }
.admin-item .sp { flex: 1; }

.modal-back { position: fixed; inset: 0; background: rgba(6,8,11,.7); backdrop-filter: blur(3px); z-index: 100;
  display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); width: 100%;
  max-width: 520px; padding: 24px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
.modal h3 { font-family: var(--serif); font-weight: 500; font-size: 22px; margin-bottom: 18px; }
.modal-actions { display: flex; gap: 10px; margin-top: 8px; }
.modal-actions .btn { width: auto; flex: 1; }

.spinner { width: 20px; height: 20px; border: 2px solid rgba(31,95,191,.3); border-top-color: var(--gold);
  border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.center-load { display: flex; align-items: center; justify-content: center; min-height: 100vh; }

.overlay-menu { display: none; }
@media (max-width: 980px) {
  .overlay-menu.show { display: block; position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 55; }
}

/* Search box */
.searchbox { position: relative; margin-bottom: 16px; max-width: 420px; }
.searchbox input { width: 100%; background: var(--panel); border: 1px solid var(--line); color: var(--ink);
  padding: 11px 14px 11px 38px; border-radius: 9px; font-size: 14px; }
.searchbox input:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 3px rgba(31,95,191,.12); }
.searchbox .si { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ink-faint); font-size: 15px; pointer-events: none; }
.searchbox .clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none;
  color: var(--ink-faint); cursor: pointer; font-size: 16px; padding: 4px; }
