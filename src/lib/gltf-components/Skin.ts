import App from "../../App";
import GLTF from "../GLTF";
import { Matrix4 } from "../MatrixLib";
import { Accessor, Node } from "./AllComponents";
import { BufferView } from "./Buffer";
import Component from "./Component";
import { GLTFInterface, INode } from "./Interfaces";

export interface ISkinData{
    name?: string;
    inverseBindMatrices: number;
    joints: number[];
}

export interface ISkin extends GLTFInterface{
    name?: string;
    inverseBindMatrices: Matrix4[];
    readonly inverseBindAccessor: Accessor;
    joints:  Node[];
}

export class Skin extends Component implements ISkin{
    name?: string;
    private _data?: Float32Array = undefined;
    private _inverseBindAccessor?: Accessor = undefined;
    private _inverseBindMatrices?: Matrix4[] = undefined;
    private _joints?: Node[] = undefined;
    public parent?: Node = undefined;


    get inverseBindMatrices(): Matrix4[]{
        if(this._inverseBindMatrices)
            return this._inverseBindMatrices;
        throw Error("Uninitialized or unloaded inverse bind matrix access");
    }

    get inverseBindAccessor(): Accessor{
        if(this._inverseBindAccessor)
            return this._inverseBindAccessor;
        throw Error("Invalid skinned mesh accessor access");
    }
    
    get joints(): Node[]{
        if(this._joints)
            return this._joints;
        throw Error("Invalid reference to joint array");
    }


    public static parse(ctx: GLTF, skinList: ISkinData[]): Skin[]{
        if(!ctx.skins){
            throw Error("Context is not ready to parse skins");
        }
        if(skinList.length != ctx.skins.length){
            throw Error("Cannot parse skin data, lists are not the same length!");
        }
        skinList.forEach((skinData,index) =>{
            if(!ctx.skins){
                throw Error("Global skin object context was lost... somehow...");
            }
            if(!ctx.skins[index]){
                throw Error(`Uninitilized skin object at index ${index}`);
            }

            const out = ctx.skins[index];
            out.name = skinData.name;

            if(!((skinData.joints instanceof Array) && skinData.joints.every((j) => (typeof(j) === 'number'))))
                throw Error(`Invalid array of nodes passed to constructor`);
            out._joints = skinData.joints.map((n) => ctx.nodes[n]);
            out._inverseBindMatrices = new Array<Matrix4>(skinData.joints.length);
            out._inverseBindAccessor = ctx.accessors[skinData.inverseBindMatrices];
            out._data = new Float32Array(skinData.joints.length * Matrix4.SIZE);
        })
        return ctx.skins;
    }

    get loaded(): boolean{
        if(this._inverseBindAccessor && this._joints)
            return this._inverseBindAccessor.loaded && this._joints.every((n) => n.loaded);
        return false;
    }

    public async load(){
        if(!this.inverseBindAccessor.loaded) await this.inverseBindAccessor.load();
        this._data = this.inverseBindAccessor.readBufferTyped(Float32Array);
        this.joints.forEach((_,idx: number) => {
            if(this._data){
                this.inverseBindMatrices[idx] = new Matrix4();
                this.inverseBindMatrices[idx].set(this._data.subarray(idx*Matrix4.SIZE,(idx + 1)*Matrix4.SIZE));
            }else{
                throw Error("Raw inverse bind matrix data was somehow orphaned!");
            }
        });
        return this;
    }


    public matrixData(): Float32Array{
        if(!(this._data && this._joints && this._inverseBindMatrices))
            throw Error("Tried to access matrix data on uninitilized skin")
        if(this.parent === undefined)
            return this._data;

        this.joints.forEach((j,idx) => {
            if(j.dirty){
                const mat = new Matrix4();
                if(!this.parent)
                    return;
                this.parent.global.inverse(mat);
                mat.multiplyMat4(j.global);
                mat.multiplyMat4(this.inverseBindMatrices[idx]);
                if(!this._data)
                    throw Error("Somehow a skin lost a reference to it's matrix data!");
                this._data.set(mat,16*idx);
            }
        })
        return this._data;
    }

}