import { useEffect, useState, useRef } from 'react';
import { get } from './api.js';
import { C, ff } from './theme.js';
import { t } from './i18n.js';
import { Tag } from './ui.jsx';

const TYPE = {
  customer: { icon: '👤', c: C.O, key: 'customer' },
  vehicle: { icon: '🚗', c: C.B, key: 'vehicle' },
  work_order: { icon: '🛠️', c: C.P, key: 'work_order' },
  invoice: { icon: '🧾', c: C.T, key: 'invoice' },
  part: { icon: '🔩', c: C.G, key: 'parts' },
};

export default function GlobalSearch({ open, onClose, th, lang, onPick }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const inp = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inp.current?.focus(), 50);
    if (!open) { setQ(''); setResults([]); }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const id = setTimeout(() => {
      get(`/search?q=${encodeURIComponent(q)}`).then(setResults).catch(() => {});
    }, 200);
    return () => clearTimeout(id);
  }, [q]);

  if (!open) return null;
  return (
    <div onClick={onClose} className="fade" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
      backdropFilter: 'blur(4px)', zIndex: 600,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '100px',
    }}>
      <div onClick={e => e.stopPropagation()} className="slide" style={{
        background: th.surf, border: `1px solid ${th.borderS}`,
        borderRadius: '12px', width: '100%', maxWidth: '600px',
        boxShadow: '0 24px 60px rgba(0,0,0,.45)',
        direction: lang === 'ar' ? 'rtl' : 'ltr',
      }}>
        <input ref={inp} value={q} onChange={e => setQ(e.target.value)}
          placeholder={t('search_anything', lang)}
          onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
          style={{
            width: '100%', padding: '16px 20px', border: 'none', borderBottom: `1px solid ${th.border}`,
            background: 'transparent', color: th.txt, fontSize: '14px',
            outline: 'none', fontFamily: ff(lang),
          }} />
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '8px' }}>
          {q && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: th.sub, fontSize: '12px' }}>
              {t('no_results', lang)}
            </div>
          )}
          {results.map((r, i) => {
            const meta = TYPE[r.type] || { icon: '•', c: C.O };
            return (
              <button key={i} onClick={() => onPick(r)} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 14px', borderRadius: '8px',
                background: 'transparent', border: '1px solid transparent', color: th.txt,
                cursor: 'pointer', width: '100%',
                textAlign: lang === 'ar' ? 'right' : 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = th.miniCard; e.currentTarget.style.borderColor = `${meta.c}25`; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
              >
                <div style={{
                  width: '34px', height: '34px', borderRadius: '8px', background: `${meta.c}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                }}>{meta.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: th.txt, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: '11px', color: th.sub, fontFamily: 'DM Mono' }}>{r.code} · {r.detail}</div>
                </div>
                <Tag c={meta.c}>{t(meta.key, lang)}</Tag>
              </button>
            );
          })}
        </div>
        {!q && (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${th.border}`, fontSize: '11px', color: th.muted, fontFamily: ff(lang) }}>
            {lang === 'ar' ? 'ابحث عن عميل، سيارة، أمر عمل، فاتورة، أو قطعة' : 'Search customer, vehicle, work order, invoice, or part'} · Esc {lang === 'ar' ? 'للإغلاق' : 'to close'}
          </div>
        )}
      </div>
    </div>
  );
}
