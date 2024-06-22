// cuon-matrix.js (c) 2012 kanda and matsuda
// MatrixLib.ts rewritten for type safety by emarrama@ucsc.edu
/**
 * This is a export class treating 4x4 matrix.
 * This export class contains the function that is equivalent to OpenGL matrix stack.
 * The matrix after conversion is calculated by multiplying a conversion matrix from the right.
 * The matrix is replaced by the calculated result.
 */

// tslint:disable: max-classes-per-file

export abstract class ArrayBacked extends Float32Array{
  protected _dirty: boolean = false;

  constructor(size: number, src?: ArrayLike<number> | number){
    super(size);
    if(src instanceof Array) {
      this.set(src);
    } else if (typeof src === "number") {
      this.fill(src);
      return;
    }
  }

  get dirty(): boolean{
    return this._dirty;
  }

  public static clearDirtyFlag(src: ArrayBacked){
    src._dirty = false;
  }

  public static setDirtyFlag(src: ArrayBacked){
    src._dirty = true;
  }
}


abstract class Vector extends ArrayBacked{

  /**
   * Add other to this vector in place;
   * @param vec Addend vector
   * @param dst Optional destination vector
   * @param off Offset buffer to add from
   * @return this or destination vector
   *
   */
  public add(vec: Vector, dst?: this, off?: number): this;
  /**
   * Add other to this vector in place;
   * @param number... Adds a static constructed vector element by element
   * @return this
   *
   */
  public add(...num: number[]): Vector
  /**
   * Variatic base case of add operation
   * @param args... Array of arguments passed into the function
   */
  public add(...args: any[]): Vector {
    if(!(args[0] instanceof Vector || typeof(args[0]) === 'number')) throw Error(`Cannot add a non Vector type`);
    const v = (args.every((arg) => typeof(arg) === 'number')) ? args as number[] : args[0] as Vector;
    const d = (args[0] instanceof Vector && args[1] instanceof Vector) ? args[1] : this;
    const o = (args[0] instanceof Vector && typeof(args[3]) === 'number')? args[3] : 0;
    if(o > d.length) throw Error(`Destination cannot write to Vector with offset ${o}`);
    const min = Math.min(d.length,v.length);

    for(let i = o; i < min-o; i++){
      d[i] = this[i] + v[i];
    }
    d._dirty = true;
    return d;
  }

  /**
   * Subtract other from this vector.
   * @param vec Vector to subtract vector
   * @param dst Optional destination vector
   * @param off Offset buffer to add from
   * @return this or destination vector
   *
   */
  public sub(vec: Vector, dst?: this, off?: number): this;
  /**
   * Add other to this vector in place;
   * @param number... Adds a static constructed vector element by element
   * @return this
   *
   */
  public sub(...num: number[]): Vector
  /**
   * Variatic base case of sub operation
   * @param args... Array of arguments passed into the function
   */
  public sub(...args: any[]): Vector {
    if(!(args[0] instanceof Vector || typeof(args[0]) === 'number')) throw Error(`Cannot subtract a non Vector type`);
    const v = (args.every((arg) => typeof(arg) === 'number')) ? args as number[] : args[0] as Vector;
    const d = (args[0] instanceof Vector && args[1] instanceof Vector) ? args[1] : this;
    const o = (args[0] instanceof Vector && typeof(args[3]) === 'number')? args[3] : 0;
    if(o > d.length) throw Error(`Destination cannot write to Vector with offset ${o}`);
    const min = Math.min(d.length,v.length);

    for(let i = o; i < min-o; i++){
      d[i] = this[i] - v[i];
    }
    d._dirty = true;
    return d;
  }

  /**
   * Divide this vector by a scalar.
   * @param scalar value to divide by
   * @param dst optional destination vector
   * @return this
   */
   div(scalar: number, dst?: this): this {
    const v = dst?dst:this;
    for(let i = 0; i < this.length; i++){
      v[i] = this[i] / scalar;
    }

    v._dirty = true;
    return v;
  };

  /**
   * Multiply this vector by a scalar.
   * @param scalar value to divide by
   * @param dst optional destination vector
   * @return this
   */
  mul(scalar: number, dst?: this): this {
    const v = dst?dst:this;
    for(let i = 0; i < this.length; i++){
      v[i] = this[i] * scalar;
    }

    v._dirty = true;
    return v;
  };

  /**
   * Calcualte the dot product between this vector and other.
   * @return scalar
   */
   dot(vec: this): number {
    if(vec.length !== this.length)
      throw Error(`Cannot compute dot product Vectors must be the same size`);

    let d: number = 0;
    this.forEach((elm, idx) => {
      d += elm * vec[idx];
    });

    return d;
  }

  static dot<T extends Vector>(vec1: T, vec2: T): number{
    return vec1.dot(vec2);
  }

  /**
   * Calculate the magnitude (or length) of this vector.
   * @return scalar
   */
  public magnitude(): number {
    let m: number = 0;

    this.forEach((elm) => {
      m += elm * elm;
    })

    m = Math.sqrt(m);

    return m;
  };

  /**
   * Normalize this vector.
   * @return this
   */
   normalize(): this {
    return this.div(this.magnitude());
  };

}

export class Quaternion extends ArrayBacked{
  static readonly SIZE: number = 4;

  get x():number {
    return this[0];
  }
  set x(val: number){
    this._dirty = true;
    this[0] = val;
  }

  get y():number {
    return this[1];
  }
  set y(val: number){
    this._dirty = true;
    this[1] = val;
  }

  get z():number {
    return this[2];
  }
  set z(val: number){
    this._dirty = true;
    this[2] = val;
  }

  get w():number {
    return this[3];
  }
  set w(val: number){
    this._dirty = true;
    this[3] = val;
  }


  constructor(src?: ArrayLike<number> | number){
    super(Quaternion.SIZE,src);
    if(src === undefined || !(src instanceof Array)){
      this.fill(0);
      this[3] = 1;
    }
  }

  public static rotate(angle: number, axis: Vector3): Quaternion{
    const v = axis;
    const q = new Quaternion();
    if(angle === 0){
      return q;
    }
    const a = Math.sin(angle/2);
    q.w = Math.cos(angle/2);
    q.x = v.x*a;
    q.y= v.y*a;
    q.z = v.z*a;
    return q;
  }

  public rotate(angle: number, axis: Vector3, global?: boolean): Quaternion{
    const rot = Quaternion.rotate(angle,axis);
    if(global === true){
      return this.mulR(rot);
    }
    return this.mulL(rot);
  }

  public mulR(q: Quaternion): Quaternion{
    return Quaternion.mul(this,q,this);
  }

  public mulL(q: Quaternion): Quaternion{
    return Quaternion.mul(q,this,this);
  }

  public static mul(q1: Quaternion, q2: Quaternion, dst?: Quaternion): Quaternion {

    const d = dst ? dst : new Quaternion();

    const w = q1.w*q2.w - q1.x*q2.x - q1.y*q2.y - q1.z*q2.z;
    const x = q1.w*q2.x + q1.x*q2.w - q1.y*q2.z + q1.z*q2.y;
    const y = q1.w*q2.y + q1.x*q2.z + q1.y*q2.w - q1.z*q2.x;
    const z = q1.w*q2.z - q1.x*q2.y + q1.y*q2.x + q1.z*q2.w;

    d.x = x;
    d.y = y;
    d.z = z;
    d.w = w;

    d._dirty = true;
    return d;
  }

  /**
   * Calculate the magnitude of this Quaternion.
   * @return scalar
   */
  public magnitude(): number {
    let m: number = 0;

    this.forEach((elm) => {
      m += elm * elm;
    })

    m = Math.sqrt(m);

    return m;
  };

  /**
   * Normalize this Quaternion.
   * @return this
   */
   normalize(): this {
     const m = this.magnitude();
     this.forEach((_,i) => this[i] /= m);
    return this;
  };
}

export class Vector3 extends Vector{
  static readonly SIZE: number = 3;

  get x():number {
    return this[0];
  }
  set x(val: number){
    this._dirty = true;
    this[0] = val;
  }

  get y():number {
    return this[1];
  }
  set y(val: number){
    this._dirty = true;
    this[1] = val;
  }

  get z():number {
    return this[2];
  }
  set z(val: number){
    this._dirty = true;
    this[2] = val;
  }

  constructor(src?: ArrayLike<number> | number){
    super(Vector3.SIZE,src);
  }


   /**
    * Calcualte the cross product between this vector and other.
    * @return new vector
    */
  static cross(vec1: Vector3, vec2: Vector3): Vector3 {
    // Insert your code here.
    // This function should create and return a new vector.
    const v1 = vec1;
    const v2 = vec2;

    const x = v1[1] * v2[2] - v1[2] * v2[1];
    const y = v1[2] * v2[0] - v1[0] * v2[2];
    const z = v1[0] * v2[1] - v1[1] * v2[0];

    // Don't delete the return statement.
    return new Vector3([x, y, z]);
  }
}

export class Vector4 extends Vector{
  static readonly SIZE = 4;

  get x():number {
    return this[0];
  }
  set x(val: number){
    this._dirty = true;
    this[0] = val;
  }

  get y():number {
    return this[1];
  }
  set y(val: number){
    this._dirty = true;
    this[1] = val;
  }

  get z():number {
    return this[2];
  }
  set z(val: number){
    this._dirty = true;
    this[2] = val;
  }

  get w():number {
    return this[3];
  }
  set w(val: number){
    this._dirty = true;
    this[3] = val;
  }
  /**
   * Constructor of Vector4
   * If opt_src is specified, new vector is initialized by opt_src.
   * @param src source vector(option)
   */
  constructor(src?: ArrayLike<number> | number) {
    super(Vector4.SIZE,src);
  }
}

abstract class Matrix extends ArrayBacked{
  private readonly ROWS: number;
  private readonly COLS: number;

  constructor(rows: number, cols: number, src?: Matrix4 | ArrayLike<number> | Float32Array){
    super(rows*cols,src);
    this.ROWS = rows;
    this.COLS = cols;
    this.identity();
  }
  /**
   * Add other to this matrix in place;
   * @param vec Addend vector
   * @param dst Optional destination matrix
   * @param off Offset buffer to add from
   * @return this or destination matrix
   *
   */
  public add(vec: Matrix, dst?: this, x?: number, y?: number): this;
  /**
   * Add other to this matrix in place;
   * @param number... Adds a static constructed matrix element by element
   * @return this
   *
   */
  public add(...num: number[]): Matrix
  /**
   * Variatic base case of add operation
   * @param args... Array of arguments passed into the function
   */
  public add(...args: any[]): Matrix {
    if(!(args[0] instanceof Matrix || typeof(args[0]) === 'number')) throw Error(`Cannot add a non Matrix type`);
    const v = (args.every((arg) => typeof(arg) === 'number')) ? args as number[] : args[0] as Matrix;
    const d = (args[0] instanceof Matrix && args[1] instanceof Matrix) ? args[1] : this;
    const o = (args[0] instanceof Matrix && typeof(args[3]) === 'number')? args[3] : 0;
    if(o > d.length) throw Error(`Destination cannot write to Matrix with offset ${o}`);
    const min = Math.min(d.length,v.length);

    for(let i = o; i < min-o; i++){
      d[i] = this[i] + v[i];
    }
    d._dirty = true;
    return d;
  }

  /**
   * Subtract other from this matrix.
   * @param vec Vector to subtract matrix
   * @param dst Optional destination matrix
   * @param off Offset buffer to add from
   * @return this or destination matrix
   *
   */
  public sub(vec: Matrix, dst?: this, off?: number): this;
  /**
   * Add other to this matrix in place;
   * @param number... Adds a static constructed matrix element by element
   * @return this
   *
   */
  public sub(...num: number[]): Matrix
  /**
   * Variatic base case of sub operation
   * @param args... Array of arguments passed into the function
   */
  public sub(...args: any[]): Matrix {
    if(!(args[0] instanceof Matrix || typeof(args[0]) === 'number')) throw Error(`Cannot subtract a non Matrix type`);
    const v = (args.every((arg) => typeof(arg) === 'number')) ? args as number[] : args[0] as Matrix;
    const d = (args[0] instanceof Matrix && args[1] instanceof Matrix) ? args[1] : this;
    const o = (args[0] instanceof Matrix && typeof(args[3]) === 'number')? args[3] : 0;
    if(o > d.length) throw Error(`Destination cannot write to Matrix with offset ${o}`);
    const min = Math.min(d.length,v.length);

    for(let i = o; i < min-o; i++){
      d[i] = this[i] - v[i];
    }
    d._dirty = true;
    return d;
  }

  /**
   * Divide this matrix by a scalar.
   * @param scalar value to divide by
   * @param dst optional destination matrix
   * @return this
   */
  public div(scalar: number, dst?: this): this {
    const v = dst?dst:this;
    for(let i = 0; i < this.length; i++){
      v[i] = this[i] / scalar;
    }

    v._dirty = true;
    return v;
  };

  /**
   * Multiply this matrix by a scalar.
   * @param scalar value to divide by
   * @param dst optional destination matrix
   * @return this
   */
  public mul(scalar: number, dst?: this): this {
    const v = dst?dst:this;
    for(let i = 0; i < this.length; i++){
      v[i] = this[i] * scalar;
    }

    v._dirty = true;
    return v;
  };

  /**
   * Set the identity matrix.
   * @return this
   */
  public identity(): this {
    this.fill(0);
    for(let i = 0; i < this.length; i += (this.ROWS + 1)){
      this[i] = 1;
    }
    this._dirty = true;
    return this;
  }
}

export class Matrix4 extends Matrix{
  public static readonly ROWS: number = 4;
  public static readonly COLS: number = 4;
  public static readonly SIZE = 16;

  public static readonly IDENTITY = new Matrix4([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  /**
   * Constructor of Matrix4
   * If src is specified, new matrix is initialized by src.
   * Otherwise, new matrix is initialized by identity matrix.
   * @param src source matrix(option)
   */
  constructor(src?: Matrix4 | ArrayLike<number> | Float32Array){
    super(Matrix4.ROWS,Matrix4.COLS,src);
  }

  /**
   * Copy matrix values from source matrix
   * @param src source matrix
   * @return this
   */
  copyFrom(src: Matrix4): Matrix4 {

    this.set(src);

    return this;
  }


  /**
   * Multiply the matrix from the right.
   * C = A * rhs
   * @param rhs The multiply matrix
   * @return this
   */
  multiplyMat4(rhs: Matrix4, dst?: Matrix4): Matrix4 {

    // Calculate dst = m1 * m2
    const d = dst ? dst : this;
    const m1 = this;
    let m2 = rhs;

    // If e equals b, copy b to temporary matrix.
    if (d === rhs) {
      m2 = new Matrix4();
      m2.set(d);
    }

    for (let i = 0; i < 4; i++) {
      const ai0 = m1[i];
      const ai1 = m1[i + 4];
      const ai2 = m1[i + 8];
      const ai3 = m1[i + 12];
      d[i] = ai0 * m2[0] + ai1 * m2[1] + ai2 * m2[2] + ai3 * m2[3];
      d[i + 4] = ai0 * m2[4] + ai1 * m2[5] + ai2 * m2[6] + ai3 * m2[7];
      d[i + 8] = ai0 * m2[8] + ai1 * m2[9] + ai2 * m2[10] + ai3 * m2[11];
      d[i + 12] = ai0 * m2[12] + ai1 * m2[13] + ai2 * m2[14] + ai3 * m2[15];
    }

    return this;
  }

  concat(other: Matrix4): Matrix4 {
    return this.multiplyMat4(other);
  }

  static quatRotate(q: Quaternion){
    const t = new Matrix4();
    t.identity();
    q.normalize();

    // TODO: Make more efficient
    t[0] = 1 - 2*(q.y*q.y + q.z*q.z);
    t[1] = 2*(q.x*q.y + q.w*q.z);
    t[2] = 2*(q.x*q.z - q.w*q.y);
    t[3] = 0;

    t[4] = 2*(q.x*q.y - q.w*q.z);
    t[5] = 1 - 2*(q.x*q.x + q.z*q.z);
    t[6] = 2*(q.y*q.z + q.w*q.x);
    t[7] = 0;

    t[8] = 2*(q.x*q.z + q.w*q.y);
    t[9] = 2*(q.y*q.z - q.w*q.x);
    t[10] = 1 - 2*(q.x*q.x + q.y*q.y);
    t[11] = 0;
    return t;
  }

  /**
   * Multiply the three-dimensional vector.
   * @param pos  The multiply vector
   * @return The result of multiplication(Float32Array)
   */
  multiplyVector3(pos: Vector3, dst?: Vector3): Vector3 {
    const e = this;
    const p = pos;
    const v = dst ? dst : new Vector3();
    const result: Float32Array = v;

    result[0] = p[0] * e[0] + p[1] * e[4] + p[2] * e[8] + e[12];
    result[1] = p[0] * e[1] + p[1] * e[5] + p[2] * e[9] + e[13];
    result[2] = p[0] * e[2] + p[1] * e[6] + p[2] * e[10] + e[14];

    return v;
  };

  /**
   * Multiply the four-dimensional vector.
   * @param pos  The multiply vector
   * @return The result of multiplication(Float32Array)
   */
  multiplyVector4(pos: Vector4, dst?: Vector4): Vector4 {
    const e = this;
    const p = pos;
    const v = dst ? dst : new Vector4();

    v[0] = p[0] * e[0] + p[1] * e[4] + p[2] * e[8] + p[3] * e[12];
    v[1] = p[0] * e[1] + p[1] * e[5] + p[2] * e[9] + p[3] * e[13];
    v[2] = p[0] * e[2] + p[1] * e[6] + p[2] * e[10] + p[3] * e[14];
    v[3] = p[0] * e[3] + p[1] * e[7] + p[2] * e[11] + p[3] * e[15];

    return v;
  };

  /**
   * Transpose the matrix.
   * @return this
   */
  transpose(): Matrix4 {
    const e: Float32Array = this;
    let t: number;

    t = e[1]; e[1] = e[4]; e[4] = t;
    t = e[2]; e[2] = e[8]; e[8] = t;
    t = e[3]; e[3] = e[12]; e[12] = t;
    t = e[6]; e[6] = e[9]; e[9] = t;
    t = e[7]; e[7] = e[13]; e[13] = t;
    t = e[11]; e[11] = e[14]; e[14] = t;

    return this;
  };

  /**
   * Calculate the inverse matrix of specified matrix, and set to this.
   * @param other The source matrix
   * @return this
   */
  inverse(dst?: Matrix4): Matrix4 {
    const s = this;
    // Guard from overrwriting values while computing
    const inv = (dst === this || dst === undefined) ? new Matrix4() : dst;

    inv[0] = s[5] * s[10] * s[15] - s[5] * s[11] * s[14] - s[9] * s[6] * s[15]
      + s[9] * s[7] * s[14] + s[13] * s[6] * s[11] - s[13] * s[7] * s[10];
    inv[4] = - s[4] * s[10] * s[15] + s[4] * s[11] * s[14] + s[8] * s[6] * s[15]
      - s[8] * s[7] * s[14] - s[12] * s[6] * s[11] + s[12] * s[7] * s[10];
    inv[8] = s[4] * s[9] * s[15] - s[4] * s[11] * s[13] - s[8] * s[5] * s[15]
      + s[8] * s[7] * s[13] + s[12] * s[5] * s[11] - s[12] * s[7] * s[9];
    inv[12] = - s[4] * s[9] * s[14] + s[4] * s[10] * s[13] + s[8] * s[5] * s[14]
      - s[8] * s[6] * s[13] - s[12] * s[5] * s[10] + s[12] * s[6] * s[9];

    inv[1] = - s[1] * s[10] * s[15] + s[1] * s[11] * s[14] + s[9] * s[2] * s[15]
      - s[9] * s[3] * s[14] - s[13] * s[2] * s[11] + s[13] * s[3] * s[10];
    inv[5] = s[0] * s[10] * s[15] - s[0] * s[11] * s[14] - s[8] * s[2] * s[15]
      + s[8] * s[3] * s[14] + s[12] * s[2] * s[11] - s[12] * s[3] * s[10];
    inv[9] = - s[0] * s[9] * s[15] + s[0] * s[11] * s[13] + s[8] * s[1] * s[15]
      - s[8] * s[3] * s[13] - s[12] * s[1] * s[11] + s[12] * s[3] * s[9];
    inv[13] = s[0] * s[9] * s[14] - s[0] * s[10] * s[13] - s[8] * s[1] * s[14]
      + s[8] * s[2] * s[13] + s[12] * s[1] * s[10] - s[12] * s[2] * s[9];

    inv[2] = s[1] * s[6] * s[15] - s[1] * s[7] * s[14] - s[5] * s[2] * s[15]
      + s[5] * s[3] * s[14] + s[13] * s[2] * s[7] - s[13] * s[3] * s[6];
    inv[6] = - s[0] * s[6] * s[15] + s[0] * s[7] * s[14] + s[4] * s[2] * s[15]
      - s[4] * s[3] * s[14] - s[12] * s[2] * s[7] + s[12] * s[3] * s[6];
    inv[10] = s[0] * s[5] * s[15] - s[0] * s[7] * s[13] - s[4] * s[1] * s[15]
      + s[4] * s[3] * s[13] + s[12] * s[1] * s[7] - s[12] * s[3] * s[5];
    inv[14] = - s[0] * s[5] * s[14] + s[0] * s[6] * s[13] + s[4] * s[1] * s[14]
      - s[4] * s[2] * s[13] - s[12] * s[1] * s[6] + s[12] * s[2] * s[5];

    inv[3] = - s[1] * s[6] * s[11] + s[1] * s[7] * s[10] + s[5] * s[2] * s[11]
      - s[5] * s[3] * s[10] - s[9] * s[2] * s[7] + s[9] * s[3] * s[6];
    inv[7] = s[0] * s[6] * s[11] - s[0] * s[7] * s[10] - s[4] * s[2] * s[11]
      + s[4] * s[3] * s[10] + s[8] * s[2] * s[7] - s[8] * s[3] * s[6];
    inv[11] = - s[0] * s[5] * s[11] + s[0] * s[7] * s[9] + s[4] * s[1] * s[11]
      - s[4] * s[3] * s[9] - s[8] * s[1] * s[7] + s[8] * s[3] * s[5];
    inv[15] = s[0] * s[5] * s[10] - s[0] * s[6] * s[9] - s[4] * s[1] * s[10]
      + s[4] * s[2] * s[9] + s[8] * s[1] * s[6] - s[8] * s[2] * s[5];

    let det = s[0] * inv[0] + s[1] * inv[4] + s[2] * inv[8] + s[3] * inv[12];
    if (det === 0) {
      return this;
    }

    det = 1 / det;

    inv.mul(det);

    if(dst === this || dst === undefined){
      this.set(inv);
      return this;
    }

    return dst;
  };

  /**
   * Set the orthographic projection matrix.
   * @param left The coordinate of the left of clipping plane.
   * @param right The coordinate of the right of clipping plane.
   * @param bottom The coordinate of the bottom of clipping plane.
   * @param top The coordinate of the top top clipping plane.
   * @param near The distances to the nearer depth clipping plane. This value is minus if the plane is to be behind the viewer.
   * @param far The distances to the farther depth clipping plane. This value is minus if the plane is to be behind the viewer.
   * @return this
   */
  setOrtho(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
    let e, rw, rh, rd;

    if (left === right || bottom === top || near === far) {
      throw new Error('null frustum');
    }

    rw = 1 / (right - left);
    rh = 1 / (top - bottom);
    rd = 1 / (far - near);

    e = this;

    e[0] = 2 * rw;
    e[1] = 0;
    e[2] = 0;
    e[3] = 0;

    e[4] = 0;
    e[5] = 2 * rh;
    e[6] = 0;
    e[7] = 0;

    e[8] = 0;
    e[9] = 0;
    e[10] = -2 * rd;
    e[11] = 0;

    e[12] = -(right + left) * rw;
    e[13] = -(top + bottom) * rh;
    e[14] = -(far + near) * rd;
    e[15] = 1;

    return this;
  };

  /**
   * Multiply the orthographic projection matrix from the right.
   * @param left The coordinate of the left of clipping plane.
   * @param right The coordinate of the right of clipping plane.
   * @param bottom The coordinate of the bottom of clipping plane.
   * @param top The coordinate of the top top clipping plane.
   * @param near The distances to the nearer depth clipping plane. This value is minus if the plane is to be behind the viewer.
   * @param far The distances to the farther depth clipping plane. This value is minus if the plane is to be behind the viewer.
   * @return this
   */
  ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
    return this.concat(new Matrix4().setOrtho(left, right, bottom, top, near, far));
  };

  /**
   * Set the perspective projection matrix.
   * @param left The coordinate of the left of clipping plane.
   * @param right The coordinate of the right of clipping plane.
   * @param bottom The coordinate of the bottom of clipping plane.
   * @param top The coordinate of the top top clipping plane.
   * @param near The distances to the nearer depth clipping plane. This value must be plus value.
   * @param far The distances to the farther depth clipping plane. This value must be plus value.
   * @return this
   */
  setFrustum(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
    let e, rw, rh, rd;

    if (left === right || top === bottom || near === far) {
      throw new Error('null frustum');
    }
    if (near <= 0) {
      throw new Error('near <= 0');
    }
    if (far <= 0) {
      throw new Error('far <= 0');
    }

    rw = 1 / (right - left);
    rh = 1 / (top - bottom);
    rd = 1 / (far - near);

    e = this;

    e[0] = 2 * near * rw;
    e[1] = 0;
    e[2] = 0;
    e[3] = 0;

    e[4] = 0;
    e[5] = 2 * near * rh;
    e[6] = 0;
    e[7] = 0;

    e[8] = (right + left) * rw;
    e[9] = (top + bottom) * rh;
    e[10] = -(far + near) * rd;
    e[11] = -1;

    e[12] = 0;
    e[13] = 0;
    e[14] = -2 * near * far * rd;
    e[15] = 0;

    return this;
  };

  /**
   * Multiply the perspective projection matrix from the right.
   * @param left The coordinate of the left of clipping plane.
   * @param right The coordinate of the right of clipping plane.
   * @param bottom The coordinate of the bottom of clipping plane.
   * @param top The coordinate of the top top clipping plane.
   * @param near The distances to the nearer depth clipping plane. This value must be plus value.
   * @param far The distances to the farther depth clipping plane. This value must be plus value.
   * @return this
   */
  public frustum(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
    return this.concat(new Matrix4().setFrustum(left, right, bottom, top, near, far));
  };

  /**
   * Set the perspective projection matrix by fovy and aspect.
   * @param fovy The angle between the upper and lower sides of the frustum.
   * @param aspect The aspect ratio of the frustum. (width/height)
   * @param near The distances to the nearer depth clipping plane. This value must be plus value.
   * @param far The distances to the farther depth clipping plane. This value must be plus value.
   * @return this
   */
  public setPerspective(fovy: number, aspect: number, near: number, far: number): Matrix4 {
    let e, rd, s, ct;

    if (near === far || aspect === 0) {
      throw new Error('null frustum');
    }
    if (near <= 0) {
      throw new Error('near <= 0');
    }
    if (far <= 0) {
      throw new Error('far <= 0');
    }

    fovy = Math.PI * fovy / 180 / 2;
    s = Math.sin(fovy);
    if (s === 0) {
      throw new Error('null frustum');
    }

    rd = 1 / (far - near);
    ct = Math.cos(fovy) / s;

    e = this;

    e[0] = ct / aspect;
    e[1] = 0;
    e[2] = 0;
    e[3] = 0;

    e[4] = 0;
    e[5] = ct;
    e[6] = 0;
    e[7] = 0;

    e[8] = 0;
    e[9] = 0;
    e[10] = -(far + near) * rd;
    e[11] = -1;

    e[12] = 0;
    e[13] = 0;
    e[14] = -2 * near * far * rd;
    e[15] = 0;

    return this;
  };

  /**
   * Multiply the perspective projection matrix from the right.
   * @param fovy The angle between the upper and lower sides of the frustum.
   * @param aspect The aspect ratio of the frustum. (width/height)
   * @param near The distances to the nearer depth clipping plane. This value must be plus value.
   * @param far The distances to the farther depth clipping plane. This value must be plus value.
   * @return this
   */
  public perspective(fovy: number, aspect: number, near: number, far: number): Matrix4 {
    return this.concat(new Matrix4().setPerspective(fovy, aspect, near, far));
  };

  /**
   * Set the matrix for scaling.
   * @param x The scale factor along the X axis
   * @param y The scale factor along the Y axis
   * @param z The scale factor along the Z axis
   * @return this
   */
  public setScale(x: number, y: number, z: number): Matrix4 {
    const e = this;
    e[0] = x; e[4] = 0; e[8] = 0; e[12] = 0;
    e[1] = 0; e[5] = y; e[9] = 0; e[13] = 0;
    e[2] = 0; e[6] = 0; e[10] = z; e[14] = 0;
    e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    return this;
  };

  /**
   * Multiply the matrix for scaling from the right.
   * @param x The scale factor along the X axis
   * @param y The scale factor along the Y axis
   * @param z The scale factor along the Z axis
   * @return this
   */
  public scale(x: number, y: number, z: number): Matrix4 {
    const e = this;
    e[0] *= x; e[4] *= y; e[8] *= z;
    e[1] *= x; e[5] *= y; e[9] *= z;
    e[2] *= x; e[6] *= y; e[10] *= z;
    e[3] *= x; e[7] *= y; e[11] *= z;
    return this;
  };

  /**
   * Set the matrix for translation.
   * @param x The X value of a translation.
   * @param y The Y value of a translation.
   * @param z The Z value of a translation.
   * @return this
   */

  public setTranslate(x: number, y: number, z: number): Matrix4 {
    const e = this;
    e[0] = 1; e[4] = 0; e[8] = 0; e[12] = x;
    e[1] = 0; e[5] = 1; e[9] = 0; e[13] = y;
    e[2] = 0; e[6] = 0; e[10] = 1; e[14] = z;
    e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    return this;
  };

  /**
   * Multiply the matrix for translation from the right.
   * @param x The X value of a translation.
   * @param y The Y value of a translation.
   * @param z The Z value of a translation.
   * @return this
   */
  public translate(x: number, y: number, z: number): Matrix4 {
    const e = this;
    e[12] += e[0] * x + e[4] * y + e[8] * z;
    e[13] += e[1] * x + e[5] * y + e[9] * z;
    e[14] += e[2] * x + e[6] * y + e[10] * z;
    e[15] += e[3] * x + e[7] * y + e[11] * z;
    return this;
  };

  /**
   * Set the matrix for rotation.
   * The vector of rotation axis may not be normalized.
   * @param angle The angle of rotation (degrees)
   * @param x The X coordinate of vector of rotation axis.
   * @param y The Y coordinate of vector of rotation axis.
   * @param z The Z coordinate of vector of rotation axis.
   * @return this
   */
  public setRotate(angle: number, x: number, y: number, z: number): Matrix4 {
    let e, s, c, len, rlen, nc, xy, yz, zx, xs, ys, zs;

    angle = Math.PI * angle / 180;
    e = this;

    s = Math.sin(angle);
    c = Math.cos(angle);

    if (0 !== x && 0 === y && 0 === z) {
      // Rotation around X axis
      if (x < 0) {
        s = -s;
      }
      e[0] = 1; e[4] = 0; e[8] = 0; e[12] = 0;
      e[1] = 0; e[5] = c; e[9] = -s; e[13] = 0;
      e[2] = 0; e[6] = s; e[10] = c; e[14] = 0;
      e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    } else if (0 === x && 0 !== y && 0 === z) {
      // Rotation around Y axis
      if (y < 0) {
        s = -s;
      }
      e[0] = c; e[4] = 0; e[8] = s; e[12] = 0;
      e[1] = 0; e[5] = 1; e[9] = 0; e[13] = 0;
      e[2] = -s; e[6] = 0; e[10] = c; e[14] = 0;
      e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    } else if (0 === x && 0 === y && 0 !== z) {
      // Rotation around Z axis
      if (z < 0) {
        s = -s;
      }
      e[0] = c; e[4] = -s; e[8] = 0; e[12] = 0;
      e[1] = s; e[5] = c; e[9] = 0; e[13] = 0;
      e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
      e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    } else {
      // Rotation around another axis
      len = Math.sqrt(x * x + y * y + z * z);
      if (len !== 1) {
        rlen = 1 / len;
        x *= rlen;
        y *= rlen;
        z *= rlen;
      }
      nc = 1 - c;
      xy = x * y;
      yz = y * z;
      zx = z * x;
      xs = x * s;
      ys = y * s;
      zs = z * s;

      e[0] = x * x * nc + c;
      e[1] = xy * nc + zs;
      e[2] = zx * nc - ys;
      e[3] = 0;

      e[4] = xy * nc - zs;
      e[5] = y * y * nc + c;
      e[6] = yz * nc + xs;
      e[7] = 0;

      e[8] = zx * nc + ys;
      e[9] = yz * nc - xs;
      e[10] = z * z * nc + c;
      e[11] = 0;

      e[12] = 0;
      e[13] = 0;
      e[14] = 0;
      e[15] = 1;
    }

    return this;
  };

  /**
   * Multiply the matrix for rotation from the right.
   * The vector of rotation axis may not be normalized.
   * @param angle The angle of rotation (degrees)
   * @param x The X coordinate of vector of rotation axis.
   * @param y The Y coordinate of vector of rotation axis.
   * @param z The Z coordinate of vector of rotation axis.
   * @return this
   */
  public rotate(angle: number, x: number, y: number, z: number): Matrix4 {
    return this.concat(new Matrix4().setRotate(angle, x, y, z));
  };

  /**
   * Set the viewing matrix.
   * @param eyeX, eyeY, eyeZ The position of the eye point.
   * @param centerX, centerY, centerZ The position of the reference point.
   * @param upX, upY, upZ The direction of the up vector.
   * @return this
   */
  public setLookAt(eyeX: number, eyeY: number, eyeZ: number, centerX: number, centerY: number, centerZ: number, upX: number, upY: number, upZ: number): Matrix4 {
    let fx = centerX - eyeX;
    let fy = centerY - eyeY;
    let fz = centerZ - eyeZ;

    // Normalize f.
    const rlf = 1 / Math.sqrt(fx * fx + fy * fy + fz * fz);
    fx *= rlf;
    fy *= rlf;
    fz *= rlf;

    // Calculate cross product of f and up.
    let sx = fy * upZ - fz * upY;
    let sy = fz * upX - fx * upZ;
    let sz = fx * upY - fy * upX;

    // Normalize s.
    const rls = 1 / Math.sqrt(sx * sx + sy * sy + sz * sz);
    sx *= rls;
    sy *= rls;
    sz *= rls;

    // Calculate cross product of s and f.
    const ux = sy * fz - sz * fy;
    const uy = sz * fx - sx * fz;
    const uz = sx * fy - sy * fx;

    // Set to this.
    const e = this;
    e[0] = sx;
    e[1] = ux;
    e[2] = -fx;
    e[3] = 0;

    e[4] = sy;
    e[5] = uy;
    e[6] = -fy;
    e[7] = 0;

    e[8] = sz;
    e[9] = uz;
    e[10] = -fz;
    e[11] = 0;

    e[12] = 0;
    e[13] = 0;
    e[14] = 0;
    e[15] = 1;

    // Translate.
    return this.translate(-eyeX, -eyeY, -eyeZ);
  };

  /**
   * Multiply the viewing matrix from the right.
   * @param eyeX, eyeY, eyeZ The position of the eye point.
   * @param centerX, centerY, centerZ The position of the reference point.
   * @param upX, upY, upZ The direction of the up vector.
   * @return this
   */
  public lookAt(eyeX: number, eyeY: number, eyeZ: number, centerX: number, centerY: number, centerZ: number, upX: number, upY: number, upZ: number): Matrix4 {
    return this.concat(new Matrix4().setLookAt(eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ));
  };

  /**
   * Multiply the matrix for project vertex to plane from the right.
   * @param plane The array[A, B, C, D] of the equation of plane "Ax + By + Cz + D = 0".
   * @param light The array which stored coordinates of the light. if light[3]=0, treated as parallel light.
   * @return this
   */
  public dropShadow(plane: ArrayLike<number>, light: ArrayLike<number>) {
    const mat = new Matrix4();
    const e = mat;

    const dot = plane[0] * light[0] + plane[1] * light[1] + plane[2] * light[2] + plane[3] * light[3];

    e[0] = dot - light[0] * plane[0];
    e[1] = - light[1] * plane[0];
    e[2] = - light[2] * plane[0];
    e[3] = - light[3] * plane[0];

    e[4] = - light[0] * plane[1];
    e[5] = dot - light[1] * plane[1];
    e[6] = - light[2] * plane[1];
    e[7] = - light[3] * plane[1];

    e[8] = - light[0] * plane[2];
    e[9] = - light[1] * plane[2];
    e[10] = dot - light[2] * plane[2];
    e[11] = - light[3] * plane[2];

    e[12] = - light[0] * plane[3];
    e[13] = - light[1] * plane[3];
    e[14] = - light[2] * plane[3];
    e[15] = dot - light[3] * plane[3];

    return this.concat(mat);
  }

  /**
   * Multiply the matrix for project vertex to plane from the right.(Projected by parallel light.)
   * @param normX, normY, normZ The normal vector of the plane.(Not necessary to be normalized.)
   * @param planeX, planeY, planeZ The coordinate of arbitrary points on a plane.
   * @param lightX, lightY, lightZ The vector of the direction of light.(Not necessary to be normalized.)
   * @return this
   */
  public dropShadowDirectionally(normX: number, normY: number, normZ: number, planeX: number, planeY: number, planeZ: number, lightX: number, lightY: number, lightZ: number): Matrix4 {
    const a = planeX * normX + planeY * normY + planeZ * normZ;
    return this.dropShadow([normX, normY, normZ, -a], [lightX, lightY, lightZ, 0]);
  };
}
// tslint:enable: max-classes-per-file