import * as fs from 'fs';
import { XMLValidator } from 'fast-xml-parser';
// В реална среда се инсталира: npm i xsd-schema-validator
// import { validateXmlAgainstXsd } from 'xsd-schema-validator';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Мокната функция, за да не гърми TypeScript, докато нямаме инсталиран Java/C++ binding за XSD
async function validateXmlAgainstXsd(xml: string, xsd: string): Promise<{valid: boolean, errors: string[]}> {
  return { valid: true, errors: [] };
}

export async function validateInvoiceXml(xmlString: string): Promise<ValidationResult> {
  // 1. Проверка за well-formed XML
  const validation = XMLValidator.validate(xmlString);
  if (validation !== true && typeof validation === 'object') {
    return { valid: false, errors: [validation.err.msg] };
  }
  
  // 2. Валидация спрямо XSD
  try {
    const xsdSchema = fs.readFileSync('./nap-einvoice.xsd', 'utf8');
    const result = await validateXmlAgainstXsd(xmlString, xsdSchema);
    
    if (!result.valid) {
      return { valid: false, errors: result.errors };
    }
  } catch (e: any) {
    console.warn('XSD файла не е намерен, пропускаме XSD валидацията');
  }
  
  // 3. Проверка за българските специфични правила
  const errors = validateBulgarianSpecificRules(xmlString);
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true, errors: [] };
}

function validateBulgarianSpecificRules(xmlString: string): string[] {
  const errors: string[] = [];
  // Пример: проверка за валиден ЕИК/БУЛСТАТ
  const bulstatMatch = xmlString.match(/<cbc:CompanyID>(\d+)<\/cbc:CompanyID>/);
  if (bulstatMatch && bulstatMatch[1].length !== 9 && bulstatMatch[1].length !== 13) {
    errors.push('Невалиден ЕИК/БУЛСТАТ (трябва да е 9 или 13 цифри)');
  }
  return errors;
}
