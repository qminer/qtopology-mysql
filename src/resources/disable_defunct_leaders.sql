declare p_min_date_ddl datetime;
set p_min_date_ddl = DATE_ADD(NOW(), INTERVAL -10 SECOND);

update qtopology_worker
set lstatus = ''
where lstatus_ts < p_min_date_ddl;

update qtopology_worker
set lstatus = ''
where status <> 'alive';
