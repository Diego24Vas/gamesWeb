// Banco de palabras de 5 letras en español para Wordle
// Todas las palabras están en mayúsculas, sin tildes para uniformidad de teclado

export const TARGET_WORDS: string[] = [
  'ABAJO', 'ABEJA', 'ABRIL', 'ACERO', 'ACTOR', 'AGUDO', 'AGUJA', 'AHORA', 'AIREA', 'ALDEA',
  'ALMAS', 'ALTAR', 'AMIGO', 'ANCHO', 'ANGEL', 'ANIMO', 'ANTES', 'ARBOL', 'ARENA', 'AROMA',
  'ARROZ', 'ASADO', 'ATLAS', 'AUDIO', 'AUTOS', 'AVION', 'AVISO', 'AYUDA', 'BAILE', 'BANCO',
  'BARBA', 'BARCA', 'BARCO', 'BARRO', 'BEBER', 'BELLO', 'BESOS', 'BICHO', 'BLUSA', 'BOLSA',
  'BOMBA', 'BOSCO', 'BOTON', 'BRAVO', 'BRAZO', 'BREVE', 'BRISA', 'BRUJA', 'BUENO', 'BURRO',
  'CABLE', 'CABRA', 'CACAO', 'CAIDA', 'CAJAS', 'CALOR', 'CAMAS', 'CAMPO', 'CANAL', 'CANTO',
  'CARNE', 'CARRO', 'CARTA', 'CASAS', 'CASCO', 'CEBRA', 'CESTO', 'CHICO', 'CIELO', 'CINCO',
  'CIRCO', 'CISNE', 'CLARA', 'CLARO', 'CLASE', 'CLAVE', 'CLIMA', 'COBRA', 'COCHE', 'COFRE',
  'COLOR', 'COMER', 'CORAL', 'CORTE', 'CORTO', 'COSAS', 'COSTA', 'CREMA', 'CRUDO', 'CUEVA',
  'CULPA', 'DADOS', 'DANZA', 'DATOS', 'DECIR', 'DEDOS', 'DESEO', 'DEUDA', 'DIOSA', 'DISCO',
  'DOBLE', 'DOLOR', 'DONDE', 'DORSO', 'DRAMA', 'DULCE', 'DUQUE', 'ENERO', 'ENTRE', 'ENVIO',
  'ERROR', 'ESPIL', 'ESPIA', 'EXITO', 'EXTRA', 'FALDA', 'FANGO', 'FAROL', 'FAUNA', 'FAVOR',
  'FELIZ', 'FERIA', 'FIBRA', 'FIESTA', 'FIRMA', 'FLACO', 'FLECHA', 'FLORA', 'FLOTA', 'FOCAL',
  'FONDO', 'FORMA', 'FOSIL', 'FOTOS', 'FRENO', 'FRESA', 'FUEGO', 'FUERA', 'FURIA', 'GAFAS',
  'GALLO', 'GATOS', 'GENIO', 'GENTE', 'GLOBO', 'GOLPE', 'GORRA', 'GOTAS', 'GRANO', 'GRAPA',
  'GRASA', 'GRATO', 'GRIFO', 'GRITO', 'GRUPO', 'GUAPO', 'GUIAS', 'GUION', 'HABER', 'HABLA',
  'HACER', 'HACHA', 'HARINA', 'HASTA', 'HECHO', 'HELADO', 'HIELO', 'HIJOS', 'HILOS', 'HOGAR',
  'HOJAS', 'HONOR', 'HORNO', 'HOTEL', 'HUESO', 'HUEVO', 'HUMOR', 'HUMOS', 'ICONO', 'IDEAL',
  'IDEAS', 'IGUAL', 'IMPAR', 'ISLAS', 'JABON', 'JAULA', 'JEFES', 'JINETE', 'JOVEN', 'JUEGO',
  'JUGAR', 'JUGO', 'JULIO', 'JUNIO', 'JUNTO', 'LABIO', 'LANCE', 'LARGO', 'LASER', 'LATAS',
  'LATIN', 'LECHE', 'LENTO', 'LEONA', 'LETRA', 'LEYES', 'LIBRO', 'LIDER', 'LIMON', 'LINEA',
  'LISTA', 'LLAMA', 'LLAVE', 'LLENO', 'LOBO', 'LOBOS', 'LOGRO', 'LUCES', 'LUGAR', 'LUNAR',
  'LUNES', 'LUCHA', 'MADRE', 'MAGIA', 'MAGNO', 'MALLA', 'MANGO', 'MANOS', 'MANTA', 'MAPAS',
  'MARCA', 'MAREA', 'MARZO', 'MASAS', 'MAYOR', 'MEDIO', 'MEJOR', 'MELON', 'MENOS', 'MENTE',
  'MESAS', 'METAL', 'METRO', 'MIEDO', 'MINAS', 'MITAD', 'MIXTO', 'MOLDE', 'MONTE', 'MORAL',
  'MOTOR', 'MUECA', 'MUJER', 'MUNDO', 'MUSEO', 'NACER', 'NADAR', 'NARIZ', 'NAVIO', 'NEGRO',
  'NIEVE', 'NINJA', 'NIVEL', 'NOCHE', 'NORTE', 'NOTAS', 'NUBES', 'NUDOS', 'NUEVO', 'NUNCA',
  'OASIS', 'OBRAS', 'OESTE', 'OJOS', 'OLIVA', 'ONDAS', 'OPERA', 'ORDEN', 'OREJA', 'ORGAS',
  'ORINA', 'ORURO', 'OVEJA', 'OXIDO', 'PADRE', 'PAGAR', 'PAGOS', 'PALMA', 'PALOS', 'PANAL',
  'PAPEL', 'PARED', 'PARTE', 'PASOS', 'PASTA', 'PATAS', 'PATIO', 'PAUSA', 'PECHO', 'PEDAL',
  'PELEA', 'PELOS', 'PERLA', 'PERRO', 'PESAS', 'PESCA', 'PIANO', 'PIEZA', 'PILAS', 'PINAR',
  'PINTO', 'PISTA', 'PIZZA', 'PLACA', 'PLANO', 'PLATA', 'PLATO', 'PLAYA', 'PLAZA', 'PLENO',
  'PLUMA', 'POBRE', 'PODER', 'POEMA', 'POETA', 'POLLO', 'POLVO', 'POMPA', 'PORTE', 'POSTE',
  'POZOS', 'PRADO', 'PRECIO', 'PRIMA', 'PRIMO', 'PROSA', 'PULPO', 'PUNTA', 'PUNTO', 'PUZZLE',
  'QUESO', 'QUIEN', 'QUITA', 'RADAR', 'RADIO', 'RAMAS', 'RAMOS', 'RANGO', 'RATAS', 'RATON',
  'RAYOS', 'RAZON', 'RECTO', 'REGALO', 'REGLA', 'REINA', 'REINO', 'RELOJ', 'RENTA', 'RESTO',
  'REYES', 'RIEGO', 'RIFLE', 'RIMAS', 'RISAS', 'RITMO', 'ROBOT', 'ROCAS', 'RODEO', 'ROJOS',
  'ROLLO', 'ROMBO', 'RONDA', 'ROSAS', 'RUEDA', 'RUIDO', 'RUMBO', 'RURAL', 'SABER', 'SABOR',
  'SABIO', 'SACOS', 'SALDO', 'SALIR', 'SALON', 'SALSA', 'SALTO', 'SALUD', 'SANTO', 'SAPOS',
  'SECOS', 'SELLO', 'SELVA', 'SENDA', 'SERIE', 'SILLA', 'SILBA', 'SITIO', 'SOBRA', 'SOLAR',
  'SOMBRA', 'SOPAS', 'SORDO', 'SUAVE', 'SUELO', 'SUERO', 'SUSTO', 'TABLA', 'TACOS', 'TACTO',
  'TALLA', 'TALLO', 'TARDE', 'TAREA', 'TAZAS', 'TECHO', 'TELAS', 'TEMAS', 'TEMOR', 'TEMPO',
  'TENIS', 'TENOR', 'TERCO', 'TERSO', 'TEXTO', 'TIGRE', 'TINTA', 'TIRES', 'TIRAS', 'TITAN',
  'TOCAR', 'TOMAR', 'TOMES', 'TORNO', 'TORRE', 'TORTA', 'TRAJE', 'TRAMA', 'TRAMO', 'TRAZO',
  'TRECE', 'TRENES', 'TRIGO', 'TRONO', 'TROPA', 'TRUCO', 'TUBOS', 'TUMBA', 'TURNO', 'UNICO',
  'UNION', 'VACAS', 'VAGON', 'VALOR', 'VALLE', 'VAPOR', 'VASOS', 'VECES', 'VELAS', 'VELOZ',
  'VENAS', 'VENTA', 'VERDE', 'VERSO', 'VIAJE', 'VIDAS', 'VIDEO', 'VIDRIO', 'VIEJO', 'VIENTO',
  'VIGOR', 'VILLAS', 'VINOS', 'VISTA', 'VIVIR', 'VOCAL', 'VUELO', 'VULGO', 'YACER', 'YATES',
  'YERBA', 'YESOS', 'ZORRO', 'ZUMOS'
].filter((w) => w.length === 5);

// Lista ampliada de palabras permitidas para adivinar (incluye todas las objetivo más adicionales)
export const VALID_GUESS_SET = new Set<string>([
  ...TARGET_WORDS,
  'ABRIR', 'ACTAS', 'ACUSO', 'AFORO', 'AGRIO', 'AJENO', 'ALGAS', 'ALIAS', 'ALPES', 'ALZAR',
  'AMADO', 'AMBAR', 'ANDAR', 'APODO', 'APOYO', 'APTOS', 'ARETE', 'ARPAS', 'ASILO', 'ASTRO',
  'ATAJO', 'ATICO', 'ATORO', 'AVENA', 'AXILA', 'AZOTE', 'BACHE', 'BAJAS', 'BALAS', 'BALDE',
  'BALON', 'BANDO', 'BARAT', 'BOCAS', 'BODAS', 'BOINA', 'BOTAS', 'BOTES', 'BOZAL', 'BRUMA',
  'BUCEO', 'BUCHE', 'BUCLE', 'CABOS', 'CAJON', 'CALLE', 'CALVO', 'CAMPOS', 'CANAS', 'CANOA',
  'CAPAZ', 'CAPAS', 'CARAS', 'CARGO', 'CARPA', 'CASOS', 'CAUCE', 'CELDA', 'CENAS', 'CERDO',
  'CIEGO', 'CINTA', 'CIVIL', 'COPAS', 'COROS', 'CRUCE', 'CUNAS', 'CURAS', 'CURSO', 'DAMAS',
  'DARDO', 'DEBUT', 'DICHO', 'DIETA', 'DOLAR', 'DONES', 'DOTES', 'DUNAS', 'EBANO', 'ELITE',
  'ENANO', 'ENLACE', 'ENVES', 'EPOCA', 'ETAPA', 'ETICA', 'ETICO', 'FAROS', 'FASES', 'FATAL',
  'FECHA', 'FETOS', 'FINCA', 'FINOS', 'FOCOS', 'FOROS', 'FOSAS', 'FUGAS', 'GIRAR', 'GIRAS',
  'GUIAS', 'GUISO', 'HABAS', 'HADOS', 'HALOS', 'HAMPA', 'HILOS', 'HURTO', 'IDOLO', 'IGLU',
  'INDIO', 'ISLAS', 'JARRA', 'JARRAS', 'JOYAS', 'JUGOS', 'KILOS', 'LACAS', 'LADOS', 'LAGOS',
  'LANAS', 'LAPICES', 'LAPSO', 'LAZOS', 'LEJOS', 'LILAS', 'LIMAS', 'LINCE', 'LIRIO', 'LISAS',
  'LITRO', 'LLAVE', 'LLAVE', 'LOBAS', 'LOMOS', 'LOROS', 'LOTES', 'LUCES', 'LUNAS', 'MACHO',
  'MAGOS', 'MANAS', 'MARES', 'MATAS', 'METAS', 'MICOS', 'MILAG', 'MINAS', 'MIRAR', 'MODAS',
  'MODOS', 'MONOS', 'MOZOS', 'MUROS', 'MUTUO', 'NAVIO', 'NIDOS', 'NOTAS', 'NUCAS', 'NUDOS',
  'OLIVA', 'ONDAS', 'OPALO', 'ORCAS', 'ORDEN', 'PABLO', 'PACAS', 'PAJAS', 'PALAS', 'PANES',
  'PASAS', 'PAVOS', 'PECES', 'PENAS', 'PESOS', 'PINOS', 'PIPAS', 'PIZZA', 'PODAS', 'POMOS',
  'POZOS', 'PULGA', 'RADAR', 'RAMAS', 'RAYAS', 'REDES', 'REGIO', 'REJAS', 'RELOJ', 'RENOS',
  'RIFAS', 'RIMAS', 'RIZOS', 'ROBOS', 'ROCAS', 'ROSAS', 'ROTOS', 'RUBIO', 'RUTAS', 'SABIO',
  'SAGAZ', 'SALAS', 'SAPOS', 'SECOS', 'SENAS', 'SETAS', 'SOFAS', 'SOLOS', 'SUBIR', 'SUMAS',
  'TACAS', 'TAPAS', 'TELAS', 'TERMO', 'TINAS', 'TIPOS', 'TOPOS', 'TOROS', 'TRAJE', 'TUBOS',
  'VACAS', 'VALES', 'VASOS', 'VELAS', 'VERAS', 'VICIOS', 'VOTOS', 'YEMAS', 'YOGUR', 'ZAPAS'
].filter((w) => w.length === 5));

// Función para obtener una palabra aleatoria de la lista
export const getRandomTargetWord = (): string => {
  const index = Math.floor(Math.random() * TARGET_WORDS.length);
  return TARGET_WORDS[index];
};

// Comprobar si una palabra es válida para envío
export const isValidWord = (word: string): boolean => {
  if (word.length !== 5) return false;
  const upper = word.toUpperCase();
  return VALID_GUESS_SET.has(upper) || TARGET_WORDS.includes(upper);
};
