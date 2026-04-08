import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Programas para Proveedores | Vivelo',
  description: 'Términos y condiciones de los programas Early Adopter y de Referidos para proveedores de Vivelo.',
};

export default function TerminosProgramasProveedoresPage() {
  return (
    <div className="min-h-screen bg-[#fcf7f4]">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="https://solovivelo.com" className="flex items-center">
            <Image
              src="/logo-vivelo.png"
              alt="Vivelo"
              width={120}
              height={40}
              className="h-8 w-auto"
            />
          </Link>
          <Link
            href="https://solovivelo.com/register?role=provider"
            className="bg-[#ecbe38] hover:bg-[#d4a82e] text-[#43276c] font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            Registrarme
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-[#43276c] mb-2">
          Términos y condiciones
        </h1>
        <p className="text-lg text-[#43276c]/70 mb-8">Programas para proveedores</p>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-10 shadow-sm space-y-8 text-sm text-gray-700 leading-relaxed">
          <p>
            <strong>Vivelo Tecnología en Experiencias S.A.S. de C.V.</strong> (&ldquo;Vivelo&rdquo;) establece los siguientes
            términos y condiciones que rigen los beneficios otorgados a los proveedores registrados en la plataforma
            Vivelo (&ldquo;Proveedor&rdquo;). Al completar el registro, el Proveedor declara haber leído, entendido y
            aceptado la totalidad de estos términos.
          </p>

          {/* 1. Programa Early Adopter */}
          <section>
            <h2 className="text-xl font-bold text-[#43276c] mb-4">1. Programa Early Adopter</h2>
            <div className="space-y-3">
              <p>
                <strong>1.1</strong> Se considera Early Adopter todo Proveedor que complete su registro en la plataforma
                antes de la fecha oficial de lanzamiento de Vivelo.
              </p>
              <p>
                <strong>1.2</strong> La fecha oficial de lanzamiento se determinará cuando la plataforma alcance 100
                proveedores activos. Vivelo notificará esta fecha con al menos 5 días naturales de anticipación.
              </p>
              <p>
                <strong>1.3</strong> Durante los 3 meses calendario a partir del lanzamiento oficial, los Early Adopters
                pagarán el 25% de la comisión estándar correspondiente a su categoría por cada venta completada en la
                plataforma.
              </p>
              <p>
                <strong>1.4</strong> Al término de los 3 meses, la comisión aplicable será la comisión estándar vigente
                según la categoría del Proveedor.
              </p>
              <p>
                <strong>1.5</strong> El beneficio aplica de forma simultánea para todos los Early Adopters, con
                independencia de su fecha individual de registro.
              </p>
              <p>
                <strong>1.6</strong> Los servicios publicados pueden ser contratados por usuarios finales desde la fecha
                de alta del Proveedor. El periodo Early Adopter no limita ni condiciona la operación de la plataforma.
              </p>
              <p>
                <strong>1.7</strong> Vivelo se reserva el derecho de modificar, extender o concluir el programa con
                previo aviso de al menos 15 días naturales.
              </p>
            </div>
          </section>

          {/* 2. Programa de Referidos */}
          <section>
            <h2 className="text-xl font-bold text-[#43276c] mb-4">2. Programa de Referidos</h2>
            <div className="space-y-3">
              <p>
                <strong>2.1</strong> Todo Proveedor registrado puede participar desde el primer día de su alta en la
                plataforma.
              </p>
              <p>
                <strong>2.2</strong> Cada Proveedor cuenta con un código de referido único e intransferible, disponible
                en su perfil dentro de la plataforma.
              </p>
              <p>
                <strong>2.3</strong> El beneficio por referido se activa cuando el proveedor referido: (a) se registra
                utilizando el código del Proveedor, y (b) completa su primera venta en la plataforma.
              </p>
              <p>
                <strong>2.4</strong> Los beneficios se otorgan por niveles según el número de referidos activos
                acumulados, de la siguiente manera:
              </p>
              <div className="ml-4 space-y-2">
                <p>
                  <strong>Nivel 1</strong> (1 a 3 referidos): 3 ventas con el 50% de descuento sobre la comisión
                  estándar de su categoría.
                </p>
                <p>
                  <strong>Nivel 2</strong> (a partir del 4º referido): 3 ventas adicionales con el 75% de descuento
                  sobre la comisión estándar de su categoría.
                </p>
                <p>
                  <strong>Nivel 3</strong> (por cada múltiplo de 8 referidos acumulados): 3 ventas con el 75% de
                  descuento sobre la comisión estándar de su categoría, más 3 meses de posicionamiento prioritario
                  dentro de la plataforma.
                </p>
              </div>
              <p>
                <strong>2.5</strong> No existe límite en el número de referidos que un Proveedor puede acumular.
              </p>
              <p>
                <strong>2.6</strong> Si el Proveedor se encuentra dentro de su periodo Early Adopter al momento de
                activarse un beneficio por referido, dicho beneficio se acumulará y comenzará a aplicarse al concluir el
                periodo Early Adopter.
              </p>
              <p>
                <strong>2.7</strong> Los beneficios acumulados se aplican en orden cronológico de generación.
              </p>
              <p>
                <strong>2.8</strong> Vivelo se reserva el derecho de modificar o concluir el programa con previo aviso
                de al menos 15 días naturales. Los beneficios ya generados antes de dicha notificación serán respetados
                en su totalidad.
              </p>
            </div>
          </section>

          {/* 3. Disposiciones generales */}
          <section>
            <h2 className="text-xl font-bold text-[#43276c] mb-4">3. Disposiciones generales</h2>
            <div className="space-y-3">
              <p>
                <strong>3.1</strong> Vivelo se reserva el derecho de suspender los beneficios de cualquier Proveedor en
                caso de detectarse uso fraudulento de los programas.
              </p>
              <p>
                <strong>3.2</strong> La comisión se calcula sobre el monto total de cada transacción completada y pagada
                a través de la plataforma.
              </p>
              <p>
                <strong>3.3</strong> Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para
                cualquier controversia, las partes se someten a la jurisdicción de los tribunales competentes de la
                Ciudad de México.
              </p>
            </div>
          </section>

          <p className="text-xs text-gray-500 pt-4 border-t border-gray-100">
            Vivelo Tecnología en Experiencias S.A.S. de C.V. — Versión abril 2026
          </p>
        </div>
      </main>
    </div>
  );
}
