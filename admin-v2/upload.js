export function validateImage(file) {
    if (!file) return true;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
        throw new Error("不支持的图片格式。");
    }
    if (file.size > 5 * 1024 * 1024) {
        throw new Error("图片大小不能超过 5 MB。");
    }
    return true;
}
