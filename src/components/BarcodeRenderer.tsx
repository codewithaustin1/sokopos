import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeRendererProps {
  value: string;
  format?: 'CODE128' | 'EAN13' | 'UPC' | 'CODE39' | 'ITF';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  font?: string;
  margin?: number;
  className?: string;
  altText?: string;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  format = 'CODE128',
  width = 1.6,
  height = 42,
  displayValue = true,
  fontSize = 11,
  font = 'monospace',
  margin = 2,
  className = '',
  altText,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const trimmed = (value || '').trim();
    if (!trimmed) {
      setRenderError('Empty barcode');
      return;
    }

    try {
      setRenderError(null);
      // Attempt with the specified format
      JsBarcode(svgRef.current, trimmed, {
        format,
        lineColor: '#000000',
        width,
        height,
        displayValue,
        fontSize,
        font,
        margin,
        background: '#ffffff',
      });
    } catch (primaryErr) {
      // If specified format failed (e.g. invalid checksum or characters for EAN13),
      // fall back to CODE128 which supports any ASCII characters.
      try {
        JsBarcode(svgRef.current, trimmed, {
          format: 'CODE128',
          lineColor: '#000000',
          width,
          height,
          displayValue,
          fontSize,
          font,
          margin,
          background: '#ffffff',
        });
        setRenderError(null);
      } catch (fallbackErr) {
        console.warn('Barcode generation failed for value:', value, fallbackErr);
        setRenderError('Invalid code');
      }
    }
  }, [value, format, width, height, displayValue, fontSize, font, margin]);

  if (renderError) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-2 border border-dashed border-slate-300 rounded text-slate-500 font-mono text-[10px] bg-slate-50 ${className}`}
      >
        <span>[Barcode: {value || 'N/A'}]</span>
        <span className="text-[9px] text-amber-600 font-sans mt-0.5">{renderError}</span>
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      className={`max-w-full block select-none ${className}`}
      aria-label={altText || `Barcode for ${value}`}
    />
  );
};
