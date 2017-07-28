CREATE  PROCEDURE `qtopology_sp_disable_topology`(p_uuid varchar(100))
begin
    update qtopology_topology
    set enabled = 0
    where uuid = p_uuid;
end