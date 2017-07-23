CREATE  PROCEDURE `qtopology_sp_assign_topology`(p_uuid varchar(100), p_name varchar(100))
begin
    update qtopology_topology
    set worker = p_name, status = 'waiting'
    where uuid = p_uuid;
end