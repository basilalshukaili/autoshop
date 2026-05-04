import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, post } from '../api.js';
import { C, ff, fd } from '../theme.js';
import { t, money, dateOnly, dt } from '../i18n.js';
import { Btn, Card, Pill, Modal, Select, Spinner, useToast } from '../ui.jsx';

export default function InvoiceDetail({ th, lang, worker, settings }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [inv, setInv] = useState(null);
  const [err, setErr] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const toast = useToast();

  const load = () => {
    setErr(null);
    get(`/invoices/${id}`).then(setInv).catch(e => setErr(e.message || 'Failed to load'));
  };
  useEffect(() => { load(); }, [id]);

  if (err) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
      <div style={{ fontSize: '14px', color: th.txt, marginBottom: '14px' }}>{err}</div>
      <Btn c={C.B} onClick={() => nav('/invoices')}>← {t('back', lang)}</Btn>
    </div>
  );
  if (!inv) return <Spinner />;

  const printIt = () => window.print();
  const pay = async (method) => {
    await post(`/invoices/${id}/pay`, { method });
    toast.push('✓ ' + t('paid', lang), C.G);
    setPayOpen(false); load();
  };

  // Use customer's preferred language for the printed invoice
  const il = inv.language || lang;
  const isAr = il === 'ar';

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <Btn variant="ghost" c={C.B} onClick={() => nav('/invoices')} style={{ padding: '5px 12px', fontSize: '11px' }}>← {t('back', lang)}</Btn>
        <div style={{ flex: 1 }} />
        <Btn variant="ghost" c={C.GL} onClick={printIt}>🖨 {t('print_invoice', lang)}</Btn>
        {!inv.paid && <Btn c={C.G} onClick={() => setPayOpen(true)}>✓ {t('mark_paid', lang)}</Btn>}
      </div>

      <div className="invoice-print" style={{
        background: th.surf, border: `1px solid ${th.border}`, borderRadius: '12px',
        padding: '40px', maxWidth: '820px', margin: '0 auto',
        direction: isAr ? 'rtl' : 'ltr', color: th.txt,
        fontFamily: isAr ? "'Noto Kufi Arabic'" : "'DM Mono'",
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '30px', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '10px',
                background: 'linear-gradient(135deg,#818CF8,#4F46E5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff',
              }}>A</div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: isAr ? "'Noto Kufi Arabic'" : "'Inter'", letterSpacing: '-0.02em' }}>
                  {isAr ? settings.shop_name_ar : settings.shop_name}
                </div>
                <div style={{ fontSize: '11px', color: th.sub }}>
                  {isAr ? settings.shop_address_ar : settings.shop_address}
                </div>
                <div style={{ fontSize: '11px', color: th.sub }}>
                  📞 {settings.shop_phone} · ✉ {settings.shop_email}
                </div>
                {settings.vat_number && <div style={{ fontSize: '10.5px', color: th.sub, fontFamily: 'DM Mono' }}>VAT #: {settings.vat_number}</div>}
              </div>
            </div>
          </div>
          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
            <div style={{ fontSize: '11px', color: th.sub, letterSpacing: '2px', fontFamily: 'DM Mono' }}>
              {isAr ? 'فاتورة ضريبية' : 'TAX INVOICE'}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: C.O, fontFamily: 'DM Mono', marginTop: '4px' }}>
              {inv.code}
            </div>
            <div style={{ fontSize: '11px', color: th.sub, marginTop: '4px' }}>
              {dateOnly(inv.issued_at, il)}
            </div>
            <Pill c={inv.paid ? C.G : C.R} >{inv.paid ? '✓ ' + (isAr ? 'مدفوعة' : 'PAID') : '⏳ ' + (isAr ? 'غير مدفوعة' : 'UNPAID')}</Pill>
          </div>
        </div>

        {/* Bill to */}
        <div style={{
          background: th.miniCard, border: `1px solid ${th.border}`, borderRadius: '10px',
          padding: '16px', marginBottom: '24px',
        }}>
          <div style={{ fontSize: '10px', color: th.sub, letterSpacing: '2px', marginBottom: '6px' }}>
            {isAr ? 'الفاتورة إلى' : 'BILL TO'}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700 }}>{inv.customer_name}</div>
          <div style={{ fontSize: '11px', color: th.sub }}>📞 {inv.customer_phone}</div>
          {inv.customer_address && <div style={{ fontSize: '11px', color: th.sub }}>📍 {inv.customer_address}</div>}
          {inv.plate && (
            <div style={{ fontSize: '11px', color: th.sub, marginTop: '6px' }}>
              🚗 {inv.make} {inv.model} {inv.year} · {isAr ? 'لوحة' : 'Plate'}: {inv.plate} · {isAr ? 'العداد' : 'Mileage'}: {inv.mileage}
            </div>
          )}
          {inv.wo_code && (
            <div style={{ fontSize: '10px', color: th.muted, marginTop: '4px', fontFamily: 'DM Mono' }}>
              {isAr ? 'أمر العمل' : 'Work Order'}: {inv.wo_code}
            </div>
          )}
          {inv.problem && (
            <div style={{ fontSize: '11px', color: th.sub, marginTop: '6px' }}>
              {isAr ? 'المشكلة' : 'Issue'}: "{inv.problem}"
            </div>
          )}
        </div>

        {/* Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.O}` }}>
              <th style={cellH(isAr, 'start')}>{isAr ? 'الوصف' : 'Description'}</th>
              <th style={cellH(isAr, 'center')}>{isAr ? 'الكمية' : 'Qty'}</th>
              <th style={cellH(isAr, 'end')}>{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
              <th style={cellH(isAr, 'end')}>{isAr ? 'الإجمالي' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            {(inv.parts || []).map(p => (
              <tr key={'p' + p.id} style={{ borderBottom: `1px solid ${th.border}` }}>
                <td style={cell(isAr, 'start')}>
                  <div>{isAr && p.name_ar ? p.name_ar : p.part_name}</div>
                  <div style={{ fontSize: '10px', color: th.muted, fontFamily: 'DM Mono' }}>{p.part_code}</div>
                </td>
                <td style={cell(isAr, 'center')}>{p.quantity} {p.unit}</td>
                <td style={cell(isAr, 'end')}>{money(p.unit_price, il)}</td>
                <td style={cell(isAr, 'end')}><strong>{money(p.quantity * p.unit_price, il)}</strong></td>
              </tr>
            ))}
            {(inv.labor || []).map(l => (
              <tr key={'l' + l.id} style={{ borderBottom: `1px solid ${th.border}` }}>
                <td style={cell(isAr, 'start')}>
                  <div>{l.description}</div>
                  <div style={{ fontSize: '10px', color: th.muted, fontFamily: 'DM Mono' }}>{isAr ? 'عمالة' : 'Labor'}</div>
                </td>
                <td style={cell(isAr, 'center')}>{l.hours} {isAr ? 'س' : 'hrs'}</td>
                <td style={cell(isAr, 'end')}>{money(l.rate, il)}</td>
                <td style={cell(isAr, 'end')}><strong>{money(l.hours * l.rate, il)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: isAr ? 'flex-start' : 'flex-end' }}>
          <div style={{ width: '300px' }}>
            <Row label={isAr ? 'المجموع' : 'Subtotal'} value={money(inv.subtotal, il)} th={th} />
            <Row label={isAr ? `ض.ق.م (${(inv.vat_rate * 100).toFixed(0)}٪)` : `VAT (${(inv.vat_rate * 100).toFixed(0)}%)`} value={money(inv.vat_amount, il)} th={th} />
            <div style={{ borderTop: `2px solid ${C.O}`, marginTop: '8px', paddingTop: '8px' }}>
              <Row label={isAr ? 'الإجمالي الكلي' : 'GRAND TOTAL'} value={money(inv.total, il)} th={th} bold size="16px" />
            </div>
            {inv.paid && (
              <div style={{ marginTop: '10px', fontSize: '10px', color: C.G, textAlign: isAr ? 'right' : 'left' }}>
                ✓ {isAr ? 'مدفوعة عبر' : 'Paid via'} {inv.payment_method} · {dt(inv.paid_at, il)}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px', paddingTop: '20px',
          borderTop: `1px solid ${th.border}`,
          textAlign: 'center', fontSize: '11px', color: th.sub,
        }}>
          <div style={{ fontWeight: 700, color: C.O }}>
            {isAr ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}
          </div>
        </div>
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={t('payment_method', lang)} th={th} lang={lang} width={400}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { v: 'cash', label: '💵 ' + t('cash', lang), c: C.G },
            { v: 'card', label: '💳 ' + t('card', lang), c: C.B },
            { v: 'transfer', label: '🏦 ' + t('transfer', lang), c: C.P },
          ].map(o => (
            <Btn key={o.v} c={o.c} onClick={() => pay(o.v)}>{o.label}</Btn>
          ))}
        </div>
      </Modal>
    </div>
  );
}

const cellH = (isAr, align) => ({
  padding: '10px 8px', fontSize: '10.5px', letterSpacing: '1.5px', color: '#94A3B8',
  textTransform: 'uppercase',
  textAlign: align === 'start' ? (isAr ? 'right' : 'left') : align === 'end' ? (isAr ? 'left' : 'right') : 'center',
});
const cell = (isAr, align) => ({
  padding: '10px 8px',
  textAlign: align === 'start' ? (isAr ? 'right' : 'left') : align === 'end' ? (isAr ? 'left' : 'right') : 'center',
  verticalAlign: 'top',
});

function Row({ label, value, th, bold, size = '12px' }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      fontSize: size, fontWeight: bold ? 800 : 500,
      color: bold ? C.O : th.sub, padding: '4px 0', fontFamily: 'DM Mono',
    }}>
      <span>{label}</span><span style={{ color: th.txt }}>{value}</span>
    </div>
  );
}
