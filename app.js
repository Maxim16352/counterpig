/* ============================
   app.js — b12.02.2026 hotFix
   ============================ */

const textarea = document.getElementById('serial');
const doneBtn = document.getElementById('doneBtn');
const container = document.querySelector('.container');
const mainBlock = document.querySelector('.glass-container.main');
const buttonInfo = document.querySelector('.buttonInfo');
const buttonBack = document.getElementById('backbutton');
const buttons = document.querySelectorAll('#doneBtn, #backbutton');
const MQTT_BROKER = "wss://m1.wqtt.ru:18875/mqtt"; 

const MQTT_USERNAME = "u_M8IWA2";
const MQTT_PASSWORD = "Nw7DYR21";

let mqttClient = null;
let currentSerial = null;
let balanceValue = 0;
let previousBalance = 0;
let tempBalance = null;
let totalPlus = 0;
let totalMinus = 0;
let deviceState = {
    serial: null,
    name: "Моя копилка",
    balance: 0,
    deposits: 0,
    expenses: 0,
    battery: 0,
    status: "offline"
};

// ---------- ДОБАВЛЕНО: хранение chat_id ----------
let currentChatId = null;   // будет заполнен из Telegram.WebApp
// -------------------------------------------------

/* -----------------------------------------------------
   КЛАВИАТУРА (visualViewport) — важно для Telegram
-------------------------------------------------------*/
let keyboardIsOpen = false;
let waitingForViewportRestore = false;

if (window.visualViewport) {
    const vv = window.visualViewport;

    vv.addEventListener("resize", () => {
        const keyboardLikelyOpen = vv.height < window.innerHeight - 300 || vv.offsetTop > 0;
        keyboardIsOpen = keyboardLikelyOpen;

        if (!keyboardIsOpen && waitingForViewportRestore) {
            setTimeout(() => {
                restoreMainTransform();
                waitingForViewportRestore = false;
            }, 120);
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

function subscribeDeviceTopics(serial) {
    if (!mqttClient) return;

    deviceState.serial = serial;

    const topics = [
        `devices/${serial}/expenses`,
        `devices/${serial}/deposits`,
        `devices/${serial}/name`,
        `devices/${serial}/battery`,
        `devices/${serial}/balance`,
        `devices/${serial}/status`
    ];

    mqttClient.subscribe(topics, (err) => {
        if (err) console.error("Ошибка подписки на device topics:", err);
    });

    mqttClient.on("message", (topic, message) => {
        const value = message.toString();
        if (topic.endsWith("/name")) {
            deviceState.name = value;
            updateTitle(value);
        }

        if (topic.endsWith("/battery")) {
            deviceState.battery = Number(value);
            updateBattery(value);
        }

        if (topic.endsWith("/status")) {
            deviceState.status = value;
            updateStatus(value);
        }
    });

    mqttClient.on("message", (topic, message) => {
        const value = Number(message.toString());

        if (topic.endsWith("/balance")) {
            deviceState.balance = value;
            // Обновляем DOM только если пользователь не редактирует
            if (tempBalance === null) {
                balanceValue = value;
                previousBalance = value;
                updateBalance(balanceValue);
            }
        }

        if (topic.endsWith("/deposits")) {
            totalPlus = value;
            const plusEl = document.getElementById("plusmoney");
            if (plusEl) plusEl.textContent = "+" + totalPlus + "₽";
        }

        if (topic.endsWith("/expenses")) {
            totalMinus = value;
            const minusEl = document.getElementById("minusmoney");
            if (minusEl) minusEl.textContent = "-" + totalMinus + "₽";
        }
    });
}

function updateTitle(name) {
    const rows = document.querySelectorAll(".rowBlock .rowText");
    if (rows.length >= 2) {
        rows[1].textContent = name;
    }
}

function updateBalance(value) {
    const el = document.querySelector(".balance-text");
    if (el) el.textContent = value + ",00₽";
}

function updateBattery(value) {
    const battery = document.querySelector(".textPercent");
    if (battery) battery.textContent = value + "%";
}

function updateStatus(value) {
    const icon = document.querySelector(".checkconnect");
    if (!icon) return;
    icon.textContent = value === "online" ? "✅" : "❌";
}

/* ВОССТАНОВЛЕНИЕ ПОЗИЦИИ main */
function restoreMainTransform() {
    if (!mainBlock) return;
    mainBlock.style.transform = "";
    const active = document.activeElement;
    if (active) ensureVisibleInsideMain(active);
}

function connectMQTT(serial) {
    return new Promise((resolve, reject) => {
        if (mqttClient) {
            mqttClient.end(true);
            mqttClient = null;
        }

        mqttClient = mqtt.connect(MQTT_BROKER, {
            username: MQTT_USERNAME,
            password: MQTT_PASSWORD,
            reconnectPeriod: 1000,
            connectTimeout: 5000
        });

        const claimTopic = `devices/${serial}/claim`;
        let answered = false;

        mqttClient.on("connect", () => {
            mqttClient.subscribe(claimTopic, err => {
                if (err) {
                    reject("Ошибка подписки на claim");
                }
            });
        });

        const timeout = setTimeout(() => {
            if (!answered) {
                reject("TIMEOUT");
            }
        }, 3000);

        mqttClient.on("message", (topic, message) => {
            if (topic !== claimTopic || answered) return;
            answered = true;
            clearTimeout(timeout);

            const payload = message.toString();

            if (payload.length === 0) {
                reject("SERIAL_NOT_FOUND");
            } else {
                resolve(); // клиент остаётся живым
            }
        });

        mqttClient.on("error", (err) => {
            console.error("MQTT Error:", err.message);
        });
    });
}

/* -----------------------------------------------------
   ДОБАВЛЕНО: управление связкой chat_id ↔ serial
-------------------------------------------------------*/
function storeChatIdSerial(chatId, serial) {
    if (!mqttClient || !chatId || !serial) return;
    // сохраняем серийный номер по chat_id (для автовхода)
    mqttClient.publish(`telegram/chat/${chatId}/serial`, serial, { retain: true });
    // опционально – сохраняем chat_id у устройства (для обратной связи)
    mqttClient.publish(`devices/${serial}/chat_id`, String(chatId), { retain: true });
}

function clearChatIdSerial(chatId, serial) {
    if (!mqttClient || !chatId) return;
    // удаляем запись о chat_id
    mqttClient.publish(`telegram/chat/${chatId}/serial`, '', { retain: true });
    if (serial) {
        mqttClient.publish(`devices/${serial}/chat_id`, '', { retain: true });
    }
}

/* -----------------------------------------------------
   ДОБАВЛЕНО: попытка автоматического входа
   – проверяем, есть ли для текущего chat_id сохранённый serial
-------------------------------------------------------*/
function autoLogin(chatId) {
    return new Promise((resolve) => {
        const tempClient = mqtt.connect(MQTT_BROKER, {
            username: MQTT_USERNAME,
            password: MQTT_PASSWORD,
            reconnectPeriod: -1,  // не переподключаемся
            connectTimeout: 5000
        });

        const topic = `telegram/chat/${chatId}/serial`;
        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) {
                tempClient.end();
                resolve(null);
            }
        }, 3000);

        tempClient.on('connect', () => {
            tempClient.subscribe(topic, (err) => {
                if (err) {
                    clearTimeout(timeout);
                    tempClient.end();
                    resolve(null);
                }
            });
        });

        tempClient.on('message', (t, message) => {
            if (t === topic) {
                const payload = message.toString();
                if (payload) {
                    resolved = true;
                    clearTimeout(timeout);
                    tempClient.end();
                    resolve(payload);
                }
            }
        });

        tempClient.on('error', () => {
            clearTimeout(timeout);
            tempClient.end();
            resolve(null);
        });
    });
}
/* -----------------------------------------------------
   Удержание элемента внутри видимой зоны main
-------------------------------------------------------*/
function ensureVisibleInsideMain(el) {
    if (!mainBlock) return;
    const rect = el.getBoundingClientRect();
    const topSafe = 120;
    const bottomSafe = window.innerHeight - 80;

    if (rect.top < topSafe) mainBlock.scrollTop -= (topSafe - rect.top) + 10;
    if (rect.bottom > bottomSafe) mainBlock.scrollTop += (rect.bottom - bottomSafe) + 10;

    setTimeout(() => {
        const r2 = el.getBoundingClientRect();
        if (r2.top < topSafe) mainBlock.scrollTop -= (topSafe - r2.top) + 10;
        if (r2.bottom > bottomSafe) mainBlock.scrollTop += (r2.bottom - bottomSafe) + 10;
    }, 200);
}

/* -----------------------------------------------------
   Подъём/опускание блока main при редактировании
-------------------------------------------------------*/
function moveMainUp(amount = 220) {
    mainBlock.style.transform = `translateY(-${amount}px)`;
}
function moveMainDown() {
    mainBlock.style.transform = "translateY(0)";
}

/* -----------------------------------------------------
   Верхний блок — скрытие/показ
-------------------------------------------------------*/
function hideTop() {
    document.querySelector('.glass-container.top')?.classList.add('edit-away');
}
function showTop() {
    document.querySelector('.glass-container.top')?.classList.remove('edit-away');
}

function publishDevice(topic, value) {
    if (!mqttClient || !deviceState.serial) return;
    mqttClient.publish(
        `devices/${deviceState.serial}/${topic}`,
        String(value),
        { retain: true }
    );
}

function enterInterface(fullSerial) {
    // ---------- ДОБАВЛЕНО: сохраняем связку chat_id → serial ----------
    if (currentChatId) {
        storeChatIdSerial(currentChatId, fullSerial);
    }
    // ----------------------------------------------------------------

    subscribeDeviceTopics(fullSerial);
    container.classList.remove('back');
    doneBtn.classList.add('hide');
    container.classList.add('active');

    const elements = [
        '.nameProject',
        '.infoProject',
        '.creatorProject',
        '.yearProject',
        '.glass-button'
    ];

    elements.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
            setTimeout(() => el.classList.remove('show'), 20);
            setTimeout(() => el.remove(), 1000);
        }
    });
    document.querySelector('.helloText')?.remove();
    document.querySelector('.pepe')?.remove();
    document.querySelector('.textarea-container')?.remove();

    const main = mainBlock;

    const textPercent = document.createElement('p');
    textPercent.classList.add('textPercent');
    textPercent.textContent = deviceState.battery + '%';
    main.appendChild(textPercent);
    setTimeout(() => textPercent.classList.add('show'), 20);

    /* GIF */
    const img = document.createElement('img');
    img.src = "CounterMenu.gif";
    img.classList.add('jem-image');
    main.appendChild(img);
    setTimeout(() => img.classList.add('show'), 20);

    /* Состояния */
    let titleValue = "Моя копилка";
    let tempTitle = null; // исправлено: была необъявленная переменная

    function createRow(textValue, imgSrc, action) {
        const row = document.createElement('div');
        row.classList.add('rowBlock');

        const text = document.createElement('p');
        text.classList.add('rowText');
        text.textContent = textValue;

        const icon = document.createElement('img');
        icon.classList.add('rowIcon');
        icon.src = imgSrc;

        /* РЕДАКТИРОВАТЬ НАЗВАНИЕ */
        if (action === "edit") {
            icon.addEventListener('click', () => {
                if (row.querySelector('input')) return;

                hideTop();
                const input = document.createElement('input');
                input.classList.add('editInput');
                input.type = "text";
                input.value = text.textContent;
                input.setAttribute("enterkeyhint", "done");
                bottomBtn.style.opacity = "0";
                bottomBtn.style.pointerEvents = "none";
                bottomBtn.style.bottom = "-150px";

                text.style.opacity = 0.4;
                row.replaceChild(input, text);

                input.focus();
                moveMainUp();

                input.addEventListener('input', () => tempTitle = input.value);

                const finishEdit = () => {
                    titleValue = tempTitle ?? input.value;
                    text.textContent = titleValue;

                    row.replaceChild(text, input);
                    text.style.opacity = 1;
                    publishDevice("name", titleValue);
                    showTop();
                    moveMainDown();
                    setTimeout(() => {
                        bottomBtn.style.opacity = "1";
                        bottomBtn.style.pointerEvents = "auto";
                        bottomBtn.style.bottom = "20px";
                    }, 100);
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

    createRow(fullSerial.slice(0, 4) + "-****", "openeye.png", "showserial");
    createRow(titleValue, "pen.png", "edit");

    /* ------------------- БАЛАНС ------------------- */
    const balanceText = document.createElement('p');
    balanceText.classList.add('balance-text');
    balanceText.textContent = balanceValue + ",00₽";
    main.appendChild(balanceText);
    setTimeout(() => balanceText.classList.add('show'), 20);
    const plusEl = document.getElementById("plusmoney");
    if (plusEl) plusEl.textContent = "+" + totalPlus + "₽";

    const minusEl = document.getElementById("minusmoney");
    if (minusEl) minusEl.textContent = "-" + totalMinus + "₽";

    balanceText.addEventListener("click", () => {
        if (main.querySelector("input")) return;

        hideTop();

        const input = document.createElement("input");
        input.classList.add("editInput");
        input.type = "text";
        input.inputMode = "decimal";
        input.setAttribute("enterkeyhint", "done");
        input.value = balanceValue;

        balanceText.style.opacity = 0.4;
        main.replaceChild(input, balanceText);
        input.focus();

        moveMainUp();

        bottomBtn.style.opacity = "0";
        bottomBtn.style.pointerEvents = "none";
        bottomBtn.style.bottom = "-150px";

        let finished = false;

        const finishBalance = () => {
            if (finished) return;
            finished = true;

            const newVal = input.value ? Number(input.value) : balanceValue;

            tempBalance = newVal;
            balanceText.textContent = newVal + ",00₽";
            balanceText.style.opacity = 1;

            if (input.parentNode) main.replaceChild(balanceText, input);

            showTop();
            moveMainDown();

            setTimeout(() => {
                bottomBtn.style.opacity = "1";
                bottomBtn.style.pointerEvents = "auto";
                bottomBtn.style.bottom = "20px";
            }, 100);
        };

        input.addEventListener("blur", finishBalance);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === "." || e.key === ",") {
                e.preventDefault();
                finishBalance();
                input.blur();
            }
        });

        input.addEventListener("input", () => {
            input.value = input.value.replace(/[^0-9]/g, "");
        });
    });

    const bottomBtn = document.createElement("button");
    bottomBtn.textContent = "Применить изменения";
    bottomBtn.classList.add("glass-button1");
    container.appendChild(bottomBtn);
    setTimeout(() => bottomBtn.classList.add("show"), 20);

    bottomBtn.addEventListener("click", () => {
        if (tempBalance !== null) {
            const diff = tempBalance - previousBalance;

            if (diff > 0) totalPlus += diff;
            if (diff < 0) totalMinus += Math.abs(diff);

            previousBalance = tempBalance;
            balanceValue = tempBalance;

            balanceText.textContent = balanceValue + ",00₽";
            document.getElementById("plusmoney").textContent = "+" + totalPlus + "₽";
            document.getElementById("minusmoney").textContent = "-" + totalMinus + "₽";

            publishDevice("balance", balanceValue);
            publishDevice("deposits", totalPlus);
            publishDevice("expenses", totalMinus);

            tempBalance = null;
        }
    });

    // // ---------- ДОБАВЛЕНО: кнопка выхода (очистка данных и перезагрузка) ----------
    // const logoutBtn = document.createElement("button");
    // logoutBtn.textContent = "🚪 Выйти из аккаунта";
    // logoutBtn.classList.add("glass-button2");
    // container.appendChild(logoutBtn);
    // setTimeout(() => logoutBtn.classList.add("show"), 20);

    // logoutBtn.addEventListener("click", () => {
    //     if (currentChatId && mqttClient) {
    //         // Удаляем сохранённые связки
    //         mqttClient.publish(`telegram/chat/${currentChatId}/serial`, '', { retain: true, qos: 1 }, () => {
    //             if (deviceState.serial) {
    //                 mqttClient.publish(`devices/${deviceState.serial}/chat_id`, '', { retain: true, qos: 1 }, () => {
    //                     location.reload();
    //                 });
    //             } else {
    //                 location.reload();
    //             }
    //         });
    //     } else {
    //         location.reload();
    //     }
    // });
    // -------------------------------------------------------------------------
}

/* -----------------------------------------------------
   Telegram init
-------------------------------------------------------*/
document.addEventListener("DOMContentLoaded", async () => {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        try { tg.ready(); } catch {}
        try { tg.expand(); } catch {}

        const user = tg.initDataUnsafe?.user;
        // ---------- ДОБАВЛЕНО: запоминаем chat_id ----------
        currentChatId = user?.id || null;
        // ------------------------------------------------

        const nameElement = document.querySelector('.nameUser');
        if (nameElement) {
            nameElement.textContent = user ? user.first_name + (user.last_name ? " " + user.last_name : "") : "Гость";
        }

        // ---------- ДОБАВЛЕНО: авто-вход ----------
        if (currentChatId) {
            const storedSerial = await autoLogin(currentChatId);
            if (storedSerial) {
                // Форматируем для отображения (если нужно)
                const formattedSerial = storedSerial.length === 8 ? storedSerial.slice(0,4) + "-" + storedSerial.slice(4) : storedSerial;
                textarea.value = formattedSerial;
                try {
                    await connectMQTT(storedSerial);
                    buttonBack.classList.remove('active');
                    enterInterface(storedSerial);
                } catch (err) {
                    // Если не удалось подключиться – остаёмся на экране ввода
                    console.warn("Auto-login failed", err);
                }
            }
        }
        // ------------------------------------------
    }
});

textarea.addEventListener("focus", () => {
    doneBtn.style.bottom = "-50px";
    textarea.classList.remove("input-error");
});
textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        textarea.blur();
        doneBtn.style.bottom = "75px";
    }
});

textarea.addEventListener('input', () => {
    let value = textarea.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    textarea.value = value.length > 4 ? value.slice(0, 4) + "-" + value.slice(4) : value;
});

buttonInfo.addEventListener('click', () => {
    const elements = [
        '.textPercent',
        '.jem-image',
        '.balance-text',
        '.glass-button1',
        '.glass-button2'   // ДОБАВЛЕНО: тоже скрываем при выходе в info
    ];

    elements.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
            setTimeout(() => el.classList.remove('show'), 20);
            setTimeout(() => el.remove(), 1000);
        }
    });

    document.querySelectorAll('.rowBlock').forEach(el => {
        setTimeout(() => el.classList.remove('show'), 20);
        setTimeout(() => el.remove(), 1000);
    });
    container.classList.add('back');
    buttonBack.classList.add('active');

    const main = mainBlock;

    const textProject = document.createElement('p');
    textProject.classList.add('nameProject');
    textProject.textContent = 'SMART COUNTER';
    main.appendChild(textProject);
    setTimeout(() => textProject.classList.add('show'), 20);

    const infoProject = document.createElement('p');
    infoProject.classList.add('infoProject');
    infoProject.textContent = 'Если в меню отображается ✅ , значит,\nсоединение между копилкой и\nсервером успешно установлено\nЕсли в меню отображается ❌, значит,\nсоединение не с копилкой не\nустановлено, проверьте:\n- Подключение копилки к интернету\n- Правильность введенного номера\nкопилки\n- Также рекомендуется перезагрузить\nустройство';
    main.appendChild(infoProject);
    setTimeout(() => infoProject.classList.add('show'), 20);

    const creatorProject = document.createElement('p');
    creatorProject.classList.add('creatorProject');
    creatorProject.textContent = 'Проект создан учеником 10 “И”\nкласса Рабазановым Магомедом';
    main.appendChild(creatorProject);
    setTimeout(() => creatorProject.classList.add('show'), 20);

    const yearProject = document.createElement('p');
    yearProject.classList.add('yearProject');
    yearProject.textContent = '2025 г.';
    main.appendChild(yearProject);
    setTimeout(() => yearProject.classList.add('show'), 20);
});

buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
        const fullSerial = textarea.value.trim();
        if (!fullSerial || fullSerial.length !== 9) {
            alert("Введите серийный номер формата XXXX-XXXX");
            return;
        }
        try {
            await connectMQTT(fullSerial);
            buttonBack.classList.remove('active');
            enterInterface(fullSerial);
        } catch (err) {
            textarea.classList.add("input-error");
        }
    });
});
