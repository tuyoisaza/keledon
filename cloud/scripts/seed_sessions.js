
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    console.log('Current URL:', supabaseUrl);
    console.log('Current Key (length):', supabaseKey ? supabaseKey.length : 0);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('🌱 Seeding Sessions Data...');

    const sessions = [
        {
            caller_id: '+1 (555) 123-4567',
            status: 'active',
            intent: 'check_order_status',
            confidence: 0.92,
            duration: 45
        },
        {
            caller_id: '+1 (555) 987-6543',
            status: 'completed',
            intent: 'book_appointment',
            confidence: 0.88,
            duration: 240
        },
        {
            caller_id: '+1 (555) 456-7890',
            status: 'escalated',
            intent: 'speak_to_agent',
            confidence: 0.65,
            duration: 120
        },
        {
            caller_id: '+1 (555) 111-2222',
            status: 'completed',
            intent: 'general_inquiry',
            confidence: 0.95,
            duration: 180
        },
        {
            caller_id: '+1 (555) 333-4444',
            status: 'active',
            intent: 'technical_support',
            confidence: 0.78,
            duration: 15
        }
    ];

    const { data, error } = await supabase
        .from('sessions')
        .insert(sessions)
        .select();

    if (error) {
        if (error.code === '42P01') {
            console.error('❌ Error: Table "sessions" does not exist. Please run the SQL in supabase-schema.sql first.');
        } else {
            console.error('❌ Error seeding sessions:', error.message);
        }
    } else {
        console.log(`✅ Successfully seeded ${data.length} sessions.`);
    }
}

seed();
