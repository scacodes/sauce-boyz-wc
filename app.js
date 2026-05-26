/* ==========================================================================
   Sauce Boyz - World Cup 2026: Application Logic
   ========================================================================== */

// Estado Global
let state = {
  participants: [],
  activeParticipantIndex: 0,
  realResults: {}, // Almacena goles reales de partidos: { 'G-A-1': { home: X, away: Y }, ... }
  pendingPayments: [], // { name: '...', amount: X, screenshot: '...' }
  systemTime: '2026-06-11T12:00:00-05:00', // Tiempo virtual inicial
  isAdminMode: false,
  bypassLock: false // Bypass para que el admin pueda editar apuestas sin restricción de tiempo
};

// Cargar estado inicial
function initApp() {
  const savedState = localStorage.getItem('sauce_boyz_wc_state');
  
  if (savedState) {
    state = JSON.parse(savedState);
    // Asegurar compatibilidad si cargamos datos viejos
    if (!state.systemTime) state.systemTime = '2026-06-11T12:00:00-05:00';
  } else {
    // Inicializar con participantes demo para ver puntajes al instante
    state.participants = [
      {
        name: 'Samuel (Creador) 👑',
        paid: true,
        predictions: {
          'G-A-1': { home: 2, away: 1 },
          'G-A-2': { home: 1, away: 1 },
          'G-B-1': { home: 3, away: 0 },
          'G-K-5': { home: 0, away: 2 } // Colombia ganando
        },
        knockoutWinners: {} // R32-1: 'MEX' (avanza MEX)
      },
      {
        name: 'Juan (Salsa) 🎵',
        paid: true,
        predictions: {
          'G-A-1': { home: 1, away: 1 },
          'G-A-2': { home: 0, away: 2 },
          'G-B-1': { home: 2, away: 0 },
          'G-K-5': { home: 1, away: 2 }
        },
        knockoutWinners: {}
      },
      {
        name: 'Mateo (Boyz) ⚽',
        paid: false,
        predictions: {
          'G-A-1': { home: 3, away: 1 },
          'G-A-2': { home: 2, away: 0 }
        },
        knockoutWinners: {}
      }
    ];
    
    // Resultados reales predeterminados para que ya haya cálculos en el sistema
    state.realResults = {
      'G-A-1': { home: 2, away: 1 }, // México vs Sudáfrica (Ganó México 2-1)
      'G-A-2': { home: 1, away: 1 }  // Corea del Sur vs Rep. Checa (Empate 1-1)
    };

    state.pendingPayments = [
      { name: 'Mateo (Boyz)', amount: 50000, date: '2026-05-26T15:30:00-05:00' }
    ];

    saveState();
  }

  setupEventListeners();
  updateUserInterface();
}

function saveState() {
  localStorage.setItem('sauce_boyz_wc_state', JSON.stringify(state));
}

// ==========================================================================
// Event Listeners y Enrutamiento de Pestañas
// ==========================================================================
function setupEventListeners() {
  // Navegación de pestañas principales
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const tabId = link.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Selector de participantes
  const userSelect = document.getElementById('userSelect');
  if (userSelect) {
    userSelect.addEventListener('change', (e) => {
      state.activeParticipantIndex = parseInt(e.target.value);
      saveState();
      updateUserInterface();
    });
  }

  // Switch de Modo Admin
  const adminToggle = document.getElementById('adminToggle');
  if (adminToggle) {
    adminToggle.checked = state.isAdminMode;
    adminToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        const password = prompt('🔑 Ingresa la contraseña de administrador para activar el panel de control:');
        if (password === '23#') {
          state.isAdminMode = true;
          alert('👑 ¡Acceso concedido! Modo Administrador activado.');
        } else {
          alert('❌ Contraseña incorrecta. Acceso denegado.');
          e.target.checked = false;
          state.isAdminMode = false;
        }
      } else {
        state.isAdminMode = false;
      }
      saveState();
      updateUserInterface();
    });
  }

  // Creación de nuevo participante
  const btnCreateUser = document.getElementById('btnCreateUser');
  if (btnCreateUser) {
    btnCreateUser.addEventListener('click', () => {
      const name = prompt('Ingresa el nombre del nuevo participante:');
      if (name && name.trim() !== '') {
        state.participants.push({
          name: name.trim(),
          paid: false,
          predictions: {},
          knockoutWinners: {}
        });
        state.activeParticipantIndex = state.participants.length - 1;
        saveState();
        updateUserInterface();
      }
    });
  }

  // Eliminar participante activo
  const btnDeleteUser = document.getElementById('btnDeleteUser');
  if (btnDeleteUser) {
    btnDeleteUser.addEventListener('click', () => {
      const currentUser = state.participants[state.activeParticipantIndex];
      if (!currentUser) return;

      const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar a "${currentUser.name}"? Se perderán todas sus apuestas.`);
      if (confirmDelete) {
        state.participants.splice(state.activeParticipantIndex, 1);
        
        // Si no quedan participantes, crear uno por defecto para evitar interfaz vacía
        if (state.participants.length === 0) {
          state.participants.push({
            name: 'Jugador 1 ⚽',
            paid: false,
            predictions: {},
            knockoutWinners: {}
          });
        }
        
        // Ajustar el índice activo
        state.activeParticipantIndex = Math.max(0, state.activeParticipantIndex - 1);
        saveState();
        updateUserInterface();
      }
    });
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-tab') === tabId) {
      link.classList.add('active');
    }
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  const targetTab = document.getElementById(tabId);
  if (targetTab) {
    targetTab.classList.add('active');
  }

  // Renderizar la pestaña seleccionada específicamente
  if (tabId === 'inicio') renderInicio();
  if (tabId === 'mis-apuestas') renderMisApuestas();
  if (tabId === 'tabla-puntajes') renderLeaderboard();
  if (tabId === 'pago') renderPago();
}

function updateUserInterface() {
  // Actualizar listas desplegables y barra superior de usuario
  renderUserBar();
  
  // Renderizar la pestaña que está activa en este momento
  const activeLink = document.querySelector('.nav-link.active');
  const activeTabId = activeLink ? activeLink.getAttribute('data-tab') : 'inicio';
  
  // Renderizar la sección administrativa
  renderAdminPanel();
  
  switchTab(activeTabId);
}

function renderUserBar() {
  const userSelect = document.getElementById('userSelect');
  if (!userSelect) return;

  userSelect.innerHTML = '';
  state.participants.forEach((p, idx) => {
    const option = document.createElement('option');
    option.value = idx;
    option.textContent = p.name;
    if (idx === state.activeParticipantIndex) {
      option.selected = true;
    }
    userSelect.appendChild(option);
  });

  const currentUser = state.participants[state.activeParticipantIndex];
  const userStatusBadge = document.getElementById('userStatusBadge');
  if (userStatusBadge && currentUser) {
    if (currentUser.paid) {
      userStatusBadge.className = 'status-badge status-active';
      userStatusBadge.innerHTML = '⚡ Activo / Pago OK';
    } else {
      userStatusBadge.className = 'status-badge status-pending';
      userStatusBadge.innerHTML = '❌ Pago Pendiente ($50.000)';
    }
  }
}

// ==========================================================================
// Lógica de Pestaña: INICIO
// ==========================================================================
function renderInicio() {
  const container = document.getElementById('inicio');
  if (!container) return;

  const matches = generateGroupMatches();
  const sysDate = new Date(state.systemTime);

  // 1. Filtrar partidos del día actual (basado en la fecha del sistema virtual)
  const todayStr = sysDate.toISOString().split('T')[0];
  const todayMatches = matches.filter(m => m.date.startsWith(todayStr));

  let todayMatchesHTML = '';
  if (todayMatches.length > 0) {
    todayMatchesHTML = todayMatches.map(m => createMatchCardHTML(m, true)).join('');
  } else {
    todayMatchesHTML = `
      <div class="no-matches-placeholder">
        ⚽ No hay partidos agendados para la fecha actual del sistema (${formatLocalDate(state.systemTime)}).
        <br><small style="color: var(--text-muted); margin-top: 8px; display: inline-block;">
          (Tip: En el panel de Administrador de abajo, puedes avanzar el reloj para ver partidos de otros días).
        </small>
      </div>
    `;
  }

  // 2. Dashboard de Grupos
  let groupsDashboardHTML = '';
  Object.keys(window.GROUPS_DATA).forEach(gKey => {
    const tableData = calculateGroupTable(gKey);
    groupsDashboardHTML += createGroupTableHTML(gKey, tableData);
  });

  container.innerHTML = `
    <div class="inicio-layout">
      <!-- Sección izquierda: Partidos de hoy y Grupos -->
      <div>
        <h2 class="section-title">
          <span class="section-title-icon">⚽</span> Partidos de Hoy
        </h2>
        <div class="today-matches-container mb-16">
          ${todayMatchesHTML}
        </div>

        <h2 class="section-title" style="margin-top: 36px;">
          <span class="section-title-icon">📊</span> Grupos del Mundial en Tiempo Real
        </h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 16px;">
          Posiciones calculadas automáticamente según los resultados reales ingresados por el administrador.
        </p>
        <div class="groups-dashboard-grid">
          ${groupsDashboardHTML}
        </div>
      </div>

      <!-- Sección derecha: Reglamento -->
      <div>
        <h2 class="section-title">
          <span class="section-title-icon">📜</span> Reglamento Sauce Boyz
        </h2>
        <div class="rules-container">
          <div class="rule-card">
            <div class="rule-points">+5</div>
            <div class="rule-title">Acierto Ganador / Empate</div>
            <div class="rule-desc">Por acertar qué equipo ganará o si el partido termina empatado.</div>
          </div>
          <div class="rule-card">
            <div class="rule-points">+15</div>
            <div class="rule-title">Acierto Marcador Exacto</div>
            <div class="rule-desc">Por acertar el marcador exacto (goles de local y visitante). Reemplaza los 5 pts de ganador.</div>
          </div>
          <div class="rule-card">
            <div class="rule-points">+10</div>
            <div class="rule-title">Clasificados de Grupo</div>
            <div class="rule-desc">Por cada selección que pase a ronda de 32 (independiente de su posición).</div>
          </div>
          <div class="rule-card">
            <div class="rule-points">+25</div>
            <div class="rule-title">Orden Exacto del Grupo</div>
            <div class="rule-desc">Si los clasificados 1° y 2° del grupo quedan en la posición exacta predicha.</div>
          </div>
          <div class="rule-card elimination">
            <div class="rule-points">+20</div>
            <div class="rule-title">Tercer Puesto</div>
            <div class="rule-desc">Por acertar la selección que ganará la medalla de bronce.</div>
          </div>
          <div class="rule-card elimination">
            <div class="rule-points">+30</div>
            <div class="rule-title">Segundo Puesto</div>
            <div class="rule-desc">Por acertar el subcampeón de la Copa del Mundo.</div>
          </div>
          <div class="rule-card elimination">
            <div class="rule-points">+50</div>
            <div class="rule-title">Campeón del Mundo</div>
            <div class="rule-desc">Por predecir con exactitud el dueño de la gloriosa Copa FIFA 🏆.</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Asignar listeners si hay inputs de marcador de admin en el inicio
  attachMatchCardInputListeners(container);
}

// ==========================================================================
// Lógica de Pestaña: MIS APUESTAS
// ==========================================================================
let activeApuestasSubtab = 'grupo'; // 'grupo' o 'eliminatoria'
let activeGroupFilter = 'A';

function renderMisApuestas() {
  const container = document.getElementById('mis-apuestas');
  if (!container) return;

  const currentUser = state.participants[state.activeParticipantIndex];
  if (!currentUser) return;

  // Si el usuario no ha pagado, bloquear la edición y mostrar banner
  const isLockedForNonPayment = !currentUser.paid && !state.isAdminMode;

  let subtabsHTML = `
    <div class="apuestas-subtabs">
      <button class="subtab-btn ${activeApuestasSubtab === 'grupo' ? 'active' : ''}" onclick="setApuestasSubtab('grupo')">Fase de Grupos (12 Grupos)</button>
      <button class="subtab-btn ${activeApuestasSubtab === 'eliminatoria' ? 'active' : ''}" onclick="setApuestasSubtab('eliminatoria')">Fase Eliminatoria 🏆</button>
    </div>
  `;

  let contentHTML = '';

  if (activeApuestasSubtab === 'grupo') {
    // Generar botones de filtro de grupos
    const groupKeys = Object.keys(window.GROUPS_DATA);
    let groupFiltersHTML = `
      <div class="groups-filter">
        ${groupKeys.map(k => `
          <button class="group-filter-btn ${activeGroupFilter === k ? 'active' : ''}" onclick="setGroupFilter('${k}')">
            ${k}
          </button>
        `).join('')}
      </div>
    `;

    // Obtener los partidos del grupo activo
    const allMatches = generateGroupMatches();
    const groupMatches = allMatches.filter(m => m.group === activeGroupFilter);
    const matchesGridHTML = groupMatches.map(m => createMatchCardHTML(m, false)).join('');

    // Tabla del grupo según predicciones del usuario activo
    const userTableData = calculateGroupTable(activeGroupFilter, currentUser.predictions);
    const userGroupTableHTML = `
      <div style="margin-top: 32px; max-width: 600px;">
        <h3 class="group-table-title" style="color: var(--accent-green);">
          <span>📈 Tu Tabla Predicha de Grupo ${activeGroupFilter}</span>
        </h3>
        <p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 12px;">
          Se actualiza instantáneamente en función de tus marcadores predichos.
        </p>
        ${createGroupTableHTML(activeGroupFilter, userTableData)}
      </div>
    `;

    contentHTML = `
      ${groupFiltersHTML}
      ${isLockedForNonPayment ? `
        <div class="status-badge status-pending mb-16" style="display: flex; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
          ⚠️ Tu cuenta aún está en estado PENDIENTE. Debes reportar tu pago de $50.000 COP en la pestaña "Pago" para que el administrador te habilite la edición de apuestas.
        </div>
      ` : ''}
      <div class="matches-grid">
        ${matchesGridHTML}
      </div>
      ${userGroupTableHTML}
    `;
  } else {
    // Fase Eliminatoria (Brackets)
    contentHTML = renderBracketUI(isLockedForNonPayment);
  }

  container.innerHTML = `
    ${subtabsHTML}
    ${contentHTML}
  `;

  // Registrar listeners para capturar marcadores editados por el usuario
  attachMatchCardInputListeners(container);
  
  // Agregar listeners específicos de la eliminatoria
  attachBracketClickListeners();
}

window.setApuestasSubtab = function(subtab) {
  activeApuestasSubtab = subtab;
  renderMisApuestas();
};

window.setGroupFilter = function(group) {
  activeGroupFilter = group;
  renderMisApuestas();
};

// ==========================================================================
// Creadores de HTML de Tarjetas y Tablas
// ==========================================================================
function createMatchCardHTML(match, isTodayView = false) {
  const currentUser = state.participants[state.activeParticipantIndex];
  
  // Determinar si el partido ya está cerrado para predicción
  // (15 minutos antes de la hora estipulada)
  const matchTime = new Date(match.date);
  const sysTime = new Date(state.systemTime);
  const diffMinutes = (matchTime - sysTime) / (1000 * 60);
  
  const isMatchTimeLocked = diffMinutes <= 15;
  // El admin puede saltarse el bloqueo si activa la casilla en su panel
  const isReadOnly = (isMatchTimeLocked && !state.bypassLock) || !currentUser || (!currentUser.paid && !state.isAdminMode);

  // Obtener la predicción del participante activo
  let predHome = '';
  let predAway = '';
  if (currentUser && currentUser.predictions[match.id]) {
    predHome = currentUser.predictions[match.id].home !== null ? currentUser.predictions[match.id].home : '';
    predAway = currentUser.predictions[match.id].away !== null ? currentUser.predictions[match.id].away : '';
  }

  // Obtener el resultado real (si el admin lo ha ingresado)
  const realHomeScore = state.realResults[match.id]?.home;
  const realAwayScore = state.realResults[match.id]?.away;
  const hasRealResult = realHomeScore !== undefined && realHomeScore !== null;

  // Calcular puntos acumulados de este partido para el usuario
  let pointsEarned = null;
  if (hasRealResult && currentUser && currentUser.predictions[match.id]) {
    pointsEarned = calculateMatchPoints(currentUser.predictions[match.id], state.realResults[match.id]);
  }

  const dateFormatted = formatLocalDate(match.date);

  return `
    <div class="match-card" data-match-id="${match.id}">
      <div class="match-header">
        <span class="match-stage-tag">${match.type === 'group' ? `Grupo ${match.group}` : 'Eliminatoria'}</span>
        <span class="match-date">${dateFormatted}</span>
      </div>
      
      <div class="match-body">
        <!-- Local -->
        <div class="team-row home">
          <span class="team-name-code">${match.homeTeam.id}</span>
          <img src="https://flagcdn.com/w80/${match.homeTeam.flag}.png" class="team-flag" alt="${match.homeTeam.name}">
        </div>

        <!-- Marcadores -->
        <div class="score-inputs">
          <input type="number" min="0" max="99" 
            class="score-input prediction-home" 
            placeholder="-" 
            value="${predHome}"
            ${isReadOnly ? 'disabled' : ''}>
          
          <span class="score-divider">:</span>
          
          <input type="number" min="0" max="99" 
            class="score-input prediction-away" 
            placeholder="-" 
            value="${predAway}"
            ${isReadOnly ? 'disabled' : ''}>
        </div>

        <!-- Visitante -->
        <div class="team-row away">
          <img src="https://flagcdn.com/w80/${match.awayTeam.flag}.png" class="team-flag" alt="${match.awayTeam.name}">
          <span class="team-name-code">${match.awayTeam.id}</span>
        </div>
      </div>

      <div class="match-footer">
        <div class="match-lock-status ${isMatchTimeLocked ? 'locked' : 'unlocked'}">
          ${isMatchTimeLocked ? '🔒 Bloqueado para apuestas' : '🔓 Edición habilitada'}
        </div>
        ${pointsEarned !== null ? `
          <span class="prediction-badge">+${pointsEarned} Pts</span>
        ` : ''}
      </div>

      <!-- Mostrar el resultado real si está disponible -->
      ${hasRealResult ? `
        <div style="background: rgba(212, 175, 55, 0.08); border-top: 1px solid rgba(212, 175, 55, 0.2); padding: 8px; margin-top: 8px; border-radius: 6px; font-size: 0.8rem; text-align: center;">
          🟢 Resultado Real: <strong class="text-gold">${realHomeScore} - ${realAwayScore}</strong>
        </div>
      ` : ''}
    </div>
  `;
}

function createGroupTableHTML(groupKey, data) {
  return `
    <div class="group-table-card">
      <div class="group-table-title">
        <span>Grupo ${groupKey}</span>
        <span style="font-size: 0.75rem; color: var(--text-secondary);">PTS | PJ | GD</span>
      </div>
      <table class="group-table">
        <thead>
          <tr>
            <th style="width: 25px;"></th>
            <th class="team-col">País</th>
            <th style="width: 35px;">PJ</th>
            <th style="width: 35px;">GD</th>
            <th style="width: 35px; color: var(--accent-gold);">PTS</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((team, idx) => `
            <tr>
              <td><span class="qualify-dot"></span></td>
              <td class="team-col">
                <img src="https://flagcdn.com/w80/${team.flag}.png" style="width: 22px; height: 16px; object-fit: cover; border-radius: 2px;" alt="${team.name}">
                <span>${team.name}</span>
              </td>
              <td>${team.pj}</td>
              <td class="${team.gd > 0 ? 'text-gold' : ''}">${team.gd > 0 ? '+' + team.gd : team.gd}</td>
              <td class="font-bold text-gold">${team.pts}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ==========================================================================
// Enlazar Eventos de Inputs de Marcadores
// ==========================================================================
function attachMatchCardInputListeners(parentContainer) {
  parentContainer.querySelectorAll('.match-card').forEach(card => {
    const matchId = card.getAttribute('data-match-id');
    const inputHome = card.querySelector('.prediction-home');
    const inputAway = card.querySelector('.prediction-away');

    const handleInputChange = () => {
      const homeVal = inputHome.value.trim();
      const awayVal = inputAway.value.trim();

      const currentUser = state.participants[state.activeParticipantIndex];
      if (!currentUser) return;

      if (homeVal !== '' && awayVal !== '') {
        currentUser.predictions[matchId] = {
          home: parseInt(homeVal),
          away: parseInt(awayVal)
        };
      } else {
        // Si borran, remover predicción
        delete currentUser.predictions[matchId];
      }
      saveState();
      
      // Si estamos en "Mis apuestas", actualizar la tabla de predicciones en tiempo real sin recargar todo el DOM del formulario
      if (activeApuestasSubtab === 'grupo') {
        const userTableData = calculateGroupTable(activeGroupFilter, currentUser.predictions);
        const tableCardContainer = parentContainer.querySelector('.group-table-card');
        if (tableCardContainer) {
          tableCardContainer.outerHTML = createGroupTableHTML(activeGroupFilter, userTableData);
        }
      }
    };

    if (inputHome && inputAway) {
      inputHome.addEventListener('change', handleInputChange);
      inputAway.addEventListener('change', handleInputChange);
    }
  });
}

// ==========================================================================
// Lógica de Posiciones de Grupos (Dinámica)
// ==========================================================================
function calculateGroupTable(groupKey, customPredictions = null) {
  const teams = window.GROUPS_DATA[groupKey];
  const allMatches = generateGroupMatches();
  const groupMatches = allMatches.filter(m => m.group === groupKey);

  // Inicializar estadísticas de los equipos del grupo
  const stats = {};
  teams.forEach(t => {
    stats[t.id] = { id: t.id, name: t.name, flag: t.flag, pts: 0, pj: 0, gf: 0, gc: 0, gd: 0, wins: 0, draws: 0, losses: 0 };
  });

  // Procesar partidos
  groupMatches.forEach(m => {
    let scoreHome = null;
    let scoreAway = null;

    if (customPredictions) {
      // Si consultamos basado en predicciones de usuario
      if (customPredictions[m.id]) {
        scoreHome = customPredictions[m.id].home;
        scoreAway = customPredictions[m.id].away;
      }
    } else {
      // De lo contrario, usar resultados reales ingresados por el administrador
      if (state.realResults[m.id]) {
        scoreHome = state.realResults[m.id].home;
        scoreAway = state.realResults[m.id].away;
      }
    }

    if (scoreHome !== null && scoreAway !== null) {
      // Sumar partidos jugados
      stats[m.homeTeam.id].pj++;
      stats[m.awayTeam.id].pj++;

      // Sumar goles a favor y en contra
      stats[m.homeTeam.id].gf += scoreHome;
      stats[m.homeTeam.id].gc += scoreAway;
      stats[m.awayTeam.id].gf += scoreAway;
      stats[m.awayTeam.id].gc += scoreHome;

      // Calcular puntos, victorias, derrotas y empates
      if (scoreHome > scoreAway) {
        stats[m.homeTeam.id].pts += 3;
        stats[m.homeTeam.id].wins++;
        stats[m.awayTeam.id].losses++;
      } else if (scoreHome < scoreAway) {
        stats[m.awayTeam.id].pts += 3;
        stats[m.awayTeam.id].wins++;
        stats[m.homeTeam.id].losses++;
      } else {
        stats[m.homeTeam.id].pts += 1;
        stats[m.awayTeam.id].pts += 1;
        stats[m.homeTeam.id].draws++;
        stats[m.awayTeam.id].draws++;
      }
    }
  });

  // Calcular diferencia de goles
  const list = Object.values(stats);
  list.forEach(t => {
    t.gd = t.gf - t.gc;
  });

  // Ordenar según criterios FIFA: Puntos, Diferencia de Goles, Goles a Favor, Alfabético
  return list.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.name.localeCompare(b.name);
  });
}

// ==========================================================================
// Cálculo de Puntuaciones
// ==========================================================================
function calculateMatchPoints(prediction, real) {
  if (!prediction || real === undefined || real === null) return 0;
  
  const predHome = prediction.home;
  const predAway = prediction.away;
  const realHome = real.home;
  const realAway = real.away;

  if (predHome === null || predAway === null || realHome === null || realAway === null) return 0;

  // Acierto marcador exacto = 15 pts
  if (predHome === realHome && predAway === realAway) {
    return 15;
  }

  // Acierto ganador / empate = 5 pts
  const predSign = Math.sign(predHome - predAway);
  const realSign = Math.sign(realHome - realAway);
  if (predSign === realSign) {
    return 5;
  }

  return 0;
}

function calculateParticipantTotalPoints(participant) {
  let totalPoints = 0;
  const allMatches = generateGroupMatches();

  // 1. Puntos por Partidos de Fase de Grupos
  allMatches.forEach(m => {
    const real = state.realResults[m.id];
    if (real && participant.predictions[m.id]) {
      totalPoints += calculateMatchPoints(participant.predictions[m.id], real);
    }
  });

  // 2. Puntos por Clasificados y Orden de Grupos
  Object.keys(window.GROUPS_DATA).forEach(gKey => {
    const realTable = calculateGroupTable(gKey); // Real
    const predTable = calculateGroupTable(gKey, participant.predictions); // Predicha

    if (realTable[0].pj > 0) { // Validar si el grupo ha tenido juego real
      const real1st = realTable[0].id;
      const real2nd = realTable[1].id;

      const pred1st = predTable[0]?.id;
      const pred2nd = predTable[1]?.id;

      // Acertar orden exacto del grupo: +25 pts
      if (real1st === pred1st && real2nd === pred2nd) {
        totalPoints += 25;
      } else {
        // De lo contrario, dar +10 por cada clasificado correcto
        if (pred1st === real1st || pred1st === real2nd) totalPoints += 10;
        if (pred2nd === real1st || pred2nd === real2nd) totalPoints += 10;
      }
    }
  });

  // 3. Puntos por Fase Eliminatoria y Podios Especiales (Tercero, Segundo, Campeón)
  const knockoutList = Object.keys(window.KNOCKOUT_STAGES);
  knockoutList.forEach(stageKey => {
    const matches = window.KNOCKOUT_STAGES[stageKey];
    matches.forEach(m => {
      // Puntos de predicción del partido de eliminación
      const realScore = state.realResults[m.id];
      const predScore = participant.predictions[m.id];
      if (realScore && predScore) {
        totalPoints += calculateMatchPoints(predScore, realScore);
      }

      // Premios de podio en la Gran Final y Tercer Puesto
      if (stageKey === 'final' && state.realResults[m.id]) {
        const realWinner = state.realResults[m.id].home > state.realResults[m.id].away ? m.homeTeam?.id : m.awayTeam?.id;
        const predWinner = participant.knockoutWinners[m.id]; // Almacenado como id de equipo campeón elegido

        if (realWinner && predWinner === realWinner) {
          totalPoints += 50; // Acertar Campeón
        }

        // Subcampeón
        const realSecond = state.realResults[m.id].home > state.realResults[m.id].away ? m.awayTeam?.id : m.homeTeam?.id;
        // El subcampeón es el que perdió en la final (el opuesto al ganador elegido por el usuario)
        const predSecond = predWinner === m.homeTeam?.id ? m.awayTeam?.id : m.homeTeam?.id;
        if (realSecond && predSecond === realSecond) {
          totalPoints += 30; // Acertar 2do
        }
      }

      if (stageKey === 'thirdPlace' && state.realResults[m.id]) {
        const realThird = state.realResults[m.id].home > state.realResults[m.id].away ? m.homeTeam?.id : m.awayTeam?.id;
        const predThird = participant.knockoutWinners[m.id];
        if (realThird && predThird === realThird) {
          totalPoints += 20; // Acertar 3er
        }
      }
    });
  });

  return totalPoints;
}

// ==========================================================================
// Lógica de Pestaña: TABLA DE PUNTAJES (LEADERBOARD)
// ==========================================================================
function renderLeaderboard() {
  const container = document.getElementById('tabla-puntajes');
  if (!container) return;

  // Calcular puntos acumulados de cada participante
  const leaderboardData = state.participants.map(p => {
    return {
      name: p.name,
      paid: p.paid,
      points: calculateParticipantTotalPoints(p)
    };
  });

  // Ordenar de mayor a menor puntaje
  leaderboardData.sort((a, b) => b.points - a.points);

  const rowsHTML = leaderboardData.map((p, idx) => {
    let rankBadge = '';
    if (idx === 0) rankBadge = '<span class="rank-badge rank-1">1</span>';
    else if (idx === 1) rankBadge = '<span class="rank-badge rank-2">2</span>';
    else if (idx === 2) rankBadge = '<span class="rank-badge rank-3">3</span>';
    else rankBadge = `${idx + 1}`;

    return `
      <tr>
        <td class="rank-col">${rankBadge}</td>
        <td class="name-col">
          ${p.name}
          ${p.paid ? '' : '<span class="status-badge status-pending" style="font-size: 0.65rem; padding: 2px 6px; margin-left: 8px;">Debe inscripción</span>'}
        </td>
        <td class="points-col">${p.points} Pts</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <h2 class="section-title">
      <span class="section-title-icon">🏆</span> Tabla de Puntajes
    </h2>
    <p style="color: var(--text-secondary); margin-bottom: 24px;">
      Clasificación general en tiempo real de todos los amigos del parche Sauce Boyz.
    </p>

    <div class="leaderboard-card">
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th class="rank-col" style="text-align: center;">Pos</th>
            <th class="name-col">Participante</th>
            <th class="points-col">Puntaje Total</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML.length > 0 ? rowsHTML : '<tr><td colspan="3" style="text-align: center;">Crea participantes en la barra superior para iniciar.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

// ==========================================================================
// Lógica de Pestaña: PAGO
// ==========================================================================
function renderPago() {
  const container = document.getElementById('pago');
  if (!container) return;

  const currentUser = state.participants[state.activeParticipantIndex];
  if (!currentUser) return;

  container.innerHTML = `
    <h2 class="section-title">
      <span class="section-title-icon">💳</span> Registro de Inscripción
    </h2>

    <div class="pago-layout">
      <!-- Columna Izquierda: Datos del Recaudo -->
      <div class="payment-card">
        <div class="nequi-logo-badge">Nequi</div>
        <p class="payment-instructions" style="font-weight: 700; color: var(--text-primary);">Samuel Caviedes Azuero</p>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Celular: <strong class="text-gold">300 123 4567</strong></p>
        
        <div class="qr-container">
          <!-- Mock QR de Nequi generado con SVG limpio -->
          <svg class="qr-placeholder-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="white" />
            <!-- Esquinas -->
            <rect x="5" y="5" width="20" height="20" fill="black" />
            <rect x="9" y="9" width="12" height="12" fill="white" />
            <rect x="75" y="5" width="20" height="20" fill="black" />
            <rect x="79" y="9" width="12" height="12" fill="white" />
            <rect x="5" y="75" width="20" height="20" fill="black" />
            <rect x="9" y="79" width="12" height="12" fill="white" />
            <!-- Centro Simulado -->
            <rect x="15" y="35" width="5" height="15" fill="#3f1547" />
            <rect x="35" y="15" width="15" height="5" fill="#3f1547" />
            <rect x="45" y="45" width="10" height="10" fill="#3f1547" />
            <rect x="65" y="35" width="10" height="25" fill="#3f1547" />
            <rect x="35" y="65" width="30" height="10" fill="#3f1547" />
            <!-- Detalle Central Nequi -->
            <circle cx="50" cy="50" r="8" fill="#fca8ff" />
          </svg>
        </div>

        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 12px;">Escanea este código QR desde tu App de Nequi o envía la transferencia directamente al número de arriba.</p>
        <div class="payment-amount-highlight">$50.000 COP</div>
        <p class="payment-instructions">Monto mínimo obligatorio para participar de la polla e ingresar tus marcadores.</p>
      </div>

      <!-- Columna Derecha: Formulario de Registro de Comprobante -->
      <div class="payment-form-card">
        <h3 class="font-bold mb-16" style="font-family: var(--font-title); font-size: 1.3rem;">Registrar Comprobante</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 24px;">
          Sube la captura de pantalla de tu transferencia Nequi. El administrador validará el abono en el sistema y activará tu cuenta en pocos minutos.
        </p>

        <form id="paymentForm" onsubmit="handlePaymentSubmit(event)">
          <div class="form-group">
            <label class="form-label">Nombre del Participante</label>
            <input type="text" class="form-input" id="payName" value="${currentUser.name}" disabled>
          </div>

          <div class="form-group">
            <label class="form-label">Monto Transferido (COP)</label>
            <input type="number" class="form-input" id="payAmount" value="50000" min="50000" required>
          </div>

          <div class="form-group">
            <label class="form-label">Comprobante de Pago</label>
            <div class="file-upload-zone" onclick="simulateFileUpload()">
              <span class="file-upload-zone-icon">📸</span>
              <span class="font-bold" style="font-size: 0.9rem;" id="fileNameText">Haz clic para cargar captura / screenshot</span>
              <span style="font-size: 0.75rem; color: var(--text-secondary);">Formatos PNG, JPG aceptados</span>
            </div>
            <input type="hidden" id="payScreenshot" value="">
          </div>

          <button type="submit" class="btn-primary" style="margin-top: 12px;">Enviar Comprobante</button>
        </form>
      </div>
    </div>
  `;
}

window.simulateFileUpload = function() {
  // Simular la carga de un archivo comprobante de forma visual e interactiva
  const fileNameText = document.getElementById('fileNameText');
  const payScreenshotInput = document.getElementById('payScreenshot');
  if (fileNameText && payScreenshotInput) {
    fileNameText.textContent = '✅ comprobante_nequi_transaccion.png (Cargado)';
    payScreenshotInput.value = 'MOCK_SCREENSHOT_DATA_URL';
  }
};

window.handlePaymentSubmit = function(event) {
  event.preventDefault();
  const currentUser = state.participants[state.activeParticipantIndex];
  const amountVal = document.getElementById('payAmount').value;
  const screenshotVal = document.getElementById('payScreenshot').value;

  if (!screenshotVal) {
    alert('Por favor carga la captura de pantalla del comprobante de transferencia.');
    return;
  }

  // Agregar a la lista de pagos pendientes
  state.pendingPayments.push({
    name: currentUser.name,
    amount: parseInt(amountVal),
    date: new Date().toISOString()
  });

  saveState();
  alert('🏆 ¡Comprobante enviado con éxito! El administrador verificará tu pago y activará tus apuestas en la brevedad.');
  
  // Limpiar formulario y re-renderizar
  updateUserInterface();
};

// ==========================================================================
// Mapeo e Interacción del Bracket Eliminatorio (16avos a Final)
// ==========================================================================
function renderBracketUI(isLocked) {
  const currentUser = state.participants[state.activeParticipantIndex];
  
  // Para armar el bracket de 16avos de forma dinámica, primero debemos determinar 
  // quiénes clasifican en primer, segundo y tercer lugar en la predicción del participante actual.
  const groupKeys = Object.keys(window.GROUPS_DATA);
  const groupQualifiers = {}; // { 'A': { '1st': Team, '2nd': Team, '3rd': Team } }

  groupKeys.forEach(gKey => {
    const table = calculateGroupTable(gKey, currentUser.predictions);
    groupQualifiers[gKey] = {
      '1st': table[0],
      '2nd': table[1],
      '3rd': table[2]
    };
  });

  // Generamos los enfrentamientos proyectados de 16avos de final
  // Según el algoritmo simplificado diseñado en data.js
  const roundOf32Matchups = [
    { id: 'R32-1', home: groupQualifiers['A']['1st'], away: groupQualifiers['B']['2nd'] },
    { id: 'R32-2', home: groupQualifiers['C']['1st'], away: groupQualifiers['D']['2nd'] },
    { id: 'R32-3', home: groupQualifiers['E']['1st'], away: groupQualifiers['F']['2nd'] },
    { id: 'R32-4', home: groupQualifiers['G']['1st'], away: groupQualifiers['H']['2nd'] },
    { id: 'R32-5', home: groupQualifiers['I']['1st'], away: groupQualifiers['J']['2nd'] },
    { id: 'R32-6', home: groupQualifiers['K']['1st'], away: groupQualifiers['L']['2nd'] },
    { id: 'R32-7', home: groupQualifiers['B']['1st'], away: groupQualifiers['A']['2nd'] },
    { id: 'R32-8', home: groupQualifiers['D']['1st'], away: groupQualifiers['C']['2nd'] },
    { id: 'R32-9', home: groupQualifiers['F']['1st'], away: groupQualifiers['E']['2nd'] },
    { id: 'R32-10', home: groupQualifiers['H']['1st'], away: groupQualifiers['G']['2nd'] },
    { id: 'R32-11', home: groupQualifiers['J']['1st'], away: groupQualifiers['I']['2nd'] },
    { id: 'R32-12', home: groupQualifiers['L']['1st'], away: groupQualifiers['K']['2nd'] },
    { id: 'R32-13', home: groupQualifiers['A']['3rd'], away: groupQualifiers['B']['3rd'] },
    { id: 'R32-14', home: groupQualifiers['C']['3rd'], away: groupQualifiers['D']['3rd'] },
    { id: 'R32-15', home: groupQualifiers['E']['3rd'], away: groupQualifiers['F']['3rd'] },
    { id: 'R32-16', home: groupQualifiers['G']['3rd'], away: groupQualifiers['H']['3rd'] }
  ];

  // Estructura de las llaves siguientes del bracket (se calculan del ganador seleccionado en el nivel anterior)
  const knockoutState = { ...currentUser.knockoutWinners };

  // Función interna para resolver qué equipo avanza a cada nodo
  const getWinnerOfNode = (nodeId) => {
    return knockoutState[nodeId]; // Retorna el ID de la selección elegida ganadora: e.g. 'MEX' o null
  };

  const getTeamObjectById = (teamId) => {
    if (!teamId) return null;
    for (const gKey of Object.keys(window.GROUPS_DATA)) {
      const matchTeam = window.GROUPS_DATA[gKey].find(t => t.id === teamId);
      if (matchTeam) return matchTeam;
    }
    return null;
  };

  // Construir rondas subsiguientes basándose en ganadores
  const roundOf16Matchups = [
    { id: 'R16-1', home: getTeamObjectById(getWinnerOfNode('R32-1')), away: getTeamObjectById(getWinnerOfNode('R32-2')) },
    { id: 'R16-2', home: getTeamObjectById(getWinnerOfNode('R32-3')), away: getTeamObjectById(getWinnerOfNode('R32-4')) },
    { id: 'R16-3', home: getTeamObjectById(getWinnerOfNode('R32-5')), away: getTeamObjectById(getWinnerOfNode('R32-6')) },
    { id: 'R16-4', home: getTeamObjectById(getWinnerOfNode('R32-7')), away: getTeamObjectById(getWinnerOfNode('R32-8')) },
    { id: 'R16-5', home: getTeamObjectById(getWinnerOfNode('R32-9')), away: getTeamObjectById(getWinnerOfNode('R32-10')) },
    { id: 'R16-6', home: getTeamObjectById(getWinnerOfNode('R32-11')), away: getTeamObjectById(getWinnerOfNode('R32-12')) },
    { id: 'R16-7', home: getTeamObjectById(getWinnerOfNode('R32-13')), away: getTeamObjectById(getWinnerOfNode('R32-14')) },
    { id: 'R16-8', home: getTeamObjectById(getWinnerOfNode('R32-15')), away: getTeamObjectById(getWinnerOfNode('R32-16')) }
  ];

  const quarterFinalsMatchups = [
    { id: 'QF-1', home: getTeamObjectById(getWinnerOfNode('R16-1')), away: getTeamObjectById(getWinnerOfNode('R16-2')) },
    { id: 'QF-2', home: getTeamObjectById(getWinnerOfNode('R16-3')), away: getTeamObjectById(getWinnerOfNode('R16-4')) },
    { id: 'QF-3', home: getTeamObjectById(getWinnerOfNode('R16-5')), away: getTeamObjectById(getWinnerOfNode('R16-6')) },
    { id: 'QF-4', home: getTeamObjectById(getWinnerOfNode('R16-7')), away: getTeamObjectById(getWinnerOfNode('R16-8')) }
  ];

  const semiFinalsMatchups = [
    { id: 'SF-1', home: getTeamObjectById(getWinnerOfNode('QF-1')), away: getTeamObjectById(getWinnerOfNode('QF-2')) },
    { id: 'SF-2', home: getTeamObjectById(getWinnerOfNode('QF-3')), away: getTeamObjectById(getWinnerOfNode('QF-4')) }
  ];

  // Perdedores de semifinales van por el 3er puesto
  const getLoserOfNode = (nodeId, matchupArray) => {
    const winnerId = getWinnerOfNode(nodeId);
    if (!winnerId) return null;
    const matchup = matchupArray.find(m => m.id === nodeId);
    if (!matchup) return null;
    if (matchup.home && matchup.home.id === winnerId) return matchup.away;
    if (matchup.away && matchup.away.id === winnerId) return matchup.home;
    return null;
  };

  const thirdPlaceMatchup = [
    {
      id: '3RD-1',
      home: getLoserOfNode('SF-1', semiFinalsMatchups),
      away: getLoserOfNode('SF-2', semiFinalsMatchups)
    }
  ];

  const finalMatchup = [
    {
      id: 'F-1',
      home: getTeamObjectById(getWinnerOfNode('SF-1')),
      away: getTeamObjectById(getWinnerOfNode('SF-2'))
    }
  ];

  // Helper para generar el HTML de una tarjeta de partido del bracket
  const makeNodeHTML = (m, locked) => {
    const isHomeWinner = m.home && knockoutState[m.id] === m.home.id;
    const isAwayWinner = m.away && knockoutState[m.id] === m.away.id;
    
    // Obtener marcadores predichos
    const predHome = currentUser.predictions[m.id]?.home !== undefined ? currentUser.predictions[m.id]?.home : '';
    const predAway = currentUser.predictions[m.id]?.away !== undefined ? currentUser.predictions[m.id]?.away : '';

    return `
      <div class="bracket-match-node" data-node-id="${m.id}">
        <!-- Equipo Local -->
        <div class="bracket-team-slot ${isHomeWinner ? 'winner' : ''} ${!m.home ? 'placeholder' : ''}" 
          data-team-id="${m.home ? m.home.id : ''}" ${locked ? 'style="pointer-events: none;"' : ''}>
          <div class="bracket-team-info">
            ${m.home ? `
              <img src="https://flagcdn.com/w80/${m.home.flag}.png" class="bracket-flag" alt="${m.home.name}">
              <span class="bracket-team-name">${m.home.id}</span>
            ` : '<span class="bracket-team-name">Por Definir</span>'}
          </div>
          ${m.home && m.away ? `
            <input type="number" class="bracket-score-input pred-home" value="${predHome}" ${locked ? 'disabled' : ''}>
          ` : ''}
        </div>

        <!-- Equipo Visitante -->
        <div class="bracket-team-slot ${isAwayWinner ? 'winner' : ''} ${!m.away ? 'placeholder' : ''}" 
          data-team-id="${m.away ? m.away.id : ''}" ${locked ? 'style="pointer-events: none;"' : ''}>
          <div class="bracket-team-info">
            ${m.away ? `
              <img src="https://flagcdn.com/w80/${m.away.flag}.png" class="bracket-flag" alt="${m.away.name}">
              <span class="bracket-team-name">${m.away.id}</span>
            ` : '<span class="bracket-team-name">Por Definir</span>'}
          </div>
          ${m.home && m.away ? `
            <input type="number" class="bracket-score-input pred-away" value="${predAway}" ${locked ? 'disabled' : ''}>
          ` : ''}
        </div>
      </div>
    `;
  };

  return `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
      <h3 class="font-bold text-gold" style="font-family: var(--font-title); font-size: 1.15rem; margin-bottom: 8px;">🎮 Simulador Interactivo de Play-Offs</h3>
      <p style="color: var(--text-secondary); font-size: 0.85rem;">
        1. Escribe tus predicciones de marcadores.<br>
        2. **¡Toca o haz clic en la bandera de un equipo para seleccionarlo como el clasificado!** El equipo avanzado llenará automáticamente la siguiente fase en tiempo real.
      </p>
    </div>

    <div class="bracket-scroll-container">
      <div class="bracket-wrapper">
        <!-- 16avos -->
        <div class="bracket-round">
          <h4 class="bracket-round-title">16avos de Final</h4>
          ${roundOf32Matchups.map(m => makeNodeHTML(m, isLocked)).join('')}
        </div>

        <!-- Octavos -->
        <div class="bracket-round">
          <h4 class="bracket-round-title">Octavos de Final</h4>
          ${roundOf16Matchups.map(m => makeNodeHTML(m, isLocked)).join('')}
        </div>

        <!-- Cuartos -->
        <div class="bracket-round">
          <h4 class="bracket-round-title">Cuartos de Final</h4>
          ${quarterFinalsMatchups.map(m => makeNodeHTML(m, isLocked)).join('')}
        </div>

        <!-- Semifinales -->
        <div class="bracket-round">
          <h4 class="bracket-round-title">Semifinales</h4>
          ${semiFinalsMatchups.map(m => makeNodeHTML(m, isLocked)).join('')}
        </div>

        <!-- Tercer puesto y Final -->
        <div class="bracket-round" style="justify-content: center; gap: 48px;">
          <div>
            <h4 class="bracket-round-title">Tercer Puesto</h4>
            ${thirdPlaceMatchup.map(m => makeNodeHTML(m, isLocked)).join('')}
          </div>
          <div>
            <h4 class="bracket-round-title" style="color: var(--accent-gold);">Gran Final 🏆</h4>
            ${finalMatchup.map(m => makeNodeHTML(m, isLocked)).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachBracketClickListeners() {
  document.querySelectorAll('.bracket-team-slot').forEach(slot => {
    slot.addEventListener('click', (e) => {
      // Ignorar clics en inputs de goles para que no actúen como selector de ganador
      if (e.target.tagName === 'INPUT') return;

      const teamId = slot.getAttribute('data-team-id');
      if (!teamId) return; // Placeholder sin definir

      const nodeContainer = slot.closest('.bracket-match-node');
      const nodeId = nodeContainer.getAttribute('data-node-id');

      const currentUser = state.participants[state.activeParticipantIndex];
      if (!currentUser) return;

      // Marcar al seleccionado como ganador en el almacenamiento de play-offs
      currentUser.knockoutWinners[nodeId] = teamId;
      saveState();

      // Recalcular y re-renderizar pestaña de apuestas
      renderMisApuestas();
    });
  });

  // Listener para capturar marcadores en inputs de llaves eliminatorias
  document.querySelectorAll('.bracket-match-node').forEach(node => {
    const nodeId = node.getAttribute('data-node-id');
    const inputHome = node.querySelector('.pred-home');
    const inputAway = node.querySelector('.pred-away');

    const handleKnockoutScore = () => {
      if (!inputHome || !inputAway) return;
      const homeVal = inputHome.value.trim();
      const awayVal = inputAway.value.trim();

      const currentUser = state.participants[state.activeParticipantIndex];
      if (!currentUser) return;

      if (homeVal !== '' && awayVal !== '') {
        currentUser.predictions[nodeId] = {
          home: parseInt(homeVal),
          away: parseInt(awayVal)
        };
      } else {
        delete currentUser.predictions[nodeId];
      }
      saveState();
    };

    if (inputHome && inputAway) {
      inputHome.addEventListener('change', handleKnockoutScore);
      inputAway.addEventListener('change', handleKnockoutScore);
    }
  });
}

// ==========================================================================
// MODO ADMINISTRADOR: PANEL DE CONTROL
// ==========================================================================
function renderAdminPanel() {
  const container = document.getElementById('adminPanelContainer');
  if (!container) return;

  if (!state.isAdminMode) {
    container.innerHTML = '';
    return;
  }

  // Generar lista de pagos pendientes para aprobar
  let paymentsHTML = '';
  if (state.pendingPayments.length > 0) {
    paymentsHTML = state.pendingPayments.map((p, idx) => `
      <div class="admin-payment-item">
        <span class="admin-payment-item-name">${p.name} ($50k)</span>
        <button class="btn-approve" onclick="approvePayment(${idx})">✓ Aprobar</button>
      </div>
    `).join('');
  } else {
    paymentsHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 12px 0;">No hay pagos en cola.</div>`;
  }

  // Preparar dropdowns de todos los partidos para ingresar resultados reales
  const matches = generateGroupMatches();
  let matchesOptions = matches.map(m => {
    const hasReal = state.realResults[m.id] !== undefined;
    return `
      <option value="${m.id}">
        [${m.group ? `Grupo ${m.group}` : 'Elim'}] ${m.homeTeam.id} vs ${m.awayTeam.id} ${hasReal ? '✓' : ''}
      </option>
    `;
  }).join('');

  container.innerHTML = `
    <div class="admin-panel">
      <div class="admin-panel-title">
        <span>⚙️ Panel de Control - Administración</span>
      </div>

      <div class="admin-grid">
        <!-- Control 1: Validación de Pagos -->
        <div class="admin-control-box">
          <div class="admin-control-title">Aprobar Pagos Nequi</div>
          <div class="admin-payments-list">
            ${paymentsHTML}
          </div>
        </div>

        <!-- Control 2: Reloj del Mundial -->
        <div class="admin-control-box">
          <div class="admin-control-title">Ajustar Hora Virtual del Sistema</div>
          <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px;">Permite simular el bloqueo de partidos 15 min antes.</p>
          <input type="datetime-local" class="form-input" id="adminSysTime" value="${state.systemTime.substring(0, 16)}" style="padding: 6px 10px; font-size: 0.85rem;">
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <button class="btn-secondary" style="flex: 1; padding: 6px;" onclick="setAdminTime('2026-06-11T12:00:00-05:00')">Mundial Día 1</button>
            <button class="btn-secondary" style="flex: 1; padding: 6px;" onclick="setAdminTime('2026-06-25T15:00:00-05:00')">Mundial Día 15</button>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px;">
            <input type="checkbox" id="bypassLockCheck" ${state.bypassLock ? 'checked' : ''} onchange="toggleBypassLock(this.checked)">
            <label for="bypassLockCheck" style="font-size: 0.8rem; cursor: pointer;">Habilitar edición Admin (Bypass bloqueo)</label>
          </div>
        </div>

        <!-- Control 3: Marcadores Reales -->
        <div class="admin-control-box">
          <div class="admin-control-title">Cargar Marcadores Reales</div>
          <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px;">Suma puntos y actualiza la tabla de posiciones general.</p>
          <select id="adminMatchSelect" class="user-select" style="min-width: 100%; font-size: 0.85rem; padding: 6px 10px;" onchange="handleAdminMatchSelect(this.value)">
            <option value="">Selecciona partido...</option>
            ${matchesOptions}
          </select>
          <div id="adminMatchScoreContainer" style="display: flex; gap: 8px; justify-content: center; align-items: center; margin-top: 8px;">
            <!-- Dinámico -->
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid rgba(239, 68, 68, 0.1); padding-top: 12px; margin-top: 4px;">
        <button class="btn-secondary" style="background: rgba(239,68,68,0.1); color: var(--accent-red); border-color: rgba(239,68,68,0.2);" onclick="resetEverything()">⚠️ Resetear Todo (Datos de Fábrica)</button>
        <button class="btn-secondary" onclick="exportData()">📥 Exportar Datos (JSON)</button>
        <button class="btn-secondary" onclick="triggerImport()">📤 Importar Datos (JSON)</button>
        <input type="file" id="importFileInput" style="display: none;" onchange="importData(event)">
      </div>
    </div>
  `;

  // Listener para cambiar fecha virtual
  const adminSysTime = document.getElementById('adminSysTime');
  if (adminSysTime) {
    adminSysTime.addEventListener('change', (e) => {
      state.systemTime = e.target.value + ':00-05:00';
      saveState();
      updateUserInterface();
    });
  }
}

window.approvePayment = function(index) {
  const pName = state.pendingPayments[index].name;
  
  // Buscar al participante y activarle el pago
  const user = state.participants.find(p => p.name === pName);
  if (user) {
    user.paid = true;
  }

  // Eliminar de pendientes
  state.pendingPayments.splice(index, 1);
  saveState();
  updateUserInterface();
};

window.setAdminTime = function(timeStr) {
  state.systemTime = timeStr;
  saveState();
  updateUserInterface();
};

window.toggleBypassLock = function(val) {
  state.bypassLock = val;
  saveState();
  updateUserInterface();
};

window.handleAdminMatchSelect = function(matchId) {
  const container = document.getElementById('adminMatchScoreContainer');
  if (!container) return;

  if (!matchId) {
    container.innerHTML = '';
    return;
  }

  const allMatches = generateGroupMatches();
  const match = allMatches.find(m => m.id === matchId);
  if (!match) return;

  const currentRealHome = state.realResults[matchId]?.home !== undefined ? state.realResults[matchId].home : '';
  const currentRealAway = state.realResults[matchId]?.away !== undefined ? state.realResults[matchId].away : '';

  container.innerHTML = `
    <input type="number" class="score-input" id="adminScoreHome" value="${currentRealHome}" style="width: 40px; height: 40px; font-size: 1.1rem;" placeholder="L">
    <span class="score-divider">:</span>
    <input type="number" class="score-input" id="adminScoreAway" value="${currentRealAway}" style="width: 40px; height: 40px; font-size: 1.1rem;" placeholder="V">
    <button class="btn-approve" style="padding: 8px 12px; font-size: 0.85rem;" onclick="saveAdminMatchScore('${matchId}')">Guardar</button>
  `;
};

window.saveAdminMatchScore = function(matchId) {
  const scoreHomeInput = document.getElementById('adminScoreHome');
  const scoreAwayInput = document.getElementById('adminScoreAway');

  if (!scoreHomeInput || !scoreAwayInput) return;

  const homeVal = scoreHomeInput.value.trim();
  const awayVal = scoreAwayInput.value.trim();

  if (homeVal !== '' && awayVal !== '') {
    state.realResults[matchId] = {
      home: parseInt(homeVal),
      away: parseInt(awayVal)
    };
  } else {
    delete state.realResults[matchId];
  }

  saveState();
  alert('🔥 Resultado real registrado con éxito. Se han recalculado las posiciones de grupos y la tabla general de amigos.');
  updateUserInterface();
};

// ==========================================================================
// Exportar e Importar Datos (JSON)
// ==========================================================================
window.exportData = function() {
  const dataStr = JSON.stringify(state, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `sauce_boyz_worldcup_polla_${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

window.triggerImport = function() {
  const fileInput = document.getElementById('importFileInput');
  if (fileInput) {
    fileInput.click();
  }
};

window.importData = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedState = JSON.parse(e.target.result);
      if (importedState.participants && importedState.realResults) {
        state = importedState;
        saveState();
        alert('🎉 ¡Datos de la Polla importados con éxito! Todo el parche de amigos ha sido actualizado.');
        updateUserInterface();
      } else {
        alert('El archivo cargado no tiene la estructura correcta de Sauce Boyz-World Cup.');
      }
    } catch (err) {
      alert('Error leyendo el archivo JSON cargado.');
    }
  };
  reader.readAsText(file);
};

window.resetEverything = function() {
  if (confirm('⚠️ ¿Estás COMPLETAMENTE seguro de resetear la base de datos? Se borrarán todos los participantes, apuestas y comprobantes registrados.')) {
    localStorage.removeItem('sauce_boyz_wc_state');
    location.reload();
  }
};

// ==========================================================================
// Formateadores de fecha y Helpers utilitarios
// ==========================================================================
function formatLocalDate(isoString) {
  const date = new Date(isoString);
  const options = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' };
  
  // E.g. "11 Jun, 13:00"
  let formatted = date.toLocaleDateString('es-CO', options);
  // Reemplazar punto de mes para limpieza visual
  return formatted.replace('.', '');
}

// Iniciar aplicación al cargar
window.addEventListener('DOMContentLoaded', initApp);
