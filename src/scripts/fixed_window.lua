local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call("INCR", key)

if current == 1 then
  redis.call("EXPIRE", key, window)
end

local ttl = redis.call("TTL", key)
local remaining = math.max(0, limit - current)

if current > limit then
  return {0, remaining, ttl}
else
  return {1, remaining, ttl}
end