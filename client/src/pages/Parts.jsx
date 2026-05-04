import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api.js';
import { C, ff, fd } from '../theme.js';
import { t, money, fmt } from '../i18n.js';
import { Btn, Card, Tag, Modal, Input, Select, Pill, Empty, Spinner, useToast } from '../ui.jsx';
import { Header } from './Customers.jsx';

export default function Parts({ th, lang, worker }) {
  const [list, setList] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adjust, setAdjust] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    get(`/parts?q=${encodeURIComponent(q)}`).then(r => { setList(Array.isArray(r) ? r : []); setLoading(false); }).catch(() => setLoading(false));
    get('/suppliers').then(r => setSuppliers(Array.isArray(r) ? r : [])).catch(() => {});
  };
  useEffect(() => { load(); }, [q]);

  const filtered = filter === 'low' ? list.filter(p => p.stock <= p.min_stock) : list;

  const onSave = async (f) => {
    try {
      if (editing?.id) await put(`/parts/${editing.id}`, f);
      else await post('/parts', f);
      toast.push(t('saved', lang), C.G);
      setOpen(false); setEditing(null); load();
    } catch (e) { toast.push(e.message, C.R); }
  };

  const onAdjust = async (delta, reason) => {
    await post(`/parts/${adjust.id}/adjust`, { delta, reason });
    toast.push(t('saved', lang), C.G);
    setAdjust(null); load();
  };

  return (
    <div>
      <Header th={th} lang={lang} title={t('parts', lang)} count={filtered.length}
        action={<Btn c={C.O} onClick={() => { setEditing(null); setOpen(true); }}>+ {t('add_part', lang)}</Btn>} />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder={`🔍 ${t('search', lang)}…`}
          style={{
            flex: 1, maxWidth: '420px', padding: '10px 14px',
            borderRadius: '8px', border: `1px solid ${th.borderS}`,
            background: th.inputBg, color: th.txt, fontSize: '13px',
            outline: 'none', fontFamily: ff(lang),
            direction: lang === 'ar' ? 'rtl' : 'ltr',
          }} />
        <Btn variant={filter === 'all' ? 'fill' : 'ghost'} c={C.B} onClick={() => setFilter('all')}>
          {lang === 'ar' ? 'الكل' : 'All'} ({list.length})
        </Btn>
        <Btn variant={filter === 'low' ? 'fill' : 'ghost'} c={C.R} onClick={() => setFilter('low')}>
          ⚠ {t('low_stock', lang)} ({list.filter(p => p.stock <= p.min_stock).length})
        </Btn>
      </div>

      {loading && <Spinner />}
      {!loading && filtered.length === 0 && <Empty icon="🔩" title={t('no_results', lang)} th={th} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {filtered.map(p => {
          const low = p.stock <= p.min_stock;
          return (
            <Card key={p.id} c={low ? C.R : C.G} th={th}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: th.txt, fontFamily: ff(lang) }}>
                    {lang === 'ar' && p.name_ar ? p.name_ar : p.name}
                  </div>
                  <div style={{ fontSize: '10.5px', color: th.sub, fontFamily: 'DM Mono', marginTop: '2px' }}>
                    {p.code} {p.sku && `· ${p.sku}`}
                  </div>
                  {p.category && <Tag c={C.B}>{p.category}</Tag>}
                </div>
                {low && <Pill c={C.R}>⚠ LOW</Pill>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                <Stat label={t('stock', lang)} value={`${fmt(p.stock, lang)} ${p.unit}`} c={low ? C.R : C.G} th={th} />
                <Stat label={t('min_stock', lang)} value={fmt(p.min_stock, lang)} c={th.sub} th={th} />
                <Stat label={t('cost_price', lang)} value={money(p.cost_price, lang)} c={th.sub} th={th} />
                <Stat label={t('sell_price', lang)} value={money(p.sell_price, lang)} c={C.O} th={th} />
              </div>

              {p.supplier_name && (
                <div style={{ fontSize: '10px', color: th.muted, fontFamily: 'DM Mono', marginTop: '8px' }}>
                  🏭 {p.supplier_name}
                </div>
              )}

              <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                <Btn variant="ghost" c={C.B} style={{ flex: 1, padding: '5px 10px', fontSize: '11px' }} onClick={() => { setEditing(p); setOpen(true); }}>{t('edit', lang)}</Btn>
                <Btn variant="ghost" c={C.GL} style={{ padding: '5px 10px', fontSize: '11px' }} onClick={() => setAdjust(p)}>± {t('adjust_stock', lang)}</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      <PartForm open={open} onClose={() => { setOpen(false); setEditing(null); }} onSave={onSave} initial={editing} suppliers={suppliers} th={th} lang={lang} />
      <AdjustModal open={!!adjust} onClose={() => setAdjust(null)} part={adjust} onAdjust={onAdjust} th={th} lang={lang} />
    </div>
  );
}

function Stat({ label, value, c, th }) {
  return (
    <div style={{ background: th.miniCard, padding: '6px 10px', borderRadius: '6px' }}>
      <div style={{ fontSize: '9px', color: th.sub, letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '12px', color: c, fontWeight: 700, fontFamily: 'DM Mono' }}>{value}</div>
    </div>
  );
}

function PartForm({ open, onClose, onSave, initial, suppliers, th, lang }) {
  const [f, setF] = useState({ name: '', name_ar: '', sku: '', category: '', unit: 'pcs', cost_price: 0, sell_price: 0, stock: 0, min_stock: 0, supplier_id: '' });
  useEffect(() => {
    setF(initial || { name: '', name_ar: '', sku: '', category: '', unit: 'pcs', cost_price: 0, sell_price: 0, stock: 0, min_stock: 0, supplier_id: '' });
  }, [initial, open]);

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? t('edit', lang) : t('add_part', lang)} th={th} lang={lang}>
      <Input th={th} lang={lang} label={t('part_name', lang)} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <Input th={th} lang={lang} label={t('part_name_ar', lang)} value={f.name_ar} onChange={e => setF({ ...f, name_ar: e.target.value })} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input th={th} lang={lang} label={t('sku', lang)} value={f.sku} onChange={e => setF({ ...f, sku: e.target.value })} />
        <Input th={th} lang={lang} label={t('category', lang)} value={f.category} onChange={e => setF({ ...f, category: e.target.value })} />
        <Input th={th} lang={lang} label={t('unit', lang)} value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })} />
        <Select th={th} lang={lang} label={t('supplier', lang)} value={f.supplier_id || ''} onChange={e => setF({ ...f, supplier_id: e.target.value || null })}
          options={[{ value: '', label: '—' }, ...suppliers.map(s => ({ value: s.id, label: `${s.code} · ${s.name}` }))]} />
        <Input th={th} lang={lang} label={t('cost_price', lang)} type="number" step="0.001" value={f.cost_price} onChange={e => setF({ ...f, cost_price: Number(e.target.value) })} />
        <Input th={th} lang={lang} label={t('sell_price', lang)} type="number" step="0.001" value={f.sell_price} onChange={e => setF({ ...f, sell_price: Number(e.target.value) })} />
        <Input th={th} lang={lang} label={t('stock', lang)} type="number" value={f.stock} onChange={e => setF({ ...f, stock: Number(e.target.value) })} />
        <Input th={th} lang={lang} label={t('min_stock', lang)} type="number" value={f.min_stock} onChange={e => setF({ ...f, min_stock: Number(e.target.value) })} />
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end' }}>
        <Btn variant="ghost" c={C.B} onClick={onClose}>{t('cancel', lang)}</Btn>
        <Btn c={C.O} disabled={!f.name} onClick={() => onSave(f)}>{t('save', lang)}</Btn>
      </div>
    </Modal>
  );
}

function AdjustModal({ open, onClose, part, onAdjust, th, lang }) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) { setDelta(0); setReason(''); } }, [open]);
  if (!part) return null;
  return (
    <Modal open={open} onClose={onClose} title={`${t('adjust_stock', lang)} · ${part.code}`} th={th} lang={lang} width={420}>
      <div style={{ fontSize: '12px', color: th.sub, marginBottom: '12px' }}>
        {lang === 'ar' ? 'المخزون الحالي' : 'Current stock'}: <strong style={{ color: th.txt }}>{part.stock} {part.unit}</strong>
      </div>
      <Input th={th} lang={lang} label={`+/− ${t('quantity', lang)}`} type="number" value={delta} onChange={e => setDelta(Number(e.target.value))} />
      <Input th={th} lang={lang} label={t('notes', lang)} value={reason} onChange={e => setReason(e.target.value)} />
      <div style={{ fontSize: '11px', color: th.sub, marginBottom: '10px' }}>
        {lang === 'ar' ? 'بعد التعديل' : 'After adjustment'}: <strong>{part.stock + delta}</strong>
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end' }}>
        <Btn variant="ghost" c={C.B} onClick={onClose}>{t('cancel', lang)}</Btn>
        <Btn c={C.O} onClick={() => onAdjust(delta, reason)}>{t('save', lang)}</Btn>
      </div>
    </Modal>
  );
}
