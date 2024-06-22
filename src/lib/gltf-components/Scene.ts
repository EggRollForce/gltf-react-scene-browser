import { GLTFInterface, IGLTF, INode } from './Interfaces';
import { Node } from './AllComponents';
import Component from "./Component";
import App from '../../App';
import { Material } from './Material';

export interface ISceneData{
    nodes: number[];
    name?: string;
}

export interface IScene extends GLTFInterface{
    name?: string;
    nodes: INode[];
}

export class Scene implements IScene{
    public name?: string;
    public readonly nodes: Node[];
    private _loaded: boolean = false;

    constructor(scene: ISceneData, index: number, nodes: Node[]){
        this.nodes = (scene.nodes as number[]).map( n => nodes[n]);
    }

    get loaded(): boolean{
        return this.nodes.every((n) => n.loaded);
    }

    get dirty(): boolean{
        return !this.nodes.every((n) => !n.dirty);
    }

    public async load(): Promise<Scene>{
        if(this.loaded)
            return Promise.reject('Load called on an already loaded scene');
        await Promise.all(this.nodes.map((n) => n.load()));
        await Material.DEFAULT.load();
        return this;
    }

    public async setupGL(ctx?: WebGLRenderingContext){
        if(!this.loaded)
            return Promise.reject(`Cannot set up WebGL context, scene not loaded`);
        const gl = ctx?ctx:App.gl;
        await Promise.all(this.nodes.map(async (n) => n.setupGL(gl) ));

        Material.DEFAULT.setupGL(gl);

        if(Material.DEFAULT.program === null)
            throw Error("No program found on default material!")

    }

    public draw(ctx?: WebGLRenderingContext){
        if(!this.loaded) return Promise.reject(`Cannot draw to an uninilized WebGL context`);
        const gl = ctx?ctx:App.gl;
        this.nodes.forEach((n) => {
            n.draw(gl);
        })
    }
}