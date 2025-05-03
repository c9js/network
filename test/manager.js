/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
require('core'); // Ядро
const MessageManager = require('../lib/message-manager'); // Менеджер сообщений

// Создаем менеджер сообщений
const manager = new MessageManager({
    masterKey: '1234', // Главный ключ
});

// Создаем сообщение
const message = 'Hello world!';

// Получаем готовый пакет для следующей отправки
const packet = manager.getPacket(message);
// _=packet
