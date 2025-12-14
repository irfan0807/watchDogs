# Watchdog Messenger

## Overview

Watchdog is a privacy-focused encrypted messaging application built with React Native (Expo) for cross-platform mobile/web support and an Express.js backend. The app emphasizes military-grade encryption using the TweetNaCl library for end-to-end encrypted communications, with features like self-destructing messages, contact verification via safety numbers, and QR code-based contact pairing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 54 for cross-platform (iOS, Android, Web) support
- **Navigation**: React Navigation v7 with a hybrid structure:
  - Native Stack Navigator for root-level screens (Register, Chat, Scanner, VerifyContact)
  - Bottom Tab Navigator for main app tabs (Chats, Contacts, Profile)
- **State Management**: 
  - TanStack React Query for server state and API caching
  - React Context (AuthContext) for authentication state
- **Styling**: Custom theming system with dark terminal-inspired aesthetic (cyan/green accent colors)
- **Animations**: React Native Reanimated for smooth UI interactions

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Real-time Communication**: Socket.io for instant messaging, typing indicators, and online status
- **API Structure**: RESTful endpoints under `/api/` prefix with corresponding socket events for real-time features
- **Database ORM**: Drizzle ORM with PostgreSQL

### Security & Encryption
- **Encryption Library**: TweetNaCl (NaCl) for public-key cryptography
- **Key Generation**: Automatic generation of identity key pairs and signed pre-keys during registration
- **Message Encryption**: Box encryption using recipient's public key and sender's secret key
- **Safety Numbers**: Generated from combined public keys for contact verification
- **Self-Destructing Messages**: Optional timed message deletion (30s to 1h options)

### Data Storage
- **Server-side**: PostgreSQL with Drizzle ORM
  - Users table: stores credentials, public keys, pairing codes, online status
  - Contacts table: stores contact relationships and verification status
  - Messages table: stores encrypted message content with delivery/read status
  - Contact Requests table: handles pending contact additions
- **Client-side**: AsyncStorage (native) / localStorage (web) for:
  - User session data
  - Private encryption keys
  - App settings (encryption toggle, self-destruct timer)

### Path Aliases
- `@/` maps to `./client/` for frontend code
- `@shared/` maps to `./shared/` for shared types and schemas

## External Dependencies

### Database
- PostgreSQL (required, configured via `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe database operations

### Real-time Communication
- Socket.io for WebSocket-based messaging

### Cryptography
- TweetNaCl for end-to-end encryption
- tweetnacl-util for encoding/decoding utilities

### UI/UX Libraries
- Expo SDK modules (blur, haptics, image, splash-screen)
- React Native Gesture Handler and Reanimated for animations
- Expo Vector Icons (Feather icon set)

### Build & Development
- Expo CLI for development and builds
- TypeScript for type safety
- ESLint + Prettier for code quality