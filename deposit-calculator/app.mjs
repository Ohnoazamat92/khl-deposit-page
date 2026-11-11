import { initialState, limits, maturityAllowed, change, calculate, parseNumber, replenishmentHint } from './model.mjs';
const autoCurrency = true;
let state = initialState();
const $ = id => document.getElementById(id);
document.body.classList.toggle('variant-b', autoCurrency);
$('phone-form').hidden = !autoCurrency;
if (autoCurrency) $('phone-demo').textContent = 'Демонстрационный расчёт. Форма не отправляет данные.';
const money = n => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
const percent = n => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + '%';
const monthWord = n => n === 1 || n === 21 ? 'месяц' : [2, 3, 4, 22, 23, 24].includes(n) ? 'месяца' : 'месяцев';
let noticeTimer, hintOwner;
const errors = { months: false, amount: false };
function notify(text) {
  clearTimeout(noticeTimer);
  $('notice-text').textContent = text || '';
  $('notice').hidden = !text;
  if (text) noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 6000);
}
function hideHint() {
  $('tooltip').hidden = true;
  if (hintOwner) { hintOwner.setAttribute('aria-expanded', 'false'); hintOwner.removeAttribute('aria-describedby'); }
  hintOwner = null;
}
function closeMenu(focus = false) {
  $('payout-options').hidden = true;
  $('payout-button').setAttribute('aria-expanded', 'false');
  if (focus) $('payout-button').focus();
}
function error(field, message = '') {
  errors[field] = Boolean(message);
  $(field).setAttribute('aria-invalid', String(Boolean(message)));
  $(field + '-error').textContent = message;
  $(field + '-error').hidden = !message;
}
function renderResults() {
  const invalid = errors.amount || errors.months;
  const result = calculate(state), { symbol } = limits(state.currency);
  $('rate').textContent = invalid ? '—' : percent(result.rate);
  $('yield').textContent = invalid ? '—' : percent(result.yield);
  $('income').textContent = invalid ? '—' : money(Math.round(result.income)) + ' ' + symbol;
  $('total').textContent = invalid ? '—' : money(Math.round(result.total)) + ' ' + symbol;
}
function render() {
  const { min, max, symbol } = limits(state.currency);
  const amount = state.amounts[state.currency];
  if (!errors.months && document.activeElement !== $('months')) $('months').value = state.months;
  if (!errors.amount && document.activeElement !== $('amount')) $('amount').value = money(amount);
  $('month-word').textContent = monthWord(state.months);
  $('months').style.width = Math.max(1, $('months').value.length) + 'ch';
  $('amount').style.width = Math.min(17, Math.max(1, $('amount').value.length)) + 'ch';
  $('month-range').value = state.months;
  $('month-range').style.setProperty('--progress', (state.months - 1) / 23 * 100 + '%');
  $('month-range').setAttribute('aria-valuetext', `${state.months} ${monthWord(state.months)}`);
  // Логарифмическая шкала даёт точный выбор небольших сумм на диапазоне до 30 млн.
  const position = Math.log(amount / min) / Math.log(max / min) * 1000;
  $('amount-range').value = position;
  $('amount-range').style.setProperty('--progress', position / 10 + '%');
  $('amount-range').setAttribute('aria-valuetext', money(amount) + ' ' + symbol);
  $('amount-min').textContent = money(min) + ' ' + symbol;
  $('amount-max').textContent = money(max) + ' ' + symbol;
  $('currency-symbol').textContent = symbol;
  $('amount-controls').hidden = autoCurrency;
  $('khl-chip').hidden = !autoCurrency;
  $('khl-banner').hidden = !state.khl;
  $('months').disabled = Boolean(state.khl);
  $('month-range').disabled = Boolean(state.khl);
  for (const button of document.querySelectorAll('[data-currency]')) {
    button.setAttribute('aria-pressed', String(button.dataset.currency === (state.khl ? 'KHL' : state.currency)));
    button.setAttribute('aria-disabled', String(!autoCurrency && button.dataset.currency === 'CNY' && state.frequency === 'maturity'));
  }
  $('currency-help').textContent = !autoCurrency && state.frequency === 'maturity' ? 'На вкладе с выплатой в конце срока доступны только рубли' : 'Можно выбрать рубли или юани';
  $('payout').hidden = state.months === 1;
  const fixedPayout = autoCurrency && state.currency === 'CNY';
  $('payout-button').hidden = fixedPayout;
  $('payout-fixed').hidden = !fixedPayout;
  $('payout-explanation').hidden = !fixedPayout;
  $('payout-button').setAttribute('aria-disabled', String(state.currency === 'CNY'));
  $('payout-value').textContent = state.frequency === 'maturity' ? 'В конце срока' : 'Каждый месяц';
  for (const button of document.querySelectorAll('[data-frequency]')) button.setAttribute('aria-selected', String(button.dataset.frequency === state.frequency));
  $('maturity-option').setAttribute('aria-disabled', String(!maturityAllowed(state)));
  const maturityRate = calculate({ ...state, frequency: 'maturity' }).rate;
  $('maturity-description').textContent = `Ставка ${percent(maturityRate)}. Проценты придут только после закрытия вклада`;
  $('replenishment').hidden = autoCurrency && state.months === 1;
  $('one-month-card').hidden = !autoCurrency || state.months !== 1;
  $('replenishable').checked = state.replenishable;
  $('replenishable').disabled = state.months === 1;
  renderResults();
}
function dispatch(type, value) {
  hideHint();
  const result = change(state, type, value, autoCurrency);
  state = result.state;
  if (type === 'currency' && !result.notice) {
    error('amount'); $('amount').value = money(state.amounts[state.currency]);
    if (state.khl) { error('months'); $('months').value = state.months; }
  }
  if (type !== 'amount') closeMenu();
  notify(result.notice);
  render();
}
function validate(field) {
  const value = parseNumber($(field).value);
  const { min, max, symbol } = limits(state.currency);
  let message = '';
  if (field === 'months' && (!Number.isInteger(value) || value < 1 || value > 24)) message = 'Введите срок от 1 до 24 месяцев';
  if (field === 'amount') {
    if (!Number.isFinite(value)) message = 'Введите сумму цифрами';
    else if (value < min) message = `Минимальная сумма — ${money(min)} ${symbol}`;
    else if (value > max) message = `Максимальная сумма — ${money(max)} ${symbol}`;
  }
  error(field, message);
  if (!message) {
    const current = field === 'months' ? state.months : state.amounts[state.currency];
    if (current !== value) dispatch(field, value); else render();
  } else renderResults();
  return !message;
}
for (const field of ['months', 'amount']) {
  $(field).addEventListener('input', () => {
    $(field).style.width = Math.min(17, Math.max(1, $(field).value.length)) + 'ch';
    validate(field);
  });
  $(field).addEventListener('blur', () => {
    if (validate(field)) $(field).value = field === 'amount' ? money(state.amounts[state.currency]) : state.months;
    render();
  });
  $(field).addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); $(field).blur(); }
    if (event.key === 'Escape') { error(field); $(field).value = field === 'amount' ? money(state.amounts[state.currency]) : state.months; render(); }
  });
}
$('month-range').addEventListener('input', event => { error('months'); dispatch('months', Number(event.target.value)); });
$('amount-range').addEventListener('input', event => {
  const { min, max } = limits(state.currency), value = Number(event.target.value);
  const step = state.currency === 'RUB' ? 1000 : 100;
  const amount = value === 1000 ? max : value === 0 ? min : Math.max(min, Math.round(min * Math.pow(max / min, value / 1000) / step) * step);
  error('amount'); dispatch('amount', amount);
});
for (const button of document.querySelectorAll('[data-currency]')) button.addEventListener('click', () => dispatch('currency', button.dataset.currency));
$('replenishable').addEventListener('change', event => dispatch('replenishable', event.target.checked));
function openMenu() {
  hideHint();
  if (state.currency === 'CNY') { notify('В юанях можно получать проценты только каждый месяц'); return; }
  if (state.months === 1) return;
  $('payout-options').hidden = false;
  $('payout-button').setAttribute('aria-expanded', 'true');
  $(state.frequency + '-option').focus();
}
$('payout-button').addEventListener('click', () => $('payout-options').hidden ? openMenu() : closeMenu());
$('payout-button').addEventListener('keydown', event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); openMenu(); } });
for (const button of document.querySelectorAll('[data-frequency]')) button.addEventListener('click', () => {
  const next = button.dataset.frequency;
  if (next === 'maturity' && !maturityAllowed(state)) { notify(change(state, 'frequency', next).notice); return; }
  dispatch('frequency', next); closeMenu(true);
});
$('payout-options').addEventListener('keydown', event => {
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const target = event.key === 'Home' ? 'maturity-option' : event.key === 'End' ? 'monthly-option' : document.activeElement === $('maturity-option') ? 'monthly-option' : 'maturity-option';
    $(target).focus();
  }
  if (event.key === 'Tab') closeMenu();
});
const hintText = kind => {
  if (kind === 'replenishment') return replenishmentHint(state);
  if (kind === 'yield') return state.frequency === 'maturity' ? 'Доходность равна годовой ставке. Проценты выплачиваются один раз в конце срока, без капитализации.' : 'Доходность учитывает ежемесячное зачисление процентов на вклад. Новые проценты начисляются на сумму с учётом предыдущих выплат.';
  return `Сумма вклада и доход за ${state.months} ${monthWord(state.months)}. ${state.frequency === 'monthly' ? 'В деморасчёте проценты каждый месяц остаются на вкладе.' : 'Проценты начисляются без капитализации и выплачиваются в конце срока.'} Расчёт приблизительный, без календарных дат и налогов.`;
};
for (const button of document.querySelectorAll('[data-hint]')) button.addEventListener('click', () => {
  const wasOpen = hintOwner === button;
  hideHint(); closeMenu();
  if (wasOpen) return;
  hintOwner = button;
  const tip = $('tooltip');
  const text = hintText(button.dataset.hint);
  tip.replaceChildren();
  for (const block of text.split('\n\n')) {
    const paragraph = document.createElement('p'), [title, body] = block.split('\n');
    if (body) {
      const heading = document.createElement('strong');
      heading.textContent = title;
      paragraph.append(heading, document.createElement('br'), document.createTextNode(body));
    } else paragraph.textContent = title;
    tip.append(paragraph);
  }
  tip.hidden = false;
  button.setAttribute('aria-expanded', 'true'); button.setAttribute('aria-describedby', 'tooltip');
  const parent = document.querySelector('.calculator').getBoundingClientRect(), rect = button.getBoundingClientRect();
  tip.style.left = Math.max(0, Math.min(rect.left - parent.left - 16, parent.width - tip.offsetWidth)) + 'px';
  tip.style.top = rect.bottom - parent.top + 10 + 'px';
});
document.addEventListener('click', event => {
  if (!$('payout').contains(event.target)) closeMenu();
  if (!event.target.closest('[data-hint]') && !$('tooltip').contains(event.target)) hideHint();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') { if (!$('payout-options').hidden) closeMenu(true); hideHint(); notify(''); } });
$('notice-close').addEventListener('click', () => notify(''));
window.addEventListener('resize', hideHint);
function phoneDigits() {
  const value = $('phone').value;
  if (!/^[+\d\s()-]*$/.test(value)) return '';
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 ? '7' + digits : digits.replace(/^8/, '7');
}
function validatePhone() {
  const valid = /^7\d{10}$/.test(phoneDigits());
  $('phone').setAttribute('aria-invalid', String(!valid));
  $('phone-error').textContent = $('phone').value.trim() ? 'Введите номер полностью: +7 и ещё 10 цифр' : 'Введите номер телефона';
  $('phone-error').hidden = valid;
  return valid;
}
$('phone').addEventListener('input', () => {
  $('phone-status').hidden = true;
  if ($('phone').getAttribute('aria-invalid') === 'true') validatePhone();
});
$('phone').addEventListener('blur', () => {
  if (!$('phone').value.trim() || !validatePhone()) return;
  $('phone').value = phoneDigits().replace(/^7(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 ($1) $2-$3-$4');
});
$('phone-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!validatePhone()) { $('phone').focus(); return; }
  $('phone-status').textContent = 'Номер заполнен. В прототипе СМС не отправляется.';
  $('phone-status').hidden = false;
});
render();
