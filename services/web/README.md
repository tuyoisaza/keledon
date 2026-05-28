# Landing (Frontend) - React Application

## Overview
The `landing/` directory contains the React frontend application for KELEDON, built with Vite and TypeScript. This is the user-facing interface that provides the dashboard, knowledge management, workflow automation, and admin capabilities.

## Architecture
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom component library
- **State Management**: React Context API
- **Routing**: React Router v7
- **Real-time**: Socket.io client for backend communication
- **Data Tables**: TanStack React Table for data management

## Key Features
| Feature | Status | Description |
|---------|--------|-------------|
| Dashboard | ✅ Complete | Comprehensive overview with real-time metrics |
| Knowledge Base | ✅ Complete | RAG-powered knowledge management with search |
| Workflow Automation | ✅ Complete | Visual flow builder and execution monitoring |
| Session Management | ✅ Complete | Real-time session tracking and history |
| Admin Interface | ✅ Complete | Comprehensive admin panel with role-based access |
| SuperAdmin | ✅ Complete | Advanced system configuration and monitoring |

## Folder Structure
```
landing/
├── public/                # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/             # Main application pages
│   ├── hooks/             # Custom React hooks
│   ├── context/           # React Context providers
│   ├── lib/               # Utility functions and constants
│   ├── types/             # TypeScript interfaces and types
│   └── main.tsx           # Application entry point
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Environment Variables
Create `.env` file in the root directory:
```
VITE_API_URL=/                  # API base URL (relative for same-origin)
VITE_SUPABASE_URL=https://...   # Supabase project URL
VITE_SUPABASE_ANON_KEY=...      # Supabase anonymous key
VITE_NODE_ENV=development       # Environment mode
```

## Integration Points
- **Backend**: Communicates with cloud/ backend via REST APIs and WebSocket
- **Chrome Extension**: Uses Supabase for authentication and data synchronization
- **RAG System**: Integrates with Qdrant vector store for knowledge retrieval
- **Real-time**: Socket.io for live updates and notifications

## Testing
- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Cypress (planned)
- **Type Safety**: TypeScript with strict mode enabled
- **Accessibility**: Built with accessibility best practices

## Build Process
The frontend is built using Vite's optimized build process:
1. TypeScript compilation
2. Tree shaking and code splitting
3. Asset optimization (images, fonts)
4. Production minification
5. Bundle analysis available via `npm run analyze`

## Performance Metrics
- **Bundle Size**: ~2.3MB (target: <2.0MB)
- **Load Time**: ~800ms (target: <500ms)
- **Lighthouse Score**: 92+ (accessibility, performance, SEO)
- **Memory Usage**: Optimized for low memory footprint

## Future Enhancements
- **Code Splitting**: Dynamic imports for large components
- **Caching Strategy**: Service workers for offline support
- **Internationalization**: Multi-language support
- **Progressive Web App**: Enhanced PWA features
- **Accessibility**: WCAG 2.1 compliance audit

## Documentation
- Architecture diagrams: `docs/diagrams/frontend-architecture.svg`
- Component library: `docs/architecture/component-library.md`
- API reference: `docs/api/frontend-api.md`

This frontend application serves as the primary user interface for the KELEDON system, providing a seamless experience for voice AI assistance, browser automation, and knowledge management.