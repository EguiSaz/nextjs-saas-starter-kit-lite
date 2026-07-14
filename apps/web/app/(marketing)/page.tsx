import Image from 'next/image';
import Link from 'next/link';

import { ArrowRightIcon, LayoutDashboard } from 'lucide-react';

import {
  CtaButton,
  FeatureCard,
  FeatureGrid,
  FeatureShowcase,
  FeatureShowcaseIconContainer,
  Hero,
  Pill,
} from '@kit/ui/marketing';
import { Trans } from '@kit/ui/trans';

import { withI18n } from '~/lib/i18n/with-i18n';

function Home() {
  return (
    <div className={'mt-4 flex flex-col space-y-24 py-14'}>
      <div className={'container mx-auto'}>
        <Hero
          pill={
            <Pill label={'Nuevo'}>
              <span>Administración de propiedades en renta, para México</span>
            </Pill>
          }
          title={
            <>
              <span>Administra tus rentas</span>
              <span>sin hojas de cálculo</span>
            </>
          }
          subtitle={
            <span>
              GestorPro reúne arrendadores, inquilinos, contratos, pagos y
              comisiones en un solo lugar. Lleva el control de tus propiedades
              con claridad y sin esfuerzo.
            </span>
          }
          cta={<MainCallToActionButton />}
          image={
            <Image
              priority
              className={
                'dark:border-primary/10 rounded-2xl border border-gray-200'
              }
              width={3558}
              height={2222}
              src={`/images/dashboard.webp`}
              alt={`App Image`}
            />
          }
        />
      </div>

      <div className={'container mx-auto'}>
        <div
          className={'flex flex-col space-y-16 xl:space-y-32 2xl:space-y-36'}
        >
          <FeatureShowcase
            heading={
              <>
                <b className="font-semibold dark:text-white">
                  Todo tu negocio de rentas en un lugar
                </b>
                .{' '}
                <span className="text-muted-foreground font-normal">
                  Desde el contrato hasta el cobro, GestorPro te da el control
                  completo de tus propiedades.
                </span>
              </>
            }
            icon={
              <FeatureShowcaseIconContainer>
                <LayoutDashboard className="h-5" />
                <span>Solución integral</span>
              </FeatureShowcaseIconContainer>
            }
          >
            <FeatureGrid>
              <FeatureCard
                className={'relative col-span-2 overflow-hidden'}
                label={'Arrendadores y comisiones'}
                description={`Administra dueños propios y de terceros, cada uno con su porcentaje de comisión.`}
              />

              <FeatureCard
                className={
                  'relative col-span-2 w-full overflow-hidden lg:col-span-1'
                }
                label={'Contratos'}
                description={`Crea contratos, controla que solo haya uno activo por propiedad y cierra con manejo del depósito.`}
              />

              <FeatureCard
                className={'relative col-span-2 overflow-hidden lg:col-span-1'}
                label={'Pagos y saldo'}
                description={`Registra pagos, cargos y mora; el saldo de cada contrato se recalcula solo.`}
              />

              <FeatureCard
                className={'relative col-span-2 overflow-hidden'}
                label={'Multi-organización'}
                description={`Cada organización con sus datos aislados y roles de equipo.`}
              />
            </FeatureGrid>
          </FeatureShowcase>
        </div>
      </div>
    </div>
  );
}

export default withI18n(Home);

function MainCallToActionButton() {
  return (
    <div className={'flex space-x-4'}>
      <CtaButton>
        <Link href={'/auth/sign-up'}>
          <span className={'flex items-center space-x-0.5'}>
            <span>
              <Trans i18nKey={'common:getStarted'} />
            </span>

            <ArrowRightIcon
              className={
                'animate-in fade-in slide-in-from-left-8 h-4' +
                ' zoom-in fill-mode-both delay-1000 duration-1000'
              }
            />
          </span>
        </Link>
      </CtaButton>

      <CtaButton variant={'link'}>
        <Link href={'/contact'}>
          <Trans i18nKey={'common:contactUs'} />
        </Link>
      </CtaButton>
    </div>
  );
}
