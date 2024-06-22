import GLTF from "../GLTF";
import { BufferView } from "./Buffer";
import { IBufferView } from "./Interfaces";

export interface IImage{
    readonly bufferView: number | IBufferView;
    readonly mimeType: string;
    readonly name: string;
    readonly uri: string;
}

export class ImageView implements IImage{
    private readonly gltf: GLTF;
    readonly id: number;
    private readonly _bufferView: number;
    readonly mimeType: string;
    readonly name: string;
    uri: string;

    constructor(gltf: GLTF, img: IImage, index: number){
        this.gltf = gltf;
        this.id = index;
        if(!((typeof(img.bufferView) === 'number') || (img.bufferView instanceof BufferView)))
            throw Error('')
        if(typeof(img.bufferView) === 'number'){
            this._bufferView = img.bufferView;
        }
        this._bufferView = img.bufferView as number;
        this.mimeType = img.mimeType;
        this.name = img.name;
        this.uri = img.uri;
    }

    get bufferView(): BufferView{
        return this.gltf.bufferViews[this._bufferView];
    }

}