class LiquidLens {
    constructor() {
        this.container = document.getElementById('webgl-container');
        this.video = document.getElementById('background-video');
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.renderer = new THREE.WebGLRenderer({ alpha: true });
        
        this.mouse = new THREE.Vector2();
        this.clock = new THREE.Clock();
        
        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);

        this.videoTexture = new THREE.VideoTexture(this.video);
        
        this.createLiquidPlane();
        this.addEventListeners();
        this.animate();
    }

    createLiquidPlane() {
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0.0 },
                uTexture: { value: this.videoTexture },
                uMouse: { value: this.mouse },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform sampler2D uTexture;
                uniform vec2 uMouse;
                uniform vec2 uResolution;

                varying vec2 vUv;

                // 2D Noise Function
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                }

                void main() {
                    vec2 uv = vUv;
                    
                    // --- Liquid Distortion ---
                    float noise = random(uv + uTime * 0.05) * 0.02;
                    uv.x += sin(uv.y * 10.0 + uTime * 0.5) * 0.01;
                    uv.y += cos(uv.x * 8.0 + uTime * 0.4) * 0.01;
                    
                    // --- Mouse Ripple ---
                    float mouseDist = distance(uMouse, uv);
                    float ripple = smoothstep(0.1, 0.0, mouseDist) * 0.05;
                    uv += normalize(uMouse - uv) * ripple;
                    
                    // --- Chromatic Aberration ---
                    vec2 offset = vec2(noise + ripple) * 0.2;
                    float r = texture2D(uTexture, uv + offset).r;
                    float g = texture2D(uTexture, uv).g;
                    float b = texture2D(uTexture, uv - offset).b;

                    gl_FragColor = vec4(r, g, b, 1.0);
                }
            `
        });

        const geometry = new THREE.PlaneGeometry(2, 2);
        const plane = new THREE.Mesh(geometry, this.material);
        this.scene.add(plane);
    }

    addEventListeners() {
        window.addEventListener('mousemove', e => {
            this.mouse.x = e.clientX / window.innerWidth;
            this.mouse.y = 1.0 - (e.clientY / window.innerHeight);
        });

        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.material.uniforms.uTime.value = this.clock.getElapsedTime();
        this.renderer.render(this.scene, this.camera);
    }
}

new LiquidLens();