
create table qtopology_worker (
    id int not null AUTO_INCREMENT,
    name varchar(100) not null,
    status varchar(10) not null,
    last_ping datetime not null,
    lstatus varchar(10) not null,
    lstatus_ts datetime not null,
    primary key (id)
);

create table qtopology_topology (
    id int not null AUTO_INCREMENT,
    uuid varchar(100) not null,
    config mediumtext not null,
    status varchar(10) not null,
    worker varchar(100) null,
    weight float not null,
    worker_affinity varchar(200) null,
    last_ping datetime not null,
    error varchar(1000) null,
    enabled bit,
    primary key (id)
);

create table qtopology_message (
    id bigint not null AUTO_INCREMENT,
    worker varchar(100) not null,
    cmd varchar(100) not null,
    content mediumtext not null,
    primary key (id)
);

create procedure qtopology_sp_register_worker(p_name varchar(100))
begin
    if exists(select * from qtopology_worker where name = p_name) then
        update qtopology_worker
        set status = 'alive', lstatus = '', lstatus_ts = NOW(), last_ping = NOW()
        where name = p_name;
    else
        insert into qtopology_worker(name, status, lstatus, lstatus_ts, last_ping)
        values (p_name, 'alive', '', NOW(), NOW());
    end if;
end;

create procedure qtopology_sp_disable_defunct_leaders()
begin
    declare p_min_date datetime;
    set p_min_date = DATE_ADD(NOW(), INTERVAL -10 SECOND);

    update qtopology_worker
    set lstatus = ''
    where lstatus_ts < p_min_date;

    update qtopology_worker
    set lstatus = ''
    where status <> 'alive';
end;

create procedure qtopology_sp_disable_defunct_workers()
begin
    declare p_min_date datetime;
    set p_min_date = DATE_ADD(NOW(), INTERVAL -30 SECOND);

    update qtopology_worker
    set status = 'dead'
    where status = 'alive' and last_ping < p_min_date;
end;

create procedure qtopology_sp_unassign_waiting_topologies()
begin
    declare p_min_date datetime;
    set p_min_date = DATE_ADD(NOW(), INTERVAL -30 SECOND);

    update qtopology_topology
    set status = 'unassigned'
    where status = 'waiting' and last_ping < p_min_date;

    update qtopology_topology
    set status = 'unassigned'
    where
        status = 'running' and
        worker in (select name from qtopology_worker where status = 'dead');
end;

create procedure qtopology_sp_announce_leader_candidacy(p_name varchar(100))
begin
    if not exists(select * from qtopology_worker where lstatus in ('candidate', 'leader')) then
        update qtopology_worker
        set lstatus = 'candidate', lstatus_ts = NOW()
        where name = p_name;
    end if;
end;

create procedure qtopology_sp_check_leader_candidacy(p_name varchar(100))
begin
    if exists(select * from qtopology_worker where name <> p_name and lstatus = 'leader') then
        update qtopology_worker
        set lstatus = '', lstatus_ts = NOW()
        where name = p_name;

        select '' as status;
    elseif exists(select * from qtopology_worker where name = p_name and lstatus = 'candidate') then
        update qtopology_worker
        set lstatus = ''
        where name <> p_name;

        update qtopology_worker
        set lstatus = 'leader', lstatus_ts = NOW()
        where name = p_name;

        select 'leader' as status;
    else
        update qtopology_worker
        set lstatus = '', lstatus_ts = NOW()
        where name = p_name;

        select '' as status;
    end if;
end;

create procedure qtopology_sp_assign_topology(p_uuid varchar(100), p_name varchar(100))
begin
    update qtopology_topology
    set worker = p_name, status = 'waiting'
    where uuid = p_uuid;

    insert into qtopology_message(worker, cmd, content)
    values (p_name, 'start', CONCAT('{ "uuid": ', p_uuid, '}'));
end;

create procedure qtopology_sp_update_topology_status(p_uuid varchar(100), p_status varchar(10))
begin
    update qtopology_topology
    set status = p_status, last_ping = NOW()
    where uuid = p_uuid;
end;

create procedure qtopology_sp_disable_topology(p_uuid varchar(100))
begin
    update qtopology_topology
    set enabled = 0
    where uuid = p_uuid;
end;

create procedure qtopology_sp_enable_topology(p_uuid varchar(100))
begin
    update qtopology_topology
    set enabled = 1
    where uuid = p_uuid;
end;

create procedure qtopology_sp_register_topology(p_uuid varchar(100), p_config mediumtext, p_weight float, p_worker_affinity varchar(200))
begin
    if not exists(select * from qtopology_topology where uuid = p_uuid) then
        insert into qtopology_topology(uuid, config, status, worker, weight, worker_affinity, last_ping, error, enabled)
        values (p_uuid, p_config, 'unassigned', null, p_weight, p_worker_affinity, NOW(), null, 1);
    else
        update qtopology_topology
        set config = p_config, weight = p_weight, worker_affinity = p_worker_affinity
        where uuid = p_uuid;
    end if;
end;

create procedure qtopology_sp_delete_topology(p_uuid varchar(100))
begin
    delete from qtopology_topology
    where uuid = p_uuid;
end;

create procedure qtopology_sp_update_worker_status(p_name varchar(100), p_status varchar(10))
begin
    update qtopology_worker
    set status = p_status, last_ping = NOW()
    where name = p_name;
end;

create procedure qtopology_sp_refresh_statuses()
begin
    CALL qtopology_sp_disable_defunct_workers();
    CALL qtopology_sp_disable_defunct_leaders();
    CALL qtopology_sp_unassign_waiting_topologies();
end;

create procedure qtopology_sp_worker_statuses()
begin
    select lstatus, count(*) as cnt
    from qtopology_worker
    group by lstatus;
end;

create procedure qtopology_sp_messages_for_worker(p_name varchar(100))
begin
    update qtopology_worker
    set last_ping = NOW()
    where name = p_name;

    select id, cmd, content
    from qtopology_message
    where worker = p_name
    order by id;
end;

create procedure qtopology_sp_delete_message(p_id bigint)
begin
    delete from qtopology_message
    where id = p_id;
end;

create procedure qtopology_sp_workers()
begin
    select name, status, lstatus, lstatus_ts, last_ping
    from qtopology_worker;
end;

create procedure qtopology_sp_topologies()
begin
    select uuid, status, worker, weight, worker_affinity, enabled
    from qtopology_topology;
end;

create procedure qtopology_sp_topologies_for_worker(p_name varchar(100))
begin
    select uuid, status, worker, weight, worker_affinity, enabled
    from qtopology_topology
    where worker = p_name;
end;
