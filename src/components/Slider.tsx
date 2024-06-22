import { ChangeEvent, InputHTMLAttributes, Component } from 'react';

import "../css/slider.css";
import React from 'react';

export interface SliderProps extends InputHTMLAttributes<HTMLInputElement> { }

export class Slider extends Component<SliderProps> {
    public state: { value: number; };

    constructor(props: any) {
        super(props);
        this.state = {
            value: props.value as number,
        };
    }

    public onChange(evt: ChangeEvent<HTMLInputElement>) {
        this.setState({ value: evt.target.value });
        if (this.props.onChange)
            this.props.onChange(evt);
    }


    public render() {
        return (
            <div className="slider">
                <input type="number" {...this.props} value={this.state.value} onChange={this.onChange.bind(this)} inputMode="decimal"></input>
                <input type="range" {...this.props} value={this.state.value} onChange={this.onChange.bind(this)}></input>
            </div>
        );
    }
}
