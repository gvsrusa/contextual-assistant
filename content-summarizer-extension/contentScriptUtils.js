// contentScriptUtils.js: Provides shared utility functions for the content script, 
// such as formatting timestamps, summary content, and handling video navigation.

function formatDuration(totalSeconds) {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) return "N/A";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  let formatted = "";
  if (hours > 0) {
    formatted += `${hours}:`;
  }
  formatted += `${minutes < 10 && hours > 0 ? '0' : ''}${minutes}:`;
  formatted += `${seconds < 10 ? '0' : ''}${seconds}`;
  return formatted;
}

function formatSummaryWithTimestamps(summary, contentType) {
  // Basic formatting, actual timestamp linking will come later in a dedicated task
  let formattedSummary = summary.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  if (contentType === 'video' || contentType === 'audio') {
    // Simple regex for placeholder, real implementation will be more robust
    formattedSummary = formattedSummary.replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g, (match, timestamp) => {
      return `<a href="#" class="cs-timestamp-link" data-time="${timestamp}">${match}</a>`;
    });
  }
  return `<p>${formattedSummary}</p>`;
}

function convertTimestampToSeconds(timestamp) {
  if (!timestamp) return 0;
  const parts = timestamp.split(':').map(Number);
  
  if (parts.some(isNaN)) {
    console.warn("Invalid characters in timestamp parts:", timestamp);
    return 0;
  }

  if (parts.length === 3) { // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) { // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) { // SS
    return parts[0];
  }
  console.warn("Invalid timestamp format for conversion:", timestamp);
  return 0;
}

function handleVideoNavigation(timeInSeconds) {
    console.log(`Attempting to navigate video to ${timeInSeconds}s`);
    // Basic YouTube handler
    if (window.location.href.includes('youtube.com')) {
        const video = document.querySelector('video.html5-main-video'); // More specific selector for YouTube
        if (video) {
            video.currentTime = timeInSeconds;
            if (video.paused) { // Only play if it was paused
                video.play();
            }
            console.log(`YouTube video time set to ${timeInSeconds}s`);
            // Attempt to scroll to the player if it's not in view
            if (typeof video.scrollIntoView === 'function') {
                video.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            console.warn("YouTube video element not found for navigation.");
        }
    }
    // TODO: Add specific handlers for other video platforms like Vimeo, Dailymotion, etc.
    // else if (window.location.href.includes('vimeo.com')) {
    //   const vimeoPlayer = ... ; // Logic to get Vimeo player instance
    //   if (vimeoPlayer && typeof vimeoPlayer.setCurrentTime === 'function') {
    //     vimeoPlayer.setCurrentTime(timeInSeconds).then(() => {
    //       if (typeof vimeoPlayer.play === 'function') vimeoPlayer.play();
    //     });
    //     // Scrolling might need platform-specific handling or a generic approach.
    //   }
    // }
    else {
        console.log("Video navigation for this specific site is not implemented. Trying generic HTML5 video approach.");
        const videos = document.querySelectorAll('video');
        if (videos.length > 0) {
            // Try to control the first video element found
            const video = videos[0]; // Target the first video element found on the page
            // It's good practice to check if methods exist before calling them on arbitrary elements
            if (typeof video.play === 'function' && typeof video.scrollIntoView === 'function') {
                video.currentTime = timeInSeconds;
                if (video.paused) {
                    video.play();
                }
                video.scrollIntoView({ behavior: 'smooth', block: 'center' });
                console.log(`Generic video time set to ${timeInSeconds}s for the first video element found.`);
            } else {
                console.warn("The first video element found does not support required methods (play, scrollIntoView).");
            }
        } else {
            console.warn("No HTML5 video element found on the page for generic navigation.");
        }
    }
}

function attachTimestampHandlersToSidebar() {
    const actualSidebarDOM = document.getElementById('content-summarizer-sidebar');
    if (!actualSidebarDOM) return;

    const timestampLinks = actualSidebarDOM.querySelectorAll('.cs-timestamp-link');
    timestampLinks.forEach(link => {
        const newLink = link.cloneNode(true); // Re-clone to ensure clean listeners
        link.parentNode.replaceChild(newLink, link);

        newLink.addEventListener('click', (e) => {
            e.preventDefault();
            const timestampStr = newLink.dataset.time;
            const seconds = convertTimestampToSeconds(timestampStr); // Use the refined function
            
            // handleVideoNavigation should be available globally in the content script scope
            // as it's defined in this file and loaded before the main content-script.js
            handleVideoNavigation(seconds);
        });
    });
}

// Note: If these functions were intended to be part of a class or module,
// the export/import mechanism would be different. For now, they are global
// within the content script execution environment, which is typical for
// scripts injected via manifest.json's `content_scripts` array.
