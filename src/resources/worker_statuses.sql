select lstatus, count(*) as cnt
from qtopology_worker
group by lstatus;
