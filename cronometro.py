from datetime import datetime
import time
import sys

instanteInicial = datetime.now()
tiempos = [0, 0, 0, 0, 0, 0]
# al final de la partida
presentes = [0, 0, 0, 0, 0, 0]
for i in range(6):
    presentes[i] = sys.argv[i + 1]
time.sleep(float(0))
for i in range(6):
    instanteFinal = datetime.now()
    tiempo = instanteFinal - instanteInicial # Devuelve un objeto timedelta
    tiempo = unicode(tiempo).split(":")
    minutos = tiempo[1]
    segundos = tiempo [2]
    tiempos[i] = presentes[i] + ":" + segundos[:5]
    if presentes[i] == '0':
        tiempos[i] = '00:00.00'
print(tiempos)
sys.stdout.flush(tiempos)
