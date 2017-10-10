CREATE  PROCEDURE `qtopology_sp_announce_leader_candidacy`(p_name varchar(100))
begin
    if not exists(select * from qtopology_worker where lstatus = 'leader') then
        update qtopology_worker
        set lstatus = 'candidate', last_ping = NOW()
        where name = p_name;
        call qtopology_sp_add_worker_history(p_name);
    end if;
end