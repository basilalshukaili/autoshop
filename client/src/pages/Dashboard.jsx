import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../api.js';
import { C, ff, fd, MOTION, GRAD } from '../theme.js';
import { t, money, fmt, dt } from '../i18n.js';
import { KPI, Card, Pill, Tag, Btn, Spinner, statusColor, statusIcon } from '../ui.jsx';

export default function Dashboard({ th, lang, worker }) {
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [low, setLow] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([
      get('/dashboard'),
      get('/work-orders'),
      get('/parts/low-stock'),
    ]).then(([d, wos, lp]) => {
      setData(d);
      setRecent((Array.isArray(wos) ? wos : []).filter(w => w.status !== 'invoiced').slice(0, 6));
      setLow((Array.isArray(lp) ? lp : []).slice(0, 6));
    }).catch(() => {});
  }, []);

  if (!data) return <Spinner />;

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = lang === 'ar'
    ? (hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء الخير')
    : (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');

  const kpis = [
    { icon: '🛠️', label: t('open_jobs', lang), value: fmt(data.open_wo, lang), c: C.O, to: '/work-orders' },
    { icon: '✅', label: t('ready_jobs', lang), value: fmt(data.ready_wo, lang), c: C.G, to: '/work-orders' },
    { icon: '📅', label: t('waitlist', lang), value: fmt(data.waitlist_count, lang), c: C.GL, to: '/waitlist' },
    { icon: '👤', label: t('customers_total', lang), value: fmt(data.customers_count, lang), c: C.B, to: '/customers' },
    { icon: '🚗', label: t('vehicles_total', lang), value: fmt(data.vehicles_count, lang), c: C.P, to: '/vehicles' },
    { icon: '⚠️', label: t('low_stock', lang), value: fmt(data.low_stock, lang), c: C.R, to: '/parts' },
  ];

  const money_kpis = [
    { icon: '💰', label: t('today_revenue', lang), value: money(data.today_revenue, lang), c: C.G },
    { icon: '📈', label: t('month_revenue', lang), value: money(data.month_revenue, lang), c: C.G },
    { icon: '⏳', label: t('unpaid', lang), value: money(data.unpaid_total, lang), c: C.R },
    { icon: '💸', label: t('expenses_month', lang), value: money(data.month_expenses, lang), c: C.PK },
    { icon: '🏆', label: t('profit_month', lang), value: money(data.profit, lang), c: data.profit >= 0 ? C.T : C.R },
    { icon: '⭐', label: t('avg_rating', lang), value: data.avg_rating ? `${data.avg_rating} / 5` : '—', c: C.GL },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 26, gap: 14, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{
            fontSize: 12, color: th.sub, marginBottom: 6,
            fontWeight: 600, letterSpacing: '.4px',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: ff(lang),
          }}>
            <span>{greeting},</span>
            <span style={{ color: worker.color, fontWeight: 700 }}>
              {lang === 'ar' ? worker.name_ar : worker.name}
            </span>
            <span style={{ fontSize: 14 }}>{worker.avatar}</span>
          </div>
          <h1 style={{
            fontSize: 30, fontWeight: 800, color: th.txt,
            margin: 0, fontFamily: fd(lang),
            letterSpacing: '-0.025em', lineHeight: 1.1,
          }}>
            {t('dashboard', lang)}
          </h1>
          <div style={{
            fontSize: 11.5, color: th.muted, marginTop: 5,
            fontFamily: "'JetBrains Mono', monospace",
          }}>{dt(new Date(), lang)}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" c={C.B} onClick={() => nav('/customers')}>+ {t('new_customer', lang)}</Btn>
          <Btn c={C.O} onClick={() => nav('/work-orders/new')}>+ {t('new_work_order', lang)}</Btn>
        </div>
      </div>

      {/* Operations KPIs */}
      <SectionLabel th={th} lang={lang} label={lang === 'ar' ? 'نظرة عامة على العمليات' : 'Operations'} />
      <div className="stagger" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        {kpis.map(k => <KPI key={k.label} {...k} th={th} onClick={() => nav(k.to)} />)}
      </div>

      {/* Money KPIs */}
      <SectionLabel th={th} lang={lang} label={lang === 'ar' ? 'الأداء المالي' : 'Financial Performance'} />
      <div className="stagger" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12, marginBottom: 30,
      }}>
        {money_kpis.map(k => <KPI key={k.label} {...k} th={th} />)}
      </div>

      {/* Two-column area */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: 16,
      }}>
        {/* Recent work orders */}
        <Card c={C.O} th={th} style={{ padding: 18 }}>
          <SectionTitle th={th} lang={lang} icon="🛠️"
            title={t('work_orders', lang)}
            action={<Btn variant="ghost" c={C.O} onClick={() => nav('/work-orders')} style={{ padding: '5px 12px', fontSize: 11 }}>{t('details', lang)} →</Btn>} />
          {recent.length === 0 && (
            <div style={{
              fontSize: 12, color: th.muted, padding: '24px 0', textAlign: 'center',
            }}>—</div>
          )}
          <div className="stagger">
            {recent.map(w => <RecentWO key={w.id} w={w} th={th} lang={lang} onClick={() => nav(`/work-orders/${w.id}`)} />)}
          </div>
        </Card>

        {/* Low stock alert */}
        <Card c={C.R} th={th} style={{ padding: 18 }}>
          <SectionTitle th={th} lang={lang} icon="⚠️"
            title={t('low_stock', lang)}
            action={<Btn variant="ghost" c={C.R} onClick={() => nav('/parts')} style={{ padding: '5px 12px', fontSize: 11 }}>{t('details', lang)} →</Btn>} />
          {low.length === 0 && (
            <div style={{
              fontSize: 12, color: th.sub, padding: '24px 0', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 36, opacity: .4 }}>✨</span>
              <span>{lang === 'ar' ? 'لا تنبيهات — كل شيء على ما يرام' : 'All good — nothing low on stock'}</span>
            </div>
          )}
          <div className="stagger">
            {low.map(p => <LowStockRow key={p.id} p={p} th={th} lang={lang} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SectionLabel({ th, lang, label }) {
  return (
    <div style={{
      fontSize: 10, color: th.muted, letterSpacing: '2px', fontWeight: 700,
      textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
      fontFamily: ff(lang),
    }}>{label}</div>
  );
}

function SectionTitle({ th, lang, icon, title, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{
          fontSize: 14, fontWeight: 800, color: th.txt,
          fontFamily: fd(lang), letterSpacing: '-0.01em',
        }}>{title}</span>
      </div>
      {action}
    </div>
  );
}

function RecentWO({ w, th, lang, onClick }) {
  const col = statusColor(w.status);
  return (
    <button onClick={onClick} className="lift" style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
      padding: '11px 12px',
      background: th.miniCard,
      border: `1px solid ${col}25`,
      borderRadius: 10, marginBottom: 7, cursor: 'pointer',
      flexDirection: lang === 'ar' ? 'row-reverse' : 'row',
      textAlign: lang === 'ar' ? 'right' : 'left',
      color: th.txt, transition: `all ${MOTION.fast}`,
    }}
    onMouseEnter={e => { e.currentTarget.style.background = th.cardHover; e.currentTarget.style.borderColor = `${col}55`; }}
    onMouseLeave={e => { e.currentTarget.style.background = th.miniCard; e.currentTarget.style.borderColor = `${col}25`; }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: `${col}1A`, border: `1px solid ${col}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15,
      }}>{statusIcon(w.status)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 600, fontFamily: ff(lang),
          letterSpacing: '-0.005em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {w.make} {w.model} · {w.customer_name}
        </div>
        <div style={{
          fontSize: 10.5, color: th.sub, fontFamily: "'JetBrains Mono', monospace",
          marginTop: 2,
        }}>
          {w.code} · {w.plate} {w.technician_name && `· ${w.technician_name}`}
        </div>
      </div>
      <Pill c={col}>{t(`status_${w.status}`, lang) || w.status}</Pill>
    </button>
  );
}

function LowStockRow({ p, th, lang }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 12px',
      background: th.miniCard,
      border: `1px solid ${C.R}25`, borderRadius: 10,
      marginBottom: 7,
      flexDirection: lang === 'ar' ? 'row-reverse' : 'row',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: `${C.R}1A`, border: `1px solid ${C.R}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15,
      }}>🔩</div>
      <div style={{ flex: 1, textAlign: lang === 'ar' ? 'right' : 'left', minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, color: th.txt, fontWeight: 600,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {lang === 'ar' && p.name_ar ? p.name_ar : p.name}
        </div>
        <div style={{
          fontSize: 10.5, color: th.sub,
          fontFamily: "'JetBrains Mono', monospace", marginTop: 2,
        }}>
          {p.code} · {lang === 'ar' ? 'المخزون' : 'Stock'}: {fmt(p.stock, lang)} / min {fmt(p.min_stock, lang)}
        </div>
      </div>
      <Tag c={C.R}>{lang === 'ar' ? 'منخفض' : 'LOW'}</Tag>
    </div>
  );
}
