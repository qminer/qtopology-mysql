CREATE  PROCEDURE `qtopology_sp_announce_leader_candidacy`(p_name varchar(100))
begin
    if not exists(select * from qtopology_worker where lstatus = 'leader') then
        update qtopology_worker
        set lstatus = 'candidate', lstatus_ts = NOW()
        where name = p_name;
    end if;
end