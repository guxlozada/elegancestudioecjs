import { getShop } from "../dom/manager_user.js"

export const SHOPS = {
  mmp: {
    code: "MMP",
    name: "Mall del Pacífico",
    city: "Manta",
    freeSixthCutBase: 10,
    iva: true
  },
  qpa: {
    code: "QPA",
    name: "Ponceano",
    city: "Quito",
    freeSixthCutBase: 8,
    iva: false
  },
  qgr: {
    code: "QGR",
    name: "Granados",
    city: "Quito",
    freeSixthCutBase: 10,
    iva: false
  }
}

export const collections = {
  catalogOperators: "adm-operators",
  get catalogBankAccounts() {
    return this.groupPrefix() + "adm-bank-accounts"
  },
  get catalogProducts() {
    return this.groupPrefix() + "inv-products"
  },
  get catalogProductsCategory() {
    return this.groupPrefix() + "inv-products-category"
  },
  catalogProviders: "inv-providers",
  get catalogServices() {
    return this.groupPrefix() + "inv-services"
  },
  get catalogServicesCategory() {
    return this.groupPrefix() + "inv-services-category"
  },
  get bankingTransactions() {
    return this.groupPrefix() + "prod-banking-transaction"
  },
  get bankReconciliation() {
    return this.groupPrefix() + "prod-bank-reconciliation"
  },
  customers: "prodseller-clients",
  qualityAssurance: "statistics-qa-poll",
  get dailyClosing() {
    return this.groupPrefix() + "prod-daily-closing"
  },
  get expenses() {
    return this.groupPrefix() + "prod-cash-outflows"
  },
  get sales() {
    return this.groupPrefix() + "prod-sales"
  },
  get salesDetails() {
    return this.groupPrefix() + "prod-sales-details"
  },
  tmpRaffle: "tmp-raffle",
  deletedBankTx: "removed-from-banking-transaction",
  deletedExpense: "removed-from-cash-outflows",
  deletedSales: "removed-from-sales",
  deletedSalesDetails: "removed-from-sales-details",
  groupPrefix() {
    const shop = getShop()
    return shop.code === SHOPS.mmp.code ? "" : shop.code + "-"
  }
}