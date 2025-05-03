/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const crypto = require('crypto');
const DefaultOptions = require('core/default-options');

/*▄─────────────────────────────────────────────────────────────────▄
  █                                                                 █
  █  Список буферов для обеспечения уникальности каждого дайджеста  █
  █                                                                 █
  ▀─────────────────────────────────────────────────────────────────▀*/
const SALT = {
     PACKETID: Buffer.alloc(1, 0), // Для генерации следующего ID-пакета
    POSITIONS: Buffer.alloc(1, 1), // Для генерации списка позиций
};

/*▄───────────────────────▄
  █                       █
  █  Создает криптобуфер  █
  █                       █
  ▀───────────────────────▀*/
module.exports = class extends DefaultOptions {
/*┌────────────────────┐
  │ Опции по умолчанию │
  └────────────────────┘*/
    static defaultOptions = {
         PACKETID_SIZE:   17, // Размер ID-пакета
             HASH_SIZE:   17, // Размер хэш-суммы
    PAYLOADLENGTH_SIZE:    2, // Размер длины полезной нагрузки
          PAYLOAD_SIZE: 1472, // Размер полезной нагрузки (вычисляется автоматически)
           PACKET_SIZE: 1508, // Размер всего пакета (от 1 до 65535)
             masterKey:   '', // Главный ключ
    }
    
/*┌─────────────┐
  │ Конструктор │
  └─────────────┘*/
    constructor(options) {
    // Сохраняем опции с учетом значений по умолчанию
        super(options);
        
    // Определяем структуру полей пакета
        this.definePacketFields();
        
    // Сохраняем буфер главного ключа
        this.masterKeyBuffer = Buffer.from(this.options.masterKey);
        
    // Создаем начальный буфер хэш-суммы
        this.hashBuffer = Buffer.alloc(0);
        
    // Обновляем буферы для следующего пакета
        this.updateNextBuffers();
    }
    
/*┌───────────────────────────────────┐
  │ Определяет структуру полей пакета │
  └───────────────────────────────────┘*/
    definePacketFields = () => {
    // Создаем список полей пакета
        [
            [     'PACKETID',      this.options.PACKETID_SIZE], // ID-пакета
            [         'HASH',          this.options.HASH_SIZE], // Хэш-сумма
            ['PAYLOADLENGTH', this.options.PAYLOADLENGTH_SIZE], // Длина полезной нагрузки
            [      'PAYLOAD',        this.options.PACKET_SIZE], // Полезная нагрузка
            [       'PACKET',        this.options.PACKET_SIZE], // Весь пакет
        ]
        
    // Определяем расположение полей в буфере пакета
        .reduce((start, [name, size]) => {
            size = name == 'PAYLOAD' ? size - start : size;
            this[name] = {
                START: start,            // Индекс начального байта (включительно)
                  END: start + size - 1, // Индекс конечного байта  (включительно)
                 SIZE: size,             // Размер поля в байтах
            };
            return start + size;
        }, 0);
    }
    
/*┌────────────────────────────────────────┐
  │ Обновляет буферы для следующего пакета │
  └────────────────────────────────────────┘*/
    updateNextBuffers = () => {
    // Обновляем буфер одноразового ключа
        this.updateKeyBuffer();
        
    // Обновляем буфер следующего ID-пакета
        this.updatePacketIdBuffer();
        
    // Обновляем список следующих позиций
        this.updatePositions();
    }
    
/*┌────────────────────────────────────┐
  │ Обновляет буфер одноразового ключа │
  └────────────────────────────────────┘*/
    updateKeyBuffer = () => {
        this.keyBuffer = crypto.createHash('sha256')
            .update(this.masterKeyBuffer) // Добавляем буфер главного ключа
            .update(this.hashBuffer)      // Добавляем буфер предыдущей хэш-суммы
            .digest();                    // Получаем готовый дайджест (по умолчанию 32 байта)
    }
    
/*┌──────────────────────────────────────┐
  │ Обновляет буфер следующего ID-пакета │
  └──────────────────────────────────────┘*/
    updatePacketIdBuffer = () => {
    // Определяем размер ID-пакета
        const outputLength = this.PACKETID.SIZE;
        
    // Обновляем буфер следующего ID-пакета
        this.packetIdBuffer = crypto.createHash('shake256', { outputLength })
            .update(this.keyBuffer) // Добавляем буфер одноразового ключа
            .update(SALT.PACKETID)  // Добавляем дополнительный буфер для уникальности дайджеста
            .digest();              // Получаем готовый дайджест (по умолчанию 17 байт)
    }
    
/*┌──────────────────────────┐
  │ Обновляет список позиций │
  └──────────────────────────┘*/
    updatePositions = () => {
    // Определяем размер дайджеста по два байта на каждую позицию
        const outputLength = this.PACKET.SIZE * 2;
        
    // Создаем дайджест с использованием одноразового ключа и дополнительного буфера
        const digestBuffer = crypto.createHash('shake256', { outputLength })
            .update(this.keyBuffer) // Добавляем буфер одноразового ключа
            .update(SALT.POSITIONS) // Добавляем дополнительный буфер для уникальности дайджеста
            .digest();              // Получаем готовый дайджест (по умолчанию 3016 байт)
        
    // Создаем список начальных позиций [0, 1, 2, ..., PACKET.SIZE - 1]
        const positions = new Array(this.PACKET.SIZE);
        for (let i = 0; i < positions.length; i++) positions[i] = i;
        
    // Перемешиваем позиции, используя данные из дайджеста (алгоритм Фишера-Йейтса)
        for (let i = 0; i < positions.length - 1; i++) {
        // Получаем индекс для обмена позициями
            const swapIndex = i + Math.floor(
                (digestBuffer.readUInt16BE(i * 2) / 65536) * (positions.length - i)
            );
            
        // Меняем позиции местами
            [positions[i], positions[swapIndex]] = [positions[swapIndex], positions[i]];
        }
        
    // Обновляем список позиций
        this.positions = positions;
    }
    
/*┌────────────────────────────┐
  │ Проверяет полученный пакет │
  └────────────────────────────┘*/
    checkPacket = (packetBuffer) => {
    // Проверяем ID-пакета
        if (!this.checkPacketId(packetBuffer)) {
            return false;
        }
    }
    
/*┌─────────────────────┐
  │ Проверяет ID-пакета │
  └─────────────────────┘*/
    checkPacketId = (packetBuffer) => {
    // Проходим по списку позиций
        for (let i = this.PACKETID.START; i <= this.PACKETID.END; i++) {
        // Проверяем текущую позицию
            if (packetBuffer[this.positions[i]] != this.packetIdBuffer[i]) {
                return false;
            }
        }
        
    // Проверка прошла успешно
        return true;
    }
    
/*┌────────────────────────────────────────────────┐
  │ Возвращает буфер пакета для следующей отправки │
  └────────────────────────────────────────────────┘*/
    getPacketBuffer = (hashBuffer, payloadLengthBuffer, payloadBuffer) => {
    // Создаем буфер пакета для следующей отправки
        let packetBuffer;
        
    // Обновляем буферы для следующего пакета
        this.updateNextBuffers();
        // _=this;
        
    // Возвращаем буфер пакета для следующей отправки
        return packetBuffer;
    }
};
