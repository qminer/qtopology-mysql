CREATE TABLE `qtopology_topology_history` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `ts` datetime NOT NULL,
  `uuid` varchar(100) NOT NULL,
  `status` varchar(10) NOT NULL,
  `worker` varchar(100) DEFAULT NULL,
  `weight` float NOT NULL,
  `worker_affinity` varchar(200) DEFAULT NULL,
  `error` varchar(1000) DEFAULT NULL,
  `enabled` tinyint(4) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_qtopology_topology_history_ut` (`uuid`,`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8