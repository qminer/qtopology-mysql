-- drop procedure if exists qtopology_sp_add_topology_history;
-- drop procedure if exists qtopology_sp_add_worker_history;
-- drop procedure if exists qtopology_sp_announce_leader_candidacy;
-- drop procedure if exists qtopology_sp_check_leader_candidacy;
-- drop procedure if exists qtopology_sp_disable_defunct_leaders;
-- drop procedure if exists qtopology_sp_disable_defunct_workers;
-- drop procedure if exists qtopology_sp_leader_ping;
-- drop procedure if exists qtopology_sp_messages_for_worker;
-- drop procedure if exists qtopology_sp_refresh_statuses;
-- drop procedure if exists qtopology_sp_register_topology;
-- drop procedure if exists qtopology_sp_register_worker;
-- drop procedure if exists qtopology_sp_unassign_waiting_topologies;
-- drop procedure if exists qtopology_sp_worker_statuses;

drop procedure if exists qtopology_sp_announce_leader_candidacy;
CREATE  PROCEDURE qtopology_sp_announce_leader_candidacy(p_name varchar(100))
begin
    if not exists(select * from qtopology_worker where lstatus = 'leader') then
        update qtopology_worker
        set lstatus = 'candidate', lstatus_ts = NOW()
        where name = p_name;
        call qtopology_sp_add_worker_history(p_name);
    end if;
end;

drop procedure if exists qtopology_sp_check_leader_candidacy;
CREATE  PROCEDURE qtopology_sp_check_leader_candidacy(p_name varchar(100))
begin
    if exists(select * from qtopology_worker where name <> p_name and lstatus = 'leader') then
        update qtopology_worker
        set lstatus = '', lstatus_ts = NOW()
        where name = p_name;
        call qtopology_sp_add_worker_history(p_name);

        select '' as status;
    
    elseif exists(select * from qtopology_worker where name > p_name and lstatus = 'candidate') then
        update qtopology_worker
        set lstatus = '', lstatus_ts = NOW()
        where name = p_name;
        call qtopology_sp_add_worker_history(p_name);

        select '' as status;

    elseif exists(select * from qtopology_worker where name = p_name and lstatus = 'candidate') then
        update qtopology_worker
        set lstatus = ''
        where name <> p_name and lstatus <> '';

        update qtopology_worker
        set lstatus = 'leader', lstatus_ts = NOW()
        where name = p_name;
        call qtopology_sp_add_worker_history(p_name);

        select 'leader' as status;
    else
        update qtopology_worker
        set lstatus = '', lstatus_ts = NOW()
        where name = p_name;
        call qtopology_sp_add_worker_history(p_name);

        select '' as status;
    end if;
end;

drop procedure if exists qtopology_sp_disable_defunct_leaders;
CREATE  PROCEDURE qtopology_sp_disable_defunct_leaders()
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

drop procedure if exists qtopology_sp_disable_defunct_workers;
CREATE  PROCEDURE qtopology_sp_disable_defunct_workers()
begin
    declare p_min_date datetime;
    set p_min_date = DATE_ADD(NOW(), INTERVAL -30 SECOND);

    update qtopology_worker
    set status = 'dead'
    where status = 'alive' and last_ping < p_min_date;
end;

drop procedure if exists qtopology_sp_leader_ping;
CREATE  PROCEDURE qtopology_sp_leader_ping(p_name varchar(100))
begin
    update qtopology_worker
    set status = 'alive', lstatus_ts = NOW(), last_ping = NOW()
    where name = p_name and lstatus = 'leader';
end;

drop procedure if exists qtopology_sp_register_topology;
CREATE  PROCEDURE qtopology_sp_register_topology(p_uuid varchar(100), p_config mediumtext, p_weight float, p_worker_affinity varchar(200))
begin
    if not exists(select * from qtopology_topology where uuid = p_uuid) then
        insert into qtopology_topology(uuid, config, status, worker, weight, worker_affinity, last_ping, error, enabled)
        values (p_uuid, p_config, 'unassigned', null, p_weight, p_worker_affinity, NOW(), null, 1);
    else
        update qtopology_topology
        set config = p_config, weight = p_weight, worker_affinity = p_worker_affinity
        where uuid = p_uuid;
    end if;
    call qtopology_sp_add_topology_history(p_uuid);
end;

drop procedure if exists qtopology_sp_register_worker;
CREATE  PROCEDURE qtopology_sp_register_worker(p_name varchar(100))
begin
    if exists(select * from qtopology_worker where name = p_name) then
        update qtopology_worker
        set status = 'alive', lstatus = '', lstatus_ts = NOW(), last_ping = NOW()
        where name = p_name;
    else
        insert into qtopology_worker(name, status, lstatus, lstatus_ts, last_ping)
        values (p_name, 'alive', '', NOW(), NOW());
    end if;
    call qtopology_sp_add_worker_history(p_name);
end;

drop procedure if exists qtopology_sp_unassign_waiting_topologies;
CREATE  PROCEDURE qtopology_sp_unassign_waiting_topologies()
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
