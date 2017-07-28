CREATE  PROCEDURE `qtopology_sp_delete_topology`(p_uuid varchar(100))
begin
    delete from qtopology_topology
    where uuid = p_uuid;
end