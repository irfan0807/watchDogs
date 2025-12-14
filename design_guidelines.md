# Design Guidelines: Encrypted Terminal Messenger

## Architecture Decisions

### Authentication
**Auth Required** - Military-grade encrypted messaging requires user registration:
- **Registration Flow:**
  - Username creation (no email/phone required for privacy)
  - Automatic cryptographic key generation (Signal Protocol key pairs)
  - Secure passphrase creation (optional, for key backup/recovery)
  - Display recovery key (must be saved by user)
- **No traditional SSO** - Privacy-focused, local key generation
- **Account Screen includes:**
  - Username and user ID
  - QR code for contact pairing
  - Safety number display for verification
  - Export/backup encryption keys
  - Delete account (wipes all local data and keys)

### Navigation
**Tab Navigation (4 tabs with floating action button):**
- **Chats** - Main conversation list
- **Contacts** - Contact management and verification
- **Scan** - Floating action button (QR scanner overlay)
- **Profile** - Settings and security options

### Screen Specifications

#### 1. Registration/Onboarding
- **Purpose:** Create secure identity and generate encryption keys
- **Layout:**
  - Transparent header with "Skip" button (right) only on username screen
  - Scrollable form with terminal-style input fields
  - Submit button below form
  - Progress indicator showing 3 steps: Username → Keys → Recovery
- **Components:** Text inputs (terminal style), progress dots, monospace labels, "Generate Keys" button with loading animation
- **Safe Area:** Top: insets.top + Spacing.xl, Bottom: insets.bottom + Spacing.xl

#### 2. Chat List (Main Tab)
- **Purpose:** View all conversations, access chats
- **Layout:**
  - Custom transparent header with "Terminal Messenger" title (left), search icon (right)
  - Scrollable list of chat items
  - No floating elements
- **Components:** 
  - Search bar (toggle visibility)
  - Chat list items showing: contact name, last message preview (encrypted indicator), timestamp, unread badge, online status dot
  - Empty state: "No active chats" with scan QR prompt
- **Safe Area:** Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl

#### 3. Individual Chat Screen
- **Purpose:** Send/receive encrypted messages
- **Layout:**
  - Custom header with contact name, encryption status icon (left: back button, right: menu with verify/settings)
  - Scrollable message list (inverted)
  - Fixed message input bar at bottom with encryption toggle
- **Components:**
  - Message bubbles (sent/received with different styles)
  - Self-destruct timer indicator on messages
  - "Message deleted" tombstone for destroyed messages
  - Terminal-style text input with send button
  - Encryption status banner (toggleable)
- **Safe Area:** Top: headerHeight + Spacing.md, Bottom: tabBarHeight + Spacing.md

#### 4. Contacts Tab
- **Purpose:** Manage contacts, verify identities
- **Layout:**
  - Default header with "Contacts" title
  - Scrollable list of contacts
  - Floating action button (bottom-right) to add contact via QR
- **Components:**
  - Contact list items with: avatar placeholder, username, verification status badge, online/offline indicator
  - Empty state with "Scan QR to add contact" CTA
- **Safe Area:** 
  - Top: headerHeight + Spacing.xl
  - Bottom: tabBarHeight + Spacing.xl
  - FAB: bottom: tabBarHeight + Spacing.xl, right: Spacing.xl

#### 5. QR Scanner (Floating Action)
- **Purpose:** Scan contact QR codes for pairing
- **Layout:**
  - Full-screen modal overlay
  - Camera viewfinder with terminal-style border
  - Close button (top-left)
  - "Or enter code manually" button below viewfinder
- **Components:** Camera view, scanning reticle animation, code input modal
- **Safe Area:** Top: insets.top + Spacing.xl, Bottom: insets.bottom + Spacing.xl

#### 6. Profile/Settings Tab
- **Purpose:** User profile, security settings, app preferences
- **Layout:**
  - Default header with "Profile" title
  - Scrollable form/list
  - Grouped settings sections
- **Components:**
  - User's QR code (for others to scan)
  - Username display
  - Settings groups: Security, Privacy, Appearance, Account
  - Self-destruct default timer settings
  - Encryption preferences
  - Log out button (red, at bottom)
- **Safe Area:** Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl

#### 7. Contact Verification Screen
- **Purpose:** Verify contact's safety number
- **Layout:**
  - Default header with "Verify [Contact]" title, back button (left)
  - Scrollable content
  - "Mark as Verified" button at bottom
- **Components:**
  - Both safety numbers displayed (yours and contact's)
  - QR code for in-person verification
  - Verification instructions
  - Toggle for verified status
- **Safe Area:** Top: headerHeight + Spacing.xl, Bottom: insets.bottom + Spacing.xl

## Design System

### Watchdogs Terminal Theme

**Color Palette:**
- **Background:** Deep black (#0A0E14) with subtle scan-line texture
- **Surface:** Dark charcoal (#151922)
- **Primary:** Electric cyan (#00F5FF) - main accent, active elements
- **Secondary:** Neon green (#39FF14) - success, online status, encryption indicators
- **Warning:** Amber (#FFB800) - unverified contacts
- **Danger:** Red (#FF0055) - delete, errors, self-destruct
- **Text Primary:** Light cyan (#E6F4F1) - main text
- **Text Secondary:** Dimmed cyan (#7A8C8E) - timestamps, metadata
- **Text Tertiary:** Dark cyan (#3D4F51) - placeholders

**Typography:**
- **Font Family:** "Courier New" or "Source Code Pro" (monospace)
- **Headers:** 18-24px, bold, letter-spacing: 1.2px, uppercase
- **Body:** 14-16px, regular
- **Metadata:** 12px, regular, slightly dimmed
- **Terminal Prompt:** 14px with ">" or "$" prefix

**Visual Design:**
- **Terminal Aesthetic:** 
  - Monospace fonts throughout
  - Subtle CRT scan-line effect on backgrounds
  - Glowing text effects on primary actions
  - ASCII art separators between sections
- **No emojis** - Use terminal symbols (•, >, $, [✓], [X])
- **Icons:** Feather icons from @expo/vector-icons in cyan/green
- **Borders:** 1px solid cyan with low opacity (#00F5FF22)
- **Cards/Surfaces:** Dark background with subtle cyan border glow
- **Floating Elements:** 
  - Floating Action Button (QR scanner): Electric cyan circle with shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2
  - Use subtle drop shadow only for FAB

**Interaction Design:**
- **Touchable Feedback:**
  - Buttons: Glow effect on press (increase cyan border brightness)
  - List items: Darken background + subtle cyan highlight on press
  - Inputs: Cyan border glow on focus
- **Animations:**
  - Typing indicator: Blinking terminal cursor
  - Message send: Glitch effect transition
  - Encryption toggle: Fade with lock icon animation
  - Loading states: Terminal-style spinner or progress bar

**Message Bubbles:**
- **Sent messages:** Right-aligned, dark surface with cyan left border (3px)
- **Received messages:** Left-aligned, darker surface with green left border (3px)
- **Encrypted indicator:** Small lock icon in corner, green when encrypted
- **Self-destruct timer:** Countdown display in message footer, amber color

**Status Indicators:**
- **Online:** Bright green dot (#39FF14)
- **Offline:** Dim gray dot (#3D4F51)
- **Typing:** Green blinking ellipsis
- **Encrypted:** Green lock icon
- **Unencrypted:** Red unlock icon (warning)
- **Verified contact:** Green checkmark badge
- **Unverified contact:** Amber warning triangle

**Accessibility:**
- High contrast ratio (cyan/green on black meets WCAG AAA)
- Minimum touch target: 44x44 points
- Screen reader labels for all icons and status indicators
- Haptic feedback for critical actions (delete, send)
- Alternative to QR scanning (manual code entry)

### Critical Assets
1. **Terminal Scan-line Texture:** Subtle overlay for CRT effect
2. **Glitch Effect Assets:** For transition animations
3. **Terminal Icons Set:**
   - Encrypted lock (filled and outline)
   - QR code scanner reticle
   - Self-destruct timer icon
   - Verification badge
4. **No user avatars** - Use terminal-style initials in monospace (e.g., "[JD]", "[AK]") on colored backgrounds