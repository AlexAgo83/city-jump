const hud = document.getElementById("hud") as HTMLDivElement;
const toast = document.getElementById("toast") as HTMLDivElement;

export function setHud(text: string): void {
  hud.textContent = text;
}

let toastTimer = 0;
/** Shows why an action was refused. Replaces the previous message rather than queueing. */
export function showRefusal(reason: string): void {
  toast.textContent = reason;
  toast.style.opacity = "1";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.style.opacity = "0"), 2200);
}
