local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

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

-- retryAfter: seconds until at least 1 token is available
local retryAfter = 0
if allowed == 0 and refillRate > 0 then
  retryAfter = math.ceil((1 - tokens) / refillRate)
end

return {allowed, math.floor(tokens), retryAfter}