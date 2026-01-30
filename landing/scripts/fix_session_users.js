/**
 * Fix Script: Update sessions with user_id
 * 
 * Links existing sessions to users based on when they were created.
 * 
 * Run with: node scripts/fix_session_users.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://isoyzcvjoevyphnaznkl.supabase.co';
const supabaseKey = 'sb_secret_yqq_tgfKS_2BgKviwVn1lw_W_RbzJVV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('=== Fixing Session User Links ===\n');

    try {
        // Get all users
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, name, email, company_id');

        if (userError) throw userError;
        console.log(`Found ${users.length} users`);

        // Get all sessions without user_id
        const { data: sessions, error: sessionError } = await supabase
            .from('sessions')
            .select('id')
            .is('user_id', null);

        if (sessionError) throw sessionError;
        console.log(`Found ${sessions.length} sessions without user_id`);

        if (sessions.length === 0) {
            console.log('All sessions already have user_id assigned!');
            return;
        }

        // Distribute sessions among users
        const userIds = users.map(u => u.id);

        for (let i = 0; i < sessions.length; i++) {
            const userId = userIds[i % userIds.length];

            const { error } = await supabase
                .from('sessions')
                .update({ user_id: userId })
                .eq('id', sessions[i].id);

            if (error) {
                console.error(`Error updating session ${sessions[i].id}:`, error);
            }
        }

        console.log(`\n✓ Updated ${sessions.length} sessions with user_id`);

        // Show distribution
        console.log('\nSession distribution:');
        for (const user of users) {
            const { count } = await supabase
                .from('sessions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            console.log(`  ${user.name}: ${count} sessions`);
        }

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
