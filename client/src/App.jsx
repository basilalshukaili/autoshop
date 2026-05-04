import { useEffect, useMemo, useState, Component } from 'react';
import { createPortal } from 'react-dom';
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Login from './Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Customers from './pages/Customers.jsx';
import CustomerDetail from './pages/CustomerDetail.jsx';
import Vehicles from './pages/Vehicles.jsx';
import WorkOrders from './pages/WorkOrders.jsx';
import WorkOrderDetail from './pages/WorkOrderDetail.jsx';
import NewWorkOrder from './pages/NewWorkOrder.jsx';
import Parts from './pages/Parts.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Invoices from './pages/Invoices.jsx';
import InvoiceDetail from './pages/InvoiceDetail.jsx';
import Expenses from './pages/Expenses.jsx';
import Reports from './pages/Reports.jsx';
import Waitlist from './pages/Waitlist.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';
import Staff from './pages/Staff.jsx';
import AuditLog from './pages/AuditLog.jsx';
import PartReturns from './pages/PartReturns.jsx';
import Backups from './pages/Backups.jsx';
import GlobalSearch from './GlobalSearch.jsx';
import TrackPage from './pages/TrackPage.jsx';
import { TH, C, ff, fd, MOTION, GRAD } from './theme.js';
import { t } from './i18n.js';
import { Dot, ToastProvider, useAutoLock, useMediaQuery } from './ui.jsx';
import { post, get } from './api.js';
import { useEffect as _ue, useState as _us } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); }
  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.routeKey !== this.props.routeKey) {
      this.setState({ hasError: false, error: null });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '48px 28px', textAlign: 'center', color: '#fff',
          background: '#0F172A', borderRadius: 20, margin: '40px auto',
          maxWidth: 560, border: '1px solid rgba(249,115,22,.25)',
          boxShadow: '0 20px 50px rgba(0,0,0,.5)',
        }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: '#F97316', letterSpacing: '-0.01em' }}>Something went wrong on this page</div>
          <div style={{ fontSize: 12.5, color: '#94A3B8', marginBottom: 22, wordBreak: 'break-word', lineHeight: 1.6 }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/dashboard'; }} style={{
            padding: '11px 22px', background: '#F97316', color: '#fff',
            border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700,
            boxShadow: '0 8px 22px rgba(249,115,22,.4)',
          }}>← Back to Dashboard</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function WaStatus({ th, token }) {
  const [wa, setWa] = _us({ state: 'off', qr: null });
  const [open, setOpen] = _us(false);
  const [busy, setBusy] = _us(false);
  const [hover, setHover] = _us(false);
  _ue(() => {
    if (!token) return;
    const poll = () => get('/whatsapp/status').then(setWa).catch(() => {});
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [token]);
  const col = wa.state === 'ready' ? '#25D366' : wa.state === 'qr' ? '#F97316' : '#64748B';
  const label = wa.state === 'ready' ? '●' : wa.state === 'qr' ? '⚡' : '○';
  const restart = async (clear) => {
    setBusy(true);
    try {
      await post('/whatsapp/restart', { clear: !!clear });
      setTimeout(() => get('/whatsapp/status').then(setWa).catch(() => {}), 1500);
    } catch (e) { /* ignore */ }
    setBusy(false);
  };
  return (
    <>
      <button onClick={() => setOpen(true)} title={`WhatsApp: ${wa.state}`}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          background: hover ? `${col}25` : `${col}15`,
          border: `1px solid ${col}40`, color: col,
          padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
          fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6,
          transition: `all ${MOTION.fast}`, fontWeight: 700,
          boxShadow: wa.state === 'ready' ? `0 0 12px ${col}55` : 'none',
        }}>
        <span style={{ animation: wa.state !== 'ready' ? 'softPulse 2s ease infinite' : 'none' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.5px' }}>WA</span>
      </button>
      {open && createPortal(
        <div onClick={() => setOpen(false)} className="fade" style={{
          position: 'fixed', inset: 0,
          background: 'rgba(3,7,18,.78)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 9999,
          overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          padding: '24px 16px',
        }}>
          <div onClick={e => e.stopPropagation()} className="slide" style={{
            background: th.surf, borderRadius: 18, padding: 26, textAlign: 'center',
            maxWidth: 360, margin: '0 auto', border: `1px solid ${th.borderS}`,
            boxShadow: '0 30px 80px rgba(0,0,0,.55), 0 8px 24px rgba(0,0,0,.4)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: th.txt, marginBottom: 6, letterSpacing: '-0.01em' }}>
              WhatsApp Status
            </div>
            <div style={{ fontSize: 11, color: col, fontWeight: 800, marginBottom: 18, textTransform: 'uppercase', letterSpacing: '1.8px' }}>
              {wa.state}
            </div>
            {wa.state === 'ready' && (
              <>
                <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 13, color: th.sub, marginBottom: 14, lineHeight: 1.5 }}>WhatsApp is connected and sending messages.</div>
              </>
            )}
            {wa.state === 'qr' && wa.qr && (
              <>
                <div style={{ fontSize: 13, color: th.sub, marginBottom: 12 }}>Scan with WhatsApp on your phone</div>
                <div style={{ display: 'inline-block', padding: 8, background: '#fff', borderRadius: 12, boxShadow: th.shadow2 }}>
                  <img src={wa.qr} alt="QR" style={{ width: 220, height: 220, display: 'block' }} />
                </div>
                <div style={{ fontSize: 10.5, color: th.muted, marginTop: 10 }}>WhatsApp → Linked Devices → Link a Device</div>
              </>
            )}
            {(wa.state === 'initializing' || wa.state === 'off' || wa.state === 'error') && (
              <>
                <div style={{ fontSize: 44, marginBottom: 10 }}>{wa.state === 'error' ? '⚠️' : '⏳'}</div>
                <div style={{ fontSize: 13, color: th.sub, marginBottom: 18, lineHeight: 1.5 }}>
                  {wa.state === 'initializing' ? 'Connecting to WhatsApp…' :
                   wa.state === 'error' ? `Error: ${wa.error || 'unknown'}` :
                   'WhatsApp is offline.'}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button disabled={busy} onClick={() => restart(false)} style={{
                    background: '#F97316', color: '#fff', border: 'none', padding: '9px 16px',
                    borderRadius: 9, cursor: busy ? 'wait' : 'pointer', fontSize: 11.5, fontWeight: 700,
                    boxShadow: '0 6px 16px rgba(249,115,22,.4)',
                  }}>{busy ? '…' : '🔄 Reconnect'}</button>
                  <button disabled={busy} onClick={() => restart(true)} style={{
                    background: 'transparent', color: '#EF4444', border: '1px solid #EF444450', padding: '9px 16px',
                    borderRadius: 9, cursor: busy ? 'wait' : 'pointer', fontSize: 11.5, fontWeight: 700,
                  }}>{busy ? '…' : '🆕 New QR'}</button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ───── Navigation grouped by area ─────
const NAV_GROUPS = [
  {
    label: { en: 'Workshop', ar: 'الورشة' },
    items: [
      { to: '/dashboard', icon: '📊', key: 'dashboard', roles: ['Manager', 'Technician'] },
      { to: '/work-orders', icon: '🛠️', key: 'work_orders', roles: ['Manager', 'Technician'] },
      { to: '/customers', icon: '👤', key: 'customers', roles: ['Manager', 'Technician'] },
      { to: '/vehicles', icon: '🚗', key: 'vehicles', roles: ['Manager', 'Technician'] },
      { to: '/waitlist', icon: '📅', key: 'waitlist', roles: ['Manager', 'Technician'] },
      { to: '/notifications', icon: '🔔', key: 'notifications', roles: ['Manager', 'Technician'] },
    ],
  },
  {
    label: { en: 'Inventory', ar: 'المخزون' },
    items: [
      { to: '/parts', icon: '🔩', key: 'parts', roles: ['Manager', 'Technician'] },
      { to: '/suppliers', icon: '🏭', key: 'suppliers', roles: ['Manager'] },
      { to: '/returns', icon: '↩️', key: 'returns', roles: ['Manager'] },
    ],
  },
  {
    label: { en: 'Financials', ar: 'المالية' },
    items: [
      { to: '/invoices', icon: '🧾', key: 'invoices', roles: ['Manager', 'Technician'] },
      { to: '/expenses', icon: '💸', key: 'expenses', roles: ['Manager'] },
      { to: '/reports', icon: '📈', key: 'reports', roles: ['Manager'] },
    ],
  },
  {
    label: { en: 'System', ar: 'النظام' },
    items: [
      { to: '/staff', icon: '👥', key: 'staff', roles: ['Manager'] },
      { to: '/audit-log', icon: '📜', key: 'audit_log', roles: ['Manager'] },
      { to: '/backups', icon: '💾', key: 'backups', roles: ['Manager'] },
      { to: '/settings', icon: '⚙️', key: 'settings', roles: ['Manager'] },
    ],
  },
];

export default function App() {
  const [worker, setWorker] = useState(() => {
    try { return JSON.parse(localStorage.getItem('autoshop_worker') || 'null'); }
    catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('autoshop_token'));
  const [theme, setTheme] = useState(() => localStorage.getItem('autoshop_theme') || worker?.theme || 'dark');
  const [lang, setLang] = useState(() => localStorage.getItem('autoshop_lang') || worker?.lang || 'en');
  const [settings, setSettings] = useState({});

  const th = TH[theme];

  useEffect(() => {
    localStorage.setItem('autoshop_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  useEffect(() => { localStorage.setItem('autoshop_lang', lang); }, [lang]);

  useEffect(() => {
    if (worker && token) {
      post('/me/prefs', { theme, lang }).catch(() => {});
    }
  }, [theme, lang]);

  useEffect(() => {
    get('/settings').then(setSettings).catch(() => {});
  }, [worker]);

  const onLogin = (w, tok) => {
    setWorker(w);
    setToken(tok);
  };

  const onLogout = () => {
    post('/logout').catch(() => {});
    localStorage.removeItem('autoshop_token');
    localStorage.removeItem('autoshop_worker');
    setWorker(null);
    setToken(null);
  };

  // Public tracker route
  const path = window.location.pathname;
  if (path.startsWith('/track/')) {
    return (
      <ToastProvider th={th} lang={lang}>
        <Routes>
          <Route path="/track/:token" element={<TrackPage th={th} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} settings={settings} />} />
        </Routes>
      </ToastProvider>
    );
  }

  if (!worker || !token) {
    return (
      <div data-rtl={lang === 'ar'}>
        <Login th={th} lang={lang} theme={theme} setLang={setLang} setTheme={setTheme} onLogin={onLogin} />
      </div>
    );
  }

  return (
    <Shell
      th={th} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme}
      worker={worker} settings={settings} onLogout={onLogout}
    />
  );
}

function Shell({ th, lang, setLang, theme, setTheme, worker, settings, onLogout }) {
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [navOpen, setNavOpen] = useState(false);

  return (
    <ToastProvider th={th} lang={lang}>
      <div data-rtl={lang === 'ar'} style={{
        minHeight: '100vh',
        background: th.bgPattern,
        backgroundAttachment: 'fixed',
        color: th.txt,
        fontFamily: ff(lang),
        display: 'flex',
      }}>
        {isMobile && navOpen && (
          <div className="drawer-scrim" onClick={() => setNavOpen(false)} />
        )}
        <Sidebar
          th={th} lang={lang} worker={worker} settings={settings}
          isMobile={isMobile} navOpen={navOpen}
          onNavigate={() => isMobile && setNavOpen(false)}
        />
        <Main
          th={th} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme}
          worker={worker} settings={settings} onLogout={onLogout}
          isMobile={isMobile} onMenuClick={() => setNavOpen(true)}
        />
      </div>
    </ToastProvider>
  );
}

function NavItem({ n, lang, th, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <NavLink
      to={n.to}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={({ isActive }) => ({
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderRadius: 8,
        fontSize: 12.5, fontWeight: isActive ? 700 : 500,
        textDecoration: 'none',
        color: isActive ? C.O : hover ? th.txt : th.sub,
        background: isActive ? `${C.O}15` : hover ? th.cardHover : 'transparent',
        marginBottom: 2, transition: `all ${MOTION.fast}`,
        fontFamily: ff(lang),
      })}>
      {({ isActive }) => (
        <>
          {/* Active accent bar */}
          {isActive && (
            <span style={{
              position: 'absolute',
              [lang === 'ar' ? 'right' : 'left']: 0,
              top: '50%', transform: 'translateY(-50%)',
              width: 3, height: 18,
              background: C.O, borderRadius: 4,
              boxShadow: `0 0 10px ${C.O}aa`,
            }} />
          )}
          <span style={{
            fontSize: 15,
            transition: `transform ${MOTION.fast}`,
            transform: hover ? 'scale(1.1)' : 'none',
          }}>{n.icon}</span>
          <span>{t(n.key, lang)}</span>
        </>
      )}
    </NavLink>
  );
}

function Sidebar({ th, lang, worker, settings, isMobile, navOpen, onNavigate }) {
  return (
    <aside className={`no-print sidebar ${navOpen ? 'open' : ''}`} style={{
      background: th.navBg,
      borderInlineEnd: `1px solid ${th.navBdr}`,
      display: 'flex', flexDirection: 'column',
      position: isMobile ? 'fixed' : 'sticky',
      top: 0, height: '100vh',
    }}>
      {/* Brand */}
      <div style={{ padding: '20px 18px 16px', borderBottom: `1px solid ${th.navBdr}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: GRAD.brand,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 19,
            boxShadow: '0 0 18px rgba(249,115,22,.45), inset 0 1px 0 rgba(255,255,255,.25)',
          }}>🔧</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontSize: 13.5, fontWeight: 800, color: th.txt,
              fontFamily: fd(lang), letterSpacing: '-0.01em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {settings.shop_name || t('app_title', lang)}
            </div>
            <div style={{
              fontSize: 9.5, color: th.muted, letterSpacing: '1.8px',
              fontWeight: 600, marginTop: 2,
            }}>v1.0 · OMAN</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '14px 10px 10px' }}>
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(n => n.roles.includes(worker.role));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label.en} style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 9.5, fontWeight: 700, color: th.muted,
                letterSpacing: '1.8px', textTransform: 'uppercase',
                padding: '0 12px 6px',
              }}>{group.label[lang === 'ar' ? 'ar' : 'en']}</div>
              {visibleItems.map(n => <NavItem key={n.to} n={n} lang={lang} th={th} onClick={onNavigate} />)}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: '12px 14px 16px', borderTop: `1px solid ${th.navBdr}` }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: C.O,
          background: `${C.O}14`, border: `1px solid ${C.O}30`,
          borderRadius: 8, padding: '7px 10px', textAlign: 'center',
          letterSpacing: '.4px', fontFamily: ff(lang),
          boxShadow: `0 0 14px ${C.O}1A, inset 0 1px 0 ${C.O}22`,
        }}>
          {t('powered_by_basil', lang)}
        </div>
      </div>
    </aside>
  );
}

function Main({ th, lang, setLang, theme, setTheme, worker, settings, onLogout, isMobile, onMenuClick }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [showSearch, setShowSearch] = useState(false);

  const idleRaw = Number(settings.idle_lock_seconds);
  const idle = Number.isFinite(idleRaw) && idleRaw >= 30 ? idleRaw : 90;
  useAutoLock(idle, onLogout, true);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(s => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Top bar */}
      <header className="no-print glass topbar" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: th.hdrBg,
        borderBottom: `1px solid ${th.navBdr}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {/* Hamburger (mobile/tablet only) */}
        {isMobile && (
          <button onClick={onMenuClick} aria-label="Menu" style={{
            background: th.card, border: `1px solid ${th.border}`, color: th.txt,
            width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
            fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            transition: `all ${MOTION.fast}`, flexShrink: 0,
          }}>☰</button>
        )}

        {/* Mobile brand */}
        {isMobile && (
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: GRAD.brand,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: '0 0 14px rgba(249,115,22,.4)',
          }}>🔧</div>
        )}

        {/* Search — full bar on desktop, icon button on mobile */}
        {!isMobile ? (
          <button onClick={() => setShowSearch(true)} style={{
            background: th.card,
            border: `1px solid ${th.border}`,
            padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
            color: th.sub, fontSize: 12.5, flex: 1, maxWidth: 480,
            textAlign: lang === 'ar' ? 'right' : 'left',
            display: 'flex', alignItems: 'center', gap: 10,
            transition: `all ${MOTION.fast}`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = th.cardHover; e.currentTarget.style.borderColor = th.borderS; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = th.card; e.currentTarget.style.borderColor = th.border; }}
          >
            <span style={{ fontSize: 14, opacity: .7 }}>🔍</span>
            <span style={{ flex: 1 }}>{t('search_anything', lang)}</span>
            <span style={{
              fontSize: 10, fontWeight: 600, color: th.muted,
              background: th.miniCard, padding: '3px 7px', borderRadius: 5,
              border: `1px solid ${th.border}`, fontFamily: "'JetBrains Mono', monospace",
            }}>Ctrl K</span>
          </button>
        ) : (
          <button onClick={() => setShowSearch(true)} aria-label="Search" style={{
            background: th.card, border: `1px solid ${th.border}`, color: th.sub,
            width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
            fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>🔍</button>
        )}

        <div style={{ flex: 1 }} />

        {/* Action cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <WaStatus th={th} token={localStorage.getItem('autoshop_token')} />
          <button onClick={() => setLang(x => x === 'en' ? 'ar' : 'en')} className="hide-tablet" style={{
            background: `${C.B}15`, border: `1px solid ${C.B}30`, color: C.B,
            padding: '7px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700,
            fontFamily: ff(lang), transition: `all ${MOTION.fast}`,
          }}>{lang === 'en' ? 'العربية' : 'English'}</button>
          <button onClick={() => setLang(x => x === 'en' ? 'ar' : 'en')} aria-label="Language" className="show-mobile hide-mobile" style={{
            display: 'none',
            background: `${C.B}15`, border: `1px solid ${C.B}30`, color: C.B,
            width: 38, height: 38, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
            alignItems: 'center', justifyContent: 'center',
          }}>{lang === 'en' ? 'ع' : 'EN'}</button>
          <button onClick={() => setTheme(x => x === 'dark' ? 'light' : 'dark')} style={{
            background: `${C.GL}15`, border: `1px solid ${C.GL}30`, color: C.GL,
            padding: '7px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 14,
            transition: `all ${MOTION.fast}`,
            minWidth: 38, height: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{theme === 'dark' ? '☀️' : '🌙'}</button>
        </div>

        {/* Worker chip — name hides on mobile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          background: `${worker.color}15`,
          border: `1px solid ${worker.color}30`,
          borderRadius: 999,
          padding: isMobile ? 5 : '5px 14px 5px 6px',
          transition: `all ${MOTION.fast}`,
          boxShadow: `0 0 14px ${worker.color}22`,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 18,
            width: 28, height: 28, borderRadius: '50%',
            background: `${worker.color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{worker.avatar}</span>
          <span className="hide-mobile" style={{ fontSize: 12, color: worker.color, fontWeight: 700, fontFamily: ff(lang) }}>
            {lang === 'ar' ? worker.name_ar : worker.name}
          </span>
          <span className="hide-mobile"><Dot color={worker.color} size={6} pulse /></span>
        </div>
        <button onClick={onLogout} title={t('logout', lang)} aria-label={t('logout', lang)} style={{
          background: `${C.R}10`, border: `1px solid ${C.R}30`, color: C.R,
          width: 38, height: 38, borderRadius: 10, cursor: 'pointer', fontSize: 13,
          transition: `all ${MOTION.fast}`, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>⏏</button>
      </header>

      <main className="page-main" style={{ flex: 1, overflow: 'auto' }}>
        <div className="fade" key={loc.pathname}>
          <ErrorBoundary routeKey={loc.pathname}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard th={th} lang={lang} worker={worker} />} />
            <Route path="/work-orders" element={<WorkOrders th={th} lang={lang} worker={worker} />} />
            <Route path="/work-orders/new" element={<NewWorkOrder th={th} lang={lang} worker={worker} />} />
            <Route path="/work-orders/:id" element={<WorkOrderDetail th={th} lang={lang} worker={worker} settings={settings} />} />
            <Route path="/customers" element={<Customers th={th} lang={lang} worker={worker} />} />
            <Route path="/customers/:id" element={<CustomerDetail th={th} lang={lang} worker={worker} />} />
            <Route path="/vehicles" element={<Vehicles th={th} lang={lang} worker={worker} />} />
            <Route path="/parts" element={<Parts th={th} lang={lang} worker={worker} />} />
            <Route path="/suppliers" element={<Suppliers th={th} lang={lang} worker={worker} />} />
            <Route path="/invoices" element={<Invoices th={th} lang={lang} worker={worker} />} />
            <Route path="/invoices/:id" element={<InvoiceDetail th={th} lang={lang} worker={worker} settings={settings} />} />
            <Route path="/expenses" element={<Expenses th={th} lang={lang} worker={worker} />} />
            <Route path="/waitlist" element={<Waitlist th={th} lang={lang} worker={worker} />} />
            <Route path="/returns" element={<PartReturns th={th} lang={lang} worker={worker} />} />
            <Route path="/notifications" element={<Notifications th={th} lang={lang} worker={worker} />} />
            <Route path="/reports" element={<Reports th={th} lang={lang} worker={worker} />} />
            <Route path="/staff" element={<Staff th={th} lang={lang} worker={worker} />} />
            <Route path="/audit-log" element={<AuditLog th={th} lang={lang} worker={worker} />} />
            <Route path="/backups" element={<Backups th={th} lang={lang} worker={worker} />} />
            <Route path="/settings" element={<Settings th={th} lang={lang} worker={worker} setSettingsParent={() => get('/settings')} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </ErrorBoundary>
        </div>
      </main>


      <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} th={th} lang={lang} onPick={(item) => {
        setShowSearch(false);
        if (item.type === 'customer') nav(`/customers/${item.id}`);
        else if (item.type === 'work_order') nav(`/work-orders/${item.id}`);
        else if (item.type === 'invoice') nav(`/invoices/${item.id}`);
        else if (item.type === 'vehicle') nav('/vehicles');
        else if (item.type === 'part') nav('/parts');
      }} />
    </div>
  );
}

