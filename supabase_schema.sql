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
    schedule TEXT, -- JSON string storing schedule info (type: daily/weekly/custom, daysOfWeek, customDays)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity markers table - specific markers for each activity (5 minutes, 10 pushups, etc.)
CREATE TABLE activity_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,  -- e.g. "5 minutes", "10 pushups"
    is_default BOOLEAN DEFAULT FALSE,  -- If true, this marker shows by default
    target INTEGER,  -- Daily target for this marker (e.g., 5 times per day)
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
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_daily_records_user_date ON daily_records(user_id, date);
CREATE INDEX idx_daily_records_activity_marker ON daily_records(activity_marker_id);
CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activity_markers_activity ON activity_markers(activity_id);