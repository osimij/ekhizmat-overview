import { getLang, getTheme, setLang, toggleTheme } from '/design-system/js/preferences.js';
import { openDialog } from '/design-system/js/dialog.js';
import { toast } from '/design-system/js/toast.js';

const theme = document.getElementById('theme');
const language = document.getElementById('language');
const density = document.getElementById('density');
function labels() { theme.textContent = getTheme() === 'dark' ? 'Light' : 'Dark'; language.textContent = getLang() === 'ru' ? 'TG' : 'RU'; }
theme.addEventListener('click', () => { toggleTheme(); labels(); });
language.addEventListener('click', () => { setLang(getLang() === 'ru' ? 'tg' : 'ru'); labels(); });
density.addEventListener('click', () => { const compact = document.body.dataset.density === 'compact'; document.body.dataset.density = compact ? 'comfortable' : 'compact'; density.textContent = compact ? 'Compact' : 'Comfortable'; });
document.getElementById('dialogDemo').addEventListener('click', event => openDialog({ title:'Тасдиқи амал', description:'Маълумот санҷида шуд. Амалро идома медиҳед?', trigger:event.currentTarget, actions:[{label:'Бекор кардан',className:'btn-sec'},{label:'Идома додан',className:'btn-pri',autofocus:true}] }));
document.getElementById('toastDemo').addEventListener('click', () => toast('Тағйирот бомуваффақият сабт шуд'));
labels();
