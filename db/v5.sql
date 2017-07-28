drop procedure qtopology_sp_assign_topology;

create procedure qtopology_sp_assign_topology(p_uuid varchar(100), p_name varchar(100))
begin
    update qtopology_topology
    set worker = p_name, status = 'waiting'
    where uuid = p_uuid;

    insert into qtopology_message(worker, cmd, content)
    values (p_name, 'start', CONCAT('{ "uuid": "', p_uuid, '" }'));
end;
