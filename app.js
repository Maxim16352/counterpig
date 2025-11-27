const textarea = document.getElementById('serial');
const doneBtn = document.getElementById('doneBtn');
const container = document.querySelector('.container');
const mainBlock = document.querySelector('.glass-container.main');

/*------------------------------------------------------------------
  Центрация input (для Telegram WebApp + мобильной клавиатуры)
------------------------------------------------------------------*/
function ensureVisible(el) {
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 500);
}
function restorePosition(el) {
    // Ждём, пока DOM обновится после replaceChild
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
    });
}

/*------------------------------------------------------------------
  TELEGRAM NAME
------------------------------------------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();

        const user = tg.initDataUnsafe?.user;
        document.querySelector('.nameUser').textContent =
            user
                ? user.first_name + (user.last_name ? " " + user.last_name : "")
                : "Гость";
    } else {
        document.querySelector('.nameUser').textContent = "Гость";
    }
});

/*------------------------------------------------------------------
  Маска для серийного номера
------------------------------------------------------------------*/
textarea.addEventListener('input', () => {
    let value = textarea.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (value.length > 8) value = value.slice(0, 8);

    textarea.value =
        value.length > 4 ? value.slice(0, 4) + "-" + value.slice(4) : value;
});


/*------------------------------------------------------------------
  Основа: нажали ГОТОВО
------------------------------------------------------------------*/
doneBtn.addEventListener('click', () => {
    const fullSerial = textarea.value.trim();

    if (!fullSerial || fullSerial.length !== 9) {
        alert("Введите серийный номер формата XXXX-XXXX");
        return;
    }

    doneBtn.classList.add('hide');
    container.classList.add('active');

    // Удаляем стартовые элементы
    document.querySelector('.helloText').remove();
    document.querySelector('.pepe').remove();
    document.querySelector('.textarea-container').remove();
    doneBtn.remove();

    const main = document.querySelector('.glass-container.main');

    /*--------------------------------------------------------------
      Главное GIF
    --------------------------------------------------------------*/
    const img = document.createElement('img');
    img.src = "CounterMenu.gif";
    img.classList.add('jem-image');
    main.appendChild(img);
    setTimeout(() => img.classList.add('show'), 30);

    /*--------------------------------------------------------------
      Значения
    --------------------------------------------------------------*/
    let titleValue = "Моя копилка";
    let balanceValue = 0;
    let previousBalance = 0;

    let tempBalance = null;

    let totalPlus = 0;
    let totalMinus = 0;


    /*--------------------------------------------------------------
      Создание строки (текст + иконка)
    --------------------------------------------------------------*/
    function createRow(textValue, imgSrc, action) {
        const row = document.createElement('div');
        row.classList.add('rowBlock');

        const text = document.createElement('p');
        text.textContent = textValue;
        text.classList.add('rowText');

        const icon = document.createElement('img');
        icon.src = imgSrc;
        icon.classList.add('rowIcon');

        /*------------------ РЕДАКТИРОВАНИЕ НАЗВАНИЯ ------------------*/
        if (action === "edit") {
            icon.addEventListener('click', () => {
                if (row.querySelector('input')) return;

                const input = document.createElement('input');
                input.type = "text";
                input.classList.add('editInput');
                input.value = text.textContent;

                input.setAttribute("enterkeyhint", "done");
                input.setAttribute("autocomplete", "off");
                input.setAttribute("autocorrect", "off");
                input.setAttribute("autocapitalize", "off");

                text.style.opacity = 0.4;

                row.replaceChild(input, text);
                input.focus();
                ensureVisible(input);

                const restoreText = () => {
                    titleValue = input.value || titleValue;
                    text.textContent = titleValue;
                    row.replaceChild(text, input);
                    text.style.opacity = 1;

                    restorePosition(row);
                };

                input.addEventListener('blur', restoreText);

                input.addEventListener('keydown', (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        restoreText();
                        input.blur();
                    }
                    if (e.key === "Escape") {
                        row.replaceChild(text, input);
                        text.style.opacity = 1;
                    }
                });
            });
        }

        /*------------- ПОКАЗАТЬ / СКРЫТЬ СЕРИЙНИК -------------*/
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


    /*--------------------------------------------------------------
      Строки
    --------------------------------------------------------------*/
    createRow(fullSerial.slice(0, 4) + "-****", "openeye.png", "showserial");
    createRow(titleValue, "pen.png", "edit");


    /*--------------------------------------------------------------
      БАЛАНС
    --------------------------------------------------------------*/
    const balanceText = document.createElement('p');
    balanceText.classList.add('balance-text');
    balanceText.textContent = balanceValue + ",00₽";
    main.appendChild(balanceText);
    setTimeout(() => balanceText.classList.add('show'), 30);

    balanceText.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = "text";
        input.inputMode = "numeric";
        input.pattern = "[0-9]*";
        input.classList.add('editInput');
        input.value = balanceValue;

        // Включаем Enter / Done кнопку
        input.setAttribute("enterkeyhint", "done");
        input.setAttribute("autocomplete", "off");
        input.setAttribute("autocorrect", "off");
        input.setAttribute("autocapitalize", "off");

        balanceText.style.opacity = 0.4;

        main.replaceChild(input, balanceText);
        input.focus();
        ensureVisible(input);

        input.addEventListener('input', () => {
            input.value = input.value.replace(/[^0-9]/g, '');
            tempBalance = input.value ? Number(input.value) : null;
        });

        const restoreBalance = () => {
            const newVal = input.value ? Number(input.value) : balanceValue;

            balanceValue = newVal;
            balanceText.textContent = newVal + ",00₽";

            main.replaceChild(balanceText, input);
            balanceText.style.opacity = 1;

            restorePosition(balanceText);
        };

        input.addEventListener('blur', restoreBalance);

        input.addEventListener('keydown', (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                restoreBalance();
                input.blur();
            }
            if (e.key === "Escape") {
                main.replaceChild(balanceText, input);
                balanceText.style.opacity = 1;
            }
        });
    });

    /*--------------------------------------------------------------
      Кнопка "Применить изменения"
    --------------------------------------------------------------*/
    const bottomBtn = document.createElement('button');
    bottomBtn.textContent = "Применить изменения";
    bottomBtn.classList.add('glass-button1');
    container.appendChild(bottomBtn);

    setTimeout(() => bottomBtn.classList.add('show'), 30);

    bottomBtn.addEventListener('click', () => {

        if (tempBalance !== null) {
            const newBalance = tempBalance;
            const diff = newBalance - previousBalance;

            balanceValue = newBalance;
            previousBalance = newBalance;

            balanceText.textContent = balanceValue + ",00₽";

            if (diff < 0) {
                totalMinus += Math.abs(diff);
            } else if (diff > 0) {
                totalPlus += diff;
            }

            document.getElementById("plusmoney").textContent = "+" + totalPlus + "₽";
            document.getElementById("minusmoney").textContent = "-" + totalMinus + "₽";
            tempBalance = null;
        }

        console.log("СОХРАНЕНО:", {
            name: titleValue,
            balance: balanceValue,
            plus: totalPlus,
            minus: totalMinus
        });
    });
});

