/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const crypto = require('crypto');
const EventEmitter = require('core/event-emitter/default-options');
const PacketManager = require('./packet-manager'); // Пакетный менеджер

/*▄──────────────────────▄
  █                      █
  █  Создает новую сеть  █
  █                      █
  ▀──────────────────────▀*/
module.exports = class extends EventEmitter.DefaultOptions {
/*┌────────────────────┐
  │ Опции по умолчанию │
  └────────────────────┘*/
    static defaultOptions = {
            iface: 'eth0', // Имя сетевого интерфейса
        masterKey: '1234', // Главный ключ (строка)
    }
    
/*┌─────────────┐
  │ Конструктор │
  └─────────────┘*/
    constructor(options) {
    // Сохраняем опции с учетом значений по умолчанию
        super(options);
        
    // Создаем пакетный менеджер
        this.packetManager = new PacketManager();
        
    // Запускаем подключение к сети
        setTimeout(f=>this.start(), 0);
    }
    
/*┌──────────────────────────────┐
  │ Запускает подключение к сети │
  └──────────────────────────────┘*/
    start=f=>{
    // Создаем случайный приоритет
        this.priority = crypto.randomBytes(2).readUInt16BE();
        
    // Отправляем запрос на подключение к сети
        this.send('connect', this.priority);
        
    // Сообщаем о подключении к сети
        this.emit('connect');
    }
};
