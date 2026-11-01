/**
 * Quiz ESP - Aplicação Principal
 * Funciona offline (via file://) e com servidor local
 */

(function () {
  'use strict';

  // --- Elementos do DOM ---
  const elThemeToggleBtn = document.getElementById('themeToggleBtn');
  const elThemeIcon = document.getElementById('themeIcon');
  const elResetSessionBtn = document.getElementById('resetSessionBtn');

  const elFilterDisciplina = document.getElementById('filterDisciplina');
  const elFilterDificuldade = document.getElementById('filterDificuldade');
  const elPoolCountBadge = document.getElementById('poolCountBadge');

  const elProgressText = document.getElementById('progressText');
  const elCorrectScore = document.getElementById('correctScore');
  const elAccuracyRate = document.getElementById('accuracyRate');
  const elStreakCount = document.getElementById('streakCount');
  const elProgressBarFill = document.getElementById('progressBarFill');

  const elQuestionContainer = document.getElementById('questionContainer');
  const elTagId = document.getElementById('tagId');
  const elTagDisciplina = document.getElementById('tagDisciplina');
  const elTagAssunto = document.getElementById('tagAssunto');
  const elTagDificuldade = document.getElementById('tagDificuldade');
  const elTagFonte = document.getElementById('tagFonte');
  const elEnunciadoText = document.getElementById('enunciadoText');
  const elAlternativesList = document.getElementById('alternativesList');

  const elFeedbackCard = document.getElementById('feedbackCard');
  const elFeedbackHeader = document.getElementById('feedbackHeader');
  const elFeedbackIcon = document.getElementById('feedbackIcon');
  const elFeedbackTitle = document.getElementById('feedbackTitle');
  const elGabaritoPill = document.getElementById('gabaritoPill');
  const elComentarioText = document.getElementById('comentarioText');
  const elNextQuestionBtn = document.getElementById('nextQuestionBtn');

  const elFinishedContainer = document.getElementById('finishedContainer');
  const elFinalTotal = document.getElementById('finalTotal');
  const elFinalCorrect = document.getElementById('finalCorrect');
  const elFinalAccuracy = document.getElementById('finalAccuracy');
  const elFinalMaxStreak = document.getElementById('finalMaxStreak');
  const elRestartBtn = document.getElementById('restartBtn');

  // --- Estado da Aplicação ---
  let allQuestions = [];
  let filteredQuestions = [];
  let currentIndex = 0;
  let score = 0;
  let answeredCount = 0;
  let streak = 0;
  let maxStreak = 0;
  let isAnswered = false;

  // --- Inicialização do Tema ---
  function initTheme() {
    const savedTheme = localStorage.getItem('quiz_theme') || 'dark';
    setTheme(savedTheme);

    elThemeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  }

  function setTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      elThemeIcon.textContent = '☀️';
    } else {
      document.documentElement.removeAttribute('data-theme');
      elThemeIcon.textContent = '🌙';
    }
    localStorage.setItem('quiz_theme', theme);
  }

  // --- Carregamento dos Dados ---
  async function loadQuestions() {
    // 1. Tenta carregar do script embutido em window.BANCO_QUESTOES
    if (window.BANCO_QUESTOES && Array.isArray(window.BANCO_QUESTOES) && window.BANCO_QUESTOES.length > 0) {
      allQuestions = window.BANCO_QUESTOES;
      onDataLoaded();
      return;
    }

    // 2. Fallback para fetch (se rodando em http/https)
    try {
      const res = await fetch('questoes.json');
      if (!res.ok) throw new Error('Falha na resposta HTTP');
      allQuestions = await res.json();
      onDataLoaded();
    } catch (err) {
      console.error('Erro ao carregar questoes:', err);
      elEnunciadoText.textContent = 'Erro ao carregar o banco de questões. Verifique se questoes_data.js ou questoes.json estão presentes.';
    }
  }

  function onDataLoaded() {
    populateFilters();
    applyFilters(false);
  }

  // --- Filtros ---
  function populateFilters() {
    const disciplinas = new Set();
    const dificuldades = new Set();

    allQuestions.forEach(q => {
      if (q.disciplina) disciplinas.add(q.disciplina);
      if (q.dificuldade) dificuldades.add(q.dificuldade);
    });

    disciplinas.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      elFilterDisciplina.appendChild(opt);
    });

    dificuldades.forEach(dif => {
      const opt = document.createElement('option');
      opt.value = dif;
      opt.textContent = dif;
      elFilterDificuldade.appendChild(opt);
    });

    elFilterDisciplina.addEventListener('change', () => applyFilters(true));
    elFilterDificuldade.addEventListener('change', () => applyFilters(true));
  }

  function applyFilters(resetScore = true) {
    const selectedDisc = elFilterDisciplina.value;
    const selectedDif = elFilterDificuldade.value;

    filteredQuestions = allQuestions.filter(q => {
      const matchDisc = selectedDisc === 'ALL' || q.disciplina === selectedDisc;
      const matchDif = selectedDif === 'ALL' || q.dificuldade === selectedDif;
      return matchDisc && matchDif;
    });

    // Embaralhar para experiência dinâmica
    shuffleArray(filteredQuestions);

    elPoolCountBadge.textContent = `${filteredQuestions.length} disponíveis`;

    if (resetScore) {
      score = 0;
      answeredCount = 0;
      streak = 0;
      maxStreak = 0;
    }

    currentIndex = 0;
    renderCurrentQuestion();
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // --- Renderização da Questão ---
  function renderCurrentQuestion() {
    isAnswered = false;
    elFeedbackCard.classList.add('hidden');
    elFinishedContainer.classList.add('hidden');
    elQuestionContainer.classList.remove('hidden');

    if (!filteredQuestions || filteredQuestions.length === 0) {
      elEnunciadoText.textContent = 'Nenhuma questão encontrada com os filtros selecionados.';
      elAlternativesList.innerHTML = '';
      updateStats();
      return;
    }

    if (currentIndex >= filteredQuestions.length) {
      showFinishedScreen();
      return;
    }

    const q = filteredQuestions[currentIndex];

    // Meta Badges
    elTagId.textContent = q.id || `ESP-${String(currentIndex + 1).padStart(4, '0')}`;
    elTagDisciplina.textContent = q.disciplina || 'Geral';
    elTagAssunto.textContent = q.assunto || (q.subassunto || 'Tópico Geral');
    
    // Dificuldade Badge styling
    elTagDificuldade.textContent = q.dificuldade || 'Normal';
    elTagDificuldade.className = 'meta-tag diff-tag';
    if (q.dificuldade === 'Média') {
      elTagDificuldade.classList.add('diff-media');
    } else if (q.dificuldade === 'Difícil') {
      elTagDificuldade.classList.add('diff-dificil');
    }

    elTagFonte.textContent = q.fonte || 'Banco ESP';
    elTagFonte.title = q.fonte || 'Banco ESP';

    // Enunciado
    elEnunciadoText.textContent = q.enunciado;

    // Alternativas
    elAlternativesList.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D', 'E'];

    letters.forEach(letter => {
      const text = q.alternativas ? q.alternativas[letter] : null;
      if (!text) return;

      const btn = document.createElement('button');
      btn.className = 'alt-btn';
      btn.dataset.letter = letter;

      btn.innerHTML = `
        <span class="alt-letter">${letter}</span>
        <span class="alt-text">${escapeHTML(text)}</span>
      `;

      btn.addEventListener('click', () => {
        handleAnswer(letter);
      });

      elAlternativesList.appendChild(btn);
    });

    updateStats();
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Resposta do Usuário ---
  function handleAnswer(selectedLetter) {
    if (isAnswered) return;
    if (currentIndex >= filteredQuestions.length) return;

    isAnswered = true;
    answeredCount++;

    const q = filteredQuestions[currentIndex];
    const gabarito = (q.gabarito || '').trim().toUpperCase();
    const isCorrect = selectedLetter === gabarito;

    if (isCorrect) {
      score++;
      streak++;
      if (streak > maxStreak) maxStreak = streak;

      elFeedbackHeader.className = 'feedback-header is-correct';
      elFeedbackIcon.textContent = '✅';
      elFeedbackTitle.textContent = getEncouragementText(true);
    } else {
      streak = 0;
      elFeedbackHeader.className = 'feedback-header is-wrong';
      elFeedbackIcon.textContent = '❌';
      elFeedbackTitle.textContent = getEncouragementText(false);
    }

    // Estilizar botões de alternativas
    const allBtns = elAlternativesList.querySelectorAll('.alt-btn');
    allBtns.forEach(btn => {
      btn.classList.add('locked');
      const letter = btn.dataset.letter;

      if (letter === gabarito) {
        btn.classList.add('correct-choice');
      } else if (letter === selectedLetter && !isCorrect) {
        btn.classList.add('wrong-choice');
      } else {
        btn.classList.add('dimmed');
      }
    });

    // Preencher Gabarito e Comentário
    elGabaritoPill.innerHTML = `Gabarito Oficial: <strong>${gabarito}</strong>`;
    elComentarioText.textContent = q.comentario ? q.comentario : 'Nenhum comentário cadastrado para esta questão.';

    // Exibir feedback
    elFeedbackCard.classList.remove('hidden');
    elNextQuestionBtn.focus();

    updateStats();
  }

  function getEncouragementText(isCorrect) {
    if (isCorrect) {
      const compliments = [
        'Excelente! Resposta correta!',
        'Muito bem! Você acertou!',
        'Perfeito! Ponto para você!',
        'Na mosca! Continua assim!',
        'Show de bola! Acerto garantido!'
      ];
      return compliments[Math.floor(Math.random() * compliments.length)];
    } else {
      const encourages = [
        'Não foi dessa vez, mas faz parte!',
        'Resposta incorreta. Veja a explicação abaixo:',
        'Quase lá! Leia o comentário para fixar o conteúdo.',
        'Atenção aos detalhes! Não desanime!'
      ];
      return encourages[Math.floor(Math.random() * encourages.length)];
    }
  }

  // --- Atualização de Estatísticas e Progresso ---
  function updateStats() {
    const total = filteredQuestions.length;
    const current = Math.min(currentIndex + 1, total);

    elProgressText.textContent = `${current} / ${total}`;
    elCorrectScore.textContent = score;

    const rate = answeredCount > 0 ? Math.round((score / answeredCount) * 100) : 0;
    elAccuracyRate.textContent = `${rate}%`;

    elStreakCount.textContent = `🔥 ${streak}`;

    const progressPercent = total > 0 ? ((currentIndex) / total) * 100 : 0;
    elProgressBarFill.style.width = `${progressPercent}%`;
  }

  // --- Próxima Questão & Tela Final ---
  function nextQuestion() {
    if (!isAnswered && currentIndex < filteredQuestions.length) return;

    currentIndex++;
    if (currentIndex < filteredQuestions.length) {
      renderCurrentQuestion();
    } else {
      showFinishedScreen();
    }
  }

  function showFinishedScreen() {
    elQuestionContainer.classList.add('hidden');
    elFeedbackCard.classList.add('hidden');
    elFinishedContainer.classList.remove('hidden');

    const total = filteredQuestions.length;
    elFinalTotal.textContent = total;
    elFinalCorrect.textContent = score;

    const rate = total > 0 ? Math.round((score / total) * 100) : 0;
    elFinalAccuracy.textContent = `${rate}%`;
    elFinalMaxStreak.textContent = `🔥 ${maxStreak}`;

    elProgressBarFill.style.width = '100%';
  }

  function resetSession() {
    score = 0;
    answeredCount = 0;
    streak = 0;
    maxStreak = 0;
    currentIndex = 0;
    shuffleArray(filteredQuestions);
    renderCurrentQuestion();
  }

  // --- Atalhos de Teclado ---
  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignorar se o usuário estiver focado num select
      if (document.activeElement && (document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'INPUT')) {
        return;
      }

      const key = e.key.toUpperCase();

      // Próxima questão com Enter se feedback visível
      if (e.key === 'Enter') {
        if (!elFeedbackCard.classList.contains('hidden')) {
          e.preventDefault();
          nextQuestion();
          return;
        }
      }

      // Se já respondeu, não processa teclas de alternativas
      if (isAnswered) return;

      const keyMap = {
        'A': 'A', '1': 'A',
        'B': 'B', '2': 'B',
        'C': 'C', '3': 'C',
        'D': 'D', '4': 'D',
        'E': 'E', '5': 'E'
      };

      if (keyMap[key]) {
        e.preventDefault();
        handleAnswer(keyMap[key]);
      }
    });
  }

  // --- Listeners de Ações ---
  elNextQuestionBtn.addEventListener('click', nextQuestion);
  elRestartBtn.addEventListener('click', resetSession);
  elResetSessionBtn.addEventListener('click', resetSession);

  // --- Start ---
  initTheme();
  setupKeyboardShortcuts();
  loadQuestions();

})();

