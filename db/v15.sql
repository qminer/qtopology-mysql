alter table qtopology_topology
    add column pid int;
alter table qtopology_topology_history
    add column pid int;

drop procedure if exists qtopology_sp_add_topology_history;

create procedure qtopology_sp_add_topology_history(p_uuid varchar(100))
begin
  insert into qtopology_topology_history(ts, uuid, status, worker, weight, worker_affinity, error, enabled, pid)
  select NOW() as ts, uuid, status, worker, weight, worker_affinity, error, enabled, pid
  from qtopology_topology
  where uuid = p_uuid;
end;
