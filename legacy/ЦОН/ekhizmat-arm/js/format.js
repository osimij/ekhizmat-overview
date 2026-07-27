/* ============================================================
   format.js — доменное форматирование (§10).

   §10 требует: даты «17.07.2026», время «14:21», длительности услуг словами
   («1 рӯз 4 соат» / «1 день 4 часа»). Словами — значит через словарь и
   множественное число, а не строкой в данных: в mock/data.js лежат числа
   ({d: 1, h: 4}), потому что «1 день 4 часа» непереводимо, а 1 и 4 —
   переводимы. Иначе tg.json пришлось бы городить поверх русских строк.
   ============================================================ */
import { t, plural } from './i18n.js';

export function fmtTerm(svc) {
  if (svc.instant) return t('term.instant');

  const { d = 0, h = 0 } = svc.term || {};
  const parts = [];
  if (d) parts.push(`${d} ${plural(d, 'plural.days')}`);
  if (h) parts.push(`${h} ${plural(h, 'plural.hours')}`);
  return parts.join(' ') || t('term.instant');
}

export function fmtFee(svc) {
  return svc.fee ? `${svc.fee} ${t('fee.currency')}` : t('fee.free');
}

/* Даты в данных уже в формате §10 («14.02.1991») — их не трогаем.
   Форматируем только то, что рождается из Date: время приёма, отметки. */
export const fmtTime = ts => new Date(ts).toLocaleTimeString('ru-RU', {
  hour: '2-digit', minute: '2-digit',
});

export const fmtDate = ts => new Date(ts).toLocaleDateString('ru-RU', {
  day: '2-digit', month: '2-digit', year: 'numeric',
});

/* Истёк ли срок, записанный строкой «дд.мм.гггг» (§6/S2b, §6/S7).

   Своя разборка, а не Date.parse: «19.06.2021» браузер там, где локаль это
   позволяет, читает как MM.DD.YYYY — и паспорт, действительный до 19 июня,
   становился бы просроченным шестого числа. Ошибка тихая и правдоподобная,
   поэтому дату разбираем руками. */
export function isExpired(dmy) {
  const [d, m, y] = String(dmy || '').split('.').map(Number);
  if (!d || !m || !y) return false;      // даты нет — не наше дело утверждать
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(y, m - 1, d) < today;
}

/* Дата через N дней — «Результат до 18.07» на S8. */
export function fmtDatePlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}
