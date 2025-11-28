# Profile Feature

## Overview
The profile section is a modal popup that appears when users click their profile icon in the header. It provides comprehensive profile management functionality with a modern, trendy UI aligned with the app's color palette (#4b9fa8).

## Features

### 1. **Profile Picture Management**
- Default avatar (SVG) shown if no custom image uploaded
- Clickable edit button on avatar to upload custom image
- Supports common image formats (jpg, png, etc.)
- Image preview updates in real-time

### 2. **Name Editing**
- User name is editable via inline form
- Default name is extracted from registered email on first login
- Inline "Save" button for quick updates
- Form validation for minimum 2 characters

### 3. **Email Display (Read-only)**
- Registered email is displayed but not editable
- Clear "Not editable" badge to indicate status
- Email remains the primary account identifier

### 4. **Backup Email Management**
- Optional backup email for account recovery
- "+Add backup email" button when no backup email exists
- Inline editing when backup email is already set
- Helper text explaining the purpose
- Editable field for easy updates

### 5. **Password Change (Secure Flow)**
- Two-step verification process for security
- **Step 1: Email Verification**
  - Verification code sent to registered email
  - 60-second countdown timer
  - Demo code: `123456` (for demonstration)
  - Clear UI feedback with info icon
- **Step 2: Password Update**
  - Current password field
  - New password field (min 8 characters)
  - Confirm password field
  - Password match validation
  - Success badge shown after verification

## UI/UX Design

### Color Palette
- Primary: `#4b9fa8` (teal)
- Gradient headers: `#4b9fa8` to `#3d8490`
- Background accents: `#f0f9fa`, `#e6f4f5`
- Success: `#10b981`
- Warning/Timer: `#fee2e2` with `#991b1b`
- Info: `#fef3c7` with `#92400e`

### Modern Styling Elements
- Rounded corners (8px-16px)
- Smooth transitions (0.2s ease)
- Gradient backgrounds for headers
- Custom scrollbar styling
- Hover effects with transform and box-shadow
- Pulsing animation for timer
- Responsive design for mobile devices

### Layout Structure
```
┌─────────────────────────────────┐
│  Profile Settings       [X]     │ ← Gradient Header
├─────────────────────────────────┤
│  [Avatar]  John Doe             │ ← Profile Picture Section
│            email@example.com    │
├─────────────────────────────────┤
│  NAME:        [Input] [Save]    │
│  EMAIL:       [email] Not Edit  │
│  BACKUP:      [+ Add / Update]  │
│  PASSWORD:    [••••] [Change]   │
├─────────────────────────────────┤
│            [Cancel] [Save]      │ ← Footer Actions
└─────────────────────────────────┘
```

## Implementation Details

### Files Structure
```
pages/profile/
├── profile.ts          # Component logic
├── profile.html        # Template
├── profile.scss        # Styling
└── README.md          # This file
```

### Integration
The profile modal is integrated into all main pages:
- Dashboard (`/dashboard`)
- Activities (`/activities`)
- Settings (`/settings`)
- Help (`/help`)

### Opening the Modal
```typescript
openProfileModal(): void {
  this.dialog.open(Profile, {
    width: '550px',
    maxWidth: '90vw',
    panelClass: 'profile-dialog'
  }).afterClosed().subscribe((result: ProfileData) => {
    if (result) {
      // Handle profile updates
    }
  });
}
```

### Data Interface
```typescript
export interface ProfileData {
  name: string;
  email: string;
  backupEmail?: string;
  profileImage?: string;
}
```

## Password Reset Demo
For demonstration purposes, the verification code is **statically set to `123456`**. 
In production, this should:
1. Generate a random 6-digit code
2. Send it via email service
3. Expire after 60 seconds
4. Store securely server-side

## Responsive Design
- Desktop: 550px width modal
- Tablet: Max 90vw width
- Mobile:
  - Full viewport height/width
  - Stacked form layouts
  - Full-width buttons
  - Adjusted spacing and padding

## Dark Theme Support
Full dark theme support included with proper color adjustments for:
- Background colors
- Text colors
- Border colors
- Scrollbar styling

## TODO for Production
- [ ] Connect to backend API for profile updates
- [ ] Implement real email verification service
- [ ] Add image upload to cloud storage
- [ ] Add image size/format validation
- [ ] Implement actual password change API
- [ ] Add loading states for API calls
- [ ] Add error handling and toast notifications
- [ ] Implement session management for profile data
- [ ] Add analytics tracking for profile changes
