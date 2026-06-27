/**
 * Maps Indian pincode first 2 digits to state code
 * Used for shipping zone lookup (zones store state codes, not pincodes)
 */

const PINCODE_PREFIX_MAP: Record<string, string> = {
  // Delhi
  '11': 'DL',
  // Haryana
  '12': 'HR',
  '13': 'HR',
  // Punjab
  '14': 'PB',
  '15': 'PB',
  '16': 'PB',
  // Himachal Pradesh
  '17': 'HP',
  // Jammu & Kashmir / Ladakh
  '18': 'JK',
  '19': 'JK',
  // Uttar Pradesh
  '20': 'UP',
  '21': 'UP',
  '22': 'UP',
  '23': 'UP',
  '24': 'UP',
  '25': 'UP',
  '26': 'UP',
  '27': 'UP',
  '28': 'UP',
  // Rajasthan
  '30': 'RJ',
  '31': 'RJ',
  '32': 'RJ',
  '33': 'RJ',
  '34': 'RJ',
  // Gujarat
  '36': 'GJ',
  '37': 'GJ',
  '38': 'GJ',
  '39': 'GJ',
  // Maharashtra
  '40': 'MH',
  '41': 'MH',
  '42': 'MH',
  '43': 'MH',
  '44': 'MH',
  // Madhya Pradesh
  '45': 'MP',
  '46': 'MP',
  '47': 'MP',
  '48': 'MP',
  // Chhattisgarh
  '49': 'CG',
  // Telangana
  '50': 'TG',
  '51': 'TG',
  '52': 'TG',
  '53': 'TG',
  // Andhra Pradesh
  '54': 'AP',
  '55': 'AP',
  // Karnataka (560xxx–591xxx)
  '56': 'KA',
  '57': 'KA',
  '58': 'KA',
  '59': 'KA',
  // Tamil Nadu
  '60': 'TN',
  '61': 'TN',
  '62': 'TN',
  '63': 'TN',
  '64': 'TN',
  '65': 'TN',
  // Kerala
  '67': 'KL',
  '68': 'KL',
  '69': 'KL',
  // West Bengal
  '70': 'WB',
  '71': 'WB',
  '72': 'WB',
  '73': 'WB',
  '74': 'WB',
  // Odisha
  '75': 'OR',
  '76': 'OR',
  '77': 'OR',
  // Bihar
  '80': 'BR',
  '81': 'BR',
  '85': 'BR',
  // Jharkhand
  '82': 'JH',
  '83': 'JH',
  // Assam & North-East
  '79': 'AS',
  '78': 'AS',
  '90': 'AS',
  '91': 'AS',
  '92': 'AS',
  '93': 'AS',
  '94': 'AS',
  '95': 'AS',
  '96': 'AS',
  '97': 'AS',
  '98': 'AS',
  '99': 'AS',
};

export function pincodeToStateCode(pincode: string): string | null {
  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return null;
  }
  const prefix = pincode.slice(0, 2);
  return PINCODE_PREFIX_MAP[prefix] ?? null;
}

/**
 * Full state / UT name → GST state code. Keys are lower-cased and stripped of
 * punctuation so common spelling/format variants ("NCT of Delhi", "Delhi",
 * "delhi") all resolve. Used as the authoritative source for the CGST+SGST vs
 * IGST split (the buyer's selected delivery state), with pincode as a fallback.
 */
const STATE_NAME_TO_CODE: Record<string, string> = {
  'andhra pradesh': 'AP',
  'arunachal pradesh': 'AR',
  assam: 'AS',
  bihar: 'BR',
  chhattisgarh: 'CG',
  goa: 'GA',
  gujarat: 'GJ',
  haryana: 'HR',
  'himachal pradesh': 'HP',
  'jammu and kashmir': 'JK',
  'jammu kashmir': 'JK',
  jharkhand: 'JH',
  karnataka: 'KA',
  kerala: 'KL',
  ladakh: 'LA',
  'madhya pradesh': 'MP',
  maharashtra: 'MH',
  manipur: 'MN',
  meghalaya: 'ML',
  mizoram: 'MZ',
  nagaland: 'NL',
  odisha: 'OR',
  orissa: 'OR',
  punjab: 'PB',
  rajasthan: 'RJ',
  sikkim: 'SK',
  'tamil nadu': 'TN',
  telangana: 'TG',
  tripura: 'TR',
  'uttar pradesh': 'UP',
  uttarakhand: 'UK',
  uttaranchal: 'UK',
  'west bengal': 'WB',
  'andaman and nicobar islands': 'AN',
  chandigarh: 'CH',
  'dadra and nagar haveli': 'DN',
  'dadra and nagar haveli and daman and diu': 'DN',
  'daman and diu': 'DD',
  delhi: 'DL',
  'nct of delhi': 'DL',
  'new delhi': 'DL',
  lakshadweep: 'LD',
  puducherry: 'PY',
  pondicherry: 'PY',
};

export function stateNameToCode(stateName: string | null | undefined): string | null {
  if (!stateName) return null;
  // Already a 2-letter code? Accept it as-is.
  const trimmed = stateName.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  const key = trimmed.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
  return STATE_NAME_TO_CODE[key] ?? null;
}

/**
 * Resolve the buyer's GST state code for the CGST/SGST vs IGST decision.
 * The selected delivery state is authoritative; the pincode is a fallback for
 * when the state is missing. Returns null when neither can be resolved (caller
 * then defaults to intra-state, i.e. the seller's own state).
 */
export function resolveBuyerStateCode(
  stateName: string | null | undefined,
  pincode: string | null | undefined
): string | null {
  return stateNameToCode(stateName) ?? pincodeToStateCode(pincode || '') ?? null;
}
