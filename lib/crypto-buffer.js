/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const crypto = require('crypto');
const DefaultOptions = require('core/default-options');

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
        PACKETID_SIZE:   17, // Длина ID-пакета
            HASH_SIZE:   17, // Длина хэш-суммы
          HEADER_SIZE:    2, // Длина заголовка
            DATA_SIZE: 1472, // Длина полезной нагрузки (вычисляется автоматически)
         MESSAGE_SIZE: 1508, // Длина всего сообщения (от 1 до 65535)
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
        
    // Обновляем буферы для следующего пакета
        this.updateNextBuffers();
    }
    
/*┌───────────────────────────────────┐
  │ Определяет структуру полей пакета │
  └───────────────────────────────────┘*/
    definePacketFields = () => {
    // Создаем список полей пакета
        [
            ['PACKETID', this.options.PACKETID_SIZE], // ID-пакета
            [    'HASH',     this.options.HASH_SIZE], // Хэш-сумма
            [  'HEADER',   this.options.HEADER_SIZE], // Заголовок
            [    'DATA',  this.options.MESSAGE_SIZE], // Полезная нагрузка
            [ 'MESSAGE',  this.options.MESSAGE_SIZE], // Всё сообщение (только для MESSAGE.SIZE)
        ]
        
    // Определяем расположение полей в буфере пакета
        .reduce((start, [name, size]) => {
            size = name == 'DATA' ? size - start : size;
            this[name] = {
                START: start,            // Индекс начального байта (включительно)
                  END: start + size - 1, // Индекс конечного байта  (включительно)
                 SIZE: size,             // Длина поля в байтах
            };
            return start + size;
        }, 0);
    }
    
/*┌────────────────────────────────────────┐
  │ Обновляет буферы для следующего пакета │
  └────────────────────────────────────────┘*/
    updateNextBuffers = (aesBuffer) => {
    // Обновляем буфер одноразового ключа
        this.updateKeyBuffer(aesBuffer);
        
    // Обновляем буфер следующего ID-пакета
        this.updatePacketIdBuffer();
        
    // Обновляем список следующих позиций
        this.updatePositions();
    }
    
/*┌────────────────────────────────────┐
  │ Обновляет буфер одноразового ключа │
  └────────────────────────────────────┘*/
    updateKeyBuffer = (aesBuffer) => {
    // Определяем значение по умолчанию для буфера после AES-шифрования
        aesBuffer = aesBuffer || Buffer.alloc(0);
        
    // Обновляем буфер одноразового ключа
        this.keyBuffer = crypto.createHash('sha256')
            .update(this.masterKeyBuffer) // Добавляем буфер главного ключа
            .update(aesBuffer)            // Добавляем буфер после AES-шифрования
            .digest();                    // Получаем готовый дайджест (по умолчанию 32 байта)
    }
    
/*┌──────────────────────────────────────┐
  │ Обновляет буфер следующего ID-пакета │
  └──────────────────────────────────────┘*/
    updatePacketIdBuffer = () => {
    // Определяем длину ID-пакета
        const outputLength = this.PACKETID.SIZE;
        
    // Обновляем буфер следующего ID-пакета
        this.packetIdBuffer = crypto.createHash('shake256', { outputLength })
            .update(this.keyBuffer) // Добавляем буфер одноразового ключа
            .update('packetId')     // Добавляем "соль" для уникальности дайджеста
            .digest();              // Получаем готовый дайджест (по умолчанию 17 байт)
    }
    
/*┌──────────────────────────┐
  │ Обновляет список позиций │
  └──────────────────────────┘*/
    updatePositions = () => {
    // Определяем длину дайджеста по два байта на каждую позицию
        const outputLength = this.MESSAGE.SIZE * 2;
        
    // Создаем дайджест с использованием одноразового ключа и "соли"
        const digestBuffer = crypto.createHash('shake256', { outputLength })
            .update(this.keyBuffer) // Добавляем буфер одноразового ключа
            .update('positions')    // Добавляем "соль" для уникальности дайджеста
            .digest();              // Получаем готовый дайджест (по умолчанию 3016 байт)
        
    // Создаем указатели
        let digestIndex = digestBuffer.length; // Текущий индекс в дайджесте (с конца)
        let positionIndex = this.MESSAGE.SIZE; // Текущая позиция (также индекс для обхода)
        
    // Создаем список начальных позиций [0, 1, 2, ..., MESSAGE.SIZE - 1]
        const positions = new Array(positionIndex);
        for (let i = 0; i < positionIndex; i++) positions[i] = i;
        
    // Перемешиваем позиции, используя данные из дайджеста (вариация алгоритма Фишера-Йейтса)
        while (positionIndex > 0) {
        // Обновляем указатели
            positionIndex--;  // Сдвигаем позицию от конца к началу
            digestIndex -= 2; // Читаем очередные 2 байта из дайджеста
            
        // Получаем индекс для обмена позициями
            const swapIndex = Math.floor(
                (digestBuffer.readUInt16BE(digestIndex) / 65536) * this.MESSAGE.SIZE
            );
            
        // Меняем позиции местами
            [
                positions[positionIndex],
                positions[swapIndex],
            ] = [
                positions[swapIndex],
                positions[positionIndex],
            ];
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
    getPacketBuffer = (messageBuffer) => {
    // Создаем буфер после AES-шифрования
        let aesBuffer;
        
    // Создаем буфер пакета для следующей отправки
        let packetBuffer;
        
    // Обновляем буферы для следующего пакета
        this.updateNextBuffers(aesBuffer);
        _=this;
    // Возвращаем буфер пакета для следующей отправки
        return packetBuffer;
    }
};
