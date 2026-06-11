import { describe, it, expect } from 'vitest'
import { scrapeFromHtml } from './scraper'

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<body>
<div class="content">
  <div class="container">
    <!-- Cabeçalho -->
    <div class="row" id="portfolio-filter">
      <div class="col-md-12 text-center mt30">
        <h1 class="title-entidade">Volkswagen Gol City 1.0 2012</h1>
      </div>
    </div>

    <!-- Informações principais -->
    <div class="row mb10">
      <div class="col-md-12">
        <h2 class="title-border custom">Informações</h2>
        <div class="ent-specs-grid">
          <div class="ent-spec-item">
            <span class="ent-spec-label">Ano</span>
            <span class="ent-spec-value">2012</span>
          </div>
          <div class="ent-spec-item">
            <span class="ent-spec-label">Combustível</span>
            <span class="ent-spec-value">Flex</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Ficha Técnica -->
    <div class="row" style="margin-top: 30px;">
      <div class="col-md-12">
        <h2 class="title-border custom">Ficha Técnica</h2>

        <div class="ent-ficha-group">
          <h3 class="ent-ficha-group__title">Motor</h3>
          <div class="ent-ficha-grid">
            <div class="ent-spec-item">
              <span class="ent-spec-label">Cilindrada</span>
              <span class="ent-spec-value">999 cm³</span>
            </div>
            <div class="ent-spec-item">
              <span class="ent-spec-label">Potência máxima</span>
              <span class="ent-spec-value">71 cv (A) 68 cv (G) a 5750 rpm</span>
            </div>
            <div class="ent-spec-item">
              <span class="ent-spec-label">Torque máximo</span>
              <span class="ent-spec-value">9,7 kgfm (A) 9,4 kgfm (G) a 4250 rpm</span>
            </div>
          </div>
        </div>

        <div class="ent-ficha-group">
          <h3 class="ent-ficha-group__title">Transmissão</h3>
          <div class="ent-ficha-grid">
            <div class="ent-spec-item">
              <span class="ent-spec-label">Câmbio</span>
              <span class="ent-spec-value">Manual</span>
            </div>
          </div>
        </div>

        <div class="ent-ficha-group">
          <h3 class="ent-ficha-group__title">Consumo</h3>
          <div class="ent-ficha-grid">
            <div class="ent-spec-item">
              <span class="ent-spec-label">Urbano (G)</span>
              <span class="ent-spec-value">9,8 km/l</span>
            </div>
            <div class="ent-spec-item">
              <span class="ent-spec-label">Rodoviário (G)</span>
              <span class="ent-spec-value">14,2 km/l</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</div>
</body>
</html>`

describe('scrapeFromHtml', () => {
  it('should extract all typed fields from known labels', () => {
    const result = scrapeFromHtml(SAMPLE_HTML)

    expect(result.engine).toBe('999 cm³')
    expect(result.powerHp).toBe('71 cv (A) 68 cv (G) a 5750 rpm')
    expect(result.torque).toBe('9,7 kgfm (A) 9,4 kgfm (G) a 4250 rpm')
    expect(result.transmission).toBe('Manual')
    expect(result.fuelType).toBe('Flex')
    expect(result.consumptionCity).toBe('9,8 km/l')
    expect(result.consumptionHighway).toBe('14,2 km/l')
  })

  it('should include all extracted pairs in rawData as JSON', () => {
    const result = scrapeFromHtml(SAMPLE_HTML)
    const raw = JSON.parse(result.rawData) as Record<string, string>

    expect(raw['Cilindrada']).toBe('999 cm³')
    expect(raw['Potência máxima']).toBe('71 cv (A) 68 cv (G) a 5750 rpm')
    expect(raw['Ano']).toBe('2012') // info section, not just ficha técnica
  })

  it('should return null for typed fields when label not on page', () => {
    // HTML without any ficha técnica sections
    const emptyHtml = '<html><body><div class="content"><div class="container"><div class="row" style="margin-top: 30px;"><div class="col-md-12"></div></div></div></div></body></html>'

    const result = scrapeFromHtml(emptyHtml)

    expect(result.engine).toBeNull()
    expect(result.powerHp).toBeNull()
    expect(result.rawData).toBe('{}')
  })
})
