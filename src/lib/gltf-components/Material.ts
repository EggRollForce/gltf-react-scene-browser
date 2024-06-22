import GLTF from "../GLTF";
import { Matrix4 } from "../MatrixLib";
import { Texture } from "./AllComponents";
import { ITexture } from "./Interfaces";

export interface IMaterial{
    readonly id?: number;
    readonly name: string;
    pbrMetallicRoughness?: {
        baseColorTexture?: {
            index?: number | ITexture;
            texCoord: number;
        }
    }
}

const VSHADR_SRC: string =
`attribute vec3 position;
 attribute vec3 normal;
 attribute vec2 texcoord_0;
 attribute vec4 joints_0;
 attribute vec4 weights_0;

 uniform mat4 projection;
 uniform mat4 model;
 uniform mat4 view;
 uniform mat4 normMat;

 uniform mat4 invBindMat[128];
 uniform bool useSkin;

 varying vec3 o_normal;
 varying highp vec2 texCoord;
 varying vec3 color;
 varying vec3 o_pos;

 void main(){
     mat4 skinMat =
        weights_0.x * invBindMat[int(joints_0.x)] +
        weights_0.y * invBindMat[int(joints_0.y)] +
        weights_0.z * invBindMat[int(joints_0.z)] +
        weights_0.w * invBindMat[int(joints_0.w)];
    vec4 vert;
     if(useSkin){
        vert = model * skinMat * vec4(position, 1);
        o_normal = vec3(normMat * skinMat * vec4(normal,0.0));
     }else{
        vert = model * vec4(position, 1);
        o_normal = vec3(normMat * vec4(normal,0.0));
     }
     gl_Position = projection * view * vert;
     o_pos = vec3(vert) / vert.w;
     texCoord = texcoord_0;
 }
`;
const FSHADR_SRC: string =
`
precision mediump float;

varying vec3 o_normal;
varying vec3 o_pos;
varying highp vec2 texCoord;
varying vec3 color;

uniform sampler2D colorTex;

uniform vec3 cameraPos;

uniform vec4 fogCol;
uniform highp float fogStart;
uniform highp float fogExp;

uniform vec3 lightPos;
uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specColor;
uniform float shininess;

void main(){
    vec3 lightDir = normalize(lightPos - o_pos);

    vec3 norm = normalize(o_normal);
    vec3 viewDir = normalize(cameraPos - o_pos);
    vec3 light = ambientColor;
    vec4 v = texture2D(colorTex, texCoord);
    float att = dot(lightDir, norm);
    if(att > 0.0){
        float specAngle = max(dot(reflect(-lightDir, norm), viewDir),0.0);
        float spec = pow(specAngle,shininess);
        light += diffuseColor * att;
        light += specColor * spec;
    }
    vec4 col = vec4(v.rgb * min(light,vec3(1)),v.a);
    gl_FragColor = mix(col,fogCol,clamp(exp((gl_FragCoord.z/gl_FragCoord.w - fogStart)*fogExp),0.0,1.0));
    //gl_FragColor = vec4(norm,1);
}
`;

export class Material implements IMaterial{
    public static readonly DEFAULT = new Material({} as GLTF, {name: "DEFAULT"}, -1);
    private readonly gltf: GLTF;

    public model: WebGLUniformLocation | null = null;
    public view: WebGLUniformLocation | null = null;
    public projection: WebGLUniformLocation | null = null;
    public fogCol: WebGLUniformLocation | null = null;
    public fogStart: WebGLUniformLocation | null = null;
    public fogExp: WebGLUniformLocation | null = null;
    public normMat: WebGLUniformLocation | null = null;
    public camPos: WebGLUniformLocation | null = null;
    public lightPos: WebGLUniformLocation | null = null;
    public ambient: WebGLUniformLocation | null = null;
    public diffuse: WebGLUniformLocation | null = null;
    public specular: WebGLUniformLocation | null = null;
    public shininess: WebGLUniformLocation | null = null;
    private _sampler: WebGLUniformLocation | null = null;
    private _compiled: boolean = false;
    private _program: WebGLProgram | null = null;
    readonly id: number;
    readonly name: string;
    private readonly _texture?: number;
    readonly texCoord: number;
    readonly pbrMetallicRoughness: {
        baseColorTexture?: {
            index?: number | Texture;
            texCoord: number;
        }
    };
    public skinloc: WebGLUniformLocation | null = null;
    public skinflag: WebGLUniformLocation | null = null;

    constructor(gltf: GLTF, mat: IMaterial, index: number){
        this.gltf = gltf;
        this.id = index;
        this.name = mat.name;
        this.texCoord = (mat.pbrMetallicRoughness?.baseColorTexture)?mat.pbrMetallicRoughness.baseColorTexture.texCoord:0;
        this._texture = mat.pbrMetallicRoughness?.baseColorTexture?.index as (number | undefined);
        this.pbrMetallicRoughness = {
            ...mat.pbrMetallicRoughness,
            baseColorTexture: mat.pbrMetallicRoughness?.baseColorTexture?{
                ...mat.pbrMetallicRoughness.baseColorTexture,
                index: this.texture,
            } : undefined
        }
    }

    get texture(): Texture | undefined {
        return (this._texture !== undefined) ? this.gltf.textures?.[this._texture] : undefined;
    }

    get program(): WebGLProgram | null {
        return this._program ? this._program : Material.DEFAULT._program;
    }

    get loaded(): boolean{
        return this._texture === undefined || (this.texture instanceof Texture && this.texture.loaded) || this.name === "DEFAULT";
    }

    get ready(): boolean{
        return this._program !== null && this._compiled;
    }

    get sampler(): WebGLUniformLocation | null{
        return this._sampler;
    }

    public async load(){
        if(!this.loaded)
            await this.texture?.load();
        return this;
    }

    public async setupGL(gl: WebGLRenderingContext){
        if(!this.program)
            await Material.buildProgramFromSource(this, gl);

        await this.texture?.setupGL(gl);


        if(this.program instanceof WebGLProgram){
            this.lightPos = gl.getUniformLocation(this.program,"lightPos");
            this.ambient = gl.getUniformLocation(this.program,"ambientColor");
            this.diffuse = gl.getUniformLocation(this.program,"diffuseColor");
            this.specular = gl.getUniformLocation(this.program,"specColor");
            this.shininess = gl.getUniformLocation(this.program,"shininess");
            this.model = gl.getUniformLocation(this.program,"model");
            this.view = gl.getUniformLocation(this.program,"view");
            this.projection = gl.getUniformLocation(this.program,"projection");
            this.camPos = gl.getUniformLocation(this.program,"cameraPos");
            this.normMat = gl.getUniformLocation(this.program, "normMat");
            this.skinloc = gl.getUniformLocation(this.program,"invBindMat");
            this.skinflag = gl.getUniformLocation(this.program,"useSkin");
            this.fogCol = gl.getUniformLocation(this.program,"fogCol");
            this.fogStart = gl.getUniformLocation(this.program,"fogStart");
            this.fogExp = gl.getUniformLocation(this.program,"fogExp");
            if(this.texture)
                this._sampler = gl.getUniformLocation(this.program,"colorTex");
        }

    }

    private static async buildProgramFromSource(mat: Material, gl: WebGLRenderingContext, v?: string, f?: string) {
        const vsrc = v?v:VSHADR_SRC;
        const fsrc = f?f:FSHADR_SRC;
        if(mat._program){
            gl.deleteProgram(mat._program);
            mat._program = null;
        }
        mat._program = gl.createProgram();
        const p = mat._program;
        if(!(p instanceof WebGLProgram)){
            return Promise.reject(`Failed to create program`);
        }
        return new Promise<WebGLProgram>(async(resolve,reject) => {
            gl.attachShader(p, await Material.compileShader(mat,gl,gl.VERTEX_SHADER,vsrc));
            gl.attachShader(p, await Material.compileShader(mat,gl,gl.FRAGMENT_SHADER,fsrc));
            gl.linkProgram(p);
            if(!gl.getProgramParameter(p,gl.LINK_STATUS)){
                const msg = gl.getProgramInfoLog(p);
                return reject(`Failed to link shader program\nErr: ${msg}`);
            }
            resolve(p);
        }).catch((msg) => {
            gl.deleteProgram(p);
            return Promise.reject(msg);
        })
    }

    private static async compileShader(mat: Material, gl: WebGLRenderingContext, type: number, source: string): Promise<WebGLShader>{
        const shader = gl.createShader(type);
        if(!(shader instanceof WebGLShader)){
            return Promise.reject("Failed to create shader");
        }

        gl.shaderSource(shader,source);
        gl.compileShader(shader);
        if(gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
            mat._compiled = true;
            return shader;
        }

        const err = gl.getShaderInfoLog(shader)
        gl.deleteShader(shader);
        return Promise.reject(`Shader compilation error:\n${err}`);
    }

}