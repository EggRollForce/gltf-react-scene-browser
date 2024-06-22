import App from './App';
import GLTF from './lib/GLTF';
import { Quaternion, Vector3, Vector4 } from './lib/MatrixLib';

import { Camera, Node } from './lib/gltf-components/AllComponents';
import React, { ChangeEvent, RefObject } from 'react';
import ReactDOM from 'react-dom';
import { Slider } from './components/Slider';
import { Position } from './components/Position';

import defaultScene from 'url:./gltf/City.gltf';

const app = new App();

fetch(new Request(defaultScene)).then((resp) =>
    resp.blob().then((blob) =>
        GLTF.parse(blob).then((gltf) => {
            Camera.DEFAULT_ORTHO.parent = new Node();
            Camera.DEFAULT_PERSP.parent = Camera.DEFAULT_ORTHO.parent;
            Camera.DEFAULT_PERSP.parent.translation.y = 0.1;
            Camera.DEFAULT_ORTHO.setupCorrection();
            Camera.DEFAULT_PERSP.setupCorrection();
            app.useGLTF(gltf).then(() =>
                App.scene?.setupGL().then(() => {
                    App.initilizeDrawLoop()
                    if (App.scene) {
                        for (const node of App.scene.nodes) {
                            if (node.name === "Light") {
                                App.lightpos = node;
                                break;
                            }
                            const light = node.findChildByName("Light");
                            if (light) {
                                App.lightpos = light;
                                break;
                            }
                        }
                    }
                })
            )
        })
    )
);

(window as any).App = App;
(window as any).Vector3 = Vector3;
(window as any).Vector4 = Vector4;


const container = document.getElementById("slider");
console.log(App.lightpos.translation)
const elm = <div>
    Movement Speed Slider:<br />
    <Slider min="0.1" max="10" step="0.1" value='1' onChange={(evt: ChangeEvent<HTMLInputElement>) => { App.sens = Number.parseFloat(evt.target.value) * 0.0001 }} /><br />
    <span>Light Position</span><br />
    <Position min="-20" max="20" step="0.1" defaultValue={App.lightpos.translation} onChange={(evt: ChangeEvent<HTMLInputElement>) => { App.lightpos.translation.set(evt.value) }}></Position><br />
    <br />Fog Controls:<br />
    Fog Start:<Slider min="1" max="100" step="1" defaultValue={App.fogDistance} onChange={(evt: ChangeEvent<HTMLInputElement>) => { App.fogDistance = Number.parseFloat(evt.target.value) }}></Slider><br />
    Fog Magnitude:<Slider min="0.001" max="1" step="0.001" defaultValue={App.fogFalloff} onChange={(evt: ChangeEvent<HTMLInputElement>) => { App.fogFalloff = Number.parseFloat(evt.target.value) }}></Slider><br />
    Fog Color:<input type="color" defaultValue={App.fogColor.reduce<string>((prev, cur) => { return prev + Math.floor(cur * 255).toString(16).toUpperCase() }, "#").substring(0, 7)} onChange={(evt: ChangeEvent<HTMLInputElement>) => {
        const d = parseInt(evt.target.value.substring(1), 16);
        if (isNaN(d))
            return;
        // tslint:disable: no-bitwise
        App.fogColor[0] = ((d >> 16) & 255) / 255;
        App.fogColor[1] = ((d >> 8) & 255) / 255;
        App.fogColor[2] = (d & 255) / 255;
        // tslint:enable: no-bitwise
    }}></input><br />
    Ambient Color:<input type="color" defaultValue={App.ambient.reduce<string>((prev, cur) => { return prev + Math.floor(cur * 255).toString(16).toUpperCase() }, "#").substring(0, 7)} onChange={(evt: ChangeEvent<HTMLInputElement>) => {
        const d = parseInt(evt.target.value.substring(1), 16);
        if (isNaN(d))
            return;
        // tslint:disable: no-bitwise
        App.ambient[0] = ((d >> 16) & 255) / 255;
        App.ambient[1] = ((d >> 8) & 255) / 255;
        App.ambient[2] = (d & 255) / 255;
        // tslint:enable: no-bitwise
    }}></input><br />
    Diffuse Color:<input type="color" defaultValue={App.diffuse.reduce<string>((prev, cur) => { return prev + Math.floor(cur * 255).toString(16).toUpperCase() }, "#").substring(0, 7)} onChange={(evt: ChangeEvent<HTMLInputElement>) => {
        const d = parseInt(evt.target.value.substring(1), 16);
        if (isNaN(d))
            return;
        // tslint:disable: no-bitwise
        App.diffuse[0] = ((d >> 16) & 255) / 255;
        App.diffuse[1] = ((d >> 8) & 255) / 255;
        App.diffuse[2] = (d & 255) / 255;
        // tslint:enable: no-bitwise
    }}></input><br />
    Specular Color:<input type="color" defaultValue={App.specular.reduce<string>((prev, cur) => { return prev + Math.floor(cur * 255).toString(16).toUpperCase() }, "#").substring(0, 7)} onChange={(evt: ChangeEvent<HTMLInputElement>) => {
        const d = parseInt(evt.target.value.substring(1), 16);
        if (isNaN(d))
            return;
        // tslint:disable: no-bitwise
        App.specular[0] = ((d >> 16) & 255) / 255;
        App.specular[1] = ((d >> 8) & 255) / 255;
        App.specular[2] = (d & 255) / 255;
        // tslispecularnt:enable: no-bitwise
    }}></input><br />
    Shininess:<Slider min="0" max="100" step="1" defaultValue={App.shininess} onChange={(evt: ChangeEvent<HTMLInputElement>) => { App.shininess = Number.parseFloat(evt.target.value) }}></Slider><br />

</div>;

ReactDOM.render(elm, container);

const reset = document.getElementById("camreset")

if (reset)
    reset.onclick = () => {
        if (App.camera.parent) {
            App.camera.parent.translation.mul(0);
            App.camera.parent.translation.y = 0.1;
            App.camera.parent.rotation.set(new Quaternion());
        }
    }