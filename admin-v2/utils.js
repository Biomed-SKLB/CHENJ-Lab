export function byId(id) {
    return document.getElementById(id);
}

export function showToast(message, isError = false) {
    const toast = byId("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    toast.style.background = isError ? "#8f3333" : "";
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.hidden = true;
    }, 3600);
}

export function setBusy(form, busy) {
    form?.querySelectorAll("button, input, select, textarea").forEach((node) => {
        node.disabled = busy;
    });
}

export function localDateTimeValue(date = new Date()) {
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function createContentRow({ title, meta, status, actionLabel = "编辑", onAction }) {
    const row = document.createElement("div");
    row.className = "content-row";

    const titleNode = document.createElement("div");
    titleNode.className = "content-row-title";
    titleNode.textContent = title;

    const metaNode = document.createElement("div");
    metaNode.className = "content-row-meta";
    metaNode.textContent = meta;

    if (status) {
        const statusNode = document.createElement("span");
        statusNode.className = `status-pill${status.active ? "" : " is-muted"}`;
        statusNode.textContent = status.label;
        metaNode.append(" · ", statusNode);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "button button-secondary";
    button.textContent = actionLabel;
    button.addEventListener("click", onAction);

    row.append(titleNode, metaNode, button);
    return row;
}

export function renderEmptyState(container, message) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = message;
    container.replaceChildren(empty);
}
