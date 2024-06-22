import { IBufferView, IGLTF, IImage } from "./Interfaces";
import { Buffer, ImageView } from './AllComponents';
import GLTF from "../GLTF";


export interface ITexture{
    readonly id?: number;
    readonly source: number | IImage | undefined;
    readonly sampler?: number;
}

export class Texture implements ITexture{
    private readonly gltf: GLTF;
    private texUnit: WebGLTexture | null = null;
    private _loaded: boolean = false;
    private _dirty: boolean = false;
    private readonly _source: number;
    readonly sampler?: number | undefined;
    readonly id: number;
    private image: HTMLImageElement | HTMLVideoElement;

    constructor(gltf: GLTF, tex: ITexture, id: number){
        this.gltf = gltf;
        this.id = tex.id?tex.id:0;
        if(typeof(tex.source) !== "number")
            throw Error(`Cannot inilize Texture ${this.id}, invalid image source index`);

        this._source = tex.source;
        this.image = new Image();

    }

    get source(): ImageView | undefined{
        return this.gltf.images?.[this._source];
    }

    get binding(): WebGLTexture | null {
        return this.texUnit;
    }

    get bound(): boolean{
        return this.texUnit instanceof WebGLTexture;
    }

    get loaded(): boolean{
        return this._loaded;
    }


    async load(): Promise<Texture> {
        if(this._loaded)
            return Promise.reject(`Texture with id ${this.id} already loaded`);
        const ilink = this.source;
        if(ilink ===  undefined)
            throw Error(`Error: Texture has no valid source, yet it is marked as loaded!`);
        return await new Promise<Texture>((resolve) =>{
            if(!ilink.uri){
                let data = "data:";
                data += ilink.mimeType;
                data += ";base64,";
                const view = ilink.bufferView;
                if(!view.loaded) return Promise.reject(`Invalid buffer view when loading data for Texture id ${this.id}`);

                let binstr: string = "";
                (new Uint8Array(view.buffer, view.byteOffset, view.byteLength)).forEach(ch => binstr += String.fromCharCode(ch));
                data += btoa(binstr);
                ilink.uri = data;
            }

            this.image.onload = (evt) => {
                this._loaded = true;
                resolve(this);
            };
            this.image.src = ilink.uri;
        })
    }

    public async setupGL(gl: WebGLRenderingContext){
        if(this.texUnit) return;
        if(!this.source) throw Error(`Texture has no image source!`);
        this.texUnit = gl.createTexture();
        if(!this.texUnit) throw Error(`Failed to create texture unit`);

        gl.activeTexture(gl.TEXTURE0 + this.source.id);
        gl.bindTexture(gl.TEXTURE_2D, this.texUnit);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.generateMipmap(gl.TEXTURE_2D);

    }

}