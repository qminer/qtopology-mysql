declare p_name varchar(100);
p_name = ?;

update qtopology_worker
set last_ping = NOW()
where name = p_name;

select id, cmd, content
from qtopology_message
where worker = p_name
order by id;
