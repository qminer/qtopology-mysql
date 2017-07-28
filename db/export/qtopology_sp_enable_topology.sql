CREATE  PROCEDURE `qtopology_sp_enable_topology`(p_uuid varchar(100))
begin
    update qtopology_topology
    set enabled = 1
    where uuid = p_uuid;
end