// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// API endpoints
const API = {
    // Words endpoints
    getWords: 'https://545a-88-210-3-111.ngrok-free.app/api/words',
    getAllWords: 'https://545a-88-210-3-111.ngrok-free.app/api/words/all',
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
        const data = await response.json();
        return data === null ? [] : data;
    } catch (error) {
        console.error('Error fetching words:', error);
        return [];
    }
}

async function fetchAllWords() {
    try {
        const user_id = tg.initDataUnsafe?.user?.id;
        if (!user_id) {
            throw new Error('User ID is required');
        }

        const response = await fetch(`${API.getAllWords}?user_id=${user_id}`, {
            headers
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch all words');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching all words:', error);
        return [];
    }
}

async function addWord(word, translation) {
    try {
        const user_id = tg.initDataUnsafe?.user?.id;
        if (!user_id) {
            throw new Error('User ID is required');
        }

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

        if (response.status === 0) {
            throw new Error('Сервер недоступен. Проверьте URL и доступность сервера.');
        }

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || 'Ошибка сервера: ' + response.status);
        }

        return responseData;
    } catch (error) {
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

        const requestData = {
            user_id,
            status
        };

        const response = await fetch(`${API.updateWordStatus}/${wordId}/status`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(requestData)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || 'Failed to update word status');
        }

        const wordIndex = vocabulary.findIndex(w => w.id === wordId);
        if (wordIndex !== -1) {
            vocabulary[wordIndex] = responseData;
        }

        // Provide haptic feedback
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

        return responseData;
    } catch (error) {
        console.error('Error updating word status:', error);
        throw error;
    }
}

// Word list rendering
async function renderWordList() {
    wordsList.innerHTML = '';
    
    try {
        const allWords = await fetchAllWords();
        const wordsToDisplay = allWords === null ? [] : allWords;
        
        if (wordsToDisplay.length === 0) {
            wordsList.innerHTML = '<div class="no-words-message">Нет добавленных слов</div>';
            return;
        }
        
        wordsToDisplay.forEach(word => {
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
    } catch (error) {
        console.error('Error rendering word list:', error);
        wordsList.innerHTML = '<div class="error-message">Ошибка при загрузке слов</div>';
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
    
    // Load all words when switching to words tab
    if (tabName === 'words') {
        renderWordList();
    }
    
    triggerHapticFeedback('selection');
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
    // Remove entire function
}

// Load statistics from localStorage
function loadStatistics() {
    // Remove entire function
}

// Update word progress tracking
function updateWordProgress(wordId, status) {
    // Remove entire function
}

// Handle memory assessment
async function handleMemoryAssessment(status) {
    const currentWord = vocabulary[currentWordIndex];
    if (!currentWord) return;

    try {
        // Update word status on backend
        await updateWordStatus(currentWord.id, status);
        
        // Refresh vocabulary from server to get updated word data
        vocabulary = await fetchWords();
        
        // Show next word
        updateWord();
        updateProgress();
        
        // Provide haptic feedback
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
    } catch (error) {
        console.error('Error in handleMemoryAssessment:', error);
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
    vocabulary = await fetchWords();
    
    if (vocabulary.length > 0) {
        updateWord();
        updateProgress();
    } else {
        wordElement.textContent = 'No words available';
        translationElement.textContent = 'Add some words to start learning';
    }
    
    // Initial render of word list
    await renderWordList();
}

// Update the current word display
function updateWord() {
    if (vocabulary.length === 0) {
        wordElement.textContent = 'Ты молодец!';
        translationElement.textContent = 'Все слова повторены. Приходи завтра.';
        translationElement.classList.remove('hidden');
        showTranslationButton.style.display = 'none';
        memoryControls.classList.add('hidden');
        triggerHapticFeedback('success');
        return;
    }
    
    // Show current word
    wordElement.textContent = vocabulary[currentWordIndex].word;
    translationElement.textContent = vocabulary[currentWordIndex].translation;
    translationElement.classList.add('hidden');
    showTranslationButton.style.display = 'block';
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
    if (vocabulary.length === 0) {
        return;
    }
    translationElement.classList.remove('hidden');
    memoryControls.classList.remove('hidden');
    triggerHapticFeedback('impact');
}

// Update statistics display
function updateStatisticsDisplay() {
    // Remove entire function
}

// Update difficult words list
function updateDifficultWords() {
    // Remove entire function
}

// Get word progress
async function getWordProgress(wordId) {
    // Remove entire function
}

// Get difficult words
async function getDifficultWords() {
    // Remove entire function
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', initApp);