import { useEffect, useState } from 'react';
import { get, post, patch } from '../api.js';
import { C, ff } from '../theme.js';
import { t, money, dateOnly } from '../i18n.js';
import { Btn, Card, Modal, Input, Select, Textarea, Empty, Spinner, useToast, Tag, Pill } from '../ui.jsx';
import { Header } from './Customers.jsx';

export default function PartReturns({ th, lang, worker }) {
  const [list, setList] = useState([]);
  const [parts, setParts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([get('/part-returns'), get('/parts'), get('/suppliers')]).then(([r, p, s]) => {
      setList(Array.isArray(r) ? r : []);
      setParts(Array.isArray(p) ? p : []);
      setSuppliers(Array.isArray(s) ? s : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const save = async (f) => {
    try {
      await post('/part-returns', f);
      toast.push(t('saved', lang), C.G);
      setOpen(false); load();
    } catch (e) { toast.push(e.message, C.R); }
  };

  const advance = async (r, nextStatus) => {
    try {
      await patch(`/part-returns/${r.id}/status`, { status: nextStatus });
      toast.push(`✓ ${nextStatus}`, C.G);
      load();
    } catch (e) { toast.push(e.message, C.R); }
  };

  // Status meta: color + label + next-step button label
  const statusMeta = (status) => {
    const map = {
      pending:  { c: C.GL, label: lang === 'ar' ? 'قيد الانتظار' : 'Pending',  next: 'shipped',  nextLabel: lang === 'ar' ? '📦 شُحن إلى المورد' : '📦 Mark Shipped' },
      shipped:  { c: C.B,  label: lang === 'ar' ? 'مُرسل' : 'Shipped',          next: 'credited', nextLabel: lang === 'ar' ? '💵 تم استلام الرصيد' : '💵 Mark Credited' },
      credited: { c: C.G,  label: lang === 'ar' ? 'تم الرصيد' : 'Credited',     next: null,       nextLabel: null },
      rejected: { c: C.R,  label: lang === 'ar' ? 'مرفوض' : 'Rejected',         next: null,       nextLabel: null },
    };
    return map[status] || map.pending;
  };

  return (
    <div>
      <Header th={th} lang={lang} title={t('returns', lang)} count={list.length}
        action={<Btn c={C.O} onClick={() => setOpen(true)}>+ {t('add', lang)}</Btn>} />

      {loading && <Spinner />}
      {!loading && list.length === 0 && <Empty icon="↩️" title={t('no_results', lang)} th={th} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {list.map(r => {
          const m = statusMeta(r.status);
          return (
            <Card key={r.id} c={m.c} th={th}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '20px' }}>↩️</span>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: th.txt }}>{r.part_name}</div>
                  <div style={{ fontSize: '10.5px', color: th.sub, fontFamily: 'DM Mono', marginTop: '2px' }}>
                    {r.part_code} · {r.quantity} qty · {r.supplier_name || '—'}
                  </div>
                  {r.reason && <div style={{ fontSize: '11px', color: th.sub, marginTop: '4px' }}>"{r.reason}"</div>}
                </div>
                <div style={{ textAlign: lang === 'ar' ? 'left' : 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.O }}>{money(r.credit_amount, lang)}</div>
                  <div style={{ fontSize: '10px', color: th.muted, fontFamily: 'DM Mono' }}>{dateOnly(r.return_date, lang)}</div>
                  <div style={{ fontSize: '10px', color: th.muted }}>{lang === 'ar' ? 'بواسطة' : 'by'} {r.authorized_name}</div>
                </div>
                <Pill c={m.c}>{m.label}</Pill>
              </div>
              {(m.next || r.status !== 'rejected' || r.status !== 'credited') && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end', flexWrap: 'wrap' }}>
                  {m.next && (
                    <Btn c={m.c} onClick={() => advance(r, m.next)} style={{ padding: '6px 12px', fontSize: 11 }}>
                      {m.nextLabel}
                    </Btn>
                  )}
                  {r.status !== 'rejected' && r.status !== 'credited' && (
                    <Btn variant="ghost" c={C.R} onClick={() => advance(r, 'rejected')} style={{ padding: '6px 12px', fontSize: 11 }}>
                      ❌ {lang === 'ar' ? 'رفض الإرجاع' : 'Reject'}
                    </Btn>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Form open={open} onClose={() => setOpen(false)} parts={parts} suppliers={suppliers} onSave={save} th={th} lang={lang} />
    </div>
  );
}

function Form({ open, onClose, parts, suppliers, onSave, th, lang }) {
  const [f, setF] = useState({ part_id: '', supplier_id: '', quantity: 1, reason: '', credit_amount: 0 });
  useEffect(() => {
    if (f.part_id) {
      const p = parts.find(x => x.id === Number(f.part_id));
      if (p) setF(prev => ({ ...prev, supplier_id: p.supplier_id || '', credit_amount: p.cost_price * prev.quantity }));
    }
  }, [f.part_id, f.quantity]);

  return (
    <Modal open={open} onClose={onClose} title={t('returns', lang)} th={th} lang={lang}>
      <Select th={th} lang={lang} label={t('part_name', lang)} value={f.part_id} onChange={e => setF({ ...f, part_id: e.target.value })}
        options={[{ value: '', label: '—' }, ...parts.map(p => ({ value: p.id, label: `${p.code} · ${p.name}` }))]} />
      <Select th={th} lang={lang} label={t('supplier', lang)} value={f.supplier_id} onChange={e => setF({ ...f, supplier_id: e.target.value })}
        options={[{ value: '', label: '—' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input th={th} lang={lang} label={t('quantity', lang)} type="number" value={f.quantity} onChange={e => setF({ ...f, quantity: Number(e.target.value) })} />
        <Input th={th} lang={lang} label={t('amount', lang)} type="number" step="0.001" value={f.credit_amount} onChange={e => setF({ ...f, credit_amount: Number(e.target.value) })} />
      </div>
      <Textarea th={th} lang={lang} label={lang === 'ar' ? 'سبب الإرجاع' : 'Return reason'} value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} />
      <div style={{ display: 'flex', gap: '8px', justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end' }}>
        <Btn variant="ghost" c={C.B} onClick={onClose}>{t('cancel', lang)}</Btn>
        <Btn c={C.O} disabled={!f.part_id} onClick={() => onSave(f)}>{t('save', lang)}</Btn>
      </div>
    </Modal>
  );
}
