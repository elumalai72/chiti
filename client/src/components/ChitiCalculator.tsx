import React, { useState } from 'react';
import { Delete, RotateCcw, Equal, Percent, Divide, X as Multiply, Minus, Plus } from 'lucide-react';

interface ChitiCalculatorProps {
  onClose?: () => void;
  isEmbedded?: boolean;
}

// Format numbers with Indian comma grouping where appropriate without breaking decimals
export const formatCalculatorDisplay = (val: string): string => {
  if (!val || val === 'Error' || val === 'Cannot divide by 0') return val;
  const parts = val.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

  // Format integer part with Indian commas if valid number
  const isNegative = integerPart.startsWith('-');
  const absInt = isNegative ? integerPart.slice(1) : integerPart;

  if (!/^\d+$/.test(absInt)) return val;

  // Indian comma grouping
  let lastThree = absInt.substring(absInt.length - 3);
  const otherNumbers = absInt.substring(0, absInt.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  return (isNegative ? '-' : '') + formattedInt + decimalPart;
};

// Safe arithmetic helper to prevent floating-point inaccuracies
export const safeCalculate = (a: number, b: number, op: string): number => {
  let res = 0;
  switch (op) {
    case '+':
      res = a + b;
      break;
    case '-':
      res = a - b;
      break;
    case '×':
    case '*':
      res = a * b;
      break;
    case '÷':
    case '/':
      if (b === 0) throw new Error('Cannot divide by 0');
      res = a / b;
      break;
    default:
      res = b;
  }
  // Clean floating point artifacts
  return parseFloat(res.toFixed(10));
};

export const ChitiCalculator: React.FC<ChitiCalculatorProps> = ({
  onClose,
  isEmbedded = false
}) => {
  const [display, setDisplay] = useState<string>('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [expression, setExpression] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);

  // Clear all
  const handleClear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setExpression('');
    setHasError(false);
  };

  // Backspace / Delete last digit
  const handleBackspace = () => {
    if (hasError || waitingForOperand) {
      setDisplay('0');
      setHasError(false);
      return;
    }
    if (display.length === 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  // Number input
  const handleDigit = (digit: string) => {
    if (hasError) {
      setDisplay(digit);
      setHasError(false);
      setExpression('');
      return;
    }

    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      if (display === '0') {
        setDisplay(digit);
      } else {
        // Prevent overly long numbers that could overflow
        if (display.replace(/[^0-9]/g, '').length >= 14) return;
        setDisplay(display + digit);
      }
    }
  };

  // Decimal point
  const handleDecimal = () => {
    if (hasError) {
      setDisplay('0.');
      setHasError(false);
      return;
    }

    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }

    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  // Toggle positive / negative sign
  const handleToggleSign = () => {
    if (hasError || display === '0') return;
    if (display.startsWith('-')) {
      setDisplay(display.slice(1));
    } else {
      setDisplay('-' + display);
    }
  };

  // Percentage calculation
  const handlePercentage = () => {
    if (hasError) return;
    const current = parseFloat(display);
    if (isNaN(current)) return;

    if (previousValue !== null && operator) {
      // Calculate percentage of previous value (e.g., 1000 + 5% = 50)
      const percentVal = (previousValue * current) / 100;
      setDisplay(String(parseFloat(percentVal.toFixed(10))));
    } else {
      // Standalone percentage: current / 100
      const percentVal = current / 100;
      setDisplay(String(parseFloat(percentVal.toFixed(10))));
    }
  };

  // Operator handling (+, -, ×, ÷)
  const handleOperator = (nextOperator: string) => {
    if (hasError) {
      handleClear();
      return;
    }

    const currentVal = parseFloat(display);
    if (isNaN(currentVal)) return;

    if (previousValue === null) {
      setPreviousValue(currentVal);
      setExpression(`${formatCalculatorDisplay(display)} ${nextOperator}`);
    } else if (operator && !waitingForOperand) {
      try {
        const result = safeCalculate(previousValue, currentVal, operator);
        setPreviousValue(result);
        setDisplay(String(result));
        setExpression(`${formatCalculatorDisplay(String(result))} ${nextOperator}`);
      } catch (err: any) {
        setDisplay(err.message || 'Error');
        setHasError(true);
        setPreviousValue(null);
        setOperator(null);
        setExpression('');
        return;
      }
    } else {
      setExpression(`${formatCalculatorDisplay(String(previousValue))} ${nextOperator}`);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  // Equals calculation
  const handleEquals = () => {
    if (hasError) return;
    const currentVal = parseFloat(display);
    if (isNaN(currentVal)) return;

    if (previousValue !== null && operator) {
      try {
        const result = safeCalculate(previousValue, currentVal, operator);
        setExpression(`${formatCalculatorDisplay(String(previousValue))} ${operator} ${formatCalculatorDisplay(display)} =`);
        setDisplay(String(result));
        setPreviousValue(null);
        setOperator(null);
        setWaitingForOperand(true);
      } catch (err: any) {
        setDisplay(err.message || 'Error');
        setHasError(true);
        setPreviousValue(null);
        setOperator(null);
        setExpression('');
      }
    }
  };

  // Quick preset calculation for Chiti commission (5% of current value)
  const handlePresetCommission = (rate: number) => {
    if (hasError) return;
    const currentVal = parseFloat(display);
    if (isNaN(currentVal) || currentVal <= 0) return;
    const commission = parseFloat(((currentVal * rate) / 100).toFixed(2));
    setExpression(`${rate}% of ${formatCalculatorDisplay(display)} =`);
    setDisplay(String(commission));
    setWaitingForOperand(true);
  };

  // Determine dynamic font size based on length of display to avoid overflow
  const getDisplayFontSize = (text: string): string => {
    const len = text.length;
    if (len <= 8) return '34px';
    if (len <= 11) return '28px';
    if (len <= 14) return '22px';
    return '18px';
  };

  const formattedDisplay = formatCalculatorDisplay(display);

  return (
    <div 
      style={{
        background: '#0D1322',
        color: '#FFFFFF',
        borderRadius: isEmbedded ? '20px' : '24px',
        padding: '20px 16px',
        boxShadow: isEmbedded ? 'var(--shadow-md)' : '0 20px 60px rgba(0, 0, 0, 0.45)',
        width: '100%',
        maxWidth: '380px',
        margin: '0 auto',
        userSelect: 'none'
      }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div 
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '12px'
            }}
          >
            ₹
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.5px' }}>CHITI CALCULATOR</div>
            <div style={{ fontSize: '10px', color: '#94A3B8' }}>Quick Financial Utility</div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="btn btn-glass btn-sm"
            style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%', minHeight: '32px' }}
            aria-label="Close Calculator"
          >
            ✕
          </button>
        )}
      </div>

      {/* Screen / Display Area */}
      <div 
        style={{
          background: '#070B14',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '14px 16px',
          marginBottom: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          minHeight: '84px',
          overflow: 'hidden'
        }}
      >
        {/* Expression tracking */}
        <div 
          style={{
            fontSize: '12px',
            color: '#A78BFA',
            fontWeight: 600,
            minHeight: '18px',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {expression || ' '}
        </div>

        {/* Current Value Display */}
        <div 
          style={{
            fontSize: getDisplayFontSize(formattedDisplay),
            fontWeight: 900,
            color: hasError ? '#F87171' : '#FFFFFF',
            lineHeight: 1.1,
            marginTop: '4px',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {formattedDisplay}
        </div>
      </div>

      {/* Chiti Quick Calculation Shortcuts */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        <button
          type="button"
          onClick={() => handlePresetCommission(5)}
          className="btn btn-glass btn-sm"
          style={{ flex: 1, padding: '6px 4px', fontSize: '11px', borderRadius: '10px', minHeight: '34px' }}
          title="Calculate 5% commission"
        >
          5% Comm.
        </button>
        <button
          type="button"
          onClick={() => handlePresetCommission(10)}
          className="btn btn-glass btn-sm"
          style={{ flex: 1, padding: '6px 4px', fontSize: '11px', borderRadius: '10px', minHeight: '34px' }}
          title="Calculate 10% discount"
        >
          10% Disc.
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="btn btn-glass btn-sm"
          style={{ flex: 1, padding: '6px 4px', fontSize: '11px', borderRadius: '10px', minHeight: '34px', color: '#F87171' }}
        >
          Reset
        </button>
      </div>

      {/* Calculator Buttons Grid (4 Columns, Touch targets >= 46px) */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px'
        }}
      >
        {/* ROW 1 */}
        <button
          type="button"
          onClick={handleClear}
          style={{
            minHeight: '48px',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#FCA5A5',
            fontWeight: 800,
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          AC
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          style={{
            minHeight: '48px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.06)',
            color: '#CBD5E1',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Backspace"
        >
          <Delete size={18} />
        </button>
        <button
          type="button"
          onClick={handlePercentage}
          style={{
            minHeight: '48px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.06)',
            color: '#A78BFA',
            fontWeight: 700,
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          %
        </button>
        <button
          type="button"
          onClick={() => handleOperator('÷')}
          style={{
            minHeight: '48px',
            borderRadius: '12px',
            border: operator === '÷' ? '2px solid #A855F7' : '1px solid rgba(124, 58, 237, 0.3)',
            background: operator === '÷' ? 'var(--primary-purple)' : 'rgba(124, 58, 237, 0.16)',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          ÷
        </button>

        {/* ROW 2 */}
        {['7', '8', '9'].map(d => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            style={{
              minHeight: '48px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              background: '#151F36',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '18px',
              cursor: 'pointer'
            }}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOperator('×')}
          style={{
            minHeight: '48px',
            borderRadius: '12px',
            border: operator === '×' ? '2px solid #A855F7' : '1px solid rgba(124, 58, 237, 0.3)',
            background: operator === '×' ? 'var(--primary-purple)' : 'rgba(124, 58, 237, 0.16)',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          ×
        </button>

        {/* ROW 3 */}
        {['4', '5', '6'].map(d => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            style={{
              minHeight: '48px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              background: '#151F36',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '18px',
              cursor: 'pointer'
            }}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOperator('-')}
          style={{
            minHeight: '48px',
            borderRadius: '12px',
            border: operator === '-' ? '2px solid #A855F7' : '1px solid rgba(124, 58, 237, 0.3)',
            background: operator === '-' ? 'var(--primary-purple)' : 'rgba(124, 58, 237, 0.16)',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '20px',
            cursor: 'pointer'
          }}
        >
          −
        </button>

        {/* ROW 4 */}
        {['1', '2', '3'].map(d => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            style={{
              minHeight: '48px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              background: '#151F36',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '18px',
              cursor: 'pointer'
            }}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleOperator('+')}
          style={{
            minHeight: '48px',
            borderRadius: '12px',
            border: operator === '+' ? '2px solid #A855F7' : '1px solid rgba(124, 58, 237, 0.3)',
            background: operator === '+' ? 'var(--primary-purple)' : 'rgba(124, 58, 237, 0.16)',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '20px',
            cursor: 'pointer'
          }}
        >
          +
        </button>

        {/* ROW 5 */}
        <button
          type="button"
          onClick={handleToggleSign}
          style={{
            minHeight: '48px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            background: '#151F36',
            color: '#A78BFA',
            fontWeight: 700,
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          ±
        </button>
        <button
          type="button"
          onClick={() => handleDigit('0')}
          style={{
            minHeight: '48px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            background: '#151F36',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDecimal}
          style={{
            minHeight: '48px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            background: '#151F36',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '20px',
            cursor: 'pointer'
          }}
        >
          .
        </button>
        <button
          type="button"
          onClick={handleEquals}
          style={{
            minHeight: '48px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--gradient-primary)',
            color: '#FFFFFF',
            fontWeight: 900,
            fontSize: '22px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.45)'
          }}
        >
          =
        </button>
      </div>
    </div>
  );
};
