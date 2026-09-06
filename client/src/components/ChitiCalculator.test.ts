import { describe, it, expect } from 'vitest';
import { safeCalculate, formatCalculatorDisplay } from './ChitiCalculator';

describe('Chiti Calculator Logic & Safety Tests', () => {
  describe('Basic & Advanced Arithmetic (10+ tests)', () => {
    it('1. Addition: adds integers correctly', () => {
      expect(safeCalculate(123000, 5000, '+')).toBe(128000);
    });

    it('2. Subtraction: calculates auction discount difference', () => {
      expect(safeCalculate(123000, 110000, '-')).toBe(13000);
    });

    it('3. Multiplication: computes monthly pool', () => {
      expect(safeCalculate(41, 3000, '×')).toBe(123000);
      expect(safeCalculate(41, 3000, '*')).toBe(123000);
    });

    it('4. Division: distributes surplus among members', () => {
      const result = safeCalculate(8200, 41, '÷');
      expect(result).toBe(200);
    });

    it('5. Safe Floating-Point Decimals: 0.1 + 0.2 equals 0.3 without binary artifacts', () => {
      expect(safeCalculate(0.1, 0.2, '+')).toBe(0.3);
    });

    it('6. Decimal Subtraction: 0.3 - 0.1 equals 0.2', () => {
      expect(safeCalculate(0.3, 0.1, '-')).toBe(0.2);
    });

    it('7. Decimal Multiplication: 12.5 * 4.2 equals 52.5', () => {
      expect(safeCalculate(12.5, 4.2, '×')).toBe(52.5);
    });

    it('8. Decimal Division: 100 / 8 equals 12.5', () => {
      expect(safeCalculate(100, 8, '÷')).toBe(12.5);
    });

    it('9. Negative Numbers: handles negative addition & subtraction', () => {
      expect(safeCalculate(-500, 2000, '+')).toBe(1500);
      expect(safeCalculate(1000, -500, '+')).toBe(500);
      expect(safeCalculate(-1000, -500, '-')).toBe(-500);
    });

    it('10. Negative Numbers: multiplication with negative values', () => {
      expect(safeCalculate(1500, -2, '×')).toBe(-3000);
      expect(safeCalculate(-1500, -2, '×')).toBe(3000);
    });

    it('11. Large Numbers: handles multi-lakh and crore calculations without distortion', () => {
      expect(safeCalculate(10000000, 5000000, '+')).toBe(15000000);
      expect(safeCalculate(2500000, 5, '×')).toBe(12500000);
    });

    it('12. Division by Zero: safely throws error instead of producing Infinity or NaN', () => {
      expect(() => safeCalculate(123000, 0, '÷')).toThrow('Cannot divide by 0');
      expect(() => safeCalculate(500, 0, '/')).toThrow('Cannot divide by 0');
    });
  });

  describe('Indian Comma Grouping & Display Formatter', () => {
    it('formats small and medium integers with standard Indian grouping', () => {
      expect(formatCalculatorDisplay('3000')).toBe('3,000');
      expect(formatCalculatorDisplay('123000')).toBe('1,23,000');
      expect(formatCalculatorDisplay('10000000')).toBe('1,00,00,000');
    });

    it('preserves decimals accurately when formatting', () => {
      expect(formatCalculatorDisplay('123000.50')).toBe('1,23,000.50');
      expect(formatCalculatorDisplay('0.05')).toBe('0.05');
      expect(formatCalculatorDisplay('2804.878')).toBe('2,804.878');
    });

    it('formats negative numbers correctly', () => {
      expect(formatCalculatorDisplay('-5000')).toBe('-5,000');
      expect(formatCalculatorDisplay('-123456.78')).toBe('-1,23,456.78');
    });

    it('preserves error messages unchanged', () => {
      expect(formatCalculatorDisplay('Cannot divide by 0')).toBe('Cannot divide by 0');
      expect(formatCalculatorDisplay('Error')).toBe('Error');
    });

    it('preserves empty or zero strings correctly', () => {
      expect(formatCalculatorDisplay('0')).toBe('0');
      expect(formatCalculatorDisplay('')).toBe('');
    });
  });

  describe('Financial Agent Calculation Presets & Percentages', () => {
    it('calculates 5% agent commission on 1,23,000 pool', () => {
      const pool = 123000;
      const commission = (pool * 5) / 100;
      expect(commission).toBe(6150);
    });

    it('calculates 4% commission on 1,00,000 pool', () => {
      const pool = 100000;
      const commission = (pool * 4) / 100;
      expect(commission).toBe(4000);
    });

    it('calculates 20-month installment division', () => {
      const chitValue = 100000;
      const months = 20;
      expect(chitValue / months).toBe(5000);
    });
  });
});
