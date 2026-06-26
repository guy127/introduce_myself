const root = document.documentElement;
const themeBtn = document.getElementById('themeBtn');
const themeIcon = document.getElementById('themeIcon');
const themeText = document.getElementById('themeText');
const scrollProgress = document.getElementById('scrollProgress');
const cursorGlow = document.getElementById('cursorGlow');
const weatherContent = document.getElementById('weatherContent');
const countryContent = document.getElementById('countryContent');
const refreshApiBtn = document.getElementById('refreshApiBtn');
const apiUpdatedText = document.getElementById('apiUpdatedText');

const WEATHER_API = 'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation_probability&forecast_days=1&timezone=Asia%2FBangkok';
const GITHUB_API = 'https://api.github.com/repos/public-apis/public-apis';

function setTheme(theme) {
    if (theme === 'light') {
        root.setAttribute('data-theme', 'light');
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Light';
    } else {
        root.removeAttribute('data-theme');
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Night';
    }
    localStorage.setItem('theme', theme);
}

setTheme(localStorage.getItem('theme') || 'dark');

themeBtn.addEventListener('click', () => {
    const isLight = root.getAttribute('data-theme') === 'light';
    setTheme(isLight ? 'dark' : 'light');
});

function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    scrollProgress.style.width = `${progress}%`;
}

window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

window.addEventListener('pointermove', (event) => {
    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;
});

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.16 });

document.querySelectorAll('.reveal').forEach((item) => revealObserver.observe(item));

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
    });
}, { threshold: 0.6 });

document.querySelectorAll('[data-counter]').forEach((item) => counterObserver.observe(item));

function animateCounter(element) {
    const target = Number(element.dataset.counter);
    const duration = target > 1000 ? 1400 : 900;
    const startTime = performance.now();

    function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(target * eased);
        element.textContent = String(current);

        if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

document.querySelectorAll('.tilt-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const rotateY = ((x / rect.width) - 0.5) * 8;
        const rotateX = ((y / rect.height) - 0.5) * -8;
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('pointerleave', () => {
        card.style.transform = '';
    });
});

document.querySelectorAll('.magnetic').forEach((button) => {
    button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        button.style.transform = `translate(${x * 0.08}px, ${y * 0.12}px)`;
    });

    button.addEventListener('pointerleave', () => {
        button.style.transform = '';
    });
});

function setSkeleton() {
    weatherContent.className = 'api-content skeleton-state';
    weatherContent.innerHTML = `
        <div class="skeleton large"></div>
        <div class="skeleton"></div>
        <div class="skeleton short"></div>
    `;

    countryContent.className = 'api-content skeleton-state';
    countryContent.innerHTML = `
        <div class="skeleton large"></div>
        <div class="skeleton"></div>
        <div class="skeleton short"></div>
    `;
}

async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
}

async function loadOpenApis() {
    document.body.classList.add('loading');
    refreshApiBtn.disabled = true;
    refreshApiBtn.textContent = 'กำลัง Refresh...';
    setSkeleton();

    const [weatherResult, githubResult] = await Promise.allSettled([
        fetchJson(WEATHER_API),
        fetchJson(GITHUB_API)
    ]);

    if (weatherResult.status === 'fulfilled') {
        renderWeather(weatherResult.value);
    } else {
        renderError(weatherContent, 'ไม่สามารถเชื่อมต่อ Open-Meteo API ได้ ลองเปิดผ่าน Live Server หรือเช็กอินเทอร์เน็ตอีกครั้ง');
    }

    if (githubResult.status === 'fulfilled') {
        renderGithub(githubResult.value, 'LIVE API');
    } else {
        renderGithub(getGithubFallback(), 'FALLBACK DATA');
    }

    const now = new Date();
    apiUpdatedText.textContent = `อัปเดตล่าสุด ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    refreshApiBtn.disabled = false;
    refreshApiBtn.textContent = '↻ Refresh API';
    document.body.classList.remove('loading');
}

function renderWeather(data) {
    const current = data.current;
    const meta = getWeatherDetail(current.weather_code);
    const temp = Number(current.temperature_2m).toFixed(1);
    const feelsLike = Number(current.apparent_temperature).toFixed(1);
    const humidity = current.relative_humidity_2m;
    const wind = Number(current.wind_speed_10m).toFixed(1);

    weatherContent.className = 'api-content';
    weatherContent.innerHTML = `
        <div class="weather-main">
            <div class="weather-emoji" aria-hidden="true">${meta.emoji}</div>
            <div>
                <div class="temp-value">${temp}<span>°C</span></div>
                <p>${meta.text}</p>
            </div>
        </div>
        <div class="api-metrics">
            <div class="metric-pill"><strong>${feelsLike}°C</strong><span>Feels like</span></div>
            <div class="metric-pill"><strong>${humidity}%</strong><span>Humidity</span></div>
            <div class="metric-pill"><strong>${wind} km/h</strong><span>Wind speed</span></div>
            <div class="metric-pill"><strong>Bangkok</strong><span>Reference city</span></div>
        </div>
    `;
}

function renderGithub(repo, statusText = 'LIVE API') {
    const updatedDate = repo.updated_at ? new Date(repo.updated_at).toLocaleDateString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }) : '-';

    countryContent.className = 'api-content';
    countryContent.innerHTML = `
        <div class="country-title">
            <div class="repo-icon" aria-hidden="true">{ }</div>
            <div>
                <h4>${repo.full_name}</h4>
                <p>${repo.description || 'Public API repository loaded from GitHub REST API'}</p>
            </div>
        </div>
        <div class="api-metrics">
            <div class="metric-pill"><strong>${formatNumber(repo.stargazers_count)}</strong><span>Stars</span></div>
            <div class="metric-pill"><strong>${formatNumber(repo.forks_count)}</strong><span>Forks</span></div>
            <div class="metric-pill"><strong>${repo.language || '-'}</strong><span>Language</span></div>
            <div class="metric-pill"><strong>${updatedDate}</strong><span>Last updated</span></div>
            <div class="metric-pill"><strong>${statusText}</strong><span>Status</span></div>
        </div>
    `;
}

function getGithubFallback() {
    return {
        full_name: 'public-apis/public-apis',
        description: 'A collective list of free APIs for use in software and web development.',
        stargazers_count: 0,
        forks_count: 0,
        language: 'Python',
        updated_at: new Date().toISOString()
    };
}

function renderError(target, message) {
    target.className = 'api-content';
    target.innerHTML = `<div class="api-error">⚠️ ${message}</div>`;
}

function getWeatherDetail(code) {
    if (code === 0) return { emoji: '☀️', text: 'ท้องฟ้าแจ่มใส' };
    if ([1, 2, 3].includes(code)) return { emoji: '⛅', text: 'มีเมฆบางส่วนถึงเมฆมาก' };
    if ([45, 48].includes(code)) return { emoji: '🌫️', text: 'มีหมอกลง' };
    if ([51, 53, 55, 61, 63, 65].includes(code)) return { emoji: '🌧️', text: 'มีฝนตก' };
    if ([80, 81, 82, 95, 96, 99].includes(code)) return { emoji: '⛈️', text: 'ฝนฟ้าคะนอง' };
    return { emoji: '🌡️', text: 'สภาพอากาศปกติ' };
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('th-TH');
}

refreshApiBtn.addEventListener('click', loadOpenApis);
loadOpenApis();
