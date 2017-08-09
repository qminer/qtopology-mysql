declare p_min_date_ddw datetime;
set p_min_date_ddw = DATE_ADD(NOW(), INTERVAL -30 SECOND);

update qtopology_worker
set status = 'dead'
where status = 'alive' and last_ping < p_min_date_ddw;
