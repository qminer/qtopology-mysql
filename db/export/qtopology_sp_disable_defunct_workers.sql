CREATE  PROCEDURE `qtopology_sp_disable_defunct_workers`()
begin
    declare p_min_date datetime;
    set p_min_date = DATE_ADD(NOW(), INTERVAL -30 SECOND);

    update qtopology_worker
    set status = 'dead'
    where status in ('alive', 'closing') and last_ping < p_min_date;    
end