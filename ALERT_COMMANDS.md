# News Alert Commands

This document describes the new admin commands for managing news alerts in the Discord bot.

## Overview

News alerts allow administrators to configure automatic notifications for forex news events in specific channels. Each channel can only have **one alert configuration** at a time. If you create a new alert for a channel that already has one, it will update the existing alert instead of creating a duplicate.

## Database Schema

The alerts are stored in the `NewsAlert` table with the following structure:
- **serverId**: The Discord server/guild ID
- **channelId**: The Discord channel ID
- **impact**: Array of impact levels to filter (LOW, MEDIUM, HIGH, HOLIDAY)
- **currency**: Array of currencies to filter (USD, EUR, GBP, JPY, CHF, AUD, CAD, CNY, NZD)
- **alertType**: Array of alert timing types (FIVE_MINUTES_BEFORE, ON_NEWS_DROP)

A unique constraint on `[serverId, channelId]` ensures only one alert per channel.

## Commands

### 1. `/create-alert`
Creates a new news alert for the current channel or updates an existing one.

**Options:**
- `impact` (optional): Comma-separated impact levels (e.g., "HIGH,MEDIUM")
- `currency` (optional): Comma-separated currencies (e.g., "USD,EUR,GBP")
- `alert_type` (optional): Comma-separated alert types (e.g., "FIVE_MINUTES_BEFORE,ON_NEWS_DROP")
  - Defaults to both types if not specified

**Requirements:**
- Must be used in a server
- Must be used in a text or announcement channel
- Requires Administrator permissions
- At least one currency or impact level must be specified

**Example:**
```
/create-alert impact:HIGH,MEDIUM currency:USD,EUR alert_type:FIVE_MINUTES_BEFORE
```

**Behavior:**
- If an alert already exists for the channel, it will be updated
- Creates the server and channel records in the database if they don't exist
- Returns a confirmation embed with the alert configuration

### 2. `/list-alerts`
Lists all news alerts configured for the server.

**Requirements:**
- Must be used in a server
- Requires Administrator permissions

**Output:**
- Displays an embed with all alerts
- Shows channel, impact levels, currencies, and alert types for each alert
- Includes alert IDs for use with edit/delete commands

### 3. `/edit-alert`
Updates an existing news alert.

**Options:**
- `id` (required): The ID of the alert to edit
- `impact` (optional): New comma-separated impact levels
- `currency` (optional): New comma-separated currencies
- `alert_type` (optional): New comma-separated alert types

**Requirements:**
- Must be used in a server
- Requires Administrator permissions
- At least one field to update must be provided

**Example:**
```
/edit-alert id:abc123 impact:HIGH currency:USD,EUR,GBP
```

**Behavior:**
- Only updates the fields that are provided
- Returns a confirmation embed with the updated configuration

### 4. `/delete-alert`
Deletes a news alert.

**Options:**
- `id` (required): The ID of the alert to delete

**Requirements:**
- Must be used in a server
- Requires Administrator permissions

**Example:**
```
/delete-alert id:abc123
```

**Behavior:**
- Permanently removes the alert from the database
- Returns a confirmation embed showing what was deleted

## Implementation Details

### Backend Components

1. **Repository** (`packages/api/src/repositories/newsAlert.repository.ts`):
   - `PrismaNewsAlertRepository`: Handles database operations for news alerts
   - Methods: `findById`, `findByServerId`, `findByChannelId`, `create`, `update`, `delete`, etc.

2. **Service** (`packages/api/src/services/newsAlert.service.ts`):
   - `NewsAlertService`: Business logic layer (Singleton pattern)
   - Handles server/channel creation if they don't exist
   - Prevents duplicate alerts per channel by updating instead of creating
   - Methods: `createNewsAlert`, `listNewsAlertsForServer`, `updateNewsAlert`, `deleteNewsAlert`, etc.

3. **Exports** (`packages/api/src/index.ts`):
   - Exports the repository, service, and NewsAlert type
   - Exports AlertType enum from the models

### Frontend Components

1. **CommandBuilder** (`apps/discord/src/bot/utils/CommandBuilder.ts`):
   - Added `addAlertTypeOption()` method for alert type selection
   - Imports AlertType enum from @repo/api

2. **Admin Commands** (`apps/discord/src/bot/commands/admin/`):
   - `createAlert.ts`: Creates or updates alerts
   - `listAlerts.ts`: Lists all alerts for a server
   - `editAlert.ts`: Updates existing alerts
   - `deleteAlert.ts`: Deletes alerts

### Automatic Discovery

The bot automatically discovers and loads all commands from the `commands` folder structure. No additional registration is needed beyond creating the command files in the correct location.

## Alert Types Explained

- **FIVE_MINUTES_BEFORE**: Send an alert 5 minutes before the news event occurs
- **ON_NEWS_DROP**: Send an alert when the news is actually released

## Usage Tips

1. **Get Alert IDs**: Use `/list-alerts` to see all alerts and their IDs
2. **One Per Channel**: Remember that each channel can only have one alert configuration
3. **Update Instead of Create**: If an alert exists, `/create-alert` will update it instead of failing
4. **Filter Flexibility**: You can filter by impact, currency, or both
5. **Default Alert Types**: If you don't specify alert types, both types will be enabled

## Testing

To test the commands:

1. Build the packages:
   ```bash
   pnpm run build --filter=@repo/api
   pnpm run build --filter=discord-bot
   ```

2. Deploy the commands to Discord:
   ```bash
   cd apps/discord
   pnpm run discord:deploy
   ```

3. Restart your bot

4. Use the commands in your Discord server

## Future Enhancements

Potential improvements could include:
- Bulk delete/edit operations
- Copy alert configuration from one channel to another
- Alert templates for common configurations
- Test/preview alert functionality
- Alert scheduling (enable/disable at certain times)

