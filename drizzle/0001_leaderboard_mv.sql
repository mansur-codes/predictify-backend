-- Materialized view for leaderboard
-- Refresh this view periodically to update leaderboard rankings
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_mv AS
SELECT 
  u.id as user_id,
  u.stellar_address,
  COUNT(p.id) as total_predictions,
  SUM(CASE 
    WHEN p.outcome = m.resolution_outcome THEN 1 
    ELSE 0 
  END) as correct_predictions,
  ROUND(
    CASE 
      WHEN COUNT(p.id) > 0 THEN 
        100.0 * SUM(CASE WHEN p.outcome = m.resolution_outcome THEN 1 ELSE 0 END) / COUNT(p.id)
      ELSE 0 
    END, 
    2
  ) as accuracy_percentage,
  ROW_NUMBER() OVER (ORDER BY 
    CASE 
      WHEN COUNT(p.id) > 0 THEN 
        100.0 * SUM(CASE WHEN p.outcome = m.resolution_outcome THEN 1 ELSE 0 END) / COUNT(p.id)
      ELSE 0 
    END DESC, 
    COUNT(p.id) DESC
  ) as rank
FROM users u
LEFT JOIN predictions p ON u.id = p.user_id
LEFT JOIN markets m ON p.market_id = m.id AND m.status IN ('resolved', 'disputed')
GROUP BY u.id, u.stellar_address;

-- Create index on stellar_address for quick lookups
CREATE INDEX IF NOT EXISTS idx_leaderboard_stellar_address ON leaderboard_mv(stellar_address);

-- Create unique index on user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_user_id ON leaderboard_mv(user_id);
