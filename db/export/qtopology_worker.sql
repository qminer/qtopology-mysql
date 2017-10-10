CREATE TABLE `qtopology_worker` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `status` varchar(10) NOT NULL,
  `last_ping` datetime NOT NULL,
  `lstatus` varchar(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8