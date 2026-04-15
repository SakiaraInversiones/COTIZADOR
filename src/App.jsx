import React, { useEffect, useMemo, useState } from "react";

const sakiaraLogo = "/sakiara-logo.jpg";
const contactEmail = "rafael.vasquez844@gmail.com";
const whatsappNumber = "56975807224";
const formEndpoint = `https://formsubmit.co/${contactEmail}`;
const PANEL_POWER_KW = 0.585;
const REFERENCE_TARIFF_CLP_PER_KWH = 278;
const WINTER_COVERAGE_OPTIONS = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
const SUMMER_COVERAGE_OPTIONS = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
const PDF_LIBRARY_URL = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";

const sanitizeIntegerInput = (value) => value.replace(/[^\d]/g, "");

const formatCLP = (value) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatNumber = (value, digits = 0) =>
  new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const solarProductionProfilesByRegion = {
  aricaParinacota: { annual: 158, winter: 138 },
  tarapaca: { annual: 164, winter: 142 },
  antofagasta: { annual: 168, winter: 145 },
  atacama: { annual: 160, winter: 132 },
  coquimbo: { annual: 147, winter: 108 },
  valparaiso: { annual: 132, winter: 86 },
  metropolitana: { annual: 128, winter: 82 },
  ohiggins: { annual: 123, winter: 77 },
  maule: { annual: 118, winter: 71 },
  nuble: { annual: 112, winter: 64 },
  biobio: { annual: 108, winter: 60 },
  araucania: { annual: 103, winter: 54 },
  losRios: { annual: 98, winter: 47 },
  losLagos: { annual: 93, winter: 43 },
  aysen: { annual: 96, winter: 42 },
  magallanes: { annual: 83, winter: 26 },
};

const solarProductionCommuneOverrides = {
  metropolitana: {
    colina: { annual: 130, winter: 84 },
    lampa: { annual: 130, winter: 84 },
    tiltil: { annual: 131, winter: 84 },
    loBarnechea: { annual: 127, winter: 81 },
    lasCondes: { annual: 126, winter: 80 },
    vitacura: { annual: 126, winter: 80 },
    sanJoseDeMaipo: { annual: 123, winter: 75 },
  },
  valparaiso: {
    concon: { annual: 134, winter: 88 },
    vinaDelMar: { annual: 133, winter: 87 },
    valparaiso: { annual: 132, winter: 86 },
    losAndes: { annual: 136, winter: 90 },
    sanFelipe: { annual: 137, winter: 91 },
  },
  coquimbo: {
    laSerena: { annual: 149, winter: 111 },
    coquimbo: { annual: 148, winter: 110 },
    ovalle: { annual: 150, winter: 113 },
  },
};

const getSolarProductionProfile = (regionKey, communeKey) => {
  const baseProfile =
    solarProductionCommuneOverrides[regionKey]?.[communeKey] ||
    solarProductionProfilesByRegion[regionKey] ||
    { annual: 125, winter: 78 };

  return {
    ...baseProfile,
    summer:
      baseProfile.summer ||
      Math.max(
        Math.round(baseProfile.annual * 1.48),
        baseProfile.annual + 18,
      ),
  };
};

const climateReferenceByRegion = {
  aricaParinacota: {
    summerTemp: 27,
    winterTemp: 11,
    cloudiness: 18,
    sunHours: 8.8,
    rainfall: "Muy baja",
    seasonality: "Producción bastante estable durante el año.",
  },
  tarapaca: {
    summerTemp: 28,
    winterTemp: 12,
    cloudiness: 16,
    sunHours: 9.0,
    rainfall: "Muy baja",
    seasonality: "Alta radiación y muy baja variación estacional.",
  },
  antofagasta: {
    summerTemp: 26,
    winterTemp: 10,
    cloudiness: 20,
    sunHours: 8.9,
    rainfall: "Muy baja",
    seasonality: "Excelente recurso solar y alta continuidad anual.",
  },
  atacama: {
    summerTemp: 29,
    winterTemp: 9,
    cloudiness: 22,
    sunHours: 8.7,
    rainfall: "Muy baja",
    seasonality: "Buen desempeño anual con invierno aún favorable.",
  },
  coquimbo: {
    summerTemp: 27,
    winterTemp: 8,
    cloudiness: 28,
    sunHours: 8.3,
    rainfall: "Baja",
    seasonality: "Muy buen desempeño anual con baja nubosidad relativa.",
  },
  valparaiso: {
    summerTemp: 25,
    winterTemp: 7,
    cloudiness: 34,
    sunHours: 7.6,
    rainfall: "Media",
    seasonality: "Buena producción estival y baja importante en invierno.",
  },
  metropolitana: {
    summerTemp: 29,
    winterTemp: 4,
    cloudiness: 32,
    sunHours: 7.9,
    rainfall: "Media",
    seasonality: "Estacionalidad marcada, con invierno más exigente.",
  },
  ohiggins: {
    summerTemp: 28,
    winterTemp: 4,
    cloudiness: 35,
    sunHours: 7.5,
    rainfall: "Media",
    seasonality: "Buen verano y descenso visible durante invierno.",
  },
  maule: {
    summerTemp: 27,
    winterTemp: 3,
    cloudiness: 38,
    sunHours: 7.2,
    rainfall: "Media/alta",
    seasonality: "Estacionalidad clara, ideal revisar meta invernal.",
  },
  nuble: {
    summerTemp: 26,
    winterTemp: 3,
    cloudiness: 40,
    sunHours: 6.9,
    rainfall: "Alta",
    seasonality: "Menor producción invernal y más nubosidad.",
  },
  biobio: {
    summerTemp: 24,
    winterTemp: 4,
    cloudiness: 44,
    sunHours: 6.6,
    rainfall: "Alta",
    seasonality: "Diferencia relevante entre invierno y verano.",
  },
  araucania: {
    summerTemp: 23,
    winterTemp: 2,
    cloudiness: 48,
    sunHours: 6.2,
    rainfall: "Alta",
    seasonality: "Invierno exigente, conviene modelar cobertura objetivo.",
  },
  losRios: {
    summerTemp: 21,
    winterTemp: 3,
    cloudiness: 52,
    sunHours: 5.9,
    rainfall: "Alta",
    seasonality: "Mayor nubosidad y baja producción invernal.",
  },
  losLagos: {
    summerTemp: 20,
    winterTemp: 2,
    cloudiness: 54,
    sunHours: 5.7,
    rainfall: "Alta",
    seasonality: "Invierno muy exigente y verano más corto.",
  },
  aysen: {
    summerTemp: 18,
    winterTemp: 0,
    cloudiness: 50,
    sunHours: 5.8,
    rainfall: "Media/alta",
    seasonality: "Alto contraste estacional y menor radiación invernal.",
  },
  magallanes: {
    summerTemp: 16,
    winterTemp: -1,
    cloudiness: 56,
    sunHours: 5.4,
    rainfall: "Media",
    seasonality: "Producción muy estacional, con invierno extremadamente exigente.",
  },
};

const getClimateReferenceProfile = (regionKey) =>
  climateReferenceByRegion[regionKey] || climateReferenceByRegion.metropolitana;

const profileMap = {
  outside: {
    label: "Peak AM y PM",
    morning: 15,
    day: 20,
    night: 65,
    chartBars: [86, 14, 86],
    description:
      "Hogar con consumo más marcado temprano en la mañana y desde la tarde hacia la noche.",
  },
  mixed: {
    label: "Mixto",
    morning: 20,
    day: 35,
    night: 45,
    chartBars: [68, 42, 82],
    description:
      "Consumo repartido durante el día, con un comportamiento más equilibrado entre mañana, tarde y noche.",
  },
  home: {
    label: "Peak sostenido",
    morning: 20,
    day: 50,
    night: 30,
    chartBars: [84, 84, 84],
    description:
      "Hogar con uso más constante durante el día, ideal cuando hay mayor presencia o actividad diurna.",
  },
};

const installationInputModeOptions = {
  bill: {
    label: "Cotiza con tu boleta",
    helper:
      "Ingresas solo el valor mensual y estimamos el consumo con una tarifa referencial.",
  },
  consumption: {
    label: "Cotiza con tu consumo",
    helper:
      "Ingresas solo los kWh mensuales y estimamos una boleta referencial para proyectar la inversión.",
  },
  combined: {
    label: "Opción combinada",
    helper: "Usar ambos datos entrega una lectura más precisa del proyecto.",
  },
};

const projectShowcase = [
  {
    title: "Talagante",
    power: "8 kW",
    type: "Residencial",
    image: "/proyectos/talagante-8kw.jpg",
    description:
      "Sistema fotovoltaico residencial con una disposición limpia sobre cubierta, se dispuso de esa forma los módulos con la finalidad de reducir sombras y mejorar la producción.",
  },
  {
    title: "Piedra Roja",
    power: "6 kW",
    type: "Residencial",
    image: "/proyectos/piedra-roja-6kw.jpg",
    description:
      "Proyecto residencial integrado a la vivienda, con una solución ordenada y visualmente prolija para aprovechar mejor la superficie disponible.",
  },
  {
    title: "Lo Arcaya",
    power: "6 kW",
    type: "Estructura en terreno",
    image: "/proyectos/lo-arcaya-6kw.jpg",
    description:
      "Instalación desarrollada sobre estructura metálica en terreno, ideal para captar radiación de forma eficiente y facilitar la mantención del sistema.",
  },
  {
    title: "Calera de Tango",
    power: "30 kW",
    type: "Mayor escala",
    image: "/proyectos/calera-de-tango-30kw.jpg",
    description:
      "Proyecto de mayor capacidad, diseñado para cubrir una demanda energética más alta con una configuración robusta, ordenada y profesional.",
  },
];

const VEHICLE_EFFICIENCY_KM_PER_L = 8;
const REFERENCE_FUEL_PRICE_CLP_PER_L = 1300;
const VEHICLE_WEAR_CLP_PER_KM = 120;
const BASE_TRAVEL_FEE = 10000;
const TRAVEL_BLOCK_KM = 50;
const TRAVEL_BLOCK_FEE = 20000;
const INSTALLATION_PROJECT_WORK_DAYS = 5;
const INSTALLATION_REMOTE_DISTANCE_THRESHOLD_KM = 100;
const INSTALLATION_OVERNIGHT_CLP_PER_NIGHT = 100000;
const INSTALLATION_LOCAL_LOGISTICS_CLP_PER_DAY = 20000;


const getTravelLogisticsBase = (roundTripKm, tolls = 0) => {
  const variableMobilityCostPerKm =
    REFERENCE_FUEL_PRICE_CLP_PER_L / VEHICLE_EFFICIENCY_KM_PER_L +
    VEHICLE_WEAR_CLP_PER_KM;
  const internalTravelEstimate =
    Math.max(roundTripKm, 0) * variableMobilityCostPerKm + tolls;
  const travelBlocks = Math.floor(Math.max(roundTripKm, 0) / TRAVEL_BLOCK_KM);
  const commercialTravelFee = BASE_TRAVEL_FEE + travelBlocks * TRAVEL_BLOCK_FEE;

  return {
    variableMobilityCostPerKm,
    internalTravelEstimate,
    travelBlocks,
    commercialTravelFee,
    logisticsBase: Math.max(internalTravelEstimate, commercialTravelFee),
  };
};

const getInstallationProjectLogistics = (communeConfig) => {
  const safeCommune = communeConfig || { roundTripKm: 0, tolls: 0 };
  const travelMetrics = getTravelLogisticsBase(
    safeCommune.roundTripKm,
    safeCommune.tolls,
  );
  const isRemoteProject =
    safeCommune.roundTripKm > INSTALLATION_REMOTE_DISTANCE_THRESHOLD_KM;

  if (isRemoteProject) {
    const lodgingNights = INSTALLATION_PROJECT_WORK_DAYS + 1;
    const localLogistics =
      INSTALLATION_PROJECT_WORK_DAYS * INSTALLATION_LOCAL_LOGISTICS_CLP_PER_DAY;

    return {
      ...travelMetrics,
      roundTripKm: safeCommune.roundTripKm,
      tolls: safeCommune.tolls,
      isRemoteProject,
      projectWorkDays: INSTALLATION_PROJECT_WORK_DAYS,
      travelDays: 2,
      lodgingNights,
      localLogistics,
      logisticsTotal:
        travelMetrics.logisticsBase +
        lodgingNights * INSTALLATION_OVERNIGHT_CLP_PER_NIGHT +
        localLogistics,
    };
  }

  return {
    ...travelMetrics,
    roundTripKm: safeCommune.roundTripKm,
    tolls: safeCommune.tolls,
    isRemoteProject,
    projectWorkDays: INSTALLATION_PROJECT_WORK_DAYS,
    travelDays: 0,
    lodgingNights: 0,
    localLogistics: 0,
    logisticsTotal:
      travelMetrics.logisticsBase * INSTALLATION_PROJECT_WORK_DAYS,
  };
};

const maintenanceMetropolitanaCommunes = {
  alhue: { label: "Alhué", roundTripKm: 250, tolls: 12000 },
  buin: { label: "Buin", roundTripKm: 118, tolls: 3000 },
  caleraDeTango: { label: "Calera de Tango", roundTripKm: 92, tolls: 0 },
  cerrillos: { label: "Cerrillos", roundTripKm: 62, tolls: 0 },
  cerroNavia: { label: "Cerro Navia", roundTripKm: 50, tolls: 0 },
  colina: { label: "Colina", roundTripKm: 0, tolls: 0 },
  conchali: { label: "Conchalí", roundTripKm: 44, tolls: 0 },
  curacavi: { label: "Curacaví", roundTripKm: 132, tolls: 9000 },
  elBosque: { label: "El Bosque", roundTripKm: 72, tolls: 0 },
  elMonte: { label: "El Monte", roundTripKm: 118, tolls: 4000 },
  estacionCentral: { label: "Estación Central", roundTripKm: 58, tolls: 0 },
  huechuraba: { label: "Huechuraba", roundTripKm: 36, tolls: 0 },
  independencia: { label: "Independencia", roundTripKm: 46, tolls: 0 },
  islaDeMaipo: { label: "Isla de Maipo", roundTripKm: 122, tolls: 5000 },
  laCisterna: { label: "La Cisterna", roundTripKm: 70, tolls: 0 },
  laFlorida: { label: "La Florida", roundTripKm: 74, tolls: 0 },
  laGranja: { label: "La Granja", roundTripKm: 76, tolls: 0 },
  laPintana: { label: "La Pintana", roundTripKm: 86, tolls: 0 },
  laReina: { label: "La Reina", roundTripKm: 72, tolls: 0 },
  lampa: { label: "Lampa", roundTripKm: 28, tolls: 0 },
  lasCondes: { label: "Las Condes", roundTripKm: 72, tolls: 0 },
  loBarnechea: { label: "Lo Barnechea", roundTripKm: 84, tolls: 0 },
  loEspejo: { label: "Lo Espejo", roundTripKm: 72, tolls: 0 },
  loPrado: { label: "Lo Prado", roundTripKm: 54, tolls: 0 },
  macul: { label: "Macul", roundTripKm: 70, tolls: 0 },
  maipu: { label: "Maipú", roundTripKm: 78, tolls: 0 },
  mariaPinto: { label: "María Pinto", roundTripKm: 150, tolls: 6000 },
  melipilla: { label: "Melipilla", roundTripKm: 154, tolls: 7000 },
  nunoa: { label: "Ñuñoa", roundTripKm: 66, tolls: 0 },
  padreHurtado: { label: "Padre Hurtado", roundTripKm: 92, tolls: 4000 },
  paine: { label: "Paine", roundTripKm: 150, tolls: 5000 },
  pedroAguirreCerda: {
    label: "Pedro Aguirre Cerda",
    roundTripKm: 64,
    tolls: 0,
  },
  penaflor: { label: "Peñaflor", roundTripKm: 98, tolls: 4000 },
  penalolen: { label: "Peñalolén", roundTripKm: 76, tolls: 0 },
  pirque: { label: "Pirque", roundTripKm: 106, tolls: 0 },
  providencia: { label: "Providencia", roundTripKm: 60, tolls: 0 },
  pudahuel: { label: "Pudahuel", roundTripKm: 58, tolls: 0 },
  puenteAlto: { label: "Puente Alto", roundTripKm: 90, tolls: 0 },
  quilicura: { label: "Quilicura", roundTripKm: 26, tolls: 0 },
  quintaNormal: { label: "Quinta Normal", roundTripKm: 52, tolls: 0 },
  recoleta: { label: "Recoleta", roundTripKm: 48, tolls: 0 },
  renca: { label: "Renca", roundTripKm: 42, tolls: 0 },
  sanBernardo: { label: "San Bernardo", roundTripKm: 88, tolls: 0 },
  sanJoaquin: { label: "San Joaquín", roundTripKm: 70, tolls: 0 },
  sanJoseDeMaipo: { label: "San José de Maipo", roundTripKm: 156, tolls: 0 },
  sanMiguel: { label: "San Miguel", roundTripKm: 66, tolls: 0 },
  sanPedro: { label: "San Pedro", roundTripKm: 216, tolls: 9000 },
  sanRamon: { label: "San Ramón", roundTripKm: 78, tolls: 0 },
  santiago: { label: "Santiago", roundTripKm: 54, tolls: 0 },
  talagante: { label: "Talagante", roundTripKm: 108, tolls: 4000 },
  tiltil: { label: "Tiltil", roundTripKm: 76, tolls: 0 },
  vitacura: { label: "Vitacura", roundTripKm: 64, tolls: 0 },
};

const maintenanceRegionData = {
  aricaParinacota: {
    label: "Arica y Parinacota",
    communes: {
      arica: { label: "Arica", roundTripKm: 4120, tolls: 65000 },
      putre: { label: "Putre", roundTripKm: 4300, tolls: 65000 },
    },
  },
  tarapaca: {
    label: "Tarapacá",
    communes: {
      iquique: { label: "Iquique", roundTripKm: 3600, tolls: 56000 },
      altoHospicio: { label: "Alto Hospicio", roundTripKm: 3600, tolls: 56000 },
    },
  },
  antofagasta: {
    label: "Antofagasta",
    communes: {
      antofagasta: { label: "Antofagasta", roundTripKm: 2740, tolls: 46000 },
      calama: { label: "Calama", roundTripKm: 3000, tolls: 49000 },
    },
  },
  atacama: {
    label: "Atacama",
    communes: {
      copiapo: { label: "Copiapó", roundTripKm: 1660, tolls: 30000 },
      vallenar: { label: "Vallenar", roundTripKm: 1320, tolls: 26000 },
    },
  },
  coquimbo: {
    label: "Coquimbo",
    communes: {
      laSerena: { label: "La Serena", roundTripKm: 940, tolls: 18000 },
      coquimbo: { label: "Coquimbo", roundTripKm: 950, tolls: 18000 },
      ovalle: { label: "Ovalle", roundTripKm: 780, tolls: 16000 },
    },
  },
  valparaiso: {
    label: "Valparaíso",
    communes: {
      valparaiso: { label: "Valparaíso", roundTripKm: 300, tolls: 12000 },
      vinaDelMar: { label: "Viña del Mar", roundTripKm: 310, tolls: 12000 },
      quilpue: { label: "Quilpué", roundTripKm: 290, tolls: 10000 },
      concon: { label: "Concón", roundTripKm: 320, tolls: 12000 },
      losAndes: { label: "Los Andes", roundTripKm: 220, tolls: 9000 },
      sanFelipe: { label: "San Felipe", roundTripKm: 200, tolls: 9000 },
    },
  },
  metropolitana: {
    label: "Región Metropolitana",
    communes: maintenanceMetropolitanaCommunes,
  },
  ohiggins: {
    label: "O'Higgins",
    communes: {
      rancagua: { label: "Rancagua", roundTripKm: 170, tolls: 6000 },
      machali: { label: "Machalí", roundTripKm: 180, tolls: 6000 },
      sanFernando: { label: "San Fernando", roundTripKm: 280, tolls: 9000 },
      pichilemu: { label: "Pichilemu", roundTripKm: 430, tolls: 13000 },
    },
  },
  maule: {
    label: "Maule",
    communes: {
      talca: { label: "Talca", roundTripKm: 510, tolls: 14000 },
      curico: { label: "Curicó", roundTripKm: 380, tolls: 11000 },
      linares: { label: "Linares", roundTripKm: 620, tolls: 16000 },
    },
  },
  nuble: {
    label: "Ñuble",
    communes: {
      chillan: { label: "Chillán", roundTripKm: 800, tolls: 19000 },
      sanCarlos: { label: "San Carlos", roundTripKm: 740, tolls: 18000 },
    },
  },
  biobio: {
    label: "Biobío",
    communes: {
      concepcion: { label: "Concepción", roundTripKm: 1040, tolls: 24000 },
      talcahuano: { label: "Talcahuano", roundTripKm: 1060, tolls: 24000 },
      losAngeles: { label: "Los Ángeles", roundTripKm: 900, tolls: 21000 },
    },
  },
  araucania: {
    label: "La Araucanía",
    communes: {
      temuco: { label: "Temuco", roundTripKm: 1380, tolls: 30000 },
      villarrica: { label: "Villarrica", roundTripKm: 1520, tolls: 32000 },
    },
  },
  losRios: {
    label: "Los Ríos",
    communes: {
      valdivia: { label: "Valdivia", roundTripKm: 1680, tolls: 35000 },
      laUnion: { label: "La Unión", roundTripKm: 1750, tolls: 36000 },
    },
  },
  losLagos: {
    label: "Los Lagos",
    communes: {
      puertoMontt: { label: "Puerto Montt", roundTripKm: 2090, tolls: 40000 },
      osorno: { label: "Osorno", roundTripKm: 1820, tolls: 38000 },
      castro: { label: "Castro", roundTripKm: 2390, tolls: 45000 },
    },
  },
  aysen: {
    label: "Aysén",
    communes: {
      coyhaique: { label: "Coyhaique", roundTripKm: 3380, tolls: 20000 },
      puertoAysen: { label: "Puerto Aysén", roundTripKm: 3460, tolls: 20000 },
    },
  },
  magallanes: {
    label: "Magallanes",
    communes: {
      puntaArenas: { label: "Punta Arenas", roundTripKm: 5660, tolls: 10000 },
      puertoNatales: {
        label: "Puerto Natales",
        roundTripKm: 5400,
        tolls: 10000,
      },
    },
  },
};

const maintenanceRegionOptions = Object.entries(maintenanceRegionData).map(
  ([value, config]) => ({
    value,
    label: config.label,
  }),
);

const SITE_FALLBACK_URL = "https://sakiarainversiones.com";

const viewPathMap = {
  home: "/",
  instalacion: "/instalacion",
  mantenimiento: "/mantenimiento",
};

const getViewFromPath = (pathname = "/") => {
  if (pathname === "/instalacion") return "instalacion";
  if (pathname === "/mantenimiento") return "mantenimiento";
  return "home";
};

const ensureMetaTag = (attribute, key, content) => {
  if (typeof document === "undefined") return;
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const ensureLinkTag = (rel, href) => {
  if (typeof document === "undefined") return;
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
};

const ensureJsonLdScript = (id, data) => {
  if (typeof document === "undefined") return;
  let tag = document.getElementById(id);
  if (!tag) {
    tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.id = id;
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(data);
};

const getSeoConfig = (view, origin = SITE_FALLBACK_URL) => {
  const normalizedOrigin = origin || SITE_FALLBACK_URL;
  const pages = {
    home: {
      title:
        "Sakiara Solar | Instalación y mantenimiento de sistemas fotovoltaicos en Chile",
      description:
        "Cotiza una instalación fotovoltaica o evalúa el mantenimiento de tu sistema con una experiencia clara, profesional y orientada a ahorro, inversión y protección del rendimiento.",
      path: "/",
      pageName: "Inicio",
      image: `${normalizedOrigin}${sakiaraLogo}`,
    },
    instalacion: {
      title: "Cotizador de instalación fotovoltaica | Sakiara Solar",
      description:
        "Cotiza tu sistema fotovoltaico con tu boleta, tu consumo o una opción combinada. Compara alternativas claras para tu proyecto y avanza con una evaluación inicial profesional.",
      path: "/instalacion",
      pageName: "Cotizador de instalación fotovoltaica",
      image: `${normalizedOrigin}${sakiaraLogo}`,
    },
    mantenimiento: {
      title: "Mantenimiento de paneles solares | Sakiara Solar",
      description:
        "Evalúa un plan de mantenimiento para tu sistema fotovoltaico según ubicación, potencia y frecuencia de servicio. Protege rendimiento, seguridad y continuidad del sistema.",
      path: "/mantenimiento",
      pageName: "Plan de mantenimiento fotovoltaico",
      image: `${normalizedOrigin}${sakiaraLogo}`,
    },
  };

  const currentPage = pages[view] || pages.home;
  const currentUrl = `${normalizedOrigin}${currentPage.path}`;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Sakiara Solar",
      alternateName: "Sakiara Inversiones SpA",
      url: normalizedOrigin,
      inLanguage: "es-CL",
    },
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Sakiara Solar",
      alternateName: "Sakiara Inversiones SpA",
      url: normalizedOrigin,
      logo: `${normalizedOrigin}${sakiaraLogo}`,
      image: `${normalizedOrigin}${sakiaraLogo}`,
      description:
        "Instalación y mantenimiento de sistemas fotovoltaicos residenciales en Chile.",
      telephone: "+56 9 7580 7224",
      email: contactEmail,
      areaServed: "Chile",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Colina",
        addressRegion: "Región Metropolitana",
        addressCountry: "CL",
      },
      makesOffer: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Instalación de sistemas fotovoltaicos residenciales",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Mantenimiento de sistemas fotovoltaicos",
          },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: currentPage.pageName,
      url: currentUrl,
      description: currentPage.description,
      isPartOf: {
        "@type": "WebSite",
        name: "Sakiara Solar",
        url: normalizedOrigin,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Inicio",
          item: `${normalizedOrigin}/`,
        },
        ...(view !== "home"
          ? [
              {
                "@type": "ListItem",
                position: 2,
                name: currentPage.pageName,
                item: currentUrl,
              },
            ]
          : []),
      ],
    },
  ];

  return {
    ...currentPage,
    canonical: currentUrl,
    structuredData,
  };
};

function OfferCard({
  title,
  subtitle,
  badge,
  price,
  savings,
  compensation,
  payback,
  variant,
  collapsible = false,
  isOpen = true,
  onToggle,
  selectable = false,
  isSelected = false,
  onSelect,
}) {
  return (
    <div
      className={`offer-card ${variant} ${collapsible ? "collapsible" : ""} ${isOpen ? "expanded" : "collapsed"} ${isSelected ? "selected" : ""}`}
    >
      <div className="offer-head">
        <div>
          <h3 className="offer-title">{title}</h3>
          <p className="offer-sub">{subtitle}</p>
        </div>

        <div className="offer-head-actions">
          <div className="offer-badge">{badge}</div>
          {collapsible && (
            <button
              className={`offer-toggle ${isOpen ? "active" : ""}`}
              type="button"
              onClick={onToggle}
            >
              {isOpen ? "Ocultar detalle" : "Ver detalle"}
            </button>
          )}
        </div>
      </div>

      {(!collapsible || isOpen) && (
        <>
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

          {selectable && (
            <div className="offer-selection-row">
              <button
                className={`offer-select-btn ${isSelected ? "selected" : ""}`}
                type="button"
                onClick={onSelect}
              >
                {isSelected ? "Alternativa seleccionada" : "Seleccionar alternativa"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, valueClassName = "" }) {
  const summaryValueClassName = ["summary-value", valueClassName].filter(Boolean).join(" ");

  return (
    <div className="summary-card">
      <div className="summary-label">{label}</div>
      <div className={summaryValueClassName}>{value}</div>
      <div className="summary-sub">{sub}</div>
    </div>
  );
}

function ProfileOptionCard({ option, isSelected, onSelect }) {
  const chartBars = option.chartBars || [option.morning, option.day, option.night];
  const maxBar = Math.max(...chartBars, 1);
  const bars = [
    { label: "AM", value: chartBars[0] },
    { label: "Día", value: chartBars[1] },
    { label: "PM", value: chartBars[2] },
  ];

  return (
    <button
      className={`profile-option-card ${isSelected ? 'selected' : ''}`}
      type="button"
      onClick={onSelect}
    >
      <div className="profile-option-top">
        <div>
          <div className="profile-option-title">{option.label}</div>
          <p className="profile-option-description">{option.description}</p>
        </div>
        <div className={`profile-option-check ${isSelected ? 'selected' : ''}`}>
          {isSelected ? 'Seleccionado' : 'Seleccionar'}
        </div>
      </div>

      <div className="profile-example-chart" aria-hidden="true">
        {bars.map((bar) => (
          <div key={bar.label} className="profile-example-bar-wrap">
            <div
              className="profile-example-bar"
              style={{ height: `${Math.max((bar.value / maxBar) * 88, 18)}px` }}
            />
            <span>{bar.label}</span>
          </div>
        ))}
      </div>
    </button>
  );
}


let html2PdfLoaderPromise = null;

const loadHtml2PdfLibrary = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PDF solo disponible en navegador."));
  }

  if (window.html2pdf) {
    return Promise.resolve(window.html2pdf);
  }

  if (html2PdfLoaderPromise) {
    return html2PdfLoaderPromise;
  }

  html2PdfLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-sakiara-pdf="true"]');

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.html2pdf));
      existingScript.addEventListener("error", () =>
        reject(new Error("No se pudo cargar la librería PDF."))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = PDF_LIBRARY_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.sakiaraPdf = "true";
    script.onload = () => resolve(window.html2pdf);
    script.onerror = () =>
      reject(new Error("No se pudo cargar la librería PDF."));
    document.head.appendChild(script);
  });

  return html2PdfLoaderPromise;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildReportBarChartMarkup = ({
  title,
  items,
  formatter = (value) => String(value),
}) => {
  const safeItems = items.filter((item) => Number.isFinite(item.value));
  const maxValue = Math.max(...safeItems.map((item) => item.value), 1);

  return `
    <section class="pdf-chart-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="pdf-chart-bars">
        ${safeItems
          .map(
            (item) => `
              <div class="pdf-chart-item">
                <div class="pdf-chart-bar-wrap">
                  <div class="pdf-chart-bar" style="height:${Math.max(
                    (item.value / maxValue) * 148,
                    16,
                  ).toFixed(1)}px"></div>
                </div>
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(formatter(item.value))}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
};

const buildInstallationReportMarkup = ({
  metrics,
  offers,
  selectedOffer,
  profileLabel,
  profileDescription,
  regionLabel,
  communeLabel,
  climateProfile,
  name,
  phone,
  email,
}) => {
  const selectedBadge = selectedOffer ? " selected" : "";
  const generatedDate = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const reportTitle = selectedOffer
    ? `Informe preliminar · ${selectedOffer.title}`
    : "Informe preliminar de cotización solar";

  const alternativesMarkup = offers
    .map(
      (offer) => `
        <article class="pdf-offer-card${
          selectedOffer?.key === offer.key ? " is-selected" : ""
        }">
          <div class="pdf-offer-top">
            <div>
              <div class="pdf-offer-badge">${escapeHtml(offer.badge)}</div>
              <h4>${escapeHtml(offer.title)}</h4>
              <p>${escapeHtml(offer.subtitle)}</p>
            </div>
            ${
              selectedOffer?.key === offer.key
                ? '<div class="pdf-selected-tag">Seleccionada</div>'
                : ""
            }
          </div>
          <div class="pdf-offer-grid">
            <div><span>Valor</span><strong>${escapeHtml(offer.price)}</strong></div>
            <div><span>Ahorro</span><strong>${escapeHtml(offer.savings)}</strong></div>
            <div><span>Compensación</span><strong>${escapeHtml(offer.compensation)}</strong></div>
            <div><span>Retorno</span><strong>${escapeHtml(offer.payback)}</strong></div>
          </div>
        </article>
      `,
    )
    .join("");

  const generationChart = buildReportBarChartMarkup({
    title: "Generación mensual estimada por temporada",
    items: [
      { label: "Invierno", value: metrics.winterGenerationKWh },
      { label: "Promedio", value: metrics.monthlyGenerationKWh },
      { label: "Verano", value: metrics.summerGenerationKWh },
    ],
    formatter: (value) => `${formatNumber(value, 0)} kWh`,
  });

  const compensationChart = buildReportBarChartMarkup({
    title: "Compensación estimada de la cuenta",
    items: [
      { label: "Invierno", value: metrics.winterCompensationNoBattery },
      { label: "Promedio", value: metrics.compensationNoBattery },
      { label: "Verano", value: metrics.summerCompensationNoBattery },
    ],
    formatter: (value) => `${formatNumber(value, 0)}%`,
  });

  const profileChart = buildReportBarChartMarkup({
    title: "Perfil de consumo declarado",
    items: [
      { label: "AM", value: metrics.profileDistribution.morning },
      { label: "Día", value: metrics.profileDistribution.day },
      { label: "PM", value: metrics.profileDistribution.night },
    ],
    formatter: (value) => `${formatNumber(value, 0)}%`,
  });

  return `
    <div class="pdf-page">
      <header class="pdf-header">
        <div>
          <div class="pdf-kicker">Sakiara Solar · Informe autogenerado</div>
          <h1>${escapeHtml(reportTitle)}</h1>
          <p class="pdf-subtitle">
            Evaluación preliminar para ${escapeHtml(communeLabel)}, ${escapeHtml(regionLabel)}.
            Documento referencial generado desde el cotizador web.
          </p>
        </div>
        <div class="pdf-brand-card${selectedBadge}">
          <img src="${escapeHtml(sakiaraLogo)}" alt="Sakiara Solar" />
          <div>
            <strong>Sakiara Solar</strong>
            <span>Ejecutamos proyectos, desarrollamos inversiones.</span>
          </div>
        </div>
      </header>

      <section class="pdf-grid pdf-grid--summary">
        <article class="pdf-card">
          <span>Cliente</span>
          <strong>${escapeHtml(name || "Por completar")}</strong>
          <small>${escapeHtml(phone || "-")} · ${escapeHtml(email || "-")}</small>
        </article>
        <article class="pdf-card">
          <span>Proyecto sugerido</span>
          <strong>${escapeHtml(formatNumber(metrics.estimatedPanels))} paneles</strong>
          <small>${escapeHtml(formatNumber(metrics.estimatedSystemSizeKwp, 1))} kWp estimados</small>
        </article>
        <article class="pdf-card">
          <span>Objetivo</span>
          <strong>${escapeHtml(metrics.coverageObjectiveLabel)}</strong>
          <small>${escapeHtml(metrics.coverageObjectiveHint)}</small>
        </article>
        <article class="pdf-card">
          <span>Generado</span>
          <strong>${escapeHtml(generatedDate)}</strong>
          <small>Base comercial inicial para revisión.</small>
        </article>
      </section>

      <section class="pdf-section">
        <div class="pdf-section-head">
          <h2>Resumen técnico-comercial</h2>
          <p>Valores orientativos con IVA incluido y supuestos de generación estacional.</p>
        </div>
        <div class="pdf-grid pdf-grid--metrics">
          <article class="pdf-card">
            <span>Boleta evaluada</span>
            <strong>${escapeHtml(formatCLP(metrics.monthlyBill))}</strong>
            <small>Consumo ${escapeHtml(formatNumber(metrics.monthlyConsumptionKWh, 0))} kWh/mes</small>
          </article>
          <article class="pdf-card">
            <span>Compensación invierno</span>
            <strong>${escapeHtml(formatNumber(metrics.winterCompensationNoBattery, 0))}%</strong>
            <small>Sin batería</small>
          </article>
          <article class="pdf-card">
            <span>Compensación verano</span>
            <strong>${escapeHtml(formatNumber(metrics.summerCompensationNoBattery, 0))}%</strong>
            <small>Sin batería</small>
          </article>
          <article class="pdf-card">
            <span>Ahorro mensual referencial</span>
            <strong>${escapeHtml(formatCLP(metrics.monthlySavingsNoBattery))}</strong>
            <small>Línea base sin batería</small>
          </article>
        </div>
      </section>

      <section class="pdf-section">
        <div class="pdf-section-head">
          <h2>Gráficos de generación y cobertura</h2>
          <p>Se muestran valores estimados por temporada según ubicación y perfil de consumo.</p>
        </div>
        <div class="pdf-charts-grid">
          ${generationChart}
          ${compensationChart}
          ${profileChart}
        </div>
      </section>

      <section class="pdf-section">
        <div class="pdf-section-head">
          <h2>Datos meteorológicos y solares referenciales</h2>
          <p>Lectura climática inicial para comunicar estacionalidad y credibilidad del proyecto.</p>
        </div>
        <div class="pdf-grid pdf-grid--climate">
          <article class="pdf-card">
            <span>Factor solar promedio</span>
            <strong>${escapeHtml(formatNumber(metrics.annualProductionFactor, 0))} kWh/kWp/mes</strong>
            <small>Promedio anual referencial</small>
          </article>
          <article class="pdf-card">
            <span>Factor solar invierno</span>
            <strong>${escapeHtml(formatNumber(metrics.winterProductionFactor, 0))} kWh/kWp/mes</strong>
            <small>Meses más exigentes</small>
          </article>
          <article class="pdf-card">
            <span>Factor solar verano</span>
            <strong>${escapeHtml(formatNumber(metrics.summerProductionFactor, 0))} kWh/kWp/mes</strong>
            <small>Meses de mayor producción</small>
          </article>
          <article class="pdf-card">
            <span>Temperatura estival</span>
            <strong>${escapeHtml(formatNumber(climateProfile.summerTemp, 0))} °C</strong>
            <small>Promedio ambiente referencial</small>
          </article>
          <article class="pdf-card">
            <span>Temperatura invernal</span>
            <strong>${escapeHtml(formatNumber(climateProfile.winterTemp, 0))} °C</strong>
            <small>Promedio ambiente referencial</small>
          </article>
          <article class="pdf-card">
            <span>Nubosidad referencial</span>
            <strong>${escapeHtml(formatNumber(climateProfile.cloudiness, 0))}%</strong>
            <small>Cobertura media estimada</small>
          </article>
          <article class="pdf-card">
            <span>Horas de sol útiles</span>
            <strong>${escapeHtml(formatNumber(climateProfile.sunHours, 1))} h/día</strong>
            <small>Promedio anual orientativo</small>
          </article>
          <article class="pdf-card">
            <span>Lectura estacional</span>
            <strong>${escapeHtml(climateProfile.rainfall)}</strong>
            <small>${escapeHtml(climateProfile.seasonality)}</small>
          </article>
        </div>
      </section>

      <section class="pdf-section">
        <div class="pdf-section-head">
          <h2>Alternativas evaluadas</h2>
          <p>Comparación resumida de las líneas ofertadas para este caso.</p>
        </div>
        <div class="pdf-offer-stack">
          ${alternativesMarkup}
        </div>
      </section>

      <section class="pdf-section">
        <div class="pdf-section-head">
          <h2>Perfil y supuestos de diseño</h2>
        </div>
        <div class="pdf-note">
          <strong>Perfil del hogar:</strong> ${escapeHtml(profileLabel)}. ${escapeHtml(profileDescription)}
        </div>
        <div class="pdf-note">
          <strong>Ubicación evaluada:</strong> ${escapeHtml(regionLabel)} · ${escapeHtml(communeLabel)}.
          <br />
          <strong>Nota técnica:</strong> ${escapeHtml(metrics.projectExecutionNote)}
          <br />
          <strong>Descargo:</strong> Este documento es referencial y se ajusta con visita técnica,
          ingeniería de detalle, tablero disponible, trazado efectivo, sombras y condiciones reales del sitio.
        </div>
      </section>

      <footer class="pdf-footer">
        <strong>Sakiara Solar</strong>
        <span>Contacto: ${escapeHtml(contactEmail)} · +56 9 7580 7224</span>
        <span>sakiarainversiones.com</span>
      </footer>
    </div>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: #3d3d43;
        background: #f7f7f8;
      }
      .pdf-page {
        width: 210mm;
        min-height: 297mm;
        padding: 14mm;
        background: #ffffff;
      }
      .pdf-header,
      .pdf-section-head,
      .pdf-offer-top,
      .pdf-brand-card,
      .pdf-grid,
      .pdf-offer-grid,
      .pdf-footer {
        display: flex;
      }
      .pdf-header,
      .pdf-section-head,
      .pdf-offer-top,
      .pdf-footer {
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      }
      .pdf-kicker {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: #8b8b93;
        margin-bottom: 8px;
      }
      h1 {
        margin: 0;
        font-size: 26px;
        line-height: 1.1;
        color: #55555b;
      }
      .pdf-subtitle {
        margin: 10px 0 0;
        font-size: 13px;
        line-height: 1.6;
        max-width: 470px;
      }
      .pdf-brand-card {
        min-width: 210px;
        align-items: center;
        gap: 12px;
        padding: 14px;
        border-radius: 18px;
        background: rgba(241, 212, 51, 0.14);
        border: 1px solid rgba(241, 212, 51, 0.4);
      }
      .pdf-brand-card img {
        width: 52px;
        height: 52px;
        object-fit: cover;
        border-radius: 12px;
      }
      .pdf-brand-card strong,
      .pdf-brand-card span {
        display: block;
      }
      .pdf-brand-card strong {
        font-size: 14px;
      }
      .pdf-brand-card span {
        margin-top: 4px;
        font-size: 11px;
        line-height: 1.5;
      }
      .pdf-section {
        margin-top: 18px;
      }
      .pdf-section-head h2 {
        margin: 0;
        font-size: 18px;
        color: #55555b;
      }
      .pdf-section-head p {
        margin: 0;
        max-width: 320px;
        font-size: 11px;
        line-height: 1.6;
        text-align: right;
        color: #8b8b93;
      }
      .pdf-grid {
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 12px;
      }
      .pdf-grid--summary .pdf-card { width: calc(25% - 8px); }
      .pdf-grid--metrics .pdf-card { width: calc(25% - 8px); }
      .pdf-grid--climate .pdf-card { width: calc(25% - 8px); }
      .pdf-card {
        min-height: 84px;
        padding: 14px;
        border-radius: 16px;
        background: #f6f6f7;
        border: 1px solid rgba(85, 85, 91, 0.08);
      }
      .pdf-card span {
        display: block;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #8b8b93;
      }
      .pdf-card strong {
        display: block;
        margin-top: 10px;
        font-size: 18px;
        line-height: 1.2;
        color: #55555b;
      }
      .pdf-card small {
        display: block;
        margin-top: 8px;
        font-size: 11px;
        line-height: 1.5;
        color: #6d6d74;
      }
      .pdf-charts-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 12px;
      }
      .pdf-chart-card {
        border-radius: 18px;
        background: #f8f8f9;
        border: 1px solid rgba(85, 85, 91, 0.08);
        padding: 14px;
      }
      .pdf-chart-card h3 {
        margin: 0 0 14px;
        font-size: 14px;
        line-height: 1.4;
        color: #55555b;
      }
      .pdf-chart-bars {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        align-items: end;
        min-height: 190px;
      }
      .pdf-chart-item {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        text-align: center;
      }
      .pdf-chart-bar-wrap {
        width: 100%;
        height: 150px;
        display: flex;
        align-items: end;
      }
      .pdf-chart-bar {
        width: 100%;
        border-radius: 14px 14px 8px 8px;
        background: linear-gradient(180deg, #f1d433 0%, #d7aa1b 100%);
      }
      .pdf-chart-item strong {
        margin-top: 10px;
        font-size: 11px;
      }
      .pdf-chart-item span {
        margin-top: 4px;
        font-size: 10px;
        color: #6d6d74;
      }
      .pdf-offer-stack {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }
      .pdf-offer-card {
        padding: 14px;
        border-radius: 18px;
        border: 1px solid rgba(85, 85, 91, 0.1);
        background: #ffffff;
      }
      .pdf-offer-card.is-selected {
        border-color: rgba(241, 212, 51, 0.7);
        box-shadow: inset 0 0 0 1px rgba(241, 212, 51, 0.25);
        background: rgba(241, 212, 51, 0.08);
      }
      .pdf-offer-badge,
      .pdf-selected-tag {
        display: inline-flex;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(85, 85, 91, 0.08);
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #66666b;
      }
      .pdf-selected-tag {
        background: rgba(241, 212, 51, 0.2);
      }
      .pdf-offer-card h4 {
        margin: 10px 0 0;
        font-size: 16px;
      }
      .pdf-offer-card p {
        margin: 6px 0 0;
        font-size: 11px;
        line-height: 1.5;
        color: #6d6d74;
      }
      .pdf-offer-grid {
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      .pdf-offer-grid > div {
        width: calc(25% - 6px);
        padding: 10px;
        border-radius: 14px;
        background: #f7f7f8;
      }
      .pdf-offer-grid span {
        display: block;
        font-size: 10px;
        color: #8b8b93;
      }
      .pdf-offer-grid strong {
        display: block;
        margin-top: 8px;
        font-size: 14px;
      }
      .pdf-note {
        margin-top: 12px;
        border-radius: 16px;
        padding: 14px;
        background: rgba(241, 212, 51, 0.12);
        border: 1px solid rgba(241, 212, 51, 0.35);
        font-size: 12px;
        line-height: 1.7;
      }
      .pdf-footer {
        margin-top: 18px;
        padding-top: 12px;
        border-top: 1px solid rgba(85, 85, 91, 0.12);
        font-size: 11px;
        line-height: 1.6;
        color: #6d6d74;
      }
      .pdf-footer strong,
      .pdf-footer span {
        display: block;
      }
    </style>
  `;
};

export default function SakiaraLandingPage() {
  const [activeView, setActiveView] = useState(() =>
    getViewFromPath(
      typeof window !== "undefined" ? window.location.pathname : "/",
    ),
  );

  const [installationInputMode, setInstallationInputMode] =
    useState("combined");
  const [coverageGoalMode, setCoverageGoalMode] = useState("optimized");
  const [winterCoverageTargetPercent, setWinterCoverageTargetPercent] = useState(50);
  const [summerCoverageTargetPercent, setSummerCoverageTargetPercent] = useState(80);
  const [monthlyBillInput, setMonthlyBillInput] = useState("250000");
  const [billConsumptionInput, setBillConsumptionInput] = useState("900");
  const [installationRegion, setInstallationRegion] = useState("metropolitana");
  const [installationCommune, setInstallationCommune] = useState("colina");
  const [installationStep, setInstallationStep] = useState(1);
  const [expandedInstallationOffer, setExpandedInstallationOffer] =
    useState("huaweiNoBattery");
  const [selectedInstallationOffer, setSelectedInstallationOffer] =
    useState("");
  const [profile, setProfile] = useState("outside");

  const [maintenanceSystemSizeInput, setMaintenanceSystemSizeInput] =
    useState("8");
  const [maintenanceMonthlySavingsInput, setMaintenanceMonthlySavingsInput] =
    useState("120000");
  const [maintenanceRegion, setMaintenanceRegion] = useState("metropolitana");
  const [maintenanceCommune, setMaintenanceCommune] = useState("colina");
  const [maintenanceVisitsPerYear, setMaintenanceVisitsPerYear] = useState(1);
  const [maintenanceStep, setMaintenanceStep] = useState(1);

  const [logoHidden, setLogoHidden] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const selectedProfile = profileMap[profile];
  const selectedInstallationRegion =
    maintenanceRegionData[installationRegion] ||
    maintenanceRegionData.metropolitana;
  const installationCommuneOptions = useMemo(
    () =>
      Object.entries(selectedInstallationRegion.communes)
        .map(([value, config]) => ({ value, label: config.label }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [selectedInstallationRegion],
  );
  const fallbackInstallationCommuneKey =
    installationCommuneOptions[0]?.value || "colina";
  const selectedInstallationCommune =
    selectedInstallationRegion.communes[installationCommune] ||
    selectedInstallationRegion.communes[fallbackInstallationCommuneKey];
  const installationSolarProfile = useMemo(
    () => getSolarProductionProfile(installationRegion, installationCommune),
    [installationRegion, installationCommune],
  );
  const installationLogisticsMetrics = useMemo(
    () => getInstallationProjectLogistics(selectedInstallationCommune),
    [selectedInstallationCommune],
  );
  const climateReferenceProfile = useMemo(
    () => getClimateReferenceProfile(installationRegion),
    [installationRegion],
  );

  const selectedMaintenanceRegion =
    maintenanceRegionData[maintenanceRegion] ||
    maintenanceRegionData.metropolitana;
  const maintenanceCommuneOptions = useMemo(
    () =>
      Object.entries(selectedMaintenanceRegion.communes)
        .map(([value, config]) => ({ value, label: config.label }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [selectedMaintenanceRegion],
  );
  const fallbackMaintenanceCommuneKey =
    maintenanceCommuneOptions[0]?.value || "colina";
  const selectedMaintenanceCommune =
    selectedMaintenanceRegion.communes[maintenanceCommune] ||
    selectedMaintenanceRegion.communes[fallbackMaintenanceCommuneKey];

  const maintenanceSystemSize = Number(maintenanceSystemSizeInput || 0);
  const maintenanceMonthlySavings = Number(maintenanceMonthlySavingsInput || 0);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handlePopState = () => {
      setActiveView(getViewFromPath(window.location.pathname));
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const seoConfig = getSeoConfig(
      activeView,
      window.location.origin || SITE_FALLBACK_URL,
    );

    document.title = seoConfig.title;
    ensureMetaTag("name", "description", seoConfig.description);
    ensureMetaTag("name", "robots", "index, follow, max-image-preview:large");
    ensureMetaTag("property", "og:type", "website");
    ensureMetaTag("property", "og:locale", "es_CL");
    ensureMetaTag("property", "og:site_name", "Sakiara Solar");
    ensureMetaTag("property", "og:title", seoConfig.title);
    ensureMetaTag("property", "og:description", seoConfig.description);
    ensureMetaTag("property", "og:url", seoConfig.canonical);
    ensureMetaTag("property", "og:image", seoConfig.image);
    ensureMetaTag("name", "twitter:card", "summary_large_image");
    ensureMetaTag("name", "twitter:title", seoConfig.title);
    ensureMetaTag("name", "twitter:description", seoConfig.description);
    ensureMetaTag("name", "twitter:image", seoConfig.image);
    ensureLinkTag("canonical", seoConfig.canonical);
    ensureJsonLdScript("sakiara-structured-data", seoConfig.structuredData);

    const desiredPath = seoConfig.path;
    if (window.location.pathname !== desiredPath) {
      window.history.replaceState({ view: activeView }, "", desiredPath);
    }
  }, [activeView]);

  const installationMetrics = useMemo(() => {
    const vatMultiplier = 1.19;

    const moduleSellPerPanel = 79610.79168509509;
    const huaweiInverterNet = 823740.8226448474;
    const solisInverterNet = 1318842.105263158;
    const laborNet = 700000;
    const certSecNet = 500000;
    const workbookBaseLogisticsNet = 250000;
    const ccCablingNet = 418534.8606811147;
    const acBoardNet = 211518.20728291315;
    const structureBlockNet = 85536.55904467049;
    const huaweiSmartPowerSensorNet = 56208.757187085364;
    const huaweiBatteryPackNet = 2854046.8819106594;
    const solisBatteryPackNet = 1678947.3684210528;

    const enteredMonthlyBill = Number(monthlyBillInput || 0);
    const enteredMonthlyConsumptionKWh = Number(billConsumptionInput || 0);
    const hasBill = enteredMonthlyBill > 0;
    const hasConsumption = enteredMonthlyConsumptionKWh > 0;

    let normalizedMonthlyBill = enteredMonthlyBill;
    let monthlyConsumptionKWh = enteredMonthlyConsumptionKWh;
    let derivedTariff = REFERENCE_TARIFF_CLP_PER_KWH;
    let modeSummaryLabel =
      installationInputModeOptions[installationInputMode].label;
    let modeSummaryHint =
      installationInputModeOptions[installationInputMode].helper;

    if (installationInputMode === "bill") {
      normalizedMonthlyBill = hasBill ? enteredMonthlyBill : 250000;
      monthlyConsumptionKWh = Math.max(
        normalizedMonthlyBill / REFERENCE_TARIFF_CLP_PER_KWH,
        1,
      );
      derivedTariff = REFERENCE_TARIFF_CLP_PER_KWH;
      if (!hasBill) {
        modeSummaryHint =
          "Ingresa el valor de tu boleta y estimaremos el consumo con una tarifa referencial.";
      }
    } else if (installationInputMode === "consumption") {
      monthlyConsumptionKWh = hasConsumption
        ? enteredMonthlyConsumptionKWh
        : 900;
      normalizedMonthlyBill =
        monthlyConsumptionKWh * REFERENCE_TARIFF_CLP_PER_KWH;
      derivedTariff = REFERENCE_TARIFF_CLP_PER_KWH;
      if (!hasConsumption) {
        modeSummaryHint =
          "Ingresa tu consumo mensual y estimaremos una boleta referencial para proyectar la inversión.";
      }
    } else if (hasBill && hasConsumption) {
      normalizedMonthlyBill = enteredMonthlyBill;
      monthlyConsumptionKWh = enteredMonthlyConsumptionKWh;
      derivedTariff =
        normalizedMonthlyBill / Math.max(monthlyConsumptionKWh, 1);
    } else if (hasBill) {
      normalizedMonthlyBill = enteredMonthlyBill;
      monthlyConsumptionKWh = Math.max(
        normalizedMonthlyBill / REFERENCE_TARIFF_CLP_PER_KWH,
        1,
      );
      derivedTariff = REFERENCE_TARIFF_CLP_PER_KWH;
      modeSummaryHint =
        "Se completó el cálculo con una tarifa referencial, porque solo se ingresó la boleta.";
    } else if (hasConsumption) {
      monthlyConsumptionKWh = enteredMonthlyConsumptionKWh;
      normalizedMonthlyBill =
        monthlyConsumptionKWh * REFERENCE_TARIFF_CLP_PER_KWH;
      derivedTariff = REFERENCE_TARIFF_CLP_PER_KWH;
      modeSummaryHint =
        "Se completó el cálculo con una tarifa referencial, porque solo se ingresó el consumo.";
    } else {
      normalizedMonthlyBill = 250000;
      monthlyConsumptionKWh = 900;
      derivedTariff = normalizedMonthlyBill / monthlyConsumptionKWh;
      modeSummaryHint =
        "Puedes cotizar con tu boleta, con tu consumo o con ambos datos.";
    }

    const exportRate = derivedTariff * 0.55;
    const annualProductionFactor = installationSolarProfile.annual;
    const winterProductionFactor = installationSolarProfile.winter;
    const summerProductionFactor = installationSolarProfile.summer;
    const isWinterGoal = coverageGoalMode === "winter";
    const isSeasonalGoal = coverageGoalMode === "seasonal";

    const dayEquivalentUse =
      selectedProfile.day +
      selectedProfile.morning * 0.35 +
      selectedProfile.night * 0.08;

    const selfConsumptionNoBatteryRate = clamp(
      0.48 + dayEquivalentUse * 0.0068,
      0.58,
      0.84,
    );
    const selfConsumptionWithBatteryRate = clamp(
      selfConsumptionNoBatteryRate + 0.18,
      0.72,
      0.97,
    );

    const effectiveValuePerGeneratedKWhNoBattery =
      selfConsumptionNoBatteryRate * derivedTariff +
      (1 - selfConsumptionNoBatteryRate) * exportRate;
    const effectiveValuePerGeneratedKWhWithBattery =
      selfConsumptionWithBatteryRate * derivedTariff +
      (1 - selfConsumptionWithBatteryRate) * exportRate;

    const recommendedCoverageRatio = clamp(
      0.82 + dayEquivalentUse * 0.002,
      0.84,
      0.98,
    );

    const winterTargetCompensationRatio = winterCoverageTargetPercent / 100;
    const summerTargetCompensationRatio = summerCoverageTargetPercent / 100;

    const requiredGenerationForOptimizedSizing =
      (normalizedMonthlyBill * recommendedCoverageRatio) /
      Math.max(effectiveValuePerGeneratedKWhNoBattery, 1);

    const requiredGenerationForWinterGoal =
      (normalizedMonthlyBill * winterTargetCompensationRatio) /
      Math.max(effectiveValuePerGeneratedKWhNoBattery, 1);

    const requiredGenerationForSummerGoal =
      (normalizedMonthlyBill * summerTargetCompensationRatio) /
      Math.max(effectiveValuePerGeneratedKWhNoBattery, 1);

    const optimizedSystemSizeKwp = clamp(
      requiredGenerationForOptimizedSizing /
        Math.max(annualProductionFactor, 1),
      2.2,
      30,
    );

    const winterGoalSystemSizeKwp = clamp(
      requiredGenerationForWinterGoal /
        Math.max(winterProductionFactor, 1),
      2.2,
      30,
    );

    const summerGoalSystemSizeKwp = clamp(
      requiredGenerationForSummerGoal /
        Math.max(summerProductionFactor, 1),
      2.2,
      30,
    );

    const seasonalGoalSystemSizeKwp = Math.max(
      winterGoalSystemSizeKwp,
      summerGoalSystemSizeKwp,
    );

    const chosenSystemSizeKwp = isWinterGoal
      ? winterGoalSystemSizeKwp
      : isSeasonalGoal
        ? seasonalGoalSystemSizeKwp
        : optimizedSystemSizeKwp;

    const estimatedPanels = Math.max(
      4,
      Math.ceil(chosenSystemSizeKwp / PANEL_POWER_KW),
    );
    const estimatedSystemSizeKwp = estimatedPanels * PANEL_POWER_KW;
    const winterGoalPanels = Math.max(
      4,
      Math.ceil(winterGoalSystemSizeKwp / PANEL_POWER_KW),
    );
    const summerGoalPanels = Math.max(
      4,
      Math.ceil(summerGoalSystemSizeKwp / PANEL_POWER_KW),
    );
    const seasonalGoalPanels = Math.max(winterGoalPanels, summerGoalPanels);
    const winterGoalSystemSizeRoundedKwp = winterGoalPanels * PANEL_POWER_KW;
    const summerGoalSystemSizeRoundedKwp = summerGoalPanels * PANEL_POWER_KW;
    const additionalPanelsForWinter = Math.max(
      winterGoalPanels - estimatedPanels,
      0,
    );
    const structureBlocks = Math.max(1, Math.ceil(estimatedPanels / 4));

    const monthlyGenerationKWh = estimatedSystemSizeKwp * annualProductionFactor;
    const winterGenerationKWh = estimatedSystemSizeKwp * winterProductionFactor;
    const summerGenerationKWh = estimatedSystemSizeKwp * summerProductionFactor;

    const selfConsumedNoBattery = Math.min(
      monthlyGenerationKWh * selfConsumptionNoBatteryRate,
      monthlyConsumptionKWh,
    );
    const exportedNoBattery = Math.max(
      monthlyGenerationKWh - selfConsumedNoBattery,
      0,
    );
    const selfConsumptionValueNoBattery = selfConsumedNoBattery * derivedTariff;
    const injectionCreditNoBattery = exportedNoBattery * exportRate;
    const monthlySavingsNoBattery =
      selfConsumptionValueNoBattery + injectionCreditNoBattery;
    const annualSavingsNoBattery = monthlySavingsNoBattery * 12;

    const winterSelfConsumedNoBattery = Math.min(
      winterGenerationKWh * selfConsumptionNoBatteryRate,
      monthlyConsumptionKWh,
    );
    const winterExportedNoBattery = Math.max(
      winterGenerationKWh - winterSelfConsumedNoBattery,
      0,
    );
    const winterMonthlySavingsNoBattery =
      winterSelfConsumedNoBattery * derivedTariff +
      winterExportedNoBattery * exportRate;

    const summerSelfConsumedNoBattery = Math.min(
      summerGenerationKWh * selfConsumptionNoBatteryRate,
      monthlyConsumptionKWh,
    );
    const summerExportedNoBattery = Math.max(
      summerGenerationKWh - summerSelfConsumedNoBattery,
      0,
    );
    const summerMonthlySavingsNoBattery =
      summerSelfConsumedNoBattery * derivedTariff +
      summerExportedNoBattery * exportRate;

    const selfConsumedWithBattery = Math.min(
      monthlyGenerationKWh * selfConsumptionWithBatteryRate,
      monthlyConsumptionKWh,
    );
    const exportedWithBattery = Math.max(
      monthlyGenerationKWh - selfConsumedWithBattery,
      0,
    );
    const selfConsumptionValueWithBattery =
      selfConsumedWithBattery * derivedTariff;
    const injectionCreditWithBattery = exportedWithBattery * exportRate;
    const monthlySavingsWithBattery =
      selfConsumptionValueWithBattery + injectionCreditWithBattery;
    const annualSavingsWithBattery = monthlySavingsWithBattery * 12;

    const winterSelfConsumedWithBattery = Math.min(
      winterGenerationKWh * selfConsumptionWithBatteryRate,
      monthlyConsumptionKWh,
    );
    const winterExportedWithBattery = Math.max(
      winterGenerationKWh - winterSelfConsumedWithBattery,
      0,
    );
    const winterMonthlySavingsWithBattery =
      winterSelfConsumedWithBattery * derivedTariff +
      winterExportedWithBattery * exportRate;

    const summerSelfConsumedWithBattery = Math.min(
      summerGenerationKWh * selfConsumptionWithBatteryRate,
      monthlyConsumptionKWh,
    );
    const summerExportedWithBattery = Math.max(
      summerGenerationKWh - summerSelfConsumedWithBattery,
      0,
    );
    const summerMonthlySavingsWithBattery =
      summerSelfConsumedWithBattery * derivedTariff +
      summerExportedWithBattery * exportRate;

    const fixedLogisticsNet = Math.max(
      workbookBaseLogisticsNet,
      installationLogisticsMetrics.logisticsTotal,
    );

    const commonBaseNet =
      estimatedPanels * moduleSellPerPanel +
      laborNet +
      fixedLogisticsNet +
      ccCablingNet +
      acBoardNet +
      certSecNet +
      structureBlocks * structureBlockNet;

    const projectCostHuaweiNoBatteryGross =
      (commonBaseNet + huaweiInverterNet + huaweiSmartPowerSensorNet) *
      vatMultiplier;
    const projectCostSolisNoBatteryGross =
      (commonBaseNet + solisInverterNet) * vatMultiplier;

    const projectCostHuaweiWithBatteryGross =
      (commonBaseNet +
        huaweiInverterNet +
        huaweiSmartPowerSensorNet +
        huaweiBatteryPackNet) *
      vatMultiplier;
    const projectCostSolisWithBatteryGross =
      (commonBaseNet + solisInverterNet + solisBatteryPackNet) *
      vatMultiplier;

    const compensationNoBattery = clamp(
      (monthlySavingsNoBattery / Math.max(normalizedMonthlyBill, 1)) * 100,
      0,
      100,
    );
    const compensationWithBattery = clamp(
      (monthlySavingsWithBattery / Math.max(normalizedMonthlyBill, 1)) * 100,
      0,
      100,
    );
    const winterCompensationNoBattery = clamp(
      (winterMonthlySavingsNoBattery / Math.max(normalizedMonthlyBill, 1)) * 100,
      0,
      100,
    );
    const winterCompensationWithBattery = clamp(
      (winterMonthlySavingsWithBattery / Math.max(normalizedMonthlyBill, 1)) * 100,
      0,
      100,
    );
    const summerCompensationNoBattery = clamp(
      (summerMonthlySavingsNoBattery / Math.max(normalizedMonthlyBill, 1)) * 100,
      0,
      100,
    );
    const summerCompensationWithBattery = clamp(
      (summerMonthlySavingsWithBattery / Math.max(normalizedMonthlyBill, 1)) * 100,
      0,
      100,
    );

    const projectExecutionNote = installationLogisticsMetrics.isRemoteProject
      ? "La propuesta considera una base residencial referencial y puede ajustarse según evaluación técnica, alcance real del proyecto y validación final del sitio."
      : "La propuesta considera una base residencial referencial y puede ajustarse según evaluación técnica y validación final del sitio.";

    const coverageObjectiveLabel = isWinterGoal
      ? `Cobertura invernal objetivo ${formatNumber(winterCoverageTargetPercent)}%`
      : isSeasonalGoal
        ? `Cobertura estacional · Invierno ${formatNumber(winterCoverageTargetPercent)}% / Verano ${formatNumber(summerCoverageTargetPercent)}%`
        : "Compensación optimizada";

    const coverageObjectiveHint = isWinterGoal
      ? `Se dimensiona con un factor de producción invernal para apuntar a una compensación de la cuenta cercana al ${formatNumber(winterCoverageTargetPercent)}% en los meses más exigentes.`
      : isSeasonalGoal
        ? `Se compara el objetivo de invierno y verano, y se usa el escenario más exigente para definir la cantidad final de paneles.`
        : "Se dimensiona buscando una compensación alta con una inversión más contenida en meses promedio.";

    return {
      monthlyBill: normalizedMonthlyBill,
      monthlyConsumptionKWh,
      derivedTariff,
      modeSummaryLabel,
      modeSummaryHint,
      estimatedPanels,
      estimatedSystemSizeKwp,
      structureBlocks,
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
      winterCompensationNoBattery,
      winterCompensationWithBattery,
      summerCompensationNoBattery,
      summerCompensationWithBattery,
      paybackHuaweiNoBattery:
        projectCostHuaweiNoBatteryGross / Math.max(annualSavingsNoBattery, 1),
      paybackHuaweiWithBattery:
        projectCostHuaweiWithBatteryGross /
        Math.max(annualSavingsWithBattery, 1),
      paybackSolisNoBattery:
        projectCostSolisNoBatteryGross / Math.max(annualSavingsNoBattery, 1),
      paybackSolisWithBattery:
        projectCostSolisWithBatteryGross /
        Math.max(annualSavingsWithBattery, 1),
      locationLabel: `${selectedInstallationRegion.label} · ${selectedInstallationCommune.label}`,
      logisticsTotal: fixedLogisticsNet,
      projectExecutionNote,
      annualProductionFactor,
      winterProductionFactor,
      summerProductionFactor,
      monthlyGenerationKWh,
      winterGenerationKWh,
      summerGenerationKWh,
      selfConsumptionNoBatteryRate,
      selfConsumptionWithBatteryRate,
      effectiveValuePerGeneratedKWhNoBattery,
      effectiveValuePerGeneratedKWhWithBattery,
      recommendedCoverageRatio,
      winterTargetCompensationRatio,
      summerTargetCompensationRatio,
      coverageObjectiveLabel,
      coverageObjectiveHint,
      coverageGoalMode,
      winterCoverageTargetPercent,
      summerCoverageTargetPercent,
      winterGoalPanels,
      summerGoalPanels,
      seasonalGoalPanels,
      winterGoalSystemSizeKwp: winterGoalSystemSizeRoundedKwp,
      summerGoalSystemSizeKwp: summerGoalSystemSizeRoundedKwp,
      additionalPanelsForWinter,
      profileDistribution: {
        morning: selectedProfile.morning,
        day: selectedProfile.day,
        night: selectedProfile.night,
      },
      suggestWinterCoverage:
        coverageGoalMode === "optimized" &&
        winterCompensationNoBattery < 99.5 &&
        winterGoalPanels > estimatedPanels,
    };
  }, [
    installationInputMode,
    monthlyBillInput,
    billConsumptionInput,
    installationSolarProfile,
    selectedProfile,
    installationLogisticsMetrics,
    selectedInstallationRegion.label,
    selectedInstallationCommune.label,
    coverageGoalMode,
    winterCoverageTargetPercent,
    summerCoverageTargetPercent,
  ]);

  const maintenanceMetrics = useMemo(() => {
    const annualSavings = Math.max(maintenanceMonthlySavings, 0) * 12;
    const safeBudget = annualSavings * 0.2;
    const protectedValueObjective = annualSavings * 0.3;

    const baseVisitCost =
      maintenanceSystemSize <= 8
        ? 150000
        : 150000 + Math.max(0, maintenanceSystemSize - 8) * 18000;

    const roundTripKm = selectedMaintenanceCommune.roundTripKm;
    const variableMobilityCostPerKm =
      REFERENCE_FUEL_PRICE_CLP_PER_L / VEHICLE_EFFICIENCY_KM_PER_L +
      VEHICLE_WEAR_CLP_PER_KM;
    const internalTravelEstimate =
      roundTripKm * variableMobilityCostPerKm +
      selectedMaintenanceCommune.tolls;

    const travelBlocks = Math.floor(Math.max(roundTripKm, 0) / TRAVEL_BLOCK_KM);
    const commercialTravelFee =
      BASE_TRAVEL_FEE + travelBlocks * TRAVEL_BLOCK_FEE;
    const logisticsPerVisit = Math.max(
      internalTravelEstimate,
      commercialTravelFee,
    );

    const visitCost = baseVisitCost + logisticsPerVisit;
    const annualPlanCost = visitCost * Math.max(maintenanceVisitsPerYear, 1);
    const minimumMonthlySavingsForRule = annualPlanCost / 12 / 0.2;
    const annualCoverageRatio = annualSavings / Math.max(annualPlanCost, 1);
    const safeMargin = safeBudget - annualPlanCost;
    const protectedMargin = protectedValueObjective - annualPlanCost;

    let status = "Recomendable";
    if (
      annualPlanCost > safeBudget &&
      annualPlanCost <= protectedValueObjective
    ) {
      status = "Requiere revisión";
    }
    if (annualPlanCost > protectedValueObjective) {
      status = "Evaluación personalizada";
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
    };
  }, [
    maintenanceMonthlySavings,
    maintenanceSystemSize,
    maintenanceVisitsPerYear,
    selectedMaintenanceCommune,
  ]);

  const goToView = (view) => {
    setActiveView(view);

    if (typeof window !== "undefined") {
      const nextPath = viewPathMap[view] || "/";
      if (window.location.pathname !== nextPath) {
        window.history.pushState({ view }, "", nextPath);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getInstallationSummaryItems = () => {
    const selectedOfferItems = selectedInstallationOfferData
      ? [
          { label: "Alternativa seleccionada", value: selectedInstallationOfferData.title },
          { label: "Inversión referencial", value: selectedInstallationOfferData.price },
          { label: "Ahorro estimado", value: selectedInstallationOfferData.savings },
          {
            label: "Compensación de la cuenta",
            value: selectedInstallationOfferData.compensation,
          },
          { label: "Retorno estimado", value: selectedInstallationOfferData.payback },
        ]
      : [{ label: "Alternativa seleccionada", value: "Pendiente de selección" }];

    return [
      { label: "Servicio", value: "Cotización de instalación fotovoltaica" },
      { label: "Modalidad", value: installationMetrics.modeSummaryLabel },
      {
        label: "Monto boleta",
        value: formatCLP(installationMetrics.monthlyBill),
      },
      {
        label: "Consumo mensual",
        value: `${formatNumber(installationMetrics.monthlyConsumptionKWh)} kWh/mes`,
      },
      { label: "Ubicación", value: installationMetrics.locationLabel },
      { label: "Perfil", value: selectedProfile.label },
      {
        label: "Objetivo de cobertura",
        value: installationMetrics.coverageObjectiveLabel,
      },
      {
        label: "Proyecto sugerido",
        value: `${formatNumber(installationMetrics.estimatedPanels)} paneles referenciales`,
      },
      {
        label: "Cobertura invierno estimada",
        value: `${formatNumber(installationMetrics.winterCompensationNoBattery)}%`,
      },
      {
        label: "Cobertura verano estimada",
        value: `${formatNumber(installationMetrics.summerCompensationNoBattery)}%`,
      },
      ...selectedOfferItems,
    ];
  };

  const getMaintenanceSummaryItems = () => [
    { label: "Servicio", value: "Cotización de mantenimiento fotovoltaico" },
    {
      label: "Potencia del sistema en kW",
      value: `${formatNumber(maintenanceSystemSize, 1)} kW`,
    },
    {
      label: "Ahorro mensual actual en pesos",
      value: formatCLP(maintenanceMonthlySavings),
    },
    { label: "Región", value: selectedMaintenanceRegion.label },
    { label: "Comuna", value: selectedMaintenanceCommune.label },
    { label: "Visitas por año", value: formatNumber(maintenanceVisitsPerYear) },
    {
      label: "Valor por visita",
      value: formatCLP(maintenanceMetrics.visitCost),
    },
    {
      label: "Costo anual del plan",
      value: formatCLP(maintenanceMetrics.annualPlanCost),
    },
    {
      label: "Presupuesto recomendado de mantención",
      value: formatCLP(maintenanceMetrics.safeBudget),
    },
    { label: "Resultado", value: maintenanceMetrics.status },
  ];

  const buildInstallationSummaryText = () =>
    getInstallationSummaryItems()
      .map((item) => `${item.label}: ${item.value}`)
      .join("\n");

  const buildMaintenanceSummaryText = () =>
    getMaintenanceSummaryItems()
      .map((item) => `${item.label}: ${item.value}`)
      .join("\n");

  const getSummaryItems = () =>
    activeView === "mantenimiento"
      ? getMaintenanceSummaryItems()
      : getInstallationSummaryItems();

  const buildSummaryText = () =>
    getSummaryItems()
      .map((item) => `${item.label}: ${item.value}`)
      .join("\n");

  const handleWhatsApp = () => {
    const intro =
      activeView === "mantenimiento"
        ? "Hola, quiero evaluar el mantenimiento de mi sistema fotovoltaico."
        : "Hola, quiero cotizar un proyecto fotovoltaico para mi propiedad.";

    const text = encodeURIComponent(
      `${intro}\n\n${buildSummaryText()}\n\nNombre: ${name || "-"}\nTeléfono: ${phone || "-"}\nCorreo: ${email || "-"}\n\nMensaje: ${message || "-"}`,
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
  };


  const handleDownloadInstallationReport = async () => {
    if (typeof window === "undefined") return;

    try {
      const html2pdf = await loadHtml2PdfLibrary();
      const reportContainer = document.createElement("div");
      reportContainer.style.position = "fixed";
      reportContainer.style.left = "-99999px";
      reportContainer.style.top = "0";
      reportContainer.style.width = "210mm";
      reportContainer.innerHTML = buildInstallationReportMarkup({
        metrics: installationMetrics,
        offers: installationOfferOptions,
        selectedOffer: selectedInstallationOfferData,
        profileLabel: selectedProfile.label,
        profileDescription: selectedProfile.description,
        regionLabel: selectedInstallationRegion.label,
        communeLabel: selectedInstallationCommune.label,
        climateProfile: climateReferenceProfile,
        name,
        phone,
        email,
      });
      document.body.appendChild(reportContainer);

      const fileNameBase = `informe-sakiara-${selectedInstallationCommune.label}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: `${fileNameBase || "informe-sakiara"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(reportContainer.firstElementChild)
        .save();

      document.body.removeChild(reportContainer);
    } catch (error) {
      console.error(error);
      window.alert(
        "No se pudo generar el informe PDF en este momento. Intenta nuevamente.",
      );
    }
  };

  const scrollToSection = (sectionId) => {
    if (typeof document === "undefined") return;

    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleFloatingQuote = () => {
    if (activeView === "home") {
      goToView("instalacion");
      return;
    }

    if (activeView === "instalacion") {
      setInstallationStep(5);
      scrollToSection("wizard-instalacion");
      return;
    }

    if (activeView === "mantenimiento") {
      setMaintenanceStep(5);
      scrollToSection("wizard-mantenimiento");
      return;
    }
  };

  const floatingQuoteLabel = "Cotiza ahora";

  const installationSteps = [
    { id: 1, title: "Modalidad", description: "Cómo quieres cotizar" },
    {
      id: 2,
      title: "Ubicación",
      description: "Dónde se desarrollará el proyecto",
    },
    {
      id: 3,
      title: "Perfil",
      description: "Cómo se comporta el consumo del hogar",
    },
    {
      id: 4,
      title: "Resultado",
      description: "Alternativas claras para comparar",
    },
    {
      id: 5,
      title: "Contacto",
      description: "Solicita tu propuesta personalizada",
    },
  ];


  const maintenanceSteps = [
    { id: 1, title: "Sistema", description: "Datos base del sistema" },
    { id: 2, title: "Ubicación", description: "Dónde se encuentra el proyecto" },
    { id: 3, title: "Frecuencia", description: "Cada cuánto mantener el sistema" },
    { id: 4, title: "Resultado", description: "Resumen claro del servicio" },
    { id: 5, title: "Contacto", description: "Solicita tu evaluación personalizada" },
  ];

  const maintenanceNextLabel = "Siguiente";

  const installationOfferOptions = [
    {
      key: "huaweiNoBattery",
      title: "Huawei sin batería",
      subtitle: "Alternativa premium base para una solución on-grid.",
      badge: "Línea Huawei",
      price: formatCLP(installationMetrics.projectCostHuaweiNoBattery),
      savings: formatCLP(installationMetrics.monthlySavingsNoBattery),
      compensation: `${formatNumber(installationMetrics.compensationNoBattery)}%`,
      payback: `${formatNumber(installationMetrics.paybackHuaweiNoBattery, 1)} años`,
      variant: "huawei",
    },
    {
      key: "solisNoBattery",
      title: "Solis sin batería",
      subtitle:
        "Alternativa eficiente para una solución on-grid con otra línea de inversor.",
      badge: "Línea Solis",
      price: formatCLP(installationMetrics.projectCostSolisNoBattery),
      savings: formatCLP(installationMetrics.monthlySavingsNoBattery),
      compensation: `${formatNumber(installationMetrics.compensationNoBattery)}%`,
      payback: `${formatNumber(installationMetrics.paybackSolisNoBattery, 1)} años`,
      variant: "solis",
    },
    {
      key: "huaweiWithBattery",
      title: "Huawei con batería LUNA",
      subtitle:
        "Alternativa híbrida para sumar respaldo y mayor aprovechamiento energético.",
      badge: "Huawei híbrido",
      price: formatCLP(installationMetrics.projectCostHuaweiWithBattery),
      savings: formatCLP(installationMetrics.monthlySavingsWithBattery),
      compensation: `${formatNumber(installationMetrics.compensationWithBattery)}%`,
      payback: `${formatNumber(installationMetrics.paybackHuaweiWithBattery, 1)} años`,
      variant: "hybrid",
    },
    {
      key: "solisWithBattery",
      title: "Solis con batería",
      subtitle:
        "Alternativa híbrida referencial para priorizar respaldo y continuidad operativa.",
      badge: "Solis híbrido",
      price: formatCLP(installationMetrics.projectCostSolisWithBattery),
      savings: formatCLP(installationMetrics.monthlySavingsWithBattery),
      compensation: `${formatNumber(installationMetrics.compensationWithBattery)}%`,
      payback: `${formatNumber(installationMetrics.paybackSolisWithBattery, 1)} años`,
      variant: "solis hybrid",
    },
  ];

  const selectedInstallationOfferData =
    installationOfferOptions.find(
      (offer) => offer.key === selectedInstallationOffer,
    ) || null;
  const canProceedToContact =
    installationStep !== 4 || Boolean(selectedInstallationOfferData);
  const installationNextLabel = "Siguiente";

  const renderHomeView = () => (
    <>
      <section className="hero-banner">
        <div className="hero-banner-image" aria-hidden="true" />
        <div className="hero-banner-inner">
          <div className="hero-banner-copy">
            <p className="hero-kicker">Cotización solar clara y rápida</p>
            <h1 className="hero-banner-title">
              <span>Convierte tu consumo</span>
              <span>en una inversión</span>
            </h1>
            <p className="hero-banner-slogan">
              Ejecutamos proyectos, desarrollamos inversiones.
            </p>
            <p className="hero-banner-text">
              Evalúa instalación o mantenimiento en pocos pasos.
            </p>

            <div className="hero-brand-block">
              <span className="hero-brand-label">
                Tecnologías con las que trabajamos
              </span>

              <div className="hero-brand-row">
                <img
                  className="hero-brand-logo huawei"
                  src="/marcas/huawei.png"
                  alt="Huawei"
                />
                <img
                  className="hero-brand-logo solis"
                  src="/marcas/solis.png"
                  alt="Solis"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-card home-services-wrap">
        <div className="service-grid">
          <div className="service-card">
            <div>
              <div className="offer-badge">Instalación</div>
              <h2 className="service-title">
                Cotizador de instalación fotovoltaica
              </h2>
              <p className="service-text">
                Cotiza con tu boleta, tu consumo o ambos datos.
              </p>
            </div>
            <div className="service-points">
              <div>Ahorro estimado</div>
              <div>Retorno referencial</div>
              <div>Valores IVA incluido</div>
            </div>
            <button
              className="btn-primary"
              type="button"
              onClick={() => goToView("instalacion")}
            >
              Cotizar instalación
            </button>
          </div>

          <div className="service-card highlighted">
            <div>
              <div className="offer-badge">Mantenimiento</div>
              <h2 className="service-title">
                Plan de mantenimiento fotovoltaico
              </h2>
              <p className="service-text">
                Evalúa el estado y cuidado de tu sistema.
              </p>
            </div>
            <div className="service-points">
              <div>Limpieza técnica</div>
              <div>Revisión general</div>
              <div>Frecuencia sugerida</div>
            </div>
            <button
              className="btn-primary"
              type="button"
              onClick={() => goToView("mantenimiento")}
            >
              Evaluar mantenimiento
            </button>
          </div>
        </div>
      </section>

      <section className="section-card" id="proyectos">
        <div className="section-head">
          <p className="eyebrow">Proyectos realizados</p>
          <h2 className="section-title">
            Instalaciones reales desarrolladas por Sakiara Solar
          </h2>
          <p className="section-text">
            Una muestra de proyectos fotovoltaicos ejecutados en distintos
            formatos, con soluciones pensadas para aprovechar mejor la energía
            solar y presentar una instalación limpia, ordenada y profesional.
          </p>
        </div>

        <div className="project-grid">
          {projectShowcase.map((project) => (
            <article key={project.title} className="project-card">
              <div className="project-image-wrap">
                <img
                  className="project-image"
                  src={project.image}
                  alt={`Proyecto fotovoltaico en ${project.title}`}
                />
              </div>

              <div className="project-body">
                <div className="project-top">
                  <div>
                    <div className="project-chip">{project.type}</div>
                    <h3 className="project-title">{project.title}</h3>
                  </div>
                  <div className="project-power">{project.power}</div>
                </div>

                <p className="project-description">{project.description}</p>

                <div className="project-meta-grid">
                  <div className="project-meta-item">
                    <span>Ubicación</span>
                    <strong>{project.title}</strong>
                  </div>
                  <div className="project-meta-item">
                    <span>Potencia instalada</span>
                    <strong>{project.power}</strong>
                  </div>
                </div>

                <button
                  className="btn-primary project-btn"
                  type="button"
                  onClick={() => goToView("instalacion")}
                >
                  Quiero una evaluación similar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );


  const renderInstallationView = () => (
    <>
      <section className="section-card" id="wizard-instalacion">
        <div className="section-head wizard-section-head compact">
          <div className="back-row">
            <button
              className="btn-secondary"
              type="button"
              onClick={() => goToView("home")}
            >
              ← Volver al inicio
            </button>
          </div>
          <div className="wizard-topbar">
            <div className="pill">Cotización de instalación</div>
            <div className="pill">Paso {installationStep} de 5</div>
          </div>
        </div>

        <div className="wizard-progress">
          {installationSteps.map((step) => (
            <button
              key={step.id}
              className={`wizard-step ${installationStep === step.id ? "active" : ""} ${installationStep > step.id ? "completed" : ""}`}
              type="button"
              onClick={() => setInstallationStep(step.id)}
            >
              <span className="wizard-step-index">{step.id}</span>
              <span className="wizard-step-copy">
                <strong>{step.title}</strong>
                <small>{step.description}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="wizard-panel">
          {installationStep === 1 && (
            <>
              <div className="wizard-copy">
                <h3 className="wizard-title">Elige cómo quieres cotizar</h3>
                <p className="wizard-text">
                  Puedes cotizar con tu boleta, con tu consumo o usar ambos
                  datos para obtener una propuesta clara y fácil de comparar.
                </p>
              </div>

              <div className="mode-card">
                <label className="label">¿Cómo quieres cotizar?</label>
                <div className="mode-buttons">
                  {Object.entries(installationInputModeOptions).map(
                    ([value, option]) => (
                      <button
                        key={value}
                        className={`mode-btn ${installationInputMode === value ? "active" : ""}`}
                        type="button"
                        onClick={() => setInstallationInputMode(value)}
                      >
                        {option.label}
                      </button>
                    ),
                  )}
                </div>
                <div className="hint">
                  {installationInputModeOptions[installationInputMode].helper}
                </div>
              </div>

              <div className="fields-grid wizard-fields">
                {installationInputMode !== "consumption" && (
                  <div className="field">
                    <label className="label">Monto mensual aproximado</label>
                    <input
                      className="input"
                      type="text"
                      inputMode="numeric"
                      value={monthlyBillInput}
                      onChange={(e) =>
                        setMonthlyBillInput(
                          sanitizeIntegerInput(e.target.value),
                        )
                      }
                      placeholder="Ejemplo: 250000"
                    />
                    <div className="hint">
                      Puedes ingresar solo el valor de tu boleta mensual.
                    </div>
                  </div>
                )}

                {installationInputMode !== "bill" && (
                  <div className="field">
                    <label className="label">Consumo mensual</label>
                    <input
                      className="input"
                      type="text"
                      inputMode="numeric"
                      value={billConsumptionInput}
                      onChange={(e) =>
                        setBillConsumptionInput(
                          sanitizeIntegerInput(e.target.value),
                        )
                      }
                      placeholder="Ejemplo: 900"
                    />
                    <div className="hint">
                      Dato visible en la boleta, expresado en kWh por mes.
                    </div>
                  </div>
                )}

                <div className="field">
                  <label className="label">Modalidad seleccionada</label>
                  <input
                    className="input"
                    type="text"
                    readOnly
                    value={installationMetrics.modeSummaryLabel}
                  />
                  <div className="hint">
                    Puedes avanzar con una estimación inicial y afinarla
                    después.
                  </div>
                </div>
              </div>

              <div className="mode-card wizard-highlight-card">
                <label className="label">Objetivo del dimensionamiento</label>
                <div className="mode-buttons wrap">
                  <button
                    className={`mode-btn ${coverageGoalMode === "optimized" ? "active" : ""}`}
                    type="button"
                    onClick={() => setCoverageGoalMode("optimized")}
                  >
                    Compensación optimizada
                  </button>
                  <button
                    className={`mode-btn ${coverageGoalMode === "winter" ? "active" : ""}`}
                    type="button"
                    onClick={() => setCoverageGoalMode("winter")}
                  >
                    Ajustar cobertura en invierno
                  </button>
                  <button
                    className={`mode-btn ${coverageGoalMode === "seasonal" ? "active" : ""}`}
                    type="button"
                    onClick={() => setCoverageGoalMode("seasonal")}
                  >
                    Cobertura estacional
                  </button>
                </div>

                {(coverageGoalMode === "winter" || coverageGoalMode === "seasonal") && (
                  <div className="mode-card nested-mode-card">
                    <label className="label">Meta de cobertura invernal</label>
                    <div className="mode-buttons wrap">
                      {WINTER_COVERAGE_OPTIONS.map((option) => (
                        <button
                          key={option}
                          className={`mode-btn ${winterCoverageTargetPercent === option ? "active" : ""}`}
                          type="button"
                          onClick={() => setWinterCoverageTargetPercent(option)}
                        >
                          {option}%
                        </button>
                      ))}
                    </div>
                    <div className="hint">
                      Parte desde 50% para mantener una inversión más flexible. A mayor porcentaje, mayor cantidad de paneles.
                    </div>
                  </div>
                )}

                {coverageGoalMode === "seasonal" && (
                  <div className="mode-card nested-mode-card">
                    <label className="label">Meta de cobertura en verano</label>
                    <div className="mode-buttons wrap">
                      {SUMMER_COVERAGE_OPTIONS.map((option) => (
                        <button
                          key={option}
                          className={`mode-btn ${summerCoverageTargetPercent === option ? "active" : ""}`}
                          type="button"
                          onClick={() => setSummerCoverageTargetPercent(option)}
                        >
                          {option}%
                        </button>
                      ))}
                    </div>
                    <div className="hint">
                      El sistema se dimensiona comparando el objetivo de invierno y verano, y usa el escenario más exigente.
                    </div>
                  </div>
                )}

                <div className="hint">
                  Puedes optar por un criterio optimizado, priorizar invierno o definir una cobertura estacional más completa.
                </div>
              </div>

              <div className="mode-note">
                <strong>{installationMetrics.modeSummaryLabel}:</strong>{" "}
                {installationMetrics.modeSummaryHint}
                <br />
                <strong>{installationMetrics.coverageObjectiveLabel}:</strong>{" "}
                {installationMetrics.coverageObjectiveHint}
              </div>
            </>
          )}

          {installationStep === 2 && (
            <>
              <div className="wizard-copy">
                <h3 className="wizard-title">
                  Define la ubicación del proyecto
                </h3>
                <p className="wizard-text">
                  La ubicación nos ayuda a ajustar la evaluación de tu proyecto
                  de forma más realista, sin agregar complejidad innecesaria.
                </p>
              </div>

              <div className="fields-grid wizard-fields step-location-grid">
                <div className="field">
                  <label className="label">Región del proyecto</label>
                  <select
                    className="select"
                    value={installationRegion}
                    onChange={(e) => {
                      const nextRegion = e.target.value;
                      const nextCommune = Object.keys(
                        maintenanceRegionData[nextRegion].communes,
                      )[0];
                      setInstallationRegion(nextRegion);
                      setInstallationCommune(nextCommune);
                    }}
                  >
                    {maintenanceRegionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="hint">
                    Selecciona la región donde se desarrollará el proyecto.
                  </div>
                </div>

                <div className="field">
                  <label className="label">Comuna del proyecto</label>
                  <select
                    className="select"
                    value={installationCommune}
                    onChange={(e) => setInstallationCommune(e.target.value)}
                  >
                    {installationCommuneOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="hint">
                    La ubicación se integra de forma interna al cálculo.
                  </div>
                </div>

                <div className="field location-summary-field">
                  <label className="label">Ubicación evaluada</label>
                  <input
                    className="input"
                    type="text"
                    readOnly
                    value={`${selectedInstallationRegion.label} · ${selectedInstallationCommune.label}`}
                  />
                  <div className="hint">
                    Usaremos esta ubicación para ajustar internamente la evaluación.
                  </div>
                </div>
              </div>
            </>
          )}

          {installationStep === 3 && (
            <>
              <div className="wizard-copy">
                <h3 className="wizard-title">Selecciona el perfil del hogar</h3>
                <p className="wizard-text">
                  Elige el comportamiento de consumo que mejor represente tu hogar.
                  La descripción y el gráfico ejemplar te ayudan a elegir rápido y de forma simple.
                </p>
              </div>

              <div className="profile-options-grid wizard-fields">
                <ProfileOptionCard
                  option={profileMap.outside}
                  isSelected={profile === "outside"}
                  onSelect={() => setProfile("outside")}
                />
                <ProfileOptionCard
                  option={profileMap.mixed}
                  isSelected={profile === "mixed"}
                  onSelect={() => setProfile("mixed")}
                />
                <ProfileOptionCard
                  option={profileMap.home}
                  isSelected={profile === "home"}
                  onSelect={() => setProfile("home")}
                />
              </div>
            </>
          )}

          {installationStep === 4 && (
            <>
              <div className="wizard-copy">
                <h3 className="wizard-title">
                  Revisa tus alternativas
                </h3>
                <p className="wizard-text">
                  Abre el detalle de cada alternativa, compáralas con calma y
                  selecciona la que mejor se ajuste a tu proyecto antes de continuar.
                </p>
              </div>

              <div className="summary-grid">
                <SummaryCard
                  label="Ubicación"
                  value={selectedInstallationCommune.label}
                  sub={selectedInstallationRegion.label}
                />
                <SummaryCard
                  label="Proyecto sugerido"
                  value={`${formatNumber(installationMetrics.estimatedPanels)} paneles`}
                  sub={`${formatNumber(installationMetrics.estimatedSystemSizeKwp, 1)} kWp estimados`}
                />
                <SummaryCard
                  label="Objetivo de cobertura"
                  value={installationMetrics.coverageObjectiveLabel}
                  sub="criterio de dimensionamiento"
                  valueClassName="summary-value--text"
                />
              </div>

              <div className="summary-grid compact-grid">
                <SummaryCard
                  label={
                    installationInputMode === "consumption"
                      ? "Boleta estimada"
                      : "Monto evaluado"
                  }
                  value={formatCLP(installationMetrics.monthlyBill)}
                  sub="según datos ingresados"
                />
                <SummaryCard
                  label="Compensación invierno"
                  value={`${formatNumber(installationMetrics.winterCompensationNoBattery)}%`}
                  sub="estimación sin batería"
                />
                <SummaryCard
                  label="Compensación verano"
                  value={`${formatNumber(installationMetrics.summerCompensationNoBattery)}%`}
                  sub="estimación sin batería"
                />
              </div>

              <div className="summary-grid compact-grid">
                <SummaryCard
                  label="Consumo mensual"
                  value={formatNumber(
                    installationMetrics.monthlyConsumptionKWh,
                  )}
                  sub="kWh por mes"
                />
                <SummaryCard
                  label="Generación promedio"
                  value={formatNumber(
                    installationMetrics.monthlyGenerationKWh,
                  )}
                  sub="kWh/mes estimados"
                />
                <SummaryCard
                  label="Alternativa elegida"
                  value={selectedInstallationOfferData?.title || "Selecciona una alternativa"}
                  sub={selectedInstallationOfferData?.badge || "antes de continuar"}
                />
              </div>

              {installationMetrics.suggestWinterCoverage && (
                <div className="info-card">
                  <h3 className="info-title">Sugerencia para 100% en invierno</h3>
                  <p className="info-text">
                    Con los datos ingresados, para apuntar a una cobertura total en invierno conviene subir a
                    <strong> {formatNumber(installationMetrics.winterGoalPanels)} paneles</strong>
                    {installationMetrics.additionalPanelsForWinter > 0
                      ? ` (+${formatNumber(installationMetrics.additionalPanelsForWinter)} paneles)`
                      : ""}
                    , equivalente a
                    <strong> {formatNumber(installationMetrics.winterGoalSystemSizeKwp, 1)} kWp</strong>.
                  </p>
                  <p className="info-text">
                    Ese ajuste usa un factor de producción invernal más exigente y lleva la compensación estimada en invierno a
                    <strong> 100%</strong>.
                  </p>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => {
                      setWinterCoverageTargetPercent(100);
                      setCoverageGoalMode("winter");
                    }}
                  >
                    Usar cobertura al 100% en invierno
                  </button>
                </div>
              )}

              <div className="cards-grid offer-stack single-column-grid">
                {installationOfferOptions.map((offer) => (
                  <OfferCard
                    key={offer.key}
                    title={offer.title}
                    subtitle={offer.subtitle}
                    badge={offer.badge}
                    price={offer.price}
                    savings={offer.savings}
                    compensation={offer.compensation}
                    payback={offer.payback}
                    variant={offer.variant}
                    collapsible
                    selectable
                    isOpen={expandedInstallationOffer === offer.key}
                    onToggle={() =>
                      setExpandedInstallationOffer((current) =>
                        current === offer.key ? "" : offer.key,
                      )
                    }
                    isSelected={selectedInstallationOffer === offer.key}
                    onSelect={() => setSelectedInstallationOffer(offer.key)}
                  />
                ))}
              </div>

              <div className="report-actions">
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={handleDownloadInstallationReport}
                >
                  Descargar informe PDF
                </button>
                <div className="hint">
                  Se descarga un informe autogenerado con gráficos, resumen técnico-comercial y datos meteorológicos referenciales.
                </div>
              </div>

              <div className="note">
                Selecciona una alternativa antes de continuar. {installationMetrics.projectExecutionNote} Se consideró un factor solar referencial de {formatNumber(installationMetrics.annualProductionFactor, 0)} kWh/kWp/mes promedio, {formatNumber(installationMetrics.winterProductionFactor, 0)} kWh/kWp/mes en invierno y {formatNumber(installationMetrics.summerProductionFactor, 0)} kWh/kWp/mes en verano para {selectedInstallationCommune.label}.
              </div>
            </>
          )}

          {installationStep === 5 && (
            <>
              <div className="wizard-copy">
                <h3 className="wizard-title">Completa tus datos</h3>
                <p className="wizard-text">
                  Ya tienes una alternativa elegida. Completa el formulario o
                  escríbenos por WhatsApp y seguiremos con la evaluación usando
                  exactamente la propuesta que seleccionaste.
                </p>
              </div>

              <div className="summary-grid">
                <SummaryCard
                  label="Ubicación"
                  value={selectedInstallationCommune.label}
                  sub={selectedInstallationRegion.label}
                />
                <SummaryCard
                  label="Alternativa seleccionada"
                  value={selectedInstallationOfferData?.title || "Pendiente"}
                  sub={selectedInstallationOfferData?.badge || "elige una alternativa"}
                />
                <SummaryCard
                  label="Inversión estimada"
                  value={selectedInstallationOfferData?.price || "-"}
                  sub="IVA incluido"
                />
              </div>

              <form className="wizard-contact-form" action={formEndpoint} method="POST">
                <input
                  type="hidden"
                  name="_subject"
                  value="Nueva solicitud de evaluación solar - Sakiara Solar"
                />
                <input type="hidden" name="_captcha" value="false" />
                <input type="hidden" name="_template" value="table" />
                {getSummaryItems().map((item, index) => (
                  <input
                    key={`${item.label}-${index}`}
                    type="hidden"
                    name={item.label
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[̀-ͯ]/g, "")
                      .replace(/[^a-z0-9]+/g, "_")
                      .replace(/^_|_$/g, "")}
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
                      placeholder="Cuéntanos brevemente tu proyecto o necesidad"
                    />
                  </div>
                </div>

                <div className="contact-actions wizard-actions">
                  <button className="full-btn" type="submit">
                    Solicitar propuesta
                  </button>
                  <button
                    className="wa-btn"
                    type="button"
                    onClick={handleWhatsApp}
                  >
                    Hablar por WhatsApp
                  </button>
                  <button
                    className="wa-btn"
                    type="button"
                    onClick={handleDownloadInstallationReport}
                  >
                    Descargar informe PDF
                  </button>
                </div>
              </form>

              <div className="wizard-maintenance-action">
                <button
                  className="action-link secondary"
                  type="button"
                  onClick={() => {
                    setMaintenanceMonthlySavingsInput(
                      String(Math.round(installationMetrics.monthlySavingsNoBattery)),
                    );
                    setMaintenanceSystemSizeInput(
                      String(
                        Number(
                          installationMetrics.estimatedSystemSizeKwp.toFixed(1),
                        ) || installationMetrics.estimatedSystemSizeKwp,
                      ),
                    );
                    setMaintenanceRegion(installationRegion);
                    setMaintenanceCommune(installationCommune);
                    setMaintenanceStep(1);
                    goToView("mantenimiento");
                  }}
                >
                  Evaluar este ahorro en mantenimiento
                </button>
              </div>
            </>
          )}
        </div>

        <div className="wizard-nav">
          <button
            className="btn-secondary"
            type="button"
            onClick={() =>
              setInstallationStep((current) => Math.max(1, current - 1))
            }
            disabled={installationStep === 1}
          >
            Atrás
          </button>

          {installationStep < installationSteps.length ? (
            <button
              className="btn-primary"
              type="button"
              disabled={!canProceedToContact}
              onClick={() =>
                setInstallationStep((current) =>
                  Math.min(installationSteps.length, current + 1),
                )
              }
            >
              {installationNextLabel}
            </button>
          ) : null}
        </div>
      </section>
    </>
  );


  const renderMaintenanceView = () => (
    <>
      <section className="section-card" id="wizard-mantenimiento">
        <div className="section-head wizard-section-head compact">
          <div className="back-row">
            <button
              className="btn-secondary"
              type="button"
              onClick={() => goToView("home")}
            >
              ← Volver al inicio
            </button>
          </div>
          <div className="wizard-topbar">
            <div className="pill">Evaluación de mantenimiento</div>
            <div className="pill">Paso {maintenanceStep} de 5</div>
          </div>
        </div>

        <div className="wizard-progress">
          {maintenanceSteps.map((step) => (
            <button
              key={step.id}
              className={`wizard-step ${maintenanceStep === step.id ? "active" : ""} ${maintenanceStep > step.id ? "completed" : ""}`}
              type="button"
              onClick={() => setMaintenanceStep(step.id)}
            >
              <span className="wizard-step-index">{step.id}</span>
              <span className="wizard-step-copy">
                <strong>{step.title}</strong>
                <small>{step.description}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="wizard-panel">
          {maintenanceStep === 1 && (
            <>
              <div className="wizard-copy">
                <h3 className="wizard-title">Cuéntanos sobre tu sistema</h3>
                <p className="wizard-text">
                  Con estos datos base estimamos una propuesta de mantenimiento clara,
                  útil y fácil de entender para tu sistema fotovoltaico.
                </p>
              </div>

              <div className="fields-grid wizard-fields">
                <div className="field">
                  <label className="label">
                    Potencia aproximada del sistema en kW
                  </label>
                  <input
                    className="input"
                    type="text"
                    inputMode="decimal"
                    value={maintenanceSystemSizeInput}
                    onChange={(e) =>
                      setMaintenanceSystemSizeInput(
                        e.target.value
                          .replace(/[^\d.]/g, "")
                          .replace(/(\..*)\./g, "$1"),
                      )
                    }
                    placeholder="Ejemplo: 8"
                  />
                  <div className="hint">
                    Ingresar la potencia ayuda a estimar el alcance y la valorización del servicio.
                  </div>
                </div>

                <div className="field">
                  <label className="label">
                    Ahorro mensual estimado o actual en pesos
                  </label>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    value={maintenanceMonthlySavingsInput}
                    onChange={(e) =>
                      setMaintenanceMonthlySavingsInput(
                        sanitizeIntegerInput(e.target.value),
                      )
                    }
                    placeholder="Ejemplo: 120000"
                  />
                  <div className="hint">
                    Este dato permite leer la conveniencia económica de mantener el sistema.
                  </div>
                </div>
              </div>
            </>
          )}

          {maintenanceStep === 2 && (
            <>
              <div className="wizard-copy">
                <h3 className="wizard-title">Define la ubicación del sistema</h3>
                <p className="wizard-text">
                  La ubicación nos ayuda a estimar el servicio de forma más realista
                  y ordenada, sin recargar la experiencia.
                </p>
              </div>

              <div className="fields-grid wizard-fields step-location-grid">
                <div className="field">
                  <label className="label">Región del proyecto</label>
                  <select
                    className="select"
                    value={maintenanceRegion}
                    onChange={(e) => {
                      const nextRegion = e.target.value;
                      const nextCommune = Object.keys(
                        maintenanceRegionData[nextRegion].communes,
                      )[0];
                      setMaintenanceRegion(nextRegion);
                      setMaintenanceCommune(nextCommune);
                    }}
                  >
                    {maintenanceRegionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="hint">
                    Selecciona la región donde se encuentra tu sistema fotovoltaico.
                  </div>
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
                  <div className="hint">
                    La ubicación se integra automáticamente en la propuesta.
                  </div>
                </div>

                <div className="field location-summary-field">
                  <label className="label">Ubicación evaluada</label>
                  <input
                    className="input"
                    type="text"
                    value={`${selectedMaintenanceRegion.label} · ${selectedMaintenanceCommune.label}`}
                    readOnly
                  />
                  <div className="hint">
                    Usaremos esta ubicación para ajustar internamente la evaluación.
                  </div>
                </div>
              </div>
            </>
          )}

          {maintenanceStep === 3 && (
            <>
              <div className="wizard-copy">
                <h3 className="wizard-title">Elige la frecuencia del servicio</h3>
                <p className="wizard-text">
                  Selecciona la cantidad de visitas por año que mejor se ajuste al uso,
                  exposición y necesidad de seguimiento de tu sistema.
                </p>
              </div>

              <div className="mode-card wizard-highlight-card">
                <label className="label">Visitas por año</label>
                <div className="mode-buttons">
                  {[1, 2, 3, 4].map((visits) => (
                    <button
                      key={visits}
                      className={`mode-btn ${maintenanceVisitsPerYear === visits ? "active" : ""}`}
                      type="button"
                      onClick={() => setMaintenanceVisitsPerYear(visits)}
                    >
                      {visits} {visits === 1 ? "visita" : "visitas"}
                    </button>
                  ))}
                </div>
                <div className="hint">
                  En sistemas residenciales, 1 o 2 visitas al año suelen ser una buena referencia inicial.
                </div>
              </div>
            </>
          )}

          {maintenanceStep === 4 && (
            <>
              <div className="wizard-copy">
                <h3 className="wizard-title">Revisa tu plan sugerido</h3>
                <p className="wizard-text">
                  Este resumen te permite entender rápido el valor del servicio,
                  la frecuencia elegida y la conveniencia de mantener tu sistema.
                </p>
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
                  sub={`${formatNumber(maintenanceVisitsPerYear)} ${maintenanceVisitsPerYear === 1 ? "visita" : "visitas"} por año`}
                />
                <SummaryCard
                  label="Resultado"
                  value={maintenanceMetrics.status}
                  sub="lectura inicial del plan"
                  valueClassName="summary-value--text"
                />
              </div>

              <div className="summary-grid compact-grid">
                <SummaryCard
                  label="Sistema evaluado"
                  value={`${formatNumber(maintenanceSystemSize, 1)} kW`}
                  sub={`${selectedMaintenanceCommune.label}, ${selectedMaintenanceRegion.label}`}
                />
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
              </div>

              <div className="cards-grid maintenance-cards-grid">
                <div className="info-card">
                  <h3 className="info-title">Qué incluye esta evaluación</h3>
                  <p className="info-text">
                    La propuesta considera mantenimiento preventivo, revisión técnica general,
                    valorización según ubicación del proyecto y frecuencia anual del servicio.
                  </p>
                  <p className="info-text">
                    El objetivo es cuidar rendimiento, seguridad y continuidad operativa
                    sin cargar la experiencia con complejidad innecesaria.
                  </p>
                </div>

                <div className="info-card">
                  <h3 className="info-title">Cómo leer este resultado</h3>
                  <p className="info-text">
                    Cuando el plan anual se mantiene dentro de una proporción razonable del ahorro que hoy genera el sistema,
                    la mantención suele verse mejor respaldada comercialmente.
                  </p>
                  <p className="info-text">
                    Con los datos ingresados, esta propuesta se ve mejor respaldada cuando el sistema ahorra al menos
                    <strong> {formatCLP(maintenanceMetrics.minimumMonthlySavingsForRule)}</strong> mensuales.
                  </p>
                </div>
              </div>

              <div className="note">
                Los valores son estimados y pueden variar según ubicación, condiciones de acceso,
                tamaño del sistema y requerimientos técnicos del servicio.
              </div>
            </>
          )}

          {maintenanceStep === 5 && (
            <>
              <div className="wizard-copy">
                <h3 className="wizard-title">Completa tus datos</h3>
                <p className="wizard-text">
                  Completa el formulario o escríbenos por WhatsApp y seguiremos con la evaluación
                  usando el resumen de mantenimiento que acabas de revisar.
                </p>
              </div>

              <div className="summary-grid">
                <SummaryCard
                  label="Ubicación"
                  value={selectedMaintenanceCommune.label}
                  sub={selectedMaintenanceRegion.label}
                />
                <SummaryCard
                  label="Valor por visita"
                  value={formatCLP(maintenanceMetrics.visitCost)}
                  sub="servicio estimado"
                />
                <SummaryCard
                  label="Plan anual estimado"
                  value={formatCLP(maintenanceMetrics.annualPlanCost)}
                  sub={`${formatNumber(maintenanceVisitsPerYear)} ${maintenanceVisitsPerYear === 1 ? "visita" : "visitas"} por año`}
                />
              </div>

              <form className="wizard-contact-form" action={formEndpoint} method="POST">
                <input
                  type="hidden"
                  name="_subject"
                  value="Nueva solicitud de mantenimiento fotovoltaico - Sakiara Solar"
                />
                <input type="hidden" name="_captcha" value="false" />
                <input type="hidden" name="_template" value="table" />
                {getMaintenanceSummaryItems().map((item, index) => (
                  <input
                    key={`${item.label}-${index}`}
                    type="hidden"
                    name={item.label
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[̀-ͯ]/g, "")
                      .replace(/[^a-z0-9]+/g, "_")
                      .replace(/^_|_$/g, "")}
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
                      placeholder="Cuéntanos el estado del sistema, observaciones o el tipo de servicio que necesitas"
                    />
                  </div>
                </div>

                <div className="contact-actions wizard-actions">
                  <button className="full-btn" type="submit">
                    Solicitar evaluación
                  </button>
                  <button
                    className="wa-btn"
                    type="button"
                    onClick={handleWhatsApp}
                  >
                    Hablar por WhatsApp
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <div className="wizard-nav">
          <button
            className="btn-secondary"
            type="button"
            onClick={() =>
              setMaintenanceStep((current) => Math.max(1, current - 1))
            }
            disabled={maintenanceStep === 1}
          >
            Atrás
          </button>

          {maintenanceStep < maintenanceSteps.length ? (
            <button
              className="btn-primary"
              type="button"
              onClick={() =>
                setMaintenanceStep((current) =>
                  Math.min(maintenanceSteps.length, current + 1),
                )
              }
            >
              {maintenanceNextLabel}
            </button>
          ) : (
            <button
              className="btn-primary"
              type="button"
              onClick={() => goToView("instalacion")}
            >
              Evaluar una instalación nueva
            </button>
          )}
        </div>
      </section>
    </>
  );


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
          padding: 28px 0 140px;
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

        .hero-banner {
          position: relative;
          min-height: 460px;
          border-radius: 34px;
          overflow: hidden;
          background: #0f172a;
          box-shadow: 0 28px 56px rgba(15, 23, 42, 0.16);
          isolation: isolate;
        }

        .hero-banner-image {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(180deg, rgba(9, 14, 26, 0.42) 0%, rgba(9, 14, 26, 0.18) 34%, rgba(9, 14, 26, 0.30) 100%),
            linear-gradient(0deg, rgba(10, 16, 28, 0.16) 0%, rgba(10, 16, 28, 0.08) 100%),
            radial-gradient(circle at 50% 34%, rgba(255, 204, 82, 0.22) 0%, rgba(255, 204, 82, 0.00) 26%),
            url('/home/sakiara-hero-sunset-wide.jpg');
          background-size: cover;
          background-position: center 44%;
          transform: scale(1.02);
        }

        .hero-banner::after {
          content: "";
          position: absolute;
          left: -4%;
          right: -4%;
          bottom: -118px;
          height: 200px;
          background: #ffffff;
          border-radius: 50% 50% 0 0 / 100% 100% 0 0;
          z-index: 1;
        }

        .hero-banner-inner {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 460px;
          padding: 58px 42px 126px;
        }

        .hero-banner-copy {
          max-width: 860px;
          width: 100%;
          text-align: center;
          margin: 0 auto;
        }

        .hero-kicker {
          margin: 0 0 12px;
          font-size: 11px;
          line-height: 1.2;
          letter-spacing: 0.19em;
          text-transform: uppercase;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.80);
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
        }

        .hero-banner-title {
          margin: 0 auto;
          max-width: 920px;
          font-size: clamp(46px, 6.3vw, 82px);
          line-height: 0.96;
          letter-spacing: -0.055em;
          font-weight: 880;
          color: #ffffff;
          text-wrap: balance;
          text-shadow: 0 6px 26px rgba(0, 0, 0, 0.32);
        }

        .hero-banner-title span {
          display: block;
        }

        .hero-banner-slogan {
          margin: 18px auto 0;
          max-width: 760px;
          font-size: clamp(18px, 2.2vw, 23px);
          line-height: 1.34;
          color: #f1d433;
          font-weight: 700;
          text-shadow: 0 4px 18px rgba(0, 0, 0, 0.28);
        }

        .hero-banner-text {
          margin: 10px auto 0;
          max-width: 560px;
          font-size: 18px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.93);
          text-shadow: 0 3px 16px rgba(0, 0, 0, 0.28);
        }

        .hero-brand-block {
          margin-top: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        .hero-brand-label {
          font-size: 11px;
          line-height: 1.2;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.74);
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.24);
        }

        .hero-brand-row {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 26px;
          flex-wrap: wrap;
          padding: 12px 22px;
          border-radius: 999px;
          background: rgba(11, 18, 32, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(4px);
          box-shadow: 0 16px 30px rgba(0, 0, 0, 0.14);
        }

        .hero-brand-logo {
          display: block;
          width: auto;
          max-width: 100%;
          object-fit: contain;
          filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.22));
        }

        .hero-brand-logo.huawei {
          height: 30px;
        }

        .hero-brand-logo.solis {
          height: 27px;
        }

        .home-services-wrap {
          position: relative;
          z-index: 3;
          margin-top: -38px;
        }

        .back-row {
          display: flex;
          justify-content: center;
          margin-bottom: 18px;
        }

        .title {
          margin: 0 auto;
          max-width: 760px;
          font-size: clamp(28px, 4.4vw, 56px);
          line-height: 1.06;
          letter-spacing: -0.03em;
          color: #30323a;
          font-weight: 680;
        }

        .title-line {
          display: block;
        }

        .hero-slogan {
          margin: 14px auto 0;
          max-width: 720px;
          font-size: clamp(16px, 2vw, 20px);
          line-height: 1.45;
          color: #7a6a2a;
          font-weight: 600;
        }

        .text {
          margin: 18px auto 0;
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

        .site-legal {
          width: min(1100px, calc(100% - 40px));
          margin: 0 auto 120px;
          padding: 0;
          border: 1px solid rgba(102, 102, 107, 0.12);
          border-radius: 24px;
          background: #fbfbfc;
          box-shadow: 0 18px 34px rgba(17, 24, 39, 0.06);
          overflow: hidden;
        }

        .site-legal::before {
          content: "";
          display: block;
          height: 4px;
          background: linear-gradient(90deg, rgba(241, 212, 51, 0.98) 0%, rgba(241, 212, 51, 0.62) 100%);
        }

        .site-legal-inner {
          padding: 20px 24px 22px;
          text-align: center;
        }

        .site-legal-kicker {
          margin: 0 0 10px;
          font-size: 11px;
          line-height: 1.2;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 800;
          color: #8a8a90;
        }

        .site-legal-title {
          margin: 0 0 8px;
          color: #2f3138;
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .site-legal-text {
          margin: 0;
          font-size: 0.93rem;
          line-height: 1.65;
          color: #54565d;
        }

        .site-legal-text + .site-legal-text {
          margin-top: 4px;
        }

        .floating-cta-stack {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 60;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-end;
          pointer-events: none;
        }

        .floating-cta-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 56px;
          padding: 0 20px;
          border: none;
          border-radius: 999px;
          font: inherit;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
          box-shadow: 0 18px 30px rgba(17, 24, 39, 0.14);
          pointer-events: auto;
          white-space: nowrap;
        }

        .floating-cta-btn:hover {
          transform: translateY(-1px);
        }

        .floating-cta-btn.quote {
          background: #f1d433;
          color: #1f2328;
        }

        .floating-cta-btn.whatsapp {
          background: #25d366;
          color: #ffffff;
          box-shadow: 0 18px 30px rgba(37, 211, 102, 0.28);
        }

        .floating-cta-btn.whatsapp:hover {
          background: #1fbe5a;
        }

        .floating-cta-copy {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.1;
        }

        .floating-cta-copy small {
          margin-top: 3px;
          font-size: 11px;
          font-weight: 700;
          opacity: 0.78;
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

        .wizard-progress {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          margin-top: 24px;
        }

        .wizard-step {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 14px;
          border: 1px solid rgba(102, 102, 107, 0.12);
          border-radius: 18px;
          background: #fbfbfa;
          color: #66666b;
          cursor: pointer;
          text-align: left;
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
        }

        .wizard-step:hover {
          transform: translateY(-1px);
        }

        .wizard-step.active {
          border-color: #f1d433;
          box-shadow: 0 12px 24px rgba(241, 212, 51, 0.16);
          background: #fffef5;
        }

        .wizard-step.completed {
          background: rgba(241, 212, 51, 0.10);
        }

        .wizard-step-index {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 1px solid rgba(102, 102, 107, 0.12);
          font-size: 14px;
          font-weight: 800;
          color: #66666b;
          flex: 0 0 auto;
        }

        .wizard-step.active .wizard-step-index,
        .wizard-step.completed .wizard-step-index {
          background: #f1d433;
          border-color: #f1d433;
          color: #1f2328;
        }

        .wizard-step-copy {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .wizard-step-copy strong {
          font-size: 14px;
          line-height: 1.2;
          color: #66666b;
        }

        .wizard-step-copy small {
          font-size: 12px;
          line-height: 1.4;
          color: #8b8b91;
        }

        .wizard-panel {
          margin-top: 20px;
          background: #fbfbfa;
          border: 1px solid rgba(102, 102, 107, 0.10);
          border-radius: 24px;
          padding: 22px;
          box-shadow: 0 14px 28px rgba(17, 24, 39, 0.04);
        }

        .wizard-copy {
          text-align: center;
          max-width: 760px;
          margin: 0 auto;
        }

        .wizard-title {
          margin: 0;
          font-size: 30px;
          line-height: 1.08;
          color: #66666b;
        }

        .wizard-text {
          margin: 10px auto 0;
          font-size: 15px;
          line-height: 1.72;
          color: #7a7a80;
          max-width: 680px;
        }

        .wizard-fields {
          margin-top: 22px;
        }

        .wizard-highlight-card {
          margin-top: 22px;
          background: #fffef5;
        }

        .step-location-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .location-summary-field {
          grid-column: 1 / -1;
          max-width: 540px;
          justify-self: center;
        }

        .profile-options-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 22px;
        }

        .profile-option-card {
          background: #ffffff;
          border: 1px solid rgba(102, 102, 107, 0.10);
          border-radius: 22px;
          padding: 18px;
          text-align: left;
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
        }

        .profile-option-card:hover {
          transform: translateY(-1px);
        }

        .profile-option-card.selected {
          border-color: #f1d433;
          background: #fffef5;
          box-shadow: 0 16px 28px rgba(241, 212, 51, 0.14);
        }

        .profile-option-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .profile-option-title {
          font-size: 22px;
          line-height: 1.12;
          font-weight: 800;
          color: #66666b;
        }

        .profile-option-description {
          margin: 10px 0 0;
          font-size: 14px;
          line-height: 1.68;
          color: #7a7a80;
        }

        .profile-option-check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(102, 102, 107, 0.12);
          background: #ffffff;
          color: #66666b;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .profile-option-check.selected {
          border-color: #f1d433;
          background: #f1d433;
          color: #1f2328;
        }

        .profile-example-chart {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          align-items: end;
          min-height: 132px;
        }

        .profile-example-bar-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          min-height: 132px;
        }

        .profile-example-bar {
          width: 100%;
          max-width: 58px;
          border-radius: 14px 14px 8px 8px;
          background: linear-gradient(180deg, #f1d433 0%, #d8b90b 100%);
          box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.22);
        }

        .wizard-section-head {
          align-items: flex-start;
        }

        .wizard-section-head.compact {
          gap: 0;
        }

        .wizard-topbar {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .wizard-contact-form {
          margin-top: 20px;
        }

        .wizard-maintenance-action {
          margin-top: 18px;
          display: flex;
          justify-content: flex-start;
        }

        .profile-example-bar-wrap span {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #8b8b91;
        }

        .wizard-nav {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 20px;
        }

        .wizard-nav .btn-secondary[disabled],
        .wizard-nav .btn-primary[disabled] {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .offer-stack {
          margin-top: 20px;
        }

        .single-column-grid {
          grid-template-columns: 1fr;
        }

        .wizard-contact-box {
          margin-top: 20px;
          background: #fffef5;
        }

        .wizard-contact-copy h3 {
          margin: 14px 0 0;
          font-size: 26px;
          line-height: 1.1;
          color: #66666b;
        }

        .wizard-contact-copy p {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 1.72;
          color: #66666b;
        }

        .wizard-actions {
          margin-top: 20px;
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

        .project-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          margin-top: 20px;
        }

        .project-card {
          overflow: hidden;
          background: #fbfbfa;
          border: 1px solid rgba(102, 102, 107, 0.10);
          border-radius: 24px;
          box-shadow: 0 16px 28px rgba(17, 24, 39, 0.05);
          display: flex;
          flex-direction: column;
        }

        .project-image-wrap {
          aspect-ratio: 16 / 10;
          overflow: hidden;
          background: #f4f4f2;
        }

        .project-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .project-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
        }

        .project-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .project-chip {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(241, 212, 51, 0.20);
          color: #66666b;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .project-title {
          margin: 10px 0 0;
          font-size: 30px;
          line-height: 1.05;
          color: #66666b;
        }

        .project-power {
          color: #66666b;
          font-size: 18px;
          font-weight: 800;
          white-space: nowrap;
        }

        .project-description {
          margin: 0;
          font-size: 15px;
          line-height: 1.72;
          color: #66666b;
        }

        .project-meta-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .project-meta-item {
          background: #ffffff;
          border: 1px solid rgba(102, 102, 107, 0.10);
          border-radius: 16px;
          padding: 14px 16px;
        }

        .project-meta-item span {
          display: block;
          font-size: 12px;
          color: rgba(102, 102, 107, 0.78);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .project-meta-item strong {
          display: block;
          margin-top: 6px;
          font-size: 16px;
          color: #66666b;
        }

        .project-btn {
          width: 100%;
          justify-content: center;
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
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.08;
          font-weight: 800;
          color: #66666b;
          overflow-wrap: normal;
          word-break: normal;
          hyphens: none;
        }

        .summary-value--text {
          font-size: 26px;
          line-height: 1.15;
          overflow-wrap: normal;
          word-break: normal;
          hyphens: none;
          text-wrap: balance;
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

        .offer-head-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }

        .offer-toggle {
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(102, 102, 107, 0.14);
          background: #ffffff;
          color: #66666b;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
        }

        .offer-toggle:hover {
          transform: translateY(-1px);
        }

        .offer-toggle.active {
          border-color: #f1d433;
          box-shadow: 0 10px 20px rgba(241, 212, 51, 0.14);
        }

        .offer-selection-row {
          margin-top: 16px;
          display: flex;
          justify-content: flex-end;
        }

        .offer-select-btn {
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid rgba(102, 102, 107, 0.14);
          background: #ffffff;
          color: #66666b;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
        }

        .offer-select-btn:hover {
          transform: translateY(-1px);
        }

        .offer-select-btn.selected {
          background: #f1d433;
          border-color: #f1d433;
          color: #1f2328;
          box-shadow: 0 12px 24px rgba(241, 212, 51, 0.18);
        }

        .offer-card.collapsible {
          min-height: 0;
        }

        .offer-card.collapsible.expanded {
          box-shadow: 0 18px 30px rgba(17, 24, 39, 0.06);
        }

        .offer-card.selected {
          border-color: rgba(241, 212, 51, 0.9);
          box-shadow: 0 18px 30px rgba(241, 212, 51, 0.14);
          background: #fffef5;
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

        .report-actions {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: flex-start;
        }

        .report-actions .hint {
          max-width: 760px;
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
          .project-grid,
          .profile-options-grid,
          .project-meta-grid,
          .wizard-progress {
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
            padding-bottom: 168px;
          }

          .brand-row {
            justify-content: flex-start;
          }

          .brand-logo {
            width: 180px;
          }

          .title {
            font-size: 29px;
            line-height: 1.1;
            max-width: 360px;
          }

          .hero-banner {
            min-height: 380px;
            border-radius: 26px;
          }

          .hero-banner-image {
            background-position: center 46%;
            transform: scale(1.05);
          }

          .hero-banner::after {
            left: -8%;
            right: -8%;
            bottom: -86px;
            height: 150px;
          }

          .hero-banner-inner {
            min-height: 380px;
            padding: 34px 20px 98px;
            align-items: center;
            justify-content: center;
          }

          .hero-banner-copy {
            max-width: 100%;
            text-align: center;
          }

          .hero-kicker {
            margin-bottom: 10px;
            font-size: 10px;
            letter-spacing: 0.15em;
          }

          .hero-banner-title {
            font-size: 46px;
            line-height: 0.96;
            max-width: 340px;
            margin-left: auto;
            margin-right: auto;
          }

          .hero-banner-slogan {
            margin-top: 14px;
            font-size: 16px;
            max-width: 300px;
            margin-left: auto;
            margin-right: auto;
          }

          .hero-banner-text {
            font-size: 15px;
            line-height: 1.5;
            max-width: 280px;
            margin-left: auto;
            margin-right: auto;
          }

          .hero-brand-block {
            margin-top: 20px;
            align-items: center;
          }

          .hero-brand-row {
            gap: 18px;
            padding: 10px 16px;
          }

          .hero-brand-logo.huawei {
            height: 24px;
          }

          .hero-brand-logo.solis {
            height: 22px;
          }

          .home-services-wrap {
            margin-top: -26px;
          }

          .section-title {
            font-size: 30px;
          }

          .price-value,
          .summary-value {
            font-size: 32px;
          }

          .summary-value--text {
            font-size: 24px;
          }

          .cta-row,
          .contact-actions,
          .service-nav,
          .wizard-topbar {
            flex-direction: column;
            align-items: stretch;
          }

          .wizard-nav {
            flex-direction: column;
          }

          .site-legal {
            width: calc(100% - 24px);
            margin: 0 auto 112px;
          }

          .site-legal-inner {
            padding: 18px 18px 20px;
          }

          .site-legal-kicker {
            font-size: 10px;
            letter-spacing: 0.14em;
          }

          .site-legal-title {
            font-size: 0.96rem;
          }

          .site-legal-text {
            font-size: 0.88rem;
          }

          .floating-cta-stack {
            left: 12px;
            right: 12px;
            bottom: 12px;
            align-items: stretch;
          }

          .floating-cta-btn {
            width: 100%;
            min-height: 54px;
            white-space: normal;
          }
        }
      `}</style>

      <div className="wrap">
        <div className="brand-row">
          {!logoHidden ? (
            <img
              className="brand-logo"
              src={sakiaraLogo}
              alt="Sakiara Solar"
              onError={() => setLogoHidden(true)}
            />
          ) : (
            <div className="brand-fallback">
              <div className="brand-dot" />
              <span>Sakiara Solar</span>
            </div>
          )}
        </div>

        <div className="stack">
          {activeView === "home" && renderHomeView()}
          {activeView === "instalacion" && renderInstallationView()}
          {activeView === "mantenimiento" && renderMaintenanceView()}
        </div>
      </div>

      <div className="site-legal" aria-label="Información legal y tributaria">
        <div className="site-legal-inner">
          <p className="site-legal-kicker">Información comercial y tributaria</p>
          <p className="site-legal-title">Sakiara Solar</p>
          <p className="site-legal-text">Sakiara Solar es una marca comercial de Sakiara Inversiones SpA.</p>
          <p className="site-legal-text">La facturación y documentación tributaria se emiten a nombre de Sakiara Inversiones SpA.</p>
        </div>
      </div>

      <div
        className="floating-cta-stack"
        aria-label="Accesos rápidos de contacto"
      >
        {activeView === "home" && (
          <button
            className="floating-cta-btn quote"
            type="button"
            onClick={handleFloatingQuote}
          >
            <span className="floating-cta-copy">
              <span>{floatingQuoteLabel}</span>
              <small>Ir al cotizador</small>
            </span>
          </button>
        )}
        <button
          className="floating-cta-btn whatsapp"
          type="button"
          onClick={handleWhatsApp}
        >
          <span className="floating-cta-copy">
            <span>WhatsApp directo</span>
            <small>Habla conmigo ahora</small>
          </span>
        </button>
      </div>
    </div>
  );
}
