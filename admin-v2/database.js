export function createDatabase(client) {
    return {
        members: {
            listOverrides() {
                return client.from("member_overrides").select("*").order("sort_order");
            },
            save(payload) {
                return payload.id
                    ? client.from("member_overrides").update(payload).eq("id", payload.id)
                    : client.from("member_overrides").insert(payload);
            },
            remove(id) {
                return client.from("member_overrides").delete().eq("id", id);
            }
        },
        announcements: {
            list() {
                return client.from("announcements").select("*").order("published_at", { ascending: false });
            },
            save(payload) {
                return client.from("announcements").upsert(payload);
            },
            remove(id) {
                return client.from("announcements").delete().eq("id", id);
            }
        }
    };
}
