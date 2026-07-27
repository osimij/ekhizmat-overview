/* ============================================================
   clock.js — единственный источник времени для всех таймеров АРМ.

   Зачем отдельный модуль. Таймеров в §6 много (QR 120с, согласие 120с,
   доп. скоуп 60с, TTL сессии 30:00, автоблокировка 3:00, кулдаун OTP 30с),
   и все они обязаны подчиняться ускорению из демо-панели (§11.5 «Ускорить
   таймеры ×10»): демонстрировать порог 5:00 у получасовой сессии, сидя
   двадцать пять минут молча, невозможно. Если множитель знает только
   демо-панель, каждый новый таймер норовит про него забыть — и половина
   §7 становится непоказуемой.

   Множитель ускоряет ход времени, а не частоту тиков: тик остаётся 250ms
   (плавное кольцо, §8), а вычитается из остатка dt × speed.
   ============================================================ */

export const clock = { speed: 1 };

/* countdown(120_000, (left, frac) => …, () => …) → stop()

   Возвращает функцию остановки, и её обязан звать teardown экрана. Иначе
   таймер переживёт свой экран и однажды дёрнет dispatch из состояния, в
   котором его событие нелегально, — store честно бросит исключение, а
   выглядеть это будет как случайное падение АРМ. */
export function countdown(totalMs, onTick, onEnd) {
  let left = totalMs;
  let last = Date.now();
  let id = null;

  onTick(left, 1);

  id = setInterval(() => {
    const now = Date.now();
    left -= (now - last) * clock.speed;
    last = now;

    if (left <= 0) {
      clearInterval(id);
      id = null;
      onTick(0, 0);
      onEnd?.();
      return;
    }
    onTick(left, left / totalMs);
  }, 250);

  return () => { if (id) clearInterval(id); id = null; };
}

/* Секундомер вперёд — для TTL сессии, где начало известно, а конец считается
   от него. Тот же множитель, то же правило про stop(). */
export function stopwatch(onTick, everyMs = 250) {
  let elapsed = 0;
  let last = Date.now();

  const id = setInterval(() => {
    const now = Date.now();
    elapsed += (now - last) * clock.speed;
    last = now;
    onTick(elapsed);
  }, everyMs);

  onTick(0);
  return () => clearInterval(id);
}
