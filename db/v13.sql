drop procedure if exists qtopology_sp_disable_defunct_workers;

create procedure qtopology_sp_disable_defunct_workers()
begin
    declare p_min_date datetime;
    set p_min_date = DATE_ADD(NOW(), INTERVAL -30 SECOND);

    update qtopology_worker
    set status = 'dead'
    where status in ('alive', 'closing') and last_ping < p_min_date;    
end;

drop procedure if exists qtopology_sp_leader_ping;

CREATE  PROCEDURE qtopology_sp_leader_ping(p_name varchar(100))
begin
    update qtopology_worker
    set status = 'alive', lstatus_ts = NOW(), last_ping = NOW()
    where name = p_name and lstatus = 'leader';
    
    update qtopology_worker
    set status = 'alive', last_ping = NOW()
    where name = p_name and lstatus <> 'leader';
end;
