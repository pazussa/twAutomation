import 'dotenv/config';
import type { Page } from 'playwright';
// Inlined helper functions (avoid ESM resolution issues when used outside Playwright runtime)
function materialize(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}
function materializeAll(list: ReadonlyArray<string>, vars: Record<string, string>): string[] {
  return list.map(t => materialize(t, vars));
}

export const CFG = {
  contactName: process.env.CONTACT_NAME || 'Twilio',
  headless: (process.env.HEADLESS || 'false').toLowerCase() === 'true',
  sessionDir: (process.env.SESSION_DIR || '~/.wapp-autoloop-session').replace('~', process.env.HOME || ''),
  cmds: {
    listar: process.env.CMD_LISTAR || 'listar cultivos',
    crear: process.env.CMD_CREAR || 'crear cultivo',
    listarFert: process.env.CMD_LISTAR_FERT || 'listar fertilizantes',
    crearFert: process.env.CMD_CREAR_FERT || 'crear fertilizante',
    listarFito: process.env.CMD_LISTAR_FITO || 'Listar productos químicos',
    crearFito: process.env.CMD_CREAR_FITO || 'crear fitosanitario',
    consultarCampos: process.env.CMD_CONSULTAR_CAMPOS || 'Consultar campos sin planificar',
    consultarDistribucion: process.env.CMD_CONSULTAR_DISTRIBUCION || 'Consultar distribución cultivos',
    crearCampana: process.env.CMD_CREAR_CAMPANA || 'Crear campaña',
    consultarTrabajos: process.env.CMD_CONSULTAR_TRABAJOS || 'Consultar trabajos',
    consultarTrabajosHoy: process.env.CMD_CONSULTAR_TRABAJOS_HOY || 'Consultar trabajos (hoy)',
    asignarPreciosProducto: process.env.CMD_ASIGNAR_PRECIOS_PRODUCTO || 'Asignar precios producto'
  }
} as const;

export const VARS: Record<string, string> = {
  cultivo: process.env.VAR_CULTIVO || 'maíz',
  variedad: process.env.VAR_VARIEDAD || 'p 8660',
  destino: process.env.VAR_DESTINO || 'consumo',
  marca: process.env.VAR_MARCA || 'marcax',
  cliente: process.env.VAR_CLIENTE || 'AgroTalavera',
  campana: process.env.VAR_CAMPANA || 'campaña-test',
  granja: process.env.VAR_GRANJA || 'Finca La Vega',
  campo: process.env.VAR_CAMPO || 'campo 2',
  dosis: process.env.VAR_DOSIS || '100',
  productName: process.env.VAR_PRODUCT_NAME || 'Trigo Filón',
  price: process.env.VAR_PRICE || '340 €',
  priceDate: process.env.VAR_PRICE_DATE || 'hoy'
};

export const DEFAULT_VARS: Readonly<Record<string, string>> = { ...VARS };

export const setVar = (name: string, value: string) => {
  if (!name || !/^\w+$/.test(name)) throw new Error(`Nombre de variable inválido: "${name}"`);
  VARS[name] = String(value);
};
export const withVars = (vars: Record<string, string>) => {
  for (const [k, v] of Object.entries(vars)) setVar(k, String(v));
};

export function resetVarsToDefaults() {
  for (const [k, v] of Object.entries(DEFAULT_VARS)) {
    setVar(k, v);
  }
}

export const INTENTS_TEMPLATES = {
  crearCultivo: [
    'crear cultivo',
    'añadir cultivo',
    'quiero crear un cultivo',
    'quiero registrar un cultivo',
    'registrar cultivo',
    'necesito crear un cultivo',
    'crear un nuevo cultivo',
    'quiero dar de alta un cultivo',
    'agrega un cultivo',
    'agrega un nuevo cultivo',
    'deseo crear un cultivo',
    'generar un cultivo',
    'crea un cultivo nuevo',
    'registra un cultivo',
    'quiero cargar un nuevo cultivo',
    'agregar cultivo',
    'registrar un cultivo nuevo',
    'me gustaría crear un cultivo nuevo',
    'Luca, registra cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} y cliente {cliente}.',
    'Guardar cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca}',
    'Luca, agregar el cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} para cliente {cliente}.',
    'Hola LUCA, registrar cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} para el cliente {cliente}',
    'Guardar cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} para el cliente {cliente}',
    'crear cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} con el cliente {cliente}',
    'Luca, agrega cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} cliente {cliente}',
    'Luca, agrega cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} con cliente {cliente}',
    'Luca regístrame cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} con cliente {cliente}',
    'Hola luca, quiero crear el cultivo {cultivo} con variedad {variedad} con destino {destino} y marca {marca} con el cliente {cliente}',
    'luca, me puedes registrar el cultivo {cultivo} con variedad {variedad} con destino {destino} y marca {marca} con el cliente {cliente}',
    'luca, quiero registrar el cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} con cliente {cliente}',
    'hola luca, agregame el cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} con cliente {cliente}',
    'Guardar cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} cliente {cliente}',
    'Agregame el cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca}, cliente {cliente}',
    'Necesito registrar cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} con cliente {cliente}',
    'Guardar cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca}, para el cliente {cliente}',
    'Luca, apúntame el cultivo {cultivo} variedad {variedad} destino {destino} marca {marca} con cliente {cliente}',
    'Luca registra cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca}, cliente {cliente}',
    'Apunta cultivo {cultivo} con variedad {variedad}, destino {destino}, marca {marca} cliente {cliente}',
    'Luca agrega cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} para cliente {cliente}',
    'Hola luca, necesito registrar cultivo {cultivo}, variedad {variedad}, destino {destino}, marca {marca} con cliente {cliente}'

    ],
  listarCultivos: [
    'listar cultivos', 'dame la lista de cultivos', 'listar cultivos variedad {variedad}',
    'dame los cultivos de {cliente}',
    'dame la lista de cultivos de {cliente}',
    'quiero ver los cultivos',
    'muéstrame los cultivos disponibles',
    'ver los cultivos del cliente {cliente}',
    'para el cliente {cliente}, cuáles son sus cultivos',
    'necesito los cultivos del cliente {cliente}',
    'ver cultivos de {cliente}',
    'Muéstrame qué cultivos tengo ahora mismo en la finca.',
    '¿Qué plantaciones tengo registradas?',
    'Listar todos los cultivos que tengo actualmente.',
    'Quiero consultar las plantas que tengo en mis parcelas.',
    '¿Puedes mostrarme las cosechas que tengo disponibles?',
    'Dime qué cultivos están registrados en mi cuenta.',
    'Lista las siembras que tengo activas.',
    'Ver las especies vegetales que tengo en mis campos.',
    '¿Qué vegetales tengo plantados actualmente?',
    'Consultar las plantaciones que maneja {cliente}.',
    'Mostrarme qué cultivos tiene registrados {cliente}.',
    '¿Qué especies agrícolas tiene registradas {cliente}?',
    'Quisiera ver las cosechas que tiene ahora {cliente}.',
    'Dime qué plantas tiene disponibles {cliente}.',
    'Listar las siembras registradas para {cliente}.',
    '¿Puedes mostrarme los cultivos que maneja {cliente}?',
    'Consulta rápida de vegetales que tiene {cliente}.',
    'Mostrar qué plantaciones tiene actualmente {cliente}.',
    'Listar todas las especies vegetales de {cliente}.',
    'Dime las cosechas que tiene {cliente}.',
    '¿Qué cultivos tiene ahora mismo {cliente}?',
    'Kiero consultar las plantas que tiene registradas {cliente}.',
    'Mostrar las siembras activas para {cliente}.',
    'Listar vegetales disponibles en la finca de {cliente}.',
    '¿Qué especies agrícolas tiene registradas {cliente}?',
    'Quiero ver qué plantaciones tiene actualmente {cliente}.',
    'Muéstrame los cultivos que maneja {cliente}.',
    'Consultar plantas registradas por {cliente}.',
    'Dime qué cosechas tiene ahora {cliente}.',
    'Ver las especies vegetales registradas para {cliente}.',
    'Listame los cultivos de {cliente}.',
    'Muéstrame las plantaciones de {cliente}.',
    'Dame un informe de los cultivos de {cliente}.',
    '¿Qué tiene sembrado {cliente}?',
    'Consulta los cultivos registrados por {cliente}.',
    'Ver cultivos actuales de {cliente}.',
    '¿Puedes mostrarme las siembras de {cliente}?',
    'Quiero conocer los cultivos de {cliente}.',
    'Lista las cosechas de {cliente}.',
    '¿Qué plantaciones tiene {cliente}?',
    'Necesito ver los cultivos de {cliente}.',
    'Consulta rápida de las siembras de {cliente}.',
    'Dame la información de cultivos de {cliente}.',
    'Mostrar plantaciones registradas para {cliente}.',
    '¿Cuáles son los cultivos activos de {cliente}?',
    'Ver especies cultivadas por {cliente}.',
    'Lista de plantas registradas de {cliente}.',
    'Cultivos actuales de {cliente}.',
    '¿Me puedes decir qué tiene sembrado {cliente}?',
    'Quiero ver las plantaciones de {cliente}.',
    'Mostrar cultivos asociados a {cliente}.',
    '¿Qué está cultivando {cliente}?',
    'Dame la lista de siembras de {cliente}.',
    'Necesito saber qué cultiva {cliente}.',
    '¿Qué plantaciones tiene registradas {cliente}?',
    'Ver los cultivos de {cliente}.',
    'Información sobre las siembras de {cliente}.',
    'Lista los cultivos que maneja {cliente}.',
    '¿Cuáles son las plantaciones de {cliente}?',
    'Muéstrame qué está cultivando {cliente}.'
  ],
  crearFertilizante: [
    'crear fertilizante', 'añadir fertilizante',
    'Quiero registrar el Nitrofoska como fertilizante granulado',
    'Apúntame un abono Urea para consumo humano',
    'Añade el fertilizante Triple 15 de FertiEspaña',
    'Necesito dar de alta un abono orgánico con alto en nitrógeno',
    'Registra un nutriente Sulfato amónico para pienso',
    'Crea el fertilizante NPK 20-10-10 marca AgroPlus',
    'Me gustaría meter un abono mineral llamado Superfosfato',
    'Anota un fertilizante líquido de FertiAgro con fórmula 15-15-15',
    'Para la finca, crea el abono Nitram de tipo granulado',
    'Dar de alta un corrector Calcimag de AgroEspaña con calcio y magnesio',
    'Añadir un fertilizante orgánico CompoBio para consumo humano',
    'Crea un abono líquido llamado FertiMax con fórmula 10-5-20',
    'Registra un nutriente Urea para industria marca CampoFértil',
    'Meter un fertilizante granulado Superfosfato',
    'Dar de alta un abono orgánico de BioCampo',
    'Crear fertilizante NPK 12-12-17 marca AgroFert',
    'Apuntar un nutriente Fosfato diamónico para consumo humano',
    'Añade fertilizante Nitrofoska para aceite',
    'Registra un abono Triple 15 de AgroFert con fórmula 15-15-15',
    'Crea fertilizante Urea marca CampoVerde',
    'Perdona, la marca del abono es FertiMax',
    'Me refería al tipo de fertilizante orgánico',
    'Cambia la fórmula del nutriente a 20-10-10',
    'Para el cliente {cliente}, registra fertilizante NPK 15-15-15',
    'Cliente {cliente}, dar de alta abono Superfosfato granulado',
    'Añadir para {cliente} el fertilizante Nitram mineral',
    'Registrar para {cliente} un nutriente Urea para pienso',
    'Crear abono líquido FertiAgro para consumo humano',
    'Apúntame un corrector Calcimag de AgroEspaña',
    'Dar de alta un fertilizante Sulfato potásico granulado'
  ],
  listarFertilizantes: [
    'listar fertilizantes', 'lista de fertilizantes', 'dame los fertilizantes',
    'Muéstrame qué fertilizantes tengo registrados ahora mismo.',
    '¿Qué abonos tengo actualmente en la finca?',
    'Quiero consultar los nutrientes que tengo registrados.',
    'Listar todos los fertilizantes que tengo ahora.',
    '¿Me puedes mostrar los abonos que tengo en uso?',
    'Dime qué fertilizantes tengo registrados.',
    '¿Qué productos nutritivos tengo registrados en mis cultivos?',
    'Mostrar los fertilizantes que tengo actualmente.',
    'Quiero ver qué abonos tengo ahora mismo registrados.',
    'Listar todos los nutrientes que tengo para la finca.',
    'Consulta rápida de los fertilizantes que estoy usando.',
    'Dime todos los abonos registrados por {cliente}.',
    'Muéstrame los fertilizantes registrados por {cliente}.',
    '¿Puedes mostrarme los nutrientes que tiene {cliente}?',
    'Quiero consultar los abonos disponibles para {cliente}.',
    'Listar todos los fertilizantes que usa actualmente {cliente}.',
    'Consultar abonos registrados para {cliente}.',
    '¿Qué productos nutritivos para la finca tiene registrados {cliente}?',
    'Muéstrame los fertilizantes que tiene actualmente {cliente}.',
    'Listar nutrientes registrados en la finca de {cliente}.',
    '¿Me podrías enseñar los fertilizantes que tengo en mis parcelas?',
    'Consultame qué abonos tengo activos ahora.',
    'Listame todos los nutrientes que utilizo en mis cultivos.',
    'Dime qué fertilizantes tengo ahora registrados en la finca.',
    '¿Qué abonos tengo registrados actualmente?',
    'Mostrarme los nutrientes disponibles.',
    'Quiero consultar los fertilizantes registrados ahora mismo.',
    '¿Qué abonos tengo disponibles para aplicar en mis campos?',
    'Listar todos los fertilizantes que tengo en la finca ahora.',
    'Muéstrame los nutrientes que tengo en uso.'
  ],
  crearFitosanitario: [
    'crear fitosanitario', 'crear producto químico', 'añadir fitosanitario',
    'Añade el fitosanitario Roundup',
    'Quiero registrar el pesticida Aliette contra mildiu',
    'Mete el herbicida Karate Zeon de tipo sistémico',
    'Apunta el plaguicida Decis para mosca blanca de la marca Bayer',
    'Crea un insecticida llamado Ortiva que sea curativo',
    'Dar de alta el fungicida Cabrio Top para roya en Syngenta',
    'Registra un producto de control de plagas, Aliette, preventivo',
    'Agrega el herbicida Roundup contra hierba juncia',
    'Medidor insecticida Karate Zeon de BASF que sea de contacto',
    'Apunta el plaguicida Decis para trips',
    'Crear el fitosanitario Ortiva sistémico para mildiu',
    'Dar de alta un fungicida Cabrio Top de Bayer',
    'Registro herbicida Roundup de Monsanto para maleza',
    'Quiero añadir insecticida Karate Zeon para pulgón sistémico',
    'Apuntar plaguicida Decis preventivo en cuenta de {cliente}',
    'Mete fungicida Ortiva para roya de Syngenta',
    'Crear pesticida Aliette para mildiu en {cliente}',
    'Añadir producto de control de plagas Cabrio Top para trips',
    'Apuntar herbicida Roundup curativo',
    'Mete insecticida Karate Zeon de BASF contra mosca blanca',
    'Registrar el plaguicida Decis sistémico',
    'Dar de alta el fitosanitario Ortiva de Syngenta',
    'Agrega pesticida Aliette preventivo para mildiu',
    'Apuntar herbicida Roundup para hierba juncia de Monsanto',
    'Mete fungicida Cabrio Top curativo',
    'Perdona, cambio la marca del insecticida Karate Zeon a Bayer',
    'Me refería a que el fungicida es curativo, no preventivo',
    'Corrijo, el plaguicida Decis es para trips',
    'El producto de control de plagas Ortiva es sistémico de Syngenta',
    'Quiero registrar pesticida Aliette para mildiu de BASF'
  ],
  listarFitosanitarios: [
    'listar fitosanitarios', 'listar productos químicos', 'dame los productos químicos',
    'Muéstrame qué plaguicidas tengo registrados ahora mismo.',
    '¿Qué productos químicos tengo actualmente en la finca?',
    'Quiero consultar los pesticidas que tengo registrados.',
    'Listar todos los agroquímicos que tengo ahora.',
    '¿Me puedes mostrar los tratamientos fitosanitarios que tengo en uso?',
    'Dime qué insecticidas y fungicidas tengo registrados.',
    '¿Qué productos para plagas tengo registrados en mis cultivos?',
    'Mostrar los químicos agrícolas que tengo actualmente.',
    'Quiero ver qué herbicidas y fungicidas tengo ahora mismo registrados.',
    'Listar todos los tratamientos que tengo para protección vegetal.',
    'Consulta rápida de los pesticidas que estoy usando.',
    'Dime todos los productos fitosanitarios registrados por {cliente}.',
    'Muéstrame los agroquímicos registrados por {cliente}.',
    '¿Puedes mostrarme los insecticidas que tiene {cliente}?',
    'Quiero consultar los tratamientos fitosanitarios disponibles para {cliente}.',
    'Listar todos los químicos agrícolas que usa actualmente {cliente}.',
    'Consultar plaguicidas registrados para {cliente}.',
    '¿Qué productos químicos para la finca tiene registrados {cliente}?',
    'Muéstrame los pesticidas que tiene actualmente {cliente}.',
    'Listar tratamientos agrícolas registrados en la finca de {cliente}.',
    '¿Me podrías enseñar los agroquímicos que tengo en mis parcelas?',
    'Consultame qué productos fitosanitarios tengo activos ahora.',
    'Listame todos los productos químicos que utilizo en mis cultivos.',
    'Dime qué insecticidas tengo ahora registrados en la finca.',
    '¿Qué fungicidas y herbicidas tengo registrados actualmente?',
    'Mostrarme los tratamientos agrícolas disponibles.',
    'Quiero consultar los pesticidas registrados ahora mismo.',
    '¿Qué agroquímicos tengo disponibles para aplicar en mis campos?',
    'Listar todos los productos para plagas que tengo en la finca ahora.',
    'Muéstrame los productos químicos que tengo en uso.'
  ],
  consultarCampos: [
    'consultar campos sin planificar', 'campos sin planificar', 'listar campos sin planificar',
    '¿Me queda algún campo por planificar esta campaña?',
    'Muéstrame si tengo alguna parcela sin cultivo asignado.',
    'Quiero consultar si tengo alguna tierra sin planificar aún.',
    '¿Me puedes decir si tengo algún terreno pendiente de planificar?',
    'Listar los campos que aún no tengan un cultivo asignado.',
    'Dime si queda alguna finca sin planificar.',
    '¿Tengo alguna parcela sin cultivo asignado actualmente?',
    'Mostrar campos que falten por asignar cultivo.',
    'Ver si hay algún terreno que aún no tenga cultivo asociado.',
    'Kiero saber si me falta alguna tierra por planificar esta campaña.',
    '¿Me falta planificar alguna parcela esta temporada?',
    'Consultar si hay alguna finca sin cultivo planificado.',
    '¿Existe algún campo que no tenga asignado cultivo todavía?',
    'Dime si todos los terrenos tienen ya cultivo asignado.',
    '¿Puedes listar las parcelas que aún no estén planificadas?',
    'Muéstrame si {cliente} tiene algún campo pendiente de planificar.',
    '¿Le queda a {cliente} alguna parcela sin planificar?',
    'Consultar terrenos sin cultivo asignado para {cliente}.',
    'Dime si la finca de {cliente} tiene algún campo sin cultivar.',
    '¿Tiene {cliente} alguna tierra pendiente de asignar cultivo?',
    'Mostrar si hay parcelas sin planificar para {cliente}.',
    'Quiero saber si queda algún terreno sin planificar para {cliente}.',
    'Listar campos sin cultivo asignado en la finca de {cliente}.',
    '¿Existen parcelas pendientes de planificación para {cliente}?',
    'Ver si {cliente} tiene algún campo sin cultivar.',
    '¿Queda alguna tierra por planificar esta campaña para {cliente}?',
    'Mostrar terrenos sin planificación asignada para {cliente}.',
    'Dime si tengo alguna parcela que falte por planificar.',
    'Consultar campos pendientes de cultivo para esta temporada.',
    '¿Me puedes decir si tengo terrenos sin cultivo asociado ahora mismo?'
  ],
  consultarDistribucion: [
    'consultar distribución cultivos', 'distribución de cultivos', 'ver distribución de cultivos',
    '¿Qué distribución de cultivos tengo este año?',
    'Muéstrame cómo están repartidos los cultivos esta campaña.',
    'Quiero consultar la distribución de las plantaciones en mis fincas.',
    '¿Me puedes decir cómo está la distribución de siembras este año?',
    'Listar la distribución por superficie de mis cultivos actuales.',
    'Dime cómo se reparten mis cultivos en hectáreas.',
    '¿Qué proporción de cultivos tengo asignada esta campaña?',
    'Mostrar la distribución porcentual de mis plantaciones.',
    'Ver cómo está organizada la superficie por cultivos este año.',
    'Kiero saber la distribución actual de cultivos en mis campos.',
    'Consultar cómo están repartidas mis siembras por superficie.',
    '¿Puedes mostrarme cómo está la distribución agrícola de este año?',
    'Dime cuál es la proporción actual de mis cultivos.',
    'Muéstrame la organización de mis cultivos en hectáreas y porcentaje.',
    'Listar cómo tengo distribuida la superficie cultivada actualmente.',
    '¿Qué distribución agrícola tiene este año {cliente}?',
    'Mostrar cómo están distribuidos los cultivos de {cliente}.',
    'Quiero ver la distribución de plantaciones registrada para {cliente}.',
    '¿Cómo está repartida la superficie cultivada de {cliente}?',
    'Dime la distribución porcentual de cultivos para {cliente}.',
    'Listar cómo tiene {cliente} distribuidas sus siembras.',
    'Muéstrame la organización de los cultivos de {cliente} en hectáreas.',
    'Consultar la distribución actual de plantaciones para {cliente}.',
    '¿Qué proporción de cultivos tiene asignada {cliente} este año?',
    'Ver cómo tiene {cliente} organizada la distribución agrícola.',
    'Mostrar la distribución de las variedades cultivadas por {cliente}.',
    '¿Cómo están repartidos los cultivos este año para {cliente}?',
    'Dime cuál es la distribución por superficie cultivada de {cliente}.',
    'Listar cómo están organizadas las plantaciones en las fincas de {cliente}.',
    'Consultar la proporción actual de siembras registradas para {cliente}.'
  ],
  crearCampana: [
    'crear campaña',
    'añadir campaña',
    'Quiero crear campaña con {cultivo}',
    'Planifica {cultivo} variedad {variedad}',
    'Dar de alta en campaña {cultivo}',
    'Programa {cultivo} para esta campaña',
    'Apunta en la campaña {cultivo}',
    'Deja fijado en campaña {cultivo}',
    'Crear campaña con {cultivo}',
    'Asigna {cultivo} {variedad} en campaña',
    'Registra {cultivo} {variedad} para esta campaña',
    'Quiero planificar {cultivo} {variedad}',
    'Planificar {cultivo} para la campaña',
    'Dar de alta {cultivo} {variedad}',
    'Asigna {cultivo} {variedad} al {campo}',
    'Planifica {cultivo} en {granja} para {cliente}',
    'Programa {cultivo} en {campo} de {granja} para {cliente}',
    'Apunta en camp. {cultivo} en {granja}',
    'Asignar {cultivo} a la {campo} de {granja}',
    'Dar de alta {cultivo} en {campo} para {cliente}',
    'Planifica {cultivo} en {granja}',
    'Programa {cultivo} {variedad} para {cliente}',
    'Asigna {cultivo} en {campo} para {cliente}',
    'Deja {cultivo} en {granja} para {cliente}',
    'Apunta {cultivo} {variedad} en {campo} de {granja}',
    'Programa {cultivo} en {campo} de {granja} para {cliente}',
    'Planifica {cultivo} en {campo} de {granja}',
    'Registra {cultivo} en {campo}',
    'Crea campaña con {cultivo} {variedad} en {granja}, {campo} para {cliente}',
    'Planifica {cultivo} {variedad} en {granja} {campo}',
    'Perdona, para la campaña deja {cultivo} {variedad} en {campo} de {granja}, no en el 2',
    'q sea crear camp. de {cultivo} en {campo} de {granja}, xfa'
  ],
  consultarTrabajos: [
    'consultar trabajos', 'listar trabajos', 'qué trabajos hay',
    '¿Qué trabajos tengo para hacer hoy?',
    'Muéstrame las tareas previstas para la jornada.',
    'Quiero consultar si tengo faenas planificadas actualmente.',
    'Dime qué labores me tocan ahora mismo.',
    'Listar los trabajos programados para el día.',
    '¿Hay alguna actividad agrícola prevista en el día?',
    'Mostrar las faenas de fertilización agendadas para hoy.',
    '¿Me puedes decir qué tareas tengo actualmente en la finca?',
    'Dime si tengo trabajos agrícolas pendientes en esta jornada.',
    '¿Tengo alguna labor por hacer para ahora mismo?',
    'Consultar las labores de campo previstas hoy.',
    'Muéstrame si quedan faenas por realizar en el día.',
    '¿Cuáles son las tareas agrícolas que tengo para hoy?',
    'Ver qué trabajos quedan pendientes ahora mismo en los cultivos.',
    'Dime las actividades agendadas en el campo para hoy.',
    '¿Qué labores tengo pendientes actualmente?',
    'Listar todos los trabajos planificados.',
    '¿Me puedes mostrar las faenas programadas en mis parcelas?',
    'Quiero ver las tareas agrícolas que tengo en la finca.',
    'Mostrar las labores previstas para los terrenos.',
    '¿Qué trabajos tiene planificados {cliente} hoy?',
    'Dime qué tareas debe hacer {cliente} en el día.',
    '¿Cuáles son las labores asignadas a {cliente} actualmente?',
    'Muéstrame los trabajos pendientes de {cliente} para la jornada.',
    'Listar las faenas de fertilización de {cliente} en el día.',
    '¿Me puedes decir qué actividades tiene {cliente} ahora mismo?',
    'Dime si {cliente} tiene trabajos para hacer hoy.',
    'Consultar las tareas agrícolas de {cliente} previstas para la jornada.',
    'Ver qué trabajos tiene que realizar {cliente} actualmente.',
    'Mostrar las labores de {cliente} para ahora mismo.'
  ],
  consultarTrabajosHoy: ['consultar trabajos (hoy)', 'trabajos de hoy', 'qué trabajos hay hoy'],
  asignarPreciosProducto: [
    'asignar precios producto',
    'asignar precios a producto',
    'asignar precio a producto',
    'Hola Luca, asigna un precio de {price}/tonelada al {productName}',
    'Hola Luca, acabo de recibir una factura a {price}/tonelada el {productName} a fecha {priceDate}',
    'Establece {price} /tn para el {productName}',
    'Hola Luca, el {productName} queda a {price} por tonelada desde el {priceDate}',
    'Sube el precio del {productName} a {price} /tn',
    'Asigna para la {productName} un precio de {price} con fecha de hoy',
    'Coloca {price} /tonelada al {productName} a partir del {priceDate}',
    'Luca, el precio del {productName} será de {price} /tn desde hoy',
    'Para el {productName}, pon {price} euros por tonelada',
    'Ponme {price} euros/tn a la {productName} de este año',
    'Quiero que el precio de la {productName} sea de {price} a fecha {priceDate}',
    'El {productName} sube a {price} /tonelada desde el {priceDate}',
    'Fija para la {productName} un precio de {price} hoy mismo',
    'Quiero {price} euros por tonelada para la {productName} del {priceDate}',
    'Pon el {productName} a {price} /tn desde hoy',
    'Luca, actualiza el precio de la {productName} a {price}, fecha {priceDate}',
    'Para la {productName}, establece {price} /tonelada desde el {priceDate}',
    'Sube la {productName} a {price} /tn hoy',
    '{productName} a {price} /tonelada desde el {priceDate}',
    'Quiero asignar para el {productName} un precio de {price}',
    'Pon el {productName} a {price}, fecha {priceDate}',
    'Fija hoy mismo {price} euros por tonelada para la {productName}',
    'Asigna precio al {productName}',
    'Pon {price} al {productName}',
    'Registra el importe de {price} para {productName}',
    'Quiero dar de alta el precio del {productName} {priceDate}',
    'Actualiza a {price} el {productName} a fecha {priceDate}',
    'Apunta precio para {productName} {priceDate}',
    'Pónle {price} al {productName} para {cliente}',
    'Actualiza el valor del {productName} a {price} {priceDate}',
    'Registra {price} en {productName} con fecha {priceDate}',
    'Quiero fijar precio al {productName} para {cliente}',
    'Dar de alta {price} al {productName} a fecha {priceDate}',
    'Pon el coste del {productName} en {price}',
    'Apunta {price} para {productName} {priceDate}',
    'Actualiza el {productName} a {price} para {cliente}',
    'Registra precio de {productName}',
    'Quiero poner {price} al {productName} con fecha {priceDate}',
    'Da de alta el precio del {productName} {priceDate}',
    'Apunta el valor de {productName} para {cliente}',
    'Fija {price} al {productName}',
    'Actualízame el precio de {productName} a {price} con fecha {priceDate}',
    'Poner precio a {productName} {priceDate}',
    'Asigna {price} a {productName} para {cliente}',
    'Registra el importe del {productName} en {price} para {cliente}',
    'Apunta {price} a {productName}',
    'Actualiza a {price} el {productName} con fecha {priceDate}',
    'Perdona, corrige el precio del {productName} a {price} {priceDate}',
    'Me refería a asignar {price} al {productName}, no {price}',
    'Cambio: deja el {productName} en {price} con fecha {priceDate}',
    'Apúntame precio para {productName} {priceDate} xfa',
    'q pongas {price} al {productName} para {cliente}'
  ]
} as const;

export const INTENTS = Object.fromEntries(
  Object.entries(INTENTS_TEMPLATES).map(([k, arr]) => [k, materializeAll(arr, VARS)])
) as Record<keyof typeof INTENTS_TEMPLATES, string[]>;

export type Action =
  | { type: 'REPLY'; reply: string }
  | { type: 'END_OK' }
  | { type: 'END_ERR' }
  | { type: 'RETRY_EXISTS' };

export const KEYWORD_RULES: Array<{
  pattern: RegExp;
  action: Exclude<Action, { type: 'RETRY_EXISTS' }>;
  note?: string;
}> = [
  { pattern: /No se encontró el cultivo|Cultivo no encontrado|no se pudo encontrar/i, action: { type: 'END_ERR' }, note: 'Cultivo no encontrado - termina' },
  { pattern: /Ha ocurrido un error|Error al procesar|no se pudo completar/i, action: { type: 'END_ERR' }, note: 'Error general - termina' },
  { pattern: /Gracias por usar|Hasta luego|Adiós/i, action: { type: 'END_OK' }, note: 'Despedida - termina' },
  { pattern: /Cultivo:/i, action: { type: 'END_OK' }, note: 'Lista de cultivos recibida' },
  { pattern: /campaña (cread[oa]) exitosamente/i, action: { type: 'END_OK' }, note: 'Campaña creada' },
  { pattern: /cultivo creado exitosamente/i, action: { type: 'END_OK' }, note: 'Cultivo creado' },
  { pattern: /fertilizante creado exitosamente/i, action: { type: 'END_OK' }, note: 'Fertilizante creado' },
  { pattern: /(fitosanitario|producto químico|producto) creado exitosamente/i, action: { type: 'END_OK' }, note: 'Fitosanitario/Producto creado' },
  { pattern: /(cread[oa]) exitosamente|éxito|confirmad[oa]/i, action: { type: 'END_OK' }, note: 'Éxito genérico' },
  { pattern: /(precio (asignado|actualizado|registrado)|asigno un precio|precio fijado)/i, action: { type: 'END_OK' }, note: 'Precio asignado/actualizado' },
  { pattern: /(error|falla|inválid[oa]|no\s+válido)/i, action: { type: 'END_ERR' }, note: 'Error explícito' },
  { pattern: /^Nombre del cultivo\.?$/i,        action: { type: 'REPLY', reply: '{cultivo}' },   note: 'Pide cultivo' },
  { pattern: /^Nombre de la variedad\.?$/i,     action: { type: 'REPLY', reply: '{variedad}' },  note: 'Pide variedad' },
  { pattern: /^Destino del cultivo\.?$/i,       action: { type: 'REPLY', reply: '{destino}' },   note: 'Pide destino' },
  { pattern: /^Marca del cultivo\.?$/i,         action: { type: 'REPLY', reply: '{marca}' },     note: 'Pide marca' },
  { pattern: /^(Nombre del cliente|Cliente)\.?$/i, action: { type: 'REPLY', reply: '{cliente}' }, note: 'Pide cliente' },
  { pattern: /^Nombre de la campaña\.?$/i,      action: { type: 'REPLY', reply: '{campana}' },   note: 'Pide campaña' },
  { pattern: /^Nombre de la granja\.?$/i,       action: { type: 'REPLY', reply: '{granja}' },    note: 'Pide granja' },
  { pattern: /^Nombre del campo\.?$/i,          action: { type: 'REPLY', reply: '{campo}' },     note: 'Pide campo' },
  {
    pattern: /\bDosis\b(?:\s+(?:planificada|recomendada))?(?:\s*\((?:Kg\/?H|Kg\/?Ha|kg\/?h|kg\/?ha|KG\/?H|KG\/?HA)\))?\s*\.?$/i,
    action: { type: 'REPLY', reply: '{dosis}' },
    note: 'Pide dosis: responder {dosis}'
  },
  { pattern: /^(Producto|Nombre del producto|Nombre del artículo)\.?$/i, action: { type: 'REPLY', reply: '{productName}' }, note: 'Pide producto' },
  { pattern: /^(Precio|Importe|Valor|Coste|Costo)\.?$/i,                 action: { type: 'REPLY', reply: '{price}' },       note: 'Pide precio' },
  { pattern: /^Fecha( de vigencia| de precio)?\.?$/i,                    action: { type: 'REPLY', reply: '{priceDate}' },   note: 'Pide fecha precio' }
];

export function extractFirstOption(message: string): string | null {
  const optionsMatch = message.match(/Opciones:\s*([^\.\n]+)/i);
  if (optionsMatch) {
    const raw = optionsMatch[1];
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[0];
  }
  if (/^\s*1\.\s+/m.test(message)) return '1';
  return null;
}

export function randomToken(n = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < n; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  const timestamp = Date.now().toString(36).slice(-3);
  return result + timestamp;
}

export function mutateOneVariableForRetry() {
  const tok = randomToken(5);
  setVar('marca', `Yucasol-${tok}`);
}

export const CROPS_POOL: Array<{ cultivo: string; variedades?: string[] }> = [
  { cultivo: 'trigo', variedades: ['filón', 'garbancera', 'renan', 'diva'] },
  { cultivo: 'cebada', variedades: ['planet', 'meseta', 'iskra'] },
  { cultivo: 'girasol', variedades: ['alto oleico', 'linoleico', 'pioneer'] },
  { cultivo: 'soja', variedades: ['amarilla', 'negra', 'asgrow 393'] },
  { cultivo: 'algodón', variedades: ['deltapine 1646', 'fibermax 9660'] },
  { cultivo: 'sorgo', variedades: ['p8333', 'p8422'] },
  { cultivo: 'arroz', variedades: ['bahía', 'senia', 'bomba'] },
  { cultivo: 'triticale', variedades: ['bogo', 'tritordeum'] },
  { cultivo: 'remolacha', variedades: ['kanzia', 'monalisa'] },
  { cultivo: 'patata', variedades: ['agria', 'monalisa', 'kennebec'] },
  { cultivo: 'colza', variedades: ['es capello', 'es imperio', 'lg austin'] },
  { cultivo: 'alfalfa', variedades: ['cuenca', 'saratoga', 'dormancy 9'] },
  { cultivo: 'avena', variedades: ['previsión', 'nevada'] },
  { cultivo: 'centeno', variedades: ['sangaste', 'petkus'] },
  { cultivo: 'maíz', variedades: ['p 8660', 'p1921', 'dkc 6664'] }
];

export function pickRandomCrop(): { cultivo: string; variedad?: string } {
  const idx = Math.floor(Math.random() * CROPS_POOL.length);
  const item = CROPS_POOL[idx];
  const v = item.variedades && item.variedades.length
    ? item.variedades[Math.floor(Math.random() * item.variedades.length)]
    : undefined;
  return { cultivo: item.cultivo, variedad: v };
}
