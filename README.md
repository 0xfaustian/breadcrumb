# Breadcrumb Tracker

A web application for tracking daily activities and accomplishments. Users can log activities with custom markers (e.g., "5 minutes reading", "10 pushups") and track their progress over time.

## Features

- Username-based authentication (no password required)
- Create custom activities (e.g., Reading, Workout, Meditation)
- Add multiple markers for each activity (e.g., 5 minutes, 10 minutes, 5 pullups)
- Daily view to track accomplishments
- Weekly view for an overview of your progress
- Analytics page with monthly, yearly, and all-time views
- Individual activity view with batch completion options
- Data persisted in PostgreSQL via Supabase

## Tech Stack

- Next.js 16.0.7 (with App Router)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL database)

## Database Schema

The application uses the following tables:

- `users`: Stores user information (id, username)
- `activities`: Tracks different activity types per user
- `activity_markers`: Defines specific markers for each activity
- `daily_records`: Logs completed markers for each day

## Database Setup

Before running the application, you need to create the required tables in your Supabase database:

1. Go to your Supabase project dashboard
2. Navigate to the "SQL Editor" section
3. Run the following SQL commands:

```sql
-- Database schema for Breadcrumb Tracker App

-- Users table - only username needed, no password
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities table - different types of activities (reading, workout, etc.)
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity markers table - specific markers for each activity (5 minutes, 10 pushups, etc.)
CREATE TABLE activity_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,  -- e.g. "5 minutes", "10 pushups"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily records table - tracks completed markers for each user and day
CREATE TABLE daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_marker_id UUID REFERENCES activity_markers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_marker_id, date)  -- Each marker can only be completed once per day
);

-- Indexes for better performance
CREATE INDEX idx_daily_records_user_date ON daily_records(user_id, date);
CREATE INDEX idx_daily_records_activity_marker ON daily_records(activity_marker_id);
CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activity_markers_activity ON activity_markers(activity_id);
```

For detailed setup instructions, see SETUP_DATABASE.md

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   Create a `.env.local` file with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Run the development server:
   ```bash
   pnpm run dev
   ```

4. Open your browser to [http://localhost:3000](http://localhost:3000)

## Usage

1. Enter your username on the login screen
2. Create activities (like "Reading" or "Workout")
3. Add markers for each activity (like "5 minutes", "10 pushups", etc.)
4. Use the daily view to track your accomplishments
5. Switch to the weekly view for a broader perspective
6. Visit the analytics page to review your progress over time
7. Click on any activity to view detailed statistics and complete markers in batches

## License

MIT