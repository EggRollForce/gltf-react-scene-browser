import { ArrayBacked, Matrix4, Quaternion, Vector3 } from "../MatrixLib";
import { IMesh, ISkin, ICamera, IGLTF } from "./Interfaces";
import { Camera, Mesh } from './AllComponents';
import { Skin } from "./Skin";
import GLTF from "../GLTF";
import Component from "./Component";


export interface INodeData{
    readonly id?: number;
    readonly name: string;
    matrix?: number[];
    translation?: number[];
    rotation?: number[];
    scale?: number[];
    mesh?: number;
    camera?: number;
    skin?: number;
    readonly children?: number[];
}

export interface INode{
    name?: string;
    readonly matrix:  Matrix4;
    readonly translation:  Vector3;
    readonly rotation: Quaternion;
    readonly scale:  Vector3;
    mesh?: IMesh;
    camera?: ICamera;
    skin?: ISkin;
    readonly children?: INode[];
}

export class Node extends Component implements INode{
    private _loaded: boolean = false;
    private _dirty: boolean = false;
    public name?: string;
    public parent?: Node;
    private readonly _globalMatrix: Matrix4 = new Matrix4();
    private readonly _localMatrix: Matrix4 = new Matrix4();
    public readonly translation: Vector3 = new Vector3(0);
    public readonly rotation: Quaternion = new Quaternion(0);
    public readonly scale: Vector3 = new Vector3(1);
    public mesh?: Mesh;
    public camera?: Camera;
    public skin?: Skin;
    public children: Node[] = [];

    get hasMesh(): boolean{
        return this.mesh !== undefined;
    }

    get hasCamera(): boolean{
        return this.camera !== undefined;
    }

    get matrix(): Matrix4{
        return this._localMatrix;
    }

    constructor(parent?: Node){
        super();
        this.parent = parent;
        if(this.parent){
            this.parent.children.push(this);
        }
    }

    public static parse(gltf: GLTF, nodeArray: INodeData[]): Node[]{
        const nodes = new Array<Node>(nodeArray.length);

        nodeArray.forEach((nodeData, index) => {
            if(nodes === undefined){
                return;
            }
            if(!nodes[index]){
                nodes[index] = new Node();
            }
            const node = nodes[index];

            node.name = nodeData.name;
            if(nodeData.translation){
                node.translation.set(nodeData.translation);
                ArrayBacked.setDirtyFlag(node.translation);
            }
            if(nodeData.rotation && nodeData.rotation instanceof Array && nodeData.rotation.length === Quaternion.SIZE){
                node.rotation.set(nodeData.rotation);
                ArrayBacked.setDirtyFlag(node.rotation);
            }
            if(nodeData.scale && nodeData.scale instanceof Array && nodeData.scale.length === Vector3.SIZE){
                node.scale.set(nodeData.scale);
                ArrayBacked.setDirtyFlag(node.scale);
            }
            if(nodeData.matrix && nodeData.matrix instanceof Array && nodeData.matrix.length === Matrix4.SIZE){
                node._localMatrix.set(nodeData.matrix);
                ArrayBacked.setDirtyFlag(node._localMatrix);
            }
            node.mesh = (typeof(nodeData.mesh) === 'number') ? gltf.meshes[nodeData.mesh] : undefined;
            if(node.mesh){
                node.mesh.parent = node;
            }
            if(typeof(nodeData.camera) === 'number'){
                node.camera = gltf.cameras?.[nodeData.camera];
            }
            if(node.camera){
                node.camera.parent = node;
            }
            if(typeof(nodeData.skin) === 'number'){
                if(!gltf.skins)
                    throw Error(`No valid skin list initilized!`)
                node.skin = gltf.skins[nodeData.skin];
                gltf.skins[nodeData.skin].parent = node;
            }

            node.children = nodeData.children && nodes !== undefined ? nodeData.children.map((n) => {
                nodes[n].parent = node;
                return nodes[n];
            }): [];
        }
        );
        return nodes;
    }

    get global(): Matrix4{
        if(this.parent === undefined){
            return this.local;
        }
        if(this.parent.dirty || this.dirty){
            this.parent.global.multiplyMat4(this.local, this._globalMatrix);
        }

        return this._globalMatrix;
    }

    get local(): Matrix4{
        if(this.translation.dirty || this.scale.dirty || this.rotation.dirty){
            this._localMatrix.identity();
            this._localMatrix.translate(this.translation.x,this.translation.y,this.translation.z);
            const r = Matrix4.quatRotate(this.rotation);
            this._localMatrix.multiplyMat4(r);
            this._localMatrix.scale(this.scale.x,this.scale.y,this.scale.z);
        }
        return this._localMatrix;
    }

    get dirty(): boolean{
        return this.translation.dirty || this.rotation.dirty || this.scale.dirty || this._localMatrix.dirty;
    }


    get loaded(): boolean{
        return (this.mesh?this.mesh.loaded : true) &&
            (this.skin ? this.skin.loaded : true) &&
            (this.children.length !== 0 ? this.children.every((n) => n.loaded) : true);
    }

    public findChildByName(name: string) : Node | undefined{
        for(const child of this.children){
            if(child.name === name){
                return child;
            }
            const found = child.findChildByName(name);
            if(found)
                return found;
        }
        return undefined;
    }


    public async load(){
        await this.mesh?.load();
        await this.skin?.load();
        await Promise.all(this.children.map((c) => c.load()));
        return this;
    }

    public async setupGL(gl: WebGLRenderingContext){
        await this.mesh?.setupGL(gl);
        await Promise.all(this.children.map((c) => c.setupGL(gl)));
    }

    public draw(gl: WebGLRenderingContext){
        this.mesh?.draw(gl);
        this.children.forEach((c) =>{
            c.draw(gl);
        })
    }


}
