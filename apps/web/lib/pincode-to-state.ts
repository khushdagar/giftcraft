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
  '56': 'AP',
  // Karnataka
  '57': 'KA',
  '58': 'KA',
  // Tamil Nadu
  '60': 'TN',
  '61': 'TN',
  '62': 'TN',
  '63': 'TN',
  '64': 'TN',
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
