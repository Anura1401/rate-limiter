local key = KEYS[1]
local capacity = tonumber(ARGV[1])       -- max tokens in bucket
local refillRate = tonumber(ARGV[2])     -- tokens added per second
local now = tonumber(ARGV[3])            -- current timestamp (seconds)

local bucket = redis.call("HMGET", key, "tokens", "lastRefill")
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
end

local elapsed = math.max(0, now - lastRefill)
local refill = elapsed * refillRate
tokens = math.min(capacity, tokens + refill)

local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end

redis.call("HMSET", key, "tokens", tokens, "lastRefill", now)
redis.call("EXPIRE", key, 3600)

return allowed