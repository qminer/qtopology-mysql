create table  if not exists qtopology_settings (
    name varchar(100) not null,
    value mediumtext not null,
    primary key (name)
);

insert ignore into qtopology_settings(name, value)
values ('db_version', '0');
