import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, post, put, del } from '../api.js';
import { C, ff, fd } from '../theme.js';
import { t, money, fmt, dt, dateOnly } from '../i18n.js';
import { Btn, Card, Pill, Tag, Modal, Input, Select, Textarea, Spinner, useToast, statusColor, statusIcon } from '../ui.jsx';
import { Header } from './Customers.jsx';

export default function WorkOrderDetail({ th, lang, worker, settings }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [w, setW] = useState(null);
  const [err, setErr] = useState(null);
  const [parts, setParts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [partOpen, setPartOpen] = useState(false);
  const [laborOpen, setLaborOpen] = useState(false);
  const toast = useToast();

  const load = () => {
    setErr(null);
    return get(`/work-orders/${id}`).then(setW).catch(e => setErr(e.message || 'Failed to load'));
  };
  useEffect(() => {
    load();
    get('/parts').then(r => setParts(Array.isArray(r) ? r : [])).catch(() => {});
    get('/workers').then(ws => setWorkers((Array.isArray(ws) ? ws : []).filter(x => x.role === 'Technician'))).catch(() => {});
  }, [id]);

  if (err) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
      <div style={{ fontSize: '14px', color: th.txt, marginBottom: '14px' }}>{err}</div>
      <Btn c={C.B} onClick={() => nav('/work-orders')}>← {t('back', lang)}</Btn>
    </div>
  );
  if (!w) return <Spinner />;

  const partsTotal = (w.parts || []).reduce((s, p) => s + p.quantity * p.unit_price, 0);
  const laborTotal = (w.labor || []).reduce((s, l) => s + l.hours * l.rate, 0);
  const subtotal = partsTotal + laborTotal;
  const vatRate = Number(settings.vat_rate || 0.05);
  const vat = subtotal * vatRate;
  const total = subtotal + vat;

  const damage = w.damage_checklist ? safeParse(w.damage_checklist) : null;
  const damageList = damage ? Object.keys(damage).filter(k => damage[k]) : [];

  const update = async (patch) => {
    try {
      await put(`/work-orders/${id}`, { ...w, ...patch });
      toast.push(t('saved', lang), C.G);
      load();
    } catch (e) { toast.push(e.message, C.R); }
  };

  const close = async () => {
    if (!confirm(lang === 'ar' ? 'هل تريد إغلاق الأمر وإصدار فاتورة؟' : 'Close this job and generate the invoice?')) return;
    try {
      const r = await post(`/work-orders/${id}/close`);
      toast.push(`✓ ${r.invoice_code}`, C.G);
      nav(`/invoices/${r.invoice_id}`);
    } catch (e) { toast.push(e.message, C.R); }
  };

  const removePart = async (pid) => {
    await del(`/work-orders/${id}/parts/${pid}`);
    load();
  };
  const removeLabor = async (lid) => {
    await del(`/work-orders/${id}/labor/${lid}`);
    load();
  };


  const printJobCard = () => {
    window.print();
  };

  return (
    <div>
      <Btn variant="ghost" c={C.B} onClick={() => nav('/work-orders')} style={{ marginBottom: '14px', padding: '5px 12px', fontSize: '11px' }} className="no-print">← {t('back', lang)}</Btn>

      {/* Header */}
      <Card c={statusColor(w.status)} th={th} style={{ marginBottom: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '22px' }}>{statusIcon(w.status)}</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: th.txt, fontFamily: 'DM Mono' }}>{w.code}</div>
              <Pill c={statusColor(w.status)}>{t(`status_${w.status}`, lang) || w.status}</Pill>
              {w.priority === 'urgent' && <Pill c={C.R}>🔴 {t('urgent', lang)}</Pill>}
            </div>
            <div style={{ fontSize: '13px', color: th.txt, fontFamily: ff(lang) }}>
              {w.make} {w.model} {w.year} · 🔢 {w.plate}
            </div>
            <div style={{ fontSize: '11px', color: th.sub, fontFamily: ff(lang), marginTop: '2px' }}>
              👤 {w.customer_name} · 📞 {w.customer_phone}
            </div>
            <div style={{ fontSize: '10px', color: th.muted, fontFamily: 'DM Mono', marginTop: '2px' }}>
              {dt(w.opened_at, lang)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} className="no-print">
            <Btn variant="ghost" c={C.GL} onClick={printJobCard}>🖨 {t('print_job_card', lang)}</Btn>
            {w.status !== 'invoiced' && (
              <Btn c={C.G} onClick={close}>✓ {t('close_and_invoice', lang)}</Btn>
            )}
            {w.invoice && (
              <Btn c={C.T} onClick={() => nav(`/invoices/${w.invoice.id}`)}>🧾 {w.invoice.code}</Btn>
            )}
          </div>
        </div>
      </Card>

      {/* status / priority / tech change */}
      <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <Select th={th} lang={lang} value={w.status} onChange={e => update({ status: e.target.value })}
          options={['in_progress', 'urgent', 'waiting_parts', 'ready', 'invoiced'].map(s => ({ value: s, label: `${statusIcon(s)} ${t(`status_${s}`, lang) || s}` }))}
          style={{ minWidth: '180px' }} />
        <Select th={th} lang={lang} value={w.priority} onChange={e => update({ priority: e.target.value })}
          options={[
            { value: 'normal', label: t('normal', lang) },
            { value: 'urgent', label: '🔴 ' + t('urgent', lang) },
            { value: 'scheduled', label: t('scheduled', lang) },
          ]} style={{ minWidth: '160px' }} />
        <Select th={th} lang={lang} value={w.technician_id || ''} onChange={e => update({ technician_id: e.target.value || null })}
          options={[{ value: '', label: '— ' + t('technician', lang) + ' —' }, ...workers.map(x => ({ value: x.id, label: `${x.avatar} ${lang === 'ar' ? x.name_ar : x.name}` }))]}
          style={{ minWidth: '200px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
        {/* Problem & diagnosis */}
        <Card c={C.B} th={th}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: th.txt, marginBottom: '10px', fontFamily: fd(lang) }}>📝 {t('problem', lang)}</div>
          <Textarea th={th} lang={lang} value={w.problem || ''} onChange={e => setW({ ...w, problem: e.target.value })} onBlur={() => update({ problem: w.problem })} />
          <div style={{ fontSize: '12px', fontWeight: 800, color: th.txt, marginBottom: '10px', fontFamily: fd(lang) }}>🔬 {t('diagnosis', lang)}</div>
          <Textarea th={th} lang={lang} value={w.diagnosis || ''} onChange={e => setW({ ...w, diagnosis: e.target.value })} onBlur={() => update({ diagnosis: w.diagnosis })} />
        </Card>

        {/* Parts */}
        <Card c={C.G} th={th}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: th.txt, fontFamily: fd(lang) }}>🔩 {t('parts', lang)}</div>
            <Btn variant="ghost" c={C.G} onClick={() => setPartOpen(true)} style={{ padding: '4px 10px', fontSize: '11px' }} className="no-print">+ {t('add_part_to_job', lang)}</Btn>
          </div>
          {(w.parts || []).length === 0 && <div style={{ fontSize: '12px', color: th.sub }}>—</div>}
          {(w.parts || []).map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px', background: th.miniCard,
              border: `1px solid ${C.G}25`, borderRadius: '7px', marginBottom: '5px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: th.txt, fontWeight: 600 }}>
                  {lang === 'ar' && p.name_ar ? p.name_ar : p.part_name}
                </div>
                <div style={{ fontSize: '10px', color: th.sub, fontFamily: 'DM Mono' }}>
                  {p.part_code} · {p.quantity} {p.unit} × {money(p.unit_price, lang)}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: th.txt, fontWeight: 700 }}>{money(p.quantity * p.unit_price, lang)}</div>
              <button onClick={() => removePart(p.id)} className="no-print" style={{ background: 'none', border: 'none', color: C.R, cursor: 'pointer', fontSize: '14px' }}>×</button>
            </div>
          ))}
          <div style={{ marginTop: '10px', fontSize: '11px', color: th.sub, textAlign: lang === 'ar' ? 'left' : 'right', fontFamily: 'DM Mono' }}>
            {t('subtotal', lang)}: <strong style={{ color: th.txt }}>{money(partsTotal, lang)}</strong>
          </div>
        </Card>

        {/* Labor */}
        <Card c={C.GL} th={th}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: th.txt, fontFamily: fd(lang) }}>🔧 {t('labor', lang)}</div>
            <Btn variant="ghost" c={C.GL} onClick={() => setLaborOpen(true)} style={{ padding: '4px 10px', fontSize: '11px' }} className="no-print">+ {t('add_labor', lang)}</Btn>
          </div>
          {(w.labor || []).length === 0 && <div style={{ fontSize: '12px', color: th.sub }}>—</div>}
          {(w.labor || []).map(l => (
            <div key={l.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px', background: th.miniCard,
              border: `1px solid ${C.GL}25`, borderRadius: '7px', marginBottom: '5px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: th.txt, fontWeight: 600 }}>{l.description}</div>
                <div style={{ fontSize: '10px', color: th.sub, fontFamily: 'DM Mono' }}>
                  {l.hours} {lang === 'ar' ? 'س' : 'hrs'} × {money(l.rate, lang)}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: th.txt, fontWeight: 700 }}>{money(l.hours * l.rate, lang)}</div>
              <button onClick={() => removeLabor(l.id)} className="no-print" style={{ background: 'none', border: 'none', color: C.R, cursor: 'pointer', fontSize: '14px' }}>×</button>
            </div>
          ))}
          <div style={{ marginTop: '10px', fontSize: '11px', color: th.sub, textAlign: lang === 'ar' ? 'left' : 'right', fontFamily: 'DM Mono' }}>
            {t('subtotal', lang)}: <strong style={{ color: th.txt }}>{money(laborTotal, lang)}</strong>
          </div>
        </Card>

        {/* Damage */}
        {damage && damageList.length > 0 && (
          <Card c={C.R} th={th}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: th.txt, marginBottom: '10px', fontFamily: fd(lang) }}>📋 {t('damage_checklist', lang)}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {damageList.map(k => <Tag key={k} c={C.R}>{k.replace(/_/g, ' ')}</Tag>)}
            </div>
            {w.customer_signature && (
              <div style={{ marginTop: '10px', fontSize: '10px', color: C.G, fontFamily: 'DM Mono' }}>
                ✍ {lang === 'ar' ? 'موقّع' : 'Signed'} · {dt(w.customer_signature, lang)}
              </div>
            )}
          </Card>
        )}

        {/* Total */}
        <Card c={C.O} th={th}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: th.txt, marginBottom: '12px', fontFamily: fd(lang) }}>💰 {t('total', lang)}</div>
          <Row label={t('subtotal', lang)} value={money(subtotal, lang)} th={th} />
          <Row label={`${t('vat', lang)} (${(vatRate * 100).toFixed(0)}%)`} value={money(vat, lang)} th={th} />
          <div style={{ height: '1px', background: th.border, margin: '8px 0' }} />
          <Row label={t('grand_total', lang)} value={money(total, lang)} th={th} bold />
          {w.estimate_total > 0 && (
            <div style={{ marginTop: '10px', padding: '8px', background: th.miniCard, borderRadius: '6px', fontSize: '10.5px' }}>
              <div style={{ color: th.sub }}>{t('estimate', lang)}: {money(w.estimate_total, lang)}</div>
              <div style={{ color: total > w.estimate_total ? C.R : C.G, marginTop: '2px' }}>
                {total > w.estimate_total ? '↑' : '↓'} {money(Math.abs(total - w.estimate_total), lang)}
              </div>
            </div>
          )}
          <Input th={th} lang={lang} type="number" label={t('estimate_total', lang)} value={w.estimate_total || 0}
            onChange={e => setW({ ...w, estimate_total: Number(e.target.value) })} onBlur={() => update({ estimate_total: w.estimate_total })} />
        </Card>
      </div>

      <AddPartModal open={partOpen} onClose={() => setPartOpen(false)} parts={parts} woId={id} onAdded={() => { setPartOpen(false); load(); }} th={th} lang={lang} />
      <AddLaborModal open={laborOpen} onClose={() => setLaborOpen(false)} woId={id} onAdded={() => { setLaborOpen(false); load(); }} th={th} lang={lang} settings={settings} />

      {/* Print-only job card */}
      <div className="print-only" style={{ padding: '24px', color: 'black', background: 'white' }}>
        <h2>JOB CARD · {w.code}</h2>
        <p>Vehicle: {w.make} {w.model} {w.year} — Plate {w.plate}</p>
        <p>Customer: {w.customer_name} · {w.customer_phone}</p>
        <p>Priority: {w.priority} · Status: {w.status}</p>
        <p>Technician: {w.technician_name || '—'}</p>
        <p>Problem: {w.problem}</p>
        <p>Opened: {w.opened_at}</p>
      </div>
    </div>
  );
}

function Row({ label, value, th, bold }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      fontSize: bold ? '14px' : '12px',
      fontWeight: bold ? 800 : 500,
      color: bold ? C.O : th.sub,
      padding: '4px 0', fontFamily: 'DM Mono',
    }}>
      <span>{label}</span><span style={{ color: th.txt }}>{value}</span>
    </div>
  );
}

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }

function AddPartModal({ open, onClose, parts, woId, onAdded, th, lang }) {
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState('');
  const toast = useToast();
  useEffect(() => {
    if (partId) {
      const p = parts.find(x => x.id === Number(partId));
      if (p) setPrice(p.sell_price);
    }
  }, [partId]);
  const submit = async () => {
    try {
      await post(`/work-orders/${woId}/parts`, { part_id: Number(partId), quantity: Number(qty), unit_price: Number(price) });
      toast.push(t('saved', lang), C.G);
      onAdded();
    } catch (e) { toast.push(e.message + (e.body?.available !== undefined ? ` (avail: ${e.body.available})` : ''), C.R); }
  };
  return (
    <Modal open={open} onClose={onClose} title={t('add_part_to_job', lang)} th={th} lang={lang}>
      <Select th={th} lang={lang} label={t('part_name', lang)} value={partId} onChange={e => setPartId(e.target.value)}
        options={[{ value: '', label: '—' }, ...parts.map(p => ({ value: p.id, label: `${p.code} · ${lang === 'ar' && p.name_ar ? p.name_ar : p.name} · stock: ${p.stock}` }))]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input th={th} lang={lang} label={t('quantity', lang)} type="number" step="0.5" value={qty} onChange={e => setQty(e.target.value)} />
        <Input th={th} lang={lang} label={t('unit_price', lang)} type="number" step="0.001" value={price} onChange={e => setPrice(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end' }}>
        <Btn variant="ghost" c={C.B} onClick={onClose}>{t('cancel', lang)}</Btn>
        <Btn c={C.O} onClick={submit}>{t('add', lang)}</Btn>
      </div>
    </Modal>
  );
}

function AddLaborModal({ open, onClose, woId, onAdded, th, lang, settings }) {
  const [desc, setDesc] = useState('');
  const [hours, setHours] = useState(1);
  const [rate, setRate] = useState(settings.labor_rate || 15);
  const toast = useToast();
  useEffect(() => { setRate(settings.labor_rate || 15); }, [settings, open]);
  const submit = async () => {
    try {
      await post(`/work-orders/${woId}/labor`, { description: desc, hours: Number(hours), rate: Number(rate) });
      toast.push(t('saved', lang), C.G);
      onAdded();
    } catch (e) { toast.push(e.message, C.R); }
  };
  return (
    <Modal open={open} onClose={onClose} title={t('add_labor', lang)} th={th} lang={lang}>
      <Input th={th} lang={lang} label={t('description', lang)} value={desc} onChange={e => setDesc(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input th={th} lang={lang} label={t('hours', lang)} type="number" step="0.5" value={hours} onChange={e => setHours(e.target.value)} />
        <Input th={th} lang={lang} label={t('rate', lang)} type="number" step="0.001" value={rate} onChange={e => setRate(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end' }}>
        <Btn variant="ghost" c={C.B} onClick={onClose}>{t('cancel', lang)}</Btn>
        <Btn c={C.O} onClick={submit} disabled={!desc}>{t('add', lang)}</Btn>
      </div>
    </Modal>
  );
}
