const textarea = document.getElementById('serial');
const doneBtn = document.getElementById('doneBtn');
const container = document.querySelector('.container');
const mainBlock = document.querySelector('.glass-container.main');




document.addEventListener("DOMContentLoaded", () => {
    // Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand(); // полноэкранно

        // Имя пользователя
        const user = tg.initDataUnsafe?.user;
        document.querySelector('.nameUser').textContent = user 
            ? user.first_name + (user.last_name ? " " + user.last_name : "")
            : "Гость";
    } else {
        document.querySelector('.nameUser').textContent = "Гость";
    }
});


textarea.addEventListener('input', (e) => {
    let value = textarea.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (value.length > 8) value = value.slice(0, 8);

    if (value.length > 4) {
        textarea.value = value.slice(0, 4) + '-' + value.slice(4);
    } else {
        textarea.value = value;
    }
});


doneBtn.addEventListener('click', () => {
    const fullSerial = textarea.value.trim();

    if (!fullSerial) {
        alert("Введите серийный номер");
        return;
    }

    if (fullSerial.length !== 9) {
        alert("Серийный номер должен быть формата XXXX-XXXX");
        return;
    }

    // Прячем кнопку
    setTimeout(() => {
        doneBtn.classList.add('hide');
    }, 10);

    container.classList.add('active');

    // Удаляем стартовые элементы
    document.querySelector('.helloText').remove();
    document.querySelector('.pepe').remove();
    document.querySelector('.textarea-container').remove();
    doneBtn.remove();

    const main = document.querySelector('.glass-container.main');



    const img = document.createElement('img');
    img.src = "CounterMenu.gif";
    img.classList.add('jem-image');
    main.appendChild(img);

    setTimeout(() => img.classList.add('show'), 30);

    let titleValue = "Моя копилка";
    let balanceValue = 0;

    let previousBalance = 0;
    let tempBalance = null;      // <– временное значение (что введено в input)

    let totalPlus = 0;
    let totalMinus = 0;


    function createRow(textValue, imgSrc, action) {
        const row = document.createElement('div');
        row.classList.add('rowBlock');

        const text = document.createElement('p');
        text.textContent = textValue;
        text.classList.add('rowText');

        const icon = document.createElement('img');
        icon.src = imgSrc;
        icon.classList.add('rowIcon');
        icon.dataset.action = action;

        if (action === "edit") {
            icon.addEventListener('click', () => {
                const text = row.querySelector('.rowText');
                if (row.querySelector('input')) return; // уже редактируется

                const input = document.createElement('input');
                input.type = "text";
                input.classList.add('editInput');
                input.value = text.textContent;

                // показываем, что редактируем
                text.style.opacity = 0.5;

                // поднимаем блок main при фокусе
                input.addEventListener('focus', () => {
                    main.style.transform = 'translateY(-70px)';
                });

                const restoreText = () => {
                    titleValue = input.value || titleValue;
                    text.textContent = titleValue;
                    row.replaceChild(text, input);
                    main.style.transform = 'translateY(234px)'; // возвращаем блок
                    text.style.opacity = 1;
                };

                input.addEventListener('blur', restoreText);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        restoreText();
                        input.blur();
                    }
                    if (e.key === 'Escape') row.replaceChild(text, input);
                });

                row.replaceChild(input, text);
                input.focus();
            });
        }

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


    const serialMasked = fullSerial.slice(0, 4) + "-****";
    const serialRow = createRow(serialMasked, "openeye.png", "showserial");
    const nameRow = createRow(titleValue, "pen.png", "edit");


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

    // показываем, что редактируем
    balanceText.style.opacity = 0.5;

    // поднимаем блок при фокусе
    input.addEventListener('focus', () => {
        main.style.transform = 'translateY(-80px)'; // поднимаем на 80px
    });

    // при вводе цифр обновляем временное значение
    input.addEventListener('input', () => {
        input.value = input.value.replace(/[^0-9]/g, '');
        tempBalance = input.value ? Number(input.value) : null;
    });

    // сохраняем значение и возвращаем блок на место
    const restoreBalanceText = () => {
        const newBalance = input.value ? Number(input.value) : balanceValue;
        balanceValue = newBalance;
        balanceText.textContent = newBalance + ",00₽";
        main.replaceChild(balanceText, input);
        main.style.transform = 'translateY(234px)'; // возвращаем блок
        balanceText.style.opacity = 1; // возвращаем нормальный вид
        tempBalance = newBalance;
    };

    input.addEventListener('blur', restoreBalanceText);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            restoreBalanceText();
            input.blur();
        }
        if (e.key === 'Escape') main.replaceChild(balanceText, input);
    });

    main.replaceChild(input, balanceText);
    input.focus();
});


    const bottomBtn = document.createElement('button');
    bottomBtn.textContent = "Применить изменения";
    bottomBtn.classList.add('glass-button1');
    container.appendChild(bottomBtn);

    setTimeout(() => bottomBtn.classList.add('show'), 30);

    bottomBtn.addEventListener('click', () => {


    // ======= Сохранение баланса =======
    if (tempBalance !== null) {
        const newBalance = tempBalance;
        const diff = newBalance - previousBalance;

        balanceValue = newBalance;
        previousBalance = newBalance;

        balanceText.textContent = balanceValue + ",00₽";

        // Накопление пополнений / трат
        if (diff < 0) {
            totalMinus += Math.abs(diff);
        } else if (diff > 0) {
            totalPlus += diff;
        }

        // ======= Обновляем UI =======
        document.getElementById("plusmoney").textContent = "+" + totalPlus + "₽";
        document.getElementById("minusmoney").textContent = "-" + totalMinus + "₽";

        // Сбрасываем временное значение
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

