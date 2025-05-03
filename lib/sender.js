/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const CryptoBuffer = require('../lib/crypto-buffer'); // Работа с криптобуфером
const { Sender } = require('l2raw'); // Работа с RAW-пакетами на уровне L2

/*▄────────────────────▄
  █                    █
  █  Создает приемник  █
  █                    █
  ▀────────────────────▀*/
module.exports = class {
/*┌──────────────────────────────┐
  │ Очередь для отправки пакетов │
  └──────────────────────────────┘*/
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
        
    // Создаем передатчик
        this.sender = new Sender({
            iface: this.ctx.options.iface, // Имя сетевого интерфейса
        });
        
    // Добавляем обработчик отправки пакетов
        this.sender.on('data', this.data);
    }
    
/*┌──────────────────────────────────────────────────┐
  │ Добавляет новое сообщение в очередь для отправки │
  └──────────────────────────────────────────────────┘*/
    addMessage = (message) => {
    // Создаем список фрагментов
        const fragments = this.cryptoBuffer.createFragments(message);
        _=fragments
    // Добавляем список фрагментов в очередь для отправки
        this.list.push(fragments);
    }
    
/*┌─────────────────────────────┐
  │ Обработчик отправки пакетов │
  └─────────────────────────────┘*/
    data = (packet) => {
    }
};
