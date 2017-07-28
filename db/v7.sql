drop procedure if exists qtopology_sp_assign_topology;

create procedure qtopology_sp_assign_topology(p_uuid varchar(100), p_name varchar(100))
begin
    update qtopology_topology
    set worker = p_name, status = 'waiting'
    where uuid = p_uuid;
end;

drop procedure if exists qtopology_sp_send_message;

create procedure qtopology_sp_send_message(p_worker varchar(100), p_cmd varchar(100), p_content mediumtext)
begin
    insert into qtopology_message(worker, cmd, content)
    values (p_worker, p_cmd, p_content);
end;

drop procedure if exists qtopology_sp_delete_worker;

create procedure qtopology_sp_delete_worker(p_worker varchar(100))
begin
    delete from qtopology_worker
    where name = p_worker and status = 'unloaded';
end;
