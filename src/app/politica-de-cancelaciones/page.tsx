import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politica de Cancelaciones y Reembolsos — Vivelo',
  description:
    'Conoce las politicas de cancelacion y reembolso de Vivelo. Politicas Flexible, Moderada y Estricta para servicios de eventos en Mexico.',
  alternates: {
    canonical: 'https://solovivelo.com/politica-de-cancelaciones',
  },
};

export default function PoliticaDeCancelacionesPage() {
  return (
    <div className="min-h-screen bg-off-white">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-deep-purple mb-2">
            Politica de Cancelaciones y Reembolsos
          </h1>
          <p className="text-muted-foreground">
            Version 1.0 | Mexico, marzo 2025
          </p>
          <p className="text-sm text-muted-foreground">
            Ultima actualizacion: 5 de marzo de 2025
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              1. Introduccion
            </h2>
            <p>
              La presente Politica de Cancelaciones y Reembolsos (en adelante, la &quot;Politica&quot;) establece las reglas aplicables cuando un Cliente o un Proveedor cancela un servicio reservado a traves de la plataforma Vivelo (solovivelo.com). Esta Politica forma parte integral de los Terminos y Condiciones Generales de Uso y de los Terminos y Condiciones para Proveedores.
            </p>
            <p className="mt-2">
              Vivelo busca proteger tanto al Cliente que contrata un servicio como al Proveedor que reserva tiempo y recursos para prestarlo. Las reglas aqui descritas buscan un equilibrio justo entre ambas partes.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              2. Conceptos Clave
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Politica de cancelacion del servicio:</strong> Cada servicio publicado en Vivelo tiene asignada una politica de cancelacion (Flexible, Moderada o Estricta) que determina las condiciones de reembolso para el Cliente. El Proveedor selecciona la politica al publicar su servicio.</li>
              <li><strong>Snapshot (captura inmutable):</strong> Al momento de confirmar una reserva, las condiciones de la politica de cancelacion vigente se capturan y almacenan de forma inmutable. Si el Proveedor cambia la politica despues, la reserva existente conserva las condiciones originales.</li>
              <li><strong>Horas antes del evento:</strong> El calculo de reembolso se basa en las horas que faltan entre el momento de la cancelacion y la fecha/hora de inicio del evento. Mas horas de anticipacion = mayor reembolso.</li>
              <li><strong>Reserva pendiente:</strong> Una reserva cuyo pago aun no ha sido confirmado. Se puede cancelar sin costo ni penalizacion.</li>
              <li><strong>Reserva confirmada:</strong> Una reserva cuyo pago fue procesado exitosamente. A partir de este momento aplican las reglas de reembolso.</li>
            </ul>
          </section>

          {/* Section A header */}
          <div className="bg-deep-purple/10 rounded-lg px-4 py-3">
            <h2 className="text-lg font-bold text-deep-purple">Seccion A — Cancelaciones por el Cliente</h2>
          </div>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              3. Cancelacion de Reservas Pendientes
            </h2>
            <p>
              Si la reserva aun se encuentra en estado &quot;pendiente&quot; (el pago no ha sido confirmado), el Cliente puede cancelar libremente sin ninguna penalizacion ni cargo. No aplica ninguna politica de reembolso porque no se ha realizado cobro alguno.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              4. Cancelacion de Reservas Confirmadas
            </h2>
            <p>Una vez que el pago ha sido procesado y la reserva esta confirmada, el reembolso dependera de la politica de cancelacion asignada al servicio. Existen tres politicas:</p>

            {/* 4.1 Flexible */}
            <h3 className="font-semibold mt-6 mb-2">4.1 Politica Flexible</h3>
            <p className="italic text-muted-foreground mb-3">&quot;Politica flexible con reembolso completo hasta 48 horas antes del evento.&quot;</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-deep-purple/10">
                    <th className="text-left p-2 font-semibold text-deep-purple">Momento de la cancelacion</th>
                    <th className="text-left p-2 font-semibold text-deep-purple">Reembolso</th>
                    <th className="text-left p-2 font-semibold text-deep-purple">Cargo al Cliente</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2">Mas de 48 horas antes del evento</td><td className="p-2 font-medium text-green-700">100%</td><td className="p-2">$0</td></tr>
                  <tr><td className="p-2">Menos de 48 horas antes del evento</td><td className="p-2 font-medium text-yellow-700">50%</td><td className="p-2">50% del total</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-muted-foreground">
              Ejemplo: Un servicio de $10,000 MXN con politica Flexible. Si el Cliente cancela 72 horas antes, recibe $10,000 de reembolso. Si cancela 24 horas antes, recibe $5,000.
            </p>

            {/* 4.2 Moderada */}
            <h3 className="font-semibold mt-6 mb-2">4.2 Politica Moderada</h3>
            <p className="italic text-muted-foreground mb-3">&quot;Politica moderada con reembolso parcial segun el tiempo de anticipacion.&quot;</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-deep-purple/10">
                    <th className="text-left p-2 font-semibold text-deep-purple">Momento de la cancelacion</th>
                    <th className="text-left p-2 font-semibold text-deep-purple">Reembolso</th>
                    <th className="text-left p-2 font-semibold text-deep-purple">Cargo al Cliente</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2">Mas de 7 dias antes del evento</td><td className="p-2 font-medium text-green-700">100%</td><td className="p-2">$0</td></tr>
                  <tr className="border-b"><td className="p-2">Entre 48 horas y 7 dias antes</td><td className="p-2 font-medium text-yellow-700">50%</td><td className="p-2">50% del total</td></tr>
                  <tr><td className="p-2">Menos de 48 horas antes del evento</td><td className="p-2 font-medium text-red-700">0%</td><td className="p-2">100% del total</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-muted-foreground">
              Ejemplo: Un servicio de $10,000 MXN con politica Moderada. Si el Cliente cancela 10 dias antes, recibe $10,000. Si cancela 3 dias antes, recibe $5,000. Si cancela el dia anterior, no recibe reembolso.
            </p>

            {/* 4.3 Estricta */}
            <h3 className="font-semibold mt-6 mb-2">4.3 Politica Estricta</h3>
            <p className="italic text-muted-foreground mb-3">&quot;Politica estricta con ventanas de reembolso limitadas.&quot;</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-deep-purple/10">
                    <th className="text-left p-2 font-semibold text-deep-purple">Momento de la cancelacion</th>
                    <th className="text-left p-2 font-semibold text-deep-purple">Reembolso</th>
                    <th className="text-left p-2 font-semibold text-deep-purple">Cargo al Cliente</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2">Mas de 15 dias antes del evento</td><td className="p-2 font-medium text-green-700">100%</td><td className="p-2">$0</td></tr>
                  <tr className="border-b"><td className="p-2">Entre 7 y 15 dias antes del evento</td><td className="p-2 font-medium text-yellow-700">25%</td><td className="p-2">75% del total</td></tr>
                  <tr><td className="p-2">Menos de 7 dias antes del evento</td><td className="p-2 font-medium text-red-700">0%</td><td className="p-2">100% del total</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-muted-foreground">
              Ejemplo: Un servicio de $10,000 MXN con politica Estricta. Si el Cliente cancela 20 dias antes, recibe $10,000. Si cancela 10 dias antes, recibe $2,500. Si cancela 5 dias antes, no recibe reembolso.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              5. Como Identificar la Politica de un Servicio
            </h2>
            <p>
              Antes de reservar, el Cliente puede consultar la politica de cancelacion aplicable en la pagina de detalle de cada servicio. La politica se muestra con su nombre (Flexible, Moderada o Estricta) y el desglose completo de las franjas de reembolso.
            </p>
            <p className="mt-2">
              Al momento de completar la reserva, las condiciones exactas de la politica se capturan como snapshot inmutable. Esto significa que si el Proveedor cambia la politica despues de la reserva, las condiciones originales siguen protegiendo al Cliente.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              6. Proceso de Reembolso al Cliente
            </h2>

            <h3 className="font-semibold mt-4 mb-2">6.1 Como se calcula</h3>
            <p>
              Al solicitar la cancelacion, el sistema calcula automaticamente las horas restantes hasta el evento y aplica la regla correspondiente de la politica. Antes de confirmar la cancelacion, el Cliente vera una vista previa con el porcentaje y monto exacto del reembolso.
            </p>

            <h3 className="font-semibold mt-4 mb-2">6.2 Como se procesa</h3>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>El reembolso se procesa automaticamente a traves de Stripe al metodo de pago original del Cliente.</li>
              <li>El tiempo de acreditacion depende de la institucion financiera del Cliente (generalmente entre 5 y 10 dias habiles).</li>
              <li>El Cliente recibira una notificacion por correo electronico con los detalles del reembolso.</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2">6.3 Efecto en la comision de Vivelo</h3>
            <p>
              Cuando se otorga un reembolso, la comision de Vivelo se recalcula proporcionalmente sobre el monto efectivamente retenido por el Proveedor. Vivelo no cobra comision sobre montos reembolsados.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              7. No Presentacion del Cliente (No-Show)
            </h2>
            <p>
              Si el Cliente no se presenta al evento sin haber cancelado previamente, no se generara reembolso alguno. El Proveedor recibira el pago completo del servicio, menos la comision de Vivelo.
            </p>
          </section>

          {/* Section B header */}
          <div className="bg-deep-purple/10 rounded-lg px-4 py-3">
            <h2 className="text-lg font-bold text-deep-purple">Seccion B — Cancelaciones por el Proveedor</h2>
          </div>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              8. Principio General
            </h2>
            <p>
              Los Proveedores deben evitar cancelar servicios confirmados. Una cancelacion por parte del Proveedor afecta la experiencia del Cliente, quien ya ha planificado su evento en funcion de la reserva. Por esta razon, las penalizaciones para el Proveedor son significativas y proporcionales al tiempo de anticipacion.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              9. Tabla de Penalizaciones al Proveedor
            </h2>
            <p className="mb-3">Cuando el Proveedor cancela un servicio ya confirmado, se aplican las siguientes penalizaciones sobre el valor total de la reserva:</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-deep-purple/10">
                    <th className="text-left p-2 font-semibold text-deep-purple">Anticipacion</th>
                    <th className="text-left p-2 font-semibold text-deep-purple">Penalizacion al Proveedor</th>
                    <th className="text-left p-2 font-semibold text-deep-purple">Reembolso al Cliente</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2">Mas de 15 dias naturales</td><td className="p-2">10% del valor de la reserva</td><td className="p-2 font-medium text-green-700">100%</td></tr>
                  <tr className="border-b"><td className="p-2">Entre 8 y 15 dias naturales</td><td className="p-2">25% del valor de la reserva</td><td className="p-2 font-medium text-green-700">100%</td></tr>
                  <tr className="border-b"><td className="p-2">Entre 3 y 7 dias naturales</td><td className="p-2">50% del valor de la reserva</td><td className="p-2 font-medium text-green-700">100%</td></tr>
                  <tr><td className="p-2">Menos de 72 horas / mismo dia</td><td className="p-2 font-medium text-red-700">100% del valor de la reserva</td><td className="p-2 font-medium text-green-700">100%</td></tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="font-semibold text-yellow-800">IMPORTANTE:</p>
              <p className="text-yellow-800">Cuando el Proveedor cancela, el Cliente SIEMPRE recibe un reembolso del 100%, independientemente de la politica de cancelacion del servicio. La penalizacion al Proveedor es un cargo adicional que absorbe el Proveedor.</p>
            </div>
            <p className="mt-2 text-muted-foreground">
              Ejemplo: Un servicio de $10,000 MXN. El Proveedor cancela 5 dias antes del evento. El Cliente recibe $10,000 de reembolso. El Proveedor absorbe una penalizacion de $5,000 (50%), que se descuenta de sus proximas liquidaciones.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              10. Cancelaciones Reiteradas del Proveedor
            </h2>
            <p>Las cancelaciones frecuentes e injustificadas por parte del Proveedor afectan la confiabilidad de la Plataforma. Por ello:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Primera y segunda cancelacion en 6 meses:</strong> Se aplica la penalizacion de la tabla anterior. Se emite una advertencia formal.</li>
              <li><strong>Tercera cancelacion en 6 meses:</strong> Vivelo podra suspender temporalmente al Proveedor de la Plataforma.</li>
              <li><strong>Cancelaciones adicionales o patron reiterado:</strong> Vivelo podra dar de baja definitiva al Proveedor sin responsabilidad alguna.</li>
            </ul>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              11. Fallas en la Prestacion del Servicio
            </h2>
            <p>Si el Proveedor no se presenta al evento, entrega un servicio deficiente o incumple con lo ofertado en su perfil, Vivelo podra, a su discrecion:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Emitir un reembolso total o parcial al Cliente.</li>
              <li>Descontar el monto reembolsado del siguiente pago al Proveedor.</li>
              <li>Aplicar penalizaciones conforme a la tabla de la Clausula 9.</li>
              <li>Suspender temporal o definitivamente al Proveedor de la Plataforma.</li>
            </ul>
            <p className="mt-2">
              El Cliente puede reportar fallas contactando directamente a Vivelo. Vivelo evaluara cada caso y determinara la accion apropiada.
            </p>
          </section>

          {/* Section C header */}
          <div className="bg-deep-purple/10 rounded-lg px-4 py-3">
            <h2 className="text-lg font-bold text-deep-purple">Seccion C — Reglas Generales y Protecciones</h2>
          </div>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              12. Quien Puede Cancelar una Reserva
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-deep-purple/10">
                    <th className="text-left p-2 font-semibold text-deep-purple">Quien cancela</th>
                    <th className="text-left p-2 font-semibold text-deep-purple">Condiciones</th>
                    <th className="text-left p-2 font-semibold text-deep-purple">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2 font-medium">Cliente</td><td className="p-2">Puede cancelar reservas pendientes o confirmadas en cualquier momento</td><td className="p-2">Reembolso segun la politica del servicio</td></tr>
                  <tr className="border-b"><td className="p-2 font-medium">Proveedor</td><td className="p-2">Puede cancelar reservas pendientes o confirmadas, sujeto a penalizacion</td><td className="p-2">100% reembolso al Cliente + penalizacion al Proveedor</td></tr>
                  <tr><td className="p-2 font-medium">Administrador</td><td className="p-2">Puede cancelar cualquier reserva por razones operativas o de seguridad</td><td className="p-2">Determinado caso por caso por Vivelo</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              13. Reservas que No se Pueden Cancelar
            </h2>
            <p>No es posible cancelar una reserva que ya se encuentra en alguno de los siguientes estados:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Completada:</strong> El servicio ya fue prestado y verificado. Si el Cliente tiene quejas sobre la calidad, debera contactar a Vivelo para una evaluacion.</li>
              <li><strong>Cancelada:</strong> La reserva ya fue cancelada previamente. No se puede cancelar dos veces.</li>
              <li><strong>Rechazada:</strong> La reserva fue rechazada por el Proveedor antes de ser confirmada.</li>
            </ul>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              14. Protecciones para Ambas Partes
            </h2>

            <h3 className="font-semibold mt-4 mb-2">14.1 Protecciones para el Cliente</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Snapshot inmutable:</strong> Las condiciones de cancelacion que aplican son las vigentes al momento de la reserva, no las actuales. Si el Proveedor cambia su politica despues, la reserva del Cliente no se ve afectada.</li>
              <li><strong>Vista previa de reembolso:</strong> Antes de confirmar la cancelacion, el sistema muestra el monto exacto del reembolso para que el Cliente tome una decision informada.</li>
              <li><strong>Reembolso automatico:</strong> El reembolso se procesa automaticamente a traves de Stripe al metodo de pago original. No requiere gestion manual.</li>
              <li><strong>Proteccion ante cancelacion del Proveedor:</strong> Si el Proveedor cancela, el Cliente siempre recibe el 100% de reembolso, sin importar la anticipacion.</li>
              <li><strong>Proteccion ante fallas del servicio:</strong> Si el Proveedor no cumple con lo ofertado, Vivelo puede otorgar reembolso total o parcial.</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2">14.2 Protecciones para el Proveedor</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Politica configurable:</strong> El Proveedor elige la politica de cancelacion que mejor se adapta a su negocio (Flexible, Moderada o Estricta).</li>
              <li><strong>Proteccion por no-show:</strong> Si el Cliente no se presenta, el Proveedor recibe el pago completo.</li>
              <li><strong>Comision proporcional:</strong> En caso de reembolso, la comision de Vivelo se recalcula sobre el monto efectivamente retenido. Vivelo no cobra comision sobre lo reembolsado.</li>
              <li><strong>Politica por defecto:</strong> El Proveedor puede configurar una politica por defecto que se aplique automaticamente a todos sus servicios nuevos.</li>
            </ul>
          </section>

          {/* 15 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              15. Resumen Comparativo de Politicas
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-deep-purple/10">
                    <th className="text-left p-2 font-semibold text-deep-purple"></th>
                    <th className="text-left p-2 font-semibold text-deep-purple">Flexible</th>
                    <th className="text-left p-2 font-semibold text-deep-purple">Moderada</th>
                    <th className="text-left p-2 font-semibold text-deep-purple">Estricta</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2 font-medium">Reembolso 100%</td>
                    <td className="p-2">48+ horas antes</td>
                    <td className="p-2">7+ dias antes</td>
                    <td className="p-2">15+ dias antes</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 font-medium">Reembolso parcial</td>
                    <td className="p-2">50% (0-48 hrs)</td>
                    <td className="p-2">50% (48 hrs - 7 dias)</td>
                    <td className="p-2">25% (7-15 dias)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Sin reembolso</td>
                    <td className="p-2">No aplica</td>
                    <td className="p-2">Menos de 48 hrs</td>
                    <td className="p-2">Menos de 7 dias</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 16 */}
          <section>
            <h2 className="text-xl font-bold text-deep-purple mb-3">
              16. Disputas y Contacto
            </h2>
            <p>
              Si el Cliente o el Proveedor no estan de acuerdo con la aplicacion de esta Politica en un caso concreto, podran contactar a Vivelo para solicitar una revision. Vivelo evaluara cada caso de forma individual, considerando las circunstancias especificas y la evidencia disponible.
            </p>
            <p className="mt-2">Para disputas o aclaraciones:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Correo electronico:</strong> contacto@solovivelo.com</li>
              <li><strong>Sitio web:</strong> solovivelo.com</li>
            </ul>
            <p className="mt-2">
              Las resoluciones de Vivelo en materia de disputas de cancelacion seran definitivas, sin perjuicio de los derechos que asistan a las partes conforme a la legislacion mexicana aplicable, incluyendo los mecanismos de la Procuraduria Federal del Consumidor (PROFECO).
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
