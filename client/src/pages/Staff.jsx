import { useEffect, useState } from 'react';
import { get, post, del } from '../api.js';
import { C, ff } from '../theme.js';
import { t } from '../i18n.js';
import { Btn, Card, Modal, Input, Select, Empty, Spinner, useToast, Tag } from '../ui.jsx';
import { Header } from './Customers.jsx';

const ROLES = [
  { value: 'Manager', label_en: 'Manager', label_ar: 'مدير', color: C.O },
  { value: 'Technician', label_en: 'Technician', label_ar: 'فني', color: C.G },
];

const ROLE_DESCRIPTIONS = {
  Manager: {
    label: { en: 'Full Access', ar: 'وصول كامل' },
    desc: { en: 'All pages and all actions — work orders, customers, parts, suppliers, invoices, expenses, reports, staff management, backups, and settings.', ar: 'جميع الصفحات والصلاحيات — أوامر العمل والعملاء والقطع والموردين والفواتير والمصاريف والتقارير وإدارة الموظفين والنسخ الاحتياطية والإعدادات.' },
    access: ['Dashboard', 'Work Orders', 'Customers', 'Vehicles', 'Parts', 'Suppliers', 'Invoices', 'Expenses', 'Waitlist', 'Returns', 'Notifications', 'Reports', 'Staff', 'Audit Log', 'Backups', 'Settings'],
  },
  Technician: {
    label: { en: 'Workshop + Front Desk', ar: 'الورشة والاستقبال' },
    desc: { en: 'Work orders, customers, vehicles, parts, invoices, waitlist, and notifications. No access to suppliers, expenses, reports, or admin settings.', ar: 'أوامر العمل والعملاء والمركبات والقطع والفواتير وقائمة الانتظار والإشعارات. بدون وصول للموردين أو المصاريف أو التقارير أو الإعدادات.' },
    access: ['Dashboard', 'Work Orders', 'Customers', 'Vehicles', 'Parts', 'Invoices', 'Waitlist', 'Notifications'],
  },
};

const AVATARS = ['👑', '🧑‍💼', '👨‍💼', '👩‍💼', '🧑‍🔧', '👷', '🧑', '👨', '👩'];

export default function Staff({ th, lang, worker }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () => { setLoading(true); get('/workers').then(r => { setList(Array.isArray(r) ? r : []); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const save = async (f) => {
    try {
      await post('/workers', f);
      toast.push(t('saved', lang), C.G);
      setOpen(false); load();
    } catch (e) { toast.push(e.message, C.R); }
  };
  const remove = async (id) => {
    if (!confirm(lang === 'ar' ? 'إلغاء تنشيط هذا الموظف؟' : 'Deactivate this worker?')) return;
    await del(`/workers/${id}`); load();
  };

  return (
    <div>
      <Header th={th} lang={lang} title={t('staff', lang)} count={list.length}
        action={<Btn c={C.O} onClick={() => setOpen(true)}>+ {t('add', lang)}</Btn>} />

      {loading && <Spinner />}
      {!loading && list.length === 0 && <Empty icon="👥" title={t('no_results', lang)} th={th} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {list.map(w => {
          const role = ROLES.find(r => r.value === w.role);
          return (
            <Card key={w.id} c={w.color} th={th}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '28px' }}>{w.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: th.txt }}>{lang === 'ar' ? w.name_ar : w.name}</div>
                  <Tag c={w.color}>{role ? (lang === 'ar' ? role.label_ar : role.label_en) : w.role}</Tag>
                </div>
              </div>
              <div style={{ fontSize: '10px', color: th.muted, fontFamily: 'DM Mono' }}>ID #{w.id}</div>
              <Btn variant="ghost" c={C.R} style={{ width: '100%', marginTop: '10px', padding: '5px 10px', fontSize: '11px' }} onClick={() => remove(w.id)}>
                {lang === 'ar' ? 'إلغاء التنشيط' : 'Deactivate'}
              </Btn>
            </Card>
          );
        })}
      </div>

      <Form open={open} onClose={() => setOpen(false)} onSave={save} th={th} lang={lang} />
    </div>
  );
}

function Form({ open, onClose, onSave, th, lang }) {
  const [f, setF] = useState({ name: '', name_ar: '', role: 'Manager', role_ar: 'مدير', color: C.O, avatar: '🧑‍💼', pin: '' });
  useEffect(() => {
    setF({ name: '', name_ar: '', role: 'Manager', role_ar: 'مدير', color: C.O, avatar: '🧑‍💼', pin: '' });
  }, [open]);

  const setRole = (v) => {
    const r = ROLES.find(x => x.value === v);
    setF({ ...f, role: v, role_ar: r?.label_ar || v, color: r?.color || C.G });
  };

  return (
    <Modal open={open} onClose={onClose} title={t('add', lang) + ' — ' + t('staff', lang)} th={th} lang={lang}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input th={th} lang={lang} label={t('name', lang) + ' (EN)'} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <Input th={th} lang={lang} label={t('name', lang) + ' (AR)'} value={f.name_ar} onChange={e => setF({ ...f, name_ar: e.target.value })} />
        <Select th={th} lang={lang} label={lang === 'ar' ? 'الدور' : 'Role'} value={f.role} onChange={e => setRole(e.target.value)}
          options={ROLES.map(r => ({ value: r.value, label: lang === 'ar' ? r.label_ar : r.label_en }))} />
        <Input th={th} lang={lang} label="PIN (4 digits)" value={f.pin} onChange={e => setF({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} maxLength={4} />
      </div>
      {f.role && ROLE_DESCRIPTIONS[f.role] && (() => {
        const rd = ROLE_DESCRIPTIONS[f.role];
        const rc = ROLES.find(r => r.value === f.role)?.color || '#888';
        return (
          <div style={{ background: `${rc}10`, border: `1px solid ${rc}30`, borderRadius: '10px', padding: '12px 14px', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: rc, boxShadow: `0 0 6px ${rc}` }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: rc }}>{rd.label[lang] || rd.label.en}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '8px', lineHeight: '1.5' }}>{rd.desc[lang] || rd.desc.en}</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {rd.access.map(a => (
                <span key={a} style={{ fontSize: '9.5px', background: `${rc}18`, color: rc, padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>{a}</span>
              ))}
            </div>
          </div>
        );
      })()}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', color: th.sub, marginBottom: '6px', letterSpacing: '1px', textTransform: 'uppercase' }}>{lang === 'ar' ? 'صورة' : 'Avatar'}</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {AVATARS.map(a => (
            <button key={a} onClick={() => setF({ ...f, avatar: a })} style={{
              width: '40px', height: '40px', borderRadius: '8px',
              background: f.avatar === a ? `${C.O}25` : th.miniCard,
              border: `1px solid ${f.avatar === a ? C.O : th.border}`,
              fontSize: '20px', cursor: 'pointer',
            }}>{a}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end' }}>
        <Btn variant="ghost" c={C.B} onClick={onClose}>{t('cancel', lang)}</Btn>
        <Btn c={C.O} disabled={!f.name || !/^\d{4}$/.test(f.pin)} onClick={() => onSave(f)}>{t('save', lang)}</Btn>
      </div>
    </Modal>
  );
}
