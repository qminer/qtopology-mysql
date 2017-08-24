CREATE TABLE `qtopology_message` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `worker` varchar(100) NOT NULL,
  `cmd` varchar(100) NOT NULL,
  `content` mediumtext NOT NULL,
  `created` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8