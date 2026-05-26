// Datos oficiales del Mundial FIFA 2026 y helpers para la generación de partidos
const GROUPS_DATA = {
  A: [
    { id: 'MEX', name: 'México', flag: 'mx' },
    { id: 'RSA', name: 'Sudáfrica', flag: 'za' },
    { id: 'KOR', name: 'Corea del Sur', flag: 'kr' },
    { id: 'CZE', name: 'Rep. Checa', flag: 'cz' }
  ],
  B: [
    { id: 'CAN', name: 'Canadá', flag: 'ca' },
    { id: 'BIH', name: 'Bosnia y H.', flag: 'ba' },
    { id: 'QAT', name: 'Catar', flag: 'qa' },
    { id: 'SUI', name: 'Suiza', flag: 'ch' }
  ],
  C: [
    { id: 'BRA', name: 'Brasil', flag: 'br' },
    { id: 'MAR', name: 'Marruecos', flag: 'ma' },
    { id: 'HAI', name: 'Haití', flag: 'ht' },
    { id: 'SCO', name: 'Escocia', flag: 'gb-sct' }
  ],
  D: [
    { id: 'USA', name: 'Estados Unidos', flag: 'us' },
    { id: 'PAR', name: 'Paraguay', flag: 'py' },
    { id: 'AUS', name: 'Australia', flag: 'au' },
    { id: 'TUR', name: 'Turquía', flag: 'tr' }
  ],
  E: [
    { id: 'GER', name: 'Alemania', flag: 'de' },
    { id: 'CUW', name: 'Curazao', flag: 'cw' },
    { id: 'CIV', name: 'Costa de Marfil', flag: 'ci' },
    { id: 'ECU', name: 'Ecuador', flag: 'ec' }
  ],
  F: [
    { id: 'NED', name: 'Países Bajos', flag: 'nl' },
    { id: 'JPN', name: 'Japón', flag: 'jp' },
    { id: 'SWE', name: 'Suecia', flag: 'se' },
    { id: 'TUN', name: 'Túnez', flag: 'tn' }
  ],
  G: [
    { id: 'BEL', name: 'Bélgica', flag: 'be' },
    { id: 'EGY', name: 'Egipto', flag: 'eg' },
    { id: 'IRN', name: 'Irán', flag: 'ir' },
    { id: 'NZL', name: 'Nueva Zelanda', flag: 'nz' }
  ],
  H: [
    { id: 'ESP', name: 'España', flag: 'es' },
    { id: 'CPV', name: 'Cabo Verde', flag: 'cv' },
    { id: 'KSA', name: 'Arabia Saudita', flag: 'sa' },
    { id: 'URU', name: 'Uruguay', flag: 'uy' }
  ],
  I: [
    { id: 'FRA', name: 'Francia', flag: 'fr' },
    { id: 'SEN', name: 'Senegal', flag: 'sn' },
    { id: 'IRQ', name: 'Irak', flag: 'iq' },
    { id: 'NOR', name: 'Noruega', flag: 'no' }
  ],
  J: [
    { id: 'ARG', name: 'Argentina', flag: 'ar' },
    { id: 'ALG', name: 'Argelia', flag: 'dz' },
    { id: 'AUT', name: 'Austria', flag: 'at' },
    { id: 'JOR', name: 'Jordania', flag: 'jo' }
  ],
  K: [
    { id: 'POR', name: 'Portugal', flag: 'pt' },
    { id: 'COD', name: 'R.D. Congo', flag: 'cd' },
    { id: 'UZB', name: 'Uzbekistán', flag: 'uz' },
    { id: 'COL', name: 'Colombia', flag: 'co' }
  ],
  L: [
    { id: 'ENG', name: 'Inglaterra', flag: 'gb-eng' },
    { id: 'CRO', name: 'Croacia', flag: 'hr' },
    { id: 'GHA', name: 'Ghana', flag: 'gh' },
    { id: 'PAN', name: 'Panamá', flag: 'pa' }
  ]
};

// Generar los partidos de la fase de grupos para todos los grupos de forma ordenada
function generateGroupMatches() {
  const matches = [];
  let matchId = 1;
  const groupsKeys = Object.keys(GROUPS_DATA);

  groupsKeys.forEach((groupKey, groupIdx) => {
    const teams = GROUPS_DATA[groupKey];
    
    // Programación estándar de fase de grupos (todos contra todos)
    // 6 partidos por grupo
    const scheduleTemplate = [
      { homeIdx: 0, awayIdx: 1, dayOffset: 0, hour: '13:00' },
      { homeIdx: 2, awayIdx: 3, dayOffset: 0, hour: '17:00' },
      { homeIdx: 0, awayIdx: 2, dayOffset: 4, hour: '14:00' },
      { homeIdx: 3, awayIdx: 1, dayOffset: 4, hour: '19:00' },
      { homeIdx: 3, awayIdx: 0, dayOffset: 9, hour: '15:00' },
      { homeIdx: 1, awayIdx: 2, dayOffset: 9, hour: '15:00' }
    ];

    scheduleTemplate.forEach((matchInfo, mIdx) => {
      // Fecha base del mundial: 11 de Junio, 2026
      const baseDate = new Date('2026-06-11T00:00:00-05:00');
      // Cada grupo inicia en días escalonados para que haya partidos del día variados
      const startDayOffset = Math.floor(groupIdx / 2);
      baseDate.setDate(baseDate.getDate() + startDayOffset + matchInfo.dayOffset);
      
      const dateStr = baseDate.toISOString().split('T')[0];
      const matchDateStr = `${dateStr}T${matchInfo.hour}:00-05:00`;

      matches.push({
        id: `G-${groupKey}-${mIdx + 1}`,
        type: 'group',
        group: groupKey,
        homeTeam: teams[matchInfo.homeIdx],
        awayTeam: teams[matchInfo.awayIdx],
        date: matchDateStr,
        // Almacenará los goles reales cuando el administrador los registre
        homeScore: null,
        awayScore: null
      });
    });
  });

  // Ordenar por fecha y hora para una visualización natural
  return matches.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Mapear los cruces de la fase eliminatoria (simplificada para polla de amigos pero completamente mapeada)
// En el mundial real de 48 equipos, clasifican 32. 
// Para el bracket visual interactivo de los amigos, mapearemos desde 16avos de final.
// Definiremos las llaves de eliminación directa.
const KNOCKOUT_STAGES = {
  roundOf32: [
    { id: 'R32-1', name: 'Dieciseisavos 1', nextMatchId: 'R16-1', slot: 'home', date: '2026-06-27T14:00:00-05:00' },
    { id: 'R32-2', name: 'Dieciseisavos 2', nextMatchId: 'R16-1', slot: 'away', date: '2026-06-27T18:00:00-05:00' },
    { id: 'R32-3', name: 'Dieciseisavos 3', nextMatchId: 'R16-2', slot: 'home', date: '2026-06-28T14:00:00-05:00' },
    { id: 'R32-4', name: 'Dieciseisavos 4', nextMatchId: 'R16-2', slot: 'away', date: '2026-06-28T18:00:00-05:00' },
    { id: 'R32-5', name: 'Dieciseisavos 5', nextMatchId: 'R16-3', slot: 'home', date: '2026-06-29T14:00:00-05:00' },
    { id: 'R32-6', name: 'Dieciseisavos 6', nextMatchId: 'R16-3', slot: 'away', date: '2026-06-29T18:00:00-05:00' },
    { id: 'R32-7', name: 'Dieciseisavos 7', nextMatchId: 'R16-4', slot: 'home', date: '2026-06-30T14:00:00-05:00' },
    { id: 'R32-8', name: 'Dieciseisavos 8', nextMatchId: 'R16-4', slot: 'away', date: '2026-06-30T18:00:00-05:00' },
    { id: 'R32-9', name: 'Dieciseisavos 9', nextMatchId: 'R16-5', slot: 'home', date: '2026-07-01T14:00:00-05:00' },
    { id: 'R32-10', name: 'Dieciseisavos 10', nextMatchId: 'R16-5', slot: 'away', date: '2026-07-01T18:00:00-05:00' },
    { id: 'R32-11', name: 'Dieciseisavos 11', nextMatchId: 'R16-6', slot: 'home', date: '2026-07-02T14:00:00-05:00' },
    { id: 'R32-12', name: 'Dieciseisavos 12', nextMatchId: 'R16-6', slot: 'away', date: '2026-07-02T18:00:00-05:00' },
    { id: 'R32-13', name: 'Dieciseisavos 13', nextMatchId: 'R16-7', slot: 'home', date: '2026-07-03T14:00:00-05:00' },
    { id: 'R32-14', name: 'Dieciseisavos 14', nextMatchId: 'R16-7', slot: 'away', date: '2026-07-03T18:00:00-05:00' },
    { id: 'R32-15', name: 'Dieciseisavos 15', nextMatchId: 'R16-8', slot: 'home', date: '2026-07-04T14:00:00-05:00' },
    { id: 'R32-16', name: 'Dieciseisavos 16', nextMatchId: 'R16-8', slot: 'away', date: '2026-07-04T18:00:00-05:00' }
  ],
  roundOf16: [
    { id: 'R16-1', name: 'Octavos 1', nextMatchId: 'QF-1', slot: 'home', date: '2026-07-05T15:00:00-05:00' },
    { id: 'R16-2', name: 'Octavos 2', nextMatchId: 'QF-1', slot: 'away', date: '2026-07-05T19:00:00-05:00' },
    { id: 'R16-3', name: 'Octavos 3', nextMatchId: 'QF-2', slot: 'home', date: '2026-07-06T15:00:00-05:00' },
    { id: 'R16-4', name: 'Octavos 4', nextMatchId: 'QF-2', slot: 'away', date: '2026-07-06T19:00:00-05:00' },
    { id: 'R16-5', name: 'Octavos 5', nextMatchId: 'QF-3', slot: 'home', date: '2026-07-07T15:00:00-05:00' },
    { id: 'R16-6', name: 'Octavos 6', nextMatchId: 'QF-3', slot: 'away', date: '2026-07-07T19:00:00-05:00' },
    { id: 'R16-7', name: 'Octavos 7', nextMatchId: 'QF-4', slot: 'home', date: '2026-07-08T15:00:00-05:00' },
    { id: 'R16-8', name: 'Octavos 8', nextMatchId: 'QF-4', slot: 'away', date: '2026-07-08T19:00:00-05:00' }
  ],
  quarterFinals: [
    { id: 'QF-1', name: 'Cuartos 1', nextMatchId: 'SF-1', slot: 'home', date: '2026-07-10T16:00:00-05:00' },
    { id: 'QF-2', name: 'Cuartos 2', nextMatchId: 'SF-1', slot: 'away', date: '2026-07-10T20:00:00-05:00' },
    { id: 'QF-3', name: 'Cuartos 3', nextMatchId: 'SF-2', slot: 'home', date: '2026-07-11T16:00:00-05:00' },
    { id: 'QF-4', name: 'Cuartos 4', nextMatchId: 'SF-2', slot: 'away', date: '2026-07-11T20:00:00-05:00' }
  ],
  semiFinals: [
    { id: 'SF-1', name: 'Semifinal 1', nextMatchId: 'F-1', slot: 'home', date: '2026-07-14T19:00:00-05:00' },
    { id: 'SF-2', name: 'Semifinal 2', nextMatchId: 'F-1', slot: 'away', date: '2026-07-15T19:00:00-05:00' }
  ],
  thirdPlace: [
    { id: '3RD-1', name: 'Tercer Puesto', date: '2026-07-18T15:00:00-05:00' }
  ],
  final: [
    { id: 'F-1', name: 'Gran Final', date: '2026-07-19T16:00:00-05:00' }
  ]
};

// Exportar los datos globalmente adjuntándolos al objeto window para acceso nativo de Vanilla JS
window.GROUPS_DATA = GROUPS_DATA;
window.generateGroupMatches = generateGroupMatches;
window.KNOCKOUT_STAGES = KNOCKOUT_STAGES;
