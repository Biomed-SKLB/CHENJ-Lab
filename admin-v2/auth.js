export async function verifyAdmin(client, user) {
    const { data, error } = await client
        .from("site_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error || !data) {
        await client.auth.signOut();
        throw new Error("该账号没有管理员权限。");
    }
}

export async function getSession(client) {
    const { data } = await client.auth.getSession();
    return data.session?.user || null;
}
