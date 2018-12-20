
drop database if exists natacion;
create database if not exists natacion;

use natacion;


create table if not exists sede (
  id_sede int not null auto_increment,
  nombre varchar(40) not null,
  piscina varchar(40) not null,
  num_calles int not null,
  longitud int not null,
  primary key (id_sede)
);

create table if not exists club (
  id_club varchar(50) not null,
  primary key (id_club)
);

create table if not exists nadador (
  id_nadador varchar(100) not null,
  sexo varchar(1) not null,
  anho_nacimiento int not null,
  mejor_marca float(7,3),
  primary key (id_nadador)
);

create table if not exists temporada(
  id_temporada varchar(40),
  primary key (id_temporada)
);

create table if not exists jornada (
  id_jornada int not null auto_increment,
  jornada int not null,
  id_sede int not null,
  id_temporada varchar(40) not null,
  fecha varchar(40),
  foreign key (id_sede) references sede(id_sede),
  foreign key (id_temporada) references temporada(id_temporada),
  primary key (id_jornada)
);

create table if not exists prueba (
    id_prueba int not null auto_increment,
    id_jornada int not null,
    nombre varchar(40) not null,
    categoria varchar(40) not null ,
    primary key (id_prueba),
    foreign key (id_jornada) references jornada(id_jornada)
);

create table if not exists tiempo (
  id_tiempo int not null auto_increment,
  id_prueba int not null,
  serie int,
  calle int,
  tiempo_electronico float(7,3),
  tiempo_manual float(7,3),
  tiempo_volante float (7,3),
  tiempo_touchpad float (7,3),
  elegido varchar(40),
  primary key (id_tiempo),
  foreign key (id_prueba) references prueba(id_prueba)
);

create table if not exists nadador_tiempo (
  id_nadador varchar(100) not null,
  id_tiempo int not null,
  id_jornada int not null,
  foreign key (id_nadador) references nadador(id_nadador),
  foreign key (id_tiempo) references tiempo(id_tiempo),
  foreign key (id_jornada) references jornada(id_jornada)
);

create table if not exists nadador_club (
  id_nadador varchar(100) not null,
  id_club varchar(50) not null,
  id_temporada varchar(40) not null,
  foreign key (id_nadador) references nadador(id_nadador),
  foreign key (id_club) references club(id_club),
  foreign key (id_temporada) references temporada(id_temporada)
);

create table if not exists dorsal(
  dorsal varchar(40) not null,
  id_nadador varchar(100) not null,
  id_temporada varchar(40) not null,
  primary key (dorsal),
  foreign key (id_nadador) references nadador(id_nadador),
  foreign key (id_temporada) references temporada(id_temporada)
);

create table if not exists nadador_jornada(
  id_nadador varchar(100) not null,
  id_jornada int not null,
  estado varchar(20),
  foreign key (id_nadador) references nadador(id_nadador),
  foreign key (id_jornada) references jornada(id_jornada)
);

create table if not exists nadador_prueba(
  id_nadador varchar(100) not null,
  id_prueba int not null,
  id_jornada int not null,
  puntuacion_nadador int,
  puntuacion_clubs int,
  posicion int,
  foreign key (id_nadador) references nadador(id_nadador),
  foreign key  (id_prueba) references prueba(id_prueba),
  foreign key (id_jornada) references jornada(id_jornada)
)
