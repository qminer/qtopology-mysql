CREATE  PROCEDURE `qtopology_sp_leader_ping`(p_name varchar(100))
begin
    update qtopology_worker
    set status = 'alive', lstatus_ts = NOW(), last_ping = NOW()
    where name = p_name and lstatus = 'leader';
end