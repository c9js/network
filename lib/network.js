/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const crypto = require('crypto');
const EventEmitter = require('events');
const Scanner = require('./scanner'); // Приемник
const Sender = require('./sender');   // Передатчик

/*▄──────────────────────▄
  █                      █
  █  Создает новую сеть  █
  █                      █
  ▀──────────────────────▀*/
module.exports = class extends EventEmitter {
/*┌────────────────────────┐
  │ Параметры по умолчанию │
  └────────────────────────┘*/
    params = {
        iface:      'eth0', // Имя сетевого интерфейса
        privateKey: '1234', // Приватный ключ
    }
    
/*┌─────────────┐
  │ Конструктор │
  └─────────────┘*/
    constructor(params = {}) {
    // Вызываем конструктор родителя
        super();
        
    // Сохраняем параметры с учетом значений по умолчанию
        Object.assign(this.params, params);
        
    // Создаем приемник
        this.scanner = new Scanner(this.params);
        
    // Создаем передатчик
        this.sender = new Sender(this.params);
        
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
