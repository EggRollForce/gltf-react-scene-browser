import GLTF from "../GLTF";

export interface IBufferView{
    readonly id?: number;
    readonly buffer: number | IBuffer;
    readonly byteLength: number;
    readonly byteOffset: number;
}

export interface IBuffer{
    readonly id?: number;
    readonly byteLength: number;
    readonly uri: string;
}

export class BufferView implements ArrayBufferView, IBufferView{
    private readonly gltf: GLTF;
    private _binding: WebGLBuffer | null = null;
    private _buffer: number;
    readonly id: number;
    readonly byteLength: number;
    readonly byteOffset: number;

    constructor(gltf: GLTF, bufView: IBufferView, index: number){
        this.gltf = gltf;
        this.id = index;
        if(typeof(bufView.buffer) !==  'number') 
            throw Error(`Cannot inilize buffer view ${this.id}: Buffer not initilized`);
        this._buffer = bufView.buffer;
        this.byteLength = bufView.byteLength;
        this.byteOffset = bufView.byteOffset;
    }

    get loaded(): boolean{
        return this.buffer.loaded;
    }
    get binding(): WebGLBuffer | null{
        return this._binding;
    }
    get buffer(): Buffer {
        return this.gltf.buffers[this._buffer];
    }

    public async setupGL(gl: WebGLRenderingContext, usage: number){
        if(!(this.buffer.loaded && this.buffer instanceof ArrayBuffer))
            throw Error(`Cannot initilize GL buffer data using unloaded or invalid buffer`);
        let buf = gl.createBuffer();
        if(buf === null) throw Error(`Failed to create webgl buffer for buffer id: ${this.id}`);

        this._binding = buf;

        gl.bindBuffer(usage, this.binding);
        const a = new Uint8Array(this.buffer,this.byteOffset,this.byteLength);
        gl.bufferData(usage, a , gl.STATIC_DRAW);
    }

    public async load(){ 
        if(!this.loaded){
            this.gltf.buffers[this.buffer.id] = await this.buffer.load()
        }
    }
}

// tslint:disable-next-line: max-classes-per-file
export class Buffer extends ArrayBuffer implements IBuffer{
    private _loaded: boolean = false;
    readonly id: number;
    readonly uri: string;

    constructor( buffer: IBuffer, index: number){
        super(buffer.byteLength);
        this.id = index;
        this.uri = buffer.uri;
    }

    get loaded(): boolean{
        return this._loaded && this.byteLength !== 0;
    }

    public async load(): Promise<Buffer>{
        let arrBuf: Buffer = this;
        if(!this.loaded){
            arrBuf = Buffer.__constructFromArrayBuffer(await (await fetch(this.uri)).arrayBuffer(),this);
            arrBuf._loaded = true;
        }
        return arrBuf;
    }

    private static __constructFromArrayBuffer(src: ArrayBuffer, temp: Buffer): Buffer{
        Object.setPrototypeOf(src, Buffer.prototype);
        Object.assign(src, temp);
        Object.defineProperty(src, "loaded", {
            enumerable: false,
            configurable: false,
            get(): boolean {
                return (src as Buffer)._loaded;
            }
        })
        return (src as Buffer);
    }

}