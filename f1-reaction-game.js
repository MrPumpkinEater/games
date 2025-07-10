const columns = Array.from(document.querySelectorAll('.column'));
const status = document.getElementById('status');
const reactionTimeDisplay = document.getElementById('reactionTime');
const bestTimeDisplay = document.getElementById('bestTimeDisplay');
const instructions = document.getElementById('instructions');
const startButton = document.getElementById('startButton');
const roomButtons = document.getElementById('roomOptions');
const beepSound = document.getElementById('beepSound');
const sharePreview = document.getElementById('sharePreview');
const shareImage = document.getElementById('shareImage');
const settingsButton = document.getElementById('settingsButton');
const settingsContent = document.getElementById('settingsContent');
const displayName = document.getElementById('displayName');
const displayTeam = document.getElementById('displayTeam');
const displayBestScore = document.getElementById('displayBestScore');
const editNameBtn = document.getElementById('editNameBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

let lightOffTime = 0;
let gameStarted = false;
let falseStart = false;
let inputProcessed = false;
let currentRunId = 0;
let myScores = [];
let roomPlaying = false;
let playerName = localStorage.getItem('playerName') || 'Player';
let playerTeam = localStorage.getItem('playerTeam') || '';

// Inject Round Selector
if (!document.getElementById('roundSelector')) {
  const selector = document.createElement('select');
  selector.id = 'roundSelector';
  selector.className = 'btn';
  [3, 5, 7, 10].forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = `${n} Rounds`;
    selector.appendChild(opt);
  });
  const label = document.createElement('label');
  label.textContent = "Select Rounds:";
  label.style.marginTop = '10px';
  label.htmlFor = 'roundSelector';
  label.style.color = 'white';
  label.style.textShadow = '1px 1px black';
  label.style.marginBottom = '4px';
  roomButtons.insertBefore(selector, roomButtons.children[1]);
  roomButtons.insertBefore(label, selector);
}

// Helper Functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resetLights() {
  document.querySelectorAll('.light').forEach(light => light.classList.remove('on'));
}

function hideUI() {
  startButton.style.display = 'none';
  roomButtons.style.display = 'none';
  status.style.display = 'none';
  reactionTimeDisplay.style.display = 'none';
  bestTimeDisplay.style.display = 'none';
  instructions.style.display = 'none';
  settingsButton.style.display = 'none';
  settingsContent.classList.remove('active');
}

function showUI() {
  startButton.style.display = 'block';
  roomButtons.style.display = 'flex';
  status.style.display = 'block';
  reactionTimeDisplay.style.display = 'block';
  bestTimeDisplay.style.display = 'block';
  instructions.style.display = 'block';
  settingsButton.style.display = 'block';
}

function updateBestTime(reaction) {
  const bestTimeKey = 'bestReactionTime';
  const prevBest = parseFloat(localStorage.getItem(bestTimeKey));
  if (isNaN(prevBest) || reaction < prevBest) {
    localStorage.setItem(bestTimeKey, reaction);
    displayBestScore.textContent = `${reaction.toFixed(2)} ms`;
    const name = localStorage.getItem('playerName') || 'Player';
    const team = localStorage.getItem('playerTeam') || '';
    if (typeof window.updateFirebaseScore === 'function') {
      window.updateFirebaseScore(name, reaction, team);
      console.log('New best score updated to Firebase:', { name, score: reaction, team });
    }
    return reaction;
  }
  return prevBest;
}

function copyLink() {
  const linkInput = document.getElementById('shareLinkInput');
  if (linkInput) {
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(linkInput.value);
    const copyBtn = document.getElementById('copyLinkBtn');
    if (copyBtn) {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy Link', 1500);
    }
  }
}

function getDisplayName(name, team) {
  return team ? `${name} (${team})` : name;
}

async function getPlayerName(promptText, defaultName, defaultTeam) {
  return new Promise(resolve => {
    hideUI();
    status.style.display = 'block';
    status.innerHTML = `
      ${promptText}
      <div class="name-prompt">
        <input type="text" id="nameInput" placeholder="Enter your name" value="${defaultName}">
        <select id="teamSelector" class="btn">
          <option value="">Select F1 Team (Optional)</option>
          <option value="Mercedes" ${defaultTeam === 'Mercedes' ? 'selected' : ''}>Mercedes</option>
          <option value="Red Bull" ${defaultTeam === 'Red Bull' ? 'selected' : ''}>Red Bull</option>
          <option value="McLaren" ${defaultTeam === 'McLaren' ? 'selected' : ''}>McLaren</option>
          <option value="Ferrari" ${defaultTeam === 'Ferrari' ? 'selected' : ''}>Ferrari</option>
          <option value="Aston Martin" ${defaultTeam === 'Aston Martin' ? 'selected' : ''}>Aston Martin</option>
          <option value="Alpine" ${defaultTeam === 'Alpine' ? 'selected' : ''}>Alpine</option>
          <option value="Williams" ${defaultTeam === 'Williams' ? 'selected' : ''}>Williams</option>
          <option value="RB" ${defaultTeam === 'RB' ? 'selected' : ''}>RB</option>
          <option value="Sauber" ${defaultTeam === 'Sauber' ? 'selected' : ''}>Sauber</option>
          <option value="Haas" ${defaultTeam === 'Haas' ? 'selected' : ''}>Haas</option>
        </select>
        <button id="submitNameBtn" class="btn">Submit</button>
      </div>
    `;
    const submitButton = document.getElementById('submitNameBtn');
    submitButton.addEventListener('click', async () => {
      const nameInput = document.getElementById('nameInput');
      const teamSelector = document.getElementById('teamSelector');
      const name = nameInput.value.trim() || defaultName;
      const team = teamSelector.value;
      localStorage.setItem('playerName', name);
      localStorage.setItem('playerTeam', team);
      displayName.textContent = name;
      displayTeam.textContent = team || 'None';

      // Generate unique player_id if not exists
      if (!localStorage.getItem('playerId')) {
        const response = await fetch('your-supabase-url/rest/v1/rpc/nextval', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer your-supabase-anon-key`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ seq_name: 'global_player_id_seq' })
        });
        const data = await response.json();
        if (data && data.length > 0) {
          const seqNumber = data[0].nextval.toString().padStart(5, '0');
          const playerId = `player_${seqNumber}`;
          localStorage.setItem('playerId', playerId);
          console.log('New playerId generated:', playerId);
        } else {
          console.error('Failed to get sequence value');
        }
      }

      status.innerHTML = '';
      showUI();
      status.textContent = 'Press SPACE, click, or tap to start!';
      instructions.textContent = 'React when all lights go off!';
      resolve({ name, team });
    }, { once: true });
    document.getElementById('nameInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') submitButton.click();
    });
  });
}

async function startSequence() {
  currentRunId++;
  const runId = currentRunId;
  resetLights();
  hideUI();
  gameStarted = false;
  falseStart = false;
  inputProcessed = false;

  for (let i = 0; i < columns.length; i++) {
    if (runId !== currentRunId) return;
    const lights = columns[i].querySelectorAll('.light');
    lights.forEach(light => light.classList.add('on'));
    try {
      beepSound.currentTime = 0;
      await beepSound.play();
    } catch {}
    await sleep(1000);
  }

  const delay = Math.floor(Math.random() * 2000) + 1000;
  await sleep(delay);
  if (runId !== currentRunId) return;

  resetLights();
  lightOffTime = performance.now();
  gameStarted = true;
}

async function getGlobalRank() {
  const playerId = localStorage.getItem('playerId');
  console.log('Checking playerId:', playerId);
  if (!playerId) {
    console.warn('No playerId found in localStorage');
    return '-';
  }

  try {
    const { data: cacheData, error: cacheError } = await window.supabase
      .from('rank_cache')
      .select('rank')
      .eq('player_id', playerId)
      .single();
    if (cacheError || !cacheData) {
      console.warn('Cache miss or error:', cacheError?.message || 'No rank cached for', playerId);
      return '-';
    }
    console.log('Cached rank fetched:', cacheData.rank);
    return cacheData.rank;
  } catch (error) {
    console.error('Unexpected error in getGlobalRank:', error.message);
    return '-';
  }
}

function handleReaction() {
  if (falseStart || inputProcessed) return;
  inputProcessed = true;

  if (!gameStarted) {
    hideUI();
    status.style.display = 'block';
    status.textContent = 'False Start! Wait for the lights!';
    falseStart = true;
    currentRunId++;
    resetLights();
    setTimeout(() => {
      if (!roomPlaying) {
        showUI();
        status.textContent = 'Press SPACE, click, or tap to start!';
        instructions.textContent = 'React when all lights go off!';
      }
    }, 1500);
    return;
  }

  const reaction = performance.now() - lightOffTime;
  if (reaction < 150) {
    hideUI();
    status.style.display = 'block';
    status.textContent = 'Too Early! False Start!';
    resetLights();
    setTimeout(() => {
      if (!roomPlaying) {
        showUI();
        status.textContent = 'Press SPACE, click, or tap to start!';
        instructions.textContent = 'React when all lights go off!';
      }
    }, 1500);
  } else {
    myScores.push(reaction);
    const best = updateBestTime(reaction);
    if (!roomPlaying) {
      // Immediate UI update
      showUI();
      status.textContent = 'Your Reaction Time:';
      reactionTimeDisplay.textContent = `${reaction.toFixed(2)} ms`;
      bestTimeDisplay.textContent = `🥇 Best Time: ${best.toFixed(2)} ms`;
      instructions.textContent = 'React when all lights go off!';

      // Async global rank fetch
      getGlobalRank().then(rank => {
        console.log('Final rank to display:', rank);
        if (rank === '-' || isNaN(rank)) {
          console.error('Invalid rank received:', rank);
          rank = 'N/A';
        }
        bestTimeDisplay.textContent += ` 🌍 Global Rank: #${rank}`;
      }).catch(error => {
        console.error('Error getting rank:', error);
        bestTimeDisplay.textContent += ' 🌍 Global Rank: N/A';
      });
    }
  }

  gameStarted = false;
}

// Events
document.body.addEventListener('keydown', e => {
  if (e.code === 'Space' && !document.getElementById('nameInput')) handleReaction();
});
document.body.addEventListener('pointerdown', e => {
  if (
    e.target === startButton ||
    e.target.closest('#roomOptions') ||
    e.target.id === 'continueButton' ||
    e.target.id === 'copyLinkBtn' ||
    e.target.id === 'submitNameBtn' ||
    e.target.id === 'nameInput' ||
    e.target.id === 'teamSelector' ||
    e.target.id === 'settingsButton' ||
    e.target.id === 'closeSettingsBtn' ||
    e.target.closest('#settingsContent')
  ) return;
  handleReaction();
});
startButton.addEventListener('click', () => {
  settingsContent.classList.remove('active');
  startSequence();
});

// Settings Menu
settingsButton.addEventListener('click', () => {
  settingsContent.classList.toggle('active');
});
editNameBtn.addEventListener('click', async () => {
  settingsContent.classList.remove('active');
  const { name, team } = await getPlayerName('Edit your name and team:', playerName, playerTeam);
  playerName = name;
  playerTeam = team;
});
closeSettingsBtn.addEventListener('click', () => {
  settingsContent.classList.remove('active');
});

// Table Display Functions
function createScoreTable(scores, playerName, rounds) {
  const average = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '-';
  return `
    <table class="score-table">
      <thead>
        <tr>
          <th colspan="2">${getDisplayName(playerName, playerTeam)}'s Scores</th>
        </tr>
        <tr>
          <th>Round</th>
          <th>Reaction Time (ms)</th>
        </tr>
      </thead>
      <tbody>
        ${Array.from({ length: rounds }, (_, i) => `
          <tr>
            <td>Round ${i + 1}</td>
            <td>${scores[i] ? scores[i].toFixed(2) : '-'}</td>
          </tr>
        `).join('')}
        <tr>
          <td>Average</td>
          <td>${average}</td>
        </tr>
      </tbody>
    </table>
  `;
}

// Share Function
async function shareScore() {
  const bestTime = localStorage.getItem('bestReactionTime');
  if (!bestTime) {
    alert('No best time recorded yet! Play the game to set a record.');
    return;
  }

  const name = localStorage.getItem('playerName') || 'Player';
  const team = localStorage.getItem('playerTeam') || '';
  const displayName = getDisplayName(name, team);
  const message = `${displayName}'s best reaction time: ${bestTime} ms! Can you beat me? Play at http://127.0.0.1:5500/`;
  const imagePath = './share-image.png';

  try {
    const response = await fetch(imagePath);
    if (!response.ok) throw new Error('Image fetch failed');
    const imageBlob = await response.blob();

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [imageBlob] })) {
      await navigator.share({
        title: 'My F1 Reaction Time',
        text: message.substring(0, 277) + (message.length > 277 ? '...' : ''),
        files: [new File([imageBlob], 'share-image.png', { type: 'image/png' })]
      });
      console.log('Share successful');
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const shareText = `${message.substring(0, 277)} [Image: ${dataUrl}]`.substring(0, 280);
        const tempInput = document.createElement('input');
        tempInput.value = shareText;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        alert('Score and image link copied to clipboard! Paste to share on Twitter.');
      };
      reader.readAsDataURL(imageBlob);
    }
  } catch (err) {
    console.error('Share failed:', err);
    const shareText = `${message.substring(0, 277)}`.substring(0, 280);
    await navigator.clipboard.writeText(shareText);
    alert('Failed to load image. Text copied to clipboard: ' + shareText + '\nPaste to share on Twitter manually.');
  }
}

// Firebase Room Logic
async function createChallengeRoom() {
  const creatorData = await getPlayerName('Enter your name for the challenge:', playerName, playerTeam);
  const creatorName = creatorData.name;
  const creatorTeam = creatorData.team;
  const roundSelector = document.getElementById('roundSelector');
  const length = parseInt(roundSelector.value) || 3;
  let creatorScores = [];

  async function playNextRound(index) {
    if (index >= length) {
      const avg = (creatorScores.reduce((a, b) => a + b, 0) / creatorScores.length).toFixed(2);
      try {
        const docRef = await db.collection('rooms').add({
          rounds: length,
          creatorScores: creatorScores,
          creatorAvg: avg,
          creatorName: creatorName,
          creatorTeam: creatorTeam,
          createdAt: Date.now()
        });
        const roomId = docRef.id;
        const shareURL = `${window.location.origin}/gamefire.html?roomId=${roomId}`;
        hideUI();
        status.style.display = 'block';
        status.innerHTML = `
          Challenge Created! Share this link with your friend: <br>
          <div class="link-row">
            <input type="text" id="shareLinkInput" value="${shareURL}" readonly>
            <button id="copyLinkBtn" class="btn" onclick="copyLink()">Copy Link</button>
          </div>
          <div class="score-tables">
            ${createScoreTable(creatorScores, creatorName, length)}
            ${createScoreTable([], 'Challenger', length)}
          </div>
          <button id="continueButton" class="btn" style="margin-top: 15px;">Continue</button>
        `;
        navigator.clipboard.writeText(shareURL);
        document.getElementById('continueButton').addEventListener('click', () => {
          showUI();
          status.textContent = 'Press SPACE, click, or tap to start!';
          instructions.textContent = 'React when all lights go off!';
          roomPlaying = false;
        }, { once: true });
      } catch (error) {
        console.error("Error creating room:", error);
        hideUI();
        status.style.display = 'block';
        status.textContent = 'Error creating challenge. Try again.';
        setTimeout(() => {
          showUI();
          status.textContent = 'Press SPACE, click, or tap to start!';
          instructions.textContent = 'React when all lights go off!';
        }, 1500);
      }
      return;
    }

    inputProcessed = false;
    falseStart = false;
    await startSequence();

    function waitForReaction(resolve) {
      const interval = setInterval(() => {
        if (inputProcessed) {
          clearInterval(interval);
          if (falseStart) {
            playNextRound(index);
          } else {
            const reaction = parseFloat(myScores[myScores.length - 1]);
            creatorScores.push(reaction);
            hideUI();
            status.style.display = 'block';
            status.innerHTML = `
              Round ${index + 1} Complete
              <div class="score-tables">
                ${createScoreTable(creatorScores, creatorName, length)}
                ${createScoreTable([], 'Challenger', length)}
              </div>
              <button id="continueButton" class="btn" style="margin-top: 15px;">Continue</button>
            `;
            document.getElementById('continueButton').addEventListener('click', () => {
              status.innerHTML = '';
              playNextRound(index + 1);
            }, { once: true });
          }
          resolve();
        }
      }, 100);
    }

    await new Promise(waitForReaction);
  }

  hideUI();
  status.style.display = 'block';
  status.textContent = `Start Challenge: Play ${length} rounds before inviting your friend!`;
  roomPlaying = true;
  await sleep(2000);
  status.innerHTML = '';
  playNextRound(0);
}

async function handleJoinRoom(roomId) {
  roomPlaying = true;
  const doc = await db.collection('rooms').doc(roomId).get();
  if (!doc.exists) {
    hideUI();
    status.style.display = 'block';
    status.textContent = 'Room Not Found: This challenge link is invalid or expired.';
    setTimeout(() => {
      showUI();
      status.textContent = 'Press SPACE, click, or tap to start!';
      instructions.textContent = 'React when all lights go off!';
      roomPlaying = false;
    }, 1500);
    return;
  }

  const data = doc.data();
  const rounds = data.rounds || 3;
  const creatorName = data.creatorName || 'Player 1';
  const creatorTeam = data.creatorTeam || '';
  const challengerData = await getPlayerName('Enter your name to join the challenge:', playerName, playerTeam);
  const challengerName = challengerData.name;
  const challengerTeam = challengerData.team;
  let scores = [];

  async function playNextRound(index) {
    if (index >= rounds) {
      const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
      await db.collection('rooms').doc(roomId).update({
        player2avg: avg,
        player2Scores: scores,
        player2Name: challengerName,
        player2Team: challengerTeam
      });
      const creatorAvg = parseFloat(data.creatorAvg);
      const challengerAvg = parseFloat(avg);
      let winnerText = 'It’s a tie!';
      if (creatorAvg < challengerAvg) {
        winnerText = `${getDisplayName(creatorName, creatorTeam)} won against ${getDisplayName(challengerName, challengerTeam)}!`;
      } else if (challengerAvg < creatorAvg) {
        winnerText = `${getDisplayName(challengerName, challengerTeam)} won against ${getDisplayName(creatorName, creatorTeam)}!`;
      }
      hideUI();
      status.style.display = 'block';
      status.innerHTML = `
        Challenge Complete! Your average: ${avg} ms<br>
        <strong>${winnerText}</strong>
        <div class="score-tables">
          ${createScoreTable(data.creatorScores, creatorName, rounds)}
          ${createScoreTable(scores, challengerName, rounds)}
        </div>
        <button id="continueButton" class="btn" style="margin-top: 15px;">Continue</button>
      `;
      document.getElementById('continueButton').addEventListener('click', () => {
        showUI();
        status.textContent = 'Press SPACE, click, or tap to start!';
        instructions.textContent = 'React when all lights go off!';
        roomPlaying = false;
      }, { once: true });
      return;
    }

    inputProcessed = false;
    falseStart = false;
    await startSequence();

    function waitForReaction(resolve) {
      const interval = setInterval(() => {
        if (inputProcessed) {
          clearInterval(interval);
          if (falseStart) {
            playNextRound(index);
          } else {
            const reaction = parseFloat(myScores[myScores.length - 1]);
            scores.push(reaction);
            hideUI();
            status.style.display = 'block';
            status.innerHTML = `
              Round ${index + 1} Complete
              <div class="score-tables">
                ${createScoreTable(data.creatorScores, creatorName, rounds)}
                ${createScoreTable(scores, challengerName, rounds)}
              </div>
              <button id="continueButton" class="btn" style="margin-top: 15px;">Continue</button>
            `;
            document.getElementById('continueButton').addEventListener('click', () => {
              status.innerHTML = '';
              playNextRound(index + 1);
            }, { once: true });
          }
          resolve();
        }
      }, 100);
    }

    await new Promise(waitForReaction);
  }

  hideUI();
  status.style.display = 'block';
  status.innerHTML = `
    You've Been Challenged! ${getDisplayName(creatorName, creatorTeam)}'s avg: ${data.creatorAvg} ms
    <div class="score-tables">
      ${createScoreTable(data.creatorScores, creatorName, rounds)}
      ${createScoreTable([], challengerName, rounds)}
    </div>
    <button id="continueButton" class="btn" style="margin-top: 15px;">Continue</button>
  `;
  document.getElementById('continueButton').addEventListener('click', () => {
    status.innerHTML = '';
    playNextRound(0);
  }, { once: true });
}

// Page Load
window.onload = async () => {
  console.log('f1-reaction-game.js loaded');
  displayName.textContent = playerName;
  displayTeam.textContent = playerTeam || 'None';
  const bestTime = localStorage.getItem('bestReactionTime');
  if (bestTime) {
    displayBestScore.textContent = `${parseFloat(bestTime).toFixed(2)} ms`;
  }
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('roomId');
  if (!roomId) {
    if (!localStorage.getItem('playerName')) {
      const { name, team } = await getPlayerName('Enter your name to start playing:', playerName, playerTeam);
      playerName = name;
      playerTeam = team;
    }
    showUI();
    status.textContent = 'Press SPACE, click, or tap to start!';
    instructions.textContent = 'React when all lights go off!';
    settingsButton.style.display = 'block';
  } else {
    startButton.style.display = 'none';
    roomButtons.style.display = 'none';
    settingsButton.style.display = 'none';
    handleJoinRoom(roomId);
  }

  // Fallback event listener
  document.getElementById('shareScoreButton').addEventListener('click', function() {
    shareScore();
    console.log('Share button clicked');
  });
};

// Expose shareScore globally
window.shareScore = shareScore;

window.createChallengeRoom = createChallengeRoom;
