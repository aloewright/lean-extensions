# Lean Extensions — Chrome/Brave Extension

## Overview

A Plasmo-based Chrome extension for managing browser extensions, collecting links for NotebookLM, searching the Chrome Web Store, and capturing pages. Built with a dark charcoal UI theme from tweakcn.

## Architecture

- **Framework**: Plasmo (Manifest V3, React + TypeScript)
- **UI Theme**: tweakcn dark (`#3b3b3f` background)
- **Target**: Chrome & Brave (latest)

### Components

| Component | Purpose |
|-----------|---------|
| `popup.tsx` | Quick-access: toggle all, profile switch, capture |
| `tabs/dashboard.tsx` | Pinned tab full dashboard with responsive side menu |
| `background.ts` | Service worker: extension state, NotebookLM injection, profiles/groups |
| `contents/notebooklm.ts` | Content script for NotebookLM page automation |

## Features

### 1. Extension Manager
- List all installed extensions with enable/disable toggle
- "Always enabled" pin per extension (survives profile switches)
- Toggle all on/off with single click
- Search/filter existing extensions
- Click extension name to open Web Store listing in new tab
- Delete extension directly from dashboard

### 2. Profiles (Full Context Switch)
- Named profiles: Work, Dev, Personal, etc.
- Switching a profile disables all non-pinned extensions, then enables the profile set
- Create, edit, delete profiles
- Current profile indicator

### 3. Groups (Layered Toggles)
- Named groups that can be toggled on/off independently
- Layer on top of active profile or standalone
- No conflict resolution — groups are additive (enable only)

### 4. Link Collector
- Save current tab URL or manually enter URLs
- Tag links (YouTube, article, reference, etc.)
- Send to NotebookLM:
  - Opens NotebookLM in background tab
  - Content script injects and automates "Add source" flow
  - Toggle: "Append to last notebook" vs "Create new notebook"
- View, edit, delete collected links

### 5. Extension Search
- Local search across installed extensions (name, description)
- "Search Web Store" button opens Chrome Web Store in new tab with query

### 6. Export
- Download installed extensions list as JSON or CSV
- Includes: name, id, version, enabled status, description

### 7. Page Capture
- Visible area screenshot via `captureVisibleTab`
- Full-page PDF via Chrome `debugger` API
- Save to downloads

## UI Design

### Theme (tweakcn dark)
```css
--background: #3b3b3f;
--foreground: #f1f1f1;
--card: #4a4a4e;
--primary: #e1e3e6;
--secondary: #505055;
--muted: #4a4a4e;
--accent: #5a5a60;
--destructive: #9e5e5e;
--border: #505055;
--input: #505055;
--radius: 0.5rem;
--font-sans: 'Inter', system-ui;
--font-mono: 'JetBrains Mono';
--shadow: 0px 8px 15px rgba(0,0,0,30%);
```

### Layout
- **Popup**: 360px wide, compact vertical layout
- **Dashboard (pinned tab)**: Full-page with responsive collapsible side menu
  - Side menu: icons-only when collapsed, full labels when expanded
  - Sections: Extensions, Profiles, Groups, Links, Capture, Settings

## Permissions
- `management` — extension lifecycle
- `tabs`, `activeTab` — tab access, capture
- `storage` — persist profiles, groups, links, settings
- `debugger` — PDF generation
- `clipboardWrite` — copy links
- `downloads` — save screenshots/PDFs/exports
- Host: `https://notebooklm.google.com/*` — content script injection

## Data Storage (chrome.storage.local)
```typescript
interface StorageSchema {
  profiles: Profile[];        // { id, name, extensionIds[] }
  groups: Group[];            // { id, name, extensionIds[] }
  alwaysEnabled: string[];    // extension IDs
  collectedLinks: Link[];     // { id, url, title, tags[], date }
  settings: {
    notebookMode: 'append' | 'new';
    lastNotebookUrl?: string;
  };
}
```
