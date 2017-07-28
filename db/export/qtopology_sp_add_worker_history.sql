CREATE  PROCEDURE `qtopology_sp_add_worker_history`(p_name varchar(100))
begin
  insert into qtopology_worker_history(ts, name, status, lstatus)
  select NOW() as ts, name, status, lstatus
  from qtopology_worker
  where name = p_name;
end