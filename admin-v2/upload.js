const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function validateImage(file) {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error("仅支持 JPG、PNG、WebP 或 GIF 图片。");
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("图片大小不能超过 5 MB。");
}

export async function uploadImage(client, userId, bucket, file, folder) {
    validateImage(file);
    if (!file) return null;
    const path = `${userId}/${folder}-${Date.now()}-${crypto.randomUUID()}-${file.name}`;
    const { error } = await client.storage.from(bucket).upload(path, file, { contentType: file.type });
    if (error) throw error;
    return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function removeManagedImage(client, bucket, url, supabaseUrl) {
    if (!url?.startsWith(`${supabaseUrl}/storage/v1/object/public/${bucket}/`)) return false;
    const path = decodeURIComponent(url.split(`/public/${bucket}/`)[1]);
    const { error } = await client.storage.from(bucket).remove([path]);
    if (error) throw error;
    return true;
}
