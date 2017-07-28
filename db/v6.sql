drop procedure qtopology_sp_announce_leader_candidacy;

create procedure qtopology_sp_announce_leader_candidacy(p_name varchar(100))
begin
    if not exists(select * from qtopology_worker where lstatus = 'leader') then
        update qtopology_worker
        set lstatus = 'candidate', lstatus_ts = NOW()
        where name = p_name;
    end if;
end;

drop procedure qtopology_sp_check_leader_candidacy;

create procedure qtopology_sp_check_leader_candidacy(p_name varchar(100))
begin
    if exists(select * from qtopology_worker where name <> p_name and lstatus = 'leader') then
        update qtopology_worker
        set lstatus = '', lstatus_ts = NOW()
        where name = p_name;

        select '' as status;
    
    elseif exists(select * from qtopology_worker where name > p_name and lstatus = 'candidate') then
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
