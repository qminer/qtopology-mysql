if not exists(select * from qtopology_worker where lstatus = 'leader') then
    update qtopology_worker
    set lstatus = 'candidate', lstatus_ts = NOW()
    where name = ?;
end if;
