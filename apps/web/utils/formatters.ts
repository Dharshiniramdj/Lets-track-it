import * as XLSX from 'xlsx';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  SGD: 'S$',
  AED: 'AED '
};

export function getCurrencySymbol(currencyCode = 'INR'): string {
  return CURRENCY_SYMBOLS[currencyCode] || '₹';
}

export function formatCurrency(
  amount: number,
  currencyCode = 'INR',
  isConfidential = false
): string {
  if (isConfidential) {
    return '••••••';
  }
  const symbol = getCurrencySymbol(currencyCode);
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function formatDate(dateStr: string, format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY'): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (format === 'MM/DD/YYYY') {
    return `${month}/${day}/${year}`;
  }
  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }
  return `${day}/${month}/${year}`;
}

/**
 * Universal CSV Exporter
 */
export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(header => {
          let val = row[header];
          if (val === null || val === undefined) val = '';
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\.csv$/, '')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Universal Excel .xlsx Exporter
 */
export function exportToExcelFile(filename: string, sheetName: string, data: any[]) {
  if (!data || !data.length) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Data');
  XLSX.writeFile(workbook, `${filename.replace(/\.xlsx$/, '')}.xlsx`);
}
