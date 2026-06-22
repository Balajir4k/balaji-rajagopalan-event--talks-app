// State Variables
let allUpdates = [];
let currentFilteredUpdates = [];
let selectedUpdateId = null;
let activeFilter = 'all';
let searchQuery = '';
let sortOrder = 'newest';
let activeTemplate = 'casual';

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const refreshIcon = document.getElementById('refresh-icon');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statAnnouncements = document.getElementById('stat-announcements');
const statIssues = document.getElementById('stat-issues');
const statChanges = document.getElementById('stat-changes');

const searchInput = document.getElementById('search-input');
const btnClearSearch = document.getElementById('btn-clear-search');
const sortSelect = document.getElementById('sort-select');
const filterTagsContainer = document.getElementById('filter-tags');

const resultsCount = document.getElementById('results-count');
const selectedActionBar = document.getElementById('selected-action-bar');
const selectedText = document.getElementById('selected-text');
const btnTweetSelected = document.getElementById('btn-tweet-selected');

const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const btnRetry = document.getElementById('btn-retry');
const emptyState = document.getElementById('empty-state');
const btnResetFilters = document.getElementById('btn-reset-filters');
const timeline = document.getElementById('timeline');

const btnThemeToggle = document.getElementById('btn-theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const btnExportCsv = document.getElementById('btn-export-csv');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalSourceLabel = document.getElementById('modal-source-label');
const modalSourceDate = document.getElementById('modal-source-date');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const btnCopyTweet = document.getElementById('btn-copy-tweet');
const btnShareTweet = document.getElementById('btn-share-tweet');
const templateButtons = document.querySelectorAll('.btn-template');

// Toast Element
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Initial Fetch on Load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleases(false);
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh button
    btnRefresh.addEventListener('click', () => fetchReleases(true));
    btnRetry.addEventListener('click', () => fetchReleases(true));
    
    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        btnClearSearch.style.display = searchQuery ? 'flex' : 'none';
        filterAndRender();
    });

    btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        btnClearSearch.style.display = 'none';
        filterAndRender();
    });

    // Filter tags (sidebar)
    filterTagsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-tag')) {
            document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
            e.target.classList.add('active');
            activeFilter = e.target.dataset.type;
            filterAndRender();
        }
    });

    // Stats cards click filters
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', () => {
            const filterType = card.dataset.filter;
            // Highlight sidebar tag
            document.querySelectorAll('.filter-tag').forEach(tag => {
                if (tag.dataset.type === filterType) {
                    tag.classList.add('active');
                } else if (filterType === 'all' && tag.dataset.type === 'all') {
                    tag.classList.add('active');
                } else {
                    tag.classList.remove('active');
                }
            });
            activeFilter = filterType === 'all' ? 'all' : filterType;
            filterAndRender();
            // Scroll to feed list smoothly
            document.querySelector('.feed-section').scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Sort order
    sortSelect.addEventListener('change', (e) => {
        sortOrder = e.target.value;
        filterAndRender();
    });

    // Reset filters
    btnResetFilters.addEventListener('click', resetAllFilters);

    // Selected action bar tweet button
    btnTweetSelected.addEventListener('click', () => {
        if (selectedUpdateId) {
            const updateObj = allUpdates.find(u => u.id === selectedUpdateId);
            if (updateObj) openTweetComposer(updateObj);
        }
    });

    // Modal Close
    btnCloseModal.addEventListener('click', closeTweetComposer);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetComposer();
    });

    // Tweet templates
    templateButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            templateButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeTemplate = e.target.dataset.template;
            
            if (selectedUpdateId) {
                const updateObj = allUpdates.find(u => u.id === selectedUpdateId);
                if (updateObj) fillTweetContent(updateObj);
            }
        });
    });

    // Textarea character count watcher
    tweetTextarea.addEventListener('input', updateCharCount);

    // Modal action buttons
    btnCopyTweet.addEventListener('click', copyTweetToClipboard);
    btnShareTweet.addEventListener('click', shareTweetOnX);

    // Theme toggle
    btnThemeToggle.addEventListener('click', toggleTheme);

    // Export CSV
    btnExportCsv.addEventListener('click', exportToCSV);
}

// Fetch release notes
async function fetchReleases(forceRefresh = false) {
    // Show spinner & disable refresh
    setLoadingState(true);
    
    statusDot.className = 'status-dot loading';
    statusText.textContent = forceRefresh ? 'Fetching live feed...' : 'Loading cached notes...';
    
    let url = '/api/releases';
    if (forceRefresh) {
        url += '?refresh=true';
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        allUpdates = data.updates || [];
        
        // Update stats
        updateStatsCounters(allUpdates);
        
        // Update status text
        const fetchTime = new Date(data.last_fetched);
        const formattedTime = fetchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        statusDot.className = 'status-dot green';
        statusText.textContent = data.cached ? `Cached at ${formattedTime}` : `Updated at ${formattedTime}`;
        
        // Render
        filterAndRender();
        
    } catch (error) {
        console.error('Error fetching release notes:', error);
        errorMessage.textContent = error.message || 'Something went wrong while retrieving release notes feed.';
        
        statusDot.className = 'status-dot orange';
        statusText.textContent = 'Connection failed';
        
        setLoadingState(false, true);
    }
}

// Setup display elements loading state
function setLoadingState(isLoading, isError = false) {
    if (isLoading) {
        refreshIcon.classList.add('spin-icon');
        btnRefresh.disabled = true;
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        timeline.style.display = 'none';
        selectedUpdateId = null;
        updateSelectedActionBar();
    } else {
        refreshIcon.classList.remove('spin-icon');
        btnRefresh.disabled = false;
        loadingState.style.display = 'none';
        
        if (isError) {
            errorState.style.display = 'flex';
            timeline.style.display = 'none';
        }
    }
}

// Update stats at the top
function updateStatsCounters(updates) {
    statTotal.textContent = updates.length;
    
    const features = updates.filter(u => u.type === 'Feature').length;
    const announcements = updates.filter(u => u.type === 'Announcement').length;
    const issues = updates.filter(u => u.type === 'Issue').length;
    
    // Breaking changes, Changes, Deprecations are bundled into "Breaking / Changes"
    const changes = updates.filter(u => ['Breaking', 'Change', 'Deprecated', 'Issue'].indexOf(u.type) === -1 && u.type !== 'Feature' && u.type !== 'Announcement').length;
    // Let's refine the count logic:
    const breakingAndChanges = updates.filter(u => ['Breaking', 'Change', 'Deprecated'].includes(u.type)).length;
    
    statFeatures.textContent = features;
    statAnnouncements.textContent = announcements;
    statIssues.textContent = issues;
    statChanges.textContent = breakingAndChanges;
}

// Filter, Sort and Render Updates
function filterAndRender() {
    if (allUpdates.length === 0) {
        setLoadingState(false);
        return;
    }
    
    setLoadingState(false);
    
    let filtered = allUpdates.filter(update => {
        // Category Filter
        let categoryMatch = true;
        if (activeFilter !== 'all') {
            if (activeFilter === 'Breaking') {
                // Combine Breaking and Deprecated
                categoryMatch = ['Breaking', 'Deprecated'].includes(update.type);
            } else {
                categoryMatch = update.type === activeFilter;
            }
        }
        
        // Search query filter
        let searchMatch = true;
        if (searchQuery) {
            const inDate = update.date.toLowerCase().includes(searchQuery);
            const inType = update.type.toLowerCase().includes(searchQuery);
            const inText = update.text.toLowerCase().includes(searchQuery);
            searchMatch = inDate || inType || inText;
        }
        
        return categoryMatch && searchMatch;
    });

    // Sorting
    filtered.sort((a, b) => {
        const timeA = new Date(a.isoDate).getTime();
        const timeB = new Date(b.isoDate).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    // Update count labels
    resultsCount.textContent = `Showing ${filtered.length} of ${allUpdates.length} updates`;
    currentFilteredUpdates = filtered;

    // Show/hide Export CSV button based on results count
    if (filtered.length > 0) {
        btnExportCsv.style.display = 'inline-flex';
    } else {
        btnExportCsv.style.display = 'none';
    }

    if (filtered.length === 0) {
        emptyState.style.display = 'flex';
        timeline.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        timeline.style.display = 'flex';
        renderTimeline(filtered);
    }
}

// Render the timeline UI
function renderTimeline(updates) {
    timeline.innerHTML = '';
    
    updates.forEach(update => {
        const card = document.createElement('div');
        card.className = `timeline-card ${selectedUpdateId === update.id ? 'selected' : ''}`;
        card.dataset.id = update.id;
        
        // Map types to CSS border custom variables
        let borderTheme = 'var(--color-update)';
        let glowRgb = 'var(--color-update-rgb)';
        let iconName = 'info';
        
        switch(update.type) {
            case 'Feature':
                borderTheme = 'var(--color-feature)';
                glowRgb = 'var(--color-feature-rgb)';
                iconName = 'sparkles';
                break;
            case 'Announcement':
                borderTheme = 'var(--color-announcement)';
                glowRgb = 'var(--color-announcement-rgb)';
                iconName = 'megaphone';
                break;
            case 'Issue':
                borderTheme = 'var(--color-issue)';
                glowRgb = 'var(--color-issue-rgb)';
                iconName = 'alert-circle';
                break;
            case 'Breaking':
                borderTheme = 'var(--color-breaking)';
                glowRgb = 'var(--color-breaking-rgb)';
                iconName = 'zap-off';
                break;
            case 'Change':
                borderTheme = 'var(--color-change)';
                glowRgb = 'var(--color-change-rgb)';
                iconName = 'refresh-cw';
                break;
        }
        
        card.style.setProperty('--card-border-theme', borderTheme);
        card.style.setProperty('--card-glow-rgb', glowRgb);
        
        const badgeClass = `badge badge-${update.type.toLowerCase()}`;
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="${badgeClass}">
                        <i data-lucide="${iconName}"></i>
                        <span>${update.type}</span>
                    </span>
                    <span class="card-date">
                        <i data-lucide="calendar"></i>
                        <span>${update.date}</span>
                    </span>
                </div>
                <div class="card-select-checkbox" title="Select Update for Tweet">
                    <i data-lucide="check"></i>
                </div>
            </div>
            <div class="card-body">
                ${update.html}
            </div>
            <div class="card-footer">
                <button class="btn btn-secondary btn-sm btn-copy-card" title="Copy release text to clipboard" onclick="event.stopPropagation();">
                    <i data-lucide="copy"></i> Copy
                </button>
                <a href="${update.link}" target="_blank" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();">
                    <i data-lucide="external-link"></i> Source
                </a>
                <button class="btn btn-accent btn-sm btn-tweet" onclick="event.stopPropagation();">
                    <i data-lucide="twitter"></i> Tweet
                </button>
            </div>
        `;
        
        // Card clicking behavior for selection
        card.addEventListener('click', () => {
            toggleCardSelection(update.id);
        });
        
        // Copy card text to clipboard
        card.querySelector('.btn-copy-card').addEventListener('click', (e) => {
            e.stopPropagation();
            copyCardText(update.text);
        });

        // Single Tweet button click within card
        card.querySelector('.btn-tweet').addEventListener('click', () => {
            selectedUpdateId = update.id;
            // Apply selected state visually
            document.querySelectorAll('.timeline-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            updateSelectedActionBar();
            openTweetComposer(update);
        });

        timeline.appendChild(card);
    });

    // Trigger Lucide Icons render for the newly created elements
    lucide.createIcons();
}

// Select/Deselect Timeline Card
function toggleCardSelection(id) {
    const card = document.querySelector(`.timeline-card[data-id="${id}"]`);
    
    if (selectedUpdateId === id) {
        // Deselect
        selectedUpdateId = null;
        card.classList.remove('selected');
    } else {
        // Select new card
        if (selectedUpdateId) {
            const oldCard = document.querySelector(`.timeline-card[data-id="${selectedUpdateId}"]`);
            if (oldCard) oldCard.classList.remove('selected');
        }
        selectedUpdateId = id;
        card.classList.add('selected');
    }
    
    updateSelectedActionBar();
}

// Update the floating action bar
function updateSelectedActionBar() {
    if (selectedUpdateId) {
        const updateObj = allUpdates.find(u => u.id === selectedUpdateId);
        selectedText.textContent = `Selected: BQ Update (${updateObj.date})`;
        selectedActionBar.style.display = 'flex';
    } else {
        selectedActionBar.style.display = 'none';
    }
}

// Reset filters back to default
function resetAllFilters() {
    searchInput.value = '';
    searchQuery = '';
    btnClearSearch.style.display = 'none';
    
    document.querySelectorAll('.filter-tag').forEach(tag => {
        if (tag.dataset.type === 'all') {
            tag.classList.add('active');
        } else {
            tag.classList.remove('active');
        }
    });
    activeFilter = 'all';
    sortSelect.value = 'newest';
    sortOrder = 'newest';
    
    filterAndRender();
}

// Open Tweet Composer Modal
function openTweetComposer(update) {
    modalSourceLabel.textContent = update.type.toUpperCase();
    modalSourceDate.textContent = update.date;
    
    // Apply styling to source label
    modalSourceLabel.className = 'source-label';
    if (update.type === 'Feature') modalSourceLabel.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
    else if (update.type === 'Issue') modalSourceLabel.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
    else if (update.type === 'Announcement') modalSourceLabel.style.backgroundColor = 'rgba(6, 182, 212, 0.15)';
    else if (update.type === 'Breaking') modalSourceLabel.style.backgroundColor = 'rgba(249, 115, 22, 0.15)';
    else modalSourceLabel.style.backgroundColor = 'rgba(148, 163, 184, 0.15)';
    
    fillTweetContent(update);
    
    tweetModal.style.display = 'flex';
    tweetTextarea.focus();
}

// Close Tweet Composer Modal
function closeTweetComposer() {
    tweetModal.style.display = 'none';
}

// Generate pre-populated Tweet Content
function fillTweetContent(update) {
    let text = '';
    const date = update.date;
    const type = update.type;
    const body = update.text;
    const link = update.link;
    
    let templateHeader = '';
    let templateFooter = '';
    let hashtag = '#BigQuery #GoogleCloud';
    
    if (activeTemplate === 'casual') {
        templateHeader = `📢 BigQuery Release Note (${date}) - ${type}:\n\n`;
        templateFooter = `\n\nDetails: ${link} ${hashtag}`;
    } else if (activeTemplate === 'professional') {
        templateHeader = `Google Cloud BigQuery Update: ${type} [${date}]\n\n`;
        templateFooter = `\n\nFull release details: ${link} #GCP #DataAnalytics`;
    } else { // short / minimalist
        templateHeader = `BigQuery ${type} (${date}):\n\n`;
        templateFooter = `\n\n${link}`;
    }
    
    const totalFixedLength = templateHeader.length + templateFooter.length;
    const budget = 280 - totalFixedLength;
    
    let summary = body;
    if (summary.length > budget) {
        summary = summary.substring(0, budget - 3) + '...';
    }
    
    text = templateHeader + summary + templateFooter;
    
    tweetTextarea.value = text;
    updateCharCount();
}

// Update character counter in modal
function updateCharCount() {
    const len = tweetTextarea.value.length;
    charCounter.textContent = `${len} / 280`;
    
    if (len > 280) {
        charCounter.classList.add('danger');
        btnShareTweet.disabled = true;
    } else {
        charCounter.classList.remove('danger');
        btnShareTweet.disabled = false;
    }
}

// Copy Tweet Content to Clipboard
async function copyTweetToClipboard() {
    try {
        await navigator.clipboard.writeText(tweetTextarea.value);
        showToast('Tweet content copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy to clipboard', true);
    }
}

// Open X / Twitter Web Intent sharing
function shareTweetOnX() {
    const text = tweetTextarea.value;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=600,height=400,resizable=yes');
    closeTweetComposer();
}

// Show Toast Notification
function showToast(message, isError = false) {
    toastMessage.textContent = message;
    
    const icon = toast.querySelector('.toast-icon');
    if (isError) {
        toast.style.borderColor = 'var(--color-issue)';
        toast.style.boxShadow = 'var(--shadow-lg), 0 0 15px rgba(239, 68, 68, 0.2)';
        icon.setAttribute('data-lucide', 'alert-triangle');
        icon.style.color = 'var(--color-issue)';
    } else {
        toast.style.borderColor = 'var(--color-feature)';
        toast.style.boxShadow = 'var(--shadow-lg), 0 0 15px rgba(16, 185, 129, 0.2)';
        icon.setAttribute('data-lucide', 'check');
        icon.style.color = 'var(--color-feature)';
    }
    
    lucide.createIcons();
    toast.style.display = 'flex';
    
    // Fade out after 2.5s
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-in forwards';
        setTimeout(() => {
            toast.style.display = 'none';
            toast.style.animation = ''; // Reset animation
        }, 300);
    }, 2500);
}

// Copy Card Text directly
async function copyCardText(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Release content copied!');
    } catch (err) {
        console.error('Failed to copy card text:', err);
        showToast('Failed to copy text', true);
    }
}

// Export current filtered results to CSV file
function exportToCSV() {
    if (currentFilteredUpdates.length === 0) return;
    
    // Construct CSV Rows
    const headers = ["Date", "Category", "URL", "Description"];
    const csvRows = [headers];
    
    currentFilteredUpdates.forEach(update => {
        // Escape fields to handle quotes and newlines safely
        const escapedDate = `"${update.date.replace(/"/g, '""')}"`;
        const escapedType = `"${update.type.replace(/"/g, '""')}"`;
        const escapedLink = `"${update.link.replace(/"/g, '""')}"`;
        const escapedText = `"${update.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
        
        csvRows.push([escapedDate, escapedType, escapedLink, escapedText]);
    });
    
    // Generate CSV Blob
    const csvContent = csvRows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Download Link
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_releases_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Exported CSV file successfully!');
}

// Initialize Theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeIcon.setAttribute('data-lucide', 'moon');
    } else {
        document.body.classList.remove('light-theme');
        themeIcon.setAttribute('data-lucide', 'sun');
    }
    lucide.createIcons();
}

// Toggle Light / Dark Theme
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    if (isLight) {
        themeIcon.setAttribute('data-lucide', 'moon');
        showToast('Swapped to light theme');
    } else {
        themeIcon.setAttribute('data-lucide', 'sun');
        showToast('Swapped to dark theme');
    }
    lucide.createIcons();
}
