local balance = tonumber(redis.call('GET', KEYS[1]) or "0")
local rate = tonumber(ARGV[1])

if balance < rate then
    return {-1, balance}
end

local new_balance = balance - rate
redis.call('SET', KEYS[1], tostring(new_balance))
redis.call('HINCRBYFLOAT', "astrologer:" .. ARGV[2] .. ":earnings", "pending_payout", rate * 0.60)
return {1, new_balance}
