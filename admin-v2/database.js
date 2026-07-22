function queryResult(query) {
    return query.then(({ data, error }) => {
        if (error) throw error;
        return data;
    });
}

export function createDatabase(client) {
    return {
        members: {
            listOverrides() {
                return queryResult(client.from("member_overrides").select("*").order("sort_order"));
            },
            save(payload) {
                const query = payload.id
                    ? client.from("member_overrides").update(payload).eq("id", payload.id)
                    : client.from("member_overrides").insert(payload);
                return queryResult(query.select("*").single());
            },
            remove(id) {
                return queryResult(client.from("member_overrides").delete().eq("id", id));
            }
        },
        announcements: {
            list() {
                return queryResult(client.from("announcements").select("*").order("published_at", { ascending: false }));
            },
            save(payload) {
                const query = payload.id
                    ? client.from("announcements").update(payload).eq("id", payload.id)
                    : client.from("announcements").insert(payload);
                return queryResult(query.select("*").single());
            },
            remove(id) {
                return queryResult(client.from("announcements").delete().eq("id", id));
            }
        }
    };
}
