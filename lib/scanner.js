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
    constructor(params = {}) {
    // Вызываем конструктор родителя
        super();
        
    // Создаем приемник
        this.scanner = new Scanner({
            iface: params.iface, // Имя сетевого интерфейса
        });
    }
}
