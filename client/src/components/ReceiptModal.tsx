import React from 'react';
import { Receipt } from '../types';
import { formatINR } from '../engine/calculationEngine';
import { CheckCircle2, X, Printer, Download, Share2 } from 'lucide-react';
import jsPDF from 'jspdf';

interface ReceiptModalProps {
  receipt: Receipt | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [105, 148] // A6 pocket receipt size
      });

      // Background
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 105, 148, 'F');

      // Header Banner
      doc.setFillColor(13, 19, 34);
      doc.rect(0, 0, 105, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('CHITI PAYMENT RECEIPT', 52.5, 12, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(receipt.businessName || 'Sri Chiti Services', 52.5, 18, { align: 'center' });
      doc.text(`Agent: ${receipt.agentName} | ${receipt.agentPhone}`, 52.5, 23, { align: 'center' });

      // Receipt Metadata
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Receipt #: ${receipt.receiptNumber}`, 10, 36);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Date: ${receipt.date}`, 10, 42);
      doc.text(`Txn ID: ${receipt.transactionId}`, 10, 48);

      // Divider
      doc.setDrawColor(203, 213, 225);
      doc.line(10, 52, 95, 52);

      // Member & Chiti Info
      doc.setFontSize(8);
      doc.text('Member Name:', 10, 58);
      doc.setFont('helvetica', 'bold');
      doc.text(`${receipt.memberName} (Member #${receipt.memberNumber})`, 42, 58);

      doc.setFont('helvetica', 'normal');
      doc.text('Chiti Group:', 10, 64);
      doc.setFont('helvetica', 'bold');
      doc.text(receipt.chitiName, 42, 64);

      doc.setFont('helvetica', 'normal');
      doc.text('Chiti Month:', 10, 70);
      doc.setFont('helvetica', 'bold');
      doc.text(`Month ${receipt.monthNumber}`, 42, 70);

      doc.setFont('helvetica', 'normal');
      doc.text('Payment Mode:', 10, 76);
      doc.setFont('helvetica', 'bold');
      doc.text(receipt.paymentMethod, 42, 76);

      // Amount Box
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(10, 82, 85, 20, 3, 3, 'F');
      doc.setDrawColor(16, 185, 129);
      doc.roundedRect(10, 82, 85, 20, 3, 3, 'D');

      doc.setTextColor(6, 95, 70);
      doc.setFontSize(9);
      doc.text('AMOUNT PAID', 52.5, 90, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(formatINR(receipt.amountPaid), 52.5, 98, { align: 'center' });

      // Balance & Footer
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      if (receipt.remainingDue > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`Remaining Balance Due: ${formatINR(receipt.remainingDue)}`, 52.5, 108, { align: 'center' });
      } else {
        doc.setTextColor(16, 185, 129);
        doc.text('Payment Completed in Full', 52.5, 108, { align: 'center' });
      }

      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.text('This is a computer-generated digital receipt.', 52.5, 134, { align: 'center' });
      doc.text('Thank you for your timely contribution.', 52.5, 138, { align: 'center' });

      doc.save(`${receipt.receiptNumber}.pdf`);
    } catch (e) {
      console.error('PDF generation error:', e);
      alert('Could not download PDF. Please use the Print button.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-sheet" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '440px', padding: '24px 20px' }}
      >
        {/* Header Close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 color="#10B981" size={24} />
            <span style={{ fontWeight: 800, fontSize: '18px' }}>Payment Receipt</span>
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-secondary btn-sm"
            style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Receipt Voucher Body */}
        <div className="receipt-voucher">
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #E2E8F0', paddingBottom: '14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {receipt.businessName || 'CHITI OFFICIAL RECEIPT'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              Agent: {receipt.agentName} • {receipt.agentPhone}
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>
              Receipt #: <strong style={{ color: '#0F172A' }}>{receipt.receiptNumber}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Member Name:</span>
              <strong style={{ color: '#0F172A' }}>{receipt.memberName} (#{receipt.memberNumber})</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Chiti Group:</span>
              <strong style={{ color: '#0F172A' }}>{receipt.chitiName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Chiti Cycle:</span>
              <span className="badge badge-violet">Month {receipt.monthNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Payment Method:</span>
              <strong style={{ color: '#0F172A' }}>{receipt.paymentMethod}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Date & Time:</span>
              <span style={{ color: '#0F172A' }}>{receipt.date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Reference ID:</span>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748B' }}>{receipt.transactionId}</span>
            </div>
          </div>

          {/* Amount Paid Highlight */}
          <div 
            style={{ 
              background: '#ECFDF5', 
              border: '1px solid #A7F3D0', 
              borderRadius: '12px', 
              padding: '16px', 
              textAlign: 'center', 
              marginTop: '18px' 
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
              Amount Paid
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#065F46', marginTop: '2px' }} className="tabular-nums">
              {formatINR(receipt.amountPaid)}
            </div>
            {receipt.remainingDue > 0 ? (
              <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600, marginTop: '4px' }}>
                Pending Balance: {formatINR(receipt.remainingDue)}
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
                ✓ Monthly installment fully cleared
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button 
            onClick={handleDownloadPDF} 
            className="btn btn-primary" 
            style={{ flex: 1 }}
          >
            <Download size={16} /> Download PDF
          </button>
          <button 
            onClick={handlePrint} 
            className="btn btn-secondary" 
            style={{ padding: '12px 16px' }}
            title="Print Receipt"
          >
            <Printer size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
