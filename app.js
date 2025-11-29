/* ============================
   app.js — финальная версия
   ============================ */
const textarea = document.getElementById('serial');
const doneBtn = document.getElementById('doneBtn');
const container = document.querySelector('.container');
const mainBlock = document.querySelector('.glass-container.main');

/* -----------------------------------------------------
   КЛАВИАТУРА (visualViewport) — критически важно для Telegram
-------------------------------------------------------*/
let keyboardIsOpen = false;
let waitingForViewportRestore = false;

if (window.visualViewport) {
    const vv = window.visualViewport;

    /* --- главный триггер Telegram / iOS клавиатуры --- */
    vv.addEventListener("resize", () => {
        const keyboardLikelyOpen =
            vv.height < window.innerHeight - 3000 ||
            vv.offsetTop > 0;

        if (keyboardLikelyOpen) {
            keyboardIsOpen = true;
        } else {
            keyboardIsOpen = false;

            if (waitingForViewportRestore) {
                setTimeout(() => {
                    restoreMainTransform();
                    waitingForViewportRestore = false;
                }, 120);
            }
        }
    });

    vv.addEventListener("scroll", () => {
        if (!keyboardIsOpen && waitingForViewportRestore) {
            setTimeout(() => {
                restoreMainTransform();
                waitingForViewportRestore = false;
            }, 80);
        }
    });
}

/* ВОССТАНОВЛЕНИЕ ПОЗИЦИИ main */
function restoreMainTransform() {
    if (!mainBlock) return;

    mainBlock.style.transform = ""; 

    const active = document.activeElement;
    if (active) ensureVisibleInsideMain(active);
}

/* -----------------------------------------------------
   Визуальное удержание элемента внутри видимой зоны main
-------------------------------------------------------*/
function ensureVisibleInsideMain(el) {
    const main = mainBlock;
    if (!main) return;

    const rect = el.getBoundingClientRect();
    const topSafe = 120;
    const bottomSafe = window.innerHeight - 80;

    if (rect.top < topSafe) {
        main.scrollTop -= (topSafe - rect.top) + 10;
    }
    if (rect.bottom > bottomSafe) {
        main.scrollTop += (rect.bottom - bottomSafe) + 10;
    }

    setTimeout(() => {
        const r2 = el.getBoundingClientRect();
        if (r2.top < topSafe) main.scrollTop -= (topSafe - r2.top) + 10;
        if (r2.bottom > bottomSafe) main.scrollTop += (r2.bottom - bottomSafe) + 10;
    }, 200);
}

/* -----------------------------------------------------
   ВЕРХНИЙ БЛОК — управление его уездом/возвратом
-------------------------------------------------------*/
function hideTop() {
    document.querySelector('.glass-container.top')?.classList.add('edit-away');
}

function showTop() {
    document.querySelector('.glass-container.top')?.classList.remove('edit-away');
}

/* -----------------------------------------------------
   Telegram init
-------------------------------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        try { tg.ready(); } catch {}
        try { tg.expand(); } catch {}

        const user = tg.initDataUnsafe?.user;
        document.querySelector('.nameUser').textContent =
            user ? user.first_name + (user.last_name ? " " + user.last_name : "") : "Гость";
    }
});

textarea.addEventListener("focus", () => {
    doneBtn.style.bottom = "0px";
});
textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        textarea.blur();
        doneBtn.style.bottom = "150px";
    }
});
textarea.addEventListener('input', () => {

    let value = textarea.value.toUpperCase().replace(/[^A-Z]/g, '');
    textarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                textarea.blur();
            }
        });
    if (value.length > 8) value = value.slice(0, 8);
    textarea.value = value.length > 4 ? value.slice(0, 4) + "-" + value.slice(4) : value;
});


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

    const main = mainBlock;

    const img = document.createElement('img');
    img.src = "CounterMenu.gif";
    img.classList.add('jem-image');
    main.appendChild(img);
    setTimeout(() => img.classList.add('show'), 20);

    let titleValue = "Моя копилка";
    let balanceValue = 0;
    let previousBalance = 0;
    let tempBalance = null;
    let tempTitle = null;
    let totalPlus = 0;
    let totalMinus = 0;

    function createRow(textValue, imgSrc, action) {
        const row = document.createElement('div');
        row.classList.add('rowBlock');

        const text = document.createElement('p');
        text.classList.add('rowText');
        text.textContent = textValue;

        const icon = document.createElement('img');
        icon.classList.add('rowIcon');
        icon.src = imgSrc;

        if (action === "edit") {
            icon.addEventListener('click', () => {
                if (row.querySelector('input')) return;

                hideTop();

                const input = document.createElement('input');
                input.classList.add('editInput');
                input.type = "text";
                input.value = text.textContent;
                input.setAttribute("enterkeyhint", "done");

                text.style.opacity = 0.4;
                row.replaceChild(input, text);

                input.focus();
                ensureVisibleInsideMain(input);
                input.addEventListener('input', () => {
                    tempTitle = input.value;
                });
                
                const finishEdit = () => {
                    titleValue = tempTitle ?? input.value;
                    text.textContent = titleValue;

                    row.replaceChild(text, input);
                    text.style.opacity = 1;
                    showTop();

                    setTimeout(() => {
                        if (!keyboardIsOpen) restoreMainTransform();
                    }, 500);

                    if (keyboardIsOpen) waitingForViewportRestore = true;
                };

                input.addEventListener("blur", finishEdit);

                input.addEventListener("keydown", e => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        finishEdit();
                        input.blur();
                    }
                });
            });
        }

        if (action === "showserial") {
            icon.addEventListener("click", () => {
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

        setTimeout(() => row.classList.add('show'), 20);
        return row;
    }

    /* строки */
    createRow(fullSerial.slice(0, 4) + "-****", "openeye.png", "showserial");
    createRow(titleValue, "pen.png", "edit");

    /* ------------------- БАЛАНС ------------------- */
    const balanceText = document.createElement('p');
    balanceText.classList.add('balance-text');
    balanceText.textContent = balanceValue + ",00₽";
    main.appendChild(balanceText);
    setTimeout(() => balanceText.classList.add('show'), 20);

    balanceText.addEventListener("click", () => {
        if (main.querySelector("input")) return;

        hideTop();

        const input = document.createElement("input");
        input.classList.add("editInput");
        input.type = "text";
        input.inputMode = "numeric";
        input.pattern = "[0-9]*";
        input.setAttribute("enterkeyhint", "done");
        input.value = balanceValue;

        input.setAttribute("enterkeyhint", "done");

        balanceText.style.opacity = 0.4;
        main.replaceChild(input, balanceText);
        input.focus();

        ensureVisibleInsideMain(input);

        input.addEventListener("input", () => {
            input.value = input.value.replace(/[^0-9]/g, "");
            tempBalance = input.value ? Number(input.value) : null;
        });

        const finishBalance = () => {
            const newVal = input.value ? Number(input.value) : balanceValue;
            tempBalance = newVal;

            balanceText.textContent = newVal + ",00₽";
            balanceText.style.opacity = 1;

            main.replaceChild(balanceText, input);
            showTop();

            setTimeout(() => {
                if (!keyboardIsOpen) restoreMainTransform();
            }, 50);

            if (keyboardIsOpen) waitingForViewportRestore = true;
        };

        input.addEventListener("blur", finishBalance);

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                finishBalance();
                input.blur();
            }
        });
    });

    /* ------------------- Кнопка "Применить изменения" ------------------- */
    const bottomBtn = document.createElement("button");
    bottomBtn.textContent = "Применить изменения";
    bottomBtn.classList.add("glass-button1");
    container.appendChild(bottomBtn);
    setTimeout(() => bottomBtn.classList.add("show"), 20);

    bottomBtn.addEventListener("click", () => {
        if (tempBalance !== null) {
            const diff = tempBalance - previousBalance;
            balanceValue = tempBalance;
            previousBalance = balanceValue;

            if (diff < 0) totalMinus += Math.abs(diff);
            if (diff > 0) totalPlus += diff;

            document.getElementById("plusmoney").textContent = "+" + totalPlus + "₽";
            document.getElementById("minusmoney").textContent = "-" + totalMinus + "₽";

            balanceText.textContent = balanceValue + ",00₽";

            tempBalance = null;
        }
    });
});
