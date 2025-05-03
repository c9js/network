/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const crypto = require('crypto');
const DefaultOptions = require('core/default-options');

/*▄───────────────────▄
  █                   █
  █  Список констант  █
  █                   █
  ▀───────────────────▀*/
const IV_SIZE = 16;         // Размер вектора инициализации (16 байт)
const MAX_UINT16 = 0x10000; // Выход за пределы UInt16BE (65536)

/*▄─────────────────────────────────────────────────────────────────▄
  █                                                                 █
  █  Список буферов для обеспечения уникальности каждого дайджеста  █
  █                                                                 █
  ▀─────────────────────────────────────────────────────────────────▀*/
const SALT = {
     PACKETID: Buffer.alloc(1, 0), // Для генерации следующего ID-пакета (1 байт)
    POSITIONS: Buffer.alloc(1, 1), // Для генерации списка позиций (1 байт)
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
          LENGTH_SIZE:    2, // Размер длины фрагмента
        FRAGMENT_SIZE: 1472, // Размер фрагмента (вычисляется автоматически)
          PACKET_SIZE: 1508, // Размер всего пакета (от 20 до 65535)
            masterKey:   '', // Главный ключ (строка)
    }
    
/*┌─────────────┐
  │ Конструктор │
  └─────────────┘*/
    constructor(options) {
    // Сохраняем опции с учетом значений по умолчанию
        super(options);
        
    // Определяем структуру полей пакета
        this.definePacketFields();
        
    // Инициализируем буфер главного ключа
        this.initMasterKeyBuffer();
        
    // Инициализируем начальный буфер хэш-суммы
        this.initHashBuffer();
        
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
            [  'LENGTH',   this.options.LENGTH_SIZE], // Длина фрагмента
            ['FRAGMENT',   this.options.PACKET_SIZE], // Фрагмент
            [  'PACKET',   this.options.PACKET_SIZE], // Весь пакет
        ]
        
    // Определяем расположение полей в буфере пакета
        .reduce((start, [name, size]) => {
            size = name == 'FRAGMENT' ? size - start : size;
            this[name] = {
                START: start,            // Индекс начального байта (включительно)
                  END: start + size - 1, // Индекс конечного байта  (включительно)
                 SIZE: size,             // Размер поля в байтах
            };
            return start + size;
        }, 0);
    }
    
/*┌─────────────────────────────────────┐
  │ Инициализирует буфер главного ключа │
  └─────────────────────────────────────┘*/
    initMasterKeyBuffer = () => {
        this.masterKeyBuffer = crypto.createHash('sha256')
            .update(this.options.masterKey) // Добавляем главный ключ (строка)
            .digest();                      // Получаем готовый дайджест (32 байта)
    }
    
/*┌──────────────────────────────────────────┐
  │ Инициализирует начальный буфер хэш-суммы │
  └──────────────────────────────────────────┘*/
    initHashBuffer = () => {
        this.hashBuffer = Buffer.alloc(0);
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
            .update(this.masterKeyBuffer) // Добавляем буфер главного ключа (32 байта)
            .update(this.hashBuffer)      // Добавляем буфер предыдущей хэш-суммы (17 байт)
            .digest();                    // Получаем готовый дайджест (32 байта)
    }
    
/*┌──────────────────────────────────────┐
  │ Обновляет буфер следующего ID-пакета │
  └──────────────────────────────────────┘*/
    updatePacketIdBuffer = () => {
    // Определяем размер ID-пакета (по умолчанию 17 байт)
        const outputLength = this.PACKETID.SIZE;
        
    // Обновляем буфер следующего ID-пакета
        this.packetIdBuffer = crypto.createHash('shake256', { outputLength })
            .update(this.keyBuffer) // Добавляем буфер одноразового ключа (32 байта)
            .update(SALT.PACKETID)  // Добавляем дополнительный буфер (1 байт)
            .digest();              // Получаем готовый дайджест (по умолчанию 17 байт)
    }
    
/*┌──────────────────────────┐
  │ Обновляет список позиций │
  └──────────────────────────┘*/
    updatePositions = () => {
    // Определяем размер дайджеста по два байта на каждую позицию (по умолчанию 3016 байт)
        const outputLength = this.PACKET.SIZE * 2;
        
    // Создаем дайджест с использованием одноразового ключа и дополнительного буфера
        const digestBuffer = crypto.createHash('shake256', { outputLength })
            .update(this.keyBuffer) // Добавляем буфер одноразового ключа (32 байта)
            .update(SALT.POSITIONS) // Добавляем дополнительный буфер (1 байт)
            .digest();              // Получаем готовый дайджест (по умолчанию 3016 байт)
        
    // Создаем список начальных позиций [0, 1, 2, ..., PACKET.SIZE - 1]
        const positions = new Array(this.PACKET.SIZE);
        for (let i = 0; i < positions.length; i++) positions[i] = i;
        
    // Перемешиваем позиции, используя данные из дайджеста (алгоритм Фишера-Йейтса)
        for (let i = 0; i < positions.length - 1; i++) {
        // Получаем индекс для обмена позициями
            const swapIndex = i + Math.floor(
                (digestBuffer.readUInt16BE(i * 2) / MAX_UINT16) * (positions.length - i)
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
    getPacketBuffer = (hashBuffer, lengthBuffer, fragmentBuffer) => {
    // Создаем буфер пакета для следующей отправки
        let packetBuffer;
        
    // Обновляем буферы для следующего пакета
        this.updateNextBuffers();
        
    // Возвращаем буфер пакета для следующей отправки
        return packetBuffer;
    }
    
/*┌────────────────────────────────────────────────────┐
  │ Возвращает зашифрованный буфер исходного сообщения │
  └────────────────────────────────────────────────────┘*/
    getEncryptedBuffer = (messageBuffer) => {
    // Создаем случайный буфер вектора инициализации (16 байт)
        const ivBuffer = crypto.randomBytes(IV_SIZE);
        
    // Создаем потоковый шифратор с использованием главного ключа и вектора инициализации
        const cipher = crypto.createCipheriv(
                   'aes-256-cbc', // Алгоритм шифрования
            this.masterKeyBuffer, // Буфер главного ключа (32 байта)
                        ivBuffer, // Буфер вектора инициализации (16 байт)
        );
        
    // Создаем зашифрованный буфер исходного сообщения
        const encryptedContentBuffer = Buffer.concat([
            cipher.update(messageBuffer), // Добавляем основную часть
            cipher.final(),               // Добавляем финальный блок + паддинг
        ]);
        
    // Объединяем буфер вектора инициализации и зашифрованный буфер исходного сообщения
        const encryptedBuffer = Buffer.concat([ivBuffer, encryptedContentBuffer]);
        
    // Возвращаем зашифрованный буфер
        return encryptedBuffer;
    }
    
/*┌─────────────────────────────────────────────────────┐
  │ Возвращает расшифрованный буфер исходного сообщения │
  └─────────────────────────────────────────────────────┘*/
    getDecryptedBuffer = (encryptedBuffer) => {
    // Извлекаем буфер вектора инициализации (первые 16 байт)
        const ivBuffer = encryptedBuffer.slice(0, IV_SIZE);
        
    // Извлекаем зашифрованный буфер исходного сообщения
        const encryptedContentBuffer = encryptedBuffer.slice(IV_SIZE);
        
    // Создаем потоковый дешифратор с использованием главного ключа и вектора инициализации
        const decipher = crypto.createDecipheriv(
                   'aes-256-cbc', // Алгоритм шифрования
            this.masterKeyBuffer, // Буфер главного ключа (32 байта)
                        ivBuffer, // Буфер вектора инициализации (16 байт)
        );
        
    // Создаем расшифрованный буфер исходного сообщения
        const messageBuffer = Buffer.concat([
            decipher.update(encryptedContentBuffer), // Добавляем основную часть
            decipher.final(),                        // Добавляем финальный блок и удаляем паддинг
        ]);
        
    // Возвращаем расшифрованный буфер исходного сообщения
        return messageBuffer;
        
    // Получаем расшифрованный буфер исходного сообщения
        // _=this.getDecryptedBuffer(encryptedBuffer).toString();
    }
    
/*┌───────────────────────────┐
  │ Создает список фрагментов │
  └───────────────────────────┘*/
    createFragments = (message) => {
    // Создаем буфер исходного сообщения
        const messageBuffer = Buffer.from(message);
        
    // Получаем зашифрованный буфер исходного сообщения
        const encryptedBuffer = this.getEncryptedBuffer(messageBuffer);
        
    // Создаем список фрагментов
        const fragments = [];
        
    // Проходим по списку фрагментов
        for (let i = 0; i < encryptedBuffer.length; i += this.FRAGMENT.SIZE) {
        // Получаем буфер фрагмента
            const fragmentBuffer = this.getFragmentBuffer(i, encryptedBuffer);
            
        // Получаем буфер длины фрагмента
            const lengthBuffer = this.getLengthBuffer(i, encryptedBuffer.length);
            
        // Получаем буфер хэш-суммы
            const hashBuffer = this.getHashBuffer(lengthBuffer, fragmentBuffer);
            
        // Создаем новый фрагмент
            fragments.push({
                    hash: hashBuffer,     // Хэш-сумма
                  length: lengthBuffer,   // Длина фрагмента
                fragment: fragmentBuffer, // Фрагмент
            });
        }
        
    // Возвращаем список фрагментов
        return fragments;
    }
    
/*┌────────────────────────────┐
  │ Возвращает буфер фрагмента │
  └────────────────────────────┘*/
    getFragmentBuffer = (i, encryptedBuffer) => {
    // Создаем случайный буфер фрагмента
        const fragmentBuffer = crypto.randomBytes(this.FRAGMENT.SIZE);
        
    // Копируем буфер фрагмента
        encryptedBuffer.copy(fragmentBuffer, 0, i, i + this.FRAGMENT.SIZE);
        
    // Возвращаем буфер фрагмента
        return fragmentBuffer;
    }
    
/*┌──────────────────────────────────┐
  │ Возвращает буфер длины фрагмента │
  └──────────────────────────────────┘*/
    getLengthBuffer = (i, length) => {
    // Определяем размер фрагмента
        const fragmentSize = this.FRAGMENT.SIZE;
        
    // Создаем буфер длины фрагмента
        const lengthBuffer = Buffer.allocUnsafe(this.LENGTH.SIZE);
        
    // Сохраняем длину только для последнего фрагмента
        if (i >= length - fragmentSize) {
            lengthBuffer.writeUInt16BE(length - i);
        }
        
    // Генерируем случайную длину для всех фрагментов, кроме последнего
        else {
        // От FRAGMENT.SIZE + 1 до 65536 (включительно)
            const randomLength = crypto.randomInt(MAX_UINT16 - fragmentSize) + fragmentSize + 1;
            
        // Если выпадает 65536, то переводим в 0
            lengthBuffer.writeUInt16BE(randomLength % MAX_UINT16);
        }
        
    // Возвращаем буфер длины фрагмента
        return lengthBuffer;
    }
    
/*┌────────────────────────────┐
  │ Возвращает буфер хэш-суммы │
  └────────────────────────────┘*/
    getHashBuffer = (lengthBuffer, fragmentBuffer) => {
    // Определяем размер хэш-суммы (по умолчанию 17 байт)
        const outputLength = this.HASH.SIZE;
        
    // Возвращаем буфер хэш-суммы
        return crypto.createHash('shake256', { outputLength })
            .update(this.masterKeyBuffer) // Добавляем буфер главного ключа (32 байта)
            .update(lengthBuffer)         // Добавляем буфер длины фрагмента (2 байта)
            .update(fragmentBuffer)       // Добавляем буфер фрагмента
            .digest();                    // Получаем готовый дайджест (по умолчанию 17 байт)
    }
};
