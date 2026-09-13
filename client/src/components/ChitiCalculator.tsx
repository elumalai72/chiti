import React, { useState, useEffect, useRef } from 'react';
import { Delete, History, Trash2, ChevronDown } from 'lucide-react';

interface ChitiCalculatorProps {
  onClose?: () => void;
  isEmbedded?: boolean;
}

interface CalcHistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
}

const HISTORY_KEY = 'chiti_calculator_history';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export const formatCalculatorDisplay = (val: string): string => {
  if (!val || val === 'Error' || val === 'Cannot divide by 0') return val;
  const parts = val.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

  const isNegative = integerPart.startsWith('-');
  const absInt = isNegative ? integerPart.slice(1) : integerPart;

  if (!/^\d+$/.test(absInt)) return val;

  let lastThree = absInt.substring(absInt.length - 3);
  const otherNumbers = absInt.substring(0, absInt.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  return (isNegative ? '-' : '') + formattedInt + decimalPart;
};

export const safeCalculate = (a: number, b: number, op: string): number => {
  let res = 0;
  switch (op) {
    case '+': res = a + b; break;
    case '-': res = a - b; break;
    case '×': res = a * b; break;
    case '÷': 
      if (b === 0) throw new Error('Cannot divide by 0');
      res = a / b; 
      break;
    default: res = b;
  }
  return parseFloat(res.toFixed(10));
};

export const ChitiCalculator: React.FC<ChitiCalculatorProps> = ({ onClose, isEmbedded = false }) => {
  const [display, setDisplay] = useState<string>('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [expression, setExpression] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);
  
  // History State
  const [history, setHistory] = useState<CalcHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Load and prune history on mount
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        const parsed: CalcHistoryItem[] = JSON.parse(saved);
        const now = Date.now();
        // Keep only items newer than 24 hours
        const validHistory = parsed.filter(item => (now - item.timestamp) < TWENTY_FOUR_HOURS);
        setHistory(validHistory);
        if (validHistory.length !== parsed.length) {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(validHistory));
        }
      } catch (e) {
        console.error("Failed to parse calc history", e);
      }
    }
  }, []);

  const saveToHistory = (expr: string, res: string) => {
    const newItem: CalcHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      expression: expr,
      result: res,
      timestamp: Date.now()
    };
    
    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 50); // Keep max 50 items
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const handleClear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setExpression('');
    setHasError(false);
  };

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
      if (display === '0') setDisplay(digit);
      else {
        if (display.replace(/[^0-9]/g, '').length >= 14) return;
        setDisplay(display + digit);
      }
    }
  };

  const handleDecimal = () => {
    if (hasError || waitingForOperand) {
      setDisplay('0.');
      setHasError(false);
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handlePercentage = () => {
    if (hasError) return;
    const current = parseFloat(display);
    if (isNaN(current)) return;
    const percentVal = (previousValue !== null && operator) 
      ? (previousValue * current) / 100 
      : current / 100;
    setDisplay(String(parseFloat(percentVal.toFixed(10))));
  };

  const handleOperator = (nextOperator: string) => {
    if (hasError) { handleClear(); return; }
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

  const handleEquals = () => {
    if (hasError) return;
    const currentVal = parseFloat(display);
    if (isNaN(currentVal)) return;

    if (previousValue !== null && operator) {
      try {
        const result = safeCalculate(previousValue, currentVal, operator);
        const finalExpr = `${formatCalculatorDisplay(String(previousValue))} ${operator} ${formatCalculatorDisplay(display)}`;
        const finalRes = formatCalculatorDisplay(String(result));
        
        setExpression(`${finalExpr} =`);
        setDisplay(String(result));
        setPreviousValue(null);
        setOperator(null);
        setWaitingForOperand(true);

        // Save to History!
        saveToHistory(finalExpr, finalRes);
      } catch (err: any) {
        setDisplay(err.message || 'Error');
        setHasError(true);
        setPreviousValue(null);
        setOperator(null);
        setExpression('');
      }
    }
  };

  // UI Components
  const BaseButton = ({ onClick, children, bg, color, flex = 1 }: any) => (
    <button
      onClick={onClick}
      style={{
        flex,
        aspectRatio: flex === 1 ? '1 / 1' : 'auto',
        borderRadius: flex === 1 ? '50%' : '24px',
        border: 'none',
        background: bg,
        color: color,
        fontSize: '28px',
        fontWeight: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        userSelect: 'none'
      }}
    >
      {children}
    </button>
  );

  const C_NUM_BG = '#2C2F36';
  const C_NUM_TXT = '#FFFFFF';
  const C_OP_BG = '#494368';
  const C_OP_TXT = '#D2C3FF'; // Light purple for operators
  const C_EQ_BG = '#F7B8C4'; // Pink
  const C_EQ_TXT = '#1A1C20';

  const formattedDisplay = formatCalculatorDisplay(display);
  const displayLen = formattedDisplay.length;
  const fontSize = displayLen > 12 ? '32px' : displayLen > 9 ? '42px' : '56px';

  return (
    <div style={{
      background: '#1A1C20',
      color: '#FFFFFF',
      borderRadius: isEmbedded ? '0' : '24px', // Standard Android radius
      width: '100%',
      maxWidth: '400px',
      margin: '0 auto',
      height: '100%',
      minHeight: '600px', // Match typical mobile ratio
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      fontFamily: 'sans-serif',
      boxShadow: isEmbedded ? 'none' : '0 20px 40px rgba(0,0,0,0.5)'
    }}>
      
      {/* Top Bar with History Icon */}
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '8px' }}
        >
          <History size={24} />
        </button>
        {onClose && (
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '8px' }}
          >
            <ChevronDown size={24} />
          </button>
        )}
      </div>

      {/* Screen */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'flex-end', 
        alignItems: 'flex-end',
        padding: '0 24px 24px',
        overflow: 'hidden'
      }}>
        <div style={{ fontSize: '24px', color: '#9CA3AF', minHeight: '30px' }}>
          {expression}
        </div>
        <div style={{ fontSize: fontSize, fontWeight: 300, color: hasError ? '#F87171' : '#FFFFFF', transition: 'font-size 0.2s', marginTop: '8px' }}>
          {formattedDisplay}
        </div>
      </div>

      {/* Keypad */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px', 
        padding: '24px',
        background: '#1A1C20'
      }}>
        {/* ROW 1 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <BaseButton onClick={handleClear} bg={C_OP_BG} color={C_OP_TXT}>AC</BaseButton>
          <BaseButton onClick={() => {}} bg={C_OP_BG} color={C_OP_TXT}>( )</BaseButton>
          <BaseButton onClick={handlePercentage} bg={C_OP_BG} color={C_OP_TXT}>%</BaseButton>
          <BaseButton onClick={() => handleOperator('÷')} bg={C_OP_BG} color={C_OP_TXT}>÷</BaseButton>
        </div>
        
        {/* ROW 2 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <BaseButton onClick={() => handleDigit('7')} bg={C_NUM_BG} color={C_NUM_TXT}>7</BaseButton>
          <BaseButton onClick={() => handleDigit('8')} bg={C_NUM_BG} color={C_NUM_TXT}>8</BaseButton>
          <BaseButton onClick={() => handleDigit('9')} bg={C_NUM_BG} color={C_NUM_TXT}>9</BaseButton>
          <BaseButton onClick={() => handleOperator('×')} bg={C_OP_BG} color={C_OP_TXT}>×</BaseButton>
        </div>

        {/* ROW 3 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <BaseButton onClick={() => handleDigit('4')} bg={C_NUM_BG} color={C_NUM_TXT}>4</BaseButton>
          <BaseButton onClick={() => handleDigit('5')} bg={C_NUM_BG} color={C_NUM_TXT}>5</BaseButton>
          <BaseButton onClick={() => handleDigit('6')} bg={C_NUM_BG} color={C_NUM_TXT}>6</BaseButton>
          <BaseButton onClick={() => handleOperator('-')} bg={C_OP_BG} color={C_OP_TXT}>−</BaseButton>
        </div>

        {/* ROW 4 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <BaseButton onClick={() => handleDigit('1')} bg={C_NUM_BG} color={C_NUM_TXT}>1</BaseButton>
          <BaseButton onClick={() => handleDigit('2')} bg={C_NUM_BG} color={C_NUM_TXT}>2</BaseButton>
          <BaseButton onClick={() => handleDigit('3')} bg={C_NUM_BG} color={C_NUM_TXT}>3</BaseButton>
          <BaseButton onClick={() => handleOperator('+')} bg={C_OP_BG} color={C_OP_TXT}>+</BaseButton>
        </div>

        {/* ROW 5 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <BaseButton onClick={() => handleDigit('0')} bg={C_NUM_BG} color={C_NUM_TXT}>0</BaseButton>
          <BaseButton onClick={handleDecimal} bg={C_NUM_BG} color={C_NUM_TXT}>.</BaseButton>
          <BaseButton onClick={handleBackspace} bg={C_NUM_BG} color={C_NUM_TXT}>
            <Delete size={28} />
          </BaseButton>
          <BaseButton onClick={handleEquals} bg={C_EQ_BG} color={C_EQ_TXT}>=</BaseButton>
        </div>
      </div>

      {/* History Slide-Over Panel */}
      {showHistory && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#1A1C20',
          borderRadius: isEmbedded ? '0' : '24px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 500 }}>History (24h)</h3>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={clearHistory} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '8px' }}>
                <Trash2 size={20} />
              </button>
              <button onClick={() => setShowHistory(false)} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '8px' }}>
                <ChevronDown size={24} />
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6B7280', marginTop: '40px' }}>
                No calculations in the last 24 hours.
              </div>
            ) : (
              history.map(item => (
                <div key={item.id} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: '16px', color: '#9CA3AF', textAlign: 'right', marginBottom: '8px' }}>
                    {item.expression}
                  </div>
                  <div style={{ fontSize: '28px', color: '#FFFFFF', textAlign: 'right', fontWeight: 500 }}>
                    = {item.result}
                  </div>
                  <div style={{ fontSize: '10px', color: '#4B5563', textAlign: 'left', marginTop: '8px' }}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
