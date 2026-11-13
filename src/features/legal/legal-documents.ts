import type { LegalContact } from './legal-config'
import { LEGAL_EFFECTIVE_LABEL, LEGAL_VERSIONS } from './legal-versions'

export { LEGAL_VERSIONS } from './legal-versions'

export type LegalKind = 'terminos' | 'privacidad'

/** Un párrafo, o una lista si es un arreglo. */
export type LegalBlock = string | string[]

export interface LegalSection {
  id: string
  title: string
  blocks: LegalBlock[]
}

export interface LegalDocument {
  kind: LegalKind
  title: string
  version: string
  /** «13 de noviembre de 2026» */
  effectiveLabel: string
  summary: string[]
  /** Qué cambió respecto de la versión anterior (se muestra al pedir aceptar de nuevo). */
  changes: string[]
  sections: LegalSection[]
}

const EFFECTIVE_LABEL = LEGAL_EFFECTIVE_LABEL
const PENDING = '[dato pendiente]'

function texts(contact: LegalContact) {
  const owner = contact.owner ?? `${PENDING} (responsable de Syntropy)`
  const email = contact.email ?? `${PENDING} (correo de contacto)`
  const where = contact.location ? `, con domicilio en ${contact.location}` : ''
  return { owner, email, where }
}

function contactSection(contact: LegalContact, id: string, number: number): LegalSection {
  const { owner, email } = texts(contact)

  return {
    id,
    title: `${number}. Contacto`,
    blocks: [
      [`Responsable: ${owner}.`, `Correo: ${email}.`, `Domicilio: ${contact.location ?? PENDING}.`],
      'Escribinos desde el correo de tu cuenta para que podamos confirmar que el pedido es tuyo.',
    ],
  }
}

export function privacyPolicy(contact: LegalContact): LegalDocument {
  const { owner, email, where } = texts(contact)

  return {
    kind: 'privacidad',
    title: 'Política de privacidad',
    version: LEGAL_VERSIONS.privacy,
    effectiveLabel: EFFECTIVE_LABEL,
    summary: [
      'Usamos tus datos solo para que Syntropy funcione: tu cuenta, tu contenido académico y, si los activás, tus recordatorios.',
      'No vendemos tus datos, no mostramos publicidad y no usamos herramientas de analítica ni de seguimiento de terceros.',
      'Podés ver, corregir, descargar y borrar tus datos desde la app.',
    ],
    changes: [
      'Primera versión completa: reemplaza el borrador del 10 de noviembre de 2026.',
      'Dice quiénes son los proveedores (Supabase y Resend) y qué datos recibe cada uno.',
      'Suma los recordatorios por correo, la biblioteca de archivos y la copia de tus datos en el dispositivo.',
      'Explica cuánto tiempo se guardan los datos y cómo pedir acceso, corrección o eliminación, y agrega la descarga de tus datos.',
    ],
    sections: [
      {
        id: 'responsable',
        title: '1. Quién es responsable',
        blocks: [
          `El responsable de la base de datos y del tratamiento es ${owner}${where}. Podés escribir a ${email}.`,
          'Esta política se rige por la Ley 25.326 de Protección de los Datos Personales de la República Argentina y sus normas complementarias.',
        ],
      },
      {
        id: 'datos',
        title: '2. Qué datos tratamos',
        blocks: [
          [
            'Cuenta: correo electrónico, contraseña (la guarda Supabase Auth cifrada y nadie del equipo puede verla), nombre de usuario y, si los cargás, nombre completo y foto de perfil.',
            'Preferencias: zona horaria, idioma, escala de calificaciones y configuración de los recordatorios.',
            'Consentimientos: la fecha y la versión en que aceptaste estos documentos, y la confirmación de que tenés 13 años o más. No pedimos tu fecha de nacimiento.',
            'Contenido académico: años de curso, asignaturas (con los docentes y criterios que anotes), horario, tareas, exámenes y planes de estudio, calificaciones, nodos de conocimiento y la biblioteca, con los archivos y enlaces que subas.',
            'Recordatorios: los avisos programados y enviados, la dirección a la que se mandaron, el identificador que les da el proveedor de correo y, si un envío falla, el motivo.',
            'Datos técnicos: los proveedores registran datos como la dirección IP, la fecha y el navegador de cada solicitud, por seguridad y para que el servicio funcione.',
          ],
          'No recopilamos tu ubicación, tus contactos ni datos de otras aplicaciones, y no usamos cookies de seguimiento ni herramientas de analítica o publicidad de terceros.',
        ],
      },
      {
        id: 'dispositivo',
        title: '3. Qué se guarda en tu dispositivo',
        blocks: [
          [
            'La sesión, para que no tengas que ingresar cada vez.',
            'Una copia de tus datos para usar la app sin conexión, separada por usuario. Caduca a las 24 horas y se borra al cerrar sesión. Si usás un dispositivo compartido, cerrá sesión al terminar.',
            'Si instalás la app, los archivos del programa (código, íconos y tipografías) para que abra más rápido. Esos archivos no contienen tus datos.',
          ],
        ],
      },
      {
        id: 'finalidad',
        title: '4. Para qué los usamos',
        blocks: [
          [
            'Crear y proteger tu cuenta, y dejarte ingresar desde cualquier dispositivo.',
            'Guardar, mostrar y sincronizar tu contenido académico.',
            'Enviarte los correos de la cuenta: confirmación del registro y recuperación de la contraseña.',
            'Enviarte recordatorios por correo, solo si los activás.',
            'Responderte cuando nos escribís y atender tus pedidos sobre tus datos.',
            'Detectar abusos y mantener la seguridad del servicio.',
          ],
          'No vendemos ni alquilamos tus datos, no los usamos para publicidad ni para armar perfiles comerciales, y no usamos tu contenido para entrenar modelos de inteligencia artificial.',
        ],
      },
      {
        id: 'base',
        title: '5. Con qué base los tratamos',
        blocks: [
          'Con tu consentimiento libre, expreso e informado, que das al crear la cuenta y aceptar esta política, y porque son necesarios para prestarte el servicio que pediste. Los recordatorios por correo necesitan además que los actives en Configuración.',
          'Podés retirar tu consentimiento cuando quieras, apagando los recordatorios o eliminando tu cuenta. Retirarlo no afecta lo que ya se hizo antes.',
        ],
      },
      {
        id: 'proveedores',
        title: '6. Quién más recibe tus datos',
        blocks: [
          'Usamos proveedores que tratan los datos por cuenta nuestra y solo para prestar el servicio:',
          [
            'Supabase: base de datos, autenticación y archivos; también envía los correos de la cuenta. Recibe los datos de la sección 2.',
            'Resend: envío de los recordatorios, solo si los activás. Recibe tu dirección de correo y el contenido de cada aviso (por ejemplo, el título de la tarea, la asignatura y la fecha).',
            'El servicio de alojamiento de la aplicación web, que entrega los archivos de la app y registra datos técnicos de las visitas.',
          ],
          'No compartimos tus datos con nadie más, salvo que una autoridad competente lo exija de acuerdo con la ley.',
        ],
      },
      {
        id: 'transferencia',
        title: '7. Datos fuera de la Argentina',
        blocks: [
          'Los proveedores pueden guardar o procesar los datos fuera de la Argentina, por ejemplo en los Estados Unidos o en la región elegida para el proyecto. Al aceptar esta política consentís esa transferencia. Los proveedores elegidos ofrecen acuerdos de tratamiento de datos que los obligan a protegerlos y a usarlos solo para prestar el servicio.',
        ],
      },
      {
        id: 'conservacion',
        title: '8. Cuánto tiempo los guardamos',
        blocks: [
          [
            'Mientras tengas la cuenta.',
            'Si eliminás la cuenta, se borran en el momento el perfil, el contenido académico, los recordatorios y los archivos.',
            'Las copias de seguridad del proveedor pueden conservar datos borrados durante su período de retención, hasta que se renuevan.',
            'Resend conserva el registro de los correos enviados durante el plazo que fijan sus propias políticas.',
            'La copia en tu dispositivo caduca a las 24 horas y se borra al cerrar sesión.',
          ],
          'Solo conservaríamos algo más si una norma lo exigiera.',
        ],
      },
      {
        id: 'derechos',
        title: '9. Tus derechos',
        blocks: [
          'Tenés derecho a acceder a tus datos, rectificarlos, actualizarlos y pedir que se supriman. Podés hacerlo:',
          [
            'Desde la app: editando tu perfil y tu contenido, descargando una copia de tus datos (Configuración → Cuenta → Descargar mis datos), apagando los recordatorios o eliminando tu cuenta.',
            `Por correo, escribiendo a ${email} desde la dirección de tu cuenta.`,
          ],
          'Respondemos los pedidos de acceso dentro de los 10 días corridos, y los de rectificación, actualización o supresión dentro de los 5 días hábiles, como establece la Ley 25.326.',
          'El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.',
        ],
      },
      {
        id: 'menores',
        title: '10. Menores de edad',
        blocks: [
          'Syntropy es para personas de 13 años o más. Si tenés entre 13 y 17 años, usala con el conocimiento y la autorización de tus padres o tutores, que pueden ejercer tus derechos sobre los datos escribiéndonos.',
          'No pedimos fecha de nacimiento. Si sabemos que una cuenta pertenece a una persona menor de 13 años, la eliminamos junto con sus datos.',
        ],
      },
      {
        id: 'seguridad',
        title: '11. Seguridad',
        blocks: [
          'Las conexiones van cifradas (HTTPS). Cada cuenta solo puede leer sus propios datos: lo controla la base de datos con reglas por fila. Los archivos se guardan en espacios privados y se abren con enlaces que vencen. Nadie del equipo accede a tu contenido salvo que haga falta para resolver un problema que nos pidas o para cumplir una obligación legal.',
          `Ningún sistema es infalible. Si ocurre un incidente que afecte tus datos, te vamos a avisar por correo, con lo que pasó y qué conviene hacer. Si encontrás una vulnerabilidad, escribinos a ${email}.`,
        ],
      },
      {
        id: 'cambios',
        title: '12. Cambios en esta política',
        blocks: [
          'Cada versión lleva su fecha. Si un cambio afecta cómo tratamos tus datos, te lo vamos a mostrar al ingresar y vas a tener que aceptarlo para seguir usando la app. Guardamos la versión y la fecha de cada aceptación.',
          'Si no estás de acuerdo con una versión nueva, podés descargar tus datos y eliminar tu cuenta.',
        ],
      },
      contactSection(contact, 'contacto', 13),
    ],
  }
}

export function termsOfUse(contact: LegalContact): LegalDocument {
  const { owner, where } = texts(contact)

  return {
    kind: 'terminos',
    title: 'Términos de uso',
    version: LEGAL_VERSIONS.terms,
    effectiveLabel: EFFECTIVE_LABEL,
    summary: [
      'Syntropy es una herramienta personal para organizar tu vida académica, y es gratuita.',
      'Tu contenido es tuyo. Sos responsable de lo que subís y de cuidar tu contraseña.',
      'Hacemos lo posible para que funcione bien, pero puede fallar: guardá copias de lo importante y no dependas solo de los recordatorios.',
    ],
    changes: [
      'Primera versión completa: reemplaza el borrador del 10 de noviembre de 2026.',
      'Suma las reglas de la biblioteca, los recordatorios por correo y los límites del servicio.',
      'Agrega la ley aplicable, tus derechos como consumidor y el contacto.',
    ],
    sections: [
      {
        id: 'servicio',
        title: '1. Qué es Syntropy y quién lo ofrece',
        blocks: [
          `Syntropy es una aplicación para organizar años de curso, asignaturas, horario, tareas, exámenes, calificaciones, temas de estudio y material. La ofrece ${owner}${where}.`,
          'Al crear una cuenta, o al aceptar una versión nueva de estos términos, aceptás estas condiciones y la política de privacidad. Si no estás de acuerdo, no uses la aplicación.',
        ],
      },
      {
        id: 'quien',
        title: '2. Quién puede usarla',
        blocks: [
          [
            'Personas de 13 años o más.',
            'Si tenés entre 13 y 17 años, necesitás el conocimiento y la autorización de tus padres o tutores.',
            'Cada cuenta es personal: no la compartas ni crees cuentas a nombre de otra persona.',
            'Los datos que cargues al registrarte tienen que ser verdaderos.',
          ],
        ],
      },
      {
        id: 'cuenta',
        title: '3. Tu cuenta',
        blocks: [
          'Sos responsable de mantener segura tu contraseña y de lo que se haga con tu cuenta. Si sospechás que alguien entró sin permiso, cambiá la contraseña y avisanos.',
          'Necesitás un correo propio y verificado: ahí llegan la recuperación de la contraseña y los recordatorios.',
        ],
      },
      {
        id: 'contenido',
        title: '4. Tu contenido',
        blocks: [
          'Lo que cargás (asignaturas, tareas, notas, temas, archivos y enlaces) sigue siendo tuyo. Nos das permiso para guardarlo, copiarlo en tus dispositivos y procesarlo solo para prestarte el servicio, mientras tengas la cuenta.',
          'Sos responsable de lo que subís. Subí solo material que tengas derecho a guardar (por ejemplo, apuntes propios o el material que te dio tu institución) y cuidá los datos de otras personas que anotes, como los nombres de tus docentes.',
          'No revisamos tu contenido. Si recibimos un reclamo fundado de que un archivo infringe derechos de terceros o la ley, podemos retirarlo, y te vamos a avisar.',
        ],
      },
      {
        id: 'uso',
        title: '5. Uso permitido',
        blocks: [
          'No está permitido:',
          [
            'Usar Syntropy para actividades ilegales o para guardar contenido ilegal.',
            'Usar la biblioteca para almacenar o hacer circular material protegido por derechos de autor sin permiso.',
            'Intentar entrar a cuentas o datos ajenos, vulnerar la seguridad o sobrecargar el servicio.',
            'Usar programas automáticos para crear cuentas o generar actividad.',
            'Revender el servicio o explotarlo comercialmente sin autorización.',
          ],
        ],
      },
      {
        id: 'recordatorios',
        title: '6. Recordatorios por correo',
        blocks: [
          'Son opcionales y llegan al correo de tu cuenta. Hacemos lo posible para que lleguen a tiempo, pero pueden demorarse, ir a la carpeta de spam o no llegar por fallas del proveedor o de tu servicio de correo. No reemplazan tu propia organización: revisá las fechas en la app.',
        ],
      },
      {
        id: 'limites',
        title: '7. Límites del servicio',
        blocks: [
          [
            'Biblioteca: archivos de hasta 25 MB, 200 MB de espacio y 1000 fuentes por cuenta.',
            'Recordatorios: hasta 20 correos por día.',
          ],
          'Estos límites pueden cambiar. Si se reducen, te avisaremos antes y no vamos a borrar lo que ya tengas guardado.',
        ],
      },
      {
        id: 'precio',
        title: '8. Precio',
        blocks: [
          'Hoy Syntropy es gratuito. Si en el futuro se ofrecen funciones pagas, se van a anunciar antes y no se va a cobrar nada sin tu aceptación expresa.',
        ],
      },
      {
        id: 'disponibilidad',
        title: '9. Disponibilidad',
        blocks: [
          'Trabajamos para que el servicio funcione bien y sin cortes, pero puede tener interrupciones por mantenimiento, fallas de los proveedores u otras causas. Te recomendamos descargar tus datos cada tanto y guardar copias de los archivos importantes.',
          'Podemos cambiar, mejorar o dejar de ofrecer funciones. Si decidimos cerrar el servicio, te vamos a avisar con al menos 30 días de anticipación para que puedas descargar tus datos.',
        ],
      },
      {
        id: 'responsabilidad',
        title: '10. Responsabilidad',
        blocks: [
          'En la medida en que lo permita la ley, no somos responsables por daños indirectos ni por las consecuencias de usar o no poder usar el servicio, como una entrega o un examen olvidados.',
          'Nada en estos términos limita los derechos que te reconoce la Ley 24.240 de Defensa del Consumidor ni otras normas que no se pueden dejar de lado por contrato.',
        ],
      },
      {
        id: 'propiedad',
        title: '11. Propiedad intelectual',
        blocks: [
          `El nombre Syntropy, el logo, el diseño y los textos de la aplicación pertenecen a ${owner}. No se pueden copiar ni usar sin autorización, salvo lo que permita la ley. Tu contenido sigue siendo tuyo.`,
        ],
      },
      {
        id: 'baja',
        title: '12. Suspensión y baja',
        blocks: [
          'Podés dejar de usar Syntropy y eliminar tu cuenta cuando quieras desde Configuración.',
          'Podemos suspender o cerrar una cuenta que incumpla gravemente estos términos o ponga en riesgo el servicio o a otras personas. Salvo urgencia o impedimento legal, te vamos a avisar antes y vas a poder descargar tus datos.',
        ],
      },
      {
        id: 'cambios',
        title: '13. Cambios en estos términos',
        blocks: [
          'Si cambiamos estos términos, la versión nueva lleva su fecha y te la mostramos al ingresar. Para seguir usando la app vas a tener que aceptarla. Si no estás de acuerdo, podés descargar tus datos y eliminar tu cuenta.',
        ],
      },
      {
        id: 'ley',
        title: '14. Ley aplicable',
        blocks: [
          'Estos términos se rigen por las leyes de la República Argentina. Ante un conflicto, vamos a intentar resolverlo primero por correo; si no se puede, serán competentes los tribunales que correspondan según las normas de defensa del consumidor.',
        ],
      },
      contactSection(contact, 'contacto', 15),
    ],
  }
}

export function getLegalDocument(
  kind: string | undefined,
  contact: LegalContact,
): LegalDocument | null {
  if (kind === 'terminos') {
    return termsOfUse(contact)
  }

  if (kind === 'privacidad') {
    return privacyPolicy(contact)
  }

  return null
}

/** Texto plano de un documento (para pruebas y para copiarlo a otro lado). */
export function legalDocumentText(document: LegalDocument): string {
  return [
    document.title,
    `Versión del ${document.effectiveLabel}`,
    ...document.sections.flatMap((section) => [
      section.title,
      ...section.blocks.map((block) =>
        Array.isArray(block) ? block.map((item) => `- ${item}`).join('\n') : block,
      ),
    ]),
  ].join('\n\n')
}
