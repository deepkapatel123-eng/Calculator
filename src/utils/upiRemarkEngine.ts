/**
 * UPI Remark and Bank SMS Auto-Verification Engine
 * Supports standard Indian Bank & Google Pay Business SMS notifications
 */

export interface ParsedBankSms {
  isCredit: boolean;
  amount: number | null;
  utr: string | null;
  remark: string | null;
  bankName: string | null;
  payerName: string | null;
  rawText: string;
}

/**
 * Extracts payment details (amount, UTR, remark, bank) from Indian bank SMS text
 */
export function parseBankSms(smsText: string): ParsedBankSms {
  const text = (smsText || '').trim();
  const lower = text.toLowerCase();

  // Check if credit transaction
  const isCredit =
    lower.includes('credited') ||
    lower.includes('received') ||
    lower.includes('deposited') ||
    lower.includes('cr to') ||
    lower.includes('cr.') ||
    lower.includes('credit');

  // Extract Amount (e.g. INR 250.00, Rs. 250, Rs 250.50, ₹ 250)
  let amount: number | null = null;
  const amountMatch = text.match(/(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
    text.match(/(?:credited\s+(?:by|with)?|received)\s*(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (amountMatch && amountMatch[1]) {
    const cleanAmt = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (!isNaN(cleanAmt)) {
      amount = cleanAmt;
    }
  }

  // Extract 12-digit UPI reference number (UTR / RRN)
  let utr: string | null = null;
  const utrMatch =
    text.match(/(?:upi(?:\/cr|\/p2a|\/p2m|\/rrn)?\/|ref(?:\.|\s*no\.?)?\s*|utr(?:\s*no\.?)?:?\s*|rrn:?\s*)(\d{12})/i) ||
    text.match(/\b(\d{12})\b/);
  if (utrMatch && utrMatch[1]) {
    utr = utrMatch[1];
  }

  // Extract Bank Name
  let bankName: string | null = null;
  if (/axis/i.test(text)) bankName = 'Axis Bank';
  else if (/sbi|state bank/i.test(text)) bankName = 'State Bank of India';
  else if (/hdfc/i.test(text)) bankName = 'HDFC Bank';
  else if (/icici/i.test(text)) bankName = 'ICICI Bank';
  else if (/bob|baroda/i.test(text)) bankName = 'Bank of Baroda';
  else if (/kotak/i.test(text)) bankName = 'Kotak Bank';
  else if (/pnb|punjab/i.test(text)) bankName = 'PNB';
  else if (/paytm/i.test(text)) bankName = 'Paytm Payments Bank';
  else if (/google\s*pay|gpay/i.test(text)) bankName = 'Google Pay';

  // Extract Remark / Note (e.g. tn=..., Remark: ..., Info: ...)
  let remark: string | null = null;
  const remarkMatch =
    text.match(/(?:tn=|remark:?\s*|note:?\s*|info:?\s*|ref:?\s*)([A-Za-z0-9_-]+)/i) ||
    text.match(/\b([A-Z]{2,4}-\d{3,6})\b/i); // Matches formats like GP-492, RMK-1024, BILL-502
  if (remarkMatch && remarkMatch[1]) {
    remark = remarkMatch[1].trim();
  }

  // Extract Payer / Customer Name if present
  let payerName: string | null = null;
  const payerMatch = text.match(/(?:from|by)\s+([A-Za-z\s]+?)(?:\s+on|\s+via|\s+ref|\s+utr|\.|$)/i);
  if (payerMatch && payerMatch[1]) {
    const candidate = payerMatch[1].trim();
    if (candidate.length > 2 && !/(account|upi|inr|rs|bank)/i.test(candidate)) {
      payerName = candidate;
    }
  }

  return {
    isCredit,
    amount,
    utr,
    remark,
    bankName,
    payerName,
    rawText: text,
  };
}

/**
 * Checks if a parsed SMS or transaction matches the required remark
 */
export function checkRemarkMatch(
  expectedRemark: string,
  actualRemarkOrText: string
): boolean {
  if (!expectedRemark || !actualRemarkOrText) return false;

  const cleanExpected = expectedRemark.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanActual = actualRemarkOrText.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  if (cleanExpected.length === 0) return false;

  // Exact or substring match
  return cleanActual.includes(cleanExpected) || cleanExpected.includes(cleanActual);
}

/**
 * Generates sample realistic bank SMS messages for demonstration & testing
 */
export function generateSampleBankSms(
  remark: string,
  amount: number,
  bank: 'axis' | 'sbi' | 'hdfc' = 'axis'
): string {
  const utr = `${Math.floor(400000000000 + Math.random() * 599999999999)}`;
  const amtStr = amount > 0 ? amount.toFixed(2) : '100.00';
  const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  if (bank === 'axis') {
    return `Your A/C ending 3280 is credited by INR ${amtStr} on ${new Date().toLocaleDateString('en-GB')} ${time} by UPI/CR/${utr}/tn=${remark}. Available Bal: INR 48,250.00 - Axis Bank`;
  } else if (bank === 'sbi') {
    return `Dear Customer, A/C 9429 credited by Rs ${amtStr} on ${new Date().toLocaleDateString('en-GB')} transfer from Google Pay User Ref No ${utr} (${remark}) - SBI`;
  } else {
    return `HDFC Bank: Rs ${amtStr} credited to a/c **3801 on ${new Date().toLocaleDateString('en-GB')} by UPI user via Google Pay. Ref ${utr}. Remark: ${remark}.`;
  }
}
