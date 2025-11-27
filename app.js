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

// Форматирование серийного номер
textarea.addEventListener('input', () => {
    let value = textarea.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    textarea.value = value.length > 4 ? value.slice(0, 4) + '-' + value.slice(4) : value;
});

// Нажатие на кнопку "Готово"
doneBtn.addEventListener('click', () => {
    const fullSerial = textarea.value.trim();

    if (!fullSerial) return alert("Введите серийный номер");
    if (fullSerial.length !== 9) return alert("Серийный номер должен быть формата XXXX-XXXX");

    doneBtn.classList.add('hide');
    container.classList.add('active');

    // Удаляем стартовые элементы
    document.querySelector('.helloText')?.remove();
    document.querySelector('.pepe')?.remove();
    document.querySelector('.textarea-container')?.remove();
    doneBtn.remove();

    const img = document.createElement('img');
    img.src = "CounterMenu.gif";
    img.classList.add('jem-image');
    mainBlock.appendChild(img);
    setTimeout(() => img.classList.add('show'), 30);

    let titleValue = "Моя копилка";
    let balanceValue = 0;
    let previousBalance = 0;
    let tempBalance = null;
    let totalPlus = 0;
    let totalMinus = 0;

    // Создание строки с иконкой
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
            makeEditable(row, text, () => titleValue, val => titleValue = val);
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
        mainBlock.appendChild(row);

        setTimeout(() => row.classList.add('show'), 30);
        return row;
    }

    const serialMasked = fullSerial.slice(0, 4) + "-****";
    const serialRow = createRow(serialMasked, "openeye.png", "showserial");
    const nameRow = createRow(titleValue, "pen.png", "edit");

    const balanceText = document.createElement('p');
    balanceText.classList.add('balance-text');
    balanceText.textContent = balanceValue + ",00₽";
    mainBlock.appendChild(balanceText);
    setTimeout(() => balanceText.classList.add('show'), 30);

    // Редактирование баланса
    balanceText.addEventListener('click', () => {
        if (mainBlock.querySelector('input')) return;

        const input = document.createElement('input');
        input.type = "tel";
        input.classList.add('editInput');
        input.value = balanceValue;
        balanceText.style.opacity = 0.5;

        const restore = () => {
            const newBalance = input.value ? Number(input.value) : balanceValue;
            balanceValue = newBalance;
            balanceText.textContent = newBalance + ",00₽";
            mainBlock.replaceChild(balanceText, input);
            balanceText.style.opacity = 1;
            tempBalance = newBalance;
        };

        input.addEventListener('blur', restore);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); restore(); input.blur(); }
            if (e.key === 'Escape') mainBlock.replaceChild(balanceText, input);
        });

        mainBlock.replaceChild(input, balanceText);
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Кнопка сохранения изменений
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

            if (diff < 0) totalMinus += Math.abs(diff);
            else if (diff > 0) totalPlus += diff;

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

// Общая функция для редактирования текста
function makeEditable(row, text, getValue, setValue) {
    row.addEventListener('click', () => {
        if (row.querySelector('input')) return;

        const input = document.createElement('input');
        input.type = "text";
        input.classList.add('editInput');
        input.value = getValue();
        text.style.opacity = 0.5;

        const restore = () => {
            const val = input.value || getValue();
            setValue(val);
            text.textContent = val;
            row.replaceChild(text, input);
            text.style.opacity = 1;
        };

        input.addEventListener('blur', restore);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); restore(); input.blur(); }
            if (e.key === 'Escape') { row.replaceChild(text, input); text.style.opacity = 1; }
        });

        row.replaceChild(input, text);
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

