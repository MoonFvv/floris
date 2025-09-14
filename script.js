// --- AANGEPAST: WAARDES VERSNELD ---
const MONOLITH_SPACING = 25;
const CAMERA_DISTANCE = 10;
const SCROLL_COOLDOWN = 1000; // Was 1800

const projects = [
    { 
        title: 'FLORIS VROEGH', 
        category: 'VIDEOGRAPHER & WEB DESIGN HOBBYIST', 
        videoSrc: { webm: 'knockin.mp4', mp4: 'knockin.mp4' }
    },
    { 
        title: 'RECENT WORK', 
        category: 'Een selectie van mijn nieuwste projecten op het gebied van videografie en motion design. <br>Van concept tot eindproduct.', 
        videoSrc: { webm: 'knockin.mp4', mp4: 'knockin.mp4' } 
    },
    { 
        title: '3D RENDERS', 
        category: 'MOTION DESIGN', 
        videoSrc: { webm: 'knockin.mp4', mp4: 'knockin.mp4' }
    },
    { 
        title: 'ALEC JUNGERIUS', 
        category: 'WEB DESIGN', 
        videoSrc: { webm: 'alecwebsitehd.mov', mp4: 'alecwebsitehd.mov' }
    },
    {
        title: 'ABOUT & CONTACT',
        category: `Gepassioneerd door visuele verhalen en digitale ervaringen. Mijn vaardigheden omvatten:
                   <br><br>
                   Videografie & Editing <br>
                   Web Design & Development <br>
                   Motion Graphics
                   <br><br>
                   Laten we samenwerken. Neem contact op via e-mail of vind mij op:
                   <br>
                   <a href="mailto:FlorisVroegh@icloud.com">FlorisVroegh@icloud.com</a>
                   <br>
                   <a href="https://www.linkedin.com/in/jouwprofiel" target="_blank">LinkedIn</a> / <a href="https://www.instagram.com/jouwprofiel" target="_blank">Instagram</a>`,
        videoSrc: { webm: 'knockin.mp4', mp4: 'knockin.mp4' }
    }
];

// --- UI ELEMENTEN ---
const ui = {
    title: document.getElementById('project-title'),
    category: document.getElementById('project-category'),
    current: document.getElementById('current-project'),
    total: document.getElementById('total-projects'),
    info: document.querySelector('.project-info'),
    loader: document.querySelector('.loader'),
    menuHome: document.getElementById('menu-home'),
    menuAbout: document.getElementById('menu-about'),
    console: {
        container: document.getElementById('command-console'),
        input: document.getElementById('console-input'),
        openBtn: document.getElementById('console-open-btn')
    }
};

class WebGLApp {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.cameraGroup = new THREE.Group();
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('webgl-canvas'),
            antialias: true,
            powerPreference: 'high-performance'
        });
        
        this.monoliths = [];
        this.allVideos = [];
        this.mouse = new THREE.Vector2();
        this.clock = new THREE.Clock();
        this.stardust = null;

        this.currentIndex = -1;
        this.isAnimating = false;
        this.lastScrollTime = 0;
        this.videosUnlocked = false;
        this.hasDeviceOrientation = false;
        this.isConsoleOpen = false;

        this.init();
    }

    init() {
        this.setupRenderer();
        this.setupCamera();
        this.setupEnvironment();
        this.createStardust();
        this.loadAssets();
        this.addEventListeners();
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
    }

    setupCamera() {
        this.camera.position.z = CAMERA_DISTANCE;
        this.cameraGroup.add(this.camera);
        this.cameraGroup.position.y = 3.0;
        this.cameraGroup.rotation.z = -0.1;
        this.scene.add(this.cameraGroup);
    }

    setupEnvironment() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambientLight);
        this.scene.fog = new THREE.Fog(0x111111, 20, 100);

        const sunLight = new THREE.DirectionalLight(0xffddaa, 1.5);
        sunLight.position.set(0, 30, -50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.set(1024, 1024);
        this.scene.add(sunLight);
    }

    createStardust() {
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 10000;
        const posArray = new Float32Array(particlesCount * 3);

        for(let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * (MONOLITH_SPACING * projects.length);
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.05,
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });

        this.stardust = new THREE.Points(particlesGeometry, particlesMaterial);
        this.scene.add(this.stardust);
    }

    loadAssets() {
        const loadingManager = new THREE.LoadingManager(() => {
            gsap.to(ui.loader, { opacity: 0, duration: 1.5, onComplete: () => {
                ui.loader.style.display = 'none';
                this.navigateTo(0, true);
                this.animate();
            }});
        });
        const textureLoader = new THREE.TextureLoader(loadingManager);
        const concreteTexture = textureLoader.load('concrete.jpg');
        
        this.createMonoliths(concreteTexture);
    }
    
    createMonoliths(concreteTexture) {
        const size = { w: 20, h: 11.25, d: 0.9 };
        const concreteMaterial = new THREE.MeshStandardMaterial({ map: concreteTexture, roughness: 0.8, metalness: 0.2 });

        projects.forEach((project, i) => {
            const video = document.createElement('video');
            video.muted = true; 
            video.loop = true; 
            video.playsInline = true;
            video.crossOrigin = 'anonymous';

            const sourceWebm = document.createElement('source');
            sourceWebm.src = project.videoSrc.webm;
            sourceWebm.type = 'video/webm';

            const sourceMp4 = document.createElement('source');
            sourceMp4.src = project.videoSrc.mp4;
            sourceMp4.type = 'video/mp4';

            video.appendChild(sourceWebm);
            video.appendChild(sourceMp4);

            video.load();
            this.allVideos.push(video);
            
            const videoTexture = new THREE.VideoTexture(video);
            videoTexture.encoding = THREE.sRGBEncoding;
            
            const frontMaterial = new THREE.MeshBasicMaterial({ map: videoTexture });
            
            const monolith = new THREE.Mesh(
                new THREE.BoxGeometry(size.w, size.h, size.d),
                [concreteMaterial, concreteMaterial, concreteMaterial, concreteMaterial, frontMaterial, concreteMaterial]
            );

            monolith.position.set(0, (size.h / 2) + 0.5, -i * MONOLITH_SPACING);
            monolith.rotation.set(0, -0.2, 0.05);
            monolith.castShadow = true;
            monolith.receiveShadow = true;
            monolith.userData.video = video;

            this.scene.add(monolith);
            this.monoliths.push(monolith);
        });
    }

    navigateTo(index, instant = false) {
        if (this.isAnimating || index === this.currentIndex || index < 0 || index >= projects.length) return;

        this.isAnimating = true;
        const previousIndex = this.currentIndex;
        this.currentIndex = index;
        const targetMonolith = this.monoliths[this.currentIndex];

        ui.info.classList.remove('is-interactive');
        if (this.currentIndex === projects.length - 1) {
            ui.info.classList.add('is-interactive');
        }

        if (previousIndex !== -1 && this.monoliths[previousIndex].userData.video) {
            this.monoliths[previousIndex].userData.video.pause();
        }
        targetMonolith.userData.video.currentTime = 0;
        targetMonolith.userData.video.play().catch(e => console.error("Video play failed:", e));

        const updateUIContent = () => {
            const project = projects[this.currentIndex];
            ui.title.textContent = project.title;
            ui.category.innerHTML = project.category;
            ui.current.textContent = String(this.currentIndex + 1).padStart(2, '0');
            ui.total.textContent = String(projects.length).padStart(2, '0');
        };
        
        if (instant) {
            this.cameraGroup.position.z = targetMonolith.position.z;
            updateUIContent();
            ui.info.style.opacity = 1;
            ui.info.style.transform = 'translateY(0)';
            this.isAnimating = false;
            return;
        }
        
        // --- AANGEPAST: GSAP TIMELINE VERSNELD ---
        const tl = gsap.timeline({ onComplete: () => { this.isAnimating = false; } });
        tl.to(ui.info, { transform: 'translateY(20px)', opacity: 0, duration: 0.5, ease: 'power3.in' }, 0); // Was 0.8s
        tl.to(this.cameraGroup.position, { z: targetMonolith.position.z, duration: 1.5, ease: 'power2.inOut' }, 0); // Was 2.5s
        tl.call(updateUIContent, null, 0.75); // Was 1.25s
        tl.to(ui.info, { transform: 'translateY(0)', opacity: 1, duration: 0.7, ease: 'power3.out' }, 0.8); // Was 1.0s en 1.5s
    }

    unlockVideos() {
        if (this.videosUnlocked) return;
        this.allVideos.forEach(v => { v.play().then(() => v.pause()); });
        this.videosUnlocked = true;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const elapsedTime = this.clock.getElapsedTime();

        if (this.stardust) {
            this.stardust.rotation.y = elapsedTime * 0.01;
        }

        if (this.currentIndex >= 0 && !this.isAnimating) {
            const currentMonolith = this.monoliths[this.currentIndex];
            const parallaxX = this.mouse.x * 0.1;
            const parallaxY = -this.mouse.y * 0.1;
            this.camera.position.x += (parallaxX - this.camera.position.x) * 0.05;
            this.camera.position.y += (parallaxY - this.camera.position.y) * 0.05;
            currentMonolith.rotation.y += ((-this.mouse.x * 0.05) - currentMonolith.rotation.y) * 0.05;
            currentMonolith.rotation.x += ((-this.mouse.y * 0.05) - currentMonolith.rotation.x) * 0.05;
            this.camera.lookAt(currentMonolith.position);
        }

        this.renderer.render(this.scene, this.camera);
    }
    
    toggleConsole(forceState) {
        this.isConsoleOpen = forceState !== undefined ? forceState : !this.isConsoleOpen;
        if (this.isConsoleOpen) {
            ui.console.container.classList.add('is-visible');
            ui.console.input.focus();
        } else {
            ui.console.container.classList.remove('is-visible');
            ui.console.input.blur();
            ui.console.input.value = '';
        }
    }

    processCommand() {
        const command = ui.console.input.value.toLowerCase().trim();
        const parts = command.split(' ');
        const action = parts[0];
        const arg = parts[1];

        console.log(`Executing command: ${command}`);

        switch(action) {
            case 'help':
                console.log('--- AVAILABLE COMMANDS ---');
                console.log('home: Navigate to the first project.');
                console.log('about: Navigate to the last project.');
                console.log('goto [number]: Navigate to a specific project number (e.g., goto 3).');
                console.log('list: Show a list of all project titles.');
                break;
            case 'list':
                console.log('--- PROJECT LIST ---');
                projects.forEach((p, i) => console.log(`${i + 1}: ${p.title}`));
                break;
            case 'home':
                this.navigateTo(0);
                this.toggleConsole(false);
                break;
            case 'about':
                this.navigateTo(projects.length - 1);
                this.toggleConsole(false);
                break;
            case 'goto':
                const index = parseInt(arg, 10) - 1;
                if (!isNaN(index) && index >= 0 && index < projects.length) {
                    this.navigateTo(index);
                    this.toggleConsole(false);
                } else {
                    console.error(`Invalid project number: ${arg}`);
                }
                break;
            default:
                console.warn(`Unknown command: ${action}`);
        }

        if (action !== 'help' && action !== 'list') {
             ui.console.input.value = '';
        }
    }
    
    addEventListeners() {
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        if (window.DeviceOrientationEvent) {
             window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
        }
        window.addEventListener('wheel', this.handleScroll.bind(this), { passive: false });
        let touchStartY = 0;
        window.addEventListener('touchstart', (e) => { 
            this.unlockVideos();
            touchStartY = e.touches[0].clientY; 
        }, { passive: true });
        window.addEventListener('touchend', (e) => {
            if (this.isConsoleOpen) return;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaY = touchStartY - touchEndY;
            if (Math.abs(deltaY) > 50) { 
                const now = Date.now();
                if (this.isAnimating || now - this.lastScrollTime < SCROLL_COOLDOWN) return;
                this.navigateTo(this.currentIndex + (deltaY > 0 ? 1 : -1));
                this.lastScrollTime = now;
            }
        }, { passive: false });
        window.addEventListener('resize', this.handleResize.bind(this));
        ui.menuHome.addEventListener('click', () => this.navigateTo(0));
        ui.menuAbout.addEventListener('click', () => this.navigateTo(projects.length - 1));
        ui.console.openBtn.addEventListener('click', () => this.toggleConsole());
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'p' && !this.isConsoleOpen) {
                e.preventDefault();
                this.toggleConsole(true);
            } else if (e.key === 'Escape' && this.isConsoleOpen) {
                this.toggleConsole(false);
            }
        });
        ui.console.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.processCommand();
            }
        });
    }
    
    handleScroll(e) {
        if (this.isConsoleOpen) return;
        e.preventDefault();
        this.unlockVideos();
        const now = Date.now();
        if (this.isAnimating || now - this.lastScrollTime < SCROLL_COOLDOWN) return;
        if (Math.abs(e.deltaY) > 5) {
            this.navigateTo(this.currentIndex + (e.deltaY > 0 ? 1 : -1));
            this.lastScrollTime = now;
        }
    }
    
    handleMouseMove(e) {
        if (this.hasDeviceOrientation) return; 
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
    
    handleDeviceOrientation(event) {
        if (!this.hasDeviceOrientation) this.hasDeviceOrientation = true;
        const gamma = event.gamma;
        const beta = event.beta;
        this.mouse.x = Math.max(-1, Math.min(1, gamma / 30));
        this.mouse.y = Math.max(-1, Math.min(1, (beta - 45) / 30));
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new WebGLApp();
});