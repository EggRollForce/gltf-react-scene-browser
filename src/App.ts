import GLTF from './lib/GLTF';
import { Camera, Node, Scene } from './lib/gltf-components/AllComponents';
import Component from "./lib/gltf-components/Component";
import { IPerspCam } from './lib/gltf-components/Camera';
import { Matrix4, Quaternion, Vector3 } from './lib/MatrixLib';

export default class App{
    private static singleton: App;
    private static drawHandle?: number;
    static readonly keyStates: Map<string,boolean> = new Map<string,boolean>();
    private nextSecond: number = 0;
    private lastFrame: number = 0;
    private firstFrame: number = 0;
    private delta: number = 0;
    readonly gl:WebGLRenderingContext;
    readonly canvas: HTMLCanvasElement;
    private readonly fpsCounter?: HTMLSpanElement;
    private _gltf: GLTF | null = null;

    static get gltf(): GLTF | null{
        return this.app.gltf;
    }

    get gltf(): GLTF | null{
        return this._gltf;
    }

    static get app(): App{
        return this.singleton;
    }

    static get canvas(): HTMLCanvasElement{
        return App.app.canvas;
    }

    static get gl(): WebGLRenderingContext{
        return App.app.gl;
    }

    static get fps(): number{
        return App.app.fps;
    }

    static get scene(): Scene | undefined{
        return this.gltf?.scene;
    }

    static get camera(): Camera{
        const c = this.gltf?.cameras?.[0];
        return (c !== undefined) ? c : Camera.DEFAULT_PERSP;
    }

    static get components(): Map<string,Component>{
        return Component.components;
    }

    get fps(): number{
        return 1e3/this.delta;
    }


    constructor() {
        if(App.singleton){
            throw Error('Cannot create another instance of the app');
        }
        // Retrieve <canvas> element
        this.canvas = (document.getElementById('viewport') as HTMLCanvasElement);

        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        if (!this.canvas) {
            throw Error('Failed to retrieve the <canvas> element');
        }

        this.fpsCounter = (document.getElementById('fps') as HTMLSpanElement | undefined)

        // Register mouse events
        this.canvas.onmousedown = (evt) => {
            this.canvas.requestPointerLock();
        };

        const handlePointer = (evt: PointerEvent) =>{
            const dx = evt.movementX;
            const dy = evt.movementY;

            const n = App.ctrl ? App.ctrl : App.camera.parent;
            if(n){
                n.rotation.rotate(-(dy* 0.1 * Math.PI)/180, Camera.RIGHT,false);
                n.rotation.rotate(-(dx* 0.1 * Math.PI)/180, Camera.UP,true);
            }
        }

        document.onpointerlockchange = (evt) => {
            if(document.pointerLockElement === this.canvas){
                this.canvas.onpointermove = handlePointer;
            }else{
                this.canvas.onpointermove = null;
            }
        }

        document.body.ondragstart = (evt) => {
            if(evt.dataTransfer){
                evt.dataTransfer.effectAllowed = "move";
            }
        }

        document.body.ondragover = (evt) => {
            evt.preventDefault();
            if(evt.dataTransfer){
                evt.dataTransfer.dropEffect = "none";
                if(evt.dataTransfer.types.includes("Files") && evt.dataTransfer.items.length === 1){
                    evt.dataTransfer.dropEffect = "move";
                }
            }
        }

        document.body.ondrop = (evt) => {
            evt.preventDefault();
            if(!(evt.dataTransfer && evt.dataTransfer.files.length > 0)){
                throw Error("No file to read from drop!")
            }
            if(App.drawHandle){
                cancelAnimationFrame(App.drawHandle);
                App.drawHandle = undefined;
            }
            this.nextSecond = 0;
            this.lastFrame = 0;
            this.firstFrame = 0;
            this.delta = 0;
            const item = evt.dataTransfer.files;

            GLTF.parse(item[0]).then((gltf) =>
                App.app.useGLTF(gltf).then(() => {
                    App.scene?.setupGL().then(() => App.initilizeDrawLoop())
                })
            )
        }

        document.onkeydown = (evt) => {
            if(!(evt.target instanceof HTMLBodyElement))
                return

            App.keyStates.set(evt.key.toLowerCase(),true);
            if(evt.key.toUpperCase() === "F"){
                App.fly = !App.fly;
            }
            if(evt.key === "Escape"){
                document.exitPointerLock();
            }

            if(evt.key === " ")
                if(this.deltaV.y <= 0)
                    this.deltaV.add(0,0.025,0);

            if(evt.key.toLowerCase() === "c")
                if(this.deltaV.y > -0.5)
                    this.deltaV.sub(0,0.025,0);

            evt.preventDefault();
        }

        document.onkeyup = (evt) => {
            if(!(evt.target instanceof HTMLBodyElement))
                return

            App.keyStates.set(evt.key.toLowerCase(),false);
            evt.preventDefault();
        }

        // this.canvas.onwheel = (evt) => {
        //     evt.preventDefault();
        //     if(evt.deltaY < 0){
        //         App.sens *= 2;
        //     }else{
        //         App.sens /= 2;
        //     }
        //     App.sens = App.sens < 0.0001 ? 0.0001 : App.sens > 0.064 ? 0.064 : App.sens;
        // }



        // Handle file events
        // Get the rendering context for 2DCG
        this.gl = (this.canvas.getContext('webgl') as WebGLRenderingContext);

        // Make sure there is only ever one instance of the application
        App.singleton = this;


        this.clearCanvas();
    }

    public static initilizeDrawLoop(){
        if(this.drawHandle) return;

        this.drawHandle = requestAnimationFrame(App.app.draw.bind(App.app));
    }

    public static sens = 0.0001;

    public static ctrl?: Node;

    private readonly deltaV = new Vector3();

    public static fly: boolean = false;

    public static fogColor: Float32Array = new Float32Array([0.5,0.5,0.5,1.0]);
    public static fogDistance: number = 100;
    public static fogFalloff: number = 1;
    public static lightpos: Node = new Node();
    public static ambient: Float32Array = new Float32Array([0.0,0.0,0.0]);
    public static diffuse: Float32Array = new Float32Array([1.0,1.0,1.0]);
    public static specular: Float32Array = new Float32Array([1.0,1.0,1.0]);
    public static shininess: number = 50.0;

    public draw(time: number){
        const gl = this.gl;
        this.delta = time-this.lastFrame;

        gl.clearColor(App.fogColor[0],App.fogColor[1],App.fogColor[2],App.fogColor[3])
        // tslint:disable-next-line: no-bitwise
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE)
        gl.cullFace(gl.BACK);

        const cam = App.camera;
        const par = cam.parent;
        const ks = App.keyStates;

        // Friction
        this.deltaV.x *= 0.75;
        this.deltaV.z *= 0.75;
        // Gravity, Nice!
        if(!App.fly){
            this.deltaV.y -= (0.1 * this.delta/1e3);
        }else{
            this.deltaV.y *= 0.75;
        }

        if(this.deltaV.magnitude() < 0.001)
            this.deltaV.mul(0);

        if(ks.get("s")){
            const m = cam.forward.mul(this.delta*App.sens);
            this.deltaV.add(m.x, App.fly ? m.y : 0, m.z);
        }
        if(ks.get("down") ||
        ks.get("arrowdown") && App.ctrl){
            App.ctrl?.rotation.rotate(this.delta*App.sens, new Vector3([-1,0,0]),true);
        }

        if(ks.get("w")){
            const m = cam.forward.mul(-this.delta*App.sens);
            this.deltaV.add(m.x, App.fly ? m.y : 0, m.z);
        }
        if(ks.get("up") ||
        ks.get("arrowup")){
            App.ctrl?.rotation.rotate(this.delta*App.sens, new Vector3([1,0,0]),true);
        }

        if(ks.get("a")){
            const m = cam.right.mul(-this.delta*App.sens);
            this.deltaV.add(m.x, App.fly ? m.y : 0, m.z);
        }

        if(ks.get("left") ||
        ks.get("arrowleft")){
            App.ctrl?.rotation.rotate(this.delta*App.sens, new Vector3([0,-1,0]),true);
        }

        if(ks.get("d")){
            const m = cam.right.mul(this.delta*App.sens)
            this.deltaV.add(m.x, App.fly ? m.y : 0, m.z);
        }

        if(ks.get("right") ||
        ks.get("arrowright")){
            App.ctrl?.rotation.rotate(this.delta*App.sens, new Vector3([0,1,0]),true);
        }

        if(ks.get("q")){
            par?.rotation.rotate((0.1 * Math.PI)/180, cam.forward,true);
        }
        if(ks.get("e")){
            par?.rotation.rotate(-(0.1 * Math.PI)/180, cam.forward,true);;
        }

        if(par){

            par.translation.add(this.deltaV);

            const globx = par.translation.x;
            const globy = par.translation.y;
            const globz = par.translation.z;
            if(globx > 16 || globx < -15)
                par.translation.x = Math.max(-15,Math.min(par.translation.x,16));
            if(globz > 16 || globz < -15)
                par.translation.z = Math.max(-15,Math.min(par.translation.z,16));
            if(globy > 32 || globy < 0.1){
                if(App.fly){
                    par.translation.y = Math.max(0,Math.min(par.translation.y,32));
                }else{
                    par.translation.y = Math.max(0.1,Math.min(par.translation.y,32));
                }
                this.deltaV.y = 0;
            }

        }

        App.scene?.draw();

        if(time >= this.nextSecond){
            if(this.fpsCounter){
                this.fpsCounter.textContent = `FPS: ${Math.round(this.fps)}`;
            }
            this.nextSecond = time + 1e3;
        }
        this.lastFrame = time;
        App.drawHandle = requestAnimationFrame(this.draw.bind(this));
    }

    public async useGLTF(input: GLTF){

        if(this._gltf){
            // TODO: 'Unload' assets that arent in use
            // tslint:disable-next-line: no-console
            console.error(`Uh oh, orphaning a GLTF object`);
        }

        this._gltf = input;

        const gl = this.gl;
        const gltf = this._gltf;

        return gltf.scene.load().then(() => {

            gl.viewport(0,0,this.canvas.clientWidth, this.canvas.clientHeight);
            (Camera.DEFAULT_PERSP.cfg as IPerspCam).aspectRatio = this.canvas.clientWidth/this.canvas.clientHeight;
            Camera.DEFAULT_PERSP.recalcProjection();

            // Clear the screen
            this.clearCanvas();
        });
    }



    /**
     * clearCanvas
     * Utility function for clearing canvas
     */
    public clearCanvas(){
        // Null check
        if(!(this.gl && this.canvas)) return;

        this.gl.clearColor(0.5,0.5,0.5,1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    }



}


