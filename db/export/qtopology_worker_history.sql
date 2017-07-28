CREATE TABLE `qtopology_worker_history` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `ts` datetime NOT NULL,
  `name` varchar(100) NOT NULL,
  `status` varchar(10) NOT NULL,
  `lstatus` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_qtopology_worker_history_nt` (`name`,`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8