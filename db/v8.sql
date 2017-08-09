CREATE TABLE if not exists qtopology_topology_history (
  id bigint NOT NULL AUTO_INCREMENT,
  ts datetime NOT NULL,
  uuid varchar(100) NOT NULL,
  status varchar(10) NOT NULL,
  worker varchar(100) DEFAULT NULL,
  weight float NOT NULL,
  worker_affinity varchar(200) DEFAULT NULL,
  error varchar(1000) DEFAULT NULL,
  enabled tinyint(4) NOT NULL,
  PRIMARY KEY (id)
);
ALTER TABLE qtopology_topology_history ADD INDEX ix_qtopology_topology_history_ut(uuid, ts);

CREATE TABLE if not exists qtopology_worker_history (
  id bigint NOT NULL AUTO_INCREMENT,
  ts datetime NOT NULL,
  name varchar(100) NOT NULL,
  status varchar(10) NOT NULL,
  lstatus varchar(10) NOT NULL,
  PRIMARY KEY (id)
);
ALTER TABLE qtopology_worker_history ADD INDEX ix_qtopology_worker_history_nt(name, ts);

drop procedure if exists qtopology_sp_add_worker_history;
create procedure qtopology_sp_add_worker_history(p_name varchar(100))
begin
  insert into qtopology_worker_history(ts, name, status, lstatus)
  select NOW() as ts, name, status, lstatus
  from qtopology_worker
  where name = p_name;
end;

drop procedure if exists qtopology_sp_add_topology_history;
create procedure qtopology_sp_add_topology_history(p_uuid varchar(100))
begin
  insert into qtopology_topology_history(ts, uuid, status, worker, weight, worker_affinity, error, enabled)
  select NOW() as ts, uuid, status, worker, weight, worker_affinity, error, enabled
  from qtopology_topology
  where uuid = p_uuid;
end;


-- drop TRIGGER if exists tr_insert_topology;
-- CREATE TRIGGER tr_insert_topology
--   AFTER INSERT ON qtopology_topology
--   FOR EACH ROW
-- BEGIN
--   call qtopology_sp_add_topology_history(NEW.uuid);
-- END;

-- drop TRIGGER if exists tr_update_topology;
-- CREATE TRIGGER tr_update_topology
--   AFTER UPDATE ON qtopology_topology
--   FOR EACH ROW
-- BEGIN
--   if
--     NEW.status <> OLD.status OR
--     NEW.worker <> OLD.worker OR
--     NEW.weight <> OLD.weight OR
--     NEW.worker_affinity <> OLD.worker_affinity OR
--     NEW.error <> OLD.error OR
--     NEW.enabled <> OLD.enabled
--   then
--     call qtopology_sp_add_topology_history(NEW.uuid);
--   end if;
-- END;

-- drop TRIGGER if exists tr_insert_worker;
-- CREATE TRIGGER tr_insert_worker
--   AFTER INSERT ON qtopology_worker
--   FOR EACH ROW
-- BEGIN
--   call qtopology_sp_add_worker_history(NEW.name);
-- END;

-- drop TRIGGER if exists tr_update_worker;
-- CREATE TRIGGER tr_update_worker
--   AFTER UPDATE ON qtopology_worker
--   FOR EACH ROW
-- BEGIN
--   if
--     old.name <> new.name or
--     old.status <> new.status or
--     old.lstatus <> new.lstatus
--   then
--     call qtopology_sp_add_worker_history(NEW.name);
--   end if;
-- END;
