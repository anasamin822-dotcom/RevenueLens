# 04-data-model

rl_records(owner_id,entity,id,data,created_at,updated_at) and rl_audit. Composite owner/entity/id key; owner RLS on reads/writes. Links must refer to owner records. Delete refused while dependants exist. Two-decimal nonnegative money, score/progress0-100, enums and dates validated. Auth user owns records; user deletion cascades their data.
