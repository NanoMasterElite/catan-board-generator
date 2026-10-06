import sys
import io

new_code = """        const COLUMNS = [
          { key: 'player', label: 'Jugador', type: 'readonly',
            renderTh: () => `<th>Jugador</th>`,
            renderTd: (p, id, eData) => `<td><span class="color-dot" style="background:${p.color}"></span>${escapeHtml(p.name)}</td>`
          },
          { key: 'settlements', label: 'Poblados', type: 'number', def: defaultSettlements, min: 0, title: 'Poblados restantes en mesa al finalizar (los poblados totales construidos se calculan automáticamente)' },
          { key: 'cities', label: 'Ciudades', type: 'number', def: defaultCities, min: 0, title: 'Ciudades construidas' },
          { key: 'metropolis', label: '🏛️ Metrópolis', type: 'number', def: 0, min: 0, max: 3, title: 'Metrópolis (4 VP c/u: 2 ciudad + 2 metrópoli)', when: () => isCyC },
          { key: 'campeador', label: '🛡️ Campeador', type: 'number', def: 0, min: 0, title: 'Puntos de Campeador de Catán (1 VP c/u)', when: () => isCyC,
            valueGetter: (eData) => {
              if (!eData || eData.campeador === undefined || eData.campeador === null) return 0;
              return typeof eData.campeador === 'number' ? eData.campeador : (eData.campeador ? 1 : 0);
            }
          },
          { key: 'foreignIslands', label: '🏝️ Islas Foráneas', type: 'number', def: 0, min: 0, title: 'Islas foráneas alcanzadas (2 VP c/u)', when: () => isNav && !isOceania, inputClass: 'ng-foreign-islands' },
          { key: 'entreAmigos', label: '🤝 Entre amigos', type: 'number', def: 0, min: 0, title: 'Fichas de Miniexpansión Entre amigos (1 VP c/u)', className: 'col-entreamigos', style: eaStyle, inputClass: 'ng-entreamigos' },
          { key: 'botaVieja', label: '👢 Bota', type: 'checkbox', def: false, title: 'Bota Vieja: Quien la posee necesita +1 PV por encima de la meta para ganar', className: 'col-botavieja', style: bvStyle, tdStyle: 'text-align:center;', inputClass: 'ng-botavieja' },
          { key: 'merchant', label: '💼 Comerciante', type: 'checkbox', def: false, title: 'Comerciante / Mercader (1 VP)', when: () => isCyC, tdStyle: 'text-align:center', inputClass: 'ng-merchant' },
          { key: 'imprenta', label: '📜 Imprenta', type: 'checkbox', def: false, title: 'Carta de progreso: Imprenta (Ciencia, 1 VP)', when: () => isCyC, tdStyle: 'text-align:center', inputClass: 'ng-imprenta' },
          { key: 'constitucion', label: '📜 Constitución', type: 'checkbox', def: false, title: 'Carta de progreso: Constitución (Política, 1 VP)', when: () => isCyC, tdStyle: 'text-align:center', inputClass: 'ng-constitucion' },
          { key: 'knights', label: '⚔️ Caballeros', type: 'number', def: 0, min: 0, max: maxKnights, title: 'Caballeros / Alianzas jugados (máx ' + maxKnights + ')', when: () => !isCyC },
          { key: 'monopolies', label: '💰 Monopolios', type: 'number', def: 0, min: 0, max: maxMonopolies, title: 'Monopolios jugados (máx ' + maxMonopolies + ')', when: () => !isCyC },
          { key: 'inventions', label: '📜 Invención', type: 'number', def: 0, min: 0, max: maxInventions, title: 'Invenciones/Progresos (máx ' + maxInventions + ')', when: () => !isCyC },
          { key: 'roadCards', label: '🛣️ Carreteras', type: 'number', def: 0, min: 0, max: maxRoads, title: 'Carreteras / Construcción de carreteras (máx ' + maxRoads + ')', when: () => !isCyC, inputClass: 'ng-roadcards' },
          { key: 'vpDev', label: '🏛️ Puntos Dev', type: 'number', def: 0, min: 0, max: maxVpDev, title: 'Puntos de victoria en cartas (máx ' + maxVpDev + ')', when: () => !isCyC, inputClass: 'ng-vpdev' },
          { key: 'devCards', label: 'Dev. Totales', type: 'number', def: 0, min: 0, max: maxDevCards, title: 'Cartas totales compradas/usadas (máx ' + maxDevCards + ')', when: () => !isCyC, inputClass: 'ng-devcards' },
          { key: 'longestRoad', label: '🛣️ Gran Ruta', type: 'checkbox', def: false, title: 'Gran Ruta comercial (2 VP)', inputClass: 'ng-longestroad', tdStyle: 'text-align:center' },
          { key: 'largestArmy', label: '⚔️ Gran Ejército', type: 'checkbox', def: false, title: 'Gran Ejército de Caballería (2 VP)', when: () => !isCyC, inputClass: 'ng-largestarmy', tdStyle: 'text-align:center' },
          { key: 'portCaptain', label: '⚓ Capitán', type: 'checkbox', def: false, title: 'Capitán de Puerto (2 VP)', className: 'col-portcaptain', style: pcStyle, tdStyle: 'text-align:center;', inputClass: 'ng-portcaptain' },
          { key: 'points', label: 'Puntos Totales', type: 'number', def: 0, min: 0, inputStyle: 'font-weight:700;color:var(--brass-dark)' },
          { key: 'goalPct', label: '% Meta', type: 'readonly', title: 'Porcentaje de puntos alcanzados respecto a la meta de victoria',
            renderTh: (col) => `<th title="${col.title}">${col.label}</th>`,
            renderTd: () => `<td style="text-align:center;font-weight:700;" class="ng-goal-pct">0%</td>`
          },
          { key: 'winner', label: '🏆 Ganador', type: 'checkbox', def: false, tdStyle: 'text-align:center' }
        ];

        const activeColumns = COLUMNS.filter(c => !c.when || c.when());

        const theadHtml = '<tr>' + activeColumns.map(col => {
          if (col.renderTh) return col.renderTh(col);
          const styleAttr = col.style ? ` style="${col.style}"` : '';
          const classAttr = col.className ? ` class="${col.className}"` : '';
          const titleAttr = col.title ? ` title="${col.title}"` : '';
          return `<th${classAttr}${styleAttr}${titleAttr}>${col.label}</th>`;
        }).join('') + '</tr>';

        const rowsHtml = ids.map(id => {
          const p = players.find(pl => pl.id === id);
          // Fix bug E (preloadEntries removed):
          const eData = editGame ? editGame.entries.find(e => e.playerId === id) : null;
          
          let rowStr = `<tr data-player-row="${id}">`;
          activeColumns.forEach(col => {
            if (col.renderTd) {
              rowStr += col.renderTd(p, id, eData);
              return;
            }
            const val = col.valueGetter ? col.valueGetter(eData) : (eData && eData[col.key] !== undefined && eData[col.key] !== null ? eData[col.key] : col.def);
            const inputClass = col.inputClass || `ng-${col.key.toLowerCase()}`;
            const tdStyle = col.tdStyle ? ` style="${col.tdStyle}"` : '';
            const tdClass = col.className ? ` class="${col.className}"` : '';
            const inStyle = col.inputStyle ? ` style="${col.inputStyle}"` : '';
            const titleAttr = col.title ? ` title="${col.title}"` : '';

            if (col.type === 'number') {
              const maxAttr = col.max !== undefined ? ` max="${col.max}"` : '';
              rowStr += `<td${tdClass}${tdStyle}><input type="number" min="${col.min || 0}"${maxAttr} class="${inputClass}" value="${val}"${titleAttr}${inStyle}></td>`;
            } else if (col.type === 'checkbox') {
              rowStr += `<td${tdClass}${tdStyle}><input type="checkbox" class="${inputClass}" ${val ? 'checked' : ''}${titleAttr}${inStyle}></td>`;
            }
          });
          rowStr += '</tr>';
          return rowStr;
        }).join('');
"""

with open('main_monolith.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find bounds
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if line.strip().startswith('let theadHtml ='):
        start_idx = i
    elif line.strip().startswith('tableEl.innerHTML =') and start_idx != -1 and end_idx == -1:
        end_idx = i

if start_idx != -1 and end_idx != -1:
    lines = lines[:start_idx] + [new_code + '\n'] + lines[end_idx:]
    with open('main_monolith.js', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Refactor applied successfully.")
else:
    print(f"Bounds not found: start={start_idx}, end={end_idx}")
