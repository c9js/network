/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const EventEmitter = require('events');
const { Scanner } = require('l2raw'); // Работа с RAW-пакетами на уровне L2

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
        
    // Создаем приемник
        this.scanner = new Scanner({
            iface: options.iface, // Имя сетевого интерфейса
        });
    }
};
