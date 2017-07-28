CREATE  PROCEDURE `qtopology_sp_update_worker_status`(p_name varchar(100), p_status varchar(10))
begin
    update qtopology_worker
    set status = p_status, last_ping = NOW()
    where name = p_name;
end