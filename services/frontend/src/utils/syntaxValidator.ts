// Syntax validation utilities for different programming languages

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate Python syntax
 */
export const validatePython = (code: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for basic Python syntax issues
  const lines = code.split('\n');
  
  // Check for unclosed parentheses, brackets, braces
  let parenCount = 0;
  let bracketCount = 0;
  let braceCount = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const prevChar = j > 0 ? line[j - 1] : '';

      // Handle strings
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }

      if (!inString) {
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
    }
  }

  if (parenCount !== 0) {
    errors.push(`Unclosed parentheses: ${parenCount > 0 ? 'missing closing' : 'extra closing'}`);
  }
  if (bracketCount !== 0) {
    errors.push(`Unclosed brackets: ${bracketCount > 0 ? 'missing closing' : 'extra closing'}`);
  }
  if (braceCount !== 0) {
    errors.push(`Unclosed braces: ${braceCount > 0 ? 'missing closing' : 'extra closing'}`);
  }

  // Check for common Python issues
  if (code.includes('print ') && !code.includes('print(')) {
    warnings.push('Using Python 2 print statement. Use print() for Python 3');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate JavaScript/TypeScript syntax
 */
export const validateJavaScript = (code: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for unclosed brackets/braces/parens
  let parenCount = 0;
  let bracketCount = 0;
  let braceCount = 0;
  let inString = false;
  let inComment = false;
  let stringChar = '';

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = i < code.length - 1 ? code[i + 1] : '';
    const prevChar = i > 0 ? code[i - 1] : '';

    // Handle comments
    if (char === '/' && nextChar === '/' && !inString) {
      inComment = true;
    }
    if (char === '\n' && inComment) {
      inComment = false;
    }

    // Handle strings
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\' && !inComment) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }

    if (!inString && !inComment) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
    }
  }

  if (parenCount !== 0) {
    errors.push(`Unclosed parentheses: ${parenCount > 0 ? 'missing closing' : 'extra closing'}`);
  }
  if (bracketCount !== 0) {
    errors.push(`Unclosed brackets: ${bracketCount > 0 ? 'missing closing' : 'extra closing'}`);
  }
  if (braceCount !== 0) {
    errors.push(`Unclosed braces: ${braceCount > 0 ? 'missing closing' : 'extra closing'}`);
  }

  // Check for missing semicolons in certain patterns (warning only)
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.endsWith(';') && !line.endsWith('{') && !line.endsWith('}') && 
        !line.endsWith(',') && !line.startsWith('//') && !line.startsWith('/*') &&
        (line.startsWith('const ') || line.startsWith('let ') || line.startsWith('var ') ||
         line.includes('return '))) {
      warnings.push(`Line ${i + 1}: Consider adding semicolon`);
      break; // Only show first warning
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate JSON syntax
 */
export const validateJSON = (code: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    JSON.parse(code);
  } catch (e: any) {
    errors.push(e.message || 'Invalid JSON syntax');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate C/C++ syntax (basic checks)
 */
export const validateC = (code: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for main function
  if (!code.includes('int main') && !code.includes('void main')) {
    warnings.push('No main() function found');
  }

  // Check for unclosed brackets/braces/parens
  let parenCount = 0;
  let bracketCount = 0;
  let braceCount = 0;

  for (const char of code) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (char === '[') bracketCount++;
    if (char === ']') bracketCount--;
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
  }

  if (parenCount !== 0) {
    errors.push(`Unclosed parentheses: ${parenCount > 0 ? 'missing closing' : 'extra closing'}`);
  }
  if (bracketCount !== 0) {
    errors.push(`Unclosed brackets: ${bracketCount > 0 ? 'missing closing' : 'extra closing'}`);
  }
  if (braceCount !== 0) {
    errors.push(`Unclosed braces: ${braceCount > 0 ? 'missing closing' : 'extra closing'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Main validation function that routes to language-specific validators
 */
export const validateCode = (code: string, language: string): ValidationResult => {
  if (!code.trim()) {
    return {
      isValid: false,
      errors: ['Code is empty'],
      warnings: [],
    };
  }

  const normalizedLang = language.toLowerCase();

  switch (normalizedLang) {
    case 'python':
      return validatePython(code);
    
    case 'javascript':
    case 'typescript':
      return validateJavaScript(code);
    
    case 'json':
      return validateJSON(code);
    
    case 'c':
    case 'cpp':
    case 'c++':
      return validateC(code);
    
    // For languages without specific validators, just do basic checks
    case 'go':
    case 'rust':
    case 'java':
    case 'zig':
    case 'vlang':
    case 'elixir':
    default:
      return {
        isValid: true,
        errors: [],
        warnings: [],
      };
  }
};
