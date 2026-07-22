function queryResult(query) {
    return query.then(({ data, error }) => {
        if (error) throw error;
        return data;
    });
}

function withoutId(payload) {
    const { id, ...values } = payload;
    return { id, values };
}

export function createDatabase(client) {
    return {
        members: {
            listOverrides() {
                return queryResult(
                    client.from("member_overrides").select("*").order("sort_order", { ascending: true })
                );
            },
            save(payload) {
                const { id, values } = withoutId(payload);
                const query = id
                    ? client.from("member_overrides").update(values).eq("id", id)
                    : client.from("member_overrides").insert(values);
                return queryResult(query.select("*").single());
            },
            remove(id) {
                return queryResult(client.from("member_overrides").delete().eq("id", id));
            }
        },
        announcements: {
            list() {
                return queryResult(
                    client.from("announcements").select("*").order("published_at", { ascending: false })
                );
            },
            save(payload) {
                const { id, values } = withoutId(payload);
                const query = id
                    ? client.from("announcements").update(values).eq("id", id)
                    : client.from("announcements").insert(values);
                return queryResult(query.select("*").single());
            },
            remove(id) {
                return queryResult(client.from("announcements").delete().eq("id", id));
            }
        }
    };
}
