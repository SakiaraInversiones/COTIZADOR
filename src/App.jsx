import React, { useMemo, useState } from 'react'

const sakiaraLogo = '/sakiara-logo.jpg'
const contactEmail = 'rafael.vasquez844@gmail.com'
const whatsappNumber = '56975807224'
const formEndpoint = `https://formsubmit.co/${contactEmail}`
const PANEL_POWER_KW = 0.585
const REFERENCE_TARIFF_CLP_PER_KWH = 278

const sanitizeIntegerInput = (value) => value.replace(/[^\d]/g, '')

const formatCLP = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)

const formatNumber = (value, digits = 0) =>
  new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0)

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const zoneProduction = {
  norte: 140,
  centro: 125,
  sur: 112,
}

const profileMap = {
  outside: {
    label: 'Peak AM y PM',
    morning: 15,
    day: 20,
    night: 65,
    description:
      'Hogar con consumo más marcado temprano en la mañana y desde la tarde hacia la noche.',
  },
  mixed: {
    label: 'Mixto',
    morning: 20,
    day: 35,
    night: 45,
    description:
      'Consumo repartido durante el día, con un comportamiento más equilibrado entre mañana, tarde y noche.',
  },
  home: {
    label: 'Peak sostenido',
    morning: 20,
    day: 50,
    night: 30,
    description:
      'Hogar con uso más constante durante el día, ideal cuando hay mayor presencia o actividad diurna.',
  },
}

const installationInputModeOptions = {
  bill: {
    label: 'Cotiza con tu boleta',
    helper: 'Ingresas solo el valor mensual y estimamos el consumo con una tarifa referencial.',
  },
  consumption: {
    label: 'Cotiza con tu consumo',
    helper: 'Ingresas solo los kWh mensuales y estimamos una boleta referencial para proyectar la inversión.',
  },
  combined: {
    label: 'Opción combinada',
    helper: 'Usar ambos datos entrega una lectura más precisa del proyecto.',
  },
}


const VEHICLE_EFFICIENCY_KM_PER_L = 8
const REFERENCE_FUEL_PRICE_CLP_PER_L = 1300
const VEHICLE_WEAR_CLP_PER_KM = 120
const BASE_TRAVEL_FEE = 10000
const TRAVEL_BLOCK_KM = 50
const TRAVEL_BLOCK_FEE = 20000

const maintenanceMetropolitanaCommunes = {
  alhue: { label: 'Alhué', roundTripKm: 250, tolls: 12000 },
  buin: { label: 'Buin', roundTripKm: 118, tolls: 3000 },
  caleraDeTango: { label: 'Calera de Tango', roundTripKm: 92, tolls: 0 },
  cerrillos: { label: 'Cerrillos', roundTripKm: 62, tolls: 0 },
  cerroNavia: { label: 'Cerro Navia', roundTripKm: 50, tolls: 0 },
  colina: { label: 'Colina', roundTripKm: 0, tolls: 0 },
  conchali: { label: 'Conchalí', roundTripKm: 44, tolls: 0 },
  curacavi: { label: 'Curacaví', roundTripKm: 132, tolls: 9000 },
  elBosque: { label: 'El Bosque', roundTripKm: 72, tolls: 0 },
  elMonte: { label: 'El Monte', roundTripKm: 118, tolls: 4000 },
  estacionCentral: { label: 'Estación Central', roundTripKm: 58, tolls: 0 },
  huechuraba: { label: 'Huechuraba', roundTripKm: 36, tolls: 0 },
  independencia: { label: 'Independencia', roundTripKm: 46, tolls: 0 },
  islaDeMaipo: { label: 'Isla de Maipo', roundTripKm: 122, tolls: 5000 },
  laCisterna: { label: 'La Cisterna', roundTripKm: 70, tolls: 0 },
  laFlorida: { label: 'La Florida', roundTripKm: 74, tolls: 0 },
  laGranja: { label: 'La Granja', roundTripKm: 76, tolls: 0 },
  laPintana: { label: 'La Pintana', roundTripKm: 86, tolls: 0 },
  laReina: { label: 'La Reina', roundTripKm: 72, tolls: 0 },
  lampa: { label: 'Lampa', roundTripKm: 28, tolls: 0 },
  lasCondes: { label: 'Las Condes', roundTripKm: 72, tolls: 0 },
  loBarnechea: { label: 'Lo Barnechea', roundTripKm: 84, tolls: 0 },
  loEspejo: { label: 'Lo Espejo', roundTripKm: 72, tolls: 0 },
  loPrado: { label: 'Lo Prado', roundTripKm: 54, tolls: 0 },
  macul: { label: 'Macul', roundTripKm: 70, tolls: 0 },
  maipu: { label: 'Maipú', roundTripKm: 78, tolls: 0 },
  mariaPinto: { label: 'María Pinto', roundTripKm: 150, tolls: 6000 },
  melipilla: { label: 'Melipilla', roundTripKm: 154, tolls: 7000 },
  nunoa: { label: 'Ñuñoa', roundTripKm: 66, tolls: 0 },
  padreHurtado: { label: 'Padre Hurtado', roundTripKm: 92, tolls: 4000 },
  paine: { label: 'Paine', roundTripKm: 150, tolls: 5000 },
  pedroAguirreCerda: { label: 'Pedro Aguirre Cerda', roundTripKm: 64, tolls: 0 },
  penaflor: { label: 'Peñaflor', roundTripKm: 98, tolls: 4000 },
  penalolen: { label: 'Peñalolén', roundTripKm: 76, tolls: 0 },
  pirque: { label: 'Pirque', roundTripKm: 106, tolls: 0 },
  providencia: { label: 'Providencia', roundTripKm: 60, tolls: 0 },
  pudahuel: { label: 'Pudahuel', roundTripKm: 58, tolls: 0 },
  puenteAlto: { label: 'Puente Alto', roundTripKm: 90, tolls: 0 },
  quilicura: { label: 'Quilicura', roundTripKm: 26, tolls: 0 },
  quintaNormal: { label: 'Quinta Normal', roundTripKm: 52, tolls: 0 },
  recoleta: { label: 'Recoleta', roundTripKm: 48, tolls: 0 },
  renca: { label: 'Renca', roundTripKm: 42, tolls: 0 },
  sanBernardo: { label: 'San Bernardo', roundTripKm: 88, tolls: 0 },
  sanJoaquin: { label: 'San Joaquín', roundTripKm: 70, tolls: 0 },
  sanJoseDeMaipo: { label: 'San José de Maipo', roundTripKm: 156, tolls: 0 },
  sanMiguel: { label: 'San Miguel', roundTripKm: 66, tolls: 0 },
  sanPedro: { label: 'San Pedro', roundTripKm: 216, tolls: 9000 },
  sanRamon: { label: 'San Ramón', roundTripKm: 78, tolls: 0 },
  santiago: { label: 'Santiago', roundTripKm: 54, tolls: 0 },
  talagante: { label: 'Talagante', roundTripKm: 108, tolls: 4000 },
  tiltil: { label: 'Tiltil', roundTripKm: 76, tolls: 0 },
  vitacura: { label: 'Vitacura', roundTripKm: 64, tolls: 0 },
}

const maintenanceRegionData = {
  aricaParinacota: {
    label: 'Arica y Parinacota',
    communes: {
      arica: { label: 'Arica', roundTripKm: 4120, tolls: 65000 },
      putre: { label: 'Putre', roundTripKm: 4300, tolls: 65000 },
    },
  },
  tarapaca: {
    label: 'Tarapacá',
    communes: {
      iquique: { label: 'Iquique', roundTripKm: 3600, tolls: 56000 },
      altoHospicio: { label: 'Alto Hospicio', roundTripKm: 3600, tolls: 56000 },
    },
  },
  antofagasta: {
    label: 'Antofagasta',
    communes: {
      antofagasta: { label: 'Antofagasta', roundTripKm: 2740, tolls: 46000 },
      calama: { label: 'Calama', roundTripKm: 3000, tolls: 49000 },
    },
  },
  atacama: {
    label: 'Atacama',
    communes: {
      copiapo: { label: 'Copiapó', roundTripKm: 1660, tolls: 30000 },
      vallenar: { label: 'Vallenar', roundTripKm: 1320, tolls: 26000 },
    },
  },
  coquimbo: {
    label: 'Coquimbo',
    communes: {
      laSerena: { label: 'La Serena', roundTripKm: 940, tolls: 18000 },
      coquimbo: { label: 'Coquimbo', roundTripKm: 950, tolls: 18000 },
      ovalle: { label: 'Ovalle', roundTripKm: 780, tolls: 16000 },
    },
  },
  valparaiso: {
    label: 'Valparaíso',
    communes: {
      valparaiso: { label: 'Valparaíso', roundTripKm: 300, tolls: 12000 },
      vinaDelMar: { label: 'Viña del Mar', roundTripKm: 310, tolls: 12000 },
      quilpue: { label: 'Quilpué', roundTripKm: 290, tolls: 10000 },
      concon: { label: 'Concón', roundTripKm: 320, tolls: 12000 },
      losAndes: { label: 'Los Andes', roundTripKm: 220, tolls: 9000 },
      sanFelipe: { label: 'San Felipe', roundTripKm: 200, tolls: 9000 },
    },
  },
  metropolitana: {
    label: 'Región Metropolitana',
    communes: maintenanceMetropolitanaCommunes,
  },
  ohiggins: {
    label: "O'Higgins",
    communes: {
      rancagua: { label: 'Rancagua', roundTripKm: 170, tolls: 6000 },
      machali: { label: 'Machalí', roundTripKm: 180, tolls: 6000 },
      sanFernando: { label: 'San Fernando', roundTripKm: 280, tolls: 9000 },
      pichilemu: { label: 'Pichilemu', roundTripKm: 430, tolls: 13000 },
    },
  },
  maule: {
    label: 'Maule',
    communes: {
      talca: { label: 'Talca', roundTripKm: 510, tolls: 14000 },
      curico: { label: 'Curicó', roundTripKm: 380, tolls: 11000 },
      linares: { label: 'Linares', roundTripKm: 620, tolls: 16000 },
    },
  },
  nuble: {
    label: 'Ñuble',
    communes: {
      chillan: { label: 'Chillán', roundTripKm: 800, tolls: 19000 },
      sanCarlos: { label: 'San Carlos', roundTripKm: 740, tolls: 18000 },
    },
  },
  biobio: {
    label: 'Biobío',
    communes: {
      concepcion: { label: 'Concepción', roundTripKm: 1040, tolls: 24000 },
      talcahuano: { label: 'Talcahuano', roundTripKm: 1060, tolls: 24000 },
      losAngeles: { label: 'Los Ángeles', roundTripKm: 900, tolls: 21000 },
    },
  },
  araucania: {
    label: 'La Araucanía',
    communes: {
      temuco: { label: 'Temuco', roundTripKm: 1380, tolls: 30000 },
      villarrica: { label: 'Villarrica', roundTripKm: 1520, tolls: 32000 },
    },
  },
  losRios: {
    label: 'Los Ríos',
    communes: {
      valdivia: { label: 'Valdivia', roundTripKm: 1680, tolls: 35000 },
      laUnion: { label: 'La Unión', roundTripKm: 1750, tolls: 36000 },
    },
  },
  losLagos: {
    label: 'Los Lagos',
    communes: {
      puertoMontt: { label: 'Puerto Montt', roundTripKm: 2090, tolls: 40000 },
      osorno: { label: 'Osorno', roundTripKm: 1820, tolls: 38000 },
      castro: { label: 'Castro', roundTripKm: 2390, tolls: 45000 },
    },
  },
  aysen: {
    label: 'Aysén',
    communes: {
      coyhaique: { label: 'Coyhaique', roundTripKm: 3380, tolls: 20000 },
      puertoAysen: { label: 'Puerto Aysén', roundTripKm: 3460, tolls: 20000 },
    },
  },
  magallanes: {
    label: 'Magallanes',
    communes: {
      puntaArenas: { label: 'Punta Arenas', roundTripKm: 5660, tolls: 10000 },
      puertoNatales: { label: 'Puerto Natales', roundTripKm: 5400, tolls: 10000 },
    },
  },
}

const maintenanceRegionOptions = Object.entries(maintenanceRegionData).map(([value, config]) => ({
  value,
  label: config.label,
}))

function OfferCard({ title, subtitle, badge, price, savings, compensation, payback, variant }) {
  return (
    <div className={`offer-card ${variant}`}>
      <div className="offer-head">
        <div>
          <h3 className="offer-title">{title}</h3>
          <p className="offer-sub">{subtitle}</p>
        </div>
        <div className="offer-badge">{badge}</div>
      </div>

      <div className="price-box">
        <div className="price-label">Valor total IVA incluido</div>
        <div className="price-value">{price}</div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="stat-label">Ahorro</div>
          <div className="stat-value">{savings}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Compensación de la cuenta</div>
          <div className="stat-value">{compensation}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Retorno</div>
          <div className="stat-value">{payback}</div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub }) {
  return (
    <div className="summary-card">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
      <div className="summary-sub">{sub}</div>
    </div>
  )
}

export default function SakiaraLandingPage() {
  const [activeView, setActiveView] = useState('home')

  const [installationInputMode, setInstallationInputMode] = useState('combined')
  const [monthlyBillInput, setMonthlyBillInput] = useState('250000')
  const [billConsumptionInput, setBillConsumptionInput] = useState('900')
  const [zone, setZone] = useState('centro')
  const [profile, setProfile] = useState('outside')

  const [maintenanceSystemSizeInput, setMaintenanceSystemSizeInput] = useState('8')
  const [maintenanceMonthlySavingsInput, setMaintenanceMonthlySavingsInput] = useState('120000')
  const [maintenanceRegion, setMaintenanceRegion] = useState('metropolitana')
  const [maintenanceCommune, setMaintenanceCommune] = useState('colina')
  const [maintenanceVisitsPerYear, setMaintenanceVisitsPerYear] = useState(1)

  const [logoHidden, setLogoHidden] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const selectedProfile = profileMap[profile]
  const selectedMaintenanceRegion = maintenanceRegionData[maintenanceRegion] || maintenanceRegionData.metropolitana
  const maintenanceCommuneOptions = useMemo(
    () =>
      Object.entries(selectedMaintenanceRegion.communes)
        .map(([value, config]) => ({ value, label: config.label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es')),
    [selectedMaintenanceRegion]
  )
  const fallbackMaintenanceCommuneKey = maintenanceCommuneOptions[0]?.value || 'colina'
  const selectedMaintenanceCommune =
    selectedMaintenanceRegion.communes[maintenanceCommune] ||
    selectedMaintenanceRegion.communes[fallbackMaintenanceCommuneKey]

  const maintenanceSystemSize = Number(maintenanceSystemSizeInput || 0)
  const maintenanceMonthlySavings = Number(maintenanceMonthlySavingsInput || 0)

  const installationMetrics = useMemo(() => {
    const vatMultiplier = 1.19
    const fixedCertSec = 500000
    const fixedLogistics = 500000
    const moduleSellPerPanel = 88456.44
    const structurePerPanel = 4514.43
    const ccPerPanel = 22089.34
    const laborPerPanel = 56023.57

    const huaweiBatteryPackGross = 4000000
    const solisBatteryPackGross = 2000000

    const huaweiTiers = [
      { maxPanels: 6, inverter: 460000, ac: 255000, ccBoard: 0 },
      { maxPanels: 10, inverter: 620000, ac: 315000, ccBoard: 0 },
      { maxPanels: 14, inverter: 780000, ac: 388000, ccBoard: 0 },
      { maxPanels: 20, inverter: 980000, ac: 492104.58, ccBoard: 113352.94 },
      { maxPanels: 24, inverter: 1080000, ac: 548000, ccBoard: 113352.94 },
      { maxPanels: 30, inverter: 1220000, ac: 618000, ccBoard: 154000 },
    ]

    const solisTiers = [
      { maxPanels: 6, inverter: 760000, ac: 255000, ccBoard: 0 },
      { maxPanels: 10, inverter: 980000, ac: 315000, ccBoard: 0 },
      { maxPanels: 14, inverter: 1210000, ac: 388000, ccBoard: 0 },
      { maxPanels: 20, inverter: 1500000, ac: 492104.58, ccBoard: 113352.94 },
      { maxPanels: 24, inverter: 1620000, ac: 548000, ccBoard: 113352.94 },
      { maxPanels: 30, inverter: 1780000, ac: 618000, ccBoard: 154000 },
    ]

    const getTier = (tiers, panels) =>
      tiers.find((tier) => panels <= tier.maxPanels) || tiers[tiers.length - 1]

    const enteredMonthlyBill = Number(monthlyBillInput || 0)
    const enteredMonthlyConsumptionKWh = Number(billConsumptionInput || 0)
    const hasBill = enteredMonthlyBill > 0
    const hasConsumption = enteredMonthlyConsumptionKWh > 0

    let normalizedMonthlyBill = enteredMonthlyBill
    let monthlyConsumptionKWh = enteredMonthlyConsumptionKWh
    let derivedTariff = REFERENCE_TARIFF_CLP_PER_KWH
    let modeSummaryLabel = installationInputModeOptions[installationInputMode].label
    let modeSummaryHint = installationInputModeOptions[installationInputMode].helper

    if (installationInputMode === 'bill') {
      normalizedMonthlyBill = hasBill ? enteredMonthlyBill : 250000
      monthlyConsumptionKWh = Math.max(normalizedMonthlyBill / REFERENCE_TARIFF_CLP_PER_KWH, 1)
      derivedTariff = REFERENCE_TARIFF_CLP_PER_KWH
      if (!hasBill) {
        modeSummaryHint = 'Ingresa el valor de tu boleta y estimaremos el consumo con una tarifa referencial.'
      }
    } else if (installationInputMode === 'consumption') {
      monthlyConsumptionKWh = hasConsumption ? enteredMonthlyConsumptionKWh : 900
      normalizedMonthlyBill = monthlyConsumptionKWh * REFERENCE_TARIFF_CLP_PER_KWH
      derivedTariff = REFERENCE_TARIFF_CLP_PER_KWH
      if (!hasConsumption) {
        modeSummaryHint = 'Ingresa tu consumo mensual y estimaremos una boleta referencial para proyectar la inversión.'
      }
    } else if (hasBill && hasConsumption) {
      normalizedMonthlyBill = enteredMonthlyBill
      monthlyConsumptionKWh = enteredMonthlyConsumptionKWh
      derivedTariff = normalizedMonthlyBill / Math.max(monthlyConsumptionKWh, 1)
    } else if (hasBill) {
      normalizedMonthlyBill = enteredMonthlyBill
      monthlyConsumptionKWh = Math.max(normalizedMonthlyBill / REFERENCE_TARIFF_CLP_PER_KWH, 1)
      derivedTariff = REFERENCE_TARIFF_CLP_PER_KWH
      modeSummaryHint = 'Se completó el cálculo con una tarifa referencial, porque solo se ingresó la boleta.'
    } else if (hasConsumption) {
      monthlyConsumptionKWh = enteredMonthlyConsumptionKWh
      normalizedMonthlyBill = monthlyConsumptionKWh * REFERENCE_TARIFF_CLP_PER_KWH
      derivedTariff = REFERENCE_TARIFF_CLP_PER_KWH
      modeSummaryHint = 'Se completó el cálculo con una tarifa referencial, porque solo se ingresó el consumo.'
    } else {
      normalizedMonthlyBill = 250000
      monthlyConsumptionKWh = 900
      derivedTariff = normalizedMonthlyBill / monthlyConsumptionKWh
      modeSummaryHint = 'Puedes cotizar con tu boleta, con tu consumo o con ambos datos.'
    }

    const exportRate = derivedTariff * 0.55
    const productionFactor = zoneProduction[zone]

    const dayEquivalentUse =
      selectedProfile.day +
      selectedProfile.morning * 0.35 +
      selectedProfile.night * 0.08

    const recommendedCoverage = clamp(0.76 + dayEquivalentUse * 0.0022, 0.78, 0.96)

    const systemSizeKwp = clamp(
      (monthlyConsumptionKWh / Math.max(productionFactor, 1)) * recommendedCoverage,
      2.2,
      18
    )

    const estimatedPanels = Math.max(4, Math.round(systemSizeKwp / PANEL_POWER_KW))
    const huaweiTier = getTier(huaweiTiers, estimatedPanels)
    const solisTier = getTier(solisTiers, estimatedPanels)

    const selfConsumptionNoBatteryRate = clamp(0.48 + dayEquivalentUse * 0.0068, 0.58, 0.84)
    const selfConsumptionWithBatteryRate = clamp(selfConsumptionNoBatteryRate + 0.18, 0.72, 0.97)

    const monthlyGenerationKWh = systemSizeKwp * productionFactor

    const selfConsumedNoBattery = Math.min(
      monthlyGenerationKWh * selfConsumptionNoBatteryRate,
      monthlyConsumptionKWh
    )
    const exportedNoBattery = Math.max(monthlyGenerationKWh - selfConsumedNoBattery, 0)
    const selfConsumptionValueNoBattery = selfConsumedNoBattery * derivedTariff
    const injectionCreditNoBattery = exportedNoBattery * exportRate
    const monthlySavingsNoBattery = selfConsumptionValueNoBattery + injectionCreditNoBattery
    const annualSavingsNoBattery = monthlySavingsNoBattery * 12

    const selfConsumedWithBattery = Math.min(
      monthlyGenerationKWh * selfConsumptionWithBatteryRate,
      monthlyConsumptionKWh
    )
    const exportedWithBattery = Math.max(monthlyGenerationKWh - selfConsumedWithBattery, 0)
    const selfConsumptionValueWithBattery = selfConsumedWithBattery * derivedTariff
    const injectionCreditWithBattery = exportedWithBattery * exportRate
    const monthlySavingsWithBattery = selfConsumptionValueWithBattery + injectionCreditWithBattery
    const annualSavingsWithBattery = monthlySavingsWithBattery * 12

    const commonBaseNet =
      estimatedPanels * moduleSellPerPanel +
      estimatedPanels * structurePerPanel +
      estimatedPanels * ccPerPanel +
      estimatedPanels * laborPerPanel +
      fixedCertSec +
      fixedLogistics

    const projectCostHuaweiNoBatteryGross =
      (commonBaseNet + huaweiTier.inverter + huaweiTier.ac + huaweiTier.ccBoard) * vatMultiplier
    const projectCostSolisNoBatteryGross =
      (commonBaseNet + solisTier.inverter + solisTier.ac + solisTier.ccBoard) * vatMultiplier

    const projectCostHuaweiWithBatteryGross =
      projectCostHuaweiNoBatteryGross + huaweiBatteryPackGross
    const projectCostSolisWithBatteryGross =
      projectCostSolisNoBatteryGross + solisBatteryPackGross

    const compensationNoBattery = clamp(
      (monthlySavingsNoBattery / Math.max(normalizedMonthlyBill, 1)) * 100,
      0,
      100
    )
    const compensationWithBattery = clamp(
      (monthlySavingsWithBattery / Math.max(normalizedMonthlyBill, 1)) * 100,
      0,
      100
    )

    return {
      monthlyBill: normalizedMonthlyBill,
      monthlyConsumptionKWh,
      derivedTariff,
      modeSummaryLabel,
      modeSummaryHint,
      estimatedPanels,
      estimatedSystemSizeKwp: estimatedPanels * PANEL_POWER_KW,
      monthlySavingsNoBattery,
      monthlySavingsWithBattery,
      annualSavingsNoBattery,
      annualSavingsWithBattery,
      projectCostHuaweiNoBattery: projectCostHuaweiNoBatteryGross,
      projectCostHuaweiWithBattery: projectCostHuaweiWithBatteryGross,
      projectCostSolisNoBattery: projectCostSolisNoBatteryGross,
      projectCostSolisWithBattery: projectCostSolisWithBatteryGross,
      compensationNoBattery,
      compensationWithBattery,
      paybackHuaweiNoBattery:
        projectCostHuaweiNoBatteryGross / Math.max(annualSavingsNoBattery, 1),
      paybackHuaweiWithBattery:
        projectCostHuaweiWithBatteryGross / Math.max(annualSavingsWithBattery, 1),
      paybackSolisNoBattery:
        projectCostSolisNoBatteryGross / Math.max(annualSavingsNoBattery, 1),
      paybackSolisWithBattery:
        projectCostSolisWithBatteryGross / Math.max(annualSavingsWithBattery, 1),
    }
  }, [installationInputMode, monthlyBillInput, billConsumptionInput, zone, selectedProfile])

  const maintenanceMetrics = useMemo(() => {
    const annualSavings = Math.max(maintenanceMonthlySavings, 0) * 12
    const safeBudget = annualSavings * 0.2
    const protectedValueObjective = annualSavings * 0.3

    const baseVisitCost =
      maintenanceSystemSize <= 8
        ? 150000
        : 150000 + Math.max(0, maintenanceSystemSize - 8) * 18000

    const roundTripKm = selectedMaintenanceCommune.roundTripKm
    const variableMobilityCostPerKm =
      REFERENCE_FUEL_PRICE_CLP_PER_L / VEHICLE_EFFICIENCY_KM_PER_L + VEHICLE_WEAR_CLP_PER_KM
    const internalTravelEstimate =
      roundTripKm * variableMobilityCostPerKm + selectedMaintenanceCommune.tolls

    const travelBlocks = Math.floor(Math.max(roundTripKm, 0) / TRAVEL_BLOCK_KM)
    const commercialTravelFee = BASE_TRAVEL_FEE + travelBlocks * TRAVEL_BLOCK_FEE
    const logisticsPerVisit = Math.max(internalTravelEstimate, commercialTravelFee)

    const visitCost = baseVisitCost + logisticsPerVisit
    const annualPlanCost = visitCost * Math.max(maintenanceVisitsPerYear, 1)
    const minimumMonthlySavingsForRule = annualPlanCost / 12 / 0.2
    const annualCoverageRatio = annualSavings / Math.max(annualPlanCost, 1)
    const safeMargin = safeBudget - annualPlanCost
    const protectedMargin = protectedValueObjective - annualPlanCost

    let status = 'Recomendable'
    if (annualPlanCost > safeBudget && annualPlanCost <= protectedValueObjective) {
      status = 'Requiere revisión'
    }
    if (annualPlanCost > protectedValueObjective) {
      status = 'Evaluación personalizada'
    }

    return {
      annualSavings,
      safeBudget,
      protectedValueObjective,
      baseVisitCost,
      roundTripKm,
      tollsPerVisit: selectedMaintenanceCommune.tolls,
      internalTravelEstimate,
      travelBlocks,
      commercialTravelFee,
      logisticsPerVisit,
      visitCost,
      annualPlanCost,
      minimumMonthlySavingsForRule,
      annualCoverageRatio,
      safeMargin,
      protectedMargin,
      status,
    }
  }, [
    maintenanceMonthlySavings,
    maintenanceSystemSize,
    maintenanceVisitsPerYear,
    selectedMaintenanceCommune,
  ])

  const goToView = (view) => {
    setActiveView(view)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getInstallationSummaryItems = () => [
    { label: 'Servicio', value: 'Cotización de instalación fotovoltaica' },
    { label: 'Modalidad', value: installationMetrics.modeSummaryLabel },
    { label: 'Monto boleta', value: formatCLP(installationMetrics.monthlyBill) },
    {
      label: 'Consumo mensual',
      value: `${formatNumber(installationMetrics.monthlyConsumptionKWh)} kWh/mes`,
    },
    { label: 'Zona', value: zone },
    { label: 'Perfil', value: selectedProfile.label },
    {
      label: 'Proyecto sugerido',
      value: `${formatNumber(installationMetrics.estimatedPanels)} paneles Trina Solar 585 W`,
    },
    { label: 'Huawei sin batería', value: formatCLP(installationMetrics.projectCostHuaweiNoBattery) },
    { label: 'Solis sin batería', value: formatCLP(installationMetrics.projectCostSolisNoBattery) },
    {
      label: 'Huawei con batería LUNA',
      value: formatCLP(installationMetrics.projectCostHuaweiWithBattery),
    },
    { label: 'Solis con batería', value: formatCLP(installationMetrics.projectCostSolisWithBattery) },
  ]

  const getMaintenanceSummaryItems = () => [
    { label: 'Servicio', value: 'Cotización de mantenimiento fotovoltaico' },
    { label: 'Potencia del sistema', value: `${formatNumber(maintenanceSystemSize, 1)} kW` },
    { label: 'Ahorro mensual actual', value: formatCLP(maintenanceMonthlySavings) },
    { label: 'Región', value: selectedMaintenanceRegion.label },
    { label: 'Comuna', value: selectedMaintenanceCommune.label },
    { label: 'Visitas por año', value: formatNumber(maintenanceVisitsPerYear) },
    { label: 'Valor por visita', value: formatCLP(maintenanceMetrics.visitCost) },
    { label: 'Costo anual del plan', value: formatCLP(maintenanceMetrics.annualPlanCost) },
    {
      label: 'Presupuesto recomendado de mantención',
      value: formatCLP(maintenanceMetrics.safeBudget),
    },
    { label: 'Resultado', value: maintenanceMetrics.status },
  ]

  const buildInstallationSummaryText = () =>
    getInstallationSummaryItems()
      .map((item) => `${item.label}: ${item.value}`)
      .join('\n')

  const buildMaintenanceSummaryText = () =>
    getMaintenanceSummaryItems()
      .map((item) => `${item.label}: ${item.value}`)
      .join('\n')

  const getSummaryItems = () =>
    activeView === 'mantenimiento' ? getMaintenanceSummaryItems() : getInstallationSummaryItems()

  const buildSummaryText = () =>
    getSummaryItems()
      .map((item) => `${item.label}: ${item.value}`)
      .join('\n')

  const handleWhatsApp = () => {
    const intro =
      activeView === 'mantenimiento'
        ? 'Hola, quiero una evaluación personalizada para mantenimiento fotovoltaico.'
        : 'Hola, quiero una evaluación personalizada para un proyecto solar.'

    const text = encodeURIComponent(
      `${intro}\n\n${buildSummaryText()}\n\nNombre: ${name || '-'}\nTeléfono: ${phone || '-'}\nCorreo: ${email || '-'}\n\nMensaje: ${message || '-'}`
    )
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank')
  }

  const renderHomeView = () => (
    <>
      <section className="section-card">
        <div className="hero-copy">
          <h1 className="title">Energía solar para instalar, optimizar y mantener.</h1>
          <p className="text">
            En Sakiara desarrollamos soluciones fotovoltaicas con foco en inversión, ahorro y continuidad operativa. Elige si deseas cotizar una instalación nueva o evaluar el mantenimiento de un sistema existente, con una experiencia clara y profesional desde el primer paso.
          </p>
        </div>

        <div className="service-grid" style={{ marginTop: 30 }}>
          <div className="service-card">
            <div>
              <div className="offer-badge">Instalación</div>
              <h2 className="service-title">Cotizador de instalación fotovoltaica</h2>
              <p className="service-text">
                Estima una propuesta referencial para tu hogar en base a boleta, consumo o una combinación de ambos datos. Compara alternativas y conoce una inversión clara, ordenada y pensada para generar valor en el tiempo.
              </p>
            </div>
            <div className="service-points">
              <div>Propuesta referencial según tu consumo</div>
              <div>Estimación de ahorro y compensación</div>
              <div>Valores IVA incluido</div>
            </div>
            <button className="btn-primary" type="button" onClick={() => goToView('instalacion')}>
              Cotizar instalación
            </button>
          </div>

          <div className="service-card highlighted">
            <div>
              <div className="offer-badge">Mantenimiento</div>
              <h2 className="service-title">Plan de mantenimiento fotovoltaico</h2>
              <p className="service-text">
                Evalúa un servicio de mantenimiento pensado para proteger el rendimiento, la seguridad y la continuidad operativa de tu sistema. Calculamos una propuesta referencial según ubicación y tamaño de la instalación.
              </p>
            </div>
            <div className="service-points">
              <div>Limpieza técnica de módulos</div>
              <div>Revisión general del sistema</div>
              <div>Verificaciones eléctricas y de seguridad</div>
            </div>
            <button className="btn-primary" type="button" onClick={() => goToView('mantenimiento')}>
              Evaluar mantenimiento
            </button>
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="mini-grid">
          <div className="mini-card">
            <p className="mini-title">Claro</p>
            <div className="mini-text">
              Una experiencia simple para comparar alternativas y avanzar con mayor claridad.
            </div>
          </div>
          <div className="mini-card">
            <p className="mini-title">Comercial</p>
            <div className="mini-text">
              La información se presenta con foco en decisión, claridad y confianza.
            </div>
          </div>
          <div className="mini-card">
            <p className="mini-title">Técnico</p>
            <div className="mini-text">
              El servicio comunica respaldo técnico sin sobrecargar con complejidad innecesaria.
            </div>
          </div>
        </div>
      </section>
    </>
  )

  const renderInstallationView = () => (
    <>
      <section className="section-card">
        <div className="hero-copy">
          <div className="back-row">
            <button className="btn-secondary" type="button" onClick={() => goToView('home')}>
              ← Volver al inicio
            </button>
          </div>
          <h1 className="title">Energía solar residencial diseñada para generar valor.</h1>
          <p className="text">
            Desarrollamos propuestas solares residenciales con foco en inversión, ahorro y escalabilidad. Puedes cotizar con el valor de tu boleta, con tu consumo mensual o usar ambos datos para obtener una lectura más precisa del proyecto.
          </p>
          <div className="cta-row">
            <a className="action-link primary" href="#contacto">Solicitar propuesta</a>
            <a className="action-link secondary" href="#propuesta">Ver alternativas</a>
            <button className="action-link secondary" type="button" onClick={() => {
              setMaintenanceMonthlySavingsInput(String(Math.round(installationMetrics.monthlySavingsNoBattery)))
              setMaintenanceSystemSizeInput(String(Number(installationMetrics.estimatedSystemSizeKwp.toFixed(1)) || installationMetrics.estimatedSystemSizeKwp))
              goToView('mantenimiento')
            }}>
              Evaluar este ahorro en mantenimiento
            </button>
          </div>
        </div>

        <div className="mini-grid">
          <div className="mini-card">
            <p className="mini-title">Inversión</p>
            <div className="mini-text">
              Valor total IVA incluido presentado de forma clara, profesional y orientada a una buena decisión.
            </div>
          </div>
          <div className="mini-card">
            <p className="mini-title">Ahorro</p>
            <div className="mini-text">
              Proyección mensual basada en la información disponible de tu boleta o consumo.
            </div>
          </div>
          <div className="mini-card">
            <p className="mini-title">Escalable</p>
            <div className="mini-text">
              Desde una solución base on-grid hasta una alternativa con batería para mayor autonomía.
            </div>
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-head">
          <p className="eyebrow">Calculadora comercial</p>
          <h2 className="section-title">Cotiza con tu boleta, con tu consumo o con ambos</h2>
          <p className="section-text">
            Elige la modalidad que prefieras e ingresa solo la información disponible. Si cuentas con ambos datos, la opción combinada entrega una lectura más precisa del proyecto. La propuesta se calcula con paneles Trina Solar 585 W.
          </p>
          <div className="pill">Propuesta referencial</div>
        </div>

        <div className="mode-card">
          <label className="label">¿Cómo quieres cotizar?</label>
          <div className="mode-buttons">
            {Object.entries(installationInputModeOptions).map(([value, option]) => (
              <button
                key={value}
                className={`mode-btn ${installationInputMode === value ? 'active' : ''}`}
                type="button"
                onClick={() => setInstallationInputMode(value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="hint">{installationInputModeOptions[installationInputMode].helper}</div>
        </div>

        <div className="fields-grid">
          {installationInputMode !== 'consumption' && (
            <div className="field">
              <label className="label">Monto mensual aproximado</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                value={monthlyBillInput}
                onChange={(e) => setMonthlyBillInput(sanitizeIntegerInput(e.target.value))}
                placeholder="Ejemplo: 250000"
              />
              <div className="hint">Puedes ingresar solo el valor de tu boleta mensual.</div>
            </div>
          )}

          {installationInputMode !== 'bill' && (
            <div className="field">
              <label className="label">Consumo mensual</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                value={billConsumptionInput}
                onChange={(e) => setBillConsumptionInput(sanitizeIntegerInput(e.target.value))}
                placeholder="Ejemplo: 900"
              />
              <div className="hint">Dato visible en la boleta, expresado en kWh por mes.</div>
            </div>
          )}

          <div className="field">
            <label className="label">Zona del proyecto</label>
            <select className="select" value={zone} onChange={(e) => setZone(e.target.value)}>
              <option value="norte">Norte</option>
              <option value="centro">Centro</option>
              <option value="sur">Sur</option>
            </select>
            <div className="hint">
              Ajusta la producción referencial según la zona geográfica del proyecto.
            </div>
          </div>

          <div className="profile-row">
            <div className="profile-head">
              <div>
                <label className="label">Perfil del hogar</label>
                <div className="hint">Selecciona el hábito de consumo que más se parezca a tu hogar.</div>
              </div>

              <div className="profile-buttons">
                <button
                  className={`profile-btn ${profile === 'outside' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setProfile('outside')}
                >
                  Peak AM y PM
                </button>
                <button
                  className={`profile-btn ${profile === 'mixed' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setProfile('mixed')}
                >
                  Mixto
                </button>
                <button
                  className={`profile-btn ${profile === 'home' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setProfile('home')}
                >
                  Peak sostenido
                </button>
              </div>
            </div>

            <div className="hint" style={{ marginTop: 12 }}>
              Perfil seleccionado: <strong>{selectedProfile.label}</strong>
            </div>
          </div>
        </div>

        <div className="profile-legend">
          <div className="profile-legend-card">
            <h3>Peak AM y PM</h3>
            <p>{profileMap.outside.description}</p>
          </div>
          <div className="profile-legend-card">
            <h3>Mixto</h3>
            <p>{profileMap.mixed.description}</p>
          </div>
          <div className="profile-legend-card">
            <h3>Peak sostenido</h3>
            <p>{profileMap.home.description}</p>
          </div>
        </div>

        <div className="summary-grid">
          <SummaryCard
            label={
              installationInputMode === 'bill'
                ? 'Consumo referencial'
                : installationInputMode === 'consumption'
                  ? 'Boleta referencial'
                  : 'Consumo mensual'
            }
            value={
              installationInputMode === 'consumption'
                ? formatCLP(installationMetrics.monthlyBill)
                : formatNumber(installationMetrics.monthlyConsumptionKWh)
            }
            sub={
              installationInputMode === 'consumption'
                ? 'estimada con tarifa referencial'
                : installationInputMode === 'bill'
                  ? 'kWh por mes estimados'
                  : 'kWh por mes'
            }
          />
          <SummaryCard
            label="Proyecto sugerido"
            value={formatNumber(installationMetrics.estimatedPanels)}
            sub="paneles Trina Solar 585 W"
          />
          <SummaryCard
            label="Ahorro estimado desde"
            value={formatCLP(installationMetrics.monthlySavingsNoBattery)}
            sub="mensual referencial"
          />
        </div>

        <div className="mode-note">
          <strong>{installationMetrics.modeSummaryLabel}:</strong> {installationMetrics.modeSummaryHint}
        </div>
      </section>

      <section className="section-card" id="propuesta">
        <div className="section-head">
          <p className="eyebrow">Alternativas de proyecto</p>
          <h2 className="section-title">Compara soluciones resumidas</h2>
          <p className="section-text">
            Cada alternativa muestra un valor total IVA incluido, ahorro estimado, compensación de la
            cuenta y retorno para apoyar tu decisión comercial, calculando la cantidad de módulos con
            paneles Trina Solar de 585 W.
          </p>
        </div>

        <div className="cards-grid">
          <OfferCard
            title="Huawei sin batería"
            subtitle="Alternativa premium base para una solución on-grid."
            badge="Línea Huawei"
            price={formatCLP(installationMetrics.projectCostHuaweiNoBattery)}
            savings={formatCLP(installationMetrics.monthlySavingsNoBattery)}
            compensation={`${formatNumber(installationMetrics.compensationNoBattery)}%`}
            payback={`${formatNumber(installationMetrics.paybackHuaweiNoBattery, 1)} años`}
            variant="huawei"
          />

          <OfferCard
            title="Solis sin batería"
            subtitle="Alternativa eficiente con inversor de mayor costo en la versión sin batería."
            badge="Línea Solis"
            price={formatCLP(installationMetrics.projectCostSolisNoBattery)}
            savings={formatCLP(installationMetrics.monthlySavingsNoBattery)}
            compensation={`${formatNumber(installationMetrics.compensationNoBattery)}%`}
            payback={`${formatNumber(installationMetrics.paybackSolisNoBattery, 1)} años`}
            variant="solis"
          />

          <OfferCard
            title="Huawei con batería LUNA"
            subtitle="Primera batería LUNA 5 kWh con módulo y backup box."
            badge="Huawei híbrido"
            price={formatCLP(installationMetrics.projectCostHuaweiWithBattery)}
            savings={formatCLP(installationMetrics.monthlySavingsWithBattery)}
            compensation={`${formatNumber(installationMetrics.compensationWithBattery)}%`}
            payback={`${formatNumber(installationMetrics.paybackHuaweiWithBattery, 1)} años`}
            variant="hybrid"
          />

          <OfferCard
            title="Solis con batería"
            subtitle="Batería genérica de 15 kWh como referencia comercial."
            badge="Solis híbrido"
            price={formatCLP(installationMetrics.projectCostSolisWithBattery)}
            savings={formatCLP(installationMetrics.monthlySavingsWithBattery)}
            compensation={`${formatNumber(installationMetrics.compensationWithBattery)}%`}
            payback={`${formatNumber(installationMetrics.paybackSolisWithBattery, 1)} años`}
            variant="solis hybrid"
          />
        </div>

        <div className="note">Los valores son referenciales IVA incluido.</div>
      </section>
    </>
  )

  const renderMaintenanceView = () => (
    <>
      <section className="section-card">
        <div className="hero-copy">
          <div className="back-row">
            <button className="btn-secondary" type="button" onClick={() => goToView('home')}>
              ← Volver al inicio
            </button>
          </div>
          <h1 className="title">Plan de mantenimiento para sistemas fotovoltaicos.</h1>
          <p className="text">
            Mantener un sistema solar no solo ayuda a conservar su desempeño. También permite cuidar la inversión, reducir pérdidas evitables y operar con mayor seguridad. Esta evaluación entrega un valor referencial según la ubicación del proyecto y la capacidad del sistema.
          </p>
          <div className="cta-row">
            <a className="action-link primary" href="#contacto">Solicitar propuesta</a>
            <a className="action-link secondary" href="#detalle-mantencion">Ver evaluación</a>
          </div>
        </div>

        <div className="mini-grid">
          <div className="mini-card">
            <p className="mini-title">Rendimiento</p>
            <div className="mini-text">
              Ayuda a sostener el desempeño del sistema y a reducir pérdidas evitables en el tiempo.
            </div>
          </div>
          <div className="mini-card">
            <p className="mini-title">Seguridad</p>
            <div className="mini-text">
              Considera revisión técnica, mediciones eléctricas y control general de componentes clave.
            </div>
          </div>
          <div className="mini-card">
            <p className="mini-title">Conveniencia</p>
            <div className="mini-text">
              La propuesta considera ubicación, frecuencia y alcance del servicio de forma simple y ordenada.
            </div>
          </div>
        </div>
      </section>

      <section className="section-card" id="detalle-mantencion">
        <div className="section-head">
          <p className="eyebrow">Propuesta de mantenimiento</p>
          <h2 className="section-title">Evalúa una propuesta referencial para tu sistema</h2>
          <p className="section-text">
            Ingresa el tamaño del sistema, el ahorro mensual estimado y la ubicación del proyecto. La propuesta entrega un valor referencial por visita y una lectura clara del plan anual.
          </p>
          <div className="pill">Propuesta referencial</div>
        </div>

        <div className="fields-grid">
          <div className="field">
            <label className="label">Potencia aproximada del sistema</label>
            <input
              className="input"
              type="text"
              inputMode="decimal"
              value={maintenanceSystemSizeInput}
              onChange={(e) => setMaintenanceSystemSizeInput(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
              placeholder="Ejemplo: 8"
            />
            <div className="hint">Hasta 8 kW considera un valor base desde $150.000 por visita en la Región Metropolitana.</div>
          </div>

          <div className="field">
            <label className="label">Ahorro mensual estimado o actual</label>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              value={maintenanceMonthlySavingsInput}
              onChange={(e) => setMaintenanceMonthlySavingsInput(sanitizeIntegerInput(e.target.value))}
              placeholder="Ejemplo: 120000"
            />
            <div className="hint">Este dato nos permite revisar la conveniencia económica del plan de mantenimiento.</div>
          </div>

          <div className="field">
            <label className="label">Región del proyecto</label>
            <select
              className="select"
              value={maintenanceRegion}
              onChange={(e) => {
                const nextRegion = e.target.value
                const nextCommune = Object.keys(maintenanceRegionData[nextRegion].communes)[0]
                setMaintenanceRegion(nextRegion)
                setMaintenanceCommune(nextCommune)
              }}
            >
              {maintenanceRegionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="hint">Selecciona la región donde se encuentra tu sistema fotovoltaico.</div>
          </div>

          <div className="field">
            <label className="label">Comuna del proyecto</label>
            <select
              className="select"
              value={maintenanceCommune}
              onChange={(e) => setMaintenanceCommune(e.target.value)}
            >
              {maintenanceCommuneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="hint">La propuesta considera automáticamente la ubicación del proyecto.</div>
          </div>

          <div className="field">
            <label className="label">Visitas por año</label>
            <select
              className="select"
              value={maintenanceVisitsPerYear}
              onChange={(e) => setMaintenanceVisitsPerYear(Number(e.target.value) || 1)}
            >
              <option value={1}>1 visita al año</option>
              <option value={2}>2 visitas al año</option>
              <option value={3}>3 visitas al año</option>
              <option value={4}>4 visitas al año</option>
            </select>
            <div className="hint">En sistemas residenciales, 1 o 2 visitas al año suelen ser una buena referencia.</div>
          </div>

          <div className="field">
            <label className="label">Ubicación evaluada</label>
            <input
              className="input"
              type="text"
              value={`${selectedMaintenanceRegion.label} · ${selectedMaintenanceCommune.label}`}
              readOnly
            />
            <div className="hint">Mostramos una propuesta clara y resumida según la ubicación seleccionada.</div>
          </div>
        </div>

        <div className="summary-grid">
          <SummaryCard
            label="Valor por visita"
            value={formatCLP(maintenanceMetrics.visitCost)}
            sub="según ubicación y servicio"
          />
          <SummaryCard
            label="Plan anual estimado"
            value={formatCLP(maintenanceMetrics.annualPlanCost)}
            sub="según frecuencia seleccionada"
          />
          <SummaryCard
            label="Resultado"
            value={maintenanceMetrics.status}
            sub="lectura referencial del plan"
          />
        </div>

        <div className="summary-grid compact-grid">
          <SummaryCard
            label="Ahorro anual actual"
            value={formatCLP(maintenanceMetrics.annualSavings)}
            sub="según ahorro informado"
          />
          <SummaryCard
            label="Presupuesto recomendado"
            value={formatCLP(maintenanceMetrics.safeBudget)}
            sub="hasta 20% del ahorro anual"
          />
          <SummaryCard
            label="Margen disponible"
            value={formatCLP(maintenanceMetrics.safeMargin)}
            sub="holgura estimada del plan"
          />
        </div>

        <div className="cards-grid maintenance-cards-grid">
          <div className="info-card">
            <h3 className="info-title">Cómo interpretamos esta evaluación</h3>
            <p className="info-text">
              Consideramos saludable un plan cuando su costo anual se mantiene en una proporción razonable del valor energético que hoy genera el sistema. Con los datos ingresados, el plan anual estimado es de <strong> {formatCLP(maintenanceMetrics.annualPlanCost)}</strong>.
            </p>
            <p className="info-text">
              Como referencia, esta propuesta se ve mejor respaldada cuando el sistema ahorra al menos <strong> {formatCLP(maintenanceMetrics.minimumMonthlySavingsForRule)}</strong> mensuales.
            </p>
          </div>

          <div className="info-card">
            <h3 className="info-title">Qué incluye la propuesta</h3>
            <p className="info-text">
              La propuesta incluye mantenimiento preventivo, revisión técnica y una valorización del servicio según ubicación, tamaño del sistema y frecuencia de visitas.
            </p>
            <p className="info-text">
              El objetivo es entregar una lectura comercial clara, profesional y fácil de entender, manteniendo la complejidad operativa dentro de la evaluación y no en la experiencia del cliente.
            </p>
          </div>
        </div>

        <div className="note">
          Los valores son referenciales y pueden variar según ubicación, condiciones de acceso, tamaño del sistema y requerimientos técnicos del servicio.
        </div>
      </section>

      <section className="section-card">
        <div className="section-head">
          <p className="eyebrow">Alcance del servicio</p>
          <h2 className="section-title">¿Qué considera el mantenimiento?</h2>
          <p className="section-text">
            Cada visita considera una revisión orientada a rendimiento, seguridad y continuidad operativa del sistema.
          </p>
        </div>

        <div className="bottom-grid">
          <div className="info-card">
            <h3 className="info-title">Limpieza y revisión general</h3>
            <p className="info-text">
              Limpieza de módulos, inspección visual general y revisión de condiciones del entorno que puedan afectar el desempeño de la instalación.
            </p>
          </div>
          <div className="info-card">
            <h3 className="info-title">Mediciones y seguridad eléctrica</h3>
            <p className="info-text">
              Mediciones eléctricas, revisión de protecciones, conectores, cableado y comprobaciones generales para detectar desviaciones o desgaste prematuro.
            </p>
          </div>
          <div className="info-card">
            <h3 className="info-title">Monitoreo y actualización</h3>
            <p className="info-text">
              Revisión de inversor, monitoreo, alarmas y actualización de software cuando corresponda según fabricante y compatibilidad del sistema.
            </p>
          </div>
        </div>
      </section>
    </>
  )

  return (
    <div className="sakiara-root">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Inter, Arial, Helvetica, sans-serif; background: #ffffff; }

        .sakiara-root {
          min-height: 100vh;
          background: #ffffff;
          color: #66666b;
        }

        .wrap {
          width: min(1100px, calc(100% - 40px));
          margin: 0 auto;
          padding: 28px 0 60px;
        }

        .brand-row {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 28px;
        }

        .service-nav {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin: -8px auto 24px;
          flex-wrap: wrap;
        }

        .service-nav-btn {
          padding: 12px 16px;
          background: #ffffff;
          color: #66666b;
          border: 1px solid rgba(102, 102, 107, 0.12);
          border-radius: 999px;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
          box-shadow: 0 8px 18px rgba(17, 24, 39, 0.04);
        }

        .service-nav-btn:hover {
          transform: translateY(-1px);
        }

        .service-nav-btn.active {
          background: #f1d433;
          color: #1f2328;
          border-color: #f1d433;
          box-shadow: 0 12px 24px rgba(241, 212, 51, 0.22);
        }

        .brand-logo {
          width: 280px;
          max-width: 100%;
          height: auto;
          display: block;
          object-fit: contain;
        }

        .brand-fallback {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #66666b;
        }

        .brand-dot {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: #f1d433;
          box-shadow: 0 0 0 6px rgba(241, 212, 51, 0.18);
          flex: 0 0 auto;
        }

        .stack {
          display: grid;
          gap: 24px;
        }

        .section-card {
          background: #ffffff;
          border: 1px solid rgba(102, 102, 107, 0.10);
          border-radius: 30px;
          padding: 28px;
          box-shadow: 0 20px 36px rgba(17, 24, 39, 0.06);
        }

        .hero-copy {
          text-align: center;
          max-width: 860px;
          margin: 0 auto;
        }

        .back-row {
          display: flex;
          justify-content: center;
          margin-bottom: 18px;
        }

        .title {
          margin: 0;
          font-size: clamp(40px, 5.2vw, 76px);
          line-height: 0.96;
          letter-spacing: -0.05em;
          color: #66666b;
        }

        .text {
          margin: 22px auto 0;
          max-width: 860px;
          font-size: 20px;
          line-height: 1.72;
          color: #66666b;
        }

        .cta-row {
          display: flex;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-top: 28px;
        }

        .btn-primary,
        .btn-secondary,
        .profile-btn,
        .full-btn,
        .wa-btn,
        .action-link {
          font: inherit;
          border: none;
          cursor: pointer;
          border-radius: 18px;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
          text-decoration: none;
        }

        .btn-primary:hover,
        .btn-secondary:hover,
        .profile-btn:hover,
        .full-btn:hover,
        .wa-btn:hover,
        .action-link:hover {
          transform: translateY(-1px);
        }

        .btn-primary,
        .full-btn,
        .action-link.primary {
          padding: 15px 24px;
          background: #f1d433;
          color: #1f2328;
          font-weight: 800;
          box-shadow: 0 12px 24px rgba(241, 212, 51, 0.28);
        }

        .btn-secondary,
        .action-link.secondary {
          padding: 15px 24px;
          background: #ffffff;
          color: #66666b;
          border: 1px solid rgba(102, 102, 107, 0.12);
          font-weight: 700;
          box-shadow: 0 8px 18px rgba(17, 24, 39, 0.04);
        }

        .wa-btn {
          padding: 15px 24px;
          background: #66666b;
          color: #ffffff;
          font-weight: 800;
          box-shadow: 0 12px 24px rgba(102, 102, 107, 0.18);
        }

        .mini-grid,
        .summary-grid,
        .bottom-grid,
        .service-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .service-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .summary-grid {
          margin-top: 20px;
        }

        .compact-grid {
          margin-top: 16px;
        }

        .mode-card {
          background: #fbfbfa;
          border: 1px solid rgba(102, 102, 107, 0.10);
          border-radius: 22px;
          padding: 18px;
          margin-top: 20px;
          box-shadow: 0 12px 24px rgba(17, 24, 39, 0.04);
        }

        .mode-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .mode-btn {
          padding: 12px 14px;
          background: #ffffff;
          color: #66666b;
          border: 1px solid rgba(102, 102, 107, 0.14);
          border-radius: 16px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
        }

        .mode-btn:hover {
          transform: translateY(-1px);
        }

        .mode-btn.active {
          background: #f1d433;
          color: #1f2328;
          border-color: #f1d433;
          box-shadow: 0 10px 20px rgba(241, 212, 51, 0.18);
        }

        .profile-legend {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        .profile-legend-card {
          background: #ffffff;
          border: 1px solid rgba(102, 102, 107, 0.10);
          border-radius: 18px;
          padding: 16px;
        }

        .profile-legend-card h3 {
          margin: 0;
          font-size: 18px;
          line-height: 1.25;
          color: #66666b;
        }

        .profile-legend-card p {
          margin: 8px 0 0;
          font-size: 14px;
          line-height: 1.7;
          color: #7a7a80;
        }

        .mode-note {
          margin-top: 16px;
          background: rgba(241, 212, 51, 0.14);
          border: 1px solid rgba(241, 212, 51, 0.42);
          border-radius: 18px;
          padding: 14px 16px;
          font-size: 14px;
          line-height: 1.7;
          color: #66666b;
          text-align: center;
        }

        .mini-card,
        .summary-card,
        .field,
        .profile-row,
        .offer-card,
        .info-card,
        .contact-box,
        .service-card {
          background: #fbfbfa;
          border: 1px solid rgba(102, 102, 107, 0.10);
        }

        .mini-card,
        .summary-card,
        .info-card,
        .service-card {
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 12px 24px rgba(17, 24, 39, 0.04);
        }

        .service-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 18px;
          min-height: 280px;
        }

        .service-card.highlighted {
          background: #fffef5;
        }

        .service-title {
          margin: 14px 0 0;
          font-size: 28px;
          line-height: 1.1;
          color: #66666b;
        }

        .service-text,
        .service-points div {
          font-size: 15px;
          line-height: 1.7;
          color: #66666b;
        }

        .service-points {
          display: grid;
          gap: 8px;
        }

        .mini-title {
          margin: 0;
          font-size: 28px;
          line-height: 1;
          font-weight: 800;
          color: #f1d433;
        }

        .mini-text,
        .info-text {
          margin-top: 10px;
          font-size: 15px;
          line-height: 1.68;
          color: #66666b;
        }

        .section-head {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 20px;
        }

        .eyebrow {
          margin: 0;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 800;
          color: #66666b;
        }

        .section-title {
          margin: 8px 0 0;
          font-size: 40px;
          line-height: 1.08;
          color: #66666b;
        }

        .section-text {
          margin: 10px 0 0;
          font-size: 15px;
          line-height: 1.72;
          color: #7a7a80;
        }

        .pill {
          display: inline-block;
          margin-top: 14px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(241, 212, 51, 0.14);
          color: #66666b;
          border: 1px solid rgba(241, 212, 51, 0.42);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .fields-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 20px;
        }

        .field,
        .profile-row,
        .contact-box {
          border-radius: 20px;
          padding: 16px;
        }

        .label {
          display: block;
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 800;
          color: #66666b;
          text-align: left;
        }

        .input,
        .select,
        .textarea {
          width: 100%;
          margin-top: 10px;
          padding: 14px 14px;
          border-radius: 14px;
          border: 1px solid rgba(102, 102, 107, 0.14);
          background: #ffffff;
          color: #44454a;
          font-size: 17px;
          outline: none;
          font: inherit;
        }

        .input::placeholder,
        .textarea::placeholder {
          color: #a0a0a6;
        }

        .textarea {
          min-height: 120px;
          resize: vertical;
        }

        .hint {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.5;
          color: #8b8b91;
          text-align: left;
        }

        .profile-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: start;
          flex-wrap: wrap;
        }

        .profile-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .profile-btn {
          padding: 10px 12px;
          background: #ffffff;
          color: #66666b;
          border: 1px solid rgba(102, 102, 107, 0.14);
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .profile-btn.active {
          background: #f1d433;
          color: #1f2328;
          border-color: #f1d433;
        }

        .summary-card {
          min-height: 140px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
        }

        .summary-label,
        .price-label,
        .stat-label {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          color: #8b8b91;
        }

        .summary-value {
          margin-top: 10px;
          font-size: 34px;
          line-height: 1.05;
          font-weight: 800;
          color: #66666b;
          overflow-wrap: anywhere;
        }

        .summary-sub {
          margin-top: 6px;
          font-size: 13px;
          color: #8b8b91;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(320px, 1fr));
          gap: 18px;
          margin-top: 20px;
        }

        .maintenance-cards-grid {
          align-items: stretch;
        }

        .offer-card {
          border-top: 4px solid #f1d433;
          border-radius: 24px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 340px;
        }

        .offer-card.solis {
          border-top-color: #66666b;
        }

        .offer-card.hybrid {
          background: #fffef5;
        }

        .offer-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: start;
        }

        .offer-title {
          margin: 0;
          font-size: 26px;
          line-height: 1.15;
          font-weight: 800;
          color: #66666b;
        }

        .offer-sub {
          margin: 8px 0 0;
          font-size: 15px;
          line-height: 1.6;
          color: #7c7c82;
          max-width: 440px;
        }

        .offer-badge {
          display: inline-flex;
          width: fit-content;
          padding: 8px 10px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(102, 102, 107, 0.12);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #66666b;
          white-space: nowrap;
        }

        .price-box {
          margin-top: 18px;
          background: #ffffff;
          border: 1px solid rgba(102, 102, 107, 0.10);
          border-radius: 18px;
          padding: 16px;
        }

        .price-value {
          margin-top: 10px;
          font-size: 42px;
          line-height: 1;
          font-weight: 800;
          color: #66666b;
          overflow-wrap: anywhere;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .stat {
          background: #ffffff;
          border: 1px solid rgba(102, 102, 107, 0.10);
          border-radius: 16px;
          padding: 14px;
          min-height: 90px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
        }

        .stat-value {
          margin-top: 8px;
          font-size: 17px;
          line-height: 1.45;
          font-weight: 800;
          color: #66666b;
        }

        .note {
          margin-top: 18px;
          background: rgba(241, 212, 51, 0.14);
          border: 1px solid rgba(241, 212, 51, 0.42);
          border-radius: 18px;
          padding: 16px;
          font-size: 14px;
          line-height: 1.7;
          color: #66666b;
          text-align: left;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 20px;
        }

        .contact-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .full-btn,
        .wa-btn {
          padding: 16px 20px;
          font-weight: 800;
          box-shadow: 0 12px 24px rgba(17, 24, 39, 0.08);
        }

        .info-card {
          min-height: 190px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }

        .info-title {
          margin: 0;
          font-size: 22px;
          line-height: 1.25;
          font-weight: 800;
          color: #66666b;
        }

        @media (max-width: 980px) {
          .mini-grid,
          .summary-grid,
          .cards-grid,
          .bottom-grid,
          .contact-grid,
          .fields-grid,
          .service-grid,
          .profile-legend {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .wrap {
            width: min(100% - 20px, 1100px);
            padding-top: 20px;
          }

          .brand-row {
            justify-content: flex-start;
          }

          .brand-logo {
            width: 180px;
          }

          .title {
            font-size: 42px;
          }

          .section-title {
            font-size: 30px;
          }

          .price-value,
          .summary-value {
            font-size: 32px;
          }

          .cta-row,
          .contact-actions,
          .service-nav {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="wrap">
        <div className="brand-row">
          {!logoHidden ? (
            <img
              className="brand-logo"
              src={sakiaraLogo}
              alt="Sakiara Energía Solar"
              onError={() => setLogoHidden(true)}
            />
          ) : (
            <div className="brand-fallback">
              <div className="brand-dot" />
              <span>Sakiara Energía Solar</span>
            </div>
          )}
        </div>

        <div className="stack">
          {activeView === 'home' && renderHomeView()}
          {activeView === 'instalacion' && renderInstallationView()}
          {activeView === 'mantenimiento' && renderMaintenanceView()}

          {activeView !== 'home' && (
            <section className="section-card" id="contacto">
              <div className="section-head">
                <p className="eyebrow">Contacto</p>
                <h2 className="section-title">Solicita una evaluación personalizada</h2>
                <p className="section-text">
                  Completa tus datos y solicita una evaluación personalizada. También puedes escribirnos por WhatsApp con el resumen de tu propuesta ya preparado.
                </p>
              </div>

              <form action={formEndpoint} method="POST">
                <input
                  type="hidden"
                  name="_subject"
                  value={
                    activeView === 'mantenimiento'
                      ? 'Nueva solicitud de mantenimiento fotovoltaico - Sakiara'
                      : 'Nueva solicitud de evaluación solar - Sakiara'
                  }
                />
                <input type="hidden" name="_captcha" value="false" />
                <input type="hidden" name="_template" value="table" />
                {getSummaryItems().map((item, index) => (
                  <input
                    key={`${item.label}-${index}`}
                    type="hidden"
                    name={item.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}
                    value={item.value}
                  />
                ))}

                <div className="contact-grid">
                  <div className="contact-box">
                    <label className="label">Nombre</label>
                    <input
                      className="input"
                      name="nombre"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      required
                    />
                  </div>
                  <div className="contact-box">
                    <label className="label">Teléfono</label>
                    <input
                      className="input"
                      name="telefono"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+56..."
                      required
                    />
                  </div>
                  <div className="contact-box">
                    <label className="label">Correo</label>
                    <input
                      className="input"
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      required
                    />
                  </div>
                  <div className="contact-box">
                    <label className="label">Mensaje</label>
                    <textarea
                      className="textarea"
                      name="mensaje"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        activeView === 'mantenimiento'
                          ? 'Cuéntanos el estado del sistema, observaciones o el tipo de servicio que necesitas'
                          : 'Cuéntanos brevemente tu proyecto o necesidad'
                      }
                    />
                  </div>
                </div>

                <div className="contact-actions">
                  <button className="full-btn" type="submit">
                    {activeView === 'mantenimiento'
                      ? 'Solicitar propuesta personalizada'
                      : 'Solicitar propuesta'}
                  </button>
                  <button className="wa-btn" type="button" onClick={handleWhatsApp}>
                    Hablar por WhatsApp
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
