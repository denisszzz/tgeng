// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// API endpoints
const API = {
    // Words endpoints
    getWords: 'https://545a-88-210-3-111.ngrok-free.app/api/words',
    addWord: 'https://545a-88-210-3-111.ngrok-free.app/api/words',
    deleteWord: 'https://545a-88-210-3-111.ngrok-free.app/api/words',
    updateWordStatus: 'https://545a-88-210-3-111.ngrok-free.app/api/words',
    updateTranslation: 'https://545a-88-210-3-111.ngrok-free.app/api/words',

    // Statistics endpoints
    getStatistics: 'https://545a-88-210-3-111.ngrok-free.app/api/statistics',
    updateStatistics: 'https://545a-88-210-3-111.ngrok-free.app/api/statistics',
    getWordProgress: 'https://545a-88-210-3-111.ngrok-free.app/api/statistics/words',
    getDifficultWords: 'https://545a-88-210-3-111.ngrok-free.app/api/statistics/words/difficult'
};

// Common headers for all requests
const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
};

// Vocabulary state
let vocabulary = [];
let currentWordIndex = 0;
let wordsLearned = 0;

// Spaced repetition intervals (in days)
const REPETITION_INTERVALS = [1, 3, 7, 14, 30, 60, 90, 180, 360, 720, 1440];

// Statistics tracking
const statistics = {
    totalWords: 0,
    wordsLearned: 0,
    wordsForgotten: 0,
    wordsRepeated: 0,
    streakDays: 0,
    lastReviewDate: null,
    dailyProgress: {},
    wordProgress: {}
};

// Calculate next review date based on current status and repetition count
function calculateNextReview(status, currentRepetitionCount) {
    const now = new Date();
    
    if (status === 'remember') {
        // Move to next interval
        const nextInterval = REPETITION_INTERVALS[Math.min(currentRepetitionCount, REPETITION_INTERVALS.length - 1)];
        now.setDate(now.getDate() + nextInterval);
        return now;
    } else if (status === 'forget') {
        // Go back one interval, but not less than 1 day
        const previousInterval = REPETITION_INTERVALS[Math.max(currentRepetitionCount - 1, 0)];
        now.setDate(now.getDate() + previousInterval);
        return now;
    } else if (status === 'repeat_tomorrow') {
        // Set review for tomorrow
        now.setDate(now.getDate() + 1);
        return now;
    }
    
    return now;
}

// DOM elements
const wordElement = document.querySelector('.word');
const translationElement = document.querySelector('.translation');
const showTranslationButton = document.getElementById('showTranslation');
const memoryControls = document.querySelector('.memory-controls');
const rememberButton = document.getElementById('rememberBtn');
const forgetButton = document.getElementById('forgetBtn');
const repeatTomorrowButton = document.getElementById('repeatTomorrowBtn');
const progressFill = document.querySelector('.progress-fill');
const progressText = document.querySelector('.progress-text');
const wordsList = document.getElementById('wordsList');
const addWordForm = document.getElementById('addWordForm');
const newWordInput = document.getElementById('newWord');
const newTranslationInput = document.getElementById('newTranslation');
const saveWordButton = document.getElementById('saveWord');
const cancelAddWordButton = document.getElementById('cancelAddWord');
const addNewWordBtn = document.getElementById('addNewWordBtn');
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// Haptic feedback functions
function triggerHapticFeedback(type) {
    if (tg.isVersionAtLeast('6.0')) {
        switch (type) {
            case 'success':
                tg.HapticFeedback.notificationOccurred('success');
                break;
            case 'error':
                tg.HapticFeedback.notificationOccurred('error');
                break;
            case 'warning':
                tg.HapticFeedback.notificationOccurred('warning');
                break;
            case 'impact':
                tg.HapticFeedback.impactOccurred('medium');
                break;
            case 'selection':
                tg.HapticFeedback.selectionChanged();
                break;
        }
    }
}

// API functions
async function fetchWords() {
    try {
        const user_id = tg.initDataUnsafe?.user?.id;
        if (!user_id) {
            throw new Error('User ID is required');
        }

        const response = await fetch(`${API.getWords}?user_id=${user_id}`, {
            headers
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch words');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching words:', error);
        return [];
    }
}

async function addWord(word, translation) {
    try {
        const user_id = tg.initDataUnsafe?.user?.id;
        if (!user_id) {
            throw new Error('User ID is required');
        }

        alert('Отправляем данные на сервер: ' + JSON.stringify({
            user_id,
            word,
            translation
        }, null, 2));

        try {
            const response = await fetch(API.addWord, {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                headers,
                body: JSON.stringify({
                    user_id,
                    word,
                    translation
                })
            });

            alert('Статус ответа: ' + response.status);
            
            if (response.status === 0) {
                throw new Error('Сервер недоступен. Проверьте URL и доступность сервера.');
            }

            const responseData = await response.json();
            alert('Данные ответа: ' + JSON.stringify(responseData, null, 2));

            if (!response.ok) {
                throw new Error(responseData.error || 'Ошибка сервера: ' + response.status);
            }

            return responseData;
        } catch (fetchError) {
            if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
                throw new Error('Ошибка сети. Проверьте подключение и доступность сервера.');
            }
            throw fetchError;
        }
    } catch (error) {
        alert('Ошибка при добавлении слова: ' + error.message);
        throw error;
    }
}

async function deleteWord(wordId) {
    try {
        const user_id = tg.initDataUnsafe?.user?.id;
        if (!user_id) {
            throw new Error('User ID is required');
        }

        const response = await fetch(`${API.deleteWord}/${wordId}`, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({ user_id })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete word');
        }

        const result = await response.json();
        if (result.success) {
            vocabulary = vocabulary.filter(word => word.id !== wordId);
            if (currentWordIndex >= vocabulary.length) {
                currentWordIndex = 0;
            }
            updateWord();
            updateProgress();
            renderWordList();
        }
        return result;
    } catch (error) {
        console.error('Error deleting word:', error);
        throw error;
    }
}

async function updateWordStatus(wordId, status) {
    try {
        const user_id = tg.initDataUnsafe?.user?.id;
        if (!user_id) {
            throw new Error('User ID is required');
        }

        const response = await fetch(`${API.updateWordStatus}/${wordId}/status`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                user_id,
                status
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update word status');
        }

        const updatedWord = await response.json();
        const wordIndex = vocabulary.findIndex(w => w.id === wordId);
        if (wordIndex !== -1) {
            vocabulary[wordIndex] = updatedWord;
        }

        // Update statistics after word status update
        await updateStatistics(status);

        switch (status) {
            case 'remember':
                triggerHapticFeedback('success');
                break;
            case 'forget':
                triggerHapticFeedback('error');
                break;
            case 'repeat_tomorrow':
                triggerHapticFeedback('warning');
                break;
        }

        return updatedWord;
    } catch (error) {
        console.error('Error updating word status:', error);
        throw error;
    }
}

// Tab switching
function switchTab(tabName) {
    tabButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabName);
    });
    
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
    
    // Update statistics when switching to stats tab
    if (tabName === 'stats') {
        updateStatisticsDisplay();
    }
    
    triggerHapticFeedback('selection');
}

// Word list rendering
function renderWordList() {
    wordsList.innerHTML = '';
    
    vocabulary.forEach(word => {
        const wordElement = document.createElement('div');
        wordElement.className = 'word-item';
        wordElement.innerHTML = `
            <div class="word-item-content">
                <div class="word-item-word">${word.word}</div>
                <div class="word-item-translation">${word.translation}</div>
            </div>
            <div class="word-item-actions">
                <button class="tg-button edit-button" onclick="showEditForm(${word.id})">Edit</button>
                <button class="tg-button delete-button" onclick="deleteWord(${word.id})">Delete</button>
            </div>
        `;
        wordsList.appendChild(wordElement);
    });
}

// Show edit form
function showEditForm(wordId) {
    const word = vocabulary.find(w => w.id === wordId);
    if (!word) return;

    document.getElementById('editWordId').value = wordId;
    document.getElementById('editWord').value = word.word;
    document.getElementById('editTranslation').value = word.translation;
    document.getElementById('editWordForm').classList.remove('hidden');
    triggerHapticFeedback('impact');
}

// Handle word update
async function handleUpdateWord() {
    const wordId = document.getElementById('editWordId').value;
    const translation = document.getElementById('editTranslation').value.trim();
    
    if (!translation) {
        triggerHapticFeedback('error');
        alert('Please enter translation');
        return;
    }
    
    try {
        const user_id = tg.initDataUnsafe?.user?.id;
        if (!user_id) {
            throw new Error('User ID is required');
        }

        const response = await fetch(`${API.updateTranslation}/${wordId}/translation`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                user_id,
                translation
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update translation');
        }

        // Refresh vocabulary from server
        vocabulary = await fetchWords();
        
        document.getElementById('editWordForm').classList.add('hidden');
        document.getElementById('editWord').value = '';
        document.getElementById('editTranslation').value = '';
        
        renderWordList();
        updateWord();
        triggerHapticFeedback('success');
    } catch (error) {
        triggerHapticFeedback('error');
        alert('Error updating translation: ' + error.message);
    }
}

// Update statistics
async function updateStatistics(status) {
    try {
        const user_id = tg.initDataUnsafe?.user?.id;
        if (!user_id) {
            throw new Error('User ID is required');
        }

        const response = await fetch(API.updateStatistics, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                user_id,
                status,
                date: new Date().toISOString().split('T')[0]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update statistics');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating statistics:', error);
        throw error;
    }
}

// Load statistics from localStorage
function loadStatistics() {
    const savedStats = localStorage.getItem('vocabularyStatistics');
    if (savedStats) {
        Object.assign(statistics, JSON.parse(savedStats));
    }
}

// Update word progress tracking
function updateWordProgress(wordId, status) {
    if (!statistics.wordProgress[wordId]) {
        statistics.wordProgress[wordId] = {
            attempts: 0,
            successes: 0,
            lastStatus: null,
            history: []
        };
    }

    const wordStats = statistics.wordProgress[wordId];
    wordStats.attempts++;
    wordStats.lastStatus = status;
    wordStats.history.push({
        status,
        timestamp: new Date().toISOString()
    });

    if (status === 'remember') {
        wordStats.successes++;
    }

    // Keep only last 10 attempts in history
    if (wordStats.history.length > 10) {
        wordStats.history.shift();
    }
}

// Handle memory assessment
async function handleMemoryAssessment(status) {
    const currentWord = vocabulary[currentWordIndex];
    if (!currentWord) return;

    try {
        await updateWordStatus(currentWord.id, status);
        
        // Update statistics
        updateStatistics(status);
        updateWordProgress(currentWord.id, status);
        
        // Refresh vocabulary from server
        vocabulary = await fetchWords();
        
        // Show next word
        updateWord();
        updateProgress();
    } catch (error) {
        alert('Error updating word status: ' + error.message);
    }
}

// Handle adding new word
async function handleAddWord() {
    const word = newWordInput.value.trim();
    const translation = newTranslationInput.value.trim();
    
    if (!word || !translation) {
        triggerHapticFeedback('error');
        alert('Please enter both word and translation');
        return;
    }
    
    try {
        const result = await addWord(word, translation);
        alert('Слово успешно добавлено: ' + JSON.stringify(result, null, 2));
        newWordInput.value = '';
        newTranslationInput.value = '';
        addWordForm.classList.add('hidden');
        
        // Обновляем список слов с сервера
        vocabulary = await fetchWords();
        renderWordList();
        updateWord();
        updateProgress();
        
        triggerHapticFeedback('success');
    } catch (error) {
        triggerHapticFeedback('error');
        alert('Ошибка при добавлении слова: ' + error.message);
    }
}

// Event listeners
showTranslationButton.addEventListener('click', showTranslation);
rememberButton.addEventListener('click', () => handleMemoryAssessment('remember'));
forgetButton.addEventListener('click', () => handleMemoryAssessment('forget'));
repeatTomorrowButton.addEventListener('click', () => handleMemoryAssessment('repeat_tomorrow'));
saveWordButton.addEventListener('click', handleAddWord);
cancelAddWordButton.addEventListener('click', () => {
    addWordForm.classList.add('hidden');
    newWordInput.value = '';
    newTranslationInput.value = '';
    triggerHapticFeedback('selection');
});
addNewWordBtn.addEventListener('click', () => {
    addWordForm.classList.remove('hidden');
    triggerHapticFeedback('impact');
});

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        switchTab(button.dataset.tab);
    });
});

document.getElementById('updateWord').addEventListener('click', handleUpdateWord);
document.getElementById('cancelEditWord').addEventListener('click', () => {
    document.getElementById('editWordForm').classList.add('hidden');
    document.getElementById('editWord').value = '';
    document.getElementById('editTranslation').value = '';
    triggerHapticFeedback('selection');
});

// Initialize the app
async function initApp() {
    // Load statistics
    loadStatistics();
    
    vocabulary = await fetchWords();
    statistics.totalWords = vocabulary.length;
    
    if (vocabulary.length > 0) {
        updateWord();
        updateProgress();
    } else {
        wordElement.textContent = 'No words available';
        translationElement.textContent = 'Add some words to start learning';
    }
    renderWordList();
}

// Update the current word display
function updateWord() {
    if (vocabulary.length === 0) {
        wordElement.textContent = 'No words available';
        translationElement.textContent = 'Add some words to start learning';
        return;
    }
    
    // Filter words that need review
    const now = new Date();
    const wordsToReview = vocabulary.filter(word => {
        if (!word.nextReview || !word.nextReview.Valid) return true;
        return new Date(word.nextReview.Time) <= now;
    });

    if (wordsToReview.length === 0) {
        wordElement.textContent = 'No words to review';
        translationElement.textContent = 'All words are up to date!';
        return;
    }

    // Select a random word from words that need review
    const randomIndex = Math.floor(Math.random() * wordsToReview.length);
    currentWordIndex = vocabulary.findIndex(w => w.id === wordsToReview[randomIndex].id);
    
    wordElement.textContent = vocabulary[currentWordIndex].word;
    translationElement.textContent = vocabulary[currentWordIndex].translation;
    translationElement.classList.add('hidden');
    memoryControls.classList.add('hidden');
}

// Update progress bar and text
function updateProgress() {
    const progress = (wordsLearned / vocabulary.length) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${wordsLearned}/${vocabulary.length} words`;
}

// Show translation
function showTranslation() {
    translationElement.classList.remove('hidden');
    memoryControls.classList.remove('hidden');
    triggerHapticFeedback('impact');
}

// Update statistics display
function updateStatisticsDisplay() {
    const today = new Date().toISOString().split('T')[0];
    const todayStats = statistics.dailyProgress[today] || { learned: 0, forgotten: 0, repeated: 0 };

    // Update today's progress
    document.getElementById('todayLearned').textContent = todayStats.learned;
    document.getElementById('todayForgotten').textContent = todayStats.forgotten;
    document.getElementById('todayRepeated').textContent = todayStats.repeated;

    // Update overall progress
    document.getElementById('totalWords').textContent = statistics.totalWords;
    document.getElementById('wordsLearned').textContent = statistics.wordsLearned;
    document.getElementById('streakDays').textContent = statistics.streakDays;

    // Update difficult words
    updateDifficultWords();
}

// Update difficult words list
function updateDifficultWords() {
    const difficultWordsContainer = document.getElementById('difficultWords');
    difficultWordsContainer.innerHTML = '';

    // Get words with success rate less than 50%
    const difficultWords = Object.entries(statistics.wordProgress)
        .filter(([_, stats]) => {
            const successRate = stats.successes / stats.attempts;
            return successRate < 0.5 && stats.attempts >= 3;
        })
        .sort(([_, statsA], [__, statsB]) => {
            const rateA = statsA.successes / statsA.attempts;
            const rateB = statsB.successes / statsB.attempts;
            return rateA - rateB;
        })
        .slice(0, 5); // Show top 5 most difficult words

    difficultWords.forEach(([wordId, stats]) => {
        const word = vocabulary.find(w => w.id === wordId);
        if (!word) return;

        const successRate = Math.round((stats.successes / stats.attempts) * 100);
        
        const wordElement = document.createElement('div');
        wordElement.className = 'difficult-word-item';
        wordElement.innerHTML = `
            <div class="difficult-word-info">
                <div class="difficult-word-word">${word.word}</div>
                <div class="difficult-word-stats">
                    ${stats.attempts} attempts, ${stats.successes} successes
                </div>
            </div>
            <div class="difficult-word-success-rate">${successRate}%</div>
        `;
        difficultWordsContainer.appendChild(wordElement);
    });
}

// Get word progress
async function getWordProgress(wordId) {
    try {
        const user_id = tg.initDataUnsafe?.user?.id;
        if (!user_id) {
            throw new Error('User ID is required');
        }

        const response = await fetch(`${API.getWordProgress}/${wordId}/progress?user_id=${user_id}`, {
            headers
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get word progress');
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting word progress:', error);
        throw error;
    }
}

// Get difficult words
async function getDifficultWords() {
    try {
        const user_id = tg.initDataUnsafe?.user?.id;
        if (!user_id) {
            throw new Error('User ID is required');
        }

        const response = await fetch(`${API.getDifficultWords}?user_id=${user_id}`, {
            headers
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get difficult words');
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting difficult words:', error);
        throw error;
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', initApp);