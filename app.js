/* ============================
   app.js — обновлённый файл
   ============================ */
const textarea = document.getElementById('serial');
const doneBtn = document.getElementById('doneBtn');
const container = document.querySelector('.container');
const mainBlock = document.querySelector('.glass-container.main');

/* ---------------------------
   Вспомогательные функции
   --------------------------- */
/* плавная видимая прокрутка ВНУТРИ main — НЕ трогает transform основного блока */
function ensureVisibleInsideMain(el) {
    const main = document.querySelector('.glass-container.main');
    if (!main || !el) return;

    // координаты относительно viewport
    const rect = el.getBoundingClientRect();

    // зона видимости: учитываем, что main визуально поднят через transform
    // верхняя видимая граница оставляем ~216px (высота top + отступ)
    const topSafe = 120; // можно подправить, если нужно
    const bottomSafe = window.innerHeight - 80;

    // если элемент выходит за верхнюю границу видимой зоны
    if (rect.top < topSafe) {
        // прокрутка внутри main
        const diff = topSafe - rect.top;
        main.scrollTop = Math.max(0, main.scrollTop - diff - 10);
    }

    // если элемент выходит за нижнюю границу видимой зоны
    if (rect.bottom > bottomSafe) {
        const diff = rect.bottom - bottomSafe;
        main.scrollTop = main.scrollTop + diff + 10;
    }

    // повторяем через небольшую задержку — для Telegram
    setTimeout(() => {
        const rect2 = el.getBoundingClientRect();
        if (rect2.top < topSafe || rect2.bottom > bottomSafe) {
            // коррекция ещё раз
            if (rect2.top < topSafe) main.scrollTop = Math.max(0, main.scrollTop - (topSafe - rect2.top) - 10);
            if (rect2.bottom > bottomSafe) main.scrollTop = main.scrollTop + (rect2.bottom - bottomSafe) + 10;
        }
    }, 220);
}

/* После замены input -> текст корректный возврат */
function restorePosition(el) {
    // двойной RAF для гарантии, что layout применён
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // прокручиваем внутри main
            const main = document.querySelector('.glass-container.main');
            if (!main || !el) return;
            const rect = el.getBoundingClientRect();
            const topSafe = 120;
            const bottomSafe = window.innerHeight - 80;
            if (rect.top < topSafe) {
                main.scrollTop = Math.max(0, main.scrollTop - (topSafe - rect.top) - 10);
            }
            if (rect.bottom > bottomSafe) {
                main.scrollTop = main.scrollTop + (rect.bottom - bottomSafe) + 10;
            }
        });
    });
}

/* Скрыть / показать верхний блок */
function hideTop() {
    const top = document.querySelector('.glass-container.top');
    if (!top) return;
    top.classList.add('away');
}
function showTop() {
    const top = document.querySelector('.glass-container.top');
    if (!top) return;
    top.classList.remove('away');
}

/* ---------------------------
   Telegram init & name
   --------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        try { tg.ready(); } catch (e) {}
        try { tg.expand(); } catch (e) {}

        const user = tg.initDataUnsafe?.user;
        document.querySelector('.nameUser').textContent =
            user ? (user.first_name + (user.last_name ? " " + user.last_name : "")) : "Гость";
    } else {
        document.querySelector('.nameUser').textContent = "Гость";
    }
});

/* ---------------------------
   Маска серийного номера
   --------------------------- */
textarea.addEventListener('input', () => {
    let value = textarea.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    textarea.value = value.length > 4 ? value.slice(0, 4) + "-" + value.slice(4) : value;
});

/* ---------------------------
   Основная логика — кнопка "Готово"
   --------------------------- */
doneBtn.addEventListener('click', () => {
    const fullSerial = textarea.value.trim();
    if (!fullSerial || fullSerial.length !== 9) {
        alert("Введите серийный номер формата XXXX-XXXX");
        return;
    }

    doneBtn.classList.add('hide');
    container.classList.add('active');

    // удаляем стартовый интерфейс
    const hello = document.querySelector('.helloText');
    if (hello) hello.remove();
    const pepe = document.querySelector('.pepe');
    if (pepe) pepe.remove();
    const textareaContainer = document.querySelector('.textarea-container');
    if (textareaContainer) textareaContainer.remove();
    doneBtn.remove();

    const main = document.querySelector('.glass-container.main');

    // gif
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

    /* функция создания строки */
    function createRow(textValue, imgSrc, action) {
        const row = document.createElement('div');
        row.classList.add('rowBlock');

        const text = document.createElement('p');
        text.classList.add('rowText');
        text.textContent = textValue;

        const icon = document.createElement('img');
        icon.classList.add('rowIcon');
        icon.src = imgSrc;

        /* редактирование названия */
        if (action === "edit") {
            icon.addEventListener('click', () => {
                if (row.querySelector('input')) return;

                hideTop(); // уезжает вверх

                const input = document.createElement('input');
                input.type = "text";
                input.classList.add('editInput');
                input.value = text.textContent;

                // подсказки для мобильной клавиатуры
                input.setAttribute('enterkeyhint', 'done');
                input.setAttribute('autocomplete', 'off');
                input.setAttribute('autocorrect', 'off');
                input.setAttribute('autocapitalize', 'off');

                // визуально показываем редактирование
                text.style.opacity = 0.4;
                row.replaceChild(input, text);
                input.focus();

                // прокрутка внутри main так, чтобы input был видим
                ensureVisibleInsideMain(input);

                input.addEventListener('input', () => {
                    tempTitle = input.value;
                });

                const finishEdit = () => {
                    titleValue = tempTitle !== null ? tempTitle : input.value || titleValue;
                    text.textContent = titleValue;
                    tempTitle = null;

                    row.replaceChild(text, input);
                    text.style.opacity = 1;

                    // возвращаем верхний блок и корректно восстанавливаем прокрутку
                    showTop();
                    restorePosition(row);
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
                        showTop();
                    }
                });
            });
        }

        /* показать/скрыть серийник */
        if (action === "showserial") {
            icon.addEventListener('click', () => {
                if (text.dataset.shown === "true") {
                    text.textContent = fullSerial.slice(0, 4) + "-****";
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
        setTimeout(() => row.classList.add('show'), 30);

        return row;
    }

    // создаём строки
    const serialRow = createRow(fullSerial.slice(0, 4) + "-****", "openeye.png", "showserial");
    const nameRow = createRow(titleValue, "pen.png", "edit");

    // баланс (текст)
    const balanceText = document.createElement('p');
    balanceText.classList.add('balance-text');
    balanceText.textContent = balanceValue + ",00₽";
    main.appendChild(balanceText);
    setTimeout(() => balanceText.classList.add('show'), 30);

    // редактирование баланса
    balanceText.addEventListener('click', () => {
        if (main.querySelector('input')) return; // если уже редактируется что-то — не дублируем

        hideTop(); // уезжает верхний блок при редактировании

        const input = document.createElement('input');
        input.type = "text";
        input.inputMode = "numeric";
        input.pattern = "[0-9]*";
        input.classList.add('editInput');
        input.value = balanceValue;

        input.setAttribute('enterkeyhint', 'done');
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'off');

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

            // откладываем применение в tempBalance — окончательно применится при нажатии Применить
            tempBalance = newVal;

            // показываем текст обратно (пока что обновляем визуально)
            balanceText.textContent = newVal + ",00₽";
            main.replaceChild(balanceText, input);
            balanceText.style.opacity = 1;

            // вернуть верхний блок и восстановить прокрутку
            showTop();
            restorePosition(balanceText);
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
                showTop();
            }
        });
    });

    // нижняя кнопка "Применить изменения"
    const bottomBtn = document.createElement('button');
    bottomBtn.textContent = "Применить изменения";
    bottomBtn.classList.add('glass-button1');
    container.appendChild(bottomBtn);
    setTimeout(() => bottomBtn.classList.add('show'), 30);

    bottomBtn.addEventListener('click', () => {
        // применяем tempBalance, собираем diff и накапливаем
        if (tempBalance !== null) {
            const diff = tempBalance - previousBalance;
            balanceValue = tempBalance;
            previousBalance = balanceValue;

            if (diff < 0) totalMinus += Math.abs(diff);
            if (diff > 0) totalPlus += diff;

            document.getElementById('plusmoney').textContent = "+" + totalPlus + "₽";
            document.getElementById('minusmoney').textContent = "-" + totalMinus + "₽";

            // обновляем главный текст баланса
            const currentBalanceText = main.querySelector('.balance-text');
            if (currentBalanceText) currentBalanceText.textContent = balanceValue + ",00₽";

            tempBalance = null;
        }

        // titleValue уже меняется сразу after editing name (we preserved earlier),
        // if you want to delay title commit until Save, adjust above logic accordingly.

        console.log('СОХРАНЕНО', { titleValue, balanceValue, totalPlus, totalMinus });
    });

}); // end doneBtn click
