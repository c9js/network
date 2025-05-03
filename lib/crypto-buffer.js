/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const crypto = require('crypto');
const EventEmitter = require('core/event-emitter/default-options');
const BufferCounter = require('../lib/buffer-counter'); // Буферный счетчик

/*▄───────────────────────▄
  █                       █
  █  Создает криптобуфер  █
  █                       █
  ▀───────────────────────▀*/
module.exports = class extends EventEmitter.DefaultOptions {
/*┌────────────────────┐
  │ Опции по умолчанию │
  └────────────────────┘*/
    static defaultOptions = {
        messageSize: 1508, // Длина всего сообщения (от 1 до 65535)
            keySize:   18, // Длина ключа
    }
    
/*┌─────────────┐
  │ Конструктор │
  └─────────────┘*/
    constructor(options) {
    // Сохраняем опции с учетом значений по умолчанию
        super(options);
    }
    
/*┌────────────────────────────────┐
  │ Возвращает позицию в сообщении │
  └────────────────────────────────┘*/
    getKeyPartPosition = (buffer) => {
    // Читаем первые 2 байта буфера и переводим в число от 0 до 65535
        const number = buffer.readUInt16BE(0);
        
    // Устанавливаем максимальное значение для 2 байт плюс 1 (65535 + 1 = 65536)
        const maxValue = 65535 + 1;
        
    // Вычисляем позицию в сообщении
        const position = Math.floor((number / maxValue) * this.options.messageSize);
        
    // Возвращаем позицию
        return position;
    }
    
/*┌─────────────────────────────────────────────────────────┐
  │ Возвращает список позиций и соответствующие части ключа │
  └─────────────────────────────────────────────────────────┘*/
    getKeyParts = (key, count) => {
    // Локальные переменные
        const positions = new Set(); // Коллекция уникальных позиций
        const keyParts = [];         // Список частей ключа
        
    // Создаем буферный счетчик на 2 байта для генерации уникальных хэшей
        const counter = new BufferCounter(2);
        
    // Повторяем генерацию хэшей,
    // пока не соберем все уникальные позиции и соответствующие части ключа
        while (keyParts.length < count) {
        // Генерируем новый хэш с использованием ключа и счетчика
            const hmac = crypto.createHmac('sha512', key); // Создаем HMAC
            hmac.update(counter `++buffer`);               // Увеличиваем счетчик
            const fullBuffer = hmac.digest();              // Получаем хэш-буфер
            
        // Создаем индекс текущей позиции для обхода хэш-буфера
            let i = 0;
            
        // Извлекаем уникальные позиции из хэш-буфера (шаг в 2 байта)
            while (positions.size < count && i + 1 < fullBuffer.length) {
                positions.add(this.getKeyPartPosition(fullBuffer.slice(i, i + 2)));
                i += 2;
            }
            
        // Извлекаем части ключа из оставшегося хэш-буфера (шаг в 1 байт)
            while (keyParts.length < count && i < fullBuffer.length) {
                keyParts.push(fullBuffer.slice(i, i + 1));
                i++;
            }
        }
        
    // Возвращаем список позиций и соответствующие части ключа
        return [...positions].map((position, i) => ({
            position,            // Позиция в сообщении
            keyPart: keyParts[i] // Часть ключа
        }));
    }
};
// Я все сделал, давай следующий метод
// метод создания сообщения
// то есть на входе сообщение
// 1490
// и
// список позиций
// и на выходе буфер
// 1508
// let counter = 0;
// const counterBuffer = Buffer.alloc(2);
// counterBuffer.writeUInt16BE(counter++);
