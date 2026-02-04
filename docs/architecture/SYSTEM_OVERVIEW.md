# KELEDON Architecture Overview

## System Components

KELEDON V1 consists of four primary components working together to provide an autonomous web automation system:

### 1. Browser Agent (Chrome Extension)
**Purpose**: Client-side component that interacts with web pages and captures user interactions
**Technology**: JavaScript (ES6+), Chrome Extension Manifest V3
**Key Features**:
- Audio capture and STT processing
- WebSocket communication with cloud backend
- UI automation (RPA) execution
- Session management
- Command execution (TTS, UI steps)

### 2. Cloud Backend (NestJS)
**Purpose**: Server-side component that processes events and makes decisions
**Technology**: Node.js, TypeScript, Socket.IO, PostgreSQL
**Key Features**:
- WebSocket gateway for agent connections
- Session persistence and management
- Decision engine for processing events
- Command generation and dispatch
- User management and authentication
- API for configuration and monitoring

### 3. Database Layer (PostgreSQL + Vector)
**Purpose**: Persistent data storage and retrieval
**Components**:
- **PostgreSQL**: Core data (sessions, events, users)
- **Qdrant Vector**: Semantic search and embeddings storage
- **Redis**: Session caching and real-time coordination

### 4. Infrastructure (Docker Compose)
**Purpose**: Deployment orchestration and service management
**Components**:
- Docker containers for all services
- Nginx reverse proxy
- SSL/TLS termination
- Health monitoring and logging

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Browser Agent (Extension)                │
│                                                       │
│  ┌───────────────┐    ┌──────────────┐    │
│  │ Audio Capture │    │ UI Automation │    │
│  └───────────────┘    └──────────────┘    │
│          │                    │               │
│          │                    │               │
│          └─────────────┬─────────────────┘
│                     │
│               WebSocket Events
│                     │
│          ┌───────────────▼─────────────────┐
│          │                               │
│          │      Cloud Backend (API)      │
│          │                               │
│          │  ┌───────────────────────┐ │
│          │  │ Decision Engine      │ │
│          │  │ Session Management   │ │
│          │  │ Command Generation   │ │
│          │  └───────────────────────┘ │
│          │                               │
│          └───────────────┬─────────────────┘
│                     │
│               Commands
│                     │
│          ┌───────────────▼─────────────────┐
│          │                               │
│  Browser Agent (Extension)              │
│          │  ┌───────────────┐    │
│          │  │ TTS Output        │ │
│          │  │ UI Steps Execution  │ │
│          │  └───────────────┘    │
│          └─────────────────────────────────────────────────┘
│
└─────────────────────────────────────────────────────────────────┘

    ↕ Database Layer (PostgreSQL + Vector + Redis)
```

## Service Interactions

### Session Lifecycle
1. **Session Creation**: Agent requests session, Cloud generates UUID
2. **Event Processing**: Audio → STT → Text Event → Cloud
3. **Decision Making**: Cloud processes event → generates command
4. **Command Execution**: Agent receives command → executes TTS/UI steps
5. **Result Reporting**: Agent sends result → Cloud stores event
6. **Session End**: Cloud terminates session, stores final state

### Event Types
- **text_input**: Speech-to-text transcription results
- **ui_result**: UI automation execution results
- **system**: System events (connection, errors, lifecycle)

### Command Types
- **say**: Text-to-speech synthesis
- **ui_steps**: UI automation instructions
- **mode**: Operating mode changes
- **stop**: Immediate execution halt

## Technology Stack

### Frontend (Browser Agent)
- **Runtime**: Chrome Extension Manifest V3
- **Language**: JavaScript ES6+, TypeScript
- **Communication**: Socket.IO Client
- **Audio**: Web Audio API, getUserMedia
- **Storage**: Extension storage API
- **Automation**: Content scripts, DOM manipulation

### Backend (Cloud Brain)
- **Runtime**: Node.js 20+
- **Framework**: NestJS
- **Language**: TypeScript
- **Communication**: Socket.IO Server
- **Database**: PostgreSQL via TypeORM
- **Caching**: Redis
- **Authentication**: JWT

### Database
- **Primary**: PostgreSQL 15+
- **Vector**: Qdrant for embeddings and semantic search
- **Cache**: Redis 7+ for session data
- **Schema**: Relational with JSONB for flexibility

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Proxy**: Nginx
- **SSL/TLS**: Production-grade certificates
- **Monitoring**: Health checks, metrics, logging

## Security Architecture

### Authentication & Authorization
- JWT-based authentication for API access
- Role-based access control (RBAC)
- Session-based authorization for agent actions
- API key management for external services

### Data Protection
- Data encryption at rest (AES-256)
- HTTPS/TLS for all communications
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

### Network Security
- Firewall rules for service exposure
- Rate limiting and DDoS protection
- SSL/TLS certificate management
- Secure WebSocket connections

## Performance Considerations

### Scalability
- Horizontal scaling of backend services
- Database connection pooling
- Redis clustering for session distribution
- Load balancing via Nginx
- CDN integration for static assets

### Reliability
- Service health monitoring
- Automatic failover mechanisms
- Circuit breaker patterns
- Graceful degradation strategies

### Optimization
- Database query optimization
- Response caching strategies
- Connection pooling
- Efficient data structures

## Development Workflow

### Local Development
```bash
# Start development environment
./scripts/setup-dev-environment.sh

# Start all services
docker-compose -f docker-compose.dev.v2.yml up

# Watch for changes
npm run dev:full
```

### Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run production tests
node test/production/production-test-cli.js run
```

### Deployment
```bash
# Deploy to staging
npm run build:staging
./scripts/deploy-staging.sh

# Deploy to production
npm run build:production
./scripts/deploy-production.sh
```

## Monitoring & Observability

### Logging
- Structured logging (JSON format)
- Log levels: error, warn, info, debug
- Log aggregation and rotation
- Real-time log streaming

### Metrics
- Application performance metrics (APM)
- Business metrics (sessions, success rates)
- Infrastructure metrics (CPU, memory, disk, network)
- Custom metrics and dashboards

### Health Checks
- Service health endpoints
- Database health verification
- WebSocket connection validation
- Automated health monitoring

## API Architecture

### RESTful APIs
```
GET  /health           - Service health check
GET  /sessions         - Session management
POST /sessions         - Create new session
GET  /sessions/:id      - Get session details
POST /events          - Submit agent events
GET  /events          - Get event history
```

### WebSocket APIs
```
/agent (namespace)    - Agent connections
  connect              - Agent connects
  event                - Submit brain event
  command              - Receive cloud command
  disconnect           - Agent disconnects
```

## Deployment Strategies

### Development Environment
- Local Docker Compose setup
- Hot reloading for development
- Mock external services
- Development databases

### Staging Environment
- Containerized deployment
- Production-like configuration
- Automated testing pipeline
- Integration with production data sources

### Production Environment
- Highly available deployment
- Load balancing across multiple instances
- SSL/TLS encryption
- Automated backups and monitoring
- Disaster recovery procedures

## Quality Assurance

### Code Quality
- ESLint and TypeScript strict mode
- Automated code formatting
- Code review processes
- Static analysis and security scanning

### Testing Strategy
- Unit tests for all core functions
- Integration tests for service interactions
- End-to-end tests for complete workflows
- Performance and load testing
- Security testing and vulnerability scanning

### Release Process
- Semantic versioning
- Automated build and test pipelines
- Staged rollouts
- Rollback capabilities

---

This architecture ensures KELEDON V1 provides a robust, scalable, and maintainable autonomous web automation system suitable for enterprise production environments.