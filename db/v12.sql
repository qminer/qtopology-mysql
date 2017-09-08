drop procedure qtopology_sp_register_topology;

create procedure qtopology_sp_register_topology(p_uuid varchar(100), p_config mediumtext, p_weight float, p_worker_affinity varchar(200))
begin
    if not exists(select * from qtopology_topology where uuid = p_uuid) then
        insert into qtopology_topology(uuid, config, status, worker, weight, worker_affinity, last_ping, error, enabled)
        values (p_uuid, p_config, 'unassigned', null, p_weight, p_worker_affinity, NOW(), null, 0);
    else
        update qtopology_topology
        set config = p_config, weight = p_weight, worker_affinity = p_worker_affinity
        where uuid = p_uuid;
    end if;
    call qtopology_sp_add_topology_history(p_uuid);
end
