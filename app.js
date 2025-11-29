/* ============================
   app.js (полностью готовый)
   ============================ */

const textarea = document.getElementById('serial');
const doneBtn = document.getElementById('doneBtn');
const container = document.querySelector('.container');
const mainBlock = document.querySelector('.glass-container.main');

/* =====================================================
   БЛОК 1 — Клавиатура, возврат, видимость инпута
   =====================================================*/

// Определяем открыта ли клавиатура
let keyboardIsOpen = false;

if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
        keyboardIsOpen = window.visualViewport.height < window.innerHeight;
    });
}

// Верхний блок уезжает вверх
function hideTop() {
    document.querySelector(".glass-container.top")?.classList.add("away");
}

// Верхний блок возвращается назад
function showTop() {
    document.querySelector(".glass-container.top")?.classList.remove("away");
}

// Прокрутить, чтобы input был видим
function ensureVisibleInsideMain(el) {
    const main = document.querySelector(".glass-container.main");
    if (!main || !el) return;

    setTimeout(() => {
        const rect = el.getBoundingClientRect();

        const topSafe = 140;  
        const bottomSafe = window.innerHeight - (keyboardIsOpen ? 260 : 80);

        if (rect.top < topSafe) {
            main.scrollTop -= (topSafe - rect.top) + 20;
        } else if (rect.bottom > bottomSafe) {
            main.scrollTop += (rect.bottom - bottomSafe) + 20;
        }

    }, 120);
}

// вернуть всё назад после редактирования
function restorePosition() {
    const main = document.querySelector(".glass-container.main");
    if (!main) return;

    setTimeout(() => {
        main.scrollTo({ top: 0, behavior: "smooth" });
    }, 200);

    showTop();
}

/* =====================================================
   БЛОК 2 — Telegram init
   =====================================================*/

document.addEventListener("DOMContentLoaded", () => {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        try { tg.ready(); } catch(e){}
        try { tg.expand(); } catch(e){}

        const user = tg.initDataUnsafe?.user;
        document.querySelector('.nameUser').textContent =
            user ? (user.first_name + (user.last_name ? " " + user.last_name : "")) : "Гость";
    } else {
        document.querySelector('.nameUser').textContent = "Гость";
    }
});

/* =====================================================
   БЛОК 3 — Маска серийного номера
   =====================================================*/

textarea.addEventListener('input', () => {
    let value = textarea.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    textarea.value = value.length > 4
        ? value.slice(0, 4) + "-" + value.slice(4)
        : value;
});

/* =====================================================
   БЛОК 4 — Кнопка "Готово"
   =====================================================*/

doneBtn.addEventListener('click', () => {
    const fullSerial = textarea.value.trim();

    if (!fullSerial || fullSerial.length !== 9) {
        alert("Введите серийный номер формата XXXX-XXXX");
        return;
    }

    doneBtn.classList.add('hide');
    container.classList.add('active');

    document.querySelector('.helloText')?.remove();
    document.querySelector('.pepe')?.remove();
    document.querySelector('.textarea-container')?.remove();
    doneBtn.remove();

    const main = document.querySelector('.glass-container.main');

    // изображение меню
    const img = document.createElement('img');
    img.src = "CounterMenu.gif";
    img.classList.add('jem-image');
    main.appendChild(img);
    setTimeout(() => img.classList.add('show'), 30);

    // значения
    let titleValue = "Моя копилка";
    let balanceValue = 0;
    let previousBalance = 0;

    let tempBalance = null;
    let tempTitle = null;

    let totalPlus = 0;
    let totalMinus = 0;

    /* ---------------------------------------
       Создание строки с текстом и иконкой
       --------------------------------------- */
    function createRow(textValue, iconSrc, action) {
        const row = document.createElement('div');
        row.classList.add('rowBlock');

        const text = document.createElement('p');
        text.classList.add('rowText');
        text.textContent = textValue;

        const icon = document.createElement('img');
        icon.classList.add('rowIcon');
        icon.src = iconSrc;

        // редактирование имени
        if (action === "edit") {
            icon.addEventListener('click', () => {
                if (row.querySelector('input')) return;

                hideTop();

                const input = document.createElement('input');
                input.type = "text";
                input.classList.add('editInput');
                input.value = text.textContent;
                input.setAttribute("enterkeyhint", "done");

                text.style.opacity = 0.4;
                row.replaceChild(input, text);
                input.focus();

                ensureVisibleInsideMain(input);

                input.addEventListener('input', () => {
                    tempTitle = input.value;
                });

                const finish = () => {
                    titleValue = tempTitle ?? input.value;
                    tempTitle = null;

                    text.textContent = titleValue;
                    row.replaceChild(text, input);
                    text.style.opacity = 1;

                    restorePosition();
                };

                input.addEventListener('blur', finish);

                input.addEventListener('keydown', e => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        finish();
                        input.blur();
                    }
                    if (e.key === "Escape") {
                        row.replaceChild(text, input);
                        text.style.opacity = 1;
                        restorePosition();
                    }
                });
            });
        }

        // показать / скрыть серийник
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

    /* строки */
    const serialRow = createRow(fullSerial.slice(0,4)+"-****", "openeye.png", "showserial");
    const nameRow = createRow("Моя копилка", "pen.png", "edit");

    /* текст баланса */
    const balanceText = document.createElement("p");
    balanceText.classList.add("balance-text");
    balanceText.textContent = balanceValue + ",00₽";
    main.appendChild(balanceText);
    setTimeout(() => balanceText.classList.add('show'), 30);

    /* ---------------------------------------
       Редактирование баланса
       --------------------------------------- */
    balanceText.addEventListener('click', () => {
        if (main.querySelector('input')) return;

        hideTop();

        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "numeric";
        input.pattern = "[0-9]*";
        input.classList.add("editInput");
        input.value = balanceValue;
        input.setAttribute("enterkeyhint", "done");

        balanceText.style.opacity = 0.4;
        main.replaceChild(input, balanceText);
        input.focus();

        ensureVisibleInsideMain(input);

        input.addEventListener("input", () => {
            input.value = input.value.replace(/[^0-9]/g, '');
            tempBalance = Number(input.value || 0);
        });

        const finishBalance = () => {
            const newVal = Number(input.value || balanceValue);
            tempBalance = newVal;

            balanceText.textContent = newVal + ",00₽";
            main.replaceChild(balanceText, input);
            balanceText.style.opacity = 1;

            restorePosition();
        };

        input.addEventListener("blur", finishBalance);

        input.addEventListener("keydown", e => {
            if (e.key === "Enter") {
                e.preventDefault();
                finishBalance();
                input.blur();
            }
            if (e.key === "Escape") {
                main.replaceChild(balanceText, input);
                balanceText.style.opacity = 1;
                restorePosition();
            }
        });
    });

    /* ---------------------------------------
       Кнопка "Применить изменения"
       --------------------------------------- */
    const bottomBtn = document.createElement('button');
    bottomBtn.textContent = "Применить изменения";
    bottomBtn.classList.add('glass-button1');
    container.appendChild(bottomBtn);
    setTimeout(() => bottomBtn.classList.add('show'), 30);

    bottomBtn.addEventListener('click', () => {

        // применяем баланс
        if (tempBalance !== null) {
            const diff = tempBalance - previousBalance;

            balanceValue = tempBalance;
            previousBalance = balanceValue;

            if (diff < 0) totalMinus += Math.abs(diff);
            if (diff > 0) totalPlus += diff;

            document.getElementById('plusmoney').textContent = "+" + totalPlus + "₽";
            document.getElementById('minusmoney').textContent = "-" + totalMinus + "₽";

            balanceText.textContent = balanceValue + ",00₽";

            tempBalance = null;
        }

        console.log("СОХРАНЕНО:", {
            titleValue,
            balanceValue,
            plus: totalPlus,
            minus: totalMinus
        });
    });
});
