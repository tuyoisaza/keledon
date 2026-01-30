const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const STARTUP_DEFAULTS = {
    auto_start: false,
    boot_order: 0,
    start_command: '',
    cwd: '',
    wait_url: '',
    requires_api_key: false,
    required_env: []
};

const withStartupDefaults = (metadata, overrides = {}) => ({
    ...STARTUP_DEFAULTS,
    ...metadata,
    ...overrides
});

const providers = [
    {
        id: 'whisper',
        type: 'stt',
        name: 'Whisper (OpenAI, open-weights)',
        description: 'Accurate speech recognition with open weights',
        status: 'production',
        is_enabled: true,
        metadata: withStartupDefaults({
            endpoint: '/stt/whisper',
            format: 'audio/wav',
            sample_rate: 16000,
            language: 'en',
            diarization: false
        })
    },
    {
        id: 'deepgram',
        type: 'stt',
        name: 'Deepgram',
        description: 'Low-latency streaming transcription',
        status: 'production',
        is_enabled: true,
        metadata: withStartupDefaults({
            endpoint: '/stt/deepgram',
            model: 'nova-2',
            language: 'en',
            diarization: false
        }, {
            requires_api_key: true,
            required_env: ['DEEPGRAM_API_KEY']
        })
    },
    {
        id: 'webspeech-stt',
        type: 'stt',
        name: 'Web Speech API',
        description: 'Browser-native speech recognition',
        status: 'experimental',
        is_enabled: true,
        metadata: withStartupDefaults({
            endpoint: '/stt/webspeech',
            language: 'en'
        })
    },
    {
        id: 'coqui-xtts-v2',
        type: 'tts',
        name: 'Coqui XTTS-v2',
        description: 'Multilingual, voice cloning ready',
        status: 'production',
        is_enabled: true,
        metadata: withStartupDefaults({
            endpoint: '/tts/coqui',
            voice_id: '',
            language: 'en',
            speed: 1.0
        })
    },
    {
        id: 'qwen3-tts',
        type: 'tts',
        name: 'Qwen3-TTS',
        description: 'Qwen3 eSpeak-NG compatible TTS stack',
        status: 'experimental',
        is_enabled: true,
        metadata: withStartupDefaults({
            endpoint: '/tts/qwen3',
            voice_id: '',
            voice_description: 'Calm, clear, empathetic support agent',
            language: 'en',
            speed: 1.0
        })
    },
    {
        id: 'webspeech-tts',
        type: 'tts',
        name: 'Web Speech API',
        description: 'Browser built-in voices',
        status: 'experimental',
        is_enabled: true,
        metadata: withStartupDefaults({
            endpoint: '/tts/webspeech',
            voice_name: '',
            language: 'en'
        })
    },
    {
        id: 'native-dom',
        type: 'rpa',
        name: 'Native DOM Automation',
        description: 'Browser APIs and DOM-native execution',
        status: 'production',
        is_enabled: true,
        metadata: withStartupDefaults({
            endpoint: '/rpa/native-dom',
            execution_mode: 'extension'
        })
    },
    {
        id: 'playwright',
        type: 'rpa',
        name: 'Playwright',
        description: 'Cross-browser automation with Playwright',
        status: 'production',
        is_enabled: true,
        metadata: withStartupDefaults({
            endpoint: '/rpa/playwright',
            headless: true
        })
    },
    {
        id: 'chrome-mv3',
        type: 'rpa',
        name: 'Chrome Extensions (MV3)',
        description: 'Manifest V3 extension automation',
        status: 'experimental',
        is_enabled: true,
        metadata: withStartupDefaults({
            endpoint: '/rpa/chrome-mv3',
            execution_mode: 'extension'
        })
    }
];

async function seed() {
    console.log('🌱 Seeding Provider Catalog...');
    const { data, error } = await supabase
        .from('provider_catalog')
        .upsert(providers, { onConflict: 'id' })
        .select();

    if (error) {
        console.error('❌ Error seeding provider catalog:', error.message);
        process.exit(1);
    }

    console.log(`✅ Seeded ${data.length} provider entries.`);
}

seed();
