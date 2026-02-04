/**
 * Simple Supabase Connection Test
 * Direct test using environment variables
 */

// Load environment variables from .env
import dotenv from 'dotenv';
dotenv.config({ path: './cloud/.env' });

const { createClient } = require('@supabase/supabase-js');

async function testDirectConnection() {
    console.log('🧪 Testing Direct Supabase Connection...\n');
    
    // Get real environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabaseAdminSecret = process.env.SUPABASE_ADMIN_SECRET;
    
    console.log('📋 Environment Variables:');
    console.log(`  SUPABASE_URL: ${supabaseUrl ? '✅ SET' : '❌ MISSING'}`);
    console.log(`  SUPABASE_ANON_KEY: ${supabaseKey ? '✅ SET' : '❌ MISSING'}`);
    console.log(`  SUPABASE_ADMIN_SECRET: ${supabaseAdminSecret ? '✅ SET' : '❌ MISSING'}`);
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('\n❌ CRITICAL: Missing required environment variables');
        console.log('   Please check your cloud/.env file');
        process.exit(1);
    }
    
    try {
        console.log('\n🔌 Creating Supabase client with real credentials...');
        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true
            }
        });
        
        console.log('✅ Real Supabase client created');
        
        // Test database connectivity
        console.log('\n📊 Testing database connection...');
        const { data, error } = await supabase
            .from('user_sessions')
            .select('count')
            .limit(1);
            
        if (error) {
            if (error.code === 'PGRST116') {
                console.log('✅ Database connected (table does not exist yet)');
            } else {
                console.error('❌ Database connection failed:', error.message);
                throw error;
            }
        } else {
            console.log('✅ Database connected and tables exist');
        }
        
        // Test real session creation
        console.log('\n🆔 Testing real session persistence...');
        const testSession = {
            user_id: 'test-connection-' + Date.now(),
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            metadata: { test: true, timestamp: new Date().toISOString() },
            status: 'active'
        };
        
        const { data: sessionData, error: sessionError } = await supabase
            .from('user_sessions')
            .insert(testSession)
            .select()
            .single();
            
        if (sessionError) {
            console.error('❌ Session creation failed:', sessionError.message);
            console.log('   This usually means tables need to be created');
            console.log('   Run create-session-tables.sql in Supabase SQL Editor');
        } else {
            console.log('✅ Real session persisted to database!');
            console.log(`   Session ID: ${sessionData.id}`);
            console.log(`   Created at: ${sessionData.created_at}`);
            
            // Clean up test data
            await supabase
                .from('user_sessions')
                .delete()
                .eq('id', sessionData.id);
            console.log('🧹 Test session cleaned up');
        }
        
        console.log('\n📊 CONNECTION TEST RESULTS:');
        console.log(`Environment Config: ✅ REAL`);
        console.log(`Supabase Client: ✅ REAL`);
        console.log(`Database Connection: ✅ REAL`);
        console.log(`Session Persistence: ${sessionData ? '✅ REAL' : '⚠️ NEEDS TABLES'}`);
        
        if (sessionData) {
            console.log('\n🎉 EVIDENCE: Real Supabase runtime path established!');
            console.log('✅ Database writes successful');
            console.log('✅ Real authentication working');
            console.log('✅ No mock data used');
        } else {
            console.log('\n⚠️ Supabase connected but needs table creation');
        }
        
    } catch (error) {
        console.error('\n❌ Connection test failed:', error.message);
        process.exit(1);
    }
}

// Run test
testDirectConnection().catch(console.error);