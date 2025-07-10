// leaderboard.js
// No import needed since we're using the CDN version

// Initialize supabase after CDN load

console.log('Initial window.supabase:', window.supabase);

// Initialize supabase using the CDN-loaded library
const supabaseUrl = 'https://icoqkyuwlhjnecziqgwj.supabase.co'; // Replace with your URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljb3FreXV3bGhqbmVjemlxZ3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4ODg2NjksImV4cCI6MjA2NzQ2NDY2OX0.ywAl3gZ56ddAejRBreKn_r_LOwD7Vf6wSk1ndVoZS24'; // Replace with your Anon Key
// leaderboard.js
window.supabase = window.supabase || {};
if (typeof window.supabase.createClient === 'function') {
  window.supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.error('Supabase createClient not found. Available properties:', Object.keys(window.supabase));
}
console.log('Initialized window.supabase:', window.supabase);

const settingsMenu = document.getElementById('settingsMenu');
const leaderboardButton = document.getElementById('leaderboardButton');
const leaderboardContent = document.getElementById('leaderboardContent');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const leaderboardBody = document.getElementById('leaderboardBody');

leaderboardButton.addEventListener('click', () => {
  leaderboardContent.classList.add('active');
  updateLeaderboard();
});

closeLeaderboardBtn.addEventListener('click', () => {
  leaderboardContent.classList.remove('active');
});

async function updateLeaderboard() {
  const playerId = localStorage.getItem('playerId');
  if (!playerId) {
    console.error('No playerId found in local storage');
    return;
  }

  try {
    console.log('Fetching rank_cache data...');
    const { data, error } = await window.supabase
      .from('rank_cache')
      .select('player_id, score, rank')
      .order('rank', { ascending: true });
    if (error) {
      console.error('Error fetching rank_cache:', error.message);
      return;
    }
    console.log('Raw rank_cache data:', data);

    // Map player_id to name and team from leaderboard
    const leaderboardData = await Promise.all(data.map(async (item) => {
      const { data: playerData, error: playerError } = await window.supabase
        .from('leaderboard')
        .select('name, team')
        .eq('player_id', item.player_id)
        .single();
      if (playerError) {
        console.warn(`No leaderboard data for ${item.player_id}:`, playerError.message);
        return { ...item, name: 'Unknown', team: 'None' };
      }
      console.log(`Mapped data for ${item.player_id}:`, { ...item, name: playerData.name, team: playerData.team || 'None' });
      return { ...item, name: playerData.name, team: playerData.team || 'None' };
    }));
    console.log('Final leaderboardData:', leaderboardData);

    // Find player’s rank to center the view
    const playerRankData = leaderboardData.find(item => item.player_id === playerId);
    const playerRank = playerRankData ? playerRankData.rank : 1;
    const startRank = Math.max(1, playerRank - 5); // Reduced range
    const endRank = playerRank + 5; // Reduced range

    // Filter and display
    const displayData = leaderboardData.filter(item => item.rank >= startRank && item.rank <= endRank);
    console.log('Display data:', displayData);
    leaderboardBody.innerHTML = '';
    if (displayData.length === 0) {
      leaderboardBody.innerHTML = '<tr><td colspan="4">No data available</td></tr>';
      console.warn('No data to display within range');
      return;
    }
    displayData.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.rank}</td>
        <td>${item.name}</td>
        <td>${item.score.toFixed(2)}</td>
        <td>${item.team}</td>
      `;
      leaderboardBody.appendChild(row);
    });
  } catch (error) {
    console.error('Unexpected error in updateLeaderboard:', error.message);
  }
}

window.updateFirebaseScore = async function(name, score, team) {
  let playerId = localStorage.getItem('playerId');
  if (!playerId) {
    playerId = generateUniqueId(name);
    localStorage.setItem('playerId', playerId);
  }

  const { data: existingData, error: existingError } = await window.supabase
    .from('leaderboard')
    .select('score')
    .eq('player_id', playerId)
    .single();

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('Error checking existing score:', existingError);
    return;
  }

  if (!existingData || score < existingData.score) {
    const { error } = await window.supabase.from('leaderboard').upsert({
      player_id: playerId,
      name: name,
      score: score,
      team: team,
      timestamp: new Date()
    }, { onConflict: 'player_id' });
    if (error) {
      console.error('Error updating score:', error);
    } else {
      console.log('Score updated for playerId:', playerId);
    }
  } else {
    console.log('New score not better, keeping existing:', existingData.score);
  }
};

function generateUniqueId(name) {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 5);
  return `${name.toLowerCase().replace(/\s/g, '')}_${timestamp}_${randomStr}`;
}

window.addEventListener('storage', (event) => {
  if (event.key === 'bestReactionTime') {
    const bestTime = parseFloat(localStorage.getItem('bestReactionTime'));
    if (!isNaN(bestTime)) {
      const name = localStorage.getItem('playerName') || 'Player';
      const team = localStorage.getItem('playerTeam') || '';
      window.updateFirebaseScore(name, bestTime, team);
    }
  }
});

const initialBestTime = parseFloat(localStorage.getItem('bestReactionTime'));
if (initialBestTime && !isNaN(initialBestTime)) {
  const name = localStorage.getItem('playerName') || 'Player';
  const team = localStorage.getItem('playerTeam') || '';
  window.updateFirebaseScore(name, initialBestTime, team);
}