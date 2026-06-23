// Slovenian public holidays (fixed + Easter-based)
export function getSlovenianHolidays(year: number): Map<string, string> {
  const holidays = new Map<string, string>();
  const pad = (n: number) => n.toString().padStart(2, '0');
  // Fixed holidays
  holidays.set(`${year}-01-01`, 'Novo leto');
  holidays.set(`${year}-01-02`, 'Novo leto');
  holidays.set(`${year}-02-08`, 'Prešernov dan');
  holidays.set(`${year}-04-27`, 'Dan upora proti okupatorju');
  holidays.set(`${year}-05-01`, 'Praznik dela');
  holidays.set(`${year}-05-02`, 'Praznik dela');
  holidays.set(`${year}-06-25`, 'Dan državnosti');
  holidays.set(`${year}-08-15`, 'Marijino vnebovzetje');
  holidays.set(`${year}-10-31`, 'Dan reformacije');
  holidays.set(`${year}-11-01`, 'Dan spomina na mrtve');
  holidays.set(`${year}-12-25`, 'Božič');
  holidays.set(`${year}-12-26`, 'Dan samostojnosti in enotnosti');
  // Easter (Computus algorithm)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(year, month - 1, day);
  const easterMon = new Date(easter);
  easterMon.setDate(easter.getDate() + 1);
  holidays.set(`${year}-${pad(easter.getMonth() + 1)}-${pad(easter.getDate())}`, 'Velika noč');
  holidays.set(`${year}-${pad(easterMon.getMonth() + 1)}-${pad(easterMon.getDate())}`, 'Velikonočni ponedeljek');
  // Whit Sunday = Easter + 49
  const whit = new Date(easter);
  whit.setDate(easter.getDate() + 49);
  holidays.set(`${year}-${pad(whit.getMonth() + 1)}-${pad(whit.getDate())}`, 'Binkoštna nedelja');
  return holidays;
}
