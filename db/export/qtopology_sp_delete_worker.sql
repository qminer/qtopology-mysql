CREATE  PROCEDURE `qtopology_sp_delete_worker`(p_worker varchar(100))
begin
    delete from qtopology_worker
    where name = p_worker and status = 'dead';
end