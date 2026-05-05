import puppeteerCore from 'puppeteer-core';
import fs from 'node:fs';

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.CHROME_PATH,
].filter(Boolean);
const CHROME_EXE = CHROME_PATHS.find(p => fs.existsSync(p));

function fillTemplate(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export { fillTemplate };

export async function generateInvoicePDF(inv, settings) {
  const isAr = (inv.language || 'ar') === 'ar';
  const currency = settings.currency || 'OMR';
  const fmt = (n) => Number(n || 0).toFixed(3);
  const shopName = isAr ? (settings.shop_name_ar || settings.shop_name) : (settings.shop_name || 'AutoShop Pro');
  const shopAddr = isAr ? (settings.shop_address_ar || settings.shop_address) : (settings.shop_address || '');

  const partsRows = (inv.parts || []).map(p => `
    <tr>
      <td>${isAr && p.name_ar ? p.name_ar : p.part_name}</td>
      <td style="text-align:center">${p.quantity} ${p.unit || ''}</td>
      <td style="text-align:right">${fmt(p.unit_price)} ${currency}</td>
      <td style="text-align:right"><strong>${fmt(p.quantity * p.unit_price)} ${currency}</strong></td>
    </tr>`).join('');

  const laborRows = (inv.labor || []).map(l => `
    <tr>
      <td>${l.description} <span style="color:#888;font-size:11px">(${isAr ? 'عمالة' : 'Labor'})</span></td>
      <td style="text-align:center">${l.hours} ${isAr ? 'س' : 'hr'}</td>
      <td style="text-align:right">${fmt(l.rate)} ${currency}</td>
      <td style="text-align:right"><strong>${fmt(l.hours * l.rate)} ${currency}</strong></td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: ${isAr ? "'Noto Kufi Arabic', Tahoma, Arial" : "Arial, sans-serif"}; font-size:12px; color:#1a1a1a; padding:32px; background:#fff; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; }
  .logo { width:44px; height:44px; background:linear-gradient(135deg,#64748B,#334155); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800; color:#fff; letter-spacing:-0.03em; }
  .shop-name { font-size:18px; font-weight:800; color:#1a1a1a; letter-spacing:-0.02em; }
  .inv-label { font-size:10px; letter-spacing:2px; color:#888; text-transform:uppercase; }
  .inv-code { font-size:26px; font-weight:800; color:#4F46E5; font-family:monospace; letter-spacing:-0.02em; }
  .bill-box { background:#F5F6FA; border-radius:8px; padding:14px; margin-bottom:22px; font-size:12px; }
  .bill-label { font-size:10px; letter-spacing:2px; color:#888; text-transform:uppercase; margin-bottom:6px; }
  table { width:100%; border-collapse:collapse; margin-bottom:18px; }
  th { border-bottom:2px solid #4F46E5; padding:8px 6px; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:#888; text-align:${isAr ? 'right' : 'left'}; }
  td { border-bottom:1px solid #eee; padding:8px 6px; vertical-align:top; }
  .totals { float:${isAr ? 'left' : 'right'}; width:280px; }
  .total-row { display:flex; justify-content:space-between; padding:4px 0; font-size:12px; color:#555; }
  .grand { border-top:2px solid #4F46E5; margin-top:6px; padding-top:6px; font-size:16px; font-weight:800; color:#4F46E5; }
  .footer { margin-top:40px; padding-top:16px; border-top:1px solid #eee; text-align:center; font-size:11px; color:#888; }
  .paid-badge { display:inline-block; background:#22C55E20; color:#16A34A; border:1px solid #16A34A40; padding:3px 10px; border-radius:4px; font-size:11px; font-weight:700; margin-top:8px; }
</style>
</head>
<body>
<div class="header">
  <div style="display:flex;gap:14px;align-items:center">
    <div class="logo">A</div>
    <div>
      <div class="shop-name">${shopName}</div>
      <div style="font-size:11px;color:#888;margin-top:2px">${shopAddr}</div>
      <div style="font-size:11px;color:#888">${settings.shop_phone || ''}</div>
      ${settings.vat_number ? `<div style="font-size:10px;color:#888;font-family:monospace">VAT #: ${settings.vat_number}</div>` : ''}
    </div>
  </div>
  <div style="text-align:${isAr ? 'left' : 'right'}">
    <div class="inv-label">${isAr ? 'فاتورة ضريبية' : 'TAX INVOICE'}</div>
    <div class="inv-code">${inv.code}</div>
    <div style="font-size:11px;color:#888;margin-top:4px">${inv.issued_at ? new Date(inv.issued_at).toLocaleDateString(isAr ? 'ar-OM' : 'en-OM') : ''}</div>
    ${inv.paid ? '<div class="paid-badge">✓ PAID</div>' : '<div style="display:inline-block;background:#FEE2E220;color:#EF4444;border:1px solid #EF444440;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;margin-top:4px">UNPAID</div>'}
  </div>
</div>

<div class="bill-box">
  <div class="bill-label">${isAr ? 'الفاتورة إلى' : 'BILL TO'}</div>
  <div style="font-size:14px;font-weight:700">${inv.customer_name || ''}</div>
  <div style="color:#555;margin-top:3px">📞 ${inv.customer_phone || ''}</div>
  ${inv.plate ? `<div style="color:#555;margin-top:3px">🚗 ${inv.make || ''} ${inv.model || ''} ${inv.year || ''} · ${isAr ? 'لوحة' : 'Plate'}: ${inv.plate}</div>` : ''}
  ${inv.wo_code ? `<div style="color:#888;font-size:10px;font-family:monospace;margin-top:4px">${isAr ? 'أمر العمل' : 'Work Order'}: ${inv.wo_code}</div>` : ''}
  ${inv.problem ? `<div style="color:#555;margin-top:4px;font-size:11px">${isAr ? 'المشكلة' : 'Issue'}: "${inv.problem}"</div>` : ''}
</div>

<table>
  <thead>
    <tr>
      <th>${isAr ? 'الوصف' : 'Description'}</th>
      <th style="text-align:center">${isAr ? 'الكمية' : 'Qty'}</th>
      <th style="text-align:right">${isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
      <th style="text-align:right">${isAr ? 'الإجمالي' : 'Total'}</th>
    </tr>
  </thead>
  <tbody>${partsRows}${laborRows}</tbody>
</table>

<div style="overflow:hidden">
  <div class="totals">
    <div class="total-row"><span>${isAr ? 'المجموع' : 'Subtotal'}</span><span>${fmt(inv.subtotal)} ${currency}</span></div>
    <div class="total-row"><span>${isAr ? `ض.ق.م (${((inv.vat_rate||0.05)*100).toFixed(0)}٪)` : `VAT (${((inv.vat_rate||0.05)*100).toFixed(0)}%)`}</span><span>${fmt(inv.vat_amount)} ${currency}</span></div>
    <div class="total-row grand"><span>${isAr ? 'الإجمالي الكلي' : 'GRAND TOTAL'}</span><span>${fmt(inv.total)} ${currency}</span></div>
    ${inv.paid ? `<div style="margin-top:8px;font-size:10px;color:#22C55E">✓ ${isAr ? 'مدفوعة عبر' : 'Paid via'} ${inv.payment_method || ''}</div>` : ''}
  </div>
</div>

<div class="footer">
  <div style="font-weight:700;color:#4F46E5">${isAr ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}</div>
</div>
</body>
</html>`;

  if (!CHROME_EXE) throw new Error('Chrome not found for PDF generation');
  const browser = await puppeteerCore.launch({
    executablePath: CHROME_EXE,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
