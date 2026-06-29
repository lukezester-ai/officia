import Papa from 'papaparse';

export interface ParsedTransaction {
  date: Date;
  amount: number;
  description: string;
  counterpartyName?: string;
  counterpartyIban?: string;
}

type CsvRow = Record<string, string | undefined>;

export class BankStatementParser {
  static parseCSV(csvContent: string): ParsedTransaction[] {
    const results = Papa.parse<CsvRow>(csvContent, { header: true, skipEmptyLines: true });
    const transactions: ParsedTransaction[] = [];

    for (const row of results.data) {
      const dateStr = row['Date'] || row['Дата'] || row['Дата на вальор'];
      const amountStr = row['Amount'] || row['Сума'] || row['Оборот'];
      const description = row['Description'] || row['Основание'] || row['Детайли'];
      const counterpartyName = row['Counterparty'] || row['Наредител'] || row['Получател'];
      const counterpartyIban = row['IBAN'] || row['Сметка'];

      if (!dateStr || !amountStr) continue;

      transactions.push({
        date: new Date(dateStr),
        amount: parseFloat(amountStr.replace(/,/g, '')),
        description: description || '',
        counterpartyName: counterpartyName || '',
        counterpartyIban: counterpartyIban || '',
      });
    }

    return transactions;
  }
}
