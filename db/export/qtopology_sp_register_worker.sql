CREATE  PROCEDURE `qtopology_sp_register_worker`(p_name varchar(100))
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
end