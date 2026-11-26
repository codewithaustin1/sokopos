import {
  BusinessTaxSettings,
  DigitaxCreditNoteData,
  DigitaxEtimsData,
} from '../types';

/**
 * Returns whether automated KRA eTIMS receipt relaying is enabled for a business.
 * Enabled by default (`autoTransmitEtims !== false`) unless explicitly turned off.
 */
export function isEtimsRelayEnabled(taxSettings?: BusinessTaxSettings | null): boolean {
  return taxSettings?.autoTransmitEtims !== false;
}

/**
 * Returns whether KRA verification QR embedding is enabled for a business.
 */
export function isKraQrEnabled(taxSettings?: BusinessTaxSettings | null): boolean {
  return isEtimsRelayEnabled(taxSettings) && taxSettings?.generateKraQr !== false;
}

/**
 * True only when a sale receipt carries genuine KRA Control Unit verification proof.
 */
export function isTransactionEtimsVerified(etims?: DigitaxEtimsData | null): boolean {
  return Boolean(
    etims?.status === 'COMPLETED' &&
      (etims.isPartnerVerified ||
        etims.receiptSignature ||
        etims.cuInvoiceNumber !== undefined ||
        etims.etimsUrl)
  );
}

/**
 * True only when a refund credit note carries genuine KRA Control Unit verification proof.
 */
export function isCreditNoteEtimsVerified(
  cn?: Partial<
    Pick<
      DigitaxCreditNoteData,
      'status' | 'cuInvoiceNumber' | 'receiptSignature' | 'etimsUrl'
    >
  > | null
): boolean {
  return Boolean(
    cn?.status === 'COMPLETED' &&
      (cn.cuInvoiceNumber !== undefined || cn.receiptSignature || cn.etimsUrl)
  );
}

/**
 * Determines whether eTIMS verification/status UI should be shown on a sale receipt.
 * - Past genuinely KRA-verified receipts keep their verification info even when relaying is off.
 * - Unsubmitted, pending, failed, or new receipts omit eTIMS info when relaying is disabled.
 */
export function shouldShowSaleEtimsInfo(
  etims: DigitaxEtimsData | undefined | null,
  etimsRelayEnabled: boolean,
  isDemo = false
): boolean {
  if (isDemo) return false;
  if (isTransactionEtimsVerified(etims)) return true;
  return etimsRelayEnabled;
}

/**
 * Determines whether eTIMS verification/status UI should be shown on a refund credit note.
 * - Past genuinely KRA-verified credit notes keep their verification info even when relaying is off.
 * - Unsubmitted, pending, failed, or new credit notes omit eTIMS info when relaying is disabled.
 */
export function shouldShowCreditNoteEtimsInfo(
  cn: DigitaxCreditNoteData | undefined | null,
  etimsRelayEnabled: boolean,
  isDemo = false
): boolean {
  if (isDemo) return false;
  if (isCreditNoteEtimsVerified(cn)) return true;
  return etimsRelayEnabled;
}
