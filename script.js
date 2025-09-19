// --- CONFIG & PROJECT DATA ---
const MONOLITH_SPACING = 25;
const CAMERA_DISTANCE = 10;
// Snellere cooldown
const SCROLL_COOLDOWN = 1200;

// Knock-in video (1 centrale bron)
const KNOCKIN_VIDEO_SRC = "knockin.mp4";

const projects = [
    { 
        title: 'FLORIS VROEGH', 
        category: 'VIDEOGRAPHER & WEB DESIGN HOBBYIST',
        description: 'Een combinatie van filmische visie en digitale creatie. Altijd zoekend naar nieuwe manieren om verhalen te vangen.',
        videoSrc: { mp4: 'knockin.mp4' }
    },
    { 
        title: 'ALEC JUNGERIUS', 
        category: 'WEB DESIGN',
        description: 'Minimalistische en functionele webdesigns die impact maken door eenvoud en strakke interacties.',
        videoSrc: { mp4: 'knockin.mp4' }
    },
    { 
        title: '3D RENDERS', 
        category: 'MOTION DESIGN',
        description: 'Fotorealistische visuals en abstracte 3D-experimenten. Een playground voor motion & form.',
        videoSrc: { mp4: 'knockin.mp4' }
    },
    {
        title: 'ABOUT & CONTACT',
        category: 'Een creatieve developer met een passie voor immersive web experiences. Laten we samen iets bouwen. \n\n FlorisVroegh@icloud.com',
        description: 'Van concept tot code – altijd met focus op sfeer, interactie en ervaring.',
        videoSrc: { mp4: 'knockin.mp4' }
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
        this.mouse = new THREE.Vector2();
        this.clock = new THREE.Clock();

        this.currentIndex = -1;
        this.isAnimating = false;
        this.lastScrollTime = 0;
        this.videosUnlocked = false;

        // shared video & texture placeholders
        this.sharedVideo = null;
        this.sharedVideoTexture = null;

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
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // sneller, minder GPU
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
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
        this.scene.add(ambientLight);
        this.scene.fog = new THREE.Fog(0x111111, 20, 100);

        const sunLight = new THREE.DirectionalLight(0xffddaa, 1.2);
        sunLight.position.set(0, 30, -50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.set(1024, 1024);
        this.scene.add(sunLight);
    }

    // Make a single shared video element + VideoTexture (prevents multiple downloads)
    createSharedVideo() {
        const video = document.createElement('video');
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.preload = 'metadata'; // laat alleen metadata laden snel
        video.src = KNOCKIN_VIDEO_SRC;
        // keep it in DOM but off-screen (safer than display:none for some platforms)
        video.style.position = 'absolute';
        video.style.left = '-9999px';
        video.style.width = '1px';
        video.style.height = '1px';
        video.setAttribute('playsinline', '');
        document.body.appendChild(video);

        this.sharedVideo = video;
        this.sharedVideoTexture = new THREE.VideoTexture(this.sharedVideo);
        this.sharedVideoTexture.encoding = THREE.sRGBEncoding;
        // optional: lower filtering to improve perf on lower GPUs
        this.sharedVideoTexture.minFilter = THREE.LinearFilter;
        this.sharedVideoTexture.magFilter = THREE.LinearFilter;
    }

    // Preload with fallback: resolve on loadeddata/canplay or after timeout
    preloadVideos() {
        const videos = this.sharedVideo ? [this.sharedVideo] : [];
        const promises = videos.map(video => {
            return new Promise((resolve) => {
                let settled = false;
                const cleanup = () => {
                    video.removeEventListener('loadeddata', onLoaded);
                    video.removeEventListener('canplay', onLoaded);
                    video.removeEventListener('error', onError);
                    clearTimeout(timer);
                };
                const onLoaded = () => { if (!settled) { settled = true; cleanup(); resolve({ ok: true }); } };
                const onError = (e) => { if (!settled) { settled = true; cleanup(); resolve({ ok: false, error: e }); } };
                const timer = setTimeout(() => {
                    if (!settled) { settled = true; cleanup(); resolve({ ok: false, timeout: true }); }
                }, 4000); // 4s fallback

                video.addEventListener('loadeddata', onLoaded, { once: true });
                video.addEventListener('canplay', onLoaded, { once: true });
                video.addEventListener('error', onError, { once: true });

                // try to kick off loading
                try { video.load(); } catch (err) { /* ignore */ }
            });
        });

        // don't fail the whole startup if video fails — resolve anyway
        return Promise.all(promises).then(() => {});
    }

    async loadAssets() {
        const loadingManager = new THREE.LoadingManager();
        const textureLoader = new THREE.TextureLoader(loadingManager);
        // concrete.jpg must exist — replace or ensure path is correct
        const concreteTexture = textureLoader.load('concrete.jpg');

        // create shared video before creating monoliths so texture is available
        this.createSharedVideo();

        this.createMonoliths(concreteTexture);

        try {
            const managerPromise = new Promise(resolve => loadingManager.onLoad = resolve);
            // wait for both textures (loadingManager) and the video preloader (with fallback)
            await Promise.all([managerPromise, this.preloadVideos()]);

            this.navigateTo(0, true);
            this.animate();
            setTimeout(() => {
                if (ui.scrollIndicator) ui.scrollIndicator.classList.add('is-visible');
            }, 800);

        } catch (error) {
            console.error("Failed to load assets:", error);
        }
    }
    
    createMonoliths(concreteTexture) {
        const size = { w: 20, h: 11.25, d: 0.9 };
        const concreteMaterial = new THREE.MeshStandardMaterial({ map: concreteTexture, roughness: 0.8, metalness: 0.2 });

        projects.forEach((project, i) => {
            // reuse shared video texture for all monoliths
            const videoTexture = this.sharedVideoTexture;
            const frontMaterial = new THREE.MeshBasicMaterial({ map: videoTexture });
            
            const monolith = new THREE.Mesh(
                new THREE.BoxGeometry(size.w, size.h, size.d),
                [concreteMaterial, concreteMaterial, concreteMaterial, concreteMaterial, frontMaterial, concreteMaterial]
            );

            monolith.position.set(0, (size.h / 2) + 0.5, -i * MONOLITH_SPACING);
            monolith.rotation.set(0, -0.2, 0.05);
            monolith.castShadow = true;
            monolith.receiveShadow = true;
            // reference to shared video; it's the single source of truth
            monolith.userData.video = this.sharedVideo;

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

        // since we use a shared video, just reset to start and play
        const video = targetMonolith.userData.video;
        if (video) {
            try {
                video.currentTime = 0;
            } catch (e) { /* some browsers may throw if not ready */ }
            video.muted = true;
            video.play().catch(e => {
                // autoplay can still fail in some cases — log for debug
                console.warn("Video play failed (autoplay blocked?):", e);
            });
        }

const updateUIContent = () => {
    const project = projects[this.currentIndex];
    ui.title.textContent = project.title;
    ui.category.innerHTML = project.category.replace(/\n/g, '<br>');
    ui.current.textContent = String(this.currentIndex + 1).padStart(2, '0');
    ui.total.textContent = String(projects.length).padStart(2, '0');
    
    if (ui.description) {
        ui.description.textContent = project.description;
    }
};

        
        if (instant) {
            this.cameraGroup.position.z = targetMonolith.position.z;
            updateUIContent();
            ui.info.classList.add('is-visible');
            this.isAnimating = false;
            return;
        }
        
        const tl = gsap.timeline({ onComplete: () => { this.isAnimating = false; } });
        
        // Snappier UI animatie
        tl.to(ui.info, { transform: 'translateY(20px)', opacity: 0, duration: 0.3, ease: 'power4.in' }, 0);

        // Snellere camera-animatie
        tl.to(this.cameraGroup.position, {
            z: targetMonolith.position.z,
            duration: 0.9,
            ease: 'power4.inOut'
        }, 0);
        
        tl.call(updateUIContent, null, 0.45); // UI update halverwege

        // Snelle fade-in
        tl.to(ui.info, { transform: 'translateY(0)', opacity: 1, duration: 0.5, ease: 'power4.out' }, 0.45);
    }

    unlockVideos() {
        if (this.videosUnlocked) return;
        const v = this.sharedVideo;
        if (!v) { this.videosUnlocked = true; return; }
        // quick attempt to unlock autoplay restrictions
        v.muted = true;
        v.play().then(() => v.pause()).catch(() => {});
        this.videosUnlocked = true;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.currentIndex >= 0 && !this.isAnimating) {
            const currentMonolith = this.monoliths[this.currentIndex];
            
            const parallaxX = this.mouse.x * 0.1;
            const parallaxY = -this.mouse.y * 0.1;

            // Snellere reactie
            const lerpFactor = 0.15;
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
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new WebGLApp();
});
