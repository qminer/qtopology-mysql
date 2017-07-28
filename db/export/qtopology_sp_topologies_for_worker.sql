CREATE  PROCEDURE `qtopology_sp_topologies_for_worker`(p_name varchar(100))
begin
    select uuid, status, worker, weight, worker_affinity, enabled
    from qtopology_topology
    where worker = p_name;
end