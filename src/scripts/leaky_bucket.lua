local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local leakRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local bucket = redis.call("HMGET", key, "level", "lastLeak")
local level = tonumber(bucket[1])
local lastLeak = tonumber(bucket[2])

if level == nil then
  level = 0
  lastLeak = now
end

local elapsed = math.max(0, now - lastLeak)
level = math.max(0, level - elapsed * leakRate)

local allowed = 0
local retryAfter = 0
if level < capacity then
  level = level + 1
  allowed = 1
else
  retryAfter = math.ceil((level - capacity + 1) / leakRate)
end

redis.call("HMSET", key, "level", level, "lastLeak", now)
redis.call("EXPIRE", key, 3600)

local remaining = math.floor(math.max(0, capacity - level))

return {allowed, remaining, retryAfter}