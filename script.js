const amountRange = document.querySelector("#amountRange");
const amountOutput = document.querySelector("#amountOutput");
const yieldValue = document.querySelector("#yieldValue");
const totalValue = document.querySelector("#totalValue");
const gainValue = document.querySelector("#gainValue");
const termRange = document.querySelector("#termRange");
const termOutput = document.querySelector("#termOutput");
const termOptionButtons = document.querySelectorAll(".term-option");
const phoneInput = document.querySelector("#phoneInput");
const phoneField = document.querySelector(".phone-field");
const phoneClear = document.querySelector(".phone-clear");
const filterButtons = document.querySelectorAll(".filter-button");
const promoTarget = document.querySelector(".promo-target, .promo-card");
const form = document.querySelector(".lead-form");
const promoTransitionMs = 240;
let promoHideTimer;
let promoHasInitialized = false;

promoTarget.addEventListener("animationend", (event) => {
  if (event.animationName === "promo-shine-sweep") {
    promoTarget.classList.remove("is-shining");
  } else if (event.animationName === "promo-image-fade-in") {
    promoTarget.classList.remove("is-image-revealing");
  }
});

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
  const total = Math.round(amount * 1.098633);
  const promoBonus = Math.round(amount * 0.075044);

  amountOutput.textContent = formatRubles(amount);
  yieldValue.textContent = "7,22%";
  totalValue.textContent = formatRubles(total);
  gainValue.textContent = formatRubles(promoBonus);
  updateRangeProgress(amountRange);
};

const formatMonths = (value) => {
  const lastTwo = value % 100;
  const last = value % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return `${value} месяцев`;
  }

  if (last === 1) {
    return `${value} месяц`;
  }

  if (last >= 2 && last <= 4) {
    return `${value} месяца`;
  }

  return `${value} месяцев`;
};

const updateTerm = () => {
  termOutput.textContent = formatMonths(Number(termRange.value));
  termOptionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.term === termRange.value);
  });
  updateRangeProgress(termRange);
};

const setPromoVisibility = (shouldShow) => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  clearTimeout(promoHideTimer);

  const playPromoShine = () => {
    if (reduceMotion) {
      return;
    }

    promoTarget.classList.remove("is-shining");
    promoTarget.getBoundingClientRect();
    promoTarget.classList.add("is-shining");
  };

  const playPromoImageReveal = () => {
    if (reduceMotion) {
      return;
    }

    promoTarget.classList.remove("is-image-revealing");
    promoTarget.getBoundingClientRect();
    promoTarget.classList.add("is-image-revealing");
  };

  if (!promoHasInitialized || reduceMotion) {
    promoTarget.hidden = !shouldShow;
    promoTarget.classList.toggle("is-hiding", !shouldShow);
    promoTarget.toggleAttribute("aria-hidden", !shouldShow);
    promoHasInitialized = true;

    if (shouldShow) {
      playPromoImageReveal();
      playPromoShine();
    }

    return;
  }

  if (shouldShow) {
    promoTarget.hidden = false;
    promoTarget.setAttribute("aria-hidden", "true");
    promoTarget.classList.add("is-hiding");
    promoTarget.getBoundingClientRect();

    requestAnimationFrame(() => {
      promoTarget.classList.remove("is-hiding");
      promoTarget.removeAttribute("aria-hidden");
      playPromoImageReveal();
      playPromoShine();
    });
    return;
  }

  promoTarget.classList.remove("is-shining", "is-image-revealing");
  promoTarget.setAttribute("aria-hidden", "true");
  promoTarget.classList.add("is-hiding");
  promoHideTimer = setTimeout(() => {
    promoTarget.hidden = true;
  }, promoTransitionMs);
};

const updateTermAvailability = (selectedButton) => {
  const isKhlDeposit = selectedButton.textContent.includes("КХЛ");
  const termField = termRange.closest(".slider-field");

  termRange.disabled = isKhlDeposit;
  termField.classList.toggle("is-disabled", isKhlDeposit);
  setPromoVisibility(isKhlDeposit);

  if (isKhlDeposit) {
    termRange.value = 5;
  } else if (!["3", "6", "9", "12"].includes(termRange.value)) {
    termRange.value = 3;
  }

  updateTerm();
};

termOptionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    termRange.value = button.dataset.term;
    updateTerm();
  });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    updateTermAvailability(button);
  });
});

updateTermAvailability(document.querySelector(".filter-button.is-active"));

const updatePhoneState = () => {
  phoneField.classList.toggle("has-value", phoneInput.value.length > 0);
};

phoneField.addEventListener("click", (event) => {
  if (event.target !== phoneClear) {
    phoneInput.focus();
  }
});

phoneInput.addEventListener("focus", () => {
  phoneField.classList.add("is-active");
});

phoneInput.addEventListener("blur", () => {
  phoneField.classList.remove("is-active");
  updatePhoneState();
});

phoneInput.addEventListener("input", () => {
  const digits = phoneInput.value.replace(/\D/g, "").slice(0, 11);
  const normalized = digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
  const parts = normalized.replace(/^7/, "").match(/^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);

  if (!normalized) {
    phoneInput.value = "";
    updatePhoneState();
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
  updatePhoneState();
});

phoneClear.addEventListener("click", (event) => {
  event.stopPropagation();
  phoneInput.value = "";
  phoneInput.blur();
  phoneField.classList.remove("is-active");
  updatePhoneState();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
});

document.querySelectorAll('input[type="range"]').forEach(updateRangeProgress);
updateAmount();
updateTerm();
updatePhoneState();
amountRange.addEventListener("input", updateAmount);
termRange.addEventListener("input", updateTerm);
