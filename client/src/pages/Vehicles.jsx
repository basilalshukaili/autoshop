import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del } from '../api.js';
import { C, ff, fd } from '../theme.js';
import { t, fmt } from '../i18n.js';
import { Btn, Card, Tag, Empty, Spinner, useToast, Modal, Select, Input } from '../ui.jsx';
import { Header } from './Customers.jsx';
import { VehicleForm } from './CustomerDetail.jsx';

export default function Vehicles({ th, lang, worker }) {
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [pickCustomerOpen, setPickCustomerOpen] = useState(false);
  const [pickedCustomer, setPickedCustomer] = useState(null);
  const [editing, setEditing] = useState(null);
  const nav = useNavigate();
  const toast = useToast();

  const load = () => {
    setLoading(true);
    get(`/vehicles?q=${encodeURIComponent(q)}`).then(r => { setList(Array.isArray(r) ? r : []); setLoading(false); }).catch(() => setLoading(false));
    get('/customers').then(r => setCustomers(Array.isArray(r) ? r : [])).catch(() => {});
  };
  useEffect(() => { load(); }, [q]);

  const onDelete = async (v) => {
    if (!confirm(t('confirm_delete', lang))) return;
    await del(`/vehicles/${v.id}`);
    toast.push('🗑 ' + t('saved', lang), C.O);
    load();
  };

  return (
    <div>
      <Header th={th} lang={lang} title={t('vehicles', lang)} count={list.length}
        action={<Btn c={C.O} onClick={() => { setEditing(null); setPickedCustomer(null); setPickCustomerOpen(true); }}>+ {t('add_vehicle', lang)}</Btn>} />

      <input value={q} onChange={e => setQ(e.target.value)}
        placeholder={`🔍 ${t('search', lang)}…`}
        style={{
          width: '100%', maxWidth: '420px', padding: '10px 14px',
          borderRadius: '8px', border: `1px solid ${th.borderS}`,
          background: th.inputBg, color: th.txt, fontSize: '13px',
          outline: 'none', marginBottom: '14px', fontFamily: ff(lang),
          direction: lang === 'ar' ? 'rtl' : 'ltr',
        }} />

      {loading && <Spinner />}
      {!loading && list.length === 0 && <Empty icon="🚗" title={t('no_results', lang)} th={th} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {list.map(v => (
          <Card key={v.id} c={C.B} th={th}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: `${C.B}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
              }}>🚗</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: th.txt }}>{v.make} {v.model} {v.year}</div>
                <div style={{ fontSize: '10.5px', color: th.sub, fontFamily: 'DM Mono', marginTop: 2 }}>
                  {v.code} · 🔢 {v.plate}
                </div>
                <div style={{ fontSize: '10.5px', color: th.sub, marginTop: 6, fontFamily: ff(lang) }}>
                  👤 {v.customer_name}
                </div>
                <div style={{ fontSize: '10px', color: th.muted, fontFamily: 'DM Mono', marginTop: 2 }}>
                  {fmt(v.mileage, lang)} km
                  {v.next_service_mileage && ` · ${lang === 'ar' ? 'صيانة' : 'service'} @ ${fmt(v.next_service_mileage, lang)}`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
              <Btn variant="ghost" c={C.B} style={{ flex: 1, padding: '5px 10px', fontSize: '11px' }}
                onClick={() => { setEditing(v); setPickedCustomer({ id: v.customer_id }); setOpen(true); }}>{t('edit', lang)}</Btn>
              <Btn variant="ghost" c={C.O} style={{ padding: '5px 10px', fontSize: '11px' }}
                onClick={() => nav(`/customers/${v.customer_id}`)}>👤</Btn>
              <Btn variant="ghost" c={C.R} style={{ padding: '5px 10px', fontSize: '11px' }}
                onClick={() => onDelete(v)}>🗑</Btn>
            </div>
          </Card>
        ))}
      </div>

      {/* Pick customer first */}
      <Modal open={pickCustomerOpen} onClose={() => setPickCustomerOpen(false)} title={t('customer', lang)} th={th} lang={lang} width={420}>
        <Select th={th} lang={lang} label={t('customer', lang)} value={pickedCustomer?.id || ''}
          onChange={e => setPickedCustomer({ id: Number(e.target.value) })}
          options={[{ value: '', label: '—' }, ...customers.map(c => ({ value: c.id, label: `${c.code} · ${c.name}` }))]} />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Btn variant="ghost" c={C.B} onClick={() => setPickCustomerOpen(false)}>{t('cancel', lang)}</Btn>
          <Btn c={C.O} disabled={!pickedCustomer?.id} onClick={() => { setPickCustomerOpen(false); setOpen(true); }}>{t('add', lang)}</Btn>
        </div>
      </Modal>

      <VehicleForm
        open={open} onClose={() => { setOpen(false); setEditing(null); }}
        customerId={pickedCustomer?.id}
        initial={editing}
        onSaved={() => { setOpen(false); setEditing(null); load(); }}
        th={th} lang={lang}
      />
    </div>
  );
}
