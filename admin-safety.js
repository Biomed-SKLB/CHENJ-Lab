(function () {
    "use strict";

    const config = window.CHENJ_LAB_CONFIG || {};
    const bucket = config.mediaBucket || "chenj-lab-media";
    const maxUploadBytes = 5 * 1024 * 1024;
    const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    const byId = (id) => document.getElementById(id);

    function showToast(message, isError = false) {
        const toast = byId("toast");
        if (!toast) return;
        toast.textContent = message;
        toast.style.background = isError ? "#8f3333" : "";
        toast.hidden = false;
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => toast.hidden = true, 4200);
    }

    function validateImage(file) {
        if (!file) return true;
        if (!allowedImageTypes.has(file.type)) throw new Error("仅支持 JPG、PNG、WebP 或 GIF 图片。");
        if (file.size > maxUploadBytes) throw new Error("图片不能超过 5 MB，请压缩后重新上传。");
        return true;
    }

    function bindImageValidation(input) {
        if (!input) return;
        input.addEventListener("change", () => {
            try { validateImage(input.files[0]); }
            catch (error) { input.value = ""; showToast(error.message, true); }
        });
    }

    function guardFormUpload(formId, inputId) {
        const form = byId(formId);
        const input = byId(inputId);
        if (!form || !input) return;
        form.addEventListener("submit", (event) => {
            try { validateImage(input.files[0]); }
            catch (error) { event.preventDefault(); event.stopImmediatePropagation(); input.value = ""; showToast(error.message, true); }
        }, true);
    }

    function init() {
        bindImageValidation(byId("member-image-file"));
        bindImageValidation(byId("announcement-image-file"));
        guardFormUpload("member-form", "member-image-file");
        guardFormUpload("announcement-form", "announcement-image-file");
        void bucket;
    }

    init();
})();
