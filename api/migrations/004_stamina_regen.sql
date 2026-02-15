-- Add regeneration timestamp for stamina system
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS last_regen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
