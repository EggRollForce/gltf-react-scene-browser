import { TypedArrays } from '../GLTF-util';
import { IGLTF, IBufferView } from './Interfaces';
import { Buffer } from './AllComponents';
import { BufferView } from './Buffer';
import GLTF from '../GLTF';

export interface IAccessor{
    bufferView: number | IBufferView;
    componentType: number;
    count: number;
    type: string;
    max?: number[];
    min?: number[];
}

export class Accessor implements IAccessor{
    private readonly gltf: GLTF;
    readonly id: number;

    private readonly _bufferView;
    readonly componentType: number;
    readonly count: number;
    readonly type: string;
    readonly typeSize: number = 0;
    readonly max?: number[];
    readonly min?: number[];

    constructor(gltf: GLTF, acc: IAccessor, id: number, bufferViews: BufferView[]){
        this.gltf = gltf;
        this.id = id;
        this.componentType = acc.componentType;
        this.count = acc.count;
        this.type = acc.type;
        this.min = acc.min;
        this.max = acc.max;
        this._bufferView = acc.bufferView as number;
        switch(this.type){
            case "MAT4":
                this.typeSize += 7;
            case "MAT3":
                this.typeSize += 5;
            case "VEC4":
            case "MAT2":
                this.typeSize += 1;
            case "VEC3":
                this.typeSize += 1;
            case "VEC2":
                this.typeSize += 1;
            case "SCALAR":
                this.typeSize += 1;
        }
    }

    get loaded(): boolean{
        return this.bufferView.loaded;
    }

    get bufferView(): BufferView{
        return this.gltf.bufferViews[this._bufferView];
    }

    public async load(){
        if(typeof(this.bufferView.buffer) === 'number')
            return Promise.reject(`Attempt to load uninilized or derefereced buffer object`);
        if(!this.loaded)
            await this.bufferView.load();
        return this;
    }

    public async setupGL(gl: WebGLRenderingContext, usage: number){
        if(!this.loaded)
            throw Error(`Cannot inialize WebGL with an unloaded buffer`);

        await this.bufferView.setupGL(gl, usage);
    }

    public readBufferRaw(): Uint8Array{
        return this.readBufferTyped(Uint8Array)
    }

    public readBufferTyped<T extends TypedArrays>(C: new (buf:ArrayBuffer, off: number, len:number) => T): T{
        const ab = this.bufferView;

        if(!(ab.loaded && (ab.buffer instanceof Buffer)))
            throw Error(`Attempt to read from an unloaded buffer`);

        const elm = C.prototype as TypedArrays;
        return new C(ab.buffer, this.bufferView.byteOffset, this.bufferView.byteLength/elm.BYTES_PER_ELEMENT);
    }
}