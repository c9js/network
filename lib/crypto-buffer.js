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
const MAX_UINT16 = 0x10000; // Выход за пределы двух байт в UInt16BE (65536)

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
        
    // Инициализируем начальные буферы
        this.initBuffers();
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
        .reduce((offset, [field, size]) => {
            size = field == 'FRAGMENT' ? size - offset : size;
            this[field] = {
                OFFSET: offset, // Смещение в байтах от начала пакета
                  SIZE: size,   // Размер поля в байтах
            };
            return offset + size;
        }, 0);
    }
    
/*┌─────────────────────────────────┐
  │ Инициализирует начальные буферы │
  └─────────────────────────────────┘*/
    initBuffers = () => {
    // Создаем список начальных буферов для повторной синхронизации
        this.INIT = {
            HASH: Buffer.alloc(this.HASH.SIZE), // Буфер хэш-суммы (по умолчанию 17 байт)
        };
        
        // удалить выше
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        
    // Инициализируем буфер главного ключа
        this.initMasterKeyBuffer();
        
    // Инициализируем начальный буфер хэш-суммы
        this.initHashBuffer();
        
    // Сохраняем начальное состояние для повторной синхронизации
        this.saveInitState();
    }

// this.SYNC = {
//     INIT: { ... },
//     CURRENT: { ... },
//     PENDING: { ... },
// };
// verify*
// lastValidPacketTime

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
        this.updateHashBuffer(this.INIT.HASH); // По умолчанию 17 байт
    }
    
/*┌───────────────────────────────────────────────────────────┐
  │ Сохраняет начальное состояние для повторной синхронизации │
  └───────────────────────────────────────────────────────────┘*/
    saveInitState = () => {
    // Сохраняем начальный ID-пакета
        this.INIT.packetIdBuffer = this.packetIdBuffer;
        
    // Сохраняем начальный список позиций
        this.INIT.positions = this.positions;
    }
    
/*┌─────────────────────────────────────────────────┐
  │ Обновляет буфер хэш-суммы для следующего пакета │
  └─────────────────────────────────────────────────┘*/
    updateHashBuffer = (hashBuffer) => {
    // Обновляем буфер хэш-суммы (по умолчанию 17 байт)
        this.hashBuffer = hashBuffer;
        
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
        
    // Переставляем позиции на основе данных из дайджеста (алгоритм Фишера-Йейтса)
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
    // Проверяем размер пакета
        if (packetBuffer.length != this.PACKET.SIZE) {
            return false;
        }
        
    // Проверяем ID-пакета
        if (!this.checkPacketId(packetBuffer)) {
            return false;
        }
        
    // Проверка прошла успешно
        return true;
    }
    
/*┌─────────────────────┐
  │ Проверяет ID-пакета │
  └─────────────────────┘*/
    checkPacketId = (packetBuffer) => {
    // Проходим по списку позиций
        for (let i = 0; i < this.PACKETID.SIZE; i++) {
        // Получаем текущую позицию
            const position = this.positions[this.PACKETID.OFFSET + i];
            
        // Проверяем текущую позицию
            if (packetBuffer[position] != this.packetIdBuffer[i]) {
                return false;
            }
        }
        
    // Проверка прошла успешно
        return true;
    }
    
/*┌─────────────────────────────────────────────────┐
  │ Проверяет ID-пакета для повторной синхронизации │
  └─────────────────────────────────────────────────┘*/
    checkInitPacketId = (packetBuffer) => {
    // Проходим по списку начальных позиций
        for (let i = 0; i < this.PACKETID.SIZE; i++) {
        // Получаем текущую позицию
            const position = this.INIT.positions[this.PACKETID.OFFSET + i];
            
        // Проверяем текущую позицию
            if (packetBuffer[position] != this.INIT.packetIdBuffer[i]) {
                return false;
            }
        }
        
    // Проверка прошла успешно
        return true;
    }
    
/*┌─────────────────────┐
  │ Проверяет хэш-сумму │
  └─────────────────────┘*/
    checkHash = (packet) => {
    // Получаем буфер хэш-суммы
        const hashBuffer = this.getHashBuffer(packet.LENGTH, packet.FRAGMENT);
        
    // Проверяем хэш-сумму
        if (!hashBuffer.equals(packet.HASH)) {
            return false;
        }
        
    // Проверка прошла успешно
        return true;
    }
    
/*┌──────────────────────────────────────────────────────────┐
  │ Добавляет новый полученный пакет в очередь для получения │
  └──────────────────────────────────────────────────────────┘*/
    addPacket = (list, packetBuffer) => {
    // Проверяем размер пакета
        if (packetBuffer.length != this.PACKET.SIZE) return;
        
    // Проверяем ID-пакета
        if (!this.checkPacketId(packetBuffer)) {
        // Проверяем ID-пакета для повторной синхронизации
            if (!this.checkInitPacketId(packetBuffer)) return;
            
        // Получен пакет для повторной синхронизации
            
        }
        
    // Извлекаем исходный пакет из полученного пакета
        const packet = this.extractPacket(packetBuffer);
        
    // Проверяем хэш-сумму
        if (!this.checkHash(packet)) return;
        
    // Добавляем исходный пакет в очередь для получения
        list.push(packet);
    }
    
/*┌────────────────────────────────────────────────┐
  │ Извлекает исходный пакет из полученного пакета │
  └────────────────────────────────────────────────┘*/
    extractPacket= (packetBuffer) => {
    // Создаем исходный пакет
        const packet = {};
        
    // Создаем список полей исходного пакета
        [
                'HASH', // Хэш-сумма
              'LENGTH', // Длина фрагмента
            'FRAGMENT', // Фрагмент
        ]
        
    // Проходим по списку полей исходного пакета
        .forEach((field) => {
        // Создаем буфер поля исходного пакета
            packet[field] = Buffer.alloc(this[field].SIZE);
            
        // Переставляем байты в исходный порядок
            for (let i = 0; i < this[field].SIZE; i++) {
                packet[field][i] = packetBuffer[this.positions[this[field].OFFSET + i]];
            }
        });
        
    // Возвращаем исходный пакет из полученного пакета
        return packet;
    }
    
/*┌────────────────────────────────────────────────┐
  │ Возвращает буфер пакета для следующей отправки │
  └────────────────────────────────────────────────┘*/
    getPacketBuffer = (packet) => {
    // Создаем случайный буфер пакета (по умолчанию 1508 байт)
        const packetBuffer = crypto.randomBytes(this.PACKET.SIZE);
        
    // Добавляем ID-пакета
        packet.PACKETID = this.packetIdBuffer;
        
    // Создаем список полей пакета для следующей отправки
        [
            'PACKETID', // ID-пакета
                'HASH', // Хэш-сумма
              'LENGTH', // Длина фрагмента
            'FRAGMENT', // Фрагмент
        ]
        
    // Переставляем байты по списку позиций
        .forEach((field) => {
            for (let i = 0; i < this[field].SIZE; i++) {
                packetBuffer[this.positions[this[field].OFFSET + i]] = packet[field][i];
            }
        });
        
    // Обновляем буфер хэш-суммы для следующего пакета
        // this.updateHashBuffer(packet.HASH);
        
    // Возвращаем буфер пакета для следующей отправки
        return packetBuffer;
    }
    
/*┌──────────────────────────────────────────────────┐
  │ Добавляет новое сообщение в очередь для отправки │
  └──────────────────────────────────────────────────┘*/
    addMessage = (list, message) => {
    // Создаем буфер исходного сообщения
        const messageBuffer = Buffer.from(message);
        
    // Получаем зашифрованный буфер исходного сообщения
        const encryptedBuffer = this.getEncryptedBuffer(messageBuffer);
        
    // Создаем список исходных пакетов
        const packets = this.createPackets(encryptedBuffer);
        
    // Добавляем список исходных пакетов в очередь для отправки
        list.push(packets);
    }
    
/*┌─────────────────────────────────┐
  │ Создает список исходных пакетов │
  └─────────────────────────────────┘*/
    createPackets = (encryptedBuffer) => {
    // Создаем список исходных пакетов
        const packets = [];
        
    // Разбиваем зашифрованный буфер на фрагменты по 1472 байта (по умолчанию)
        for (let start = 0; start < encryptedBuffer.length; start += this.FRAGMENT.SIZE) {
        // Создаем исходный пакет
            const packet = this.createPacket(start, encryptedBuffer);
            
        // Добавляем исходный пакет в список исходных пакетов
            packets.push(packet);
        }
        
    // Возвращаем список исходных пакетов
        return packets;
    }
    
/*┌────────────────────────┐
  │ Создает исходный пакет │
  └────────────────────────┘*/
    createPacket = (start, encryptedBuffer) => {
    // Получаем буфер фрагмента
        const fragmentBuffer = this.getFragmentBuffer(start, encryptedBuffer);
        
    // Получаем буфер длины фрагмента
        const lengthBuffer = this.getLengthBuffer(start, encryptedBuffer.length);
        
    // Получаем буфер хэш-суммы
        const hashBuffer = this.getHashBuffer(lengthBuffer, fragmentBuffer);
        
    // Создаем исходный пакет
        const packet = {
                HASH:     hashBuffer, // Хэш-сумма
              LENGTH:   lengthBuffer, // Длина фрагмента
            FRAGMENT: fragmentBuffer, // Фрагмент
        };
        
    // Возвращаем исходный пакет
        return packet;
    }
    
/*┌────────────────────────────┐
  │ Возвращает буфер фрагмента │
  └────────────────────────────┘*/
    getFragmentBuffer = (start, encryptedBuffer) => {
        return encryptedBuffer.slice(start, start + this.FRAGMENT.SIZE);
    }
    
/*┌──────────────────────────────────┐
  │ Возвращает буфер длины фрагмента │
  └──────────────────────────────────┘*/
    getLengthBuffer = (start, encryptedSize) => {
    // Определяем размер фрагмента (по умолчанию 1472 байта)
        const fragmentSize = this.FRAGMENT.SIZE;
        
    // Создаем буфер длины фрагмента (2 байта)
        const lengthBuffer = Buffer.alloc(this.LENGTH.SIZE);
        
    // Сохраняем длину только для последнего фрагмента
        if (start >= encryptedSize - fragmentSize) {
            lengthBuffer.writeUInt16BE(encryptedSize - start);
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
    
/*┌────────────────────────────────────────────────────┐
  │ Возвращает зашифрованный буфер исходного сообщения │
  └────────────────────────────────────────────────────┘*/
    // encrypt
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
    // decrypt
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
    
/*┌──────┐
  │ Тест │
  └──────┘*/
    test = () => {
    // Создаем буфер исходного сообщения
        const messageBuffer = Buffer.from('Hello world!');
        
    // Получаем зашифрованный буфер исходного сообщения
        const encryptedBuffer = this.getEncryptedBuffer(messageBuffer);
        
    // Создаем список исходных пакетов
        const packets = this.createPackets(encryptedBuffer);
        
    // Выводим в консоль
        _=packets[0]
        const packetBuffer = this.getPacketBuffer(packets[0]);
        
        _=packetBuffer
    // Извлекаем исходный пакет из полученного пакета
        const packet = this.extractPacket(packetBuffer);
        
    // Полученный пакет не прошел проверку
        if (!packet) return;
        
    // Выводим в консоль
        _=packet
    }
};
