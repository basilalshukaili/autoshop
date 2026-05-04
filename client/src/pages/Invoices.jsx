import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../api.js';
import { C, ff, fd } from '../theme.js';
import { t, money, dateOnly } from '../i18n.js';
import { Btn, Card, Pill, Empty, Spinner } from '../ui.jsx';
import { Header } from './Customers.jsx';

export default function Invoices({ th, lang, worker }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    setLoading(true);
    get('/invoices').then(r => { setList(Array.isArray(r) ? r : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const matchesQuery = (i) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase().trim();
    return [i.code, i.customer_name, i.customer_phone, i.plate, i.make, i.model, i.wo_code]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(needle));
  };

  const filtered = list
    .filter(i => filter === 'paid' ? i.paid : filter === 'unpaid' ? !i.paid : true)
    .filter(matchesQuery);

  return (
    <div>
      <Header th={th} lang={lang} title={t('invoices', lang)} count={filtered.length} />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <Btn variant={filter === 'all' ? 'fill' : 'ghost'} c={C.B} onClick={() => setFilter('all')}>{lang === 'ar' ? 'الكل' : 'All'} ({list.length})</Btn>
        <Btn variant={filter === 'paid' ? 'fill' : 'ghost'} c={C.G} onClick={() => setFilter('paid')}>✓ {t('paid', lang)} ({list.filter(i => i.paid).length})</Btn>
        <Btn variant={filter === 'unpaid' ? 'fill' : 'ghost'} c={C.R} onClick={() => setFilter('unpaid')}>⏳ {t('unpaid', lang)} ({list.filter(i => !i.paid).length})</Btn>
      </div>

      <input value={q} onChange={e => setQ(e.target.value)}
        placeholder={lang === 'ar' ? '🔍 ابحث برقم الفاتورة أو العميل أو الهاتف أو اللوحة…' : '🔍 Search by invoice code, customer, phone, plate…'}
        style={{
          width: '100%', maxWidth: 520, padding: '10px 14px',
          borderRadius: 8, border: `1px solid ${th.borderS}`,
          background: th.inputBg, color: th.txt, fontSize: 13,
          outline: 'none', marginBottom: 14, fontFamily: ff(lang),
          direction: lang === 'ar' ? 'rtl' : 'ltr',
        }} />

      {loading && <Spinner />}
      {!loading && filtered.length === 0 && <Empty icon="🧾" title={t('no_results', lang)} th={th} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map(i => (
          <Card key={i.id} c={i.paid ? C.G : C.R} th={th} onClick={() => nav(`/invoices/${i.id}`)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '10px',
                background: `${i.paid ? C.G : C.R}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
              }}>🧾</div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: th.txt, fontFamily: 'DM Mono' }}>{i.code}</div>
                <div style={{ fontSize: '11px', color: th.sub, fontFamily: ff(lang) }}>
                  👤 {i.customer_name} {i.plate && `· 🚗 ${i.make} ${i.model} · ${i.plate}`}
                </div>
                <div style={{ fontSize: '10px', color: th.muted, fontFamily: 'DM Mono', marginTop: '2px' }}>
                  {dateOnly(i.issued_at, lang)} {i.wo_code && `· ${i.wo_code}`}
                </div>
              </div>
              <div style={{ textAlign: lang === 'ar' ? 'left' : 'right' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: th.txt, fontFamily: 'DM Mono' }}>{money(i.total, lang)}</div>
                <div style={{ fontSize: '10px', color: th.sub, fontFamily: 'DM Mono' }}>+{money(i.vat_amount, lang)} VAT</div>
              </div>
              <Pill c={i.paid ? C.G : C.R}>{i.paid ? '✓ ' + t('paid', lang) : '⏳ ' + t('unpaid', lang)}</Pill>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
