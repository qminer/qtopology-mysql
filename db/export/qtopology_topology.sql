CREATE TABLE `qtopology_topology` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(100) NOT NULL,
  `config` mediumtext NOT NULL,
  `status` varchar(10) NOT NULL,
  `worker` varchar(100) DEFAULT NULL,
  `weight` float NOT NULL,
  `worker_affinity` varchar(200) DEFAULT NULL,
  `last_ping` datetime NOT NULL,
  `error` varchar(1000) DEFAULT NULL,
  `enabled` tinyint(4) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8