/*────────────────────────────────────────────────────────────────────────────────────────────────*/

Object.defineProperties(global,{__:{set:v=>process.exit(_=v)},_:{set:console.log}});
Object.defineProperty(global, '$', {value:{}});

/*────────────────────────────────────────────────────────────────────────────────────────────────*/
/*▄───────────────▄
  █               █
  █  Криптобуфер  █
  █               █
  ▀───────────────▀*/
let CryptoBuffer = new class {
/*┌──────────────────────────────────────────┐
  │ Возвращает список из равных часте буфера │
  └──────────────────────────────────────────┘*/
    getBufferParts = (buffer, totalParts = 18) => {
    // Создаем список из равных часте буфера
        const bufferParts = [];
        
        const baseSize = Math.floor(buffer.length / totalParts);
        const extra = buffer.length % totalParts;
        
        let offset = 0;
        
    // Проходим по списку из равных часте буфера
        for (let i = 0; i < totalParts; i++) {
            const size = i < extra ? baseSize + 1 : baseSize;
            bufferParts.push(buffer.slice(offset, offset + size));
            offset += size;
        }
        
    // Возвращаем список из равных часте буфера
        return bufferParts;
    }
    
/*┌───────────────────────────┐
  │ Возвращает список позиций │
  └───────────────────────────┘*/
    getPositions = (totalItems, positions) => {
    // Создаем список позиций
        let result = new Array(positions).fill(0);
        
    // Комментарий 1
        let fraction = 0;
        
    // Комментарий 2
        const step = totalItems / positions;
        
        for (let i = 0; i < totalItems; i++) {
        // Вычисляем позицию
            let pos = Math.floor(fraction);
            
        // Добавляем защиту от выхода за пределы
            pos = Math.min(pos, positions - 1);
            
        // Сохраняем позицию
            result[i] = pos;
            
        // Комментарий 3
            fraction += 1 / step;
        }
        
    // Возвращаем список позиций
        return result;
    }
};
// Разбиваем буфер на 18 равных частей
// let bufferParts = CryptoBuffer.getBufferParts(Buffer.alloc(1508), 18);

// _=bufferParts.map(p => p.length)
// _=bufferParts.length

// _=CryptoBuffer.getPositions(256, 83)



let number = 1529;
let bufferSize = 1508 - 1;
let maxNumber = parseInt('ff', 16) * 6; // 1530

let position = Math.floor((number / maxNumber) * bufferSize);
_=position


const counts = new Array(bufferSize).fill(0);

for (let number = 0; number < maxNumber; number++) {
    const pos = Math.floor((number / maxNumber) * bufferSize);
    counts[pos]++;
}

for (let i = 0; i < bufferSize; i++) {
    counts[i] != 1 && console.log(`Позиция ${i}: ${counts[i]}`);
}

// _=counts.length

