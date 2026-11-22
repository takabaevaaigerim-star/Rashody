
(function () {
  "use strict";

  const form = document.getElementById("expense-form");
  const amountInput = document.getElementById("amount");
  const categoryInput = document.getElementById("category");
  const dateInput = document.getElementById("date");
  const commentInput = document.getElementById("comment");
  const errorBox = document.getElementById("error");

  const list = document.getElementById("expense-list");
  const totalBox = document.getElementById("monthly-total");
  const emptyMessage = document.getElementById("empty-message");

  const STORAGE_KEY = "rashody-expenses-v1";

  const categories = {
    "Еда": "total-food",
    "Транспорт": "total-transport",
    "Дом": "total-home",
    "Другое": "total-other"
  };

  let expenses = [];

  function today() {
    const now = new Date();
    const local = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    );
    return local.toISOString().slice(0, 10);
  }

  function money(value) {
    const safe = Number.isFinite(value) ? value : 0;

    return Math.round(safe)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₸";
  }

  function parseAmount(raw) {
    const text = String(raw).replace(/\s/g, "");

    if (!/^\d+$/.test(text)) {
      return null;
    }

    const value = Number(text);

    if (!Number.isSafeInteger(value) || value <= 0) {
      return null;
    }

    return value;
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(expenses)
      );
      return true;
    } catch (error) {
      errorBox.textContent =
        "Не удалось сохранить данные в браузере.";
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
  }

  function createText(tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;

    if (className) {
      element.className = className;
    }

    return element;
  }

  function render() {
    list.replaceChildren();

    const month = today().slice(0, 7);
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

      row.appendChild(info);

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

      deleteButton.addEventListener("click", function () {
        const confirmed = window.confirm(
          "Удалить эту трату на " +
          money(expense.amount) + "?"
        );

        if (!confirmed) return;

        const index = expenses.findIndex(
          (item) => item.id === expense.id
        );

        if (index === -1) return;

        const previous = expenses.slice();
        expenses.splice(index, 1);

        if (save()) {
          errorBox.textContent = "";
          render();
        } else {
          expenses = previous;
          render();
        }
      });

      right.appendChild(deleteButton);
      row.appendChild(right);
      list.appendChild(row);
    });

    totalBox.textContent = money(monthlyTotal);

    Object.keys(categories).forEach((category) => {
      const elementId = categories[category];

      document.getElementById(elementId).textContent =
        money(categoryTotals[category]);
    });

    emptyMessage.hidden = expenses.length > 0;
  }

  form.addEventListener("submit", function (event) {
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

    errorBox.textContent = "";

    const previous = expenses.slice();

    expenses.unshift({
      id: Date.now() + "-" + Math.random(),
      amount: amount,
      category: categoryInput.value,
      date: dateInput.value,
      comment: commentInput.value.trim()
    });

    if (!save()) {
      expenses = previous;
      return;
    }

    render();

    amountInput.value = "";
    commentInput.value = "";
    amountInput.focus();
  });

  dateInput.value = today();

  load();
  render();
})();
