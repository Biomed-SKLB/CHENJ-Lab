export function createDatabase(client) {
    return {
        members: {
            listOverrides() {
                return client.from("member_overrides").select("*").order("sort_order");
            }
        },
        announcements: {
            list() {
                return client.from("announcements").select("*").order("published_at", { ascending: false });
            }
        }
    };
}
