import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, post, put } from '../api.js';
import { C, ff, fd } from '../theme.js';
import { t, money, dateOnly, dt } from '../i18n.js';
import { Btn, Card, Tag, Pill, Spinner, useToast, statusColor, statusIcon, Modal, Input, Select, Textarea } from '../ui.jsx';
import { post as apiPost } from '../api.js';

export default function CustomerDetail({ th, lang, worker }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [c, setC] = useState(null);
  const [err, setErr] = useState(null);
  const [vOpen, setVOpen] = useState(false);
  const toast = useToast();

  const load = () => {
    setErr(null);
    get(`/customers/${id}`)
      .then(data => setC({ ...data, vehicles: data.vehicles || [], work_orders: data.work_orders || [], invoices: data.invoices || [] }))
      .catch(e => setErr(e.message || 'Failed to load customer'));
  };
  useEffect(() => { load(); }, [id]);

  if (err) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
      <div style={{ fontSize: '14px', color: th.txt, marginBottom: '14px' }}>{err}</div>
      <Btn c={C.B} onClick={() => nav('/customers')}>← {t('back', lang)}</Btn>
    </div>
  );
  if (!c) return <Spinner />;

  return (
    <div>
      <Btn variant="ghost" c={C.B} onClick={() => nav('/customers')} style={{ marginBottom: '14px', padding: '5px 12px', fontSize: '11px' }}>
        ← {t('back', lang)}
      </Btn>

      {/* Customer header */}
      <Card c={C.O} th={th} style={{ marginBottom: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{
            width: '54px', height: '54px', borderRadius: '14px',
            background: `${C.O}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
          }}>👤</div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: th.txt, fontFamily: fd(lang) }}>{c.name}</div>
            <div style={{ fontSize: '11px', color: th.sub, fontFamily: 'DM Mono', marginTop: '2px' }}>
              {c.code} · {c.phone}
            </div>
          </div>
          <Btn c={C.O} onClick={() => nav('/work-orders/new?customer=' + c.id)}>+ {t('new_work_order', lang)}</Btn>
        </div>
      </Card>

      {/* Vehicles */}
      <Card c={C.B} th={th} style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: th.txt, fontFamily: fd(lang) }}>
            🚗 {t('vehicles', lang)} ({c.vehicles.length})
          </div>
          <Btn variant="ghost" c={C.B} onClick={() => setVOpen(true)} style={{ padding: '5px 12px', fontSize: '11px' }}>+ {t('add_vehicle', lang)}</Btn>
        </div>
        {c.vehicles.length === 0 && <div style={{ fontSize: '12px', color: th.sub }}>—</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
          {c.vehicles.map(v => (
            <div key={v.id} style={{
              background: th.miniCard, border: `1px solid ${C.B}25`,
              borderRadius: '8px', padding: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🚗</span>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: th.txt }}>
                    {v.make} {v.model} {v.year}
                  </div>
                  <div style={{ fontSize: '10px', color: th.sub, fontFamily: 'DM Mono' }}>{v.code} · {v.plate}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Work orders */}
      <Card c={C.P} th={th} style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: th.txt, marginBottom: '10px', fontFamily: fd(lang) }}>
          🛠️ {t('work_orders', lang)} ({c.work_orders.length})
        </div>
        {c.work_orders.length === 0 && <div style={{ fontSize: '12px', color: th.sub }}>—</div>}
        {c.work_orders.map(w => (
          <div key={w.id} onClick={() => nav(`/work-orders/${w.id}`)} style={{
            display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
            padding: '8px 10px', background: th.miniCard,
            border: `1px solid ${statusColor(w.status)}25`, borderRadius: '8px', marginBottom: '5px',
          }}>
            <span>{statusIcon(w.status)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: th.txt, fontWeight: 600 }}>{w.problem}</div>
              <div style={{ fontSize: '10px', color: th.sub, fontFamily: 'DM Mono' }}>{w.code} · {dateOnly(w.opened_at, lang)}</div>
            </div>
            <Pill c={statusColor(w.status)}>{t(`status_${w.status}`, lang) || w.status}</Pill>
          </div>
        ))}
      </Card>

      {/* Invoices */}
      <Card c={C.T} th={th}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: th.txt, marginBottom: '10px', fontFamily: fd(lang) }}>
          🧾 {t('invoices', lang)} ({c.invoices.length})
        </div>
        {c.invoices.length === 0 && <div style={{ fontSize: '12px', color: th.sub }}>—</div>}
        {c.invoices.map(i => (
          <div key={i.id} onClick={() => nav(`/invoices/${i.id}`)} style={{
            display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
            padding: '8px 10px', background: th.miniCard, border: `1px solid ${C.T}25`,
            borderRadius: '8px', marginBottom: '5px',
          }}>
            <span>🧾</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: th.txt, fontWeight: 600, fontFamily: 'DM Mono' }}>{i.code}</div>
              <div style={{ fontSize: '10px', color: th.sub }}>{dateOnly(i.issued_at, lang)}</div>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: th.txt }}>{money(i.total, lang)}</div>
            <Pill c={i.paid ? C.G : C.R}>{i.paid ? t('paid', lang) : t('unpaid', lang)}</Pill>
          </div>
        ))}
      </Card>

      <VehicleForm open={vOpen} onClose={() => setVOpen(false)} customerId={c.id} onSaved={() => { setVOpen(false); load(); }} th={th} lang={lang} />
    </div>
  );
}

export function VehicleForm({ open, onClose, customerId, onSaved, th, lang, initial }) {
  const blank = { make: '', model: '', year: new Date().getFullYear(), plate: '', vin: '', color: '' };
  const [f, setF] = useState(blank);
  const [scanning, setScanning] = useState(false);
  const toast = useToast();
  useEffect(() => { setF(initial ? { make: initial.make || '', model: initial.model || '', year: initial.year || new Date().getFullYear(), plate: initial.plate || '', vin: initial.vin || '', color: initial.color || '' } : blank); }, [initial, open]);

  const save = async () => {
    try {
      if (initial?.id) await put(`/vehicles/${initial.id}`, f);
      else await post('/vehicles', { ...f, customer_id: customerId });
      toast.push(t('saved', lang), C.G);
      onSaved();
    } catch (e) { toast.push(e.message, C.R); }
  };

  const scanRegistration = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      setScanning(true);
      try {
        const dataUrls = await Promise.all(files.map(f => new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = ev => resolve(ev.target.result);
          r.onerror = reject;
          r.readAsDataURL(f);
        })));
        const data = await apiPost('/ocr/vehicle', { images: dataUrls });
        setF(prev => ({
          ...prev,
          make: data.make || prev.make,
          model: data.model || prev.model,
          year: data.year || prev.year,
          plate: data.plate || prev.plate,
          vin: data.vin || prev.vin,
          color: data.color || prev.color,
        }));
        const sidesNote = files.length > 1 ? ` (${files.length} ${lang === 'ar' ? 'صور' : 'images'})` : '';
        toast.push((lang === 'ar' ? '✓ تم استخراج البيانات' : '✓ Registration scanned') + sidesNote, C.G);
      } catch (err) {
        toast.push(err.message || 'OCR failed', C.R);
      }
      setScanning(false);
    };
    input.click();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? t('edit', lang) + ' ' + t('vehicle', lang) : t('add_vehicle', lang)} th={th} lang={lang}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <Btn variant="ghost" c={C.T} onClick={scanRegistration} disabled={scanning} style={{ fontSize: '11px', padding: '5px 12px' }}>
          {scanning ? '⏳ ' + (lang === 'ar' ? 'جاري المسح...' : 'Scanning...') : '📷 ' + (lang === 'ar' ? 'مسح استمارة التسجيل' : 'Scan Registration Card')}
        </Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <Input th={th} lang={lang} label={t('make', lang)} value={f.make} onChange={e => setF({ ...f, make: e.target.value })} />
        <Input th={th} lang={lang} label={t('model', lang)} value={f.model} onChange={e => setF({ ...f, model: e.target.value })} />
        <Input th={th} lang={lang} label={t('year', lang)} type="number" value={f.year} onChange={e => setF({ ...f, year: Number(e.target.value) })} />
        <Input th={th} lang={lang} label={t('plate', lang)} value={f.plate} onChange={e => setF({ ...f, plate: e.target.value })} />
        <Input th={th} lang={lang} label={t('color', lang)} value={f.color} onChange={e => setF({ ...f, color: e.target.value })} />
        <Input th={th} lang={lang} label={lang === 'ar' ? 'رقم الشاصي' : 'Chassis No. (VIN)'} value={f.vin} onChange={e => setF({ ...f, vin: e.target.value })} />
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end', marginTop: '8px' }}>
        <Btn variant="ghost" c={C.B} onClick={onClose}>{t('cancel', lang)}</Btn>
        <Btn c={C.O} onClick={save}>{t('save', lang)}</Btn>
      </div>
    </Modal>
  );
}
