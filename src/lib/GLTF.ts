import { 
    IAccessor, IBuffer, IBufferView,
    ICamera, IImage, IMaterial,
    IMesh, INode, IScene,
    ISkin, ITexture
} from './gltf-components/Interfaces';

import { 
    Accessor, Camera, Material,
    Buffer, Node, Mesh, 
    Scene, Skin, Texture, ImageView
} from './gltf-components/AllComponents';
import { BufferView } from './gltf-components/Buffer';
import { INodeData } from './gltf-components/Node';
import { ISceneData } from './gltf-components/Scene';
import { ISkinData } from './gltf-components/Skin';

interface IGLTFData{
    asset: any;
    scene: number;
    scenes: ISceneData[];
    nodes: INodeData[];
    materials?: IMaterial[];
    meshes: IMesh[];
    textures?: ITexture[];
    images?: IImage[];
    skins?: ISkinData[];
    accessors: IAccessor[];
    bufferViews: IBufferView[];
    buffers: IBuffer[];
    cameras?: ICamera[];
}

export interface IGLTF{
    asset: any;
    scene: number | IScene;
    scenes: IScene[];
    nodes: INode[];
    materials?: IMaterial[];
    meshes: IMesh[];
    textures?: ITexture[];
    images?: IImage[];
    skins?: ISkin[];
    accessors: IAccessor[];
    bufferViews: IBufferView[];
    buffers: IBuffer[];
    cameras?: ICamera[];
}

export default class GLTF implements IGLTF{
    readonly asset: any;
    private _scene: number;
    readonly scenes: Scene[];
    readonly nodes: Node[];
    readonly materials?: Material[];
    readonly meshes: Mesh[];
    readonly textures?: Texture[];
    readonly images?: ImageView[];
    readonly skins?: Skin[];
    readonly accessors: Accessor[];
    readonly bufferViews: BufferView[];
    readonly buffers: Buffer[];
    readonly cameras?: Camera[];

    private constructor(gl: IGLTFData){
        this._scene = (typeof(gl.scene) === 'number') ? gl.scene : 0;

        this.buffers = gl.buffers.map((b,idx) => new Buffer(b,idx));
        this.bufferViews = gl.bufferViews.map((bv,idx) => new BufferView(this, bv, idx));
        this.accessors = gl.accessors.map((a,idx) => new Accessor(this, a, idx, this.bufferViews));

        this.images = gl.images?.map((i, idx) => new ImageView(this, i, idx));
        this.textures =  gl.textures?.map((t,idx)  => new Texture(this, t, idx));
        this.materials = gl.materials?.map((m,idx) => new Material(this, m, idx));

        this.meshes =  gl.meshes.map((m,idx)   => new Mesh(this, m, idx));
        this.cameras = gl.cameras?.map((c,idx) => new Camera(c, idx));
        if(gl.skins)
            this.skins = gl.skins.map(() => new Skin());
        
        this.nodes = Node.parse(this, gl.nodes as INodeData[]);
        this.scenes = gl.scenes.map((s,idx) => new Scene(s,idx, this.nodes));
        if(gl.skins)
            Skin.parse(this, gl.skins);

        this.cameras?.forEach((c) => c.setupCorrection());
    };

    static async parse(obj: IGLTF | string | Blob | File): Promise<GLTF> {
        if(obj === undefined)
            throw Error("Cannot load GLTF: input object is undefined");
        
        let content: string | object = obj;
        if(obj instanceof Blob){
            content = await obj.text();
        }else if(obj instanceof File){
            content = await obj.text();
        }
        
        if(typeof(content) === "string"){
            content = (JSON.parse(content) as IGLTF);
        }

        if(typeof(content) === "string")
            throw Error('Failed to load object representation of gltf string');

        return new GLTF(content as IGLTFData);
    }

    get scene(): Scene {
        return this.scenes[this._scene];
    }

}

