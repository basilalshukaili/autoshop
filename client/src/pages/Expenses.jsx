import { useEffect, useState } from 'react';
import { get, post, del } from '../api.js';
import { C, ff } from '../theme.js';
import { t, money, dateOnly } from '../i18n.js';
import { Btn, Card, Modal, Input, Select, Empty, Spinner, useToast } from '../ui.jsx';
import { Header } from './Customers.jsx';

const CATS = ['rent', 'electricity', 'tools', 'consumables', 'salaries', 'general'];

export default function Expenses({ th, lang, worker }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () => { setLoading(true); get('/expenses').then(r => { setList(Array.isArray(r) ? r : []); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const total = list.reduce((s, x) => s + Number(x.amount), 0);

  const save = async (f) => {
    try {
      await post('/expenses', f);
      toast.push(t('saved', lang), C.G);
      setOpen(false); load();
    } catch (e) { toast.push(e.message, C.R); }
  };
  const remove = async (id) => {
    if (!confirm(t('confirm_delete', lang))) return;
    await del(`/expenses/${id}`); load();
  };

  return (
    <div>
      <Header th={th} lang={lang} title={t('expenses', lang)} count={list.length}
        action={<Btn c={C.O} onClick={() => setOpen(true)}>+ {t('add_expense', lang)}</Btn>} />

      <Card c={C.PK} th={th} style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '10px', color: th.sub, letterSpacing: '1.5px' }}>
          {lang === 'ar' ? 'إجمالي المصاريف' : 'TOTAL EXPENSES'}
        </div>
        <div style={{ fontSize: '24px', fontWeight: 800, color: C.PK, fontFamily: 'Syne' }}>{money(total, lang)}</div>
      </Card>

      {loading && <Spinner />}
      {!loading && list.length === 0 && <Empty icon="💸" title={t('no_results', lang)} th={th} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {list.map(e => (
          <div key={e.id} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: th.card, border: `1px solid ${C.PK}25`,
            borderRadius: '8px', padding: '10px 14px',
          }}>
            <div style={{ fontSize: '20px' }}>💸</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12.5px', color: th.txt, fontWeight: 600, fontFamily: ff(lang) }}>{e.description || t(e.category, lang)}</div>
              <div style={{ fontSize: '10.5px', color: th.sub, fontFamily: 'DM Mono' }}>
                {dateOnly(e.expense_date, lang)} · {t(e.category, lang)} {e.recurring ? '🔁' : ''}
              </div>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.PK }}>{money(e.amount, lang)}</div>
            <button onClick={() => remove(e.id)} style={{ background: 'none', border: 'none', color: C.R, cursor: 'pointer', fontSize: '14px' }}>×</button>
          </div>
        ))}
      </div>

      <Form open={open} onClose={() => setOpen(false)} onSave={save} th={th} lang={lang} />
    </div>
  );
}

function Form({ open, onClose, onSave, th, lang }) {
  const [f, setF] = useState({ category: 'general', description: '', amount: 0, expense_date: new Date().toISOString().slice(0, 10), recurring: false });
  useEffect(() => { setF({ category: 'general', description: '', amount: 0, expense_date: new Date().toISOString().slice(0, 10), recurring: false }); }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={t('add_expense', lang)} th={th} lang={lang}>
      <Select th={th} lang={lang} label={t('category', lang)} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}
        options={CATS.map(c => ({ value: c, label: t(c, lang) }))} />
      <Input th={th} lang={lang} label={t('description', lang)} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Input th={th} lang={lang} label={t('amount', lang)} type="number" step="0.001" value={f.amount} onChange={e => setF({ ...f, amount: Number(e.target.value) })} />
        <Input th={th} lang={lang} label={t('date', lang)} type="date" value={f.expense_date} onChange={e => setF({ ...f, expense_date: e.target.value })} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: th.sub, marginBottom: '12px' }}>
        <input type="checkbox" checked={f.recurring} onChange={e => setF({ ...f, recurring: e.target.checked })} />
        🔁 {lang === 'ar' ? 'مصروف متكرر' : 'Recurring'}
      </label>
      <div style={{ display: 'flex', gap: '8px', justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end' }}>
        <Btn variant="ghost" c={C.B} onClick={onClose}>{t('cancel', lang)}</Btn>
        <Btn c={C.O} onClick={() => onSave(f)}>{t('save', lang)}</Btn>
      </div>
    </Modal>
  );
}
