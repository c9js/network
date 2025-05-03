/*────────────────────────────────────────────────────────────────────────────────────────────────*/

Object.defineProperties(global,{__:{set:v=>process.exit(_=v)},_:{set:console.log}});
Object.defineProperty(global, '$', {value:{}});

/*────────────────────────────────────────────────────────────────────────────────────────────────*/

const crypto = require('crypto');

const bufSize = 10_000_000; // 10 MB
const buf1 = crypto.randomBytes(bufSize);
const buf2 = Buffer.from(buf1); // идентичный
const buf3 = crypto.randomBytes(bufSize); // отличающийся

function benchmark(label, fn, repeats = 3) {
    const times = [];
    for (let i = 0; i < repeats; i++) {
        const start = process.hrtime.bigint();
        fn();
        const end = process.hrtime.bigint();
        times.push(Number(end - start) / 1e6); // миллисекунды
    }
    const avg = times.reduce((a,b)=>a+b)/times.length;
    console.log(`${label.padEnd(25)} ${avg.toFixed(3)} ms`);
}

// 1. Buffer.equals
benchmark('Buffer.equals (same)', () => buf1.equals(buf2));
benchmark('Buffer.equals (diff)', () => buf1.equals(buf3));

// 2. crypto.timingSafeEqual
benchmark('timingSafeEqual (same)', () => crypto.timingSafeEqual(buf1, buf2));
benchmark('timingSafeEqual (diff)', () => {
    if (buf1.length === buf3.length) crypto.timingSafeEqual(buf1, buf3);
});

// 3. Побайтовое сравнение
function loopCompare(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}
benchmark('Loop compare (same)', () => loopCompare(buf1, buf2));
benchmark('Loop compare (diff)', () => loopCompare(buf1, buf3));

// 4. Сравнение через строку (не рекомендуется)
benchmark('toString(hex) compare', () => buf1.toString('hex') === buf2.toString('hex'));
