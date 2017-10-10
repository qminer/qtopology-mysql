CREATE  PROCEDURE `qtopology_sp_check_leader_candidacy`(p_name varchar(100))
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
end