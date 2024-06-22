import { IGLTF } from './Interfaces';
import { Node } from './AllComponents';
import { Matrix4, Quaternion, Vector3 } from '../MatrixLib';
import Component from './Component';

export enum CameraType{
    PERSPECTIVE = "perspective",
    ORTHOGRAPHIC = "orthographic"
}

export interface IOrthoCam{
    xmag: number;
    ymag: number;
    zfar: number;
    znear: number;
}

export interface IPerspCam{
    aspectRatio: number;
    yfov: number;
    zfar: number;
    znear: number;
}

export interface ICamera {
    readonly id?: number;
    readonly type: CameraType;
    readonly cfg: IOrthoCam | IPerspCam;
}



export class Camera extends Component implements ICamera{
    public static readonly DEFAULT_ORTHO: Camera = new Camera({
        type: CameraType.ORTHOGRAPHIC,
        cfg: {} as IOrthoCam,
        orthographic: {
            xmag: 1,
            ymag: 1,
            zfar: 100,
            znear: 0.1,
        }
    } as ICamera, -1);
    public static readonly DEFAULT_PERSP: Camera = new Camera({
        type: CameraType.PERSPECTIVE,
        cfg: {} as IPerspCam,
        perspective: {
            aspectRatio: 1,
            yfov: Math.PI/3,
            zfar: 100,
            znear: 0.01,
        }
    } as ICamera, -1);

    public parent?: Node;
    static readonly UP: Vector3 = new Vector3([0,1,0]);
    static readonly FORWARD: Vector3 = new Vector3([0,0,1]);
    static readonly RIGHT: Vector3 = new Vector3([1,0,0]);
    private readonly _view: Matrix4 = new Matrix4();
    private readonly _proj: Matrix4 = new Matrix4();
    private _corr?: Node;
    readonly id: number;
    readonly type: CameraType;
    readonly cfg: IPerspCam | IOrthoCam;

    constructor(cams: ICamera, index: number){
        super();
        this.id = index;
        this.type = cams.type;
        const o = (cams as object);
        if(!o.hasOwnProperty(this.type.toString())){
            throw new Error(`Camera has no config for ${this.type}`);
        }
        const { [this.type]: c } = cams as any;
        switch(this.type){
            case CameraType.ORTHOGRAPHIC:
                this.cfg = c as IOrthoCam;
                break;
            case CameraType.PERSPECTIVE:
                this.cfg = c as IPerspCam;
                break;
        }
        this.recalcProjection();
    }

    public recalcProjection(){
        let c;
        switch(this.type){
            case CameraType.ORTHOGRAPHIC:
                c = (this.cfg as IOrthoCam);
                this._proj.setOrtho(-c.xmag,c.xmag,-c.ymag,c.ymag,c.znear,c.zfar);
                break;
            case CameraType.PERSPECTIVE:
                c = (this.cfg as IPerspCam);
                this._proj.setPerspective((((c.yfov)/(Math.PI*2))*360),c.aspectRatio,c.znear,c.zfar);
                break;
        }
    }

    public setupCorrection(){
        this._corr = this.parent;
        if(this.parent?.name === "Camera_Orientation"){
            this._corr = this.parent;
            this.parent = this.parent.parent;
        }
    }

    get projection(): Matrix4 {
        return this._proj;
    }

    get transform() : Matrix4 {
        if(this.parent && this.parent.dirty){
            this._corr?.global.inverse(this._view);
        }
        return this._view;
    }

    private correctedRotation(): Quaternion{
        if(!(this.parent && this._corr))
            return new Quaternion();
        if(this._corr !== this.parent){
            return Quaternion.mul(this._corr?.rotation,this.parent?.rotation);
        }
        return this.parent?.rotation;
    }

    get forward(): Vector3{
        if(this.parent && this.parent.rotation){
            const c = Matrix4.quatRotate(this.correctedRotation());
            const v = new Vector3();
            c.multiplyVector3(Camera.FORWARD,v);
            return v;
        }
        return Camera.FORWARD;
    }

    get up(): Vector3{
        if(this.parent && this.parent.rotation){
            const c = Matrix4.quatRotate(this.correctedRotation());
            const v = new Vector3();
            c.multiplyVector3(Camera.UP,v);
            return v;
        }
        return Camera.UP;
    }

    get right(): Vector3{
        if(this.parent && this.parent.rotation){
            const c = Matrix4.quatRotate(this.correctedRotation());
            const v = new Vector3();
            c.multiplyVector3(Camera.RIGHT,v);
            return v;
        }
        return Camera.RIGHT;
    }



}