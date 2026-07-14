import {
  Building2,
  Contact,
  FileText,
  Home,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';

import pathsConfig from '~/config/paths.config';

const iconClasses = 'w-4';

const routes = [
  {
    label: 'common:routes.application',
    children: [
      {
        label: 'common:routes.home',
        path: pathsConfig.app.home,
        Icon: <Home className={iconClasses} />,
        end: true,
      },
      {
        label: 'Arrendadores',
        path: pathsConfig.app.arrendadores,
        Icon: <Users className={iconClasses} />,
      },
      {
        label: 'Propiedades',
        path: pathsConfig.app.propiedades,
        Icon: <Building2 className={iconClasses} />,
      },
      {
        label: 'Inquilinos',
        path: pathsConfig.app.inquilinos,
        Icon: <Contact className={iconClasses} />,
      },
      {
        label: 'Contratos',
        path: pathsConfig.app.contratos,
        Icon: <FileText className={iconClasses} />,
      },
      {
        label: 'Incidencias',
        path: pathsConfig.app.incidencias,
        Icon: <Wrench className={iconClasses} />,
      },
    ],
  },
  {
    label: 'common:routes.settings',
    children: [
      {
        label: 'common:routes.profile',
        path: pathsConfig.app.profileSettings,
        Icon: <User className={iconClasses} />,
      },
    ],
  },
] satisfies z.infer<typeof NavigationConfigSchema>['routes'];

export const navigationConfig = NavigationConfigSchema.parse({
  routes,
  style: process.env.NEXT_PUBLIC_NAVIGATION_STYLE,
  sidebarCollapsed: process.env.NEXT_PUBLIC_HOME_SIDEBAR_COLLAPSED,
});
