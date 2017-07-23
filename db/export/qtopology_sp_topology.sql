CREATE  PROCEDURE `qtopology_sp_topology`(p_uuid varchar(100))
begin
    select uuid, config, status, worker, weight, worker_affinity, last_ping, error, enabled
    from qtopology_topology
    where uuid = p_uuid;
end