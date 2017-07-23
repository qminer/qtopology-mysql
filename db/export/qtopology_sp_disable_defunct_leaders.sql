CREATE  PROCEDURE `qtopology_sp_disable_defunct_leaders`()
begin
    declare p_min_date datetime;
    set p_min_date = DATE_ADD(NOW(), INTERVAL -10 SECOND);

    update qtopology_worker
    set lstatus = ''
    where lstatus_ts < p_min_date;

    update qtopology_worker
    set lstatus = ''
    where status <> 'alive';
end