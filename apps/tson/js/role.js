import { getLang } from './i18n.js';

export const ROLE = { OPERATOR:'operator', SUPERVISOR:'supervisor', LEADERSHIP:'leadership' };
let role = ROLE.OPERATOR;
let centerContext = null;

const LABELS = {
  ru:{ operator:'Оператор', supervisor:'Руководитель отделения', leadership:'Руководство' },
  tg:{ operator:'Оператор', supervisor:'Роҳбари шуъба', leadership:'Роҳбарият' },
};

export const getRole = () => role;
export const roleLabel = (value = role) => (LABELS[getLang()] || LABELS.ru)[value];
export function setRole(next){
  if (!Object.values(ROLE).includes(next)) return role;
  role = next;
  window.dispatchEvent(new CustomEvent('ekh:tson-role'));
  return role;
}
export const getCenterContext = () => centerContext;
export function setCenterContext(center){ centerContext = center || null; }
export function resetRole(){ role = ROLE.OPERATOR; centerContext = null; window.dispatchEvent(new CustomEvent('ekh:tson-role')); }
