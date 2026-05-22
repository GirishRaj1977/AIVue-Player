local utils = require "mp.utils"
print("=== UTILS FIELDS ===")
for k, v in pairs(utils) do
    print(tostring(k) .. " : " .. tostring(type(v)))
end

print("=== MP FIELDS ===")
for k, v in pairs(mp) do
    print(tostring(k) .. " : " .. tostring(type(v)))
end
