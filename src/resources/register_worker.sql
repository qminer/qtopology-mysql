declare p_name varchar(100)
p_name = ?;

if exists(select * from qtopology_worker where name = p_name) then
    update qtopology_worker
    set status = 'alive', lstatus = '', lstatus_ts = NOW(), last_ping = NOW()
    where name = p_name;
else
    insert into qtopology_worker(name, status, lstatus, lstatus_ts, last_ping)
    values (p_name, 'alive', '', NOW(), NOW());
end if;
