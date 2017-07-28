CREATE  PROCEDURE `qtopology_sp_worker_statuses`()
begin
    select lstatus, count(*) as cnt
    from qtopology_worker
    group by lstatus;
end