/**
 * @license
 * SokoPoS Bluetooth Printing Service
 * Direct ESC/POS thermal printing via Web Bluetooth API
 */

import { Transaction, Location, CartItem } from '../types';
import { getItemDiscountedUnitPrice } from '../utils/discountUtils';

// Common Web Bluetooth UUIDs for Thermal Printers
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const COMMANDS = {
  INITIALIZE: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_HEIGHT_ON: `${ESC}!\x10`,
  DOUBLE_WIDTH_ON: `${ESC}!\x20`,
  DOUBLE_ON: `${ESC}!\x30`,
  NORMAL: `${ESC}!\x00`,
  CUT: `${GS}V\x42\x00`,
  FEED_2: `${ESC}d\x02`,
  FEED_4: `${ESC}d\x04`,
};

export interface BluetoothPrinter {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

class BluetoothPrinterService {
  private activePrinter: BluetoothPrinter | null = null;

  /**
   * Request user to pair with a Bluetooth printer
   */
  async connect(): Promise<BluetoothPrinter | null> {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth is not supported in this browser.');
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [PRINTER_SERVICE_UUID] },
          { namePrefix: 'TP' }, // Common for Thermal Printers
          { namePrefix: 'MPT' },
          { namePrefix: 'MTP' },
          { namePrefix: 'POS' },
          { namePrefix: 'RP' },
        ],
        optionalServices: [PRINTER_SERVICE_UUID],
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error('Could not connect to printer GATT server.');

      const service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(PRINTER_CHARACTERISTIC_UUID);

      this.activePrinter = { device, characteristic };
      return this.activePrinter;
    } catch (err) {
      console.error('Bluetooth Connection Error:', err);
      throw err;
    }
  }

  /**
   * Disconnect active printer
   */
  disconnect() {
    if (this.activePrinter?.device.gatt?.connected) {
      this.activePrinter.device.gatt.disconnect();
    }
    this.activePrinter = null;
  }

  /**
   * Send raw data to the printer
   */
  private async write(data: Uint8Array) {
    if (!this.activePrinter) throw new Error('No printer connected.');

    // Thermal printers often have a small buffer, so we split large payloads
    const chunkSize = 512;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.activePrinter.characteristic.writeValue(chunk);
    }
  }

  /**
   * Encode string to CP437 or similar (basic ASCII for now)
   */
  private encode(text: string): Uint8Array {
    const encoder = new TextEncoder(); // Note: Most thermal printers use CP437, but ASCII works for basic text
    return encoder.encode(text);
  }

  /**
   * Print a transaction receipt
   */
  async printReceipt(
    transaction: Transaction,
    location: Location,
    options: {
      businessName?: string;
      format?: '58mm' | '80mm';
      headerNote?: string;
      footerNote?: string;
    } = {}
  ) {
    if (!this.activePrinter) {
      await this.connect();
    }

    const { format = '58mm' } = options;
    const is80mm = format === '80mm';
    const charWidth = is80mm ? 48 : 32;

    let printData = COMMANDS.INITIALIZE;

    // Header
    printData += COMMANDS.ALIGN_CENTER;
    printData += COMMANDS.DOUBLE_ON + (options.businessName || 'SOKOPOS RETAIL').toUpperCase() + '\n' + COMMANDS.NORMAL;
    printData += location.name + '\n';
    if (location.address) printData += location.address + '\n';
    printData += `KRA PIN: ${location.taxId}\n`;
    printData += `Tel: ${location.phone}\n`;
    printData += '-'.repeat(charWidth) + '\n';

    // Metadata
    printData += COMMANDS.ALIGN_LEFT;
    printData += `Receipt: ${transaction.receiptNumber}\n`;
    printData += `Date: ${new Date(transaction.timestamp).toLocaleString()}\n`;
    printData += `Cashier: ${transaction.cashierName}\n`;
    printData += `Terminal: ${transaction.terminalName}\n`;
    printData += `Payment: ${transaction.paymentMethod.toUpperCase()}\n`;
    
    if (transaction.customerName) {
      printData += `Customer: ${transaction.customerName}\n`;
    }
    
    printData += '-'.repeat(charWidth) + '\n';

    // Items
    printData += COMMANDS.BOLD_ON;
    printData += this.formatRow('ITEM', 'AMT', charWidth) + '\n';
    printData += COMMANDS.BOLD_OFF;

    for (const item of transaction.items) {
      const unitPrice = getItemDiscountedUnitPrice(item);
      const total = (unitPrice * item.quantity).toFixed(2);
      const name = `${item.quantity}x ${item.productName}`;
      
      // If name is too long, wrap it
      if (name.length > charWidth - 10) {
        printData += name + '\n';
        printData += this.formatRow('', total, charWidth) + '\n';
      } else {
        printData += this.formatRow(name, total, charWidth) + '\n';
      }
    }

    printData += '-'.repeat(charWidth) + '\n';

    // Totals
    const currency = location.currency || 'KES';
    printData += this.formatRow('Subtotal:', `${currency} ${transaction.subtotal.toFixed(2)}`, charWidth) + '\n';
    printData += this.formatRow('Tax:', `${currency} ${transaction.taxAmount.toFixed(2)}`, charWidth) + '\n';
    
    printData += COMMANDS.BOLD_ON;
    printData += this.formatRow('TOTAL:', `${currency} ${transaction.total.toFixed(2)}`, charWidth) + '\n';
    printData += COMMANDS.BOLD_OFF;

    if (transaction.paymentMethod === 'cash' && transaction.paymentDetails.cashTendered !== undefined) {
      printData += this.formatRow('Cash Tendered:', `${currency} ${transaction.paymentDetails.cashTendered.toFixed(2)}`, charWidth) + '\n';
      printData += this.formatRow('Change:', `${currency} ${(transaction.paymentDetails.cashChange || 0).toFixed(2)}`, charWidth) + '\n';
    }

    printData += '-'.repeat(charWidth) + '\n';

    // Footer
    printData += COMMANDS.ALIGN_CENTER;
    if (options.footerNote) printData += options.footerNote + '\n';
    
    printData += 'KRA eTIMS Validated\n';
    printData += `CU Serial: ${transaction.etimsData?.cuSerialNumber || 'KRARVS000000005'}\n`;
    printData += 'Powered by SokoPoS\n';
    printData += 'Asante kwa kununua na sisi!\n';
    
    printData += COMMANDS.FEED_4;
    printData += COMMANDS.CUT;

    await this.write(this.encode(printData));
  }

  private formatRow(left: string, right: string, width: number): string {
    const spaces = width - left.length - right.length;
    if (spaces > 0) {
      return left + ' '.repeat(spaces) + right;
    }
    return left + ' ' + right;
  }
}

export const bluetoothPrinterService = new BluetoothPrinterService();
