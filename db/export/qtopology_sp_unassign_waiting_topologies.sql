CREATE  PROCEDURE `qtopology_sp_unassign_waiting_topologies`()
begin
    declare p_min_date datetime;
    set p_min_date = DATE_ADD(NOW(), INTERVAL -30 SECOND);

    update qtopology_topology
    set status = 'unassigned'
    where status = 'waiting' and last_ping < p_min_date;

    update qtopology_topology
    set status = 'unassigned'
    where
        status = 'running' and
        worker in (select name from qtopology_worker where status = 'dead');
end