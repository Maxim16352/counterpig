let tg = window.Telegram.WebApp;

tg.expand();
const textarea = document.getElementById('serial');
textarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault(); // не вставлять перенос строки
    textarea.blur(); // скрыть клавиатуру (снять фокус)
    console.log('Ввод завершён:', textarea.value);
    // сюда можно добавить действие, например нажатие на кнопку "Готово"
  }
});