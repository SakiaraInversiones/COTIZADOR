import React, { useMemo, useState } from 'react'

const sakiaraLogo = '/sakiara-logo.jpg'
const contactEmail = 'rafael.vasquez844@gmail.com'
const whatsappNumber = '56975807224'

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

const estimateCostPerKwp = (kwp) => {
  if (kwp <= 3) return 1500000
  if (kwp <= 5) return 1380000
  if (kwp <= 8) return 1260000
  return 1180000
}

const zoneProduction = {
  norte: 140,
  centro: 125,
  sur: 112,
}

const profileMap = {
  outside: { label: 'Fuera de casa', morning: 15, day: 20, night: 65 },
  mixed: { label: 'Mixto', morning: 20, day: 35, night: 45 },
  home: { label: 'Home office', morning: 20, day: 50, night: 30 },
}

function OfferCard({ title, subtitle, badge, price, savings, coverage, payback, variant }) {
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
          <div className="stat-label">Cobertura</div>
          <div className="stat-value">{coverage}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Retorno</div>
          <div className="stat-value">{payback}</div>
        </div>
      </div>
    </div>
  )
}

export default function SakiaraLandingPage() {
  const [monthlyBill, setMonthlyBill] = useState(250000)
  const [billConsumptionKWh, setBillConsumptionKWh] = useState(900)
  const [zone, setZone] = useState('centro')
  const [profile, setProfile] = useState('outside')
  const [logoHidden, setLogoHidden] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const selectedProfile = profileMap[profile]

  const metrics = useMemo(() => {
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

    const getTier = (tiers, panels) => tiers.find((tier) => panels <= tier.maxPanels) || tiers[tiers.length - 1]

    const productionFactor = zoneProduction[zone]
    const monthlyConsumptionKWh = Math.max(billConsumptionKWh, 1)
    const derivedTariff = monthlyBill / monthlyConsumptionKWh
    const exportRate = Math.max(90, derivedTariff * 0.38)

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

    const estimatedPanels = Math.max(4, Math.round(systemSizeKwp / 0.55))
    const huaweiTier = getTier(huaweiTiers, estimatedPanels)
    const solisTier = getTier(solisTiers, estimatedPanels)

    const selfConsumptionNoBatteryRate = clamp(0.48 + dayEquivalentUse * 0.0068, 0.58, 0.84)
    const selfConsumptionWithBatteryRate = clamp(
      selfConsumptionNoBatteryRate + 0.18,
      0.72,
      0.97
    )

    const monthlyGenerationKWh = systemSizeKwp * productionFactor

    const selfConsumedNoBattery = Math.min(
      monthlyGenerationKWh * selfConsumptionNoBatteryRate,
      monthlyConsumptionKWh
    )
    const exportedNoBattery = Math.max(monthlyGenerationKWh - selfConsumedNoBattery, 0)
    const monthlySavingsNoBattery =
      selfConsumedNoBattery * derivedTariff + exportedNoBattery * exportRate
    const annualSavingsNoBattery = monthlySavingsNoBattery * 12

    const selfConsumedWithBattery = Math.min(
      monthlyGenerationKWh * selfConsumptionWithBatteryRate,
      monthlyConsumptionKWh
    )
    const exportedWithBattery = Math.max(monthlyGenerationKWh - selfConsumedWithBattery, 0)
    const monthlySavingsWithBattery =
      selfConsumedWithBattery * derivedTariff + exportedWithBattery * exportRate
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

    const projectCostHuaweiWithBatteryGross = projectCostHuaweiNoBatteryGross + huaweiBatteryPackGross
    const projectCostSolisWithBatteryGross = projectCostSolisNoBatteryGross + solisBatteryPackGross

    const coverageNoBattery = clamp(
      (monthlySavingsNoBattery / Math.max(monthlyBill, 1)) * 100,
      0,
      92
    )
    const coverageWithBattery = clamp(
      (monthlySavingsWithBattery / Math.max(monthlyBill, 1)) * 100,
      0,
      98
    )

    return {
      monthlyConsumptionKWh,
      estimatedPanels,
      monthlySavingsNoBattery,
      monthlySavingsWithBattery,
      projectCostHuaweiNoBattery: projectCostHuaweiNoBatteryGross,
      projectCostHuaweiWithBattery: projectCostHuaweiWithBatteryGross,
      projectCostSolisNoBattery: projectCostSolisNoBatteryGross,
      projectCostSolisWithBattery: projectCostSolisWithBatteryGross,
      coverageNoBattery,
      coverageWithBattery,
      paybackHuaweiNoBattery:
        projectCostHuaweiNoBatteryGross / Math.max(annualSavingsNoBattery, 1),
      paybackHuaweiWithBattery:
        projectCostHuaweiWithBatteryGross / Math.max(annualSavingsWithBattery, 1),
      paybackSolisNoBattery:
        projectCostSolisNoBatteryGross / Math.max(annualSavingsNoBattery, 1),
      paybackSolisWithBattery:
        projectCostSolisWithBatteryGross / Math.max(annualSavingsWithBattery, 1),
    }
  }, [monthlyBill, billConsumptionKWh, zone, selectedProfile])

  const buildSummaryText = () => {
    return [
      `Monto boleta: ${formatCLP(monthlyBill)}`,
      `Consumo boleta: ${formatNumber(metrics.monthlyConsumptionKWh)} kWh/mes`,
      `Zona: ${zone}`,
      `Perfil: ${selectedProfile.label}`,
      `Proyecto sugerido: ${formatNumber(metrics.estimatedPanels)} paneles aprox.`,
      `Huawei sin batería: ${formatCLP(metrics.projectCostHuaweiNoBattery)}`,
      `Solis sin batería: ${formatCLP(metrics.projectCostSolisNoBattery)}`,
      `Huawei con batería LUNA: ${formatCLP(metrics.projectCostHuaweiWithBattery)}`,
      `Solis con batería: ${formatCLP(metrics.projectCostSolisWithBattery)}`,
    ].join('\n')
  }

  const handleMailto = () => {
    const subject = encodeURIComponent(`Solicitud de evaluación solar - ${name || 'Nuevo contacto'}`)
    const body = encodeURIComponent(
      `Nombre: ${name || '-'}\nTeléfono: ${phone || '-'}\nCorreo: ${email || '-'}\n\nResumen de cotización:\n${buildSummaryText()}\n\nMensaje adicional:\n${message || '-'}`
    )
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`
  }

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hola, quiero una evaluación personalizada para un proyecto solar.\n\n${buildSummaryText()}\n\nNombre: ${name || '-'}\nTeléfono: ${phone || '-'}\nCorreo: ${email || '-'}\n\nMensaje: ${message || '-'}`
    )
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank')
  }

  return (
    <div className="sakiara-root">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Inter, Arial, Helvetica, sans-serif; background: #f3f2ee; }

        .sakiara-root {
          min-height: 100vh;
          background: linear-gradient(180deg, #f3f2ee 0%, #f8f7f3 100%);
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

        .title {
          margin: 0;
          font-size: clamp(44px, 5.2vw, 76px);
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
        .wa-btn {
          font: inherit;
          border: none;
          cursor: pointer;
          border-radius: 18px;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
        }

        .btn-primary:hover,
        .btn-secondary:hover,
        .profile-btn:hover,
        .full-btn:hover,
        .wa-btn:hover {
          transform: translateY(-1px);
        }

        .btn-primary,
        .full-btn {
          padding: 15px 24px;
          background: #f1d433;
          color: #1f2328;
          font-weight: 800;
          box-shadow: 0 12px 24px rgba(241, 212, 51, 0.28);
        }

        .btn-secondary {
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
        .bottom-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .mini-grid { margin-top: 30px; }
        .summary-grid { margin-top: 20px; }

        .mini-card,
        .summary-card,
        .field,
        .profile-row,
        .offer-card,
        .info-card,
        .contact-box {
          background: #fbfbfa;
          border: 1px solid rgba(102, 102, 107, 0.10);
        }

        .mini-card,
        .summary-card,
        .info-card {
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 12px 24px rgba(17, 24, 39, 0.04);
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

        .full-btn {
          background: #f1d433;
          color: #1f2328;
        }

        .wa-btn {
          background: #66666b;
          color: #ffffff;
        }

        .bottom {
          margin-top: 10px;
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

        .info-text {
          margin-top: 12px;
          font-size: 15px;
          line-height: 1.75;
          color: #7c7c82;
        }

        @media (max-width: 980px) {
          .mini-grid,
          .summary-grid,
          .cards-grid,
          .bottom-grid,
          .contact-grid,
          .fields-grid {
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

          .price-value {
            font-size: 32px;
          }

          .cta-row,
          .contact-actions {
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
          <section className="section-card">
            <div className="hero-copy">
              <h1 className="title">Energía solar residencial diseñada para generar valor.</h1>
              <p className="text">
                Desarrollamos propuestas solares residenciales con foco en inversión, ahorro y escalabilidad. Compara soluciones Huawei y Solis, con y sin batería, utilizando los datos que el cliente ve normalmente en su boleta.
              </p>
              <div className="cta-row">
                <button className="btn-primary" onClick={handleMailto}>Solicitar evaluación</button>
                <button className="btn-secondary" onClick={handleWhatsApp}>Conocer propuesta</button>
              </div>
            </div>

            <div className="mini-grid">
              <div className="mini-card">
                <p className="mini-title">Inversión</p>
                <div className="mini-text">Valor total IVA incluido presentado de forma clara, profesional y orientada a la decisión de compra.</div>
              </div>
              <div className="mini-card">
                <p className="mini-title">Ahorro</p>
                <div className="mini-text">Proyección mensual basada en el consumo real informado por la boleta del cliente.</div>
              </div>
              <div className="mini-card">
                <p className="mini-title">Escalable</p>
                <div className="mini-text">Desde una solución base on-grid hasta una alternativa con batería para mayor cobertura.</div>
              </div>
            </div>
          </section>

          <section className="section-card">
            <div className="section-head">
              <p className="eyebrow">Calculadora comercial</p>
              <h2 className="section-title">Cotiza según tu boleta</h2>
              <p className="section-text">
                Ingresa el monto de la boleta, el consumo mensual en kWh y el tipo de uso del hogar. La calculadora entrega un valor resumido por proyecto, pensado para cotizar de forma simple y profesional.
              </p>
              <div className="pill">Paleta Sakiara</div>
            </div>

            <div className="fields-grid">
              <div className="field">
                <label className="label">Monto mensual aproximado</label>
                <input
                  className="input"
                  type="number"
                  min={50000}
                  step={10000}
                  value={monthlyBill}
                  onChange={(e) => setMonthlyBill(Number(e.target.value) || 0)}
                />
                <div className="hint">Ejemplo: $250.000</div>
              </div>

              <div className="field">
                <label className="label">Consumo de la boleta</label>
                <input
                  className="input"
                  type="number"
                  min={100}
                  step={10}
                  value={billConsumptionKWh}
                  onChange={(e) => setBillConsumptionKWh(Number(e.target.value) || 0)}
                />
                <div className="hint">Dato visible en la boleta, en kWh por mes.</div>
              </div>

              <div className="field">
                <label className="label">Zona del proyecto</label>
                <select
                  className="select"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                >
                  <option value="norte">Norte</option>
                  <option value="centro">Centro</option>
                  <option value="sur">Sur</option>
                </select>
                <div className="hint">Ajusta la producción referencial según la zona geográfica del proyecto.</div>
              </div>

              <div className="profile-row">
                <div className="profile-head">
                  <div>
                    <label className="label">Perfil del hogar</label>
                    <div className="hint">Selecciona el hábito de consumo que más se parezca al cliente.</div>
                  </div>

                  <div className="profile-buttons">
                    <button
                      className={`profile-btn ${profile === 'outside' ? 'active' : ''}`}
                      onClick={() => setProfile('outside')}
                    >
                      Fuera
                    </button>
                    <button
                      className={`profile-btn ${profile === 'mixed' ? 'active' : ''}`}
                      onClick={() => setProfile('mixed')}
                    >
                      Mixto
                    </button>
                    <button
                      className={`profile-btn ${profile === 'home' ? 'active' : ''}`}
                      onClick={() => setProfile('home')}
                    >
                      Home office
                    </button>
                  </div>
                </div>

                <div className="hint" style={{ marginTop: 12 }}>
                  Perfil seleccionado: <strong>{selectedProfile.label}</strong>
                </div>
              </div>
            </div>

            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-label">Consumo de boleta</div>
                <div className="summary-value">{formatNumber(metrics.monthlyConsumptionKWh)}</div>
                <div className="summary-sub">kWh por mes</div>
              </div>

              <div className="summary-card">
                <div className="summary-label">Proyecto sugerido</div>
                <div className="summary-value">{formatNumber(metrics.estimatedPanels)}</div>
                <div className="summary-sub">paneles aproximados</div>
              </div>

              <div className="summary-card">
                <div className="summary-label">Ahorro estimado desde</div>
                <div className="summary-value">{formatCLP(metrics.monthlySavingsNoBattery)}</div>
                <div className="summary-sub">mensual referencial</div>
              </div>
            </div>
          </section>

          <section className="section-card">
            <div className="section-head">
              <p className="eyebrow">Alternativas de proyecto</p>
              <h2 className="section-title">Compara soluciones resumidas</h2>
              <p className="section-text">
                Cada alternativa muestra el valor total IVA incluido, ahorro estimado, cobertura y retorno para apoyar tu decisión comercial.
              </p>
            </div>

            <div className="cards-grid">
              <OfferCard
                title="Huawei sin batería"
                subtitle="Alternativa premium base para una solución on-grid."
                badge="Línea Huawei"
                price={formatCLP(metrics.projectCostHuaweiNoBattery)}
                savings={formatCLP(metrics.monthlySavingsNoBattery)}
                coverage={`${formatNumber(metrics.coverageNoBattery)}%`}
                payback={`${formatNumber(metrics.paybackHuaweiNoBattery, 1)} años`}
                variant="huawei"
              />

              <OfferCard
                title="Solis sin batería"
                subtitle="Alternativa eficiente con inversor de mayor costo en la versión sin batería."
                badge="Línea Solis"
                price={formatCLP(metrics.projectCostSolisNoBattery)}
                savings={formatCLP(metrics.monthlySavingsNoBattery)}
                coverage={`${formatNumber(metrics.coverageNoBattery)}%`}
                payback={`${formatNumber(metrics.paybackSolisNoBattery, 1)} años`}
                variant="solis"
              />

              <OfferCard
                title="Huawei con batería LUNA"
                subtitle="Primera batería LUNA 5 kWh con módulo y backup box."
                badge="Huawei híbrido"
                price={formatCLP(metrics.projectCostHuaweiWithBattery)}
                savings={formatCLP(metrics.monthlySavingsWithBattery)}
                coverage={`${formatNumber(metrics.coverageWithBattery)}%`}
                payback={`${formatNumber(metrics.paybackHuaweiWithBattery, 1)} años`}
                variant="hybrid"
              />

              <OfferCard
                title="Solis con batería"
                subtitle="Batería genérica de 15 kWh como referencia comercial."
                badge="Solis híbrido"
                price={formatCLP(metrics.projectCostSolisWithBattery)}
                savings={formatCLP(metrics.monthlySavingsWithBattery)}
                coverage={`${formatNumber(metrics.coverageWithBattery)}%`}
                payback={`${formatNumber(metrics.paybackSolisWithBattery, 1)} años`}
                variant="solis hybrid"
              />
            </div>

            <div className="note">
              Valores referenciales sujetos a evaluación comercial, visita técnica, disponibilidad de equipos y condiciones reales de instalación.
            </div>
          </section>

          <section className="section-card">
            <div className="section-head">
              <p className="eyebrow">Contacto</p>
              <h2 className="section-title">Solicita una evaluación personalizada</h2>
              <p className="section-text">
                Completa tus datos y abre tu correo con el resumen de la cotización, o escríbenos directamente por WhatsApp con toda la información cargada.
              </p>
            </div>

            <div className="contact-grid">
              <div className="contact-box">
                <label className="label">Nombre</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
              </div>
              <div className="contact-box">
                <label className="label">Teléfono</label>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56..." />
              </div>
              <div className="contact-box">
                <label className="label">Correo</label>
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
              </div>
              <div className="contact-box">
                <label className="label">Mensaje</label>
                <textarea className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Cuéntanos brevemente tu proyecto o necesidad" />
              </div>
            </div>

            <div className="contact-actions">
              <button className="full-btn" onClick={handleMailto}>Solicitar evaluación</button>
              <button className="btn-secondary" onClick={handleMailto}>Conocer propuesta</button>
              <button className="wa-btn" onClick={handleWhatsApp}>Hablar por WhatsApp</button>
            </div>
          </section>

          <section className="bottom">
            <div className="note" style={{ marginTop: 0, textAlign: 'center', fontWeight: 700 }}>
              Los valores son referenciales IVA incluido.
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
