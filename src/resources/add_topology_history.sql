insert into qtopology_topology_history(ts, uuid, status, worker, weight, worker_affinity, error, enabled)
select NOW() as ts, uuid, status, worker, weight, worker_affinity, error, enabled
from qtopology_topology
where uuid = ?;
