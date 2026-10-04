import { ParsedSupplierInvoice, ParsedProductPackage, ParsedInvoiceLineItem } from '../types/aiVision';
import { Product } from '../types';

export async function parseSupplierInvoiceWithAi(
  imageBase64: string,
  mimeType: string,
  existingProducts: Product[]
): Promise<ParsedSupplierInvoice> {
  const strippedBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

  const response = await fetch('/api/ai/parse-invoice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64: strippedBase64,
      mimeType: mimeType || 'image/jpeg',
      existingProducts: existingProducts.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        buyingPrice: p.buyingPrice,
        sellingPrice: p.sellingPrice,
        category: p.category,
      })),
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `Invoice AI analysis failed with HTTP ${response.status}`);
  }

  const result = await response.json();
  const rawInvoice: ParsedSupplierInvoice = result.data;

  // Enhance items with current catalog metadata and initialize staging fields
  const enhancedItems: ParsedInvoiceLineItem[] = (rawInvoice.lineItems || []).map((item) => {
    // Attempt fuzzy match by name or barcode if not already matched
    let matchedProd: Product | undefined;
    if (item.matchedProductId) {
      matchedProd = existingProducts.find((p) => p.id === item.matchedProductId);
    }
    if (!matchedProd && item.barcode) {
      matchedProd = existingProducts.find((p) => p.barcode === item.barcode);
    }
    if (!matchedProd) {
      const q = item.extractedItemName.toLowerCase();
      matchedProd = existingProducts.find((p) => {
        const pName = p.name.toLowerCase();
        return pName.includes(q) || q.includes(pName);
      });
    }

    const isMatched = !!matchedProd;
    const selectedProdId = matchedProd ? matchedProd.id : 'new';
    const suggestedSell = matchedProd ? matchedProd.sellingPrice : (item.suggestedSellingPrice || Math.round(item.unitCost * 1.3));

    return {
      ...item,
      matchedProductId: matchedProd?.id || null,
      matchedProductName: matchedProd?.name,
      matchedProductSku: matchedProd?.sku,
      matchedCurrentCost: matchedProd?.buyingPrice,
      matchedCurrentPrice: matchedProd?.sellingPrice,
      isNewProduct: !isMatched,
      stagedQuantity: item.quantityReceived || 1,
      stagedUnitCost: item.unitCost || 0,
      stagedSellingPrice: suggestedSell,
      selectedProductId: selectedProdId,
      selectedCategory: matchedProd?.category || item.suggestedCategory || 'Flour & Grains',
    };
  });

  return {
    ...rawInvoice,
    lineItems: enhancedItems,
  };
}

export async function parseProductPackageWithAi(
  imageBase64: string,
  mimeType: string
): Promise<ParsedProductPackage> {
  const strippedBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

  const response = await fetch('/api/ai/parse-package', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64: strippedBase64,
      mimeType: mimeType || 'image/jpeg',
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `Package vision AI analysis failed with HTTP ${response.status}`);
  }

  const result = await response.json();
  return result.data as ParsedProductPackage;
}
