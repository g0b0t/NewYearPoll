// Configuration
const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

// Elements
const surveySection = document.getElementById('survey');
const resultSection = document.getElementById('result');
const adminSection = document.getElementById('admin');
const startBtn = document.getElementById('startBtn');
const submitBtn = document.getElementById('submitBtn');
const backToSurveyBtn = document.getElementById('backToSurvey');
const backToMainBtn = document.getElementById('backToMain');
const formStatus = document.getElementById('formStatus');
const nameInput = document.getElementById('nameInput');
const alcoholLevel = document.getElementById('alcoholLevel');
const alcoholLevelLabel = document.getElementById('alcoholLevelLabel');
const personaTitle = document.getElementById('personaTitle');
const personaDescription = document.getElementById('personaDescription');
const adminStatus = document.getElementById('adminStatus');
const foodStats = document.getElementById('foodStats');
const vibeStats = document.getElementById('vibeStats');

const selectableGroups = {
  food: document.querySelectorAll('#foodOptions .chip')
};

const alcoholLevelMap = {
  0: 'No booze tonight',
  1: 'Soft buzz',
  2: 'Happy clink',
  3: 'Legendary toast'
};

const personaRules = [
  {
    match: data => data.selectedFoods.includes('Rolls / Sushi'),
    title: 'Rolls Romantic',
    description: 'You appreciate delicate rolls and chill vibes. Expect soy sauce jokes at the table.'
  },
  {
    match: data => data.selectedFoods.includes('Shashlik / BBQ'),
    title: 'BBQ Warrior',
    description: 'You were born with grill tongs in hand. Smoke and good stories follow you.'
  },
  {
    match: data => data.selectedFoods.includes('Olivier salad'),
    title: 'Olivier Samurai',
    description: 'Traditional, legendary, unstoppable. You know where the salad bowl is at all times.'
  },
  {
    match: data => data.selectedFoods.includes('Home-baked sweets'),
    title: 'Cookie Bard',
    description: 'Shows up with homemade desserts and compliments. Sugar rush and soft playlists included.'
  },
  {
    match: data => data.alcoholLevel === 0,
    title: 'Sober Sparkler',
    description: 'You bring board games, playlists, and a steady hand for sparklers.'
  }
];

function updateSliderLabels() {
  alcoholLevelLabel.textContent = alcoholLevelMap[alcoholLevel.value];
}

function toggleCard(event) {
  const target = event.target.closest('.chip');
  if (!target) return;
  target.classList.toggle('selected');
}

function getSelectedValues(nodeList) {
  return Array.from(nodeList)
    .filter(node => node.classList.contains('selected'))
    .map(node => node.dataset.value);
}

function setScreen(screen) {
  surveySection.classList.add('hidden');
  resultSection.classList.add('hidden');
  adminSection.classList.add('hidden');

  if (screen === 'survey') surveySection.classList.remove('hidden');
  if (screen === 'result') resultSection.classList.remove('hidden');
  if (screen === 'admin') adminSection.classList.remove('hidden');
}

function validateForm() {
  const selectedFoods = getSelectedValues(selectableGroups.food);
  if (!nameInput.value.trim()) {
    formStatus.textContent = 'Please add your nickname or name.';
    return false;
  }
  if (selectedFoods.length === 0) {
    formStatus.textContent = 'Pick at least one food to claim your spot.';
    return false;
  }
  formStatus.textContent = '';
  return true;
}

async function submitForm() {
  if (!validateForm()) return;

  const payload = {
    name: nameInput.value.trim(),
    selectedFoods: getSelectedValues(selectableGroups.food),
    alcoholLevel: Number(alcoholLevel.value),
    timestamp: new Date().toISOString()
  };

  formStatus.textContent = 'Sending your wishes...';
  submitBtn.disabled = true;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Network error');
    const data = await response.json();
    if (data.status !== 'ok') throw new Error('Server returned an error');

    showPersona(payload);
    setScreen('result');
    formStatus.textContent = '';
  } catch (error) {
    console.error(error);
    formStatus.textContent = 'Oops! Could not send the form. Please try again.';
  } finally {
    submitBtn.disabled = false;
  }
}

function showPersona(data) {
  const rule = personaRules.find(item => item.match(data));
  if (rule) {
    personaTitle.textContent = rule.title;
    personaDescription.textContent = rule.description;
    return;
  }

  if (data.alcoholLevel >= 3) {
    personaTitle.textContent = 'Toastmaster Deluxe';
    personaDescription.textContent = 'You will absolutely hijack the playlist and run the countdown.';
  } else {
    personaTitle.textContent = 'Festive Hero';
    personaDescription.textContent = 'Balanced tastes, balanced vibes. The party bends to your mood!';
  }
}

function renderStats(container, statsObj, total) {
  container.innerHTML = '';
  const entries = Object.entries(statsObj || {});
  if (entries.length === 0) {
    container.innerHTML = '<p class="muted">No data yet.</p>';
    return;
  }

  entries
    .sort((a, b) => b[1] - a[1])
    .forEach(([label, count]) => {
      const row = document.createElement('div');
      row.className = 'stat-row';
      const percent = total ? Math.round((count / total) * 100) : 0;
      row.innerHTML = `
        <div class="stat-row__label">
          <strong>${label}</strong> — ${count}
        </div>
        <div class="stat-row__bar" style="width:${percent}%"></div>
      `;
      container.appendChild(row);
    });
}

async function loadAdminStats() {
  adminStatus.textContent = 'Loading stats...';
  foodStats.innerHTML = '';
  vibeStats.innerHTML = '';

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();

    renderStats(foodStats, data.foods, data.totalResponses);

    const vibeCounts = Object.entries(data.alcoholLevels || {}).reduce((acc, [level, count]) => {
      const label = alcoholLevelMap[level] || `Level ${level}`;
      acc[label] = count;
      return acc;
    }, {});
    renderStats(vibeStats, vibeCounts, data.totalResponses);
    adminStatus.textContent = data.totalResponses ? `${data.totalResponses} responses` : 'No responses yet';
  } catch (error) {
    console.error(error);
    adminStatus.textContent = 'Could not load stats. Please refresh or check the Apps Script deployment.';
  }
}

function handleHashRouting() {
  if (location.hash === '#admin') {
    setScreen('admin');
    loadAdminStats();
  } else {
    setScreen('survey');
  }
}

function init() {
  updateSliderLabels();
  handleHashRouting();

  startBtn?.addEventListener('click', () => setScreen('survey'));
  backToSurveyBtn?.addEventListener('click', () => setScreen('survey'));
  backToMainBtn?.addEventListener('click', () => {
    location.hash = '';
    setScreen('survey');
  });
  submitBtn?.addEventListener('click', submitForm);

  alcoholLevel.addEventListener('input', updateSliderLabels);

  selectableGroups.food.forEach(btn => btn.addEventListener('click', toggleCard));

  window.addEventListener('hashchange', handleHashRouting);
}

init();
