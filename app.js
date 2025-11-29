/* ============================
   app.js — объединённый финал (вариант C)
   ============================ */

const textarea = document.getElementById('serial');
const doneBtn = document.getElementById('doneBtn');
const container = document.querySelector('.container');
const mainBlock = document.querySelector('.glass-container.main');

/* ========================
   ПАРАМЕТРЫ ФИКСА ДЛЯ KEYBOARD
   ======================== */
// Сохраняем inline-стили main, чтобы восстановить позже
let mainSavedStyle = null;
let keyboardLocked = false;
let visualPrevHeight = window.innerHeight;
let waitingForViewportRestore = false;

// активный translateY у тебя в CSS — подставь, если другое
const ACTIVE_TRANSLATE_Y = 234; // px — если .container.active .glass-container.main переводит на 234px
const IDLE_TRANSLATE_Y = 45;    // стартовый translateY в CSS

function lockMainToViewport() {
  if (!mainBlock || keyboardLocked) return;

  // Сохраним inline стили один раз
  if (!mainSavedStyle) {
    mainSavedStyle = {
      position: mainBlock.style.position || "",
      left: mainBlock.style.left || "",
      right: mainBlock.style.right || "",
      bottom: mainBlock.style.bottom || "",
      width: mainBlock.style.width || "",
      transition: mainBlock.style.transition || "",
      transform: mainBlock.style.transform || ""
    };
  }

  // делаем фиксированным по вьюпорту — блок будет «прижат» к низу экрана
  mainBlock.style.position = "fixed";
  mainBlock.style.left = "0";
  mainBlock.style.right = "0";
  mainBlock.style.bottom = "0";
  mainBlock.style.width = "100%";

  // Поддержим визуальный сдвиг (если контейнер.active)
  if (container.classList.contains("active")) {
    mainBlock.style.transform = `translateY(${ACTIVE_TRANSLATE_Y}px)`;
  } else {
    mainBlock.style.transform = `translateY(${IDLE_TRANSLATE_Y}px)`;
  }

  // ускорим реакцию — короткий transition, чтобы не было рывков
  mainBlock.style.transition = "transform 0.06s linear";

  keyboardLocked = true;
}

function unlockMainFromViewport() {
  if (!mainBlock || !keyboardLocked) return;

  // восстановим inline-стили, если были
  if (mainSavedStyle) {
    mainBlock.style.position = mainSavedStyle.position;
    mainBlock.style.left = mainSavedStyle.left;
    mainBlock.style.right = mainSavedStyle.right;
    mainBlock.style.bottom = mainSavedStyle.bottom;
    mainBlock.style.width = mainSavedStyle.width;
    mainBlock.style.transition = mainSavedStyle.transition;
    mainBlock.style.transform = mainSavedStyle.transform;
  } else {
    mainBlock.style.position = "";
    mainBlock.style.left = "";
    mainBlock.style.right = "";
    mainBlock.style.bottom = "";
    mainBlock.style.width = "";
    mainBlock.style.transition = "";
    mainBlock.style.transform = "";
  }

  // после небольшого таймаута корректируем прокрутку внутри main
  setTimeout(() => {
    if (mainBlock.scrollTop !== 0) mainBlock.scrollTo({ top: 0, behavior: "smooth" });
  }, 160);

  keyboardLocked = false;
}

/* visualViewport handling (Telegram WebApp) */
if (window.visualViewport) {
  const vv = window.visualViewport;
  vv.addEventListener("resize", () => {
    const nowHeight = vv.height;
    const wasOpen = visualPrevHeight < window.innerHeight - 100; // предыдущее состояние
    const isOpen = nowHeight < window.innerHeight - 100;         // текущая проверка

    visualPrevHeight = nowHeight;

    if (isOpen && !wasOpen) {
      // клавиатура открылась
      lockMainToViewport();
    } else if (!isOpen && wasOpen) {
      // клавиатура закрылась
      // Telegram даёт небольшую задержку — ждём, затем восстанавливаем
      waitingForViewportRestore = false;
      setTimeout(() => {
        unlockMainFromViewport();
      }, 180);
    }
  });
} else {
  // fallback: window.resize
  let lastH = window.innerHeight;
  window.addEventListener("resize", () => {
    const h = window.innerHeight;
    const opened = h < lastH - 100;
    const closed = h > lastH + 100;
    lastH = h;
    if (opened) lockMainToViewport();
    if (closed) setTimeout(unlockMainFromViewport, 180);
  });
}

/* ========================
   HELPERS: прокрутка внутри main и управление top-block
   ======================== */
function ensureVisibleInsideMain(el) {
  const main = mainBlock;
  if (!main || !el) return;

  setTimeout(() => {
    const rect = el.getBoundingClientRect();
    const topSafe = 120;
    const bottomSafe = window.innerHeight - 80;

    if (rect.top < topSafe) {
      main.scrollTop = Math.max(0, main.scrollTop - (topSafe - rect.top) - 10);
    } else if (rect.bottom > bottomSafe) {
      main.scrollTop = main.scrollTop + (rect.bottom - bottomSafe) + 10;
    }

    setTimeout(() => {
      const r2 = el.getBoundingClientRect();
      if (r2.top < topSafe) main.scrollTop = Math.max(0, main.scrollTop - (topSafe - r2.top) - 10);
      if (r2.bottom > bottomSafe) main.scrollTop = main.scrollTop + (r2.bottom - bottomSafe) + 10;
    }, 220);
  }, 80);
}

function restoreMainTransformAfterEditing() {
  // если main был заблокирован — подождём пока Telegram восстановит viewport
  if (keyboardLocked) {
    // попросим unlockMainFromViewport при закрытии клавиатуры (visualViewport listener сделает unlock)
    waitingForViewportRestore = true;
    return;
  }

  // просто прокручиваем содержимое main в начало
  if (mainBlock) {
    setTimeout(() => {
      mainBlock.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  }
}

/* Верхний блок уезжает/приезжает — класс в CSS должен управлять top */
function hideTopBlock() {
  document.querySelector('.glass-container.top')?.classList.add('edit-away');
}
function showTopBlock() {
  document.querySelector('.glass-container.top')?.classList.remove('edit-away');
}

/* ========================
   Telegram init (имя)
   ======================== */
document.addEventListener("DOMContentLoaded", () => {
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    try { tg.ready(); } catch (e) {}
    try { tg.expand(); } catch (e) {}

    const user = tg.initDataUnsafe?.user;
    document.querySelector('.nameUser').textContent =
      user ? user.first_name + (user.last_name ? " " + user.last_name : "") : "Гость";
  } else {
    document.querySelector('.nameUser').textContent = "Гость";
  }
});

/* ========================
   Серийный номер: маска
   ======================== */
textarea.addEventListener('input', () => {
  let value = textarea.value.toUpperCase().replace(/[^A-Z]/g, '');
  if (value.length > 8) value = value.slice(0, 8);
  textarea.value = value.length > 4 ? value.slice(0,4) + "-" + value.slice(4) : value;
});

/* ========================
   Основная логика — после нажатия "Готово"
   ======================== */
doneBtn.addEventListener('click', () => {
  const fullSerial = textarea.value.trim();
  if (!fullSerial || fullSerial.length !== 9) {
    alert("Введите серийный номер формата XXXX-XXXX");
    return;
  }

  // визуальные изменения
  doneBtn.classList.add('hide');
  container.classList.add('active');

  // удалить стартовые элементы
  document.querySelector('.helloText')?.remove();
  document.querySelector('.pepe')?.remove();
  document.querySelector('.textarea-container')?.remove();
  doneBtn.remove();

  const main = mainBlock;

  // GIF
  const img = document.createElement('img');
  img.src = "CounterMenu.gif";
  img.classList.add('jem-image');
  main.appendChild(img);
  setTimeout(() => img.classList.add('show'), 25);

  // данные
  let titleValue = "Моя копилка";
  let balanceValue = 0;
  let previousBalance = 0;

  let tempBalance = null;
  let tempTitle = null;

  let totalPlus = 0;
  let totalMinus = 0;

  /* ---- helper для строк (text + icon) ---- */
  function createRow(textValue, iconSrc, action) {
    const row = document.createElement('div');
    row.classList.add('rowBlock');

    const text = document.createElement('p');
    text.classList.add('rowText');
    text.textContent = textValue;

    const icon = document.createElement('img');
    icon.classList.add('rowIcon');
    icon.src = iconSrc;

    // edit action
    if (action === "edit") {
      icon.addEventListener('click', () => {
        if (row.querySelector('input')) return;

        hideTopBlock();

        const input = document.createElement('input');
        input.type = 'text';
        input.classList.add('editInput');
        input.value = text.textContent;
        input.setAttribute('enterkeyhint', 'done');
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'off');

        text.style.opacity = 0.4;
        row.replaceChild(input, text);
        input.focus();

        ensureVisibleInsideMain(input);

        input.addEventListener('input', () => {
          tempTitle = input.value;
        });

        const finishEdit = () => {
          titleValue = tempTitle ?? input.value ?? titleValue;
          tempTitle = null;
          text.textContent = titleValue;
          row.replaceChild(text, input);
          text.style.opacity = 1;

          // вернуть верхний блок и восстановить main позицию корректно
          showTopBlock();
          if (!keyboardLocked) {
            restoreMainTransformAfterEditing();
          } else {
            waitingForViewportRestore = true;
          }
        };

        input.addEventListener('blur', finishEdit);

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            finishEdit();
            input.blur();
          }
          if (e.key === 'Escape') {
            row.replaceChild(text, input);
            text.style.opacity = 1;
            showTopBlock();
          }
        });
      });
    }

    // showserial action
    if (action === "showserial") {
      icon.addEventListener('click', () => {
        if (text.dataset.shown === "true") {
          text.textContent = fullSerial.slice(0,4) + "-****";
          text.dataset.shown = "false";
        } else {
          text.textContent = fullSerial;
          text.dataset.shown = "true";
        }
      });
    }

    row.appendChild(text);
    row.appendChild(icon);
    main.appendChild(row);
    setTimeout(() => row.classList.add('show'), 20);
    return row;
  }

  // create rows
  createRow(fullSerial.slice(0,4) + "-****", "openeye.png", "showserial");
  createRow(titleValue, "pen.png", "edit");

  // balance display
  const balanceText = document.createElement('p');
  balanceText.classList.add('balance-text');
  balanceText.textContent = balanceValue + ",00₽";
  main.appendChild(balanceText);
  setTimeout(() => balanceText.classList.add('show'), 30);

  // edit balance
  balanceText.addEventListener('click', () => {
    if (main.querySelector('input')) return;

    hideTopBlock();

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.pattern = '[0-9]*';
    input.classList.add('editInput');
    input.value = balanceValue;
    input.setAttribute('enterkeyhint', 'done');

    balanceText.style.opacity = 0.4;
    main.replaceChild(input, balanceText);
    input.focus();

    ensureVisibleInsideMain(input);

    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, '');
      tempBalance = input.value ? Number(input.value) : null;
    });

    const finishBalance = () => {
      const newVal = input.value ? Number(input.value) : balanceValue;
      tempBalance = newVal;

      balanceText.textContent = newVal + ",00₽";
      balanceText.style.opacity = 1;
      main.replaceChild(balanceText, input);

      showTopBlock();
      if (!keyboardLocked) restoreMainTransformAfterEditing();
      else waitingForViewportRestore = true;
    };

    input.addEventListener('blur', finishBalance);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishBalance();
        input.blur();
      }
      if (e.key === 'Escape') {
        main.replaceChild(balanceText, input);
        balanceText.style.opacity = 1;
        showTopBlock();
      }
    });
  });

  // apply button
  const bottomBtn = document.createElement('button');
  bottomBtn.textContent = 'Применить изменения';
  bottomBtn.classList.add('glass-button1');
  container.appendChild(bottomBtn);
  setTimeout(() => bottomBtn.classList.add('show'), 20);

  bottomBtn.addEventListener('click', () => {
    if (tempBalance !== null) {
      const diff = tempBalance - previousBalance;
      balanceValue = tempBalance;
      previousBalance = balanceValue;

      if (diff < 0) totalMinus += Math.abs(diff);
      if (diff > 0) totalPlus += diff;

      document.getElementById('plusmoney').textContent = "+" + totalPlus + "₽";
      document.getElementById('minusmoney').textContent = "-" + totalMinus + "₽";

      // update displayed balance
      const currentBalanceText = main.querySelector('.balance-text');
      if (currentBalanceText) currentBalanceText.textContent = balanceValue + ",00₽";

      tempBalance = null;
    }

    console.log('СОХРАНЕНО', { titleValue, balanceValue, totalPlus, totalMinus });
  });
}); // doneBtn click end
