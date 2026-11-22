
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
  
    let expenses = [];
  
    function today() {
      const now = new Date();
      const local = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
      );
  
      return local.toISOString().slice(0, 10);
    }
  
    function money(value) {
      return Math.round(value)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₸";
    }
  
    function parseAmount(raw) {
      const text = String(raw).replace(/\s/g, "");
  
      if (!/^\d+$/.test(text)) {
        return null;
      }
  
      const value = Number(text);
  
      if (
        !Number.isSafeInteger(value) ||
        value <= 0
      ) {
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
      } catch (error) {
        errorBox.textContent =
          "Не удалось сохранить данные в браузере.";
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
            typeof expense.category === "string"
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
  
      expenses.forEach((expense) => {
        if (expense.date.slice(0, 7) === month) {
          monthlyTotal += expense.amount;
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
  
        row.appendChild(
          createText(
            "span",
            money(expense.amount),
            "expense-amount"
          )
        );
  
        list.appendChild(row);
      });
  
      totalBox.textContent = money(monthlyTotal);
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
  
      expenses.unshift({
        id: Date.now() + "-" + Math.random(),
        amount: amount,
        category: categoryInput.value,
        date: dateInput.value,
        comment: commentInput.value.trim()
      });
  
      save();
      render();
  
      amountInput.value = "";
      commentInput.value = "";
      amountInput.focus();
    });
  
    dateInput.value = today();
  
    load();
    render();
  })();
  