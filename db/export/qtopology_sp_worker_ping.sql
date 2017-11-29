CREATE  PROCEDURE `qtopology_sp_worker_ping`(p_name varchar(100))
begin
    update qtopology_worker
    set lstatus_ts = NOW(), last_ping = NOW()
    where name = p_name and lstatus = 'leader';
    
    update qtopology_worker
    set last_ping = NOW()
    where name = p_name and lstatus <> 'leader';
end;