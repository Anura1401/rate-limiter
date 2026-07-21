local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

redis.call("ZREMRANGEBYSCORE", key, 0, now - window)

local count = redis.call("ZCARD", key)
local remaining = math.max(0, limit - count - 1)

if count < limit then
  redis.call("ZADD", key, now, now)
  redis.call("EXPIRE", key, window)
  return {1, remaining, 0}
else
  -- retryAfter: time until oldest entry falls out of the window
  local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
  local retryAfter = 0
  if oldest[2] then
    retryAfter = math.ceil((tonumber(oldest[2]) + window) - now)
  end
  return {0, 0, retryAfter}
end