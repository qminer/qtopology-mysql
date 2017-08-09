declare p_name varchar(100);
p_name = ?;

update qtopology_worker
set status = 'alive', lstatus_ts = NOW(), last_ping = NOW()
where name = p_name and lstatus = 'leader';
