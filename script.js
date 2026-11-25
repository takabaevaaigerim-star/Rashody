
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const form = $("expense-form");
  const amountInput = $("amount");
  const categoryInput = $("category");
  const dateInput = $("date");
  const commentInput = $("comment");
  const errorBox = $("error");
  const list = $("expense-list");
  const totalBox = $("monthly-total");
  const emptyMessage = $("empty-message");

  const budgetForm = $("budget-form");
  const budgetInput = $("budget-input");

  const categoryLimitForm = $("category-limit-form");
  const categoryLimitError = $("category-limit-error");

  const STORAGE_KEY = "rashody-expenses-v1";
  const BUDGET_KEY = "rashody-monthly-budgets-v1";
  const CATEGORY_LIMIT_KEY = "rashody-category-limits-v1";

  const categories = {
    "Еда": "total-food",
    "Транспорт": "total-transport",
    "Дом": "total-home",
    "Другое": "total-other"
  };

  const categoryLimitFields = {
    "Еда": "limit-food",
    "Транспорт": "limit-transport",
    "Дом": "limit-home",
    "Другое": "limit-other"
  };

  let expenses = [];
  let budgets = {};
  let categoryLimits = {};

  function today() {
    const now = new Date();
    const local = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    );
    return local.toISOString().slice(0, 10);
  }

  function currentMonth() {
    return today().slice(0, 7);
  }

  function money(value) {
    const safe = Number.isFinite(value) ? value : 0;
    return Math.round(safe)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₸";
  }

  function parseAmount(raw) {
    const text = String(raw).replace(/\s/g, "");
    if (!/^\d+$/.test(text)) return null;

    const value = Number(text);
    if (!Number.isSafeInteger(value) || value <= 0) {
      return null;
    }
    return value;
  }

  function saveExpenses(nextExpenses) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nextExpenses)
      );
      expenses = nextExpenses;
      return true;
    } catch (error) {
      errorBox.textContent =
        "Не удалось сохранить расходы в браузере.";
      return false;
    }
  }

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      if (Array.isArray(saved)) {
        expenses = saved.filter((expense) =>
          expense &&
          Number.isSafeInteger(expense.amount) &&
          expense.amount > 0 &&
          typeof expense.date === "string" &&
          Object.prototype.hasOwnProperty.call(
            categories, expense.category
          )
        );
      }
    } catch (error) {
      expenses = [];
    }

    try {
      const savedBudgets = JSON.parse(
        localStorage.getItem(BUDGET_KEY) || "{}"
      );

      if (
        savedBudgets &&
        typeof savedBudgets === "object" &&
        !Array.isArray(savedBudgets)
      ) {
        budgets = savedBudgets;
      }
    } catch (error) {
      budgets = {};
    }

    try {
      const savedLimits = JSON.parse(
        localStorage.getItem(CATEGORY_LIMIT_KEY) || "{}"
      );

      if (
        savedLimits &&
        typeof savedLimits === "object" &&
        !Array.isArray(savedLimits)
      ) {
        categoryLimits = savedLimits;
      }
    } catch (error) {
      categoryLimits = {};
    }
  }

  function createText(tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  // Шаг 1: загружаем лимиты текущего месяца в поля.
  function renderCategoryLimits() {
    if (!categoryLimitForm) return;

    const limits = categoryLimits[currentMonth()] || {};

    Object.keys(categoryLimitFields).forEach((category) => {
      const field = $(categoryLimitFields[category]);
      const value = limits[category];

      field.value =
        Number.isSafeInteger(value) && value > 0
          ? String(value)
          : "";
    });
  }

  function renderBudget(monthlyTotal) {
    const month = currentMonth();
    const budget = budgets[month];

    if (
      !Number.isSafeInteger(budget) ||
      budget <= 0
    ) {
      $("budget-result").hidden = true;
      return;
    }

    $("budget-result").hidden = false;
    budgetInput.value = String(budget);

    const remaining = budget - monthlyTotal;
    const percentage = monthlyTotal / budget * 100;
    const displayPercent = Math.round(percentage);
    const overBudget = remaining < 0;

    $("budget-total").textContent = money(budget);
    $("budget-spent").textContent = money(monthlyTotal);

    $("remaining-label").textContent =
      overBudget ? "Превышение бюджета" : "Осталось";

    $("budget-remaining").textContent =
      money(Math.abs(remaining));

    $("budget-remaining").classList.toggle(
      "over-budget", overBudget
    );

    $("progress-fill").classList.toggle(
      "over-budget", overBudget
    );

    $("progress-fill").style.width =
      Math.min(100, Math.max(0, percentage)) + "%";

    $("budget-progress").setAttribute(
      "aria-valuenow",
      String(Math.min(100, Math.max(0, displayPercent)))
    );

    $("budget-percent").textContent =
      displayPercent + "% бюджета использовано";
  }

  function render() {
    list.replaceChildren();

    const month = currentMonth();
    let monthlyTotal = 0;

    const categoryTotals = {
      "Еда": 0,
      "Транспорт": 0,
      "Дом": 0,
      "Другое": 0
    };

    expenses.forEach((expense) => {
      if (expense.date.slice(0, 7) === month) {
        monthlyTotal += expense.amount;
        categoryTotals[expense.category] += expense.amount;
      }

      const row = document.createElement("div");
      row.className = "expense";

      const info = document.createElement("div");
      info.className = "expense-info";

      info.appendChild(
        createText("strong", expense.category)
      );

      info.appendChild(
        createText(
          "small",
          expense.date +
          (expense.comment ? " · " + expense.comment : "")
        )
      );

      const right = document.createElement("div");
      right.className = "expense-right";

      right.appendChild(
        createText(
          "span",
          money(expense.amount),
          "expense-amount"
        )
      );

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-button";
      deleteButton.textContent = "Удалить";

      deleteButton.setAttribute(
        "aria-label",
        "Удалить трату " +
        expense.category + " на " + money(expense.amount)
      );

      deleteButton.addEventListener("click", () => {
        if (!window.confirm(
          "Удалить эту трату на " +
          money(expense.amount) + "?"
        )) return;

        const nextExpenses = expenses.filter(
          (item) => item.id !== expense.id
        );

        if (saveExpenses(nextExpenses)) {
          errorBox.textContent = "";
          render();
        }
      });

      right.appendChild(deleteButton);
      row.appendChild(info);
      row.appendChild(right);
      list.appendChild(row);
    });

    totalBox.textContent = money(monthlyTotal);

    Object.keys(categories).forEach((category) => {
      $(categories[category]).textContent =
        money(categoryTotals[category]);
    });

    emptyMessage.hidden = expenses.length > 0;
    renderBudget(monthlyTotal);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const amount = parseAmount(amountInput.value);

    if (amountInput.value.trim() === "") {
      errorBox.textContent = "Введите сумму";
      return;
    }

    if (amount === null) {
      errorBox.textContent =
        "Введите положительную сумму в целых тенге";
      return;
    }

    if (!dateInput.value) {
      errorBox.textContent = "Выберите дату";
      return;
    }

    const nextExpenses = [
      {
        id: Date.now() + "-" + Math.random(),
        amount,
        category: categoryInput.value,
        date: dateInput.value,
        comment: commentInput.value.trim()
      },
      ...expenses
    ];

    if (!saveExpenses(nextExpenses)) return;

    errorBox.textContent = "";
    render();
    amountInput.value = "";
    commentInput.value = "";
    amountInput.focus();
  });

  budgetForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const amount = parseAmount(budgetInput.value);

    if (amount === null) {
      $("budget-error").textContent =
        "Введите положительный бюджет в целых тенге";
      return;
    }

    const nextBudgets = {
      ...budgets,
      [currentMonth()]: amount
    };

    try {
      localStorage.setItem(
        BUDGET_KEY,
        JSON.stringify(nextBudgets)
      );

      budgets = nextBudgets;
      $("budget-error").textContent = "";
      render();
    } catch (error) {
      $("budget-error").textContent =
        "Не удалось сохранить бюджет.";
    }
  });

  // Шаг 1: сохраняем лимиты категорий.
  if (categoryLimitForm) {
    categoryLimitForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const nextLimits = {};
      const currentLimits =
        categoryLimits[currentMonth()] || {};

      Object.keys(categoryLimitFields).forEach((category) => {
        const raw = $(categoryLimitFields[category]).value.trim();

        if (raw === "") {
          if (Number.isSafeInteger(currentLimits[category])) {
            nextLimits[category] = currentLimits[category];
          }
          return;
        }

        const value = parseAmount(raw);

        if (value !== null) {
          nextLimits[category] = value;
        }
      });

      // Не сохраняем 0, отрицательные и неверные значения.
      for (const category of Object.keys(categoryLimitFields)) {
        const raw = $(categoryLimitFields[category]).value.trim();

        if (raw !== "" && parseAmount(raw) === null) {
          categoryLimitError.textContent =
            "Лимит должен быть положительным целым числом.";
          return;
        }
      }

      const nextCategoryLimits = {
        ...categoryLimits,
        [currentMonth()]: nextLimits
      };

      try {
        localStorage.setItem(
          CATEGORY_LIMIT_KEY,
          JSON.stringify(nextCategoryLimits)
        );

        categoryLimits = nextCategoryLimits;
        categoryLimitError.textContent = "";
        renderCategoryLimits();
      } catch (error) {
        categoryLimitError.textContent =
          "Не удалось сохранить лимиты.";
      }
    });
  }

  dateInput.value = today();
  load();
  renderCategoryLimits();
  render();
})();
