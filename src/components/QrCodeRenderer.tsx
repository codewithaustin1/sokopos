import React, { useEffect, useState } from 'react';
import QRCode, { QRCodeErrorCorrectionLevel } from 'qrcode';

interface QrCodeRendererProps {
  value: string;
  size?: number;
  margin?: number;
  errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
  className?: string;
  altText?: string;
}

export const QrCodeRenderer: React.FC<QrCodeRendererProps> = ({
  value,
  size = 120,
  margin = 1,
  errorCorrectionLevel = 'M',
  className = '',
  altText,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      setDataUrl('');
      setHasError(true);
      return;
    }

    setHasError(false);
    const opts: QRCode.QRCodeToDataURLOptions = {
      width: size * 2,
      margin,
      errorCorrectionLevel: (errorCorrectionLevel as QRCode.QRCodeErrorCorrectionLevel) || 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    };

    QRCode.toDataURL(trimmed, opts)
      .then((url) => {
        setDataUrl(url);
      })
      .catch((err) => {
        console.warn('Failed to render QR Code for value:', value, err);
        setHasError(true);
      });
  }, [value, size, margin, errorCorrectionLevel]);

  if (hasError || !dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center border border-dashed border-slate-300 rounded bg-slate-50 text-[10px] text-slate-400 font-mono ${className}`}
      >
        QR Error
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={altText || `QR code for ${value}`}
      style={{ width: size, height: size }}
      className={`block object-contain select-none ${className}`}
    />
  );
};
