document.addEventListener("DOMContentLoaded", () => {
    /***********************
     * SIDEBAR TOGGLE (Common)
     ***********************/
    const toggleButton = document.querySelector('.toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const closeButton = document.querySelector('.close-btn');
    
    if (toggleButton && sidebar && closeButton) {
      const buttonText = toggleButton.querySelector('span');
      const buttonIcon = toggleButton.querySelector('i');
      
      const hideToggleButton = () => {
        toggleButton.style.display = 'none';
      };
      const showToggleButton = () => {
        toggleButton.style.display = 'block';
      };
      
      toggleButton.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (sidebar.classList.contains('open')) {
          buttonText.textContent = "Close Menu";
          buttonIcon.classList.remove('fa-bars');
          buttonIcon.classList.add('fa-times');
          hideToggleButton();
        } else {
          buttonText.textContent = "Menu";
          buttonIcon.classList.remove('fa-times');
          buttonIcon.classList.add('fa-bars');
          showToggleButton();
        }
      });
      
      closeButton.addEventListener('click', () => {
        sidebar.classList.remove('open');
        toggleButton.classList.remove('open');
        buttonText.textContent = "Menu";
        buttonIcon.classList.remove('fa-times');
        buttonIcon.classList.add('fa-bars');
        showToggleButton();
      });
    }
    
    /***********************
     * MEDIA PLAYER CONTROLS (Home Page)
     ***********************/
    const playPauseBtn = document.getElementById("play-pause-btn");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const volumeSlider = document.getElementById("volume-slider");
    const volumeValue = document.getElementById("volume-value");
    
    if (playPauseBtn && prevBtn && nextBtn && volumeSlider && volumeValue) {
      let isPlayingMedia = false;
      playPauseBtn.addEventListener("click", () => {
        isPlayingMedia = !isPlayingMedia;
        playPauseBtn.innerHTML = isPlayingMedia
          ? '<i class="fas fa-pause"></i>'
          : '<i class="fas fa-play"></i>';
      });
      prevBtn.addEventListener("click", () => {
        console.log("Skipping to previous track...");
      });
      nextBtn.addEventListener("click", () => {
        console.log("Skipping to next track...");
      });
      volumeSlider.addEventListener("input", (e) => {
        volumeValue.textContent = e.target.value;
        console.log("Volume level: " + e.target.value);
      });
    }
    
    /***********************
     * EXPERIENCE CARDS (Resume Page)
     ***********************/
    const experienceCards = document.querySelectorAll('.experience-card');
    if (experienceCards.length > 0) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.0 });
      experienceCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        observer.observe(card);
      });
    }
    
    /***********************
     * PROJECTS PAGE FUNCTIONALITY (Progress Bar, Now Playing, Shuffle, Next, Like, Search)
     ***********************/
    // Check if the progress bar exists on the page (used on projects page)
    const projProgressBar = document.querySelector('.progress-bar');
    const projPauseBtn = document.getElementById("pauseBtn");
    const projShuffleBtn = document.getElementById("shuffleBtn");
    const projNextBtn = document.getElementById("nextBtn");
    const projLikeBtn = document.getElementById("likeBtn");
    const projSearchInput = document.getElementById("searchInput");
    const projAlbumsGrid = document.getElementById("albumsGrid");
    
    // Now Playing card elements on projects page
    const projNowPlayingCoverImg = document.querySelector('.now-playing-cover img');
    const projNowPlayingTitle = document.querySelector('.now-playing-info h4');
    const projNowPlayingDesc = document.querySelector('.now-playing-info p');
    
    if (projProgressBar && projPauseBtn && projNowPlayingCoverImg && projNowPlayingTitle && projNowPlayingDesc) {
      // Build projects array from album squares
      let projects = Array.from(document.querySelectorAll('.album-square')).map(el => {
        return {
          title: el.getAttribute('data-title') || "Project",
          tags: el.getAttribute('data-tags') || "No Tags",
          cover: el.querySelector('img').src
        };
      });
      let currentProjectIndex = 0;
    
      function updateNowPlaying(index) {
        const project = projects[index];
        projNowPlayingTitle.textContent = project.title;
        projNowPlayingDesc.textContent = project.tags;
        projNowPlayingCoverImg.src = project.cover;
      }
      updateNowPlaying(currentProjectIndex);
    
      // Progress Bar via requestAnimationFrame
      const totalDuration = 30000; // 30 seconds
      let startTime = null;
      let accumulatedTime = 0;
      let animationFrameRequest = null;
      let isPlayingProgress = true;
    
      function updateProgress(timestamp) {
        if (!startTime) {
          startTime = timestamp;
        }
        const elapsed = (timestamp - startTime) + accumulatedTime;
        let progress = (elapsed / totalDuration) * 100;
        if (progress >= 100) {
          progress = 100;
          // Optionally, stop or reset here
        }
        projProgressBar.style.width = progress + "%";
        if (isPlayingProgress && progress < 100) {
          animationFrameRequest = requestAnimationFrame(updateProgress);
        }
      }
    
      function startProgress() {
        isPlayingProgress = true;
        startTime = null;
        animationFrameRequest = requestAnimationFrame(updateProgress);
      }
    
      function pauseProgress() {
        isPlayingProgress = false;
        if (animationFrameRequest) {
          cancelAnimationFrame(animationFrameRequest);
          animationFrameRequest = null;
        }
        if (startTime !== null) {
          accumulatedTime += performance.now() - startTime;
        }
      }
    
      function resetProgress() {
        isPlayingProgress = true;
        startTime = null;
        accumulatedTime = 0;
        projProgressBar.style.width = "0%";
        animationFrameRequest = requestAnimationFrame(updateProgress);
      }
    
      // Start progress on load
      startProgress();
    
      projPauseBtn.addEventListener("click", () => {
        if (isPlayingProgress) {
          pauseProgress();
          projPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
          startProgress();
          projPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
      });
    
      // Next button logic: reset progress and load next project
      if (projNextBtn) {
        projNextBtn.addEventListener("click", () => {
          pauseProgress();
          resetProgress();
          currentProjectIndex = (currentProjectIndex + 1) % projects.length;
          updateNowPlaying(currentProjectIndex);
        });
      }
    
      // Shuffle button: randomize projects array and update now playing
      if (projShuffleBtn) {
        function shuffleArray(arr) {
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        }
        projShuffleBtn.addEventListener("click", () => {
          projects = shuffleArray(projects);
          currentProjectIndex = 0;
          updateNowPlaying(currentProjectIndex);
          pauseProgress();
          resetProgress();
        });
      }
    
      // Like button logic
      let liked = false;
      if (projLikeBtn) {
        projLikeBtn.addEventListener("click", () => {
          liked = !liked;
          if (liked) {
            projLikeBtn.style.backgroundColor = "#ff4f4f";
          } else {
            projLikeBtn.style.backgroundColor = "#1db954";
          }
        });
      }
    
      // Search functionality: filter album cards based on data attributes
      if (projSearchInput && projAlbumsGrid) {
        projSearchInput.addEventListener("input", (e) => {
          const query = e.target.value.toLowerCase();
          const albums = Array.from(projAlbumsGrid.children);
          albums.forEach(album => {
            const tags = album.getAttribute("data-tags") || "";
            const title = album.getAttribute("data-title") || "";
            if (tags.toLowerCase().includes(query) || title.toLowerCase().includes(query)) {
              album.style.display = "flex";
            } else {
              album.style.display = "none";
            }
          });
        });
      }
    }
    
    /***********************
     * ADDITIONAL PAGE-SPECIFIC CODE (if needed)
     ***********************/
    // For other pages (like Contact), you can add any extra interactivity here.
  });
  