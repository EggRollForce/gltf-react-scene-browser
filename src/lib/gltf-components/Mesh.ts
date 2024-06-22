// tslint:disable: max-classes-per-file
import App from "../../App";
import GLTF from "../GLTF";
import { Matrix4 } from "../MatrixLib";
import { Accessor, Material, Buffer, Node} from "./AllComponents";
import Component from "./Component";
import { IAccessor, IMaterial } from "./Interfaces";

export interface IMesh{
    readonly id: number;
    readonly name: string;
    readonly primitives: IPrimitive[];
}

export interface IPrimitive{
    indices: number | IAccessor;
    material?: number | IMaterial;
    attributes: IAttributes | Attribute[];
}

interface IAttributes{
    [attr: string]: number;
}

export class Primitive implements IPrimitive {
    private readonly gltf: GLTF;
    private readonly _indices: number;
    private readonly _material?: number;
    readonly attributes: Attribute[];

    constructor(gltf: GLTF, prim: IPrimitive, index: number){
        this.gltf = gltf;
        this._indices = prim.indices as number;
        this._material = prim.material as number | undefined;
        this.attributes = Object.entries(prim.attributes as IAttributes).map(a => {
            return new Attribute(gltf, a[0], a[1]);
        });
    }
    get indices(): Accessor{
        return this.gltf.accessors[this._indices];
    }
    get material(): Material {
        return this._material !== undefined ? (this.gltf.materials ? this.gltf.materials[this._material] : Material.DEFAULT) : Material.DEFAULT;
    }

}

export class Attribute{
    private readonly gltf: GLTF;
    readonly name: string;
    private readonly _acc: number;
    private _loc: number | null = null;

    get location(): number | null{
        return this._loc;
    }

    set location(v: number | null){
        if(this._loc === null) this._loc = v;
    }

    get acc(): Accessor{
        return this.gltf.accessors[this._acc];
    }

    constructor(gl: GLTF, name: string, acc: number){
        this.gltf = gl;
        this.name = name;
        this._acc = acc;
    }
}


export class Mesh extends Component implements IMesh{
    private readonly gltf: GLTF;
    public parent?: Node;
    readonly name: string;
    readonly id: number;
    readonly primitives: Primitive[];


    constructor(gltf: GLTF, mesh: IMesh, id: number){
        super();
        this.gltf = gltf;
        this.id = id;
        this.name = mesh.name;
        this.primitives = mesh.primitives.map((i,idx) => new Primitive(gltf,i,idx));
    }

    get loaded(): boolean {
        return this.primitives.every((p) =>
            p.indices.loaded && p.material.loaded && p.attributes.every((a) => a.acc.loaded)
        );
    }

    public async load(){
        await Promise.all(this.primitives.map(async (p) =>{
            await p.indices.load();
            await p.material?.load();
            await Promise.all(p.attributes.map((attr) => attr.acc.load()));
            return this;
        }))
    }

    public async setupGL(gl: WebGLRenderingContext){
        return await Promise.all(this.primitives.map(async (p) => {
            await p.indices.setupGL(gl, gl.ELEMENT_ARRAY_BUFFER);
            await p.material?.setupGL(gl);

            for(const attr of p.attributes){
                await attr?.acc.setupGL(gl,gl.ARRAY_BUFFER);
            }

            await Mesh.linkAttriutes(this, gl);
        }))

    }


    private static async linkAttriutes(self: Mesh, gl: WebGLRenderingContext){
        self.primitives.forEach((p) => {
            if(p.material === undefined){
                throw Error(`No material associated with this mesh!`);
            }
            const mat = p.material;
            const prog = mat.program;
            if(prog === null){
                throw Error(`Material ${mat.name} has no associated program!`);
            }
            gl.useProgram(mat.program);
            p.attributes.forEach((attr) => {
                const loc = gl.getAttribLocation(prog, attr.name.toLowerCase());

                if(loc < 0 && attr.name === "POSITION")
                    throw Error(`Shader has no position attribute which is required!`);
                if(loc < 0){
                    // tslint:disable-next-line: no-console
                    console.warn(`Shader has no attribute mapped to ${attr.name.toLowerCase()}, skipping`);
                    return;
                }

                attr.location = loc;
            });

        });
    }

    public draw(gl: WebGLRenderingContext){
        const temp = new Matrix4();
        this.primitives.forEach((primitive) => {

            gl.useProgram(primitive.material.program);
            if(this.parent){
                gl.uniformMatrix4fv(primitive.material.projection, false, App.camera.projection);
                gl.uniformMatrix4fv(primitive.material.model, false, this.parent.global);
                gl.uniformMatrix4fv(primitive.material.view, false, App.camera.transform);
                temp.set(this.parent.global);
                temp.inverse();
                temp.transpose();
                gl.uniformMatrix4fv(primitive.material.normMat, false, temp);
                if(App.camera.parent)
                    gl.uniform3fv(primitive.material.camPos,App.camera.parent.translation);

                gl.uniform3fv(primitive.material.lightPos, App.lightpos.translation);
                gl.uniform3fv(primitive.material.ambient,App.ambient);
                gl.uniform3fv(primitive.material.diffuse,App.diffuse);
                gl.uniform3fv(primitive.material.specular,App.specular);
                gl.uniform1f(primitive.material.shininess,App.shininess);
            }

            if(primitive.material.fogCol){
                const mat = primitive.material;
                gl.uniform4fv(mat.fogCol,App.fogColor);
                gl.uniform1f(mat.fogStart,App.fogDistance);
                gl.uniform1f(mat.fogExp,App.fogFalloff);
            }
            if(this.parent?.skin){
                gl.uniformMatrix4fv(primitive.material.skinloc, false, this.parent.skin.matrixData());
                gl.uniform1i(primitive.material.skinflag, 1);
            }

            if(primitive.material.texture !== undefined && primitive.material.texture.source){
                const unit = primitive.material.texture.source.id;
                gl.activeTexture(gl.TEXTURE0 + unit);
                gl.uniform1i(primitive.material.sampler, unit);
            }

            primitive.attributes.forEach((attr) => {
                if(attr.location === null)
                    return;
                gl.enableVertexAttribArray(attr.location);
                gl.bindBuffer(gl.ARRAY_BUFFER, attr.acc.bufferView.binding);

                gl.vertexAttribPointer(attr.location, attr.acc.typeSize, attr.acc.componentType, false, 0, 0);
            })


            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primitive.indices.bufferView.binding);
            gl.drawElements(gl.TRIANGLES, primitive.indices.count, primitive.indices.componentType, 0);
        })
    }
}