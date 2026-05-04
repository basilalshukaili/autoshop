import { useEffect, useState } from 'react';
import { get, post, del } from '../api.js';
import { C, ff } from '../theme.js';
import { t, dateOnly } from '../i18n.js';
import { Btn, Card, Modal, Select, Input, Textarea, Empty, Spinner, useToast } from '../ui.jsx';
import { Header } from './Customers.jsx';

export default function Waitlist({ th, lang, worker }) {
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([get('/waitlist'), get('/customers')]).then(([w, c]) => {
      setList(Array.isArray(w) ? w : []);
      setCustomers(Array.isArray(c) ? c : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const save = async (f) => {
    await post('/waitlist', f);
    toast.push(t('saved', lang), C.G);
    setOpen(false); load();
  };
  const cancel = async (id) => { await del(`/waitlist/${id}`); load(); };
  const notify = async (id) => {
    await post(`/waitlist/${id}/notify`);
    toast.push('📲 ' + t('saved', lang), C.G);
    load();
  };

  return (
    <div>
      <Header th={th} lang={lang} title={t('waitlist', lang)} count={list.length}
        action={<Btn c={C.O} onClick={() => setOpen(true)}>+ {t('add', lang)}</Btn>} />

      {loading && <Spinner />}
      {!loading && list.length === 0 && <Empty icon="📅" title={lang === 'ar' ? 'لا أحد في قائمة الانتظار' : 'No one waiting'} th={th} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {list.map((w, i) => (
          <Card key={w.id} c={C.T} th={th}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: `${C.T}20`, color: C.T, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono',
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: th.txt, fontFamily: ff(lang) }}>
                  👤 {w.customer_name} · 📞 {w.customer_phone}
                </div>
                {w.plate && <div style={{ fontSize: '11px', color: th.sub, fontFamily: 'DM Mono' }}>🚗 {w.make} {w.model} · {w.plate}</div>}
                {w.problem && <div style={{ fontSize: '11px', color: th.sub, marginTop: '4px' }}>"{w.problem}"</div>}
                {w.preferred_date && <div style={{ fontSize: '10px', color: th.muted }}>{lang === 'ar' ? 'تاريخ مفضل' : 'Preferred'}: {dateOnly(w.preferred_date, lang)}</div>}
              </div>
              <Btn variant="ghost" c={C.G} onClick={() => notify(w.id)}>📲 {t('send', lang)}</Btn>
              <Btn variant="ghost" c={C.R} onClick={() => cancel(w.id)}>×</Btn>
            </div>
          </Card>
        ))}
      </div>

      <Form open={open} onClose={() => setOpen(false)} onSave={save} customers={customers} th={th} lang={lang} />
    </div>
  );
}

function Form({ open, onClose, onSave, customers, th, lang }) {
  const [f, setF] = useState({ customer_id: '', vehicle_id: '', problem: '', preferred_date: '' });
  const [vehicles, setVehicles] = useState([]);
  useEffect(() => {
    if (f.customer_id) get(`/customers/${f.customer_id}`).then(c => setVehicles(c.vehicles || []));
    else setVehicles([]);
  }, [f.customer_id]);
  return (
    <Modal open={open} onClose={onClose} title={t('add', lang) + ' — ' + t('waitlist', lang)} th={th} lang={lang}>
      <Select th={th} lang={lang} label={t('customer', lang)} value={f.customer_id} onChange={e => setF({ ...f, customer_id: e.target.value })}
        options={[{ value: '', label: '—' }, ...customers.map(c => ({ value: c.id, label: `${c.code} · ${c.name}` }))]} />
      <Select th={th} lang={lang} label={t('vehicle', lang)} value={f.vehicle_id} onChange={e => setF({ ...f, vehicle_id: e.target.value })}
        options={[{ value: '', label: '—' }, ...vehicles.map(v => ({ value: v.id, label: `${v.code} · ${v.make} ${v.model} · ${v.plate}` }))]} />
      <Textarea th={th} lang={lang} label={t('problem', lang)} value={f.problem} onChange={e => setF({ ...f, problem: e.target.value })} />
      <Input th={th} lang={lang} label={lang === 'ar' ? 'تاريخ مفضل' : 'Preferred date'} type="date" value={f.preferred_date} onChange={e => setF({ ...f, preferred_date: e.target.value })} />
      <div style={{ display: 'flex', gap: '8px', justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end' }}>
        <Btn variant="ghost" c={C.B} onClick={onClose}>{t('cancel', lang)}</Btn>
        <Btn c={C.O} disabled={!f.customer_id} onClick={() => onSave(f)}>{t('save', lang)}</Btn>
      </div>
    </Modal>
  );
}
