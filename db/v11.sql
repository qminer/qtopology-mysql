alter table qtopology_message
    add column created datetime not null;

drop procedure qtopology_sp_messages_for_worker;

create procedure qtopology_sp_messages_for_worker(p_name varchar(100))
begin
    update qtopology_worker
    set last_ping = NOW()
    where name = p_name;

    select id, cmd, content, created
    from qtopology_message
    where worker = p_name
    order by id;
end;
