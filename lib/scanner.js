/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const CryptoBuffer = require('../lib/crypto-buffer'); // Работа с криптобуфером
const { Scanner } = require('l2raw'); // Работа с RAW-пакетами на уровне L2

/*▄────────────────────▄
  █                    █
  █  Создает приемник  █
  █                    █
  ▀────────────────────▀*/
module.exports = class {
/*┌───────────────────────────────┐
  │ Очередь для получения пакетов │
  └───────────────────────────────┘*/
    list = []
    
/*┌─────────────┐
  │ Конструктор │
  └─────────────┘*/
    constructor(ctx) {
    // Сохраняем родительский контекст
        this.ctx = ctx;
        
    // Создаем криптобуфер
        this.cryptoBuffer = new CryptoBuffer({
            PACKETID_SIZE: this.ctx.PACKETID_SIZE,     // Размер ID-пакета
                HASH_SIZE: this.ctx.HASH_SIZE,         // Размер хэш-суммы
              PACKET_SIZE: this.ctx.PACKET_SIZE,       // Размер всего пакета
                masterKey: this.ctx.options.masterKey, // Главный ключ
        });
        
    // Создаем приемник
        this.scanner = new Scanner({
            iface: this.ctx.options.iface, // Имя сетевого интерфейса
        });
        
    // Добавляем обработчик получения пакетов
        this.scanner.on('data', this.data);
    }
    
/*┌──────────────────────────────┐
  │ Обработчик получения пакетов │
  └──────────────────────────────┘*/
    data = (packet) => {
    }
};
