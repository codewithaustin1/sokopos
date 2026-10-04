export interface ParsedInvoiceLineItem {
  rawDescription: string;
  extractedItemName: string;
  packSize: string;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
  taxRatePercent: number;
  matchedProductId: string | null;
  matchedProductName?: string;
  matchedProductSku?: string;
  matchedCurrentCost?: number;
  matchedCurrentPrice?: number;
  isNewProduct: boolean;
  suggestedSellingPrice: number;
  suggestedCategory: string;
  barcode: string | null;
  // User review state in modal
  stagedQuantity: number;
  stagedUnitCost: number;
  stagedSellingPrice: number;
  selectedProductId: string | 'new';
  selectedCategory: string;
}

export interface ParsedSupplierInvoice {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  paymentTerms: string;
  notes?: string;
  totalInvoiced: number;
  lineItems: ParsedInvoiceLineItem[];
}

export interface ParsedProductPackage {
  brand: string;
  productName: string;
  shortName: string;
  unit: string;
  unitWeightOrVolume: string;
  barcode: string;
  category: string;
  suggestedBuyingPrice: number;
  suggestedSellingPrice: number;
  suggestedReorderPoint: number;
  taxRatePercent: number;
  description: string;
  confidenceNotes?: string;
}
