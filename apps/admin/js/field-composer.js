/* ===================== FIELD COMPOSER =====================
   One collapsible field composer for the whole console. It was built inline in
   the service builder; forms are edited in the library now, so it moved here as
   a shared module instead of being rebuilt a second time (design-guide rule 21).

   Anatomy — §5/§6 and rule 22:
   • collapsed row: number, bare type glyph, label, one meta line
     (type · required/optional · N options · conditional), reorder/delete
     actions and an expand toggle carrying `aria-expanded`;
   • one card open at a time, so a ten-field form stays scannable;
   • the grip drags, ▲▼ move by keyboard — a hover-only affordance would fail
     touch and keyboard users (§9);
   • the expanded body holds everything a field can say: three-language label
     with fallback marks, help text, input format, options, required, and
     conditional visibility.

   The composer never touches storage: it mutates the array it is handed and
   calls `onChange`. The page decides when that becomes a saved draft.
   ========================================================== */

const esc = value => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const FIELD_FORMATS = ['free', 'num', 'inn', 'phone', 'date', 'email'];

/* every field the composer edits, with the optional parts defaulted */
export function normalizeField(field) {
  return {
    id: field.id || `field-${Date.now()}-${Math.round(performance.now())}`,
    type: field.type || 'text',
    label: { tg: '', ru: '', en: '', ...(field.label || {}) },
    help: { tg: '', ru: '', ...(field.help || {}) },
    options: field.options ? { tg: [], ru: [], ...field.options } : undefined,
    required: !!field.required,
    format: field.format || (['text', 'textarea'].includes(field.type || 'text') ? 'free' : ''),
    condOn: field.condOn || '',
    condVal: field.condVal || '',
  };
}

export function createFieldComposer(options) {
  const {
    root,                 // the container element
    fields,               // () => the live array being edited
    onChange,             // () => void — called after every mutation
    editable = () => true,
    copy,                 // () => dictionary (see the keys used below)
    typeLabel,            // (type) => localized type name
    typeIcon,             // (type) => sprite id
    types,                // [type, …] for the type select
    lang = () => 'tg',
  } = options;

  let openId = null;
  let dragId = null;

  const list = () => fields();
  const indexOf = id => list().findIndex(field => field.id === id);
  const fallbackMark = value => (value ? '' : '<span class="fb"> ⚑</span>');

  function metaLine(field) {
    const c = copy();
    const parts = [`<span class="ftype">${esc(typeLabel(field.type))}</span>`];
    parts.push(`<span class="${field.required ? 'fb-req' : ''}">${esc(field.required ? c.required : c.optional)}</span>`);
    if (field.options && (field.options.tg || []).length) parts.push(`<span>· ${(field.options.tg || []).length} ${esc(c.optionsShort)}</span>`);
    if (field.condOn) parts.push(`<span>· ${esc(c.conditional)}</span>`);
    return parts.join('');
  }

  function bodyHtml(field) {
    const c = copy(), disabled = editable() ? '' : ' disabled';
    const others = list().filter(item => item.id !== field.id);
    const formatOptions = FIELD_FORMATS
      .map(key => `<option value="${key}" ${field.format === key ? 'selected' : ''}>${esc(c.formats[key])}</option>`).join('');
    const showFormat = field.type === 'text' || field.type === 'textarea';
    return `
      <div class="field ml">
        <label>${esc(c.labelHeading)}</label>
        <div class="ml-tabs" role="tablist">
          <button type="button" role="tab" data-ml="tg" aria-selected="true">Тоҷикӣ</button>
          <button type="button" role="tab" data-ml="ru" aria-selected="false">Русӣ<span class="fbslot">${fallbackMark(field.label.ru)}</span></button>
          <button type="button" role="tab" data-ml="en" aria-selected="false">English<span class="fbslot">${fallbackMark(field.label.en)}</span></button>
        </div>
        <div class="ml-pane" data-mlp="tg"><input class="input" data-field-prop="label.tg" value="${esc(field.label.tg)}"${disabled} spellcheck="false"></div>
        <div class="ml-pane" data-mlp="ru" hidden><input class="input" data-field-prop="label.ru" value="${esc(field.label.ru)}"${disabled} spellcheck="false"></div>
        <div class="ml-pane" data-mlp="en" hidden><input class="input" data-field-prop="label.en" value="${esc(field.label.en)}"${disabled} spellcheck="false"></div>
      </div>
      <div class="field"><label>${esc(c.typeLabel)}</label><div class="select"><select data-field-prop="type"${disabled}>${types.map(type => `<option value="${type}" ${type === field.type ? 'selected' : ''}>${esc(typeLabel(type))}</option>`).join('')}</select></div></div>
      ${field.options ? `<div class="field"><label>${esc(c.options)} · TG</label><input class="input" data-field-prop="options.tg" value="${esc((field.options.tg || []).join(', '))}"${disabled}></div>
      <div class="field"><label>${esc(c.options)} · RU</label><input class="input" data-field-prop="options.ru" value="${esc((field.options.ru || []).join(', '))}"${disabled}></div>` : ''}
      <div class="field"><label>${esc(c.help)} <span class="opt-note">— ${esc(c.optional)}</span></label><input class="input" data-field-prop="help.tg" value="${esc(field.help.tg)}" placeholder="${esc(c.helpPlaceholder)}"${disabled}></div>
      <div class="cfg-sub">${esc(c.validation)}</div>
      ${showFormat ? `<div class="field"><label>${esc(c.format)}</label><div class="select"><select data-field-prop="format"${disabled}>${formatOptions}</select></div><p class="help">${esc(c.formatHelp)}</p></div>` : ''}
      <label class="pr pr--flush"><div class="tt"><span class="v">${esc(c.required)}</span><span class="k">${esc(c.requiredHelp)}</span></div><span class="sw"><input type="checkbox" data-field-prop="required" ${field.required ? 'checked' : ''}${disabled}><span class="knob"></span></span></label>
      <div class="cfg-sub">${esc(c.conditionHeading)}</div>
      <div class="cond-row">
        <div class="select"><select data-field-prop="condOn"${disabled}><option value="">${esc(c.always)}</option>${others.map(item => `<option value="${esc(item.id)}" ${field.condOn === item.id ? 'selected' : ''}>${esc(item.label[lang()] || item.label.tg)}</option>`).join('')}</select></div>
        <span class="mini-lbl adm-center">${esc(c.equals)}</span>
        <input class="input" data-field-prop="condVal" value="${esc(field.condVal)}" placeholder="${esc(c.value)}"${field.condOn ? '' : ' disabled'}${disabled}>
      </div>`;
  }

  function render(focusId) {
    if (!root) return;
    const c = copy();
    const items = list();
    if (!items.length) {
      root.innerHTML = `<div class="fb-empty"><svg><use href="/design-system/assets/icons.svg#i-edit"/></svg><p>${esc(c.empty)}</p></div>`;
      return;
    }
    const canEdit = editable();
    root.innerHTML = items.map((field, index) => {
      const open = field.id === openId;
      return `<div class="fb-item${open ? ' open' : ''}" data-field-id="${esc(field.id)}"${canEdit ? ' draggable="true"' : ''}>
        <div class="fb-head">
          ${canEdit ? `<span class="fb-grip" aria-hidden="true" title="${esc(c.dragHint)}"></span>` : ''}
          <button class="fb-open" type="button" data-field-act="toggle" aria-expanded="${open}">
            <span class="fb-ic"><svg><use href="/design-system/assets/icons.svg#${typeIcon(field.type)}"/></svg></span>
            <span class="fb-tt"><b>${esc(field.label[lang()] || field.label.tg || c.untitled)}</b><span class="meta">${metaLine(field)}</span></span>
          </button>
          ${canEdit ? `<span class="fb-acts">
            <button class="rowact" type="button" data-field-act="up" aria-label="${esc(c.moveUp)}" title="${esc(c.moveUp)}" ${index === 0 ? 'disabled' : ''}><svg class="adm-flip"><use href="/design-system/assets/icons.svg#i-chev-d"/></svg></button>
            <button class="rowact" type="button" data-field-act="down" aria-label="${esc(c.moveDown)}" title="${esc(c.moveDown)}" ${index === items.length - 1 ? 'disabled' : ''}><svg><use href="/design-system/assets/icons.svg#i-chev-d"/></svg></button>
            <button class="rowact rowact--danger" type="button" data-field-act="remove" aria-label="${esc(c.remove)}" title="${esc(c.remove)}"><svg><use href="/design-system/assets/icons.svg#i-trash"/></svg></button>
          </span>` : ''}
        </div>
        <div class="fb-body">${open ? bodyHtml(field) : ''}</div>
      </div>`;
    }).join('');
    if (focusId) {
      const row = root.querySelector(`[data-field-id="${CSS.escape(focusId)}"]`);
      if (row) {
        row.classList.add('just-added');
        setTimeout(() => row.classList.remove('just-added'), 1200);
        row.querySelector('[data-field-prop="label.tg"]')?.focus();
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  function setProp(field, prop, input) {
    if (prop === 'type') {
      field.type = input.value;
      if (field.type === 'select' && !field.options) field.options = { tg: [], ru: [] };
      if (field.type !== 'select') delete field.options;
    } else if (prop === 'required') field.required = input.checked;
    else if (prop === 'format') field.format = input.value;
    else if (prop === 'condOn') { field.condOn = input.value; if (!field.condOn) field.condVal = ''; }
    else if (prop === 'condVal') field.condVal = input.value;
    else if (prop.startsWith('label.')) field.label[prop.split('.')[1]] = input.value;
    else if (prop.startsWith('help.')) field.help[prop.split('.')[1]] = input.value;
    else if (prop.startsWith('options.')) {
      field.options = field.options || { tg: [], ru: [] };
      field.options[prop.split('.')[1]] = input.value.split(',').map(item => item.trim()).filter(Boolean);
    }
  }

  /* live edits do not re-render the open body — that would eat the caret */
  function refreshRowSummary(row, field) {
    const title = row.querySelector('.fb-tt b');
    if (title) title.textContent = field.label[lang()] || field.label.tg || copy().untitled;
    const meta = row.querySelector('.fb-tt .meta');
    if (meta) meta.innerHTML = metaLine(field);
    const icon = row.querySelector('.fb-ic use');
    if (icon) icon.setAttribute('href', `/design-system/assets/icons.svg#${typeIcon(field.type)}`);
  }

  root.addEventListener('click', event => {
    const mlTab = event.target.closest('.ml-tabs button[data-ml]');
    if (mlTab) {
      const box = mlTab.closest('.ml'), key = mlTab.dataset.ml;
      box.querySelectorAll('.ml-tabs button').forEach(button => button.setAttribute('aria-selected', String(button === mlTab)));
      box.querySelectorAll('.ml-pane').forEach(pane => { pane.hidden = pane.dataset.mlp !== key; });
      box.querySelector('.ml-pane:not([hidden]) input')?.focus();
      return;
    }
    const button = event.target.closest('[data-field-act]');
    const row = button?.closest('[data-field-id]');
    if (!button || !row) return;
    const id = row.dataset.fieldId, index = indexOf(id), action = button.dataset.fieldAct;
    if (index < 0) return;
    if (action === 'toggle') { openId = openId === id ? null : id; render(); return; }
    if (!editable()) return;
    const items = list();
    if (action === 'remove') { items.splice(index, 1); if (openId === id) openId = null; }
    if (action === 'up' && index > 0) items.splice(index - 1, 0, items.splice(index, 1)[0]);
    if (action === 'down' && index < items.length - 1) items.splice(index + 1, 0, items.splice(index, 1)[0]);
    render();
    onChange();
    if (action !== 'remove') root.querySelector(`[data-field-id="${CSS.escape(id)}"] [data-field-act="${action}"]`)?.focus();
  });

  const applyEdit = event => {
    const input = event.target.closest('[data-field-prop]');
    const row = input?.closest('[data-field-id]');
    if (!input || !row) return;
    const field = list().find(item => item.id === row.dataset.fieldId);
    if (!field || !editable()) return;
    const prop = input.dataset.fieldProp;
    setProp(field, prop, input);
    if (prop === 'type' || prop === 'condOn') { render(); root.querySelector(`[data-field-id="${CSS.escape(field.id)}"] [data-field-prop="${prop}"]`)?.focus(); }
    else {
      refreshRowSummary(row, field);
      if (prop.startsWith('label.')) {
        const key = prop.split('.')[1];
        row.querySelector(`.ml-tabs button[data-ml="${key}"] .fbslot`)?.replaceChildren();
        const slot = row.querySelector(`.ml-tabs button[data-ml="${key}"] .fbslot`);
        if (slot) slot.innerHTML = fallbackMark(input.value);
      }
    }
    onChange();
  };
  root.addEventListener('input', applyEdit);
  root.addEventListener('change', applyEdit);

  /* grip-initiated drag; ▲▼ above is the keyboard path */
  root.addEventListener('dragstart', event => {
    const row = event.target.closest('.fb-item');
    if (!row || !editable()) return;
    if (!event.target.closest('.fb-grip')) { event.preventDefault(); return; }
    dragId = row.dataset.fieldId;
    row.classList.add('dragging');
    try { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', dragId); } catch (_) {}
  });
  root.addEventListener('dragover', event => {
    if (dragId == null) return;
    event.preventDefault();
    const over = event.target.closest('.fb-item');
    if (!over || over.dataset.fieldId === dragId) return;
    const box = over.getBoundingClientRect(), after = event.clientY > box.top + box.height / 2;
    root.querySelectorAll('.fb-item').forEach(item => item.classList.remove('drop-a', 'drop-b'));
    over.classList.add(after ? 'drop-a' : 'drop-b');
  });
  root.addEventListener('drop', event => {
    if (dragId == null) return;
    event.preventDefault();
    const over = event.target.closest('.fb-item');
    if (over && over.dataset.fieldId !== dragId) {
      const items = list();
      const box = over.getBoundingClientRect(), after = event.clientY > box.top + box.height / 2;
      const moved = items.splice(indexOf(dragId), 1)[0];
      let to = indexOf(over.dataset.fieldId);
      if (after) to += 1;
      items.splice(to, 0, moved);
      render();
      onChange();
    }
    dragId = null;
  });
  root.addEventListener('dragend', () => {
    dragId = null;
    root.querySelectorAll('.fb-item').forEach(item => item.classList.remove('dragging', 'drop-a', 'drop-b'));
  });

  return {
    render,
    /* a new field opens immediately, focused — you added it to fill it in */
    add(field) {
      const next = normalizeField(field);
      list().push(next);
      openId = next.id;
      render(next.id);
      onChange();
      return next;
    },
    close() { openId = null; render(); },
  };
}
