// KELDON FLOW REGISTRY V1
// In V2 this will be fetched from Cloud or synced. For V1 it is bundled.

export const FlowRegistry = {
    'demo_google_search': {
        id: 'demo_google_search',
        steps: [
            {
                id: 's1',
                action: 'navigate',
                url: 'https://www.google.com'
            },
            {
                id: 's2',
                action: 'wait_for',
                selector: 'textarea[name="q"]',
                timeout: 5000
            },
            {
                id: 's3',
                action: 'fill',
                selector: 'textarea[name="q"]',
                value: '{{search_term}}'
            },
            {
                id: 's4',
                action: 'click',
                selector: 'input[name="btnK"]' // Might be hidden/tricky on Google, strictly demo
            }
        ]
    },
    'open_settings': {
        id: 'open_settings',
        steps: [
            {
                id: 's1',
                action: 'click',
                selector: '#settings-button' // Hypothetical ID
            },
            {
                id: 's2',
                action: 'wait_for',
                selector: '.settings-modal'
            }
        ]
    },
    'test_harness_flow': {
        id: 'test_harness_flow',
        steps: [
            { id: '1', action: 'fill', selector: '#test-input', value: 'Hello Keledon' },
            { id: '2', action: 'click', selector: '#test-btn' },
            { id: '3', action: 'wait_for', selector: '#success-msg', timeout: 3000 },
            { id: '4', action: 'read', selector: '#success-msg' }
        ]
    }
};
