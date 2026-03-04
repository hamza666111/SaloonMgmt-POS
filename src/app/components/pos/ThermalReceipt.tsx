import React from 'react';
import { format } from 'date-fns';

interface SaleItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ReceiptProps {
  shopName: string;
  address: string;
  phone: string;
  website?: string;
  logoDataUrl?: string;
  qrCodeDataUrl?: string;
  ratingUrl?: string;
  invoiceNumber: string;
  date: Date;
  cashierName: string;
  barberName?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  tip: number;
  total: number;
  paymentMethod: string;
}

export const ThermalReceipt: React.FC<ReceiptProps> = ({
  shopName,
  address,
  phone,
  website,
  logoDataUrl,
  qrCodeDataUrl,
  ratingUrl,
  invoiceNumber,
  date,
  cashierName,
  barberName,
  items,
  subtotal,
  tax,
  discount,
  tip,
  total,
  paymentMethod,
}) => {
  return (
    <div className="hidden print:block thermal-receipt font-mono text-sm text-black bg-white mx-auto p-4" style={{ width: '80mm' }}>
      {/* Header */}
      <div className="text-center mb-4 space-y-1">
        {logoDataUrl ? (
          <img src={logoDataUrl} alt="Shop logo" className="mx-auto max-h-16 object-contain" />
        ) : (
          <h1 className="text-xl font-bold uppercase">{shopName}</h1>
        )}
        <p className="whitespace-pre-wrap">{address}</p>
        <p>{phone}</p>
        {website && <p>{website}</p>}
      </div>

      <div className="border-b border-black border-dashed mb-2 pb-2">
        <p>Receipt #: {invoiceNumber}</p>
        <p>Date: {format(date, 'MMM dd, yyyy HH:mm')}</p>
        <p>Cashier: {cashierName}</p>
        {barberName && <p>Barber: {barberName}</p>}
      </div>

      {/* Items */}
      <table className="w-full mb-2">
        <thead>
          <tr className="border-b border-black border-dashed">
            <th className="text-left py-1">Item</th>
            <th className="text-right py-1">Qty</th>
            <th className="text-right py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td className="py-1">{item.name}</td>
              <td className="text-right py-1">{item.quantity}</td>
              <td className="text-right py-1">${item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="border-t border-black border-dashed pt-2 space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        {tip > 0 && (
          <div className="flex justify-between">
            <span>Tip ({barberName})</span>
            <span>${tip.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg mt-2 border-t border-black pt-1">
          <span>TOTAL</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 space-y-2">
        <p>Paid via: {paymentMethod.toUpperCase()}</p>
        <p className="text-xs mt-4">Thank you for your business!</p>

        {(qrCodeDataUrl || ratingUrl) && (
          <div className="mt-4 space-y-2">
            <div className="text-xs">Scan to rate services</div>
            {qrCodeDataUrl ? (
              <div className="flex justify-center">
                <img src={qrCodeDataUrl} alt="Rating QR" className="w-24 h-24 object-contain" />
              </div>
            ) : (
              <div className="text-[10px] break-all">{ratingUrl}</div>
            )}
          </div>
        )}
      </div>

      {/* CSS For Global Printing Rules targeting 80mm printers */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            margin: 0;
            width: 80mm;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  );
};
