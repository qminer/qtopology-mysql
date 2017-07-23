CREATE  PROCEDURE `qtopology_sp_workers`()
begin
    select name, status, lstatus, lstatus_ts, last_ping
    from qtopology_worker;
end