// --- CONFIG ---
const MONOLITH_SPACING = 25;
const CAMERA_DISTANCE = 10;
const SCROLL_COOLDOWN = 1000; 
const KNOCKIN_VIDEO_SRC = "knockin.mp4";

// Projecten
const projects = [
    { 
        title: 'FLORIS VROEGH', 
        category: 'VIDEOGRAPHER & WEB DESIGN HOBBYIST',
        videoSrc: { mp4: KNOCKIN_VIDEO_SRC }
    },
    { 
        title: 'ALEC JUNGERIUS', 
        category: 'WEB DESIGN',
        videoSrc: { mp4: KNOCKIN_VIDEO_SRC }
    },
    { 
        title: '3D RENDERS', 
        category: 'MOTION DESIGN',
        videoSrc: { mp4: KNOCKIN_VIDEO_SRC }
    },
    {
        title: 'ABOUT & CONTACT',
        category: 'Een creatieve developer met een passie voor immersive web experiences.\n\nFlorisVroegh@icloud.com',
        videoSrc: { mp4: KNOCKIN_VIDEO_SRC }
    }
];

// --- UI ---
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
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.cameraGroup = new THREE.Group();
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('webgl-canvas'),
            antialias: true,
            powerPreference: 'high-performance'
        });
        
        this.monoliths = [];
        this.allVideos = [];
        this.mouse = new THREE.Vector2();
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
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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
        const ambient = new THREE.AmbientLight(0xffffff, 1.3);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffddaa, 1.1);
        sun.position.set(0, 20, -40);
        this.scene.add(sun);

        this.scene.fog = new THREE.Fog(0x111111, 20, 100);
    }

    loadAssets() {
        const texLoader = new THREE.TextureLoader();
        const concrete = texLoader.load('concrete.jpg');
        this.createMonoliths(concrete);

        this.navigateTo(0, true);
        this.animate();

        setTimeout(() => {
            if (ui.scrollIndicator) ui.scrollIndicator.classList.add('is-visible');
        }, 1000);
    }

    createMonoliths(concreteTexture) {
        const size = { w: 16, h: 9, d: 0.9 }; // kleiner voor mobile performance
        const sideMat = new THREE.MeshStandardMaterial({ map: concreteTexture, roughness: 0.8 });

        projects.forEach((project, i) => {
            const video = document.createElement('video');
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.crossOrigin = 'anonymous';
            video.preload = 'metadata';

            const src = document.createElement('source');
            src.src = project.videoSrc.mp4;
            src.type = "video/mp4";
            video.appendChild(src);

            document.body.appendChild(video);
            video.style.display = "none";
            this.allVideos.push(video);

            const videoTex = new THREE.VideoTexture(video);
            videoTex.encoding = THREE.sRGBEncoding;

            const frontMat = new THREE.MeshBasicMaterial({ map: videoTex });
            const monolith = new THREE.Mesh(
                new THREE.BoxGeometry(size.w, size.h, size.d),
                [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat]
            );

            monolith.position.set(0, (size.h / 2) + 0.5, -i * MONOLITH_SPACING);
            monolith.rotation.set(0, -0.2, 0.05);
            this.scene.add(monolith);
            monolith.userData.video = video;
            this.monoliths.push(monolith);
        });
    }

    navigateTo(index, instant = false) {
        if (this.isAnimating || index === this.currentIndex || index < 0 || index >= projects.length) return;
        if (!instant && ui.scrollIndicator) ui.scrollIndicator.classList.remove('is-visible');

        this.isAnimating = true;
        const prevIndex = this.currentIndex;
        this.currentIndex = index;
        const target = this.monoliths[this.currentIndex];

        if (prevIndex !== -1) this.monoliths[prevIndex].userData.video.pause();
        const vid = target.userData.video;
        vid.currentTime = 0;
        vid.play().catch(()=>{});

        const updateUI = () => {
            const p = projects[this.currentIndex];
            ui.title.textContent = p.title;
            ui.category.innerHTML = p.category.replace(/\n/g, '<br>');
            ui.current.textContent = String(this.currentIndex + 1).padStart(2, '0');
            ui.total.textContent = String(projects.length).padStart(2, '0');
        };

        if (instant) {
            this.cameraGroup.position.z = target.position.z;
            updateUI();
            ui.info.classList.add('is-visible');
            this.isAnimating = false;
            return;
        }

        const tl = gsap.timeline({ onComplete: () => { this.isAnimating = false; } });
        tl.to(ui.info, { opacity: 0, duration: 0.25, ease: 'power1.in' }, 0);
        tl.to(this.cameraGroup.position, { z: target.position.z, duration: 0.8, ease: 'power2.inOut' }, 0);
        tl.call(updateUI, null, 0.4);
        tl.to(ui.info, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.4);
    }

    unlockVideos() {
        if (this.videosUnlocked) return;
        this.allVideos.forEach(v => v.play().then(()=>v.pause()).catch(()=>{}));
        this.videosUnlocked = true;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.currentIndex >= 0 && !this.isAnimating) {
            const current = this.monoliths[this.currentIndex];
            const parallaxX = this.mouse.x * 0.1;
            const parallaxY = -this.mouse.y * 0.1;
            this.camera.position.x += (parallaxX - this.camera.position.x) * 0.1;
            this.camera.position.y += (parallaxY - this.camera.position.y) * 0.1;
            this.camera.lookAt(current.position);
        }
        this.renderer.render(this.scene, this.camera);
    }

    addEventListeners() {
        // scroll
        window.addEventListener('wheel', e => {
            e.preventDefault();
            this.unlockVideos();
            const now = Date.now();
            if (this.isAnimating || now - this.lastScrollTime < SCROLL_COOLDOWN) return;
            this.navigateTo(this.currentIndex + (e.deltaY > 0 ? 1 : -1));
            this.lastScrollTime = now;
        }, { passive: false });

        // swipe mobile
        let startY = 0;
        window.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
        window.addEventListener('touchend', e => {
            this.unlockVideos();
            const delta = startY - e.changedTouches[0].clientY;
            if (Math.abs(delta) > 40) {
                const now = Date.now();
                if (this.isAnimating || now - this.lastScrollTime < SCROLL_COOLDOWN) return;
                this.navigateTo(this.currentIndex + (delta > 0 ? 1 : -1));
                this.lastScrollTime = now;
            }
        });

        // mouse
        window.addEventListener('mousemove', e => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        ui.menuHome.addEventListener('click', () => this.navigateTo(0));
        ui.menuAbout.addEventListener('click', () => this.navigateTo(projects.length - 1));
    }
}

window.addEventListener('DOMContentLoaded', () => new WebGLApp());
