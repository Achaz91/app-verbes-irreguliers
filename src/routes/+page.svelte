<script>
    // --- IMPORTATIONS ---
    import { onMount } from 'svelte';
    import { browser } from '$app/environment'; // NOUVEAU : L'outil SvelteKit pour détecter si on est dans le navigateur
    import verbsData from '$lib/verbs.json';

    const QUIZ_LENGTH = 10;

    // --- VARIABLES D'ÉTAT ---
    let mode = 'home';
    let searchTerm = '';
    let currentVerb = null;
    let userAnswerPreterit = '';
    let userAnswerParticiple = '';
    let showFeedback = false;
    let isCorrect = false;
    let score = 0;
    let quizCount = 0;
    let streak = 0;
    let quizEnded = false;
    let quizVerbPool = [];
    let reviewDeck = [];
    let isMuted = false;
    let audioCtx;

    // --- CYCLE DE VIE ---
    onMount(() => {
        // onMount s'exécute uniquement dans le navigateur, mais on ajoute une
        // vérification "if (browser)" par bonne pratique et pour être très clair.
        if (browser) {
            const savedReviewDeck = localStorage.getItem('reviewDeck');
            if (savedReviewDeck) {
                reviewDeck = JSON.parse(savedReviewDeck);
            }
            const savedMutePref = localStorage.getItem('isMuted');
            isMuted = savedMutePref ? JSON.parse(savedMutePref) : false;

            // Enregistrer le Service Worker pour le mode hors ligne
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js');
            }
        }
    });

    // NOUVEAU : On utilise "if (browser)" pour s'assurer que le localStorage
    // n'est appelé que côté client, ce qui corrige l'erreur de construction.
    $: if (browser) {
        localStorage.setItem('reviewDeck', JSON.stringify(reviewDeck));
        localStorage.setItem('isMuted', JSON.stringify(isMuted));
    }

    // --- FONCTIONS ---

    function initializeAudio() {
        if (browser && !audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playSound(type) {
        if (isMuted || !audioCtx) return;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        if (type === 'correct') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        } else if (type === 'incorrect') {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(120, audioCtx.currentTime);
        }
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.15);
    }

    function setMode(newMode) {
        initializeAudio();
        mode = newMode;
        if (newMode === 'quiz') {
            startQuiz();
        } else if (newMode === 'review') {
            startReviewQuiz();
        }
    }
    
    function toggleSound() {
        initializeAudio();
        isMuted = !isMuted;
    }

    function shuffleArray(array) {
        let newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    function startQuiz(isReview = false) {
        score = 0;
        quizCount = 0;
        streak = 0;
        quizEnded = false;
        
        if (isReview) {
            const verbsForReview = verbsData.filter(v => reviewDeck.includes(v.infinitive));
            quizVerbPool = shuffleArray(verbsForReview);
        } else {
            quizVerbPool = shuffleArray(verbsData);
        }
        
        nextQuestion(isReview);
    }

    function startReviewQuiz() {
        startQuiz(true);
    }

    function selectUniqueVerb() {
        if (quizVerbPool.length > 0) {
            currentVerb = quizVerbPool.pop();
        } else {
            quizEnded = true;
        }
    }

    function checkAnswer() {
        if (!currentVerb) return;
        const isPreteritCorrect = userAnswerPreterit.trim().toLowerCase() === currentVerb.preterit;
        const isParticipleCorrect = userAnswerParticiple.trim().toLowerCase() === currentVerb.participle;

        if (isPreteritCorrect && isParticipleCorrect) {
            isCorrect = true;
            score++;
            streak++;
            playSound('correct');
            if (reviewDeck.includes(currentVerb.infinitive)) {
                reviewDeck = reviewDeck.filter(verbInfinitive => verbInfinitive !== currentVerb.infinitive);
            }
        } else {
            isCorrect = false;
            streak = 0;
            playSound('incorrect');
            if (!reviewDeck.includes(currentVerb.infinitive)) {
                reviewDeck = [...reviewDeck, currentVerb.infinitive];
            }
        }
        showFeedback = true;
    }

    function nextQuestion(isReview = false) {
        const currentDeck = verbsData.filter(v => reviewDeck.includes(v.infinitive));
        const length = isReview ? currentDeck.length : QUIZ_LENGTH;
        if (quizCount >= length || quizVerbPool.length === 0) {
            quizEnded = true;
            return;
        }

        quizCount++;
        showFeedback = false;
        userAnswerPreterit = '';
        userAnswerParticiple = '';
        selectUniqueVerb();
    }
    
    function handleKeydown(event) {
        if (event.key === 'Enter' && !showFeedback) {
            checkAnswer();
        }
    }

    $: filteredVerbs = verbsData.filter(verb => 
        verb.infinitive.toLowerCase().includes(searchTerm.toLowerCase()) ||
        verb.translation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    $: progressPercentage = (() => {
        const currentDeck = verbsData.filter(v => reviewDeck.includes(v.infinitive));
        const length = mode === 'review' ? currentDeck.length : QUIZ_LENGTH;
        if (length === 0) return 0;
        return quizCount > 0 ? ((quizCount) / length) * 100 : 0;
    })();

</script>

<!-- Le Style (CSS) de notre application -->
<style>
    :global(body) {
        background-color: #f0f4f8;
        color: #1c3d5a;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        margin: 0;
    }
    .container {
        max-width: 600px;
        width: 100%;
        padding: 1rem;
        margin: 1rem auto;
    }
    .card {
        background-color: #ffffff;
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        text-align: center;
        border: 2px solid transparent;
        transition: border-color 0.3s;
        position: relative;
    }
    .btn-sound {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        opacity: 0.4;
        transition: opacity 0.2s;
        padding: 0.5rem;
    }
    .btn-sound:hover {
        opacity: 1;
    }
    h1 {
        font-size: 1.75rem;
        font-weight: 700;
        color: #0d2c4a;
        margin-bottom: 0.5rem;
    }
    .subtitle {
        color: #5a7d9a;
        margin-bottom: 2rem;
    }
    .section-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 0.5rem;
    }
    .section-header h1 {
        margin-bottom: 0;
        text-align: center;
        flex-grow: 1;
    }
    .mode-selection {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .btn {
        width: 100%;
        padding: 1rem;
        border: none;
        border-radius: 8px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        box-sizing: border-box;
        position: relative;
    }
    .btn:disabled {
        background-color: #e2e8f0;
        color: #94a3b8;
        cursor: not-allowed;
        transform: none;
    }
    .btn-large {
        padding: 1.2rem;
        font-size: 1.2rem;
    }
    .btn-primary {
        background-color: #2563eb;
        color: white;
    }
    .btn-primary:hover:not(:disabled) {
        background-color: #1d4ed8;
        transform: translateY(-2px);
    }
    .btn-secondary {
        background-color: #4ade80;
        color: white;
    }
    .btn-secondary:hover:not(:disabled) {
        background-color: #22c55e;
        transform: translateY(-2px);
    }
    .btn-tertiary {
        background-color: #f97316;
        color: white;
    }
    .btn-tertiary:hover:not(:disabled) {
        background-color: #ea580c;
        transform: translateY(-2px);
    }
    .btn-back {
        width: auto;
        padding: 0.5rem 0.9rem;
        font-size: 1.5rem;
        line-height: 1;
        background-color: #f1f5f9;
        color: #475569;
        border: 1px solid #e2e8f0;
    }
    .btn-back:hover {
        background-color: #e2e8f0;
    }
    .badge {
        position: absolute;
        top: -10px;
        right: -10px;
        background-color: #ef4444;
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 0.8rem;
        font-weight: bold;
    }
    .search-bar {
        width: 100%;
        padding: 0.8rem;
        border: 1px solid #cdd5de;
        border-radius: 8px;
        font-size: 1rem;
        box-sizing: border-box;
        margin-bottom: 1.5rem;
    }
    .verb-list {
        list-style: none;
        padding: 0;
        text-align: left;
        max-height: 60vh;
        overflow-y: auto;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
    }
    .verb-item {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        gap: 0.5rem;
        padding: 0.75rem;
        border-bottom: 1px solid #e2e8f0;
        font-size: 0.9rem;
        align-items: center;
    }
    .verb-item:last-child {
        border-bottom: none;
    }
    .verb-item span {
        font-weight: 500;
    }
    .verb-item .translation {
        color: #5a7d9a;
        font-style: italic;
    }
    .verb-header {
        font-weight: bold;
        color: #0d2c4a;
        background-color: #f8fafc;
        position: sticky;
        top: 0;
    }
    .stats-container {
        display: flex;
        justify-content: space-around;
        align-items: center;
        background-color: #f8fafc;
        border-radius: 8px;
        padding: 0.5rem;
        margin-bottom: 1rem;
        border: 1px solid #e2e8f0;
    }
    .score-tracker {
        font-size: 1rem;
        font-weight: 600;
        color: #5a7d9a;
        margin-bottom: 0;
    }
    .streak-counter {
        font-size: 1.5rem;
        font-weight: 700;
    }
    .progress-bar-container {
        width: 100%;
        height: 10px;
        background-color: #e2e8f0;
        border-radius: 5px;
        margin-bottom: 2rem;
        overflow: hidden;
    }
    .progress-bar {
        height: 100%;
        background-color: #4ade80;
        border-radius: 5px;
        transition: width 0.3s ease-in-out;
    }
    .verb-display {
        background-color: #e6f0fa;
        color: #1c3d5a;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        font-size: 2rem;
        font-weight: bold;
    }
    .input-group {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    input {
        width: 100%;
        padding: 0.8rem;
        border: 1px solid #cdd5de;
        border-radius: 8px;
        font-size: 1rem;
        box-sizing: border-box;
    }
    .feedback {
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1.5rem;
        font-weight: 600;
    }
    .feedback.correct {
        background-color: #dcfce7;
        color: #166534;
    }
    .feedback.incorrect {
        background-color: #fee2e2;
        color: #991b1b;
    }
    .quiz-end-summary {
        padding: 2rem 0;
    }
    .final-score {
        font-size: 4rem;
        font-weight: 900;
        color: #2563eb;
    }
    .end-message {
        font-size: 1.2rem;
        color: #5a7d9a;
        margin-bottom: 2rem;
    }
    .end-actions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    footer {
        text-align: center;
        margin-top: 2rem;
        padding-bottom: 1rem;
        color: #5a7d9a;
    }
    footer a {
        color: #2563eb;
        font-weight: 600;
        text-decoration: none;
    }
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
    }
    .correct-answer {
        animation: pulse 0.4s ease-in-out;
        border-color: #4ade80;
    }
    .incorrect-answer {
        animation: shake 0.4s ease-in-out;
        border-color: #f87171;
    }
    @media (max-width: 640px) {
        .container {
            padding: 0.5rem;
        }
        .card {
            padding: 1.5rem 1rem;
        }
        h1 {
            font-size: 1.5rem;
        }
        .btn-large {
            padding: 1rem;
            font-size: 1.1rem;
        }
        .verb-header {
            display: none;
        }
        .verb-item {
            display: block;
            text-align: left;
            padding: 1rem;
        }
        .verb-item span {
            display: block;
            margin-bottom: 0.25rem;
            font-size: 1rem;
        }
        .verb-item span:nth-child(1)::before { content: 'Infinitif: '; font-weight: bold; color: #5a7d9a; }
        .verb-item span:nth-child(2)::before { content: 'Prétérit: '; font-weight: bold; color: #5a7d9a; }
        .verb-item span:nth-child(3)::before { content: 'Participe P.: '; font-weight: bold; color: #5a7d9a; }
        .verb-item span:nth-child(4)::before { content: 'Français: '; font-weight: bold; color: #5a7d9a; }
        
        .final-score {
            font-size: 3rem;
        }
    }
</style>

<!-- La Structure (HTML) de notre application -->
<main class="container">
    <div 
        class="card"
        class:correct-answer={showFeedback && isCorrect}
        class:incorrect-answer={showFeedback && !isCorrect}
    >
        <button class="btn-sound" on:click={toggleSound} aria-label="Activer ou désactiver le son">
            {#if isMuted}🔇{:else}🔊{/if}
        </button>

        <!-- ÉCRAN D'ACCUEIL -->
        {#if mode === 'home'}
            <h1>Verbes Irréguliers</h1>
            <p class="subtitle">Choisissez votre mode d'entraînement</p>
            <div class="mode-selection">
                <button class="btn btn-primary btn-large" on:click={() => setMode('learn')}>
                    📚 Apprendre la liste
                </button>
                <button class="btn btn-secondary btn-large" on:click={() => setMode('quiz')}>
                    🧠 Lancer un Quiz
                </button>
                <button 
                    class="btn btn-tertiary btn-large" 
                    on:click={() => setMode('review')}
                    disabled={reviewDeck.length === 0}
                >
                    🎯 Quiz de Révision
                    {#if reviewDeck.length > 0}
                        <span class="badge">{reviewDeck.length}</span>
                    {/if}
                </button>
            </div>

        <!-- MODE APPRENTISSAGE -->
        {:else if mode === 'learn'}
            <div class="section-header">
                <button class="btn btn-back" on:click={() => setMode('home')}>←</button>
                <h1>Liste des verbes</h1>
            </div>
            <p class="subtitle">Recherchez un verbe par son infinitif ou sa traduction.</p>
            <input type="text" class="search-bar" placeholder="Rechercher..." bind:value={searchTerm}>
            <ul class="verb-list">
                <li class="verb-item verb-header">
                    <span>Infinitif</span>
                    <span>Prétérit</span>
                    <span>Participe P.</span>
                    <span>Français</span>
                </li>
                {#each filteredVerbs as verb}
                    <li class="verb-item">
                        <span>{verb.infinitive}</span>
                        <span>{verb.preterit}</span>
                        <span>{verb.participle}</span>
                        <span class="translation">{verb.translation}</span>
                    </li>
                {/each}
            </ul>
            
        <!-- MODE QUIZ (Normal ou Révision) -->
        {:else if mode === 'quiz' || mode === 'review'}
            <div class="section-header">
                <button class="btn btn-back" on:click={() => setMode('home')}>←</button>
                <h1>{mode === 'review' ? 'Quiz de Révision' : 'Quiz'}</h1>
            </div>
            
            {#if !quizEnded}
                <div class="stats-container">
                    <p class="score-tracker">Score: {score}</p>
                    <p class="streak-counter">🔥 {streak}</p>
                </div>

                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: {progressPercentage}%"></div>
                </div>

                {#if currentVerb}
                    <div class="verb-display">{currentVerb.infinitive}</div>

                    {#if !showFeedback}
                        <div class="input-group">
                            <input type="text" placeholder="Prétérit (Past Simple)" bind:value={userAnswerPreterit} on:keydown={handleKeydown}>
                            <input type="text" placeholder="Participe Passé" bind:value={userAnswerParticiple} on:keydown={handleKeydown}>
                        </div>
                        <button class="btn btn-primary" on:click={checkAnswer}>Vérifier</button>
                    {:else}
                        <button class="btn btn-secondary" on:click={() => nextQuestion(mode === 'review')}>Suivant →</button>
                    {/if}

                    {#if showFeedback}
                        {#if isCorrect}
                            <div class="feedback correct">Bravo, c'est correct !</div>
                        {:else}
                            <div class="feedback incorrect">
                                Dommage. La bonne réponse était : <br>
                                <strong>{currentVerb.preterit} - {currentVerb.participle}</strong>
                            </div>
                        {/if}
                    {/if}
                {/if}
            {:else}
                <div class="quiz-end-summary">
                    <h2>Quiz Terminé !</h2>
                    <p class="end-message">Votre score final est :</p>
                    <div class="final-score">{score} / {quizCount}</div>
                    <div class="end-actions">
                        <button class="btn btn-secondary" on:click={() => startQuiz(mode === 'review')}>Recommencer</button>
                        <button class="btn btn-back" on:click={() => setMode('home')}>Retour à l'accueil</button>
                    </div>
                </div>
            {/if}
        {/if}

    </div>

    <!-- Pied de page avec le lien de donation -->
    {#if mode === 'home'}
    <footer>
        <p>Vous aimez cette app ?</p>
        <a href="https://wa.me/+237687723233?text=Bonjour,%20je%20souhaite%20soutenir%20votre%20application%20de%20verbes%20irréguliers." target="_blank" rel="noopener noreferrer">
            Soutenez le projet ❤️
        </a>
    </footer>
    {/if}
</main>

