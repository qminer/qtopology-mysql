delete from qtopology_message;

alter table qtopology_message
    add column valid_until datetime not null;

drop procedure if exists qtopology_sp_messages_for_worker;

create procedure qtopology_sp_messages_for_worker(p_name varchar(100))
begin
    update qtopology_worker
    set last_ping = NOW()
    where name = p_name;

    delete from qtopology_message
    where valid_until < NOW();

    select id, cmd, content, created
    from qtopology_message
    where worker = p_name
    order by id;
end;

alter table qtopology_worker
    drop column lstatus_ts;

drop procedure if exists qtopology_sp_register_worker;

create procedure `qtopology_sp_register_worker`(p_name varchar(100))
begin
    if exists(select * from qtopology_worker where name = p_name) then
        update qtopology_worker
        set status = 'alive', lstatus = '', last_ping = NOW()
        where name = p_name;
    else
        insert into qtopology_worker(name, status, lstatus, last_ping)
        values (p_name, 'alive', '', NOW());
    end if;
    call qtopology_sp_add_worker_history(p_name);
end;


DROP PROCEDURE IF EXISTS qtopology_sp_announce_leader_candidacy;

CREATE  PROCEDURE qtopology_sp_announce_leader_candidacy(p_name varchar(100))
begin
    if not exists(select * from qtopology_worker where lstatus = 'leader') then
        update qtopology_worker
        set lstatus = 'candidate', last_ping = NOW()
        where name = p_name;
        call qtopology_sp_add_worker_history(p_name);
    end if;
end;

DROP PROCEDURE IF EXISTS qtopology_sp_check_leader_candidacy;

CREATE  PROCEDURE qtopology_sp_check_leader_candidacy(p_name varchar(100))
begin
    if exists(select * from qtopology_worker where name <> p_name and lstatus = 'leader') then
        update qtopology_worker
        set lstatus = '', last_ping = NOW()
        where name = p_name;
        call qtopology_sp_add_worker_history(p_name);

        select '' as status;

    elseif exists(select * from qtopology_worker where name > p_name and lstatus = 'candidate') then
        update qtopology_worker
        set lstatus = '', last_ping = NOW()
        where name = p_name;
        call qtopology_sp_add_worker_history(p_name);

        select '' as status;

    elseif exists(select * from qtopology_worker where name = p_name and lstatus = 'candidate') then
        update qtopology_worker
        set lstatus = ''
        where name <> p_name and lstatus <> '';

        update qtopology_worker
        set lstatus = 'leader', last_ping = NOW()
        where name = p_name;
        call qtopology_sp_add_worker_history(p_name);

        select 'leader' as status;
    else
        update qtopology_worker
        set lstatus = '', last_ping = NOW()
        where name = p_name;
        call qtopology_sp_add_worker_history(p_name);

        select '' as status;
    end if;
end;
