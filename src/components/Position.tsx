import React, { ChangeEvent, Component } from "react";

import { Vector3 } from "../lib/MatrixLib";
import { Slider, SliderProps } from "./Slider";

import "../css/position.css";

export interface PositionProps extends Omit<SliderProps, "defaultValue"> {
    defaultValue: Vector3 | null;
}

export class Position extends Component<PositionProps>{
    public state: {value: Vector3}
    
    constructor(props: PositionProps){
        super(props)
        this.state = {
            value: props.defaultValue === null ? new Vector3([0,0,0]) : props.defaultValue as Vector3
        };
    }

    public onChange(idx: number, evt: ChangeEvent<HTMLInputElement>) { 
        var cur = this.state.value;
        switch(idx){
            case 0:
                cur[0] = Number.parseFloat(evt.target.value);
                break;
            case 1:
                cur[1] = Number.parseFloat(evt.target.value);
                break;
            case 2:
                cur[2] = Number.parseFloat(evt.target.value);
                break;
                
        }
        this.setState({ value: cur });
        
        if (this.props.onChange) {
            (evt as any).value = cur;
            this.props.onChange(evt);
        }
    }

    public render() {
        let { defaultValue, ...temp_props } = this.props;
        return (
            <div className="position">
                <span>X: <Slider defaultValue={this.props.defaultValue === null ? 0 : this.props.defaultValue.x} {...(temp_props as Omit<SliderProps, "defaultValue">)} onChange={this.onChange.bind(this, 0) }></Slider></span>
                <span>Y: <Slider defaultValue={this.props.defaultValue === null ? 0 : this.props.defaultValue.y} {...(temp_props as Omit<SliderProps, "defaultValue">)} onChange={this.onChange.bind(this, 1) }></Slider></span>
                <span>Z: <Slider defaultValue={this.props.defaultValue === null ? 0 : this.props.defaultValue.z} {...(temp_props as Omit<SliderProps, "defaultValue">)} onChange={this.onChange.bind(this, 2) }></Slider></span>
            </div>
        )
    }
    
}