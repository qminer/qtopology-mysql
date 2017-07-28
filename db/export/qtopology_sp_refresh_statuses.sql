CREATE  PROCEDURE `qtopology_sp_refresh_statuses`()
begin
    CALL qtopology_sp_disable_defunct_workers();
    CALL qtopology_sp_disable_defunct_leaders();
    CALL qtopology_sp_unassign_waiting_topologies();
end