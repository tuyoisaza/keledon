const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const allowedSupabaseUrl = process.env.KELEDON_SEED_ALLOWED_SUPABASE_URL;
const email = process.env.KELEDON_SEED_USER_EMAIL;
const password = process.env.KELEDON_SEED_USER_PASSWORD;
const name = process.env.KELEDON_SEED_USER_NAME;

if (process.env.NODE_ENV === 'production') {
    throw new Error('Synthetic user seeding is disabled in production.');
}
if (process.env.KELEDON_ALLOW_SYNTHETIC_USER_SEED !== 'true') {
    throw new Error('Set KELEDON_ALLOW_SYNTHETIC_USER_SEED=true to opt in to this development-only fixture.');
}
if (!supabaseUrl || supabaseUrl !== allowedSupabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL must exactly match KELEDON_SEED_ALLOWED_SUPABASE_URL and a service key must be configured.');
}
if (!email || !email.toLowerCase().endsWith('@example.test') || !password || !name) {
    throw new Error('Provide a synthetic @example.test email, password, and name through KELEDON_SEED_USER_* variables.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function createSyntheticUser() {
    const { data: existing, error: lookupError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) throw new Error('Synthetic user already exists; role changes must be made by an existing superadmin.');

    const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name }
    });
    if (authError) throw authError;

    const { data: profile, error: profileLookupError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', authResult.user.id)
        .maybeSingle();
    if (profileLookupError) throw profileLookupError;

    if (profile) {
        if (profile.role !== 'user') {
            await supabase.auth.admin.deleteUser(authResult.user.id);
            throw new Error('Auth synchronization produced an unexpected role; synthetic user was removed.');
        }
    } else {
        const { error: profileError } = await supabase.from('users').insert({
            id: authResult.user.id,
            email,
            name,
            role: 'user'
        });
        if (profileError) {
            await supabase.auth.admin.deleteUser(authResult.user.id);
            throw profileError;
        }
    }

    console.log(`Synthetic user created with least-privilege role: ${email}`);
}

createSyntheticUser().catch((error) => {
    console.error('Synthetic user seeding failed:', error.message);
    process.exitCode = 1;
});
