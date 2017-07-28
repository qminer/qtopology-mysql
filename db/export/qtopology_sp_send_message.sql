CREATE  PROCEDURE `qtopology_sp_send_message`(p_worker varchar(100), p_cmd varchar(100), p_content mediumtext)
begin
    insert into qtopology_message(worker, cmd, content)
    values (p_worker, p_cmd, p_content);
end