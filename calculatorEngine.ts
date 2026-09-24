/**
 * High-precision arithmetic and scientific evaluator for calculator operations
 */

export function evaluateExpression(expr: string): { success: boolean; result?: string; error?: string } {
  try {
    if (!expr || expr.trim() === '') {
      return { success: true, result: '0' };
    }

    // Replace display symbols with standard math symbols
    let sanitized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, `(${Math.PI})`)
      .replace(/\be\b/g, `(${Math.E})`)
      .replace(/\s+/g, '');

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of sanitized) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) return { success: false, error: 'Mismatched parentheses' };
    }
    // Auto-close open parentheses at the end of expression
    while (parenCount > 0) {
      sanitized += ')';
      parenCount--;
    }

    // Tokenize
    const tokens = tokenize(sanitized);
    if (!tokens || tokens.length === 0) {
      return { success: false, error: 'Invalid expression' };
    }

    // Parse and evaluate using Shunting-Yard + RPN evaluation
    const rpn = shuntingYard(tokens);
    const value = evaluateRPN(rpn);

    if (isNaN(value)) {
      return { success: false, error: 'Invalid operation' };
    }
    if (!isFinite(value)) {
      return { success: false, error: 'Cannot divide by 0' };
    }

    const formatted = formatResultNumber(value);
    return { success: true, result: formatted };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Calculation error';
    return { success: false, error: message };
  }
}

type TokenType = 'NUMBER' | 'OPERATOR' | 'FUNCTION' | 'LPAREN' | 'RPAREN';

interface Token {
  type: TokenType;
  value: string;
}

const FUNCTIONS = ['sin', 'cos', 'tan', 'ln', 'log', 'sqrt', '√'];

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    // Numbers & Decimals
    if (/[0-9]/.test(char) || char === '.') {
      let numStr = '';
      while (i < expr.length && (/[0-9]/.test(expr[i]) || expr[i] === '.')) {
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }

    // Functions (sin, cos, tan, ln, log, sqrt, √)
    if (char === '√') {
      tokens.push({ type: 'FUNCTION', value: 'sqrt' });
      i++;
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      let funcStr = '';
      while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
        funcStr += expr[i];
        i++;
      }
      if (FUNCTIONS.includes(funcStr.toLowerCase())) {
        tokens.push({ type: 'FUNCTION', value: funcStr.toLowerCase() });
      }
      continue;
    }

    // Parentheses
    if (char === '(') {
      // Implicit multiplication like 5(2) or )(
      if (tokens.length > 0) {
        const prev = tokens[tokens.length - 1];
        if (prev.type === 'NUMBER' || prev.type === 'RPAREN') {
          tokens.push({ type: 'OPERATOR', value: '*' });
        }
      }
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    // Percentage & Factorial (postfix unary operators)
    if (char === '%' || char === '!') {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    // Power
    if (char === '^') {
      tokens.push({ type: 'OPERATOR', value: '^' });
      i++;
      continue;
    }

    // Operators: +, -, *, /
    if (['+', '-', '*', '/'].includes(char)) {
      // Check for unary minus:
      // If at start, or preceded by an operator, function, or '(', it's a negative number
      const isUnary =
        tokens.length === 0 ||
        tokens[tokens.length - 1].type === 'OPERATOR' ||
        tokens[tokens.length - 1].type === 'FUNCTION' ||
        tokens[tokens.length - 1].type === 'LPAREN';

      if (char === '-' && isUnary) {
        // Lookahead to see if next is number
        i++;
        let numStr = '-';
        while (i < expr.length && (/[0-9]/.test(expr[i]) || expr[i] === '.')) {
          numStr += expr[i];
          i++;
        }
        if (numStr === '-') {
          // It's negation of parenthesis like -(2+3), treat as 0 - ...
          tokens.push({ type: 'NUMBER', value: '0' });
          tokens.push({ type: 'OPERATOR', value: '-' });
        } else {
          tokens.push({ type: 'NUMBER', value: numStr });
        }
        continue;
      }

      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    // Skip unknown character
    i++;
  }

  return tokens;
}

const PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '^': 3,
  '%': 4,
  '!': 4,
};

function shuntingYard(tokens: Token[]): Token[] {
  const outputQueue: Token[] = [];
  const operatorStack: Token[] = [];

  for (const token of tokens) {
    if (token.type === 'NUMBER') {
      outputQueue.push(token);
    } else if (token.type === 'FUNCTION') {
      operatorStack.push(token);
    } else if (token.type === 'OPERATOR') {
      const o1 = token.value;
      while (operatorStack.length > 0) {
        const top = operatorStack[operatorStack.length - 1];
        if (top.type === 'FUNCTION') {
          outputQueue.push(operatorStack.pop()!);
        } else if (top.type === 'OPERATOR' && PRECEDENCE[top.value] >= PRECEDENCE[o1]) {
          outputQueue.push(operatorStack.pop()!);
        } else {
          break;
        }
      }
      operatorStack.push(token);
    } else if (token.type === 'LPAREN') {
      operatorStack.push(token);
    } else if (token.type === 'RPAREN') {
      let foundMatching = false;
      while (operatorStack.length > 0) {
        const top = operatorStack.pop()!;
        if (top.type === 'LPAREN') {
          foundMatching = true;
          break;
        }
        outputQueue.push(top);
      }
      if (!foundMatching) {
        throw new Error('Unbalanced parentheses');
      }
      // If the token at the top of the stack is a function, pop it to the output queue
      if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'FUNCTION') {
        outputQueue.push(operatorStack.pop()!);
      }
    }
  }

  while (operatorStack.length > 0) {
    const top = operatorStack.pop()!;
    if (top.type === 'LPAREN' || top.type === 'RPAREN') {
      throw new Error('Unbalanced parentheses');
    }
    outputQueue.push(top);
  }

  return outputQueue;
}

function factorial(n: number): number {
  if (n < 0 || Math.floor(n) !== n) throw new Error('Invalid factorial');
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= Math.min(n, 170); i++) {
    res *= i;
  }
  return res;
}

function evaluateRPN(tokens: Token[]): number {
  const stack: number[] = [];

  for (const token of tokens) {
    if (token.type === 'NUMBER') {
      stack.push(parseFloat(token.value));
    } else if (token.type === 'FUNCTION') {
      if (stack.length === 0) throw new Error('Invalid function syntax');
      const val = stack.pop()!;
      switch (token.value) {
        case 'sqrt':
          if (val < 0) throw new Error('Cannot square root negative');
          stack.push(Math.sqrt(val));
          break;
        case 'sin':
          stack.push(Math.sin((val * Math.PI) / 180)); // degrees
          break;
        case 'cos':
          stack.push(Math.cos((val * Math.PI) / 180));
          break;
        case 'tan':
          stack.push(Math.tan((val * Math.PI) / 180));
          break;
        case 'ln':
          if (val <= 0) throw new Error('Invalid log');
          stack.push(Math.log(val));
          break;
        case 'log':
          if (val <= 0) throw new Error('Invalid log');
          stack.push(Math.log10(val));
          break;
        default:
          throw new Error(`Unknown function: ${token.value}`);
      }
    } else if (token.type === 'OPERATOR') {
      if (token.value === '%') {
        if (stack.length === 0) throw new Error('Invalid percentage');
        const val = stack.pop()!;
        stack.push(val / 100);
      } else if (token.value === '!') {
        if (stack.length === 0) throw new Error('Invalid factorial');
        const val = stack.pop()!;
        stack.push(factorial(val));
      } else {
        if (stack.length < 2) throw new Error('Invalid syntax');
        const b = stack.pop()!;
        const a = stack.pop()!;

        switch (token.value) {
          case '+':
            stack.push(a + b);
            break;
          case '-':
            stack.push(a - b);
            break;
          case '*':
            stack.push(a * b);
            break;
          case '/':
            if (b === 0) throw new Error('Cannot divide by 0');
            stack.push(a / b);
            break;
          case '^':
            stack.push(Math.pow(a, b));
            break;
          default:
            throw new Error(`Unknown operator: ${token.value}`);
        }
      }
    }
  }

  if (stack.length !== 1) {
    throw new Error('Invalid syntax');
  }

  return stack[0];
}

export function formatResultNumber(num: number): string {
  if (!isFinite(num)) return 'Error';
  const precisionRounded = Math.round(num * 1e12) / 1e12;

  if (Math.abs(precisionRounded) > 1e14 || (Math.abs(precisionRounded) < 1e-7 && precisionRounded !== 0)) {
    return precisionRounded.toExponential(6).replace(/\.?0+e/, 'e');
  }

  return precisionRounded.toString();
}

export function formatIndianNumber(val: string): string {
  if (!val) return '';
  if (val === 'Error' || val.startsWith('Cannot') || val.includes('Error')) return val;

  const parts = val.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

  const isNegative = integerPart.startsWith('-');
  const absInt = isNegative ? integerPart.slice(1) : integerPart;

  if (/^\d+$/.test(absInt)) {
    try {
      const num = BigInt(absInt);
      const formattedInt = num.toLocaleString('en-IN');
      return (isNegative ? '-' : '') + formattedInt + decimalPart;
    } catch {
      const num = Number(absInt);
      const formattedInt = num.toLocaleString('en-IN');
      return (isNegative ? '-' : '') + formattedInt + decimalPart;
    }
  }

  return val;
}

export function formatDisplayValue(val: string): string {
  if (!val) return '0';
  return formatIndianNumber(val);
}
