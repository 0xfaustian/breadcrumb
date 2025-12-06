# Setting up the Supabase Database

## Creating Tables

To use this application with Supabase, you need to create the necessary database tables. Follow these steps:

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/jykpyodmbnvnxtelbcnv
2. Navigate to the "SQL Editor" section
3. Copy and paste the schema from the file `supabase_schema.sql` into the SQL editor
4. Run the query to create the tables

### Option 2: Using SQL Commands (supabase_schema.sql)

The following tables need to be created:

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
    schedule TEXT, -- JSON string storing schedule info
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity markers table - specific markers for each activity (5 minutes, 10 pushups, etc.)
CREATE TABLE activity_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,  -- e.g. "5 minutes", "10 pushups"
    is_default BOOLEAN DEFAULT FALSE,  -- If true, this marker shows by default
    target INTEGER,  -- Daily target for this marker
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily records table - tracks completed markers for each user and day
-- Note: Multiple records per marker per day are allowed to track multiple completions
CREATE TABLE daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_marker_id UUID REFERENCES activity_markers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    target INTEGER,  -- Target at time of completion (preserved for historical accuracy)
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_daily_records_user_date ON daily_records(user_id, date);
CREATE INDEX idx_daily_records_activity_marker ON daily_records(activity_marker_id);
CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activity_markers_activity ON activity_markers(activity_id);
```

### Option 3: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Create a migration file
supabase db push

# Or run the SQL directly
supabase sql --file supabase_schema.sql
```

## RLS Policies (Optional but Recommended)

For security, you should set up Row Level Security to ensure users can only access their own data:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can view their own activities" ON activities
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view activity markers for their activities" ON activity_markers
  FOR ALL USING (activities.user_id = (SELECT user_id FROM activities WHERE id = activity_id));

CREATE POLICY "Users can view their own daily records" ON daily_records
  FOR ALL USING (auth.uid() = user_id);
```

## Environment Variables

Make sure your `.env.local` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jykpyodmbnvnxtelbcnv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5a3B5b2RtYm52bnh0ZWxiY252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODg4NzIsImV4cCI6MjA4MDQ2NDg3Mn0.-_URJnck37in2f74GY20HB13q0wYRhNJS-0Z_hL5ius
```

## Updating Existing Database

If you already have the database set up, run these migrations:

```sql
-- Add schedule column to activities table
ALTER TABLE activities ADD COLUMN IF NOT EXISTS schedule TEXT;

-- Add is_default and target columns to activity_markers table
ALTER TABLE activity_markers ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE activity_markers ADD COLUMN IF NOT EXISTS target INTEGER;

-- Add target column to daily_records (stores target at time of completion)
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS target INTEGER;
```

### Column Descriptions:

**activities.schedule** - JSON string storing schedule info:
- `type`: "daily" | "weekly" | "custom"
- `daysOfWeek`: number[] (0=Sun, 1=Mon, etc.) - for weekly schedules
- `customDays`: number - for custom schedules (every N days)

**activity_markers.target** - Daily target number for the marker (e.g., 5 = complete 5 times per day)

## Troubleshooting

If you're still getting table not found errors:

1. Verify the table names match exactly (case-sensitive in some contexts)
2. Make sure the database connection is correct
3. Check that the tables were created successfully in your Supabase dashboard
4. Ensure the RLS policies aren't blocking access (if enabled before testing)