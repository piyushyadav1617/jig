/**
 * Basic math utilities for common arithmetic operations.
 */

/**
 * Add two numbers.
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * Subtract b from a.
 */
export function subtract(a: number, b: number): number {
  return a - b;
}

/**
 * Multiply two numbers.
 */
export function multiply(a: number, b: number): number {
  return a * b;
}

/**
 * Remainder of a divided by b.
 * Throws on modulo by zero.
 */
export function modulo(a: number, b: number): number {
  if (b === 0) throw new Error("Modulo by zero");
  return a % b;
}

export default { add, subtract, multiply, modulo };
