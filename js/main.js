document.addEventListener('DOMContentLoaded', () => {
    let acronymsData = null;

    // Fetch JSON data
    fetch('assets/data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            acronymsData = data;
        })
        .catch(error => {
            showError('Failed to load acronyms data. Please try again later.');
        });

    function showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.classList.remove('is-hidden');
        
        // Hide the error message after 3 seconds
        setTimeout(() => {
            errorDiv.classList.add('is-hidden');
            errorDiv.textContent = '';
        }, 3000);
    }

    function searchAcronyms() {
        const searchTerm = document.getElementById('search').value.trim();
        const resultsDiv = document.getElementById('results');
        const errorDiv = document.getElementById('errorMessage');

        resultsDiv.innerHTML = ''; // Clear previous results
        errorDiv.classList.add('is-hidden'); // Hide previous errors

        if (!searchTerm) {
            showError('Please enter a search term');
            return;
        }

        if (!acronymsData) {
            showError('Data is still loading. Please try again in a moment.');
            return;
        }

        // Create a regex for exact match, case-insensitive
        const regex = new RegExp(`^${escapeRegex(searchTerm)}$`, 'i');
        
        // Filter only by acronym for exact match
        const matches = acronymsData.acronyms.filter(item => 
            regex.test(item.acronym)
        );

        if (matches.length === 0) {
            showError(`No results found for "${searchTerm}"`);
            return;
        }

        matches.forEach(item => {
            // Create Bulma card
            const cardColumn = document.createElement('div');
            cardColumn.className = 'column is-one-third';

            const card = document.createElement('div');
            card.className = 'card';

            const cardContent = document.createElement('div');
            cardContent.className = 'card-content';

            const media = document.createElement('div');
            media.className = 'media';

            const mediaContent = document.createElement('div');
            mediaContent.className = 'media-content';

            const title = document.createElement('p');
            title.className = 'title is-4';
            title.textContent = item.acronym;

            const subtitle = document.createElement('p');
            subtitle.className = 'subtitle is-6';
            subtitle.innerHTML = `<strong>Definition:</strong> ${item.definition}`;

            mediaContent.appendChild(title);
            mediaContent.appendChild(subtitle);
            media.appendChild(mediaContent);
            cardContent.appendChild(media);

            if (item.description) {
                const description = document.createElement('div');
                description.className = 'content';
                description.innerHTML = `<strong>Description:</strong> ${item.description}`;
                cardContent.appendChild(description);
            }

            card.appendChild(cardContent);
            cardColumn.appendChild(card);
            resultsDiv.appendChild(cardColumn);
        });
    }

    // Escape special regex characters in searchTerm
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Add event listener to the search form
    const searchForm = document.getElementById('searchForm');
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent form from submitting
        searchAcronyms();
    });
});