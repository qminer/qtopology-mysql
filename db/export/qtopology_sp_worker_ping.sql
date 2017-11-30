CREATE  PROCEDURE `qtopology_sp_worker_ping`(p_name varchar(100))
begin
    update qtopology_worker
    set last_ping = NOW()
    where name = p_name;
end;