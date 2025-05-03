/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const crypto = require('crypto');
const EventEmitter = require('core/event-emitter/default-options');
const MessageManager = require('./message-manager'); // Менеджер сообщений
const Scanner = require('./scanner');                // Приемник
const Sender = require('./sender');                  // Передатчик

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
        masterKey: '1234', // Главный ключ
    }
    
/*┌─────────────┐
  │ Конструктор │
  └─────────────┘*/
    constructor(options) {
    // Сохраняем опции с учетом значений по умолчанию
        super(options);
        
    // Создаем приемник
        this.scanner = new Scanner(this.options);
        
    // Создаем передатчик
        this.sender = new Sender(this.options);
        
    // Создаем менеджер сообщений
        this.manager = new MessageManager();
        
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
    
/*┌───────────────────────────┐
  │ Отправляет запросы в сеть │
  └───────────────────────────┘*/
    send = (method, message) => {
    // Создаем новый пакет для следующей отправки
        let packet = this.packet(method, message);
        
    // Обновляем пакет для следующей отправки
        this.sender.updatePacket(packet);
    }
};
