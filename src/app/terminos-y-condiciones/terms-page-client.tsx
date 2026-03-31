'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const tabs = [
  { id: 'general', label: 'Clientes y Uso General' },
  { id: 'proveedores', label: 'Proveedores' },
] as const;

type TabId = (typeof tabs)[number]['id'];

export function TermsPageClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'proveedores' ? 'proveedores' : 'general';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  return (
    <div className="min-h-screen bg-off-white">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-deep-purple mb-2">
            Terminos y Condiciones
          </h1>
          <p className="text-muted-foreground">
            Version 1.0 | Mexico, marzo 2026
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex justify-center gap-2 mb-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-deep-purple text-white'
                  : 'bg-white text-deep-purple border border-deep-purple/20 hover:bg-deep-purple/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'general' ? <GeneralTerms /> : <ProviderTerms />}

        {/* Back link */}
        <div className="mt-12 text-center">
          <Link href="/" className="text-deep-purple hover:underline text-sm">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── GENERAL TERMS ────────────────────────────────────────── */

function GeneralTerms() {
  return (
    <div className="space-y-8 text-sm leading-relaxed text-foreground">
      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">1. Informacion General</h2>
        <p>Los presentes Terminos y Condiciones de Uso (en adelante, los &quot;Terminos&quot;) regulan el acceso y uso de la plataforma digital Vivelo, accesible a traves de solovivelo.com y sus subdominios (en adelante, la &quot;Plataforma&quot;), operada por VIVELO TECNOLOGIA EN EXPERIENCIAS S.A.S de C.V. (en adelante, &quot;Vivelo&quot;, &quot;nosotros&quot; o &quot;la Plataforma&quot;), con domicilio en Ciudad de Mexico, Mexico.</p>
        <p className="mt-2">Vivelo es un marketplace en linea que conecta a usuarios que buscan servicios para eventos (en adelante, &quot;Clientes&quot;) con prestadores de servicios independientes (en adelante, &quot;Proveedores&quot;) en diversas categorias, incluyendo de forma enunciativa mas no limitativa: experiencias gastronomicas, catering, mobiliario, equipo de sonido e iluminacion, fotografia, video, entretenimiento, personal de servicio y otros servicios relacionados con eventos.</p>
        <p className="mt-2">Al acceder, navegar, registrarse o utilizar la Plataforma, el usuario acepta de manera expresa e incondicional los presentes Terminos, asi como nuestra Politica de Privacidad. Si no esta de acuerdo con estos Terminos, debera abstenerse de utilizar la Plataforma.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">2. Definiciones</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>&quot;Plataforma&quot;</strong>: El sitio web solovivelo.com, sus subdominios, aplicaciones moviles y cualquier otro medio digital operado por Vivelo.</li>
          <li><strong>&quot;Cliente&quot;</strong>: Persona fisica o moral que utiliza la Plataforma para buscar, reservar y contratar servicios para eventos.</li>
          <li><strong>&quot;Proveedor&quot;</strong>: Persona fisica o moral que ofrece y presta servicios a traves de la Plataforma, previa aprobacion de Vivelo.</li>
          <li><strong>&quot;Usuario&quot;</strong>: Cualquier persona que accede a la Plataforma, sea Cliente, Proveedor o visitante.</li>
          <li><strong>&quot;Reserva&quot; o &quot;Booking&quot;</strong>: La contratacion de un servicio especifico a traves de la Plataforma, que incluye fecha, horario, numero de invitados y extras seleccionados.</li>
          <li><strong>&quot;Orden&quot;</strong>: El conjunto de una o mas Reservas agrupadas en una sola transaccion de pago.</li>
          <li><strong>&quot;Extras&quot;</strong>: Servicios o productos adicionales ofrecidos por el Proveedor como complemento a un servicio principal.</li>
          <li><strong>&quot;Campana&quot;</strong>: Promocion temporal con descuento aplicable a servicios especificos dentro de la Plataforma.</li>
          <li><strong>&quot;Comision&quot;</strong>: El porcentaje que Vivelo retiene sobre el valor de cada transaccion completada como contraprestacion por el uso de la Plataforma.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">3. Registro y Cuentas de Usuario</h2>
        <h3 className="font-semibold mb-1">3.1 Registro de Clientes</h3>
        <p>Para realizar reservas, el Cliente debera crear una cuenta proporcionando informacion veraz y actualizada, incluyendo nombre completo, correo electronico y contrasena. El Cliente es responsable de mantener la confidencialidad de sus credenciales de acceso.</p>
        <h3 className="font-semibold mt-3 mb-1">3.2 Registro de Proveedores</h3>
        <p>Para operar como Proveedor en la Plataforma, se debera completar el proceso de registro, que incluye la entrega de documentacion como identificacion oficial, RFC, constancia de situacion fiscal, comprobante de domicilio, permisos aplicables y, en su caso, poliza de seguro de responsabilidad civil. Vivelo se reserva el derecho de aprobar o rechazar cualquier solicitud sin necesidad de justificacion.</p>
        <h3 className="font-semibold mt-3 mb-1">3.3 Roles de Usuario</h3>
        <p>La Plataforma maneja tres roles: Cliente, Proveedor y Administrador. Cada rol tiene permisos especificos que determinan el acceso a funcionalidades de la Plataforma. El rol se asigna al momento del registro y solo puede ser modificado por un Administrador de Vivelo.</p>
        <h3 className="font-semibold mt-3 mb-1">3.4 Suspension y Cancelacion de Cuentas</h3>
        <p>Vivelo podra suspender o cancelar cuentas de usuario cuando se detecte informacion falsa, incumplimiento de estos Terminos, conducta inapropiada, discriminatoria o abusiva, actividad fraudulenta, calificacion promedio inferior a 3.5 estrellas durante 3 meses consecutivos (Proveedores), o cancelaciones frecuentes injustificadas (mas de 2 en un periodo de 6 meses).</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">4. Servicios Ofrecidos en la Plataforma</h2>
        <h3 className="font-semibold mb-1">4.1 Naturaleza del Servicio</h3>
        <p>Vivelo actua exclusivamente como intermediario tecnologico entre Clientes y Proveedores. Vivelo no es parte en la relacion de prestacion de servicios entre el Proveedor y el Cliente. La calidad, seguridad, legalidad y cumplimiento de los servicios contratados son responsabilidad exclusiva del Proveedor.</p>
        <h3 className="font-semibold mt-3 mb-1">4.2 Zonas de Cobertura</h3>
        <p>La Plataforma opera actualmente en las siguientes zonas: Ciudad de Mexico, Estado de Mexico, Puebla, Toluca, Morelos, Queretaro, Hidalgo, Guanajuato y Tlaxcala. Las zonas de cobertura podran ser ampliadas o modificadas por Vivelo.</p>
        <h3 className="font-semibold mt-3 mb-1">4.3 Categorias de Servicios</h3>
        <p>Los servicios disponibles se organizan por categorias dinamicas administradas por Vivelo, que incluyen alimentos y bebidas, mobiliario y equipo, fotografia y video, entretenimiento, personal de servicio, entre otras. Cada categoria puede tener subcategorias y una tasa de comision especifica.</p>
        <h3 className="font-semibold mt-3 mb-1">4.4 Disponibilidad</h3>
        <p>La disponibilidad de los Proveedores se verifica en tiempo real mediante un sistema de multiples capas que considera reservas existentes, bloques de calendario y la capacidad de servicios concurrentes configurada por cada Proveedor. La verificacion final de disponibilidad se realiza al momento de procesar el pago. La confirmacion de disponibilidad previa al pago es informativa y no garantiza la reserva.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">5. Precios, Pagos y Comisiones</h2>
        <h3 className="font-semibold mb-1">5.1 Estructura de Precios</h3>
        <p>Los precios de los servicios son establecidos por cada Proveedor y pueden estructurarse de tres formas: precio fijo por evento, precio por persona (multiplicado por el numero de invitados), o precio por hora (multiplicado por la duracion del evento). Los Extras tienen su propia estructura de precio y se suman al total del servicio.</p>
        <h3 className="font-semibold mt-3 mb-1">5.2 Moneda y Procesamiento de Pagos</h3>
        <p>Todos los precios se expresan en pesos mexicanos (MXN). Los pagos se procesan a traves de Stripe, un procesador de pagos certificado con estandar PCI-DSS. El pago integro se realiza al momento de confirmar la reserva. Vivelo actua como intermediario de pagos, reteniendo la comision correspondiente antes de liquidar al Proveedor.</p>
        <h3 className="font-semibold mt-3 mb-1">5.3 Comisiones</h3>
        <p>Vivelo retiene una comision sobre cada transaccion completada. La tasa de comision base es del 12% y puede variar por categoria de servicio. Las campanas promocionales pueden incluir reducciones temporales de comision. La comision se calcula sobre el total del servicio (base mas extras) antes de impuestos.</p>
        <h3 className="font-semibold mt-3 mb-1">5.4 Descuentos y Campanas</h3>
        <p>Vivelo podra implementar campanas promocionales con descuentos para los Clientes. Los descuentos se aplican sobre el total del servicio y pueden afectar la tasa de comision del Proveedor conforme a los terminos de cada campana. Las condiciones de la campana vigente al momento de la reserva se capturan como snapshot inmutable para garantizar la transparencia financiera.</p>
        <h3 className="font-semibold mt-3 mb-1">5.5 Facturacion</h3>
        <p>El Proveedor debera emitir el CFDI (factura) correspondiente a Vivelo por el monto neto acordado, dentro de los 3 dias habiles siguientes a la liquidacion. Vivelo emitira los comprobantes fiscales correspondientes a los Clientes conforme a la legislacion fiscal mexicana vigente.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">6. Proceso de Reserva</h2>
        <h3 className="font-semibold mb-1">6.1 Flujo de Reserva</h3>
        <p>El proceso de reserva comprende los siguientes pasos: (a) seleccion del servicio, fecha, horario, numero de invitados y extras; (b) adicion al carrito de compras; (c) verificacion de disponibilidad; (d) creacion de la orden; (e) pago a traves de Stripe con soporte para 3D Secure; (f) confirmacion automatica de la reserva una vez verificado el pago.</p>
        <h3 className="font-semibold mt-3 mb-1">6.2 Confirmacion</h3>
        <p>Una reserva se considera confirmada unicamente cuando Vivelo recibe la confirmacion de pago exitoso por parte del procesador de pagos. El estado de la reserva transitara de &quot;pendiente&quot; a &quot;confirmada&quot; de forma automatica. El Cliente recibira confirmacion de su reserva por correo electronico.</p>
        <h3 className="font-semibold mt-3 mb-1">6.3 Codigos de Verificacion</h3>
        <p>Para garantizar la correcta prestacion del servicio, Vivelo genera codigos de verificacion de 6 digitos: un codigo de inicio que el Proveedor verifica al comenzar el servicio, y un codigo de finalizacion que el Cliente verifica al concluir el servicio. Si el codigo de finalizacion no es verificado dentro de los 3 dias habiles posteriores al evento, la reserva se completara automaticamente.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">7. Politica de Cancelaciones y Reembolsos</h2>
        <h3 className="font-semibold mb-1">7.1 Cancelacion por el Cliente</h3>
        <p>El Cliente podra cancelar una reserva sujeta a la politica de cancelacion especifica del servicio contratado, vigente al momento de la reserva. El monto del reembolso se determina con base en las horas restantes antes del evento y las reglas escalonadas de la politica aplicable.</p>
        <h3 className="font-semibold mt-3 mb-1">7.2 Cancelacion por el Proveedor</h3>
        <p>El Proveedor debera evitar cancelaciones de servicios confirmados. En caso de cancelacion por parte del Proveedor, se aplicaran penalizaciones sobre el valor total de la reserva conforme a la tabla de penalizaciones vigente, que varia desde el 10% (cancelacion con mas de 15 dias de anticipacion) hasta el 100% (cancelacion con menos de 72 horas).</p>
        <h3 className="font-semibold mt-3 mb-1">7.3 Reembolsos</h3>
        <p>Los reembolsos se procesan a traves de Stripe al metodo de pago original del Cliente. El tiempo de acreditacion depende de la institucion financiera del Cliente. En caso de cancelacion con reembolso, la comision de Vivelo se recalcula sobre el monto efectivamente retenido por el Proveedor.</p>
        <h3 className="font-semibold mt-3 mb-1">7.4 No Presentacion del Cliente (No-Show)</h3>
        <p>En caso de que el Cliente no se presente al evento sin haber cancelado previamente, el Proveedor recibira el pago acordado, menos la comision de Vivelo. No se generara reembolso al Cliente.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">8. Resenas y Calificaciones</h2>
        <p>Los Clientes podran publicar resenas y calificaciones sobre los servicios contratados. Todas las resenas estan sujetas a un proceso de moderacion por parte de Vivelo. Vivelo se reserva el derecho de publicar, editar o remover resenas conforme a sus politicas de contenido.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">9. Propiedad Intelectual</h2>
        <p>La Plataforma, su diseno, codigo fuente, logotipos, marcas, nombres comerciales y todo el contenido generado por Vivelo son propiedad exclusiva de Vivelo y estan protegidos por las leyes de propiedad intelectual de Mexico y tratados internacionales aplicables.</p>
        <p className="mt-2">Las fotografias, descripciones, videos y demas contenidos que el Proveedor cargue en su perfil le pertenecen. Al publicarlos en la Plataforma, el Proveedor otorga a Vivelo una licencia no exclusiva, gratuita y vigente durante la duracion de la relacion contractual para su uso en la Plataforma y en materiales de promocion.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">10. Conductas Prohibidas</h2>
        <p className="mb-2">Queda estrictamente prohibido para todos los Usuarios:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Proporcionar informacion falsa, enganosa o incompleta en el registro o en cualquier interaccion con la Plataforma.</li>
          <li>Utilizar la Plataforma para fines ilegales, fraudulentos o contrarios a estos Terminos.</li>
          <li>Intentar acceder a areas restringidas de la Plataforma o a datos de otros usuarios sin autorizacion.</li>
          <li>Interferir con el funcionamiento tecnico de la Plataforma.</li>
          <li>Publicar contenido ofensivo, discriminatorio, difamatorio o que viole derechos de terceros.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">11. Limitacion de Responsabilidad</h2>
        <p>Vivelo actua exclusivamente como intermediario tecnologico. Vivelo no garantiza un volumen minimo de reservas o ingresos para los Proveedores. Vivelo no sera responsable por danos directos o indirectos derivados de la actuacion de los Proveedores o Clientes. La responsabilidad maxima de Vivelo ante cualquier Usuario estara limitada al monto de las comisiones efectivamente cobradas o pagos realizados en el mes en que ocurrio el evento danoso.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">12. Asistente Virtual Vivi</h2>
        <p>La Plataforma cuenta con un asistente virtual impulsado por inteligencia artificial (&quot;Vivi&quot;) que asiste a los Clientes en la busqueda y seleccion de servicios. Las recomendaciones e informacion proporcionada por Vivi son de caracter informativo y no constituyen una oferta vinculante. La contratacion efectiva del servicio se perfecciona unicamente al completar el proceso de reserva y pago.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">13. Modificaciones a los Terminos</h2>
        <p>Vivelo podra modificar los presentes Terminos en cualquier momento, notificando a los Usuarios con al menos 15 dias naturales de anticipacion a traves del correo electronico registrado o mediante aviso en la Plataforma. La continuacion en el uso de la Plataforma despues del plazo de notificacion implicara la aceptacion tacita de los cambios.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">14. Legislacion Aplicable y Jurisdiccion</h2>
        <p>Los presentes Terminos se rigen por las leyes de los Estados Unidos Mexicanos, incluyendo la Ley Federal de Proteccion al Consumidor (PROFECO) y la Ley Federal de Proteccion de Datos Personales en Posesion de los Particulares (LFPDPPP). Para cualquier controversia derivada de la interpretacion o cumplimiento de estos Terminos, las partes acuerdan someterse a la jurisdiccion de los Tribunales competentes de la Ciudad de Mexico.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">15. Contacto</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sitio web: solovivelo.com</li>
          <li>Correo electronico: admin@solovivelo.com</li>
          <li>Domicilio: Ciudad de Mexico, Mexico</li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">VIVELO TECNOLOGIA EN EXPERIENCIAS S.A.S de C.V. — Todos los derechos reservados</p>
      </section>
    </div>
  );
}

/* ─── PROVIDER TERMS ───────────────────────────────────────── */

function ProviderTerms() {
  return (
    <div className="space-y-8 text-sm leading-relaxed text-foreground">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
        <p className="font-semibold text-amber-800">IMPORTANTE</p>
        <p className="text-amber-700 mt-1">Al registrarse como Proveedor en la plataforma Vivelo y marcar la casilla de aceptacion durante el proceso de alta, usted manifiesta haber leido, comprendido y aceptado de manera expresa e incondicional los presentes Terminos y Condiciones para Proveedores, asi como los Terminos y Condiciones Generales de Uso y el Aviso de Privacidad Integral de Vivelo.</p>
      </div>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">1. Objeto</h2>
        <p>Los presentes Terminos y Condiciones para Proveedores (en adelante, los &quot;Terminos de Proveedor&quot;) establecen las reglas bajo las cuales el Proveedor publicara, ofrecera y prestara sus servicios a traves de la plataforma digital Vivelo (solovivelo.com), un marketplace en linea operado por VIVELO TECNOLOGIA EN EXPERIENCIAS S.A.S de C.V. bajo las leyes de los Estados Unidos Mexicanos.</p>
        <p className="mt-2">Los servicios que el Proveedor podra ofrecer incluyen, de forma enunciativa mas no limitativa: experiencias gastronomicas y de alimentos y bebidas (catering, food trucks, barras), servicios de produccion y logistica para eventos (mobiliario, sonido, iluminacion, carpas), entretenimiento (fotografia, video, DJ, grupos musicales, shows), personal de servicio (meseros, bartenders, valet parking, anfitrionas) y cualquier otro servicio previamente aprobado por Vivelo.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">2. Alta y Registro en la Plataforma</h2>
        <h3 className="font-semibold mb-1">2.1 Requisitos de Registro</h3>
        <p className="mb-2">Para incorporarse como Proveedor activo en Vivelo, el Proveedor debera:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Completar el formulario de registro oficial con informacion veraz y actualizada.</li>
          <li>Proporcionar la documentacion requerida en formato digital: identificacion oficial vigente del representante legal, RFC y constancia de situacion fiscal ante el SAT, comprobante de domicilio no mayor a 3 meses, permisos, licencias y autorizaciones necesarias para operar legalmente su actividad, y poliza de seguro de responsabilidad civil vigente (cuando aplique).</li>
          <li>Proporcionar datos bancarios para la recepcion de pagos: CLABE interbancaria, nombre del banco y titular de la cuenta.</li>
          <li>Aceptar expresamente los presentes Terminos de Proveedor, los Terminos y Condiciones Generales de Uso y el Aviso de Privacidad de Vivelo.</li>
        </ul>
        <h3 className="font-semibold mt-3 mb-1">2.2 Aprobacion</h3>
        <p>El registro como Proveedor esta sujeto a la aprobacion del equipo de Vivelo, quien se reserva el derecho de rechazar cualquier solicitud sin necesidad de justificacion. Vivelo podra suspender o cancelar el acceso del Proveedor si en cualquier momento detecta que la informacion proporcionada es falsa, incompleta o desactualizada.</p>
        <h3 className="font-semibold mt-3 mb-1">2.3 Verificacion Bancaria</h3>
        <p>Los datos bancarios del Proveedor pasaran por un proceso de verificacion (estados: pendiente de revision, verificado o rechazado). El Proveedor no podra recibir liquidaciones hasta que su informacion bancaria haya sido verificada por Vivelo.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">3. Modelo de Comisiones y Pagos</h2>
        <h3 className="font-semibold mb-1">3.1 Comision por Venta</h3>
        <p>El Proveedor acepta que Vivelo retendra una comision sobre cada transaccion completada a traves de la Plataforma. La comision base es del 16% sobre el precio total del servicio cobrado al cliente final (base mas extras), antes de impuestos. La tasa de comision puede variar por categoria de servicio, segun lo establezca Vivelo y lo informe al Proveedor a traves de su panel de control.</p>
        <h3 className="font-semibold mt-3 mb-1">3.2 Flujo de Pagos</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>El cliente final realiza el pago integro a Vivelo al momento de confirmar la reserva, procesado a traves de Stripe en pesos mexicanos (MXN).</li>
          <li>Vivelo retendra la comision acordada y el IVA correspondiente a dicha comision.</li>
          <li>El saldo restante sera liquidado al Proveedor posterior a la prestacion del servicio al cliente, conforme al calendario de pagos vigente.</li>
          <li>El pago al proveedor solo sera ejecutado posterior al recibimiento de la factura por parte del proveedor a Vivelo.</li>
        </ul>
        <h3 className="font-semibold mt-3 mb-1">3.3 Facturacion</h3>
        <p>El Proveedor debera emitir el CFDI (factura) correspondiente a Vivelo por el monto neto acordado, dentro de los 3 dias habiles siguientes a la liquidacion.</p>
        <h3 className="font-semibold mt-3 mb-1">3.4 Retenciones y Deducciones</h3>
        <p className="mb-2">Vivelo se reserva el derecho de deducir del pago al Proveedor los siguientes conceptos, cuando procedan:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Penalizaciones por cancelacion tardia conforme a la Clausula 5.</li>
          <li>Reembolsos otorgados a clientes por fallas imputables al Proveedor.</li>
          <li>Cargos por contracargos (chargebacks) derivados de disputas relacionadas con servicios del Proveedor.</li>
          <li>Cualquier otro adeudo notificado por escrito con al menos 5 dias de anticipacion.</li>
        </ul>
        <h3 className="font-semibold mt-3 mb-1">3.5 Campanas y Descuentos</h3>
        <p>Vivelo podra ofrecer campanas promocionales con descuentos para clientes. El Proveedor podra inscribir sus servicios a las campanas disponibles desde su panel de control. Las condiciones vigentes al momento de la reserva se capturan como snapshot inmutable.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">4. Obligaciones del Proveedor</h2>
        <h3 className="font-semibold mb-1">4.1 Estandares de Calidad y Servicio</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Prestar los servicios con la calidad, puntualidad y profesionalismo descritos en su perfil de Vivelo.</li>
          <li>Mantener actualizada su oferta de servicios, precios, extras y disponibilidad en la Plataforma en todo momento.</li>
          <li>Responder las solicitudes y mensajes de clientes en un plazo maximo de 4 horas habiles.</li>
          <li>Contar con el personal, equipo y permisos necesarios para la correcta prestacion de cada servicio contratado.</li>
          <li>Informar a Vivelo de inmediato ante cualquier situacion que pueda afectar la prestacion de un servicio ya reservado.</li>
          <li>Verificar el codigo de inicio al comenzar el servicio y facilitar la verificacion del codigo de finalizacion al concluir.</li>
        </ul>
        <h3 className="font-semibold mt-3 mb-1">4.2 Cumplimiento Legal</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Operar conforme a la legislacion mexicana vigente aplicable a su giro comercial.</li>
          <li>Mantener vigentes sus registros fiscales, permisos sanitarios, licencias de funcionamiento y seguros correspondientes.</li>
          <li>Cumplir con la Ley Federal de Proteccion al Consumidor (PROFECO) en lo que respecta a la veracidad de su oferta.</li>
          <li>Respetar la Ley Federal de Proteccion de Datos Personales en Posesion de los Particulares (LFPDPPP).</li>
          <li>Ser el unico responsable del pago de impuestos y contribuciones correspondientes a sus ingresos.</li>
        </ul>
        <h3 className="font-semibold mt-3 mb-1">4.3 Uso de la Plataforma</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>No ofrecer a los clientes de Vivelo precios o condiciones mas favorables fuera de la Plataforma para evadir el pago de comisiones.</li>
          <li>No contactar directamente a los clientes obtenidos a traves de Vivelo para redirigir futuras contrataciones fuera de la Plataforma, durante la vigencia de la relacion con Vivelo y por 12 meses posteriores a su terminacion.</li>
          <li>No publicar informacion falsa, enganosa o que induzca a error sobre sus servicios.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">5. Politica de Cancelaciones y Penalizaciones</h2>
        <h3 className="font-semibold mb-1">5.1 Cancelaciones por el Proveedor</h3>
        <p className="mb-2">El Proveedor debera evitar cancelaciones de servicios confirmados. En caso de cancelacion, se aplicaran las siguientes penalizaciones sobre el valor total de la reserva:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-border rounded-lg">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-2 border-b border-border">Tiempo antes del evento</th>
                <th className="text-left p-2 border-b border-border">Penalizacion</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="p-2 border-b border-border">Mas de 15 dias naturales</td><td className="p-2 border-b border-border">10%</td></tr>
              <tr><td className="p-2 border-b border-border">Entre 8 y 15 dias naturales</td><td className="p-2 border-b border-border">25%</td></tr>
              <tr><td className="p-2 border-b border-border">Entre 3 y 7 dias naturales</td><td className="p-2 border-b border-border">50%</td></tr>
              <tr><td className="p-2">Menos de 72 horas / el mismo dia</td><td className="p-2">100%</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2">Las cancelaciones reiteradas (mas de 2 en un periodo de 6 meses) podran ser causa de suspension o baja definitiva de la Plataforma.</p>
        <h3 className="font-semibold mt-3 mb-1">5.2 Cancelaciones por el Cliente</h3>
        <p>Las cancelaciones iniciadas por el cliente se regiran por la politica de cancelacion especifica del servicio, vigente al momento de la reserva. Las condiciones de la politica de cancelacion al momento de la reserva se capturan como snapshot inmutable.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">6. Gestion de Disponibilidad</h2>
        <p className="mb-2">El Proveedor es responsable de mantener actualizada su disponibilidad en la Plataforma. El sistema de disponibilidad opera de la siguiente manera:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Cada servicio puede configurar tiempos de preparacion (buffer antes) y limpieza (buffer despues) en minutos.</li>
          <li>El Proveedor puede configurar buffers globales que aplican a todos sus servicios.</li>
          <li>El Proveedor puede establecer cuantos servicios puede atender simultaneamente (servicios concurrentes, por defecto 1).</li>
          <li>El Proveedor puede bloquear manualmente fechas y horarios en su calendario.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">7. Propiedad de Datos, Resenas y Contenidos</h2>
        <h3 className="font-semibold mb-1">7.1 Datos de Clientes</h3>
        <p>Todos los datos personales de los clientes finales generados a traves de Vivelo son propiedad exclusiva de Vivelo. El Proveedor tendra acceso unicamente a los datos estrictamente necesarios para prestar el servicio contratado y debera tratarlos con la confidencialidad exigida por la LFPDPPP.</p>
        <h3 className="font-semibold mt-3 mb-1">7.2 Resenas y Calificaciones</h3>
        <p>Las resenas, calificaciones y comentarios de los clientes son propiedad de Vivelo. El Proveedor no podra exigir la eliminacion de resenas negativas veridicas.</p>
        <h3 className="font-semibold mt-3 mb-1">7.3 Contenido del Perfil</h3>
        <p>Las fotografias, descripciones, videos y demas contenidos que el Proveedor cargue en su perfil le pertenecen. Al publicarlos, otorga a Vivelo una licencia no exclusiva, gratuita y vigente durante la duracion de la relacion para su uso en la Plataforma y en materiales de promocion.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">8. Responsabilidades y Limitaciones</h2>
        <h3 className="font-semibold mb-1">8.1 Responsabilidad del Proveedor</h3>
        <p className="mb-2">El Proveedor sera el unico responsable de:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>La calidad, seguridad y legalidad de los servicios que presta.</li>
          <li>Los danos fisicos, materiales o morales causados a clientes o terceros durante la prestacion de sus servicios.</li>
          <li>El cumplimiento de normas sanitarias, de seguridad e higiene en su operacion.</li>
          <li>El pago de impuestos y contribuciones correspondientes a sus ingresos.</li>
        </ul>
        <h3 className="font-semibold mt-3 mb-1">8.2 Limitacion de Responsabilidad de Vivelo</h3>
        <p>Vivelo actua exclusivamente como intermediario tecnologico. La responsabilidad maxima de Vivelo ante el Proveedor estara limitada al monto de las comisiones efectivamente cobradas en el mes en que ocurrio el evento danoso.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">9. Conductas Prohibidas y Causas de Baja</h2>
        <p className="mb-2">Vivelo se reserva el derecho de suspender o dar de baja definitiva al Proveedor en los siguientes supuestos:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Proporcionar informacion falsa en el registro o en cualquier momento posterior.</li>
          <li>Incumplimiento reiterado de los estandares de calidad o de las politicas de la Plataforma.</li>
          <li>Cancelaciones frecuentes injustificadas (mas de 2 en un periodo de 6 meses).</li>
          <li>Conducta inapropiada, discriminatoria, abusiva o amenazante.</li>
          <li>Ofrecer sobornos, incentivos o acuerdos informales a clientes para evadir el uso de la Plataforma.</li>
          <li>Violacion de la confidencialidad de datos de clientes.</li>
          <li>Comision de actos ilicitos o presuncion de fraude.</li>
          <li>Recibir una calificacion promedio inferior a 3.5 estrellas durante 3 meses consecutivos, sin mejora demostrable.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">10. Vigencia y Terminacion</h2>
        <p>La relacion entre el Proveedor y Vivelo tendra vigencia indefinida a partir de la aceptacion de los presentes Terminos, y podra ser terminada por cualquiera de las partes en cualquier momento.</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>El Proveedor podra dar de baja su cuenta mediante notificacion escrita a Vivelo con 15 dias naturales de anticipacion.</li>
          <li>Vivelo podra terminar la relacion conforme a las causas establecidas en la Clausula 9 o sin causa justificada, con 15 dias naturales de anticipacion.</li>
          <li>La obligacion de no contactar directamente a los clientes obtenidos a traves de Vivelo subsistira por 12 meses posteriores a la terminacion.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">11. Confidencialidad</h2>
        <p>El Proveedor se obliga a guardar estricta confidencialidad sobre la informacion a la que tenga acceso en virtud de su relacion con Vivelo. Esta obligacion subsistira por 2 anos posteriores a la terminacion de la relacion.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">12. Modificaciones</h2>
        <p>Vivelo podra modificar los presentes Terminos de Proveedor, incluyendo tarifas de comision y politicas operativas, mediante notificacion al Proveedor con al menos 15 dias naturales de anticipacion. La continuacion en el uso de la Plataforma despues del plazo de notificacion implica la aceptacion tacita de los cambios.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">13. Legislacion Aplicable y Jurisdiccion</h2>
        <p>Los presentes Terminos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia, las partes acuerdan someterse a la jurisdiccion de los Tribunales competentes de la Ciudad de Mexico, renunciando expresamente a cualquier otro fuero que pudiera corresponderles.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">14. Aceptacion Digital</h2>
        <p>Al marcar la casilla &quot;Acepto los Terminos y Condiciones para Proveedores&quot; durante el proceso de registro en la Plataforma, el Proveedor manifiesta haber leido, comprendido y aceptado la totalidad de los presentes Terminos de forma libre y voluntaria, conforme a lo dispuesto en los articulos 89 a 94 del Codigo de Comercio de Mexico y la normatividad aplicable en materia de comercio electronico.</p>
        <p className="mt-2">Vivelo registrara la fecha, hora e identificador de la aceptacion como evidencia legal del consentimiento otorgado.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-deep-purple mb-3">15. Contacto</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sitio web: solovivelo.com</li>
          <li>Correo electronico: admin@solovivelo.com</li>
          <li>Domicilio: Ciudad de Mexico, Mexico</li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">VIVELO TECNOLOGIA EN EXPERIENCIAS S.A.S de C.V. — Todos los derechos reservados</p>
      </section>
    </div>
  );
}
