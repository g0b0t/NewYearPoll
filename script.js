// Configuration
const API_URL = 'https://script.google.com/macros/s/AKfycbxifiDuwg7vqVT7pSzQpZRLYS0hpi-4Pb4Uveer7TvpmiJTTpfj2fmEL3FcGLrER49zug/exec';

// Elements
const surveySection = document.getElementById('survey');
const resultSection = document.getElementById('result');
const adminSection = document.getElementById('admin');
const startBtn = document.getElementById('startBtn');
const submitBtn = document.getElementById('submitBtn');
const backToSurveyBtn = document.getElementById('backToSurvey');
const backToMainBtn = document.getElementById('backToMain');
const formStatus = document.getElementById('formStatus');
const formStatusStep2 = document.getElementById('formStatusStep2');
const formStatusStep3 = document.getElementById('formStatusStep3');
const nameInput = document.getElementById('nameInput');
const alcoholLevel = document.getElementById('alcoholLevel');
const alcoholLevelLabel = document.getElementById('alcoholLevelLabel');
const personaTitle = document.getElementById('personaTitle');
const personaDescription = document.getElementById('personaDescription');
const adminStatus = document.getElementById('adminStatus');
const foodStats = document.getElementById('foodStats');
const vibeStats = document.getElementById('vibeStats');
const stepIndicator = document.getElementById('stepIndicator');
const stepperItems = document.querySelectorAll('.stepper__item');
const formSteps = document.querySelectorAll('.form-step');

const statusByStep = {
  1: formStatus,
  2: formStatusStep2,
  3: formStatusStep3
};

let currentStep = 1;
const totalSteps = formSteps.length;

const selectableGroups = {
  food: document.querySelectorAll('#foodOptions .chip')
};

const alcoholLevelMap = {
  0: 'Сегодня без алкоголя',
  1: 'Лёгкий вайб',
  2: 'Тёплый чок',
  3: 'Тосты от души'
};

const personaRules = [
  {
    match: data => data.selectedFoods.includes('Роллы / Суши'),
    title: 'Ролл-романтик',
    description: 'Любишь нежные роллы и спокойный вайб. Соевый соус и лайтовые шутки гарантированы.'
  },
  {
    match: data => data.selectedFoods.includes('Шашлык / BBQ'),
    title: 'Гриль-воин',
    description: 'Родился с щипцами для мяса. Вокруг дымок и самые вкусные истории.'
  },
  {
    match: data => data.selectedFoods.includes('Салат Оливье'),
    title: 'Самурай Оливье',
    description: 'Классика, легенда, неостановимый. Всегда знаешь, где миска с салатом.'
  },
  {
    match: data => data.selectedFoods.includes('Домашняя выпечка'),
    title: 'Печенюшный бард',
    description: 'Приходит с домашними десертами и комплиментами. Сахарный прилив и мягкий плейлист в комплекте.'
  },
  {
    match: data => data.alcoholLevel === 0,
    title: 'Трезвый искромёт',
    description: 'Привезёшь настолки, плейлисты и уверенно крутишь бенгальские огни.'
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

function clearStatuses() {
  Object.values(statusByStep).forEach(el => {
    if (el) el.textContent = '';
  });
}

function updateStepUI() {
  formSteps.forEach(step => {
    const isActive = Number(step.dataset.step) === currentStep;
    step.classList.toggle('hidden', !isActive);
  });

  stepperItems.forEach(item => {
    const stepNumber = Number(item.dataset.step);
    item.classList.toggle('active', stepNumber === currentStep);
    item.classList.toggle('completed', stepNumber < currentStep);
  });

  if (stepIndicator) {
    stepIndicator.textContent = `Шаг ${currentStep} из ${totalSteps}`;
  }
}

function showStatus(step, message) {
  clearStatuses();
  const target = statusByStep[step];
  if (target) target.textContent = message;
}

function validateStep(step) {
  if (step === 1 && !nameInput.value.trim()) {
    showStatus(1, 'Добавь ник или имя.');
    return false;
  }

  if (step === 2) {
    const selectedFoods = getSelectedValues(selectableGroups.food);
    if (selectedFoods.length === 0) {
      showStatus(2, 'Выбери хотя бы одну закуску, чтобы застолбить место.');
      return false;
    }
  }

  showStatus(step, '');
  return true;
}

function goToStep(step) {
  currentStep = Math.min(Math.max(step, 1), totalSteps);
  updateStepUI();
}

function validateForm() {
  const requiredSteps = [1, 2];
  for (const step of requiredSteps) {
    if (!validateStep(step)) {
      goToStep(step);
      return false;
    }
  }
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

  showStatus(3, 'Отправляем твои пожелания...');
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
    showStatus(3, '');
  } catch (error) {
    console.error(error);
    showStatus(3, 'Упс! Не удалось отправить форму. Попробуй ещё раз.');
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
    personaTitle.textContent = 'Тамада-профи';
    personaDescription.textContent = 'Определённо захватишь плейлист и возьмёшь таймер в свои руки.';
  } else {
    personaTitle.textContent = 'Праздничный герой';
    personaDescription.textContent = 'Сбалансированные вкусы и настроение. Вечеринка подстраивается под тебя!';
  }
}

function renderStats(container, statsObj, total) {
  container.innerHTML = '';
  const entries = Object.entries(statsObj || {});
  if (entries.length === 0) {
    container.innerHTML = '<p class="muted">Данных пока нет.</p>';
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
  adminStatus.textContent = 'Загружаем статистику...';
  foodStats.innerHTML = '';
  vibeStats.innerHTML = '';

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();

    renderStats(foodStats, data.foods, data.totalResponses);

    const vibeCounts = Object.entries(data.alcoholLevels || {}).reduce((acc, [level, count]) => {
      const label = alcoholLevelMap[level] || `Уровень ${level}`;
      acc[label] = count;
      return acc;
    }, {});
    renderStats(vibeStats, vibeCounts, data.totalResponses);
    adminStatus.textContent = data.totalResponses ? `${data.totalResponses} ответов` : 'Ответов пока нет';
  } catch (error) {
    console.error(error);
    adminStatus.textContent = 'Не удалось загрузить статистику. Обнови страницу или проверь Apps Script.';
  }
}

function handleHashRouting() {
  if (location.hash === '#admin') {
    setScreen('admin');
    loadAdminStats();
  } else {
    setScreen('intro');
  }
}

function init() {
  updateSliderLabels();
  handleHashRouting();
  updateStepUI();

  startBtn?.addEventListener('click', () => {
    setScreen('survey');
    goToStep(1);
    clearStatuses();
    nameInput?.focus();
  });

  backToSurveyBtn?.addEventListener('click', () => {
    setScreen('survey');
    goToStep(1);
    clearStatuses();
  });

  backToMainBtn?.addEventListener('click', () => {
    location.hash = '';
    setScreen('intro');
  });
  submitBtn?.addEventListener('click', submitForm);

  alcoholLevel.addEventListener('input', updateSliderLabels);

  selectableGroups.food.forEach(btn => btn.addEventListener('click', toggleCard));

  document.querySelectorAll('[data-next-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        goToStep(currentStep + 1);
      }
    });
  });

  document.querySelectorAll('[data-prev-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      goToStep(currentStep - 1);
      clearStatuses();
    });
  });

  window.addEventListener('hashchange', handleHashRouting);
}

init();
