const Api = (() => {
    let sb = null;

    function getClient() {
        if (sb) return sb;
        const url = window.SUPABASE_URL || '';
        const key = window.SUPABASE_ANON_KEY || '';
        if (typeof supabase === 'undefined' || !url || !key) return null;
        sb = supabase.createClient(url, key);
        return sb;
    }

    function reinit() {
        sb = null;
        getClient();
    }

    async function getModels() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('models').select('*').order('best_overall', { ascending: false });
        if (error) throw error;
        return data;
    }

    async function getPrompts() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('prompts').select('*').order('id');
        if (error) throw error;
        const grouped = { easy: [], medium: [], hard: [] };
        data.forEach(p => {
            if (grouped[p.difficulty]) grouped[p.difficulty].push(p.text);
        });
        return grouped;
    }

    async function addModel(model) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('models').insert(model).select();
        if (error) throw error;
        return data;
    }

    async function updateModel(id, model) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('models').update(model).eq('id', id).select();
        if (error) throw error;
        return data;
    }

    async function deleteModel(id) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { error } = await client.from('models').delete().eq('id', id);
        if (error) throw error;
    }

    async function addPrompt(prompt) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('prompts').insert(prompt).select();
        if (error) throw error;
        return data;
    }

    async function updatePrompt(id, prompt) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('prompts').update(prompt).eq('id', id).select();
        if (error) throw error;
        return data;
    }

    async function deletePrompt(id) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { error } = await client.from('prompts').delete().eq('id', id);
        if (error) throw error;
    }

    async function login(email, password) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    async function logout() {
        const client = getClient();
        if (!client) return;
        await client.auth.signOut();
    }

    async function getSession() {
        const client = getClient();
        if (!client) return null;
        const { data } = await client.auth.getSession();
        return data.session;
    }

    async function isAdmin() {
        const session = await getSession();
        if (!session) return false;
        const client = getClient();
        if (!client) return false;
        const { data } = await client.from('admin_users').select('id').eq('user_id', session.user.id).single();
        return !!data;
    }

    return { getModels, getPrompts, addModel, updateModel, deleteModel, addPrompt, updatePrompt, deletePrompt, login, logout, getSession, isAdmin, reinit, getClient };
})();
