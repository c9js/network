/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
require('core'); // Ядро
const PacketManager = require('../lib/packet-manager'); // Пакетный менеджер

// Создаем пакетный менеджер
const packetManager = new PacketManager({
        iface: 'eth0', // Имя сетевого интерфейса
    masterKey: '1234', // Главный ключ (строка)
});

// Добавляем обработчик получения сообщений
packetManager.on('message', (message) => {
    _=`Получено новое сообщение: ${message.length}`
    _=message
// Сообщаем о получении сообщения
    // this.emit('message', message);
});

// Добавляем новое сообщение в очередь для отправки
packetManager.addMessage('Hello world!');
