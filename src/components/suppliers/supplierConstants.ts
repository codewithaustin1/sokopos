import { SupplierPaymentTerms } from '../../types';

export type SupplierSortKey =
  | 'name'
  | 'category'
  | 'paymentTerms'
  | 'linkedCount'
  | 'leadTimeDays'
  | 'totalInvoiced'
  | 'status';

export type SortDirection = 'asc' | 'desc';

export const PAYMENT_TERM_LABELS: Record<SupplierPaymentTerms, string> = {
  cod: 'COD',
  net_7: 'Net 7 Days',
  net_14: 'Net 14 Days',
  net_30: 'Net 30 Days',
  consignment: 'Consignment',
  prepaid: 'Prepaid',
};

export function formatPaymentTermsLabel(terms: SupplierPaymentTerms): string {
  return PAYMENT_TERM_LABELS[terms] || terms.replace('_', ' ');
}
