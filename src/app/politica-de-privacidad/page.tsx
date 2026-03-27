import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politica de Privacidad — Vivelo',
  description:
    'Aviso de privacidad integral de Vivelo. Conoce como recopilamos, usamos y protegemos tus datos personales conforme a la LFPDPPP.',
  alternates: {
    canonical: 'https://solovivelo.com/politica-de-privacidad',
  },
};

export default function PoliticaDePrivacidadPage() {
  return (
    <div className="min-h-screen bg-off-white">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-deep-purple mb-2">
            Politica y Aviso de Privacidad Integral
          </h1>
          <p className="text-muted-foreground">
            Version 1.0 | Mexico, marzo 2026
          </p>
          <p className="text-sm text-muted-foreground">
            Ultima actualizacion: 5 de marzo de 2026
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              1. Identidad y Domicilio del Responsable
            </h2>
            <p>
              VIVELO TECNOLOGIA EN EXPERIENCIAS SAS (en adelante, &quot;Vivelo&quot; o el &quot;Responsable&quot;), con domicilio en Ciudad de Mexico, Mexico, y sitio web solovivelo.com, es responsable del tratamiento de los datos personales que recopila a traves de su plataforma digital (la &quot;Plataforma&quot;), de conformidad con la Ley Federal de Proteccion de Datos Personales en Posesion de los Particulares (&quot;LFPDPPP&quot;) y su Reglamento.
            </p>
            <p className="mt-2">
              Vivelo pone a disposicion del titular el presente Aviso de Privacidad Integral con el objetivo de informarle sobre el tratamiento que se dara a sus datos personales.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              2. Datos Personales Recopilados
            </h2>

            <h3 className="font-semibold mt-4 mb-2">2.1 Datos de Clientes</h3>
            <p>Para el registro y uso de la Plataforma como Cliente, Vivelo recopila los siguientes datos personales:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Datos de identificacion:</strong> nombre completo, correo electronico, numero telefonico.</li>
              <li><strong>Datos de cuenta:</strong> contrasena (almacenada de forma encriptada), rol de usuario, foto de perfil (opcional).</li>
              <li><strong>Datos de uso:</strong> historial de reservas, servicios contratados, preferencias, nombres de eventos, fechas y horarios de eventos, numero de invitados.</li>
              <li><strong>Datos de navegacion:</strong> paginas visitadas, interacciones con servicios, impresiones de contenido, datos UTM de origen (utm_source, utm_medium, utm_campaign, utm_term, utm_content), pagina de aterrizaje, referente web.</li>
              <li><strong>Datos de pago:</strong> informacion de transacciones procesadas a traves de Stripe (Vivelo no almacena datos de tarjetas de credito directamente; estos son gestionados por Stripe conforme al estandar PCI-DSS).</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2">2.2 Datos de Proveedores</h3>
            <p>Adicionalmente a los datos anteriores, para el registro como Proveedor se recopilan:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Datos fiscales:</strong> RFC, constancia de situacion fiscal.</li>
              <li><strong>Datos bancarios:</strong> CLABE interbancaria, nombre del banco, titular de la cuenta, documento bancario comprobatorio.</li>
              <li><strong>Datos de operacion:</strong> nombre comercial o razon social, biografia profesional, zona de operacion, servicios ofrecidos, precios, disponibilidad, capacidad de servicios concurrentes, configuracion de buffers de tiempo.</li>
              <li><strong>Documentacion:</strong> identificacion oficial, comprobante de domicilio, permisos y licencias aplicables, poliza de seguro de responsabilidad civil (cuando aplique).</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2">2.3 Datos Sensibles</h3>
            <p>
              Vivelo no recopila datos personales sensibles de forma deliberada. En caso de que algun dato sensible sea proporcionado voluntariamente por el titular (por ejemplo, en campos de texto libre como notas de reserva), Vivelo lo tratara con la maxima confidencialidad y unicamente para la finalidad especifica para la que fue proporcionado.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              3. Finalidades del Tratamiento
            </h2>

            <h3 className="font-semibold mt-4 mb-2">3.1 Finalidades Primarias (necesarias)</h3>
            <p>El tratamiento de datos personales tiene las siguientes finalidades primarias:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Crear y administrar la cuenta del usuario en la Plataforma.</li>
              <li>Verificar la identidad y elegibilidad de los Proveedores.</li>
              <li>Facilitar la busqueda, reserva y contratacion de servicios para eventos.</li>
              <li>Procesar pagos, emitir reembolsos y gestionar la liquidacion a proveedores.</li>
              <li>Gestionar el ciclo de vida de las reservas (confirmacion, verificacion de inicio/fin, cancelacion).</li>
              <li>Comunicar al Cliente y Proveedor informacion relevante sobre sus reservas y ordenes.</li>
              <li>Verificar la disponibilidad de los Proveedores y gestionar conflictos de horario.</li>
              <li>Aplicar politicas de cancelacion y calcular reembolsos.</li>
              <li>Moderar resenas y calificaciones conforme a las politicas de contenido.</li>
              <li>Atender solicitudes, quejas y reclamaciones de los usuarios.</li>
              <li>Cumplir con obligaciones legales, fiscales y regulatorias.</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2">3.2 Finalidades Secundarias (no necesarias)</h3>
            <p>Adicionalmente, con el consentimiento del titular, los datos podran ser utilizados para:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Enviar comunicaciones comerciales, promociones y campanas de marketing.</li>
              <li>Realizar analisis estadisticos y de tendencias del uso de la Plataforma.</li>
              <li>Personalizar la experiencia del usuario mediante recomendaciones de servicios.</li>
              <li>Medir la efectividad de campanas publicitarias a traves de herramientas de analytics (Google Analytics y Meta Pixel).</li>
              <li>Capturar y analizar datos de atribucion de marketing (parametros UTM).</li>
              <li>Elaborar perfiles de uso para mejora de la Plataforma.</li>
            </ul>
            <p className="mt-2">
              El titular podra manifestar su negativa al tratamiento de sus datos para las finalidades secundarias en cualquier momento, sin que ello afecte el tratamiento para las finalidades primarias.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              4. Transferencias de Datos
            </h2>
            <p>Vivelo podra transferir datos personales a los siguientes terceros, sin requerir consentimiento adicional del titular conforme al articulo 37 de la LFPDPPP:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Proveedores de servicios registrados en la Plataforma:</strong> nombre del Cliente, datos del evento (fecha, horario, numero de invitados, notas) estrictamente necesarios para la prestacion del servicio contratado.</li>
              <li><strong>Stripe Inc.:</strong> datos necesarios para el procesamiento de pagos y la prevencion de fraude. Stripe opera como encargado del tratamiento de datos de pago conforme al estandar PCI-DSS.</li>
              <li><strong>Supabase Inc.:</strong> proveedor de infraestructura de base de datos y autenticacion donde se almacenan los datos de la Plataforma. Supabase actua como encargado del tratamiento.</li>
              <li><strong>Anthropic PBC:</strong> proveedor de inteligencia artificial que alimenta al asistente virtual Vivi. Se comparten unicamente los mensajes del usuario dentro del chat para generar respuestas. No se comparten datos personales identificables mas alla del contexto de la conversacion.</li>
              <li><strong>Autoridades competentes:</strong> cuando sea requerido por ley, regulacion, proceso judicial o solicitud gubernamental aplicable.</li>
            </ul>
            <p className="mt-2">
              Vivelo no vende, alquila ni comercializa datos personales de sus usuarios a terceros con fines publicitarios independientes.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              5. Cookies y Herramientas de Analytics
            </h2>

            <h3 className="font-semibold mt-4 mb-2">5.1 Cookies</h3>
            <p>
              La Plataforma utiliza cookies y tecnologias similares para el funcionamiento del sitio (autenticacion de sesion), la persistencia del carrito de compras (almacenado en localStorage del navegador), y la mejora de la experiencia de usuario.
            </p>

            <h3 className="font-semibold mt-4 mb-2">5.2 Herramientas de Analytics de Terceros</h3>
            <p>Vivelo utiliza las siguientes herramientas de analytics que recopilan datos de forma automatica:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Google Analytics (GA4):</strong> para el seguimiento de eventos de comercio electronico (visualizacion de servicios, adicion al carrito, inicio de checkout, compras), medicion de trafico y analisis de comportamiento de usuarios.</li>
              <li><strong>Meta Pixel (Facebook):</strong> para el seguimiento de conversiones y la medicion de efectividad de campanas publicitarias en plataformas de Meta.</li>
            </ul>
            <p className="mt-2">
              Estas herramientas pueden utilizar cookies propias y de terceros. El usuario puede gestionar sus preferencias de cookies a traves de la configuracion de su navegador. La desactivacion de ciertas cookies puede afectar la funcionalidad de la Plataforma.
            </p>

            <h3 className="font-semibold mt-4 mb-2">5.3 Almacenamiento Local</h3>
            <p>
              La Plataforma utiliza el almacenamiento local del navegador (localStorage) para los siguientes fines: persistencia del carrito de compras (clave: vivelo-cart), almacenamiento de datos de atribucion UTM de la primera visita (clave: vivelo-utm), y preferencias de sesion. Estos datos se almacenan exclusivamente en el dispositivo del usuario y no se transmiten a servidores de terceros, excepto cuando el usuario realiza una accion que requiera su envio (como completar una compra).
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              6. Medidas de Seguridad
            </h2>
            <p>Vivelo implementa las siguientes medidas de seguridad administrativas, tecnicas y fisicas para proteger los datos personales:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Encriptacion de datos sensibles:</strong> las contrasenas se almacenan con hash criptografico. Los tokens de acceso a servicios de terceros se encriptan con AES-256-GCM.</li>
              <li><strong>Control de acceso basado en roles (RBAC):</strong> con tres niveles de acceso (Cliente, Proveedor, Administrador) y politicas de seguridad a nivel de fila (Row Level Security) en toda la base de datos.</li>
              <li><strong>Autenticacion segura:</strong> sesiones gestionadas por Supabase Auth con soporte para verificacion de correo electronico.</li>
              <li><strong>Procesamiento de pagos seguro:</strong> a traves de Stripe con firma HMAC para la verificacion de webhooks e idempotencia para evitar procesamiento duplicado de transacciones.</li>
              <li><strong>Aislamiento de ambientes:</strong> el portal de administracion opera en un subdominio separado (admin.solovivelo.com) con verificacion de rol obligatoria.</li>
              <li><strong>Inmutabilidad financiera:</strong> snapshots de datos financieros al momento de cada reserva para garantizar la integridad historica de las transacciones.</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              7. Derechos ARCO
            </h2>
            <p>
              El titular de los datos personales tiene derecho a ejercer en todo momento sus derechos de Acceso, Rectificacion, Cancelacion y Oposicion (&quot;Derechos ARCO&quot;) respecto a sus datos personales, conforme a la LFPDPPP.
            </p>

            <h3 className="font-semibold mt-4 mb-2">7.1 Procedimiento para Ejercer Derechos ARCO</h3>
            <p>El titular debera enviar una solicitud al correo electronico hola@solovivelo.com con la siguiente informacion:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Nombre completo del titular y correo electronico registrado en la Plataforma.</li>
              <li>Descripcion clara del derecho que desea ejercer y los datos personales involucrados.</li>
              <li>Documento que acredite la identidad del titular o, en su caso, la representacion legal.</li>
              <li>Cualquier otro documento que facilite la localizacion de los datos personales.</li>
            </ul>
            <p className="mt-2">
              Vivelo respondera la solicitud dentro de un plazo maximo de 20 dias habiles contados a partir de la fecha de recepcion. En caso de ser procedente, los cambios se haran efectivos dentro de los 15 dias habiles siguientes a la comunicacion de la respuesta. Estos plazos podran ampliarse una sola vez por un periodo igual, siempre que sea justificado.
            </p>

            <h3 className="font-semibold mt-4 mb-2">7.2 Revocacion del Consentimiento</h3>
            <p>
              El titular podra revocar su consentimiento para el tratamiento de datos personales en cualquier momento, sin efectos retroactivos, enviando su solicitud al correo electronico indicado anteriormente. La revocacion del consentimiento para finalidades primarias podra resultar en la imposibilidad de continuar utilizando la Plataforma.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              8. Limitacion del Uso y Divulgacion de Datos
            </h2>
            <p>
              El titular podra limitar el uso o divulgacion de sus datos personales enviando su solicitud al correo electronico hola@solovivelo.com. Asimismo, el titular podra registrarse en el Registro Publico para Evitar Publicidad (REPEP) de la PROFECO para limitar el uso de sus datos con fines publicitarios.
            </p>
            <p className="mt-2">
              Los Proveedores que tengan acceso a datos de Clientes en virtud de una reserva estan obligados a tratar dichos datos con estricta confidencialidad, utilizarlos unicamente para la prestacion del servicio contratado, no crear bases de datos independientes con dicha informacion, y eliminar los datos una vez concluida la prestacion del servicio.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              9. Proteccion de Datos de Menores
            </h2>
            <p>
              La Plataforma no esta dirigida a menores de 18 anos. Vivelo no recopila deliberadamente datos personales de menores de edad. Si Vivelo tiene conocimiento de que ha recopilado datos de un menor sin el consentimiento de sus padres o tutores, procedera a eliminar dicha informacion de forma inmediata.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              10. Conservacion de Datos
            </h2>
            <p>Vivelo conservara los datos personales durante el tiempo necesario para cumplir con las finalidades descritas en este Aviso, y posteriormente durante los periodos legales obligatorios. En particular:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Datos de cuenta:</strong> durante la vigencia de la relacion con el usuario y hasta que solicite la cancelacion de su cuenta.</li>
              <li><strong>Datos de transacciones y reservas:</strong> por un periodo minimo de 5 anos a partir de la fecha de la transaccion, conforme a las obligaciones fiscales mexicanas.</li>
              <li><strong>Datos financieros de Proveedores (RFC, CLABE):</strong> durante la vigencia de la relacion contractual y los periodos fiscales obligatorios.</li>
              <li><strong>Snapshots financieros de reservas:</strong> de forma indefinida para garantizar la inmutabilidad historica y la auditabilidad de las transacciones.</li>
              <li><strong>Datos de navegacion y analytics:</strong> por un periodo maximo de 24 meses.</li>
            </ul>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              11. Modificaciones al Aviso de Privacidad
            </h2>
            <p>
              Vivelo se reserva el derecho de modificar el presente Aviso de Privacidad en cualquier momento. Las modificaciones seran notificadas a los titulares a traves del correo electronico registrado o mediante publicacion en la Plataforma (solovivelo.com). Se recomienda a los titulares consultar periodicamente este Aviso para estar informados sobre cualquier cambio.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              12. Contacto para Asuntos de Privacidad
            </h2>
            <p>Para cualquier duda, queja o solicitud relacionada con el tratamiento de datos personales o el ejercicio de derechos ARCO, el titular podra contactar al area de Privacidad de Vivelo:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Correo electronico:</strong> hola@solovivelo.com</li>
              <li><strong>Sitio web:</strong> solovivelo.com</li>
              <li><strong>Domicilio:</strong> Ciudad de Mexico, Mexico</li>
            </ul>
            <p className="mt-2">
              Si el titular considera que su derecho a la proteccion de datos personales ha sido lesionado, podra interponer queja o denuncia ante el Instituto Nacional de Transparencia, Acceso a la Informacion y Proteccion de Datos Personales (INAI). Para mas informacion, visite www.inai.org.mx.
            </p>
          </section>

          {/* Footer */}
          <div className="border-t pt-6 mt-8 text-center text-muted-foreground">
            <p>VIVELO TECNOLOGIA EN EXPERIENCIAS SAS — Todos los derechos reservados</p>
          </div>
        </div>
      </div>
    </div>
  );
}
