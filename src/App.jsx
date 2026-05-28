import React, { useEffect, useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";

const sakiaraLogo = "/sakiara-logo.jpg";
const contactEmail = "rafael.vasquez844@gmail.com";
const whatsappNumber = "56975807224";
const PANEL_POWER_KW = 0.585;
const REFERENCE_TARIFF_CLP_PER_KWH = 278;
const WINTER_COVERAGE_OPTIONS = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
const SUMMER_COVERAGE_OPTIONS = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
const HTML2CANVAS_LIBRARY_URL = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
const JSPDF_LIBRARY_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];


const sanitizeIntegerInput = (value) => value.replace(/[^\d]/g, "");

const sanitizeFileName = (value) =>
  String(value || "archivo")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "archivo";

const slugifyPathSegment = (value) =>
  String(value || "general")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "general";

const bytesToHumanSize = (value) => {
  if (!Number.isFinite(value) || value <= 0) return "0 MB";
  const mb = value / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
};

const extractFilesFromFormData = (formData) =>
  [formData.get("adjunto_1"), formData.get("adjunto_2")].filter(
    (file) => file instanceof File && file.size > 0,
  );

const isAllowedUploadType = (file) =>
  !file?.type || ALLOWED_UPLOAD_TYPES.includes(file.type);

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

const SOLAR_PERFORMANCE_RATIO = 0.82;
const SOLAR_PLANE_GAIN_FACTOR = 1.05;

const solarGhiReferenceByRegion = {
  aricaParinacota: { annual: 6.15, winter: 5.45, summer: 7.15, referenceLng: -69.8 },
  tarapaca: { annual: 6.35, winter: 5.65, summer: 7.35, referenceLng: -69.6 },
  antofagasta: { annual: 6.5, winter: 5.75, summer: 7.45, referenceLng: -69.4 },
  atacama: { annual: 6.15, winter: 4.95, summer: 7.45, referenceLng: -70.2 },
  coquimbo: { annual: 5.55, winter: 4.25, summer: 7.0, referenceLng: -70.9 },
  valparaiso: { annual: 5.05, winter: 3.4, summer: 7.0, referenceLng: -71.0 },
  metropolitana: { annual: 5.0, winter: 3.2, summer: 7.35, referenceLng: -70.7 },
  ohiggins: { annual: 4.75, winter: 3.0, summer: 7.05, referenceLng: -70.9 },
  maule: { annual: 4.55, winter: 2.75, summer: 6.8, referenceLng: -71.3 },
  nuble: { annual: 4.3, winter: 2.45, summer: 6.45, referenceLng: -71.4 },
  biobio: { annual: 4.15, winter: 2.25, summer: 6.2, referenceLng: -72.0 },
  araucania: { annual: 3.95, winter: 2.05, summer: 5.95, referenceLng: -72.3 },
  losRios: { annual: 3.75, winter: 1.8, summer: 5.65, referenceLng: -72.6 },
  losLagos: { annual: 3.55, winter: 1.65, summer: 5.35, referenceLng: -73.0 },
  aysen: { annual: 3.65, winter: 1.6, summer: 5.5, referenceLng: -72.5 },
  magallanes: { annual: 3.15, winter: 1.05, summer: 5.1, referenceLng: -71.6 },
};

const getSolarProductionProfile = (regionKey, communeKey) => {
  const communeProfile =
    maintenanceRegionData[regionKey]?.communes?.[communeKey]?.solarProfile;

  if (communeProfile) return communeProfile;

  const baseReference =
    solarGhiReferenceByRegion[regionKey] || solarGhiReferenceByRegion.metropolitana;
  const annual = Math.round(
    (baseReference.annual * 365 * SOLAR_PERFORMANCE_RATIO * SOLAR_PLANE_GAIN_FACTOR) / 12,
  );
  const winter = Math.round(
    baseReference.winter * 30 * SOLAR_PERFORMANCE_RATIO * SOLAR_PLANE_GAIN_FACTOR,
  );
  const summer = Math.round(
    baseReference.summer * 30 * SOLAR_PERFORMANCE_RATIO * SOLAR_PLANE_GAIN_FACTOR,
  );

  return {
    annual,
    winter,
    summer,
    ghiAnnual: baseReference.annual,
    ghiWinter: baseReference.winter,
    ghiSummer: baseReference.summer,
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

const homeDecisionDrivers = [
  {
    title: "Tu gasto eléctrico puede trabajar a tu favor",
    text:
      "La energía solar permite convertir parte de tu consumo mensual en una decisión patrimonial más inteligente, con compensación vía net billing y menor exposición a futuras alzas.",
  },
  {
    title: "La clave no es instalar por instalar",
    text:
      "Un proyecto bien planteado parte por revisar consumo, ubicación, perfil del hogar y objetivo de cobertura antes de definir una alternativa técnica y económica.",
  },
  {
    title: "Necesitas claridad para tomar una buena decisión",
    text:
      "Por eso Sakiara muestra una evaluación referencial clara, con inversión estimada, compensación proyectada y alternativas fáciles de comparar.",
  },
];

const homeProcessSteps = [
  {
    step: "01",
    title: "Revisamos tu punto de partida",
    text:
      "Puedes cotizar con boleta, consumo o ambos datos para construir una base simple y útil desde el primer minuto.",
  },
  {
    step: "02",
    title: "Modelamos el proyecto según tu ubicación y uso",
    text:
      "Ajustamos la evaluación con región, comuna y perfil del hogar para acercarnos mejor al comportamiento real del sistema.",
  },
  {
    step: "03",
    title: "Comparamos alternativas claras",
    text:
      "La propuesta muestra distintas configuraciones para que puedas decidir con criterio técnico y lectura económica, no a ciegas.",
  },
  {
    step: "04",
    title: "Te acompañamos hasta la ejecución",
    text:
      "Si el proyecto tiene sentido para tu propiedad, seguimos con evaluación comercial, definición final y ejecución profesional.",
  },
];

const homeTrustPillars = [
  {
    title: "Criterio técnico antes que promesas vacías",
    text:
      "La propuesta busca ser entendible y comercial, pero sin dejar de lado el análisis técnico que realmente importa en un proyecto solar.",
  },
  {
    title: "Valores referenciales claros",
    text:
      "Mostramos alternativas con IVA incluido para que el cliente entienda mejor la inversión desde el inicio.",
  },
  {
    title: "Marcas y soluciones confiables",
    text:
      "Trabajamos con configuraciones basadas en equipos reconocidos y soluciones pensadas para proyectos residenciales bien ejecutados.",
  },
  {
    title: "Postventa y mantenimiento",
    text:
      "Sakiara no se queda solo en la instalación: también evalúa el mantenimiento y continuidad operativa del sistema.",
  },
];

const enterpriseUseCases = [
  {
    title: "Bodegas y centros logísticos",
    text:
      "Cubiertas amplias, consumos diurnos y operaciones que se benefician de una evaluación más estructurada.",
  },
  {
    title: "Comercio, oficinas y operaciones",
    text:
      "Proyectos pensados para reducir costos eléctricos y ordenar una implementación clara para la empresa.",
  },
  {
    title: "Agrícola e industrial liviano",
    text:
      "Soluciones para demandas energéticas mayores, con foco en continuidad operativa, orden de montaje y criterio técnico.",
  },
];

const enterpriseEvaluationPoints = [
  "Distancias reales entre módulos, inversores, tableros y empalme.",
  "Tipo de cubierta, estructura disponible, sombras y condiciones de montaje.",
  "Potencia del empalme, red existente y estrategia de conexión net billing.",
  "Espacios para canalizaciones, protecciones, monitoreo y crecimiento futuro del sistema.",
];

const enterpriseProcessSteps = [
  {
    step: "01",
    title: "Levantamiento inicial",
    text:
      "Tomamos datos base del consumo, tipo de operación y ubicación para definir si conviene avanzar.",
  },
  {
    step: "02",
    title: "Visita técnica en terreno",
    text:
      "Revisamos cubiertas, recorridos, tableros, empalme y condiciones reales antes de cerrar una propuesta.",
  },
  {
    step: "03",
    title: "Propuesta técnica y comercial",
    text:
      "Ordenamos una solución a medida, con potencia sugerida, alcance, inversión referencial y etapas del proyecto.",
  },
  {
    step: "04",
    title: "Ejecución y puesta en marcha",
    text:
      "Si el proyecto avanza, seguimos con ingeniería, tramitación, coordinación de medidor y arranque del sistema.",
  },
];

const enterpriseProjectTypeOptions = [
  { value: "bodega", label: "Bodega / centro logístico" },
  { value: "comercio", label: "Comercio / retail" },
  { value: "oficina", label: "Oficinas / operación" },
  { value: "agricola", label: "Agrícola" },
  { value: "industrial", label: "Industrial liviano" },
  { value: "otro", label: "Otro" },
];

const enterpriseSurfaceTypeOptions = [
  { value: "cubierta", label: "Cubierta" },
  { value: "suelo", label: "Suelo / estructura en terreno" },
  { value: "estacionamiento", label: "Estacionamientos / sombreaderos" },
  { value: "mixto", label: "Mixto" },
];

const enterpriseCommercialIntentOptions = [
  { value: "compra", label: "Compra directa" },
  { value: "evaluar", label: "Evaluar estructura comercial" },
  { value: "a-definir", label: "A definir en visita" },
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

const BASE_OPERATION_LOCATION = { label: "Colina", lat: -33.2045, lng: -70.6746 };

const CHILE_REGIONS_COMMUNES = [
  {
    "key": "aricaParinacota",
    "label": "Arica y Parinacota",
    "communes": [
      "Arica",
      "Camarones",
      "Putre",
      "General Lagos"
    ]
  },
  {
    "key": "tarapaca",
    "label": "Tarapacá",
    "communes": [
      "Iquique",
      "Alto Hospicio",
      "Pozo Almonte",
      "Camiña",
      "Colchane",
      "Huara",
      "Pica"
    ]
  },
  {
    "key": "antofagasta",
    "label": "Antofagasta",
    "communes": [
      "Antofagasta",
      "Mejillones",
      "Sierra Gorda",
      "Taltal",
      "Calama",
      "Ollagüe",
      "San Pedro de Atacama",
      "Tocopilla",
      "María Elena"
    ]
  },
  {
    "key": "atacama",
    "label": "Atacama",
    "communes": [
      "Copiapó",
      "Caldera",
      "Tierra Amarilla",
      "Chañaral",
      "Diego de Almagro",
      "Vallenar",
      "Alto del Carmen",
      "Freirina",
      "Huasco"
    ]
  },
  {
    "key": "coquimbo",
    "label": "Coquimbo",
    "communes": [
      "La Serena",
      "Coquimbo",
      "Andacollo",
      "La Higuera",
      "Paihuano",
      "Vicuña",
      "Illapel",
      "Canela",
      "Los Vilos",
      "Salamanca",
      "Ovalle",
      "Combarbalá",
      "Monte Patria",
      "Punitaqui",
      "Río Hurtado"
    ]
  },
  {
    "key": "valparaiso",
    "label": "Valparaíso",
    "communes": [
      "Valparaíso",
      "Casablanca",
      "Concón",
      "Juan Fernández",
      "Puchuncaví",
      "Quintero",
      "Viña del Mar",
      "Isla de Pascua",
      "Los Andes",
      "Calle Larga",
      "Rinconada",
      "San Esteban",
      "La Ligua",
      "Cabildo",
      "Papudo",
      "Petorca",
      "Zapallar",
      "Quillota",
      "Calera",
      "Hijuelas",
      "La Cruz",
      "Nogales",
      "San Antonio",
      "Algarrobo",
      "Cartagena",
      "El Quisco",
      "El Tabo",
      "Santo Domingo",
      "San Felipe",
      "Catemu",
      "Llaillay",
      "Panquehue",
      "Putaendo",
      "Santa María",
      "Quilpué",
      "Limache",
      "Olmué",
      "Villa Alemana"
    ]
  },
  {
    "key": "metropolitana",
    "label": "Región Metropolitana",
    "communes": [
      "Cerrillos",
      "Cerro Navia",
      "Conchalí",
      "El Bosque",
      "Estación Central",
      "Huechuraba",
      "Independencia",
      "La Cisterna",
      "La Florida",
      "La Granja",
      "La Pintana",
      "La Reina",
      "Las Condes",
      "Lo Barnechea",
      "Lo Espejo",
      "Lo Prado",
      "Macul",
      "Maipú",
      "Ñuñoa",
      "Pedro Aguirre Cerda",
      "Peñalolén",
      "Providencia",
      "Pudahuel",
      "Quilicura",
      "Quinta Normal",
      "Recoleta",
      "Renca",
      "Santiago",
      "San Joaquín",
      "San Miguel",
      "San Ramón",
      "Vitacura",
      "Puente Alto",
      "Pirque",
      "San José de Maipo",
      "Colina",
      "Lampa",
      "Tiltil",
      "San Bernardo",
      "Buin",
      "Calera de Tango",
      "Paine",
      "Melipilla",
      "Alhué",
      "Curacaví",
      "María Pinto",
      "San Pedro",
      "Talagante",
      "El Monte",
      "Isla de Maipo",
      "Padre Hurtado",
      "Peñaflor"
    ]
  },
  {
    "key": "ohiggins",
    "label": "O'Higgins",
    "communes": [
      "Rancagua",
      "Codegua",
      "Coinco",
      "Coltauco",
      "Doñihue",
      "Graneros",
      "Las Cabras",
      "Machalí",
      "Malloa",
      "Mostazal",
      "Olivar",
      "Peumo",
      "Pichidegua",
      "Quinta de Tilcoco",
      "Rengo",
      "Requínoa",
      "San Vicente",
      "Pichilemu",
      "La Estrella",
      "Litueche",
      "Marchihue",
      "Navidad",
      "Paredones",
      "San Fernando",
      "Chépica",
      "Chimbarongo",
      "Lolol",
      "Nancagua",
      "Palmilla",
      "Peralillo",
      "Placilla",
      "Pumanque",
      "Santa Cruz"
    ]
  },
  {
    "key": "maule",
    "label": "Maule",
    "communes": [
      "Talca",
      "Constitución",
      "Curepto",
      "Empedrado",
      "Maule",
      "Pelarco",
      "Pencahue",
      "Río Claro",
      "San Clemente",
      "San Rafael",
      "Cauquenes",
      "Chanco",
      "Pelluhue",
      "Curicó",
      "Hualañé",
      "Licantén",
      "Molina",
      "Rauco",
      "Romeral",
      "Sagrada Familia",
      "Teno",
      "Vichuquén",
      "Linares",
      "Colbún",
      "Longaví",
      "Parral",
      "Retiro",
      "San Javier",
      "Villa Alegre",
      "Yerbas Buenas"
    ]
  },
  {
    "key": "nuble",
    "label": "Ñuble",
    "communes": [
      "Cobquecura",
      "Coelemu",
      "Ninhue",
      "Portezuelo",
      "Quirihue",
      "Ránquil",
      "Treguaco",
      "Bulnes",
      "Chillán Viejo",
      "Chillán",
      "El Carmen",
      "Pemuco",
      "Pinto",
      "Quillón",
      "San Ignacio",
      "Yungay",
      "Coihueco",
      "Ñiquén",
      "San Carlos",
      "San Fabián",
      "San Nicolás"
    ]
  },
  {
    "key": "biobio",
    "label": "Biobío",
    "communes": [
      "Concepción",
      "Coronel",
      "Chiguayante",
      "Florida",
      "Hualqui",
      "Lota",
      "Penco",
      "San Pedro de la Paz",
      "Santa Juana",
      "Talcahuano",
      "Tomé",
      "Hualpén",
      "Lebu",
      "Arauco",
      "Cañete",
      "Contulmo",
      "Curanilahue",
      "Los Álamos",
      "Tirúa",
      "Los Ángeles",
      "Antuco",
      "Cabrero",
      "Laja",
      "Mulchén",
      "Nacimiento",
      "Negrete",
      "Quilaco",
      "Quilleco",
      "San Rosendo",
      "Santa Bárbara",
      "Tucapel",
      "Yumbel",
      "Alto Biobío"
    ]
  },
  {
    "key": "araucania",
    "label": "La Araucanía",
    "communes": [
      "Temuco",
      "Carahue",
      "Cunco",
      "Curarrehue",
      "Freire",
      "Galvarino",
      "Gorbea",
      "Lautaro",
      "Loncoche",
      "Melipeuco",
      "Nueva Imperial",
      "Padre Las Casas",
      "Perquenco",
      "Pitrufquén",
      "Pucón",
      "Saavedra",
      "Teodoro Schmidt",
      "Toltén",
      "Vilcún",
      "Villarrica",
      "Cholchol",
      "Angol",
      "Collipulli",
      "Curacautín",
      "Ercilla",
      "Lonquimay",
      "Los Sauces",
      "Lumaco",
      "Purén",
      "Renaico",
      "Traiguén",
      "Victoria"
    ]
  },
  {
    "key": "losRios",
    "label": "Los Ríos",
    "communes": [
      "Valdivia",
      "Corral",
      "Lanco",
      "Los Lagos",
      "Máfil",
      "Mariquina",
      "Paillaco",
      "Panguipulli",
      "La Unión",
      "Futrono",
      "Lago Ranco",
      "Río Bueno"
    ]
  },
  {
    "key": "losLagos",
    "label": "Los Lagos",
    "communes": [
      "Puerto Montt",
      "Calbuco",
      "Cochamó",
      "Fresia",
      "Frutillar",
      "Los Muermos",
      "Llanquihue",
      "Maullín",
      "Puerto Varas",
      "Castro",
      "Ancud",
      "Chonchi",
      "Curaco de Vélez",
      "Dalcahue",
      "Puqueldón",
      "Queilén",
      "Quellón",
      "Quemchi",
      "Quinchao",
      "Osorno",
      "Puerto Octay",
      "Purranque",
      "Puyehue",
      "Río Negro",
      "San Juan de la Costa",
      "San Pablo",
      "Chaitén",
      "Futaleufú",
      "Hualaihué",
      "Palena"
    ]
  },
  {
    "key": "aysen",
    "label": "Aysén",
    "communes": [
      "Coyhaique",
      "Lago Verde",
      "Aysén",
      "Cisnes",
      "Guaitecas",
      "Cochrane",
      "O'Higgins",
      "Tortel",
      "Chile Chico",
      "Río Ibáñez"
    ]
  },
  {
    "key": "magallanes",
    "label": "Magallanes",
    "communes": [
      "Punta Arenas",
      "Laguna Blanca",
      "Río Verde",
      "San Gregorio",
      "Cabo de Hornos",
      "Antártica",
      "Porvenir",
      "Primavera",
      "Timaukel",
      "Natales",
      "Torres del Paine"
    ]
  }
];

const REGION_COORDINATE_REFERENCE = {
  aricaParinacota: { lat: -18.65, lng: -69.65, latSpread: 1.2, lngSpread: 0.75, latJitter: 0.12, lngJitter: 0.18 },
  tarapaca: { lat: -20.1, lng: -69.45, latSpread: 1.3, lngSpread: 0.85, latJitter: 0.18, lngJitter: 0.22 },
  antofagasta: { lat: -23.25, lng: -69.55, latSpread: 2.4, lngSpread: 1.1, latJitter: 0.2, lngJitter: 0.28 },
  atacama: { lat: -27.35, lng: -70.35, latSpread: 2.1, lngSpread: 0.8, latJitter: 0.18, lngJitter: 0.24 },
  coquimbo: { lat: -30.3, lng: -70.8, latSpread: 2.1, lngSpread: 0.75, latJitter: 0.18, lngJitter: 0.24 },
  valparaiso: { lat: -32.85, lng: -71.15, latSpread: 1.9, lngSpread: 0.7, latJitter: 0.16, lngJitter: 0.2 },
  metropolitana: { lat: -33.55, lng: -70.75, latSpread: 1.45, lngSpread: 0.55, latJitter: 0.12, lngJitter: 0.16 },
  ohiggins: { lat: -34.35, lng: -71.0, latSpread: 1.8, lngSpread: 0.75, latJitter: 0.16, lngJitter: 0.2 },
  maule: { lat: -35.55, lng: -71.55, latSpread: 2.1, lngSpread: 0.9, latJitter: 0.18, lngJitter: 0.22 },
  nuble: { lat: -36.6, lng: -72.0, latSpread: 1.2, lngSpread: 0.75, latJitter: 0.14, lngJitter: 0.18 },
  biobio: { lat: -37.25, lng: -72.4, latSpread: 2.0, lngSpread: 0.9, latJitter: 0.18, lngJitter: 0.24 },
  araucania: { lat: -38.75, lng: -72.55, latSpread: 1.9, lngSpread: 0.9, latJitter: 0.16, lngJitter: 0.22 },
  losRios: { lat: -39.85, lng: -72.85, latSpread: 1.1, lngSpread: 0.8, latJitter: 0.14, lngJitter: 0.18 },
  losLagos: { lat: -41.55, lng: -73.2, latSpread: 3.2, lngSpread: 1.25, latJitter: 0.22, lngJitter: 0.32 },
  aysen: { lat: -46.25, lng: -72.75, latSpread: 4.8, lngSpread: 1.4, latJitter: 0.32, lngJitter: 0.34 },
  magallanes: { lat: -52.5, lng: -71.15, latSpread: 5.1, lngSpread: 1.6, latJitter: 0.34, lngJitter: 0.36 },
};

const REGION_ROAD_FACTOR = {
  aricaParinacota: 1.18,
  tarapaca: 1.18,
  antofagasta: 1.18,
  atacama: 1.16,
  coquimbo: 1.16,
  valparaiso: 1.22,
  metropolitana: 1.35,
  ohiggins: 1.22,
  maule: 1.24,
  nuble: 1.25,
  biobio: 1.28,
  araucania: 1.3,
  losRios: 1.32,
  losLagos: 1.35,
  aysen: 1.55,
  magallanes: 1.62,
};

const COMMUNE_COORDINATE_OVERRIDES = {
  aricaParinacota: {
    arica: { lat: -18.4783, lng: -70.3126 },
    camarones: { lat: -19.0167, lng: -69.8667 },
    putre: { lat: -18.1982, lng: -69.5593 },
    "general-lagos": { lat: -17.6500, lng: -69.6333 },
  },
  tarapaca: {
    iquique: { lat: -20.2133, lng: -70.1524 },
    "alto-hospicio": { lat: -20.2682, lng: -70.1048 },
    "pozo-almonte": { lat: -20.2596, lng: -69.7862 },
    camina: { lat: -19.3128, lng: -69.4264 },
    colchane: { lat: -19.2733, lng: -68.6378 },
    huara: { lat: -19.9966, lng: -69.7717 },
    pica: { lat: -20.4892, lng: -69.3286 },
  },
  antofagasta: {
    antofagasta: { lat: -23.6509, lng: -70.3975 },
    mejillones: { lat: -23.1000, lng: -70.4500 },
    "sierra-gorda": { lat: -22.8895, lng: -69.3204 },
    taltal: { lat: -25.4000, lng: -70.4833 },
    calama: { lat: -22.4667, lng: -68.9333 },
    ollague: { lat: -21.2247, lng: -68.2539 },
    "san-pedro-de-atacama": { lat: -22.9087, lng: -68.1997 },
    tocopilla: { lat: -22.0861, lng: -70.1979 },
    "maria-elena": { lat: -22.3450, lng: -69.6600 },
  },
  atacama: {
    copiapo: { lat: -27.3668, lng: -70.3323 },
    caldera: { lat: -27.0667, lng: -70.8333 },
    "tierra-amarilla": { lat: -27.4667, lng: -70.2667 },
    chanaral: { lat: -26.3450, lng: -70.6200 },
    "diego-de-almagro": { lat: -26.3900, lng: -70.0500 },
    vallenar: { lat: -28.5700, lng: -70.7600 },
    "alto-del-carmen": { lat: -28.7600, lng: -70.4900 },
    freirina: { lat: -28.5100, lng: -71.0800 },
    huasco: { lat: -28.4700, lng: -71.2200 },
  },
  coquimbo: {
    "la-serena": { lat: -29.9045, lng: -71.2489 },
    coquimbo: { lat: -29.9533, lng: -71.3436 },
    andacollo: { lat: -30.2300, lng: -71.0850 },
    "la-higuera": { lat: -29.5000, lng: -71.2667 },
    paihuano: { lat: -30.0300, lng: -70.5170 },
    vicuna: { lat: -30.0319, lng: -70.7081 },
    illapel: { lat: -31.6300, lng: -71.1700 },
    canela: { lat: -31.4000, lng: -71.4500 },
    "los-vilos": { lat: -31.9100, lng: -71.5100 },
    salamanca: { lat: -31.7800, lng: -70.9700 },
    ovalle: { lat: -30.6011, lng: -71.1990 },
    combarbala: { lat: -31.1800, lng: -71.0000 },
    "monte-patria": { lat: -30.6900, lng: -70.9500 },
    punitqui: { lat: -30.8300, lng: -71.2600 },
    "rio-hurtado": { lat: -30.2700, lng: -70.6900 },
  },
  valparaiso: {
    valparaiso: { lat: -33.0472, lng: -71.6127 },
    casablanca: { lat: -33.3167, lng: -71.4167 },
    concon: { lat: -32.9333, lng: -71.5167 },
    "juan-fernandez": { lat: -33.6400, lng: -78.8300, island: true },
    puchuncavi: { lat: -32.7333, lng: -71.4167 },
    quintero: { lat: -32.7833, lng: -71.5333 },
    "vina-del-mar": { lat: -33.0245, lng: -71.5518 },
    "isla-de-pascua": { lat: -27.1127, lng: -109.3497, island: true, solarBoost: 0.15 },
    "los-andes": { lat: -32.8333, lng: -70.6000 },
    "calle-larga": { lat: -32.8500, lng: -70.6333 },
    rinconada: { lat: -32.8333, lng: -70.7000 },
    "san-esteban": { lat: -32.8000, lng: -70.5833 },
    "la-ligua": { lat: -32.4500, lng: -71.2333 },
    cabildo: { lat: -32.4250, lng: -71.0667 },
    papudo: { lat: -32.5167, lng: -71.4500 },
    petorca: { lat: -32.2500, lng: -70.9333 },
    zapallar: { lat: -32.5500, lng: -71.4500 },
    quillota: { lat: -32.8833, lng: -71.2500 },
    calera: { lat: -32.7833, lng: -71.2167 },
    hijuelas: { lat: -32.8000, lng: -71.1667 },
    "la-cruz": { lat: -32.8250, lng: -71.2333 },
    nogales: { lat: -32.7333, lng: -71.2333 },
    "san-antonio": { lat: -33.5933, lng: -71.6217 },
    algarrobo: { lat: -33.3911, lng: -71.6928 },
    cartagena: { lat: -33.5486, lng: -71.5997 },
    "el-quisco": { lat: -33.4000, lng: -71.7000 },
    "el-tabo": { lat: -33.4500, lng: -71.6667 },
    "santo-domingo": { lat: -33.6333, lng: -71.6333 },
    "san-felipe": { lat: -32.7500, lng: -70.7333 },
    catemu: { lat: -32.6333, lng: -71.0333 },
    llaillay: { lat: -32.8333, lng: -70.9667 },
    panquehue: { lat: -32.8000, lng: -70.8333 },
    putaendo: { lat: -32.6333, lng: -70.7167 },
    "santa-maria": { lat: -32.7500, lng: -70.6500 },
    quilpue: { lat: -33.0500, lng: -71.4500 },
    limache: { lat: -33.0167, lng: -71.2667 },
    olmue: { lat: -32.9950, lng: -71.1860 },
    "villa-alemana": { lat: -33.0500, lng: -71.3667 },
  },
  metropolitana: {
    cerrillos: { lat: -33.5000, lng: -70.7167 },
    "cerro-navia": { lat: -33.4250, lng: -70.7333 },
    conchali: { lat: -33.3833, lng: -70.6750 },
    "el-bosque": { lat: -33.5667, lng: -70.6750 },
    "estacion-central": { lat: -33.4590, lng: -70.6980 },
    huechuraba: { lat: -33.3667, lng: -70.6333 },
    independencia: { lat: -33.4167, lng: -70.6667 },
    "la-cisterna": { lat: -33.5370, lng: -70.6640 },
    "la-florida": { lat: -33.5333, lng: -70.5833 },
    "la-granja": { lat: -33.5333, lng: -70.6250 },
    "la-pintana": { lat: -33.5833, lng: -70.6333 },
    "la-reina": { lat: -33.4500, lng: -70.5500 },
    "las-condes": { lat: -33.4167, lng: -70.5833 },
    "lo-barnechea": { lat: -33.3500, lng: -70.5167 },
    "lo-espejo": { lat: -33.5167, lng: -70.6833 },
    "lo-prado": { lat: -33.4500, lng: -70.7250 },
    macul: { lat: -33.5000, lng: -70.6000 },
    maipu: { lat: -33.5167, lng: -70.7667 },
    nunoa: { lat: -33.4569, lng: -70.5978 },
    "pedro-aguirre-cerda": { lat: -33.4910, lng: -70.6760 },
    penalolen: { lat: -33.4833, lng: -70.5333 },
    providencia: { lat: -33.4310, lng: -70.6090 },
    pudahuel: { lat: -33.4333, lng: -70.7667 },
    quilicura: { lat: -33.3667, lng: -70.7333 },
    "quinta-normal": { lat: -33.4280, lng: -70.7000 },
    recoleta: { lat: -33.4167, lng: -70.6333 },
    renca: { lat: -33.4000, lng: -70.7167 },
    santiago: { lat: -33.4489, lng: -70.6693 },
    "san-joaquin": { lat: -33.5000, lng: -70.6167 },
    "san-miguel": { lat: -33.5000, lng: -70.6500 },
    "san-ramon": { lat: -33.5333, lng: -70.6500 },
    vitacura: { lat: -33.4000, lng: -70.6000 },
    "puente-alto": { lat: -33.6167, lng: -70.5667 },
    pirque: { lat: -33.6333, lng: -70.5667 },
    "san-jose-de-maipo": { lat: -33.6333, lng: -70.3500, solarBoost: -0.08 },
    colina: { lat: -33.2045, lng: -70.6746, solarBoost: 0.06 },
    lampa: { lat: -33.2833, lng: -70.9000, solarBoost: 0.06 },
    tiltil: { lat: -33.0833, lng: -70.9333, solarBoost: 0.07 },
    "san-bernardo": { lat: -33.5833, lng: -70.7000 },
    buin: { lat: -33.7333, lng: -70.7333 },
    "calera-de-tango": { lat: -33.6333, lng: -70.7833 },
    paine: { lat: -33.8167, lng: -70.7500 },
    melipilla: { lat: -33.6833, lng: -71.2167 },
    alhue: { lat: -34.0333, lng: -71.1000 },
    curacavi: { lat: -33.4000, lng: -71.1333 },
    "maria-pinto": { lat: -33.5167, lng: -71.1167 },
    "san-pedro": { lat: -33.9000, lng: -71.4667 },
    talagante: { lat: -33.6667, lng: -70.9333 },
    "el-monte": { lat: -33.6833, lng: -71.0167 },
    "isla-de-maipo": { lat: -33.7500, lng: -70.9000 },
    "padre-hurtado": { lat: -33.5667, lng: -70.8167 },
    penaflor: { lat: -33.6000, lng: -70.8833 },
  },
  ohiggins: {
    rancagua: { lat: -34.1700, lng: -70.7400 },
    machali: { lat: -34.1833, lng: -70.6667 },
    "san-fernando": { lat: -34.5833, lng: -70.9833 },
    pichilemu: { lat: -34.3833, lng: -72.0000 },
  },
  maule: {
    talca: { lat: -35.4264, lng: -71.6554 },
    curico: { lat: -34.9833, lng: -71.2333 },
    linares: { lat: -35.8500, lng: -71.6000 },
    parral: { lat: -36.1500, lng: -71.8333 },
    constitucion: { lat: -35.3333, lng: -72.4167 },
  },
  nuble: {
    chillan: { lat: -36.6067, lng: -72.1034 },
    "chillan-viejo": { lat: -36.6167, lng: -72.1333 },
    "san-carlos": { lat: -36.4250, lng: -71.9583 },
  },
  biobio: {
    concepcion: { lat: -36.8269, lng: -73.0503 },
    talcahuano: { lat: -36.7167, lng: -73.1167 },
    "los-angeles": { lat: -37.4667, lng: -72.3500 },
    coronel: { lat: -37.0167, lng: -73.1500 },
  },
  araucania: {
    temuco: { lat: -38.7359, lng: -72.5904 },
    villarrica: { lat: -39.2857, lng: -72.2279 },
    pucon: { lat: -39.2823, lng: -71.9540 },
    angol: { lat: -37.8000, lng: -72.7167 },
  },
  losRios: {
    valdivia: { lat: -39.8142, lng: -73.2459 },
    "la-union": { lat: -40.2933, lng: -73.0817 },
    "rio-bueno": { lat: -40.3300, lng: -72.9500 },
  },
  losLagos: {
    "puerto-montt": { lat: -41.4693, lng: -72.9424 },
    osorno: { lat: -40.5739, lng: -73.1335 },
    castro: { lat: -42.4801, lng: -73.7624 },
    ancud: { lat: -41.8675, lng: -73.8277 },
    quellon: { lat: -43.1167, lng: -73.6167 },
    "puerto-varas": { lat: -41.3167, lng: -72.9833 },
    chaiten: { lat: -42.9156, lng: -72.7063 },
  },
  aysen: {
    coyhaique: { lat: -45.5712, lng: -72.0685 },
    aysen: { lat: -45.4000, lng: -72.7000 },
    cochrane: { lat: -47.2533, lng: -72.5722 },
    "chile-chico": { lat: -46.5400, lng: -71.7200 },
    tortel: { lat: -47.8000, lng: -73.5333 },
  },
  magallanes: {
    "punta-arenas": { lat: -53.1638, lng: -70.9171 },
    "puerto-natales": { lat: -51.7300, lng: -72.5067 },
    natales: { lat: -51.7300, lng: -72.5067 },
    porvenir: { lat: -53.3000, lng: -70.3667 },
    "cabo-de-hornos": { lat: -55.9833, lng: -67.2667, island: true },
    antartica: { lat: -62.0000, lng: -58.0000, island: true, solarBoost: -0.35 },
  },
};

const COMMUNE_LOGISTICS_OVERRIDES = {
  metropolitana: {
    alhue: { roundTripKm: 250, tolls: 12000 },
    buin: { roundTripKm: 118, tolls: 3000 },
    "calera-de-tango": { roundTripKm: 92, tolls: 0 },
    cerrillos: { roundTripKm: 62, tolls: 0 },
    "cerro-navia": { roundTripKm: 50, tolls: 0 },
    colina: { roundTripKm: 0, tolls: 0 },
    conchali: { roundTripKm: 44, tolls: 0 },
    curacavi: { roundTripKm: 132, tolls: 9000 },
    "el-bosque": { roundTripKm: 72, tolls: 0 },
    "el-monte": { roundTripKm: 118, tolls: 4000 },
    "estacion-central": { roundTripKm: 58, tolls: 0 },
    huechuraba: { roundTripKm: 36, tolls: 0 },
    independencia: { roundTripKm: 46, tolls: 0 },
    "isla-de-maipo": { roundTripKm: 122, tolls: 5000 },
    "la-cisterna": { roundTripKm: 70, tolls: 0 },
    "la-florida": { roundTripKm: 74, tolls: 0 },
    "la-granja": { roundTripKm: 76, tolls: 0 },
    "la-pintana": { roundTripKm: 86, tolls: 0 },
    "la-reina": { roundTripKm: 72, tolls: 0 },
    lampa: { roundTripKm: 28, tolls: 0 },
    "las-condes": { roundTripKm: 72, tolls: 0 },
    "lo-barnechea": { roundTripKm: 84, tolls: 0 },
    "lo-espejo": { roundTripKm: 72, tolls: 0 },
    "lo-prado": { roundTripKm: 54, tolls: 0 },
    macul: { roundTripKm: 70, tolls: 0 },
    maipu: { roundTripKm: 78, tolls: 0 },
    "maria-pinto": { roundTripKm: 150, tolls: 6000 },
    melipilla: { roundTripKm: 154, tolls: 7000 },
    nunoa: { roundTripKm: 66, tolls: 0 },
    "padre-hurtado": { roundTripKm: 92, tolls: 4000 },
    paine: { roundTripKm: 150, tolls: 5000 },
    "pedro-aguirre-cerda": { roundTripKm: 64, tolls: 0 },
    penaflor: { roundTripKm: 98, tolls: 4000 },
    penalolen: { roundTripKm: 76, tolls: 0 },
    pirque: { roundTripKm: 106, tolls: 0 },
    providencia: { roundTripKm: 60, tolls: 0 },
    pudahuel: { roundTripKm: 58, tolls: 0 },
    "puente-alto": { roundTripKm: 90, tolls: 0 },
    quilicura: { roundTripKm: 26, tolls: 0 },
    "quinta-normal": { roundTripKm: 52, tolls: 0 },
    recoleta: { roundTripKm: 48, tolls: 0 },
    renca: { roundTripKm: 42, tolls: 0 },
    "san-bernardo": { roundTripKm: 88, tolls: 0 },
    "san-joaquin": { roundTripKm: 70, tolls: 0 },
    "san-jose-de-maipo": { roundTripKm: 156, tolls: 0 },
    "san-miguel": { roundTripKm: 66, tolls: 0 },
    "san-pedro": { roundTripKm: 216, tolls: 9000 },
    "san-ramon": { roundTripKm: 78, tolls: 0 },
    santiago: { roundTripKm: 54, tolls: 0 },
    talagante: { roundTripKm: 108, tolls: 4000 },
    tiltil: { roundTripKm: 76, tolls: 0 },
    vitacura: { roundTripKm: 64, tolls: 0 },
  },
  aricaParinacota: { arica: { roundTripKm: 4120, tolls: 65000 }, putre: { roundTripKm: 4300, tolls: 65000 } },
  tarapaca: { iquique: { roundTripKm: 3600, tolls: 56000 }, "alto-hospicio": { roundTripKm: 3600, tolls: 56000 } },
  antofagasta: { antofagasta: { roundTripKm: 2740, tolls: 46000 }, calama: { roundTripKm: 3000, tolls: 49000 } },
  atacama: { copiapo: { roundTripKm: 1660, tolls: 30000 }, vallenar: { roundTripKm: 1320, tolls: 26000 } },
  coquimbo: { "la-serena": { roundTripKm: 940, tolls: 18000 }, coquimbo: { roundTripKm: 950, tolls: 18000 }, ovalle: { roundTripKm: 780, tolls: 16000 } },
  valparaiso: {
    valparaiso: { roundTripKm: 300, tolls: 12000 },
    "vina-del-mar": { roundTripKm: 310, tolls: 12000 },
    quilpue: { roundTripKm: 290, tolls: 10000 },
    concon: { roundTripKm: 320, tolls: 12000 },
    "los-andes": { roundTripKm: 220, tolls: 9000 },
    "san-felipe": { roundTripKm: 200, tolls: 9000 },
    "juan-fernandez": { roundTripKm: 1320, tolls: 0, specialLogistics: true },
    "isla-de-pascua": { roundTripKm: 7500, tolls: 0, specialLogistics: true },
  },
  ohiggins: { rancagua: { roundTripKm: 170, tolls: 6000 }, machali: { roundTripKm: 180, tolls: 6000 }, "san-fernando": { roundTripKm: 280, tolls: 9000 }, pichilemu: { roundTripKm: 430, tolls: 13000 } },
  maule: { talca: { roundTripKm: 510, tolls: 14000 }, curico: { roundTripKm: 380, tolls: 11000 }, linares: { roundTripKm: 620, tolls: 16000 } },
  nuble: { chillan: { roundTripKm: 800, tolls: 19000 }, "san-carlos": { roundTripKm: 740, tolls: 18000 } },
  biobio: { concepcion: { roundTripKm: 1040, tolls: 24000 }, talcahuano: { roundTripKm: 1060, tolls: 24000 }, "los-angeles": { roundTripKm: 900, tolls: 21000 } },
  araucania: { temuco: { roundTripKm: 1380, tolls: 30000 }, villarrica: { roundTripKm: 1520, tolls: 32000 } },
  losRios: { valdivia: { roundTripKm: 1680, tolls: 35000 }, "la-union": { roundTripKm: 1750, tolls: 36000 } },
  losLagos: { "puerto-montt": { roundTripKm: 2090, tolls: 40000 }, osorno: { roundTripKm: 1820, tolls: 38000 }, castro: { roundTripKm: 2390, tolls: 45000 } },
  aysen: { coyhaique: { roundTripKm: 3380, tolls: 20000 }, aysen: { roundTripKm: 3460, tolls: 20000 } },
  magallanes: { "punta-arenas": { roundTripKm: 5660, tolls: 10000 }, natales: { roundTripKm: 5400, tolls: 10000 } },
};

const roundToNearest = (value, step = 1) => Math.round(value / step) * step;

const getCommuneCoordinateProfile = (regionKey, communeKey, index, total) => {
  const override = COMMUNE_COORDINATE_OVERRIDES[regionKey]?.[communeKey];
  if (override) return override;

  const regionReference =
    REGION_COORDINATE_REFERENCE[regionKey] || REGION_COORDINATE_REFERENCE.metropolitana;
  const normalizedIndex = total > 1 ? index / (total - 1) - 0.5 : 0;
  const wave = Math.sin((index + 1) * 1.735);
  const counterWave = Math.cos((index + 1) * 2.113);

  return {
    lat: Number(
      (regionReference.lat + normalizedIndex * regionReference.latSpread + wave * regionReference.latJitter).toFixed(4),
    ),
    lng: Number(
      (regionReference.lng + counterWave * regionReference.lngSpread + normalizedIndex * regionReference.lngJitter).toFixed(4),
    ),
    approximate: true,
  };
};

const getHaversineDistanceKm = (from, to) => {
  const earthRadiusKm = 6371;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateRoundTripKmFromCoordinates = (regionKey, coordinates) => {
  if (coordinates?.island) {
    return roundToNearest(getHaversineDistanceKm(BASE_OPERATION_LOCATION, coordinates) * 2, 10);
  }

  const oneWayKm = getHaversineDistanceKm(BASE_OPERATION_LOCATION, coordinates);
  const roadFactor = REGION_ROAD_FACTOR[regionKey] || 1.3;
  const localMinimum = regionKey === "metropolitana" ? 0 : 90;

  return roundToNearest(Math.max(oneWayKm * 2 * roadFactor, localMinimum), 10);
};

const estimateTollsFromDistance = (regionKey, roundTripKm, coordinates) => {
  if (coordinates?.island || roundTripKm < 90) return 0;

  const oneWayKm = roundTripKm / 2;
  const tollRateByRegion =
    ["valparaiso", "metropolitana", "ohiggins", "maule", "nuble", "biobio"].includes(regionKey)
      ? 39
      : 32;
  const estimatedTolls = oneWayKm * tollRateByRegion;

  return roundToNearest(clamp(estimatedTolls, 0, 65000), 1000);
};

const estimateSolarProfileFromCoordinates = (regionKey, coordinates) => {
  const reference =
    solarGhiReferenceByRegion[regionKey] || solarGhiReferenceByRegion.metropolitana;
  const longitudeDelta = (coordinates.lng || reference.referenceLng) - reference.referenceLng;
  const inlandBoost = clamp(longitudeDelta * 0.08, -0.18, 0.22);
  const islandAdjustment = coordinates.island ? -0.08 : 0;
  const annualGhi = clamp(
    reference.annual + inlandBoost + islandAdjustment + (coordinates.solarBoost || 0),
    2.4,
    7.1,
  );
  const winterGhi = clamp(
    reference.winter + inlandBoost * 0.55 + islandAdjustment + (coordinates.solarBoost || 0) * 0.8,
    0.85,
    6.2,
  );
  const summerGhi = clamp(
    reference.summer + inlandBoost * 0.45 + islandAdjustment + (coordinates.solarBoost || 0) * 0.55,
    3.6,
    8.1,
  );

  return {
    annual: Math.round((annualGhi * 365 * SOLAR_PERFORMANCE_RATIO * SOLAR_PLANE_GAIN_FACTOR) / 12),
    winter: Math.round(winterGhi * 30 * SOLAR_PERFORMANCE_RATIO * SOLAR_PLANE_GAIN_FACTOR),
    summer: Math.round(summerGhi * 30 * SOLAR_PERFORMANCE_RATIO * SOLAR_PLANE_GAIN_FACTOR),
    ghiAnnual: Number(annualGhi.toFixed(2)),
    ghiWinter: Number(winterGhi.toFixed(2)),
    ghiSummer: Number(summerGhi.toFixed(2)),
  };
};

const buildCommuneConfig = (regionKey, communeLabel, index, total) => {
  const communeKey = slugifyPathSegment(communeLabel);
  const coordinates = getCommuneCoordinateProfile(regionKey, communeKey, index, total);
  const logisticsOverride = COMMUNE_LOGISTICS_OVERRIDES[regionKey]?.[communeKey];
  const roundTripKm =
    logisticsOverride?.roundTripKm ??
    estimateRoundTripKmFromCoordinates(regionKey, coordinates);
  const tolls =
    logisticsOverride?.tolls ?? estimateTollsFromDistance(regionKey, roundTripKm, coordinates);

  return [
    communeKey,
    {
      label: communeLabel,
      roundTripKm,
      tolls,
      specialLogistics: Boolean(logisticsOverride?.specialLogistics || coordinates.island),
      coordinates,
      solarProfile: estimateSolarProfileFromCoordinates(regionKey, coordinates),
    },
  ];
};

const maintenanceRegionData = Object.fromEntries(
  CHILE_REGIONS_COMMUNES.map((region) => [
    region.key,
    {
      label: region.label,
      communes: Object.fromEntries(
        region.communes.map((communeLabel, index) =>
          buildCommuneConfig(region.key, communeLabel, index, region.communes.length),
        ),
      ),
    },
  ]),
);

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
  empresas: "/empresas",
  mantenimiento: "/mantenimiento",
};

const getViewFromPath = (pathname = "/") => {
  if (pathname === "/instalacion") return "instalacion";
  if (pathname === "/empresas") return "empresas";
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
    empresas: {
      title: "Energía solar para empresas | Sakiara Solar",
      description:
        "Evaluamos proyectos solares para empresas con foco técnico-comercial, visita en terreno y una referencia desde $500.000 por kWp según condiciones del proyecto.",
      path: "/empresas",
      pageName: "Energía solar para empresas",
      image: `${normalizedOrigin}/proyectos/empresa-referencia.jpg`,
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
  winterCompensation,
  summerCompensation,
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
              <div className="stat-label">Invierno</div>
              <div className="stat-value">{winterCompensation}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Verano</div>
              <div className="stat-value">{summerCompensation}</div>
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


let pdfRuntimeLoaderPromise = null;

const loadExternalScript = (src, attributeName) =>
  new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[${attributeName}="true"]`);

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error(`No se pudo cargar ${src}.`)),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute(attributeName, "true");
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}.`));
    document.head.appendChild(script);
  });

const loadPdfRuntime = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PDF solo disponible en navegador."));
  }

  if (window.html2canvas && (window.jspdf?.jsPDF || window.jsPDF)) {
    return Promise.resolve();
  }

  if (pdfRuntimeLoaderPromise) {
    return pdfRuntimeLoaderPromise;
  }

  pdfRuntimeLoaderPromise = Promise.all([
    loadExternalScript(HTML2CANVAS_LIBRARY_URL, "data-sakiara-html2canvas"),
    loadExternalScript(JSPDF_LIBRARY_URL, "data-sakiara-jspdf"),
  ]).then(() => {
    if (!window.html2canvas || !(window.jspdf?.jsPDF || window.jsPDF)) {
      throw new Error("No se cargaron correctamente html2canvas y jsPDF.");
    }
  });

  return pdfRuntimeLoaderPromise;
};

const waitForNodeImages = (root) => {
  if (!root) return Promise.resolve();

  const images = Array.from(root.querySelectorAll("img"));
  if (!images.length) return Promise.resolve();

  return Promise.all(
    images.map(
      (image) =>
        new Promise((resolve) => {
          if (image.complete && image.naturalWidth > 0) {
            resolve();
            return;
          }

          const done = () => {
            image.removeEventListener("load", done);
            image.removeEventListener("error", done);
            resolve();
          };

          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
        }),
    ),
  );
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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
  const generatedDate = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const reportTitle = selectedOffer
    ? `Informe preliminar · ${selectedOffer.title}`
    : "Informe preliminar de cotización solar";

  const highlightedOfferLabel = selectedOffer
    ? selectedOffer.title
    : "Comparativo de alternativas";

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
            <div><span>Invierno</span><strong>${escapeHtml(offer.winterCompensation)}</strong></div>
            <div><span>Verano</span><strong>${escapeHtml(offer.summerCompensation)}</strong></div>
            <div><span>Retorno</span><strong>${escapeHtml(offer.payback)}</strong></div>
          </div>
        </article>
      `,
    )
    .join("");

  const generationChart = buildReportBarChartMarkup({
    title: "Generación mensual estimada del sistema",
    items: [
      { label: "Invierno", value: metrics.winterGenerationKWh },
      { label: "Promedio", value: metrics.monthlyGenerationKWh },
      { label: "Verano", value: metrics.summerGenerationKWh },
    ],
    formatter: (value) => `${formatNumber(value, 0)} kWh`,
  });

  const productionFactorChart = buildReportBarChartMarkup({
    title: "Potencial solar por temporada",
    items: [
      { label: "Invierno", value: metrics.winterProductionFactor },
      { label: "Promedio", value: metrics.annualProductionFactor },
      { label: "Verano", value: metrics.summerProductionFactor },
    ],
    formatter: (value) => `${formatNumber(value, 0)} kWh/kWp`,
  });

  const compensationChart = buildReportBarChartMarkup({
    title: "Desempeño estimado de la cuenta",
    items: [
      { label: "Invierno", value: metrics.winterCompensationNoBattery },
      { label: "Promedio", value: metrics.compensationNoBattery },
      { label: "Verano", value: metrics.summerCompensationNoBattery },
    ],
    formatter: (value) => `${formatNumber(value, 0)}%`,
  });

  return `
    <div class="pdf-report">
      <section class="pdf-cover pdf-export-page">
        <div class="pdf-cover-top">
          <div class="pdf-brand-lockup">
            <img src="${escapeHtml(sakiaraLogo)}" alt="Sakiara Solar" />
            <div>
              <strong>Sakiara Solar</strong>
              <span>Ejecutamos proyectos, desarrollamos inversiones.</span>
            </div>
          </div>
          <div class="pdf-report-tag">Informe autogenerado</div>
        </div>

        <div class="pdf-cover-banner-wrap">
          <img class="pdf-cover-banner" src="/home/sakiara-hero-sunset-wide.jpg" alt="Proyecto solar Sakiara" />
        </div>

        <div class="pdf-cover-copy">
          <div class="pdf-kicker pdf-kicker--cover">Cotización fotovoltaica preliminar</div>
          <h1>${escapeHtml(reportTitle)}</h1>
          <p>
            Propuesta referencial para ${escapeHtml(communeLabel)}, ${escapeHtml(regionLabel)}.
            El informe resume generación esperada, lectura estacional, alternativa destacada y supuestos
            de diseño con una presentación clara para compartir con el cliente.
          </p>
        </div>

        <div class="pdf-cover-grid">
          <article class="pdf-card pdf-card--cover">
            <span>Proyecto sugerido</span>
            <strong>${escapeHtml(formatNumber(metrics.estimatedPanels))} paneles</strong>
            <small>${escapeHtml(formatNumber(metrics.estimatedSystemSizeKwp, 1))} kWp estimados</small>
          </article>
          <article class="pdf-card pdf-card--cover">
            <span>Alternativa destacada</span>
            <strong>${escapeHtml(highlightedOfferLabel)}</strong>
            <small>${escapeHtml(selectedOffer ? "Alternativa seleccionada" : "Comparativo listo para revisar")}</small>
          </article>
          <article class="pdf-card pdf-card--cover">
            <span>Invierno</span>
            <strong>${escapeHtml(formatNumber(metrics.winterCompensationNoBattery, 0))}%</strong>
            <small>Compensación referencial sin batería</small>
          </article>
          <article class="pdf-card pdf-card--cover">
            <span>Verano</span>
            <strong>${escapeHtml(formatNumber(metrics.summerCompensationNoBattery, 0))}%</strong>
            <small>Compensación referencial sin batería</small>
          </article>
        </div>

        <div class="pdf-cover-footer">
          <div class="pdf-client-box">
            <span>Cliente</span>
            <strong>${escapeHtml(name || "Por completar")}</strong>
            <small>${escapeHtml(phone || "-")} · ${escapeHtml(email || "-")}</small>
          </div>
          <div class="pdf-meta-box">
            <span>Ubicación</span>
            <strong>${escapeHtml(communeLabel)}</strong>
            <small>${escapeHtml(regionLabel)} · ${escapeHtml(generatedDate)}</small>
          </div>
        </div>
      </section>


      <section class="pdf-page pdf-page--content pdf-export-page">
        <header class="pdf-header">
          <div>
            <div class="pdf-kicker">Resumen técnico y comercial</div>
            <h2>Dimensionamiento y lectura estacional del proyecto</h2>
            <p class="pdf-subtitle">
              Valores orientativos con IVA incluido, perfil de consumo declarado y supuestos de producción
              estacional para comunicar el proyecto de forma clara, creíble y profesional.
            </p>
          </div>
          <div class="pdf-header-brand">
            <img src="${escapeHtml(sakiaraLogo)}" alt="Sakiara Solar" />
            <div>
              <strong>Sakiara Solar</strong>
              <span>${escapeHtml(generatedDate)}</span>
            </div>
          </div>
        </header>

        <section class="pdf-grid pdf-grid--summary">
          <article class="pdf-card pdf-card--accent">
            <span>Ubicación evaluada</span>
            <strong>${escapeHtml(communeLabel)}</strong>
            <small>${escapeHtml(regionLabel)}</small>
          </article>
          <article class="pdf-card">
            <span>Proyecto sugerido</span>
            <strong>${escapeHtml(formatNumber(metrics.estimatedPanels))} paneles</strong>
            <small>${escapeHtml(formatNumber(metrics.estimatedSystemSizeKwp, 1))} kWp estimados</small>
          </article>
          <article class="pdf-card">
            <span>Boleta evaluada</span>
            <strong>${escapeHtml(formatCLP(metrics.monthlyBill))}</strong>
            <small>Consumo ${escapeHtml(formatNumber(metrics.monthlyConsumptionKWh, 0))} kWh/mes</small>
          </article>
          <article class="pdf-card">
            <span>Alternativa destacada</span>
            <strong>${escapeHtml(highlightedOfferLabel)}</strong>
            <small>${escapeHtml(metrics.coverageObjectiveLabel)}</small>
          </article>
        </section>

        <section class="pdf-section">
          <div class="pdf-section-head">
            <h3>Gráficos de generación y desempeño</h3>
            <p>Se prioriza la lectura de generación del sistema y potencial solar por temporada.</p>
          </div>
          <div class="pdf-charts-grid">
            ${generationChart}
            ${productionFactorChart}
            ${compensationChart}
          </div>
        </section>
      </section>


      <section class="pdf-page pdf-page--content pdf-export-page">
        <header class="pdf-header">
          <div>
            <div class="pdf-kicker">Contexto solar del proyecto</div>
            <h2>Datos meteorológicos y lectura de generación</h2>
            <p class="pdf-subtitle">
              Referencias estacionales iniciales para sostener la lectura técnica del dimensionamiento y la producción esperada.
            </p>
          </div>
          <div class="pdf-header-brand">
            <img src="${escapeHtml(sakiaraLogo)}" alt="Sakiara Solar" />
            <div>
              <strong>Sakiara Solar</strong>
              <span>${escapeHtml(communeLabel)} · ${escapeHtml(regionLabel)}</span>
            </div>
          </div>
        </header>

        <section class="pdf-section">
          <div class="pdf-section-head">
            <h3>Datos meteorológicos y solares referenciales</h3>
            <p>Lectura climática inicial para reforzar credibilidad y contexto técnico del informe.</p>
          </div>
          <div class="pdf-grid pdf-grid--climate">
            <article class="pdf-card">
              <span>RGH promedio</span>
              <strong>${escapeHtml(formatNumber(metrics.annualGhi, 2))} kWh/m²/día</strong>
              <small>Radiación global horizontal estimada</small>
            </article>
            <article class="pdf-card">
              <span>RGH invierno</span>
              <strong>${escapeHtml(formatNumber(metrics.winterGhi, 2))} kWh/m²/día</strong>
              <small>Meses de menor recurso solar</small>
            </article>
            <article class="pdf-card">
              <span>RGH verano</span>
              <strong>${escapeHtml(formatNumber(metrics.summerGhi, 2))} kWh/m²/día</strong>
              <small>Meses de mayor recurso solar</small>
            </article>
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
      </section>


      <section class="pdf-page pdf-page--content pdf-export-page">
        <header class="pdf-header">
          <div>
            <div class="pdf-kicker">Comparativo comercial</div>
            <h2>Alternativas y supuestos de diseño</h2>
            <p class="pdf-subtitle">
              Comparación resumida de líneas ofertadas con foco en valor, ahorro y lectura invierno/verano.
            </p>
          </div>
          <div class="pdf-header-brand">
            <img src="${escapeHtml(sakiaraLogo)}" alt="Sakiara Solar" />
            <div>
              <strong>Sakiara Solar</strong>
              <span>Informe autogenerado</span>
            </div>
          </div>
        </header>

        <section class="pdf-section">
          <div class="pdf-section-head">
            <h3>Alternativas evaluadas</h3>
            <p>Comparación resumida de líneas ofertadas para una decisión más clara.</p>
          </div>
          <div class="pdf-offer-stack">
            ${alternativesMarkup}
          </div>
        </section>

        <section class="pdf-section pdf-section--tight-top">
          <div class="pdf-section-head">
            <h3>Perfil y supuestos de diseño</h3>
          </div>
          <div class="pdf-note-grid">
            <div class="pdf-note">
              <strong>Perfil del hogar:</strong> ${escapeHtml(profileLabel)}. ${escapeHtml(profileDescription)}
            </div>
            <div class="pdf-note">
              <strong>Nota técnica:</strong> ${escapeHtml(metrics.projectExecutionNote)}
            </div>
            <div class="pdf-note pdf-note--full">
              <strong>Descargo:</strong> Este documento es referencial y se ajusta con visita técnica,
              ingeniería de detalle, tablero disponible, trazado efectivo, sombras y condiciones reales del sitio.
            </div>
          </div>
        </section>

        <footer class="pdf-footer">
          <strong>Sakiara Solar</strong>
          <span>Contacto: ${escapeHtml(contactEmail)} · +56 9 7580 7224</span>
          <span>sakiarainversiones.com</span>
        </footer>
      </section>
    </div>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: #36363c;
        background: #f4f5f7;
      }
      .pdf-report {
        width: 210mm;
        background: #ffffff;
      }
      .pdf-cover,
      .pdf-page {
        width: 210mm;
        height: 297mm;
        min-height: 297mm;
        box-sizing: border-box;
        overflow: hidden;
      }
      .pdf-export-page {
        width: 210mm;
        height: 297mm;
        min-height: 297mm;
        max-height: 297mm;
        box-sizing: border-box;
        overflow: hidden;
        position: relative;
      }
      .pdf-cover {
        padding: 14mm;
        background: #ffffff;
      }
      .pdf-cover-top,
      .pdf-cover-footer,
      .pdf-header,
      .pdf-section-head,
      .pdf-offer-top,
      .pdf-footer {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .pdf-brand-lockup,
      .pdf-header-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .pdf-brand-lockup img,
      .pdf-header-brand img {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: block;
      }
      .pdf-brand-lockup strong,
      .pdf-brand-lockup span,
      .pdf-header-brand strong,
      .pdf-header-brand span {
        display: block;
      }
      .pdf-brand-lockup strong,
      .pdf-header-brand strong {
        font-size: 14px;
        color: #1f2937;
      }
      .pdf-brand-lockup span,
      .pdf-header-brand span {
        margin-top: 4px;
        font-size: 10px;
        line-height: 1.45;
        color: #6b7280;
      }
      .pdf-report-tag {
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid #e5d26d;
        background: #fff9d7;
        color: #7a6411;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
      }
      .pdf-cover-banner-wrap {
        margin-top: 12mm;
        border: 1px solid #e5e7eb;
        border-radius: 18px;
        overflow: hidden;
        background: #f3f4f6;
      }
      .pdf-cover-banner {
        display: block;
        width: 100%;
        height: auto;
      }
      .pdf-cover-copy {
        margin-top: 12mm;
      }
      .pdf-kicker {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: #8b8b93;
      }
      .pdf-kicker--cover {
        color: #8a7b19;
      }
      .pdf-cover-copy h1 {
        margin: 10px 0 0;
        font-size: 30px;
        line-height: 1.1;
        color: #1f2937;
      }
      .pdf-cover-copy p,
      .pdf-subtitle,
      .pdf-section-head p,
      .pdf-offer-card p,
      .pdf-note,
      .pdf-footer span {
        color: #5b616e;
      }
      .pdf-cover-copy p {
        margin: 12px 0 0;
        font-size: 13px;
        line-height: 1.75;
      }
      .pdf-cover-grid,
      .pdf-grid,
      .pdf-offer-grid,
      .pdf-note-grid {
        display: grid;
        gap: 10px;
      }
      .pdf-cover-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 12mm;
      }
      .pdf-grid--summary {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .pdf-grid--climate {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .pdf-card,
      .pdf-offer-card,
      .pdf-note,
      .pdf-client-box,
      .pdf-meta-box,
      .pdf-chart-card {
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        background: #ffffff;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .pdf-card {
        padding: 12px;
      }
      .pdf-card--cover {
        background: #f8fafc;
      }
      .pdf-card--accent {
        background: #fff9d7;
        border-color: #ead675;
      }
      .pdf-card span,
      .pdf-offer-grid span,
      .pdf-client-box span,
      .pdf-meta-box span {
        display: block;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #7b8090;
      }
      .pdf-card strong,
      .pdf-cover-grid strong,
      .pdf-client-box strong,
      .pdf-meta-box strong {
        display: block;
        margin-top: 8px;
        font-size: 18px;
        line-height: 1.2;
        color: #1f2937;
      }
      .pdf-card small,
      .pdf-client-box small,
      .pdf-meta-box small,
      .pdf-offer-grid strong {
        display: block;
        margin-top: 6px;
        font-size: 10px;
        line-height: 1.45;
        color: #6b7280;
      }
      .pdf-cover-footer {
        margin-top: 12mm;
      }
      .pdf-client-box,
      .pdf-meta-box {
        flex: 1;
        padding: 12px;
      }
      .pdf-page-break {
        page-break-after: always;
        break-after: page;
      }
      .pdf-page {
        padding: 14mm;
        background: #ffffff;
        box-sizing: border-box;
      }
      .pdf-page--content {
        height: 297mm;
        min-height: 297mm;
      }
      h2, h3, h4 {
        color: #1f2937;
      }
      h2 {
        margin: 0;
        font-size: 24px;
        line-height: 1.12;
      }
      .pdf-subtitle {
        margin: 10px 0 0;
        font-size: 12px;
        line-height: 1.7;
        max-width: 440px;
      }
      .pdf-header-brand {
        padding: 10px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 14px;
      }
      .pdf-section {
        margin-top: 10mm;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .pdf-section--tight-top {
        margin-top: 5mm;
      }
      .pdf-section-head h3,
      .pdf-chart-card h3,
      .pdf-offer-card h4 {
        margin: 0;
      }
      .pdf-section-head p {
        margin: 5px 0 0;
        font-size: 12px;
        line-height: 1.6;
        max-width: 420px;
      }
      .pdf-charts-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 10px;
      }
      .pdf-chart-card {
        padding: 12px;
      }
      .pdf-chart-card h3 {
        font-size: 13px;
        line-height: 1.4;
      }
      .pdf-chart-bars {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 10px;
        margin-top: 16px;
        min-height: 168px;
      }
      .pdf-chart-item {
        flex: 1;
        text-align: center;
      }
      .pdf-chart-bar-wrap {
        height: 152px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .pdf-chart-bar {
        width: 34px;
        border-radius: 12px 12px 0 0;
        background: linear-gradient(180deg, #f1d433 0%, #d3a900 100%);
      }
      .pdf-chart-item strong {
        display: block;
        margin-top: 9px;
        font-size: 11px;
        color: #1f2937;
      }
      .pdf-chart-item span {
        display: block;
        margin-top: 4px;
        font-size: 10px;
        line-height: 1.35;
        color: #6b7280;
      }
      .pdf-offer-stack {
        display: grid;
        gap: 10px;
        margin-top: 10px;
      }
      .pdf-offer-card {
        padding: 12px;
      }
      .pdf-offer-card.is-selected {
        border-color: #ead675;
        background: #fffced;
      }
      .pdf-offer-badge,
      .pdf-selected-tag {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 5px 8px;
        border-radius: 999px;
        font-size: 9px;
        line-height: 1;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .pdf-offer-badge {
        color: #7a6411;
        background: #fff9d7;
      }
      .pdf-selected-tag {
        color: #166534;
        background: #dcfce7;
      }
      .pdf-offer-card h4 {
        margin-top: 10px;
        font-size: 18px;
      }
      .pdf-offer-card p {
        margin: 6px 0 0;
        font-size: 12px;
        line-height: 1.6;
      }
      .pdf-offer-grid {
        grid-template-columns: repeat(5, minmax(0, 1fr));
        margin-top: 12px;
      }
      .pdf-offer-grid > div {
        padding-top: 10px;
        border-top: 1px solid #eceff3;
      }
      .pdf-offer-grid strong {
        margin-top: 6px;
        font-size: 13px;
        color: #1f2937;
      }
      .pdf-note-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 10px;
      }
      .pdf-note {
        padding: 12px;
        font-size: 12px;
        line-height: 1.7;
      }
      .pdf-note--full {
        grid-column: 1 / -1;
      }
      .pdf-footer {
        margin-top: 12mm;
        padding-top: 10px;
        border-top: 1px solid #e5e7eb;
      }
      .pdf-footer strong {
        font-size: 12px;
        color: #1f2937;
      }
      .pdf-footer span {
        font-size: 10px;
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
  const [installationSubmitState, setInstallationSubmitState] = useState({
    loading: false,
    tone: "idle",
    message: "",
  });
  const [maintenanceSubmitState, setMaintenanceSubmitState] = useState({
    loading: false,
    tone: "idle",
    message: "",
  });
  const [enterpriseCompany, setEnterpriseCompany] = useState("");
  const [enterpriseProjectType, setEnterpriseProjectType] = useState("bodega");
  const [enterpriseSurfaceType, setEnterpriseSurfaceType] = useState("cubierta");
  const [enterpriseCommercialIntent, setEnterpriseCommercialIntent] = useState("evaluar");
  const [enterpriseMonthlyBillInput, setEnterpriseMonthlyBillInput] =
    useState("1200000");
  const [enterpriseMonthlyConsumptionInput, setEnterpriseMonthlyConsumptionInput] =
    useState("4200");
  const [enterpriseRegion, setEnterpriseRegion] = useState("metropolitana");
  const [enterpriseCommune, setEnterpriseCommune] = useState("colina");
  const [enterpriseSubmitState, setEnterpriseSubmitState] = useState({
    loading: false,
    tone: "idle",
    message: "",
  });

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

  const selectedEnterpriseRegion =
    maintenanceRegionData[enterpriseRegion] ||
    maintenanceRegionData.metropolitana;
  const enterpriseCommuneOptions = useMemo(
    () =>
      Object.entries(selectedEnterpriseRegion.communes)
        .map(([value, config]) => ({ value, label: config.label }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [selectedEnterpriseRegion],
  );
  const fallbackEnterpriseCommuneKey =
    enterpriseCommuneOptions[0]?.value || "colina";
  const selectedEnterpriseCommune =
    selectedEnterpriseRegion.communes[enterpriseCommune] ||
    selectedEnterpriseRegion.communes[fallbackEnterpriseCommuneKey];
  const enterpriseSolarProfile = useMemo(
    () => getSolarProductionProfile(enterpriseRegion, enterpriseCommune),
    [enterpriseRegion, enterpriseCommune],
  );

  const maintenanceSystemSize = Number(maintenanceSystemSizeInput || 0);
  const maintenanceMonthlySavings = Number(maintenanceMonthlySavingsInput || 0);
  const enterpriseMonthlyBill = Number(enterpriseMonthlyBillInput || 0);
  const enterpriseMonthlyConsumption = Number(enterpriseMonthlyConsumptionInput || 0);

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
    const annualGhi = installationSolarProfile.ghiAnnual;
    const winterGhi = installationSolarProfile.ghiWinter;
    const summerGhi = installationSolarProfile.ghiSummer;
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
      annualGhi,
      winterGhi,
      summerGhi,
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

  const enterpriseMetrics = useMemo(() => {
    const normalizedMonthlyConsumption =
      enterpriseMonthlyConsumption > 0
        ? enterpriseMonthlyConsumption
        : enterpriseMonthlyBill > 0
          ? enterpriseMonthlyBill / REFERENCE_TARIFF_CLP_PER_KWH
          : 4200;

    const suggestedPowerKw = clamp(
      normalizedMonthlyConsumption /
        Math.max(enterpriseSolarProfile.annual * 0.9, 1),
      15,
      500,
    );
    const roundedPowerKw = Math.ceil(suggestedPowerKw / 5) * 5;
    const referenceInvestment = roundedPowerKw * 500000;
    const annualOffset = normalizedMonthlyConsumption * 12 * 0.72;
    const annualSavings = annualOffset * REFERENCE_TARIFF_CLP_PER_KWH;

    return {
      monthlyConsumption: normalizedMonthlyConsumption,
      suggestedPowerKw,
      roundedPowerKw,
      referenceInvestment,
      annualSavings,
      locationLabel: `${selectedEnterpriseRegion.label} · ${selectedEnterpriseCommune.label}`,
      locationPrimary: selectedEnterpriseRegion.label,
      locationSecondary: selectedEnterpriseCommune.label,
      projectTypeLabel:
        enterpriseProjectTypeOptions.find((item) => item.value === enterpriseProjectType)?.label ||
        "Proyecto empresarial",
      surfaceTypeLabel:
        enterpriseSurfaceTypeOptions.find((item) => item.value === enterpriseSurfaceType)?.label ||
        "A definir",
      commercialIntentLabel:
        enterpriseCommercialIntentOptions.find((item) => item.value === enterpriseCommercialIntent)?.label ||
        "A definir",
      referenceText: "Desde $500.000 por kWp",
    };
  }, [
    enterpriseCommercialIntent,
    enterpriseMonthlyBill,
    enterpriseMonthlyConsumption,
    enterpriseProjectType,
    enterpriseSolarProfile.annual,
    enterpriseSurfaceType,
    selectedEnterpriseCommune.label,
    selectedEnterpriseRegion.label,
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
            label: "Invierno estimado",
            value: selectedInstallationOfferData.winterCompensation,
          },
          {
            label: "Verano estimado",
            value: selectedInstallationOfferData.summerCompensation,
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

  const getEnterpriseSummaryItems = () => [
    { label: "Servicio", value: "Evaluación solar para empresas" },
    { label: "Empresa", value: enterpriseCompany || "No informada" },
    { label: "Tipo de proyecto", value: enterpriseMetrics.projectTypeLabel },
    { label: "Superficie", value: enterpriseMetrics.surfaceTypeLabel },
    { label: "Ubicación", value: enterpriseMetrics.locationLabel },
    {
      label: "Boleta referencial",
      value: formatCLP(enterpriseMonthlyBill),
    },
    {
      label: "Consumo mensual estimado",
      value: `${formatNumber(enterpriseMetrics.monthlyConsumption)} kWh/mes`,
    },
    {
      label: "Potencia preliminar sugerida",
      value: `${formatNumber(enterpriseMetrics.roundedPowerKw)} kWp`,
    },
    {
      label: "Referencia comercial",
      value: enterpriseMetrics.referenceText,
    },
    {
      label: "Interés comercial",
      value: enterpriseMetrics.commercialIntentLabel,
    },
    { label: "Acción solicitada", value: "Agendar visita técnica" },
  ];

  const getLeadSummaryItems = (leadType) => {
    if (leadType === "mantenimiento") return getMaintenanceSummaryItems();
    if (leadType === "empresa") return getEnterpriseSummaryItems();
    return getInstallationSummaryItems();
  };

  const getLeadSelectedOption = (leadType) => {
    if (leadType === "mantenimiento") return maintenanceMetrics.status;
    if (leadType === "empresa") return "Visita técnica comercial";
    return selectedInstallationOfferData?.title || "Pendiente";
  };

  const getSummaryItems = () =>
    getLeadSummaryItems(activeView === "empresas" ? "empresa" : activeView);

  const buildSummaryText = (leadType = activeView) =>
    getLeadSummaryItems(leadType === "empresas" ? "empresa" : leadType)
      .map((item) => `${item.label}: ${item.value}`)
      .join("\n");

  const handleWhatsApp = () => {
    if (activeView === "home") {
      const text = encodeURIComponent(
        "Hola, quiero evaluar una instalación solar para mi propiedad y revisar si tiene sentido técnico y económico.",
      );
      window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
      return;
    }

    const normalizedLeadType = activeView === "empresas" ? "empresa" : activeView;
    const intro =
      normalizedLeadType === "mantenimiento"
        ? "Hola, quiero evaluar el mantenimiento de mi sistema fotovoltaico."
        : normalizedLeadType === "empresa"
          ? "Hola, quiero agendar una visita técnica para evaluar un proyecto solar para mi empresa."
          : "Hola, quiero cotizar un proyecto fotovoltaico para mi propiedad.";

    const text = encodeURIComponent(
      `${intro}

${buildSummaryText(normalizedLeadType)}

Nombre: ${name || "-"}
Teléfono: ${phone || "-"}
Correo: ${email || "-"}

Mensaje: ${message || "-"}`,
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
  };


  const setLeadSubmitState = (leadType, nextState) => {
    if (leadType === "mantenimiento") {
      setMaintenanceSubmitState((current) => ({ ...current, ...nextState }));
      return;
    }

    if (leadType === "empresa") {
      setEnterpriseSubmitState((current) => ({ ...current, ...nextState }));
      return;
    }

    setInstallationSubmitState((current) => ({ ...current, ...nextState }));
  };

  const uploadLeadFiles = async (files, leadType) => {
    const safeLeadType = slugifyPathSegment(leadType);

    return Promise.all(
      files.map(async (file) => {
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          throw new Error(
            `${file.name} supera el máximo permitido de ${bytesToHumanSize(MAX_UPLOAD_SIZE_BYTES)} por archivo.`,
          );
        }

        if (!isAllowedUploadType(file)) {
          throw new Error(
            `${file.name} no tiene un formato permitido. Usa PDF, JPG, PNG, WEBP, DOC, DOCX, XLS o XLSX.`,
          );
        }

        const safeName = sanitizeFileName(file.name);
        const blob = await upload(
          `leads/${safeLeadType}/${Date.now()}-${safeName}`,
          file,
          {
            access: "public",
            contentType: file.type || undefined,
            handleUploadUrl: "/api/blob-upload",
            multipart: file.size > 4_500_000,
            clientPayload: JSON.stringify({ leadType: safeLeadType }),
          },
        );

        return {
          name: file.name,
          url: blob.url,
          downloadUrl: blob.downloadUrl || blob.url,
          pathname: blob.pathname,
          contentType: file.type || blob.contentType || "application/octet-stream",
          size: file.size,
        };
      }),
    );
  };

  const handleLeadSubmit = async (event, leadType) => {
    event.preventDefault();

    const summaryItems = getLeadSummaryItems(leadType);

    const files = extractFilesFromFormData(new FormData(event.currentTarget));

    try {
      setLeadSubmitState(leadType, {
        loading: true,
        tone: "info",
        message:
          files.length > 0
            ? "Subiendo archivos y enviando tu solicitud..."
            : "Enviando tu solicitud...",
      });

      const uploadedFiles = files.length > 0 ? await uploadLeadFiles(files, leadType) : [];

      const response = await fetch("/api/send-contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadType,
          name,
          phone,
          email,
          message,
          summaryItems,
          selectedOption: getLeadSelectedOption(leadType),
          uploadedFiles,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || "No se pudo enviar la solicitud.");
      }

      setLeadSubmitState(leadType, {
        loading: false,
        tone: "success",
        message:
          uploadedFiles.length > 0
            ? "Solicitud enviada correctamente. Tus archivos quedaron vinculados al correo mediante enlaces de descarga."
            : "Solicitud enviada correctamente.",
      });
    } catch (error) {
      setLeadSubmitState(leadType, {
        loading: false,
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un problema al enviar la solicitud.",
      });
    }
  };

  const handleDownloadInstallationReport = async () => {
    if (typeof window === "undefined") return;

    let reportContainer = null;

    const reportMetrics = { ...installationMetrics };
    const reportOffers = createInstallationOfferOptions(reportMetrics);
    const reportSelectedOffer =
      reportOffers.find((offer) => offer.key === selectedInstallationOffer) || null;
    const reportProfileLabel = selectedProfile.label;
    const reportProfileDescription = selectedProfile.description;
    const reportRegionLabel = selectedInstallationRegion.label;
    const reportCommuneLabel = selectedInstallationCommune.label;
    const reportClimateProfile = { ...climateReferenceProfile };
    const reportName = name;
    const reportPhone = phone;
    const reportEmail = email;

    try {
      await loadPdfRuntime();

      const html2canvasLib = window.html2canvas;
      const JsPdfCtor = window.jspdf?.jsPDF || window.jsPDF;

      if (!html2canvasLib || !JsPdfCtor) {
        throw new Error("No se cargaron correctamente los módulos de exportación PDF.");
      }

      reportContainer = document.createElement("div");
      reportContainer.style.position = "fixed";
      reportContainer.style.left = "-200vw";
      reportContainer.style.top = "0";
      reportContainer.style.width = "210mm";
      reportContainer.style.opacity = "0";
      reportContainer.style.pointerEvents = "none";
      reportContainer.innerHTML = buildInstallationReportMarkup({
        metrics: reportMetrics,
        offers: reportOffers,
        selectedOffer: reportSelectedOffer,
        profileLabel: reportProfileLabel,
        profileDescription: reportProfileDescription,
        regionLabel: reportRegionLabel,
        communeLabel: reportCommuneLabel,
        climateProfile: reportClimateProfile,
        name: reportName,
        phone: reportPhone,
        email: reportEmail,
      });
      document.body.appendChild(reportContainer);

      await waitForNodeImages(reportContainer);

      const pageNodes = Array.from(
        reportContainer.querySelectorAll(".pdf-export-page"),
      );

      if (!pageNodes.length) {
        throw new Error("No se encontraron páginas del informe para exportar.");
      }

      const fileNameBase = `informe-sakiara-${reportCommuneLabel}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const pdf = new JsPdfCtor({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
        compress: true,
      });

      for (let pageIndex = 0; pageIndex < pageNodes.length; pageIndex += 1) {
        const pageNode = pageNodes[pageIndex];
        const canvas = await html2canvasLib(pageNode, {
          scale: 1.45,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 15000,
          windowWidth: pageNode.scrollWidth,
          windowHeight: pageNode.scrollHeight,
        });

        const imageData = canvas.toDataURL("image/jpeg", 0.92);

        if (pageIndex > 0) {
          pdf.addPage("a4", "portrait");
        }

        pdf.addImage(imageData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      }

      pdf.save(`${fileNameBase || "informe-sakiara"}.pdf`);
    } catch (error) {
      console.error(error);
      const detail =
        error instanceof Error && error.message
          ? `\n\nDetalle técnico: ${error.message}`
          : "";
      window.alert(
        `No se pudo generar el informe PDF en este momento. Intenta nuevamente.${detail}`,
      );
    } finally {
      if (reportContainer && reportContainer.parentNode) {
        reportContainer.parentNode.removeChild(reportContainer);
      }
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
    if (activeView !== "home") return;

    setInstallationStep(1);
    goToView("instalacion");

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        scrollToSection("wizard-instalacion");
      }, 150);
    }
  };

  const floatingQuoteLabel =
    activeView === "empresas" ? "Agendar visita" : "Cotiza ahora";

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

  const createInstallationOfferOptions = (metrics) => [
    {
      key: "huaweiNoBattery",
      title: "Huawei sin batería",
      subtitle: "Alternativa premium base para una solución on-grid.",
      badge: "Línea Huawei",
      price: formatCLP(metrics.projectCostHuaweiNoBattery),
      savings: formatCLP(metrics.monthlySavingsNoBattery),
      winterCompensation: `${formatNumber(metrics.winterCompensationNoBattery)}%`,
      summerCompensation: `${formatNumber(metrics.summerCompensationNoBattery)}%`,
      payback: `${formatNumber(metrics.paybackHuaweiNoBattery, 1)} años`,
      variant: "huawei",
    },
    {
      key: "solisNoBattery",
      title: "Solis sin batería",
      subtitle:
        "Alternativa eficiente para una solución on-grid con otra línea de inversor.",
      badge: "Línea Solis",
      price: formatCLP(metrics.projectCostSolisNoBattery),
      savings: formatCLP(metrics.monthlySavingsNoBattery),
      winterCompensation: `${formatNumber(metrics.winterCompensationNoBattery)}%`,
      summerCompensation: `${formatNumber(metrics.summerCompensationNoBattery)}%`,
      payback: `${formatNumber(metrics.paybackSolisNoBattery, 1)} años`,
      variant: "solis",
    },
    {
      key: "huaweiWithBattery",
      title: "Huawei con batería LUNA",
      subtitle:
        "Alternativa híbrida para sumar respaldo y mayor aprovechamiento energético.",
      badge: "Huawei híbrido",
      price: formatCLP(metrics.projectCostHuaweiWithBattery),
      savings: formatCLP(metrics.monthlySavingsWithBattery),
      winterCompensation: `${formatNumber(metrics.winterCompensationWithBattery)}%`,
      summerCompensation: `${formatNumber(metrics.summerCompensationWithBattery)}%`,
      payback: `${formatNumber(metrics.paybackHuaweiWithBattery, 1)} años`,
      variant: "hybrid",
    },
    {
      key: "solisWithBattery",
      title: "Solis con batería",
      subtitle:
        "Alternativa híbrida referencial para priorizar respaldo y continuidad operativa.",
      badge: "Solis híbrido",
      price: formatCLP(metrics.projectCostSolisWithBattery),
      savings: formatCLP(metrics.monthlySavingsWithBattery),
      winterCompensation: `${formatNumber(metrics.winterCompensationWithBattery)}%`,
      summerCompensation: `${formatNumber(metrics.summerCompensationWithBattery)}%`,
      payback: `${formatNumber(metrics.paybackSolisWithBattery, 1)} años`,
      variant: "solis hybrid",
    },
  ];

  const installationOfferOptions = createInstallationOfferOptions(
    installationMetrics,
  );

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
            <p className="hero-kicker">Energía solar residencial con enfoque de inversión</p>
            <h1 className="hero-banner-title">
              <span>Convierte tu techo</span>
              <span>en una inversión energética</span>
            </h1>
            <p className="hero-banner-slogan">
              Ejecutamos proyectos, desarrollamos inversiones.
            </p>
            <p className="hero-banner-text">
              En Sakiara evaluamos si tu propiedad tiene sentido técnico y económico para energía solar, con una propuesta clara, profesional y fácil de entender.
            </p>

            <div className="cta-row hero-cta-row">
              <button
                className="btn-primary"
                type="button"
                onClick={() => goToView("instalacion")}
              >
                Evaluar mi proyecto solar
              </button>
              <button
                className="btn-secondary hero-secondary-btn"
                type="button"
                onClick={handleWhatsApp}
              >
                Hablar por WhatsApp
              </button>
              <button
                className="btn-secondary hero-secondary-btn"
                type="button"
                onClick={() =>
                  document
                    .getElementById("proyectos")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                Ver proyectos realizados
              </button>
            </div>

            <div className="hero-proof-row">
              <span>Evaluación referencial clara</span>
              <span>Valores IVA incluido</span>
              <span>WhatsApp directo</span>
            </div>

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
        <div className="service-grid home-service-grid">
          <div className="service-card highlighted featured-service-card">
            <div>
              <div className="offer-badge">Servicio principal</div>
              <h2 className="service-title">
                Instalación fotovoltaica residencial
              </h2>
              <p className="service-text">
                Diseñada para personas que quieren transformar su consumo eléctrico en una decisión de inversión mejor pensada.
              </p>
            </div>
            <div className="service-points emphasis-points">
              <div>Evaluación con boleta, consumo o ambos datos</div>
              <div>Compensación proyectada y retorno referencial</div>
              <div>Alternativas claras para comparar antes de decidir</div>
            </div>
            <button
              className="btn-primary"
              type="button"
              onClick={() => goToView("instalacion")}
            >
              Revisar mi potencial solar
            </button>
          </div>

          <div className="service-card enterprise-service-card">
            <div>
              <div className="offer-badge">Empresas</div>
              <h2 className="service-title">
                Proyectos solares para empresas
              </h2>
              <p className="service-text">
                Una línea pensada para bodegas, comercios, oficinas, operaciones agrícolas e instalaciones con mayor exigencia técnica.
              </p>
            </div>
            <div className="service-points">
              <div>Referencia desde $500.000 por kWp</div>
              <div>Visita técnica antes de cerrar propuesta</div>
              <div>Net Billing y evaluación comercial a medida</div>
            </div>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => goToView("empresas")}
            >
              Revisar línea empresas
            </button>
          </div>

          <div className="service-card secondary-service-card">
            <div>
              <div className="offer-badge">Postventa y continuidad</div>
              <h2 className="service-title">
                Mantenimiento fotovoltaico
              </h2>
              <p className="service-text">
                Para sistemas que necesitan limpieza técnica, revisión general y una pauta clara de cuidado y seguimiento.
              </p>
            </div>
            <div className="service-points">
              <div>Limpieza técnica y revisión visual</div>
              <div>Frecuencia anual sugerida</div>
              <div>Evaluación rápida según ubicación</div>
            </div>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => goToView("mantenimiento")}
            >
              Evaluar mantenimiento
            </button>
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-head">
          <p className="eyebrow">Por qué este paso puede tener sentido</p>
          <h2 className="section-title">
            No se trata solo de paneles: se trata de tomar una buena decisión energética
          </h2>
          <p className="section-text">
            La idea no es vender por impulso, sino ayudarte a entender si la energía solar realmente conviene para tu propiedad, tu forma de consumo y tu objetivo de inversión.
          </p>
        </div>

        <div className="insight-grid">
          {homeDecisionDrivers.map((item) => (
            <article key={item.title} className="insight-card">
              <h3 className="insight-title">{item.title}</h3>
              <p className="insight-text">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card emphasis-card">
        <div className="section-head">
          <p className="eyebrow">Cómo trabaja Sakiara</p>
          <h2 className="section-title">
            Un recorrido simple para que evalúes tu proyecto con más claridad
          </h2>
          <p className="section-text">
            Buscamos que el cliente entienda rápido el punto de partida, compare alternativas y tenga una base seria antes de avanzar a una propuesta comercial más detallada.
          </p>
        </div>

        <div className="process-grid">
          {homeProcessSteps.map((item) => (
            <article key={item.step} className="process-card">
              <div className="process-step-number">{item.step}</div>
              <h3 className="process-title">{item.title}</h3>
              <p className="process-text">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card">
        <div className="section-head">
          <p className="eyebrow">Por qué confiar</p>
          <h2 className="section-title">
            Una propuesta comercial que intenta ser clara sin perder criterio técnico
          </h2>
          <p className="section-text">
            Sakiara busca vender con seriedad: mostrando alternativas entendibles, una lectura económica inicial y una ejecución alineada con soluciones fotovoltaicas profesionales.
          </p>
        </div>

        <div className="trust-grid">
          {homeTrustPillars.map((item) => (
            <article key={item.title} className="trust-card">
              <h3 className="trust-title">{item.title}</h3>
              <p className="trust-text">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card" id="proyectos">
        <div className="section-head">
          <p className="eyebrow">Proyectos realizados</p>
          <h2 className="section-title">
            Instalaciones reales desarrolladas por Sakiara Solar
          </h2>
          <p className="section-text">
            Una muestra de proyectos fotovoltaicos ejecutados en distintos formatos, con soluciones pensadas para aprovechar mejor la energía solar y presentar una instalación limpia, ordenada y profesional.
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

      <section className="section-card final-cta-card">
        <div className="final-cta-layout">
          <div>
            <p className="eyebrow">Siguiente paso</p>
            <h2 className="section-title final-cta-title">
              Revisemos si tu propiedad realmente tiene sentido para energía solar
            </h2>
            <p className="section-text final-cta-text">
              Si quieres una primera lectura seria, puedes comenzar ahora la evaluación y revisar una alternativa referencial con inversión estimada, compensación proyectada y enfoque técnico-comercial claro.
            </p>
            <div className="final-cta-list">
              <div>Propuesta referencial simple de comparar</div>
              <div>Lectura comercial orientada a inversión</div>
              <div>Contacto directo para continuar por WhatsApp</div>
            </div>
          </div>

          <div className="final-cta-actions">
            <button
              className="btn-primary final-cta-button"
              type="button"
              onClick={() => goToView("instalacion")}
            >
              Comenzar evaluación solar
            </button>
            <button
              className="btn-secondary final-cta-button"
              type="button"
              onClick={handleWhatsApp}
            >
              Hablar con Sakiara
            </button>
          </div>
        </div>
      </section>
    </>
  );


  const renderInstallationView = () => (
    <>
      <section className="hero-banner subview-hero installation-hero">
        <div className="subview-hero-image installation-hero-image" aria-hidden="true" />
        <div className="hero-banner-inner subview-hero-inner">
          <div className="hero-banner-copy subview-hero-copy">
            <p className="hero-kicker">Evaluación de inversión solar</p>
            <h1 className="hero-banner-title subview-hero-title">
              <span>Revisa si tu propiedad</span>
              <span>tiene sentido para energía solar</span>
            </h1>
            <p className="hero-banner-text subview-hero-text">
              Construye una propuesta referencial clara, compara alternativas y da el siguiente paso con mejor información técnica y comercial.
            </p>
          </div>
        </div>
      </section>

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
                <h3 className="wizard-title">Define tu punto de partida</h3>
                <p className="wizard-text mobile-essential-hide">
                  Puedes comenzar con tu boleta, con tu consumo o con ambos datos para construir una evaluación referencial clara y útil desde el inicio.
                </p>
              </div>

              <div className="mode-card compact-selector-card">
                <label className="label">¿Cómo quieres cotizar?</label>
                <select
                  className="select"
                  value={installationInputMode}
                  onChange={(e) => setInstallationInputMode(e.target.value)}
                >
                  {Object.entries(installationInputModeOptions).map(
                    ([value, option]) => (
                      <option key={value} value={value}>
                        {option.label}
                      </option>
                    ),
                  )}
                </select>
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
              </div>

              <div className="mode-card wizard-highlight-card goal-card compact-selector-card">
                <label className="label">Objetivo del dimensionamiento</label>
                <select
                  className="select"
                  value={coverageGoalMode}
                  onChange={(e) => setCoverageGoalMode(e.target.value)}
                >
                  <option value="optimized">Compensación optimizada</option>
                  <option value="winter">Ajustar cobertura en invierno</option>
                  <option value="seasonal">Cobertura estacional</option>
                </select>

                {(coverageGoalMode === "winter" || coverageGoalMode === "seasonal") && (
                  <div className="compact-select-grid">
                    <div className="field compact-field">
                      <label className="label">Meta de cobertura invernal</label>
                      <select
                        className="select"
                        value={winterCoverageTargetPercent}
                        onChange={(e) => setWinterCoverageTargetPercent(Number(e.target.value))}
                      >
                        {WINTER_COVERAGE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}%
                          </option>
                        ))}
                      </select>
                      <div className="hint">
                        Parte desde 50% para mantener una inversión más flexible.
                      </div>
                    </div>

                    {coverageGoalMode === "seasonal" && (
                      <div className="field compact-field">
                        <label className="label">Meta de cobertura en verano</label>
                        <select
                          className="select"
                          value={summerCoverageTargetPercent}
                          onChange={(e) => setSummerCoverageTargetPercent(Number(e.target.value))}
                        >
                          {SUMMER_COVERAGE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}%
                            </option>
                          ))}
                        </select>
                        <div className="hint">
                          El sistema usa el escenario más exigente entre invierno y verano.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="hint">
                  Elige el criterio que mejor representa tu objetivo de inversión y uso real del sistema.
                </div>
              </div>

              <div className="mode-note mobile-essential-hide">
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
                <p className="wizard-text mobile-essential-hide">
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

              </div>
            </>
          )}

          {installationStep === 3 && (
            <>
              <div className="wizard-copy">
                <h3 className="wizard-title">Selecciona el perfil del hogar</h3>
                <p className="wizard-text mobile-essential-hide">
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
                  Compara tu propuesta referencial
                </h3>
                <p className="wizard-text mobile-essential-hide">
                  Revisa cada alternativa con calma, compara inversión, compensación y retorno referencial, y luego selecciona la que mejor dialogue con tu objetivo.
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
                  label="Alternativa elegida"
                  value={selectedInstallationOfferData?.title || "Selecciona una alternativa"}
                  sub={selectedInstallationOfferData?.badge || "antes de continuar"}
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
                    winterCompensation={offer.winterCompensation}
                    summerCompensation={offer.summerCompensation}
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
                <div className="hint mobile-essential-hide">
                  Se descarga un informe autogenerado con gráficos, resumen técnico-comercial y datos meteorológicos referenciales.
                </div>
              </div>

              <div className="note mobile-essential-hide">
                Selecciona una alternativa antes de continuar. {installationMetrics.projectExecutionNote} Se consideró una RGH referencial de {formatNumber(installationMetrics.annualGhi, 2)} kWh/m²/día y un factor solar de {formatNumber(installationMetrics.annualProductionFactor, 0)} kWh/kWp/mes promedio, {formatNumber(installationMetrics.winterProductionFactor, 0)} kWh/kWp/mes en invierno y {formatNumber(installationMetrics.summerProductionFactor, 0)} kWh/kWp/mes en verano para {selectedInstallationCommune.label}.
              </div>
            </>
          )}

          {installationStep === 5 && (
            <>
              <div className="wizard-copy">
                <h3 className="wizard-title">Solicita tu evaluación comercial</h3>
                <p className="wizard-text mobile-essential-hide">
                  Ya tienes una alternativa elegida. Déjanos tus datos o escríbenos por WhatsApp y continuaremos la revisión usando exactamente la propuesta seleccionada como base.
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

              <form
                className="wizard-contact-form"
                onSubmit={(event) => handleLeadSubmit(event, "instalacion")}
              >

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

                <div className="contact-grid attachments-grid">
                  <div className="contact-box attachment-box">
                    <label className="label">Adjunto 1</label>
                    <input
                      className="input file-input"
                      type="file"
                      name="adjunto_1"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                    />
                    <div className="hint">
                      Puedes adjuntar boleta, cotización, fotos o documentos técnicos.
                    </div>
                  </div>
                  <div className="contact-box attachment-box">
                    <label className="label">Adjunto 2</label>
                    <input
                      className="input file-input"
                      type="file"
                      name="adjunto_2"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                    />
                    <div className="hint">
                      Hasta 25 MB por archivo. Se enviarán por enlaces seguros dentro del correo.
                    </div>
                  </div>
                </div>


                <div className="contact-actions wizard-actions">
                  <button className="full-btn" type="submit" disabled={installationSubmitState.loading}>
                    {installationSubmitState.loading ? "Enviando solicitud..." : "Solicitar evaluación comercial"}
                  </button>
                  <button
                    className="wa-btn"
                    type="button"
                    onClick={handleWhatsApp}
                    disabled={installationSubmitState.loading}
                  >
                    Hablar por WhatsApp
                  </button>
                  <button
                    className="wa-btn"
                    type="button"
                    onClick={handleDownloadInstallationReport}
                    disabled={installationSubmitState.loading}
                  >
                    Descargar informe PDF
                  </button>
                </div>

                {installationSubmitState.message && (
                  <div className={`submit-feedback ${installationSubmitState.tone}`}>
                    {installationSubmitState.message}
                  </div>
                )}
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
      <section className="hero-banner subview-hero maintenance-hero">
        <div className="subview-hero-image maintenance-hero-image" aria-hidden="true" />
        <div className="hero-banner-inner subview-hero-inner">
          <div className="hero-banner-copy subview-hero-copy">
            <p className="hero-kicker">Mantenimiento fotovoltaico</p>
            <h1 className="hero-banner-title subview-hero-title">
              <span>Protege el rendimiento</span>
              <span>de tu sistema solar</span>
            </h1>
            <p className="hero-banner-text subview-hero-text">
              Revisa tu sistema con una propuesta clara, ordenada y pensada para clientes.
            </p>
          </div>
        </div>
      </section>

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
                <p className="wizard-text mobile-essential-hide">
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
                <p className="wizard-text mobile-essential-hide">
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

              </div>
            </>
          )}

          {maintenanceStep === 3 && (
            <>
              <div className="wizard-copy">
                <h3 className="wizard-title">Elige la frecuencia del servicio</h3>
                <p className="wizard-text mobile-essential-hide">
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
                <p className="wizard-text mobile-essential-hide">
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

              <div className="cards-grid maintenance-cards-grid mobile-essential-hide">
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

              <div className="note mobile-essential-hide">
                Los valores son estimados y pueden variar según ubicación, condiciones de acceso,
                tamaño del sistema y requerimientos técnicos del servicio.
              </div>
            </>
          )}

          {maintenanceStep === 5 && (
            <>
              <div className="wizard-copy">
                <h3 className="wizard-title">Completa tus datos</h3>
                <p className="wizard-text mobile-essential-hide">
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

              <form
                className="wizard-contact-form"
                onSubmit={(event) => handleLeadSubmit(event, "mantenimiento")}
              >

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

                <div className="contact-grid attachments-grid">
                  <div className="contact-box attachment-box">
                    <label className="label">Adjunto 1</label>
                    <input
                      className="input file-input"
                      type="file"
                      name="adjunto_1"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                    />
                    <div className="hint">
                      Puedes adjuntar boleta, cotización, fotos o documentos técnicos.
                    </div>
                  </div>
                  <div className="contact-box attachment-box">
                    <label className="label">Adjunto 2</label>
                    <input
                      className="input file-input"
                      type="file"
                      name="adjunto_2"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                    />
                    <div className="hint">
                      Hasta 25 MB por archivo. Se enviarán por enlaces seguros dentro del correo.
                    </div>
                  </div>
                </div>

                <div className="contact-actions wizard-actions">
                  <button className="full-btn" type="submit" disabled={maintenanceSubmitState.loading}>
                    {maintenanceSubmitState.loading ? "Enviando solicitud..." : "Solicitar evaluación"}
                  </button>
                  <button
                    className="wa-btn"
                    type="button"
                    onClick={handleWhatsApp}
                    disabled={maintenanceSubmitState.loading}
                  >
                    Hablar por WhatsApp
                  </button>
                </div>

                {maintenanceSubmitState.message && (
                  <div className={`submit-feedback ${maintenanceSubmitState.tone}`}>
                    {maintenanceSubmitState.message}
                  </div>
                )}
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


  const renderEnterpriseView = () => (
    <>
      <section className="hero-banner subview-hero enterprise-hero">
        <div className="enterprise-hero-image" aria-hidden="true" />
        <div className="hero-banner-inner subview-hero-inner enterprise-hero-inner">
          <div className="hero-banner-copy subview-hero-copy enterprise-hero-copy">
            <p className="hero-kicker">Energía solar para empresas</p>
            <h1 className="hero-banner-title subview-hero-title">
              Proyectos fotovoltaicos evaluados con visita técnica
            </h1>
            <p className="hero-banner-text subview-hero-text">
              En proyectos empresariales priorizamos una lectura seria del consumo, el montaje, el empalme y la ejecución antes de cerrar una propuesta comercial.
            </p>
            <div className="cta-row enterprise-hero-actions">
              <button
                className="btn-primary"
                type="button"
                onClick={() => scrollToSection("visita-tecnica-empresas")}
              >
                Agendar visita técnica
              </button>
              <button
                className="btn-secondary hero-secondary-btn"
                type="button"
                onClick={handleWhatsApp}
              >
                Hablar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-card enterprise-intro-card">
        <div className="section-head">
          <p className="eyebrow">Línea empresas</p>
          <h2 className="section-title">
            Una propuesta pensada para operaciones que necesitan más que un valor rápido
          </h2>
          <p className="section-text">
            Mantenemos la línea comercial de Sakiara, pero en empresas el cierre serio parte con una visita técnica. Eso nos permite revisar distancias, tableros, cubiertas, empalme, crecimiento futuro y el mejor alcance del proyecto.
          </p>
        </div>

        <div className="enterprise-stat-grid">
          <article className="summary-card enterprise-stat-card">
            <span className="enterprise-stat-kicker">Referencia comercial</span>
            <strong className="enterprise-stat-value">Desde $500.000 por kWp</strong>
            <p className="enterprise-stat-text">Valor referencial para proyectos on-grid empresariales. Sujeto a visita técnica, equipos, metrajes, estructura y condiciones de montaje.</p>
          </article>
          <article className="summary-card enterprise-stat-card">
            <span className="enterprise-stat-kicker">Potencia preliminar</span>
            <strong className="enterprise-stat-value">{formatNumber(enterpriseMetrics.roundedPowerKw)} kWp</strong>
            <p className="enterprise-stat-text">Lectura inicial en base al consumo ingresado y al perfil solar de la ubicación seleccionada.</p>
          </article>
          <article className="summary-card enterprise-stat-card">
            <span className="enterprise-stat-kicker">Inversión base referencial</span>
            <strong className="enterprise-stat-value">{formatCLP(enterpriseMetrics.referenceInvestment)}</strong>
            <p className="enterprise-stat-text">Estimación inicial usando la referencia base de Sakiara para apoyar la conversación comercial.</p>
          </article>
        </div>
      </section>

      <section className="section-card enterprise-showcase-card">
        <div className="enterprise-showcase-layout">
          <div className="enterprise-showcase-copy">
            <p className="eyebrow">Proyecto de referencia</p>
            <h2 className="section-title">
              Escala mayor, ejecución ordenada y criterio técnico desde el diseño
            </h2>
            <p className="section-text">
              Para la línea empresas tomamos como referencia proyectos de mayor escala, donde el montaje, la distribución de equipos y la lectura del sitio importan tanto como el valor final del sistema.
            </p>
            <div className="final-cta-list enterprise-inline-list">
              <div>Evaluación técnica antes de cerrar propuesta</div>
              <div>Net Billing y puesta en marcha ordenada</div>
              <div>Espacio para crecer sin perder control del proyecto</div>
            </div>
          </div>

          <div className="enterprise-showcase-media">
            <img
              className="enterprise-showcase-image"
              src="/proyectos/empresa-referencia.jpg"
              alt="Proyecto fotovoltaico empresarial de referencia Sakiara"
            />
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-head">
          <p className="eyebrow">Aplicaciones</p>
          <h2 className="section-title">
            Proyectos que pueden calzar con esta línea
          </h2>
          <p className="section-text">
            Esta vista está pensada para clientes que requieren una solución más a medida y no una promesa cerrada antes de revisar el lugar.
          </p>
        </div>

        <div className="insight-grid enterprise-use-grid">
          {enterpriseUseCases.map((item) => (
            <article key={item.title} className="insight-card enterprise-use-card">
              <h3 className="insight-title">{item.title}</h3>
              <p className="insight-text">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card enterprise-evaluation-card">
        <div className="section-head">
          <p className="eyebrow">Qué revisamos en terreno</p>
          <h2 className="section-title">
            La visita técnica es parte de la propuesta, no un paso decorativo
          </h2>
          <p className="section-text">
            Antes de formalizar una oferta revisamos los factores que realmente mueven el costo y la calidad del proyecto.
          </p>
        </div>

        <div className="enterprise-check-grid">
          {enterpriseEvaluationPoints.map((item) => (
            <article key={item} className="enterprise-check-card">
              <span className="enterprise-check-accent" aria-hidden="true" />
              <p className="enterprise-check-text">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card emphasis-card">
        <div className="section-head">
          <p className="eyebrow">Cómo trabajamos</p>
          <h2 className="section-title">
            Un proceso simple para avanzar con orden y criterio comercial
          </h2>
          <p className="section-text">
            La idea es que la empresa entienda rápido si vale la pena avanzar y que el cierre técnico ocurra con información real del lugar.
          </p>
        </div>

        <div className="process-grid enterprise-process-grid">
          {enterpriseProcessSteps.map((item) => (
            <article key={item.step} className="process-card">
              <div className="process-step-number">{item.step}</div>
              <h3 className="process-title">{item.title}</h3>
              <p className="process-text">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card enterprise-visit-card" id="visita-tecnica-empresas">
        <div className="enterprise-visit-layout">
          <div>
            <div className="section-head wizard-section-head compact">
              <div>
                <p className="eyebrow">Agenda visita técnica</p>
                <h2 className="section-title">
                  Cuéntanos lo básico y coordinamos la evaluación del proyecto
                </h2>
                <p className="section-text">
                  Este formulario está pensado como paso comercial inicial para proyectos empresa. Mientras mejor sea el punto de partida, más útil será la visita y la propuesta posterior.
                </p>
              </div>
            </div>

            <form
              className="wizard-contact-form"
              onSubmit={(event) => handleLeadSubmit(event, "empresa")}
            >
              <div className="fields-grid enterprise-form-grid">
                <label className="field">
                  <span className="label">Empresa</span>
                  <input
                    className="input"
                    type="text"
                    value={enterpriseCompany}
                    onChange={(event) => setEnterpriseCompany(event.target.value)}
                    placeholder="Nombre de la empresa"
                    required
                  />
                </label>

                <label className="field">
                  <span className="label">Nombre de contacto</span>
                  <input
                    className="input"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nombre y cargo"
                    required
                  />
                </label>

                <label className="field">
                  <span className="label">Teléfono</span>
                  <input
                    className="input"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+56 9 ..."
                    required
                  />
                </label>

                <label className="field">
                  <span className="label">Correo</span>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="correo@empresa.cl"
                    required
                  />
                </label>

                <label className="field">
                  <span className="label">Tipo de proyecto</span>
                  <select
                    className="select"
                    value={enterpriseProjectType}
                    onChange={(event) => setEnterpriseProjectType(event.target.value)}
                  >
                    {enterpriseProjectTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="label">Superficie disponible</span>
                  <select
                    className="select"
                    value={enterpriseSurfaceType}
                    onChange={(event) => setEnterpriseSurfaceType(event.target.value)}
                  >
                    {enterpriseSurfaceTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="label">Región</span>
                  <select
                    className="select"
                    value={enterpriseRegion}
                    onChange={(event) => {
                      const nextRegion = event.target.value;
                      setEnterpriseRegion(nextRegion);
                      const nextCommune =
                        Object.keys(
                          maintenanceRegionData[nextRegion]?.communes || {},
                        )[0] || "colina";
                      setEnterpriseCommune(nextCommune);
                    }}
                  >
                    {maintenanceRegionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="label">Comuna</span>
                  <select
                    className="select"
                    value={enterpriseCommune}
                    onChange={(event) => setEnterpriseCommune(event.target.value)}
                  >
                    {enterpriseCommuneOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="label">Boleta mensual referencial</span>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    value={enterpriseMonthlyBillInput}
                    onChange={(event) => setEnterpriseMonthlyBillInput(sanitizeIntegerInput(event.target.value))}
                    placeholder="1200000"
                  />
                  <span className="hint">Puedes usar una cifra aproximada para iniciar la evaluación.</span>
                </label>

                <label className="field">
                  <span className="label">Consumo mensual estimado</span>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    value={enterpriseMonthlyConsumptionInput}
                    onChange={(event) => setEnterpriseMonthlyConsumptionInput(sanitizeIntegerInput(event.target.value))}
                    placeholder="4200"
                  />
                  <span className="hint">Si lo conoces, este dato nos ayuda a orientar mejor la potencia preliminar.</span>
                </label>

                <label className="field">
                  <span className="label">Interés comercial</span>
                  <select
                    className="select"
                    value={enterpriseCommercialIntent}
                    onChange={(event) => setEnterpriseCommercialIntent(event.target.value)}
                  >
                    {enterpriseCommercialIntentOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field field-full">
                  <span className="label">Comentario inicial</span>
                  <textarea
                    className="textarea"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Cuéntanos si ya tienen medidor trifásico, tipo de cubierta, restricciones de horario, necesidad de respaldo u otro dato útil."
                  />
                </label>

                <label className="field attachment-box">
                  <span className="label">Adjunto opcional 1</span>
                  <input className="input file-input" type="file" name="adjunto_1" />
                  <span className="hint">Cuenta eléctrica, layout o foto general del lugar.</span>
                </label>

                <label className="field attachment-box">
                  <span className="label">Adjunto opcional 2</span>
                  <input className="input file-input" type="file" name="adjunto_2" />
                  <span className="hint">Imagen adicional, plano o documento complementario.</span>
                </label>
              </div>

              <div className="contact-actions wizard-actions enterprise-actions">
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={enterpriseSubmitState.loading}
                >
                  {enterpriseSubmitState.loading
                    ? "Enviando solicitud..."
                    : "Solicitar visita técnica"}
                </button>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={handleWhatsApp}
                >
                  Coordinar por WhatsApp
                </button>
              </div>

              {enterpriseSubmitState.message && (
                <div className={`submit-feedback ${enterpriseSubmitState.tone}`}>
                  {enterpriseSubmitState.message}
                </div>
              )}
            </form>
          </div>

          <aside className="mode-card wizard-highlight-card enterprise-summary-box">
            <div className="wizard-contact-copy">
              <div className="offer-badge">Lectura preliminar</div>
              <h3>Base comercial para la visita</h3>
              <p>
                Esta referencia no reemplaza la visita técnica. Solo ordena la conversación comercial con una primera lectura del consumo y la potencia sugerida.
              </p>
            </div>

            <div className="summary-grid enterprise-summary-grid">
              <article className="summary-card enterprise-summary-card enterprise-summary-card-location">
                <span className="summary-kicker">Ubicación</span>
                <strong className="enterprise-summary-main">{enterpriseMetrics.locationPrimary}</strong>
                <span className="enterprise-summary-subline">{enterpriseMetrics.locationSecondary}</span>
              </article>
              <article className="summary-card enterprise-summary-card">
                <span className="summary-kicker">Potencia sugerida</span>
                <strong className="enterprise-summary-main">{formatNumber(enterpriseMetrics.roundedPowerKw)} kWp</strong>
              </article>
              <article className="summary-card enterprise-summary-card">
                <span className="summary-kicker">Inversión base</span>
                <strong className="enterprise-summary-main">{formatCLP(enterpriseMetrics.referenceInvestment)}</strong>
              </article>
              <article className="summary-card enterprise-summary-card">
                <span className="summary-kicker">Ahorro anual referencial</span>
                <strong className="enterprise-summary-main">{formatCLP(enterpriseMetrics.annualSavings)}</strong>
              </article>
            </div>

            <div className="mode-note enterprise-note">
              <strong>Referencia base:</strong> {enterpriseMetrics.referenceText}. El valor final depende de la visita técnica, potencia definitiva, equipamiento, metrajes, estructura, empalme y condiciones de montaje.
            </div>
          </aside>
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

        .subview-hero {
          min-height: 320px;
          margin-bottom: 18px;
        }

        .subview-hero::after {
          display: none;
        }

        .subview-hero-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center center;
          transform: scale(1.02);
        }

        .installation-hero-image {
          background-image:
            linear-gradient(180deg, rgba(9, 14, 26, 0.58) 0%, rgba(9, 14, 26, 0.34) 40%, rgba(9, 14, 26, 0.48) 100%),
            radial-gradient(circle at 50% 28%, rgba(255, 204, 82, 0.18) 0%, rgba(255, 204, 82, 0.00) 26%),
            url('/home/hero-hogar-claro.png');
          background-position: center 52%;
        }

        .maintenance-hero-image {
          background-image:
            linear-gradient(180deg, rgba(9, 14, 26, 0.62) 0%, rgba(9, 14, 26, 0.32) 42%, rgba(9, 14, 26, 0.52) 100%),
            radial-gradient(circle at 50% 26%, rgba(255, 204, 82, 0.16) 0%, rgba(255, 204, 82, 0.00) 24%),
            url('/home/hero-mantenimiento-claro.png');
          background-position: center center;
        }

        .subview-hero-inner {
          min-height: 320px;
          padding: 44px 34px;
          align-items: flex-end;
        }

        .subview-hero-copy {
          max-width: 760px;
          text-align: left;
          margin: 0;
        }

        .subview-hero-title {
          max-width: 720px;
          font-size: clamp(34px, 5vw, 58px);
          line-height: 0.98;
        }

        .subview-hero-text {
          max-width: 560px;
          margin: 14px 0 0;
          color: rgba(255, 255, 255, 0.9);
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

        .hero-cta-row {
          margin-top: 24px;
        }

        .hero-secondary-btn {
          background: rgba(255, 255, 255, 0.14);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 16px 30px rgba(9, 14, 26, 0.18);
        }

        .hero-secondary-btn:hover {
          background: rgba(255, 255, 255, 0.22);
        }

        .hero-proof-row {
          margin-top: 18px;
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .hero-proof-row span {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          background: rgba(11, 18, 32, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.10);
          color: rgba(255, 255, 255, 0.88);
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 14px 24px rgba(0, 0, 0, 0.12);
          backdrop-filter: blur(4px);
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
          grid-template-columns: repeat(3, minmax(0, 1fr));
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

        .goal-card {
          margin-top: 14px;
          padding: 16px;
        }

        .goal-card .mode-buttons {
          margin-top: 8px;
          gap: 8px;
        }

        .goal-card .mode-btn {
          padding: 10px 12px;
        }

        .goal-card .hint {
          margin-top: 6px;
        }

        .compact-selector-card {
          padding: 14px 16px;
        }

        .compact-selector-card .select {
          margin-top: 8px;
        }

        .compact-select-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 12px;
        }

        .compact-field {
          padding: 0;
          border: none;
          background: transparent;
          box-shadow: none;
        }

        .goal-nested-card {
          margin-top: 8px;
          padding: 12px;
          border-radius: 16px;
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

        .attachments-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .attachment-box {
          display: flex;
          flex-direction: column;
        }

        .file-input {
          padding: 10px 12px;
          background: #ffffff;
          cursor: pointer;
        }

        .file-input::file-selector-button {
          margin-right: 10px;
          padding: 8px 12px;
          border: 0;
          border-radius: 10px;
          background: #f1d433;
          color: #1f2328;
          font-weight: 800;
          cursor: pointer;
        }

        .submit-feedback {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 16px;
          font-size: 13px;
          line-height: 1.55;
          border: 1px solid rgba(102, 102, 107, 0.12);
          background: #ffffff;
          color: #66666b;
        }

        .submit-feedback.success {
          background: rgba(34, 197, 94, 0.08);
          border-color: rgba(34, 197, 94, 0.28);
          color: #166534;
        }

        .submit-feedback.error {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.24);
          color: #991b1b;
        }

        .submit-feedback.info {
          background: rgba(241, 212, 51, 0.12);
          border-color: rgba(241, 212, 51, 0.28);
          color: #7a6411;
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
          min-width: 0;
        }

        .service-card.highlighted {
          background: #fffef5;
        }

        .home-service-grid {
          align-items: stretch;
        }

        .featured-service-card {
          min-height: 320px;
        }

        .secondary-service-card {
          background: #ffffff;
        }

        .enterprise-service-card {
          background: #f7f8fb;
        }

        .emphasis-points div {
          font-weight: 600;
        }

        .insight-grid,
        .trust-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 20px;
        }

        .trust-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .enterprise-hero {
          box-shadow: 0 28px 56px rgba(15, 23, 42, 0.18);
        }

        .enterprise-hero-image {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(180deg, rgba(9, 14, 26, 0.62) 0%, rgba(9, 14, 26, 0.30) 42%, rgba(9, 14, 26, 0.54) 100%),
            radial-gradient(circle at 52% 22%, rgba(241, 212, 51, 0.18) 0%, rgba(241, 212, 51, 0.00) 28%),
            url('/home/hero-empresa-claro.png');
          background-size: cover;
          background-position: center 46%;
          transform: scale(1.03);
        }

        .enterprise-hero-inner {
          align-items: flex-end;
        }

        .enterprise-hero-copy {
          max-width: 760px;
        }

        .enterprise-hero-actions {
          justify-content: flex-start;
        }

        .enterprise-stat-grid,
        .enterprise-check-grid,
        .enterprise-summary-grid {
          display: grid;
          gap: 16px;
          margin-top: 20px;
        }

        .enterprise-stat-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .enterprise-check-grid,
        .enterprise-summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .enterprise-stat-card,
        .enterprise-check-card,
        .enterprise-summary-card {
          text-align: left;
        }

        .enterprise-stat-kicker,
        .summary-kicker {
          display: block;
          font-size: 11px;
          line-height: 1.2;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          color: #8b8b91;
        }

        .enterprise-stat-value,
        .enterprise-summary-grid strong {
          margin-top: 12px;
          display: block;
          font-size: clamp(22px, 2.4vw, 30px);
          line-height: 1.12;
          color: #30323a;
        }

        .enterprise-stat-text,
        .enterprise-check-text {
          margin: 0;
          font-size: 14px;
          line-height: 1.65;
          color: #707179;
          overflow-wrap: anywhere;
          word-break: break-word;
          hyphens: auto;
        }

        .enterprise-stat-value,
        .insight-title,
        .insight-text,
        .process-title,
        .process-text,
        .section-title,
        .section-text,
        .service-title,
        .service-text,
        .project-title,
        .project-description,
        .final-cta-list div,
        .enterprise-check-text {
          overflow-wrap: anywhere;
          word-break: break-word;
          hyphens: auto;
        }

        .enterprise-stat-grid > *,
        .enterprise-check-grid > *,
        .enterprise-showcase-layout > *,
        .enterprise-visit-layout > *,
        .insight-grid > *,
        .trust-grid > *,
        .process-grid > * {
          min-width: 0;
        }

        .enterprise-showcase-layout,
        .enterprise-visit-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
          gap: 24px;
          align-items: start;
        }

        .enterprise-showcase-card {
          overflow: hidden;
        }

        .enterprise-showcase-media {
          min-height: 100%;
        }

        .enterprise-showcase-image {
          display: block;
          width: 100%;
          height: 100%;
          min-height: 320px;
          object-fit: cover;
          border-radius: 26px;
          box-shadow: 0 18px 34px rgba(17, 24, 39, 0.10);
        }

        .enterprise-use-grid,
        .enterprise-process-grid {
          margin-top: 20px;
        }

        .enterprise-summary-box {
          margin-top: 0;
          position: sticky;
          top: 24px;
        }

        .enterprise-note {
          margin-top: 18px;
          text-align: left;
        }

        .enterprise-summary-card {
          min-height: 0;
          justify-content: flex-start;
          text-align: left;
          padding: 18px;
        }

        .enterprise-summary-card-location {
          background: #fffef7;
        }

        .enterprise-summary-main {
          margin-top: 10px;
          display: block;
          font-size: clamp(20px, 2.1vw, 28px);
          line-height: 1.14;
          color: #30323a;
          overflow-wrap: anywhere;
          word-break: break-word;
          hyphens: auto;
          text-wrap: pretty;
        }

        .enterprise-summary-subline {
          margin-top: 4px;
          display: block;
          font-size: 15px;
          line-height: 1.45;
          color: #7b7c84;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .enterprise-check-card {
          min-height: 0;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 18px 20px;
          background: #fbfbfa;
          border: 1px solid rgba(102, 102, 107, 0.10);
          border-radius: 20px;
          box-shadow: 0 12px 24px rgba(17, 24, 39, 0.04);
        }

        .enterprise-check-accent {
          width: 10px;
          height: 10px;
          margin-top: 7px;
          border-radius: 999px;
          background: #f1d433;
          flex: 0 0 auto;
          box-shadow: 0 0 0 6px rgba(241, 212, 51, 0.16);
        }

        .enterprise-form-grid .field-full {
          grid-column: 1 / -1;
        }

        .enterprise-inline-list {
          margin-top: 20px;
        }

        .insight-card,
        .trust-card,
        .process-card {
          background: #fbfbfa;
          border: 1px solid rgba(102, 102, 107, 0.10);
          border-radius: 22px;
          padding: 22px;
          box-shadow: 0 12px 24px rgba(17, 24, 39, 0.04);
        }

        .insight-title,
        .trust-title,
        .process-title {
          margin: 0;
          font-size: clamp(20px, 2vw, 24px);
          line-height: 1.18;
          color: #66666b;
        }

        .insight-text,
        .trust-text,
        .process-text {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 1.72;
          color: #66666b;
        }

        .emphasis-card {
          background: linear-gradient(180deg, #fffef7 0%, #ffffff 100%);
        }

        .process-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-top: 20px;
        }

        .process-step-number {
          width: 46px;
          height: 46px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #f1d433;
          color: #1f2328;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.1em;
          margin-bottom: 14px;
          box-shadow: 0 12px 22px rgba(241, 212, 51, 0.24);
        }

        .final-cta-card {
          background: linear-gradient(135deg, #fffef7 0%, #ffffff 62%);
          border-color: rgba(241, 212, 51, 0.28);
        }

        .final-cta-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.9fr);
          gap: 24px;
          align-items: center;
        }

        .final-cta-title,
        .final-cta-text {
          text-align: left;
          max-width: none;
        }

        .final-cta-list {
          margin-top: 18px;
          display: grid;
          gap: 10px;
        }

        .final-cta-list div {
          min-height: 48px;
          display: flex;
          align-items: center;
          padding: 0 16px;
          border-radius: 16px;
          background: rgba(241, 212, 51, 0.14);
          border: 1px solid rgba(241, 212, 51, 0.28);
          color: #66666b;
          font-size: 14px;
          font-weight: 600;
        }

        .final-cta-actions {
          display: grid;
          gap: 12px;
        }

        .final-cta-button {
          width: 100%;
          justify-content: center;
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
          min-height: 120px;
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
          grid-template-columns: repeat(4, minmax(0, 1fr));
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
          .wizard-progress,
          .insight-grid,
          .trust-grid,
          .process-grid,
          .final-cta-layout,
          .enterprise-stat-grid,
          .enterprise-check-grid,
          .enterprise-showcase-layout,
          .enterprise-visit-layout,
          .enterprise-summary-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .mobile-essential-hide {
            display: none !important;
          }

          .wizard-progress {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            margin-top: 14px;
            padding-bottom: 4px;
            scrollbar-width: none;
          }

          .wizard-progress::-webkit-scrollbar {
            display: none;
          }

          .wizard-step {
            flex: 0 0 auto;
            min-width: 52px;
            justify-content: center;
            padding: 10px;
            border-radius: 16px;
          }

          .wizard-step-copy {
            display: none;
          }

          .wizard-step-index {
            width: 30px;
            height: 30px;
            font-size: 12px;
          }

          .wizard-panel {
            margin-top: 14px;
            padding: 16px;
            border-radius: 20px;
          }

          .wizard-copy {
            text-align: left;
            max-width: none;
          }

          .wizard-title {
            font-size: 22px;
            line-height: 1.12;
          }

          .wizard-fields {
            margin-top: 14px;
          }

          .mode-card,
          .wizard-highlight-card {
            margin-top: 14px;
            padding: 14px;
            border-radius: 18px;
          }

          .goal-card {
            margin-top: 10px;
            padding: 10px;
          }

          .goal-nested-card {
            margin-top: 6px;
            padding: 8px;
            border-radius: 12px;
          }

          .mode-buttons {
            gap: 8px;
            margin-top: 10px;
          }

          .goal-card .mode-buttons {
            display: grid;
            grid-template-columns: 1fr;
            gap: 5px;
            margin-top: 6px;
          }

          .mode-btn {
            padding: 10px 12px;
            border-radius: 14px;
            font-size: 12px;
          }

          .goal-card .mode-btn {
            width: 100%;
            padding: 7px 9px;
            border-radius: 11px;
            font-size: 11px;
            line-height: 1.18;
            text-align: left;
          }

          .fields-grid,
          .profile-options-grid,
          .summary-grid,
          .compact-grid,
          .contact-grid,
          .cards-grid,
          .bottom-grid,
          .service-grid,
          .project-grid,
          .project-meta-grid,
          .enterprise-stat-grid,
          .enterprise-check-grid,
          .enterprise-summary-grid,
          .enterprise-use-grid,
          .enterprise-process-grid {
            gap: 10px;
            margin-top: 14px;
          }

          .enterprise-showcase-layout,
          .enterprise-visit-layout {
            gap: 14px;
          }

          .enterprise-summary-grid,
          .enterprise-check-grid {
            grid-template-columns: 1fr;
          }

          .enterprise-summary-card,
          .enterprise-check-card {
            padding: 16px;
          }

          .field,
          .contact-box,
          .summary-card,
          .stat,
          .offer-card,
          .price-box {
            padding: 12px;
            border-radius: 18px;
          }

          .attachments-grid {
            grid-template-columns: 1fr;
          }


          .hero-proof-row {
            justify-content: center;
          }

          .final-cta-title,
          .final-cta-text {
            text-align: center;
          }

          .goal-card .hint {
            margin-top: 5px;
            font-size: 10px;
            line-height: 1.28;
          }

          .compact-select-grid {
            grid-template-columns: 1fr;
            gap: 8px;
            margin-top: 10px;
          }

          .subview-hero {
            min-height: 230px;
            margin-bottom: 12px;
            border-radius: 24px;
          }

          .subview-hero-inner {
            min-height: 230px;
            padding: 24px 18px;
          }

          .subview-hero-copy {
            text-align: left;
          }

          .subview-hero-title {
            font-size: clamp(28px, 9vw, 40px);
            line-height: 1.02;
          }

          .subview-hero-text {
            margin-top: 10px;
            font-size: 13px;
            line-height: 1.45;
          }

          .submit-feedback {
            margin-top: 12px;
            padding: 10px 12px;
            border-radius: 14px;
            font-size: 12px;
          }

          .label {
            font-size: 11px;
            letter-spacing: 0.12em;
          }

          .input,
          .select,
          .textarea {
            margin-top: 8px;
            padding: 12px;
            border-radius: 12px;
            font-size: 16px;
          }

          .hint {
            margin-top: 6px;
            font-size: 12px;
            line-height: 1.45;
          }

          .profile-option-card {
            padding: 14px;
            border-radius: 18px;
          }

          .profile-option-title {
            font-size: 18px;
          }

          .profile-option-description {
            display: none;
          }

          .profile-option-check {
            min-height: 30px;
            padding: 0 10px;
            font-size: 10px;
          }

          .profile-example-chart {
            margin-top: 12px;
            min-height: 92px;
            gap: 8px;
          }

          .profile-example-bar-wrap {
            min-height: 92px;
            gap: 6px;
          }

          .summary-card {
            min-height: 0;
          }

          .price-value,
          .summary-value {
            font-size: 28px;
          }

          .enterprise-stat-value {
            font-size: 24px;
            line-height: 1.16;
          }

          .enterprise-summary-main {
            font-size: 22px;
            line-height: 1.18;
          }

          .enterprise-summary-subline {
            font-size: 14px;
          }

          .insight-title,
          .process-title,
          .trust-title,
          .service-title {
            font-size: 19px;
            line-height: 1.22;
          }

          .summary-sub {
            margin-top: 4px;
            font-size: 12px;
          }

          .offer-head {
            flex-direction: column;
            align-items: flex-start;
          }

          .offer-head-actions {
            width: 100%;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }

          .offer-title {
            font-size: 21px;
          }

          .offer-sub {
            margin-top: 6px;
            font-size: 13px;
            line-height: 1.45;
          }

          .price-box {
            margin-top: 12px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-top: 12px;
          }

          .stat {
            min-height: 0;
          }

          .stat-value {
            font-size: 15px;
            line-height: 1.3;
          }

          .report-actions {
            margin-top: 14px;
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

        <nav className="service-nav" aria-label="Secciones principales de Sakiara">
          <button
            className={`service-nav-btn ${activeView === "home" ? "active" : ""}`}
            type="button"
            onClick={() => goToView("home")}
          >
            Inicio
          </button>
          <button
            className={`service-nav-btn ${activeView === "instalacion" ? "active" : ""}`}
            type="button"
            onClick={() => goToView("instalacion")}
          >
            Hogar
          </button>
          <button
            className={`service-nav-btn ${activeView === "empresas" ? "active" : ""}`}
            type="button"
            onClick={() => goToView("empresas")}
          >
            Empresas
          </button>
          <button
            className={`service-nav-btn ${activeView === "mantenimiento" ? "active" : ""}`}
            type="button"
            onClick={() => goToView("mantenimiento")}
          >
            Mantenimiento
          </button>
        </nav>

        <div className="stack">
          {activeView === "home" && renderHomeView()}
          {activeView === "instalacion" && renderInstallationView()}
          {activeView === "empresas" && renderEnterpriseView()}
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
