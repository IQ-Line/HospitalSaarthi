import type { ModuleManifest } from '../types';



export const billingAndFinanceModuleManifest: ModuleManifest = {

  slug: 'billing-and-finance',

  name: 'Billing & Finance',

  icon: 'receipt',

  routePrefix: '/billing-and-finance',

  sortOrder: 35,

  requiredModulesAny: ['billing-and-finance'],

  navigation: [

    {

      id: 'billing-invoice',

      label: 'Invoice',

      icon: 'file-text',

      route: '/billing-and-finance/invoice',

      catalogModuleSlug: 'invoice',

    },

    {

      id: 'billing-account',

      label: 'Billing account',

      icon: 'wallet',

      route: '/billing-and-finance/billing-account',

      catalogModuleSlug: 'billing-account',

    },

    {

      id: 'billing-tariff-master',

      label: 'Tariff master',

      icon: 'receipt',

      route: '/billing-and-finance/tariff-master',

      catalogModuleSlug: 'tariff-master',

    },

  ],

};

