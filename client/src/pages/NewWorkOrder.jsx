import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { get, post } from '../api.js';
import { C, ff, fd } from '../theme.js';
import { t } from '../i18n.js';
import { Btn, Card, Input, Textarea, Select, SearchableSelect, Pill, useToast } from '../ui.jsx';
import { Header } from './Customers.jsx';

export default function NewWorkOrder({ th, lang, worker }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();

  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [f, setF] = useState({
    customer_id: params.get('customer') || '',
    vehicle_id: '',
    technician_id: '',
    priority: 'normal',
    problem: '',
    notes: '',
    mileage: '',
    damage_checklist: '',
    customer_signature: '',
  });
  const [damage, setDamage] = useState({
    front_bumper: false, rear_bumper: false, left_side: false, right_side: false,
    hood: false, roof: false, trunk: false, wheels: false, interior: false, glass: false,
  });
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    get('/customers').then(r => setCustomers(Array.isArray(r) ? r : [])).catch(() => {});
    get('/workers').then(ws => setWorkers((Array.isArray(ws) ? ws : []).filter(w => w.role === 'Technician'))).catch(() => {});
  }, []);

  useEffect(() => {
    if (f.customer_id) get(`/customers/${f.customer_id}`).then(c => setVehicles(c?.vehicles || [])).catch(() => setVehicles([]));
    else setVehicles([]);
  }, [f.customer_id]);

  // When a vehicle is selected, auto-fill its last known mileage
  useEffect(() => {
    const v = vehicles.find(x => String(x.id) === String(f.vehicle_id));
    if (v) setF(prev => ({ ...prev, mileage: v.mileage || '' }));
  }, [f.vehicle_id]);

  const submit = async () => {
    if (!f.customer_id || !f.vehicle_id) { toast.push(t('required', lang), C.R); return; }
    const damageStr = JSON.stringify(damage);
    try {
      const r = await post('/work-orders', { ...f, damage_checklist: damageStr, customer_signature: signed ? new Date().toISOString() : '' });
      toast.push(`✓ ${r.code}`, C.G);
      nav(`/work-orders/${r.id}`);
    } catch (e) {
      toast.push(e.message, C.R);
    }
  };

  const checkLabel = (k) => ({
    front_bumper: { en: 'Front Bumper', ar: 'الصدام الأمامي' },
    rear_bumper:  { en: 'Rear Bumper', ar: 'الصدام الخلفي' },
    left_side:    { en: 'Left Side', ar: 'الجانب الأيسر' },
    right_side:   { en: 'Right Side', ar: 'الجانب الأيمن' },
    hood:         { en: 'Hood', ar: 'غطاء المحرك' },
    roof:         { en: 'Roof', ar: 'السقف' },
    trunk:        { en: 'Trunk', ar: 'الصندوق' },
    wheels:       { en: 'Wheels', ar: 'الإطارات' },
    interior:     { en: 'Interior', ar: 'المقصورة' },
    glass:        { en: 'Glass / Mirrors', ar: 'الزجاج والمرايا' },
  }[k][lang]);

  return (
    <div>
      <Btn variant="ghost" c={C.B} onClick={() => nav('/work-orders')} style={{ marginBottom: '14px', padding: '5px 12px', fontSize: '11px' }}>← {t('back', lang)}</Btn>
      <Header th={th} lang={lang} title={t('new_work_order', lang)} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
        <Card c={C.O} th={th}>
          <SectionHead th={th} lang={lang} icon="👤" title={t('customer', lang) + ' / ' + t('vehicle', lang)} />
          <SearchableSelect th={th} lang={lang} label={t('customer', lang)}
            value={f.customer_id}
            onChange={(id) => setF({ ...f, customer_id: id, vehicle_id: '' })}
            placeholder={lang === 'ar' ? '🔍 ابحث بالاسم أو الهاتف أو الرمز…' : '🔍 Search by name, phone, or code…'}
            options={customers.map(c => ({
              value: c.id,
              label: c.name,
              sub: `${c.code}${c.phone ? ' · ' + c.phone : ''}`,
              keywords: `${c.name || ''} ${c.code || ''} ${c.phone || ''}`,
            }))} />
          <SearchableSelect th={th} lang={lang} label={t('vehicle', lang)}
            value={f.vehicle_id}
            onChange={(id) => setF({ ...f, vehicle_id: id })}
            disabled={!f.customer_id}
            placeholder={lang === 'ar' ? '🔍 ابحث بالطراز أو اللوحة…' : '🔍 Search by make, model, plate…'}
            options={vehicles.map(v => ({
              value: v.id,
              label: `${v.make} ${v.model}`,
              sub: `${v.code} · 🔢 ${v.plate}`,
              keywords: `${v.make || ''} ${v.model || ''} ${v.plate || ''} ${v.code || ''}`,
            }))} />
          <Select th={th} lang={lang} label={t('priority', lang)} value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}
            options={[
              { value: 'normal', label: t('normal', lang) },
              { value: 'urgent', label: '🔴 ' + t('urgent', lang) },
              { value: 'scheduled', label: t('scheduled', lang) },
            ]} />
          <Select th={th} lang={lang} label={t('technician', lang)} value={f.technician_id} onChange={e => setF({ ...f, technician_id: e.target.value })}
            options={[{ value: '', label: '—' }, ...workers.map(w => ({ value: w.id, label: `${w.avatar} ${lang === 'ar' ? w.name_ar : w.name}` }))]} />
          <Input th={th} lang={lang} label={lang === 'ar' ? 'عداد الكيلومترات الحالي' : 'Current Mileage (km)'}
            type="number" value={f.mileage}
            onChange={e => setF({ ...f, mileage: e.target.value })}
            hint={lang === 'ar' ? 'يُحدّث سجل المركبة تلقائياً' : 'Auto-updates vehicle record'} />
        </Card>

        <Card c={C.B} th={th}>
          <SectionHead th={th} lang={lang} icon="📝" title={t('problem', lang)} />
          <Textarea th={th} lang={lang} label={t('problem', lang)} value={f.problem} onChange={e => setF({ ...f, problem: e.target.value })}
            placeholder={lang === 'ar' ? 'مثال: التكييف لا يبرد جيداً' : 'e.g. AC not cooling well'} />
          <Textarea th={th} lang={lang} label={t('notes', lang)} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} />
        </Card>

        <Card c={C.GL} th={th}>
          <SectionHead th={th} lang={lang} icon="📋" title={t('damage_checklist', lang)} />
          <div style={{ fontSize: '11px', color: th.sub, marginBottom: '10px' }}>
            {lang === 'ar' ? 'حدد الأضرار الموجودة قبل الاستلام (للحماية القانونية)' : 'Mark existing damage before service (legal protection)'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {Object.keys(damage).map(k => (
              <label key={k} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', background: damage[k] ? `${C.R}15` : th.miniCard,
                border: `1px solid ${damage[k] ? C.R + '40' : th.border}`,
                borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
                color: damage[k] ? C.R : th.txt,
                flexDirection: lang === 'ar' ? 'row-reverse' : 'row',
              }}>
                <input type="checkbox" checked={damage[k]} onChange={e => setDamage({ ...damage, [k]: e.target.checked })} />
                <span style={{ fontFamily: ff(lang) }}>{checkLabel(k)}</span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: '14px' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px', background: signed ? `${C.G}15` : th.miniCard,
              border: `1px solid ${signed ? C.G + '50' : th.border}`,
              borderRadius: '8px', cursor: 'pointer',
              flexDirection: lang === 'ar' ? 'row-reverse' : 'row',
            }}>
              <input type="checkbox" checked={signed} onChange={e => setSigned(e.target.checked)} />
              <div>
                <div style={{ fontSize: '12px', color: th.txt, fontWeight: 700, fontFamily: ff(lang) }}>
                  ✍️ {t('customer_signature', lang)}
                </div>
                <div style={{ fontSize: '10px', color: th.sub, marginTop: '2px' }}>
                  {lang === 'ar' ? 'العميل وافق على قائمة الأضرار' : 'Customer confirms damage checklist above'}
                </div>
              </div>
            </label>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end' }}>
        <Btn variant="ghost" c={C.B} onClick={() => nav('/work-orders')}>{t('cancel', lang)}</Btn>
        <Btn c={C.O} onClick={submit}>{t('save', lang)} & {t('details', lang)}</Btn>
      </div>
    </div>
  );
}

function SectionHead({ th, lang, icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <span style={{ fontSize: '17px' }}>{icon}</span>
      <span style={{ fontSize: '13px', fontWeight: 800, color: th.txt, fontFamily: fd(lang) }}>{title}</span>
    </div>
  );
}
