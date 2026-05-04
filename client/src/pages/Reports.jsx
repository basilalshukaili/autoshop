import { useEffect, useState } from 'react';
import { get } from '../api.js';
import { C, ff, fd } from '../theme.js';
import { t, money, fmt } from '../i18n.js';
import { Card, Spinner, Tag } from '../ui.jsx';
import { Header } from './Customers.jsx';

export default function Reports({ th, lang, worker }) {
  const [rev, setRev] = useState(null);
  const [techs, setTechs] = useState(null);
  const [dash, setDash] = useState(null);

  useEffect(() => {
    Promise.all([get('/reports/revenue'), get('/reports/technicians'), get('/dashboard')])
      .then(([r, t, d]) => {
        setRev(Array.isArray(r) ? r : []);
        setTechs(Array.isArray(t) ? t : []);
        setDash(d || {});
      })
      .catch(() => { setRev([]); setTechs([]); setDash({}); });
  }, []);

  if (rev === null || techs === null || dash === null) return <Spinner />;

  const max = Math.max(...rev.map(r => Number(r.total) || 0), 1);

  return (
    <div>
      <Header th={th} lang={lang} title={t('reports', lang)} />

      {/* KPIs row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
        <KPI icon="📈" label={t('month_revenue', lang)} value={money(dash.month_revenue, lang)} c={C.G} th={th} />
        <KPI icon="💸" label={t('expenses_month', lang)} value={money(dash.month_expenses, lang)} c={C.PK} th={th} />
        <KPI icon="🏆" label={t('profit_month', lang)} value={money(dash.profit, lang)} c={dash.profit >= 0 ? C.T : C.R} th={th} />
        <KPI icon="⏳" label={t('unpaid', lang)} value={money(dash.unpaid_total, lang)} c={C.R} th={th} />
      </div>

      {/* Revenue chart */}
      <Card c={C.G} th={th} style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: th.txt, marginBottom: '14px', fontFamily: fd(lang) }}>
          📊 {lang === 'ar' ? 'الإيرادات — آخر ٣٠ يوماً' : 'Revenue — Last 30 days'}
        </div>
        {rev.length === 0 ? (
          <div style={{ fontSize: '12px', color: th.sub, textAlign: 'center', padding: '24px' }}>—</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '180px', overflowX: 'auto', padding: '8px 0' }}>
            {rev.map(r => (
              <div key={r.day} style={{ flex: '0 0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ fontSize: '8px', color: th.muted, fontFamily: 'DM Mono', whiteSpace: 'nowrap' }}>{Math.round(r.total)}</div>
                <div style={{
                  width: '20px', height: `${(r.total / max) * 140}px`,
                  background: `linear-gradient(180deg, ${C.G}, ${C.G}40)`,
                  borderRadius: '3px 3px 0 0',
                }} />
                <div style={{ fontSize: '8px', color: th.muted, fontFamily: 'DM Mono', writingMode: 'vertical-rl', height: '40px', overflow: 'hidden' }}>
                  {r.day.slice(5)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Technicians */}
      <Card c={C.P} th={th}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: th.txt, marginBottom: '14px', fontFamily: fd(lang) }}>
          👥 {lang === 'ar' ? 'أداء الفنيين' : 'Technician Performance'}
        </div>
        {techs.length === 0 && <div style={{ fontSize: '12px', color: th.sub }}>—</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {techs.map(tx => (
            <div key={tx.id} style={{
              background: th.miniCard, border: `1px solid ${tx.color}30`,
              borderRadius: '10px', padding: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ fontSize: '24px' }}>{tx.avatar}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: tx.color, letterSpacing: '-0.015em' }}>{tx.name}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '8px' }}>
                <span style={{ color: th.sub }}>{lang === 'ar' ? 'مهام' : 'Jobs'}:</span>
                <strong style={{ color: th.txt }}>{tx.job_count}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: th.sub }}>{lang === 'ar' ? 'مكتملة' : 'Completed'}:</span>
                <strong style={{ color: C.G }}>{tx.completed}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: th.sub }}>{t('avg_rating', lang)}:</span>
                <strong style={{ color: C.GL }}>{tx.avg_rating ? Number(tx.avg_rating).toFixed(1) + ' ⭐' : '—'}</strong>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function KPI({ icon, label, value, c, th }) {
  return (
    <div style={{
      background: th.card, border: `1px solid ${c}25`, borderRadius: '10px', padding: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span style={{ fontSize: '9px', color: th.sub, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: '18px', fontWeight: 800, color: c, fontFamily: 'DM Mono' }}>{value}</div>
    </div>
  );
}
