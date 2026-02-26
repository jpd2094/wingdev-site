import * as THREE from "three";

(function () {
  const face_vert = `attribute vec3 position;uniform vec2 px;uniform vec2 boundarySpace;varying vec2 uv;precision highp float;void main(){vec3 pos=position;vec2 scale=1.0-boundarySpace*2.0;pos.xy=pos.xy*scale;uv=vec2(0.5)+(pos.xy)*0.5;gl_Position=vec4(pos,1.0);}`;
  const line_vert = `attribute vec3 position;uniform vec2 px;precision highp float;varying vec2 uv;void main(){vec3 pos=position;uv=0.5+pos.xy*0.5;vec2 n=sign(pos.xy);pos.xy=abs(pos.xy)-px*1.0;pos.xy*=n;gl_Position=vec4(pos,1.0);}`;
  const mouse_vert = `precision highp float;attribute vec3 position;attribute vec2 uv;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 pos=position.xy*scale*2.0*px+center;vUv=uv;gl_Position=vec4(pos,0.0,1.0);}`;
  const advection_frag = `precision highp float;uniform sampler2D velocity;uniform float dt;uniform bool isBFECC;uniform vec2 fboSize;uniform vec2 px;varying vec2 uv;void main(){vec2 ratio=max(fboSize.x,fboSize.y)/fboSize;if(isBFECC==false){vec2 vel=texture2D(velocity,uv).xy;vec2 uv2=uv-vel*dt*ratio;vec2 nv=texture2D(velocity,uv2).xy;gl_FragColor=vec4(nv,0.0,0.0);}else{vec2 sn=uv;vec2 vo=texture2D(velocity,uv).xy;vec2 so=sn-vo*dt*ratio;vec2 vn1=texture2D(velocity,so).xy;vec2 sn2=so+vn1*dt*ratio;vec2 err=sn2-sn;vec2 sn3=sn-err/2.0;vec2 v2=texture2D(velocity,sn3).xy;vec2 so2=sn3-v2*dt*ratio;vec2 nv2=texture2D(velocity,so2).xy;gl_FragColor=vec4(nv2,0.0,0.0);}}`;
  const color_frag = `precision highp float;uniform sampler2D velocity;uniform sampler2D palette;uniform vec4 bgColor;varying vec2 uv;void main(){vec2 vel=texture2D(velocity,uv).xy;float lenv=clamp(length(vel),0.0,1.0);vec3 c=texture2D(palette,vec2(lenv,0.5)).rgb;vec3 outRGB=mix(bgColor.rgb,c,lenv);float outA=mix(bgColor.a,1.0,lenv);gl_FragColor=vec4(outRGB,outA);}`;
  const divergence_frag = `precision highp float;uniform sampler2D velocity;uniform float dt;uniform vec2 px;varying vec2 uv;void main(){float x0=texture2D(velocity,uv-vec2(px.x,0.0)).x;float x1=texture2D(velocity,uv+vec2(px.x,0.0)).x;float y0=texture2D(velocity,uv-vec2(0.0,px.y)).y;float y1=texture2D(velocity,uv+vec2(0.0,px.y)).y;float d=(x1-x0+y1-y0)/2.0;gl_FragColor=vec4(d/dt);}`;
  const externalForce_frag = `precision highp float;uniform vec2 force;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 circle=(vUv-0.5)*2.0;float d=1.0-min(length(circle),1.0);d*=d;gl_FragColor=vec4(force*d,0.0,1.0);}`;
  const poisson_frag = `precision highp float;uniform sampler2D pressure;uniform sampler2D divergence;uniform vec2 px;varying vec2 uv;void main(){float p0=texture2D(pressure,uv+vec2(px.x*2.0,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*2.0,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*2.0)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*2.0)).r;float div=texture2D(divergence,uv).r;gl_FragColor=vec4((p0+p1+p2+p3)/4.0-div);}`;
  const pressure_frag = `precision highp float;uniform sampler2D pressure;uniform sampler2D velocity;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){float s=1.0;float p0=texture2D(pressure,uv+vec2(px.x*s,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*s,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*s)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*s)).r;vec2 v=texture2D(velocity,uv).xy;vec2 gP=vec2(p0-p1,p2-p3)*0.5;v=v-gP*dt;gl_FragColor=vec4(v,0.0,1.0);}`;
  const viscous_frag = `precision highp float;uniform sampler2D velocity;uniform sampler2D velocity_new;uniform float v;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){vec2 old=texture2D(velocity,uv).xy;vec2 n0=texture2D(velocity_new,uv+vec2(px.x*2.0,0.0)).xy;vec2 n1=texture2D(velocity_new,uv-vec2(px.x*2.0,0.0)).xy;vec2 n2=texture2D(velocity_new,uv+vec2(0.0,px.y*2.0)).xy;vec2 n3=texture2D(velocity_new,uv-vec2(0.0,px.y*2.0)).xy;vec2 nv=4.0*old+v*dt*(n0+n1+n2+n3);nv/=4.0*(1.0+v*dt);gl_FragColor=vec4(nv,0.0,0.0);}`;

  function makePaletteTexture(stops) {
    let arr = stops && stops.length > 0 ? (stops.length === 1 ? [stops[0], stops[0]] : stops) : ["#ffffff", "#ffffff"];
    const w = arr.length;
    const data = new Uint8Array(w * 4);
    for (let i = 0; i < w; i++) {
      const c = new THREE.Color(arr[i]);
      data[i * 4 + 0] = Math.round(c.r * 255);
      data[i * 4 + 1] = Math.round(c.g * 255);
      data[i * 4 + 2] = Math.round(c.b * 255);
      data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }

  class CommonClass {
    constructor() {
      this.width = 0; this.height = 0; this.aspect = 1; this.pixelRatio = 1;
      this.container = null; this.renderer = null; this.clock = null;
      this.time = 0; this.delta = 0;
    }
    init(container) {
      this.container = container;
      this.pixelRatio = 1;
      this.resize();
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.autoClear = false;
      this.renderer.setClearColor(new THREE.Color(0x000000), 0);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.renderer.setSize(this.width, this.height);
      const el = this.renderer.domElement;
      el.style.width = "100%";
      el.style.height = "100%";
      el.style.display = "block";
      this.clock = new THREE.Clock();
      this.clock.start();
    }
    resize() {
      if (!this.container) return;
      const rect = this.container.getBoundingClientRect();
      this.width = Math.max(1, Math.floor(rect.width));
      this.height = Math.max(1, Math.floor(rect.height));
      this.aspect = this.width / this.height;
      if (this.renderer) this.renderer.setSize(this.width, this.height, false);
    }
    update() {
      if (!this.clock) return;
      this.delta = this.clock.getDelta();
      this.time += this.delta;
    }
  }

  class MouseClass {
    constructor() {
      this.mouseMoved = false;
      this.coords = new THREE.Vector2();
      this.coords_old = new THREE.Vector2();
      this.diff = new THREE.Vector2();
      this.timer = null;
      this.container = null;
      this.listenerTarget = null;
      this.docTarget = null;
      this.isHoverInside = false;
      this.hasUserControl = false;
      this.isAutoActive = false;
      this.autoIntensity = 2.0;
      this.takeoverActive = false;
      this.takeoverStartTime = 0;
      this.takeoverDuration = 0.25;
      this.takeoverFrom = new THREE.Vector2();
      this.takeoverTo = new THREE.Vector2();
      this.onInteract = null;
      this._onMouseMove = this.onDocumentMouseMove.bind(this);
      this._onTouchStart = this.onDocumentTouchStart.bind(this);
      this._onTouchMove = this.onDocumentTouchMove.bind(this);
      this._onTouchEnd = this.onTouchEnd.bind(this);
      this._onDocumentLeave = this.onDocumentLeave.bind(this);
    }
    init(container) {
      this.container = container;
      this.docTarget = container.ownerDocument || null;
      const dv = (this.docTarget && this.docTarget.defaultView) || window;
      if (!dv) return;
      this.listenerTarget = dv;
      this.listenerTarget.addEventListener("mousemove", this._onMouseMove);
      this.listenerTarget.addEventListener("touchstart", this._onTouchStart, { passive: true });
      this.listenerTarget.addEventListener("touchmove", this._onTouchMove, { passive: true });
      this.listenerTarget.addEventListener("touchend", this._onTouchEnd);
      if (this.docTarget) this.docTarget.addEventListener("mouseleave", this._onDocumentLeave);
    }
    dispose() {
      if (this.listenerTarget) {
        this.listenerTarget.removeEventListener("mousemove", this._onMouseMove);
        this.listenerTarget.removeEventListener("touchstart", this._onTouchStart);
        this.listenerTarget.removeEventListener("touchmove", this._onTouchMove);
        this.listenerTarget.removeEventListener("touchend", this._onTouchEnd);
      }
      if (this.docTarget) this.docTarget.removeEventListener("mouseleave", this._onDocumentLeave);
      this.listenerTarget = null; this.docTarget = null; this.container = null;
    }
    isPointInside(cx, cy) {
      if (!this.container) return false;
      const r = this.container.getBoundingClientRect();
      return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
    }
    updateHoverState(cx, cy) { this.isHoverInside = this.isPointInside(cx, cy); return this.isHoverInside; }
    setCoords(x, y) {
      if (!this.container) return;
      if (this.timer) window.clearTimeout(this.timer);
      const r = this.container.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      this.coords.set(((x - r.left) / r.width) * 2 - 1, -(((y - r.top) / r.height) * 2 - 1));
      this.mouseMoved = true;
      this.timer = window.setTimeout(() => { this.mouseMoved = false; }, 100);
    }
    setNormalized(nx, ny) { this.coords.set(nx, ny); this.mouseMoved = true; }
    onDocumentMouseMove(event) {
      if (!this.updateHoverState(event.clientX, event.clientY)) return;
      if (this.onInteract) this.onInteract();
      if (this.isAutoActive && !this.hasUserControl && !this.takeoverActive) {
        if (!this.container) return;
        const r = this.container.getBoundingClientRect();
        this.takeoverFrom.copy(this.coords);
        this.takeoverTo.set(((event.clientX - r.left) / r.width) * 2 - 1, -(((event.clientY - r.top) / r.height) * 2 - 1));
        this.takeoverStartTime = performance.now();
        this.takeoverActive = true; this.hasUserControl = true; this.isAutoActive = false;
        return;
      }
      this.setCoords(event.clientX, event.clientY); this.hasUserControl = true;
    }
    onDocumentTouchStart(event) {
      if (event.touches.length !== 1) return;
      const t = event.touches[0];
      if (!this.updateHoverState(t.clientX, t.clientY)) return;
      if (this.onInteract) this.onInteract();
      this.setCoords(t.clientX, t.clientY); this.hasUserControl = true;
    }
    onDocumentTouchMove(event) {
      if (event.touches.length !== 1) return;
      const t = event.touches[0];
      if (!this.updateHoverState(t.clientX, t.clientY)) return;
      if (this.onInteract) this.onInteract();
      this.setCoords(t.clientX, t.clientY);
    }
    onTouchEnd() { this.isHoverInside = false; }
    onDocumentLeave() { this.isHoverInside = false; }
    update() {
      if (this.takeoverActive) {
        const t = (performance.now() - this.takeoverStartTime) / (this.takeoverDuration * 1000);
        if (t >= 1) { this.takeoverActive = false; this.coords.copy(this.takeoverTo); this.coords_old.copy(this.coords); this.diff.set(0, 0); }
        else { const k = t * t * (3 - 2 * t); this.coords.copy(this.takeoverFrom).lerp(this.takeoverTo, k); }
      }
      this.diff.subVectors(this.coords, this.coords_old);
      this.coords_old.copy(this.coords);
      if (this.coords_old.x === 0 && this.coords_old.y === 0) this.diff.set(0, 0);
      if (this.isAutoActive && !this.takeoverActive) this.diff.multiplyScalar(this.autoIntensity);
    }
  }

  class AutoDriver {
    constructor(mouse, mgr, opts) {
      this.mouse = mouse; this.mgr = mgr; this.enabled = opts.enabled; this.speed = opts.speed;
      this.resumeDelay = opts.resumeDelay || 3000; this.rampDurationMs = (opts.rampDuration || 0) * 1000;
      this.active = false; this.current = new THREE.Vector2(0, 0); this.target = new THREE.Vector2();
      this.lastTime = performance.now(); this.activationTime = 0; this.margin = 0.2;
      this._tmpDir = new THREE.Vector2();
      this.pickNewTarget();
    }
    pickNewTarget() { this.target.set((Math.random() * 2 - 1) * (1 - this.margin), (Math.random() * 2 - 1) * (1 - this.margin)); }
    forceStop() { this.active = false; this.mouse.isAutoActive = false; }
    update() {
      if (!this.enabled) return;
      const now = performance.now();
      if (now - this.mgr.lastUserInteraction < this.resumeDelay || this.mouse.isHoverInside) { if (this.active) this.forceStop(); return; }
      if (!this.active) { this.active = true; this.current.copy(this.mouse.coords); this.lastTime = now; this.activationTime = now; }
      this.mouse.isAutoActive = true;
      let dtSec = (now - this.lastTime) / 1000; this.lastTime = now;
      if (dtSec > 0.2) dtSec = 0.016;
      const dir = this._tmpDir.subVectors(this.target, this.current); const dist = dir.length();
      if (dist < 0.01) { this.pickNewTarget(); return; }
      dir.normalize();
      let ramp = 1;
      if (this.rampDurationMs > 0) { const t = Math.min(1, (now - this.activationTime) / this.rampDurationMs); ramp = t * t * (3 - 2 * t); }
      this.current.addScaledVector(dir, Math.min(this.speed * dtSec * ramp, dist));
      this.mouse.setNormalized(this.current.x, this.current.y);
    }
  }

  class ShaderPass {
    constructor(props) {
      this.props = props || {};
      this.uniforms = this.props.material && this.props.material.uniforms;
      this.scene = null; this.camera = null; this.material = null; this.geometry = null; this.plane = null;
    }
    init() {
      this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
      if (this.uniforms) {
        this.material = new THREE.RawShaderMaterial(this.props.material);
        this.geometry = new THREE.PlaneGeometry(2, 2);
        this.plane = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.plane);
      }
    }
    update() {
      if (!Common.renderer || !this.scene || !this.camera) return;
      Common.renderer.setRenderTarget(this.props.output || null);
      Common.renderer.render(this.scene, this.camera);
      Common.renderer.setRenderTarget(null);
    }
  }

  class Advection extends ShaderPass {
    constructor(sp) {
      super({
        material: {
          vertexShader: face_vert, fragmentShader: advection_frag,
          uniforms: { boundarySpace: { value: sp.cellScale }, px: { value: sp.cellScale }, fboSize: { value: sp.fboSize }, velocity: { value: sp.src.texture }, dt: { value: sp.dt }, isBFECC: { value: true } }
        },
        output: sp.dst
      });
      this.init();
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1,-1,0,-1,1,0,-1,1,0,1,1,0,1,1,0,1,-1,0,1,-1,0,-1,-1,0]), 3));
      this.line = new THREE.LineSegments(g, new THREE.RawShaderMaterial({ vertexShader: line_vert, fragmentShader: advection_frag, uniforms: this.uniforms }));
      this.scene.add(this.line);
    }
    update(args) {
      if (!this.uniforms) return;
      this.uniforms.dt.value = args.dt;
      this.line.visible = args.isBounce;
      this.uniforms.isBFECC.value = args.BFECC;
      super.update();
    }
  }

  class ExternalForce extends ShaderPass {
    constructor(sp) {
      super({ output: sp.dst });
      this.init();
      this.mouse = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.RawShaderMaterial({
          vertexShader: mouse_vert, fragmentShader: externalForce_frag, blending: THREE.AdditiveBlending, depthWrite: false,
          uniforms: { px: { value: sp.cellScale }, force: { value: new THREE.Vector2(0, 0) }, center: { value: new THREE.Vector2(0, 0) }, scale: { value: new THREE.Vector2(sp.cursor_size, sp.cursor_size) } }
        })
      );
      this.scene.add(this.mouse);
    }
    update(args) {
      const u = this.mouse.material.uniforms;
      u.force.value.set((Mouse.diff.x / 2) * args.mouse_force, (Mouse.diff.y / 2) * args.mouse_force);
      u.center.value.set(Mouse.coords.x, Mouse.coords.y);
      u.scale.value.set(args.cursor_size, args.cursor_size);
      super.update();
    }
  }

  class Viscous extends ShaderPass {
    constructor(sp) {
      super({
        material: {
          vertexShader: face_vert, fragmentShader: viscous_frag,
          uniforms: { boundarySpace: { value: sp.boundarySpace }, velocity: { value: sp.src.texture }, velocity_new: { value: sp.dst_.texture }, v: { value: sp.viscous }, px: { value: sp.cellScale }, dt: { value: sp.dt } }
        },
        output: sp.dst, output0: sp.dst_, output1: sp.dst
      });
      this.init();
    }
    update(args) {
      for (let i = 0; i < args.iterations; i++) {
        const fi = i % 2 === 0 ? this.props.output0 : this.props.output1;
        const fo = i % 2 === 0 ? this.props.output1 : this.props.output0;
        this.uniforms.velocity_new.value = fi.texture;
        this.props.output = fo;
        this.uniforms.dt.value = args.dt;
        super.update();
      }
      return args.iterations % 2 === 0 ? this.props.output0 : this.props.output1;
    }
  }

  class Divergence extends ShaderPass {
    constructor(sp) {
      super({
        material: {
          vertexShader: face_vert, fragmentShader: divergence_frag,
          uniforms: { boundarySpace: { value: sp.boundarySpace }, velocity: { value: sp.src.texture }, px: { value: sp.cellScale }, dt: { value: sp.dt } }
        },
        output: sp.dst
      });
      this.init();
    }
    update(args) { if (this.uniforms) this.uniforms.velocity.value = args.vel.texture; super.update(); }
  }

  class Poisson extends ShaderPass {
    constructor(sp) {
      super({
        material: {
          vertexShader: face_vert, fragmentShader: poisson_frag,
          uniforms: { boundarySpace: { value: sp.boundarySpace }, pressure: { value: sp.dst_.texture }, divergence: { value: sp.src.texture }, px: { value: sp.cellScale } }
        },
        output: sp.dst, output0: sp.dst_, output1: sp.dst
      });
      this.init();
    }
    update(args) {
      for (let i = 0; i < args.iterations; i++) {
        const pi = i % 2 === 0 ? this.props.output0 : this.props.output1;
        const po = i % 2 === 0 ? this.props.output1 : this.props.output0;
        this.uniforms.pressure.value = pi.texture;
        this.props.output = po;
        super.update();
      }
      return args.iterations % 2 === 0 ? this.props.output0 : this.props.output1;
    }
  }

  class Pressure extends ShaderPass {
    constructor(sp) {
      super({
        material: {
          vertexShader: face_vert, fragmentShader: pressure_frag,
          uniforms: { boundarySpace: { value: sp.boundarySpace }, pressure: { value: sp.src_p.texture }, velocity: { value: sp.src_v.texture }, px: { value: sp.cellScale }, dt: { value: sp.dt } }
        },
        output: sp.dst
      });
      this.init();
    }
    update(args) { this.uniforms.velocity.value = args.vel.texture; this.uniforms.pressure.value = args.pressure.texture; super.update(); }
  }

  class Simulation {
    constructor(options) {
      this.options = options;
      this.fbos = { vel_0: null, vel_1: null, vel_viscous0: null, vel_viscous1: null, div: null, pressure_0: null, pressure_1: null };
      this.fboSize = new THREE.Vector2();
      this.cellScale = new THREE.Vector2();
      this.boundarySpace = new THREE.Vector2();
      this.init();
    }
    init() { this.calcSize(); this.createAllFBO(); this.createShaderPass(); }
    getFloatType() { return /(iPad|iPhone|iPod)/i.test(navigator.userAgent) ? THREE.HalfFloatType : THREE.FloatType; }
    createAllFBO() {
      const type = this.getFloatType();
      const opts = { type, depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping };
      for (const key in this.fbos) this.fbos[key] = new THREE.WebGLRenderTarget(this.fboSize.x, this.fboSize.y, opts);
    }
    createShaderPass() {
      this.advection = new Advection({ cellScale: this.cellScale, fboSize: this.fboSize, dt: this.options.dt, src: this.fbos.vel_0, dst: this.fbos.vel_1 });
      this.externalForce = new ExternalForce({ cellScale: this.cellScale, cursor_size: this.options.cursor_size, dst: this.fbos.vel_1 });
      this.viscous = new Viscous({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, viscous: this.options.viscous, src: this.fbos.vel_1, dst: this.fbos.vel_viscous1, dst_: this.fbos.vel_viscous0, dt: this.options.dt });
      this.divergence = new Divergence({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, src: this.fbos.vel_viscous0, dst: this.fbos.div, dt: this.options.dt });
      this.poisson = new Poisson({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, src: this.fbos.div, dst: this.fbos.pressure_1, dst_: this.fbos.pressure_0 });
      this.pressure = new Pressure({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, src_p: this.fbos.pressure_0, src_v: this.fbos.vel_viscous0, dst: this.fbos.vel_0, dt: this.options.dt });
    }
    calcSize() {
      const w = Math.max(1, Math.round(this.options.resolution * Common.width));
      const h = Math.max(1, Math.round(this.options.resolution * Common.height));
      this.cellScale.set(1 / w, 1 / h);
      this.fboSize.set(w, h);
    }
    resize() { this.calcSize(); for (const key in this.fbos) this.fbos[key].setSize(this.fboSize.x, this.fboSize.y); }
    update() {
      this.boundarySpace.copy(this.options.isBounce ? new THREE.Vector2(0, 0) : this.cellScale);
      this.advection.update({ dt: this.options.dt, isBounce: this.options.isBounce, BFECC: this.options.BFECC });
      this.externalForce.update({ cursor_size: this.options.cursor_size, mouse_force: this.options.mouse_force, cellScale: this.cellScale });
      let vel = this.fbos.vel_1;
      if (this.options.isViscous) vel = this.viscous.update({ iterations: this.options.iterations_viscous, dt: this.options.dt });
      this.divergence.update({ vel });
      const pr = this.poisson.update({ iterations: this.options.iterations_poisson });
      this.pressure.update({ vel, pressure: pr });
    }
  }

  let Common, Mouse;

  class Output {
    constructor(paletteTex, bgVec4, sim) {
      this.simulation = sim;
      this.scene = new THREE.Scene();
      this.camera = new THREE.Camera();
      this.output = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.RawShaderMaterial({
          vertexShader: face_vert, fragmentShader: color_frag, transparent: true, depthWrite: false,
          uniforms: { velocity: { value: sim.fbos.vel_0.texture }, boundarySpace: { value: new THREE.Vector2() }, palette: { value: paletteTex }, bgColor: { value: bgVec4 } }
        })
      );
      this.scene.add(this.output);
    }
    resize() { this.simulation.resize(); }
    render() { if (Common.renderer) { Common.renderer.setRenderTarget(null); Common.renderer.render(this.scene, this.camera); } }
    update() { this.simulation.update(); this.render(); }
  }

  window.LiquidEther = {
    init: function (container, opts) {
      opts = opts || {};
      const colors = opts.colors || ["#0a0a0c", "#141428", "#1e1b4b", "#312e81"];
      const mouseForce = opts.mouseForce !== undefined ? opts.mouseForce : 15;
      const cursorSize = opts.cursorSize !== undefined ? opts.cursorSize : 200;
      const isViscous = opts.isViscous !== undefined ? opts.isViscous : false;
      const viscousVal = opts.viscous !== undefined ? opts.viscous : 30;
      const iterationsViscous = opts.iterationsViscous || 32;
      const iterationsPoisson = opts.iterationsPoisson || 32;
      const dt = opts.dt !== undefined ? opts.dt : 0.014;
      const BFECC = opts.BFECC !== undefined ? opts.BFECC : false;
      const resolutionVal = opts.resolution !== undefined ? opts.resolution : 0.3;
      const isBounce = opts.isBounce !== undefined ? opts.isBounce : false;
      const autoDemoEnabled = opts.autoDemo !== undefined ? opts.autoDemo : true;
      const autoSpeed = opts.autoSpeed !== undefined ? opts.autoSpeed : 0.5;
      const autoIntensity = opts.autoIntensity !== undefined ? opts.autoIntensity : 2.2;
      const takeoverDuration = opts.takeoverDuration !== undefined ? opts.takeoverDuration : 0.25;
      const autoResumeDelay = opts.autoResumeDelay !== undefined ? opts.autoResumeDelay : 1000;
      const autoRampDuration = opts.autoRampDuration !== undefined ? opts.autoRampDuration : 0.6;

      const paletteTex = makePaletteTexture(colors);
      const bgVec4 = new THREE.Vector4(0, 0, 0, 0);

      Common = new CommonClass();
      Mouse = new MouseClass();

      Common.init(container);
      Mouse.init(container);
      Mouse.autoIntensity = autoIntensity;
      Mouse.takeoverDuration = takeoverDuration;

      if (!Common.renderer) return null;
      container.prepend(Common.renderer.domElement);

      const sim = new Simulation({
        iterations_poisson: iterationsPoisson,
        iterations_viscous: iterationsViscous,
        mouse_force: mouseForce,
        resolution: resolutionVal,
        cursor_size: cursorSize,
        viscous: viscousVal,
        isBounce: isBounce,
        dt: dt,
        isViscous: isViscous,
        BFECC: BFECC
      });

      const output = new Output(paletteTex, bgVec4, sim);

      let running = false;
      let rafId = null;
      const lastUserInteraction = { value: performance.now() };
      const targetInterval = 1000 / 30;
      let lastFrameTime = 0;

      Mouse.onInteract = function () {
        lastUserInteraction.value = performance.now();
        if (autoDriver) autoDriver.forceStop();
      };

      const autoDriver = new AutoDriver(Mouse, { get lastUserInteraction() { return lastUserInteraction.value; } }, {
        enabled: autoDemoEnabled, speed: autoSpeed, resumeDelay: autoResumeDelay, rampDuration: autoRampDuration
      });

      function loop(now) {
        if (!running) return;
        rafId = requestAnimationFrame(loop);
        if (now - lastFrameTime < targetInterval) return;
        lastFrameTime = now;
        autoDriver.update();
        Mouse.update();
        Common.update();
        output.update();
      }

      function start() { if (!running) { running = true; loop(); } }
      function pause() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }
      function resize() { Common.resize(); output.resize(); }
      function dispose() {
        pause();
        Mouse.dispose();
        if (Common.renderer) {
          const c = Common.renderer.domElement;
          if (c.parentNode) c.parentNode.removeChild(c);
          Common.renderer.dispose();
        }
      }

      const onVisibility = function () { if (document.hidden) pause(); else start(); };
      document.addEventListener("visibilitychange", onVisibility);

      const ro = new ResizeObserver(function () { requestAnimationFrame(resize); });
      ro.observe(container);

      start();

      function setColors(newColors) {
        const tex = makePaletteTexture(newColors);
        output.output.material.uniforms.palette.value.dispose();
        output.output.material.uniforms.palette.value = tex;
      }

      return { start: start, pause: pause, resize: resize, setColors: setColors, dispose: function () { document.removeEventListener("visibilitychange", onVisibility); ro.disconnect(); dispose(); } };
    }
  };
})();
