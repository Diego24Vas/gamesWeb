// Banco ampliado y optimizado de palabras de 5 letras en español para Wordle
// Todas las palabras están en mayúsculas y sin tildes para uniformidad de teclado.

const RAW_TARGET_WORDS: string[] = [
  // A
  'ABACO', 'ABAJO', 'ABEJA', 'ABETO', 'ABONO', 'ABRIL', 'ABRIR', 'ABUSO', 'ACABO', 'ACARO',
  'ACASO', 'ACERO', 'ACIDO', 'ACOSO', 'ACTOR', 'ACTOS', 'ACTUA', 'ACUDA', 'ACUDO', 'AFANO',
  'AFINO', 'AFORO', 'AGATA', 'AGAVE', 'AGORA', 'AGOTO', 'AGRIO', 'AGUDO', 'AGUJA', 'AHORA',
  'AIREA', 'AIRES', 'AISLO', 'AJENO', 'AJUAR', 'ALAMO', 'ALANO', 'ALBAS', 'ALBOR', 'ALBUR',
  'ALCE', 'ALDEA', 'ALELO', 'ALERO', 'ALETA', 'ALGAS', 'ALIAS', 'ALIEN', 'ALMAS', 'ALMUD',
  'ALOJA', 'ALOJO', 'ALPES', 'ALTAR', 'ALTAS', 'ALTOS', 'ALZAR', 'AMABA', 'AMADA', 'AMADO',
  'AMAGO', 'AMALA', 'AMALO', 'AMATE', 'AMBAR', 'AMBAS', 'AMBOS', 'AMENO', 'AMIGA', 'AMIGO',
  'AMINO', 'ANCHA', 'ANCHO', 'ANCLA', 'ANDAD', 'ANDAR', 'ANDAS', 'ANDEN', 'ANDES', 'ANEJO',
  'ANEXO', 'ANGEL', 'ANIMA', 'ANIMO', 'ANION', 'ANODO', 'ANOTO', 'ANSIA', 'ANTES', 'ANTRO',
  'ANUAL', 'APAGA', 'APAGO', 'APEGO', 'APELA', 'APELO', 'APENA', 'APERO', 'APICE', 'APODO',
  'APOLO', 'APOYA', 'APOYO', 'APURA', 'APURO', 'AQUEL', 'ARABE', 'ARADA', 'ARADO', 'ARANA',
  'ARBOL', 'ARCAD', 'ARCES', 'ARCHI', 'ARCOS', 'ARDER', 'ARDOR', 'ARDUO', 'ARENA', 'ARETE',
  'ARGON', 'ARGOS', 'ARGOT', 'ARIAS', 'ARIDA', 'ARIDO', 'ARIES', 'ARMAS', 'ARMAR', 'ARNES',
  'AROMA', 'ARPAS', 'ARPIA', 'ARPON', 'ARRAS', 'ARREO', 'ARROZ', 'ARTES', 'ARZON', 'ASADA',
  'ASADO', 'ASCUA', 'ASILO', 'ASNAS', 'ASNOS', 'ASOMA', 'ASOMO', 'ASPAS', 'ASPID', 'ASTAS',
  'ASTRO', 'ASTUR', 'ATACA', 'ATACO', 'ATAJO', 'ATAUD', 'ATEOS', 'ATICA', 'ATICO', 'ATLAS',
  'ATOMO', 'ATONO', 'ATORA', 'ATORO', 'ATRAE', 'ATRAS', 'ATROZ', 'AUDIO', 'AUDIT', 'AUGUR',
  'AULAS', 'AUNAR', 'AURAS', 'AUREO', 'AUTOR', 'AUTOS', 'AVALA', 'AVALO', 'AVARA', 'AVARO',
  'AVENA', 'AVION', 'AVISO', 'AXILA', 'AYUDA', 'AYUNO', 'AZADA', 'AZOTE', 'AZUL',

  // B
  'BABAS', 'BABEL', 'BABOR', 'BACHE', 'BADEN', 'BAGRE', 'BAHIA', 'BAILE', 'BAJAN', 'BAJAR',
  'BAJAS', 'BAJEL', 'BAJIO', 'BAJOS', 'BALAN', 'BALAR', 'BALAS', 'BALDA', 'BALDE', 'BALDO',
  'BALIN', 'BALON', 'BALSA', 'BAMBU', 'BANAL', 'BANCA', 'BANCO', 'BANDA', 'BANDO', 'BANOS',
  'BARBA', 'BARCA', 'BARCO', 'BARDA', 'BARDO', 'BARIO', 'BARON', 'BARRA', 'BARRO', 'BASAL',
  'BASAR', 'BASAS', 'BASES', 'BASTA', 'BASTO', 'BATEA', 'BATEL', 'BATES', 'BATEY', 'BATIR',
  'BATON', 'BAYAS', 'BAZAR', 'BEATO', 'BEBER', 'BEBIO', 'BEDEL', 'BEIGE', 'BELEN', 'BELLA',
  'BELLO', 'BEMOL', 'BERRO', 'BESAR', 'BESOS', 'BETUN', 'BICHA', 'BICHO', 'BIELA', 'BILIS',
  'BINGO', 'BIOMA', 'BIOTA', 'BIRRA', 'BISON', 'BIZCO', 'BLUSA', 'BOATO', 'BOBAS', 'BOBOS',
  'BOCAS', 'BOCEL', 'BOCIN', 'BOCON', 'BOCETO', 'BODAS', 'BOGAR', 'BOINA', 'BOLAR', 'BOLAS',
  'BOLDO', 'BOLEA', 'BOLEO', 'BOLOS', 'BOLSA', 'BOLSO', 'BOMBA', 'BOMBO', 'BONGO', 'BONOS',
  'BORAX', 'BORDA', 'BORDE', 'BORDO', 'BORLA', 'BORRA', 'BOSCO', 'BOSTA', 'BOTAN', 'BOTAR',
  'BOTAS', 'BOTES', 'BOTIN', 'BOTON', 'BOYAS', 'BOZAL', 'BRACO', 'BRAGA', 'BRAMA', 'BRAVA',
  'BRAVO', 'BRAZA', 'BRAZO', 'BREGA', 'BRETE', 'BREVA', 'BREVE', 'BREZO', 'BRIDA', 'BRIOS',
  'BRISA', 'BROCA', 'BROMA', 'BROTE', 'BROWN', 'BRUJA', 'BRUJO', 'BRUMA', 'BRUTA', 'BRUTO',
  'BUCAL', 'BUCEO', 'BUCHA', 'BUCHE', 'BUCLE', 'BUENA', 'BUENO', 'BUFAS', 'BUFON', 'BUFOS',
  'BUHOS', 'BULBO', 'BULTO', 'BURDA', 'BURDO', 'BURLA', 'BURRA', 'BURRO', 'BUSCA', 'BUSCO',
  'BUSTO', 'BUZON',

  // C
  'CABAL', 'CABAS', 'CABER', 'CABES', 'CABIA', 'CABLE', 'CABOS', 'CABRA', 'CACAO', 'CACHA',
  'CACHO', 'CAIDA', 'CAIDO', 'CAIGA', 'CAJAS', 'CAJON', 'CALAR', 'CALAS', 'CALCA', 'CALCO',
  'CALDA', 'CALDO', 'CALES', 'CALIZ', 'CALLA', 'CALLE', 'CALLO', 'CALMA', 'CALMO', 'CALOR',
  'CALVA', 'CALVO', 'CAMAS', 'CAMBA', 'CAMPO', 'CANAL', 'CANAS', 'CANDO', 'CANEY', 'CANOA',
  'CANON', 'CANOS', 'CANTA', 'CANTO', 'CAOBA', 'CAPAN', 'CAPAR', 'CAPAS', 'CAPAZ', 'CAPEL',
  'CAPEA', 'CAPON', 'CAPOT', 'CAQUI', 'CARAL', 'CARAS', 'CARAY', 'CARDA', 'CARDO', 'CAREY',
  'CARGA', 'CARGO', 'CARIA', 'CARIO', 'CARNE', 'CARPA', 'CARPO', 'CARRO', 'CARTA', 'CASAL',
  'CASAR', 'CASAS', 'CASCA', 'CASCO', 'CASIA', 'CASIS', 'CASOS', 'CASTA', 'CASTO', 'CATAR',
  'CATAS', 'CATRE', 'CAUCE', 'CAUSA', 'CAUTO', 'CAVAR', 'CAVAS', 'CAYOS', 'CAZAR', 'CAZAS',
  'CAZON', 'CEBRA', 'CEBIL', 'CEBOS', 'CEBU', 'CECAL', 'CEDAN', 'CEDER', 'CEDRO', 'CEGAR',
  'CEJAS', 'CELAR', 'CELAS', 'CELDA', 'CELOS', 'CELTA', 'CENAL', 'CENAR', 'CENAS', 'CENIT',
  'CENSO', 'CERAS', 'CERCA', 'CERCO', 'CERDA', 'CERDO', 'CERIO', 'CEROS', 'CERRA', 'CERRO',
  'CESAR', 'CESES', 'CESIO', 'CESTA', 'CESTO', 'CETRO', 'CHALA', 'CHALE', 'CHAPA', 'CHATO',
  'CHECO', 'CHICA', 'CHICO', 'CHILE', 'CHINA', 'CHINO', 'CHIPA', 'CHIPS', 'CHITA', 'CHIVA',
  'CHIVO', 'CHOCA', 'CHOCO', 'CHOLA', 'CHOLO', 'CHOTA', 'CHOZA', 'CHUFA', 'CHULO', 'CHUPA',
  'CHUZO', 'CICLO', 'CIDRO', 'CIEGA', 'CIEGO', 'CIELO', 'CIENO', 'CIFRA', 'CIGAR', 'CINCO',
  'CINES', 'CINTA', 'CINTO', 'CIRCO', 'CIRIO', 'CISNE', 'CITAR', 'CITAS', 'CIVIL', 'CLARA',
  'CLARO', 'CLASE', 'CLAVA', 'CLAVE', 'CLAVO', 'CLERO', 'CLIMA', 'CLONA', 'CLONE', 'CLORO',
  'CLUBS', 'COALA', 'COATI', 'COBAS', 'COBRA', 'COBRE', 'COBRO', 'COCAS', 'COCHA', 'COCHE',
  'COCHO', 'COCOS', 'CODEX', 'CODOS', 'COFRE', 'COGER', 'COGIO', 'COIMA', 'COITO', 'COJIN',
  'COJOS', 'COLAS', 'COLES', 'COLMA', 'COLMO', 'COLON', 'COLOR', 'COMAS', 'COMBA', 'COMBO',
  'COMED', 'COMER', 'COMES', 'COMIC', 'COMIO', 'COMUN', 'CONCA', 'CONDE', 'CONGA', 'CONGO',
  'CONOS', 'COPIA', 'COPIO', 'COPAS', 'COPLA', 'COPON', 'COPRA', 'CORAL', 'CORAS', 'CORDA',
  'CORDO', 'COREA', 'CORIS', 'CORNO', 'COROS', 'CORRA', 'CORRE', 'CORRO', 'CORSO', 'CORTA',
  'CORTE', 'CORTO', 'CORVA', 'CORVO', 'CORZA', 'CORZO', 'COSAS', 'COSER', 'COSIO', 'COSTA',
  'COSTO', 'COTAS', 'COTON', 'COXAL', 'COXIS', 'CRACK', 'CRASO', 'CREAN', 'CREAR', 'CREAS',
  'CRECE', 'CREDO', 'CREMA', 'CREPA', 'CRIAR', 'CRIAS', 'CRIBE', 'CRIBO', 'CRINO', 'CROAR',
  'CROMA', 'CROMO', 'CRUCE', 'CRUDA', 'CRUDO', 'CRUEL', 'CRUJE', 'CUBAS', 'CUBOS', 'CUBRE',
  'CUCAS', 'CUCHA', 'CUCHO', 'CUECA', 'CUECE', 'CUECO', 'CUEVA', 'CUIDA', 'CUIDO', 'CUITA',
  'CULOS', 'CULPA', 'CULTO', 'CUNAS', 'CUOTA', 'CUPON', 'CURAR', 'CURAS', 'CURIA', 'CURIE',
  'CURIO', 'CURRY', 'CURSA', 'CURSE', 'CURSO', 'CURTO', 'CURVA', 'CURVO', 'CUSCO', 'CUTIS',

  // D
  'DADAS', 'DADOS', 'DAGAS', 'DALIA', 'DAMAS', 'DANDO', 'DANES', 'DANZA', 'DANZO', 'DARDO',
  'DARES', 'DARSE', 'DATAR', 'DATOS', 'DEBAN', 'DEBER', 'DEBES', 'DEBIO', 'DEBIL', 'DEBUT',
  'DECID', 'DECIR', 'DEDAL', 'DEDOS', 'DEJAR', 'DEJAS', 'DELCO', 'DELTA', 'DEMAS', 'DENSO',
  'DEPON', 'DERBI', 'DESDE', 'DESEO', 'DETEN', 'DEUDA', 'DIANA', 'DICEN', 'DICES', 'DICHA',
  'DICHO', 'DICTA', 'DICTO', 'DIEGO', 'DIERA', 'DIESE', 'DIETA', 'DIGNA', 'DIGNO', 'DIJES',
  'DINAR', 'DIODO', 'DIOSA', 'DIQUE', 'DISCO', 'DISTA', 'DIVAS', 'DOBLE', 'DOCIL', 'DOCTA',
  'DOCTO', 'DOGMA', 'DOLAR', 'DOLER', 'DOLIO', 'DOLOR', 'DOMAR', 'DOMOS', 'DONAR', 'DONAS',
  'DONDE', 'DONES', 'DORAL', 'DORAR', 'DORSO', 'DOSIS', 'DOTAR', 'DOTES', 'DOVEL', 'DRAGA',
  'DRAGO', 'DRAMA', 'DRENA', 'DRIZA', 'DROGA', 'DRUSA', 'DUCHA', 'DUCHO', 'DUDAR', 'DUDAS',
  'DUELO', 'DUENO', 'DUETO', 'DULCE', 'DUNAS', 'DUQUE', 'DURAR', 'DURAS', 'DUROS',

  // E
  'EBANO', 'ECHAD', 'ECHAR', 'ECHAS', 'EDEMA', 'EDITA', 'EDITO', 'EDUCA', 'EGIDO', 'EJIDO',
  'ELCHE', 'ELEGI', 'ELIGE', 'ELIJO', 'ELITE', 'ELLAS', 'ELLOS', 'ELOTE', 'EMAIL', 'EMITE',
  'EMITO', 'EMULA', 'EMULO', 'ENANO', 'ENERO', 'ENFAS', 'ENOJO', 'ENTES', 'ENTRA', 'ENTRE',
  'ENTRO', 'ENVES', 'ENVIO', 'EPICA', 'EPICO', 'EPOCA', 'EQUIS', 'ERBIO', 'ERGIO', 'ERIAL',
  'ERIGE', 'ERIZO', 'ERRAR', 'ERROR', 'ESPIA', 'ESPIN', 'ESQUI', 'ESTAN', 'ESTAR', 'ESTAS',
  'ESTIO', 'ESTOS', 'ETAPA', 'ETICA', 'ETICO', 'ETNIA', 'EURO', 'EVITA', 'EVITO', 'EVOCA',
  'EXIGE', 'EXIJO', 'EXILA', 'EXILO', 'EXIMA', 'EXIMO', 'EXITO', 'EXODO', 'EXPON', 'EXTRA',

  // F
  'FACIL', 'FACTO', 'FAENA', 'FAGOT', 'FAJAS', 'FAJON', 'FALAZ', 'FALDA', 'FALLA', 'FALLO',
  'FALSA', 'FALSO', 'FANGO', 'FARDO', 'FAROL', 'FAROS', 'FASES', 'FASTO', 'FATAL', 'FATUO',
  'FAUNA', 'FAUNO', 'FAVOR', 'FECHA', 'FELIZ', 'FEMUR', 'FENOL', 'FERIA', 'FEROZ', 'FETAL',
  'FETOS', 'FIBRA', 'FICHA', 'FIDEO', 'FIERA', 'FIERO', 'FIJAR', 'FIJAS', 'FIJOS', 'FILAN',
  'FILAR', 'FILAS', 'FILIA', 'FILME', 'FILMS', 'FILON', 'FILOS', 'FINAL', 'FINAS', 'FINCA',
  'FINES', 'FINOS', 'FIRMA', 'FIRME', 'FISCO', 'FLACA', 'FLACO', 'FLASH', 'FLAUTA', 'FLECO',
  'FLEJE', 'FLEMA', 'FLETE', 'FLORA', 'FLOTA', 'FLOTE', 'FLUIR', 'FLUJO', 'FOCOS', 'FOCHA',
  'FOCAL', 'FOLIO', 'FONDA', 'FONDO', 'FORJA', 'FORMA', 'FOROS', 'FORRA', 'FORRO', 'FOSAS',
  'FOSIL', 'FOTON', 'FOTOS', 'FRAGA', 'FRASE', 'FRENO', 'FRESA', 'FRIAS', 'FRIOS', 'FRITA',
  'FRITO', 'FROTE', 'FRUTA', 'FRUTO', 'FUEGO', 'FUERA', 'FUERO', 'FUGAR', 'FUGAS', 'FUGAZ',
  'FULAR', 'FUMAR', 'FUNDA', 'FUNDO', 'FURIA', 'FUROR', 'FUSIL', 'FUSTE',

  // G
  'GABAN', 'GACHO', 'GAFAS', 'GAITA', 'GAJOS', 'GALAN', 'GALAS', 'GALES', 'GALGO', 'GALON',
  'GAMBA', 'GANAR', 'GANAS', 'GANGA', 'GANSO', 'GARBO', 'GARRA', 'GARZA', 'GARZO', 'GASES',
  'GASTA', 'GASTO', 'GATAS', 'GATOS', 'GEMAS', 'GEMIR', 'GENES', 'GENIO', 'GENTE', 'GESTA',
  'GESTO', 'GIGAS', 'GIRAL', 'GIRAR', 'GIRAS', 'GIROS', 'GLOBO', 'GLOSA', 'GNOMO', 'GOBIO',
  'GOCES', 'GOFIO', 'GOLAS', 'GOLES', 'GOLFA', 'GOLFO', 'GOLPE', 'GOMAS', 'GORDA', 'GORDO',
  'GORRA', 'GORRO', 'GOTAS', 'GOTEO', 'GRADA', 'GRADO', 'GRAFO', 'GRAMA', 'GRAMO', 'GRANA',
  'GRANO', 'GRAPA', 'GRASA', 'GRASO', 'GRATA', 'GRATO', 'GRAVA', 'GRAVE', 'GRECA', 'GRECO',
  'GREDA', 'GRIFO', 'GRIMA', 'GRITO', 'GRUAS', 'GRUPO', 'GRUTA', 'GUANO', 'GUAPO', 'GUAJE',
  'GUBIA', 'GUETO', 'GUIAR', 'GUIAS', 'GUION', 'GUISA', 'GUISO', 'GULAS', 'GUSTA', 'GUSTO',

  // H
  'HABAR', 'HABAS', 'HABER', 'HABIA', 'HABIL', 'HABLA', 'HABLO', 'HACED', 'HACEN', 'HACER',
  'HACHA', 'HACIA', 'HADOS', 'HAGAN', 'HAGAS', 'HAITI', 'HALAR', 'HALOS', 'HAMPA', 'HARAS',
  'HARTO', 'HASTA', 'HAYAN', 'HAYAS', 'HAZAS', 'HEBRA', 'HECHA', 'HECHO', 'HEDER', 'HEDOR',
  'HELAR', 'HELIO', 'HENAR', 'HERID', 'HERIR', 'HEROE', 'HIELO', 'HIERAS', 'HIERO', 'HIGOS',
  'HIJAS', 'HIJOS', 'HILAR', 'HILOS', 'HIMNO', 'HINCA', 'HINCO', 'HIPAR', 'HIPER', 'HIPOS',
  'HITOS', 'HOBBY', 'HOGAR', 'HOJAS', 'HOLAS', 'HONDA', 'HONDO', 'HONOR', 'HONRA', 'HORAS',
  'HORDAS', 'HORNO', 'HOSCO', 'HOTEL', 'HOYOS', 'HUESO', 'HUEVA', 'HUEVO', 'HUIDA', 'HUIDO',
  'HUIR', 'HULLA', 'HUMAR', 'HUMOS', 'HUMOR', 'HUMUS', 'HURON', 'HURTO',

  // I
  'IBERO', 'ICONO', 'IDEAL', 'IDEAR', 'IDEAS', 'IDOLO', 'IGLUS', 'IGUAL', 'ILESO', 'ILUSO',
  'IMAGEN', 'IMITA', 'IMPAR', 'INANE', 'INCAS', 'INDIO', 'INDUS', 'INFRA', 'INTRA', 'INTRO',
  'IONES', 'IRANI', 'ISLAM', 'ISLAS', 'ISLOTE', 'ITALO', 'ITEMS',

  // J
  'JABON', 'JALAR', 'JALAS', 'JALEA', 'JALEO', 'JALON', 'JAMAS', 'JAMON', 'JAPON', 'JARAS',
  'JARRA', 'JARRO', 'JAULA', 'JAZMIN', 'JEFAS', 'JEFES', 'JEREZ', 'JINETE', 'JODER', 'JORGE',
  'JOVEN', 'JOYAS', 'JOYEL', 'JUBON', 'JUDAS', 'JUDIA', 'JUDIO', 'JUEGO', 'JUEZA', 'JUGAR',
  'JUGOS', 'JULIO', 'JUNCO', 'JUNIO', 'JUNTA', 'JUNTO', 'JURAR', 'JURAS', 'JUSTA', 'JUSTO',

  // K
  'KAPOK', 'KARMA', 'KAYAK', 'KEBAB', 'KILOS', 'KOALA', 'KRILL', 'KURDO',

  // L
  'LABIA', 'LABIO', 'LABOR', 'LABRA', 'LACAS', 'LACRE', 'LADOS', 'LADRA', 'LADRO', 'LAGAR',
  'LAGOS', 'LAICA', 'LAICO', 'LAJAS', 'LAMER', 'LAMPA', 'LANAS', 'LANAR', 'LANCE', 'LANZA',
  'LANZO', 'LAPSO', 'LARES', 'LARGA', 'LARGO', 'LARVA', 'LASER', 'LASTA', 'LATAS', 'LATEX',
  'LATIN', 'LATIR', 'LATON', 'LAUDO', 'LAURO', 'LAVAR', 'LAVAS', 'LAXOS', 'LAZOS', 'LECHE',
  'LECHO', 'LEGAL', 'LEGAR', 'LEGUA', 'LEIDO', 'LEJOS', 'LEMAS', 'LEMUR', 'LENTA', 'LENTO',
  'LEONA', 'LEPRA', 'LERDO', 'LETAL', 'LETRA', 'LEVES', 'LEYES', 'LIANA', 'LIBRA', 'LIBRE',
  'LIBRO', 'LICEO', 'LICOR', 'LIDER', 'LIDIA', 'LIGAR', 'LIGAS', 'LIJAS', 'LILAS', 'LIMAR',
  'LIMAS', 'LIMBO', 'LIMON', 'LINCE', 'LINDA', 'LINDO', 'LINEA', 'LINFA', 'LIRAS', 'LIRIO',
  'LISAS', 'LISOS', 'LISTA', 'LISTO', 'LITIO', 'LITRO', 'LLAMA', 'LLAMO', 'LLANA', 'LLANO',
  'LLAVE', 'LLEGA', 'LLEGO', 'LLENA', 'LLENO', 'LLEVA', 'LLEVO', 'LLORA', 'LLORO', 'LOBAS',
  'LOBOS', 'LOCAL', 'LOCAS', 'LOCHA', 'LOCOS', 'LODOS', 'LOGIA', 'LOGOS', 'LOGRA', 'LOGRO',
  'LOMAS', 'LOMOS', 'LONAS', 'LONJA', 'LORES', 'LOROS', 'LOTES', 'LOTOS', 'LUCES', 'LUCHA',
  'LUCHO', 'LUCIA', 'LUCIO', 'LUCIR', 'LUCRO', 'LUEGO', 'LUGAR', 'LUMEN', 'LUNAR', 'LUNAS',
  'LUNES', 'LUPAS', 'LUTOS',

  // M
  'MACAS', 'MACHO', 'MACRO', 'MADRE', 'MAFIA', 'MAGIA', 'MAGMA', 'MAGNO', 'MAGOS', 'MAIZ',
  'MALLA', 'MALOS', 'MALTA', 'MALVA', 'MAMAR', 'MAMAS', 'MAMBO', 'MAMUT', 'MANAR', 'MANCO',
  'MANDO', 'MANGA', 'MANGO', 'MANIA', 'MANOS', 'MANSA', 'MANSO', 'MANTA', 'MANTO', 'MAPAS',
  'MARCA', 'MARCO', 'MAREA', 'MAREO', 'MARES', 'MARGA', 'MARZO', 'MASAS', 'MASIA', 'MASON',
  'MATAR', 'MATAS', 'MATIZ', 'MATON', 'MAYAS', 'MAYOR', 'MAZAS', 'MECHA', 'MEDIA', 'MEDIO',
  'MEDIR', 'MEJOR', 'MELON', 'MENOR', 'MENOS', 'MENTA', 'MENTE', 'MENUS', 'MERLA', 'MESAS',
  'MESES', 'MESON', 'METAL', 'METAS', 'METER', 'METIO', 'METRO', 'MICAS', 'MICOS', 'MIDEN',
  'MIEDO', 'MIELE', 'MIGAS', 'MILAN', 'MILES', 'MILLA', 'MIMAR', 'MIMOS', 'MINAR', 'MINAS',
  'MINTO', 'MIRAR', 'MIRAS', 'MIRLO', 'MIRRA', 'MISAL', 'MISAS', 'MISIL', 'MISMA', 'MISMO',
  'MITAD', 'MITIN', 'MITOS', 'MIXTA', 'MIXTO', 'MOCHA', 'MOCHO', 'MODAL', 'MODAS', 'MODEM',
  'MODOS', 'MOFAS', 'MOHOS', 'MOJAR', 'MOJON', 'MOLAR', 'MOLDE', 'MOLES', 'MOLER', 'MONAS',
  'MONDA', 'MONDO', 'MONJE', 'MONOS', 'MONTE', 'MONTO', 'MORAL', 'MORAR', 'MORAS', 'MORBO',
  'MOROS', 'MORRA', 'MORRO', 'MORSA', 'MOSCA', 'MOSCO', 'MOSTO', 'MOTAS', 'MOTEL', 'MOTES',
  'MOTIN', 'MOTOR', 'MOTOS', 'MOVER', 'MOVIO', 'MOZOS', 'MUCHO', 'MUDAR', 'MUDAS', 'MUDOS',
  'MUECA', 'MUELA', 'MUELO', 'MUERA', 'MUERO', 'MUEVE', 'MUEVO', 'MUGRE', 'MUJER', 'MULAS',
  'MULTA', 'MUNDO', 'MURAL', 'MURAR', 'MUROS', 'MUSEO', 'MUSGO', 'MUSLO', 'MUTAR', 'MUTUA',
  'MUTUO',

  // N
  'NABOS', 'NACAR', 'NACER', 'NACIO', 'NADAR', 'NADIE', 'NAFTA', 'NAIPE', 'NARDO', 'NARIZ',
  'NASAL', 'NATAL', 'NATAS', 'NAVAL', 'NAVES', 'NAVIO', 'NAZIS', 'NECIA', 'NECIO', 'NEGAR',
  'NEGRA', 'NEGRO', 'NENES', 'NERVI', 'NEVAR', 'NICHO', 'NIDOS', 'NIEVE', 'NIMBO', 'NINFA',
  'NINJA', 'NIPON', 'NITRO', 'NIVEL', 'NOBLE', 'NOCHE', 'NODOS', 'NOGAL', 'NOMAS', 'NORIA',
  'NORMA', 'NORTE', 'NOTAR', 'NOTAS', 'NOVEL', 'NOVIA', 'NOVIO', 'NUBES', 'NUCAS', 'NUDOS',
  'NUERA', 'NUEVE', 'NUEVO', 'NUNCA', 'NUTRE',

  // O
  'OASIS', 'OBESA', 'OBESO', 'OBRAS', 'OBVIA', 'OBVIO', 'OCASO', 'OCHOS', 'OCIOS', 'OCUPA',
  'OCUPO', 'OESTE', 'OIDOS', 'OJERA', 'OJOS', 'OLIVA', 'OLIVO', 'OLLAS', 'OLMOS', 'OLOR',
  'ONDAS', 'ONIX', 'OPERA', 'OPINA', 'OPINO', 'OPTAR', 'ORBES', 'ORCAS', 'ORDEN', 'OREJA',
  'ORGIA', 'ORINA', 'ORINO', 'ORUJO', 'OSADA', 'OSADO', 'OSCAR', 'OSEAS', 'OSEOS', 'OSLO',
  'OSTRA', 'OTROS', 'OVALO', 'OVEJA', 'OVINO', 'OXIDO', 'OZONO',

  // P
  'PABLO', 'PACAS', 'PACER', 'PACTO', 'PADRE', 'PAGAN', 'PAGAR', 'PAGAS', 'PAGOS', 'PAJAS',
  'PAJON', 'PALAS', 'PALCO', 'PALIA', 'PALIO', 'PALMA', 'PALMO', 'PALOS', 'PALTO', 'PAMPA',
  'PANAL', 'PANDA', 'PANDO', 'PANEL', 'PANES', 'PANZA', 'PAPAL', 'PAPAS', 'PAPEL', 'PARAR',
  'PARAS', 'PARCA', 'PARCO', 'PARDA', 'PARDO', 'PARED', 'PARES', 'PARGO', 'PARIA', 'PARIR',
  'PARTE', 'PARTO', 'PASAR', 'PASAS', 'PASEO', 'PASES', 'PASOS', 'PASTA', 'PASTO', 'PATAS',
  'PATIN', 'PATIO', 'PAUSA', 'PAVAS', 'PAVOR', 'PAVOS', 'PEAJE', 'PEANA', 'PECES', 'PECHO',
  'PEDAL', 'PEDIR', 'PEDRO', 'PEGAS', 'PEINA', 'PEINE', 'PELAR', 'PELAS', 'PELEA', 'PELOS',
  'PENAL', 'PENAS', 'PENSO', 'PEONA', 'PEQUE', 'PERAL', 'PERAS', 'PERLA', 'PERRA', 'PERRO',
  'PESAR', 'PESAS', 'PESCA', 'PESOS', 'PESTE', 'PETAL', 'PIANO', 'PICAR', 'PICAS', 'PICOR',
  'PICOS', 'PIDEN', 'PIEZA', 'PILAR', 'PILAS', 'PILLO', 'PINAR', 'PINOS', 'PINTA', 'PINTO',
  'PINZA', 'PIPAS', 'PIQUE', 'PISAR', 'PISAS', 'PISOS', 'PISTA', 'PISTO', 'PITON', 'PIZZA',
  'PLACA', 'PLAGA', 'PLANA', 'PLANO', 'PLATA', 'PLATO', 'PLAYA', 'PLAZA', 'PLAZO', 'PLEBE',
  'PLENA', 'PLENO', 'PLOMO', 'PLUMA', 'POBRE', 'POCAS', 'POCOS', 'PODAR', 'PODAS', 'PODER',
  'PODIO', 'POEMA', 'POETA', 'POLAR', 'POLEO', 'POLEN', 'POLIO', 'POLLO', 'POLVO', 'POMOS',
  'POMPA', 'PONEN', 'PONER', 'PONES', 'PONGA', 'PONIS', 'POPAS', 'PORRA', 'PORTE', 'POSAR',
  'POSTA', 'POSTE', 'POTRO', 'POZAS', 'POZOS', 'PRADA', 'PRADO', 'PRESA', 'PRESO', 'PRIMA',
  'PRIMO', 'PRION', 'PRIOR', 'PRISA', 'PROLE', 'PROSA', 'PUBIS', 'PUDOR', 'PUESTO', 'PULGA',
  'PULIR', 'PULPA', 'PULPO', 'PULSO', 'PUMAS', 'PUNTA', 'PUNTO', 'PURAS', 'PUROS', 'PUZLE',

  // Q
  'QUARK', 'QUEDO', 'QUEDA', 'QUEJA', 'QUEMA', 'QUEMO', 'QUESO', 'QUIEN', 'QUILO', 'QUINA',
  'QUINT', 'QUITA', 'QUITO', 'QUITE',

  // R
  'RABIA', 'RABOS', 'RACHA', 'RADAR', 'RADIA', 'RADIO', 'RADON', 'RAFAS', 'RALLA', 'RAMAL',
  'RAMAS', 'RAMOS', 'RAMPA', 'RANGO', 'RAPAZ', 'RAPTO', 'RAROS', 'RASAR', 'RASGO', 'RASOS',
  'RATAS', 'RATIO', 'RATON', 'RAUDO', 'RAYAR', 'RAYAS', 'RAYOS', 'RAZON', 'RECIA', 'RECIO',
  'RECTA', 'RECTO', 'REDES', 'REGAR', 'REGIA', 'REGIO', 'REGLA', 'REHEN', 'REINA', 'REINO',
  'REJAS', 'RELOJ', 'REMAR', 'REMOS', 'RENAL', 'RENGO', 'RENTA', 'REPON', 'RESTA', 'RESTO',
  'RETAR', 'RETAS', 'RETOS', 'REYES', 'REZAR', 'RIEGO', 'RIFAS', 'RIFLE', 'RIGOR', 'RIMAR',
  'RIMAS', 'RIVAL', 'RIZAR', 'RIZOS', 'ROBAR', 'ROBLE', 'ROBOS', 'ROCAS', 'ROCIO', 'RODAL',
  'RODAR', 'RODEO', 'ROJAS', 'ROJOS', 'ROLLO', 'ROMBO', 'RONCA', 'RONCO', 'RONDA', 'ROPAS',
  'ROQUE', 'ROSAL', 'ROSAS', 'ROSCA', 'ROSCO', 'ROTAR', 'ROTAS', 'ROTOS', 'ROZAR', 'RUBIA',
  'RUBIO', 'RUEDA', 'RUEDO', 'RUEGO', 'RUIDO', 'RUINA', 'RUMBA', 'RUMBO', 'RUMOR', 'RURAL',
  'RUTAS',

  // S
  'SABER', 'SABES', 'SABIA', 'SABIO', 'SABOR', 'SACAR', 'SACOS', 'SACRA', 'SACRO', 'SAETA',
  'SAGAZ', 'SALAS', 'SALDO', 'SALIR', 'SALMO', 'SALON', 'SALSA', 'SALTO', 'SALUD', 'SALVA',
  'SALVO', 'SANAR', 'SANAS', 'SANOS', 'SANTO', 'SAPOS', 'SAQUE', 'SARNA', 'SATEN', 'SAUCE',
  'SAUNA', 'SAZON', 'SECOS', 'SEDAS', 'SEDES', 'SEGAR', 'SEGUN', 'SELLO', 'SELVA', 'SENDA',
  'SENAL', 'SENOR', 'SEPIA', 'SERES', 'SERIA', 'SERIE', 'SERIO', 'SESGO', 'SESOS', 'SETAS',
  'SEXOS', 'SEXTO', 'SHOWS', 'SIDRA', 'SIEGA', 'SIETE', 'SIGLO', 'SIGMA', 'SIGNO', 'SILBA',
  'SILBO', 'SILLA', 'SILVA', 'SIMIL', 'SIMIO', 'SIRIA', 'SISMO', 'SITIO', 'SOBRA', 'SOBRE',
  'SOCIA', 'SOCIO', 'SODAS', 'SODIO', 'SOFAS', 'SOLAR', 'SOLAS', 'SOLES', 'SOLOS', 'SOMBRA',
  'SOMOS', 'SONAR', 'SONDA', 'SOPAS', 'SOPLA', 'SOPLO', 'SORBO', 'SORDA', 'SORDO', 'STAND',
  'SUAVE', 'SUBEN', 'SUBIR', 'SUCIA', 'SUCIO', 'SUDOR', 'SUELA', 'SUELO', 'SUENA', 'SUENO',
  'SUERO', 'SUFRO', 'SUITE', 'SUIZA', 'SUIZO', 'SUMAR', 'SUMAS', 'SUPER', 'SURCO', 'SUSTO',

  // T
  'TABAS', 'TABLA', 'TACHA', 'TACHO', 'TACOS', 'TACTO', 'TAITA', 'TALAS', 'TALCO', 'TALLA',
  'TALLE', 'TALLO', 'TALON', 'TALUD', 'TAMAL', 'TAMBO', 'TANGO', 'TANTO', 'TAPAR', 'TAPAS',
  'TAPIA', 'TAPON', 'TARDE', 'TARDO', 'TAREA', 'TARSO', 'TASAR', 'TASAS', 'TAZAS', 'TECHO',
  'TECLA', 'TEJAS', 'TEJER', 'TEJON', 'TELAR', 'TELAS', 'TELON', 'TEMAS', 'TEMER', 'TEMOR',
  'TEMPO', 'TENAZ', 'TENER', 'TENIS', 'TENOR', 'TENSO', 'TERCA', 'TERCO', 'TERMA', 'TERMO',
  'TERNA', 'TERNO', 'TERSO', 'TESIS', 'TESTA', 'TETAS', 'TEXTO', 'TIARA', 'TIBIA', 'TIBIO',
  'TIESO', 'TIFON', 'TIGRE', 'TILDE', 'TIMAR', 'TIMBA', 'TIMON', 'TINAS', 'TINTA', 'TINTO',
  'TIPOS', 'TIRAR', 'TIRAS', 'TIROS', 'TITAN', 'TIZAS', 'TOCAR', 'TOCAS', 'TODAS', 'TODOS',
  'TOGAS', 'TOLDO', 'TOMAR', 'TOMAS', 'TOMES', 'TONAL', 'TONEL', 'TONOS', 'TONTA', 'TONTO',
  'TOPAR', 'TOPOS', 'TOQUE', 'TORAX', 'TORCE', 'TORDO', 'TOREO', 'TORNO', 'TOROS', 'TORPE',
  'TORRE', 'TORTA', 'TORVO', 'TOSER', 'TOTAL', 'TRABA', 'TRABE', 'TRACA', 'TRAER', 'TRAGO',
  'TRAJE', 'TRAMA', 'TRAMO', 'TRAPO', 'TRATO', 'TRAZO', 'TRECE', 'TREPA', 'TRIBU', 'TRIGO',
  'TRINA', 'TRINO', 'TRIPA', 'TRONO', 'TROPA', 'TROTE', 'TROZO', 'TRUCO', 'TUBOS', 'TUFOS',
  'TUMBA', 'TUMOR', 'TUNEL', 'TURBA', 'TURBO', 'TURCO', 'TURNO', 'TUTOR',

  // U
  'UBRES', 'UMBRA', 'UNIDA', 'UNIDO', 'UNION', 'UNTAR', 'URGIR', 'URNAS', 'USADA', 'USADO',
  'USAR', 'USUAL', 'UTERO',

  // V
  'VACAS', 'VACIA', 'VACIO', 'VAGAR', 'VAGON', 'VAGOS', 'VAINA', 'VALEN', 'VALER', 'VALES',
  'VALLA', 'VALLE', 'VALOR', 'VAPOR', 'VARAS', 'VARON', 'VASCO', 'VASOS', 'VECES', 'VEGAS',
  'VEJEZ', 'VELAR', 'VELAS', 'VELOZ', 'VEMOS', 'VENAS', 'VENCE', 'VENDA', 'VENDO', 'VENIA',
  'VENIR', 'VENTA', 'VERAS', 'VERAZ', 'VERBO', 'VERDE', 'VERJA', 'VERSO', 'VIAJE', 'VIBRA',
  'VICIO', 'VIERA', 'VIGAS', 'VIGIA', 'VIGOR', 'VILLA', 'VINOS', 'VIOLA', 'VIRAL', 'VIRIL',
  'VIRUS', 'VISOR', 'VISTA', 'VISTO', 'VITAL', 'VIVAS', 'VIVIR', 'VIVOS', 'VOCAL', 'VOCES',
  'VOLAR', 'VOLVO', 'VORAZ', 'VOTOS', 'VUELO', 'VULGO',

  // Y
  'YACER', 'YARDA', 'YATES', 'YEGUA', 'YELMO', 'YERBA', 'YERMO', 'YERNO', 'YESOS', 'YOGUR',
  'YUNQUE',

  // Z
  'ZAFAR', 'ZAFIRO', 'ZANJA', 'ZAPAS', 'ZARPA', 'ZARZA', 'ZONAS', 'ZORRA', 'ZORRO', 'ZUECO',
  'ZUMOS', 'ZURDA', 'ZURDO'
];

/**
 * Normaliza y elimina duplicados, asegurando que cada palabra tenga longitud exacta de 5.
 */
export const TARGET_WORDS: string[] = Array.from(
  new Set(
    RAW_TARGET_WORDS.map((w) =>
      w
        .toUpperCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/Ñ/g, 'N')
        .replace(/[^A-Z]/g, '')
    ).filter((w) => w.length === 5)
  )
);

// Palabras adicionales válidas para intento (conjugaciones, plurales y vocabulario extendido)
const ADDITIONAL_GUESS_WORDS: string[] = [
  'ABRAN', 'ABRAS', 'ABRIA', 'ABRES', 'ACTUO', 'ACTUE', 'ACUDE', 'AGOTO', 'AGOTE', 'AGRIA',
  'AGUES', 'AHOJE', 'AHUCO', 'AILAS', 'AIRAN', 'AIREO', 'AISLA', 'AISLE', 'AJARA', 'AJARE',
  'ALAIS', 'ALCEE', 'ALCES', 'ALEMA', 'ALFAS', 'ALGAZ', 'ALGAS', 'ALLES', 'ALOJE', 'ALMAS',
  'ALOES', 'ALTEA', 'ALTES', 'ALZAN', 'ALZAS', 'AMABA', 'AMARA', 'AMARE', 'AMASE', 'AMIDA',
  'AMOLE', 'AMPON', 'AMURA', 'AMUTE', 'ANDAD', 'ANDEN', 'ANEGUE', 'ANGLA', 'ANIDO', 'ANIMA',
  'ANODO', 'ANOLE', 'ANOTI', 'APAGO', 'APATA', 'APICE', 'APOPO', 'APURO', 'AQUIA', 'ARABA',
  'ARAIS', 'ARARE', 'ARCON', 'ARDEA', 'ARDES', 'ARDIO', 'ARFAS', 'ARGEN', 'ARGUE', 'ARIEL',
  'ARMON', 'ARPAS', 'ARRES', 'ARUAS', 'ASARA', 'ASARE', 'ASICO', 'ASINA', 'ASNOS', 'ASOLE',
  'ASOME', 'ASTAS', 'ASTIL', 'ATABE', 'ATADO', 'ATAJE', 'ATAPA', 'ATEZO', 'ATICO', 'ATILA',
  'ATINA', 'ATINE', 'ATINO', 'ATOLE', 'ATOMO', 'ATONA', 'ATRAS', 'ATUFA', 'AUGEA', 'AUGES',
  'AUGUR', 'AULAS', 'AUPAR', 'AUPAS', 'AURAS', 'AUTAS', 'AVALE', 'AVARO', 'AVENA', 'AVENE',
  'AVIES', 'AVINE', 'AVISA', 'AVISE', 'AVIVA', 'AVIVE', 'AXIAL', 'AYUNA', 'AYUNE', 'AZADA',
  'AZARO', 'AZOES', 'AZUCE', 'AZULA', 'AZULE', 'AZULO', 'BABAS', 'BABOR', 'BACHA', 'BADAJ',
  'BAGUE', 'BAILA', 'BAILE', 'BAILO', 'BAJAD', 'BAJAN', 'BAJES', 'BALAI', 'BALEN', 'BALES',
  'BALIO', 'BALLE', 'BAMBA', 'BANCA', 'BANCO', 'BANDO', 'BARES', 'BARRU', 'BARZA', 'BASAD',
  'BASAN', 'BASES', 'BASTA', 'BASTE', 'BASTO', 'BATAN', 'BATES', 'BATIO', 'BAYAL', 'BAYON',
  'BEBED', 'BEBEN', 'BEBES', 'BECAN', 'BECAR', 'BECAS', 'BEDEL', 'BEFAS', 'BELES', 'BELIO',
  'BESAD', 'BESAN', 'BESEN', 'BETEL', 'BICHO', 'BIELA', 'BIFES', 'BIGAS', 'BIJAS', 'BIJOS',
  'BILIS', 'BINAR', 'BINAS', 'BINGO', 'BIRLO', 'BISAR', 'BIZCA', 'BLOCA', 'BOBAS', 'BOCEL',
  'BOCIN', 'BODAS', 'BODES', 'BOFOS', 'BOGAN', 'BOGAS', 'BOGUE', 'BOINA', 'BOJAS', 'BOJEO',
  'BOLAS', 'BOLES', 'BOLIN', 'BOLSA', 'BOMBE', 'BOMBO', 'BONES', 'BOPUS', 'BORDA', 'BORDE',
  'BORLA', 'BOSES', 'BOTAD', 'BOTEN', 'BOTES', 'BOTIN', 'BOVIL', 'BOXEO', 'BOXER', 'BOZOS',
  'BRAGO', 'BRAME', 'BRAMO', 'BREAN', 'BREAR', 'BRECE', 'BREGA', 'BRIES', 'BRICE', 'BRISA',
  'BROME', 'BROMO', 'BROTA', 'BROTE', 'BROTO', 'BRUJA', 'BRUJE', 'BRUNO', 'BRUTA', 'BUCES',
  'BUCHE', 'BUFAN', 'BUFAR', 'BUFOS', 'BULLA', 'BULLE', 'BULON', 'BURIL', 'BURLA', 'BURLE',
  'BURLO', 'BUROS', 'CABEN', 'CABIA', 'CABIO', 'CABRA', 'CACEN', 'CACHA', 'CACHO', 'CADIS',
  'CAEIS', 'CAERA', 'CAERE', 'CAIDA', 'CAIDO', 'CALAD', 'CALAN', 'CALCA', 'CALCE', 'CALES',
  'CALLA', 'CALLE', 'CALLO', 'CALME', 'CALMO', 'CALON', 'CALVA', 'CALVE', 'CALVO', 'CAMAS',
  'CAMEL', 'CAMPO', 'CANAS', 'CANES', 'CANEY', 'CANJE', 'CANTO', 'CANTE', 'CAPAN', 'CAPAS',
  'CAPEN', 'CAPOS', 'CAPTO', 'CAPTE', 'CARAO', 'CARBA', 'CARDO', 'CAREA', 'CAREE', 'CAREO',
  'CARGA', 'CARGO', 'CARLA', 'CARNE', 'CAROS', 'CARPA', 'CARPO', 'CASAD', 'CASAN', 'CASES',
  'CASIA', 'CASIO', 'CASPA', 'CATAD', 'CATAN', 'CATES', 'CATOS', 'CATRE', 'CAUBA', 'CAUCA',
  'CAUCE', 'CAVAS', 'CAVEN', 'CAVES', 'CAVIO', 'CAZAD', 'CAZAN', 'CAZOS', 'CEDAN', 'CEDAS',
  'CEDED', 'CEDEN', 'CEDES', 'CEDIO', 'CEFOS', 'CEGAD', 'CEJAN', 'CEJAS', 'CEJEN', 'CELAD',
  'CELAN', 'CELEN', 'CELES', 'CELOS', 'CENAD', 'CENAN', 'CENAS', 'CENEN', 'CENES', 'CENIA',
  'CENIT', 'CENSO', 'CEPAS', 'CEPOS', 'CERCA', 'CERCE', 'CERDO', 'CERES', 'CEROS', 'CESAD',
  'CESAN', 'CESEN', 'CESES', 'CESIO', 'CESTA', 'CESTO', 'CHALE', 'CHALO', 'CHAPA', 'CHAPE',
  'CHATA', 'CHATS', 'CHATO', 'CHECO', 'CHILE', 'CHINA', 'CHINO', 'CHIPA', 'CHIPS', 'CHIST',
  'CHIVA', 'CHIVE', 'CHOCA', 'CHOCO', 'CHOLA', 'CHOLO', 'CHORI', 'CHOZA', 'CHUFA', 'CHULO',
  'CHUPA', 'CHUPE', 'CHUPO', 'CHUTE', 'CHUTO', 'CHUZS', 'CICLA', 'CICLE', 'CICLO', 'CIEGA',
  'CIELO', 'CIENA', 'CIMAS', 'CIMBO', 'CINES', 'CINTO', 'CIRCA', 'CIRCE', 'CIRCO', 'CISCO',
  'CITAD', 'CITAN', 'CITES', 'CITOS', 'CIVIL', 'CLAMA', 'CLAME', 'CLAMO', 'CLARA', 'CLARE',
  'CLARO', 'CLASE', 'CLAVA', 'CLAVE', 'CLAVO', 'CLERO', 'CLIMA', 'CLIPS', 'CLONA', 'CLONE',
  'CLONO', 'CLORO', 'CLUBS', 'COAIS', 'COALA', 'COATI', 'COBAS', 'COBRA', 'COBRE', 'COBRO',
  'COCAL', 'COCER', 'COCHA', 'COCHE', 'COCHI', 'COCIA', 'COCIO', 'COCOS', 'CODON', 'CODOS',
  'COGED', 'COGEN', 'COGES', 'COGIA', 'COGIO', 'COIMA', 'COITA', 'COITO', 'COJAS', 'COJEA',
  'COJES', 'COJOS', 'COLAD', 'COLAN', 'COLAS', 'COLEN', 'COLES', 'COLMO', 'COLON', 'COLOR',
  'COLPA', 'COMAL', 'COMAS', 'COMBA', 'COMBE', 'COMBO', 'COMED', 'COMEN', 'COMER', 'COMES',
  'COMIA', 'COMIO', 'CONCA', 'CONDE', 'CONGA', 'CONGO', 'CONOS', 'COPAS', 'COPIA', 'COPIE',
  'COPIO', 'COPLA', 'COPON', 'CORAL', 'CORAS', 'CORBA', 'CORDA', 'COREA', 'CORES', 'CORIO',
  'CORRA', 'CORRE', 'CORRI', 'CORRO', 'CORSA', 'CORSE', 'CORSO', 'CORTA', 'CORTE', 'CORTO',
  'CORVA', 'CORVO', 'COSAN', 'COSAS', 'COSED', 'COSEN', 'COSES', 'COSIA', 'COSIO', 'COSTA',
  'COSTE', 'COSTO', 'COTAS', 'COTES', 'COTON', 'COYOL', 'COZNE', 'CRACS', 'CRASH', 'CREAD',
  'CREAN', 'CREAR', 'CREAS', 'CRECE', 'CRECI', 'CREDO', 'CREEN', 'CREES', 'CREIA', 'CREMA',
  'CREME', 'CREMO', 'CREPA', 'CREPO', 'CRESA', 'CRETA', 'CRIAD', 'CRIAN', 'CRIAR', 'CRIAS',
  'CRIEN', 'CRIES', 'CRIMA', 'CRINA', 'CROAD', 'CROAN', 'CROAR', 'CROAS', 'CROEN', 'CROES',
  'CROMA', 'CROME', 'CROMO', 'CRUCE', 'CRUDA', 'CRUDO', 'CRUEL', 'CRUJA', 'CRUJE', 'CRUJO',
  'CRUZA', 'CRUCE', 'CRUZO', 'CUABA', 'CUACO', 'CUADA', 'CUADO', 'CUAJA', 'CUAJE', 'CUAJO',
  'CUASI', 'CUATA', 'CUATE', 'CUBAS', 'CUBIL', 'CUBOS', 'CUBRA', 'CUBRE', 'CUBRI', 'CUBRO',
  'CUCAN', 'CUCAR', 'CUCAS', 'CUCHA', 'CUCHE', 'CUCHO', 'CUECA', 'CUECE', 'CUELE', 'CUELL',
  'CUELO', 'CUERO', 'CUESC', 'CUEVA', 'CUGAT', 'CUIDA', 'CUIDE', 'CUIDO', 'CUINA', 'CUINO',
  'CUITA', 'CULAS', 'CULEA', 'CULEE', 'CULEO', 'CULOS', 'CULPA', 'CULPE', 'CULPO', 'CULTA',
  'CULTO', 'CUMAS', 'CUMBO', 'CUNAN', 'CUNAR', 'CUNAS', 'CUNEN', 'CUNES', 'CUOTA', 'CUPON',
  'CUPOS', 'CURAD', 'CURAN', 'CURAR', 'CURAS', 'CURDA', 'CURDO', 'CUREN', 'CURES', 'CURIA',
  'CURIE', 'CURIO', 'CURRA', 'CURRE', 'CURRI', 'CURRO', 'CURRY', 'CURSA', 'CURSE', 'CURSO',
  'CURTA', 'CURTE', 'CURTI', 'CURTO', 'CURVA', 'CURVE', 'CURVO', 'CUSCA', 'CUSCO', 'CUTIS',
  'DADAS', 'DADOR', 'DADOS', 'DAGAS', 'DAJAS', 'DALES', 'DALIA', 'DAMAS', 'DAMOS', 'DANCE',
  'DANDO', 'DANES', 'DANOS', 'DANZA', 'DANZO', 'DARAN', 'DARAS', 'DARDO', 'DARES', 'DARIA',
  'DARSE', 'DATAD', 'DATAN', 'DATAR', 'DATAS', 'DATEN', 'DATES', 'DATOS', 'DEBAN', 'DEBAS',
  'DEBED', 'DEBEN', 'DEBER', 'DEBES', 'DEBIA', 'DEBIO', 'DEBIL', 'DEBUT', 'DECID', 'DECIR',
  'DEDAL', 'DEDOS', 'DEFIS', 'DEJAD', 'DEJAN', 'DEJAR', 'DEJAS', 'DEJEN', 'DEJES', 'DEJOS',
  'DELAS', 'DELCO', 'DELES', 'DELTA', 'DEMAS', 'DENIA', 'DENSA', 'DENSO', 'DENTE', 'DEPON',
  'DERBI', 'DESCA', 'DESDE', 'DESEE', 'DESEO', 'DESES', 'DETEN', 'DEUDA', 'DIANA', 'DICEN',
  'DICES', 'DICHA', 'DICHO', 'DICTA', 'DICTE', 'DICTO', 'DIEGO', 'DIERA', 'DIERE', 'DIESE',
  'DIETA', 'DIETE', 'DIETO', 'DIGAN', 'DIGAS', 'DIGNA', 'DIGNE', 'DIGNO', 'DIJES', 'DIMOS',
  'DINAR', 'DIODO', 'DIOSA', 'DIOSO', 'DIPLO', 'DIQUE', 'DIRAN', 'DIRAS', 'DIRIA', 'DISCO',
  'DISTA', 'DISTE', 'DIVAS', 'DIVOS', 'DOBLA', 'DOBLE', 'DOBLO', 'DOCES', 'DOCIL', 'DOCTA',
  'DOCTO', 'DOGAL', 'DOGAS', 'DOGMA', 'DOGOS', 'DOLAR', 'DOLED', 'DOLER', 'DOLES', 'DOLIA',
  'DOLIO', 'DOLOR', 'DOMAD', 'DOMAN', 'DOMAR', 'DOMAS', 'DOMEN', 'DOMES', 'DOMOS', 'DONAD',
  'DONAN', 'DONAR', 'DONAS', 'DONEN', 'DONES', 'DOPAR', 'DOPAS', 'DORAD', 'DORAL', 'DORAN',
  'DORAR', 'DORAS', 'DOREN', 'DORES', 'DORIO', 'DORMI', 'DORSO', 'DOSES', 'DOSIS', 'DOTAD',
  'DOTAN', 'DOTAR', 'DOTAS', 'DOTEN', 'DOTES', 'DOVEL', 'DRAGA', 'DRAGO', 'DRAMA', 'DRENA',
  'DRENE', 'DRENO', 'DRIZA', 'DROGA', 'DROGO', 'DROPE', 'DRUSA', 'DRUSO', 'DUCAL', 'DUCHA',
  'DUCHE', 'DUCHO', 'DUDAD', 'DUDAN', 'DUDAR', 'DUDAS', 'DUDEN', 'DUDES', 'DUELA', 'DUELE',
  'DUELO', 'DUENA', 'DUENO', 'DUETO', 'DULCE', 'DUMAS', 'DUNAS', 'DUQUE', 'DURAD', 'DURAN',
  'DURAR', 'DURAS', 'DUREN', 'DURES', 'DUROS'
];

/**
 * Conjunto completo de palabras válidas para adivinar
 */
export const VALID_GUESS_SET = new Set<string>([
  ...TARGET_WORDS,
  ...ADDITIONAL_GUESS_WORDS.map((w) =>
    w
      .toUpperCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/Ñ/g, 'N')
      .replace(/[^A-Z]/g, '')
  ).filter((w) => w.length === 5)
]);

// Clave de almacenamiento y límite para recordar palabras jugadas
const RECENT_WORDS_KEY = 'gamesWeb_wordle_recent_targets';
const MAX_RECENT_HISTORY = 300; // Guarda hasta 300 palabras para evitar repeticiones

/**
 * Obtiene una palabra objetivo de forma aleatoria garantizando no repetir
 * palabras jugadas recientemente ni seguir un orden predeterminado.
 */
export const getRandomTargetWord = (): string => {
  let recent: string[] = [];

  try {
    const raw = localStorage.getItem(RECENT_WORDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        recent = parsed;
      }
    }
  } catch {
    recent = [];
  }

  // Filtrar palabras que no se hayan utilizado recientemente
  let available = TARGET_WORDS.filter((w) => !recent.includes(w));

  // Si ya se agotó el banco de palabras disponibles o quedan menos del 15%, reiniciar historial
  if (available.length < Math.max(10, Math.floor(TARGET_WORDS.length * 0.1))) {
    recent = [];
    available = [...TARGET_WORDS];
  }

  // Selección verdaderamente aleatoria
  const randomIndex = Math.floor(Math.random() * available.length);
  const selectedWord = available[randomIndex];

  // Registrar en el historial para no repetir
  recent.push(selectedWord);
  if (recent.length > MAX_RECENT_HISTORY) {
    recent = recent.slice(recent.length - MAX_RECENT_HISTORY);
  }

  try {
    localStorage.setItem(RECENT_WORDS_KEY, JSON.stringify(recent));
  } catch {
    // Almacenamiento no disponible
  }

  return selectedWord;
};

/**
 * Comprobar si una palabra es válida para envío en Wordle
 */
export const isValidWord = (word: string): boolean => {
  if (!word || word.length !== 5) return false;
  const upper = word
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Ñ/g, 'N');
  return VALID_GUESS_SET.has(upper) || TARGET_WORDS.includes(upper);
};

/**
 * Limpia el historial de palabras recientes (útil para pruebas o reinicio total)
 */
export const clearRecentWordsHistory = (): void => {
  try {
    localStorage.removeItem(RECENT_WORDS_KEY);
  } catch {
    // Ignorar error
  }
};
