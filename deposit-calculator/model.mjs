// Демонстрационная модель из MaturityDepositViewController.swift, не банковский тариф.
export const initialState = () => ({ months: 12, currency: 'RUB', frequency: 'maturity', preferred: 'maturity', replenishable: false, preferredReplenishable: false, amounts: { RUB: 1000000, CNY: 25000 } });
export const limits = currency => currency === 'RUB' ? { min: 50000, max: 30000000, symbol: '₽' } : { min: 5000, max: 30000000, symbol: '¥' };
export const maturityAllowed = s => s.currency === 'RUB' && s.months >= 2 && s.months <= 24;
export function change(s, type, value, autoCurrency = false) {
  const next = { ...s, amounts: { ...s.amounts } };
  let notice = '';
  if (type === 'months') {
    if (s.khl) return { state: s };
    if (!Number.isInteger(value) || value < 1 || value > 24) return { state: s };
    next.months = value;
    next.frequency = maturityAllowed(next) ? s.preferred : 'monthly';
    next.replenishable = value === 1 ? false : s.preferredReplenishable;
  } else if (type === 'frequency') {
    if (!['maturity', 'monthly'].includes(value)) return { state: s };
    if (value === 'maturity' && !maturityAllowed(s)) return { state: s, notice: s.currency === 'CNY' ? 'В юанях можно получать проценты только каждый месяц' : 'Выплата в конце срока доступна на сроке от 2 до 24 месяцев' };
    next.frequency = value;
    if (!autoCurrency || s.currency === 'RUB') next.preferred = value;
  } else if (type === 'currency') {
    if (value === 'KHL' && autoCurrency) {
      if (s.khl) return { state: s };
      next.khl = true;
      next.regularMonths = s.months;
      next.months = 4;
      next.currency = 'RUB';
      next.frequency = s.preferred;
      next.replenishable = s.preferredReplenishable;
      return { state: next, notice };
    }
    if (!['RUB', 'CNY'].includes(value)) return { state: s };
    if (!autoCurrency && value === 'CNY' && s.frequency === 'maturity') return { state: s, notice: 'На вкладе с выплатой в конце срока доступны только рубли' };
    next.currency = value;
    if (s.khl) {
      next.khl = false;
      next.months = s.regularMonths;
      next.replenishable = next.months === 1 ? false : s.preferredReplenishable;
    }
    if (autoCurrency) next.frequency = maturityAllowed(next) ? s.preferred : 'monthly';
    else if (value === 'CNY') next.frequency = next.preferred = 'monthly';
  } else if (type === 'amount') {
    const { min, max } = limits(s.currency);
    if (!Number.isFinite(value) || value < min || value > max) return { state: s };
    next.amounts[s.currency] = Math.round(value * 100) / 100;
  } else if (type === 'replenishable' && s.months !== 1) {
    next.replenishable = next.preferredReplenishable = Boolean(value);
  }
  return { state: next, notice };
}
export function calculate(s) {
  const amount = s.amounts[s.currency];
  const base = s.currency === 'CNY' ? 3 : s.months === 1 ? 12 : s.months > 14 ? 10.8 : s.frequency === 'maturity' ? 12.4 : 11.2;
  // Согласованная демоскидка; для юаней оставляем 3%.
  const rate = base - (s.replenishable && s.currency === 'RUB' ? 2 : 0);
  const income = s.frequency === 'maturity' ? amount * rate / 100 * s.months / 12 : amount * (Math.pow(1 + rate / 1200, s.months) - 1);
  return { rate, income: Math.round(income * 100) / 100, total: Math.round((amount + income) * 100) / 100, yield: income / amount * 1200 / s.months };
}
export function parseNumber(text) {
  const value = text.trim().replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : NaN;
}
export function replenishmentHint(s) {
  if (s.months === 1) return 'Вклад на 1 месяц можно пополнять только в день открытия';
  const days = s.frequency === 'maturity' ? 7 : 30;
  return `Непополняемый вклад\nСтавка повышенная. Можно пополнять только в первые ${days} дней\n\nПополняемый вклад\nСтавка стандартная. Можно пополнять всегда, кроме последних ${days} дней до закрытия`;
}
