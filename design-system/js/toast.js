let region;

function getRegion() {
  if (region?.isConnected) return region;
  region = document.createElement('div');
  region.className = 'ekh-toast-region';
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  document.body.append(region);
  return region;
}

export function toast(message, { urgent = false, duration = 3200 } = {}) {
  const element = document.createElement('div');
  element.className = 'ekh-toast';
  element.textContent = message;
  if (urgent) element.setAttribute('role', 'alert');
  getRegion().append(element);
  setTimeout(() => element.remove(), duration);
  return element;
}
