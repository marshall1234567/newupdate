console.log('Script loaded successfully');

// Three.js visualization setup
let scene, camera, renderer;
let analyticsMesh, particles;
let particleSystem;

function initThreeJS() {
    if (scene) return; // Prevent multiple initializations
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const container = document.getElementById('3d-analytics');
    if (!container) {
        console.error('3D analytics container not found');
        return;
    }
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(renderer.domElement);
    
    // Create main focus visualization
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        shininess: 100,
        wireframe: true,
        transparent: true,
        opacity: 0.8
    });
    
    analyticsMesh = new THREE.Mesh(geometry, material);
    scene.add(analyticsMesh);
    
    // Create particle system
    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 1000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for(let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        
        colors[i * 3] = Math.random();
        colors[i * 3 + 1] = Math.random();
        colors[i * 3 + 2] = Math.random();
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particleSystem);
    
    // Add lights
    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(0, 0, 10);
    scene.add(light);
    
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    camera.position.z = 5;
    camera.position.y = 2;
    camera.lookAt(0, 0, 0);
    
    // Start animation loop
    animate();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    const container = document.getElementById('3d-analytics');
    if (!container) return;
    
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
}

let animationFrameId = null;

function animate() {
    if (!analyticsState.visible || !scene || !analyticsMesh || !particleSystem) {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        return;
    }
    
    animationFrameId = requestAnimationFrame(animate);
    
    // Update mesh rotation
    analyticsMesh.rotation.x += 0.005;
    analyticsMesh.rotation.y += 0.01;
    
    // Update particle system
    particleSystem.rotation.y += 0.002;
    
    const positions = particleSystem.geometry.attributes.position.array;
    const colors = particleSystem.geometry.attributes.color.array;
    
    for(let i = 0; i < positions.length; i += 3) {
        // Orbital motion
        const x = positions[i];
        const z = positions[i + 2];
        const angle = Math.atan2(z, x) + (timer?.isRunning ? 0.02 : 0.005);
        const radius = Math.sqrt(x * x + z * z);
        
        positions[i] = Math.cos(angle) * radius;
        positions[i + 2] = Math.sin(angle) * radius;
        
        // Dynamic colors based on focus score
        const hue = (timer?.currentSession?.currentScore || 0) / 100;
        const time = Date.now() * 0.001;
        const color = new THREE.Color().setHSL(
            (hue + Math.sin(time + i * 0.1) * 0.1) % 1,
            0.8,
            0.5
        );
        
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.geometry.attributes.color.needsUpdate = true;
    
    // Update mesh appearance
    const pulseSpeed = timer?.isRunning ? 0.002 : 0.001;
    const pulseScale = 1 + Math.sin(Date.now() * pulseSpeed) * 0.1;
    const baseScale = 1 + ((timer?.currentSession?.currentScore || 0) / 100) * 0.5;
    analyticsMesh.scale.setScalar(baseScale * pulseScale);
    
    // Update mesh color
    const meshHue = (timer?.currentSession?.currentScore || 0) / 100;
    analyticsMesh.material.color.setHSL(meshHue, 1, 0.5);
    
    // Camera movement
    const cameraSpeed = timer?.isRunning ? 0.0002 : 0.0001;
    const cameraAngle = Date.now() * cameraSpeed;
    const cameraRadius = 5 + ((timer?.currentSession?.currentScore || 0) * 0.05);
    camera.position.x = Math.sin(cameraAngle) * cameraRadius;
    camera.position.z = Math.cos(cameraAngle) * cameraRadius;
    camera.lookAt(0, 0, 0);
    
    renderer.render(scene, camera);
}

class Timer {
    constructor(analytics) {
        this.analytics = analytics;
        this.isRunning = false;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.interval = null;
        this.currentSession = null;
        
        // Get DOM elements
        this.display = document.getElementById('timerDisplay');
        this.toggleBtn = document.getElementById('timerToggle');
        
        if (!this.display || !this.toggleBtn) {
            console.error('Timer elements not found');
            return;
        }
        
        this.toggleBtn.addEventListener('click', () => this.toggle());
        this.updateDisplay();
    }
    
    toggle() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = Date.now() - this.elapsedTime;
        this.currentSession = {
            id: Date.now(),
            startTime: this.startTime,
            duration: 0,
            focusScores: [],
            currentScore: 0
        };
        
        this.interval = setInterval(() => this.update(), 100);
        this.toggleBtn.textContent = 'Stop Timer';
        
        // Hide analytics when starting
        analyticsState.hide();
    }
    
    stop() {
        if (!this.isRunning) return;
        
        clearInterval(this.interval);
        this.isRunning = false;
        this.currentSession.duration = Date.now() - this.startTime;
        this.elapsedTime = this.currentSession.duration;
        
        // Calculate final score
        this.currentSession.currentScore = this.calculateFocusScore();
        
        // Save session
        if (this.analytics) {
            this.analytics.addSession(this.currentSession);
        }
        
        this.toggleBtn.textContent = 'Start Timer';
        this.currentSession = null;
        
        // Show analytics when stopped
        analyticsState.show();
    }
    
    update() {
        this.elapsedTime = Date.now() - this.startTime;
        
        // Update current session
        if (this.currentSession) {
            this.currentSession.duration = this.elapsedTime;
            this.currentSession.currentScore = this.calculateFocusScore();
            this.currentSession.focusScores.push({
                time: Date.now(),
                value: this.currentSession.currentScore
            });
        }
        
        this.updateDisplay();
    }
    
    calculateFocusScore() {
        // Simple scoring based on duration (0-100 scale)
        const minutes = this.elapsedTime / 60000;
        return Math.min(100, Math.floor(minutes * 2));
    }
    
    updateDisplay() {
        const totalSeconds = Math.floor(this.elapsedTime / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        this.display.textContent = 
            `${hours.toString().padStart(2, '0')}:` +
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}`;
    }
}

class Analytics {
    constructor() {
        this.sessions = JSON.parse(localStorage.getItem('focusSessions')) || [];
        this.chart = null;
        
        // Get DOM elements
        this.todayFocus = document.getElementById('todayFocus');
        this.weeklyAverage = document.getElementById('weeklyAverage');
        this.chartCanvas = document.getElementById('analyticsChart');
        this.section = document.getElementById('analyticsSection');
        
        // Initialize
        this.init();
    }
    
    init() {
        // Check for required elements
        if (!this.todayFocus || !this.weeklyAverage || !this.chartCanvas || !this.section) {
            console.error('Analytics elements not found');
            return;
        }
        
        // Initialize chart
        this.initChart();
        
        // Update stats
        this.updateStats();
    }
    
    initChart() {
        if (!this.chartCanvas) return;
        
        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Get chart data
        const chartData = this.prepareChartData();
        
        // Create new chart
        this.chart = new Chart(this.chartCanvas, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Session Duration (min)',
                    data: chartData.durations,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Duration (min)'
                        }
                    }
                }
            }
        });
    }
    
    prepareChartData() {
        // Last 7 sessions for chart
        const recentSessions = this.sessions.slice(-7);
        const labels = [];
        const durations = [];
        
        recentSessions.forEach(session => {
            const date = new Date(session.startTime);
            labels.push(date.toLocaleDateString());
            durations.push(Math.round(session.duration / 60000));
        });
        
        // If no sessions, show empty chart
        if (recentSessions.length === 0) {
            labels.push('No sessions yet');
            durations.push(0);
        }
        
        return { labels, durations };
    }
    
    addSession(session) {
        // Add focus score calculation if not present
        if (!session.focusScores || session.focusScores.length === 0) {
            session.focusScores = [{
                time: session.startTime + session.duration,
                value: Math.min(100, Math.floor(session.duration / 60000 * 2))
            }];
        }
        
        this.sessions.push(session);
        localStorage.setItem('focusSessions', JSON.stringify(this.sessions));
        this.updateChart();
        this.updateStats();
    }
    
    updateChart() {
        if (!this.chart) return;
        
        const chartData = this.prepareChartData();
        this.chart.data.labels = chartData.labels;
        this.chart.data.datasets[0].data = chartData.durations;
        this.chart.update();
    }
    
    updateStats() {
        // Today's total focus time
        const todayTotal = this.getTodayTotal();
        
        // Weekly average
        const weekAverage = this.getWeekAverage();
        
        // Update UI
        this.todayFocus.textContent = this.formatTime(todayTotal);
        this.weeklyAverage.textContent = this.formatTime(weekAverage);
    }
    
    getTodayTotal() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return this.sessions
            .filter(session => new Date(session.startTime) >= today)
            .reduce((total, session) => total + session.duration, 0);
    }
    
    getWeekAverage() {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const weeklySessions = this.sessions
            .filter(session => new Date(session.startTime) >= oneWeekAgo);
        
        if (weeklySessions.length === 0) return 0;
        
        const total = weeklySessions.reduce((sum, session) => sum + session.duration, 0);
        return total / weeklySessions.length;
    }
    
    formatTime(ms) {
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes}m`;
    }
}

// Analytics state management
const analyticsState = {
    visible: false,
    initialized: false,
    updateLoopActive: false,
    lastUpdateTime: 0,
    transitionTimeout: null,
    transitioning: false,
    
    show() {
        if (this.transitioning) return;
        this.transitioning = true;
        this.visible = true;
        
        const analyticsSection = document.getElementById('analyticsSection');
        if (!analyticsSection) return;
        
        analyticsSection.style.display = 'block';
        
        // Initialize Three.js only once
        if (!this.initialized) {
            initThreeJS();
            this.initialized = true;
        }
        
        // Start animation if scene exists
        if (scene) {
            animate();
        }
        
        // Clear any pending hide timeout
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }
        
        // Start the update loop
        this.startUpdateLoop();
        
        // Show with transition
        requestAnimationFrame(() => {
            analyticsSection.classList.add('active');
            setTimeout(() => {
                this.transitioning = false;
            }, 500);
        });
    },
    
    hide() {
        if (this.transitioning) return;
        this.transitioning = true;
        this.visible = false;
        
        const analyticsSection = document.getElementById('analyticsSection');
        if (!analyticsSection) return;
        
        analyticsSection.classList.remove('active');
        
        // Clear any existing timeout
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
        }
        
        // Set new timeout for hiding
        this.transitionTimeout = setTimeout(() => {
            if (!this.visible) {
                analyticsSection.style.display = 'none';
                // Stop animation loop
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
                // Reset update loop
                this.updateLoopActive = false;
            }
            this.transitioning = false;
        }, 500);
    },
    
    startUpdateLoop() {
        if (this.updateLoopActive) return;
        this.updateLoopActive = true;
        this.lastUpdateTime = Date.now();
        
        const update = () => {
            if (!this.visible || !this.updateLoopActive) {
                this.updateLoopActive = false;
                return;
            }
            
            this.lastUpdateTime = Date.now();
            requestAnimationFrame(update);
        };
        
        requestAnimationFrame(update);
    },
    
    cleanup() {
        this.visible = false;
        this.updateLoopActive = false;
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }
        
        if (scene) {
            // Dispose Three.js resources
            scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            renderer.dispose();
            scene = null;
            camera = null;
            renderer = null;
            analyticsMesh = null;
            particleSystem = null;
        }
    }
};

// Global variables
let timer;
let analytics;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing application...');
    
    // Verify elements exist
    if (!document.getElementById('timerDisplay') || !document.getElementById('timerToggle')) {
        console.error('Timer elements missing!');
        return;
    }
    
    // Initialize analytics first
    analytics = new Analytics();
    
    // Then initialize timer with analytics reference
    timer = new Timer(analytics);
    
    // Set up analytics toggle
    const analyticsToggle = document.getElementById('analyticsToggle');
    if (analyticsToggle) {
        analyticsToggle.addEventListener('click', () => {
            if (analyticsState.visible) {
                analyticsState.hide();
                analyticsToggle.textContent = 'Show Analytics';
            } else {
                analyticsState.show();
                analyticsToggle.textContent = 'Hide Analytics';
            }
        });
    }
    
    // Set initial analytics state
    const analyticsSection = document.getElementById('analyticsSection');
    if (analyticsSection) {
        analyticsSection.style.display = 'none';
    }
    
    // Make available for debugging
    window.timer = timer;
    window.analytics = analytics;
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    analyticsState.cleanup();
    if (timer?.isRunning) {
        timer.stop();
    }
});