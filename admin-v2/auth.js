export function isConfigured(config) {
    return Boolean(
        window.supabase &&
        config?.supabaseUrl &&
        config?.supabasePublishableKey
    );
}

export async function getSession(client) {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session?.user || null;
}

export async function signIn(client, email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
}

export async function signOut(client) {
    const { error } = await client.auth.signOut();
    if (error) throw error;
}

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
