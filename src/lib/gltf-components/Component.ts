import App from '../../App';
import { v4 as uuidv4 } from 'uuid';


export default class Component {
    public static readonly components = new Map<string,Component>();
    public readonly UUID: string;

    constructor() {
        let uuid = uuidv4().substr(0,8);
        while (Component.components.has(uuid)) {
            uuid = uuidv4().substr(0,8);
        }
        this.UUID = uuid;
        Component.components.set(uuid, this);
    }
}
