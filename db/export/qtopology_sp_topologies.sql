CREATE  PROCEDURE `qtopology_sp_topologies`()
begin
    select uuid, status, worker, weight, worker_affinity, enabled
    from qtopology_topology;
end