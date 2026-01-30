// C:\KELEDON\agent\src\config\config.local.ts
export const CONFIG = {
  debug: false, // production
  tabRoles: {
    genesys: 'audio+ui',
    salesforce: 'audio+ui',
    default: 'ui-only'
  },
  endpoints: {
    supabase: 'https://isoyzcvjoevyphnaznkl.supabase.co',
    qdrant: 'https://keledon.tuyoisaza.com/qdrant',
    rpa: 'https://keledon.tuyoisaza.com/rpa',
    corsOrigins: ['https://keledon.tuyoisaza.com', 'chrome-extension://*']
  }
};