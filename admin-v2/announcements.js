export function normalizeAnnouncement(item) {
    return {
        ...item,
        publishedLabel: new Date(item.published_at).toLocaleDateString("zh-CN")
    };
}
