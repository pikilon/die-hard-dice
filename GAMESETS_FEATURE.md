# Gamesets Store Feature

## Overview
The gamesets store allows users to manage multiple game configurations (gamesets) with persistent storage.

## Features

### System Gamesets
- **Settlers of Catan**: Pre-configured with 2d6 dice (default)
- System gamesets cannot be deleted
- When you modify a system gameset (change title, add/remove dice), a new custom gameset is automatically created

### Custom Gamesets
- Created automatically when you modify a system gameset
- Can be created manually by cloning any gameset
- Stored in localStorage and persist across browser sessions
- Can be deleted (unlike system gamesets)

### UI Components

#### Gameset Selector (in the drawer)
Located at the top of the game drawer, the selector provides:

1. **Dropdown Menu**
   - Lists all available gamesets (system and custom)
   - Shows "System Gamesets" and "Custom Gamesets" groups
   - Switch between gamesets instantly

2. **Clone Button** (📋)
   - Creates a copy of the current gameset
   - New gameset is named with " (copy)" suffix
   - Automatically switches to the new clone

3. **Remove Button** (🗑️)
   - Deletes the current custom gameset
   - Disabled for system gamesets
   - Shows confirmation dialog before deletion
   - Automatically switches to default system gameset after deletion

## Implementation Details

### Files Created/Modified

#### New Files:
- `js/modules/gamesetsStore.js` - Core store logic with localStorage persistence
- `js/modules/GamesetSelectorComponent.js` - UI component for gameset management

#### Modified Files:
- `js/modules/gameState.js` - Integrated with gamesetsStore, syncs changes automatically
- `js/modules/DiceGameSetDrawerComponent.js` - Added gameset selector component

### Storage
Custom gamesets are stored in localStorage under the key: `die-hard-dice-custom-gamesets`

Structure:
\`\`\`json
{
  "customGamesets": [
    {
      "id": "custom_timestamp_randomId",
      "title": "My Custom Game",
      "diceDictionary": [...],
      "gameSet": [...],
      "isSystem": false
    }
  ],
  "currentGamesetId": "system_settlers"
}
\`\`\`

### Auto-Clone Behavior
When you modify a system gameset in any way:
- Change the title
- Add a custom die
- Remove a die
- Change dice quantities

The system automatically:
1. Creates a new custom gameset with your changes
2. Switches to the new custom gameset
3. Saves it to localStorage

This ensures system gamesets remain unchanged while preserving your modifications.

## Usage Example

### Switching Gamesets
1. Open the game drawer (☰ button on the left)
2. Use the "Gameset" dropdown at the top
3. Select any gameset from the list
4. The game immediately loads the selected gameset

### Cloning a Gameset
1. Open the drawer
2. Select the gameset you want to clone
3. Click the "📋 Clone" button
4. A new custom gameset is created with " (copy)" suffix
5. You're automatically switched to the new gameset

### Creating Custom Gamesets
There are two ways to create a custom gameset:

**Method 1: Modify a system gameset**
- Start with a system gameset (e.g., "Settlers of Catan")
- Make any change (title, dice, etc.)
- A custom gameset is automatically created

**Method 2: Clone any gameset**
- Use the Clone button on any gameset
- Modify the clone as needed

### Deleting Custom Gamesets
1. Select the custom gameset you want to delete
2. Click the "🗑️ Remove" button
3. Confirm the deletion in the dialog
4. The gameset is deleted and you're switched to the default system gameset

## Technical Notes

### State Synchronization
- The `gameState` module subscribes to `gamesetsStore` changes
- Any modification through `gameState` methods automatically syncs to the store
- URL state still works for sharing individual configurations
- localStorage provides persistence across sessions

### ID Format
- System gamesets: `system_<name>` (e.g., "system_settlers")
- Custom gamesets: `custom_<timestamp>_<randomId>` (e.g., "custom_1737208800000_a1b2c3d4e")
