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

    async function getPromptsByDifficulty(difficulty) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('prompts').select('*').eq('difficulty', difficulty).order('id');
        if (error) throw error;
        return data;
    }

    async function getAllPrompts() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('prompts').select('*').order('id');
        if (error) throw error;
        return data;
    }

    async function getModelsByPrompt(promptId) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('models').select('*').eq('prompt_id', promptId).order('best_overall', { ascending: false });
        if (error) throw error;
        return data;
    }

    async function getAllModels() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('models').select('*, prompts(id, difficulty, text)').order('prompt_id', { ascending: true }).order('best_overall', { ascending: false });
        if (error) throw error;
        return data;
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

    async function trackPageView(visitorHash, page, referrer) {
        const client = getClient();
        if (!client) return;
        await client.from('page_views').insert({ visitor_hash: visitorHash, page, referrer });
    }

    async function getStats() {
        const client = getClient();
        if (!client) return null;
        const now = new Date();
        const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [online, today, total, daily, monthlyUnique] = await Promise.all([
            client.from('page_views').select('visitor_hash', { count: 'exact', head: false }).gte('created_at', fiveMinAgo),
            client.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
            client.from('page_views').select('id', { count: 'exact', head: true }),
            client.from('page_views').select('created_at').gte('created_at', thirtyDaysAgo).order('created_at'),
            client.from('page_views').select('visitor_hash').gte('created_at', thirtyDaysAgo)
        ]);

        const onlineUnique = new Set((online.data || []).map(r => r.visitor_hash)).size;

        const dailyMap = {};
        (daily.data || []).forEach(r => {
            const day = r.created_at.slice(0, 10);
            dailyMap[day] = (dailyMap[day] || 0) + 1;
        });
        const dailyList = Object.entries(dailyMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

        const monthlyUniqueCount = new Set((monthlyUnique.data || []).map(r => r.visitor_hash)).size;

        return {
            onlineNow: onlineUnique,
            viewsToday: today.count || 0,
            totalViews: total.count || 0,
            monthlyUnique: monthlyUniqueCount,
            daily: dailyList
        };
    }

    async function signUp(email, password, inviteCode, captchaToken) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const opts = {};
        if (inviteCode) opts.data = { invite_code: inviteCode };
        if (captchaToken) opts.captchaToken = captchaToken;
        const { data, error } = await client.auth.signUp({ email, password, options: opts });
        if (error) throw error;
        return data;
    }

    async function verifyOtp(email, token) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.auth.verifyOtp({ email, token, type: 'signup' });
        if (error) throw error;
        return data;
    }

    async function claimInviteCode(code) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.rpc('claim_invite_code', { p_code: code || null });
        if (error) throw error;
        return data;
    }

    async function generateInviteCode() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.rpc('generate_user_invite_code');
        if (error) throw error;
        return data;
    }

    async function getUserInviteStatus() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.rpc('get_user_invite_status');
        if (error) throw error;
        return data && data[0] ? data[0] : null;
    }

    async function adminGetInviteCodes() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.rpc('admin_get_invite_codes');
        if (error) throw error;
        return data || [];
    }

    async function adminGenerateInviteCode() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.rpc('admin_generate_invite_code');
        if (error) throw error;
        return data;
    }

    async function adminDeleteInviteCode(id) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.rpc('admin_delete_invite_code', { p_id: id });
        if (error) throw error;
        return data;
    }

    async function verifyTurnstile(token) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.rpc('verify_turnstile', { p_token: token });
        if (error) throw error;
        return data;
    }

    async function adminGetProfiles() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.rpc('admin_get_profiles');
        if (error) throw error;
        return data || [];
    }

    return { getPromptsByDifficulty, getAllPrompts, getModelsByPrompt, getAllModels, addModel, updateModel, deleteModel, addPrompt, updatePrompt, deletePrompt, login, logout, getSession, isAdmin, reinit, getClient, trackPageView, getStats, signUp, verifyOtp, claimInviteCode, generateInviteCode, getUserInviteStatus, adminGetInviteCodes, adminGenerateInviteCode, adminDeleteInviteCode, adminGetProfiles, verifyTurnstile };
})();
