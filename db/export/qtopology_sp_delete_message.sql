CREATE  PROCEDURE `qtopology_sp_delete_message`(p_id bigint)
begin
    delete from qtopology_message
    where id = p_id;
end