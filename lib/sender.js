/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const EventEmitter = require('events');
const { Sender } = require('l2raw'); // Работа с RAW-пакетами на уровне L2

/*▄────────────────────▄
  █                    █
  █  Создает приемник  █
  █                    █
  ▀────────────────────▀*/
module.exports = class extends EventEmitter {
/*┌─────────────┐
  │ Конструктор │
  └─────────────┘*/
    constructor(options = {}) {
    // Вызываем конструктор родителя
        super();
        
    // Создаем передатчик
        this.sender = new Sender({
            iface: options.iface, // Имя сетевого интерфейса
        });
    }
};
