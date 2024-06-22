import React from "react";

export class Node extends React.Component{
    public state: {value: Node}
    
    constructor(props: any){
        super(props)
        this.state = {
            value: (props.nodeRef as Node)
        };
    }

    
}