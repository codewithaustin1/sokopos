export interface PrintableSubscriptionReceipt {
  businessName: string;
  businessCode?: string;
  ownerEmail?: string;
  planName: string;
  billingCycle: 'monthly' | 'annual' | 'lifetime' | string;
  durationLabel?: string;
  amountKes: number;
  channel: 'mpesa_stk' | 'card' | string;
  provider?: 'daraja' | 'paystack' | string;
  reference: string;
  mpesaReceiptNumber?: string;
  phoneOrEmail?: string;
  paidAt?: string;
  expiresAt?: string;
  status?: string;
}

function formatPrintableDate(iso?: string): string {
  if (!iso) return 'N/A';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function appendDetailRow(parent: HTMLElement, label: string, value: string, emphasize = false): void {
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.justifyContent = 'space-between';
  row.style.alignItems = 'baseline';
  row.style.gap = '16px';
  row.style.padding = '7px 0';
  row.style.borderBottom = '1px solid #e2e8f0';

  const labelEl = document.createElement('span');
  labelEl.style.fontSize = '12px';
  labelEl.style.color = '#475569';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.style.fontSize = '12px';
  valueEl.style.fontFamily = emphasize ? 'ui-monospace, monospace' : 'inherit';
  valueEl.style.fontWeight = emphasize ? '700' : '600';
  valueEl.style.color = '#0f172a';
  valueEl.style.textAlign = 'right';
  valueEl.textContent = value;

  row.appendChild(labelEl);
  row.appendChild(valueEl);
  parent.appendChild(row);
}

/**
 * Mounts an isolated clean printable subscription receipt node onto document.body,
 * invokes window.print(), and cleans up afterwards without using window.open.
 */
export function printSubscriptionReceipt(receipt: PrintableSubscriptionReceipt): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const existing = document.getElementById('subscription-receipt-printable');
  if (existing) existing.remove();

  const root = document.createElement('div');
  root.id = 'subscription-receipt-printable';
  root.style.position = 'fixed';
  root.style.left = '-9999px';
  root.style.top = '0';
  root.style.width = '100%';
  root.style.maxWidth = '540px';
  root.style.padding = '32px';
  root.style.backgroundColor = '#ffffff';
  root.style.color = '#0f172a';
  root.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const header = document.createElement('div');
  header.style.borderBottom = '2px solid #0f172a';
  header.style.paddingBottom = '16px';
  header.style.marginBottom = '20px';

  const brand = document.createElement('div');
  brand.style.fontSize = '18px';
  brand.style.fontWeight = '700';
  brand.style.color = '#0f172a';
  brand.textContent = 'Subscription Payment Receipt';

  const subtitle = document.createElement('div');
  subtitle.style.fontSize = '12px';
  subtitle.style.color = '#475569';
  subtitle.style.marginTop = '4px';
  subtitle.textContent = `${receipt.businessName}${receipt.businessCode ? ` · ${receipt.businessCode}` : ''}`;

  header.appendChild(brand);
  header.appendChild(subtitle);
  root.appendChild(header);

  const amountBox = document.createElement('div');
  amountBox.style.padding = '16px';
  amountBox.style.border = '1px solid #cbd5e1';
  amountBox.style.borderRadius = '8px';
  amountBox.style.marginBottom = '20px';
  amountBox.style.display = 'flex';
  amountBox.style.justifyContent = 'space-between';
  amountBox.style.alignItems = 'center';

  const amountLeft = document.createElement('div');
  const amtLabel = document.createElement('div');
  amtLabel.style.fontSize = '11px';
  amtLabel.style.color = '#64748b';
  amtLabel.textContent = 'Total Paid';
  const amtValue = document.createElement('div');
  amtValue.style.fontSize = '22px';
  amtValue.style.fontWeight = '700';
  amtValue.style.fontFamily = 'ui-monospace, monospace';
  amtValue.textContent = `KES ${Number(receipt.amountKes || 0).toLocaleString()}`;
  amountLeft.appendChild(amtLabel);
  amountLeft.appendChild(amtValue);

  const statusText = document.createElement('div');
  statusText.style.fontSize = '12px';
  statusText.style.fontWeight = '700';
  statusText.style.color = '#15803d';
  statusText.textContent = (receipt.status || 'Paid & Verified').toUpperCase();

  amountBox.appendChild(amountLeft);
  amountBox.appendChild(statusText);
  root.appendChild(amountBox);

  const rows = document.createElement('div');
  appendDetailRow(rows, 'Subscription Plan', receipt.planName);
  appendDetailRow(
    rows,
    'Billing Cycle',
    receipt.durationLabel || (receipt.billingCycle === 'annual' ? 'Annual (365 Days)' : 'Monthly (30 Days)')
  );
  appendDetailRow(
    rows,
    'Payment Method',
    receipt.channel === 'card'
      ? 'Paystack Card Checkout'
      : receipt.provider === 'daraja'
      ? 'Safaricom M-Pesa Express'
      : 'M-Pesa STK Push'
  );
  if (receipt.phoneOrEmail) {
    appendDetailRow(rows, 'Payer Contact', receipt.phoneOrEmail, true);
  }
  appendDetailRow(rows, 'Transaction Reference', receipt.reference, true);
  if (receipt.mpesaReceiptNumber) {
    appendDetailRow(rows, 'M-Pesa Receipt Code', receipt.mpesaReceiptNumber, true);
  }
  appendDetailRow(rows, 'Paid At', formatPrintableDate(receipt.paidAt));
  if (receipt.expiresAt) {
    appendDetailRow(rows, 'Active Until', formatPrintableDate(receipt.expiresAt));
  }
  root.appendChild(rows);

  const footer = document.createElement('div');
  footer.style.marginTop = '24px';
  footer.style.fontSize = '11px';
  footer.style.color = '#64748b';
  footer.textContent = `Generated ${formatPrintableDate(new Date().toISOString())}${
    receipt.ownerEmail ? ` · Owner: ${receipt.ownerEmail}` : ''
  }`;
  root.appendChild(footer);

  document.body.appendChild(root);
  document.body.classList.add('printing-subscription-receipt');

  const cleanup = () => {
    document.body.classList.remove('printing-subscription-receipt');
    const el = document.getElementById('subscription-receipt-printable');
    if (el) el.remove();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  setTimeout(() => {
    window.print();
    setTimeout(cleanup, 1500);
  }, 50);
}
