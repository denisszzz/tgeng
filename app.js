// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Sample vocabulary data (in a real app, this would come from a backend)
const vocabulary = [
    { word: 'Serendipity', translation: 'Счастливая случайность' },
    { word: 'Ephemeral', translation: 'Кратковременный' },
    { word: 'Ubiquitous', translation: 'Вездесущий' },
    { word: 'Eloquent', translation: 'Красноречивый' },
    { word: 'Mellifluous', translation: 'Мелодичный' }
];

let currentWordIndex = 0;
let wordsLearned = 0;

// DOM elements
const wordElement = document.querySelector('.word');
const translationElement = document.querySelector('.translation');
const showTranslationButton = document.getElementById('showTranslation');
const nextWordButton = document.getElementById('nextWord');
const progressFill = document.querySelector('.progress-fill');
const progressText = document.querySelector('.progress-text');

// Initialize the app
function initApp() {
    updateWord();
    updateProgress();
}

// Update the current word display
function updateWord() {
    const currentWord = vocabulary[currentWordIndex];
    wordElement.textContent = currentWord.word;
    translationElement.textContent = currentWord.translation;
    translationElement.classList.add('hidden');
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
}

// Move to next word
function nextWord() {
    wordsLearned++;
    currentWordIndex = (currentWordIndex + 1) % vocabulary.length;
    updateWord();
    updateProgress();
}

// Event listeners
showTranslationButton.addEventListener('click', showTranslation);
nextWordButton.addEventListener('click', nextWord);

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', initApp); 