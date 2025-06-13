// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// API endpoints
const API = {
    getWords: 'https://545a-88-210-3-111.ngrok-free.app/api/words',
    addWord: 'https://545a-88-210-3-111.ngrok-free.app/api/words',
    deleteWord: 'https://545a-88-210-3-111.ngrok-free.app/api/words',
    updateWord: 'https://545a-88-210-3-111.ngrok-free.app/api/words'
};

// Common headers for all requests
const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'Access-Control-Allow-Origin': '*'
};

// Vocabulary state
let vocabulary = [];
let currentWordIndex = 0;
let wordsLearned = 0;

// DOM elements
const wordElement = document.querySelector('.word');
const translationElement = document.querySelector('.translation');
const showTranslationButton = document.getElementById('showTranslation');
const memoryControls = document.querySelector('.memory-controls');
const rememberButton = document.getElementById('rememberBtn');
const forgetButton = document.getElementById('forgetBtn');
const remindButton = document.getElementById('remindBtn');
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

        const response = await fetch(API.addWord, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                user_id,
                word,
                translation
            })
        });

        alert('Статус ответа: ' + response.status);
        const responseData = await response.json();
        alert('Данные ответа: ' + JSON.stringify(responseData, null, 2));

        if (!response.ok) {
            throw new Error(responseData.error || 'Failed to add word');
        }

        return responseData;
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

        const response = await fetch(`${API.updateWord}/${wordId}`, {
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

        switch (status) {
            case 'remember':
                triggerHapticFeedback('success');
                break;
            case 'forget':
                triggerHapticFeedback('error');
                break;
            case 'remind':
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
                <button class="tg-button" onclick="deleteWord(${word.id})">Delete</button>
            </div>
        `;
        wordsList.appendChild(wordElement);
    });
}

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
    renderWordList();
}

// Update the current word display
function updateWord() {
    if (vocabulary.length === 0) {
        wordElement.textContent = 'No words available';
        translationElement.textContent = 'Add some words to start learning';
        return;
    }
    
    const currentWord = vocabulary[currentWordIndex];
    wordElement.textContent = currentWord.word;
    translationElement.textContent = currentWord.translation;
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

// Handle memory assessment
async function handleMemoryAssessment(status) {
    const currentWord = vocabulary[currentWordIndex];
    await updateWordStatus(currentWord.id, status);
    
    // Move to next word
    wordsLearned++;
    currentWordIndex = (currentWordIndex + 1) % vocabulary.length;
    updateWord();
    updateProgress();
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
        renderWordList();
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
remindButton.addEventListener('click', () => handleMemoryAssessment('remind'));
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

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', initApp);