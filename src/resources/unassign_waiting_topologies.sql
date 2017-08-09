declare p_min_date_uwt datetime;
set p_min_date_uwt = DATE_ADD(NOW(), INTERVAL -30 SECOND);

update qtopology_topology
set status = 'unassigned'
where status = 'waiting' and last_ping < p_min_date_uwt;

update qtopology_topology
set status = 'unassigned'
where
    status = 'running' and
    worker in (select name from qtopology_worker where status = 'dead');
