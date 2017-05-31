# qtopology-mysql

This package contains coordination-storage plugin for [QTopology](http://github.com/qminerqtopology) that uses `MySQL` database to store and manipulate coordination data.

![npm version](https://badge.fury.io/js/qtopology-mysql.svg "NPM version")

NPM package: [https://www.npmjs.com/package/qtopology-mysql](https://www.npmjs.com/package/qtopology-mysql)

## Database schema

### Tables

|Table|Description|
|-----|-----|
| qtopology_settings | Simple settings, also contains version information |
| qtopology_worker | List of workers, their statuses and latest pings |
| qtopology_topology | List of topologies, their statuses and latest pings |
| qtopology_message | Message queue for workers |

### Stored procedures

|Table|Description|
|-----|-----|
| qtopology_sp_announce_leader_candidacy | Sets status for given worker that it is a candidate for leadership |
| qtopology_sp_assign_topology | Assigns topology to given worker |
| qtopology_sp_check_leader_candidacy | Checks if leadership candidacy succeeded for given worker |
| qtopology_sp_delete_message | Deletes sepcified message |
| qtopology_sp_delete_topology | Deletes specified topology |
| qtopology_sp_disable_defunct_leaders | Disables leaders that have been inactive too long or are marked as dead |
| qtopology_sp_disable_defunct_workers | Disables workers that have been inactive too long or are marked as dead |
| qtopology_sp_disable_topology | Disables topology |
| qtopology_sp_enable_topology | Enables topology |
| qtopology_sp_messages_for_worker | Retrieves messages for single worker |
| qtopology_sp_refresh_statuses | Refreshes all statuses by calling other stored procedures that update inactive workers etc. |
| qtopology_sp_register_topology | Registers new topology. If topology exists, it is overwritten. |
| qtopology_sp_register_worker | Registers new worker. If worker exists, it is overwritten. |
| qtopology_sp_topologies | Lists all topologies with their statuses and other data |
| qtopology_sp_topologies_for_worker | Lists all topologies for single worker with their statuses and other data |
| qtopology_sp_unassign_waiting_topologies | Sets topologies that have been assigned a while ago but are not running as unassigned. |
| qtopology_sp_update_topology_status | Update status for given topology |
| qtopology_sp_update_worker_status | Update status for given worker |
| qtopology_sp_worker_statuses | Counts how many workers are in certain leadership status. |
| qtopology_sp_workers | Lists all workers with their statuses and other data |

### Initialization

The database doesn't need to be prepared in advance. All the objects will be created automatically, using the scripts in the `db` directory:

- **init.sql** - create initial database state that will be used to upgrade schema to latest version.
- **reset.sql** - resets database schema to the initial state. Removes all data, tables and stored procedures.
- **clear.sql** - just erases all data, but leaves schema in tact. Should be used on the latest schema.
- **vX.sql** - version upgrades.

Each time the coordinator is instantiated, it first peforms database initialization by executing these steps:

```````````````
run init.js
fetch version from database
detect version-upgrade files that need to be run
for each upgrade file
    run file
    update version
```````````````

If database schema is already at the latest version, then nothing happens.
