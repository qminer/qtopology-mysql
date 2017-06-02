drop procedure if exists qtopology_sp_update_topology_status;

create procedure qtopology_sp_update_topology_status(p_uuid varchar(100), p_status varchar(10), p_error varchar(1000))
begin
    update qtopology_topology
    set status = p_status, last_ping = NOW(), error = p_error
    where uuid = p_uuid;
end;
