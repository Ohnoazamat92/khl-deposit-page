const amountRange = document.querySelector("#amountRange");
const amountOutput = document.querySelector("#amountOutput");
const yieldValue = document.querySelector("#yieldValue");
const totalValue = document.querySelector("#totalValue");
const gainValue = document.querySelector("#gainValue");
const phoneInput = document.querySelector("#phoneInput");
const filterButtons = document.querySelectorAll(".filter-button");
const form = document.querySelector(".lead-form");

const formatRubles = (value) =>
  new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(value) + " ₽";

const updateRangeProgress = (range) => {
  const min = Number(range.min);
  const max = Number(range.max);
  const value = Number(range.value);
  const progress = ((value - min) / (max - min)) * 100;
  range.style.setProperty("--range-progress", `${progress}%`);
};

const updateAmount = () => {
  const amount = Number(amountRange.value);
  const termMonths = 5;
  const rate = 0.13;
  const income = Math.round(amount * rate * (termMonths / 12));
  const promoBonus = Math.round(amount * 0.020044);
  const total = amount + income + promoBonus;
  const effectiveYield = ((income + promoBonus) / amount) * 100;

  amountOutput.textContent = formatRubles(amount);
  yieldValue.textContent = `${effectiveYield.toFixed(2).replace(".", ",")}%`;
  totalValue.textContent = formatRubles(total);
  gainValue.textContent = formatRubles(promoBonus);
  updateRangeProgress(amountRange);
};

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
  });
});

phoneInput.addEventListener("input", () => {
  const digits = phoneInput.value.replace(/\D/g, "").slice(0, 11);
  const normalized = digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
  const parts = normalized.replace(/^7/, "").match(/^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);

  if (!normalized) {
    phoneInput.value = "";
    return;
  }

  const [, code, first, second, third] = parts;
  phoneInput.value = [
    "+7",
    code && ` (${code}`,
    code.length === 3 ? ")" : "",
    first && ` ${first}`,
    second && `-${second}`,
    third && `-${third}`,
  ]
    .filter(Boolean)
    .join("");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
});

document.querySelectorAll('input[type="range"]').forEach(updateRangeProgress);
updateAmount();
amountRange.addEventListener("input", updateAmount);
