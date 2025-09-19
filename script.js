// --- CONFIG & PROJECT DATA ---
const MONOLITH_SPACING = 25;
const CAMERA_DISTANCE = 10;
// GEWIJZIGD: Snellere cooldown
const SCROLL_COOLDOWN = 1800;

const projects = [
    { 
        title: 'FLORIS VROEGH', 
        category: 'VIDEOGRAPHER & WEB DESIGN HOBBYIST', 
        videoSrc: { webm: 'https://images.guns.lol/JzuPZtDHoj10LAuJaF68FBDKjdrWn3BtIpbJsfygV75Bk.mp4', mp4: 'https://images.guns.lol/JzuPZtDHoj10LAuJaF68FBDKjdrWn3BtIpbJsfygV75Bk.mp4' }
    },
    { 
        title: 'ALEC JUNGERIUS', 
        category: 'WEB DESIGN', 
        videoSrc: { webm: 'https://images.guns.lol/JzuPZtDHoj10LAuJaF68FBDKjdrWn3BtIpbJsfygV75Bk.mp4', mp4: 'https://images.guns.lol/JzuPZtDHoj10LAuJaF68FBDKjdrWn3BtIpbJsfygV75Bk.mp4' }
    },
    { 
        title: '3D RENDERS', 
        category: 'MOTION DESIGN', 
        videoSrc: { webm: 'https://images.guns.lol/JzuPZtDHoj10LAuJaF68FBDKjdrWn3BtIpbJsfygV75Bk.mp4', mp4: 'https://images.guns.lol/JzuPZtDHoj10LAuJaF68FBDKjdrWn3BtIpbJsfygV75Bk.mp4' }
    },
    {
        title: 'ABOUT & CONTACT',
        category: 'Een creatieve developer met een passie voor immersive web experiences. Laten we samen iets bouwen. \n\n FlorisVroegh@icloud.com',
        videoSrc: { webm: 'https://images.guns.lol/JzuPZtDHoj10LAuJaF68FBDKjdrWn3BtIpbJsfygV75Bk.mp4', mp4: 'https://images.guns.lol/JzuPZtDHoj10LAuJaF68FBDKjdrWn3BtIpbJsfygV75Bk.mp4' }
    }
];

// --- UI ELEMENTEN ---
const ui = {
    title: document.getElementById('project-title'),
    category: document.getElementById('project-category'),
    current: document.getElementById('current-project'),
    total: document.getElementById('total-projects'),
    info: document.querySelector('.project-info'),
    menuHome: document.getElementById('menu-home'),
    menuAbout: document.getElementById('menu-about'),
    scrollIndicator: document.getElementById('scroll-indicator')
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

        this.currentIndex = -1;
        this.isAnimating = false;
        this.lastScrollTime = 0;
        this.videosUnlocked = false;

        this.init();
    }

    init() {
        this.setupRenderer();
        this.setupCamera();
        this.setupEnvironment();
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

    preloadVideos() {
        const videoPromises = this.allVideos.map(video => {
            return new Promise((resolve, reject) => {
                video.addEventListener('canplaythrough', resolve, { once: true });
                video.addEventListener('error', (e) => reject(`Error loading video: ${video.currentSrc}`), { once: true });
            });
        });
        return Promise.all(videoPromises);
    }

    async loadAssets() {
        const loadingManager = new THREE.LoadingManager();
        const textureLoader = new THREE.TextureLoader(loadingManager);
        const concreteTexture = textureLoader.load('concrete.jpg');
        
        this.createMonoliths(concreteTexture);

        try {
            await Promise.all([
                new Promise(resolve => loadingManager.onLoad = resolve),
                this.preloadVideos()
            ]);

            this.navigateTo(0, true);
            this.animate();
            setTimeout(() => {
                if (ui.scrollIndicator) ui.scrollIndicator.classList.add('is-visible');
            }, 1500);

        } catch (error) {
            console.error("Failed to load assets:", error);
        }
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
            video.preload = 'auto';

            const sourceWebm = document.createElement('source');
            sourceWebm.src = project.videoSrc.webm;
            sourceWebm.type = 'video/webm';

            const sourceMp4 = document.createElement('source');
            sourceMp4.src = project.videoSrc.mp4;
            sourceMp4.type = 'video/mp4';

            video.appendChild(sourceWebm);
            video.appendChild(sourceMp4);

            document.body.appendChild(video);
            video.style.display = 'none';
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

    hideScrollIndicator() {
        if (ui.scrollIndicator && ui.scrollIndicator.classList.contains('is-visible')) {
            ui.scrollIndicator.classList.remove('is-visible');
        }
    }

    navigateTo(index, instant = false) {
        if (this.isAnimating || index === this.currentIndex || index < 0 || index >= projects.length) return;
        if (!instant) this.hideScrollIndicator();

        this.isAnimating = true;
        const previousIndex = this.currentIndex;
        this.currentIndex = index;
        const targetMonolith = this.monoliths[this.currentIndex];

        if (previousIndex !== -1 && this.monoliths[previousIndex].userData.video) {
            this.monoliths[previousIndex].userData.video.pause();
        }
        const video = targetMonolith.userData.video;
        video.currentTime = 0;
        video.play().catch(e => console.error("Video play failed:", e));

        const updateUIContent = () => {
            const project = projects[this.currentIndex];
            ui.title.textContent = project.title;
            ui.category.innerHTML = project.category.replace(/\n/g, '<br>');
            ui.current.textContent = String(this.currentIndex + 1).padStart(2, '0');
            ui.total.textContent = String(projects.length).padStart(2, '0');
        };
        
        if (instant) {
            this.cameraGroup.position.z = targetMonolith.position.z;
            updateUIContent();
            ui.info.classList.add('is-visible');
            this.isAnimating = false;
            return;
        }
        
        const tl = gsap.timeline({ onComplete: () => { this.isAnimating = false; } });
        
        // GEWIJZIGD: Snellere animatie voor UI
        tl.to(ui.info, { transform: 'translateY(20px)', opacity: 0, duration: 0.6, ease: 'power4.in' }, 0);

        // GEWIJZIGD: Snellere en soepelere camera-animatie
        tl.to(this.cameraGroup.position, {
            z: targetMonolith.position.z,
            duration: 1.8,
            ease: 'power4.inOut'
        }, 0);
        
        tl.call(updateUIContent, null, 0.9); // UI update halverwege

        // GEWIJZIGD: Snellere animatie voor UI
        tl.to(ui.info, { transform: 'translateY(0)', opacity: 1, duration: 0.9, ease: 'power4.out' }, 0.9);
    }

    unlockVideos() {
        if (this.videosUnlocked) return;
        this.allVideos.forEach(v => { v.play().then(() => v.pause()).catch(() => {}); });
        this.videosUnlocked = true;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.currentIndex >= 0 && !this.isAnimating) {
            const currentMonolith = this.monoliths[this.currentIndex];
            
            const parallaxX = this.mouse.x * 0.1;
            const parallaxY = -this.mouse.y * 0.1;

            // GEWIJZIGD: Snellere 'lerp' voor soepelere, directere reactie
            const lerpFactor = 0.08;
            this.camera.position.x += (parallaxX - this.camera.position.x) * lerpFactor;
            this.camera.position.y += (parallaxY - this.camera.position.y) * lerpFactor;

            currentMonolith.rotation.y += ((-this.mouse.x * 0.05) - currentMonolith.rotation.y) * lerpFactor;
            currentMonolith.rotation.x += ((-this.mouse.y * 0.05) - currentMonolith.rotation.x) * lerpFactor;
            
            this.camera.lookAt(currentMonolith.position);
        }
        this.renderer.render(this.scene, this.camera);
    }
    
    addEventListeners() {
        window.addEventListener('wheel', this.handleScroll.bind(this), { passive: false });
        let touchStartY = 0;
        window.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
        window.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.unlockVideos();
            const touchEndY = e.changedTouches[0].clientY;
            const deltaY = touchStartY - touchEndY;
            if (Math.abs(deltaY) > 50) { 
                const now = Date.now();
                if (this.isAnimating || now - this.lastScrollTime < SCROLL_COOLDOWN) return;
                this.navigateTo(this.currentIndex + (deltaY > 0 ? 1 : -1));
                this.lastScrollTime = now;
            }
        }, { passive: false });

        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
        ui.menuHome.addEventListener('click', () => this.navigateTo(0));
        ui.menuAbout.addEventListener('click', () => this.navigateTo(projects.length - 1));
    }
    
    handleScroll(e) {
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
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
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