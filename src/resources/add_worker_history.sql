insert into qtopology_worker_history(ts, name, status, lstatus)
select NOW() as ts, name, status, lstatus
from qtopology_worker
where name = ?;
