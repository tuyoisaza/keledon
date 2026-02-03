/**
 * Fix Script: Reassign sessions by company
 * 
 * Ensures Stellantis users get Stellantis sessions, Pepsico users get Pepsico sessions.
 * 
 * Run with: node scripts/fix_session_by_company.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://isoyzcvjoevyphnaznkl.supabase.co';
const supabaseKey = 'sb_secret_yqq_tgfKS_2BgKviwVn1lw_W_RbzJVV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('=== Reassigning Sessions by Company ===\n');

    try {
        // Get Stellantis company and users
        const { data: stellantis } = await supabase
            .from('companies')
            .select('id')
            .eq('name', 'Stellantis')
            .single();

        const { data: pepsico } = await supabase
            .from('companies')
            .select('id')
            .eq('name', 'Pepsico')
            .single();

        if (!stellantis || !pepsico) {
            console.log('Companies not found. Please run seed_demo_data.js first.');
            return;
        }

        console.log('Found Stellantis ID:', stellantis.id);
        console.log('Found Pepsico ID:', pepsico.id);

        // Get users by company
        const { data: stellantisUsers } = await supabase
            .from('users')
            .select('id, name')
            .eq('company_id', stellantis.id);

        const { data: pepsicoUsers } = await supabase
            .from('users')
            .select('id, name')
            .eq('company_id', pepsico.id);

        console.log('\nStellantis users:', stellantisUsers?.map(u => u.name).join(', '));
        console.log('Pepsico users:', pepsicoUsers?.map(u => u.name).join(', '));

        // Get all sessions
        const { data: sessions } = await supabase
            .from('sessions')
            .select('id')
            .order('created_at', { ascending: true });

        if (!sessions || sessions.length === 0) {
            console.log('No sessions found.');
            return;
        }

        console.log(`\nTotal sessions: ${sessions.length}`);

        // Assign first 20 to Stellantis users, next 10 to Pepsico
        const stellantisUserIds = stellantisUsers?.map(u => u.id) || [];
        const pepsicoUserIds = pepsicoUsers?.map(u => u.id) || [];

        let stellantisCount = 0;
        let pepsicoCount = 0;

        for (let i = 0; i < sessions.length; i++) {
            let userId;

            if (i < 20 && stellantisUserIds.length > 0) {
                // First 20 go to Stellantis
                userId = stellantisUserIds[i % stellantisUserIds.length];
                stellantisCount++;
            } else if (pepsicoUserIds.length > 0) {
                // Rest go to Pepsico
                userId = pepsicoUserIds[(i - 20) % pepsicoUserIds.length];
                pepsicoCount++;
            } else if (stellantisUserIds.length > 0) {
                // Fallback to Stellantis
                userId = stellantisUserIds[i % stellantisUserIds.length];
                stellantisCount++;
            }

            if (userId) {
                await supabase
                    .from('sessions')
                    .update({ user_id: userId })
                    .eq('id', sessions[i].id);
            }
        }

        console.log(`\n✓ Assigned ${stellantisCount} sessions to Stellantis users`);
        console.log(`✓ Assigned ${pepsicoCount} sessions to Pepsico users`);

        // Show final distribution
        console.log('\nFinal distribution:');

        if (stellantisUsers) {
            for (const user of stellantisUsers) {
                const { count } = await supabase
                    .from('sessions')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);
                console.log(`  [Stellantis] ${user.name}: ${count} sessions`);
            }
        }

        if (pepsicoUsers) {
            for (const user of pepsicoUsers) {
                const { count } = await supabase
                    .from('sessions')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);
                console.log(`  [Pepsico] ${user.name}: ${count} sessions`);
            }
        }

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
