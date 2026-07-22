export function byId(id) {
    return document.getElementById(id);
}

export function showToast(message, isError = false) {
    const toast = byId("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    toast.dataset.error = String(isError);
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.hidden = true;
    }, 3000);
}

export function setBusy(form, busy) {
    form?.querySelectorAll("button, input, select, textarea").forEach((node) => {
        node.disabled = busy;
    });
}
