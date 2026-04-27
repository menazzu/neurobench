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

    // ========== PROMPTS ==========

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

    // ========== MODELS (global catalog) ==========

    async function getAllModels() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('models').select('*').order('name');
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

    // ========== MODEL SPACES (per model, macro) ==========

    async function getModelSpaces(modelId) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('model_spaces').select('*').eq('model_id', modelId).order('id');
        if (error) throw error;
        return data;
    }

    async function getAllModelSpaces() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('model_spaces').select('*, models(id, name)').order('model_id').order('id');
        if (error) throw error;
        return data;
    }

    async function addModelSpace(space) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('model_spaces').insert(space).select();
        if (error) throw error;
        return data;
    }

    async function updateModelSpace(id, space) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('model_spaces').update(space).eq('id', id).select();
        if (error) throw error;
        return data;
    }

    async function deleteModelSpace(id) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { error } = await client.from('model_spaces').delete().eq('id', id);
        if (error) throw error;
    }

    // ========== MODEL PARAMS (per model, micro definitions) ==========

    async function getModelParams(modelId) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('model_params').select('*, model_param_values(id, value)').eq('model_id', modelId).order('id');
        if (error) throw error;
        return data;
    }

    async function getAllModelParams() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('model_params').select('*, models(id, name), model_param_values(id, value)').order('model_id').order('id');
        if (error) throw error;
        return data;
    }

    async function addModelParam(param) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('model_params').insert(param).select();
        if (error) throw error;
        return data;
    }

    async function updateModelParam(id, param) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('model_params').update(param).eq('id', id).select();
        if (error) throw error;
        return data;
    }

    async function deleteModelParam(id) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { error } = await client.from('model_params').delete().eq('id', id);
        if (error) throw error;
    }

    // ========== MODEL PARAM VALUES ==========

    async function addModelParamValue(paramValue) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('model_param_values').insert(paramValue).select();
        if (error) throw error;
        return data;
    }

    async function updateModelParamValue(id, paramValue) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('model_param_values').update(paramValue).eq('id', id).select();
        if (error) throw error;
        return data;
    }

    async function deleteModelParamValue(id) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { error } = await client.from('model_param_values').delete().eq('id', id);
        if (error) throw error;
    }

    // ========== RESULTS ==========

    async function getResultsByPrompt(promptId) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('results')
            .select('*, models(id, name), model_spaces(id, name, url), prompts(id, difficulty, text, name), result_param_values(id, param_value_id, model_param_values(id, value, param_id, model_params(id, name, model_id)))')
            .eq('prompt_id', promptId)
            .order('overall', { ascending: false });
        if (error) throw error;
        return data;
    }

    async function getAllResults() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('results')
            .select('*, models(id, name), model_spaces(id, name, url), prompts(id, difficulty, text, name), result_param_values(id, param_value_id, model_param_values(id, value, param_id, model_params(id, name, model_id)))')
            .order('prompt_id')
            .order('overall', { ascending: false });
        if (error) throw error;
        return data;
    }

    async function addResult(result) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('results').insert(result).select();
        if (error) throw error;
        return data;
    }

    async function updateResult(id, result) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('results').update(result).eq('id', id).select();
        if (error) throw error;
        return data;
    }

    async function deleteResult(id) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { error } = await client.from('results').delete().eq('id', id);
        if (error) throw error;
    }

    // ========== RESULT PARAM VALUES (junction) ==========

    async function setResultParamValues(resultId, paramValueIds) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        await client.from('result_param_values').delete().eq('result_id', resultId);
        if (paramValueIds.length > 0) {
            const rows = paramValueIds.map(pvId => ({ result_id: resultId, param_value_id: pvId }));
            const { error } = await client.from('result_param_values').insert(rows);
            if (error) throw error;
        }
    }

    async function getResultParamValues(resultId) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.from('result_param_values')
            .select('*, model_param_values(id, value, param_id, model_params(id, name))')
            .eq('result_id', resultId);
        if (error) throw error;
        return data;
    }

    // ========== AUTH ==========

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

    async function telegramAuth(authData, inviteCode) {
        const supabaseUrl = window.SUPABASE_URL;
        const anonKey = window.SUPABASE_ANON_KEY;
        if (!supabaseUrl || !anonKey) throw new Error('Supabase not configured');

        const body = { auth_data: authData };
        if (inviteCode) body.invite_code = inviteCode;

        let result;
        try {
            const response = await fetch(`${supabaseUrl}/functions/v1/telegram-auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`,
                },
                body: JSON.stringify(body)
            });
            result = await response.json();
            if (!response.ok) {
                const err = new Error(result.error || 'Authentication failed');
                err.needsInvite = result.needs_invite || false;
                throw err;
            }
        } catch (e) {
            if (e.needsInvite) throw e;
            throw new Error('Не удалось подключиться к серверу аутентификации. Проверьте что Edge Function telegram-auth задеплоена в Supabase Dashboard.');
        }

        return result;
    }

    async function setSession(accessToken, refreshToken) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) throw error;
        return data;
    }

    // ========== STATS ==========

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

    // ========== INVITES (RPC) ==========

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

    async function getUserDisplayName() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.rpc('get_user_display_name');
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

    async function adminGenerateInviteCode(maxUses) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.rpc('admin_generate_invite_code', { p_max_uses: maxUses || null });
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

    async function adminGetProfiles() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.rpc('admin_get_profiles');
        if (error) throw error;
        return data || [];
    }

    async function adminResetUserInviteLimit(userId) {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.rpc('admin_reset_user_invite_limit', { p_user_id: userId });
        if (error) throw error;
        return data;
    }

    async function adminResetAllInviteLimits() {
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data, error } = await client.rpc('admin_reset_all_invite_limits');
        if (error) throw error;
        return data;
    }

    async function adminDeleteUser(userId) {
        const supabaseUrl = window.SUPABASE_URL;
        const anonKey = window.SUPABASE_ANON_KEY;
        const client = getClient();
        if (!client) throw new Error('Supabase not configured');
        const { data: { session } } = await client.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        let result;
        try {
            const response = await fetch(`${supabaseUrl}/functions/v1/admin-action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ action: 'delete_user', user_id: userId })
            });
            result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Delete failed');
        } catch (e) {
            if (e.message && !e.message.includes('подключиться')) throw e;
            throw new Error('Не удалось подключиться к серверу. Проверьте что Edge Function admin-action задеплоена в Supabase Dashboard.');
        }
        return result;
    }

    return {
        getPromptsByDifficulty, getAllPrompts, addPrompt, updatePrompt, deletePrompt,
        getAllModels, addModel, updateModel, deleteModel,
        getModelSpaces, getAllModelSpaces, addModelSpace, updateModelSpace, deleteModelSpace,
        getModelParams, getAllModelParams, addModelParam, updateModelParam, deleteModelParam,
        addModelParamValue, updateModelParamValue, deleteModelParamValue,
        getResultsByPrompt, getAllResults, addResult, updateResult, deleteResult,
        setResultParamValues, getResultParamValues,
        login, logout, getSession, isAdmin, reinit, getClient,
        telegramAuth, setSession,
        trackPageView, getStats,
        claimInviteCode, generateInviteCode, getUserInviteStatus, getUserDisplayName,
        adminGetInviteCodes, adminGenerateInviteCode, adminDeleteInviteCode, adminGetProfiles,
        adminResetUserInviteLimit, adminResetAllInviteLimits, adminDeleteUser
    };
})();
