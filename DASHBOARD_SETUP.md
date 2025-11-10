# Discord Server Dashboard Setup

This document explains the newly implemented Discord server dashboard feature.

## Overview

Users can now log in to the website and see all their Discord servers where they have admin permissions. They can click on any server to view and manage the bot's schedules for that server.

## What Was Implemented

### 1. Backend (API Package)

#### Discord Service (`packages/api/src/services/discord.service.ts`)
- Fetches user's Discord guilds from Discord API using OAuth access token
- Checks bot installation status by querying the database
- Filters guilds to show only those where user has admin permissions
- Provides guild icon URLs and schedule counts

#### Guild Router (`packages/api/src/routers/guild.router.ts`)
- `getMyGuilds`: Returns all user's Discord servers with bot status
- `getGuildDetails`: Returns detailed information for a specific server including schedules
- `getGuildSchedules`: Returns all schedules for a specific server

#### Schedule Service Enhancement
- Added `getSchedulesByServerId()` method to fetch schedules for a specific server

### 2. Frontend (Next.js App)

#### Components
- **ServerCard** (`apps/nextjs/src/app/components/server-card.tsx`): Card component displaying server info
- **ServerGrid** (`apps/nextjs/src/app/components/server-grid.tsx`): Grid layout for displaying servers

#### Pages
- **Dashboard** (`apps/nextjs/src/app/dashboard/page.tsx`): Main dashboard showing all servers
- **Server Detail** (`apps/nextjs/src/app/dashboard/server/[guildId]/page.tsx`): Individual server management page

## Features

### Dashboard Page (`/dashboard`)
- Shows all Discord servers where user has admin permissions
- Displays bot installation status for each server
- Shows schedule count for each server
- Provides "Invite Bot" link if no servers found
- Authentication required (redirects to home if not logged in)

### Server Detail Page (`/dashboard/server/[guildId]`)
- Displays server icon and name
- Lists all configured schedules for the server
- Shows schedule details (time, timezone, frequency, impact, currencies)
- Provides placeholder buttons for creating/editing/deleting schedules
- Back navigation to main dashboard

## Authentication & Authorization

### OAuth Scopes
The Better Auth configuration includes the following Discord scopes:
- `identify`: Get user's basic Discord profile
- `guilds`: Access user's Discord servers

### Access Control
- Users can only see servers where they have admin permissions (Administrator or Manage Server)
- The backend verifies user access before returning guild details
- Access tokens are stored in the database and validated before API calls

## UI/UX Features

### Design Elements
- Modern card-based design with hover effects
- Loading states with animated spinners
- Error handling with user-friendly messages
- Status badges showing bot installation status
- Empty states with helpful call-to-action buttons
- Responsive grid layout (1 column on mobile, 2 on tablet, 3 on desktop)

### Visual Indicators
- Green "Active" badge for servers with bot installed
- Schedule count display
- Server icons (or first letter fallback)
- Animated hover effects on cards

## How It Works

### Flow

1. **User logs in** with Discord OAuth
   - Better Auth handles authentication
   - Access token stored in database

2. **User navigates to /dashboard**
   - Frontend makes tRPC call to `guild.getMyGuilds`
   - Backend fetches guilds from Discord API using stored access token
   - Backend checks database for bot installation status
   - Backend filters to only admin guilds
   - Returns enriched guild data to frontend

3. **User clicks on a server**
   - Navigates to `/dashboard/server/[guildId]`
   - Frontend makes tRPC call to `guild.getGuildDetails`
   - Backend verifies user has access to this guild
   - Backend fetches schedules from database
   - Returns guild details and schedules

## Database Schema

The existing schema supports this feature:
- `DiscordServer`: Stores guild IDs where bot is installed
- `Schedule`: Stores schedule configurations linked to servers
- `Account`: Stores Discord OAuth access tokens

## API Endpoints

### tRPC Routes

#### Queries
```typescript
// Get all user's guilds with bot status
guild.getMyGuilds.useQuery()

// Get specific guild details
guild.getGuildDetails.useQuery({ guildId: "123..." })

// Get guild schedules
guild.getGuildSchedules.useQuery({ guildId: "123..." })
```

#### Mutations
```typescript
// Create a new schedule
guild.createSchedule.useMutation({
  guildId: "...",
  channelId: "...",
  hour: 9,
  minute: 0,
  timeZone: Timezone.DEFAULT,
  newsScope: NewsScope.DAILY,
  frequency: Frequency.DAILY,
  market: Market.FOREX,
  impact: [Impact.HIGH, Impact.MEDIUM],
  currency: [Currency.USD, Currency.EUR],
  timeDisplay: TimeDisplay.FIXED,
})

// Update an existing schedule
guild.updateSchedule.useMutation({
  guildId: "...",
  scheduleId: "...",
  // Any schedule fields to update
  hour: 10,
  impact: [Impact.HIGH],
})

// Delete a schedule
guild.deleteSchedule.useMutation({
  guildId: "...",
  scheduleId: "...",
})
```

## Schedule Management (IMPLEMENTED)

### Create Schedule
- **Form Component**: `schedule-form.tsx` with React Hook Form
- **Validation**: Zod schema validation for all fields
- **Features**:
  - Channel ID input with validation
  - Time selection (hour 0-23, minute 0-59)
  - Timezone dropdown with all available zones
  - Frequency selection (DAILY, WEEKDAYS, WEEKENDS, WEEKLY)
  - Market selection (FOREX, CRYPTO, ENERGY, METAL, STOCK)
  - Multi-select impact levels (LOW, MEDIUM, HIGH, HOLIDAY)
  - Multi-select currencies (USD, EUR, GBP, JPY, etc.)
  - Time display preference (FIXED, RELATIVE)
  - News scope (DAILY, WEEKLY, TOMORROW)

### Edit Schedule
- Pre-fills form with existing schedule data
- Uses same form component as create
- Updates schedule via tRPC mutation
- Auto-refreshes data on success

### Delete Schedule
- Two-click confirmation to prevent accidental deletion
- Loading state during deletion
- Auto-refreshes schedule list
- 3-second auto-cancel for safety

### Schedule Table
- **Responsive table layout** displaying:
  - Time (formatted HH:MM)
  - Timezone badge
  - Frequency
  - Market badge
  - Impact levels (multiple badges)
  - Currencies (shows first 3 + count)
  - Action buttons (Edit/Delete)
- Hover effects and transitions
- Empty state with helpful message

### Modal System
- Backdrop with blur effect
- Keyboard support (ESC to close)
- Click outside to close
- Smooth animations with Framer Motion
- Prevents body scroll when open
- Responsive sizing

## Next Steps / Future Enhancements

1. **Real-time Updates**
   - Add refresh button or auto-refresh
   - Show bot online status
   - Display last schedule execution time

2. **Advanced Features**
   - Bulk schedule operations
   - Schedule templates
   - Import/Export schedules
   - Schedule duplication
   - Server settings page
   - Bot configuration options

3. **Permissions**
   - Fine-grained permission checks
   - Role-based access within servers
   - Audit logs for schedule changes

4. **UI Improvements**
   - Toast notifications instead of alerts
   - Better error handling UI
   - Schedule preview before creation
   - Bulk actions for schedules

## Testing

To test the feature:

1. Ensure you have Discord OAuth credentials configured in `.env`
2. Start the Next.js app: `pnpm dev`
3. Navigate to the website and log in with Discord
4. Go to `/dashboard` to see your servers
5. Click on any server to view its details

## Troubleshooting

### "No Discord account found"
- User hasn't logged in with Discord
- Solution: Log in again

### "Access token expired"
- OAuth token has expired
- Solution: User needs to re-authenticate

### No servers showing
- User doesn't have admin permissions in any servers
- Bot hasn't been invited to any servers
- Solution: Invite bot or verify permissions

### Error loading servers
- Discord API might be down
- Network issues
- Invalid OAuth credentials
- Solution: Check logs, verify credentials, retry

