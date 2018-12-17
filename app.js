var express = require('express')
var http = require('http')
var path = require('path')
var mysql = require('mysql')
var bodyParser= require('body-parser')
var  Excel = require('exceljs')
var _ = require('underscore');

var app = express();
var server = http.createServer(app);

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

app.set("view engine","jade")
app.set('views', __dirname + '/views');
app.use(express.static("public"))

var connection = mysql.createConnection ({
  host: 'localhost',
  user: 'natacion',
  password: 'natacion',
  database: 'natacion'
})

connection.connect (function(err) {
})

app.get('/',function(req, res) {
  res.render('index')
})

app.post('/pruebas', function(req, res) {
  if(req.body.prueba == undefined) {
    res.render('index')
  } else {
    var disputada = false
    var tiempo_insertado = false
    connection.query("select tiempo_electronico, tiempo_manual from tiempo where id_prueba = " + req.body.prueba + ";", function(err, tiempos, fields) {
      if(tiempos[0].tiempo_electronico != null) {
        disputada = true
      }
      if(tiempos[0].tiempo_manual != null) {
        tiempo_insertado = true
      }
      res.render('gestion/index',{title: 'Escoja una opcion', prueba: req.body.prueba, jornada: req.body.jornada, disputada: disputada, tiempo: tiempo_insertado})
    })
  }
})

app.get('/actualizar_marcas', function(req, res) {
  connection.query("select nadador.id_nadador, nadador.mejor_marca, tiempo.tiempo_electronico from tiempo tiempo left join nadador_tiempo nadador_tiempo on tiempo.id_tiempo = nadador_tiempo.id_tiempo left join nadador nadador on nadador_tiempo.id_nadador = nadador.id_nadador order by tiempo.tiempo_electronico desc", function(err, nadadores, fields) {
    for(i = 0; i < nadadores.length; i++) {
      if(nadadores[i].tiempo_electronico < nadadores[i].mejor_marca)
        connection.query("update nadador set mejor_marca= " + nadadores[i].tiempo_electronico + " where id_nadador= '" + nadadores[i].id_nadador + "';")
    }
  })
  res.render('index')
})

app.post('/gestion', function(req, res) {
  if(req.body.opcion == 'informe') {
    connection.query("select id_club from club;", function(err, clubs, fields) {
      if(!err) {
        connection.query("select sede.num_calles from sede sede left join jornada jornada on jornada.id_sede = sede.id_sede where jornada.id_jornada = " + req.body.jornada + ";", function(err,calles,fields) {
          if(!err) {
            res.render('informes/index', {clubs: clubs, calles: calles[0].num_calles, prueba: req.body.prueba, jornada: req.body.jornada})
          }
        })
      }
    })
  } else if (req.body.opcion == "iniciar") {
    connection.query("select serie from tiempo where id_prueba = " + req.body.prueba + " limit 1;", function(err, series, fields){
      var serie = series[0].serie
      connection.query("select prueba.nombre, prueba.categoria, nadador_tiempo.id_nadador from  nadador_tiempo nadador_tiempo left join tiempo tiempo on nadador_tiempo.id_tiempo = tiempo.id_tiempo left join prueba prueba on tiempo.id_prueba = prueba.id_prueba where tiempo.id_prueba = " + req.body.prueba + " and tiempo.serie = " + serie + " order by tiempo.calle;", function(err, nadadores, fields) {
        if(nadadores[0].categoria == 'B') {
          nadadores[0].categoria = 'Benjamin'
        } else {
          nadadores[0].categoria = 'Promesas'
        }
        var title = nadadores[0].nombre + ' ' + nadadores[0].categoria + ' Serie ' + serie
        res.render('pruebas/ejecucion', {title: title, nadadores: nadadores, serie : serie, prueba : req.body.prueba})
      })
    })
  } else if(req.body.opcion == "tiempos") {
    connection.query("select tiempo.id_tiempo, tiempo.serie, tiempo.calle, prueba.nombre, prueba.categoria, nadador_tiempo.id_nadador from  nadador_tiempo nadador_tiempo left join tiempo tiempo on nadador_tiempo.id_tiempo = tiempo.id_tiempo left join prueba prueba on tiempo.id_prueba = prueba.id_prueba where tiempo.id_prueba = " + req.body.prueba + " order by tiempo.serie, tiempo.calle;", function(err, nadadores, fields) {
      for(i=0; i < nadadores.length; i++){
        nadadores[i].id_nadador = nadadores[i].id_nadador + ', Serie ' + nadadores[i].serie + ', Calle ' + nadadores[i].calle
      }
      if(nadadores[0].categoria == 'B') {
        nadadores[0].categoria = 'Benjamin'
      } else {
        nadadores[0].categoria = 'Promesas'
      }
      var title = 'Insertar tiempos, ' + nadadores[0].nombre + ' ' + nadadores[0].categoria
      res.render('pruebas/tiempos_manuales', {title: title, nadadores: nadadores, prueba: req.body.prueba})
    })
  } else {
    res.render('gestion/index')
  }
})

app.post("/tiempos_manuales", function(req, res) {
  var tiempos = req.body.tiempo
  var id_tiempo = req.body.id_tiempo
  for(i = 0; i < tiempos.length; i++) {
    var time_splitted = tiempos[i].split(":")
    var minutos = parseInt(time_splitted[0])
    var segundos = parseFloat(time_splitted[1])
    if (minutos >= 1)
    minutos = minutos * 60
    segundos += minutos
    connection.query("update tiempo set tiempo_manual = " + segundos + " where id_tiempo = " + id_tiempo[i] + ";", function(err, rows, fields) {
    })
  }
  res.render('index')
})

app.post("/ejecucion", function(req, res) {
  var serie = parseInt(req.body.serie) + 1
  connection.query("select prueba.nombre, tiempo.calle, prueba.categoria, nadador_tiempo.id_nadador from  nadador_tiempo nadador_tiempo left join tiempo tiempo on nadador_tiempo.id_tiempo = tiempo.id_tiempo left join prueba prueba on tiempo.id_prueba = prueba.id_prueba where tiempo.serie = " + serie + " and tiempo.id_prueba = " + req.body.prueba +" order by tiempo.calle;", function(err, nadadores, fields) {
    if(nadadores.length == 0) {
      connection.query("select distinct tiempo.tiempo_electronico, nadador_prueba.posicion, prueba.nombre, prueba.categoria, nadador_tiempo.id_nadador from  nadador_tiempo nadador_tiempo left join tiempo tiempo on nadador_tiempo.id_tiempo = tiempo.id_tiempo left join prueba prueba on tiempo.id_prueba = prueba.id_prueba left join nadador_prueba nadador_prueba on tiempo.id_prueba = nadador_prueba.id_prueba where (tiempo.id_prueba = " + req.body.prueba +") order by tiempo.tiempo_electronico;", function(err, resultados, fields) {
        var posicion = 1
        for(i = 0; i < resultados.length; i++) {
          connection.query("update nadador_prueba set posicion = " + posicion + " where id_prueba = " + req.body.prueba + " and id_nadador = '" + resultados[i].id_nadador + "';", function(err, rows, fields) {
          })
          posicion ++
        }
      })
      var clubs = []
      connection.query("select id_club from club;", function(err, clubes, fields) {
        for(i = 0; i < clubes.length; i ++) {
          var club = { id_club: clubes[i].id_club, contador: 0, sexo: 'A'}
          clubs.push(club)
          var club = { id_club: clubes[i].id_club, contador: 0, sexo: 'O'}
          clubs.push(club)
        }
        connection.query("select nadador.sexo, nadador_club.id_club, nadador_prueba.id_nadador, nadador_prueba.posicion from nadador_club nadador_club left join nadador_prueba nadador_prueba on nadador_club.id_nadador = nadador_prueba.id_nadador left join nadador nadador on nadador_prueba.id_nadador = nadador.id_nadador where nadador_prueba.id_prueba = " + req.body.prueba + " order by nadador_prueba.posicion;", function(err, nadadores, fields) {
          for(i = 0; i < nadadores.length; i ++) {
            for(j = 0; j < clubs.length; j++) {
              if(nadadores[i].id_club === clubs[j].id_club && nadadores[i].sexo === clubs[j].sexo){
                clubs[j].contador = clubs[j].contador + 1
                  var puntacion = 0
                  var puntuacion_clubs = 0
                  switch(nadadores[i].posicion) {
                    case 1:
                      puntuacion = 600
                      break
                    case 2:
                      puntuacion = 400
                      break
                    case 3:
                      puntuacion = 350
                      break
                    case 4:
                      puntuacion = 250
                      break
                    case 5:
                      puntuacion = 200
                      break
                    case 6:
                      puntuacion = 150
                      break
                    case 7:
                      puntuacion = 100
                      break
                    case 8:
                      puntuacion = 70
                      break
                    case 9:
                      puntuacion = 60
                      break
                    default:
                    puntuacion = 5
                  }
                  if(clubs[j].contador <= 3) {
                    puntuacion_clubs = puntuacion
                  }
                  connection.query("update nadador_prueba set puntuacion_nadador = " + puntuacion + ", puntuacion_clubs = " + puntuacion_clubs + " where id_prueba = " + req.body.prueba + " and id_nadador = '" + nadadores[i].id_nadador + "';", function(err, rows, fields) {
                  })
              }
            }
          }
          for(i = 0; i < clubs.length; i++) {
          }
        })
      })

      res.render('index')
    } else {
      if(nadadores[0].categoria == 'B') {
        nadadores[0].categoria = 'Benjamin'
      } else {
        nadadores[0].categoria = 'Promesas'
      }
      var title = nadadores[0].nombre + ' ' + nadadores[0].categoria + ' Serie ' + serie
      for(i = 0; i < nadadores.length; i ++) {
        nadadores[i].id_nadador = nadadores[i].calle + ' ' + ' ' + nadadores[i].id_nadador
      }
      res.render('pruebas/ejecucion', {title: title, nadadores: nadadores, serie : serie, prueba : req.body.prueba})
    }
  })
})

app.post("/tiempos", function(req, res) {
  req.setTimeout(600000)
  var serie = req.body.serie
  var prueba = req.body.prueba
  connection.query("select tiempo.id_tiempo, tiempo.calle, prueba.nombre, prueba.categoria, nadador_tiempo.id_nadador from  nadador_tiempo nadador_tiempo left join tiempo tiempo on nadador_tiempo.id_tiempo = tiempo.id_tiempo left join prueba prueba on tiempo.id_prueba = prueba.id_prueba where tiempo.id_prueba = " + req.body.prueba + " and tiempo.serie = " + serie + " order by tiempo.calle;", function(err, nadadores, fields) {
    if(nadadores[0].categoria == 'B') {
      nadadores[0].categoria = 'Benjamin'
    } else {
      nadadores[0].categoria = 'Promesas'
    }
    var title = nadadores[0].nombre + ' ' + nadadores[0].categoria + ' Serie ' + serie
    var presentes = [0, 0, 0, 0, 0, 0]
    for(i = 0; i < nadadores.length; i ++) {
      presentes[nadadores[i].calle - 1] = 1
    }
    const { spawn } = require('child_process');
    const  process = spawn('python',["./cronometro.py", presentes[0], presentes[1], presentes[2], presentes[3], presentes[4], presentes[5], presentes[6]]);
    process.stdout.on('data', function (data) {
      tiempos = data.toString()
      tiempos= tiempos.split(',')
      tiempos_corregidos = []
      for(i= 0; i < tiempos.length; i++) {
        tiempos[i] = tiempos[i].replace(/[\[\]u\'\n ]/g,'')
        if(tiempos[i] != '00:00.00')
          tiempos_corregidos.push(tiempos[i])
      }
      tiempos = tiempos_corregidos
      for(i= 0; i < tiempos.length; i++) {
        nadadores[i].id_nadador = nadadores[i].calle + ' ' + nadadores[i].id_nadador + ' ' + tiempos[i]
        var time_splitted = tiempos[i].split(":")
        var minutos = parseInt(time_splitted[0])
        var segundos = parseFloat(time_splitted[1])
        if (minutos >= 1)
          minutos = minutos * 60
        segundos += minutos
        connection.query("update tiempo set tiempo_electronico = " + segundos + " where id_tiempo = " + nadadores[i].id_tiempo + ";", function(err, rows, fields) {
        })
      }
      res.render('pruebas/tiempos', {title: title, nadadores: nadadores, serie : serie, prueba : prueba})
    })
  })
})



app.post('/reorganizar', function(req, res) {
  connection.query("select nadador.id_nadador, dorsal.dorsal from nadador nadador left join nadador_jornada on nadador.id_nadador = nadador_jornada.id_nadador left join dorsal dorsal on nadador.id_nadador = dorsal.id_nadador where (nadador_jornada.estado = 'ALTA' and nadador_jornada.id_jornada = " + req.body.jornada_reorganizacion + ")",function(err, nadadores, fields) {
    if(!err) {
      for(i = 0; i < nadadores.length; i++) {
        nadadores[i].dorsal = nadadores[i].id_nadador + ";" + nadadores[i].dorsal
      }
      connection.query("select id_prueba,categoria from prueba where id_jornada = " + req.body.jornada_reorganizacion + ";", function(err, pruebas, fields) {
        if(!err) {
          res.render('edicion/reorganizacion', {title: 'Reorganizacion', nadadores: nadadores, jornada: req.body.jornada_reorganizacion, pruebas: pruebas})
        }
      })
    }
  })
})

app.post('/reorganizacion', function(req, res) {
  if(req.body.nadador == undefined) {
    res.render('index')
  } else {
    var pruebas = req.body.pruebas
    var nadadores_seleccionados = req.body.nadador
    var categorias = req.body.categoria
    if(nadadores_seleccionados[0].length != 1) {
      for(i = 0; i < nadadores_seleccionados.length; i++) {
        connection.query("update nadador_jornada set estado='BAJA' where(id_nadador = '" + nadadores_seleccionados[i] + "' and id_jornada = " + parseInt(req.body.jornada) + ");", function(err, rows, fields) {
        })
      }
    }else {
      connection.query("update nadador_jornada set estado='BAJA' where(id_nadador = '" + nadadores_seleccionados + "' and id_jornada = " + parseInt(req.body.jornada) + ");", function(err, rows, fields) {
      })
    }
    connection.query("delete from nadador_prueba where id_jornada = " + req.body.jornada + ";", function(err, rows,fields) {
    })

    connection.query("delete from nadador_tiempo where id_jornada = " + req.body.jornada + ";", function(err, rows, fields) {
    })
    for(x = 0; x < pruebas.length; x++) {
      connection.query("delete from tiempo where id_prueba = " + pruebas[x] + ";", function(err, rows, fields) {
      })
    }
    for(x = 0; x < pruebas.length; x ++) {
      var num_calles_sede = 0
      connection.query("select num_calles from sede sede left join jornada jornada on sede.id_sede = jornada.id_sede where (jornada.id_jornada = " + req.body.jornada + ");",function(err, num_calles, fields) {
        num_calles_sede = num_calles[0].num_calles
      })
      var serie = 1
      connection.query("select tiempo.serie from tiempo tiempo left join prueba prueba on prueba.id_prueba = tiempo.id_prueba where(prueba.id_jornada = " + req.body.jornada + ") order by tiempo.serie desc;", function(err, tiempo, fields) {
        if(tiempo.length > 0) {
          serie = tiempo[0].serie + 1
        }
      })
      connection.query("select nadador.id_nadador from nadador nadador left join dorsal dorsal on nadador.id_nadador = dorsal.id_nadador left join nadador_jornada nadador_jornada on nadador.id_nadador = nadador_jornada.id_nadador where (dorsal.dorsal like '%" + categorias[x] + "%' and nadador_jornada.estado = 'ALTA' and nadador_jornada.id_jornada = " + req.body.jornada + ") order by mejor_marca", function(err, nadadores, fields) {
        if(!err) {
          var count = 0
          var calle = 0
          var limit = 0
          var id_tiempo = 0
          var inexacto = false
          var calle_medio = num_calles_sede / 2 ;
          for(i = 0; i < nadadores.length; i ++) {
            if(count % 2 == 0) {
              calle = (calle_medio + count / 2) + 1
            }else {
              calle = (calle_medio - Math.floor(((count / 2) + count % 2))) + 1
            }
            connection.query("insert into nadador_prueba(id_nadador, id_prueba, id_jornada) values('" + nadadores[i].id_nadador + "', " + req.body.pruebas_aux[0] + ", " + req.body.jornada + ")",function(err,rows,fields) {
            })
            connection.query("insert into tiempo(id_prueba, serie, calle) values( " + req.body.pruebas_aux[0] + ", " + serie + ", " + calle + ")", function(err, rows, fields) {
            })
            connection.query("insert into nadador_tiempo (id_nadador, id_jornada, id_tiempo) select '" + nadadores[i].id_nadador + "', " + req.body.jornada + " , id_tiempo from tiempo where (id_prueba = " + req.body.pruebas_aux[0] + " and serie = " + serie + " and calle = " + calle + ");", function(err,rows,fields) {
            })
            count ++
            if(count == num_calles_sede) {
              if((nadadores.length - i - 1) < num_calles_sede * 2 - 1 && (nadadores.length - i - 1) > num_calles_sede) {
                if((nadadores.length - i - 1) / num_calles_sede != 0) {
                  limit = Math.floor((nadadores.length - i  -1 )/2)
                  inexacto = true
                }
              }
              count = 0
              serie ++
            }
            if(inexacto && count == (limit + 1) && (nadadores.length - i - 1) > 1) {
              count = 0
              serie ++
            }
          }
        }
      })
    }
    res.render('index')
  }
})

app.post('/editar', function(req, res) {
  connection.query("select nadador.id_nadador, dorsal.dorsal from nadador nadador left join nadador_jornada on nadador.id_nadador = nadador_jornada.id_nadador left join dorsal dorsal on nadador.id_nadador = dorsal.id_nadador where (nadador_jornada.estado = 'ALTA' and nadador_jornada.id_jornada = " + req.body.jornada_edicion + ")",function(err, nadadores, fields) {
    if(!err) {
      for(i = 0; i < nadadores.length; i++) {
        nadadores[i].dorsal = nadadores[i].id_nadador + ";" + nadadores[i].dorsal
      }
      res.render('edicion/edicion', {title: 'Edicion', nadadores: nadadores, jornada: req.body.jornada_edicion})
    }
  })
})

app.post('/edicion', function(req, res) {
  if(req.body.nadador == undefined) {
    res.render('index')
  } else {
    var nadadores = req.body.nadador
    if(nadadores[0].length != 1) {
      for(i = 0; i < nadadores.length; i++) {
        connection.query("update nadador_jornada set estado='BAJA' where(id_nadador = '" + nadadores[i] + "' and id_jornada = " + parseInt(req.body.jornada) + ");", function(err, rows, fields) {
        })
        connection.query("delete from nadador_prueba where( id_nadador = '" + nadadores[i] + "' and id_jornada= " + req.body.jornada + ")", function(err,rows,fields) {
        })
        connection.query("delete from nadador_tiempo where(id_nadador = '" + nadadores[i] + "' and id_jornada = " + req.body.jornada + ")", function(err,rows,fields) {
        })
      }
    } else {
      connection.query("update nadador_jornada set estado='BAJA' where(id_nadador = '" + nadadores + "' and id_jornada = " + parseInt(req.body.jornada) + ");", function(err, rows, fields) {
      })
      connection.query("delete from nadador_prueba where( id_nadador = '" + nadadores + "' and id_jornada= " + req.body.jornada + ")", function(err,rows,fields) {
      })
      connection.query("delete from nadador_tiempo where(id_nadador = '" + nadadores + "' and id_jornada = " + req.body.jornada + ")", function(err,rows,fields){
      })
    }
    res.render('index')
  }
})

app.post('/anhadir', function(req, res) {
  connection.query("select id_prueba, nombre, categoria from prueba where id_jornada = " + req.body.jornada + ";", function(err, pruebas, fields) {
    if(!err) {
      for(i = 0; i < pruebas.length; i++) {
        var categoria = 0
        if(pruebas[i].categoria === 'P') {
          categoria = 'Promesas'
        } else {
          categoria = 'Benjamin'
        }
        pruebas[i].nombre = pruebas[i].nombre + ' ' + categoria
      }
      res.render('pruebas/anhadir',{pruebas: pruebas, jornada: req.body.jornada})
    }
  })
})

app.post('/ins_participante', function(req, res) {
  connection.query("select id_tiempo from tiempo where serie = " + req.body.serie + " and calle = " + req.body.calle + ";", function(err, tiempos, fields) {
    if(!err) {
      if(tiempos.length > 0) {
        connection.query("select id_nadador from nadador_jornada where id_nadador = '" + req.body.id_nadador + "'", function(err, nadador, fields) {
          if(nadador.length > 0) {
            connection.query("update nadador_jornada set estado = 'ALTA' where id_nadador = '" + req.body.id_nadador + "'", function(err, rows, fields) {
            })
          } else {
            connection.query("insert into nadador_jornada(id_nadador, id_jornada, estado) values ('" + req.body.id_nadador + "', " + req.body.jornada + ", 'ALTA')", function(err, rows, fields) {
            })
          }
        })
        connection.query("insert into nadador_prueba(id_nadador, id_prueba, id_jornada) values('" + req.body.id_nadador + "', " + req.body.prueba + ", " + req.body.jornada + ")", function(err, rows, fields) {
        })
        connection.query("insert into nadador_tiempo(id_nadador, id_tiempo, id_jornada) values('" + req.body.id_nadador + "', " + tiempos[0].id_tiempo + ", " + req.body.jornada + ")", function(err, rows, fields){
        })
      } else {
        connection.query("select id_nadador from nadador_jornada where id_nadador = '" + req.body.id_nadador + "'", function(err, nadador, fields) {
          if(nadador.length > 0) {
            connection.query("update nadador_jornada set estado = 'ALTA' where id_nadador = '" + req.body.id_nadador + "'", function(err, rows, fields) {
            })
          } else {
            connection.query("insert into nadador_jornada(id_nadador, id_jornada, estado) values ('" + req.body.id_nadador + "', " + req.body.jornada + ", 'ALTA')", function(err, rows, fields) {
            })
          }
        })
        connection.query("insert into tiempo(id_prueba, serie, calle) values(" + req.body.prueba + ", " + req.body.serie + ", " + req.body.calle + ")", function(err, rows, fields) {
        })
        connection.query("insert into nadador_tiempo (id_nadador, id_jornada, id_tiempo) select '" + req.body.id_nadador + "', " + req.body.jornada + " , id_tiempo from tiempo where (id_prueba = " + req.body.prueba + " and serie = " + req.body.serie + " and calle = " + req.body.calle + ");", function(err, rows, fields) {
        })
        connection.query("insert into nadador_prueba(id_nadador, id_prueba, id_jornada) values('" + req.body.id_nadador + "', " + req.body.prueba + ", " + req.body.jornada + ")", function(err, rows, fields) {
        })
      }
    }
  })
  res.render('index')
})

app.post('/informes', function(req, res) {
  var categoria = ''
  var prueba = ''
  var title = 'No hay competidores'
  connection.query("select categoria from prueba where (id_prueba = " + parseInt(req.body.prueba) + " AND id_jornada = " + parseInt(req.body.jornada) + ")", function(err, categorias, fields) {
    if(!err) {
      if(req.body.informe == 'previo') {
        connection.query("select distinct dorsal.dorsal , club.id_club, nadador.id_nadador, nadador.sexo, nadador.anho_nacimiento, nadador.mejor_marca, nadador_jornada.estado, tiempo.calle, tiempo.serie, prueba.categoria, prueba.nombre 'prueba', jornada.id_jornada 'jornada', dorsal.id_temporada 'temporada' from nadador nadador left join dorsal dorsal on nadador.id_nadador = dorsal.id_nadador left join nadador_club nadador_club on nadador.id_nadador = nadador_club.id_nadador left join club club on nadador_club.id_club = club.id_club left join nadador_jornada on nadador.id_nadador = nadador_jornada.id_nadador left join nadador_tiempo on nadador.id_nadador = nadador_tiempo.id_nadador left join tiempo tiempo on nadador_tiempo.id_tiempo = tiempo.id_tiempo left join prueba prueba on prueba.id_prueba = tiempo.id_prueba left join jornada jornada on prueba.id_jornada = jornada.id_jornada where(jornada.id_jornada = " + req.body.jornada + " and prueba.id_prueba = " + req.body.prueba +" and dorsal.dorsal like '%" + categorias[0].categoria + "%' and nadador_jornada.estado = 'ALTA') order by nadador.mejor_marca, tiempo.serie asc;", function(err, nadadores, fields) {
          if(!err) {
            if(nadadores.length > 0) {
              var categoria = nadadores[0].categoria
              if(categoria === 'P') {
                categoria = 'Promesas'
              } else {
                categoria = 'Benjamin'
              }
              prueba = nadadores[0].prueba
              title = 'Temporada ' + nadadores[0].temporada + ' Jornada ' + nadadores[0].jornada + ' ' + nadadores[0].prueba + ' ' + categoria
              for(j = 0; j < nadadores.length; j++) {
                var segundos = parseInt(nadadores[j].mejor_marca)
                var milisegundos = nadadores[j].mejor_marca - segundos
                var cuenta = segundos / 60.00
                var minutos = parseInt(cuenta)
                segundos = (cuenta - minutos) * 60
                segundos += milisegundos
                minutos = minutos.toString()
                if(minutos.length == 1)
                  minutos = "0" + minutos
                segundos = segundos.toFixed(2)
                segundos = segundos.toString()
                if(segundos.length == 4)
                  segundos = "0" + segundos
                nadadores[j].mejor_marca = minutos + ":" + segundos
              }
            }
            var series = []
            for(i = 0; i < nadadores.length; i++){
              var yaEsta = false
              for(j = 0; j < series.length; j++){
                if(nadadores[i].serie  == series[j])
                  yaEsta = true
              }
              if(!yaEsta)
                series.push(nadadores[i].serie)
            }
            res.render('informes/previo',  {categoria: categoria, prueba: prueba , title: title, nadadores: nadadores, series: series, nombre_prueba : nadadores[0].prueba + ' ' + categoria})
          }
        })
      }else if(req.body.informe == 'club') {
        connection.query("select distinct dorsal.dorsal , club.id_club, nadador.id_nadador, nadador.sexo, nadador.anho_nacimiento, nadador.mejor_marca, nadador_jornada.estado, tiempo.calle, tiempo.serie, prueba.categoria, prueba.nombre 'prueba', jornada.id_jornada 'jornada', dorsal.id_temporada 'temporada' from nadador nadador left join dorsal dorsal on nadador.id_nadador = dorsal.id_nadador left join nadador_club nadador_club on nadador.id_nadador = nadador_club.id_nadador left join club club on nadador_club.id_club = club.id_club left join nadador_jornada on nadador.id_nadador = nadador_jornada.id_nadador left join nadador_tiempo on nadador.id_nadador = nadador_tiempo.id_nadador left join tiempo tiempo on nadador_tiempo.id_tiempo = tiempo.id_tiempo left join prueba prueba on prueba.id_prueba = tiempo.id_prueba left join jornada jornada on prueba.id_jornada = jornada.id_jornada where(jornada.id_jornada = " + req.body.jornada + " and prueba.id_prueba = " + req.body.prueba +" and dorsal.dorsal like '%" + categorias[0].categoria + "%' and nadador_jornada.estado = 'ALTA' and club.id_club = '" + req.body.chosen_club + "') order by nadador.mejor_marca, tiempo.serie asc;", function(err, nadadores, fields) {
          if(!err) {
            if(nadadores.length > 0) {
              var categoria = nadadores[0].categoria
              if(categoria === 'P') {
                categoria = 'Promesas'
              } else {
                categoria = 'Benjamin'
              }
              prueba = nadadores[0].prueba
              title = 'Temporada ' + nadadores[0].temporada + ' Jornada ' + nadadores[0].jornada + ' ' + nadadores[0].prueba + ' ' + categoria + ' Club ' + req.body.chosen_club
              for(j = 0; j < nadadores.length; j++) {
                var segundos = parseInt(nadadores[j].mejor_marca)
                var milisegundos = nadadores[j].mejor_marca - segundos
                var cuenta = segundos / 60.00
                var minutos = parseInt(cuenta)
                segundos = (cuenta - minutos) * 60
                segundos += milisegundos
                minutos = minutos.toString()
                if(minutos.length == 1)
                  minutos = "0" + minutos
                segundos = segundos.toFixed(2)
                segundos = segundos.toString()
                if(segundos.length == 4)
                  segundos = "0" + segundos
                nadadores[j].mejor_marca = minutos + ":" + segundos
              }
            }
            res.render('informes/club', {categoria: categoria, prueba: prueba , title: title, nadadores: nadadores })
          }
        })
      }else if(req.body.informe == 'resultado') {
        connection.query("select distinct dorsal.dorsal , club.id_club, nadador.id_nadador, nadador.sexo, nadador.anho_nacimiento, nadador.mejor_marca, nadador_jornada.estado, tiempo.calle, tiempo.serie, prueba.categoria, prueba.nombre 'prueba', jornada.id_jornada 'jornada', dorsal.id_temporada 'temporada', tiempo.tiempo_electronico 'tiempo', nadador_prueba.puntuacion_nadador, nadador_prueba.posicion from nadador nadador left join dorsal dorsal on nadador.id_nadador = dorsal.id_nadador left join nadador_club nadador_club on nadador.id_nadador = nadador_club.id_nadador left join club club on nadador_club.id_club = club.id_club left join nadador_jornada on nadador.id_nadador = nadador_jornada.id_nadador left join nadador_tiempo on nadador.id_nadador = nadador_tiempo.id_nadador left join tiempo tiempo on nadador_tiempo.id_tiempo = tiempo.id_tiempo left join prueba prueba on prueba.id_prueba = tiempo.id_prueba left join jornada jornada on prueba.id_jornada = jornada.id_jornada left join nadador_prueba nadador_prueba on prueba.id_prueba = nadador_prueba.id_prueba and nadador.id_nadador = nadador_prueba.id_nadador where(jornada.id_jornada = " + req.body.jornada + " and prueba.id_prueba = " + req.body.prueba + " and dorsal.dorsal like '%" + categorias[0].categoria + "%' and nadador_jornada.estado = 'ALTA' and nadador_prueba.puntuacion_nadador is not null) order by nadador_prueba.posicion asc;", function(err, nadadores, fields){
          if(!err) {
            if(nadadores.length > 0) {
              categoria = nadadores[0].categoria
              if(categoria === 'P'){
                categoria = 'Promesas'
              } else {
                categoria = 'Benjamin'
              }
              prueba = nadadores[0].prueba
              title = 'Temporada ' + nadadores[0].temporada + ' Jornada ' + nadadores[0].jornada + ' ' + nadadores[0].prueba + ' ' + categoria
              for(j = 0; j < nadadores.length; j++) {
                var segundos = parseInt(nadadores[j].tiempo)
                var milisegundos = nadadores[j].tiempo - segundos
                var cuenta = segundos / 60.00
                var minutos = parseInt(cuenta)
                segundos = (cuenta - minutos) * 60
                segundos += milisegundos
                minutos = minutos.toString()
                if(minutos.length == 1)
                  minutos = "0" + minutos
                segundos = segundos.toFixed(2)
                segundos = segundos.toString()
                if(segundos.length == 4)
                  segundos = "0" + segundos
                nadadores[j].tiempo = minutos + ":" + segundos
                if(nadadores[j].tiempo == 'NaN:NaN')
                  nadadores[j].tiempo = '-'
                if(nadadores[j].posicion == null)
                  nadadores[j].posicion = '-'
                if(nadadores[j].puntuacion_nadador == null)
                  nadadores[j].puntuacion_nadador = '-'
                if(nadadores[j].serie == 0)
                  nadadores[j].serie = '-'
                if(nadadores[j].calle == 0)
                  nadadores[j].calle = '-'
              }
            }
            res.render('informes/resultado', {categoria: categoria, prueba: prueba , title: title, nadadores: nadadores })
          }
        })
      }else if(req.body.informe == 'calle') {
        connection.query("select distinct nadador.mejor_marca, dorsal.dorsal, dorsal.id_temporada 'temporada', tiempo.serie, nadador_tiempo.id_nadador, prueba.nombre 'prueba', prueba.categoria from tiempo tiempo left join nadador_tiempo nadador_tiempo on tiempo.id_tiempo = nadador_tiempo.id_tiempo left join prueba prueba on tiempo.id_prueba = prueba.id_prueba left join dorsal dorsal on dorsal.id_nadador = nadador_tiempo.id_nadador left join nadador nadador on nadador_tiempo.id_nadador = nadador.id_nadador where tiempo.id_prueba = " + req.body.prueba + " and tiempo.calle = " + req.body.chosen_calle + " order by tiempo.serie asc;", function(err, nadadores, fields) {
          if(!err) {
            categoria = nadadores[0].categoria
            if(categoria === 'P') {
              categoria = 'Promesas'
            } else {
              categoria = 'Benjamin'
            }
            title = 'Temporada ' + nadadores[0].temporada + ' Jornada ' + req.body.jornada + ' ' + nadadores[0].prueba + ' ' + categoria + ' Calle ' + req.body.chosen_calle
            res.render('informes/calle',{categoria: categoria, prueba: prueba, title: title, nadadores:nadadores})
          }
        })
      }
      else {
        res.render('index')
      }
    }
  })
})

app.get('/jornadas', function(req, res) {
  connection.query("select jornada.id_jornada 'id_jornada', jornada.jornada 'jornada', sede.nombre 'sede', jornada.id_temporada 'temporada' from sede sede left join jornada jornada on sede.id_sede=jornada.id_sede order by id_jornada asc;", function(err, jornadas, fields) {
    if(!err) {
      var empty = true
      for(j = 0; j < jornadas.length; j++) {
        if(jornadas[j].temporada == null) {
          jornadas.splice(j, 1)
        } else {
          jornadas[j].temporada = 'Jornada: ' + jornadas[j].jornada + ',  Temporada: ' + jornadas[j].temporada
          empty = false
        }
      }
       res.render('jornadas/index', { title: 'Jornadas', jornadas: jornadas, empty});
    }
  })
})

app.post('/jornadas', function(req, res) {
  connection.query("select id_prueba, id_jornada, nombre, categoria from prueba where id_jornada=" + req.body.jornada + ";", function(err, pruebas, fields){
    if(!!err){
      res.render('index')
    } else {
      var empty = false
        if(pruebas.length == 0) {
          empty = true
        } else {
          for(j = 0; j < pruebas.length; j++) {
            if(pruebas[j].categoria === 'P') {
              pruebas[j].categoria = 'Promesas'
            } else {
              pruebas[j].categoria = 'Benjamin'
            }
            pruebas[j].nombre = pruebas[j].nombre + ', ' + pruebas[j].categoria
          }
        }
      connection.query("select jornada from jornada where id_jornada = " + req.body.jornada + ";", function(err, jorns, fields) {
        res.render('pruebas/index', {title: 'Pruebas jornada ' + jorns[0].jornada, jornada: req.body.jornada, pruebas: pruebas, empty})
      })
    }
  })
})

app.get('/ins_jornada', function(req, res) {
  connection.query("select nombre from sede", function(err, sedes, fields) {
    if(!err) {
      connection.query("select id_temporada from temporada", function(err, temporadas, fields) {
        if(!err) {
          res.render('jornadas/form', {sedes: sedes, temporadas: temporadas})
        }
      })
    }
  })
})

app.post('/ins_jornada', function(req, res) {
  var id_temporada = req.body.temporada
  if(req.body.nueva_temporada != '') {
    connection.query("insert into temporada(id_temporada) values('" + req.body.nueva_temporada + "')",function(err, rows, fields) {
      if(!err) {
        id_temporada = req.body.nueva_temporada
      }
    })
  }
  var id_sede = 0
  connection.query("select nombre, id_sede from sede;",function(err, sedes, fields) {
    for(j = 0; j < sedes.length; j++) {
      if(sedes[j].nombre.includes(req.body.sede)) {
        id_sede = sedes[j].id_sede
      }
    }
    connection.query("insert into jornada(id_sede, id_temporada, jornada, fecha) values(" + id_sede + ",'" + id_temporada + "', " + parseInt(req.body.jornada) + ", '" + req.body.fecha + "')", function(err, rows, fields) {
      if(!!err) {
        res.render('jornadas/form')
      }
    })
    connection.query("select id_jornada from jornada where id_temporada = '" + id_temporada + "' and jornada = " + parseInt(req.body.jornada) + "", function(err, jornadas, fields) {
      connection.query("select nadador.id_nadador from nadador nadador left join dorsal dorsal on nadador.id_nadador = dorsal.id_nadador where dorsal.id_temporada = '" + id_temporada + "'", function(error, nadadores, fields){
        for( i = 0; i < nadadores.length; i++) {
          connection.query("insert into nadador_jornada(id_nadador, id_jornada, estado) values('" + nadadores[i].id_nadador + "', " + jornadas[0].id_jornada + ", 'ALTA')",function(err, rows, fields) {
          })
        }
      })
    })
  })
  res.render('index')
})

app.post('/prueba_nueva', function(req, res) {
  res.render('pruebas/form', {jornada: req.body.jornada})
})

app.post('/ins_prueba', function(req, res){
  var categoriga = ''
  if(req.body.categoria == 'Promesas') {
    categoria = 'P'
  }else{
    categoria = 'B'
  }
  connection.query("insert into prueba(id_jornada, nombre, categoria) values(" + parseInt(req.body.jornada) + ",'" + req.body.nombre + "', '" + categoria + "');", function( err, rows, fields) {
    if(!!err) {
      res.render('pruebas/form')
    }else{
      var id_prueba = 0
      connection.query("select id_prueba from prueba where( id_jornada = " + req.body.jornada + " and nombre = '" + req.body.nombre + "' and categoria = '" + categoria + "')",function(err, rows, fields) {
        if(!err) {
          id_prueba = rows[0].id_prueba
        }
      })
      var num_calles_sede = 0
      connection.query("select num_calles from sede sede left join jornada jornada on sede.id_sede = jornada.id_sede where (jornada.id_jornada = " + req.body.jornada + ");",function(err, calles, fields) {
        num_calles_sede = calles[0].num_calles
      })
      var serie = 1
      connection.query("select tiempo.serie from tiempo tiempo left join prueba prueba on prueba.id_prueba = tiempo.id_prueba where(prueba.id_jornada = " + req.body.jornada + ") order by tiempo.serie desc;", function(err, tiempos, fields){
        if(tiempos.length > 0){
          serie = tiempos[0].serie + 1
        }
      })
      connection.query("select nadador.id_nadador from nadador nadador left join dorsal dorsal on nadador.id_nadador = dorsal.id_nadador left join nadador_jornada nadador_jornada on nadador.id_nadador = nadador_jornada.id_nadador where (dorsal.dorsal like '%" + categoria + "%' and nadador_jornada.estado = 'ALTA' and nadador_jornada.id_jornada = " + req.body.jornada + ") order by mejor_marca", function(err, nadadores, fields) {
        if(!err) {
          var count = 0
          var calle = 0
          var limit = 0
          var id_tiempo = 0
          var inexacto = false
          var calle_medio = num_calles_sede / 2 ;
          for( i = 0; i < nadadores.length; i ++){
            if(count % 2 == 0) {
              calle = (calle_medio + count / 2) + 1
            } else {
              calle = (calle_medio - Math.floor(((count / 2) + count % 2))) + 1
            }
            connection.query("insert into nadador_prueba(id_nadador, id_prueba, id_jornada) values('" + nadadores[i].id_nadador + "', " + id_prueba + ", " + req.body.jornada + ")",function(err, rows, fields) {
            })
            connection.query("insert into tiempo(id_prueba, serie, calle) values( " + id_prueba + ", " + serie + ", " + calle + ")", function(err, rows, fields) {
            })
            connection.query("insert into nadador_tiempo (id_nadador, id_jornada, id_tiempo) select '" + nadadores[i].id_nadador + "', " + req.body.jornada + " , id_tiempo from tiempo where (id_prueba = " + id_prueba + " and serie = " + serie + " and calle = " + calle + ");", function(error,filas,campos) {
            })
            count ++
            if(count == num_calles_sede) {
              if((nadadores.length - i - 1) < num_calles_sede * 2 - 1 && (nadadores.length - i - 1) > num_calles_sede) {
                if((nadadores.length - i - 1) / num_calles_sede != 0) {
                  limit = Math.floor((nadadores.length - i  -1 )/2)
                  inexacto = true
                }
              }
              count = 0
              serie ++
            }
            if(inexacto && count == (limit + 1) && (nadadores.length - i - 1) > 1){
              count = 0
              serie ++
            }
          }
        }
      })
      res.render('index')
    }
  })
})

app.get('/clubs', function(req,res) {
  connection.query("select id_club from club;", function(err, clubs, fields){
    if(!err){
       res.render('clubs/index', { title: 'Clubs', clubs: clubs });
    }
  })
})

app.get('/ins_club' , function(req,res) {
  res.render('clubs/form')
})

app.post('/ins_club', function(req,res) {
  connection.query("insert into club(id_club) values('" +  req.body.id_club +"')", function(err, rows, fields) {
    if(!!err) {
      res.render('clubs/form')
    } else {
      connection.query("select id_club from club;", function(err, clubs, fields) {
        if(!err) {
           res.render('clubs/index', { title: 'Clubs', clubs: clubs });
        }
      })
    }
  })
})

app.post('/editar_nadador', function(req, res){
  connection.query("select dorsal.dorsal, dorsal.id_temporada, nadador.id_nadador, club.id_club, nadador.mejor_marca from dorsal dorsal left join nadador nadador on nadador.id_nadador = dorsal.id_nadador left join nadador_club nadador_club on nadador.id_nadador = nadador_club.id_nadador left join club club on nadador_club.id_club = club.id_club where nadador.id_nadador= '" + req.body.nadador + "';", function(err, nadadores, fields) {
    if(!err) {
      if(nadadores.length > 0){
        var nadador = nadadores[0]
        connection.query("select id_club from club", function(err, clubs, fields) {
          if(!err) {
            connection.query("select id_temporada from temporada", function(err, temporadas, fields){
              if(!err) {
                res.render('nadadores/edicion',{nadador: nadador, clubs: clubs, temporadas: temporadas})
              }
            })
          }
        })
      } else {
        res.render('index')
      }
    }
  })
})

app.post('/nadador_editado', function(req, res) {
  var id_temporada = req.body.id_temporada
  if(req.body.nueva_temporada != '') {
    connection.query("insert into temporada(id_temporada) values('" + req.body.nueva_temporada + "')", function(err, rows, fields) {
      if(!err) {
        id_temporada = req.body.nueva_temporada
      }
    })
  }
  connection.query("delete from dorsal where id_nadador = '" + req.body.id_nadador + "';", function(err, rows, fields) {
  })
  connection.query("delete from nadador_club where id_nadador = '" + req.body.id_nadador + "';", function(err, rows, fields) {
  })
  connection.query("insert into nadador_club(id_nadador, id_club, id_temporada) values('" + req.body.id_nadador + "', '" + req.body.id_club + "', '" + id_temporada + "')", function(err, rows, fields) {
  })
  connection.query("insert into dorsal(dorsal, id_nadador, id_temporada) values('" + req.body.dorsal + "', '" + req.body.id_nadador + "', '" + id_temporada + "')", function(err, rows, fields) {
  })
  connection.query("update nadador set mejor_marca = " + req.body.marca + " where id_nadador = '" + req.body.id_nadador + "';", function(err, rows, fields) {
  })
  res.render('index')
})

app.get('/nadadores', function(req, res) {
  connection.query("select id_temporada from temporada", function(err, temporadas, fields) {
    res.render('nadadores/gestion', {title: 'Escoja temporada', temporadas: temporadas})
  })
})

app.post('/nadadores',function(req,res) {
  connection.query(" select dorsal.dorsal , club.id_club, nadador.id_nadador, nadador.sexo, nadador.anho_nacimiento, nadador.mejor_marca from nadador nadador left join dorsal dorsal on nadador.id_nadador = dorsal.id_nadador left join nadador_club nadador_club on nadador.id_nadador = nadador_club.id_nadador left join club club on nadador_club.id_club = club.id_club left join temporada temporada on temporada.id_temporada = dorsal.id_temporada where dorsal.id_temporada = '" + req.body.id_temporada + "'  order by nadador.mejor_marca asc;", function(err, nadadores, fields){
    if(!err) {
      for(j = 0; j < nadadores.length; j++) {
        var segundos = parseInt(nadadores[j].mejor_marca)
        var milisegundos = nadadores[j].mejor_marca - segundos
        var cuenta = segundos / 60.00
        var minutos = parseInt(cuenta)
        segundos = (cuenta - minutos) * 60
        segundos += milisegundos
        minutos = minutos.toString()
        if(minutos.length == 1)
          minutos = "0" + minutos
        segundos = segundos.toFixed(2)
        segundos = segundos.toString()
        if(segundos.length == 4)
          segundos = "0" + segundos
          nadadores[j].mejor_marca = minutos + ":" + segundos
        }
       res.render('nadadores/index', { title: 'Nadadores', nadadores: nadadores })

    }
  })
})

app.get('/ins_nadador',function(req,res) {
  connection.query("select id_club from club;", function(err, clubs, fields) {
    if(!err) {
      connection.query("select id_temporada from temporada;", function(err, temporadas, fields){
        if(!err) {
          res.render('nadadores/form', {clubs: clubs, temporadas: temporadas})
        }
      })
    }
  })

})

app.post('/ins_nadador',function(req,res) {
  var id_temporada = req.body.temporada
  if(req.body.nueva_temporada != '') {
    connection.query("insert into temporada(id_temporada) values('" + req.body.nueva_temporada + "')",function(err, rows,fields){
      if(!err) {
        id_temporada = req.body.nueva_temporada
        var genero = ''
        if(req.body.sexo == 'Masculino') {
          genero = 'O'
        } else {
          genero = 'A'
        }
          connection.query("insert into nadador( id_nadador, sexo, anho_nacimiento, mejor_marca) values('" + req.body.id_nadador + "','" + genero + "'," + parseInt(req.body.anho_nacimiento) + "," + parseFloat(req.body.marca) + ")", function(err, rows, fields){
            if(!!err){
              res.render('nadadores/form')
            }
          })
          connection.query("insert into nadador_club(id_nadador, id_club, id_temporada) values ('" + req.body.id_nadador + "', '" + req.body.id_club + "', '" + id_temporada + "');", function(err, rows, fields) {
          })
          connection.query("insert into dorsal(dorsal, id_nadador, id_temporada) values('" + req.body.dorsal + "', '" + req.body.id_nadador + "', '" + id_temporada + "')",function(err, rows, fields) {
          })
      }
    })
  } else {
      var genero = ''
      if(req.body.sexo == 'Masculino') {
        genero = 'O'
      } else {
        genero = 'A'
      }
        connection.query("insert into nadador( id_nadador, sexo, anho_nacimiento, mejor_marca) values('" + req.body.id_nadador + "','" + genero + "'," + parseInt(req.body.anho_nacimiento) + "," + parseFloat(req.body.marca) + ")", function(err, rows, fields){
          if(!!err){
            res.render('nadadores/form')
          }
        })
        connection.query("insert into nadador_club(id_nadador, id_club, id_temporada) values ('" + req.body.id_nadador + "', '" + req.body.id_club + "', '" + id_temporada + "');", function(err, rows, fields) {
        })
        connection.query("insert into dorsal(dorsal, id_nadador, id_temporada) values('" + req.body.dorsal + "', '" + req.body.id_nadador + "', '" + id_temporada + "')",function(err, rows, fields) {
        })
  }
    res.render('index')
})

app.get('/sedes',function(req,res){
  connection.query("select id_sede, nombre, piscina, num_calles, longitud from sede order by id_sede asc;;", function(err, sedes, fields) {
    if(!err){
      for(j = 0; j < sedes.length; j++) {
        sedes[j].longitud = sedes[j].longitud + ' m'
      }
       res.render('sedes/index', { title: 'Sedes', sedes: sedes })
    }
  })
})

app.get('/ins_sede', function(req,res) {
  res.render('sedes/form')
})

app.post('/ins_sede', function(req,res) {
  connection.query("insert into sede(nombre,piscina,num_calles,longitud) values('" +  req.body.nombre +"','" + req.body.piscina + "'," + parseInt(req.body.calles) + "," + parseInt(req.body.longitud) + ")", function(err, rows, fields) {
    if(!!err){
      res.render('sedes/form')
    }else{
      connection.query("select id_sede, nombre, piscina, num_calles, longitud from sede order by id_sede asc;", function(err, sedes, fields){
        if(!err) {
          for(j = 0; j < sedes.length; j++) {
            sedes[j].longitud = sedes[j].longitud + ' m'
          }
           res.render('sedes/index', { title: 'Sedes', sedes: sedes });
        }
      })
    }
  })
})

app.get('/excel',function(req, res){
  connection.query("select id_temporada from temporada", function(err,rows,fields){
    if(!err){
      res.render('excel/index',{rows: rows})
    }
  })
})

app.post('/excel', function(req,res) {
  var id_temporada = req.body.temporada
  if(req.body.nueva_temporada != '') {
    connection.query("insert into temporada(id_temporada) values('" + req.body.nueva_temporada + "')", function(err, rows, fields) {
      if(!err) {
        id_temporada = req.body.nueva_temporada
      }
    })
  }
  var workbook = new Excel.Workbook();
  workbook.xlsx.readFile('./files/' + req.body.archivo).then(function() {
    var worksheet = workbook.getWorksheet(1)
    var i
    var colegios = []
    var tiempos = []
    for (i = 2; i < worksheet.actualRowCount + 1; i++ ) {
      var row = worksheet.getRow(i)
      var equals = false;
      for(j = 0; j < colegios.length; j++){
        if(colegios[j] === row.getCell(4).value)
          equals = true
      }
      if(!equals)
        colegios.push(row.getCell(4).value)
    }
    for (i = 0; i < colegios.length; i++) {
      connection.query("insert into club(id_club) values('" + colegios[i] + "');", function(err, rows, fields) {
      })
    }
    connection.query("select id_club from club;", function(err, clubs, fields) {
      if(!err){
        for(i = 2; i < worksheet.actualRowCount + 1; i++) {
          var row = worksheet.getRow(i)
          var time = (row.getCell(6)).toString()
          var time_splitted = time.split(":")
          var minutos = parseInt(time_splitted[0])
          var segundos = parseFloat(time_splitted[1])
          if (minutos >= 1)
          minutos = minutos * 60
          segundos += minutos
          connection.query("insert into nadador(id_nadador, sexo, anho_nacimiento, mejor_marca) values('" + row.getCell(1).value + "','" + row.getCell(2).value + "'," + row.getCell(3).value + "," + segundos + ");", function(error, rows, fields) {
          })
          for(j = 0; j < clubs.length; j++) {
            if(row.getCell(4).value == clubs[j].id_club) {
              connection.query("insert into nadador_club(id_nadador, id_club, id_temporada) values ('" + row.getCell(1).value + "', '" + row.getCell(4).value + "', '" + id_temporada + "');", function(err, rows, fields) {
              })
              connection.query("insert into dorsal(dorsal, id_nadador, id_temporada) values('" + row.getCell(5).value + "', '" + row.getCell(1).value + "', '" + id_temporada + "')", function(err, rows, fields) {
              })
            }
          }
        }
      }
    })
  })
  res.render('index')
})

app.get('/clasificacion', function(req, res) {
  connection.query("select id_temporada from temporada", function(err, temporadas, fields) {
    res.render('clasificacion/previo', {title: 'Clasificacion', temporadas: temporadas})
  })
})

app.post('/clasificacion', function(req, res) {
  if(req.body.tipo === 'Clubs') {
    var clubs = []
    connection.query("select id_club from club", function(err, clubes, fields) {
      for(i = 0; i < clubes.length; i++) {
        var club = {id_club: clubes[i].id_club, puntuacion_clubs: 0}
        clubs.push(club)
      }
      connection.query("select nadador_club.id_club, nadador_prueba.id_nadador, nadador_prueba.puntuacion_clubs from nadador_prueba nadador_prueba left join jornada jornada on nadador_prueba.id_jornada = jornada.id_jornada left join nadador_club nadador_club on nadador_club.id_nadador = nadador_prueba.id_nadador where jornada.id_temporada = '" + req.body.id_temporada + "';", function(err, nadadores, fields) {
        for(i = 0; i < nadadores.length; i++) {
          for(j = 0; j < clubs.length; j++) {
            if(nadadores[i].id_club == clubs[j].id_club) {
              clubs[j].puntuacion_clubs = clubs[j].puntuacion_clubs +  nadadores[i].puntuacion_clubs
            }
          }
        }
        var sortedClubs = _.sortBy(clubs, 'puntuacion_clubs')
        res.render('clasificacion/index', {title: 'Clasificación ' + req.body.id_temporada, clubs: sortedClubs.reverse()})
      })
    })
  } else {
    res.render('clasificacion/escoger_nadadores', {id_temporada: req.body.id_temporada})
  }
})

app.post('/clasificacion_nadadores', function(req, res) {
  var genero = ''
  if(req.body.sexo == 'Masculino') {
    genero = 'O'
  } else {
    genero = 'A'
  }
  var categoriga = ''
  if(req.body.categoria == 'Promesas') {
    categoria = 'P'
  }else{
    categoria = 'B'
  }
  var nadadores = []
  connection.query("select nadador.id_nadador from nadador nadador left join dorsal dorsal on nadador.id_nadador = dorsal.id_nadador where nadador.sexo = '" + genero + "' and dorsal.dorsal like '%" + categoria + "%' and dorsal.id_temporada='" + req.body.id_temporada + "'", function(err, nadadores_seleccionados, fields) {
    for(i = 0; i < nadadores_seleccionados.length; i++) {
      var nadador = {id_nadador: nadadores_seleccionados[i].id_nadador, puntuacion_nadador: 0}
      nadadores.push(nadador)
    }
    connection.query("select nadador_prueba.id_nadador, nadador_prueba.puntuacion_nadador from nadador_prueba nadador_prueba left join jornada jornada on nadador_prueba.id_jornada = jornada.id_jornada where jornada.id_temporada = '" + req.body.id_temporada + "';", function(err, puntuaciones, fields) {
      for(i = 0; i < puntuaciones.length; i++) {
        for(j = 0; j < nadadores.length; j++) {
          if(puntuaciones[i].id_nadador == nadadores[j].id_nadador) {
            nadadores[j].puntuacion_nadador = nadadores[j].puntuacion_nadador +  puntuaciones[i].puntuacion_nadador
          }
        }
      }
      var sortedNadadores = _.sortBy(nadadores, 'puntuacion_nadador')
      res.render('clasificacion/clasificacion_nadadores', {title: 'Clasificación ' + req.body.id_temporada, nadadores: sortedNadadores.reverse()})
    })
  })
})

app.listen(4000);
